// Authentication routes
import { Router } from 'express';
import { authRateLimiter } from '../middleware/rate-limiter';
import { ValidationError } from '../middleware/error-handler';
import { generateJWTToken } from '../middleware/auth';
import { UserQueries } from '@creatoriq/database';
import type { 
 LoginRequest, 
 GoogleAuthRequest, 
 AuthResponse,
 APIResponse 
} from '@creatoriq/shared-types';

const router = Router();

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
 try {
   const { email, password }: LoginRequest = req.body;

   // Validate input
   if (!email || !password) {
     throw new ValidationError('Email and password are required');
   }

   if (!isValidEmail(email)) {
     throw new ValidationError('Invalid email format');
   }

   // Find user by email
   const user = await UserQueries.findByEmail(email);
   if (!user) {
     throw new ValidationError('Invalid email or password');
   }

   // Verify password (simplified - in production use bcrypt)
   const isValidPassword = await verifyPassword(password, user.email);
   if (!isValidPassword) {
     throw new ValidationError('Invalid email or password');
   }

   // Update last login
   await UserQueries.updateLastLogin(user.id);

   // Generate tokens
   const token = generateJWTToken({
     id: user.id,
     email: user.email,
     subscriptionStatus: user.subscriptionStatus
   });

   const refreshToken = generateRefreshToken(user.id);

   const response: APIResponse<AuthResponse> = {
     success: true,
     data: {
       user: {
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
       },
       token,
       refreshToken
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res, next) => {
 try {
   const { email, password, name, agreeToTerms } = req.body;

   // Validate input
   if (!email || !password || !name) {
     throw new ValidationError('Email, password, and name are required');
   }

   if (!agreeToTerms) {
     throw new ValidationError('You must agree to the terms of service');
   }

   if (!isValidEmail(email)) {
     throw new ValidationError('Invalid email format');
   }

   if (password.length < 8) {
     throw new ValidationError('Password must be at least 8 characters long');
   }

   // Check if user already exists
   const existingUser = await UserQueries.findByEmail(email);
   if (existingUser) {
     throw new ValidationError('User with this email already exists');
   }

   // Create new user
   const user = await UserQueries.create({
     email,
     name,
     // In production, hash the password: await bcrypt.hash(password, 10)
   });

   // Generate tokens
   const token = generateJWTToken({
     id: user.id,
     email: user.email,
     subscriptionStatus: user.subscriptionStatus
   });

   const refreshToken = generateRefreshToken(user.id);

   const response: APIResponse<AuthResponse> = {
     success: true,
     data: {
       user: {
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
       },
       token,
       refreshToken
     },
     timestamp: new Date().toISOString()
   };

   res.status(201).json(response);
 } catch (error) {
   next(error);
 }
});

// POST /api/auth/google
router.post('/google', authRateLimiter, async (req, res, next) => {
 try {
   const { token }: GoogleAuthRequest = req.body;

   if (!token) {
     throw new ValidationError('Google token is required');
   }

   // Verify Google token and get user info
   const googleUser = await verifyGoogleToken(token);
   
   // Find or create user
   let user = await UserQueries.findByEmail(googleUser.email);
   
   if (!user) {
     // Create new user from Google data
     user = await UserQueries.create({
       email: googleUser.email,
       name: googleUser.name,
       googleId: googleUser.id,
       avatarUrl: googleUser.picture
     });
   } else if (!user.googleId) {
     // Link existing account with Google
     await UserQueries.linkGoogleAccount(user.id, googleUser.id);
   }

   // Update last login
   await UserQueries.updateLastLogin(user.id);

   // Generate tokens
   const authToken = generateJWTToken({
     id: user.id,
     email: user.email,
     subscriptionStatus: user.subscriptionStatus
   });

   const refreshToken = generateRefreshToken(user.id);

   const response: APIResponse<AuthResponse> = {
     success: true,
     data: {
       user: {
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
       },
       token: authToken,
       refreshToken
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
 try {
   const { refreshToken } = req.body;

   if (!refreshToken) {
     throw new ValidationError('Refresh token is required');
   }

   // Verify refresh token
   const decoded = await verifyRefreshToken(refreshToken);
   
   // Get user
   const user = await UserQueries.findById(decoded.userId);
   if (!user) {
     throw new ValidationError('Invalid refresh token');
   }

   // Generate new access token
   const newToken = generateJWTToken({
     id: user.id,
     email: user.email,
     subscriptionStatus: user.subscriptionStatus
   });

   const response: APIResponse<{ token: string }> = {
     success: true,
     data: { token: newToken },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
 try {
   // In production, you'd invalidate the token in a blacklist/database
   const response: APIResponse<{ message: string }> = {
     success: true,
     data: { message: 'Logged out successfully' },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// Helper functions
function isValidEmail(email: string): boolean {
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 return emailRegex.test(email);
}

async function verifyPassword(password: string, email: string): Promise<boolean> {
 // Simplified password verification
 // In production, use bcrypt.compare(password, hashedPassword)
 return password.length >= 8; // Placeholder
}

function generateRefreshToken(userId: string): string {
 // Simplified refresh token generation
 // In production, use proper JWT with longer expiration
 const payload = {
   userId,
   type: 'refresh',
   exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
 };
 return Buffer.from(JSON.stringify(payload)).toString('base64');
}

async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
 try {
   const payload = JSON.parse(Buffer.from(token, 'base64').toString());
   
   if (payload.type !== 'refresh' || payload.exp < Date.now() / 1000) {
     throw new Error('Invalid refresh token');
   }
   
   return { userId: payload.userId };
 } catch (error) {
   throw new ValidationError('Invalid refresh token');
 }
}

async function verifyGoogleToken(token: string): Promise<{
 id: string;
 email: string;
 name: string;
 picture?: string;
}> {
 // Simplified Google token verification
 // In production, use Google's OAuth2 client library
 try {
   // Mock Google user data for development
   return {
     id: 'google_user_id',
     email: 'user@gmail.com',
     name: 'Google User',
     picture: 'https://example.com/avatar.jpg'
   };
 } catch (error) {
   throw new ValidationError('Invalid Google token');
 }
}

function getUserPermissions(subscriptionStatus: string): string[] {
 // This should match the logic in auth middleware
 const basePermissions = ['CREATE_ANALYSIS', 'VIEW_ANALYSIS', 'SAVE_CHANNELS'];

 switch (subscriptionStatus) {
   case 'CREATOR':
     return [...basePermissions, 'EXPORT_DATA', 'ACCESS_API'];
   case 'PRO':
     return [...basePermissions, 'EXPORT_DATA', 'ACCESS_API', 'UNLIMITED_ANALYSES', 'PRIORITY_SUPPORT'];
   default:
     return basePermissions;
 }
}

export { router as authRoutes };
