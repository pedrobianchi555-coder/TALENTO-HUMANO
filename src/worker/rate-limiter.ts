import type { Context } from "hono";

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

// In-memory store for rate limiting (per worker instance)
// For production, consider using Durable Objects or KV for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 * Limits requests per IP address within a time window
 */
export function rateLimiter(config: RateLimitConfig) {
  return async (c: Context, next: () => Promise<void>) => {
    // Get client IP from headers
    const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
                     c.req.header('X-Real-IP') ||
                     'unknown';
    
    const key = `${clientIP}:${c.req.path}`;
    const now = Date.now();
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) {  // 1% chance to clean up
      cleanupRateLimitStore(now);
    }
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset
      entry = {
        count: 1,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(key, entry);
      await next();
      return;
    }
    
    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return c.json({
        error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
        retryAfter: retryAfter
      }, 429, {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': entry.resetTime.toString()
      });
    }
    
    // Increment counter
    entry.count++;
    
    // Add rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
    c.header('X-RateLimit-Reset', entry.resetTime.toString());
    
    await next();
  };
}

// Clean up old entries from store
function cleanupRateLimitStore(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime + 60000) {  // Remove entries older than 1 minute past reset
      rateLimitStore.delete(key);
    }
  }
}

// Predefined rate limit configurations
export const RateLimits = {
  // Strict limit for authentication endpoints
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5 },  // 5 requests per 15 minutes
  
  // Moderate limit for write operations
  MUTATION: { windowMs: 60 * 1000, maxRequests: 30 },  // 30 requests per minute
  
  // Relaxed limit for read operations
  QUERY: { windowMs: 60 * 1000, maxRequests: 100 },  // 100 requests per minute
  
  // Very strict for sensitive operations
  SENSITIVE: { windowMs: 60 * 60 * 1000, maxRequests: 10 },  // 10 requests per hour
  
  // File uploads
  UPLOAD: { windowMs: 60 * 1000, maxRequests: 10 },  // 10 uploads per minute
};
