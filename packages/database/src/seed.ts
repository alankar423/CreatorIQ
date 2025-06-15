import { prisma } from './client';
import { ContentType, SubscriptionStatus, AnalysisType } from '@prisma/client';

// Seed data for development and testing
export async function seedDatabase() {
 console.log('🌱 Starting database seed...');

 // Create test users
 const testUsers = await Promise.all([
   prisma.user.upsert({
     where: { email: 'test@example.com' },
     update: {},
     create: {
       email: 'test@example.com',
       name: 'Test User',
       subscriptionStatus: SubscriptionStatus.FREE,
       monthlyQuota: 5,
       usedQuota: 2,
       quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
     }
   }),
   prisma.user.upsert({
     where: { email: 'premium@example.com' },
     update: {},
     create: {
       email: 'premium@example.com',
       name: 'Premium User',
       subscriptionStatus: SubscriptionStatus.PRO,
       monthlyQuota: -1, // unlimited
       usedQuota: 15,
       quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
     }
   })
 ]);

 console.log(`✅ Created ${testUsers.length} test users`);

 // Create test channels
 const testChannels = await Promise.all([
   prisma.channel.upsert({
     where: { youtubeChannelId: 'UC_test_channel_1' },
     update: {},
     create: {
       youtubeChannelId: 'UC_test_channel_1',
       title: 'Tech Reviews Channel',
       description: 'Latest technology reviews and tutorials',
       subscriberCount: BigInt(150000),
       videoCount: 250,
       viewCount: BigInt(5000000),
       publishedAt: new Date('2020-01-15'),
       contentType: ContentType.TECHNOLOGY,
       topics: ['technology', 'reviews', 'tutorials'],
       analysisCount: 3
     }
   }),
   prisma.channel.upsert({
     where: { youtubeChannelId: 'UC_test_channel_2' },
     update: {},
     create: {
       youtubeChannelId: 'UC_test_channel_2',
       title: 'Cooking Adventures',
       description: 'Delicious recipes and cooking tips',
       subscriberCount: BigInt(85000),
       videoCount: 180,
       viewCount: BigInt(2500000),
       publishedAt: new Date('2021-03-20'),
       contentType: ContentType.LIFESTYLE,
       topics: ['cooking', 'recipes', 'food'],
       analysisCount: 1
     }
   }),
   prisma.channel.upsert({
     where: { youtubeChannelId: 'UC_test_channel_3' },
     update: {},
     create: {
       youtubeChannelId: 'UC_test_channel_3',
       title: 'Gaming Pro Tips',
       description: 'Professional gaming strategies and gameplay',
       subscriberCount: BigInt(320000),
       videoCount: 450,
       viewCount: BigInt(12000000),
       publishedAt: new Date('2019-08-10'),
       contentType: ContentType.GAMING,
       topics: ['gaming', 'esports', 'strategy'],
       analysisCount: 5
     }
   })
 ]);

 console.log(`✅ Created ${testChannels.length} test channels`);

 // Create test analyses
 const testAnalyses = await Promise.all([
   prisma.analysis.create({
     data: {
       userId: testUsers[0].id,
       channelId: testChannels[0].id,
       analysisType: AnalysisType.QUICK_SCAN,
       status: 'COMPLETED',
       strengthsAnalysis: 'Strong technical content with clear explanations',
       weaknessesAnalysis: 'Could improve video thumbnails and titles',
       opportunitiesAnalysis: 'Trending topics in AI and machine learning',
       overallScore: 78,
       contentQualityScore: 82,
       engagementScore: 74,
       growthPotentialScore: 76,
       aiModel: 'gpt-4',
       promptVersion: 'v1.0',
       processingTimeMs: 3500,
       costCents: 25,
       completedAt: new Date()
     }
   }),
   prisma.analysis.create({
     data: {
       userId: testUsers[1].id,
       channelId: testChannels[1].id,
       analysisType: AnalysisType.DEEP_DIVE,
       status: 'COMPLETED',
       strengthsAnalysis: 'Excellent production quality and engaging personality',
       weaknessesAnalysis: 'Upload schedule could be more consistent',
       opportunitiesAnalysis: 'Collaborate with other food channels, create seasonal content',
       competitorAnalysis: 'Similar channels have 200K+ subscribers with consistent uploads',
       contentStrategy: 'Focus on quick recipes for busy professionals',
       overallScore: 85,
       contentQualityScore: 90,
       engagementScore: 82,
       growthPotentialScore: 83,
       aiModel: 'claude-3',
       promptVersion: 'v1.2',
       processingTimeMs: 7200,
       costCents: 45,
       completedAt: new Date()
     }
   })
 ]);

 console.log(`✅ Created ${testAnalyses.length} test analyses`);

 // Create saved channels
 await prisma.savedChannel.createMany({
   data: [
     {
       userId: testUsers[0].id,
       channelId: testChannels[0].id,
       notes: 'Great for staying updated on tech trends',
       tags: ['technology', 'learning']
     },
     {
       userId: testUsers[0].id,
       channelId: testChannels[2].id,
       notes: 'Gaming inspiration for my own channel',
       tags: ['gaming', 'competitor']
     }
   ]
 });

 console.log('✅ Created saved channels');

 // Create usage logs
 await prisma.usageLog.createMany({
   data: [
     {
       userId: testUsers[0].id,
       analysisId: testAnalyses[0].id,
       action: 'ANALYSIS_CREATED',
       resourceType: 'analysis',
       resourceId: testAnalyses[0].id,
       costCents: 25,
       quotaUsed: 1
     },
     {
       userId: testUsers[1].id,
       analysisId: testAnalyses[1].id,
       action: 'ANALYSIS_CREATED',
       resourceType: 'analysis',
       resourceId: testAnalyses[1].id,
       costCents: 45,
       quotaUsed: 1
     }
   ]
 });

 console.log('✅ Created usage logs');

 console.log('🎉 Database seed completed successfully!');
}

// Helper function to clear all data (for testing)
export async function clearDatabase() {
 console.log('🧹 Clearing database...');

 await prisma.usageLog.deleteMany();
 await prisma.savedChannel.deleteMany();
 await prisma.feedback.deleteMany();
 await prisma.analysis.deleteMany();
 await prisma.channel.deleteMany();
 await prisma.user.deleteMany();

 console.log('✅ Database cleared');
}

// Run seed if called directly
if (require.main === module) {
 seedDatabase()
   .catch((e) => {
     console.error('❌ Seed failed:', e);
     process.exit(1);
   })
   .finally(async () => {
     await prisma.$disconnect();
   });
}
