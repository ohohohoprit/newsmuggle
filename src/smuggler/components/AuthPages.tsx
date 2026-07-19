'use client';

import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Check,
  CheckCircle2,
  Phone,
  KeyRound,
  Wrench,
  Users,
  Clock,
  RotateCcw,
  ChevronDown,
  Star,
  Crosshair,
  Building2,
  GraduationCap,
  Briefcase,
  UserCircle,
  Sparkles,
  X,
} from 'lucide-react';

export interface AuthPagesProps {
  initialMode: 'login' | 'signup';
  onClose: () => void;
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const USER_TYPES = [
  { value: 'creator', label: 'Creator', Icon: Sparkles },
  { value: 'marketer', label: 'Marketer', Icon: Briefcase },
  { value: 'entrepreneur', label: 'Entrepreneur', Icon: Building2 },
  { value: 'educator', label: 'Educator', Icon: GraduationCap },
  { value: 'other', label: 'Other', Icon: UserCircle },
] as const;

const COUNTRY_CODES = [
  { code: '+1', label: '🇺🇸 +1 (US)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+91', label: '🇮🇳 +91 (IN)' },
  { code: '+61', label: '🇦🇺 +61 (AU)' },
  { code: '+86', label: '🇨🇳 +86 (CN)' },
  { code: '+49', label: '🇩🇪 +49 (DE)' },
  { code: '+33', label: '🇫🇷 +33 (FR)' },
  { code: '+81', label: '🇯🇵 +81 (JP)' },
  { code: '+65', label: '🇸🇬 +65 (SG)' },
  { code: '+971', label: '🇦🇪 +971 (AE)' },
];

const LEFT_FEATURES = [
  { Icon: Wrench, label: '95+ AI Tools' },
  { Icon: Users, label: '10K+ Creators' },
  { Icon: ShieldCheck, label: '100% Secure' },
] as const;

const CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', staggerChildren: 0.06 },
  },
};

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

function calcPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pw) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (pw.length >= 12) score += 10;
  if (/[a-z]/.test(pw)) score += 15;
  if (/[A-Z]/.test(pw)) score += 20;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 15;
  score = Math.min(100, score);
  if (score < 40) return { score, label: 'Weak', color: 'var(--smuggler-red)' };
  if (score < 60) return { score, label: 'Medium', color: 'var(--smuggler-yellow)' };
  if (score < 85) return { score, label: 'Strong', color: 'var(--smuggler-green)' };
  return { score, label: 'Very Strong', color: 'var(--smuggler-green)' };
}

/* ------------------------------------------------------------------ */
/* Brand icons (inline SVG)                                            */
/* ------------------------------------------------------------------ */

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} aria-hidden="true" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable bits                                                       */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em]"
      style={{ color: 'var(--smuggler-text-secondary)' }}
    >
      {children}
    </label>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-1.5 text-xs font-medium"
      style={{ color: 'var(--smuggler-red)' }}
      role="alert"
    >
      <AlertTriangle size={12} className="flex-shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

function SocialButtons({
  loadingKey,
  onSocial,
}: {
  loadingKey: 'google' | 'facebook' | null;
  onSocial: (provider: 'google' | 'facebook') => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSocial('google')}
        disabled={loadingKey !== null}
        className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
        style={{
          backgroundColor: '#ffffff',
          color: '#1A1A1A',
          borderColor: 'rgba(0,0,0,0.12)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        {loadingKey === 'google' ? (
          <Loader2 size={18} className="animate-spin text-gray-500" />
        ) : (
          <GoogleIcon />
        )}
        <span>Continue with Google</span>
      </motion.button>

      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSocial('facebook')}
        disabled={loadingKey !== null}
        className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
        style={{
          backgroundColor: '#1877F2',
          boxShadow: '0 2px 6px rgba(24,119,242,0.3)',
        }}
      >
        {loadingKey === 'facebook' ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <FacebookIcon />
        )}
        <span>Continue with Facebook</span>
      </motion.button>
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = calcPasswordStrength(password);
  if (!password) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-2 flex items-center gap-2"
    >
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ backgroundColor: color }}
        />
      </div>
      <span
        className="w-20 text-right text-[0.7rem] font-bold uppercase tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
    </motion.div>
  );
}

function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusNext = (i: number) => {
    const next = refs.current[i + 1];
    if (next) next.focus();
  };
  const focusPrev = (i: number) => {
    const prev = refs.current[i - 1];
    if (prev) prev.focus();
  };

  const handleChange = (i: number, raw: string) => {
    const c = raw.replace(/\D/g, '').slice(-1);
    if (!c && raw !== '') return; // ignore non-digits
    const next = chars.slice();
    next[i] = c;
    onChange(next.join('').slice(0, length));
    if (c) focusNext(i);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!chars[i] && i > 0) {
        focusPrev(i);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusPrev(i);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focusNext(i);
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (text) {
      onChange(text);
      const lastIdx = Math.min(text.length, length - 1);
      refs.current[lastIdx]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={c}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="smuggler-input-premium h-12 w-11 rounded-lg text-center text-lg font-bold focus:outline-none"
          style={{ color: 'var(--smuggler-text)' }}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div
        className="h-px flex-1"
        style={{ backgroundColor: 'var(--smuggler-border)' }}
      />
      <span
        className="text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        OR
      </span>
      <div
        className="h-px flex-1"
        style={{ backgroundColor: 'var(--smuggler-border)' }}
      />
    </div>
  );
}

function PremiumInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, style, ...rest } = props;
  return (
    <input
      {...rest}
      className={`smuggler-input-premium h-12 w-full rounded-lg px-4 text-sm focus:outline-none ${className ?? ''}`}
      style={{
        color: 'var(--smuggler-text)',
        ...(style as object),
      }}
    />
  );
}

function PremiumSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, style, children, ...rest } = props;
  return (
    <div className="relative">
      <select
        {...rest}
        className={`smuggler-input-premium h-12 w-full appearance-none rounded-lg px-4 pr-10 text-sm focus:outline-none ${className ?? ''}`}
        style={{
          color: 'var(--smuggler-text)',
          backgroundColor: 'var(--smuggler-bg-panel)',
          ...(style as object),
        }}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--smuggler-text-muted)' }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab selector                                                        */
/* ------------------------------------------------------------------ */

function AuthTabSelector({
  tab,
  setTab,
}: {
  tab: 'email' | 'mobile';
  setTab: (t: 'email' | 'mobile') => void;
}) {
  return (
    <div
      className="relative grid grid-cols-2 rounded-xl p-1"
      style={{
        backgroundColor: 'rgba(0,0,0,0.04)',
        border: '1px solid var(--smuggler-border)',
      }}
    >
      {(['email', 'mobile'] as const).map((t) => {
        const active = tab === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="relative z-10 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={{
              color: active ? 'var(--smuggler-text)' : 'var(--smuggler-text-muted)',
            }}
          >
            {active && (
              <motion.div
                layoutId="auth-tab-pill"
                className="absolute inset-0 rounded-lg"
                style={{
                  backgroundColor: 'var(--smuggler-bg-panel)',
                  border: '1px solid rgba(192,152,88,0.4)',
                  boxShadow: '0 2px 6px rgba(192,152,88,0.14)',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {t === 'email' ? <Mail size={14} /> : <Phone size={14} />}
              {t === 'email' ? 'Email' : 'Mobile OTP'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile OTP form (shared by login & signup)                          */
/* ------------------------------------------------------------------ */

function MobileOtpForm({
  requireName,
  onSuccess,
}: {
  requireName: boolean;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // OTP countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [countdown]);

  const handleSendOtp = () => {
    setError('');
    if (requireName && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid mobile number.');
      return;
    }
    setSendingOtp(true);
    window.setTimeout(() => {
      setSendingOtp(false);
      setOtpSent(true);
      setCountdown(60);
    }, 900);
  };

  const handleVerify = () => {
    setError('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setVerifying(true);
    window.setTimeout(() => {
      setVerifying(false);
      setSuccess(true);
      window.setTimeout(() => onSuccess(), 700);
    }, 1100);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'rgba(45,90,61,0.12)',
            color: 'var(--smuggler-green)',
          }}
        >
          <CheckCircle2 size={30} />
        </motion.div>
        <p
          className="font-serif text-lg font-bold"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Verified successfully!
        </p>
        <p className="text-sm" style={{ color: 'var(--smuggler-text-secondary)' }}>
          Redirecting you to your mission...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      {requireName && (
        <div>
          <FieldLabel>Full Name</FieldLabel>
          <PremiumInput
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}

      <div>
        <FieldLabel>Mobile Number</FieldLabel>
        <div className="flex gap-2">
          <div className="w-32 flex-shrink-0">
            <PremiumSelect
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </PremiumSelect>
          </div>
          <PremiumInput
            type="tel"
            inputMode="tel"
            placeholder="98765 43210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            disabled={otpSent}
          />
        </div>
      </div>

      {!otpSent ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={handleSendOtp}
          disabled={sendingOtp}
          className="smuggler-cta-premium mt-1 w-full justify-center disabled:opacity-70"
        >
          {sendingOtp ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending OTP...
            </>
          ) : (
            <>
              <KeyRound size={16} />
              Send OTP
            </>
          )}
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-col gap-3"
        >
          <div>
            <FieldLabel>
              Enter the 6-digit code sent to {countryCode} {mobile}
            </FieldLabel>
            <OtpInput value={otp} onChange={setOtp} />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span
              className="flex items-center gap-1"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              <Clock size={12} />
              {countdown > 0 ? (
                <>Resend in {countdown}s</>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOtp('');
                    setCountdown(60);
                  }}
                  className="flex items-center gap-1 font-semibold hover:underline"
                  style={{ color: 'var(--smuggler-gold)' }}
                >
                  <RotateCcw size={12} />
                  Resend OTP
                </button>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setCountdown(0);
              }}
              className="font-medium hover:underline"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Change number
            </button>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleVerify}
            disabled={verifying || otp.length !== 6}
            className="smuggler-cta-premium w-full justify-center disabled:opacity-70"
          >
            {verifying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Verify &amp; Continue
              </>
            )}
          </motion.button>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              color: 'var(--smuggler-red)',
              backgroundColor: 'rgba(192,57,43,0.08)',
              border: '1px solid rgba(192,57,43,0.2)',
            }}
            role="alert"
          >
            <AlertTriangle size={13} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Login form                                                          */
/* ------------------------------------------------------------------ */

function LoginForm({
  onForgot,
  onSuccess,
  socialError,
}: {
  onForgot: () => void;
  onSuccess: () => void;
  socialError?: string | null;
}) {
  const [tab, setTab] = useState<'email' | 'mobile'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; social?: string }>({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  // Surface OAuth return errors from parent (query string)
  useEffect(() => {
    if (socialError) {
      setErrors((prev) => ({ ...prev, social: socialError }));
    }
  }, [socialError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!validateEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ email: data.message || 'Login failed.' });
        setLoading(false);
        return;
      }
      setLoading(false);
      onSuccess();
    } catch {
      setErrors({ email: 'Network error. Please try again.' });
      setLoading(false);
    }
  };

  const handleSocial = (provider: 'google' | 'facebook') => {
    if (provider === 'facebook') {
      setErrors({ social: 'Facebook login is not available yet. Use Google or email.' });
      return;
    }
    setErrors((prev) => ({ ...prev, social: undefined }));
    setSocialLoading('google');
    // Full redirect so Google can set cookies + complete OAuth round-trip
    window.location.href = '/api/auth/google';
  };

  return (
    <div>
      <AuthTabSelector tab={tab} setTab={setTab} />

      <div className="mt-5">
        <AnimatePresence mode="wait">
          {tab === 'email' ? (
            <motion.form
              key="login-email"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              noValidate
            >
              <div>
                <FieldLabel>Email Address</FieldLabel>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  />
                  <PremiumInput
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <div className="mt-1.5">
                      <InlineError message={errors.email} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <FieldLabel>Password</FieldLabel>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  />
                  <PremiumInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.password && (
                    <div className="mt-1.5">
                      <InlineError message={errors.password} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium" style={{ color: 'var(--smuggler-text-secondary)' }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={remember}
                    onClick={() => setRemember((r) => !r)}
                    className="flex h-4 w-4 items-center justify-center rounded border transition"
                    style={{
                      backgroundColor: remember ? 'var(--smuggler-green)' : 'transparent',
                      borderColor: remember ? 'var(--smuggler-green)' : 'var(--smuggler-border)',
                    }}
                  >
                    {remember && <Check size={11} className="text-white" />}
                  </button>
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={onForgot}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--smuggler-gold)' }}
                >
                  Forgot password?
                </button>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="smuggler-cta-premium mt-1 w-full justify-center disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Log in to your account
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              key="login-mobile"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3 }}
            >
              <MobileOtpForm requireName={false} onSuccess={onSuccess} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {tab === 'email' && (
        <>
          <Divider />
          <SocialButtons loadingKey={socialLoading} onSocial={handleSocial} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Signup form                                                         */
/* ------------------------------------------------------------------ */

function SignupForm({
  onSuccess,
  socialError,
}: {
  onSuccess: () => void;
  socialError?: string | null;
}) {
  const [tab, setTab] = useState<'email' | 'mobile'>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [userType, setUserType] = useState<string>('creator');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
    terms?: string;
    social?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const strength = calcPasswordStrength(password);

  useEffect(() => {
    if (socialError) {
      setErrors((prev) => ({ ...prev, social: socialError }));
    }
  }, [socialError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Full name is required.';
    if (!email.trim()) next.email = 'Email is required.';
    else if (!validateEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 8) next.password = 'Must be at least 8 characters.';
    if (!confirm) next.confirm = 'Please confirm your password.';
    else if (confirm !== password) next.confirm = 'Passwords do not match.';
    if (!terms) next.terms = 'You must accept the terms to continue.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ email: data.message || 'Registration failed.' });
        setLoading(false);
        return;
      }
      setLoading(false);
      onSuccess();
    } catch {
      setErrors({ email: 'Network error. Please try again.' });
      setLoading(false);
    }
  };

  const handleSocial = (provider: 'google' | 'facebook') => {
    if (provider === 'facebook') {
      setErrors({ social: 'Facebook login is not available yet. Use Google or email.' });
      return;
    }
    setErrors((prev) => ({ ...prev, social: undefined }));
    setSocialLoading('google');
    window.location.href = '/api/auth/google';
  };

  return (
    <div>
      <AuthTabSelector tab={tab} setTab={setTab} />

      <div className="mt-5">
        <AnimatePresence mode="wait">
          {tab === 'email' ? (
            <motion.form
              key="signup-email"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              noValidate
            >
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  />
                  <PremiumInput
                    type="text"
                    placeholder="Jane Agent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    autoComplete="name"
                  />
                </div>
                <AnimatePresence>
                  {errors.name && (
                    <div className="mt-1.5">
                      <InlineError message={errors.name} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <FieldLabel>Email Address</FieldLabel>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  />
                  <PremiumInput
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <div className="mt-1.5">
                      <InlineError message={errors.email} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <FieldLabel>Password</FieldLabel>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  />
                  <PremiumInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthBar password={password} />
                <AnimatePresence>
                  {errors.password && (
                    <div className="mt-1.5">
                      <InlineError message={errors.password} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <FieldLabel>Confirm Password</FieldLabel>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  />
                  <PremiumInput
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="px-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {confirm && confirm === password && (
                    <Check
                      size={16}
                      className="absolute right-10 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--smuggler-green)' }}
                    />
                  )}
                </div>
                <AnimatePresence>
                  {errors.confirm && (
                    <div className="mt-1.5">
                      <InlineError message={errors.confirm} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <FieldLabel>I am a...</FieldLabel>
                <PremiumSelect value={userType} onChange={(e) => setUserType(e.target.value)}>
                  {USER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </PremiumSelect>
              </div>

              <div>
                <label
                  className="flex cursor-pointer items-start gap-2 text-xs"
                  style={{ color: 'var(--smuggler-text-secondary)' }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={terms}
                    onClick={() => setTerms((t) => !t)}
                    className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition"
                    style={{
                      backgroundColor: terms ? 'var(--smuggler-green)' : 'transparent',
                      borderColor: terms ? 'var(--smuggler-green)' : 'var(--smuggler-border)',
                    }}
                  >
                    {terms && <Check size={11} className="text-white" />}
                  </button>
                  <span>
                    I agree to the{' '}
                    <span className="font-semibold" style={{ color: 'var(--smuggler-gold)' }}>
                      Terms of Service
                    </span>{' '}
                    and{' '}
                    <span className="font-semibold" style={{ color: 'var(--smuggler-gold)' }}>
                      Privacy Policy
                    </span>
                    .
                  </span>
                </label>
                <AnimatePresence>
                  {errors.terms && (
                    <div className="mt-1.5">
                      <InlineError message={errors.terms} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="smuggler-cta-premium mt-1 w-full justify-center disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create my account
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              key="signup-mobile"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3 }}
            >
              <MobileOtpForm requireName onSuccess={onSuccess} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {tab === 'email' && (
        <>
          <Divider />
          <SocialButtons loadingKey={socialLoading} onSocial={handleSocial} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Forgot password flow                                                */
/* ------------------------------------------------------------------ */

function ForgotPasswordFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');

  const handleStep1 = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Email is required.');
    if (!validateEmail(email)) return setError('Enter a valid email address.');
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setInfo('');
      setStep(2);
    }, 1000);
  };

  const handleStep2 = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) return setError('Please enter the 6-digit code.');
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1000);
  };

  const handleStep3 = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!newPw) return setError('Please enter a new password.');
    if (newPw.length < 8) return setError('Password must be at least 8 characters.');
    if (confirmPw !== newPw) return setError('Passwords do not match.');
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setInfo('Password reset successfully');
    }, 1100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-4"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold hover:underline"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        <ArrowLeft size={14} />
        Back to login
      </button>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] font-bold"
              style={{
                backgroundColor:
                  step >= s ? 'var(--smuggler-green)' : 'rgba(0,0,0,0.06)',
                color: step >= s ? '#fff' : 'var(--smuggler-text-muted)',
                border: step >= s ? 'none' : '1px solid var(--smuggler-border)',
              }}
            >
              {step > s ? <Check size={12} /> : s}
            </div>
            {s < 3 && (
              <div
                className="h-0.5 flex-1 rounded"
                style={{
                  backgroundColor:
                    step > s ? 'var(--smuggler-green)' : 'var(--smuggler-border)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {info ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(45,90,61,0.12)',
                color: 'var(--smuggler-green)',
              }}
            >
              <CheckCircle2 size={30} />
            </motion.div>
            <p
              className="font-serif text-lg font-bold"
              style={{ color: 'var(--smuggler-text)' }}
            >
              {info}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-semibold hover:underline"
              style={{ color: 'var(--smuggler-gold)' }}
            >
              Continue to login
            </button>
          </motion.div>
        ) : step === 1 ? (
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            onSubmit={handleStep1}
            className="flex flex-col gap-4"
            noValidate
          >
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                />
                <PremiumInput
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="smuggler-cta-premium w-full justify-center disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending reset link...
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  Send Reset Link
                </>
              )}
            </motion.button>
          </motion.form>
        ) : step === 2 ? (
          <motion.form
            key="step2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            onSubmit={handleStep2}
            className="flex flex-col gap-4"
            noValidate
          >
            <p className="text-sm" style={{ color: 'var(--smuggler-text-secondary)' }}>
              Enter the 6-digit code from your email sent to{' '}
              <span className="font-semibold" style={{ color: 'var(--smuggler-text)' }}>
                {email}
              </span>
            </p>
            <OtpInput value={otp} onChange={setOtp} />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading || otp.length !== 6}
              className="smuggler-cta-premium w-full justify-center disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Verify Code
                </>
              )}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form
            key="step3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            onSubmit={handleStep3}
            className="flex flex-col gap-4"
            noValidate
          >
            <div>
              <FieldLabel>New Password</FieldLabel>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                />
                <PremiumInput
                  type={showPw ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="px-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrengthBar password={newPw} />
            </div>
            <div>
              <FieldLabel>Confirm Password</FieldLabel>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                />
                <PremiumInput
                  type={showPw ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="smuggler-cta-premium w-full justify-center disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Reset Password
                </>
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              color: 'var(--smuggler-red)',
              backgroundColor: 'rgba(192,57,43,0.08)',
              border: '1px solid rgba(192,57,43,0.2)',
            }}
            role="alert"
          >
            <AlertTriangle size={13} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Left promotional panel                                              */
/* ------------------------------------------------------------------ */

function LeftPanel() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className="relative hidden lg:flex lg:w-[45%] flex-col justify-between overflow-hidden p-10 xl:p-14"
      style={{
        backgroundColor: 'var(--smuggler-bg)',
      }}
    >
      {/* Paper texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'url(/smuggler/assets/paper-grain-noise.jpg)',
          backgroundSize: '220px 220px',
          mixBlendMode: 'multiply',
          opacity: isDark ? 0.06 : 0.08,
        }}
      />
      {/* Radial gold gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 15%, rgba(192,152,88,0.18), transparent 45%), radial-gradient(circle at 80% 85%, rgba(45,90,61,0.14), transparent 50%)',
        }}
      />
      {/* Classified document diagonal lines pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, var(--smuggler-text) 0, var(--smuggler-text) 1px, transparent 1px, transparent 14px)',
        }}
      />

      {/* TOP SECRET stamp */}
      <motion.div
        initial={{ opacity: 0, rotate: -25, scale: 1.4 }}
        animate={{ opacity: 0.85, rotate: -15, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 120, damping: 12 }}
        className="absolute right-10 top-24 z-20"
      >
        <div className="smuggler-stamp-secret">TOP SECRET</div>
      </motion.div>

      {/* Content */}
      <motion.div
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col gap-6"
      >
        {/* Logo */}
        <motion.div variants={ITEM_VARIANTS} className="flex items-center gap-3">
          <div
            className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full"
            style={{
              backgroundColor: 'rgba(192,152,88,0.1)',
              border: '1px solid rgba(192,152,88,0.3)',
            }}
          >
            <img
              src="/smuggler/assets/logo-hq.png"
              alt="Content Smuggler logo"
              className="h-full w-full scale-110 object-contain p-0.5"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '1.25rem',
                letterSpacing: '1px',
                color: 'var(--smuggler-text)',
              }}
            >
              <Star size={10} className="fill-current" style={{ color: 'var(--smuggler-gold)' }} />
              CONTENT
              <Star size={10} className="fill-current" style={{ color: 'var(--smuggler-gold)' }} />
            </span>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '1.25rem',
                letterSpacing: '1px',
                color: 'var(--smuggler-text)',
              }}
            >
              SMUGGLER
            </span>
            <span
              className="mt-1"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.55rem',
                letterSpacing: '3px',
                color: 'var(--smuggler-text-muted)',
                fontWeight: 600,
              }}
            >
              — CREATOR TOOLKIT —
            </span>
          </div>
        </motion.div>

        {/* Badge */}
        <motion.div
          variants={ITEM_VARIANTS}
          className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em]"
          style={{
            backgroundColor: 'rgba(45,90,61,0.1)',
            border: '1px solid rgba(45,90,61,0.25)',
            color: 'var(--smuggler-green)',
          }}
        >
          <ShieldCheck size={14} />
          TOP SECRET TOOLS. SERIOUS RESULTS.
        </motion.div>

        {/* Headline */}
        <motion.div variants={ITEM_VARIANTS}>
          <h2
            className="font-serif text-4xl font-bold leading-[1.1] xl:text-5xl"
            style={{ color: 'var(--smuggler-text)' }}
          >
            Unlock your{' '}
            <span style={{ color: 'var(--smuggler-green)' }}>
              creator superpowers
            </span>
            .
          </h2>
          <p
            className="mt-3 max-w-md text-base leading-relaxed"
            style={{ color: 'var(--smuggler-text-secondary)' }}
          >
            Join thousands of creators smuggling scroll-stopping content past the algorithm — armed with 95+ AI tools and field-tested intelligence.
          </p>
        </motion.div>
      </motion.div>

      {/* Mascot (floating centerpiece) */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 my-2 flex flex-1 items-center justify-center"
      >
        <motion.img
          src="/smuggler/assets/mascot-auth.png"
          alt="Detective mascot with magnifying glass"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="max-h-[280px] w-auto max-w-full object-contain xl:max-h-[340px]"
          style={{
            mixBlendMode: isDark ? 'normal' : 'multiply',
            filter: isDark
              ? 'drop-shadow(0 16px 32px rgba(0,0,0,0.5))'
              : 'drop-shadow(0 12px 24px rgba(60,40,10,0.18))',
          }}
        />
      </motion.div>

      {/* Feature bullets */}
      <motion.div
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col gap-3"
      >
        {LEFT_FEATURES.map(({ Icon, label }) => (
          <motion.div
            key={label}
            variants={ITEM_VARIANTS}
            className="flex items-center gap-3"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                backgroundColor: 'rgba(192,152,88,0.12)',
                border: '1px solid rgba(192,152,88,0.25)',
                color: 'var(--smuggler-gold)',
              }}
            >
              <Icon size={16} />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--smuggler-text)' }}
            >
              {label}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main AuthPages                                                      */
/* ------------------------------------------------------------------ */

export function AuthPages({
  initialMode,
  onClose,
  onSuccess,
  onSwitchMode,
}: AuthPagesProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [subView, setSubView] = useState<'auth' | 'forgot'>('auth');

  // Keep local mode in sync if parent pushes a new initialMode.
  const [prevInitial, setPrevInitial] = useState(initialMode);
  if (initialMode !== prevInitial) {
    setPrevInitial(initialMode);
    setMode(initialMode);
    setSubView('auth');
  }

  const handleSwitch = (next: 'login' | 'signup') => {
    setMode(next);
    setSubView('auth');
    onSwitchMode(next);
  };
  const isLogin = mode === 'login';
  const title =
    subView === 'forgot'
      ? 'Reset your passphrase'
      : isLogin
        ? 'Welcome back, agent'
        : 'Join the network';
  const subtitle =
    subView === 'forgot'
      ? 'Recover access to your Content Smuggler account'
      : isLogin
        ? 'Log in to access your creator toolkit'
        : 'Create your account and start smuggling content';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="flex min-h-screen w-full"
      style={{ backgroundColor: 'var(--smuggler-bg)' }}
    >
      <LeftPanel />

      {/* Right form panel */}
      <div
        className="relative flex w-full flex-col lg:w-[55%]"
        style={{
          backgroundColor: 'var(--smuggler-bg-panel)',
          backgroundImage:
            'radial-gradient(circle at 100% 0%, rgba(192,152,88,0.05), transparent 40%)',
        }}
      >
        {/* Back to home link */}
        <div className="flex items-center justify-between px-6 pt-6 sm:px-10 lg:px-14">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold transition hover:underline"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            <ArrowLeft size={14} />
            Back to home
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition"
            style={{
              color: 'var(--smuggler-text-muted)',
              border: '1px solid var(--smuggler-border)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8 sm:px-10 lg:px-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="smuggler-panel-premium smuggler-paper-grain w-full max-w-md rounded-2xl p-6 sm:p-8"
          >
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <div
                className="relative flex h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'rgba(45,90,61,0.1)',
                  border: '1px solid rgba(192,152,88,0.3)',
                }}
              >
                <Crosshair
                  size={22}
                  className="absolute"
                  style={{ color: 'var(--smuggler-gold)' }}
                  strokeWidth={1.5}
                />
                <User
                  size={14}
                  style={{ color: 'var(--smuggler-text)' }}
                />
              </div>
              <div>
                <h1
                  className="font-serif text-2xl font-bold leading-tight"
                  style={{ color: 'var(--smuggler-text)' }}
                >
                  {title}
                </h1>
                <p className="text-xs" style={{ color: 'var(--smuggler-text-secondary)' }}>
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Sub-view switch */}
            <AnimatePresence mode="wait">
              {subView === 'forgot' ? (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ForgotPasswordFlow onBack={() => setSubView('auth')} />
                </motion.div>
              ) : (
                <motion.div
                  key="auth"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {isLogin ? (
                    <LoginForm
                      onForgot={() => setSubView('forgot')}
                      onSuccess={onSuccess}
                    />
                  ) : (
                    <SignupForm
                      onSuccess={onSuccess}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Switch link (auth view only) */}
            {subView === 'auth' && (
              <p
                className="mt-6 text-center text-sm"
                style={{ color: 'var(--smuggler-text-secondary)' }}
              >
                {isLogin ? 'New to Content Smuggler? ' : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => handleSwitch(isLogin ? 'signup' : 'login')}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--smuggler-gold)' }}
                >
                  {isLogin ? 'Create an account' : 'Log in'}
                </button>
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default AuthPages;
