import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiResponse } from '../utils/response';

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        ApiResponse.error('Authorization token is required', 401)
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Attach user to request
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(
        ApiResponse.error('Token has expired. Please log in again.', 401)
      );
    }
    return res.status(401).json(
      ApiResponse.error('Invalid token', 401)
    );
  }
};
