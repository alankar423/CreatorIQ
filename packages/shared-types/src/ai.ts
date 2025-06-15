// AI service related types

export interface AIAnalysisRequest {
  channelData: {
    id: string;
    title: string;
    description: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    recentVideos?: Array<{
      title: string;
      views: number;
      likes: number;
      comments: number;
      publishedAt: string;
    }>;
  };
  analysisType: 'QUICK_SCAN' | 'DEEP_DIVE' | 'COMPETITOR_COMPARE' | 'GROWTH_STRATEGY';
  options?: {
    includeCompetitorAnalysis?: boolean;
    includeGrowthStrategy?: boolean;
    focusAreas?: string[];
  };
}

export interface AIAnalysisResponse {
  strengths: {
    summary: string;
    details: string[];
    score: number; // 0-100
  };
  weaknesses: {
    summary: string;
    details: string[];
    areas: string[];
  };
  opportunities: {
    summary: string;
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      estimatedImpact: string;
    }>;
  };
  competitors?: {
    similarChannels: Array<{
      channelId: string;
      name: string;
      subscribers: number;
      whyRelevant: string;
    }>;
    competitiveAdvantages: string[];
    gaps: string[];
  };
  contentStrategy?: {
    recommendedTopics: string[];
    contentGaps: string[];
    optimizationTips: string[];
  };
  scores: {
    overall: number;
    contentQuality: number;
    engagement: number;
    growthPotential: number;
  };
  metadata: {
    aiModel: string;
    promptVersion: string;
    processingTime: number;
    confidence: number; // 0-1
  };
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  version: string;
  analysisType: string;
  template: string;
  variables: string[];
  createdAt: string;
  isActive: boolean;
}

export interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  maxTokens: number;
  temperature: number;
  costPerToken: number; // in cents
}
