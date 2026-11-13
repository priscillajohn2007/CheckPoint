import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Link2,
  FileCheck2,
  RefreshCw,
  Bug,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { HallmarkRecord, HallmarkVerifyResult, Role } from '../types';
import { api } from '../services/api';

interface HallmarksViewProps {
  hallmarks: HallmarkRecord[];
  onHallmarksUpdated: (next: HallmarkRecord[]) => void;
  onNavigateToChecker: () => void;
  onChainVerified?: () => void;
  currentRole: Role;
  isDemoMode?: boolean;
}

export const HallmarksView: React.FC<HallmarksViewProps> = ({
  hallmarks,
  onHallmarksUpdated,
  onNavigateToChecker,
  onChainVerified,
  currentRole,
  isDemoMode = false,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySummary, setVerifySummary] = useState<{
    total: number;
    brokenCount: number;
    allVerified: boolean;
    results: HallmarkVerifyResult[];
  } | null>(null);
  const [activeWalkStep, setActiveWalkStep] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVerifySummary(null);
    setActiveWalkStep(-1);
  }, [isDemoMode, hallmarks.length]);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setError(null);
    setActiveWalkStep(0);
    try {
      const res = await api.verifyHallmarks();
      // Animated sequential chain walk feel
      for (let i = 0; i < res.results.length; i++) {
        setActiveWalkStep(i + 1);
        await new Promise((r) => setTimeout(r, 120));
      }
      setVerifySummary(res);
      onChainVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the chain.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async (id: string) => {
    try {
      const updated = await api.simulateTamperHallmark(id);
      onHallmarksUpdated(hallmarks.map((h) => (h.id === id ? updated : h)));
      const res = await api.verifyHallmarks();
      setVerifySummary(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const updated = await api.restoreHallmark(id);
      onHallmarksUpdated(hallmarks.map((h) => (h.id === id ? updated : h)));
      const res = await api.verifyHallmarks();
      setVerifySummary(res);
    } catch (err) {
      console.error(err);
    }
  };

  const resultMap = new Map<string, HallmarkVerifyResult>();
  verifySummary?.results.forEach((r) => resultMap.set(r.id, r));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Cryptographic Approval Ledger</span>
              <span aria-hidden="true">·</span>
              <span>SHA-256 Hash Chain</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Content Hallmarks
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Each approval writes a tamper-evident SHA-256 Hallmark recording the content hash, rulebook version, findings outcomes, approvers, and AI used—chained to the previous Hallmark.
            </p>
          </div>

          <button
            onClick={handleVerifyChain}
            disabled={isVerifying || hallmarks.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying Chain...' : 'Verify the Chain'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Verification Status Summary Banner */}
      {verifySummary && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            verifySummary.allVerified
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {verifySummary.allVerified ? (
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                {verifySummary.allVerified
                  ? `All ${verifySummary.total} Hallmark(s) Verified`
                  : `${verifySummary.brokenCount} of ${verifySummary.total} Hallmark(s) Do Not Verify`}
              </div>
              <div className="opacity-90 mt-0.5">
                {verifySummary.allVerified
                  ? 'Content SHA-256 digests, signed record hashes, and sequential chain links all match cleanly.'
                  : 'One or more Hallmarks were modified after issuance or have a broken previous-hash link.'}
              </div>
            </div>
          </div>
          <span className="font-mono font-bold px-2.5 py-1 bg-white rounded border border-current shrink-0">
            {verifySummary.allVerified ? 'CHAIN INTACT' : 'CHAIN BROKEN'}
          </span>
        </div>
      )}

      {/* Empty State */}
      {hallmarks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-teal-800 mx-auto flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Hallmarks Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Approve an analyzed draft in the Review Queue (or via Slack Relay) to mint its tamper-evident SHA-256 Hallmark here.
          </p>
          <button
            onClick={onNavigateToChecker}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <span>Go to Pre-Publication Check</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left: Hallmark Chain Cards (8 cols) */}
          <div className="xl:col-span-8 space-y-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hallmark Chain, Newest First ({hallmarks.length})
            </div>

            {hallmarks.map((h) => {
              const v = resultMap.get(h.id);
              return (
                <div
                  key={h.id}
                  className={`bg-white border rounded-xl p-5 shadow-xs space-y-4 transition-all ${
                    v && !v.ok
                      ? 'border-rose-300 bg-rose-50/30'
                      : v && v.ok
                      ? 'border-emerald-300'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Top Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-teal-900 text-white font-mono text-xs font-bold">
                          Hallmark #{h.seq}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{h.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>Channel: {h.channel}</span>
                        <span>·</span>
                        <span>Rulebook {h.rulebookVersion}</span>
                        <span>·</span>
                        <span>{h.findingsSummary.length} finding(s)</span>
                        <span>·</span>
                        <span>Approved by {[...new Set(h.approvals.map((a) => a.by))].join(', ')}</span>
                        <span>·</span>
                        <span>Model: {h.aiModel}</span>
                        <span>·</span>
                        <span>{new Date(h.issuedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {v && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                          v.ok
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {v.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        <span>{v.ok ? 'Verified' : 'Does not verify'}</span>
                      </span>
                    )}
                  </div>

                  {/* Verification Granular Checks */}
                  {v && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                            v.contentMatches ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {v.contentMatches ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span>Content: {v.contentMatches ? 'matches' : 'differs'}</span>
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                            v.recordMatches ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {v.recordMatches ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span>Record: {v.recordMatches ? 'matches' : 'differs'}</span>
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                            v.chainMatches ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {v.chainMatches ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span>Chain: {v.chainMatches ? 'matches' : 'differs'}</span>
                        </span>
                      </div>
                      {v.reason && (
                        <p className="text-xs text-rose-800 font-medium bg-rose-50 px-3 py-1.5 rounded border border-rose-200">
                          {v.reason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Hash Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
                    <div>
                      <span className="text-slate-500 block font-sans font-semibold text-[10px] uppercase">
                        Hallmark Record Hash (SHA-256)
                      </span>
                      <span className="text-slate-900 break-all">{h.hash}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans font-semibold text-[10px] uppercase">
                        {h.seq === 1 ? 'Genesis Anchor' : `Links back to #${h.seq - 1} (prevHash)`}
                      </span>
                      <span className="text-slate-700 break-all">{h.prevHash}</span>
                    </div>
                  </div>

                  {/* Approved Content Snapshot */}
                  <div className="text-xs text-slate-700 bg-slate-50/60 p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">
                      Sealed Content Snapshot (SHA-256: {h.contentHash.slice(0, 16)}...)
                    </span>
                    <p className="line-clamp-3 font-sans">{h.content}</p>
                  </div>

                  {/* Interactive Tamper Simulation for Verification Testing */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-teal-700" />
                      <span>Recorded permanently with cryptographic seal</span>
                    </div>

                    {h.tampered ? (
                      <button
                        onClick={() => handleRestore(h.id)}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Sealed Content</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSimulateTamper(h.id)}
                        className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-200 hover:border-rose-200 rounded-md font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Inject an unapproved post-sign-off edit to verify that Checkpoint detects tampering"
                      >
                        <Bug className="w-3 h-3" />
                        <span>Test Tamper Detection</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Chain Walk Explainer Sidebar (4 cols) */}
          <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 xl:sticky xl:top-28">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Link2 className="w-4 h-4 text-teal-800" />
              <h3 className="text-sm font-bold text-slate-900">How Chain Verification Works</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Clicking <strong>Verify the Chain</strong> starts at Hallmark #1 and recomputes every SHA-256 content digest, record payload hash, and sequential link hash.
            </p>
            <div className="space-y-2 text-xs">
              {!verifySummary && !isVerifying && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                  Nothing has been checked yet. Click <strong>Verify the Chain</strong> above to audit every Hallmark.
                </div>
              )}
              {isVerifying && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 font-medium">
                  Checking link #{activeWalkStep}...
                </div>
              )}
              {verifySummary?.results.map((r) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    r.ok ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <span className="font-mono font-semibold">Hallmark #{r.seq}</span>
                  <span className="text-[11px] font-medium">
                    {r.ok ? 'Content, Record & Chain OK' : 'Tamper / Chain Mismatch'}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
