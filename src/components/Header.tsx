import React from 'react';
import { ShieldCheck, Sparkles, User, RefreshCw, HelpCircle, Layers } from 'lucide-react';
import { Role } from '../types';

interface HeaderProps {
  activeTab: 'checker' | 'heatmap' | 'facts' | 'visual' | 'queue';
  setActiveTab: (tab: 'checker' | 'heatmap' | 'facts' | 'visual' | 'queue') => void;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  onResetDemo: () => void;
  onOpenGuide: () => void;
  queuePendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  isDemoMode,
  setIsDemoMode,
  onResetDemo,
  onOpenGuide,
  queuePendingCount,
}) => {
  const roles: { value: Role; label: string; name: string }[] = [
    { value: 'creator', label: 'Creator', name: 'Priya (Marketing Exec)' },
    { value: 'manager', label: 'Manager', name: 'Alex (Marketing Mgr)' },
    { value: 'legal', label: 'Legal Reviewer', name: 'Marcus (Legal Counsel)' },
    { value: 'brand_owner', label: 'Brand Owner', name: 'Sarah (VP Brand)' },
    { value: 'admin', label: 'Administrator', name: 'Jordan (SecOps)' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top single row adhering to Top Bar Contract: Brand Zone — Nav Links — Primary Action */}
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('checker')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-base shadow-sm">
                C
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-teal-800 transition-colors whitespace-nowrap">
                  Checkpoint
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block text-xs font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Brand Governance
            </span>
          </div>

          {/* Zone 2: 4–5 clean single-line navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('checker')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                activeTab === 'checker' ? 'border-teal-700 text-teal-900 font-semibold' : 'border-transparent'
              }`}
            >
              Pre-Publication Check
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                activeTab === 'heatmap' ? 'border-teal-700 text-teal-900 font-semibold' : 'border-transparent'
              }`}
            >
              Clarity Heatmap
            </button>
            <button
              onClick={() => setActiveTab('facts')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                activeTab === 'facts' ? 'border-teal-700 text-teal-900 font-semibold' : 'border-transparent'
              }`}
            >
              Fact Library
            </button>
            <button
              onClick={() => setActiveTab('visual')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                activeTab === 'visual' ? 'border-teal-700 text-teal-900 font-semibold' : 'border-transparent'
              }`}
            >
              Visual & Contrast
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 relative ${
                activeTab === 'queue' ? 'border-teal-700 text-teal-900 font-semibold' : 'border-transparent'
              }`}
            >
              Review Queue
              {queuePendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-mono font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                  {queuePendingCount}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Actions, Persona switcher & Demo Mode */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Role Switcher */}
            <div className="relative flex items-center">
              <label htmlFor="role-select" className="sr-only">Select Role</label>
              <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <select
                  id="role-select"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value as Role)}
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
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  isDemoMode
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-teal-900 hover:bg-teal-100'
                }`}
                title="Toggle Demo Mode & Mock Data"
              >
                <Sparkles className="w-3 h-3" />
                <span>Demo {isDemoMode ? 'Active' : 'Off'}</span>
              </button>
              {isDemoMode && (
                <button
                  onClick={onResetDemo}
                  title="Reload National Hackathon Demo Sample"
                  className="px-1.5 py-1 text-teal-800 hover:text-teal-950 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Context & Guide Modal trigger */}
            <button
              onClick={onOpenGuide}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Platform Blueprint & Evidence Context"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Subnavigation */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-4 text-xs font-medium border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => setActiveTab('checker')}
            className={`whitespace-nowrap shrink-0 px-2 py-1 rounded ${activeTab === 'checker' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
          >
            Pre-Publish Check
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`whitespace-nowrap shrink-0 px-2 py-1 rounded ${activeTab === 'heatmap' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
          >
            Clarity Heatmap
          </button>
          <button
            onClick={() => setActiveTab('facts')}
            className={`whitespace-nowrap shrink-0 px-2 py-1 rounded ${activeTab === 'facts' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
          >
            Fact Library
          </button>
          <button
            onClick={() => setActiveTab('visual')}
            className={`whitespace-nowrap shrink-0 px-2 py-1 rounded ${activeTab === 'visual' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
          >
            Visual & Contrast
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`whitespace-nowrap shrink-0 px-2 py-1 rounded ${activeTab === 'queue' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
          >
            Review Queue ({queuePendingCount})
          </button>
        </div>
      </div>
    </header>
  );
};
