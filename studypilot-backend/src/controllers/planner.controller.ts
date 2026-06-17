import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';
import { plannerSchema } from '../validators/phase3.validator';
import { computeWeakTopics } from '../services/weakTopic.service';
import { computeReadiness } from '../services/readiness.service';
import Groq from 'groq-sdk';
import { ENV } from '../config/env';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
});

// GET /api/v1/planner
export async function getPlannerSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const sessions = await prisma.plannerSession.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'asc' },
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        guideId: s.guideId,
        guideTitle: s.guide?.title || null,
        topic: s.topic,
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
        type: s.type,
        status: s.status,
        notes: s.notes,
        completedAt: s.completedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/planner
export async function createPlannerSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const validated = plannerSchema.parse(req.body);

    const session = await prisma.plannerSession.create({
      data: {
        userId,
        guideId: validated.guideId || null,
        topic: validated.topic || null,
        scheduledAt: new Date(validated.scheduledAt),
        durationMinutes: validated.durationMinutes || 60,
        type: validated.type || 'STUDY',
        status: validated.status || 'PENDING',
        notes: validated.notes || null,
      },
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId,
        guideId: validated.guideId || null,
        type: 'PLANNER_SESSION',
        description: `Scheduled a study session for ${session.topic || 'General'} on ${session.scheduledAt.toLocaleDateString()}`,
        meta: { sessionId: session.id },
      },
    });

    return res.status(201).json({
      success: true,
      session: {
        id: session.id,
        guideId: session.guideId,
        guideTitle: session.guide?.title || null,
        topic: session.topic,
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
        type: session.type,
        status: session.status,
        notes: session.notes,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/planner/:sessionId
export async function updatePlannerSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.userId;
    
    // Partial validation
    const validated = plannerSchema.partial().parse(req.body);

    const session = await prisma.plannerSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json(ApiResponse.error('Planner session not found.', 404));
    }

    const updateData: any = {};
    if (validated.guideId !== undefined) updateData.guideId = validated.guideId;
    if (validated.topic !== undefined) updateData.topic = validated.topic;
    if (validated.scheduledAt !== undefined) updateData.scheduledAt = new Date(validated.scheduledAt);
    if (validated.durationMinutes !== undefined) updateData.durationMinutes = validated.durationMinutes;
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    
    if (validated.status !== undefined) {
      updateData.status = validated.status;
      if (validated.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        
        // Also register a study session activity (lowercase enum values in db)
        await prisma.studySession.create({
          data: {
            userId,
            guideId: session.guideId,
            durationSecs: (validated.durationMinutes || session.durationMinutes) * 60,
            activityType: 'planner',
          },
        });
      } else {
        updateData.completedAt = null;
      }
    }

    const updated = await prisma.plannerSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      session: {
        id: updated.id,
        guideId: updated.guideId,
        guideTitle: updated.guide?.title || null,
        topic: updated.topic,
        scheduledAt: updated.scheduledAt,
        durationMinutes: updated.durationMinutes,
        type: updated.type,
        status: updated.status,
        notes: updated.notes,
        completedAt: updated.completedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/planner/:sessionId
export async function deletePlannerSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.userId;

    const session = await prisma.plannerSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json(ApiResponse.error('Planner session not found.', 404));
    }

    await prisma.plannerSession.delete({
      where: { id: sessionId },
    });

    return res.json({
      success: true,
      message: 'Planner session deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/planner/upcoming
export async function getUpcomingSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const sessions = await prisma.plannerSession.findMany({
      where: {
        userId,
        scheduledAt: {
          gte: now,
          lte: sevenDaysFromNow,
        },
        status: 'PENDING',
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        guideId: s.guideId,
        guideTitle: s.guide?.title || null,
        topic: s.topic,
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
        type: s.type,
        status: s.status,
        notes: s.notes,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/planner/suggest
export async function suggestPlannerSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId, examDate } = req.query;
    const userId = req.user!.userId;

    if (!guideId || typeof guideId !== 'string') {
      return res.status(400).json(ApiResponse.error('guideId query parameter is required', 400));
    }

    if (!examDate || typeof examDate !== 'string') {
      return res.status(400).json(ApiResponse.error('examDate query parameter is required', 400));
    }

    const guide = await prisma.guide.findFirst({
      where: { id: guideId, userId },
      include: { content: { select: { topics: true } } },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    const weakTopics = await computeWeakTopics(userId, guideId);
    const readiness = await computeReadiness(userId, guideId);
    const daysLeft = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);

    // Get list of topics
    let topicsList: string[] = [];
    if (guide.content?.topics) {
      try {
        const parsed = typeof guide.content.topics === 'string'
          ? JSON.parse(guide.content.topics)
          : guide.content.topics;
        if (Array.isArray(parsed)) {
          topicsList = parsed.map(String);
        }
      } catch (e) {
        // ignore
      }
    }

    const prompt = `
      You are an expert AI study coach for StudyPilot AI. 
      A student has an exam on "${guide.title}" in ${daysLeft} days.
      Their composite exam readiness score is ${readiness}/100.
      Their weak topics (accuracy < 60%) are: ${weakTopics.map(t => `${t.topic} (${t.accuracy.toFixed(1)}%)`).join(', ') || 'None'}.
      Other available topics in the study guide: ${topicsList.join(', ')}.

      Please generate a highly-targeted 7-day study plan covering the student's weak topics first, and mixing study session types: STUDY, REVIEW, QUIZ, FLASHCARDS.
      Return the plan strictly as a JSON object with two fields:
      1. "suggestedPlan": an array of daily schedules. Each day should represent a date starting from tomorrow (assuming today is ${new Date().toISOString().split('T')[0]}). Each daily schedule should be:
         { "day": "YYYY-MM-DD", "sessions": [ { "topic": "string", "durationMinutes": number, "type": "STUDY" | "REVIEW" | "QUIZ" | "FLASHCARDS" } ] }
      2. "rationale": a 2-3 sentence personalized encouragement explaining why this sequence of sessions was scheduled.

      Respond ONLY with a valid JSON block, no Markdown formatting, no extra explanation.
    `;

    const result = await groq.chat.completions.create({
      model: ENV.GROQ_MODEL || 'llama-3.1-8b-instant',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty response');
    }

    const cleanJsonStr = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    return res.json({
      success: true,
      guideId,
      examDate,
      daysUntilExam: Math.max(0, daysLeft),
      suggestedPlan: parsed.suggestedPlan || [],
      rationale: parsed.rationale || '',
    });
  } catch (err) {
    next(err);
  }
}
