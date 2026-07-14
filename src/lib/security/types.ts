/**
 * Security shared types — used across rate limiting, abuse detection,
 * security events, and API routes.
 */

// ===== Rate limiting =====

export type RateLimitScope = 'ip' | 'user' | 'workspace' | 'route';

export interface RateLimitConfig {
  /** Max tokens in the bucket (burst capacity). */
  maxTokens: number;
  /** Tokens refilled per second. */
  refillRate: number;
  /** Block duration after repeated violations (ms). */
  blockDurationMs: number;
  /** Number of violations before blocking. */
  violationsBeforeBlock: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  retryAfterMs?: number;
  blocked: boolean;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints — strict
  'auth:login': { maxTokens: 5, refillRate: 1 / 60, blockDurationMs: 15 * 60 * 1000, violationsBeforeBlock: 3 },
  'auth:register': { maxTokens: 3, refillRate: 1 / 300, blockDurationMs: 30 * 60 * 1000, violationsBeforeBlock: 2 },
  'auth:otp': { maxTokens: 3, refillRate: 1 / 60, blockDurationMs: 15 * 60 * 1000, violationsBeforeBlock: 3 },
  // Tool execution — moderate
  'tool:run': { maxTokens: 20, refillRate: 1 / 5, blockDurationMs: 5 * 60 * 1000, violationsBeforeBlock: 5 },
  // Billing — moderate
  'billing:checkout': { maxTokens: 10, refillRate: 1 / 30, blockDurationMs: 10 * 60 * 1000, violationsBeforeBlock: 3 },
  // Studio sync — moderate
  'studio:sync': { maxTokens: 10, refillRate: 1 / 30, blockDurationMs: 5 * 60 * 1000, violationsBeforeBlock: 3 },
  // General API — lenient
  'api:general': { maxTokens: 100, refillRate: 2, blockDurationMs: 60 * 1000, violationsBeforeBlock: 5 },
  // Webhooks — very lenient (providers retry)
  'webhook': { maxTokens: 200, refillRate: 10, blockDurationMs: 30 * 1000, violationsBeforeBlock: 10 },
};

// ===== Security events =====

export type SecurityEventType =
  | 'rate_limit_hit'
  | 'abuse_detected'
  | 'suspicious_pattern'
  | 'auth_failure_burst'
  | 'blocked_request'
  | 'permission_denied'
  | 'invalid_input_burst';

export const ALL_SECURITY_EVENT_TYPES: SecurityEventType[] = [
  'rate_limit_hit',
  'abuse_detected',
  'suspicious_pattern',
  'auth_failure_burst',
  'blocked_request',
  'permission_denied',
  'invalid_input_burst',
];

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITY_RANK: Record<SecuritySeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

// ===== Abuse detection =====

export type AbuseFlagType =
  | 'rapid_requests'
  | 'failed_auth_burst'
  | 'excessive_tool_runs'
  | 'quota_abuse'
  | 'suspicious_pattern';

export const ALL_ABUSE_FLAG_TYPES: AbuseFlagType[] = [
  'rapid_requests',
  'failed_auth_burst',
  'excessive_tool_runs',
  'quota_abuse',
  'suspicious_pattern',
];

export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
}

// ===== DTOs =====

export interface SecurityEventDTO {
  id: string;
  userId: string | null;
  workspaceId: string | null;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  ip: string | null;
  path: string | null;
  method: string | null;
  riskScore: number;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AbuseFlagDTO {
  id: string;
  userId: string | null;
  workspaceId: string | null;
  ip: string | null;
  flagType: AbuseFlagType;
  riskScore: number;
  autoBlocked: boolean;
  blockedUntil: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
}
