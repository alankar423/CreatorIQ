// OpenAI integration service

import type { AIAnalysisRequest, AIAnalysisResponse, AIModelConfig, AIServiceResponse } from './types';
import { PromptTemplates } from './prompts';

export class OpenAIService {
 private apiKey: string;
 private baseUrl: string = 'https://api.openai.com/v1'\;
 
 // Model configurations
 private static readonly MODEL_CONFIGS: Record<string, AIModelConfig> = {
   'gpt-4': {
     provider: 'openai',
     model: 'gpt-4',
     maxTokens: 8192,
     temperature: 0.7,
     costPerInputToken: 0.003, // $0.03 per 1K tokens
     costPerOutputToken: 0.006  // $0.06 per 1K tokens
   },
   'gpt-4-turbo': {
     provider: 'openai',
     model: 'gpt-4-turbo-preview',
     maxTokens: 4096,
     temperature: 0.7,
     costPerInputToken: 0.001, // $0.01 per 1K tokens
     costPerOutputToken: 0.003  // $0.03 per 1K tokens
   },
   'gpt-3.5-turbo': {
     provider: 'openai',
     model: 'gpt-3.5-turbo',
     maxTokens: 4096,
     temperature: 0.7,
     costPerInputToken: 0.0005, // $0.0005 per 1K tokens
     costPerOutputToken: 0.0015 // $0.0015 per 1K tokens
   }
 };

 constructor(apiKey?: string) {
   this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
   if (!this.apiKey) {
     throw new Error('OpenAI API key is required');
   }
 }

 // Main analysis method
 async analyzeChannel(
   request: AIAnalysisRequest,
   model: string = 'gpt-4-turbo'
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
     
     // Estimate costs
     const inputTokens = PromptTemplates.estimateTokens(prompt);
     const config = OpenAIService.MODEL_CONFIGS[model];
     if (!config) {
       throw new Error(`Unsupported model: ${model}`);
     }

     // Make API call
     const response = await this.makeAPICall(prompt, model, config);
     
     // Parse response
     const analysisResult = this.parseAnalysisResponse(response.content);
     
     // Calculate actual costs
     const totalCost = this.calculateCost(
       response.usage.prompt_tokens,
       response.usage.completion_tokens,
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
         tokensUsed: response.usage.total_tokens,
         costCents: Math.round(totalCost * 100)
       }
     };

   } catch (error) {
     return {
       success: false,
       error: {
         code: 'OPENAI_ERROR',
         message: error.message,
         provider: 'openai'
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

 // Make actual API call to OpenAI
 private async makeAPICall(prompt: string, model: string, config: AIModelConfig) {
   const response = await fetch(`${this.baseUrl}/chat/completions`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${this.apiKey}`
     },
     body: JSON.stringify({
       model: config.model,
       messages: [
         {
           role: 'system',
           content: 'You are an expert YouTube channel analyst. Provide detailed, actionable insights in valid JSON format only. Do not include any text outside the JSON response.'
         },
         {
           role: 'user',
           content: prompt
         }
       ],
       max_tokens: config.maxTokens,
       temperature: config.temperature,
       response_format: { type: 'json_object' }
     })
   });

   if (!response.ok) {
     const error = await response.json();
     throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`);
   }

   const data = await response.json();
   return {
     content: data.choices[0].message.content,
     usage: data.usage
   };
 }

 // Parse AI response into structured format
 private parseAnalysisResponse(content: string): AIAnalysisResponse {
   try {
     const parsed = JSON.parse(content);
     
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
     throw new Error(`Failed to parse AI response: ${error.message}`);
   }
 }

 // Utility methods
 private validateScore(score: any): number {
   const num = Number(score);
   if (isNaN(num)) return 0;
   return Math.max(0, Math.min(100, Math.round(num)));
 }

 private calculateCost(inputTokens: number, outputTokens: number, config: AIModelConfig): number {
   const inputCost = (inputTokens / 1000) * config.costPerInputToken;
   const outputCost = (outputTokens / 1000) * config.costPerOutputToken;
   return inputCost + outputCost;
 }

 private calculateConfidence(result: AIAnalysisResponse): number {
   // Simple confidence calculation based on response completeness
   let confidence = 0.5; // base confidence
   
   if (result.strengths.details.length >= 3) confidence += 0.1;
   if (result.weaknesses.details.length >= 2) confidence += 0.1;
   if (result.opportunities.recommendations.length >= 1) confidence += 0.1;
   if (result.scores.overall > 0) confidence += 0.1;
   if (result.contentStrategy) confidence += 0.1;
   
   return Math.min(1.0, confidence);
 }

 private generateRequestId(): string {
   return `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
