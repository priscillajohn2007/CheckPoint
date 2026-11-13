import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  User,
  RefreshCw,
  HelpCircle,
  Layers,
  Activity,
  Lock,
  Info,
} from 'lucide-react';
import { Role } from '../types';

export type AppTab =
  | 'checker'
  | 'queue'
  | 'kit'
  | 'heatmap'
  | 'facts'
  | 'inbox'
  | 'visual'
  | 'hallmarks'
  | 'scorecard';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  onResetDemo: () => void;
  onOpenGuide: () => void;
  onOpenCompanion: () => void;
  onOpenTrust: () => void;
  queuePendingCount: number;
  expiryUnreadCount: number;
  hallmarksCount: number;
  confidentialMode: boolean;
}

// Role-based visibility definition
export const ROLE_PERMITTED_TABS: Record<Role, AppTab[]> = {
  creator: ['checker', 'visual', 'hallmarks'],
  manager: ['checker', 'queue', 'visual', 'facts', 'inbox', 'hallmarks'],
  legal: ['queue', 'facts', 'inbox', 'hallmarks', 'checker'],
  brand_owner: ['heatmap', 'scorecard', 'kit', 'facts', 'inbox', 'hallmarks', 'checker'],
  admin: ['checker', 'queue', 'kit', 'heatmap', 'facts', 'inbox', 'visual', 'hallmarks', 'scorecard'],
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  isDemoMode,
  setIsDemoMode,
  onResetDemo,
  onOpenGuide,
  onOpenCompanion,
  onOpenTrust,
  queuePendingCount,
  expiryUnreadCount,
  hallmarksCount,
  confidentialMode,
}) => {
  const roles: { value: Role; label: string; name: string; description: string }[] = [
    { value: 'creator', label: 'Creator', name: 'Content Creator', description: 'Pre-Publication Checks & Visual Assets' },
    { value: 'manager', label: 'Manager', name: 'Marketing Manager', description: 'Review Queue & Fact Library' },
    { value: 'legal', label: 'Legal Reviewer', name: 'Legal Counsel', description: 'High-Risk Review Queue & Audited Sources' },
    { value: 'brand_owner', label: 'Brand Owner', name: 'VP Brand', description: 'Guideline Clarity Heatmap & Brand Kit' },
    { value: 'admin', label: 'Administrator', name: 'System Admin', description: 'Full Platform Access' },
  ];

  const permittedTabs = ROLE_PERMITTED_TABS[currentRole] || ['checker'];

  const navItems: { id: AppTab; label: string; shortLabel: string; badge?: number; badgeStyle?: string }[] = [
    { id: 'checker', label: 'Pre-Publication Check', shortLabel: 'Pre-Publish' },
    {
      id: 'queue',
      label: 'Review Queue',
      shortLabel: 'Queue',
      badge: queuePendingCount > 0 ? queuePendingCount : undefined,
      badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    { id: 'kit', label: 'Brand Kit', shortLabel: 'Brand Kit' },
    { id: 'heatmap', label: 'Clarity Heatmap', shortLabel: 'Heatmap' },
    { id: 'facts', label: 'Fact Library', shortLabel: 'Facts' },
    {
      id: 'inbox',
      label: 'Expiry Inbox',
      shortLabel: 'Expiry',
      badge: expiryUnreadCount > 0 ? expiryUnreadCount : undefined,
      badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    { id: 'visual', label: 'Visual & Logo', shortLabel: 'Visual' },
    {
      id: 'hallmarks',
      label: 'Hallmarks',
      shortLabel: 'Hallmarks',
      badge: hallmarksCount > 0 ? hallmarksCount : undefined,
      badgeStyle: 'bg-teal-100 text-teal-900 border-teal-300',
    },
    { id: 'scorecard', label: 'Brand Health', shortLabel: 'Health' },
  ];

  const visibleNavItems = navItems.filter((item) => permittedTabs.includes(item.id));

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Row 1: Brand + Governance Controls */}
        <div className="flex items-center justify-between gap-4 h-14">
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('checker')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-base shadow-sm">
                C
              </div>
              <div className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-teal-800 transition-colors whitespace-nowrap">
                Checkpoint
              </div>
            </button>
            <span className="hidden sm:inline-block text-xs font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Brand Governance
            </span>
            {confidentialMode && (
              <button
                onClick={() => {
                  if (permittedTabs.includes('kit')) setActiveTab('kit');
                  else onOpenTrust();
                }}
                className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded cursor-pointer"
                title="Confidential Mode active: external AI calls are blocked"
              >
                <Lock className="w-3 h-3" />
                <span>Confidential Mode</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Companion Modal Launcher Button */}
            <button
              onClick={onOpenCompanion}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-300/80 cursor-pointer"
              title="Open In-Situ Figma & Google Docs Companion"
            >
              <Layers className="w-3.5 h-3.5 text-teal-800" />
              <span>Figma &amp; Docs</span>
            </button>

            {/* Role Switcher */}
            <div className="relative flex items-center">
              <label htmlFor="role-select" className="sr-only">Select Role</label>
              <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <select
                  id="role-select"
                  value={currentRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as Role;
                    setCurrentRole(nextRole);
                    const validTabs = ROLE_PERMITTED_TABS[nextRole] || ['checker'];
                    if (!validTabs.includes(activeTab)) {
                      setActiveTab(validTabs[0]);
                    }
                  }}
                  aria-label="Select Role"
                  className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>
                      Role: {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Demo Button / Pill Switch */}
            <div className="flex items-center bg-teal-50 border border-teal-300/80 rounded-lg p-0.5">
              <button
                onClick={() => setIsDemoMode(!isDemoMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  isDemoMode
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-teal-100'
                }`}
                title="Toggle Demo Mode & Mock Data"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isDemoMode ? 'Demo: On' : 'Demo: Off'}</span>
              </button>
              {isDemoMode && (
                <button
                  onClick={onResetDemo}
                  title="Reload Demo Sample Dataset"
                  className="px-1.5 py-1 text-teal-800 hover:text-teal-950 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* About & Trust Modal Trigger */}
            <button
              onClick={onOpenTrust}
              className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
              title="About & Trust Architecture (Deterministic Rules, DPDP, SHA-256)"
              aria-label="About & Trust"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Context & Guide Modal Trigger */}
            <button
              onClick={onOpenGuide}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Platform Guide & Walkthrough"
              aria-label="Platform Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Role-Filtered Navigation Tabs */}
        <nav className="flex items-center gap-4 lg:gap-6 overflow-x-auto border-t border-slate-100 h-11 text-xs sm:text-sm font-medium text-slate-600 scrollbar-none">
          {visibleNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`h-full flex items-center gap-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-teal-700 text-teal-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {item.id === 'scorecard' && <Activity className="w-3.5 h-3.5" />}
                {item.id === 'hallmarks' && <ShieldCheck className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.shortLabel}</span>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full border ${
                      item.badgeStyle || 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={onOpenCompanion}
            className="md:hidden whitespace-nowrap shrink-0 px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 text-xs cursor-pointer"
          >
            Figma &amp; Docs
          </button>
        </nav>
      </div>
    </header>
  );
};

