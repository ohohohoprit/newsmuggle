# Repository Audit Report — `nextjs_tailwind_shadcn_ts` v0.2.0

> Generated: 2026-07-15
> Mode: READ-ONLY — no files were modified

---

## 1. Project Structure

| Backend Module | Path | Status |
|---|---|---|
| Auth | `src/lib/auth.ts`, `src/lib/auth-validation.ts` | ✅ |
| RBAC | `src/lib/rbac.ts` | ✅ |
| Workspace | `src/lib/workspace.ts`, `src/lib/workspace-bootstrap.ts`, `src/lib/workspace-types.ts`, `src/lib/workspace-validation.ts` | ✅ |
| Onboarding | `src/lib/onboarding.ts` | ✅ |
| AI / LLM | `src/lib/ai/` (6 providers + service + router + metrics + errors + types) | ✅ |
| Billing | `src/lib/billing/` (11 files + 3 providers) | ✅ |
| Tools | `src/lib/tools/` (5 files) | ✅ |
| Studio (Social) | `src/lib/studio/` (13 files + 4 providers) | ✅ |
| Notifications | `src/lib/notifications/` (7 files) | ✅ |
| Exports | `src/lib/exports/` (3 files) | ✅ |
| Files | `src/lib/files/` (6 files) | ✅ |
| Security | `src/lib/security/` (7 files) | ✅ |
| Jobs (Scheduler) | `src/lib/jobs/` (3 files) | ✅ |
| Monitoring | `src/lib/monitoring/` (6 files) | ✅ |
| Cache | `src/lib/cache/` (1 file) | ✅ |

All 15 backend modules exist.

---

## 2. API Routes

**Total route files: 95** (all in `src/app/api/`)

| Category | Count | Files |
|---|---|---|
| Root | 1 | `api/route.ts` |
| Auth | 9 | register, login, logout, me, google, google/callback, redirect, otp/send, otp/verify |
| Workspaces | 11 | workspaces, active, [id], [id]/switch, [id]/leave, [id]/members, [id]/members/[memberId], [id]/members/[memberId]/role, [id]/invite, invites/[token], invites/[token]/accept |
| Billing | 10 | plans, checkout, status, usage, upgrade, downgrade, cancel, invoices, webhook/stripe, webhook/razorpay |
| Tools | 6 | tools, categories, [slug], [slug]/run, [slug]/history, [slug]/examples |
| Studio | 9 | accounts, accounts/[provider], connect/[provider], connect/[provider]/callback, disconnect/[provider], content, metrics, snapshots, sync/[provider] |
| Notifications | 5 | notifications, [id]/read, read-all, preferences, unread-count |
| Exports | 9 | exports, [id], pdf, docx, md, zip, from-tool, from-studio, `_handler.ts` |
| Files | 5 | files, [id], [id]/download, [id]/delete, [id]/signed-url |
| Admin | 23 | tools, tools/[slug], tools/seed, ai/providers, ai/usage, billing/seed, jobs, jobs/[id], jobs/run, jobs/reset-quotas, jobs/sync-studio, jobs/check-studio-staleness, jobs/check-thresholds, cache/clear, cache/invalidate, incident/create, incident/resolve, incidents, services/status, security/flags, security/unflag, security-events, audit |
| Other | 7 | generate, health, metrics, onboarding/status, onboarding/update, onboarding/complete, profile/completion, ready |

**Status: ✅ All expected routes present. No missing or incomplete route files.**

---

## 3. Prisma

| Metric | Value |
|---|---|
| Models | 56 (User through SignedUrlToken) |
| Broken relations | None — all 56 model references resolve |
| Soft foreign keys (no `@relation`) | 17 fields (intentional, no FK enforcement) |
| Migrations directory | ❌ **Missing** — `prisma/migrations/` does not exist |
| Client generated | ❌ Never run (`prisma generate` required) |

---

## 4. Services

| Service | Status | Notes |
|---|---|---|
| `auth.ts` | ✅ Full | register, login, session, audit |
| `auth-validation.ts` | ✅ Full | |
| `workspace.ts` + bootstrap + validation + types | ✅ Full | |
| `rbac.ts` | ✅ Full | requireAuth, requireAdmin, plan checks |
| `ai/service.ts` | ✅ Full | generate with retries, streaming scaffold |
| `ai/router.ts` | ✅ Full | 4-level resolution cascade |
| `ai/providers/*` | ✅ Full | All 6 providers implemented |
| `billing/*` (11 files) | ✅ Full | |
| `tools/*` (5 files) | ✅ Full | engine, registry, seed, validation |
| `studio/accounts.ts` | ✅ Full | 302 lines |
| `studio/sync.ts` | ✅ Full | 506 lines |
| `studio/metrics.ts` | ✅ Full | 441 lines |
| `studio/entitlements.ts` | ✅ Full | |
| `studio/providers/facebook.ts` | ❌ Stub | No API calls, throws "Not implemented" |
| `studio/providers/tiktok.ts` | ❌ Stub | No API calls, throws "Not implemented" |
| `notifications/service.ts` | ✅ Full | |
| `notifications/delivery.ts` | ✅ Full | Multi-channel (397 lines) |
| `notifications/events.ts` | ✅ Full | |
| `exports/service.ts` | ✅ Full | |
| `exports/generators.ts` | 🟡 Partial | DOCX falls back to plain text (missing `docx` package) |
| `files/*` (6 files) | ✅ Full | |
| `files/storage.ts` | 🟡 Partial | S3 is a stub ("not implemented") |
| `jobs/*` (3 files) | ✅ Full | |
| `cache/service.ts` | ✅ Full | |
| `monitoring/*` (6 files) | ✅ Full | |
| `security/*` (7 files) | ✅ Full | |

---

## 5. Middleware

| Component | File | Status | Notes |
|---|---|---|---|
| Security middleware | `src/lib/security/middleware.ts` | ✅ Full | Route handler guard (230 lines) |
| Rate limiting | `src/lib/security/rate-limit.ts` | ✅ Full | Token bucket algorithm (in-memory) |
| Abuse detection | `src/lib/security/abuse.ts` | ✅ Full | (337 lines) |
| **Root middleware (Edge)** | `src/middleware.ts` | ❌ **Missing** | No Edge-level request filtering |

Security middleware is applied per-route-handler rather than as Next.js Edge middleware.

---

## 6. AI Layer

**Provider abstraction:** ✅ Well-designed — `BaseAIProvider` → 6 concrete providers

| Provider | File | Status |
|---|---|---|
| ZAI (z-ai-web-dev-sdk) | `zai.ts` | ✅ Full (always available, default) |
| OpenAI | `openai.ts` | ✅ Full (REST API) |
| Claude (Anthropic) | `claude.ts` | ✅ Full (REST API) |
| Gemini (Google) | `gemini.ts` | ✅ Full (REST API) |
| Grok (xAI) | `grok.ts` | ✅ Full (extends OpenAI) |
| DeepSeek | `deepseek.ts` | ✅ Full (extends OpenAI) |

**Router:** 4-level resolution (request → tool → env → fallback) ✅
**Service:** Retry with exponential backoff + jitter ✅
**Streaming:** `generateStream()` designed but not wired into tool engine 🟡

---

## 7. Billing

| Component | File | Status | Notes |
|---|---|---|---|
| Plans | `billing/plans.ts` | ✅ Full | |
| Subscriptions | `billing/subscription.ts` | 🟡 Bug | `trialEnd` always evaluates to `null` |
| Checkout | `billing/checkout.ts` | ✅ Full | |
| Webhooks | `billing/webhooks.ts` | ✅ Full | |
| Invoices | `billing/invoices.ts` | ✅ Full | |
| Quota | `billing/quota.ts` | ✅ Full | |
| Status | `billing/status.ts` | ✅ Full | |
| Stripe provider | `providers/stripe.ts` | 🟡 Partial | Falls back to manual if `stripe` package missing |
| Razorpay provider | `providers/razorpay.ts` | ✅ Full | |
| Manual provider | `providers/manual.ts` | ✅ Full | |

---

## 8. Studio (Social Integrations)

| Platform | File | Lines | Status |
|---|---|---|---|
| YouTube | `providers/youtube.ts` | 425 | ✅ Full — YouTube Data API v3 |
| Instagram | `providers/instagram.ts` | 427 | ✅ Full — Graph API |
| Facebook | `providers/facebook.ts` | 67 | ❌ **Stub** — throws "Not implemented" |
| TikTok | `providers/tiktok.ts` | 65 | ❌ **Stub** — throws "Not implemented" |

---

## 9. Notifications & Jobs

| Component | Status |
|---|---|
| Notification service (CRUD, dedup, routing) | ✅ Full |
| Delivery (in_app, email, webhook) | ✅ Full |
| Event mapping | ✅ Full |
| Preferences | ✅ Full |
| Job scheduler (7 job types) | ✅ Full |
| Job runner (idempotency, cursor tracking) | ✅ Full |

**Job types:** quota_reset, usage_snapshot, threshold_check, stale_check, studio_sync, notification_cleanup, retry_failed

---

## 10. Exports & Files

| Component | Status | Notes |
|---|---|---|
| Export service | ✅ Full | (451 lines) |
| Export generators | 🟡 Partial | DOCX uses `require('docx')` with try/catch fallback to text |
| Export cleanup | ✅ Full | |
| File service | ✅ Full | CRUD, signed URLs, download tracking |
| File storage (local) | ✅ Full | |
| File storage (S3) | ❌ Stub | Throws "not implemented" |
| File validation | ✅ Full | |
| File entitlements | ✅ Full | |

**Supported formats:** PDF, DOCX (fallback), Markdown, ZIP, JSON, CSV

---

## 11. Code Quality

### Broken Imports / Missing Files

| Issue | Location | Severity |
|---|---|---|
| `node_modules` not installed | Root | ⚠️ Blocks build |
| `prisma/migrations/` missing | `prisma/` | ⚠️ DB never migrated |
| `next-env.d.ts` missing | Root | 🟡 Auto-generated, non-blocking |
| `src/middleware.ts` missing | Root | 🟡 No Edge-level request filtering |

### Missing Packages (try/catch fallbacks)

| Package | Used In | Impact |
|---|---|---|
| `stripe` | `billing/providers/stripe.ts:269` | Stripe billing silently falls back to manual |
| `docx` | `exports/generators.ts:146` | DOCX export generates plain text instead |

### Logic Bugs

| File | Line | Issue |
|---|---|---|
| `src/lib/billing/subscription.ts` | 247 | `trialEnd` uses `addMonths(now, 0)` — always `null`. `opts.trialDays` branch unreachable. |

### TypeScript Configuration Issues

| Config | Value | Concern |
|---|---|---|
| `typescript.ignoreBuildErrors` | `true` | ❌ Hides all TS errors during build |
| `noImplicitAny` | `false` | Contradicts `strict: true` |
| `reactStrictMode` | `false` | Disables React strict mode |

---

## 12. Environment Variables

**Currently set in `.env`:**
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

**Required but not set:**

| Variable | Used In |
|---|---|
| `NEXTAUTH_SECRET` | Auth (next-auth) |
| `NEXTAUTH_URL` | Auth (next-auth) |

**Required per feature (if enabled):**

| Variable | Feature |
|---|---|
| `ZAI_API_KEY` | AI (ZAI provider) |
| `OPENAI_API_KEY` | AI (OpenAI) |
| `ANTHROPIC_API_KEY` | AI (Claude) |
| `GEMINI_API_KEY` | AI (Gemini) |
| `XAI_API_KEY` | AI (Grok) |
| `DEEPSEEK_API_KEY` | AI (DeepSeek) |
| `AI_DEFAULT_PROVIDER` | AI router (optional) |
| `AI_DEFAULT_MODEL` | AI router (optional) |
| `GOOGLE_CLIENT_ID` | Auth (Google OAuth) |
| `GOOGLE_CLIENT_SECRET` | Auth (Google OAuth) |
| `STRIPE_SECRET_KEY` | Billing (Stripe) |
| `STRIPE_PUBLISHABLE_KEY` | Billing (Stripe) |
| `STRIPE_WEBHOOK_SECRET` | Billing (Stripe) |
| `RAZORPAY_KEY_ID` | Billing (Razorpay) |
| `RAZORPAY_KEY_SECRET` | Billing (Razorpay) |
| `RAZORPAY_WEBHOOK_SECRET` | Billing (Razorpay) |

**Optional:** `OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`, `GEMINI_BASE_URL`, `XAI_BASE_URL`, `DEEPSEEK_BASE_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`

---

## Summary

### ✅ Fully Implemented (21)

- Auth system (register, login, OAuth, OTP, sessions)
- RBAC (role/plan-based access control)
- Workspace management (CRUD, members, invites, roles)
- Onboarding flow
- Tools engine + registry + seed (95 tools)
- AI provider abstraction (base class + 6 providers)
- AI router (4-level resolution)
- AI service (retries, backoff, streaming scaffold)
- Billing plans + checkout + invoices + quota + status
- Razorpay billing provider
- Manual billing provider
- YouTube studio provider
- Instagram studio provider
- Notification service (CRUD, dedup, multi-channel delivery)
- Job scheduler (7 job types with runner)
- Cache service (in-memory + DB persistence)
- Health check system
- Incident management
- Audit logging
- Abuse detection + blocking
- Rate limiting (token bucket)

### 🟡 Partially Implemented (7)

- **Stripe billing provider** — falls back to manual if `stripe` npm package not installed
- **DOCX export** — falls back to plain text if `docx` npm package not installed
- **S3 file storage** — stub, "not implemented"
- **Facebook studio provider** — stub, "not implemented"
- **TikTok studio provider** — stub, "not implemented"
- **Billing subscription `trialEnd`** — logic bug (always evaluates to `null`)
- **Streaming** — `generateStream` designed but not wired into tool engine

### ❌ Missing (4)

- **Prisma migrations** — `prisma/migrations/` directory does not exist
- **Root middleware** — `src/middleware.ts` does not exist (no Edge-level filtering)
- **Facebook & TikTok integrations** — providers are stubs with no real API calls
- **Environment configuration** — only `DATABASE_URL` set; all other env vars missing

### ⚠️ Issues That Must Be Fixed Before Running

1. **`node_modules` not installed** — run `bun install` or `npm install`
2. **Prisma not generated or migrated** — run `npx prisma generate` then `npx prisma migrate dev --name init`
3. **`typescript.ignoreBuildErrors: true`** — hides all TypeScript errors; set to `false` before production
4. **Only `DATABASE_URL` in `.env`** — `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are required for auth; all API keys are needed per-provider
5. **Billing `trialEnd` bug** — `addMonths(now, 0)` should be `addDays(now, opts.trialDays)` in `src/lib/billing/subscription.ts:247`
6. **`noImplicitAny: false` contradicts `strict: true`** — fix tsconfig for proper type safety
7. **Missing `stripe` and `docx` npm packages** — add to `dependencies` or remove fallback code
8. **`DATABASE_URL` points to `/home/z/my-project/db/custom.db`** — this path will not exist on the target machine; update to a valid local path
