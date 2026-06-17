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
      error: `File too large. Maximum size is ${ENV.MAX_FILE_SIZE_MB}MB.`,
      message: `File too large. Maximum size is ${ENV.MAX_FILE_SIZE_MB}MB.`,
      code: 'FILE_TOO_LARGE',
      statusCode: 413,
      data: null,
    });
  }

  // Multer / general PDF invalid file type error
  if (err.message?.includes('Only PDF') || err.message?.includes('invalid file type')) {
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message,
      code: 'INVALID_FILE_TYPE',
      statusCode: 400,
      data: null,
    });
  }

  // YouTube / PDF empty content errors
  if (err.message?.includes('empty or contains only images') || err.message?.includes('PDF appears to be empty')) {
    return res.status(422).json({
      success: false,
      error: err.message,
      message: err.message,
      code: 'PDF_EMPTY',
      statusCode: 422,
      data: null,
    });
  }

  if (err.message?.includes('No transcript available') || err.message?.includes('transcript is too short')) {
    return res.status(422).json({
      success: false,
      error: err.message,
      message: err.message,
      code: 'TRANSCRIPT_UNAVAILABLE',
      statusCode: 422,
      data: null,
    });
  }

  if (err.message?.includes('Invalid YouTube URL')) {
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message,
      code: 'INVALID_YOUTUBE_URL',
      statusCode: 400,
      data: null,
    });
  }

  // Groq API errors
  if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.code === 'RATE_LIMITED') {
    return res.status(429).json({
      success: false,
      error: 'AI service is temporarily busy. Please wait a moment and try again.',
      message: 'AI service is temporarily busy. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
      statusCode: 429,
      data: null,
    });
  }

  if (err.status >= 500 && (err.message?.toLowerCase().includes('groq') || err.message?.toLowerCase().includes('ai'))) {
    return res.status(503).json({
      success: false,
      error: 'AI service is temporarily unavailable. Please try again in a few minutes.',
      message: 'AI service is temporarily unavailable. Please try again in a few minutes.',
      code: 'AI_UNAVAILABLE',
      statusCode: 503,
      data: null,
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'A guide from this source already exists.',
      message: 'A guide from this source already exists.',
      code: 'DUPLICATE_GUIDE',
      statusCode: 409,
      data: null,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found.',
      message: 'Record not found.',
      code: 'GUIDE_NOT_FOUND',
      statusCode: 404,
      data: null,
    });
  }

  // App custom errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
      code: err.code || 'APP_ERROR',
      statusCode: err.statusCode,
      data: null,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Invalid token',
      code: 'UNAUTHORIZED',
      statusCode: 401,
      data: null,
    });
  }

  // Default
  const statusCode = err.statusCode || err.status || 500;
  const message = ENV.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again.'
    : err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    error: message,
    message,
    code: 'INTERNAL_ERROR',
    statusCode,
    data: null,
  });
};
