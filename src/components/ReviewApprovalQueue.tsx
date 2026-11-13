import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Send, 
  ShieldAlert, 
  User, 
  FileText, 
  History,
  Lock,
  Share2,
  ExternalLink,
  Check,
  RotateCcw,
  Download,
  ShieldCheck
} from 'lucide-react';
import { ContentSubmission, AuditLogEntry, Role, SlackNotification } from '../types';
import { api } from '../services/api';

interface ReviewApprovalQueueProps {
  submissions: ContentSubmission[];
  auditLogs: AuditLogEntry[];
  onSubmissionsUpdated: (subs: ContentSubmission[]) => void;
  onNavigateToHallmarks?: () => void;
  currentRole: Role;
  isDemoMode?: boolean;
}

export const ReviewApprovalQueue: React.FC<ReviewApprovalQueueProps> = ({
  submissions,
  auditLogs,
  onSubmissionsUpdated,
  onNavigateToHallmarks,
  currentRole,
  isDemoMode = false,
}) => {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>(
    submissions[0]?.id || ''
  );
  const [commentInput, setCommentInput] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'slack' | 'audit'>('queue');
  const [filterRoute, setFilterRoute] = useState<'all' | 'legal' | 'manager'>('all');
  const [slackNotifications, setSlackNotifications] = useState<SlackNotification[]>([]);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const selectedSub = submissions.find((s) => s.id === selectedSubmissionId);

  useEffect(() => {
    if (!selectedSub && submissions.length > 0) {
      setSelectedSubmissionId(submissions[0].id);
    } else if (submissions.length === 0) {
      setSelectedSubmissionId('');
    }
  }, [submissions]);

  const fetchSlackNotifications = async () => {
    try {
      const data = await api.getSlackNotifications();
      setSlackNotifications(data);
    } catch (e) {
      console.error('Failed to load slack notifications:', e);
    }
  };

  useEffect(() => {
    fetchSlackNotifications();
  }, [isDemoMode]);

  const handleReviewAction = async (action: 'approve' | 'reject' | 'request_revision') => {
    if (!selectedSub) return;

    let reviewerName = 'Alex Rivera';
    let reviewerRole = currentRole;
    if (currentRole === 'legal') reviewerName = 'Marcus Vance';
    else if (currentRole === 'brand_owner') reviewerName = 'Sarah Chen';
    else if (currentRole === 'creator') reviewerName = 'Priya Sharma';

    try {
      const updated = await api.reviewSubmission(
        selectedSub.id,
        action,
        commentInput,
        reviewerName,
        reviewerRole
      );

      const updatedList = submissions.map((s) => (s.id === updated.id ? updated : s));
      onSubmissionsUpdated(updatedList);
      setCommentInput('');
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const handleDispatchToSlack = async (submissionId: string) => {
    setDispatchStatus('Dispatching interactive card to Slack...');
    try {
      const res = await api.dispatchSlackNotification(submissionId);
      if (res.success) {
        setDispatchStatus(`Card dispatched to ${res.notification.recipientChannel}!`);
        await fetchSlackNotifications();
        setTimeout(() => setDispatchStatus(null), 3500);
      }
    } catch (err) {
      console.error('Failed to dispatch to Slack:', err);
      setDispatchStatus('Failed to send webhook');
    }
  };

  const handleSlackCardAction = async (notificationId: string, action: 'approved' | 'rejected' | 'revision_requested') => {
    try {
      const res = await api.respondSlackNotification(notificationId, action, 'Marcus Vance (via Slack)');
      if (res.success && res.updatedSubmission) {
        const updatedList = submissions.map((s) => (s.id === res.updatedSubmission.id ? res.updatedSubmission : s));
        onSubmissionsUpdated(updatedList);
        await fetchSlackNotifications();
      }
    } catch (err) {
      console.error('Slack card action failed:', err);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (filterRoute === 'legal') return sub.routeTo === 'legal_reviewer';
    if (filterRoute === 'manager') return sub.routeTo === 'marketing_manager';
    return true;
  });

  const pendingLegalCount = submissions.filter((s) => s.status === 'pending_legal').length;
  const pendingManagerCount = submissions.filter((s) => s.status === 'pending_manager').length;
  const approvedCount = submissions.filter((s) => s.status === 'approved').length;

  const handleDownloadSubmissionReport = (sub: ContentSubmission) => {
    const lines = [
      `# Governance Audit Record: ${sub.title}`,
      `- **Status:** ${sub.status.toUpperCase()}`,
      `- **Channel:** ${sub.channel}`,
      `- **Author:** ${sub.author} (${sub.authorRole})`,
      `- **Routing:** ${sub.routeTo} — ${sub.routingReason}`,
      ...(sub.hallmarkSeq ? [`- **Hallmark:** #${sub.hallmarkSeq} (SHA-256: ${sub.contentHash || 'sealed'})`] : []),
      ``,
      `## Submitted Copy`,
      '```',
      sub.content,
      '```',
      ``,
      `## Findings (${sub.findings.length})`,
      ...sub.findings.map(
        (f, idx) =>
          `${idx + 1}. **[${f.severity.toUpperCase()}] ${f.ruleCode}** (${f.status}) — "${f.matchedText}" → Fix: "${f.suggestedFix}"\n   - Reason: ${f.reason}`
      ),
      ``,
      `## Review Comments (${sub.reviewComments.length})`,
      ...sub.reviewComments.map((c) => `- **${c.author} (${c.role})** [${c.timestamp}]: ${c.comment}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkpoint-audit-${sub.id}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Kicker Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Review Queue &amp; Slack Webhook Relay</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">Risk-Based Approvals</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Review &amp; Governance Queue
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Review pre-publication drafts, inspect grounded evidence, mint SHA-256 Hallmarks on approval, and dispatch cards to Slack.
            </p>
          </div>

          {/* Subtabs: Queue vs Slack Simulator vs Audit Log */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab('queue')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeSubTab === 'queue' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Approval Queue ({submissions.length})
            </button>
            <button
              onClick={() => {
                setActiveSubTab('slack');
                fetchSlackNotifications();
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'slack' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Slack Relay ({slackNotifications.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeSubTab === 'audit' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Audit Trail ({auditLogs.length})
            </button>
          </div>
        </div>

        {/* Pipeline Status Strip */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <span className="font-medium text-amber-900">Pending Legal Review</span>
            <span className="font-mono font-bold text-amber-950">{pendingLegalCount}</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
            <span className="font-medium text-blue-900">Pending Manager Sign-Off</span>
            <span className="font-mono font-bold text-blue-950">{pendingManagerCount}</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <span className="font-medium text-emerald-900">Approved &amp; Hallmarked</span>
            <span className="font-mono font-bold text-emerald-950">{approvedCount}</span>
          </div>
        </div>
      </div>

      {activeSubTab === 'queue' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Submissions List (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-0">
            {/* Filter bar */}
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Filter Routing:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterRoute('all')}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    filterRoute === 'all' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterRoute('legal')}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    filterRoute === 'legal' ? 'bg-amber-800 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Legal Only
                </button>
                <button
                  onClick={() => setFilterRoute('manager')}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    filterRoute === 'manager' ? 'bg-teal-800 text-white font-medium' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Manager Only
                </button>
              </div>
            </div>

            {/* List items */}
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredSubmissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No submissions in the review queue yet. Submit an analyzed draft or poster from Pre-Publication Check to review it here.
                </div>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isSelected = sub.id === selectedSubmissionId;
                  const isLegal = sub.routeTo === 'legal_reviewer';

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubmissionId(sub.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                          {sub.channel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            sub.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : isLegal
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {sub.status === 'approved'
                            ? 'APPROVED'
                            : sub.status === 'rejected'
                            ? 'REJECTED'
                            : isLegal
                            ? 'PENDING LEGAL'
                            : 'PENDING MGR'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{sub.title}</h4>

                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">{sub.content}</div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                        <span>By {sub.author}</span>
                        <span>{sub.findings.length} findings attached</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Submission Inspector & Review Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedSub ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-xs font-mono text-teal-800 font-semibold uppercase">
                      Channel: {selectedSub.channel} · Author: {selectedSub.author} ({selectedSub.authorRole})
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedSub.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedSub.hallmarkSeq && onNavigateToHallmarks && (
                      <button
                        onClick={onNavigateToHallmarks}
                        className="px-2.5 py-1 text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-300 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Open cryptographic Hallmark record"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-800" />
                        <span>Hallmark #{selectedSub.hallmarkSeq}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDownloadSubmissionReport(selectedSub)}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Download Governance Report (.md)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.md Report</span>
                    </button>

                    <button
                      onClick={() => handleDispatchToSlack(selectedSub.id)}
                      className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Dispatch interactive card to Slack approval channel"
                    >
                      <Share2 className="w-3.5 h-3.5 text-purple-700" />
                      <span>Send to Slack</span>
                    </button>

                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                        selectedSub.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedSub.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {selectedSub.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {dispatchStatus && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs font-semibold text-purple-900 flex items-center gap-2">
                    <Share2 className="w-3.5 h-3.5 text-purple-700" />
                    <span>{dispatchStatus}</span>
                  </div>
                )}

                {/* Routing Reason */}
                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Governance Dispatch Note:</strong>{' '}
                    {selectedSub.routingReason}
                  </div>
                </div>

                {/* Draft Content View */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Submitted Content
                  </div>
                  <div className="p-3.5 bg-slate-50 text-slate-900 text-xs font-sans rounded-lg border border-slate-200 leading-relaxed">
                    {selectedSub.content}
                  </div>
                </div>

                {/* Grounded Evidence Findings Attached */}
                {selectedSub.findings.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Attached AI &amp; Rule Inconsistency Findings ({selectedSub.findings.length})
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedSub.findings.map((f, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded border border-slate-200 bg-white text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{f.ruleCode}: {f.issue}</span>
                            <span className="font-mono text-[10px] text-slate-500">{f.status}</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">{f.reason}</p>
                          {f.sourceDoc && (
                            <div className="text-[10px] text-teal-800 font-medium">
                              Approved Source: {f.sourceDoc}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewer Comments Thread */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Review History &amp; Comments ({selectedSub.reviewComments.length})
                  </div>
                  <div className="space-y-2 mb-3">
                    {selectedSub.reviewComments.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">No comments yet.</div>
                    ) : (
                      selectedSub.reviewComments.map((c) => (
                        <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                          <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                            <span className="font-semibold text-slate-800">
                              {c.author} ({c.role.toUpperCase()})
                            </span>
                            <span>{new Date(c.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-700">{c.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Add compliance note or guidance..."
                      className="flex-1 p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                </div>

                {/* Reviewer Decision Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleReviewAction('request_revision')}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Request Revisions
                  </button>
                  <button
                    onClick={() => handleReviewAction('reject')}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReviewAction('approve')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve to Publish</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                Select a submission from the list to review.
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === 'slack' ? (
        /* Live Slack Channel Simulator View (Improvement 2 & Not Yet Done Item 2) */
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden text-slate-200">
          {/* Slack simulated header */}
          <div className="bg-[#3F0E40] p-3 text-white flex items-center justify-between text-xs border-b border-purple-900">
            <div className="flex items-center gap-2">
              <span className="font-bold">#legal-governance-approvals</span>
              <span className="text-purple-300 text-[11px]">
                | {isDemoMode ? 'QuickBite Slack Workspace' : 'Brand Governance Workspace'}
              </span>
            </div>
            <span className="text-[10px] bg-purple-800/80 px-2 py-0.5 rounded font-mono">
              Live Webhook Relay Active
            </span>
          </div>

          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            <div className="text-xs text-slate-400 italic">
              Interactive Slack Block Kit notification stream. Click buttons below to test approval flows directly from Slack.
            </div>

            {slackNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-800/50 rounded-lg">
                No notifications dispatched yet. Click &ldquo;Send to Slack&rdquo; from any draft review card to trigger.
              </div>
            ) : (
              slackNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-teal-800 text-white flex items-center justify-center font-bold text-[10px]">
                        C
                      </span>
                      <strong className="text-white">Checkpoint Bot</strong>
                      <span className="text-slate-500">APP</span>
                    </div>
                    <span>{new Date(notif.dispatchedAt).toLocaleTimeString()}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{notif.submissionTitle}</span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded font-mono ${
                          notif.riskLevel === 'high' ? 'bg-rose-900/80 text-rose-200 border border-rose-700' : 'bg-blue-900/80 text-blue-200'
                        }`}
                      >
                        {notif.riskLevel.toUpperCase()} RISK
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs">
                      Submitted for governance sign-off. {notif.findingsCount} inconsistency finding(s) flagged against active guidelines.
                    </p>
                  </div>

                  {/* Slack Interactive Action Buttons */}
                  <div className="pt-2 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {notif.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleSlackCardAction(notif.id, 'approved')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve in Slack</span>
                          </button>
                          <button
                            onClick={() => handleSlackCardAction(notif.id, 'revision_requested')}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors cursor-pointer"
                          >
                            Request Revisions
                          </button>
                          <button
                            onClick={() => handleSlackCardAction(notif.id, 'rejected')}
                            className="px-2.5 py-1.5 bg-rose-900/70 hover:bg-rose-900 text-rose-200 rounded text-xs transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Status: {notif.status.toUpperCase()} ({notif.respondedBy})</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedSubmissionId(notif.submissionId);
                        setActiveSubTab('queue');
                      }}
                      className="text-[11px] text-teal-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Inspect in Checkpoint Portal</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Audit Trail View */
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900">Immutable Brand Governance Audit Trail</h3>
              <p className="text-slate-500">Complete record of drafts, AI checks, dismissals, approvals, and Slack webhooks</p>
            </div>
            <span className="font-mono text-slate-500">{auditLogs.length} Events</span>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 text-xs flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{log.actorName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 uppercase text-[10px] font-mono">
                      {log.actorRole}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="px-2 py-0.2 rounded font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-slate-700">{log.details}</p>
                </div>
                <div className="text-[11px] font-mono text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
