import { useState, useEffect } from 'react';
import {
  Check,
  ChevronRight,
} from 'lucide-react';
import type {
  CampaignSessionResponse,
  CreateCampaignRequest,
  StageKey,
} from '../../types/campaign';
import type { LogEntry } from '../../hooks/useCampaignStream';
import { PlanningView } from './stages/PlanningView';
import { ContentView } from './stages/ContentView';
import { MediaPlanMmmView } from './stages/MediaPlanMmmView';
import { MediaExecutionView } from './stages/MediaExecutionView';
import { PerformanceAnalyticsView } from './stages/PerformanceAnalyticsView';
import { AssistantAndLogsPanel } from './AssistantAndLogsPanel';

interface CampaignWorkspaceProps {
  session: CampaignSessionResponse | null;
  initialPrompt?: string;
  onStartSimulation: (req: CreateCampaignRequest) => void;
  onApproveOrRevise: (action: 'approve' | 'revise', feedback?: string) => void;
  isLoading: boolean;
  logs: LogEntry[];
}

export type WorkspaceStep = 1 | 2 | 3 | 4 | 5;

interface StepMeta {
  step: WorkspaceStep;
  label: string;
  subLabel: string;
  backendStage: StageKey;
}

const WORKSPACE_STEPS: StepMeta[] = [
  { step: 1, label: '1. 기획', subLabel: 'Planning', backendStage: 'MARKET_SENSING' },
  { step: 2, label: '2. 콘텐츠', subLabel: 'Content', backendStage: 'CREATIVE_CONTENT' },
  { step: 3, label: '3. 미디어 계획', subLabel: 'MMM', backendStage: 'PERFORMANCE_INSIGHTS' },
  { step: 4, label: '4. 미디어 집행', subLabel: 'Execution', backendStage: 'PERFORMANCE_INSIGHTS' },
  { step: 5, label: '5. 성과 분석', subLabel: 'Analytics', backendStage: 'PERFORMANCE_INSIGHTS' },
];

export function CampaignWorkspace({
  session,
  initialPrompt,
  onStartSimulation,
  onApproveOrRevise,
  isLoading,
  logs,
}: CampaignWorkspaceProps) {
  const [activeStep, setActiveStep] = useState<WorkspaceStep>(1);

  // Automatically advance active step when backend stage progresses
  useEffect(() => {
    if (!session) return;
    if (session.status === 'COMPLETED') {
      setActiveStep(5);
    } else if (session.status === 'PAUSED_FOR_REVIEW' || session.currentStage === 'CREATIVE_CONTENT') {
      setActiveStep(2);
    } else if (session.currentStage === 'PERFORMANCE_INSIGHTS') {
      setActiveStep(3);
    } else if (session.currentStage === 'MARKET_SENSING' || session.currentStage === 'STRATEGY_BRIEF') {
      setActiveStep(1);
    }
  }, [session?.currentStage, session?.status]);

  const campaignTitle =
    session?.productName ||
    session?.brandName ||
    'Black Friday Galaxy S27 캠페인';

  const getStepStatus = (step: WorkspaceStep) => {
    if (session?.status === 'COMPLETED') return 'COMPLETED';
    if (activeStep === step) return 'CURRENT';
    if (step < activeStep) return 'COMPLETED';
    return 'PENDING';
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc]">
      {/* Top 5-Stage Breadcrumb Stepper */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 py-3 flex-shrink-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between overflow-x-auto gap-2">
          {WORKSPACE_STEPS.map((s, idx) => {
            const isSelected = activeStep === s.step;
            const status = getStepStatus(s.step);

            return (
              <div key={s.step} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(s.step)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition text-xs whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs'
                      : status === 'COMPLETED'
                      ? 'text-slate-700 hover:text-slate-900 font-medium'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected
                        ? 'bg-[#1a56db] text-white shadow-xs'
                        : status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {status === 'COMPLETED' && !isSelected ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      s.step
                    )}
                  </span>
                  <span>
                    {s.label}{' '}
                    <span className="text-[11px] font-normal opacity-80">
                      ({s.subLabel})
                    </span>
                  </span>
                </button>

                {idx < WORKSPACE_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Area: Left/Center Stage Canvas + Right Assistant & Logs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Active Stage Canvas */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {activeStep === 1 && (
            <PlanningView
              session={session}
              initialPrompt={initialPrompt}
              onStartSimulation={onStartSimulation}
              isLoading={isLoading}
            />
          )}
          {activeStep === 2 && (
            <ContentView
              session={session}
              onApproveOrRevise={onApproveOrRevise}
              isLoading={isLoading}
            />
          )}
          {activeStep === 3 && <MediaPlanMmmView session={session} />}
          {activeStep === 4 && <MediaExecutionView session={session} />}
          {activeStep === 5 && <PerformanceAnalyticsView session={session} />}
        </main>

        {/* Right Assistant & Logs Panel */}
        <AssistantAndLogsPanel
          activeStage={
            activeStep === 1
              ? 'MARKET_SENSING'
              : activeStep === 2
              ? 'CREATIVE_CONTENT'
              : 'PERFORMANCE_INSIGHTS'
          }
          logs={logs}
          isStreaming={isLoading}
          campaignTitle={campaignTitle}
        />
      </div>
    </div>
  );
}
