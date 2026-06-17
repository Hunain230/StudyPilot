import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { hashPassword, comparePassword } from '../utils/hash';
import { signToken } from '../utils/jwt';
import { ApiResponse } from '../utils/response';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json(
        ApiResponse.error('Name, email, and password are required', 400)
      );
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json(
        ApiResponse.error('Name must be between 2 and 100 characters', 400)
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(
        ApiResponse.error('Invalid email format', 400)
      );
    }

    // Min 8 chars, at least 1 uppercase + digit
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json(
        ApiResponse.error('Password must be at least 8 characters long and contain at least one uppercase letter and one number', 400)
      );
    }

    // 2. Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json(
        ApiResponse.error('Email is already registered', 409)
      );
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create user
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });

    // 5. Sign JWT
    const token = signToken({ userId: user.id, email: user.email });

    return res.status(201).json(
      ApiResponse.success({ token, user }, 'Account created successfully', 201)
    );
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(
        ApiResponse.error('Email and password are required', 400)
      );
    }

    // 1. Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json(
        ApiResponse.error('Invalid email or password', 401)
      );
    }

    // 2. Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json(
        ApiResponse.error('Invalid email or password', 401)
      );
    }

    // 3. Sign token
    const token = signToken({ userId: user.id, email: user.email });

    return res.status(200).json(
      ApiResponse.success({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      }, 'Login successful')
    );
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: { guides: true },
        },
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
