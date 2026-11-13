import React, { useState, useEffect } from 'react';
import {
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  ExternalLink,
  Check,
  Inbox,
  Edit2,
} from 'lucide-react';
import { ExpiryNotice, Role } from '../types';
import { api } from '../services/api';

interface ExpiryInboxViewProps {
  currentRole: Role;
  onNavigateToFacts: () => void;
  onInboxChanged?: () => void;
  isDemoMode?: boolean;
}

export const ExpiryInboxView: React.FC<ExpiryInboxViewProps> = ({
  currentRole,
  onNavigateToFacts,
  onInboxChanged,
  isDemoMode = false,
}) => {
  const [notices, setNotices] = useState<ExpiryNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOwner, setEditingOwner] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const loadInbox = async () => {
    setLoading(true);
    try {
      const data = await api.getExpiryInbox();
      setNotices(data);
    } catch (err) {
      console.error('Failed to load expiry inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, [isDemoMode]);

  const canManageEmails = currentRole === 'admin' || currentRole === 'brand_owner';

  const handleMarkRead = async (factId: string) => {
    try {
      const res = await api.markExpiryRead(factId);
      setNotices(res.notices);
      onInboxChanged?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.markAllExpiryRead();
      setNotices(res.notices);
      onInboxChanged?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendAlert = async (notice: ExpiryNotice, customEmail?: string) => {
    setFeedback(null);
    const targetEmail = (customEmail ?? notice.ownerEmail ?? '').trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setFeedback({ tone: 'err', text: 'Enter a valid email address with @ and a domain before sending.' });
      return;
    }
    try {
      const res = await api.sendExpiryAlert(notice.factId, targetEmail);
      setNotices(res.notices);
      setEditingOwner(null);
      setEmailInput('');
      setFeedback({ tone: 'ok', text: `Renewal alert dispatched to ${res.sentTo} for ${notice.verifiedBy}.` });
      onInboxChanged?.();
    } catch (err) {
      setFeedback({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not dispatch alert.',
      });
    }
  };

  const unreadCount = notices.filter((n) => !n.read).length;

  const buildMailtoHref = (n: ExpiryNotice) => {
    const statusText = n.daysLeft < 0 ? `expired ${Math.abs(n.daysLeft)} day(s) ago` : n.daysLeft === 0 ? 'expires today' : `expires in ${n.daysLeft} day(s)`;
    const subject = `Fact Expiry Alert: ${n.statement.slice(0, 48)} (${statusText})`;
    const body = `Hello ${n.verifiedBy},\n\nThe approved fact below ${statusText} (Expiry: ${n.expiryDate}):\n"${n.statement}"\nSource: ${n.sourceDoc}\n\nPlease renew or retire this fact in Checkpoint so drafts citing it stay compliant.`;
    return `mailto:${encodeURIComponent(n.ownerEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Proactive Claim Lifecycle</span>
              <span aria-hidden="true">·</span>
              <span>30 / 14 / 7 / 1 Day Expiry Notices</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Fact Expiry Inbox &amp; Owner Alerts
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Tracks approved facts approaching expiry within 30 days or already expired, and lets owners receive direct renewal alerts.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Read ({unreadCount})</span>
              </button>
            )}
            <button
              onClick={onNavigateToFacts}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Open Fact Library
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.tone === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-rose-700" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold px-1">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
          Reading expiry notices...
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-teal-800 mx-auto flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Expiry Alerts Active</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Facts with expiry dates within 30 days (or already past their expiry date) automatically raise alerts here so outdated claims never ship.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => {
            // Compute progress in 30-day expiry window
            const clampedDays = Math.max(0, Math.min(30, n.daysLeft));
            const elapsedPct = n.daysLeft < 0 ? 100 : Math.round(((30 - clampedDays) / 30) * 100);
            const isEditingThis = editingOwner === n.factId;

            return (
              <div
                key={n.id}
                className={`bg-white border rounded-xl p-5 shadow-xs space-y-3.5 transition-all ${
                  !n.read ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {!n.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Unread alert" />
                      )}
                      <span className="uppercase font-bold text-[10px] tracking-wider text-slate-500">
                        {n.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                          n.isExpired
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : n.daysLeft <= 7
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {n.thresholdLabel}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Owner: <strong className="text-slate-800">{n.verifiedBy}</strong>
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900">
                      &ldquo;{n.statement}&rdquo;
                    </p>

                    <div className="text-xs text-slate-500">
                      Source: <strong className="text-slate-700">{n.sourceDoc}</strong> · Valid to{' '}
                      <span className="font-mono">{n.expiryDate}</span>
                      {n.lastSentAt && (
                        <span className="ml-2 text-emerald-700 font-medium">
                          · Alert sent {new Date(n.lastSentAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.factId)}
                        className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}

                    {n.ownerEmail && !isEditingThis ? (
                      <>
                        <button
                          onClick={() => handleSendAlert(n)}
                          className="px-3 py-1.5 text-xs font-semibold bg-teal-800 hover:bg-teal-900 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Notify {n.ownerEmail}</span>
                        </button>
                        <a
                          href={buildMailtoHref(n)}
                          className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Mail App</span>
                        </a>
                      </>
                    ) : null}

                    {canManageEmails && !isEditingThis && (
                      <button
                        onClick={() => {
                          setEditingOwner(n.factId);
                          setEmailInput(n.ownerEmail || '');
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{n.ownerEmail ? 'Edit Email' : 'Add Owner Email'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 30-day Countdown Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>30-day renewal window</span>
                    <span className="font-mono font-semibold">
                      {n.isExpired ? '0 days remaining (Expired)' : `${n.daysLeft} day(s) remaining`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
                    <div
                      className={`h-full rounded-full transition-all ${
                        n.isExpired ? 'bg-rose-600' : n.daysLeft <= 7 ? 'bg-amber-500' : 'bg-teal-700'
                      }`}
                      style={{ width: `${elapsedPct}%` }}
                    />
                  </div>
                </div>

                {/* Owner Email Inline Form */}
                {isEditingThis && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={`Email address for ${n.verifiedBy} (e.g. owner@company.com)`}
                      className="flex-1 min-w-[220px] text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                    <button
                      onClick={() => handleSendAlert(n, emailInput)}
                      className="px-3 py-2 text-xs font-semibold bg-teal-800 hover:bg-teal-900 text-white rounded-lg cursor-pointer"
                    >
                      Save &amp; Send Alert
                    </button>
                    <button
                      onClick={() => setEditingOwner(null)}
                      className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {!canManageEmails && !n.ownerEmail && (
                  <div className="text-[11px] text-slate-500 italic">
                    Switch to Brand Owner or Administrator role to assign an owner alert email address.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
