import { prisma } from '../config/db';
import { extractTextFromPDF, extractTextFromNotes, extractTextFromYouTube, sanitizeNotes } from './extractionService';
import { generateDetailedSummaryWithAgents, generateGuideWithGroqRetry, getWebEnrichmentForDetailedSummary, truncateToTokenLimit } from './groqService';
import { parseAndValidateGroqResponse } from '../validators/aiResponseValidator';
import { invalidateCachedGuide } from './cacheService';
import crypto from 'crypto';
import { Difficulty } from '@prisma/client';
import fs from 'fs';

export type SourceType = 'pdf' | 'notes' | 'youtube';

// All available component keys
export type ComponentKey = 'summary' | 'flashcards' | 'quiz' | 'mindMap' | 'studyPlan' | 'revisionSheet' | 'doubtSolver';

export const ALL_COMPONENTS: ComponentKey[] = ['summary', 'flashcards', 'quiz', 'mindMap', 'studyPlan', 'revisionSheet', 'doubtSolver'];

export interface PipelineInput {
  userId: string;
  sourceType: SourceType;
  title?: string;
  pdfBuffer?: Buffer;
  pdfFilePath?: string;
  notesText?: string;
  youtubeUrl?: string;
  guideId?: string; // If provided, update this existing guide instead of creating a new one
  selectedComponents?: ComponentKey[]; // Which components to generate
}

function resolveComponents(selectedComponents?: ComponentKey[]): ComponentKey[] {
  if (!selectedComponents || selectedComponents.length === 0) return ALL_COMPONENTS;
  return selectedComponents;
}

function invalidateInputGuideCache(input: PipelineInput) {
  if (input.guideId) {
    invalidateCachedGuide(input.guideId, input.userId);
  }
}

export async function generateGuide(input: PipelineInput) {
  const components = resolveComponents(input.selectedComponents);

  // Step 1: Extract raw content & determine sourceIdentifier
  let rawContent: string;
  let sourceIdentifier: string;

  switch (input.sourceType) {
    case 'pdf':
      if (input.pdfBuffer) {
        rawContent = await extractTextFromPDF(input.pdfBuffer);
      } else if (input.pdfFilePath) {
        if (!fs.existsSync(input.pdfFilePath)) {
          throw new Error(`PDF file not found at path: ${input.pdfFilePath}`);
        }
        const buffer = fs.readFileSync(input.pdfFilePath);
        rawContent = await extractTextFromPDF(buffer);
      } else {
        throw new Error('PDF file buffer or file path is required.');
      }
      sourceIdentifier = crypto.createHash('md5').update(rawContent).digest('hex');
      break;

    case 'notes':
      if (!input.notesText) throw new Error('Notes content is required.');
      rawContent = extractTextFromNotes(input.notesText);
      sourceIdentifier = crypto.createHash('md5').update(rawContent).digest('hex');
      break;

    case 'youtube':
      if (!input.youtubeUrl) throw new Error('YouTube URL is required.');
      rawContent = await extractTextFromYouTube(input.youtubeUrl);
      sourceIdentifier = input.youtubeUrl;
      break;

    default:
      throw new Error('Invalid source type');
  }

  // Step 2: Check cache (same user + same source)
  const existingGuide = await prisma.guide.findFirst({
    where: {
      userId: input.userId,
      sourceIdentifier,
    },
    include: {
      content: true,
      flashcards: true,
      quizQuestions: true,
      revisionSheet: { include: { sections: true } },
    },
  });

  if (existingGuide) {
    if (input.guideId && input.guideId !== existingGuide.id) {
      try {
        await prisma.guide.delete({ where: { id: input.guideId } });
        invalidateInputGuideCache(input);
      } catch (err) {
        // ignore
      }
    }
    return { guide: existingGuide, cached: true };
  }

  // Step 3: Clean content
  const cleanedRaw = sanitizeNotes(rawContent);
  const contentForAI = truncateToTokenLimit(cleanedRaw);

  // Step 4: Generate with Groq (with retry), passing selected components
  const groqRawResponse = await generateGuideWithGroqRetry(contentForAI, 3, components);

  // Step 5: Validate
  const validated = parseAndValidateGroqResponse(groqRawResponse);

  const webContext = await getWebEnrichmentForDetailedSummary({
    title: input.title,
    shortSummary: validated.shortSummary,
    topics: validated.topics,
    keyConcepts: validated.keyConcepts,
  });

  const agentDetailedSummary = await generateDetailedSummaryWithAgents({
    title: input.title,
    content: contentForAI,
    shortSummary: validated.shortSummary,
    topics: validated.topics,
    keyConcepts: validated.keyConcepts,
    webContext: webContext || undefined,
  });

  if (agentDetailedSummary) {
    validated.detailedSummary = agentDetailedSummary;
  }

  // Step 6: Persist everything in a database transaction
  const guide = await prisma.$transaction(async (tx) => {
    let guideRecord;

    const componentsStr = JSON.stringify(components);

    if (input.guideId) {
      guideRecord = await tx.guide.update({
        where: { id: input.guideId },
        data: {
          // Always use the user's title; only fall back to AI subject if title was truly blank
          title: (input.title && input.title.trim()) ? input.title.trim() : (validated.metadata.subject || 'Untitled Guide'),
          sourceIdentifier,
          youtubeUrl: input.youtubeUrl,
          notesText: input.sourceType === 'notes' ? input.notesText : undefined,
          status: 'completed',
          subject: validated.metadata.subject || undefined,
          description: validated.shortSummary || undefined,
          aiSummary: validated.detailedSummary || undefined,
          selectedComponents: componentsStr,
        },
      });
    } else {
      guideRecord = await tx.guide.create({
        data: {
          userId: input.userId,
          // Always use the user's title; only fall back to AI subject if title was truly blank
          title: (input.title && input.title.trim()) ? input.title.trim() : (validated.metadata.subject || 'Untitled Guide'),
          sourceType: input.sourceType,
          sourceIdentifier,
          youtubeUrl: input.youtubeUrl,
          notesText: input.sourceType === 'notes' ? input.notesText : undefined,
          status: 'completed',
          subject: validated.metadata.subject || undefined,
          description: validated.shortSummary || undefined,
          aiSummary: validated.detailedSummary || undefined,
          selectedComponents: componentsStr,
        },
      });
    }

    // Create guide content (always generated - summary is always included)
    await tx.guideContent.create({
      data: {
        guideId: guideRecord.id,
        rawContent,
        cleanedContent: validated.cleanedContent || cleanedRaw,
        shortSummary: validated.shortSummary,
        detailedSummary: validated.detailedSummary,
        keyConcepts: JSON.stringify(validated.keyConcepts),
        topics: JSON.stringify(validated.topics),
        topicHierarchy: JSON.stringify(validated.topicHierarchy),
        metadata: JSON.stringify({
          ...validated.metadata,
          wordCount: rawContent.split(/\s+/).filter(Boolean).length,
          sourceType: input.sourceType,
        }),
      },
    });

    // Create flashcards only if selected
    if (components.includes('flashcards') && validated.flashcards.length > 0) {
      await tx.flashcard.createMany({
        data: validated.flashcards.map((fc, idx) => ({
          guideId: guideRecord.id,
          question: fc.question,
          answer: fc.answer,
          difficulty: (fc.difficulty as Difficulty) || Difficulty.medium,
          orderIndex: idx,
        })),
      });
    }

    // Create quiz questions only if selected
    if (components.includes('quiz') && validated.quizQuestions.length > 0) {
      await tx.quizQuestion.createMany({
        data: validated.quizQuestions.map((q, idx) => ({
          guideId: guideRecord.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
          orderIndex: idx,
        })),
      });
    }

    // Create revision sheet only if selected
    if (components.includes('revisionSheet')) {
      const revSheet = await tx.revisionSheet.create({
        data: {
          guideId: guideRecord.id,
          title: validated.revisionSheet.title || `${guideRecord.title} Revision Sheet`,
        },
      });

      if (validated.revisionSheet.sections.length > 0) {
        await tx.revisionSection.createMany({
          data: validated.revisionSheet.sections.map((s, idx) => ({
            revisionSheetId: revSheet.id,
            heading: s.heading,
            bulletPoints: JSON.stringify(s.bulletPoints),
            orderIndex: idx,
          })),
        });
      }
    }

    return guideRecord;
  });

  // Step 6.5: Index guide for RAG doubt solving only if doubtSolver is selected
  if (components.includes('doubtSolver')) {
    try {
      const { indexGuide } = require('../lib/vectorStore');
      indexGuide(guide.id, rawContent).catch((err: any) => {
        console.error('[VectorStore] Async guide indexing failed:', err);
      });
    } catch (err) {
      console.error('[VectorStore] Failed to import indexGuide:', err);
    }
  }

  // Step 7: Return full guide with all relations
  const fullGuide = await prisma.guide.findUnique({
    where: { id: guide.id },
    include: {
      content: true,
      flashcards: { orderBy: { orderIndex: 'asc' } },
      quizQuestions: { orderBy: { orderIndex: 'asc' } },
      revisionSheet: { include: { sections: { orderBy: { orderIndex: 'asc' } } } },
    },
  });

  return {
    guide: fullGuide,
    cached: false,
  };
}

/**
 * Runs guide generation asynchronously in the background.
 */
export function generateGuideAsync(input: PipelineInput) {
  (async () => {
    try {
      console.log(`[Background AI] Starting guide generation for user: ${input.userId}, source: ${input.sourceType}`);

      if (input.guideId) {
        await prisma.guide.update({
          where: { id: input.guideId },
          data: { status: 'processing' },
        });
        invalidateInputGuideCache(input);
      }

      await generateGuide(input);
      invalidateInputGuideCache(input);
      console.log(`[Background AI] Successfully generated guide for user: ${input.userId}`);
    } catch (err: any) {
      console.error(`[Background AI] Guide generation failed:`, err);

      if (input.guideId) {
        try {
          await prisma.guide.update({
            where: { id: input.guideId },
            data: { status: 'failed' },
          });
          invalidateInputGuideCache(input);
        } catch (dbErr) {
          console.error('[Background AI] Failed to update guide status to FAILED in database:', dbErr);
        }
      }
    }
  })();
}
