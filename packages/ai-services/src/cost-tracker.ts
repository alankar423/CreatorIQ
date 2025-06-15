// Cost tracking and usage monitoring service

export interface UsageRecord {
  provider: string;
  model: string;
  analysisType: string;
  tokensUsed: number;
  costCents: number;
  processingTime: number;
  success: boolean;
  error?: string;
  timestamp?: Date;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCostCents: number;
  totalTokensUsed: number;
  averageProcessingTime: number;
  costByProvider: Record<string, number>;
  costByAnalysisType: Record<string, number>;
}

export class CostTracker {
  private usageHistory: UsageRecord[] = [];
  private readonly maxHistorySize = 10000; // Keep last 10k records in memory

  // Record a usage event
  async recordUsage(record: UsageRecord): Promise<void> {
    const fullRecord: UsageRecord = {
      ...record,
      timestamp: new Date()
    };

    this.usageHistory.push(fullRecord);

    // Keep history size manageable
    if (this.usageHistory.length > this.maxHistorySize) {
      this.usageHistory = this.usageHistory.slice(-this.maxHistorySize);
    }

    // In production, you'd also save to database here
    // await this.saveToDatabase(fullRecord);
  }

  // Get usage statistics for a timeframe
  getUsageStats(timeframe: 'today' | 'week' | 'month' = 'today'): UsageStats {
    const now = new Date();
    const cutoffDate = this.getCutoffDate(now, timeframe);
    
    const relevantRecords = this.usageHistory.filter(
      record => record.timestamp && record.timestamp >= cutoffDate
    );

    if (relevantRecords.length === 0) {
      return this.getEmptyStats();
    }

    const totalRequests = relevantRecords.length;
    const successfulRequests = relevantRecords.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const totalCostCents = relevantRecords.reduce((sum, r) => sum + r.costCents, 0);
    const totalTokensUsed = relevantRecords.reduce((sum, r) => sum + r.tokensUsed, 0);
    const averageProcessingTime = relevantRecords.reduce((sum, r) => sum + r.processingTime, 0) / totalRequests;

    // Cost by provider
    const costByProvider: Record<string, number> = {};
    relevantRecords.forEach(record => {
      costByProvider[record.provider] = (costByProvider[record.provider] || 0) + record.costCents;
    });

    // Cost by analysis type
    const costByAnalysisType: Record<string, number> = {};
    relevantRecords.forEach(record => {
      costByAnalysisType[record.analysisType] = (costByAnalysisType[record.analysisType] || 0) + record.costCents;
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalCostCents,
      totalTokensUsed,
      averageProcessingTime: Math.round(averageProcessingTime),
      costByProvider,
      costByAnalysisType
    };
  }

  // Get recent usage history
  getRecentUsage(limit: number = 50): UsageRecord[] {
    return this.usageHistory
      .slice(-limit)
      .reverse(); // Most recent first
  }

  // Get cost breakdown by time period
  getCostBreakdown(days: number = 30): Array<{
    date: string;
    costCents: number;
    requests: number;
  }> {
    const now = new Date();
    const breakdown: Record<string, { costCents: number; requests: number }> = {};

    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      breakdown[dateStr] = { costCents: 0, requests: 0 };
    }

    // Aggregate usage by date
    this.usageHistory.forEach(record => {
      if (!record.timestamp) return;
      
      const dateStr = record.timestamp.toISOString().split('T')[0];
      if (breakdown[dateStr]) {
        breakdown[dateStr].costCents += record.costCents;
        breakdown[dateStr].requests += 1;
      }
    });

    // Convert to array and sort by date
    return Object.entries(breakdown)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Estimate costs for upcoming usage
  estimateMonthlyBudget(recentDays: number = 7): {
    estimatedMonthlyCostCents: number;
    currentDailyAverage: number;
    projectedDailyUsage: number;
  } {
    const stats = this.getUsageStats('week');
    const recentCostBreakdown = this.getCostBreakdown(recentDays);
    
    const totalRecentCost = recentCostBreakdown.reduce((sum, day) => sum + day.costCents, 0);
    const currentDailyAverage = totalRecentCost / recentDays;
    
    // Project monthly cost based on recent usage
    const estimatedMonthlyCostCents = Math.round(currentDailyAverage * 30);
    
    return {
      estimatedMonthlyCostCents,
      currentDailyAverage: Math.round(currentDailyAverage),
      projectedDailyUsage: Math.round(currentDailyAverage)
    };
  }

  // Check if usage is within budget limits
  checkBudgetLimits(dailyLimitCents: number, monthlyLimitCents: number): {
    withinDailyLimit: boolean;
    withinMonthlyLimit: boolean;
    dailyUsed: number;
    monthlyUsed: number;
  } {
    const todayStats = this.getUsageStats('today');
    const monthStats = this.getUsageStats('month');

    return {
      withinDailyLimit: todayStats.totalCostCents <= dailyLimitCents,
      withinMonthlyLimit: monthStats.totalCostCents <= monthlyLimitCents,
      dailyUsed: todayStats.totalCostCents,
      monthlyUsed: monthStats.totalCostCents
    };
  }

  // Get provider performance comparison
  getProviderComparison(): Array<{
    provider: string;
    avgCostCents: number;
    avgProcessingTime: number;
    successRate: number;
    totalRequests: number;
  }> {
    const providerStats: Record<string, {
      totalCost: number;
      totalTime: number;
      totalRequests: number;
      successfulRequests: number;
    }> = {};

    this.usageHistory.forEach(record => {
      if (!providerStats[record.provider]) {
        providerStats[record.provider] = {
          totalCost: 0,
          totalTime: 0,
          totalRequests: 0,
          successfulRequests: 0
        };
      }

      const stats = providerStats[record.provider];
      stats.totalCost += record.costCents;
      stats.totalTime += record.processingTime;
      stats.totalRequests += 1;
      if (record.success) stats.successfulRequests += 1;
    });

    return Object.entries(providerStats).map(([provider, stats]) => ({
      provider,
      avgCostCents: Math.round(stats.totalCost / stats.totalRequests),
      avgProcessingTime: Math.round(stats.totalTime / stats.totalRequests),
      successRate: Math.round((stats.successfulRequests / stats.totalRequests) * 100),
      totalRequests: stats.totalRequests
    }));
  }

  // Clear usage history (for testing or privacy)
  clearHistory(): void {
    this.usageHistory = [];
  }

  // Export usage data for analysis
  exportUsageData(): UsageRecord[] {
    return [...this.usageHistory]; // Return copy
  }

  // Helper methods
  private getCutoffDate(now: Date, timeframe: string): Date {
    const cutoff = new Date(now);
    
    switch (timeframe) {
      case 'today':
        cutoff.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
    }
    
    return cutoff;
  }

  private getEmptyStats(): UsageStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCostCents: 0,
      totalTokensUsed: 0,
      averageProcessingTime: 0,
      costByProvider: {},
      costByAnalysisType: {}
    };
  }
}
