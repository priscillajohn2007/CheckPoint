import React, { useState, useEffect } from 'react';
import { Header, AppTab, ROLE_PERMITTED_TABS } from './components/Header';
import { PrePublicationChecker } from './components/PrePublicationChecker';
import { GuidelineClarityHeatmap } from './components/GuidelineClarityHeatmap';
import { FactLibrary } from './components/FactLibrary';
import { VisualAccessibilityChecker } from './components/VisualAccessibilityChecker';
import { ReviewApprovalQueue } from './components/ReviewApprovalQueue';
import { BrandHealthScorecard } from './components/BrandHealthScorecard';
import { BrandKitView } from './components/BrandKitView';
import { ExpiryInboxView } from './components/ExpiryInboxView';
import { HallmarksView } from './components/HallmarksView';
import { FigmaDocsCompanionModal } from './components/FigmaDocsCompanionModal';
import { DemoGuideModal } from './components/DemoGuideModal';
import { AboutTrustModal } from './components/AboutTrustModal';
import {
  Role,
  ApprovedFact,
  BrandRule,
  ContentSubmission,
  AuditLogEntry,
  BrandKitConfig,
  HallmarkRecord,
  JudgeChecklistState,
} from './types';
import { api } from './services/api';
import { DEFAULT_CHANNEL_LIMITS } from './utils/brandEngine';

const INITIAL_BRAND_KIT_STATE: BrandKitConfig = {
  brandName: '',
  palette: [],
  fonts: { heading: 'Inter', body: 'Inter' },
  logoMinWidthPx: 120,
  logoClearSpaceRatio: 1.0,
  deltaEMax: 10,
  channelLimits: DEFAULT_CHANNEL_LIMITS,
  confidentialMode: false,
  ownerEmails: {},
};

const INITIAL_JUDGE_STATE: JudgeChecklistState = {
  checkedDraftOrPoster: false,
  resolvedFindingWithIntent: false,
  submittedToQueue: false,
  approvedAndMintedHallmark: false,
  verifiedHallmarkChain: false,
  inspectedClarityHeatmap: false,
  checkedExpiryOrBrandKit: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('checker');
  const [currentRole, setCurrentRole] = useState<Role>('creator');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false); // Start clean and free by default
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isCompanionOpen, setIsCompanionOpen] = useState<boolean>(false);
  const [isTrustOpen, setIsTrustOpen] = useState<boolean>(false);
  const [judgeProgress, setJudgeProgress] = useState<JudgeChecklistState>(INITIAL_JUDGE_STATE);

  // App data state - starts empty if demo mode is off
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKitConfig>(INITIAL_BRAND_KIT_STATE);
  const [hallmarks, setHallmarks] = useState<HallmarkRecord[]>([]);
  const [expiryUnreadCount, setExpiryUnreadCount] = useState<number>(0);

  const markJudgeStep = (step: keyof JudgeChecklistState) => {
    setJudgeProgress((prev) => (prev[step] ? prev : { ...prev, [step]: true }));
  };

  // Fetch from backend
  const refreshData = async () => {
    try {
      const [
        fetchedFacts,
        fetchedRules,
        fetchedSubs,
        fetchedLogs,
        fetchedKit,
        fetchedHallmarks,
        fetchedExpiry,
      ] = await Promise.all([
        api.getFacts(),
        api.getRules(),
        api.getSubmissions(),
        api.getAuditLogs(),
        api.getBrandKit(),
        api.getHallmarks(),
        api.getExpiryInbox(),
      ]);

      setFacts(Array.isArray(fetchedFacts) ? fetchedFacts : []);
      setRules(Array.isArray(fetchedRules) ? fetchedRules : []);
      setSubmissions(Array.isArray(fetchedSubs) ? fetchedSubs : []);
      setAuditLogs(Array.isArray(fetchedLogs) ? fetchedLogs : []);
      if (fetchedKit && typeof fetchedKit === 'object') setBrandKit(fetchedKit);
      setHallmarks(Array.isArray(fetchedHallmarks) ? fetchedHallmarks : []);
      setExpiryUnreadCount(
        Array.isArray(fetchedExpiry) ? fetchedExpiry.filter((n) => !n.read).length : 0
      );
    } catch (err) {
      console.warn('Backend data sync note:', err);
    }
  };

  useEffect(() => {
    if (!isDemoMode) {
      api.clearData().then(refreshData);
      setJudgeProgress(INITIAL_JUDGE_STATE);
    } else {
      api.resetDemo().then(refreshData);
    }
  }, [isDemoMode]);

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      await refreshData();
    } catch (err) {
      console.error('Failed to reset demo:', err);
    }
  };

  const handleToggleDemoMode = (nextState: boolean) => {
    setIsDemoMode(nextState);
  };

  // Track tab-visit judge steps automatically
  useEffect(() => {
    if (activeTab === 'heatmap') markJudgeStep('inspectedClarityHeatmap');
    if (activeTab === 'kit' || activeTab === 'inbox') markJudgeStep('checkedExpiryOrBrandKit');
  }, [activeTab]);

  // Synchronize permitted tabs when role changes
  const handleRoleChange = (newRole: Role) => {
    setCurrentRole(newRole);
    const permitted = ROLE_PERMITTED_TABS[newRole] || ['checker'];
    if (!permitted.includes(activeTab)) {
      setActiveTab(permitted[0]);
    }
  };

  const handleSubmissionCreated = (newSub: ContentSubmission) => {
    setSubmissions((prev) => [newSub, ...prev]);
    markJudgeStep('submittedToQueue');
    api.getAuditLogs().then((logs) => setAuditLogs(Array.isArray(logs) ? logs : [])).catch(() => {});
  };

  const handleSubmissionsUpdated = (nextSubs: ContentSubmission[]) => {
    setSubmissions(nextSubs);
    if (nextSubs.some((s) => s.status === 'approved')) {
      markJudgeStep('approvedAndMintedHallmark');
    }
    api.getHallmarks().then((hm) => setHallmarks(Array.isArray(hm) ? hm : [])).catch(() => {});
    api.getAuditLogs().then((logs) => setAuditLogs(Array.isArray(logs) ? logs : [])).catch(() => {});
  };

  const handleFactsUpdated = (nextFacts: ApprovedFact[]) => {
    setFacts(nextFacts);
    api
      .getExpiryInbox()
      .then((notices) => setExpiryUnreadCount(Array.isArray(notices) ? notices.filter((n) => !n.read).length : 0))
      .catch(() => {});
  };

  const queuePendingCount = submissions.filter(
    (s) => s.status === 'pending_legal' || s.status === 'pending_manager' || s.status === 'analyzed'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={handleRoleChange}
        isDemoMode={isDemoMode}
        setIsDemoMode={handleToggleDemoMode}
        onResetDemo={handleResetDemo}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenCompanion={() => setIsCompanionOpen(true)}
        onOpenTrust={() => setIsTrustOpen(true)}
        queuePendingCount={queuePendingCount}
        expiryUnreadCount={expiryUnreadCount}
        hallmarksCount={hallmarks.length}
        confidentialMode={brandKit.confidentialMode}
      />

      {/* Demo Mode Notice Bar (Only shown when Demo Mode is actively switched on by user) */}
      {isDemoMode ? (
        <div className="bg-teal-900 text-white text-xs px-4 py-2 border-b border-teal-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-teal-800 border border-teal-700 px-2 py-0.5 rounded text-[11px] tracking-wide">
              DEMO SAMPLE DATA LOADED
            </span>
            <span className="text-teal-100">
              Active synthetic dataset for <strong>QuickBite Express</strong> (Sample Company).
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-teal-200">
            <button
              onClick={() => handleToggleDemoMode(false)}
              className="text-white underline hover:text-teal-300 cursor-pointer font-bold"
            >
              Clear &amp; Switch to Empty User Input
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={handleResetDemo}
              className="text-white underline hover:text-teal-300 cursor-pointer"
            >
              Reset Mock Data
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-100/80 text-slate-700 text-xs px-4 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Custom Input Mode:</span>
            <span>Workspace is empty. Upload your own brand poster, creative file, or marketing draft for live AI inspection.</span>
          </div>
          <button
            onClick={() => handleToggleDemoMode(true)}
            className="text-teal-800 hover:text-teal-950 underline font-semibold cursor-pointer"
          >
            Load Demo Data Sample &rarr;
          </button>
        </div>
      )}

      {/* Main Content Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'checker' && (
          <PrePublicationChecker
            currentRole={currentRole}
            onSubmissionCreated={handleSubmissionCreated}
            onNavigateToQueue={() => {
              if (ROLE_PERMITTED_TABS[currentRole].includes('queue')) {
                setActiveTab('queue');
              } else {
                setCurrentRole('manager');
                setActiveTab('queue');
              }
            }}
            onNavigateTab={(tab) => {
              if (!ROLE_PERMITTED_TABS[currentRole].includes(tab)) {
                setCurrentRole('admin');
              }
              setActiveTab(tab);
            }}
            onEnableDemo={() => setIsDemoMode(true)}
            onAnalysisCompleted={() => markJudgeStep('checkedDraftOrPoster')}
            onFindingResolved={() => markJudgeStep('resolvedFindingWithIntent')}
            judgeProgress={judgeProgress}
            brandKit={brandKit}
            isDemoMode={isDemoMode}
          />
        )}

        {activeTab === 'kit' && (
          <BrandKitView
            brandKit={brandKit}
            onBrandKitUpdated={setBrandKit}
            onRulesUpdated={setRules}
            onWorkspaceImported={refreshData}
            currentRole={currentRole}
            isDemoMode={isDemoMode}
          />
        )}

        {activeTab === 'heatmap' && (
          <GuidelineClarityHeatmap
            rules={rules}
            onRulesUpdated={setRules}
            currentRole={currentRole}
            isDemoMode={isDemoMode}
            confidentialMode={brandKit.confidentialMode}
          />
        )}

        {activeTab === 'facts' && (
          <FactLibrary
            facts={facts}
            onFactsUpdated={handleFactsUpdated}
            currentRole={currentRole}
            isDemoMode={isDemoMode}
          />
        )}

        {activeTab === 'inbox' && (
          <ExpiryInboxView
            currentRole={currentRole}
            onNavigateToFacts={() => setActiveTab('facts')}
            onInboxChanged={() => {
              api
                .getExpiryInbox()
                .then((notices) => setExpiryUnreadCount(Array.isArray(notices) ? notices.filter((n) => !n.read).length : 0))
                .catch(() => {});
            }}
            isDemoMode={isDemoMode}
          />
        )}

        {activeTab === 'visual' && (
          <VisualAccessibilityChecker
            isDemoMode={isDemoMode}
            brandKit={brandKit}
            onPosterAnalyzed={() => markJudgeStep('checkedDraftOrPoster')}
          />
        )}

        {activeTab === 'queue' && (
          <ReviewApprovalQueue
            submissions={submissions}
            auditLogs={auditLogs}
            onSubmissionsUpdated={handleSubmissionsUpdated}
            onNavigateToHallmarks={() => setActiveTab('hallmarks')}
            currentRole={currentRole}
            isDemoMode={isDemoMode}
          />
        )}

        {activeTab === 'hallmarks' && (
          <HallmarksView
            hallmarks={hallmarks}
            onHallmarksUpdated={setHallmarks}
            onNavigateToChecker={() => setActiveTab('checker')}
            onChainVerified={() => markJudgeStep('verifiedHallmarkChain')}
            currentRole={currentRole}
            isDemoMode={isDemoMode}
          />
        )}

        {activeTab === 'scorecard' && (
          <BrandHealthScorecard
            currentRole={currentRole}
            isDemoMode={isDemoMode}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white text-xs text-slate-500 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-bold text-slate-900">
              Checkpoint: An Intelligent Brand-Governance Platform
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              CodeNexus India 2026 National Hackathon · Authored by Priscilla John and Najeema
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <button onClick={() => setIsTrustOpen(true)} className="text-teal-800 hover:underline font-medium cursor-pointer">
              About &amp; Trust
            </button>
            <span aria-hidden="true">·</span>
            <span>Moffatt v. Air Canada (2024)</span>
            <span aria-hidden="true">·</span>
            <span>ASCI Annual Report 2025-26</span>
            <span aria-hidden="true">·</span>
            <span>CCPA Guidelines (2022)</span>
            <span aria-hidden="true">·</span>
            <span>WCAG 2.1 AA</span>
            <span aria-hidden="true">·</span>
            <span>DPDP Act 2023</span>
          </div>
        </div>
      </footer>

      {/* Guide Modal */}
      <DemoGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onLoadScenario={() => {
          setIsDemoMode(true);
          setActiveTab('checker');
        }}
      />

      {/* About & Trust Architecture Modal */}
      <AboutTrustModal
        isOpen={isTrustOpen}
        onClose={() => setIsTrustOpen(false)}
      />

      {/* Figma & Google Docs In-Situ Companion Modal */}
      <FigmaDocsCompanionModal
        isOpen={isCompanionOpen}
        onClose={() => setIsCompanionOpen(false)}
      />
    </div>
  );
}

