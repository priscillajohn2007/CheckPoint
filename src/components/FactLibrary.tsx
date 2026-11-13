import React, { useState } from 'react';
import { 
  Database, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { ApprovedFact, Role } from '../types';
import { api } from '../services/api';

interface FactLibraryProps {
  facts: ApprovedFact[];
  onFactsUpdated: (facts: ApprovedFact[]) => void;
  currentRole: Role;
  isDemoMode?: boolean;
}

export const FactLibrary: React.FC<FactLibraryProps> = ({
  facts,
  onFactsUpdated,
  currentRole,
  isDemoMode = false,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New fact form state
  const [statement, setStatement] = useState<string>('');
  const [category, setCategory] = useState<ApprovedFact['category']>('operations');
  const [sourceDoc, setSourceDoc] = useState<string>('');
  const [sourceSection, setSourceSection] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('2026-12-31');
  const [verifiedBy, setVerifiedBy] = useState<string>('Operations Director');
  const [notes, setNotes] = useState<string>('');

  const filteredFacts = facts.filter((f) => {
    const matchesSearch =
      f.statement.toLowerCase().includes(search.toLowerCase()) ||
      f.sourceDoc.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? !f.isExpired
        : f.isExpired;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement || !sourceDoc) return;

    try {
      const newFact = await api.addFact({
        statement,
        category,
        sourceDoc,
        sourceSection,
        expiryDate,
        verifiedBy,
        notes,
      });

      onFactsUpdated([...facts, newFact]);
      setIsAddModalOpen(false);
      // Reset form
      setStatement('');
      setSourceDoc('');
      setSourceSection('');
      setNotes('');
    } catch (err) {
      console.error('Failed to add fact:', err);
    }
  };

  const handleDeleteFact = async (id: string) => {
    try {
      await api.deleteFact(id);
      onFactsUpdated(facts.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Failed to delete fact:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Kicker Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Single Source of Truth</span>
              <span aria-hidden="true">·</span>
              <span>Audited Knowledge Base</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">Prevents Hallucinations &amp; Expired Claims</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Approved Fact Library
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              All marketing claims are verified against this repository. Claims without an active approved fact are flagged for human sign-off.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Approved Fact</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facts, sources, or reports..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="operations">Operations &amp; Speed</option>
            <option value="pricing">Pricing &amp; Promo Codes</option>
            <option value="compliance">Legal &amp; Compliance</option>
            <option value="esg">ESG &amp; Sustainability</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All ({facts.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'active' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Active ({facts.filter((f) => !f.isExpired).length})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'expired' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Expired ({facts.filter((f) => f.isExpired).length})
            </button>
          </div>
        </div>
      </div>

      {/* Facts Grid or Empty State */}
      {filteredFacts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-teal-800 mx-auto flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {facts.length === 0 ? 'No Approved Facts Added Yet' : 'No Matching Facts Found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {facts.length === 0
              ? 'Add your organization’s verified metrics, active promo codes, and expiry dates so Checkpoint can cross-check posters and drafts against your own truth library.'
              : 'Try adjusting your search query or status filter.'}
          </p>
          {facts.length === 0 && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Approved Fact</span>
            </button>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFacts.map((fact) => (
          <div
            key={fact.id}
            className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all ${
              fact.isExpired ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
            }`}
          >
            <div className="space-y-3">
              {/* Category, Status & Expiry */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  {fact.category}
                </span>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  {fact.isExpired ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      EXPIRED: {fact.expiryDate}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Active until {fact.expiryDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Statement */}
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                &ldquo;{fact.statement}&rdquo;
              </p>

              {/* Notes */}
              {fact.notes && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="font-semibold text-slate-700">Governance Note:</span> {fact.notes}
                </div>
              )}
            </div>

            {/* Footer with Citation & Verification metadata */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5 truncate mr-2">
                <ExternalLink className="w-3 h-3 text-teal-700 shrink-0" />
                <span className="font-medium text-slate-800 truncate" title={fact.sourceDoc}>
                  {fact.sourceDoc}
                </span>
                {fact.sourceSection && (
                  <span className="text-slate-400 hidden sm:inline">({fact.sourceSection})</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400">By {fact.verifiedBy}</span>
                <button
                  onClick={() => handleDeleteFact(fact.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Remove fact from library"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add Fact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Audited Fact to Library</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateFact} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Fact Statement (Exact Claim)
                </label>
                <textarea
                  rows={2}
                  required
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="e.g. Our average delivery time is 25 minutes across metropolitan zones."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="operations">Operations &amp; Delivery</option>
                    <option value="pricing">Pricing &amp; Promos</option>
                    <option value="compliance">Legal &amp; Compliance</option>
                    <option value="esg">ESG &amp; Sustainability</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Source Document
                  </label>
                  <input
                    type="text"
                    required
                    value={sourceDoc}
                    onChange={(e) => setSourceDoc(e.target.value)}
                    placeholder="e.g. Q3 Operations Report"
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Verified By
                  </label>
                  <input
                    type="text"
                    required
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    placeholder="e.g. Chief Operations Officer"
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Governance Guidance &amp; Constraints
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Must not claim nationwide coverage until Phase 3 rollout."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs"
                >
                  Save Approved Fact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
