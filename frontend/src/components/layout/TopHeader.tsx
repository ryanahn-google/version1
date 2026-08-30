import { useState } from 'react';
import {
  LogOut,
  ChevronLeft,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
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
}: TopHeaderProps) {
  const { user, logout } = useAuth();
  const { locale, toggleLocale, t } = useLanguage();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'PAUSED_FOR_REVIEW':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 font-medium">
            {t.header.statusPaused}
          </span>
        );
      case 'RUNNING':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-300 font-medium animate-pulse">
            {t.header.statusRunning}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-medium">
            {t.header.statusCompleted}
          </span>
        );
      default:
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-medium">
            {t.header.statusPlanning}
          </span>
        );
    }
  };

  const displayName = user?.name || (locale === 'ko' ? '김서윤' : 'Alex Kim');
  const displayRole = t.nav.roleMarketing;
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
                title={t.common.backToHome}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {campaignTitle || t.header.defaultTitle}
              </h1>
              {getStatusBadge(campaignStatus)}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">
                {t.nav.userGreeting}, {displayName}{locale === 'ko' ? '님' : ''} 👋
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {t.header.welcomeSubtitle}
            </p>
          </div>
        )}
      </div>

      {/* Right Controls & Profile */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLocale}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          title={t.header.switchLang}
        >
          <Globe className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-mono">{locale.toUpperCase()}</span>
          <span className="text-[10px] text-slate-400 font-normal">
            {locale === 'ko' ? '한국어' : 'English'}
          </span>
        </button>

        {/* User Profile */}
        <div className="relative">
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
                <span>{t.nav.logout}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
