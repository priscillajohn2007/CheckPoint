export type Role = 'creator' | 'manager' | 'legal' | 'brand_owner' | 'admin';

export type FindingCategory = 
  | 'claim' 
  | 'outdated_fact' 
  | 'terminology' 
  | 'tone' 
  | 'accessibility' 
  | 'privacy';

export type Severity = 'high' | 'medium' | 'low';

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  matchedText: string;
  issue: string;
  reason: string;
  ruleCode: string;
  ruleName: string;
  sourceDoc?: string;
  sourceExpiry?: string;
  suggestedFix: string;
  confidence: number; // 0-100
  status: 'pending' | 'accepted' | 'dismissed' | 'manual_edit';
  dismissReason?: string;
  requiresLegalApproval: boolean;
}

export interface ApprovedFact {
  id: string;
  statement: string;
  category: 'claims' | 'operations' | 'pricing' | 'compliance' | 'esg';
  sourceDoc: string;
  sourceSection?: string;
  effectiveDate: string;
  expiryDate: string;
  isExpired: boolean;
  status: 'active' | 'expired' | 'under_review';
  verifiedBy: string;
  notes?: string;
}

export interface BrandRule {
  id: string;
  code: string;
  title: string;
  category: 'claims' | 'terminology' | 'tone' | 'visual' | 'privacy';
  severity: Severity;
  description: string;
  forbiddenExamples: string[];
  preferredAlternatives: string[];
  requiresLegal: boolean;
  // Clarity Heatmap metrics
  heatmap: {
    confusionScore: number; // 0 - 100
    peopleAffected: number;
    dismissalRate: number; // percentage
    reviewerDisagreements: number;
    repeatFlagsCount: number;
    trend: 'rising' | 'stable' | 'declining';
  };
  originalWording?: string;
  aiSuggestedRewrite?: string;
  rewriteReason?: string;
  isRewritten?: boolean;
}

export interface ContentSubmission {
  id: string;
  title: string;
  channel: 'social' | 'email' | 'ad_campaign' | 'press_release' | 'blog';
  goal: string;
  content: string;
  originalDraft: string;
  author: string;
  authorRole: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'analyzed' | 'pending_manager' | 'pending_legal' | 'approved' | 'rejected' | 'published';
  findings: Finding[];
  routeTo: 'marketing_manager' | 'legal_reviewer' | 'auto_approved';
  routingReason: string;
  reviewComments: {
    id: string;
    author: string;
    role: Role;
    comment: string;
    timestamp: string;
  }[];
  redactionApplied: boolean;
  maskedItemsCount: number;
  wcagContrast?: {
    fgColor: string;
    bgColor: string;
    ratio: number;
    passesAA: boolean;
    passesAAA: boolean;
  };
  altText?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'draft_submitted' | 'ai_analyzed' | 'finding_accepted' | 'finding_dismissed' | 'routed_to_legal' | 'reviewed' | 'approved' | 'rejected' | 'rule_updated';
  actorName: string;
  actorRole: Role;
  details: string;
  submissionId?: string;
  ruleCode?: string;
}
