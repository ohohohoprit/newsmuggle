/**
 * Environment variable validation — reports missing required vars on startup.
 *
 * Modules that access process.env should import the relevant getter from
 * here rather than reading process.env directly. This centralises defaults
 * and makes the env contract explicit.
 *
 * In development, missing required vars are logged to the console once at
 * import time. In production, no startup logging occurs — errors surface
 * naturally when a feature is used.
 */

const missing: string[] = []
const warned = new Set<string>()

function warnOnce(msg: string): void {
  if (warned.has(msg)) return
  warned.add(msg)
  console.warn(`[env] ${msg}`)
}

function required(name: string, value: string | undefined): void {
  if (!value) missing.push(name)
}

function optional(name: string, value: string | undefined, defaultValue: string): string {
  if (value) return value
  return defaultValue
}

// ── Database ────────────────────────────────────────────────────────────────
required('DATABASE_URL', process.env.DATABASE_URL)

// ── Auth ────────────────────────────────────────────────────────────────────
optional('NEXTAUTH_URL', process.env.NEXTAUTH_URL, 'http://localhost:3000')
optional('AUTH_URL', process.env.AUTH_URL, 'http://localhost:3000')
optional('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID, '')
optional('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET, '')

// ── AI Providers (all optional — Gemini is the default) ─────────────────────
optional('ZAI_API_KEY', process.env.ZAI_API_KEY, '')
optional('AI_DEFAULT_PROVIDER', process.env.AI_DEFAULT_PROVIDER, 'gemini')
optional('AI_DEFAULT_MODEL', process.env.AI_DEFAULT_MODEL, '')
optional('OPENAI_API_KEY', process.env.OPENAI_API_KEY, '')
optional('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY, '')
optional('GEMINI_API_KEY', process.env.GEMINI_API_KEY, '')
optional('XAI_API_KEY', process.env.XAI_API_KEY, '')
optional('DEEPSEEK_API_KEY', process.env.DEEPSEEK_API_KEY, '')

// ── Billing (all optional — defaults to none/manual) ────────────────────────
optional('BILLING_PROVIDER', process.env.BILLING_PROVIDER, 'none')

// ── File Storage (all optional — defaults to local) ─────────────────────────
optional('STORAGE_PROVIDER', process.env.STORAGE_PROVIDER, 'local')
optional('LOCAL_STORAGE_PATH', process.env.LOCAL_STORAGE_PATH, './storage')
optional('SIGNED_URL_SECRET', process.env.SIGNED_URL_SECRET, 'change-me')

// ── Logging (all optional) ──────────────────────────────────────────────────
optional('LOG_LEVEL', process.env.LOG_LEVEL, 'info')

// ── Report ──────────────────────────────────────────────────────────────────
if (missing.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      `[env] FATAL: Missing required environment variables:\n  ${missing.join('\n  ')}`
    )
  } else {
    warnOnce(
      `Missing required environment variables. Some features may not work:\n  ${missing.join('\n  ')}`
    )
  }
}

export function getMissingEnvVars(): string[] {
  return [...missing]
}

export function isEnvValid(): boolean {
  return missing.length === 0
}
