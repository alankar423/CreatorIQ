// Analysis routes
import { Router } from 'express';
import { requirePermission, requireQuota } from '../middleware/auth';
import { endpointRateLimiters } from '../middleware/rate-limiter';
import { ValidationError, NotFoundError } from '../middleware/error-handler';
import { AnalysisQueries, ChannelQueries, UserQueries } from '@creatoriq/database';
import { AIAnalyzer } from '@creatoriq/ai-services';
import type { 
 CreateAnalysisRequest,
 CreateAnalysisResponse,
 GetAnalysisResponse,
 ListAnalysesRequest,
 ListAnalysesResponse,
 APIResponse 
} from '@creatoriq/shared-types';

const router = Router();

// Initialize AI analyzer
const aiAnalyzer = new AIAnalyzer();

// POST /api/analysis
router.post('/', 
 requirePermission('CREATE_ANALYSIS'),
 requireQuota(1),
 endpointRateLimiters.createAnalysis,
 async (req, res, next) => {
   try {
     const { channelId, analysisType }: CreateAnalysisRequest = req.body;
     const userId = req.user!.id;

     // Validate input
     if (!channelId || !analysisType) {
       throw new ValidationError('Channel ID and analysis type are required');
     }

     const validAnalysisTypes = ['QUICK_SCAN', 'DEEP_DIVE', 'COMPETITOR_COMPARE', 'GROWTH_STRATEGY'];
     if (!validAnalysisTypes.includes(analysisType)) {
       throw new ValidationError('Invalid analysis type');
     }

     // Check subscription limits
     if (analysisType === 'DEEP_DIVE' && req.user!.subscriptionStatus === 'FREE') {
       throw new ValidationError('Deep dive analysis requires paid subscription');
     }

     // Find channel
     const channel = await ChannelQueries.findById(channelId);
     if (!channel) {
       throw new NotFoundError('Channel not found');
     }

     // Create analysis record
     const analysis = await AnalysisQueries.create({
       userId,
       channelId: channel.id,
       analysisType: analysisType as any
     });

     // Start AI analysis in background
     processAnalysisInBackground(analysis.id, channel, analysisType);

     // Update user quota
     await UserQueries.updateQuota(userId, req.user!.quotaInfo.used + 1);

     // Update channel analysis count
     await ChannelQueries.updateAnalysisCount(channel.id);

     const response: APIResponse<CreateAnalysisResponse> = {
       success: true,
       data: {
         analysis: {
           id: analysis.id,
           userId: analysis.userId,
           channelId: analysis.channelId,
           analysisType: analysis.analysisType,
           status: analysis.status,
           strengthsAnalysis: analysis.strengthsAnalysis,
           weaknessesAnalysis: analysis.weaknessesAnalysis,
           opportunitiesAnalysis: analysis.opportunitiesAnalysis,
           competitorAnalysis: analysis.competitorAnalysis,
           contentStrategy: analysis.contentStrategy,
           overallScore: analysis.overallScore,
           contentQualityScore: analysis.contentQualityScore,
           engagementScore: analysis.engagementScore,
           growthPotentialScore: analysis.growthPotentialScore,
           aiModel: analysis.aiModel,
           promptVersion: analysis.promptVersion,
           processingTimeMs: analysis.processingTimeMs,
           costCents: analysis.costCents,
           createdAt: analysis.createdAt,
           updatedAt: analysis.updatedAt,
           completedAt: analysis.completedAt
         },
         estimatedCompletionTime: getEstimatedCompletionTime(analysisType)
       },
       timestamp: new Date().toISOString()
     };

     res.status(201).json(response);
   } catch (error) {
     next(error);
   }
 }
);

// GET /api/analysis/:analysisId
router.get('/:analysisId', 
 requirePermission('VIEW_ANALYSIS'),
 async (req, res, next) => {
   try {
     const { analysisId } = req.params;
     const userId = req.user!.id;

     if (!analysisId) {
       throw new ValidationError('Analysis ID is required');
     }

     // Find analysis
     const analysis = await AnalysisQueries.findById(analysisId);
     if (!analysis) {
       throw new NotFoundError('Analysis not found');
     }

     // Check ownership
     if (analysis.userId !== userId) {
       throw new ValidationError('Access denied: not your analysis');
     }

     const response: APIResponse<GetAnalysisResponse> = {
       success: true,
       data: {
         analysis: {
           id: analysis.id,
           userId: analysis.userId,
           channelId: analysis.channelId,
           analysisType: analysis.analysisType,
           status: analysis.status,
           strengthsAnalysis: analysis.strengthsAnalysis,
           weaknessesAnalysis: analysis.weaknessesAnalysis,
           opportunitiesAnalysis: analysis.opportunitiesAnalysis,
           competitorAnalysis: analysis.competitorAnalysis,
           contentStrategy: analysis.contentStrategy,
           overallScore: analysis.overallScore,
           contentQualityScore: analysis.contentQualityScore,
           engagementScore: analysis.engagementScore,
           growthPotentialScore: analysis.growthPotentialScore,
           aiModel: analysis.aiModel,
           promptVersion: analysis.promptVersion,
           processingTimeMs: analysis.processingTimeMs,
           costCents: analysis.costCents,
           createdAt: analysis.createdAt,
           updatedAt: analysis.updatedAt,
           completedAt: analysis.completedAt
         },
         channel: {
           id: analysis.channel.id,
           youtubeChannelId: analysis.channel.youtubeChannelId,
           title: analysis.channel.title,
           description: analysis.channel.description,
           customUrl: analysis.channel.customUrl,
           subscriberCount: analysis.channel.subscriberCount,
           videoCount: analysis.channel.videoCount,
           viewCount: analysis.channel.viewCount,
           publishedAt: analysis.channel.publishedAt,
           thumbnailUrl: analysis.channel.thumbnailUrl,
           country: analysis.channel.country,
           language: analysis.channel.language,
           topics: analysis.channel.topics,
           contentType: analysis.channel.contentType,
           uploadFrequency: analysis.channel.uploadFrequency,
           averageViews: analysis.channel.averageViews,
           averageEngagement: analysis.channel.averageEngagement,
           lastAnalyzedAt: analysis.channel.lastAnalyzedAt,
           analysisCount: analysis.channel.analysisCount,
           createdAt: analysis.channel.createdAt,
           updatedAt: analysis.channel.updatedAt
         }
       },
       timestamp: new Date().toISOString()
     };

     res.json(response);
   } catch (error) {
     next(error);
   }
 }
);

// GET /api/analysis
router.get('/', 
 requirePermission('VIEW_ANALYSIS'),
 async (req, res, next) => {
   try {
     const userId = req.user!.id;
     const {
       page = '1',
       limit = '20',
       status,
       analysisType,
       channelId,
       sortBy = 'createdAt',
       sortOrder = 'desc'
     } = req.query as any;

     const pageNum = Math.max(1, parseInt(page));
     const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
     const offset = (pageNum - 1) * limitNum;

     // Build filters
     const filters: any = { userId };
     if (status) filters.status = status.split(',');
     if (analysisType) filters.analysisType = analysisType.split(',');
     if (channelId) filters.channelId = channelId;

     // Get analyses
     const analyses = await AnalysisQueries.findByUserWithFilters(
       filters,
       limitNum,
       offset,
       sortBy,
       sortOrder
     );

     const totalCount = await AnalysisQueries.countByUserWithFilters(filters);
     const totalPages = Math.ceil(totalCount / limitNum);

     const response: APIResponse<ListAnalysesResponse> = {
       success: true,
       data: {
         data: analyses.map(analysis => ({
           id: analysis.id,
           userId: analysis.userId,
           channelId: analysis.channelId,
           analysisType: analysis.analysisType,
           status: analysis.status,
           strengthsAnalysis: analysis.strengthsAnalysis,
           weaknessesAnalysis: analysis.weaknessesAnalysis,
           opportunitiesAnalysis: analysis.opportunitiesAnalysis,
           competitorAnalysis: analysis.competitorAnalysis,
           contentStrategy: analysis.contentStrategy,
           overallScore: analysis.overallScore,
           contentQualityScore: analysis.contentQualityScore,
           engagementScore: analysis.engagementScore,
           growthPotentialScore: analysis.growthPotentialScore,
           aiModel: analysis.aiModel,
           promptVersion: analysis.promptVersion,
           processingTimeMs: analysis.processingTimeMs,
           costCents: analysis.costCents,
           createdAt: analysis.createdAt,
           updatedAt: analysis.updatedAt,
           completedAt: analysis.completedAt
         })),
         pagination: {
           page: pageNum,
           limit: limitNum,
           total: totalCount,
           totalPages,
           hasNext: pageNum < totalPages,
           hasPrev: pageNum > 1
         },
         totalCost: analyses.reduce((sum, a) => sum + (a.costCents || 0), 0)
       },
       timestamp: new Date().toISOString()
     };

     res.json(response);
   } catch (error) {
     next(error);
   }
 }
);

// DELETE /api/analysis/:analysisId
router.delete('/:analysisId', async (req, res, next) => {
 try {
   const { analysisId } = req.params;
   const userId = req.user!.id;

   if (!analysisId) {
     throw new ValidationError('Analysis ID is required');
   }

   // Find analysis
   const analysis = await AnalysisQueries.findById(analysisId);
   if (!analysis) {
     throw new NotFoundError('Analysis not found');
   }

   // Check ownership
   if (analysis.userId !== userId) {
     throw new ValidationError('Access denied: not your analysis');
   }

   // Delete analysis
   await AnalysisQueries.delete(analysisId);

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

// Background processing function
async function processAnalysisInBackground(analysisId: string, channel: any, analysisType: string) {
 try {
   // Update status to processing
   await AnalysisQueries.updateStatus(analysisId, 'PROCESSING');

   // Prepare AI request
   const aiRequest = {
     channelData: {
       id: channel.youtubeChannelId,
       title: channel.title,
       description: channel.description || '',
       subscriberCount: Number(channel.subscriberCount),
       videoCount: channel.videoCount,
       viewCount: Number(channel.viewCount),
       contentType: channel.contentType,
       topics: channel.topics
     },
     analysisType: analysisType as any,
     options: {}
   };

   // Run AI analysis
   const result = await aiAnalyzer.analyzeChannel(aiRequest);

   if (result.success && result.data) {
     // Update analysis with results
     await AnalysisQueries.updateResults(analysisId, {
       strengthsAnalysis: result.data.strengths.summary,
       weaknessesAnalysis: result.data.weaknesses.summary,
       opportunitiesAnalysis: result.data.opportunities.summary,
       competitorAnalysis: result.data.competitors?.similarChannels.map(c => c.name).join(', '),
       contentStrategy: result.data.contentStrategy?.recommendedTopics.join(', '),
       overallScore: result.data.scores.overall,
       contentQualityScore: result.data.scores.contentQuality,
       engagementScore: result.data.scores.engagement,
       growthPotentialScore: result.data.scores.growthPotential,
       aiModel: result.data.metadata.aiModel,
       promptVersion: result.data.metadata.promptVersion,
       processingTimeMs: result.data.metadata.processingTime,
       costCents: result.data.metadata.costCents
     });
   } else {
     // Mark as failed
     await AnalysisQueries.updateStatus(analysisId, 'FAILED');
   }
 } catch (error) {
   console.error('Background analysis failed:', error);
   await AnalysisQueries.updateStatus(analysisId, 'FAILED');
 }
}

// Helper function
function getEstimatedCompletionTime(analysisType: string): number {
 switch (analysisType) {
   case 'QUICK_SCAN': return 30; // 30 seconds
   case 'DEEP_DIVE': return 120; // 2 minutes
   case 'COMPETITOR_COMPARE': return 90; // 1.5 minutes
   case 'GROWTH_STRATEGY': return 105; // 1.75 minutes
   default: return 60;
 }
}

export { router as analysisRoutes };
