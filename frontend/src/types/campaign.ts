import type { components } from '../api/schema';

export type CreateCampaignRequest = components['schemas']['CreateCampaignRequest'];
export type CampaignSessionResponse = components['schemas']['CampaignSessionResponse'];
export type StageApprovalRequest = components['schemas']['StageApprovalRequest'];
export type MarketSensingDeliverable = components['schemas']['MarketSensingDeliverable'];
export type CampaignBriefDeliverable = components['schemas']['CampaignBriefDeliverable'];
export type CreativeContentDeliverable = components['schemas']['CreativeContentDeliverable'];
export type PerformanceInsightsDeliverable = components['schemas']['PerformanceInsightsDeliverable'];
export type ErrorResponse = components['schemas']['ErrorResponse'];

export type CampaignStatus = CampaignSessionResponse['status'];
export type StageKey =
  | 'MARKET_SENSING'
  | 'STRATEGY_BRIEF'
  | 'CREATIVE_CONTENT'
  | 'PERFORMANCE_INSIGHTS';

export interface StageInfo {
  id: StageKey;
  deliverableKey: 'marketSensing' | 'campaignBrief' | 'creativeContent' | 'performanceInsights';
  name: string;
  agentName: string;
  model: string;
  description: string;
  outputName: string;
}

export const STAGES: StageInfo[] = [
  {
    id: 'MARKET_SENSING',
    deliverableKey: 'marketSensing',
    name: 'Stage 1: Market Sensing',
    agentName: '[P1] Market Sensing Agent',
    model: 'gemini-3.5-flash-lite',
    description: 'Synthesizes market trends, competitive signals, and consumer sentiment.',
    outputName: 'market_sensing.json',
  },
  {
    id: 'STRATEGY_BRIEF',
    deliverableKey: 'campaignBrief',
    name: 'Stage 2: Strategy & Brief',
    agentName: '[P2] Strategy & Brief Agent',
    model: 'gemini-3.5-flash-lite',
    description: 'Generates target audience personas, value proposition, and messaging pillars.',
    outputName: 'campaign_brief.json',
  },
  {
    id: 'CREATIVE_CONTENT',
    deliverableKey: 'creativeContent',
    name: 'Stage 3: Creative Content',
    agentName: '[P3] Creative Content Agent',
    model: 'imagen-3.0 + flash-lite',
    description: 'Synthesizes visual concept prompt and renders marketing imagery via Imagen 3.',
    outputName: 'visual_deliverable.png',
  },
  {
    id: 'PERFORMANCE_INSIGHTS',
    deliverableKey: 'performanceInsights',
    name: 'Stage 4: Performance & Insights',
    agentName: '[P4] Performance Insights Agent',
    model: 'gemini-3.5-flash-lite',
    description: 'Calculates channel budget allocation and forecasts simulated campaign ROAS.',
    outputName: 'performance_insights.json',
  },
];
