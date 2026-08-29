import { useState } from 'react';
import { CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import type { StageKey, CampaignSessionResponse } from '../../types/campaign';
import { RevisionModal } from './RevisionModal';

interface HitlActionBarProps {
  session: CampaignSessionResponse | null;
  onApproveOrRevise: (action: 'approve' | 'revise', feedback?: string) => void;
  isLoading: boolean;
}

export function HitlActionBar({
  session,
  onApproveOrRevise,
  isLoading,
}: HitlActionBarProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!session || session.status !== 'PAUSED_FOR_REVIEW') {
    return null;
  }

  const currentStage = session.currentStage as StageKey;
  const isFinalStage = currentStage === 'PERFORMANCE_INSIGHTS';

  return (
    <section className="bg-slate-900/95 border-t border-amber-500/40 p-4 px-6 sticky bottom-0 z-30 shadow-2xl backdrop-blur">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Stage Status & Review Banner */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Human-in-the-Loop Gate Active
              </span>
            </div>
            <p className="text-xs text-slate-200">
              {isFinalStage
                ? 'All 4 multi-agent stages executed. Approve final deliverable set or request adjustment.'
                : `Review Stage deliverable (${currentStage}). Approve to proceed to next agent or request revisions.`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            Request Revision
          </button>

          <button
            type="button"
            onClick={() => onApproveOrRevise('approve')}
            disabled={isLoading}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4 text-white" />
            {isFinalStage ? 'Accept & Finalize Campaign' : 'Approve & Proceed to Next Stage'}
          </button>
        </div>
      </div>

      <RevisionModal
        stage={currentStage}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(feedback) => onApproveOrRevise('revise', feedback)}
        isLoading={isLoading}
      />
    </section>
  );
}
