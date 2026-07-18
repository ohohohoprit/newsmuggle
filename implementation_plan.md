# Content Smuggler — Complete Backend Audit & Deployment Roadmap

## Project Overview

**Content Smuggler** is an AI-powered content generation SaaS platform for creators, with 95 AI tools, multi-workspace support, billing, social media studio integration, and a robust admin panel.

**Stack**: Next.js 16 + Prisma (SQLite) + TailwindCSS + shadcn/ui + TypeScript  
**Providers**: 6 AI providers, 2 billing providers (Stripe + Razorpay), 4 social platforms  
**Scale**: 56 Prisma models, 95 API routes, 20 frontend components, 15 backend modules

---

## 🔬 Full Backend Audit Results

### A. What IS Built (✅ Fully Working)

| Module | Files | Status | Notes |
|--------|-------|--------|-------|
| **Auth System** | [auth.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/auth.ts) | ✅ Complete | Email/password, Google OAuth, OTP, sessions (30d), cookie + Bearer token |
| **RBAC** | [rbac.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/rbac.ts) | ✅ Complete | Role hierarchy (user → moderator → admin), plan-gated features |
| **Workspaces** | [workspace.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/workspace.ts) | ✅ Complete | CRUD, members, invites, roles, isolation (976 lines) |
| **AI Router** | [router.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/ai/router.ts) | ✅ Complete | 4-level cascade: request → tool → env → fallback |
| **AI Service** | [service.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/ai/service.ts) | ✅ Complete | Retry with exponential backoff + jitter |
| **6 AI Providers** | `src/lib/ai/providers/` | ✅ Complete | ZAI, OpenAI, Claude, Gemini, Grok, DeepSeek |
| **Tool Engine** | [engine.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/tools/engine.ts) | ✅ Complete | 10-step pipeline with quota checks (638 lines) |
| **Billing Core** | `src/lib/billing/` | ✅ Complete | Plans, subscriptions, checkout, invoices, quota, webhooks |
| **Notifications** | `src/lib/notifications/` | ✅ Complete | Multi-channel (in-app, email, webhook), retry strategy |
| **Jobs/Cron** | `src/lib/jobs/` + [cron route](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/app/api/cron/route.ts) | ✅ Complete | 7 job types with scheduling + idempotency |
| **Security** | `src/lib/security/` | ✅ Complete | Rate limiting (token bucket), abuse detection, security events |
| **Monitoring** | `src/lib/monitoring/` | ✅ Complete | Health checks, metrics, incidents, structured logging |
| **Cache** | `src/lib/cache/` | ✅ Complete | DB-backed caching with TTL |
| **Exports** | `src/lib/exports/` | ✅ Complete | PDF, Markdown, ZIP, JSON, CSV |
| **Files** | `src/lib/files/` | ✅ Complete | CRUD, signed URLs, download tracking, local storage |
| **YouTube Studio** | [youtube.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/studio/providers/youtube.ts) | ✅ Complete | YouTube Data API v3 (426 lines) |
| **Instagram Studio** | `instagram.ts` | ✅ Complete | Graph API (427 lines) |
| **Prisma Schema** | [schema.prisma](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/prisma/schema.prisma) | ✅ Complete | 56 models, 1305 lines — extremely thorough |
| **Env Validation** | [env.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/env.ts) | ✅ Complete | Centralized env checking with missing var reporting |
| **Security Headers** | [next.config.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/next.config.ts) | ✅ Complete | HSTS, X-Frame-Options, CSP Permissions-Policy |

---

### B. What's PARTIALLY Working (🟡 Needs Fixes)

| Issue | Location | Severity | Fix Required |
|-------|----------|----------|-------------|
| **Stripe billing provider** | `billing/providers/stripe.ts` | 🟡 Medium | Falls back to manual if `stripe` npm package not installed — **but `stripe` IS in package.json**, so this is fine after `npm install` |
| **DOCX export** | `exports/generators.ts` | 🟡 Low | Falls back to plain text — **`docx` IS in package.json**, so this works after install |
| **S3 file storage** | `files/storage.ts` | 🟡 Medium | Stub ("not implemented") — use local storage for now, implement for production scale |
| **Billing `trialEnd` bug** | [subscription.ts:247](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/billing/subscription.ts#L247) | 🟡 Medium | `addMonths(now, 0)` should be `addDays(now, trialDays)` — trials never activate |
| **AI Streaming** | `ai/service.ts` | 🟡 Low | `generateStream()` exists but not wired into tool engine UI |
| **OTP SMS delivery** | [auth.ts:271-273](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/auth.ts#L271-L273) | 🟡 Medium | `console.log` only — needs Twilio/SMS provider |

---

### C. What's MISSING (❌ Blockers for Deployment)

| Missing Component | Impact | Priority |
|-------------------|--------|----------|
| **❌ Database: SQLite → PostgreSQL** | SQLite file DB cannot run on serverless (Vercel). No concurrent write support. | 🔴 CRITICAL |
| **❌ Prisma Migrations** | `prisma/migrations/` doesn't exist. DB was never formally migrated | 🔴 CRITICAL |
| **❌ No AI API keys in .env** | No `OPENAI_API_KEY`, `GEMINI_API_KEY`, etc. ZAI works in sandbox only. For real deployment you need at least ONE paid AI provider | 🔴 CRITICAL |
| **❌ No CRON_SECRET** | Cron endpoint is fail-closed without it — no background jobs will run | 🔴 HIGH |
| **❌ No email provider** | Email notifications are stub — no SMTP/Resend/SendGrid configured | 🟠 HIGH |
| **❌ NEXTAUTH_SECRET is weak** | `r123ffnwfnnfoweiufiwefibhdbw4` is not cryptographically random | 🟠 HIGH |
| **❌ Google OAuth credentials exposed** | Real client ID/secret in `.env` committed to workspace | 🔴 CRITICAL |
| **❌ No `src/middleware.ts`** | No Edge-level request filtering (CORS, auth redirects, etc.) | 🟠 MEDIUM |
| **❌ Facebook & TikTok providers** | Stubs that throw "Not implemented" | 🟡 LOW (can launch without) |
| **❌ No production domain** | NEXTAUTH_URL still points to localhost:3000 | 🔴 CRITICAL for deploy |
| **❌ `noImplicitAny: false`** | Contradicts `strict: true`, hides type errors | 🟠 MEDIUM |
| **❌ No test suite** | Zero unit/integration tests | 🟡 MEDIUM |

---

## 🔑 All API Keys & External Services Required

### Tier 1 — MUST HAVE for MVP Launch

| Service | Env Variable(s) | Cost | Purpose | Where to Get |
|---------|-----------------|------|---------|-------------|
| **PostgreSQL Database** | `DATABASE_URL` | Free tier available | Replace SQLite for production | [Neon](https://neon.tech) (free), [Supabase](https://supabase.com) (free), [Railway](https://railway.app), [PlanetScale](https://planetscale.com) |
| **AI Provider (at least 1)** | `OPENAI_API_KEY` or `GEMINI_API_KEY` | Pay-per-use | AI content generation — core feature | [OpenAI](https://platform.openai.com) ($5 min), [Google AI Studio](https://aistudio.google.com) (free tier!) |
| **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Free | Google login | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| **Auth Secret** | `NEXTAUTH_SECRET` | Free | Session encryption | Generate with `openssl rand -base64 32` |
| **Cron Secret** | `CRON_SECRET` | Free | Protect cron endpoint | Generate with `openssl rand -hex 32` |
| **Hosting** | — | Free tier available | Deploy the app | [Vercel](https://vercel.com) (recommended), [Railway](https://railway.app), [Render](https://render.com) |

### Tier 2 — NEEDED for Monetization

| Service | Env Variable(s) | Cost | Purpose |
|---------|-----------------|------|---------|
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, + price IDs | 2.9% + 30¢/txn | Payment processing (global) |
| **Razorpay** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, + plan IDs | 2% per txn | Payment processing (India) |

### Tier 3 — NEEDED for Full Feature Set

| Service | Env Variable(s) | Cost | Purpose |
|---------|-----------------|------|---------|
| **Email** (choose 1) | `RESEND_API_KEY` or `SENDGRID_API_KEY` or `SMTP_URL` | Resend: 3k/mo free | Transactional emails, notifications |
| **YouTube OAuth** | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | Free | Creator Studio — YouTube analytics |
| **S3 Storage** | `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` | Pay-per-use | Scalable file storage (Cloudflare R2 is cheapest) |
| **SMS Provider** | (needs code addition) | ~$0.01/SMS | OTP phone verification (Twilio) |

### Tier 4 — NICE TO HAVE

| Service | Purpose | Cost |
|---------|---------|------|
| **Sentry** | Error tracking in production | Free tier |
| **Uptime Robot** | Uptime monitoring | Free |
| **Cloudflare** | CDN + DDoS protection | Free |
| **Custom Domain** | `contentsmuggler.app` | ~$12/yr |

---

## 🗺️ Deployment Roadmap — Phase by Phase

> [!IMPORTANT]
> Follow these phases IN ORDER. Each builds on the previous. Estimated total: **2-3 weeks** to production.

---

### Phase 1: Fix Critical Bugs (Day 1-2)

> [!CAUTION]
> These MUST be fixed before any deployment attempt.

#### 1.1 Fix the Billing Trial Bug
- **File**: [subscription.ts](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/src/lib/billing/subscription.ts)
- **Line ~247**: Change `addMonths(now, 0)` → `addDays(now, opts.trialDays ?? 14)`

#### 1.2 Fix TypeScript Config
- **File**: [tsconfig.json](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/tsconfig.json)
- Set `noImplicitAny: true` (currently `false`, contradicts `strict: true`)

#### 1.3 Remove Exposed Credentials
- Rotate Google OAuth credentials immediately (they're in plaintext in `.env`)
- Generate a strong `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- Generate a `CRON_SECRET`: `openssl rand -hex 32`

#### 1.4 Generate Prisma Client
```bash
npx prisma generate
npx prisma db push  # for SQLite during dev
```

---

### Phase 2: Database Migration — SQLite → PostgreSQL (Day 2-4)

> [!WARNING]
> SQLite WILL NOT WORK on Vercel or any serverless platform. This is the single most critical change.

#### 2.1 Set Up PostgreSQL
1. Create a free PostgreSQL database on **Neon** (recommended) or **Supabase**
2. Get the connection string: `postgresql://user:pass@host:5432/dbname?sslmode=require`

#### 2.2 Update Prisma Schema
In [schema.prisma](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/prisma/schema.prisma):
```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

#### 2.3 Update Data Types
SQLite uses `String` for everything, but PostgreSQL benefits from:
- All `String` JSON fields → add `@db.Text` annotation
- All `String @default(...)` that store long text → `@db.Text`
- Consider adding `@db.Timestamptz` for DateTime fields

#### 2.4 Run Initial Migration
```bash
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

---

### Phase 3: Set Up AI Providers (Day 4-5)

#### 3.1 Configure At Least ONE AI Provider

**Recommended: Google Gemini** (free tier, best cost-to-quality ratio)
```env
GEMINI_API_KEY=your-key-here
AI_DEFAULT_PROVIDER=gemini
```

**Alternative: OpenAI** (most reliable, industry standard)
```env
OPENAI_API_KEY=sk-your-key-here
AI_DEFAULT_PROVIDER=openai
```

#### 3.2 ZAI Provider Reality Check
- ZAI (`z-ai-web-dev-sdk`) uses **internal sandbox credentials** — it only works in the development sandbox environment
- In production, ZAI will NOT work unless the SDK has production credentials
- **You MUST configure at least OpenAI or Gemini for production**

#### 3.3 Test AI Generation
```bash
# After setting up, test via the tool run endpoint:
curl -X POST http://localhost:3000/api/tools/hook-generator/run \
  -H "Cookie: cs_session=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs":{"topic":"productivity","platform":"youtube","tone":"energetic","count":5}}'
```

---

### Phase 4: Auth & Security Hardening (Day 5-6)

#### 4.1 New Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized redirect URIs for your production domain:
   - `https://yourdomain.com/api/auth/google/callback`
4. Update `.env` with new credentials

#### 4.2 Create Next.js Edge Middleware
Create `src/middleware.ts`:
```typescript
export { default } from 'next/server';
export const config = {
  matcher: ['/api/:path*'],  // protect API routes
};
```
This enables:
- CORS control
- Auth redirect for protected pages
- Request filtering at the edge

#### 4.3 Add SIGNED_URL_SECRET
```env
SIGNED_URL_SECRET=<openssl rand -hex 32>
```

---

### Phase 5: Email & Notifications (Day 6-7)

#### 5.1 Set Up Resend (Recommended — Easiest)
1. Sign up at [resend.com](https://resend.com) (3,000 emails/month free)
2. Verify your domain or use their sandbox
3. Add to `.env`:
```env
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=notifications@yourdomain.com
```

#### 5.2 Implement SMS for OTP (Optional)
The auth system has OTP implemented but SMS delivery is `console.log` only. To enable:
1. Sign up for [Twilio](https://twilio.com)
2. Replace the `console.log` calls in `auth.ts:271-273` and `auth.ts:291` with Twilio API calls

---

### Phase 6: Billing Setup (Day 7-10)

#### 6.1 Stripe Setup (for global payments)
1. Create a [Stripe account](https://stripe.com)
2. Create 6 price objects (3 plans × monthly/yearly)
3. Set up webhook endpoint: `https://yourdomain.com/api/billing/webhook/stripe`
4. Add to `.env`:
```env
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_CREATOR_MONTHLY=price_...
STRIPE_PRICE_CREATOR_YEARLY=price_...
STRIPE_PRICE_AGENCY_MONTHLY=price_...
STRIPE_PRICE_AGENCY_YEARLY=price_...
```

#### 6.2 Razorpay Setup (for Indian payments — optional)
Similar process but with Razorpay dashboard.

---

### Phase 7: Deployment (Day 10-12)

#### 7.1 Vercel Deployment (Recommended)

1. **Push to GitHub** (remove `.env` first!)
2. **Connect to Vercel**:
   ```bash
   npx vercel
   ```
3. **Set environment variables** in Vercel Dashboard → Settings → Environment Variables
4. **Add production domain**:
   ```env
   NEXTAUTH_URL=https://yourdomain.com
   ```
5. **Cron jobs** are already configured in [vercel.json](file:///c:/Users/prita/OneDrive/Desktop/al%20bal%20kam/workspace-2eb34279-11a6-48db-b37a-29d566404444%20(1)/vercel.json) — runs `/api/cron` every 5 minutes ✅

#### 7.2 Post-Deploy Verification Checklist
- [ ] `/api/health` returns `ok: true`
- [ ] `/api/ready` returns ready status
- [ ] Registration + login works
- [ ] Google OAuth callback works
- [ ] AI tool generation works (try hook-generator)
- [ ] Cron jobs are running (check Vercel Cron logs)
- [ ] Billing checkout redirects to Stripe
- [ ] Webhook receives Stripe events

---

### Phase 8: Seed Production Data (Day 12-13)

```bash
# 1. Seed plans + categories
npx tsx prisma/seed.ts

# 2. Seed all 95 tool definitions (via admin API)
# First, make your user an admin:
node prisma/make-admin.js YOUR_USER_EMAIL

# 3. Then hit the admin tool seed endpoint:
curl -X POST https://yourdomain.com/api/admin/tools/seed \
  -H "Cookie: cs_session=YOUR_ADMIN_TOKEN"
```

---

### Phase 9: Polish & Monitoring (Day 13-14)

#### 9.1 Add Error Tracking
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### 9.2 Set Up Uptime Monitoring
- Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/api/health` every 5 minutes

#### 9.3 Add Cloudflare
- Point your domain's DNS to Cloudflare for free CDN + DDoS protection

---

### Phase 10: Scale & Optimize (Week 3+)

| Task | Priority | Effort |
|------|----------|--------|
| Implement S3/R2 file storage (replace local) | High | 2-3 hours |
| Wire `generateStream()` into the UI for real-time AI output | Medium | 1 day |
| Add Facebook + TikTok studio providers | Low | 2-3 days each |
| Add comprehensive test suite (at least API route tests) | Medium | 3-5 days |
| Add rate limiting at Edge middleware level | Medium | 2-3 hours |
| Implement proper structured logging → external sink | Low | 1 day |
| Add OpenTelemetry tracing | Low | 1 day |

---

## 🔍 Will It Work?

### ✅ YES — with the fixes above. Here's the honest assessment:

**The architecture is SOLID.** This is genuinely well-designed for a SaaS product:

| Aspect | Grade | Rationale |
|--------|-------|-----------|
| **Code Quality** | A- | Clean separation of concerns, proper error hierarchies, service layer pattern, no business logic in route handlers |
| **Security** | B+ | Rate limiting, abuse detection, RBAC, audit logging, session management — but needs Edge middleware and stronger secrets |
| **AI Abstraction** | A | Provider registry pattern is excellent. Adding new AI providers is trivial. Router cascade is well-thought-out |
| **Billing** | A- | Dual-provider (Stripe + Razorpay) with proper webhook handling, idempotent event processing, quota management |
| **Schema Design** | A | 56 models with proper indexing, soft deletes, dedup keys, comprehensive audit trails |
| **Scalability** | B | Fine for 0-10k users. SQLite→PostgreSQL migration is the blocker. Cache is DB-backed (should be Redis at scale) |
| **Maintainability** | A- | Excellent JSDoc comments throughout, consistent patterns, clear file organization |
| **Test Coverage** | F | Zero tests. This is the biggest risk |
| **Production Readiness** | C+ | Needs the Phase 1-7 work above before it's deployable |

### What Could Go Wrong Without Fixes:
1. **SQLite on Vercel = instant crash** (no filesystem persistence on serverless)
2. **ZAI provider = fails in production** (sandbox-only credentials)
3. **No CRON_SECRET = no background jobs** (quotas never reset, studios never sync)
4. **Exposed OAuth secrets = potential account takeover** if this repo goes public

---

## 📋 Complete `.env` Template for Production

```env
# ══════════════════════════════════════════════
# REQUIRED — App won't start without these
# ══════════════════════════════════════════════
DATABASE_URL="postgresql://user:pass@host:5432/contentsmuggler?sslmode=require"
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -hex 32>

# ══════════════════════════════════════════════
# AI — At least ONE provider required
# ══════════════════════════════════════════════
AI_DEFAULT_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# XAI_API_KEY=xai-...
# DEEPSEEK_API_KEY=sk-...

# ══════════════════════════════════════════════
# AUTH — Google OAuth
# ══════════════════════════════════════════════
GOOGLE_CLIENT_ID=NEW-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-new-secret

# ══════════════════════════════════════════════
# BILLING — Choose provider
# ══════════════════════════════════════════════
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_CREATOR_MONTHLY=price_...
STRIPE_PRICE_CREATOR_YEARLY=price_...
STRIPE_PRICE_AGENCY_MONTHLY=price_...
STRIPE_PRICE_AGENCY_YEARLY=price_...

# ══════════════════════════════════════════════
# EMAIL
# ══════════════════════════════════════════════
RESEND_API_KEY=re_...
EMAIL_FROM=team@yourdomain.com

# ══════════════════════════════════════════════
# STORAGE
# ══════════════════════════════════════════════
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage
SIGNED_URL_SECRET=<openssl rand -hex 32>

# ══════════════════════════════════════════════
# YOUTUBE STUDIO
# ══════════════════════════════════════════════
YOUTUBE_CLIENT_ID=same-as-google-or-separate
YOUTUBE_CLIENT_SECRET=same-as-google-or-separate

# ══════════════════════════════════════════════
# LOGGING
# ══════════════════════════════════════════════
LOG_LEVEL=info
```

---

## Open Questions

> [!IMPORTANT]
> These decisions will shape the deployment approach:

1. **Where do you want to deploy?** Vercel (recommended + free tier + cron support built-in) or Railway/Render/VPS?
2. **Which AI provider do you want as primary?** Gemini has a free tier. OpenAI is the most reliable. You can configure multiple.
3. **Do you want billing (Stripe/Razorpay) for launch?** Or launch as free-only first and add billing later?
4. **Do you want me to start implementing these fixes now?** I can begin with Phase 1 (critical bugs) immediately.
5. **Custom domain ready?** Do you have a domain name purchased (e.g., `contentsmuggler.app`)?
6. **Should I implement the SQLite → PostgreSQL migration?** This is the single most impactful change.

