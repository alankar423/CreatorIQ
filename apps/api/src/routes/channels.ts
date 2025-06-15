// Channel routes
import { Router } from 'express';
import { endpointRateLimiters } from '../middleware/rate-limiter';
import { ValidationError, NotFoundError } from '../middleware/error-handler';
import { ChannelQueries } from '@creatoriq/database';
import type { 
 ChannelSearchRequest,
 ChannelSearchResponse,
 GetChannelRequest,
 GetChannelResponse,
 APIResponse 
} from '@creatoriq/shared-types';

const router = Router();

// GET /api/channels/search
router.get('/search', endpointRateLimiters.searchChannels, async (req, res, next) => {
 try {
   const { q: query, type = 'channel_name', limit = '10' }: {
     q?: string;
     type?: 'channel_name' | 'channel_url' | 'channel_id';
     limit?: string;
   } = req.query as any;

   if (!query) {
     throw new ValidationError('Search query is required');
   }

   if (query.length < 2) {
     throw new ValidationError('Search query must be at least 2 characters');
   }

   const searchLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 results

   let channels;
   
   switch (type) {
     case 'channel_url':
       // Extract channel ID from YouTube URL
       const channelId = extractChannelIdFromUrl(query);
       if (channelId) {
         const channel = await ChannelQueries.findByYouTubeId(channelId);
         channels = channel ? [channel] : [];
       } else {
         channels = [];
       }
       break;
       
     case 'channel_id':
       const channel = await ChannelQueries.findByYouTubeId(query);
       channels = channel ? [channel] : [];
       break;
       
     default: // channel_name
       channels = await ChannelQueries.search(query, searchLimit);
       break;
   }

   const response: APIResponse<ChannelSearchResponse> = {
     success: true,
     data: {
       channels: channels.map(channel => ({
         id: channel.id,
         youtubeChannelId: channel.youtubeChannelId,
         title: channel.title,
         description: channel.description,
         customUrl: channel.customUrl,
         subscriberCount: channel.subscriberCount,
         videoCount: channel.videoCount,
         viewCount: channel.viewCount,
         publishedAt: channel.publishedAt,
         thumbnailUrl: channel.thumbnailUrl,
         country: channel.country,
         language: channel.language,
         topics: channel.topics,
         contentType: channel.contentType,
         uploadFrequency: channel.uploadFrequency,
         averageViews: channel.averageViews,
         averageEngagement: channel.averageEngagement,
         lastAnalyzedAt: channel.lastAnalyzedAt,
         analysisCount: channel.analysisCount,
         createdAt: channel.createdAt,
         updatedAt: channel.updatedAt
       }))
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// GET /api/channels/:channelId
router.get('/:channelId', async (req, res, next) => {
 try {
   const { channelId } = req.params;
   const { includeAnalyses = 'false' } = req.query as { includeAnalyses?: string };

   if (!channelId) {
     throw new ValidationError('Channel ID is required');
   }

   // Find channel by internal ID or YouTube channel ID
   let channel;
   if (channelId.startsWith('UC') || channelId.startsWith('@')) {
     // YouTube channel ID or handle
     channel = await ChannelQueries.findByYouTubeId(channelId);
   } else {
     // Internal channel ID
     channel = await ChannelQueries.findById(channelId);
   }

   if (!channel) {
     throw new NotFoundError('Channel not found');
   }

   // Get analyses if requested
   let analyses = undefined;
   if (includeAnalyses === 'true') {
     analyses = await AnalysisQueries.findByChannel(channel.id);
   }

   // Check if channel is saved by current user
   let isSaved = false;
   if (req.user) {
     isSaved = await SavedChannelQueries.isChannelSaved(req.user.id, channel.id);
   }

   const response: APIResponse<GetChannelResponse> = {
     success: true,
     data: {
       channel: {
         id: channel.id,
         youtubeChannelId: channel.youtubeChannelId,
         title: channel.title,
         description: channel.description,
         customUrl: channel.customUrl,
         subscriberCount: channel.subscriberCount,
         videoCount: channel.videoCount,
         viewCount: channel.viewCount,
         publishedAt: channel.publishedAt,
         thumbnailUrl: channel.thumbnailUrl,
         country: channel.country,
         language: channel.language,
         topics: channel.topics,
         contentType: channel.contentType,
         uploadFrequency: channel.uploadFrequency,
         averageViews: channel.averageViews,
         averageEngagement: channel.averageEngagement,
         lastAnalyzedAt: channel.lastAnalyzedAt,
         analysisCount: channel.analysisCount,
         createdAt: channel.createdAt,
         updatedAt: channel.updatedAt
       },
       analyses,
       isSaved
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// POST /api/channels/:channelId/save
router.post('/:channelId/save', async (req, res, next) => {
 try {
   const { channelId } = req.params;
   const { notes, tags }: { notes?: string; tags?: string[] } = req.body;
   const userId = req.user!.id;

   if (!channelId) {
     throw new ValidationError('Channel ID is required');
   }

   // Check if channel exists
   const channel = await ChannelQueries.findById(channelId);
   if (!channel) {
     throw new NotFoundError('Channel not found');
   }

   // Save channel for user
   const savedChannel = await SavedChannelQueries.create({
     userId,
     channelId: channel.id,
     notes,
     tags: tags || []
   });

   const response: APIResponse<{ saved: boolean; savedChannel: any }> = {
     success: true,
     data: {
       saved: true,
       savedChannel
     },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// DELETE /api/channels/:channelId/save
router.delete('/:channelId/save', async (req, res, next) => {
 try {
   const { channelId } = req.params;
   const userId = req.user!.id;

   if (!channelId) {
     throw new ValidationError('Channel ID is required');
   }

   // Remove saved channel
   await SavedChannelQueries.remove(userId, channelId);

   const response: APIResponse<{ saved: boolean }> = {
     success: true,
     data: { saved: false },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// GET /api/channels/:channelId/refresh
router.post('/:channelId/refresh', async (req, res, next) => {
 try {
   const { channelId } = req.params;

   if (!channelId) {
     throw new ValidationError('Channel ID is required');
   }

   // Find channel
   const channel = await ChannelQueries.findById(channelId);
   if (!channel) {
     throw new NotFoundError('Channel not found');
   }

   // Fetch fresh data from YouTube API
   const freshData = await fetchChannelFromYouTube(channel.youtubeChannelId);
   
   // Update channel with fresh data
   const updatedChannel = await ChannelQueries.createOrUpdate({
     youtubeChannelId: channel.youtubeChannelId,
     title: freshData.title,
     description: freshData.description,
     subscriberCount: BigInt(freshData.subscriberCount),
     videoCount: freshData.videoCount,
     viewCount: BigInt(freshData.viewCount),
     publishedAt: new Date(freshData.publishedAt),
     thumbnailUrl: freshData.thumbnailUrl,
     topics: freshData.topics,
     contentType: freshData.contentType
   });

   const response: APIResponse<{ channel: any }> = {
     success: true,
     data: { channel: updatedChannel },
     timestamp: new Date().toISOString()
   };

   res.json(response);
 } catch (error) {
   next(error);
 }
});

// Helper functions
function extractChannelIdFromUrl(url: string): string | null {
 const patterns = [
   /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
   /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
   /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
   /youtube\.com\/@([a-zA-Z0-9_-]+)/
 ];

 for (const pattern of patterns) {
   const match = url.match(pattern);
   if (match) {
     return match[1];
   }
 }

 return null;
}

async function fetchChannelFromYouTube(youtubeChannelId: string): Promise<any> {
 // This would integrate with YouTube API
 // For now, return mock data
 return {
   title: 'Updated Channel Title',
   description: 'Updated description',
   subscriberCount: 150000,
   videoCount: 250,
   viewCount: 5000000,
   publishedAt: '2020-01-15T00:00:00Z',
   thumbnailUrl: 'https://example.com/thumbnail.jpg',
   topics: ['technology', 'reviews'],
   contentType: 'TECHNOLOGY'
 };
}

// Import missing query classes (these would be in the database package)
class SavedChannelQueries {
 static async create(data: any) {
   // Implementation would be in database package
   return { id: 'saved_id', ...data };
 }
 
 static async remove(userId: string, channelId: string) {
   // Implementation would be in database package
 }
 
 static async isChannelSaved(userId: string, channelId: string): Promise<boolean> {
   // Implementation would be in database package
   return false;
 }
}

class AnalysisQueries {
 static async findByChannel(channelId: string) {
   // Implementation would be in database package
   return [];
 }
}

export { router as channelRoutes };
