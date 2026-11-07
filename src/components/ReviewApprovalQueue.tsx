import React, { useState } from 'react';
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
  Lock
} from 'lucide-react';
import { ContentSubmission, AuditLogEntry, Role } from '../types';
import { api } from '../services/api';

interface ReviewApprovalQueueProps {
  submissions: ContentSubmission[];
  auditLogs: AuditLogEntry[];
  onSubmissionsUpdated: (subs: ContentSubmission[]) => void;
  currentRole: Role;
}

export const ReviewApprovalQueue: React.FC<ReviewApprovalQueueProps> = ({
  submissions,
  auditLogs,
  onSubmissionsUpdated,
  currentRole,
}) => {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>(
    submissions[0]?.id || ''
  );
  const [commentInput, setCommentInput] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'audit'>('queue');
  const [filterRoute, setFilterRoute] = useState<'all' | 'legal' | 'manager'>('all');

  const selectedSub = submissions.find((s) => s.id === selectedSubmissionId);

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

  const filteredSubmissions = submissions.filter((sub) => {
    if (filterRoute === 'legal') return sub.routeTo === 'legal_reviewer';
    if (filterRoute === 'manager') return sub.routeTo === 'marketing_manager';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Kicker Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Risk-Based Workflow Routing</span>
              <span aria-hidden="true">·</span>
              <span>Human Oversight &amp; Sign-Off</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">Slide 3, 6 &amp; 8 Standards</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Review &amp; Governance Queue
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Routine copy routes to Marketing Managers; superlative and legal compliance claims automatically dispatch to Brand &amp; Legal Reviewers.
            </p>
          </div>

          {/* Subtabs: Queue vs Audit Log */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab('queue')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'queue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Approval Queue ({submissions.length})
            </button>
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Audit Trail ({auditLogs.length})
            </button>
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
              {filteredSubmissions.map((sub) => {
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
              })}
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

                  <div className="text-right">
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

                  {/* Add Comment Input */}
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
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Request Revisions
                  </button>
                  <button
                    onClick={() => handleReviewAction('reject')}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReviewAction('approve')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
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
      ) : (
        /* Audit Trail View (Slide 8: Security & Audit Log) */
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900">Immutable Brand Governance Audit Trail</h3>
              <p className="text-slate-500">Complete record of drafts, AI checks, dismissals, and approvals</p>
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
