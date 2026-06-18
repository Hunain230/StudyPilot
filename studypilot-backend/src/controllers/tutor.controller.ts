import { Request, Response, NextFunction } from 'express';
import Groq from 'groq-sdk';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { retrieveChunks } from '../lib/vectorStore';
import { searchWeb, WebSearchResult } from '../services/webSearchService';
import { tutorAskSchema } from '../validators/phase3.validator';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
});

type TutorSource = {
  title: string;
  url?: string;
  type: 'web' | 'guide';
};

function buildWebContext(results: WebSearchResult[]): string {
  return results
    .map((result, index) => {
      return `[${index + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.content}`;
    })
    .join('\n\n');
}

function buildGuideContext(chunks: string[], guideTitle?: string): string {
  if (!chunks.length) return 'No guide context was provided.';

  return chunks
    .map((chunk, index) => {
      return `[Guide ${index + 1}] ${guideTitle || 'Selected guide'}\n${chunk}`;
    })
    .join('\n\n---\n\n');
}

function buildTutorPrompt(params: {
  question: string;
  webResults: WebSearchResult[];
  guideChunks: string[];
  guideTitle?: string;
}) {
  const webContext = buildWebContext(params.webResults);
  const guideContext = buildGuideContext(params.guideChunks, params.guideTitle);

  return `You are StudyPilot AI Tutor, a friendly academic tutor for students.

Your job:
- Answer the student's question in a clear, intuitive, easy-to-understand way.
- Use the WEB SEARCH RESULTS as the primary evidence.
- Use SELECTED GUIDE CONTEXT only as secondary support to relate the answer to the student's uploaded material.
- If web results and guide context disagree, briefly mention the mismatch and prefer the current web results.
- Use examples, analogies, short steps, and concise Markdown.
- Do not invent source links. Use only the provided sources.

WEB SEARCH RESULTS (primary):
${webContext || 'No web results available.'}

SELECTED GUIDE CONTEXT (secondary):
${guideContext}

STUDENT QUESTION:
${params.question}

Answer now.`;
}

export async function askTutor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { question, guideId } = tutorAskSchema.parse(req.body);

    let guideTitle: string | undefined;
    let guideChunks: string[] = [];

    if (guideId) {
      const guide = await prisma.guide.findFirst({
        where: { id: guideId, userId },
      });

      if (!guide) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'GUIDE_NOT_FOUND',
            message: 'Guide not found.',
            statusCode: 404,
          },
        });
      }

      guideTitle = guide.title;

      try {
        guideChunks = await retrieveChunks(guideId, question, Number(process.env.MAX_RAG_CHUNKS) || 4);
      } catch (error: any) {
        if (error.message !== 'RAG_INDEX_MISSING') {
          throw error;
        }
      }
    }

    const webResults = await searchWeb(question);

    if (webResults.length === 0) {
      throw new AppError('Live web search did not return useful results. Please try a more specific question.', 502, 'WEB_SEARCH_EMPTY');
    }

    const prompt = buildTutorPrompt({
      question,
      webResults,
      guideChunks,
      guideTitle,
    });

    const result = await groq.chat.completions.create({
      model: ENV.GROQ_MODEL || 'llama-3.1-8b-instant',
      max_tokens: Math.min(ENV.GROQ_MAX_TOKENS || 1800, 2500),
      temperature: ENV.GROQ_TEMPERATURE || 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = result.choices[0]?.message?.content || 'Sorry, I could not generate an answer at this moment.';
    const mode = guideId && guideChunks.length > 0 ? 'web_with_guide' : 'web';
    const sources: TutorSource[] = [
      ...webResults.map((source) => ({
        title: source.title,
        url: source.url,
        type: 'web' as const,
      })),
      ...(guideId && guideChunks.length > 0
        ? [{ title: guideTitle || 'Selected guide', type: 'guide' as const }]
        : []),
    ];

    await prisma.message.createMany({
      data: [
        {
          userId,
          guideId: guideId || null,
          role: 'user',
          content: question,
        },
        {
          userId,
          guideId: guideId || null,
          role: 'assistant',
          content: answer,
        },
      ],
    });

    await prisma.activityLog.create({
      data: {
        userId,
        guideId: guideId || null,
        type: 'DOUBT_ASKED',
        description: `Asked AI Tutor: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`,
        meta: { mode, sources: sources.slice(0, 5) },
      },
    });

    await prisma.studySession.create({
      data: {
        userId,
        guideId: guideId || null,
        activityType: 'chat',
        durationSecs: 60,
      },
    });

    return res.json({
      success: true,
      data: {
        answer,
        mode,
        sources,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTutorHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const guideId = typeof req.query.guideId === 'string' && req.query.guideId.trim()
      ? req.query.guideId
      : null;

    if (guideId) {
      const guide = await prisma.guide.findFirst({
        where: { id: guideId, userId },
        select: { id: true },
      });

      if (!guide) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'GUIDE_NOT_FOUND',
            message: 'Guide not found.',
            statusCode: 404,
          },
        });
      }
    }

    const messages = await prisma.message.findMany({
      where: {
        userId,
        guideId: guideId || null,
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return res.json({
      success: true,
      data: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        guideId: message.guideId,
        createdAt: message.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
