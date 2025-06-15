// Database model types - matching Prisma schema

// User types
export interface User {
 id: string;
 email: string;
 name: string;
 avatarUrl?: string;
 googleId?: string;
 emailVerified?: Date;
 subscriptionStatus: SubscriptionStatus;
 subscriptionId?: string;
 customerId?: string;
 monthlyQuota: number;
 usedQuota: number;
 quotaResetDate: Date;
 createdAt: Date;
 updatedAt: Date;
 lastLoginAt?: Date;
}

export enum SubscriptionStatus {
 FREE = 'FREE',
 CREATOR = 'CREATOR',
 PRO = 'PRO',
 CANCELLED = 'CANCELLED',
 PAST_DUE = 'PAST_DUE',
 UNPAID = 'UNPAID'
}

// Channel types
export interface Channel {
 id: string;
 youtubeChannelId: string;
 title: string;
 description?: string;
 customUrl?: string;
 subscriberCount: bigint;
 videoCount: number;
 viewCount: bigint;
 publishedAt: Date;
 thumbnailUrl?: string;
 country?: string;
 language?: string;
 topics: string[];
 contentType: ContentType;
 uploadFrequency?: UploadFrequency;
 averageViews?: bigint;
 averageEngagement?: number;
 lastAnalyzedAt?: Date;
 analysisCount: number;
 createdAt: Date;
 updatedAt: Date;
}

export enum ContentType {
 EDUCATIONAL = 'EDUCATIONAL',
 ENTERTAINMENT = 'ENTERTAINMENT',
 GAMING = 'GAMING',
 MUSIC = 'MUSIC',
 NEWS = 'NEWS',
 SPORTS = 'SPORTS',
 TECHNOLOGY = 'TECHNOLOGY',
 LIFESTYLE = 'LIFESTYLE',
 BUSINESS = 'BUSINESS',
 MIXED = 'MIXED'
}

export enum UploadFrequency {
 DAILY = 'DAILY',
 WEEKLY = 'WEEKLY',
 BIWEEKLY = 'BIWEEKLY',
 MONTHLY = 'MONTHLY',
 IRREGULAR = 'IRREGULAR'
}

// Analysis types
export interface Analysis {
 id: string;
 userId: string;
 channelId: string;
 analysisType: AnalysisType;
 status: AnalysisStatus;
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
 createdAt: Date;
 updatedAt: Date;
 completedAt?: Date;
}

export enum AnalysisType {
 QUICK_SCAN = 'QUICK_SCAN',
 DEEP_DIVE = 'DEEP_DIVE',
 COMPETITOR_COMPARE = 'COMPETITOR_COMPARE',
 GROWTH_STRATEGY = 'GROWTH_STRATEGY'
}

export enum AnalysisStatus {
 PENDING = 'PENDING',
 PROCESSING = 'PROCESSING',
 COMPLETED = 'COMPLETED',
 FAILED = 'FAILED',
 CANCELLED = 'CANCELLED'
}
