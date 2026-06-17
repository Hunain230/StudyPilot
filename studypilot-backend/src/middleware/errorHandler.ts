import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';
import { ApiResponse } from '../utils/response';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[ERROR]', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json(
      ApiResponse.error('A record with this value already exists', 409)
    );
  }

  if (err.code === 'P2025') {
    return res.status(404).json(
      ApiResponse.error('Record not found', 404)
    );
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(
      ApiResponse.error(`File too large. Max size is ${ENV.MAX_FILE_SIZE_MB}MB`, 413)
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(ApiResponse.error('Invalid token', 401));
  }

  // Generic
  const statusCode = err.statusCode || err.status || 500;
  const message = ENV.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message || 'Internal server error';

  return res.status(statusCode).json(ApiResponse.error(message, statusCode));
};
