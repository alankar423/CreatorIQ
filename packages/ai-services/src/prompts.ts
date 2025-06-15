// AI prompt templates and management

export class PromptTemplates {
 
 // Quick Scan Analysis Prompt
 static readonly QUICK_SCAN = {
   id: 'quick_scan_v1',
   name: 'Quick Channel Scan',
   version: '1.0',
   analysisType: 'QUICK_SCAN',
   template: `Analyze this YouTube channel for a quick assessment:

Channel: {{channelTitle}}
Description: {{channelDescription}}
Subscribers: {{subscriberCount}}
Videos: {{videoCount}}
Total Views: {{viewCount}}
Content Type: {{contentType}}
Topics: {{topics}}

Provide a concise analysis in JSON format:
{
 "strengths": {
   "summary": "Brief overview of main strengths",
   "details": ["strength 1", "strength 2", "strength 3"],
   "score": 0-100
 },
 "weaknesses": {
   "summary": "Brief overview of main weaknesses",
   "details": ["weakness 1", "weakness 2"],
   "areas": ["area for improvement 1", "area 2"]
 },
 "opportunities": {
   "summary": "Key growth opportunities",
   "recommendations": [
     {
       "title": "Recommendation title",
       "description": "Detailed description",
       "priority": "HIGH|MEDIUM|LOW",
       "estimatedImpact": "Description of potential impact"
     }
   ]
 },
 "scores": {
   "overall": 0-100,
   "contentQuality": 0-100,
   "engagement": 0-100,
   "growthPotential": 0-100
 }
}

Focus on actionable insights. Be specific and constructive.`,
   variables: ['channelTitle', 'channelDescription', 'subscriberCount', 'videoCount', 'viewCount', 'contentType', 'topics'],
   estimatedTokens: 800
 };

 // Deep Dive Analysis Prompt
 static readonly DEEP_DIVE = {
   id: 'deep_dive_v1',
   name: 'Deep Channel Analysis',
   version: '1.0',
   analysisType: 'DEEP_DIVE',
   template: `Perform a comprehensive analysis of this YouTube channel:

Channel Information:
- Title: {{channelTitle}}
- Description: {{channelDescription}}
- Subscribers: {{subscriberCount}}
- Total Videos: {{videoCount}}
- Total Views: {{viewCount}}
- Content Type: {{contentType}}
- Topics: {{topics}}
- Published: {{publishedAt}}

{{#if recentVideos}}
Recent Videos Performance:
{{#each recentVideos}}
- "{{title}}" - {{views}} views, {{likes}} likes, {{comments}} comments ({{publishedAt}})
{{/each}}
{{/if}}

Provide a detailed analysis in JSON format with:

1. **Comprehensive Strengths Analysis**
2. **Detailed Weaknesses Assessment**
3. **Growth Opportunities with Priorities**
4. **Content Strategy Recommendations**
5. **Competitive Positioning**
6. **Detailed Scoring with Rationale**

JSON Response Format:
{
 "strengths": {
   "summary": "Detailed overview of channel strengths",
   "details": ["specific strength with evidence", "strength 2", "strength 3", "strength 4", "strength 5"],
   "score": 0-100
 },
 "weaknesses": {
   "summary": "Comprehensive weakness analysis",
   "details": ["specific weakness with suggestion", "weakness 2", "weakness 3"],
   "areas": ["improvement area 1", "area 2", "area 3"]
 },
 "opportunities": {
   "summary": "Strategic growth opportunities",
   "recommendations": [
     {
       "title": "Specific actionable recommendation",
       "description": "Detailed implementation strategy",
       "priority": "HIGH|MEDIUM|LOW",
       "estimatedImpact": "Quantified impact description"
     }
   ]
 },
 "contentStrategy": {
   "recommendedTopics": ["topic 1", "topic 2", "topic 3"],
   "contentGaps": ["gap 1", "gap 2"],
   "optimizationTips": ["tip 1", "tip 2", "tip 3"]
 },
 "scores": {
   "overall": 0-100,
   "contentQuality": 0-100,
   "engagement": 0-100,
   "growthPotential": 0-100
 }
}

Provide data-driven insights with specific examples and actionable recommendations.`,
   variables: ['channelTitle', 'channelDescription', 'subscriberCount', 'videoCount', 'viewCount', 'contentType', 'topics', 'publishedAt', 'recentVideos'],
   estimatedTokens: 1500
 };

 // Competitor Analysis Prompt
 static readonly COMPETITOR_COMPARE = {
   id: 'competitor_compare_v1',
   name: 'Competitor Comparison',
   version: '1.0',
   analysisType: 'COMPETITOR_COMPARE',
   template: `Analyze this channel in comparison to its competitive landscape:

Target Channel:
- Title: {{channelTitle}}
- Subscribers: {{subscriberCount}}
- Content Type: {{contentType}}
- Topics: {{topics}}

Analyze competitive positioning and provide strategic insights in JSON format:

{
 "strengths": {
   "summary": "Competitive advantages analysis",
   "details": ["unique strength vs competitors", "advantage 2", "advantage 3"],
   "score": 0-100
 },
 "weaknesses": {
   "summary": "Competitive disadvantages",
   "details": ["gap vs competitors", "weakness 2"],
   "areas": ["area to match competitors", "improvement area 2"]
 },
 "opportunities": {
   "summary": "Market gaps and opportunities",
   "recommendations": [
     {
       "title": "Competitive opportunity",
       "description": "How to capitalize vs competitors",
       "priority": "HIGH|MEDIUM|LOW",
       "estimatedImpact": "Competitive advantage gained"
     }
   ]
 },
 "competitors": {
   "similarChannels": [
     {
       "channelId": "estimated_channel_id",
       "name": "Competitor channel name",
       "subscribers": 0,
       "whyRelevant": "Why this channel is a relevant competitor"
     }
   ],
   "competitiveAdvantages": ["advantage 1", "advantage 2"],
   "gaps": ["gap to fill", "gap 2"]
 },
 "scores": {
   "overall": 0-100,
   "contentQuality": 0-100,
   "engagement": 0-100,
   "growthPotential": 0-100
 }
}

Focus on competitive differentiation and market positioning.`,
   variables: ['channelTitle', 'subscriberCount', 'contentType', 'topics'],
   estimatedTokens: 1200
 };

 // Growth Strategy Prompt
 static readonly GROWTH_STRATEGY = {
   id: 'growth_strategy_v1',
   name: 'Growth Strategy Analysis',
   version: '1.0',
   analysisType: 'GROWTH_STRATEGY',
   template: `Create a comprehensive growth strategy for this YouTube channel:

Channel Details:
- Title: {{channelTitle}}
- Current Subscribers: {{subscriberCount}}
- Content Focus: {{contentType}}
- Topics: {{topics}}

{{#if recentVideos}}
Recent Performance:
{{#each recentVideos}}
- "{{title}}" - {{views}} views, {{likes}} likes ({{publishedAt}})
{{/each}}
{{/if}}

Develop a strategic growth plan in JSON format:

{
 "strengths": {
   "summary": "Current assets to leverage for growth",
   "details": ["leverageable strength 1", "growth asset 2", "strength 3"],
   "score": 0-100
 },
 "weaknesses": {
   "summary": "Growth blockers to address",
   "details": ["growth blocker 1", "limiting factor 2"],
   "areas": ["critical improvement area", "optimization area 2"]
 },
 "opportunities": {
   "summary": "Strategic growth opportunities",
   "recommendations": [
     {
       "title": "Growth strategy recommendation",
       "description": "Detailed implementation plan with timeline",
       "priority": "HIGH|MEDIUM|LOW",
       "estimatedImpact": "Expected growth outcome (subscribers, views, etc.)"
     }
   ]
 },
 "contentStrategy": {
   "recommendedTopics": ["high-growth topic 1", "trending topic 2", "niche topic 3"],
   "contentGaps": ["underserved content area 1", "gap 2"],
   "optimizationTips": [
     "SEO optimization strategy",
     "Engagement optimization tip",
     "Algorithm optimization strategy"
   ]
 },
 "scores": {
   "overall": 0-100,
   "contentQuality": 0-100,
   "engagement": 0-100,
   "growthPotential": 0-100
 }
}

Focus on actionable, timeline-specific growth strategies with measurable outcomes.`,
   variables: ['channelTitle', 'subscriberCount', 'contentType', 'topics', 'recentVideos'],
   estimatedTokens: 1400
 };

 // Get prompt template by analysis type
 static getPromptTemplate(analysisType: string) {
   switch (analysisType) {
     case 'QUICK_SCAN':
       return this.QUICK_SCAN;
     case 'DEEP_DIVE':
       return this.DEEP_DIVE;
     case 'COMPETITOR_COMPARE':
       return this.COMPETITOR_COMPARE;
     case 'GROWTH_STRATEGY':
       return this.GROWTH_STRATEGY;
     default:
       throw new Error(`Unknown analysis type: ${analysisType}`);
   }
 }

 // Replace variables in prompt template
 static replaceVariables(template: string, variables: Record<string, any>): string {
   let result = template;
   
   // Simple variable replacement: {{variableName}}
   Object.entries(variables).forEach(([key, value]) => {
     const regex = new RegExp(`{{${key}}}`, 'g');
     result = result.replace(regex, String(value));
   });

   // Handle conditional blocks: {{#if variable}}...{{/if}}
   result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
     return variables[varName] ? content : '';
   });

   // Handle each loops: {{#each array}}...{{/each}}
   result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (match, varName, template) => {
     const array = variables[varName];
     if (!Array.isArray(array)) return '';
     
     return array.map(item => {
       let itemResult = template;
       // Replace item properties: {{propertyName}}
       Object.entries(item).forEach(([prop, val]) => {
         const regex = new RegExp(`{{${prop}}}`, 'g');
         itemResult = itemResult.replace(regex, String(val));
       });
       return itemResult;
     }).join('');
   });

   return result;
 }

 // Estimate token count for a prompt
 static estimateTokens(text: string): number {
   // Rough estimation: ~4 characters per token
   return Math.ceil(text.length / 4);
 }
}
