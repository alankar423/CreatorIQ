// Rate limiting middleware
import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './error-handler';

interface RateLimitConfig {
 windowMs: number; // Time window in milliseconds
 max: number; // Maximum requests per window
 message?: string;
 skipSuccessfulRequests?: boolean;
 skipFailedRequests?: boolean;
}

interface RateLimitStore {
 [key: string]: {
   count: number;
   resetTime: number;
 };
}

class MemoryStore {
 private store: RateLimitStore = {};

 increment(key: string, windowMs: number): { totalHits: number; timeToReset: number } {
   const now = Date.now();
   const resetTime = now + windowMs;

   if (!this.store[key] || this.store[key].resetTime <= now) {
     this.store[key] = {
       count: 1,
       resetTime
     };
   } else {
     this.store[key].count++;
   }

   return {
     totalHits: this.store[key].count,
     timeToReset: Math.max(0, this.store[key].resetTime - now)
   };
 }

 // Clean up expired entries periodically
 cleanup(): void {
   const now = Date.now();
   Object.keys(this.store).forEach(key => {
     if (this.store[key].resetTime <= now) {
       delete this.store[key];
     }
   });
 }
}

// Global store instance
const store = new MemoryStore();

// Clean up expired entries every 10 minutes
setInterval(() => store.cleanup(), 10 * 60 * 1000);

// Create rate limiter middleware
export function createRateLimiter(config: RateLimitConfig) {
 return (req: Request, res: Response, next: NextFunction): void => {
   // Generate key based on IP and user ID if available
   const identifier = req.user?.id || req.ip || 'anonymous';
   const key = `${req.route?.path || req.path}:${identifier}`;

   const result = store.increment(key, config.windowMs);

   // Add rate limit headers
   res.set({
     'X-RateLimit-Limit': config.max.toString(),
     'X-RateLimit-Remaining': Math.max(0, config.max - result.totalHits).toString(),
     'X-RateLimit-Reset': new Date(Date.now() + result.timeToReset).toISOString()
   });

   if (result.totalHits > config.max) {
     throw new RateLimitError(
       config.message || `Too many requests, please try again later`
     );
   }

   next();
 };
}

// Default rate limiter for general API usage
export const rateLimiter = createRateLimiter({
 windowMs: 15 * 60 * 1000, // 15 minutes
 max: 100, // 100 requests per 15 minutes
 message: 'Too many requests from this IP, please try again later'
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = createRateLimiter({
 windowMs: 15 * 60 * 1000, // 15 minutes
 max: 5, // 5 login attempts per 15 minutes
 message: 'Too many authentication attempts, please try again later'
});

// Analysis rate limiter (more restrictive)
export const analysisRateLimiter = createRateLimiter({
 windowMs: 60 * 60 * 1000, // 1 hour
 max: 20, // 20 analyses per hour for free users
 message: 'Analysis rate limit exceeded, please upgrade or try again later'
});

// Premium user rate limiter (more generous)
export const premiumRateLimiter = createRateLimiter({
 windowMs: 60 * 60 * 1000, // 1 hour
 max: 100, // 100 analyses per hour for premium users
 message: 'Analysis rate limit exceeded, please try again later'
});

// Dynamic rate limiter based on user subscription
export function subscriptionBasedRateLimiter(req: Request, res: Response, next: NextFunction): void {
 const user = req.user;
 
 if (!user) {
   // No user, apply strictest limits
   return analysisRateLimiter(req, res, next);
 }

 switch (user.subscriptionStatus) {
   case 'PRO':
     // PRO users get highest limits
     return createRateLimiter({
       windowMs: 60 * 60 * 1000,
       max: 200,
       message: 'Rate limit exceeded, please try again later'
     })(req, res, next);

   case 'CREATOR':
     // CREATOR users get moderate limits
     return createRateLimiter({
       windowMs: 60 * 60 * 1000,
       max: 50,
       message: 'Rate limit exceeded, please try again later'
     })(req, res, next);

   default: // FREE
     // FREE users get basic limits
     return analysisRateLimiter(req, res, next);
 }
}

// Export rate limiter for specific endpoints
export const endpointRateLimiters = {
 // Auth endpoints
 login: authRateLimiter,
 register: authRateLimiter,
 
 // Analysis endpoints  
 createAnalysis: subscriptionBasedRateLimiter,
 
 // Search endpoints
 searchChannels: createRateLimiter({
   windowMs: 60 * 1000, // 1 minute
   max: 30, // 30 searches per minute
   message: 'Search rate limit exceeded'
 }),
 
 // Export endpoints
 exportData: createRateLimiter({
   windowMs: 60 * 60 * 1000, // 1 hour
   max: 10, // 10 exports per hour
   message: 'Export rate limit exceeded'
 })
};
