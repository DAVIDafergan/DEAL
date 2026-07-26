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

export const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'יותר מדי פניות — נסה שנית בעוד שעה' },
});

// 10.5: property view/click analytics — lenient (a real visitor browsing many properties
// generates one event per view/click, easily dozens per session), just a backstop against a
// scripted flood inflating one property's numbers from a single IP.
export const eventTrackingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many events' },
});

// 11.13: shared-wishlist voting/commenting — a real group looking at one list can generate
// dozens of votes/comments within minutes (everyone reacting to every property), so this stays
// lenient like eventTrackingRateLimiter; still a backstop against a scripted spam flood.
export const wishlistRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'יותר מדי פעולות — נסו שוב בעוד דקה' },
});
