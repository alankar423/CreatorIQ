// YouTube API related types

export interface YouTubeChannelData {
 id: string;
 title: string;
 description: string;
 customUrl?: string;
 publishedAt: string;
 thumbnails: {
   default?: YouTubeThumbnail;
   medium?: YouTubeThumbnail;
   high?: YouTubeThumbnail;
 };
 statistics: {
   viewCount: string;
   subscriberCount: string;
   hiddenSubscriberCount: boolean;
   videoCount: string;
 };
 brandingSettings?: {
   channel?: {
     title: string;
     description: string;
     keywords?: string;
     country?: string;
   };
 };
 topicDetails?: {
   topicIds: string[];
   topicCategories: string[];
 };
}

export interface YouTubeThumbnail {
 url: string;
 width: number;
 height: number;
}

export interface YouTubeVideoData {
 id: string;
 title: string;
 description: string;
 publishedAt: string;
 thumbnails: {
   default?: YouTubeThumbnail;
   medium?: YouTubeThumbnail;
   high?: YouTubeThumbnail;
   standard?: YouTubeThumbnail;
   maxres?: YouTubeThumbnail;
 };
 statistics: {
   viewCount: string;
   likeCount?: string;
   commentCount?: string;
 };
 duration: string; // ISO 8601 duration format
 tags?: string[];
 categoryId: string;
}

export interface YouTubeSearchResult {
 channelId: string;
 channelTitle: string;
 description: string;
 thumbnails: {
   default?: YouTubeThumbnail;
   medium?: YouTubeThumbnail;
   high?: YouTubeThumbnail;
 };
 publishedAt: string;
}

export interface YouTubeChannelAnalytics {
 subscriberGrowth: {
   period: string; // 'day', 'week', 'month'
   data: Array<{
     date: string;
     subscribers: number;
     growth: number;
   }>;
 };
 viewAnalytics: {
   totalViews: number;
   averageViewsPerVideo: number;
   topVideos: YouTubeVideoData[];
 };
 engagementMetrics: {
   averageLikes: number;
   averageComments: number;
   engagementRate: number; // percentage
 };
}
