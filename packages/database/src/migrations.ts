import { prisma } from './client';

// Migration utilities and helpers
export class MigrationUtils {
 
 // Check if database is ready for the application
 static async checkDatabaseReady(): Promise<boolean> {
   try {
     // Try to query a basic table to ensure schema is applied
     await prisma.user.findFirst();
     return true;
   } catch (error) {
     console.error('Database not ready:', error.message);
     return false;
   }
 }

 // Get database version/migration status
 static async getDatabaseInfo() {
   try {
     const userCount = await prisma.user.count();
     const channelCount = await prisma.channel.count();
     const analysisCount = await prisma.analysis.count();
     
     return {
       isConnected: true,
       tables: {
         users: userCount,
         channels: channelCount,
         analyses: analysisCount
       },
       timestamp: new Date().toISOString()
     };
   } catch (error) {
     return {
       isConnected: false,
       error: error.message,
       timestamp: new Date().toISOString()
     };
   }
 }

 // Create database indexes for performance
 static async createIndexes() {
   try {
     // Note: In production, these would be in Prisma migration files
     // This is for development/manual optimization
     
     console.log('📊 Creating database indexes...');
     
     // User indexes
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);`;
     
     // Channel indexes
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_channels_youtube_id ON channels(youtube_channel_id);`;
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_channels_content_type ON channels(content_type);`;
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_channels_subscriber_count ON channels(subscriber_count DESC);`;
     
     // Analysis indexes
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);`;
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_analyses_channel_id ON analyses(channel_id);`;
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);`;
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);`;
     
     // Usage logs indexes
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);`;
     await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp DESC);`;
     
     console.log('✅ Database indexes created');
   } catch (error) {
     console.error('❌ Index creation failed:', error);
     throw error;
   }
 }

 // Clean up old data (for maintenance)
 static async cleanupOldData(daysToKeep = 90) {
   const cutoffDate = new Date();
   cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
   
   try {
     console.log(`🧹 Cleaning up data older than ${daysToKeep} days...`);
     
     // Delete old usage logs
     const deletedLogs = await prisma.usageLog.deleteMany({
       where: {
         timestamp: {
           lt: cutoffDate
         }
       }
     });
     
     // Delete old failed analyses
     const deletedAnalyses = await prisma.analysis.deleteMany({
       where: {
         status: 'FAILED',
         createdAt: {
           lt: cutoffDate
         }
       }
     });
     
     console.log(`✅ Cleanup completed: ${deletedLogs.count} logs, ${deletedAnalyses.count} failed analyses`);
     
     return {
       deletedLogs: deletedLogs.count,
       deletedAnalyses: deletedAnalyses.count
     };
   } catch (error) {
     console.error('❌ Cleanup failed:', error);
     throw error;
   }
 }

 // Reset user quotas (monthly job)
 static async resetMonthlyQuotas() {
   try {
     console.log('🔄 Resetting monthly quotas...');
     
     const now = new Date();
     const usersToReset = await prisma.user.updateMany({
       where: {
         quotaResetDate: {
           lte: now
         }
       },
       data: {
         usedQuota: 0,
         quotaResetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
       }
     });
     
     console.log(`✅ Reset quotas for ${usersToReset.count} users`);
     return usersToReset.count;
   } catch (error) {
     console.error('❌ Quota reset failed:', error);
     throw error;
   }
 }

 // Database health check with detailed info
 static async healthCheck() {
   try {
     const startTime = Date.now();
     
     // Test basic connectivity
     await prisma.$queryRaw`SELECT 1 as health_check`;
     
     // Get table counts
     const [userCount, channelCount, analysisCount] = await Promise.all([
       prisma.user.count(),
       prisma.channel.count(),
       prisma.analysis.count()
     ]);
     
     // Test write operation
     const testWrite = await prisma.$executeRaw`SELECT NOW() as current_time`;
     
     const responseTime = Date.now() - startTime;
     
     return {
       status: 'healthy',
       responseTime,
       tables: {
         users: userCount,
         channels: channelCount,
         analyses: analysisCount
       },
       timestamp: new Date().toISOString()
     };
   } catch (error) {
     return {
       status: 'unhealthy',
       error: error.message,
       timestamp: new Date().toISOString()
     };
   }
 }
}

// Export commonly used functions
export const {
 checkDatabaseReady,
 getDatabaseInfo,
 createIndexes,
 cleanupOldData,
 resetMonthlyQuotas,
 healthCheck
} = MigrationUtils;
