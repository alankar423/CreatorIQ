// Claude/Anthropic integration service

import type { AIAnalysisRequest, AIAnalysisResponse, AIModelConfig, AIServiceResponse } from './types';
import { PromptTemplates } from './prompts';

export class ClaudeService {
 private apiKey: string;
 private baseUrl: string = 'https://api.anthropic.com/v1'\;
 
 // Model configurations
 private static readonly MODEL_CONFIGS: Record<string, AIModelConfig> = {
   'claude-3-opus': {
     provider: 'claude',
     model: 'claude-3-opus-20240229',
     maxTokens: 4096,
     temperature: 0.7,
     costPerInputToken: 0.015, // $15 per 1M tokens
     costPerOutputToken: 0.075  // $75 per 1M tokens
   },
   'claude-3-sonnet': {
     provider: 'claude',
     model: 'claude-3-sonnet-20240229',
     maxTokens: 4096,
     temperature: 0.7,
     costPerInputToken: 0.003, // $3 per 1M tokens
     costPerOutputToken: 0.015  // $15 per 1M tokens
   },
   'claude-3-haiku': {
     provider: 'claude',
     model: 'claude-3-haiku-20240307',
     maxTokens: 4096,
     temperature: 0.7,
     costPerInputToken: 0.00025, // $0.25 per 1M tokens
     costPerOutputToken: 0.00125  // $1.25 per 1M tokens
   }
 };

 constructor(apiKey?: string) {
   this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
   if (!this.apiKey) {
     throw new Error('Anthropic API key is required');
   }
 }

 // Main analysis method
 async analyzeChannel(
   request: AIAnalysisRequest,
   model: string = 'claude-3-sonnet'
 ): Promise<AIServiceResponse<AIAnalysisResponse>> {
   const startTime = Date.now();
   const requestId = this.generateRequestId();

   try {
     // Get appropriate prompt template
     const promptTemplate = PromptTemplates.getPromptTemplate(request.analysisType);
     
     // Prepare prompt variables
     const variables = {
       channelTitle: request.channelData.title,
       channelDescription: request.channelData.description,
       subscriberCount: request.channelData.subscriberCount.toLocaleString(),
       videoCount: request.channelData.videoCount.toLocaleString(),
       viewCount: request.channelData.viewCount.toLocaleString(),
       contentType: request.channelData.contentType,
       topics: request.channelData.topics.join(', '),
       recentVideos: request.channelData.recentVideos || []
     };

     // Generate final prompt
     const prompt = PromptTemplates.replaceVariables(promptTemplate.template, variables);
     
     // Get model config
     const config = ClaudeService.MODEL_CONFIGS[model];
     if (!config) {
       throw new Error(`Unsupported model: ${model}`);
     }

     // Make API call
     const response = await this.makeAPICall(prompt, model, config);
     
     // Parse response
     const analysisResult = this.parseAnalysisResponse(response.content);
     
     // Calculate actual costs
     const totalCost = this.calculateCost(
       response.usage.input_tokens,
       response.usage.output_tokens,
       config
     );

     const processingTime = Date.now() - startTime;

     // Add metadata to result
     analysisResult.metadata = {
       aiModel: model,
       promptVersion: promptTemplate.version,
       processingTime,
       confidence: this.calculateConfidence(analysisResult),
       costCents: Math.round(totalCost * 100)
     };

     return {
       success: true,
       data: analysisResult,
       metadata: {
         requestId,
         processingTime,
         tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
         costCents: Math.round(totalCost * 100)
       }
     };

   } catch (error) {
     return {
       success: false,
       error: {
         code: 'CLAUDE_ERROR',
         message: error.message,
         provider: 'claude'
       },
       metadata: {
         requestId,
         processingTime: Date.now() - startTime,
         tokensUsed: 0,
         costCents: 0
       }
     };
   }
 }

 // Make actual API call to Anthropic
 private async makeAPICall(prompt: string, model: string, config: AIModelConfig) {
   const response = await fetch(`${this.baseUrl}/messages`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-api-key': this.apiKey,
       'anthropic-version': '2023-06-01'
     },
     body: JSON.stringify({
       model: config.model,
       max_tokens: config.maxTokens,
       temperature: config.temperature,
       system: 'You are an expert YouTube channel analyst. Provide detailed, actionable insights in valid JSON format only. Do not include any text outside the JSON response.',
       messages: [
         {
           role: 'user',
           content: prompt
         }
       ]
     })
   });

   if (!response.ok) {
     const error = await response.json();
     throw new Error(`Claude API Error: ${error.error?.message || 'Unknown error'}`);
   }

   const data = await response.json();
   return {
     content: data.content[0].text,
     usage: data.usage
   };
 }

 // Parse AI response into structured format
 private parseAnalysisResponse(content: string): AIAnalysisResponse {
   try {
     // Claude sometimes includes text before/after JSON, so extract JSON
     const jsonMatch = content.match(/\{[\s\S]*\}/);
     if (!jsonMatch) {
       throw new Error('No JSON found in response');
     }

     const parsed = JSON.parse(jsonMatch[0]);
     
     // Validate required fields
     if (!parsed.strengths || !parsed.weaknesses || !parsed.opportunities || !parsed.scores) {
       throw new Error('Invalid response format: missing required fields');
     }

     return {
       strengths: {
         summary: parsed.strengths.summary || '',
         details: Array.isArray(parsed.strengths.details) ? parsed.strengths.details : [],
         score: this.validateScore(parsed.strengths.score)
       },
       weaknesses: {
         summary: parsed.weaknesses.summary || '',
         details: Array.isArray(parsed.weaknesses.details) ? parsed.weaknesses.details : [],
         areas: Array.isArray(parsed.weaknesses.areas) ? parsed.weaknesses.areas : []
       },
       opportunities: {
         summary: parsed.opportunities.summary || '',
         recommendations: Array.isArray(parsed.opportunities.recommendations) 
           ? parsed.opportunities.recommendations 
           : []
       },
       competitors: parsed.competitors || undefined,
       contentStrategy: parsed.contentStrategy || undefined,
       scores: {
         overall: this.validateScore(parsed.scores.overall),
         contentQuality: this.validateScore(parsed.scores.contentQuality),
         engagement: this.validateScore(parsed.scores.engagement),
         growthPotential: this.validateScore(parsed.scores.growthPotential)
       },
       metadata: {
         aiModel: '',
         promptVersion: '',
         processingTime: 0,
         confidence: 0,
         costCents: 0
       }
     };
   } catch (error) {
     throw new Error(`Failed to parse Claude response: ${error.message}`);
   }
 }

 // Utility methods
 private validateScore(score: any): number {
   const num = Number(score);
   if (isNaN(num)) return 0;
   return Math.max(0, Math.min(100, Math.round(num)));
 }

 private calculateCost(inputTokens: number, outputTokens: number, config: AIModelConfig): number {
   const inputCost = (inputTokens / 1000000) * config.costPerInputToken * 1000; // Convert to cents
   const outputCost = (outputTokens / 1000000) * config.costPerOutputToken * 1000; // Convert to cents
   return inputCost + outputCost;
 }

 private calculateConfidence(result: AIAnalysisResponse): number {
   // Simple confidence calculation based on response completeness
   let confidence = 0.6; // base confidence (Claude tends to be more thorough)
   
   if (result.strengths.details.length >= 3) confidence += 0.1;
   if (result.weaknesses.details.length >= 2) confidence += 0.1;
   if (result.opportunities.recommendations.length >= 1) confidence += 0.1;
   if (result.scores.overall > 0) confidence += 0.05;
   if (result.contentStrategy) confidence += 0.05;
   
   return Math.min(1.0, confidence);
 }

 private generateRequestId(): string {
   return `claude_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
 }

 // Get model configuration
 static getModelConfig(model: string): AIModelConfig | undefined {
   return this.MODEL_CONFIGS[model];
 }

 // Get available models
 static getAvailableModels(): string[] {
   return Object.keys(this.MODEL_CONFIGS);
 }
}
