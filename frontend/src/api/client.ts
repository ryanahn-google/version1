import type {
  CreateCampaignRequest,
  CampaignSessionResponse,
  StageApprovalRequest,
  UserProfileResponse,
  LogoutResponse,
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
    const res = await fetch(`${API_BASE}/healthz`, { credentials: 'include' });
    return handleResponse(res);
  },

  async getMeta(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/meta`, { credentials: 'include' });
    return handleResponse(res);
  },

  async loginWithGoogle(credential: string): Promise<UserProfileResponse> {
    const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ credential }),
    });
    return handleResponse<UserProfileResponse>(res);
  },

  async devLogin(email?: string, name?: string): Promise<UserProfileResponse> {
    const res = await fetch(`${API_BASE}/api/v1/auth/dev-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: email || 'dev-marketer@gmail.com',
        name: name || 'Dev Marketer',
      }),
    });
    return handleResponse<UserProfileResponse>(res);
  },

  async getCurrentUser(): Promise<UserProfileResponse> {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      credentials: 'include',
    });
    return handleResponse<UserProfileResponse>(res);
  },

  async logout(): Promise<LogoutResponse> {
    const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<LogoutResponse>(res);
  },

  async listUserCampaigns(): Promise<CampaignSessionResponse[]> {
    const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
      credentials: 'include',
    });
    return handleResponse<CampaignSessionResponse[]>(res);
  },

  async createCampaign(req: CreateCampaignRequest): Promise<CampaignSessionResponse> {
    const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(req),
    });
    return handleResponse<CampaignSessionResponse>(res);
  },

  async getSession(sessionId: string): Promise<CampaignSessionResponse> {
    const res = await fetch(`${API_BASE}/api/v1/campaigns/${encodeURIComponent(sessionId)}`, {
      credentials: 'include',
    });
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
        credentials: 'include',
        body: JSON.stringify(req),
      }
    );
    return handleResponse<CampaignSessionResponse>(res);
  },
};
