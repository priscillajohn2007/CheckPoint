import { ApprovedFact, BrandRule, ContentSubmission, AuditLogEntry, Finding } from '../types';

export interface AnalysisResponse {
  originalContent: string;
  sanitizedContent: string;
  redactionApplied: boolean;
  maskedItemsCount: number;
  maskedTerms: { term: string; replacement: string }[];
  findings: Finding[];
  routeTo: 'marketing_manager' | 'legal_reviewer' | 'auto_approved';
  routingReason: string;
  groundingFactsCount: number;
  analyzedAt: string;
}

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async resetDemo() {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    return res.json();
  },

  async getFacts(): Promise<ApprovedFact[]> {
    const res = await fetch('/api/facts');
    return res.json();
  },

  async addFact(fact: Partial<ApprovedFact>): Promise<ApprovedFact> {
    const res = await fetch('/api/facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fact),
    });
    return res.json();
  },

  async deleteFact(id: string) {
    const res = await fetch(`/api/facts/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getRules(): Promise<BrandRule[]> {
    const res = await fetch('/api/rules');
    return res.json();
  },

  async rewriteRule(ruleId: string, customInstruction?: string) {
    const res = await fetch('/api/rules/rewrite-with-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId, customInstruction }),
    });
    return res.json();
  },

  async approveRuleRewrite(ruleId: string, newDescription: string, newTitle?: string) {
    const res = await fetch(`/api/rules/${ruleId}/approve-rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDescription, newTitle }),
    });
    return res.json();
  },

  async analyzeDraft(content: string, channel: string, goal: string, privacyRedaction: boolean): Promise<AnalysisResponse> {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, channel, goal, privacyRedaction }),
    });
    return res.json();
  },

  async getSubmissions(): Promise<ContentSubmission[]> {
    const res = await fetch('/api/submissions');
    return res.json();
  },

  async createSubmission(payload: Partial<ContentSubmission>): Promise<ContentSubmission> {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async reviewSubmission(
    id: string,
    action: 'approve' | 'reject' | 'request_revision',
    comment: string,
    author: string,
    role: string
  ): Promise<ContentSubmission> {
    const res = await fetch(`/api/submissions/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment, author, role }),
    });
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch('/api/audit-logs');
    return res.json();
  },

  async checkContrast(fgColor: string, bgColor: string) {
    const res = await fetch('/api/wcag-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fgColor, bgColor }),
    });
    return res.json();
  },
};
