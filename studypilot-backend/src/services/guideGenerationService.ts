import { prisma } from '../config/db';
import { extractTextFromPDF, extractTextFromNotes, extractTextFromYouTube, sanitizeNotes } from './extractionService';
import { generateGuideWithGroqRetry, truncateToTokenLimit } from './groqService';
import { parseAndValidateGroqResponse } from '../validators/aiResponseValidator';
import crypto from 'crypto';
import { Difficulty } from '@prisma/client';
import fs from 'fs';

export type SourceType = 'pdf' | 'notes' | 'youtube';

export interface PipelineInput {
  userId: string;
  sourceType: SourceType;
  title?: string;
  pdfBuffer?: Buffer;
  pdfFilePath?: string;
  notesText?: string;
  youtubeUrl?: string;
  guideId?: string; // If provided, update this existing guide instead of creating a new one
}

export async function generateGuide(input: PipelineInput) {
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
      // Source identifier is MD5 of extracted text
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
    // If we were given a guideId, and a cached guide exists, we can merge them or delete the empty one
    if (input.guideId && input.guideId !== existingGuide.id) {
      // Associate existing guide content with this request or clean up the newly created processing guide
      // For simplicity, we can delete the newly created empty guide and return the existing cached one
      try {
        await prisma.guide.delete({ where: { id: input.guideId } });
      } catch (err) {
        // ignore
      }
    }
    return { guide: existingGuide, cached: true };
  }

  // Step 3: Clean content
  const cleanedRaw = sanitizeNotes(rawContent);
  const contentForAI = truncateToTokenLimit(cleanedRaw);

  // Step 4: Generate with Groq (with retry)
  const groqRawResponse = await generateGuideWithGroqRetry(contentForAI);

  // Step 5: Validate
  const validated = parseAndValidateGroqResponse(groqRawResponse);

  // Step 6: Persist everything in a database transaction
  const guide = await prisma.$transaction(async (tx) => {
    let guideRecord;

    if (input.guideId) {
      // Update existing guide
      guideRecord = await tx.guide.update({
        where: { id: input.guideId },
        data: {
          title: input.title || validated.metadata.subject || 'Untitled Guide',
          sourceIdentifier,
          youtubeUrl: input.youtubeUrl,
          notesText: input.sourceType === 'notes' ? input.notesText : undefined,
          status: 'completed',
          subject: validated.metadata.subject || undefined,
          description: validated.shortSummary || undefined,
          aiSummary: validated.detailedSummary || undefined,
        },
      });
    } else {
      // Create new guide
      guideRecord = await tx.guide.create({
        data: {
          userId: input.userId,
          title: input.title || validated.metadata.subject || 'Untitled Guide',
          sourceType: input.sourceType,
          sourceIdentifier,
          youtubeUrl: input.youtubeUrl,
          notesText: input.sourceType === 'notes' ? input.notesText : undefined,
          status: 'completed',
          subject: validated.metadata.subject || undefined,
          description: validated.shortSummary || undefined,
          aiSummary: validated.detailedSummary || undefined,
        },
      });
    }

    // Create guide content
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

    // Create flashcards
    if (validated.flashcards.length > 0) {
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

    // Create quiz questions
    if (validated.quizQuestions.length > 0) {
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

    // Create revision sheet
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

    return guideRecord;
  });

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
  // Return immediately, run in background
  (async () => {
    try {
      console.log(`[Background AI] Starting guide generation for user: ${input.userId}, source: ${input.sourceType}`);
      
      if (input.guideId) {
        await prisma.guide.update({
          where: { id: input.guideId },
          data: { status: 'processing' },
        });
      }

      await generateGuide(input);
      console.log(`[Background AI] Successfully generated guide for user: ${input.userId}`);
    } catch (err: any) {
      console.error(`[Background AI] Guide generation failed:`, err);
      
      if (input.guideId) {
        try {
          await prisma.guide.update({
            where: { id: input.guideId },
            data: { status: 'failed' },
          });
        } catch (dbErr) {
          console.error('[Background AI] Failed to update guide status to FAILED in database:', dbErr);
        }
      }
    }
  })();
}
