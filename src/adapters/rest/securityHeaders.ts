import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 * Adds Content Security Policy and other security headers
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Content Security Policy
  // Allow Clerk domains for authentication and Cloudflare services
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.clerk.accounts.dev wss://*.clerk.accounts.dev https://cloudflareinsights.com",
    "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}
