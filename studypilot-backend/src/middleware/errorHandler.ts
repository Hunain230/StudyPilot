import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';
import { ApiResponse } from '../utils/response';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[ERROR]', {
    message: err.message,
    name: err.name,
    code: err.code,
    status: err.status,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    stack: ENV.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Multer size limits
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File too large. Maximum size is ${ENV.MAX_FILE_SIZE_MB}MB.`,
        statusCode: 413,
      },
    });
  }

  // Multer / general PDF invalid file type error
  if (err.message?.includes('Only PDF') || err.message?.includes('invalid file type')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: err.message,
        statusCode: 400,
      },
    });
  }

  // YouTube / PDF empty content errors
  if (err.message?.includes('empty or contains only images') || err.message?.includes('PDF appears to be empty')) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'PDF_EMPTY',
        message: err.message,
        statusCode: 422,
      },
    });
  }

  if (err.message?.includes('No transcript available') || err.message?.includes('transcript is too short')) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'TRANSCRIPT_UNAVAILABLE',
        message: err.message,
        statusCode: 422,
      },
    });
  }

  if (err.message?.includes('Invalid YouTube URL')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_YOUTUBE_URL',
        message: err.message,
        statusCode: 400,
      },
    });
  }

  // Groq API errors
  if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.code === 'RATE_LIMITED') {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'AI service is temporarily busy. Please wait a moment and try again.',
        statusCode: 429,
      },
    });
  }

  if (err.status >= 500 && (err.message?.toLowerCase().includes('groq') || err.message?.toLowerCase().includes('ai'))) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_UNAVAILABLE',
        message: 'AI service is temporarily unavailable. Please try again in a few minutes.',
        statusCode: 503,
      },
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_GUIDE',
        message: 'A guide from this source already exists.',
        statusCode: 409,
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'GUIDE_NOT_FOUND',
        message: 'Record not found.',
        statusCode: 404,
      },
    });
  }

  // Zod Validation Errors
  if (err.name === 'ZodError') {
    const issues = err.errors || err.issues || [];
    const message = issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Invalid request payload.';
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        statusCode: 400,
      },
    });
  }

  // App custom errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
        statusCode: 401,
      },
    });
  }

  // Default
  const statusCode = err.statusCode || err.status || 500;
  const message = ENV.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again.'
    : err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      statusCode,
    },
  });
};
