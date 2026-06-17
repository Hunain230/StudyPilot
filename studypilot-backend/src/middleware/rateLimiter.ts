import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';

// Simple in-memory rate limiter
const requestLog: Map<string, number[]> = new Map();

const RPM_LIMIT = ENV.GROQ_RPM_LIMIT || 25; // Stay below Groq's 30 RPM

export function groqRateLimiter(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.userId || req.ip || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  const userRequests = requestLog.get(userId) || [];
  const recentRequests = userRequests.filter(ts => now - ts < windowMs);

  if (recentRequests.length >= RPM_LIMIT) {
    const oldestRequest = Math.min(...recentRequests);
    const retryAfterMs = windowMs - (now - oldestRequest);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    return res.status(429).json({
      success: false,
      error: `Too many guide generation requests. Please wait ${retryAfterSeconds} seconds.`,
      code: 'RATE_LIMITED',
      retryAfterSeconds,
    });
  }

  recentRequests.push(now);
  requestLog.set(userId, recentRequests);

  // Cleanup old entries periodically (1% chance per request)
  if (Math.random() < 0.01) {
    for (const [key, timestamps] of requestLog.entries()) {
      const fresh = timestamps.filter(ts => now - ts < windowMs);
      if (fresh.length === 0) {
        requestLog.delete(key);
      } else {
        requestLog.set(key, fresh);
      }
    }
  }

  next();
}
