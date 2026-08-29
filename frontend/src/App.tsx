import { useState, useEffect } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth } from './context/AuthContext';
import { CampaignForm } from './components/campaign/CampaignForm';
import { DagTimeline } from './components/timeline/DagTimeline';
import { DeliverableInspector } from './components/inspector/DeliverableInspector';
import { HitlActionBar } from './components/hitl/HitlActionBar';
import { useCampaignStream } from './hooks/useCampaignStream';
import type { StageKey } from './types/campaign';

export function App() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    session,
    isStreaming,
    error,
    modelArmorBlocked,
    logs,
    startCampaign,
    handleApproveOrRevise,
  } = useCampaignStream();

  const [selectedStage, setSelectedStage] = useState<StageKey>('MARKET_SENSING');
  const [dismissError, setDismissError] = useState(false);

  // Automatically switch selected stage tab when session stage updates
  useEffect(() => {
    if (session?.currentStage && session.currentStage !== 'COMPLETED') {
      setSelectedStage(session.currentStage as StageKey);
    }
  }, [session?.currentStage]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0f1d] text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-xs tracking-wider uppercase text-slate-400 font-medium">
            Loading Nova Electronics MVC...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0f1d] text-slate-100">
      {/* Top Navigation */}
      <Navbar />

      {/* Model Armor / Security Alert Banner */}
      {modelArmorBlocked && !dismissError && (
        <div className="bg-rose-950/90 border-b border-rose-800 p-3 px-6 text-xs flex items-center justify-between text-rose-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>
              <strong>Model Armor Security Block:</strong> Prompt was inspected and rejected by template{' '}
              <code className="bg-rose-900 px-1 py-0.5 rounded font-mono">version1-guardrails</code>.
              Please rephrase campaign inputs to comply with enterprise safety policies.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissError(true)}
            className="text-rose-400 hover:text-white p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Generic Error Banner */}
      {error && !modelArmorBlocked && !dismissError && (
        <div className="bg-rose-950/90 border-b border-rose-800 p-2.5 px-6 text-xs flex items-center justify-between text-rose-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setDismissError(true)}
            className="text-rose-400 hover:text-white p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3-Panel Main Command Center Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: Campaign Configuration */}
        <CampaignForm
          onSubmit={startCampaign}
          isLoading={isStreaming}
          disabled={Boolean(session && session.status !== 'COMPLETED')}
        />

        {/* Panel 2: Multi-Agent DAG Visualizer & Streaming Console */}
        <DagTimeline
          session={session}
          selectedStage={selectedStage}
          onSelectStage={setSelectedStage}
          logs={logs}
          isStreaming={isStreaming}
        />

        {/* Panel 3: Deliverable Inspector Canvas */}
        <DeliverableInspector
          session={session}
          selectedStage={selectedStage}
          onSelectStage={setSelectedStage}
        />
      </div>

      {/* Sticky Bottom: Human-in-the-Loop Review Bar */}
      <HitlActionBar
        session={session}
        onApproveOrRevise={handleApproveOrRevise}
        isLoading={isStreaming}
      />
    </div>
  );
}

export default App;
