import { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { NavView } from './Sidebar';

interface TopHeaderProps {
  currentView: NavView;
  campaignTitle?: string;
  campaignStatus?: string;
  onBackToHome?: () => void;
  onSearch?: (query: string) => void;
}

export function TopHeader({
  currentView,
  campaignTitle,
  campaignStatus,
  onBackToHome,
  onSearch,
}: TopHeaderProps) {
  const { user, logout } = useAuth();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    apiClient
      .getHealth()
      .then((res) => setHealthy(res.status === 'healthy'))
      .catch(() => setHealthy(false));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'PAUSED_FOR_REVIEW':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 font-medium">
            승인 대기
          </span>
        );
      case 'RUNNING':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-300 font-medium animate-pulse">
            집행 중
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-medium">
            완료
          </span>
        );
      default:
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-medium">
            기획 중
          </span>
        );
    }
  };

  const displayName = user?.name || '김서윤';
  const displayRole = '마케팅팀';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between flex-shrink-0 z-20">
      {/* Left Area: Greeting or Workspace Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {currentView === 'WORKSPACE' ? (
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                title="홈으로 이동"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {campaignTitle || 'Black Friday Galaxy S27 캠페인'}
              </h1>
              {getStatusBadge(campaignStatus)}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">
                안녕하세요, {displayName}님 👋
              </span>
            </div>
            <p className="text-xs text-slate-500">
              AI와 함께 마케팅을 더 쉽고 빠르게 시작해보세요.
            </p>
          </div>
        )}
      </div>

      {/* Center Search Input */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <form onSubmit={handleSearchSubmit} className="w-full relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="캠페인, 에셋, 인사이트 검색"
            className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-full pl-10 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </form>
      </div>

      {/* Right Controls & Profile */}
      <div className="flex items-center gap-3">
        {/* Model Armor Guardrail Badge */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Model Armor Guardrails</span>
        </div>

        {/* Backend Liveness Badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border bg-slate-50 border-slate-200"
          title={healthy ? '백엔드 정상 가동' : '백엔드 연결 확인 필요'}
        >
          <Activity
            className={`h-3 w-3 ${
              healthy === true
                ? 'text-emerald-500 animate-pulse'
                : healthy === false
                ? 'text-rose-500'
                : 'text-amber-500'
            }`}
          />
          <span className="text-slate-600 font-mono text-[10px]">
            {healthy ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* User Profile */}
        <div className="relative pl-2 border-l border-slate-200">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-semibold flex items-center justify-center shadow-sm">
                {initials}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">
                {displayRole}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800">{displayName}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'user@nova.corp'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
