import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';

// GET /api/users/profile - Get profile details (redundant with /auth/me but useful)
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json(ApiResponse.error('User not found', 404));
    }

    return res.json(ApiResponse.success(user));
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile - Update name or avatarUrl
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, avatarUrl } = req.body;

    if (name !== undefined && (name.length < 2 || name.length > 100)) {
      return res.status(400).json(
        ApiResponse.error('Name must be between 2 and 100 characters', 400)
      );
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return res.json(ApiResponse.success(updated, 'Profile updated successfully'));
  } catch (err) {
    next(err);
  }
};
