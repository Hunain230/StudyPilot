import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';
import { generateGuide } from '../services/guideGenerationService';
import { getCachedGuide, setCachedGuide, invalidateCachedGuide, guideKey } from '../services/cacheService';

// Helper: parse JSON safely if it's a string
function parseJson(value: any) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// Helper: format guide for API response
export function formatGuideResponse(guide: any) {
  if (!guide) return null;
  return {
    ...guide,
    status: guide.status === 'completed' ? 'ready' : guide.status,
    content: guide.content
      ? {
          ...guide.content,
          keyConcepts: parseJson(guide.content.keyConcepts),
          topics: parseJson(guide.content.topics),
          topicHierarchy: parseJson(guide.content.topicHierarchy),
          metadata: parseJson(guide.content.metadata),
        }
      : null,
    quizQuestions: guide.quizQuestions?.map((q: any) => ({
      ...q,
      options: parseJson(q.options),
    })),
    revisionSheet: guide.revisionSheet
      ? {
          ...guide.revisionSheet,
          sections: guide.revisionSheet.sections?.map((s: any) => ({
            ...s,
            bulletPoints: parseJson(s.bulletPoints),
          })),
        }
      : null,
  };
}

// GET /api/guides — list current user's guides (with status mapping)
export const getGuides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    
    // Support pagination parameters if present, otherwise return all
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const findOptions: any = {
      where: { userId },
      include: {
        content: {
          select: {
            shortSummary: true,
            metadata: true,
          },
        },
        _count: {
          select: {
            flashcards: true,
            quizQuestions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    };

    if (page !== undefined && limit !== undefined) {
      findOptions.skip = (page - 1) * limit;
      findOptions.take = limit;
    }

    const guides = await prisma.guide.findMany(findOptions);
    const total = await prisma.guide.count({ where: { userId } });

    const mappedGuides = guides.map(g => formatGuideResponse(g));

    if (page !== undefined && limit !== undefined) {
      return res.json({
        success: true,
        data: mappedGuides,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return res.json(ApiResponse.success(mappedGuides));
  } catch (err) {
    next(err);
  }
};

// POST /api/guides — create new guide (standard frontend creation)
export const createGuide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, subject, sourceType, notesText, youtubeUrl } = req.body;

    if (!title) {
      return res.status(400).json(ApiResponse.error('Title is required', 400));
    }

    const guide = await prisma.guide.create({
      data: {
        userId: req.user!.userId,
        title,
        description,
        subject,
        sourceType: sourceType || 'notes',
        notesText,
        youtubeUrl,
        status: 'processing',
      },
    });

    // Trigger AI generation asynchronously in background for notes or youtube
    if (sourceType !== 'pdf') {
      const { generateGuideAsync } = require('../services/guideGenerationService');
      generateGuideAsync({
        userId: req.user!.userId,
        guideId: guide.id,
        sourceType: sourceType || 'notes',
        notesText,
        youtubeUrl,
        title,
      });
    }

    return res.status(201).json(ApiResponse.success(formatGuideResponse(guide), 'Guide created successfully', 201));
  } catch (err) {
    next(err);
  }
};

// GET /api/guides/:id — get single guide by ID (with caching)
export const getGuideById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const cacheKey = guideKey(userId, id);

    // Check memory cache first
    const cached = getCachedGuide(cacheKey);
    if (cached) {
      return res.json(ApiResponse.success(cached, 'Guide retrieved (cached)'));
    }

    const guide = await prisma.guide.findFirst({
      where: { id, userId },
      include: {
        content: true,
        flashcards: { orderBy: { orderIndex: 'asc' } },
        quizQuestions: { orderBy: { orderIndex: 'asc' } },
        revisionSheet: { include: { sections: { orderBy: { orderIndex: 'asc' } } } },
      },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    const formatted = formatGuideResponse(guide);
    setCachedGuide(cacheKey, formatted);

    return res.json(ApiResponse.success(formatted));
  } catch (err) {
    next(err);
  }
};

// PUT /api/guides/:id — update a guide
export const updateGuide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, subject, status } = req.body;
    const userId = req.user!.userId;

    const existingGuide = await prisma.guide.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
    });

    if (!existingGuide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    // Map frontend 'ready' status to backend 'completed' if sent
    const mappedStatus = status === 'ready' ? 'completed' : status;

    const updated = await prisma.guide.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? title : existingGuide.title,
        description: description !== undefined ? description : existingGuide.description,
        subject: subject !== undefined ? subject : existingGuide.subject,
        status: status !== undefined ? mappedStatus : existingGuide.status,
      },
    });

    // Invalidate cache
    invalidateCachedGuide(req.params.id, userId);

    return res.json(ApiResponse.success(formatGuideResponse(updated), 'Guide updated successfully'));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/guides/:id — delete a guide
export const deleteGuide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const guide = await prisma.guide.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    await prisma.guide.delete({
      where: { id: req.params.id },
    });

    // Invalidate cache
    invalidateCachedGuide(req.params.id, userId);

    return res.json(ApiResponse.success(null, 'Guide deleted successfully'));
  } catch (err) {
    next(err);
  }
};

// ─── Phase 2 Specific Generation Handlers ─────────────────────────────────────

// POST /api/guides/generate/pdf
export async function generateFromPDF(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json(ApiResponse.error('No PDF file uploaded.', 400));

    const { title } = req.body;
    const userId = req.user!.userId;

    const { guide, cached } = await generateGuide({
      userId,
      sourceType: 'pdf',
      title,
      pdfBuffer: file.buffer,
    });

    return res.status(cached ? 200 : 201).json({
      success: true,
      cached,
      guide: formatGuideResponse(guide),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/guides/generate/notes
export async function generateFromNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const { notes, title } = req.body;
    if (!notes) return res.status(400).json(ApiResponse.error('Notes content is required.', 400));

    const userId = req.user!.userId;

    const { guide, cached } = await generateGuide({
      userId,
      sourceType: 'notes',
      title,
      notesText: notes,
    });

    return res.status(cached ? 200 : 201).json({
      success: true,
      cached,
      guide: formatGuideResponse(guide),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/guides/generate/youtube
export async function generateFromYouTube(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, title } = req.body;
    if (!url) return res.status(400).json(ApiResponse.error('YouTube URL is required.', 400));

    const userId = req.user!.userId;

    const { guide, cached } = await generateGuide({
      userId,
      sourceType: 'youtube',
      title,
      youtubeUrl: url,
    });

    return res.status(cached ? 200 : 201).json({
      success: true,
      cached,
      guide: formatGuideResponse(guide),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/guides/:id/flashcards
export async function getFlashcards(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const guide = await prisma.guide.findFirst({ where: { id, userId } });
    if (!guide) return res.status(404).json(ApiResponse.error('Guide not found.', 404));

    const flashcards = await prisma.flashcard.findMany({
      where: { guideId: id },
      orderBy: { orderIndex: 'asc' },
    });

    return res.json(ApiResponse.success(flashcards));
  } catch (err) {
    next(err);
  }
}

// GET /api/guides/:id/quiz
export async function getQuizQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const guide = await prisma.guide.findFirst({ where: { id, userId } });
    if (!guide) return res.status(404).json(ApiResponse.error('Guide not found.', 404));

    const questions = await prisma.quizQuestion.findMany({
      where: { guideId: id },
      orderBy: { orderIndex: 'asc' },
    });

    const formattedQuestions = questions.map(q => ({
      ...q,
      options: parseJson(q.options),
    }));

    return res.json(ApiResponse.success(formattedQuestions));
  } catch (err) {
    next(err);
  }
}

// GET /api/guides/:id/revision
export async function getRevisionSheet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const guide = await prisma.guide.findFirst({ where: { id, userId } });
    if (!guide) return res.status(404).json(ApiResponse.error('Guide not found.', 404));

    const revisionSheet = await prisma.revisionSheet.findUnique({
      where: { guideId: id },
      include: { sections: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!revisionSheet) return res.status(404).json(ApiResponse.error('Revision sheet not found.', 404));

    const formattedSheet = {
      ...revisionSheet,
      sections: revisionSheet.sections.map(s => ({
        ...s,
        bulletPoints: parseJson(s.bulletPoints),
      })),
    };

    return res.json(ApiResponse.success(formattedSheet));
  } catch (err) {
    next(err);
  }
}
