import { useState, useCallback } from 'react';
import type {
  CampaignSessionResponse,
  CreateCampaignRequest,
  StageKey,
} from '../types/campaign';
import { apiClient, ApiError } from '../api/client';

export interface LogEntry {
  id: string;
  timestamp: string;
  stage?: StageKey;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export function useCampaignStream() {
  const [session, setSession] = useState<CampaignSessionResponse | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modelArmorBlocked, setModelArmorBlocked] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback(
    (message: string, level: LogEntry['level'] = 'info', stage?: StageKey) => {
      setLogs((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          stage,
          level,
          message,
        },
      ]);
    },
    []
  );

  const startCampaign = useCallback(
    async (req: CreateCampaignRequest) => {
      setIsStreaming(true);
      setError(null);
      setModelArmorBlocked(false);
      setLogs([]);

      const channelList = req.channels ? req.channels.join(', ') : 'All';
      addLog(`Initializing campaign: "${req.brandName} - ${req.productName}"...`, 'info');
      addLog(`Objective: ${req.campaignObjective}`, 'info');
      addLog(`Budget: $${req.budgetAmount.toLocaleString()} (${channelList})`, 'info');
      addLog('Enforcing Google Cloud Model Armor prompt inspection...', 'info');

      try {
        addLog('Connecting to [P1] Market Sensing Agent (Gemini 3.5 Flash Lite)...', 'info', 'MARKET_SENSING');
        const initialSession = await apiClient.createCampaign(req);
        setSession(initialSession);

        addLog(`Session created: ${initialSession.sessionId}`, 'success');
        addLog(`[P1] Market Sensing synthesis completed.`, 'success', 'MARKET_SENSING');
        addLog(`Awaiting human review gate for Stage 1.`, 'warn', 'MARKET_SENSING');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.code === 'PROMPT_INJECTION_DETECTED' || err.status === 400) {
            setModelArmorBlocked(true);
            setError(`Model Armor Security Alert: ${err.message}`);
            addLog(`❌ Security Violation: Prompt rejected by Model Armor template.`, 'error');
          } else {
            setError(err.message);
            addLog(`Error [${err.code}]: ${err.message}`, 'error');
          }
        } else if (err instanceof Error) {
          setError(err.message);
          addLog(`Unexpected error: ${err.message}`, 'error');
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [addLog]
  );

  const handleApproveOrRevise = useCallback(
    async (action: 'approve' | 'revise', feedback?: string) => {
      if (!session) return;
      setIsStreaming(true);
      setError(null);

      const currStage = session.currentStage as StageKey;
      if (action === 'approve') {
        addLog(`Marketer approved Stage: ${currStage}. Progressing workflow...`, 'success', currStage);
      } else {
        addLog(`Marketer requested revision for Stage: ${currStage}. Feedback: "${feedback}"`, 'warn', currStage);
      }

      try {
        const updated = await apiClient.approveStage(session.sessionId, {
          action,
          feedback,
          stream: false,
        });
        setSession(updated);

        const newStage = updated.currentStage as StageKey;

        if (updated.status === 'COMPLETED') {
          addLog('🎉 Campaign Planning Workflow completed! All 4 deliverables finalized.', 'success');
        } else if (action === 'revise') {
          addLog(`Stage [${newStage}] deliverable re-synthesized with your feedback!`, 'success', newStage);
        } else if (updated.status === 'PAUSED_FOR_REVIEW') {
          addLog(`Stage [${newStage}] execution finished. Deliverable ready for review.`, 'info', newStage);
        } else {
          addLog(`Stage [${newStage}] is now running...`, 'info', newStage);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
          addLog(`Error advancing workflow: ${err.message}`, 'error');
        } else if (err instanceof Error) {
          setError(err.message);
          addLog(`Unexpected error: ${err.message}`, 'error');
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [session, addLog]
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      setIsStreaming(true);
      setError(null);
      try {
        const data = await apiClient.getSession(sessionId);
        setSession(data);
        addLog(`Loaded existing session: ${sessionId} (Stage: ${data.currentStage})`, 'info');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        addLog(`Failed to load session: ${msg}`, 'error');
      } finally {
        setIsStreaming(false);
      }
    },
    [addLog]
  );

  return {
    session,
    isStreaming,
    error,
    modelArmorBlocked,
    logs,
    startCampaign,
    handleApproveOrRevise,
    loadSession,
    setSession,
  };
}
