import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PrePublicationChecker } from './components/PrePublicationChecker';
import { GuidelineClarityHeatmap } from './components/GuidelineClarityHeatmap';
import { FactLibrary } from './components/FactLibrary';
import { VisualAccessibilityChecker } from './components/VisualAccessibilityChecker';
import { ReviewApprovalQueue } from './components/ReviewApprovalQueue';
import { DemoGuideModal } from './components/DemoGuideModal';
import { Role, ApprovedFact, BrandRule, ContentSubmission, AuditLogEntry } from './types';
import { api } from './services/api';
import { INITIAL_FACTS, INITIAL_RULES, INITIAL_SUBMISSIONS, INITIAL_AUDIT_LOGS } from './data/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'checker' | 'heatmap' | 'facts' | 'visual' | 'queue'>('checker');
  const [currentRole, setCurrentRole] = useState<Role>('creator');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // App data state
  const [facts, setFacts] = useState<ApprovedFact[]>(INITIAL_FACTS);
  const [rules, setRules] = useState<BrandRule[]>(INITIAL_RULES);
  const [submissions, setSubmissions] = useState<ContentSubmission[]>(INITIAL_SUBMISSIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial fetch from backend
  const refreshData = async () => {
    try {
      const [fetchedFacts, fetchedRules, fetchedSubs, fetchedLogs] = await Promise.all([
        api.getFacts(),
        api.getRules(),
        api.getSubmissions(),
        api.getAuditLogs(),
      ]);

      if (fetchedFacts && Array.isArray(fetchedFacts)) setFacts(fetchedFacts);
      if (fetchedRules && Array.isArray(fetchedRules)) setRules(fetchedRules);
      if (fetchedSubs && Array.isArray(fetchedSubs)) setSubmissions(fetchedSubs);
      if (fetchedLogs && Array.isArray(fetchedLogs)) setAuditLogs(fetchedLogs);
    } catch (err) {
      console.warn('Backend data sync note (using initial synthetic dataset):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      await refreshData();
    } catch (err) {
      console.error('Failed to reset demo:', err);
    }
  };

  const handleSubmissionCreated = (newSub: ContentSubmission) => {
    setSubmissions([newSub, ...submissions]);
  };

  const queuePendingCount = submissions.filter(
    (s) => s.status === 'pending_legal' || s.status === 'pending_manager' || s.status === 'analyzed'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar adhering to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
        onResetDemo={handleResetDemo}
        onOpenGuide={() => setIsGuideOpen(true)}
        queuePendingCount={queuePendingCount}
      />

      {/* Demo Mode Notice Bar (Slide 7: synthetic brand kit clearly labelled) */}
      {isDemoMode && (
        <div className="bg-teal-900 text-white text-xs px-4 py-2 border-b border-teal-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-teal-800 border border-teal-700 px-2 py-0.5 rounded text-[11px] tracking-wide">
              DEMO MODE ACTIVE
            </span>
            <span className="text-teal-100">
              Loaded National Hackathon synthetic dataset for <strong>QuickBite Express</strong> (Food-Delivery Startup).
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-teal-200">
            <span>Role: <strong className="text-white">{currentRole.toUpperCase()}</strong></span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-white underline hover:text-teal-300"
            >
              View Blueprint &amp; Slides Guide
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={handleResetDemo}
              className="text-white underline hover:text-teal-300"
            >
              Reset Mock Data
            </button>
          </div>
        </div>
      )}

      {/* Main Content Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'checker' && (
          <PrePublicationChecker
            currentRole={currentRole}
            onSubmissionCreated={handleSubmissionCreated}
            onNavigateToQueue={() => setActiveTab('queue')}
            isDemoMode={isDemoMode}
          />
        )}

        {activeTab === 'heatmap' && (
          <GuidelineClarityHeatmap
            rules={rules}
            onRulesUpdated={setRules}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'facts' && (
          <FactLibrary
            facts={facts}
            onFactsUpdated={setFacts}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'visual' && (
          <VisualAccessibilityChecker />
        )}

        {activeTab === 'queue' && (
          <ReviewApprovalQueue
            submissions={submissions}
            auditLogs={auditLogs}
            onSubmissionsUpdated={setSubmissions}
            currentRole={currentRole}
          />
        )}
      </main>

      {/* Footer adhering to Section 1.B & 1.D (quiet copyright, legal references, no telemetry ticker) */}
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
        onLoadScenario={(scenario) => {
          setActiveTab('checker');
        }}
      />
    </div>
  );
}
