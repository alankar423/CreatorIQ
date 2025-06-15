import { prisma } from './client';
import type { User, Channel, Analysis, AnalysisType, AnalysisStatus } from '@prisma/client';

// User queries
export class UserQueries {
 static async findById(id: string) {
   return prisma.user.findUnique({
     where: { id },
     include: {
       analyses: { take: 5, orderBy: { createdAt: 'desc' } },
       savedChannels: { include: { channel: true } }
     }
   });
 }

 static async findByEmail(email: string) {
   return prisma.user.findUnique({
     where: { email }
   });
 }

 static async create(data: {
   email: string;
   name: string;
   googleId?: string;
   avatarUrl?: string;
 }) {
   return prisma.user.create({
     data: {
       ...data,
       quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
     }
   });
 }

 static async updateQuota(userId: string, quotaUsed: number) {
   return prisma.user.update({
     where: { id: userId },
     data: { usedQuota: quotaUsed }
   });
 }

 static async resetMonthlyQuota(userId: string) {
   return prisma.user.update({
     where: { id: userId },
     data: {
       usedQuota: 0,
       quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
     }
   });
 }
}

// Channel queries
export class ChannelQueries {
 static async findByYouTubeId(youtubeChannelId: string) {
   return prisma.channel.findUnique({
     where: { youtubeChannelId },
     include: {
       analyses: { take: 10, orderBy: { createdAt: 'desc' } }
     }
   });
 }

 static async createOrUpdate(data: {
   youtubeChannelId: string;
   title: string;
   description?: string;
   subscriberCount: bigint;
   videoCount: number;
   viewCount: bigint;
   publishedAt: Date;
   thumbnailUrl?: string;
   topics: string[];
   contentType: string;
 }) {
   return prisma.channel.upsert({
     where: { youtubeChannelId: data.youtubeChannelId },
     create: data,
     update: {
       title: data.title,
       description: data.description,
       subscriberCount: data.subscriberCount,
       videoCount: data.videoCount,
       viewCount: data.viewCount,
       thumbnailUrl: data.thumbnailUrl,
       topics: data.topics,
       updatedAt: new Date()
     }
   });
 }

 static async search(query: string, limit = 10) {
   return prisma.channel.findMany({
     where: {
       OR: [
         { title: { contains: query, mode: 'insensitive' } },
         { description: { contains: query, mode: 'insensitive' } }
       ]
     },
     take: limit,
     orderBy: { subscriberCount: 'desc' }
   });
 }

 static async updateAnalysisCount(channelId: string) {
   return prisma.channel.update({
     where: { id: channelId },
     data: {
       analysisCount: { increment: 1 },
       lastAnalyzedAt: new Date()
     }
   });
 }
}

// Analysis queries
export class AnalysisQueries {
 static async create(data: {
   userId: string;
   channelId: string;
   analysisType: AnalysisType;
 }) {
   return prisma.analysis.create({
     data,
     include: {
       user: true,
       channel: true
     }
   });
 }

 static async findById(id: string) {
   return prisma.analysis.findUnique({
     where: { id },
     include: {
       user: true,
       channel: true
     }
   });
 }

 static async updateStatus(id: string, status: AnalysisStatus) {
   return prisma.analysis.update({
     where: { id },
     data: {
       status,
       ...(status === 'COMPLETED' && { completedAt: new Date() })
     }
   });
 }

 static async updateResults(id: string, results: {
   strengthsAnalysis?: string;
   weaknessesAnalysis?: string;
   opportunitiesAnalysis?: string;
   competitorAnalysis?: string;
   contentStrategy?: string;
   overallScore?: number;
   contentQualityScore?: number;
   engagementScore?: number;
   growthPotentialScore?: number;
   aiModel?: string;
   promptVersion?: string;
   processingTimeMs?: number;
   costCents?: number;
 }) {
   return prisma.analysis.update({
     where: { id },
     data: {
       ...results,
       status: 'COMPLETED',
       completedAt: new Date()
     }
   });
 }

 static async findByUser(userId: string, limit = 20, offset = 0) {
   return prisma.analysis.findMany({
     where: { userId },
     include: {
       channel: true
     },
     orderBy: { createdAt: 'desc' },
     take: limit,
     skip: offset
   });
 }

 static async findByChannel(channelId: string, limit = 10) {
   return prisma.analysis.findMany({
     where: { channelId },
     include: {
       user: { select: { id: true, name: true } }
     },
     orderBy: { createdAt: 'desc' },
     take: limit
   });
 }
}
