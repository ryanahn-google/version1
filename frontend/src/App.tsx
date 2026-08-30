import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth } from './context/AuthContext';
import { Sidebar, type NavView } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { HomeDashboard } from './components/home/HomeDashboard';
import { CampaignWorkspace } from './components/workspace/CampaignWorkspace';
import { AssetLibraryView } from './components/assets/AssetLibraryView';
import { SettingsView } from './components/settings/SettingsView';
import { useCampaignStream } from './hooks/useCampaignStream';
import { apiClient } from './api/client';
import type { CampaignSessionResponse, CreateCampaignRequest } from './types/campaign';

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
    loadSession,
  } = useCampaignStream();

  const [currentView, setCurrentView] = useState<NavView>('HOME');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignSessionResponse[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();
  const [dismissError, setDismissError] = useState(false);

  // Load user campaigns list
  const fetchCampaigns = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingCampaigns(true);
      const list = await apiClient.listUserCampaigns();
      setCampaigns(list || []);
    } catch {
      // Keep empty if unauthenticated or network error
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [isAuthenticated, fetchCampaigns]);

  // Refresh campaigns list when a campaign completes or is approved
  useEffect(() => {
    if (session?.status === 'COMPLETED' || session?.status === 'PAUSED_FOR_REVIEW') {
      fetchCampaigns();
    }
  }, [session?.status, fetchCampaigns]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a1128] text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-xs tracking-wider uppercase text-slate-400 font-semibold">
            Loading MVC 1.0...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleOpenCampaign = (selectedSession: CampaignSessionResponse) => {
    loadSession(selectedSession.sessionId);
    setCurrentView('WORKSPACE');
  };

  const handleNewCampaign = (prefillPrompt?: string) => {
    setInitialPrompt(prefillPrompt);
    setCurrentView('WORKSPACE');
  };

  const handleStartCampaignSimulation = async (req: CreateCampaignRequest) => {
    await startCampaign(req);
    fetchCampaigns();
  };

  const handleApproveWithRefresh = async (action: 'approve' | 'revise', feedback?: string) => {
    await handleApproveOrRevise(action, feedback);
    fetchCampaigns();
  };

  const campaignTitle =
    session?.productName ||
    session?.brandName ||
    'Black Friday Galaxy S27 캠페인';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-[#0f172a]">
      {/* Global Dark Navy Sidebar */}
      <Sidebar
        activeView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content View Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <TopHeader
          currentView={currentView}
          campaignTitle={campaignTitle}
          campaignStatus={session?.status}
          onBackToHome={() => setCurrentView('HOME')}
        />

        {/* Model Armor Guardrail Security Alert Banner */}
        {modelArmorBlocked && !dismissError && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 text-xs flex items-center justify-between text-rose-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Model Armor 가드레일 감지:</strong> 입력된 프롬프트가 엔터프라이즈 안전 템플릿(<code>version1-guardrails</code>) 정책에 의해 차단되었습니다. 안전한 캠페인 목적어로 재시도해 주세요.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDismissError(true)}
              className="text-rose-500 hover:text-rose-800 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Generic Error Banner */}
        {error && !modelArmorBlocked && !dismissError && (
          <div className="bg-rose-50 border-b border-rose-200 p-2.5 px-6 text-xs flex items-center justify-between text-rose-800 flex-shrink-0">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setDismissError(true)}
              className="text-rose-500 hover:text-rose-800 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* View Switcher */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {currentView === 'HOME' && (
            <HomeDashboard
              campaigns={campaigns}
              isLoadingCampaigns={isLoadingCampaigns}
              onOpenCampaign={handleOpenCampaign}
              onNewCampaign={handleNewCampaign}
            />
          )}

          {currentView === 'WORKSPACE' && (
            <CampaignWorkspace
              session={session}
              initialPrompt={initialPrompt}
              onStartSimulation={handleStartCampaignSimulation}
              onApproveOrRevise={handleApproveWithRefresh}
              isLoading={isStreaming}
              logs={logs}
            />
          )}

          {currentView === 'ASSETS' && <AssetLibraryView campaigns={campaigns} />}

          {currentView === 'SETTINGS' && <SettingsView />}
        </div>
      </div>
    </div>
  );
}

export default App;
