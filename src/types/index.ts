export type Role = 'creator' | 'manager' | 'legal' | 'brand_owner' | 'admin';

export type FindingCategory =
  | 'claim'
  | 'outdated_fact'
  | 'terminology'
  | 'tone'
  | 'accessibility'
  | 'privacy'
  | 'logo'
  | 'visual';

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
  start?: number;
  end?: number;
  intentVerdict?: 'kept' | 'review' | 'lost';
  intentNote?: string;
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

export interface RuleVersion {
  version: string; // e.g. "v1.0", "v1.1"
  timestamp: string;
  author: string;
  authorRole: string;
  title: string;
  description: string;
  changeSummary: string;
  confusionScoreAtVersion: number;
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
  currentVersion?: string;
  versions?: RuleVersion[];
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
  channel: 'social' | 'email' | 'ad_campaign' | 'press_release' | 'blog' | 'slide_deck';
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
  attachedFile?: {
    name: string;
    type: string;
    size: number;
    extractedTextPreview?: string;
    isSlideDeck?: boolean;
    pageCount?: number;
  };
  logoInspection?: LogoCheckResult;
  hallmarkId?: string;
  hallmarkSeq?: number;
  contentHash?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action:
    | 'draft_submitted'
    | 'ai_analyzed'
    | 'finding_accepted'
    | 'finding_dismissed'
    | 'routed_to_legal'
    | 'reviewed'
    | 'approved'
    | 'rejected'
    | 'rule_updated'
    | 'slack_dispatched'
    | 'rule_rolled_back'
    | 'hallmark_minted'
    | 'workspace_imported';
  actorName: string;
  actorRole: Role;
  details: string;
  submissionId?: string;
  ruleCode?: string;
}

export interface LogoCheckResult {
  passed: boolean;
  isDeprecatedLogo: boolean;
  detectedVersion: 'official_2026_shield' | 'legacy_2023_rabbit' | 'distorted_geometry' | 'unrecognized';
  clearSpaceRatio: number;
  clearSpacePassed: boolean;
  contrastRatio: number;
  contrastPassed: boolean;
  details: string;
  recommendation: string;
}

export interface SlackNotification {
  id: string;
  submissionId: string;
  submissionTitle: string;
  recipientChannel: string;
  dispatchedAt: string;
  status: 'pending' | 'approved' | 'revision_requested' | 'rejected';
  riskLevel: 'high' | 'routine';
  routeTo: 'legal_reviewer' | 'marketing_manager';
  findingsCount: number;
  dispatchedBy: string;
  respondedBy?: string;
  respondedAt?: string;
}

export interface BrandHealthMetrics {
  overallHealthScore: number;
  complianceRate: number;
  activeViolationsCaughtMonth: number;
  avgVelocityHours: number;
  historicalVelocityReduction: number;
  repeatFlagReductionRate: number;
  legalRiskExposureScore: number;
  departmentBreakdowns: {
    department: string;
    submissionsCount: number;
    complianceScore: number;
    topFlaggedRule: string;
  }[];
  monthlyTrends: {
    month: string;
    healthScore: number;
    violationsIntercepted: number;
    avgHoursToApprove: number;
  }[];
}

export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
  role?: string;
}

export interface ChannelLimit {
  channel: ContentSubmission['channel'];
  label: string;
  maxEmoji: number;
  maxExclamation: number;
  maxCapsWords: number;
  readabilityMin: number;
}

export interface BrandKitConfig {
  brandName: string;
  palette: PaletteColor[];
  fonts: {
    heading: string;
    body: string;
  };
  logoMinWidthPx: number;
  logoClearSpaceRatio: number;
  deltaEMax: number;
  channelLimits: ChannelLimit[];
  confidentialMode: boolean;
  ownerEmails: Record<string, string>;
}

export interface ImportedRuleDraft {
  id: string;
  code: string;
  title: string;
  description: string;
  category: BrandRule['category'];
  severity: Severity;
  forbiddenExamples: string[];
  preferredAlternatives: string[];
  sourceName: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface HallmarkRecord {
  id: string;
  seq: number;
  submissionId: string;
  title: string;
  channel: string;
  content: string;
  contentHash: string;
  recordHash: string;
  prevHash: string;
  hash: string;
  rulebookVersion: string;
  findingsSummary: {
    ruleCode: string;
    status: string;
    severity: Severity;
  }[];
  approvals: {
    by: string;
    role: string;
    at: string;
  }[];
  aiModel: string;
  issuedAt: string;
  tampered?: boolean;
}

export interface HallmarkVerifyResult {
  id: string;
  seq: number;
  ok: boolean;
  contentMatches: boolean;
  recordMatches: boolean;
  chainMatches: boolean;
  computedContentHash: string;
  computedRecordHash: string;
  reason?: string;
}

export interface ExpiryNotice {
  id: string;
  factId: string;
  statement: string;
  category: string;
  sourceDoc: string;
  verifiedBy: string;
  ownerEmail?: string;
  expiryDate: string;
  effectiveDate: string;
  daysLeft: number;
  isExpired: boolean;
  thresholdLabel: string;
  read: boolean;
  lastSentAt?: string;
}

export interface JudgeChecklistState {
  checkedDraftOrPoster: boolean;
  resolvedFindingWithIntent: boolean;
  submittedToQueue: boolean;
  approvedAndMintedHallmark: boolean;
  verifiedHallmarkChain: boolean;
  inspectedClarityHeatmap: boolean;
  checkedExpiryOrBrandKit: boolean;
}
