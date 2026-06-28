import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints (login, OAuth).
 * Allows 10 attempts per IP per 15 minutes — enough for legitimate use,
 * tight enough to slow credential-stuffing attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
  skipSuccessfulRequests: false,
});
