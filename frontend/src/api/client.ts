import type {
  CreateCampaignRequest,
  CampaignSessionResponse,
  StageApprovalRequest,
  ErrorResponse,
} from '../types/campaign';

const API_BASE = '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public traceId?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errBody: Partial<ErrorResponse> & { detail?: string } = {};
    try {
      errBody = await res.json();
    } catch {
      // Body not JSON
    }

    const message = errBody.message || errBody.detail || errBody.error || res.statusText;
    const code = errBody.error || `HTTP_${res.status}`;
    const traceId = errBody.traceId;

    throw new ApiError(res.status, code, message, traceId);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  async getHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE}/healthz`);
    return handleResponse(res);
  },

  async getMeta(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/meta`);
    return handleResponse(res);
  },

  async createCampaign(req: CreateCampaignRequest): Promise<CampaignSessionResponse> {
    const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });
    return handleResponse<CampaignSessionResponse>(res);
  },

  async getSession(sessionId: string): Promise<CampaignSessionResponse> {
    const res = await fetch(`${API_BASE}/api/v1/campaigns/${encodeURIComponent(sessionId)}`);
    return handleResponse<CampaignSessionResponse>(res);
  },

  async approveStage(
    sessionId: string,
    req: StageApprovalRequest
  ): Promise<CampaignSessionResponse> {
    const res = await fetch(
      `${API_BASE}/api/v1/campaigns/${encodeURIComponent(sessionId)}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      }
    );
    return handleResponse<CampaignSessionResponse>(res);
  },
};
