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
  onApproveOrRevise: (
    action: 'approve' | 'revise',
    feedback?: string,
    deliverableUpdates?: Record<string, unknown>
  ) => void;
  onRollbackStage?: () => void;
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
  { step: 4, label: '4. 미디어 집행', subLabel: 'Execution', backendStage: 'MEDIA_EXECUTION' },
  { step: 5, label: '5. 성과 분석', subLabel: 'Analytics', backendStage: 'COMPLETED' },
];

export function CampaignWorkspace({
  session,
  initialPrompt,
  onStartSimulation,
  onApproveOrRevise,
  onRollbackStage,
  isLoading,
  logs,
}: CampaignWorkspaceProps) {
  const [activeStep, setActiveStep] = useState<WorkspaceStep>(1);

  const canAccessStep = (step: WorkspaceStep) => {
    if (step === activeStep) return true;
    if (!session) return step === 1;

    // Strict rule: Can only navigate back to immediately preceding stage (activeStep - 1)
    if (step === activeStep - 1) return true;

    // Moving further back than activeStep - 1 is strictly prohibited!
    if (step < activeStep - 1) return false;

    // Advancing forward is allowed only if backend session reached that stage
    const stage = session.currentStage;
    const isCompleted = session.status === 'COMPLETED' || stage === 'COMPLETED';

    if (step === 2) {
      return (
        stage === 'CREATIVE_CONTENT' ||
        stage === 'PERFORMANCE_INSIGHTS' ||
        stage === 'MEDIA_EXECUTION' ||
        isCompleted
      );
    }
    if (step === 3) {
      return (
        stage === 'PERFORMANCE_INSIGHTS' ||
        stage === 'MEDIA_EXECUTION' ||
        isCompleted
      );
    }
    if (step === 4) {
      return stage === 'MEDIA_EXECUTION' || isCompleted;
    }
    if (step === 5) {
      return isCompleted;
    }
    return false;
  };

  const handleStepClick = (step: WorkspaceStep) => {
    if (step === activeStep) return;
    if (step === activeStep - 1) {
      if (
        window.confirm(
          `이전 단계(${WORKSPACE_STEPS[step - 1].label})로 돌아가서 수정하시겠습니까? (이전 단계 산출물 재작성/수정 모드로 전환됩니다)`
        )
      ) {
        if (onRollbackStage) {
          onRollbackStage();
        }
        setActiveStep(step);
      }
      return;
    }
    if (step > activeStep && canAccessStep(step)) {
      setActiveStep(step);
    }
  };

  // Automatically advance active step when backend stage progresses
  useEffect(() => {
    if (!session) {
      setActiveStep(1);
      return;
    }
    if (session.status === 'COMPLETED' || session.currentStage === 'COMPLETED') {
      setActiveStep(5);
    } else if (
      session.currentStage === 'MARKET_SENSING' ||
      session.currentStage === 'STRATEGY_BRIEF'
    ) {
      setActiveStep(1);
    } else if (session.currentStage === 'CREATIVE_CONTENT') {
      setActiveStep(2);
    } else if (session.currentStage === 'PERFORMANCE_INSIGHTS') {
      setActiveStep(3);
    } else if (session.currentStage === 'MEDIA_EXECUTION') {
      setActiveStep(4);
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
            const isAccessible = canAccessStep(s.step);

            return (
              <div key={s.step} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStepClick(s.step)}
                  disabled={!isAccessible}
                  title={
                    s.step < activeStep - 1
                      ? '바로 이전 단계로만 돌아갈 수 있습니다.'
                      : undefined
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition text-xs whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs'
                      : status === 'COMPLETED'
                      ? isAccessible
                        ? 'text-slate-700 hover:text-slate-900 font-medium'
                        : 'text-slate-400 cursor-not-allowed opacity-60'
                      : isAccessible
                      ? 'text-slate-500 hover:text-slate-700'
                      : 'text-slate-300 cursor-not-allowed opacity-40'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected
                        ? 'bg-[#1a56db] text-white shadow-xs'
                        : status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : isAccessible
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-slate-100 text-slate-300'
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
              onApproveOrRevise={onApproveOrRevise}
              isLoading={isLoading}
            />
          )}
          {activeStep === 2 && (
            <ContentView
              session={session}
              onApproveOrRevise={onApproveOrRevise}
              onRollbackStage={onRollbackStage}
              isLoading={isLoading}
            />
          )}
          {activeStep === 3 && (
            <MediaPlanMmmView
              session={session}
              onApproveOrRevise={onApproveOrRevise}
              onRollbackStage={onRollbackStage}
              isLoading={isLoading}
            />
          )}
          {activeStep === 4 && (
            <MediaExecutionView
              session={session}
              onApproveOrRevise={onApproveOrRevise}
              onRollbackStage={onRollbackStage}
              isLoading={isLoading}
            />
          )}
          {activeStep === 5 && <PerformanceAnalyticsView session={session} />}
        </main>

        {/* Right Assistant & Logs Panel */}
        <AssistantAndLogsPanel
          activeStage={
            activeStep === 1
              ? 'STRATEGY_BRIEF'
              : activeStep === 2
              ? 'CREATIVE_CONTENT'
              : activeStep === 3
              ? 'PERFORMANCE_INSIGHTS'
              : activeStep === 4
              ? 'MEDIA_EXECUTION'
              : 'COMPLETED'
          }
          logs={logs}
          isStreaming={isLoading}
          campaignTitle={campaignTitle}
        />
      </div>
    </div>
  );
}
