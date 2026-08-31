import type { components } from '../api/schema';

export type CreateCampaignRequest = components['schemas']['CreateCampaignRequest'] & {
  language?: 'ko' | 'en';
};
export type CampaignSessionResponse = components['schemas']['CampaignSessionResponse'];
export type StageApprovalRequest = components['schemas']['StageApprovalRequest'] & {
  deliverableUpdates?: Record<string, unknown>;
};
export type MarketSensingDeliverable = components['schemas']['MarketSensingDeliverable'];
export type CampaignBriefDeliverable = components['schemas']['CampaignBriefDeliverable'];
export type CreativeContentDeliverable = components['schemas']['CreativeContentDeliverable'];
export type PerformanceInsightsDeliverable = components['schemas']['PerformanceInsightsDeliverable'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type GoogleAuthRequest = components['schemas']['GoogleAuthRequest'];
export type DevLoginRequest = components['schemas']['DevLoginRequest'];
export type UserProfileResponse = components['schemas']['UserProfileResponse'];
export type LogoutResponse = components['schemas']['LogoutResponse'];

export type CampaignStatus = CampaignSessionResponse['status'];
export type StageKey =
  | 'MARKET_SENSING'
  | 'STRATEGY_BRIEF'
  | 'CREATIVE_CONTENT'
  | 'PERFORMANCE_INSIGHTS'
  | 'MEDIA_EXECUTION'
  | 'COMPLETED';

export type ParsePromptRequest = components['schemas']['ParsePromptRequest'] & {
  language?: 'ko' | 'en';
};
export type ParsePromptResponse = components['schemas']['ParsePromptResponse'];

