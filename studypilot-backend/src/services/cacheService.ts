interface CacheEntry {
  data: any;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedGuide(cacheKey: string): any | null {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export function setCachedGuide(cacheKey: string, data: any): void {
  memoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateCachedGuide(guideId: string, userId: string): void {
  memoryCache.delete(`guide:${userId}:${guideId}`);
}

// Cache key for individual guide
export function guideKey(userId: string, guideId: string): string {
  return `guide:${userId}:${guideId}`;
}
