import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';
import { retrieveChunks, indexGuide } from '../lib/vectorStore';
import { doubtSchema } from '../validators/phase3.validator';
import Groq from 'groq-sdk';
import { ENV } from '../config/env';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
});

// POST /api/v1/doubt/ask
export async function askDoubt(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const validated = doubtSchema.parse(req.body);
    const { guideId, question } = validated;

    const guide = await prisma.guide.findFirst({
      where: { id: guideId, userId },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found.', 404));
    }

    let chunks: string[] = [];
    try {
      chunks = await retrieveChunks(guideId, question, Number(process.env.MAX_RAG_CHUNKS) || 5);
    } catch (err: any) {
      if (err.message === 'RAG_INDEX_MISSING') {
        return res.status(400).json(ApiResponse.error('This study guide does not have indexable text content to answer doubts.', 400));
      }
      throw err;
    }

    const context = chunks.length > 0 ? chunks.join('\n\n---\n\n') : 'No additional context available.';

    const prompt = `
      You are an elite academic AI tutor for StudyPilot AI. 
      The student is asking a doubt regarding the study guide: "${guide.title}".
      Use the provided retrieved context chunks from their study materials to formulate your answer.
      If the answer cannot be reasonably inferred from the context or the guide's context is completely irrelevant, state clearly that you cannot find the answer in the study guide, but offer a general brief explanation if helpful.

      Context:
      ${context}

      Student Question: ${question}

      Provide a clear, detailed, yet structured academic answer. Use Markdown formatting (bold, bullet points, headers) for readability.
    `;

    const result = await groq.chat.completions.create({
      model: ENV.GROQ_MODEL || 'llama-3.1-8b-instant',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = result.choices[0]?.message?.content || 'Sorry, I could not generate an answer at this moment.';

    // Persist Q&A
    const doubt = await prisma.doubtSession.create({
      data: {
        userId,
        guideId,
        question,
        answer,
      },
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId,
        guideId,
        type: 'DOUBT_ASKED',
        description: `Asked AI Tutor: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`,
        meta: { doubtId: doubt.id, question },
      },
    });

    // Write study session (activityType is lowercase enum)
    await prisma.studySession.create({
      data: {
        userId,
        guideId,
        activityType: 'doubt',
        durationSecs: 60,
      },
    });

    return res.json({
      success: true,
      doubtId: doubt.id,
      question,
      answer,
      sourcesUsed: chunks.length,
      askedAt: doubt.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/doubt/history/:guideId
export async function getDoubtHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const userId = req.user!.userId;

    const doubts = await prisma.doubtSession.findMany({
      where: { userId, guideId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      history: doubts.map(d => ({
        id: d.id,
        question: d.question,
        answer: d.answer,
        askedAt: d.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/doubt/index/:guideId
export async function reindexGuideContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const userId = req.user!.userId;

    const content = await prisma.guideContent.findFirst({
      where: { guideId, guide: { userId } },
    });

    if (!content || !content.rawContent) {
      return res.status(404).json(ApiResponse.error('Guide content not found. Cannot index.', 404));
    }

    const chunkCount = await indexGuide(guideId, content.rawContent);

    return res.json({
      success: true,
      message: `Guide indexed successfully. Created ${chunkCount} text chunks.`,
      chunks: chunkCount,
    });
  } catch (err) {
    next(err);
  }
}
