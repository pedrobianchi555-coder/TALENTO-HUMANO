import type { Context } from "hono";

/**
 * Security headers middleware
 * Adds important HTTP security headers to all responses
 */
export function securityHeaders() {
  return async (c: Context, next: () => Promise<void>) => {
    await next();
    
    // Strict-Transport-Security (HSTS)
    // Forces HTTPS for 1 year
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // X-Content-Type-Options
    // Prevents MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options
    // Prevents clickjacking attacks
    c.header('X-Frame-Options', 'DENY');
    
    // X-XSS-Protection
    // Enables XSS filter in older browsers
    c.header('X-XSS-Protection', '1; mode=block');
    
    // Referrer-Policy
    // Controls referrer information
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content-Security-Policy
    // Restricts resource loading to prevent XSS
    // Note: Adjusted for development - tighten for production
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://accounts.google.com https://api.openai.com",
      "frame-src 'self' https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
    
    c.header('Content-Security-Policy', csp);
    
    // Permissions-Policy (formerly Feature-Policy)
    // Restricts browser features
    const permissionsPolicy = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()'
    ].join(', ');
    
    c.header('Permissions-Policy', permissionsPolicy);
  };
}
