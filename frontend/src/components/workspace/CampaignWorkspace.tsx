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
import { useLanguage } from '../../context/LanguageContext';
import { MarketSensingView } from './stages/MarketSensingView';
import { StrategyBriefView } from './stages/StrategyBriefView';
import { ContentView } from './stages/ContentView';
import { MediaPlanMmmView } from './stages/MediaPlanMmmView';
import { ExecutionAndAnalyticsView } from './stages/ExecutionAndAnalyticsView';
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

export function CampaignWorkspace({
  session,
  initialPrompt,
  onStartSimulation,
  onApproveOrRevise,
  onRollbackStage,
  isLoading,
  logs,
}: CampaignWorkspaceProps) {
  const { locale, t } = useLanguage();
  const [activeStep, setActiveStep] = useState<WorkspaceStep>(1);

  const WORKSPACE_STEPS: StepMeta[] = [
    {
      step: 1,
      label: t.stepper.step1,
      subLabel: t.stepper.step1Sub,
      backendStage: 'MARKET_SENSING',
    },
    {
      step: 2,
      label: t.stepper.step2,
      subLabel: t.stepper.step2Sub,
      backendStage: 'STRATEGY_BRIEF',
    },
    {
      step: 3,
      label: t.stepper.step3,
      subLabel: t.stepper.step3Sub,
      backendStage: 'CREATIVE_CONTENT',
    },
    {
      step: 4,
      label: t.stepper.step4,
      subLabel: t.stepper.step4Sub,
      backendStage: 'PERFORMANCE_INSIGHTS',
    },
    {
      step: 5,
      label: t.stepper.step5,
      subLabel: t.stepper.step5Sub,
      backendStage: 'COMPLETED',
    },
  ];

  const isCompleted =
    session?.status === 'COMPLETED' ||
    session?.currentStage === 'COMPLETED' ||
    session?.currentStage === 'MEDIA_EXECUTION';

  const canAccessStep = (step: WorkspaceStep) => {
    if (step === activeStep) return true;
    if (!session) return step === 1;

    // When campaign is completed, all stages are accessible for review
    if (isCompleted) return true;

    // Strict rule during active review: Can navigate back to immediately preceding stage (activeStep - 1)
    if (step === activeStep - 1) return true;

    // Moving further back than activeStep - 1 is prohibited during in-progress pipeline
    if (step < activeStep - 1) return false;

    // Advancing forward is allowed only if backend session reached that stage
    const stage = session.currentStage;

    if (step === 2) {
      return (
        stage === 'STRATEGY_BRIEF' ||
        stage === 'CREATIVE_CONTENT' ||
        stage === 'PERFORMANCE_INSIGHTS' ||
        stage === 'MEDIA_EXECUTION'
      );
    }
    if (step === 3) {
      return (
        stage === 'CREATIVE_CONTENT' ||
        stage === 'PERFORMANCE_INSIGHTS' ||
        stage === 'MEDIA_EXECUTION'
      );
    }
    if (step === 4) {
      return (
        stage === 'PERFORMANCE_INSIGHTS' ||
        stage === 'MEDIA_EXECUTION'
      );
    }
    if (step === 5) {
      return isCompleted;
    }
    return false;
  };

  const handleStepClick = (step: WorkspaceStep) => {
    if (step === activeStep) return;

    // If campaign is completed, navigate freely between all 5 stages without triggering rollback
    if (isCompleted) {
      setActiveStep(step);
      return;
    }

    if (step === activeStep - 1) {
      if (
        window.confirm(
          t.stepper.rollbackConfirm.replace(
            '{step}',
            WORKSPACE_STEPS[step - 1].label
          )
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
    if (
      session.status === 'COMPLETED' ||
      session.currentStage === 'COMPLETED' ||
      session.currentStage === 'MEDIA_EXECUTION'
    ) {
      setActiveStep(5);
    } else if (session.currentStage === 'MARKET_SENSING') {
      setActiveStep(1);
    } else if (session.currentStage === 'STRATEGY_BRIEF') {
      setActiveStep(2);
    } else if (session.currentStage === 'CREATIVE_CONTENT') {
      setActiveStep(3);
    } else if (session.currentStage === 'PERFORMANCE_INSIGHTS') {
      setActiveStep(4);
    }
  }, [session?.currentStage, session?.status]);

  const campaignTitle =
    session?.productName ||
    session?.brandName ||
    'Black Friday Galaxy S27 캠페인';

  const getStepStatus = (step: WorkspaceStep) => {
    if (
      session?.status === 'COMPLETED' ||
      session?.currentStage === 'COMPLETED' ||
      session?.currentStage === 'MEDIA_EXECUTION'
    ) {
      return 'COMPLETED';
    }
    if (activeStep === step) return 'CURRENT';
    if (step < activeStep) return 'COMPLETED';
    return 'PENDING';
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc]">
      {/* Top 5-Stage Breadcrumb Stepper */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 py-3 flex-shrink-0 z-10 shadow-xs">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3 px-2 overflow-x-auto lg:overflow-x-visible">
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
                    !isCompleted && s.step < activeStep - 1
                      ? locale === 'ko'
                        ? '바로 이전 단계로만 돌아갈 수 있습니다.'
                        : 'You can only navigate to the immediately preceding stage.'
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
            <MarketSensingView
              session={session}
              initialPrompt={initialPrompt}
              onStartSimulation={onStartSimulation}
              onApproveOrRevise={onApproveOrRevise}
              isLoading={isLoading}
            />
          )}
          {activeStep === 2 && (
            <StrategyBriefView
              session={session}
              onApproveOrRevise={onApproveOrRevise}
              onRollbackStage={onRollbackStage}
              isLoading={isLoading}
            />
          )}
          {activeStep === 3 && (
            <ContentView
              session={session}
              onApproveOrRevise={onApproveOrRevise}
              onRollbackStage={onRollbackStage}
              isLoading={isLoading}
            />
          )}
          {activeStep === 4 && (
            <MediaPlanMmmView
              session={session}
              onApproveOrRevise={onApproveOrRevise}
              onRollbackStage={onRollbackStage}
              isLoading={isLoading}
            />
          )}
          {activeStep === 5 && (
            <ExecutionAndAnalyticsView session={session} />
          )}
        </main>

        {/* Right Assistant & Logs Panel */}
        <AssistantAndLogsPanel
          activeStage={
            activeStep === 1
              ? 'MARKET_SENSING'
              : activeStep === 2
              ? 'STRATEGY_BRIEF'
              : activeStep === 3
              ? 'CREATIVE_CONTENT'
              : activeStep === 4
              ? 'PERFORMANCE_INSIGHTS'
              : 'MEDIA_EXECUTION'
          }
          logs={logs}
          isStreaming={isLoading}
          campaignTitle={campaignTitle}
        />
      </div>
    </div>
  );
}
