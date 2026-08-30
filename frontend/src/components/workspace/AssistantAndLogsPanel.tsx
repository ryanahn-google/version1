import { useState } from 'react';
import {
  Sparkles,
  Terminal,
  Send,
  Lightbulb,
} from 'lucide-react';
import type { LogEntry } from '../../hooks/useCampaignStream';
import type { StageKey } from '../../types/campaign';

interface AssistantAndLogsPanelProps {
  activeStage: StageKey;
  logs: LogEntry[];
  isStreaming: boolean;
  campaignTitle?: string;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export function AssistantAndLogsPanel({
  activeStage,
  logs,
  isStreaming,
  campaignTitle = 'Black Friday Galaxy S27 캠페인',
}: AssistantAndLogsPanelProps) {
  const [activeTab, setActiveTab] = useState<'ASSISTANT' | 'LOGS'>('ASSISTANT');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `안녕하세요! ${campaignTitle}의 전략과 산출물을 실시간으로 분석해 최적의 인사이트를 지원해 드립니다. 무엇이든 질문하세요.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const getStagePromptChips = (stage: StageKey) => {
    switch (stage) {
      case 'MARKET_SENSING':
      case 'STRATEGY_BRIEF':
        return [
          '유사 블랙 프라이데이 캠페인 성과 요약해줘',
          'Galaxy S27 타깃 인사이트 분석해줘',
          '경쟁사(Apple iPhone) 대비 포지셔닝 제안해줘',
          '예산 200만불 기준 최적 채널 믹스 제안해줘',
        ];
      case 'CREATIVE_CONTENT':
        return [
          '한정 할인 배너 문구 다변화',
          'AI 기능 강조 영상 콘셉트 제안',
          '비교 콘텐츠 광고 카피 추천',
          '소셜 스토리용 세로형 이미지 가이드',
        ];
      case 'PERFORMANCE_INSIGHTS':
      default:
        return [
          '검색 광고 예산 10% 증액 효과 시뮬레이션',
          'Display 크리에이티브 교체 가이드',
          '장바구니 전환율 개선을 위한 액션 플랜',
          '채널별 ROAS 기여도 상세 분석',
        ];
    }
  };

  const getStageContextTip = (stage: StageKey) => {
    switch (stage) {
      case 'MARKET_SENSING':
      case 'STRATEGY_BRIEF':
        return {
          title: '기획 단계 AI 어드바이스',
          text: '블랙프라이데이 기간 검색 수요가 전년 대비 28% 증가할 것으로 예상됩니다. AI 카메라와 프리미엄 성능에 집중한 소구가 효과적입니다.',
        };
      case 'CREATIVE_CONTENT':
        return {
          title: '크리에이티브 전략 제안',
          text: '강력한 할인 메시지와 함께 직관적인 구매 전환 유도 버튼(CTA)을 모든 포맷에 일관되게 배치하는 것을 권장합니다.',
        };
      case 'PERFORMANCE_INSIGHTS':
      default:
        return {
          title: 'MMM 미디어 최적화 인사이트',
          text: 'Digital Video 채널이 구매 전환 기여도가 가장 높으므로 예산의 35% 이상을 배분할 때 전체 캠페인 ROAS가 극대화됩니다.',
        };
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // Generate intelligent contextual response
    setTimeout(() => {
      let reply = '요청하신 내용을 바탕으로 멀티 에이전트 인텔리전스 엔진을 조회했습니다.';
      if (userText.includes('유사') || userText.includes('블랙')) {
        reply =
          '지난 Q4 블랙프라이데이 캠페인에서는 조기 얼리버드 번들과 트레이드인 혜택 강조 시 전환율이 23% 높았습니다. 현재 S27 브리프에도 동일하게 적용되어 있습니다.';
      } else if (userText.includes('예산') || userText.includes('채널') || userText.includes('믹스')) {
        reply =
          'MMM 시뮬레이션 결과 Digital Video(35%)와 Paid Search(25%) 조합이 ROAS 4.92x를 달성하는 최적 믹스입니다.';
      } else if (userText.includes('카피') || userText.includes('소재')) {
        reply =
          '헤드라인 "Next Level AI, Galaxy S27" 및 CTA "지금 사전예약하고 $250 혜택받기" 조합이 예상 CTR 2.4%로 가장 높습니다.';
      } else {
        reply = `"${userText}"에 대해 분석한 결과, 타겟 세그먼트와 설정된 채널 예산 범위 내에서 신뢰도 95% 수준의 성과 지표가 유지되고 있습니다.`;
      }

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 500);
  };

  const handleChipClick = (chip: string) => {
    setInputMessage(chip);
  };

  const stageChips = getStagePromptChips(activeStage);
  const contextTip = getStageContextTip(activeStage);

  return (
    <aside className="w-80 lg:w-96 flex-shrink-0 bg-white border-l border-[#e2e8f0] flex flex-col justify-between overflow-hidden z-10">
      {/* Top Header with Dual Tabs */}
      <div className="p-3 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('ASSISTANT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ASSISTANT'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>AI 어시스턴트</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOGS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'LOGS'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Terminal className="h-3.5 w-3.5 text-blue-600" />
            <span>에이전트 로그</span>
            {logs.length > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-mono">
                {logs.length}
              </span>
            )}
          </button>
        </div>

        {isStreaming && (
          <span className="text-[10px] text-cyan-600 font-bold animate-pulse">
            실시간 수신 중...
          </span>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'ASSISTANT' ? (
          <>
            {/* Context Tip Card */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5 mb-1">
                <Lightbulb className="h-3.5 w-3.5 text-blue-600" />
                <span>{contextTip.title}</span>
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {contextTip.text}
              </p>
            </div>

            {/* Quick Prompt Suggestion Chips */}
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                추천 질문 및 요청
              </span>
              <div className="flex flex-col gap-1.5">
                {stageChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-medium transition"
                  >
                    <span className="text-blue-500 font-bold mr-1.5">+</span>
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat History */}
            <div className="pt-2 space-y-2.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                대화 기록
              </span>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#1a56db] text-white rounded-br-none shadow-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Logs Tab: Thought Stream Console */
          <div className="font-mono text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-500">
              <span>Agent Event Stream</span>
              <span>{logs.length} events</span>
            </div>

            {logs.length === 0 ? (
              <p className="text-slate-400 italic text-center py-8">
                에이전트 실행 이벤트가 여기에 실시간으로 표시됩니다.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] leading-relaxed select-text"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>{log.timestamp}</span>
                    <span
                      className={`text-[9px] px-1 rounded uppercase font-bold ${
                        log.level === 'error'
                          ? 'bg-rose-100 text-rose-700'
                          : log.level === 'warn'
                          ? 'bg-amber-100 text-amber-700'
                          : log.level === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <p
                    className={
                      log.level === 'error'
                        ? 'text-rose-700 font-semibold'
                        : log.level === 'success'
                        ? 'text-emerald-800'
                        : 'text-slate-800'
                    }
                  >
                    {log.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Chat Prompt Input */}
      {activeTab === 'ASSISTANT' && (
        <div className="p-3 border-t border-[#e2e8f0] bg-white">
          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#1a56db] hover:bg-blue-700 text-white disabled:opacity-40 transition"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
