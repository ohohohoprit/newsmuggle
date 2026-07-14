/**
 * Auth Service Layer — all business logic for authentication.
 * Route handlers call these functions; they never touch Prisma directly.
 */
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ensurePersonalWorkspace } from '@/lib/workspace-bootstrap';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const OTP_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
const MAX_OTP_RESENDS = 3;
const MAX_OTP_ATTEMPTS = 5;

// ===== Types =====

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: string;
  plan: string;
  onboardingCompleted: boolean;
}

export interface SessionData {
  token: string;
  user: AuthUser;
  expiresAt: Date;
}

// ===== Helpers =====

function toAuthUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
    plan: user.plan,
    onboardingCompleted: user.onboardingCompleted,
  };
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientInfo(req: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : null;
  const userAgent = req.headers.get('user-agent');
  return { ip, userAgent };
}

async function auditLog(action: string, userId: string | null, req: Request, status: string = 'success', meta?: Record<string, unknown>) {
  const { ip, userAgent } = getClientInfo(req);
  await db.auditLog.create({
    data: {
      userId,
      action,
      ip,
      userAgent,
      status,
      meta: meta ? JSON.stringify(meta) : null,
    },
  }).catch(() => {}); // never fail the request because of audit logging
}

export { auditLog };

// ===== Session Management =====

export async function createSession(userId: string, req: Request): Promise<SessionData> {
  const token = generateToken();
  const { ip, userAgent } = getClientInfo(req);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await db.session.create({
    data: {
      userId,
      token,
      device: userAgent?.substring(0, 100),
      ipAddress: ip,
      userAgent,
      expiresAt,
    },
    include: { user: true },
  });

  // Update login tracking
  await db.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      loginCount: { increment: 1 },
    },
  });

  // Ensure the user has a personal workspace (creates one on first login,
  // and sets it as active if they don't have one yet). Safe to call every login.
  await ensurePersonalWorkspace(userId).catch((err) => {
    // Never fail login because of workspace bootstrap
    console.error('[auth] ensurePersonalWorkspace failed:', err);
  });

  return {
    token,
    user: toAuthUser(session.user),
    expiresAt,
  };
}

export async function getSession(token: string | null): Promise<SessionData | null> {
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    token: session.token,
    user: toAuthUser(session.user),
    expiresAt: session.expiresAt,
  };
}

export async function destroySession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } }).catch(() => {});
}

export async function destroyOtherSessions(userId: string, currentToken: string): Promise<void> {
  await db.session.deleteMany({
    where: {
      userId,
      NOT: { token: currentToken },
    },
  }).catch(() => {});
}

// ===== Email + Password Auth =====

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export async function registerWithEmail(input: RegisterInput, req: Request): Promise<SessionData> {
  const { email, password, name } = input;

  // Check if user exists
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await auditLog('register', null, req, 'failed', { email, reason: 'email_exists' });
    throw new AuthError('EMAIL_EXISTS', 'An account with this email already exists.');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await db.user.create({
    data: {
      email,
      name: name || null,
      username: email.split('@')[0] + Math.floor(Math.random() * 1000),
      passwordHash,
    },
  });

  // Create credentials account record
  await db.account.create({
    data: {
      userId: user.id,
      provider: 'credentials',
      providerAccountId: user.id,
    },
  });

  await auditLog('register', user.id, req);
  return createSession(user.id, req);
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function loginWithEmail(input: LoginInput, req: Request): Promise<SessionData> {
  const { email, password } = input;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    await auditLog('login', null, req, 'failed', { email, reason: 'user_not_found' });
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await auditLog('login', user.id, req, 'failed', { reason: 'wrong_password' });
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  await auditLog('login', user.id, req);
  return createSession(user.id, req);
}

// ===== Mobile OTP Auth =====

export interface OtpSendInput {
  phone: string;
}

export async function sendOtp(input: OtpSendInput, req: Request): Promise<{ challengeId: string; expiresAt: Date }> {
  const { phone } = input;

  // Check for existing active challenge (rate limit resends)
  const existing = await db.otpChallenge.findFirst({
    where: {
      identifier: phone,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    if (existing.resendCount >= MAX_OTP_RESENDS) {
      throw new AuthError('OTP_MAX_RESENDS', 'Maximum OTP resends reached. Please try again later.');
    }
    if (Date.now() - existing.updatedAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new AuthError('OTP_COOLDOWN', 'Please wait before requesting another OTP.');
    }

    // Generate new OTP code
    const code = generateOtp();
    const codeHash = await bcrypt.hash(code, 10);

    await db.otpChallenge.update({
      where: { id: existing.id },
      data: {
        codeHash,
        resendCount: { increment: 1 },
        attempts: 0,
        expiresAt: new Date(Date.now() + OTP_DURATION_MS),
        updatedAt: new Date(),
      },
    });

    await auditLog('otp_send', null, req, 'success', { phone, resend: true });
    // TODO: Send OTP via SMS provider (Twilio, etc.)
    // For now, log it in dev
    console.log(`[OTP] ${phone}: ${code}`);
    return { challengeId: existing.id, expiresAt: new Date(Date.now() + OTP_DURATION_MS) };
  }

  // Create new challenge
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);

  const challenge = await db.otpChallenge.create({
    data: {
      identifier: phone,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_DURATION_MS),
    },
  });

  await auditLog('otp_send', null, req, 'success', { phone });
  // TODO: Send OTP via SMS provider
  console.log(`[OTP] ${phone}: ${code}`);
  return { challengeId: challenge.id, expiresAt: challenge.expiresAt };
}

export interface OtpVerifyInput {
  phone: string;
  code: string;
  name?: string;
}

export async function verifyOtp(input: OtpVerifyInput, req: Request): Promise<SessionData> {
  const { phone, code, name } = input;

  const challenge = await db.otpChallenge.findFirst({
    where: {
      identifier: phone,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    throw new AuthError('OTP_EXPIRED', 'OTP has expired. Please request a new one.');
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    await db.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumed: true },
    });
    throw new AuthError('OTP_MAX_ATTEMPTS', 'Maximum verification attempts reached.');
  }

  // Increment attempts
  await db.otpChallenge.update({
    where: { id: challenge.id },
    data: { attempts: { increment: 1 }, updatedAt: new Date() },
  });

  const valid = await bcrypt.compare(code, challenge.codeHash);
  if (!valid) {
    throw new AuthError('OTP_INVALID', 'Invalid OTP code.');
  }

  // Mark challenge as consumed
  await db.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumed: true },
  });

  // Find or create user
  let user = await db.user.findUnique({ where: { phone } });
  if (!user) {
    user = await db.user.create({
      data: {
        phone,
        name: name || null,
        username: 'user_' + phone.slice(-4) + Math.floor(Math.random() * 1000),
      },
    });
    await db.account.create({
      data: {
        userId: user.id,
        provider: 'otp',
        providerAccountId: user.id,
      },
    });
  }

  await auditLog('otp_verify', user.id, req);
  return createSession(user.id, req);
}

// ===== Google OAuth =====

export interface GoogleUserinfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

export async function handleGoogleCallback(userinfo: GoogleUserinfo, req: Request): Promise<SessionData> {
  // Find existing account
  let account = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'google',
        providerAccountId: userinfo.sub,
      },
    },
    include: { user: true },
  });

  let user = account?.user ?? null;

  // If no account, check if user exists by email
  if (!user && userinfo.email) {
    user = await db.user.findUnique({ where: { email: userinfo.email } });
    if (user) {
      // Link Google account to existing user
      await db.account.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerAccountId: userinfo.sub,
        },
      });
    }
  }

  // If still no user, create one
  if (!user) {
    user = await db.user.create({
      data: {
        email: userinfo.email,
        name: userinfo.name,
        avatar: userinfo.picture,
        username: userinfo.email.split('@')[0] + Math.floor(Math.random() * 1000),
      },
    });
    await db.account.create({
      data: {
        userId: user.id,
        provider: 'google',
        providerAccountId: userinfo.sub,
      },
    });
  } else if (account) {
    // Update account tokens if needed
    // (tokens are passed from the route handler)
  }

  await auditLog('google_login', user.id, req);
  return createSession(user.id, req);
}

// ===== Auth Error =====

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

// ===== Cookie Helpers =====

export const SESSION_COOKIE_NAME = 'cs_session';

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  const cookie = `${SESSION_COOKIE_NAME}=${token}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${maxAge}`;
  res.headers.set('Set-Cookie', cookie);
}

export function clearSessionCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookie = `${SESSION_COOKIE_NAME}=; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=0`;
  res.headers.set('Set-Cookie', cookie);
}

export function getTokenFromRequest(req: Request): string | null {
  // Try cookie first
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const c of cookies) {
      const [name, value] = c.split('=');
      if (name === SESSION_COOKIE_NAME && value) return value;
    }
  }
  // Try Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}
