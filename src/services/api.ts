import type { 
  ApprovedFact, 
  BrandRule, 
  ContentSubmission, 
  AuditLogEntry, 
  Finding, 
  RuleVersion, 
  SlackNotification, 
  BrandHealthMetrics, 
  LogoCheckResult,
  BrandKitConfig,
  HallmarkRecord,
  HallmarkVerifyResult,
  ExpiryNotice,
  ImportedRuleDraft,
} from '../types';

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
  confidentialBlockedAI?: boolean;
}

export interface MultimodalAnalysisResponse {
  fileName: string;
  mimeType: string;
  pageCount: number;
  isSlideDeck: boolean;
  extractedText: string;
  sanitizedContent: string;
  maskedItemsCount: number;
  detectedBrand?: string;
  visualSummary?: string;
  dominantColors?: string[];
  contrastAssessment?: string;
  logoAssessment?: string;
  findings: Finding[];
  routeTo: 'marketing_manager' | 'legal_reviewer' | 'auto_approved';
  routingReason: string;
  analyzedAt: string;
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return handleJsonResponse<{ status: string; timestamp: string; hasGeminiKey: boolean }>(res);
  },

  async resetDemo() {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    return handleJsonResponse<{ success: boolean; message: string }>(res);
  },

  async clearData() {
    const res = await fetch('/api/clear-data', { method: 'POST' });
    return handleJsonResponse<{ success: boolean; message: string }>(res);
  },

  async getFacts(): Promise<ApprovedFact[]> {
    const res = await fetch('/api/facts');
    return handleJsonResponse<ApprovedFact[]>(res);
  },

  async addFact(fact: Partial<ApprovedFact>): Promise<ApprovedFact> {
    const res = await fetch('/api/facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fact),
    });
    return handleJsonResponse<ApprovedFact>(res);
  },

  async deleteFact(id: string) {
    const res = await fetch(`/api/facts/${id}`, { method: 'DELETE' });
    return handleJsonResponse<{ success: boolean }>(res);
  },

  async getRules(): Promise<BrandRule[]> {
    const res = await fetch('/api/rules');
    return handleJsonResponse<BrandRule[]>(res);
  },

  async addRule(rule: Partial<BrandRule>): Promise<BrandRule> {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    return handleJsonResponse<BrandRule>(res);
  },

  async rewriteRule(ruleId: string, customInstruction?: string) {
    const res = await fetch('/api/rules/rewrite-with-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId, customInstruction }),
    });
    return handleJsonResponse<{
      ruleId: string;
      originalDescription: string;
      improvedTitle: string;
      improvedDescription: string;
      rationale: string;
    }>(res);
  },

  async approveRuleRewrite(ruleId: string, newDescription: string, newTitle?: string, author?: string, changeSummary?: string) {
    const res = await fetch(`/api/rules/${ruleId}/approve-rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDescription, newTitle, author, changeSummary }),
    });
    return handleJsonResponse<{ success: boolean; updatedRule: BrandRule }>(res);
  },

  async getRuleVersions(ruleId: string): Promise<RuleVersion[]> {
    const res = await fetch(`/api/rules/${ruleId}/versions`);
    return handleJsonResponse<RuleVersion[]>(res);
  },

  async rollbackRule(ruleId: string, targetVersion: string, author?: string) {
    const res = await fetch(`/api/rules/${ruleId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetVersion, author }),
    });
    return handleJsonResponse<{ success: boolean; updatedRule: BrandRule }>(res);
  },

  async analyzeDraft(
    content: string,
    channel: string,
    goal: string,
    privacyRedaction: boolean,
    brandName?: string,
    isDemoMode?: boolean
  ): Promise<AnalysisResponse> {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, channel, goal, privacyRedaction, brandName, isDemoMode }),
    });
    return handleJsonResponse<AnalysisResponse>(res);
  },

  async analyzeMultimodal(payload: {
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
    channel?: string;
    goal?: string;
    brandName?: string;
    customGuidelines?: string;
    privacyRedaction?: boolean;
    samplePreset?: string;
    textContent?: string;
    isDemoMode?: boolean;
  }): Promise<MultimodalAnalysisResponse> {
    const res = await fetch('/api/analyze-multimodal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<MultimodalAnalysisResponse>(res);
  },

  async checkLogo(payload: {
    logoName?: string;
    imageBase64?: string;
    isLegacyRabbit?: boolean;
    clearSpaceRatio?: number;
    displayHeightPx?: number;
    surfaceColor?: string;
  }): Promise<LogoCheckResult> {
    const res = await fetch('/api/logo-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<LogoCheckResult>(res);
  },

  async getSubmissions(): Promise<ContentSubmission[]> {
    const res = await fetch('/api/submissions');
    return handleJsonResponse<ContentSubmission[]>(res);
  },

  async createSubmission(payload: Partial<ContentSubmission>): Promise<ContentSubmission> {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<ContentSubmission>(res);
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
    return handleJsonResponse<ContentSubmission>(res);
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch('/api/audit-logs');
    return handleJsonResponse<AuditLogEntry[]>(res);
  },

  async checkContrast(fgColor: string, bgColor: string) {
    const res = await fetch('/api/wcag-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fgColor, bgColor }),
    });
    return handleJsonResponse<{
      fgColor: string;
      bgColor: string;
      ratio: number;
      passesAA: boolean;
      passesAAA: boolean;
      passesLargeAA: boolean;
      interpretation: string;
    }>(res);
  },

  async getBrandHealth(): Promise<BrandHealthMetrics> {
    const res = await fetch('/api/brand-health');
    return handleJsonResponse<BrandHealthMetrics>(res);
  },

  async getSlackNotifications(): Promise<SlackNotification[]> {
    const res = await fetch('/api/webhooks/slack/notifications');
    return handleJsonResponse<SlackNotification[]>(res);
  },

  async dispatchSlackNotification(submissionId: string, channel?: string, dispatchedBy?: string) {
    const res = await fetch('/api/webhooks/slack/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, channel, dispatchedBy }),
    });
    return handleJsonResponse<{ success: boolean; notification: SlackNotification }>(res);
  },

  async respondSlackNotification(notificationId: string, action: 'approved' | 'rejected' | 'revision_requested', respondedBy?: string) {
    const res = await fetch('/api/webhooks/slack/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, action, respondedBy }),
    });
    return handleJsonResponse<{ success: boolean; notification: SlackNotification; updatedSubmission: ContentSubmission }>(res);
  },

  async getBrandKit(): Promise<BrandKitConfig> {
    const res = await fetch('/api/brand-kit');
    return handleJsonResponse<BrandKitConfig>(res);
  },

  async updateBrandKit(payload: Partial<BrandKitConfig>): Promise<BrandKitConfig> {
    const res = await fetch('/api/brand-kit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse<BrandKitConfig>(res);
  },

  async getImportedRules(): Promise<ImportedRuleDraft[]> {
    const res = await fetch('/api/brand-kit/imported');
    return handleJsonResponse<ImportedRuleDraft[]>(res);
  },

  async importBrandBook(text: string, fileName: string): Promise<ImportedRuleDraft[]> {
    const res = await fetch('/api/brand-kit/import-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, fileName }),
    });
    return handleJsonResponse<ImportedRuleDraft[]>(res);
  },

  async decideImportedRule(id: string, decision: 'approve' | 'reject'): Promise<{ success: boolean; item: ImportedRuleDraft; createdRule?: BrandRule }> {
    const res = await fetch(`/api/brand-kit/imported/${id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    return handleJsonResponse<{ success: boolean; item: ImportedRuleDraft; createdRule?: BrandRule }>(res);
  },

  async getHallmarks(): Promise<HallmarkRecord[]> {
    const res = await fetch('/api/hallmarks');
    return handleJsonResponse<HallmarkRecord[]>(res);
  },

  async verifyHallmarks(): Promise<{
    total: number;
    brokenCount: number;
    allVerified: boolean;
    results: HallmarkVerifyResult[];
  }> {
    const res = await fetch('/api/hallmarks/verify', { method: 'POST' });
    return handleJsonResponse(res);
  },

  async simulateTamperHallmark(id: string): Promise<HallmarkRecord> {
    const res = await fetch(`/api/hallmarks/${id}/simulate-tamper`, { method: 'POST' });
    return handleJsonResponse<HallmarkRecord>(res);
  },

  async restoreHallmark(id: string): Promise<HallmarkRecord> {
    const res = await fetch(`/api/hallmarks/${id}/restore`, { method: 'POST' });
    return handleJsonResponse<HallmarkRecord>(res);
  },

  async getExpiryInbox(): Promise<ExpiryNotice[]> {
    const res = await fetch('/api/expiry-inbox');
    return handleJsonResponse<ExpiryNotice[]>(res);
  },

  async markExpiryRead(factId: string): Promise<{ success: boolean; notices: ExpiryNotice[] }> {
    const res = await fetch(`/api/expiry-inbox/${factId}/read`, { method: 'POST' });
    return handleJsonResponse(res);
  },

  async markAllExpiryRead(): Promise<{ success: boolean; notices: ExpiryNotice[] }> {
    const res = await fetch('/api/expiry-inbox/read-all', { method: 'POST' });
    return handleJsonResponse(res);
  },

  async sendExpiryAlert(factId: string, email?: string): Promise<{ success: boolean; sentTo: string; sentAt: string; notices: ExpiryNotice[] }> {
    const res = await fetch(`/api/expiry-inbox/${factId}/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleJsonResponse(res);
  },

  async exportWorkspace(): Promise<Record<string, unknown>> {
    const res = await fetch('/api/workspace/export');
    return handleJsonResponse<Record<string, unknown>>(res);
  },

  async importWorkspace(payload: Record<string, unknown>): Promise<{ success: boolean; counts: { facts: number; rules: number; submissions: number; hallmarks: number } }> {
    const res = await fetch('/api/workspace/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJsonResponse(res);
  },
};
