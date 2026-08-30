import { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  RotateCcw,
  Users,
  Target,
  Edit3,
  Lightbulb,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import type {
  CampaignSessionResponse,
  CampaignBriefDeliverable,
} from '../../../types/campaign';
import { RevisionModal } from '../../hitl/RevisionModal';

type TargetPersona = NonNullable<
  CampaignBriefDeliverable['targetPersonas']
>[number];
type MessagingPillar = NonNullable<
  CampaignBriefDeliverable['messagingPillars']
>[number];

interface StrategyBriefViewProps {
  session: CampaignSessionResponse | null;
  onApproveOrRevise?: (
    action: 'approve' | 'revise',
    feedback?: string,
    deliverableUpdates?: Record<string, unknown>
  ) => void;
  onRollbackStage?: () => void;
  isLoading?: boolean;
}

export function StrategyBriefView({
  session,
  onApproveOrRevise,
  onRollbackStage,
  isLoading = false,
}: StrategyBriefViewProps) {
  const { locale, t } = useLanguage();
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  const briefData = session?.deliverables?.campaignBrief;
  const productName = session?.productName || '';

  // Editable Deliverable States (Stage 2 Strategy Brief)
  const [campaignTitle, setCampaignTitle] = useState(
    briefData?.campaignTitle || productName || ''
  );
  const [coreValueProposition, setCoreValueProposition] = useState(
    briefData?.coreValueProposition || ''
  );
  const [toneAndVoice, setToneAndVoice] = useState<string[]>(
    briefData?.toneAndVoice && briefData.toneAndVoice.length > 0
      ? briefData.toneAndVoice
      : []
  );
  const [targetPersonas, setTargetPersonas] = useState<TargetPersona[]>(
    briefData?.targetPersonas || []
  );
  const [messagingPillars, setMessagingPillars] = useState<MessagingPillar[]>(
    briefData?.messagingPillars || []
  );

  useEffect(() => {
    if (briefData) {
      if (briefData.campaignTitle) setCampaignTitle(briefData.campaignTitle);
      if (briefData.coreValueProposition) {
        setCoreValueProposition(briefData.coreValueProposition);
      }
      if (briefData.targetPersonas) setTargetPersonas(briefData.targetPersonas);
      if (briefData.messagingPillars) {
        setMessagingPillars(briefData.messagingPillars);
      }
      if (briefData.toneAndVoice && briefData.toneAndVoice.length > 0) {
        setToneAndVoice(briefData.toneAndVoice);
      }
    }
  }, [briefData]);

  const handleAddPersona = () => {
    setTargetPersonas((prev) => [
      ...prev,
      {
        name: locale === 'ko' ? '신규 타겟 페르소나' : 'New Target Persona',
        demographics:
          locale === 'ko'
            ? '연령대/직업군 입력'
            : 'Age / Demographic profile',
        primaryNeeds: [
          locale === 'ko' ? '주요 필요 니즈 입력' : 'Primary need statement',
        ],
        barriers: [locale === 'ko' ? '장애 요인 입력' : 'Key purchase barrier'],
      },
    ]);
  };

  const handleDeletePersona = (idx: number) => {
    setTargetPersonas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddPillar = () => {
    setMessagingPillars((prev) => [
      ...prev,
      {
        pillar: locale === 'ko' ? '신규 메시지 필라' : 'New Messaging Pillar',
        keyMessage:
          locale === 'ko'
            ? '핵심 전달 메시지를 입력하세요.'
            : 'Enter core key message statement.',
        proofPoints: [
          locale === 'ko' ? '제품 기술 및 실증 근거' : 'Supporting proof point',
        ],
      },
    ]);
  };

  const handleDeletePillar = (idx: number) => {
    setMessagingPillars((prev) => prev.filter((_, i) => i !== idx));
  };

  const getDeliverableUpdates = () => ({
    campaignBrief: {
      ...(briefData || {}),
      campaignTitle: campaignTitle || productName,
      coreValueProposition,
      targetPersonas,
      messagingPillars,
      toneAndVoice,
    },
  });

  const handleApprove = () => {
    if (!onApproveOrRevise) return;
    onApproveOrRevise('approve', undefined, getDeliverableUpdates());
  };

  const isReviewPending =
    session?.status === 'PAUSED_FOR_REVIEW' &&
    session?.currentStage === 'STRATEGY_BRIEF';
  const isStage2Approved =
    session?.status === 'COMPLETED' ||
    (session?.currentStage &&
      session.currentStage !== 'STRATEGY_BRIEF' &&
      session.currentStage !== 'MARKET_SENSING');

  return (
    <div className="p-6 space-y-6">
      {/* Human-in-the-Loop Review Banner (Stage 2 Strategy Brief) */}
      {isReviewPending && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  {t.planning.hitlReviewPending}
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-medium">
                  {locale === 'ko'
                    ? 'Stage 2 전략 브리프 검토 필요'
                    : 'Stage 2 Strategy Brief Review Required'}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {locale === 'ko'
                  ? 'AI Agent가 수립한 타겟 페르소나 및 핵심 메시지 전략을 검토하고 수정한 후 승인해주세요. 승인 시 3단계(크리에이티브 콘텐츠 제작)가 시작됩니다.'
                  : 'Review and customize the target personas, USP, and messaging pillars. Approving will dispatch Stage 3 (Creative Content Agent).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onRollbackStage && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      locale === 'ko'
                        ? '1단계(시장 감지)로 복귀하시겠습니까? (이전 산출물 재검토 모드로 전환됩니다)'
                        : 'Rollback to Stage 1 (Market Sensing)?'
                    )
                  ) {
                    onRollbackStage();
                  }
                }}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span>
                  {locale === 'ko'
                    ? '← 1단계(시장 감지)로 복귀'
                    : '← Rollback to Stage 1'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setRevisionModalOpen(true)}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t.planning.requestRevision}</span>
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {locale === 'ko'
                  ? '전략 브리프 승인 및 3단계 진행'
                  : 'Approve & Proceed to Stage 3'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Stage 2 Approved Indicator Banner */}
      {isStage2Approved && (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3.5 px-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">
              {locale === 'ko'
                ? '2단계(전략 브리프) 산출물이 승인 완료되었습니다. (3단계 크리에이티브 단계로 이동 가능)'
                : 'Stage 2 (Strategy & Brief) deliverables have been approved.'}
            </span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            {t.planning.approvedBadge}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {briefData ? (
        <div className="space-y-6">
          {/* Top Row: Campaign Concept & USP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 캠페인 콘셉트 명칭 */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  {t.planning.campaignTitleLabel}
                </span>
                <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                  <Edit3 className="h-3 w-3" />
                  {t.content.editableBadge}
                </span>
              </div>
              <input
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                className="w-full bg-[#f8fafc] border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none transition"
                placeholder={t.planning.campaignTitlePlaceholder}
              />
            </div>

            {/* 브랜드 톤앤보이스 가이드라인 */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  {t.planning.toneAndVoiceTitle}
                </span>
                <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                  <Edit3 className="h-3 w-3" />
                  {t.content.editableBadge}
                </span>
              </div>
              <input
                type="text"
                value={toneAndVoice.join(', ')}
                onChange={(e) =>
                  setToneAndVoice(
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                placeholder={t.planning.toneAndVoicePlaceholder}
                className="w-full bg-[#f8fafc] border border-slate-200 focus:border-blue-500 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none transition"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {toneAndVoice.map((tv, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full"
                  >
                    #{tv}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 핵심 고객 가치 제안 (USP) */}
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-600" />
                {t.planning.coreValuePropLabel}
              </span>
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                <Edit3 className="h-3 w-3" />
                {t.content.editableBadge}
              </span>
            </div>
            <textarea
              value={coreValueProposition}
              onChange={(e) => setCoreValueProposition(e.target.value)}
              rows={3}
              className="w-full bg-[#f8fafc] border border-blue-200 focus:border-blue-500 rounded-xl p-3 text-xs text-slate-900 font-medium leading-relaxed focus:bg-white focus:outline-none resize-none transition"
              placeholder={t.planning.coreValuePropPlaceholder}
            />
          </div>

          {/* Bottom 2-Column: Target Personas & Messaging Pillars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 타겟 페르소나 카드 목록 */}
            <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>{t.planning.personasTitle}</span>
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                    <Edit3 className="h-3 w-3" />
                    {t.content.editableBadge}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPersona}
                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t.planning.addPersona}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {targetPersonas.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        {locale === 'ko'
                          ? `페르소나 #${idx + 1}`
                          : `Persona #${idx + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePersona(idx)}
                        disabled={targetPersonas.length <= 1}
                        className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                        title={
                          locale === 'ko'
                            ? '페르소나 삭제'
                            : 'Delete Persona'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                          {t.planning.personaName}
                        </label>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const next = [...targetPersonas];
                            next[idx] = {
                              ...next[idx],
                              name: e.target.value,
                            };
                            setTargetPersonas(next);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                          {t.planning.demographics}
                        </label>
                        <input
                          type="text"
                          value={p.demographics}
                          onChange={(e) => {
                            const next = [...targetPersonas];
                            next[idx] = {
                              ...next[idx],
                              demographics: e.target.value,
                            };
                            setTargetPersonas(next);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        {t.planning.primaryNeeds}
                      </label>
                      <input
                        type="text"
                        value={(p.primaryNeeds || []).join(', ')}
                        onChange={(e) => {
                          const next = [...targetPersonas];
                          next[idx] = {
                            ...next[idx],
                            primaryNeeds: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setTargetPersonas(next);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        {t.planning.barriers}
                      </label>
                      <input
                        type="text"
                        value={(p.barriers || []).join(', ')}
                        onChange={(e) => {
                          const next = [...targetPersonas];
                          next[idx] = {
                            ...next[idx],
                            barriers: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setTargetPersonas(next);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 메시징 필라 카드 목록 */}
            <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>{t.planning.messagingTitle}</span>
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                    <Edit3 className="h-3 w-3" />
                    {t.content.editableBadge}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPillar}
                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t.planning.addPillar}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {messagingPillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-900 font-mono">
                        {locale === 'ko'
                          ? `0${idx + 1}. 메시징 필라`
                          : `0${idx + 1}. Messaging Pillar`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePillar(idx)}
                        disabled={messagingPillars.length <= 1}
                        className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                        title={
                          locale === 'ko' ? '필라 삭제' : 'Delete Pillar'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        {t.planning.pillarName}
                      </label>
                      <input
                        type="text"
                        value={pillar.pillar}
                        onChange={(e) => {
                          const next = [...messagingPillars];
                          next[idx] = {
                            ...next[idx],
                            pillar: e.target.value,
                          };
                          setMessagingPillars(next);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-blue-900 focus:border-blue-500 focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        {t.planning.keyMessage}
                      </label>
                      <textarea
                        value={pillar.keyMessage}
                        onChange={(e) => {
                          const next = [...messagingPillars];
                          next[idx] = {
                            ...next[idx],
                            keyMessage: e.target.value,
                          };
                          setMessagingPillars(next);
                        }}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none resize-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        {t.planning.proofPoints}
                      </label>
                      <input
                        type="text"
                        value={(pillar.proofPoints || []).join(', ')}
                        onChange={(e) => {
                          const next = [...messagingPillars];
                          next[idx] = {
                            ...next[idx],
                            proofPoints: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setMessagingPillars(next);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="h-72 border border-dashed border-slate-200 bg-white rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 shadow-xs">
          <Lightbulb className="h-8 w-8 text-slate-300 mb-2" />
          <p className="font-medium text-xs text-slate-700 mb-1">
            {locale === 'ko'
              ? '전략 브리프 수립 대기 중'
              : 'Awaiting Strategy & Brief Dispatch'}
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
            {locale === 'ko'
              ? '1단계(시장 감지) 산출물을 검토하고 승인하시면 [P2] Strategy & Brief 에이전트가 타겟 페르소나 및 핵심 메시지 전략을 수립합니다.'
              : 'Review and approve Stage 1 (Market Sensing) to dispatch the [P2] Strategy & Brief Agent.'}
          </p>
        </div>
      )}

      {/* Revision Modal for Stage 2 Strategy Brief */}
      <RevisionModal
        stage="STRATEGY_BRIEF"
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        onSubmit={(feedback) =>
          onApproveOrRevise?.('revise', feedback, getDeliverableUpdates())
        }
        isLoading={isLoading}
      />
    </div>
  );
}
