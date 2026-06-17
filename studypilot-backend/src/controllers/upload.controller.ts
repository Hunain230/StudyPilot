import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';

// POST /api/upload — upload a file
export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.error('No file provided', 400));
    }

    const { guideId } = req.body;
    const file = req.file;

    const isPdf = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');

    const saved = await prisma.uploadedFile.create({
      data: {
        userId: req.user!.userId,
        guideId: guideId || null,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        fileType: isPdf ? 'pdf' : isImage ? 'image' : 'other',
      },
    });

    // We convert BigInt to string in JSON response to prevent serialization errors
    const responseData = {
      ...saved,
      sizeBytes: saved.sizeBytes.toString(),
    };

    return res.status(201).json(ApiResponse.success(responseData, 'File uploaded', 201));
  } catch (err) {
    next(err);
  }
};

// GET /api/upload — list uploaded files
export const getFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = await prisma.uploadedFile.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });

    const responseData = files.map(file => ({
      ...file,
      sizeBytes: file.sizeBytes.toString(),
    }));

    return res.json(ApiResponse.success(responseData));
  } catch (err) {
    next(err);
  }
};
