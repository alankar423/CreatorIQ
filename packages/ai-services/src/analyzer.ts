// Main AI analyzer orchestration service

import { OpenAIService } from './openai';
import { ClaudeService } from './claude';
import { CostTracker } from './cost-tracker';
import type { 
 AIAnalysisRequest, 
 AIAnalysisResponse, 
 AIProvider, 
 AIServiceResponse,
 CostEstimate 
} from './types';

export class AIAnalyzer {
 private openaiService?: OpenAIService;
 private claudeService?: ClaudeService;
 private costTracker: CostTracker;

 constructor(config?: {
   openaiApiKey?: string;
   claudeApiKey?: string;
 }) {
   // Initialize services based on available API keys
   if (config?.openaiApiKey || process.env.OPENAI_API_KEY) {
     this.openaiService = new OpenAIService(config?.openaiApiKey);
   }
   
   if (config?.claudeApiKey || process.env.ANTHROPIC_API_KEY) {
     this.claudeService = new ClaudeService(config?.claudeApiKey);
   }

   this.costTracker = new CostTracker();
 }

 // Main analysis method with provider selection
 async analyzeChannel(
   request: AIAnalysisRequest,
   options?: {
     provider?: AIProvider;
     model?: string;
     fallbackProvider?: AIProvider;
   }
 ): Promise<AIServiceResponse<AIAnalysisResponse>> {
   const provider = options?.provider || this.selectOptimalProvider(request);
   const model = options?.model || this.getDefaultModel(provider);

   // Estimate cost before processing
   const costEstimate = await this.estimateCost(request, provider, model);
   
   try {
     let result: AIServiceResponse<AIAnalysisResponse>;

     // Process with selected provider
     switch (provider) {
       case 'openai':
         if (!this.openaiService) {
           throw new Error('OpenAI service not initialized. Check API key.');
         }
         result = await this.openaiService.analyzeChannel(request, model);
         break;

       case 'claude':
         if (!this.claudeService) {
           throw new Error('Claude service not initialized. Check API key.');
         }
         result = await this.claudeService.analyzeChannel(request, model);
         break;

       default:
         throw new Error(`Unsupported provider: ${provider}`);
     }

     // Track successful usage
     if (result.success) {
       await this.costTracker.recordUsage({
         provider,
         model,
         analysisType: request.analysisType,
         tokensUsed: result.metadata.tokensUsed,
         costCents: result.metadata.costCents,
         processingTime: result.metadata.processingTime,
         success: true
       });
     }

     return result;

   } catch (error) {
     // Try fallback provider if specified
     if (options?.fallbackProvider && options.fallbackProvider !== provider) {
       console.warn(`Primary provider ${provider} failed, trying fallback ${options.fallbackProvider}`);
       return this.analyzeChannel(request, {
         provider: options.fallbackProvider,
         model: this.getDefaultModel(options.fallbackProvider)
       });
     }

     // Track failed usage
     await this.costTracker.recordUsage({
       provider,
       model,
       analysisType: request.analysisType,
       tokensUsed: 0,
       costCents: 0,
       processingTime: 0,
       success: false,
       error: error.message
     });

     return {
       success: false,
       error: {
         code: 'ANALYSIS_FAILED',
         message: error.message,
         provider
       },
       metadata: {
         requestId: `failed_${Date.now()}`,
         processingTime: 0,
         tokensUsed: 0,
         costCents: 0
       }
     };
   }
 }

 // Batch analysis for multiple channels
 async analyzeMultipleChannels(
   requests: AIAnalysisRequest[],
   options?: {
     provider?: AIProvider;
     concurrency?: number;
     delayMs?: number;
   }
 ): Promise<AIServiceResponse<AIAnalysisResponse>[]> {
   const concurrency = options?.concurrency || 3;
   const delayMs = options?.delayMs || 1000;
   const results: AIServiceResponse<AIAnalysisResponse>[] = [];

   // Process in batches to respect rate limits
   for (let i = 0; i < requests.length; i += concurrency) {
     const batch = requests.slice(i, i + concurrency);
     
     const batchPromises = batch.map(request => 
       this.analyzeChannel(request, { provider: options?.provider })
     );

     const batchResults = await Promise.all(batchPromises);
     results.push(...batchResults);

     // Add delay between batches
     if (i + concurrency < requests.length && delayMs > 0) {
       await this.delay(delayMs);
     }
   }

   return results;
 }

 // Cost estimation
 async estimateCost(
   request: AIAnalysisRequest,
   provider: AIProvider,
   model?: string
 ): Promise<CostEstimate> {
   const selectedModel = model || this.getDefaultModel(provider);
   
   // Get model config
   let modelConfig;
   switch (provider) {
     case 'openai':
       modelConfig = OpenAIService.getModelConfig(selectedModel);
       break;
     case 'claude':
       modelConfig = ClaudeService.getModelConfig(selectedModel);
       break;
     default:
       throw new Error(`Unsupported provider: ${provider}`);
   }

   if (!modelConfig) {
     throw new Error(`Unknown model: ${selectedModel} for provider: ${provider}`);
   }

   // Estimate input tokens based on request
   const estimatedInputTokens = this.estimateInputTokens(request);
   const estimatedOutputTokens = this.estimateOutputTokens(request.analysisType);

   const inputCost = (estimatedInputTokens / 1000) * modelConfig.costPerInputToken;
   const outputCost = (estimatedOutputTokens / 1000) * modelConfig.costPerOutputToken;

   return {
     provider,
     model: selectedModel,
     estimatedInputTokens,
     estimatedOutputTokens,
     estimatedCostCents: Math.round((inputCost + outputCost) * 100)
   };
 }

 // Get usage statistics
 async getUsageStats(timeframe?: 'today' | 'week' | 'month') {
   return this.costTracker.getUsageStats(timeframe);
 }

 // Provider selection logic
 private selectOptimalProvider(request: AIAnalysisRequest): AIProvider {
   // Logic for selecting the best provider based on analysis type and availability
   
   // Prefer Claude for detailed analyses (generally better at structured thinking)
   if (request.analysisType === 'DEEP_DIVE' || request.analysisType === 'GROWTH_STRATEGY') {
     if (this.claudeService) return 'claude';
   }

   // Prefer OpenAI for quick scans (faster and cheaper)
   if (request.analysisType === 'QUICK_SCAN') {
     if (this.openaiService) return 'openai';
   }

   // Fallback to any available service
   if (this.openaiService) return 'openai';
   if (this.claudeService) return 'claude';

   throw new Error('No AI services available. Check API keys.');
 }

 // Get default model for provider
 private getDefaultModel(provider: AIProvider): string {
   switch (provider) {
     case 'openai':
       return 'gpt-4-turbo';
     case 'claude':
       return 'claude-3-sonnet';
     default:
       throw new Error(`Unknown provider: ${provider}`);
   }
 }

 // Estimate input tokens based on request data
 private estimateInputTokens(request: AIAnalysisRequest): number {
   let baseTokens = 500; // Base prompt tokens
   
   // Add tokens for channel data
   baseTokens += Math.ceil(request.channelData.title.length / 4);
   baseTokens += Math.ceil((request.channelData.description || '').length / 4);
   baseTokens += 50; // Numbers and metadata
   
   // Add tokens for recent videos if included
   if (request.channelData.recentVideos) {
     baseTokens += request.channelData.recentVideos.length * 100; // ~100 tokens per video
   }

   // Analysis type specific additions
   switch (request.analysisType) {
     case 'QUICK_SCAN':
       return baseTokens + 300;
     case 'DEEP_DIVE':
       return baseTokens + 800;
     case 'COMPETITOR_COMPARE':
       return baseTokens + 600;
     case 'GROWTH_STRATEGY':
       return baseTokens + 700;
     default:
       return baseTokens + 500;
   }
 }

 // Estimate output tokens based on analysis type
 private estimateOutputTokens(analysisType: string): number {
   switch (analysisType) {
     case 'QUICK_SCAN':
       return 800;
     case 'DEEP_DIVE':
       return 1500;
     case 'COMPETITOR_COMPARE':
       return 1200;
     case 'GROWTH_STRATEGY':
       return 1400;
     default:
       return 1000;
   }
 }

 // Utility delay function
 private delay(ms: number): Promise<void> {
   return new Promise(resolve => setTimeout(resolve, ms));
 }

 // Get available providers
 getAvailableProviders(): AIProvider[] {
   const providers: AIProvider[] = [];
   if (this.openaiService) providers.push('openai');
   if (this.claudeService) providers.push('claude');
   return providers;
 }

 // Get available models for a provider
 getAvailableModels(provider: AIProvider): string[] {
   switch (provider) {
     case 'openai':
       return OpenAIService.getAvailableModels();
     case 'claude':
       return ClaudeService.getAvailableModels();
     default:
       return [];
   }
 }
}
