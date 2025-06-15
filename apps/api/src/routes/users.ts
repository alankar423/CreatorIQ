// User routes
import { Router } from 'express';
import { ValidationError } from '../middleware/error-handler';
import { UserQueries, AnalysisQueries } from '@creatoriq/database';
import type { 
 UpdateUserRequest,
 UpdateUserResponse,
 GetUserStatsResponse,
 APIResponse 
} from '@creatoriq/shared-types';

const router = Router();

// GET /api/users/me
router.get('/me', async (req, res, next) => {
 try {
   const userId = req.user!.id;

   // Get fresh user data
   const user = await UserQueries.findById(userId);
   if (!user) {
     throw new ValidationError('User not found');
   }

   const response: APIResponse<any> = {
     success: true,
     data: {
       user: {
         id: user.id,
         email: user.email,
         name: user.name,
         avatarUrl: user.avatarUrl,
         subscriptionStatus: user.subscriptionStatus,
         quotaInfo: {
           monthly: user.monthlyQuota,
           used: user.usedQuota,
           remaining: Math.max(0, user.monthlyQuota - user.usedQuota),
           resetDate: user.quotaResetDate.toISOString()
         },
         createdAt: user.createdAt.toISOString(),
         lastLoginAt: user.lastLoginAt?.toISOString()
       }
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// PUT /api/users/me
router.put('/me', async (req, res, next) => {
 try {
   const userId = req.user!.id;
   const { name, avatarUrl }: UpdateUserRequest = req.body;

   // Validate input
   if (name && (name.length < 1 || name.length > 100)) {
     throw new ValidationError('Name must be between 1 and 100 characters');
   }

   if (avatarUrl && !isValidUrl(avatarUrl)) {
     throw new ValidationError('Invalid avatar URL');
   }

   // Update user
   const updatedUser = await UserQueries.update(userId, {
     ...(name && { name }),
     ...(avatarUrl && { avatarUrl })
   });

   const response: APIResponse<UpdateUserResponse> = {
     success: true,
     data: {
       user: {
         id: updatedUser.id,
         email: updatedUser.email,
         name: updatedUser.name,
         avatarUrl: updatedUser.avatarUrl,
         subscriptionStatus: updatedUser.subscriptionStatus,
         permissions: getUserPermissions(updatedUser.subscriptionStatus),
         quotaInfo: {
           monthly: updatedUser.monthlyQuota,
           used: updatedUser.usedQuota,
           remaining: Math.max(0, updatedUser.monthlyQuota - updatedUser.usedQuota),
           resetDate: updatedUser.quotaResetDate.toISOString()
         }
       }
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// GET /api/users/stats
router.get('/stats', async (req, res, next) => {
 try {
   const userId = req.user!.id;

   // Get user statistics
   const [
     totalAnalyses,
     recentAnalyses,
     savedChannels,
     monthlyUsage
   ] = await Promise.all([
     AnalysisQueries.countByUser(userId),
     AnalysisQueries.findByUser(userId, 5), // Last 5 analyses
     SavedChannelQueries.findByUser(userId, 5), // Last 5 saved channels
     AnalysisQueries.getMonthlyUsage(userId)
   ]);

   // Calculate monthly spend
   const monthlySpend = recentAnalyses
     .filter(a => isThisMonth(a.createdAt))
     .reduce((sum, a) => sum + (a.costCents || 0), 0);

   const response: APIResponse<GetUserStatsResponse> = {
     success: true,
     data: {
       totalAnalyses,
       quotaUsed: req.user!.quotaInfo.used,
       quotaRemaining: req.user!.quotaInfo.remaining,
       monthlySpend,
       favoriteChannels: savedChannels.map(sc => ({
         id: sc.channel.id,
         youtubeChannelId: sc.channel.youtubeChannelId,
         title: sc.channel.title,
         description: sc.channel.description,
         customUrl: sc.channel.customUrl,
         subscriberCount: sc.channel.subscriberCount,
         videoCount: sc.channel.videoCount,
         viewCount: sc.channel.viewCount,
         publishedAt: sc.channel.publishedAt,
         thumbnailUrl: sc.channel.thumbnailUrl,
         country: sc.channel.country,
         language: sc.channel.language,
         topics: sc.channel.topics,
         contentType: sc.channel.contentType,
         uploadFrequency: sc.channel.uploadFrequency,
         averageViews: sc.channel.averageViews,
         averageEngagement: sc.channel.averageEngagement,
         lastAnalyzedAt: sc.channel.lastAnalyzedAt,
         analysisCount: sc.channel.analysisCount,
         createdAt: sc.channel.createdAt,
         updatedAt: sc.channel.updatedAt
       }))
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// GET /api/users/saved-channels
router.get('/saved-channels', async (req, res, next) => {
 try {
   const userId = req.user!.id;
   const {
     page = '1',
     limit = '20',
     sortBy = 'savedAt',
     sortOrder = 'desc'
   } = req.query as any;

   const pageNum = Math.max(1, parseInt(page));
   const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
   const offset = (pageNum - 1) * limitNum;

   const savedChannels = await SavedChannelQueries.findByUserPaginated(
     userId,
     limitNum,
     offset,
     sortBy,
     sortOrder
   );

   const totalCount = await SavedChannelQueries.countByUser(userId);
   const totalPages = Math.ceil(totalCount / limitNum);

   const response: APIResponse<any> = {
     success: true,
     data: {
       data: savedChannels.map(sc => ({
         id: sc.id,
         notes: sc.notes,
         tags: sc.tags,
         savedAt: sc.savedAt.toISOString(),
         channel: {
           id: sc.channel.id,
           youtubeChannelId: sc.channel.youtubeChannelId,
           title: sc.channel.title,
           description: sc.channel.description,
           subscriberCount: sc.channel.subscriberCount,
           thumbnailUrl: sc.channel.thumbnailUrl,
           contentType: sc.channel.contentType
         }
       })),
       pagination: {
         page: pageNum,
         limit: limitNum,
         total: totalCount,
         totalPages,
         hasNext: pageNum < totalPages,
         hasPrev: pageNum > 1
       }
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// DELETE /api/users/me
router.delete('/me', async (req, res, next) => {
 try {
   const userId = req.user!.id;
   const { confirmEmail } = req.body;

   // Require email confirmation for account deletion
   if (confirmEmail !== req.user!.email) {
     throw new ValidationError('Email confirmation does not match');
   }

   // Delete user and all associated data
   await UserQueries.deleteUserAndData(userId);

   const response: APIResponse<{ deleted: boolean }> = {
     success: true,
     data: { deleted: true },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// POST /api/users/reset-quota
router.post('/reset-quota', async (req, res, next) => {
 try {
   const userId = req.user!.id;

   // Only allow quota reset if it's time (monthly reset)
   const user = await UserQueries.findById(userId);
   if (!user) {
     throw new ValidationError('User not found');
   }

   const now = new Date();
   if (user.quotaResetDate > now) {
     throw new ValidationError('Quota reset not yet available');
   }

   // Reset quota
   const updatedUser = await UserQueries.resetMonthlyQuota(userId);

   const response: APIResponse<any> = {
     success: true,
     data: {
       quotaInfo: {
         monthly: updatedUser.monthlyQuota,
         used: updatedUser.usedQuota,
         remaining: Math.max(0, updatedUser.monthlyQuota - updatedUser.usedQuota),
         resetDate: updatedUser.quotaResetDate.toISOString()
       }
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// Helper functions
function isValidUrl(url: string): boolean {
 try {
   new URL(url);
   return true;
 } catch {
   return false;
 }
}

function isThisMonth(date: Date): boolean {
 const now = new Date();
 return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function getUserPermissions(subscriptionStatus: string): string[] {
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

// Mock query classes (these would be extended in the database package)
class SavedChannelQueries {
 static async findByUser(userId: string, limit: number) {
   // Implementation would be in database package
   return [];
 }
 
 static async findByUserPaginated(userId: string, limit: number, offset: number, sortBy: string, sortOrder: string) {
   // Implementation would be in database package  
   return [];
 }
 
 static async countByUser(userId: string) {
   // Implementation would be in database package
   return 0;
 }
}

export { router as userRoutes };
