// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './error-handler';
import { UserQueries } from '@creatoriq/database';
import type { AuthUser, UserPermission } from '@creatoriq/shared-types';

// Extend Express Request to include user
declare global {
 namespace Express {
   interface Request {
     user?: AuthUser;
   }
 }
}

export async function authMiddleware(
 req: Request,
 res: Response,
 next: NextFunction
): Promise<void> {
 try {
   const authHeader = req.headers.authorization;
   
   if (!authHeader || !authHeader.startsWith('Bearer ')) {
     throw new UnauthorizedError('Missing or invalid authorization header');
   }

   const token = authHeader.substring(7); // Remove 'Bearer ' prefix
   
   // Verify JWT token (simplified for now)
   const decoded = await verifyJWTToken(token);
   
   // Get user from database
   const user = await UserQueries.findById(decoded.userId);
   if (!user) {
     throw new UnauthorizedError('User not found');
   }

   // Add user to request
   req.user = {
     id: user.id,
     email: user.email,
     name: user.name,
     avatarUrl: user.avatarUrl,
     subscriptionStatus: user.subscriptionStatus,
     permissions: getUserPermissions(user.subscriptionStatus),
     quotaInfo: {
       monthly: user.monthlyQuota,
       used: user.usedQuota,
       remaining: Math.max(0, user.monthlyQuota - user.usedQuota),
       resetDate: user.quotaResetDate.toISOString()
     }
   };

   next();
 } catch (error) {
   next(error);
 }
}

// Optional auth middleware (doesn't throw if no token)
export async function optionalAuthMiddleware(
 req: Request,
 res: Response,
 next: NextFunction
): Promise<void> {
 try {
   const authHeader = req.headers.authorization;
   
   if (authHeader && authHeader.startsWith('Bearer ')) {
     await authMiddleware(req, res, next);
   } else {
     next();
   }
 } catch (error) {
   // For optional auth, continue without user if token is invalid
   next();
 }
}

// Permission check middleware
export function requirePermission(permission: UserPermission) {
 return (req: Request, res: Response, next: NextFunction): void => {
   if (!req.user) {
     throw new UnauthorizedError();
   }

   if (!req.user.permissions.includes(permission)) {
     throw new ForbiddenError(`Permission required: ${permission}`);
   }

   next();
 };
}

// Quota check middleware
export function requireQuota(quotaNeeded: number = 1) {
 return (req: Request, res: Response, next: NextFunction): void => {
   if (!req.user) {
     throw new UnauthorizedError();
   }

   if (req.user.quotaInfo.remaining < quotaNeeded) {
     throw new ForbiddenError('Insufficient quota remaining');
   }

   next();
 };
}

// Subscription level check
export function requireSubscription(minLevel: 'FREE' | 'CREATOR' | 'PRO') {
 const levels = { FREE: 0, CREATOR: 1, PRO: 2 };
 
 return (req: Request, res: Response, next: NextFunction): void => {
   if (!req.user) {
     throw new UnauthorizedError();
   }

   const userLevel = levels[req.user.subscriptionStatus] || 0;
   const requiredLevel = levels[minLevel];

   if (userLevel < requiredLevel) {
     throw new ForbiddenError(`${minLevel} subscription required`);
   }

   next();
 };
}

// JWT verification (simplified - in production use proper JWT library)
async function verifyJWTToken(token: string): Promise<{
 userId: string;
 email: string;
 exp: number;
}> {
 // This is a simplified version
 // In production, use jsonwebtoken library:
 // const jwt = require('jsonwebtoken');
 // return jwt.verify(token, process.env.JWT_SECRET);
 
 try {
   // For now, decode the base64 payload (NOT SECURE - just for development)
   const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
   
   if (payload.exp < Date.now() / 1000) {
     throw new Error('Token expired');
   }
   
   return payload;
 } catch (error) {
   throw new UnauthorizedError('Invalid token');
 }
}

// Get user permissions based on subscription
function getUserPermissions(subscriptionStatus: string): UserPermission[] {
 const basePermissions: UserPermission[] = [
   'CREATE_ANALYSIS',
   'VIEW_ANALYSIS',
   'SAVE_CHANNELS'
 ];

 switch (subscriptionStatus) {
   case 'CREATOR':
     return [
       ...basePermissions,
       'EXPORT_DATA',
       'ACCESS_API'
     ];
   
   case 'PRO':
     return [
       ...basePermissions,
       'EXPORT_DATA',
       'ACCESS_API',
       'UNLIMITED_ANALYSES',
       'PRIORITY_SUPPORT'
     ];
   
   default: // FREE
     return basePermissions;
 }
}

// Helper function to generate JWT (for login)
export function generateJWTToken(user: { id: string; email: string; subscriptionStatus: string }): string {
 // This is simplified - in production use proper JWT library
 const payload = {
   userId: user.id,
   email: user.email,
   subscriptionStatus: user.subscriptionStatus,
   iat: Math.floor(Date.now() / 1000),
   exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
 };

 // In production: return jwt.sign(payload, process.env.JWT_SECRET);
 return Buffer.from(JSON.stringify(payload)).toString('base64');
}
