-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "username" TEXT,
    "passwordHash" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'English',
    "creatorCategory" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "planRenewsAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER NOT NULL DEFAULT 10,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "activeWorkspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'personal',
    "ownerId" TEXT NOT NULL,
    "avatar" TEXT,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invites" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "tokenType" TEXT,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "maxResends" INTEGER NOT NULL DEFAULT 3,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT,
    "avatar" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "subscribers" INTEGER NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSync" TIMESTAMP(3),
    "health" TEXT NOT NULL DEFAULT 'good',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#C09858',
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "score" INTEGER,
    "summary" TEXT,
    "metrics" TEXT,
    "tags" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#C09858',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" INTEGER NOT NULL DEFAULT 0,
    "priceYearly" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "maxGenerations" INTEGER NOT NULL DEFAULT 10,
    "maxTools" INTEGER NOT NULL DEFAULT 5,
    "maxStorage" INTEGER NOT NULL DEFAULT 1,
    "teamSeats" INTEGER NOT NULL DEFAULT 0,
    "apiAccess" BOOLEAN NOT NULL DEFAULT false,
    "whiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdYearly" TEXT,
    "razorpayPlanIdMonthly" TEXT,
    "razorpayPlanIdYearly" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "provider" TEXT,
    "providerSubscriptionId" TEXT,
    "providerCustomerId" TEXT,
    "providerStatus" TEXT,
    "providerMetadata" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "providerEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "payload" TEXT NOT NULL,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "subscriptionId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'open',
    "invoiceNo" TEXT,
    "description" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "provider" TEXT,
    "providerInvoiceId" TEXT,
    "providerPaymentId" TEXT,
    "hostedInvoiceUrl" TEXT,
    "invoicePdfUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_snapshots" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "planSlug" TEXT NOT NULL,
    "generationsUsed" INTEGER NOT NULL DEFAULT 0,
    "generationsLimit" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storageUsedMb" INTEGER NOT NULL DEFAULT 0,
    "teamSeatsUsed" INTEGER NOT NULL DEFAULT 0,
    "snapshotData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_sync_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quota_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" TEXT,
    "dedupKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minPriority" TEXT NOT NULL DEFAULT 'low',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recipient" TEXT,
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "payload" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "notificationId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_definitions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "icon" TEXT,
    "agentTip" TEXT,
    "outputFormat" TEXT NOT NULL DEFAULT 'items',
    "outputLabel" TEXT NOT NULL DEFAULT 'Your Generated Results',
    "outputItemNoun" TEXT NOT NULL DEFAULT 'result',
    "analysisTitle" TEXT NOT NULL DEFAULT 'Why these results work?',
    "inputSchema" TEXT NOT NULL,
    "outputSchema" TEXT,
    "promptTemplate" TEXT NOT NULL,
    "modelConfig" TEXT NOT NULL DEFAULT '{"provider":"zai","model":"default","temperature":0.8}',
    "defaultCount" INTEGER NOT NULL DEFAULT 5,
    "countOptions" TEXT NOT NULL DEFAULT '[1,3,5,10,15,20]',
    "minPlan" TEXT NOT NULL DEFAULT 'starter',
    "usageLimit" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "examples" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_presets" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputs" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_executions" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "outputFormat" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "summary" TEXT,
    "metrics" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "modelConfig" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "tokenUsage" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_usage_quotas" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "toolId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_usage_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_accounts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "avatar" TEXT,
    "description" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'personal',
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalPosts" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenScope" TEXT,
    "connectedById" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncCursor" TEXT,
    "providerMetadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_content_items" (
    "id" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "providerContentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "contentUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tags" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_metric_snapshots" (
    "id" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalPosts" INTEGER NOT NULL DEFAULT 0,
    "newFollowers" INTEGER NOT NULL DEFAULT 0,
    "newViews" INTEGER NOT NULL DEFAULT 0,
    "newPosts" INTEGER NOT NULL DEFAULT 0,
    "avgEngagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedReach" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_audience_snapshots" (
    "id" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "ageRange" TEXT,
    "gender" TEXT,
    "country" TEXT,
    "city" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_audience_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_sync_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectedAccountId" TEXT,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggeredBy" TEXT NOT NULL,
    "userId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_failure_logs" (
    "id" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "syncJobId" TEXT,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorCode" TEXT,
    "statusCode" INTEGER,
    "payload" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_failure_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggeredBy" TEXT NOT NULL DEFAULT 'system',
    "userId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "result" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_cursors" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastRunDate" TEXT,
    "lastCursor" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_failure_logs" (
    "id" TEXT NOT NULL,
    "jobRunId" TEXT,
    "jobType" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorCode" TEXT,
    "statusCode" INTEGER,
    "payload" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_failure_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_threshold_alerts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "percentUsed" DOUBLE PRECISION NOT NULL,
    "used" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "planSlug" TEXT NOT NULL,
    "alertKey" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "usage_threshold_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "workspaceId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "ip" TEXT,
    "userAgent" TEXT,
    "path" TEXT,
    "method" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "payload" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tokens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxTokens" INTEGER NOT NULL DEFAULT 100,
    "refillRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "lastRefillAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "blockCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_entries" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "ttlSeconds" INTEGER NOT NULL DEFAULT 60,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cache_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check_logs" (
    "id" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "sum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p50" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p95" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p99" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "status" TEXT NOT NULL DEFAULT 'open',
    "serviceName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "affectedUsers" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdById" TEXT,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_query_logs" (
    "id" TEXT NOT NULL,
    "queriedById" TEXT NOT NULL,
    "queryFilters" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abuse_detection_flags" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "workspaceId" TEXT,
    "ip" TEXT,
    "flagType" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "evidence" TEXT,
    "autoBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedUntil" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abuse_detection_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "category" TEXT NOT NULL DEFAULT 'general',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "metadata" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fileAssetId" TEXT,
    "templateId" TEXT,
    "options" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_downloads" (
    "id" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedUrlTokenId" TEXT,
    "downloadMethod" TEXT NOT NULL DEFAULT 'direct',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_access_logs" (
    "id" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_failure_logs" (
    "id" TEXT NOT NULL,
    "exportJobId" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorCode" TEXT,
    "payload" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_failure_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signed_url_tokens" (
    "id" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "downloadLimit" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signed_url_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");

-- CreateIndex
CREATE INDEX "workspaces_type_idx" ON "workspaces"("type");

-- CreateIndex
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_token_key" ON "workspace_invites"("token");

-- CreateIndex
CREATE INDEX "workspace_invites_workspaceId_idx" ON "workspace_invites"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_invites_email_idx" ON "workspace_invites"("email");

-- CreateIndex
CREATE INDEX "workspace_invites_token_idx" ON "workspace_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "otp_challenges_identifier_idx" ON "otp_challenges"("identifier");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_userId_platform_key" ON "social_accounts"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_workspaceId_key" ON "subscriptions"("workspaceId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_provider_idx" ON "subscriptions"("provider");

-- CreateIndex
CREATE INDEX "billing_events_workspaceId_idx" ON "billing_events"("workspaceId");

-- CreateIndex
CREATE INDEX "billing_events_type_idx" ON "billing_events"("type");

-- CreateIndex
CREATE INDEX "billing_events_status_idx" ON "billing_events"("status");

-- CreateIndex
CREATE INDEX "billing_events_createdAt_idx" ON "billing_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_provider_providerEventId_key" ON "billing_events"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "invoices_workspaceId_idx" ON "invoices"("workspaceId");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_provider_idx" ON "invoices"("provider");

-- CreateIndex
CREATE INDEX "usage_snapshots_workspaceId_periodStart_idx" ON "usage_snapshots"("workspaceId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "usage_snapshots_workspaceId_periodStart_key" ON "usage_snapshots"("workspaceId", "periodStart");

-- CreateIndex
CREATE INDEX "quota_sync_jobs_workspaceId_status_idx" ON "quota_sync_jobs"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "quota_sync_jobs_type_status_idx" ON "quota_sync_jobs"("type", "status");

-- CreateIndex
CREATE INDEX "quota_sync_jobs_scheduledFor_idx" ON "quota_sync_jobs"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_workspaceId_createdAt_idx" ON "notifications"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_category_createdAt_idx" ON "notifications"("category", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_dedupKey_idx" ON "notifications"("dedupKey");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_category_key" ON "notification_preferences"("userId", "category");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_nextAttemptAt_idx" ON "notification_deliveries"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_channel_status_idx" ON "notification_deliveries"("channel", "status");

-- CreateIndex
CREATE INDEX "notification_events_workspaceId_createdAt_idx" ON "notification_events"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_events_eventType_createdAt_idx" ON "notification_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "notification_events_source_createdAt_idx" ON "notification_events"("source", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tool_categories_slug_key" ON "tool_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tool_definitions_slug_key" ON "tool_definitions"("slug");

-- CreateIndex
CREATE INDEX "tool_definitions_categoryId_idx" ON "tool_definitions"("categoryId");

-- CreateIndex
CREATE INDEX "tool_definitions_isEnabled_idx" ON "tool_definitions"("isEnabled");

-- CreateIndex
CREATE INDEX "tool_definitions_slug_idx" ON "tool_definitions"("slug");

-- CreateIndex
CREATE INDEX "tool_presets_toolId_idx" ON "tool_presets"("toolId");

-- CreateIndex
CREATE INDEX "tool_presets_createdBy_idx" ON "tool_presets"("createdBy");

-- CreateIndex
CREATE INDEX "tool_executions_toolId_idx" ON "tool_executions"("toolId");

-- CreateIndex
CREATE INDEX "tool_executions_userId_idx" ON "tool_executions"("userId");

-- CreateIndex
CREATE INDEX "tool_executions_workspaceId_idx" ON "tool_executions"("workspaceId");

-- CreateIndex
CREATE INDEX "tool_executions_createdAt_idx" ON "tool_executions"("createdAt");

-- CreateIndex
CREATE INDEX "tool_executions_status_idx" ON "tool_executions"("status");

-- CreateIndex
CREATE INDEX "tool_executions_provider_idx" ON "tool_executions"("provider");

-- CreateIndex
CREATE INDEX "tool_usage_quotas_workspaceId_periodStart_idx" ON "tool_usage_quotas"("workspaceId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "tool_usage_quotas_workspaceId_toolId_periodStart_key" ON "tool_usage_quotas"("workspaceId", "toolId", "periodStart");

-- CreateIndex
CREATE INDEX "connected_accounts_workspaceId_provider_idx" ON "connected_accounts"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "connected_accounts_syncStatus_idx" ON "connected_accounts"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_workspaceId_provider_providerAccountId_key" ON "connected_accounts"("workspaceId", "provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "social_content_items_connectedAccountId_publishedAt_idx" ON "social_content_items"("connectedAccountId", "publishedAt");

-- CreateIndex
CREATE INDEX "social_content_items_connectedAccountId_type_idx" ON "social_content_items"("connectedAccountId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "social_content_items_connectedAccountId_providerContentId_key" ON "social_content_items"("connectedAccountId", "providerContentId");

-- CreateIndex
CREATE INDEX "social_metric_snapshots_connectedAccountId_snapshotDate_idx" ON "social_metric_snapshots"("connectedAccountId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "social_metric_snapshots_connectedAccountId_snapshotDate_key" ON "social_metric_snapshots"("connectedAccountId", "snapshotDate");

-- CreateIndex
CREATE INDEX "social_audience_snapshots_connectedAccountId_snapshotDate_idx" ON "social_audience_snapshots"("connectedAccountId", "snapshotDate");

-- CreateIndex
CREATE INDEX "social_audience_snapshots_connectedAccountId_country_idx" ON "social_audience_snapshots"("connectedAccountId", "country");

-- CreateIndex
CREATE INDEX "studio_sync_jobs_workspaceId_status_idx" ON "studio_sync_jobs"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "studio_sync_jobs_provider_status_idx" ON "studio_sync_jobs"("provider", "status");

-- CreateIndex
CREATE INDEX "studio_sync_jobs_type_status_idx" ON "studio_sync_jobs"("type", "status");

-- CreateIndex
CREATE INDEX "studio_sync_jobs_createdAt_idx" ON "studio_sync_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "sync_failure_logs_connectedAccountId_createdAt_idx" ON "sync_failure_logs"("connectedAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "sync_failure_logs_errorType_idx" ON "sync_failure_logs"("errorType");

-- CreateIndex
CREATE INDEX "sync_failure_logs_resolvedAt_idx" ON "sync_failure_logs"("resolvedAt");

-- CreateIndex
CREATE INDEX "job_runs_jobType_status_idx" ON "job_runs"("jobType", "status");

-- CreateIndex
CREATE INDEX "job_runs_jobType_createdAt_idx" ON "job_runs"("jobType", "createdAt");

-- CreateIndex
CREATE INDEX "job_runs_status_createdAt_idx" ON "job_runs"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "job_cursors_jobType_key" ON "job_cursors"("jobType");

-- CreateIndex
CREATE INDEX "job_failure_logs_jobType_resolvedAt_idx" ON "job_failure_logs"("jobType", "resolvedAt");

-- CreateIndex
CREATE INDEX "job_failure_logs_errorType_idx" ON "job_failure_logs"("errorType");

-- CreateIndex
CREATE INDEX "job_failure_logs_createdAt_idx" ON "job_failure_logs"("createdAt");

-- CreateIndex
CREATE INDEX "usage_threshold_alerts_workspaceId_notifiedAt_idx" ON "usage_threshold_alerts"("workspaceId", "notifiedAt");

-- CreateIndex
CREATE INDEX "usage_threshold_alerts_threshold_notifiedAt_idx" ON "usage_threshold_alerts"("threshold", "notifiedAt");

-- CreateIndex
CREATE INDEX "usage_threshold_alerts_resolvedAt_idx" ON "usage_threshold_alerts"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "usage_threshold_alerts_alertKey_key" ON "usage_threshold_alerts"("alertKey");

-- CreateIndex
CREATE INDEX "security_events_userId_createdAt_idx" ON "security_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_workspaceId_createdAt_idx" ON "security_events"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_eventType_createdAt_idx" ON "security_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_severity_createdAt_idx" ON "security_events"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_resolvedAt_idx" ON "security_events"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_buckets_key_key" ON "rate_limit_buckets"("key");

-- CreateIndex
CREATE UNIQUE INDEX "cache_entries_key_key" ON "cache_entries"("key");

-- CreateIndex
CREATE INDEX "cache_entries_expiresAt_idx" ON "cache_entries"("expiresAt");

-- CreateIndex
CREATE INDEX "cache_entries_key_idx" ON "cache_entries"("key");

-- CreateIndex
CREATE INDEX "health_check_logs_checkType_createdAt_idx" ON "health_check_logs"("checkType", "createdAt");

-- CreateIndex
CREATE INDEX "health_check_logs_serviceName_status_createdAt_idx" ON "health_check_logs"("serviceName", "status", "createdAt");

-- CreateIndex
CREATE INDEX "metric_snapshots_metricType_periodStart_idx" ON "metric_snapshots"("metricType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_metricType_period_periodStart_key" ON "metric_snapshots"("metricType", "period", "periodStart");

-- CreateIndex
CREATE INDEX "service_incidents_status_severity_idx" ON "service_incidents"("status", "severity");

-- CreateIndex
CREATE INDEX "service_incidents_serviceName_status_idx" ON "service_incidents"("serviceName", "status");

-- CreateIndex
CREATE INDEX "service_incidents_startedAt_idx" ON "service_incidents"("startedAt");

-- CreateIndex
CREATE INDEX "audit_query_logs_queriedById_createdAt_idx" ON "audit_query_logs"("queriedById", "createdAt");

-- CreateIndex
CREATE INDEX "abuse_detection_flags_userId_resolvedAt_idx" ON "abuse_detection_flags"("userId", "resolvedAt");

-- CreateIndex
CREATE INDEX "abuse_detection_flags_workspaceId_resolvedAt_idx" ON "abuse_detection_flags"("workspaceId", "resolvedAt");

-- CreateIndex
CREATE INDEX "abuse_detection_flags_ip_resolvedAt_idx" ON "abuse_detection_flags"("ip", "resolvedAt");

-- CreateIndex
CREATE INDEX "abuse_detection_flags_flagType_resolvedAt_idx" ON "abuse_detection_flags"("flagType", "resolvedAt");

-- CreateIndex
CREATE INDEX "abuse_detection_flags_riskScore_idx" ON "abuse_detection_flags"("riskScore");

-- CreateIndex
CREATE INDEX "file_assets_workspaceId_createdAt_idx" ON "file_assets"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "file_assets_workspaceId_category_idx" ON "file_assets"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "file_assets_sourceType_sourceId_idx" ON "file_assets"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "file_assets_expiresAt_idx" ON "file_assets"("expiresAt");

-- CreateIndex
CREATE INDEX "file_assets_deletedAt_idx" ON "file_assets"("deletedAt");

-- CreateIndex
CREATE INDEX "export_jobs_workspaceId_status_idx" ON "export_jobs"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "export_jobs_userId_createdAt_idx" ON "export_jobs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_format_status_idx" ON "export_jobs"("format", "status");

-- CreateIndex
CREATE INDEX "export_jobs_sourceType_sourceId_idx" ON "export_jobs"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "export_jobs_createdAt_idx" ON "export_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "export_templates_workspaceId_idx" ON "export_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "export_templates_userId_idx" ON "export_templates"("userId");

-- CreateIndex
CREATE INDEX "export_templates_isPublic_idx" ON "export_templates"("isPublic");

-- CreateIndex
CREATE INDEX "file_downloads_fileAssetId_createdAt_idx" ON "file_downloads"("fileAssetId", "createdAt");

-- CreateIndex
CREATE INDEX "file_downloads_userId_createdAt_idx" ON "file_downloads"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "file_access_logs_fileAssetId_createdAt_idx" ON "file_access_logs"("fileAssetId", "createdAt");

-- CreateIndex
CREATE INDEX "file_access_logs_userId_createdAt_idx" ON "file_access_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "file_access_logs_action_createdAt_idx" ON "file_access_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "export_failure_logs_exportJobId_createdAt_idx" ON "export_failure_logs"("exportJobId", "createdAt");

-- CreateIndex
CREATE INDEX "export_failure_logs_errorType_idx" ON "export_failure_logs"("errorType");

-- CreateIndex
CREATE INDEX "export_failure_logs_resolvedAt_idx" ON "export_failure_logs"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "signed_url_tokens_token_key" ON "signed_url_tokens"("token");

-- CreateIndex
CREATE INDEX "signed_url_tokens_fileAssetId_idx" ON "signed_url_tokens"("fileAssetId");

-- CreateIndex
CREATE INDEX "signed_url_tokens_token_idx" ON "signed_url_tokens"("token");

-- CreateIndex
CREATE INDEX "signed_url_tokens_expiresAt_idx" ON "signed_url_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeWorkspaceId_fkey" FOREIGN KEY ("activeWorkspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_items" ADD CONSTRAINT "generated_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_items" ADD CONSTRAINT "generated_items_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_snapshots" ADD CONSTRAINT "usage_snapshots_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_sync_jobs" ADD CONSTRAINT "quota_sync_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_definitions" ADD CONSTRAINT "tool_definitions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tool_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_presets" ADD CONSTRAINT "tool_presets_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tool_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tool_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_usage_quotas" ADD CONSTRAINT "tool_usage_quotas_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_content_items" ADD CONSTRAINT "social_content_items_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_metric_snapshots" ADD CONSTRAINT "social_metric_snapshots_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_audience_snapshots" ADD CONSTRAINT "social_audience_snapshots_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_sync_jobs" ADD CONSTRAINT "studio_sync_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_sync_jobs" ADD CONSTRAINT "studio_sync_jobs_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_failure_logs" ADD CONSTRAINT "sync_failure_logs_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_threshold_alerts" ADD CONSTRAINT "usage_threshold_alerts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "export_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_downloads" ADD CONSTRAINT "file_downloads_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_access_logs" ADD CONSTRAINT "file_access_logs_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_failure_logs" ADD CONSTRAINT "export_failure_logs_exportJobId_fkey" FOREIGN KEY ("exportJobId") REFERENCES "export_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_url_tokens" ADD CONSTRAINT "signed_url_tokens_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
