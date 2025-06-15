import { APIResponse, PaginationParams, PaginatedResponse } from './common';
import { User, Channel, Analysis, AnalysisType } from './database';

// Auth API types
export interface LoginRequest {
 email: string;
 password: string;
}

export interface GoogleAuthRequest {
 token: string;
}

export interface AuthResponse {
 user: User;
 token: string;
 refreshToken: string;
}

// Channel API types
export interface ChannelSearchRequest {
 query: string;
 type?: 'channel_name' | 'channel_url' | 'channel_id';
}

export interface ChannelSearchResponse {
 channels: Channel[];
}

export interface GetChannelRequest {
 channelId: string;
 includeAnalyses?: boolean;
}

export interface GetChannelResponse {
 channel: Channel;
 analyses?: Analysis[];
 isSaved?: boolean;
}

// Analysis API types
export interface CreateAnalysisRequest {
 channelId: string;
 analysisType: AnalysisType;
}

export interface CreateAnalysisResponse {
 analysis: Analysis;
 estimatedCompletionTime: number; // seconds
}

export interface GetAnalysisRequest {
 analysisId: string;
}

export interface GetAnalysisResponse {
 analysis: Analysis;
 channel: Channel;
}

export interface ListAnalysesRequest extends PaginationParams {
 userId?: string;
 channelId?: string;
 status?: string[];
 analysisType?: AnalysisType[];
 dateFrom?: string;
 dateTo?: string;
}

export interface ListAnalysesResponse extends PaginatedResponse<Analysis> {
 totalCost?: number; // Total cost in cents
}

// User API types
export interface UpdateUserRequest {
 name?: string;
 avatarUrl?: string;
}

export interface UpdateUserResponse {
 user: User;
}

export interface GetUserStatsResponse {
 totalAnalyses: number;
 quotaUsed: number;
 quotaRemaining: number;
 monthlySpend: number; // in cents
 favoriteChannels: Channel[];
}

// Subscription API types
export interface CreateSubscriptionRequest {
 planId: string; // 'creator' or 'pro'
}

export interface CreateSubscriptionResponse {
 clientSecret: string; // Stripe payment intent client secret
 subscriptionId: string;
}

export interface UpdateSubscriptionRequest {
 planId?: string;
 action?: 'cancel' | 'reactivate';
}

// Generic API response wrappers
export type AuthAPIResponse<T = any> = APIResponse<T>;
export type ChannelAPIResponse<T = any> = APIResponse<T>;
export type AnalysisAPIResponse<T = any> = APIResponse<T>;
export type UserAPIResponse<T = any> = APIResponse<T>;
export type SubscriptionAPIResponse<T = any> = APIResponse<T>;
