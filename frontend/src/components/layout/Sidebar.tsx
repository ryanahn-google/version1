import {
  Home,
  Layers,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type NavView = 'HOME' | 'WORKSPACE' | 'ASSETS' | 'SETTINGS';

interface SidebarProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ activeView, onSelectView, collapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useLanguage();
  const navItems: { id: NavView; label: string; icon: typeof Home }[] = [
    { id: 'HOME', label: t.nav.home, icon: Home },
    { id: 'WORKSPACE', label: t.nav.workspace, icon: Layers },
    { id: 'ASSETS', label: t.nav.assets, icon: FolderOpen },
    { id: 'SETTINGS', label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside
      className={`bg-[#0a1128] text-slate-300 flex flex-col justify-between transition-all duration-300 border-r border-[#152042] flex-shrink-0 z-30 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-[#152042]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20 flex-shrink-0">
              M
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-white tracking-wide text-base leading-none">
                  MVC
                </span>
                <span className="text-[10px] text-slate-400 truncate mt-0.5 tracking-tight font-medium">
                  Marketing Value Creator
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1a56db] text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Collapse Toggle */}
      <div className="p-2 border-t border-[#152042]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition text-xs"
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
