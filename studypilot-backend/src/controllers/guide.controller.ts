import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';

// GET /api/guides — list current user's guides
export const getGuides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guides = await prisma.guide.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        subject: true,
        sourceType: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            flashcards: true,
            quizQuestions: true,
          },
        },
      },
    });
    return res.json(ApiResponse.success(guides));
  } catch (err) {
    next(err);
  }
};

// POST /api/guides — create new guide
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
        sourceType: sourceType || 'pdf',
        notesText,
        youtubeUrl,
        status: 'processing',
      },
    });

    return res.status(201).json(ApiResponse.success(guide, 'Guide created successfully', 201));
  } catch (err) {
    next(err);
  }
};

// GET /api/guides/:id — get single guide by ID
export const getGuideById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guide = await prisma.guide.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
      include: {
        uploadedFiles: true,
        flashcards: true,
        quizQuestions: true,
        weakTopics: true,
        studyPlan: true,
      },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    return res.json(ApiResponse.success(guide));
  } catch (err) {
    next(err);
  }
};

// PUT /api/guides/:id — update a guide
export const updateGuide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, subject, status } = req.body;

    const existingGuide = await prisma.guide.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    });

    if (!existingGuide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    const updated = await prisma.guide.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? title : existingGuide.title,
        description: description !== undefined ? description : existingGuide.description,
        subject: subject !== undefined ? subject : existingGuide.subject,
        status: status !== undefined ? status : existingGuide.status,
      },
    });

    return res.json(ApiResponse.success(updated, 'Guide updated successfully'));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/guides/:id — delete a guide
export const deleteGuide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guide = await prisma.guide.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    await prisma.guide.delete({
      where: { id: req.params.id },
    });

    return res.json(ApiResponse.success(null, 'Guide deleted successfully'));
  } catch (err) {
    next(err);
  }
};
