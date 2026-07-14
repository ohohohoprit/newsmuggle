/**
 * Job types + schedule configuration.
 */
export type JobType =
  | 'quota_reset'
  | 'usage_snapshot'
  | 'threshold_check'
  | 'stale_check'
  | 'studio_sync'
  | 'notification_cleanup'
  | 'retry_failed'
  | 'delivery_retry';

export const ALL_JOB_TYPES: JobType[] = [
  'quota_reset',
  'usage_snapshot',
  'threshold_check',
  'stale_check',
  'studio_sync',
  'notification_cleanup',
  'retry_failed',
  'delivery_retry',
];

export type JobStatus = 'running' | 'completed' | 'failed' | 'partial';

export interface JobScheduleConfig {
  jobType: JobType;
  /** How often to run: 'daily' | 'hourly' | 'monthly' */
  frequency: 'daily' | 'hourly' | 'monthly';
  /** Human-readable description */
  description: string;
  /** Whether the job is enabled */
  enabled: boolean;
}

export const JOB_SCHEDULES: JobScheduleConfig[] = [
  {
    jobType: 'quota_reset',
    frequency: 'monthly',
    description: 'Reset monthly generation quotas for all workspaces at the start of each month',
    enabled: true,
  },
  {
    jobType: 'usage_snapshot',
    frequency: 'daily',
    description: 'Create daily usage snapshots for all workspaces with active subscriptions',
    enabled: true,
  },
  {
    jobType: 'threshold_check',
    frequency: 'hourly',
    description: 'Check usage thresholds (80%, 90%, 100%) and send notifications',
    enabled: true,
  },
  {
    jobType: 'stale_check',
    frequency: 'daily',
    description: 'Mark studio accounts as stale if not synced in 24h + notify owners',
    enabled: true,
  },
  {
    jobType: 'studio_sync',
    frequency: 'hourly',
    description: 'Trigger incremental sync for connected accounts that need it',
    enabled: true,
  },
  {
    jobType: 'notification_cleanup',
    frequency: 'daily',
    description: 'Delete old read notifications older than 30 days',
    enabled: true,
  },
  {
    jobType: 'retry_failed',
    frequency: 'hourly',
    description: 'Retry failed notification deliveries (up to 3 attempts)',
    enabled: true,
  },
  {
    jobType: 'delivery_retry',
    frequency: 'hourly',
    description: 'Retry pending notification deliveries with nextAttemptAt <= now',
    enabled: true,
  },
];

export interface JobResult {
  jobRunId: string;
  jobType: JobType;
  status: JobStatus;
  processed: number;
  created: number;
  failed: number;
  skipped: number;
  durationMs: number;
  errorMessage: string | null;
  result: Record<string, unknown>;
}

export interface JobRunDTO {
  id: string;
  jobType: JobType;
  status: JobStatus;
  triggeredBy: 'system' | 'user' | 'cron';
  userId: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  errorMessage: string | null;
  result: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
