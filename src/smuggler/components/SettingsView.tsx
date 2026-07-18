'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  ShieldCheck,
  User,
  Lock,
  Bell,
  Link2,
  Settings as SettingsIcon,
  CreditCard,
  Users,
  Code,
  AlertTriangle,
  ArrowLeft,
  Home,
  Upload,
  Check,
  X,
  Crown,
  Trash2,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Download,
  Key,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
} from 'lucide-react';
import {
  useUserStore,
  useDisplayName,
  useAvatar,
  type TeamMember,
} from '@/smuggler/store/useUserStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/smuggler/components/BackButton';

/* ============================================================
   Props & Constants
   ============================================================ */

interface SettingsViewProps {
  onNavigate: (view: 'home' | 'tools' | 'library' | 'studio' | 'pricing') => void;
}

type TabId =
  | 'profile'
  | 'security'
  | 'notifications'
  | 'connected'
  | 'preferences'
  | 'billing'
  | 'team'
  | 'api'
  | 'danger';

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile Information', icon: User },
  { id: 'security', label: 'Account & Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'connected', label: 'Connected Accounts', icon: Link2 },
  { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  { id: 'billing', label: 'Billing & Subscription', icon: CreditCard },
  { id: 'team', label: 'Team Members', icon: Users },
  { id: 'api', label: 'API & Integrations', icon: Code },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Singapore',
  'Japan',
  'Brazil',
];

const TIMEZONES = [
  '(GMT-08:00) Pacific Time',
  '(GMT-05:00) Eastern Time',
  '(GMT+00:00) UTC',
  '(GMT+01:00) Central European',
  '(GMT+05:30) Asia/Kolkata',
  '(GMT+08:00) Asia/Singapore',
  '(GMT+09:00) Asia/Tokyo',
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Hindi',
  'Mandarin',
  'Japanese',
  'Portuguese',
];

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'];

const CATEGORIES = [
  'Content Creator',
  'YouTuber',
  'Podcaster',
  'Writer',
  'Marketer',
  'Educator',
  'Business Owner',
  'Other',
];

const PLATFORMS_LIST = ['YouTube', 'Instagram', 'TikTok', 'X', 'LinkedIn'];

const TONES = [
  'Conversational',
  'Professional',
  'Casual',
  'Authoritative',
  'Playful',
  'Inspirational',
];

const EXPORT_FORMATS = ['TXT', 'Markdown', 'PDF', 'DOCX', 'JSON'];

const CONNECTED_PLATFORMS = [
  { id: 'google', name: 'Google', color: '#4285F4', letter: 'G' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', letter: 'f' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', letter: 'Y' },
  { id: 'instagram', name: 'Instagram', color: '#E1306C', letter: 'I' },
  { id: 'tiktok', name: 'TikTok', color: '#25F4EE', letter: 'T' },
  { id: 'x', name: 'X', color: '#1A1A1A', letter: 'X' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', letter: 'in' },
  { id: 'twitch', name: 'Twitch', color: '#9146FF', letter: 'Tw' },
  { id: 'discord', name: 'Discord', color: '#5865F2', letter: 'D' },
];

const PLAN_META: Record<
  'starter' | 'creator' | 'agency',
  { name: string; price: string; features: string[] }
> = {
  starter: {
    name: 'Starter',
    price: '$0',
    features: ['10 generations / month', 'Basic tools', 'Community support'],
  },
  creator: {
    name: 'Creator',
    price: '$19',
    features: [
      '100 generations / month',
      'All tools',
      'Priority support',
      'Advanced analytics',
    ],
  },
  agency: {
    name: 'Agency',
    price: '$99',
    features: [
      '1000 generations / month',
      'Team collaboration',
      'API access',
      'Dedicated manager',
      'White-label exports',
    ],
  },
};

/* ============================================================
   Animation Variants
   ============================================================ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/* ============================================================
   Reusable UI Primitives
   ============================================================ */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300"
      style={{
        backgroundColor: checked
          ? 'var(--smuggler-accent-green)'
          : 'var(--smuggler-border)',
      }}
    >
      <motion.span
        className="inline-block h-4 w-4 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 22 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[0.7rem] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs" style={{ color: 'var(--smuggler-text-muted)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function PremiumInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`smuggler-input-premium w-full rounded-lg px-3 py-2.5 text-sm outline-none ${
        props.className ?? ''
      }`}
      style={{ color: 'var(--smuggler-text)', ...props.style }}
    />
  );
}

function PremiumSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`smuggler-input-premium w-full cursor-pointer appearance-none rounded-lg px-3 py-2.5 text-sm outline-none ${
        props.className ?? ''
      }`}
      style={{ color: 'var(--smuggler-text)', ...props.style }}
    />
  );
}

function PremiumTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`smuggler-input-premium w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none ${
        props.className ?? ''
      }`}
      style={{ color: 'var(--smuggler-text)', ...props.style }}
    />
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof User;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: 'rgba(192,152,88,0.1)',
          color: 'var(--smuggler-gold)',
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <h2
          className="smuggler-section-heading text-2xl"
          style={{ color: 'var(--smuggler-text)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--smuggler-text-secondary)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Tab 1 — Profile Information
   ============================================================ */

function ProfileTab() {
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const uploadAvatar = useUserStore((s) => s.uploadAvatar);
  const billing = useUserStore((s) => s.billing);
  const displayName = useDisplayName();
  const avatar = useAvatar();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(profile);
  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please choose an image file.',
        variant: 'destructive',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      uploadAvatar(reader.result as string);
      toast({
        title: 'Avatar updated',
        description: 'Your new avatar is now live everywhere.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateProfile(form);
    toast({
      title: 'Profile saved',
      description: 'Your changes have been saved.',
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={User}
        title="Profile Information"
        subtitle="Update your personal details and how you appear across the platform."
      />

      {/* Profile card */}
      <div className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            <img
              src={avatar}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover"
              style={{ border: '2px solid var(--smuggler-gold)' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-110"
              style={{ backgroundColor: 'var(--smuggler-gold)' }}
              aria-label="Upload new avatar"
            >
              <Upload size={12} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatar}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="text-xl font-bold"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {displayName}
              </h3>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'rgba(192,152,88,0.15)',
                  color: 'var(--smuggler-gold)',
                }}
              >
                <Crown size={10} /> {PLAN_META[billing.plan].name}
              </span>
            </div>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              {profile.bio}
            </p>
            <div
              className="mt-2 flex flex-wrap gap-4 text-xs"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              <span>{profile.email}</span>
              <span>•</span>
              <span>{profile.country}</span>
              <span>•</span>
              <span>Member since Jan 2024</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="smuggler-section-heading mb-4 text-lg"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Edit Details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            <PremiumInput
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Username">
            <PremiumInput
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <PremiumInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Mobile">
            <PremiumInput
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </Field>
          <Field label="Bio">
            <PremiumTextarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </Field>
          <Field label="Country">
            <PremiumSelect
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            >
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </PremiumSelect>
          </Field>
          <Field label="Timezone">
            <PremiumSelect
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              {TIMEZONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </PremiumSelect>
          </Field>
          <Field label="Language">
            <PremiumSelect
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </PremiumSelect>
          </Field>
          <Field label="Date Format">
            <PremiumSelect
              value={form.dateFormat}
              onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
            >
              {DATE_FORMATS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </PremiumSelect>
          </Field>
          <Field label="Creator Category">
            <PremiumSelect
              value={form.creatorCategory}
              onChange={(e) =>
                setForm({ ...form, creatorCategory: e.target.value })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </PremiumSelect>
          </Field>
        </div>

        <h4
          className="mb-3 mt-6 text-[0.7rem] font-bold uppercase tracking-wider"
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          Social Links
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="YouTube">
            <PremiumInput
              value={form.socialLinks.youtube || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  socialLinks: { ...form.socialLinks, youtube: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Instagram">
            <PremiumInput
              value={form.socialLinks.instagram || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  socialLinks: { ...form.socialLinks, instagram: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Twitter / X">
            <PremiumInput
              value={form.socialLinks.twitter || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  socialLinks: { ...form.socialLinks, twitter: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Website">
            <div className="relative">
              <Globe
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--smuggler-text-muted)' }}
              />
              <PremiumInput
                className="!pl-9"
                value={form.socialLinks.website || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    socialLinks: { ...form.socialLinks, website: e.target.value },
                  })
                }
              />
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={handleSave} className="smuggler-cta-premium">
            <Check size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Tab 2 — Account & Security
   ============================================================ */

function SecurityTab() {
  const security = useUserStore((s) => s.security);
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const toggle2FA = useUserStore((s) => s.toggle2FA);
  const logoutOtherDevices = useUserStore((s) => s.logoutOtherDevices);
  const changePassword = useUserStore((s) => s.changePassword);
  const { toast } = useToast();

  const [emailEditing, setEmailEditing] = useState(false);
  const [emailDraft, setEmailDraft] = useState(profile.email);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ old: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ old: false, next: false, confirm: false });
  const [showSessions, setShowSessions] = useState(false);

  const deviceIcon = (device: string) => {
    if (/iphone|android|mobile/i.test(device)) return Smartphone;
    if (/ipad|tablet/i.test(device)) return Tablet;
    return Monitor;
  };

  const handleEmailSave = () => {
    if (!emailDraft.includes('@')) {
      toast({ title: 'Invalid email', variant: 'destructive' });
      return;
    }
    updateProfile({ email: emailDraft });
    setEmailEditing(false);
    toast({
      title: 'Email updated',
      description: 'Your email address has been changed.',
    });
  };

  const handlePwChange = () => {
    if (!pw.old || !pw.next) {
      toast({
        title: 'Missing fields',
        description: 'Fill in all password fields.',
        variant: 'destructive',
      });
      return;
    }
    if (pw.next !== pw.confirm) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must be identical.',
        variant: 'destructive',
      });
      return;
    }
    if (pw.next.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Use at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }
    const ok = changePassword(pw.old, pw.next);
    if (ok) {
      toast({
        title: 'Password changed',
        description: 'Use your new password next time you sign in.',
      });
      setPwOpen(false);
      setPw({ old: '', next: '', confirm: '' });
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Lock}
        title="Account & Security"
        subtitle="Protect your account with strong authentication and review active sessions."
      />

      {/* Email */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[0.7rem] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Email address
            </p>
            {emailEditing ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="min-w-[200px] flex-1">
                  <PremiumInput
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    type="email"
                  />
                </div>
                <button
                  className="smuggler-cta-premium !px-3 !py-2 text-sm"
                  onClick={handleEmailSave}
                >
                  <Check size={14} /> Save
                </button>
                <button
                  className="smuggler-cta-outline !px-3 !py-2 text-sm"
                  onClick={() => {
                    setEmailEditing(false);
                    setEmailDraft(profile.email);
                  }}
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            ) : (
              <p
                className="mt-1 text-base font-medium"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {profile.email}
              </p>
            )}
          </div>
          {!emailEditing && (
            <button
              className="smuggler-cta-outline !px-4 !py-2 text-sm"
              onClick={() => setEmailEditing(true)}
            >
              Change
            </button>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[0.7rem] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Password
            </p>
            <p
              className="mt-1 text-base font-medium"
              style={{ color: 'var(--smuggler-text)' }}
            >
              ••••••••••
            </p>
          </div>
          <button
            className="smuggler-cta-outline !px-4 !py-2 text-sm"
            onClick={() => setPwOpen(true)}
          >
            Change
          </button>
        </div>
      </div>

      {/* 2FA */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={20}
              style={{
                color: security.twoFactorEnabled
                  ? 'var(--smuggler-accent-green)'
                  : 'var(--smuggler-text-muted)',
              }}
            />
            <div>
              <p
                className="font-semibold"
                style={{ color: 'var(--smuggler-text)' }}
              >
                Two-Factor Authentication
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--smuggler-text-secondary)' }}
              >
                {security.twoFactorEnabled
                  ? 'Enabled — an extra layer of security is active.'
                  : 'Disabled — we strongly recommend enabling 2FA.'}
              </p>
            </div>
          </div>
          <Toggle
            checked={security.twoFactorEnabled}
            onChange={() => {
              toggle2FA();
              toast({
                title: security.twoFactorEnabled ? '2FA disabled' : '2FA enabled',
                description: security.twoFactorEnabled
                  ? 'Two-factor authentication turned off.'
                  : 'Two-factor authentication is now active.',
              });
            }}
            label="Toggle 2FA"
          />
        </div>
      </div>

      {/* Active sessions */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p
              className="text-[0.7rem] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Active sessions
            </p>
            <p
              className="mt-1 text-2xl font-bold"
              style={{ color: 'var(--smuggler-text)' }}
            >
              {security.activeSessions}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="smuggler-cta-outline !px-4 !py-2 text-sm"
              onClick={() => setShowSessions(!showSessions)}
            >
              {showSessions ? 'Hide' : 'View'}
            </button>
            <button
              className="smuggler-cta-premium !px-4 !py-2 text-sm"
              onClick={() => {
                logoutOtherDevices();
                toast({
                  title: 'Logged out other devices',
                  description: 'Only this session remains active.',
                });
              }}
            >
              Logout others
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {showSessions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div
                className="mt-4 space-y-2 border-t pt-4"
                style={{ borderColor: 'var(--smuggler-border)' }}
              >
                {security.loginHistory.map((s) => {
                  const Icon = deviceIcon(s.device);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg p-2"
                      style={{ backgroundColor: 'rgba(192,152,88,0.05)' }}
                    >
                      <Icon size={16} style={{ color: 'var(--smuggler-gold)' }} />
                      <div className="flex-1 min-w-0">
                        <p
                          className="truncate text-sm font-medium"
                          style={{ color: 'var(--smuggler-text)' }}
                        >
                          {s.device}
                        </p>
                        <p
                          className="truncate text-xs"
                          style={{ color: 'var(--smuggler-text-muted)' }}
                        >
                          {s.location}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-xs"
                        style={{ color: 'var(--smuggler-text-muted)' }}
                      >
                        {new Date(s.time).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Login history */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="smuggler-section-heading mb-4 text-lg"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Recent Login History
        </h3>
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {security.loginHistory.map((s) => {
            const Icon = deviceIcon(s.device);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg p-3"
                style={{ backgroundColor: 'rgba(192,152,88,0.05)' }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon size={16} style={{ color: 'var(--smuggler-gold)' }} />
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: 'var(--smuggler-text)' }}
                    >
                      {s.device}
                    </p>
                    <p
                      className="truncate text-xs"
                      style={{ color: 'var(--smuggler-text-muted)' }}
                    >
                      {s.location}
                    </p>
                  </div>
                </div>
                <span
                  className="shrink-0 text-xs"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                >
                  {new Date(s.time).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Password modal */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <h3
            className="smuggler-section-heading text-xl"
            style={{ color: 'var(--smuggler-text)' }}
          >
            Change Password
          </h3>
          <div className="space-y-3">
            {(
              [
                { k: 'old' as const, ph: 'Current password' },
                { k: 'next' as const, ph: 'New password' },
                { k: 'confirm' as const, ph: 'Confirm new password' },
              ]
            ).map(({ k, ph }) => (
              <div key={k} className="relative">
                <PremiumInput
                  type={showPw[k] ? 'text' : 'password'}
                  placeholder={ph}
                  value={pw[k]}
                  onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
                  className="!pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                  onClick={() => setShowPw({ ...showPw, [k]: !showPw[k] })}
                  aria-label={showPw[k] ? 'Hide password' : 'Show password'}
                >
                  {showPw[k] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              className="smuggler-cta-outline !px-4 !py-2"
              onClick={() => setPwOpen(false)}
            >
              Cancel
            </button>
            <button
              className="smuggler-cta-premium !px-4 !py-2"
              onClick={handlePwChange}
            >
              Update password
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Tab 3 — Notifications
   ============================================================ */

function NotificationsTab() {
  const notifications = useUserStore((s) => s.notifications);
  const updateNotification = useUserStore((s) => s.updateNotification);
  const { toast } = useToast();

  const items: {
    key: keyof typeof notifications;
    label: string;
    desc: string;
  }[] = [
    {
      key: 'emailNotifs',
      label: 'Email Notifications',
      desc: 'Receive emails about your account activity.',
    },
    {
      key: 'pushNotifs',
      label: 'Push Notifications',
      desc: 'Get real-time push notifications in your browser.',
    },
    {
      key: 'marketingEmails',
      label: 'Marketing Emails',
      desc: 'News, tips and promotional offers.',
    },
    {
      key: 'creatorInsights',
      label: 'Creator Insights',
      desc: 'Weekly analytics and content performance reports.',
    },
    {
      key: 'growthAlerts',
      label: 'Growth Alerts',
      desc: 'Milestones, spikes and traffic anomalies.',
    },
    {
      key: 'securityAlerts',
      label: 'Security Alerts',
      desc: 'Critical account security notifications.',
    },
    {
      key: 'productUpdates',
      label: 'Product Updates',
      desc: 'New features and improvements as they ship.',
    },
    {
      key: 'reminderPrefs',
      label: 'Reminders',
      desc: 'Content calendar and posting reminders.',
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Bell}
        title="Notifications"
        subtitle="Choose what you want to hear about and how."
      />
      <div className="smuggler-panel-premium rounded-2xl p-2">
        {items.map((it, i) => (
          <div
            key={it.key}
            className="flex items-center justify-between gap-4 p-4"
            style={{
              borderTop:
                i > 0 ? '1px solid var(--smuggler-border)' : 'none',
            }}
          >
            <div className="min-w-0 pr-4">
              <p
                className="font-medium"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {it.label}
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--smuggler-text-secondary)' }}
              >
                {it.desc}
              </p>
            </div>
            <Toggle
              checked={notifications[it.key]}
              onChange={(v) => {
                updateNotification(it.key, v);
                toast({
                  title: `${it.label} ${v ? 'enabled' : 'disabled'}`,
                });
              }}
              label={it.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Tab 4 — Connected Accounts
   ============================================================ */

function ConnectedAccountsTab() {
  const { toast } = useToast();
  const [connected, setConnected] = useState<Record<string, boolean>>({
    google: true,
    facebook: false,
    youtube: true,
    instagram: true,
    tiktok: false,
    x: true,
    linkedin: false,
    twitch: false,
    discord: false,
  });

  const toggle = (p: (typeof CONNECTED_PLATFORMS)[number]) => {
    const next = !connected[p.id];
    setConnected({ ...connected, [p.id]: next });
    toast({
      title: `${p.name} ${next ? 'connected' : 'disconnected'}`,
      description: next
        ? 'You can now publish to this platform.'
        : 'Access has been revoked.',
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Link2}
        title="Connected Accounts"
        subtitle="Link your social accounts to publish and analyze in one place."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {CONNECTED_PLATFORMS.map((p) => {
          const isConnected = connected[p.id];
          return (
            <div key={p.id} className="smuggler-panel-premium rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.letter}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-semibold"
                    style={{ color: 'var(--smuggler-text)' }}
                  >
                    {p.name}
                  </p>
                  <p
                    className="inline-flex items-center gap-1 text-xs"
                    style={{
                      color: isConnected
                        ? 'var(--smuggler-accent-green)'
                        : 'var(--smuggler-text-muted)',
                    }}
                  >
                    {isConnected ? (
                      <>
                        <Check size={10} /> Connected
                      </>
                    ) : (
                      <>
                        <X size={10} /> Not connected
                      </>
                    )}
                  </p>
                </div>
                <button
                  className={
                    isConnected
                      ? 'smuggler-cta-outline !px-3 !py-1.5 text-xs'
                      : 'smuggler-cta-premium !px-3 !py-1.5 text-xs'
                  }
                  onClick={() => toggle(p)}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Tab 5 — Preferences
   ============================================================ */

function PreferencesTab() {
  const preferences = useUserStore((s) => s.preferences);
  const updatePreference = useUserStore((s) => s.updatePreference);
  const resetPreferences = useUserStore((s) => s.resetPreferences);
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={SettingsIcon}
        title="Preferences"
        subtitle="Customize your workspace and default behaviors."
      />

      {/* Theme */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="mb-4 text-[0.7rem] font-bold uppercase tracking-wider"
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          Theme
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {(['light', 'dark'] as const).map((t) => {
            const selected = preferences.theme === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  updatePreference('theme', t);
                  toast({ title: `Theme set to ${t}` });
                }}
                className="smuggler-panel-premium rounded-xl p-4 text-left"
                style={{
                  borderColor: selected ? 'var(--smuggler-gold)' : undefined,
                  borderWidth: selected ? 2 : 1,
                }}
              >
                <div
                  className="mb-3 h-16 overflow-hidden rounded-lg"
                  style={{ background: t === 'light' ? '#F8F5E6' : '#0B0A08' }}
                >
                  <div className="flex h-full">
                    <div
                      className="w-1/3"
                      style={{
                        background: t === 'light' ? '#FFFDF5' : '#13110E',
                      }}
                    />
                    <div className="flex-1 p-2">
                      <div
                        className="h-2 w-3/4 rounded"
                        style={{
                          background: t === 'light' ? '#1A1A1A' : '#F4EEDF',
                        }}
                      />
                      <div
                        className="mt-1 h-2 w-1/2 rounded"
                        style={{ background: '#C09858' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="font-semibold capitalize"
                    style={{ color: 'var(--smuggler-text)' }}
                  >
                    {t}
                  </span>
                  {selected && (
                    <Check size={16} style={{ color: 'var(--smuggler-gold)' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Defaults */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="mb-4 text-[0.7rem] font-bold uppercase tracking-wider"
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          Defaults
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default Platform">
            <PremiumSelect
              value={preferences.defaultPlatform}
              onChange={(e) => {
                updatePreference('defaultPlatform', e.target.value);
                toast({ title: 'Default platform updated' });
              }}
            >
              {PLATFORMS_LIST.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </PremiumSelect>
          </Field>
          <Field label="Default AI Tone">
            <PremiumSelect
              value={preferences.defaultTone}
              onChange={(e) => {
                updatePreference('defaultTone', e.target.value);
                toast({ title: 'Default tone updated' });
              }}
            >
              {TONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </PremiumSelect>
          </Field>
          <Field label="Default Export Format">
            <PremiumSelect
              value={preferences.defaultExportFormat}
              onChange={(e) => {
                updatePreference('defaultExportFormat', e.target.value);
                toast({ title: 'Export format updated' });
              }}
            >
              {EXPORT_FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </PremiumSelect>
          </Field>
          <Field label="Measurement Units">
            <PremiumSelect
              value={preferences.measurementUnits}
              onChange={(e) => {
                updatePreference('measurementUnits', e.target.value);
                toast({ title: 'Units updated' });
              }}
            >
              <option value="metric">Metric</option>
              <option value="imperial">Imperial</option>
            </PremiumSelect>
          </Field>
        </div>
      </div>

      {/* Toggles */}
      <div className="smuggler-panel-premium rounded-2xl p-2">
        {(
          [
            {
              key: 'autoSave' as const,
              label: 'Auto Save',
              desc: 'Automatically save drafts as you work.',
            },
            {
              key: 'animations' as const,
              label: 'Animations',
              desc: 'Enable interface motion and transitions.',
            },
            {
              key: 'accessibility' as const,
              label: 'Accessibility Mode',
              desc: 'Higher contrast, larger text, reduced motion.',
            },
          ]
        ).map((it, i) => (
          <div
            key={it.key}
            className="flex items-center justify-between gap-4 p-4"
            style={{
              borderTop:
                i > 0 ? '1px solid var(--smuggler-border)' : 'none',
            }}
          >
            <div>
              <p
                className="font-medium"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {it.label}
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--smuggler-text-secondary)' }}
              >
                {it.desc}
              </p>
            </div>
            <Toggle
              checked={preferences[it.key]}
              onChange={(v) => {
                updatePreference(it.key, v);
                toast({ title: `${it.label} ${v ? 'on' : 'off'}` });
              }}
              label={it.label}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="smuggler-cta-outline"
          onClick={() => {
            resetPreferences();
            toast({
              title: 'Preferences reset',
              description: 'All preferences restored to defaults.',
            });
          }}
        >
          <RefreshCw size={16} /> Reset Preferences
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Tab 6 — Billing & Subscription
   ============================================================ */

function BillingTab() {
  const billing = useUserStore((s) => s.billing);
  const upgradePlan = useUserStore((s) => s.upgradePlan);
  const cancelSubscription = useUserStore((s) => s.cancelSubscription);
  const reactivateSubscription = useUserStore((s) => s.reactivateSubscription);
  const { toast } = useToast();

  const usagePct = Math.min(
    100,
    Math.round((billing.usage / billing.usageLimit) * 100),
  );
  const isCancelled = billing.plan === 'starter';

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={CreditCard}
        title="Billing & Subscription"
        subtitle="Manage your plan, usage and payment method."
      />

      {/* Current plan */}
      <div className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className="text-[0.7rem] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Current plan
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h3
                className="text-2xl font-bold"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {PLAN_META[billing.plan].name}
              </h3>
              <Crown size={18} style={{ color: 'var(--smuggler-gold)' }} />
            </div>
            <p
              className="text-sm"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              {isCancelled
                ? 'Subscription cancelled — limited Starter access.'
                : `Renews on ${billing.renewsOn}`}
            </p>
          </div>
          {isCancelled ? (
            <button
              className="smuggler-cta-gold !px-4 !py-2 text-sm"
              onClick={() => {
                reactivateSubscription();
                toast({
                  title: 'Subscription reactivated',
                  description: 'Welcome back to the Creator plan.',
                });
              }}
            >
              Reactivate subscription
            </button>
          ) : (
            <button
              className="smuggler-cta-outline !px-4 !py-2 text-sm"
              onClick={() => {
                cancelSubscription();
                toast({
                  title: 'Subscription cancelled',
                  description: 'You will move to the Starter plan.',
                });
              }}
            >
              Cancel subscription
            </button>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--smuggler-text-secondary)' }}>
              Usage this cycle
            </span>
            <span style={{ color: 'var(--smuggler-text)' }}>
              {billing.usage} / {billing.usageLimit}
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full"
            style={{ backgroundColor: 'rgba(192,152,88,0.15)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  usagePct > 80 ? 'var(--smuggler-red)' : 'var(--smuggler-gold)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${usagePct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {PLAN_META[billing.plan].features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              <Check
                size={14}
                style={{ color: 'var(--smuggler-accent-green)' }}
              />{' '}
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Switch plan */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="smuggler-section-heading mb-4 text-lg"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Switch Plan
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['starter', 'creator', 'agency'] as const).map((p) => {
            const isCurrent = billing.plan === p;
            return (
              <div
                key={p}
                className="rounded-xl border p-4"
                style={{
                  borderColor: isCurrent
                    ? 'var(--smuggler-gold)'
                    : 'var(--smuggler-border)',
                  backgroundColor: isCurrent
                    ? 'rgba(192,152,88,0.06)'
                    : 'transparent',
                }}
              >
                <p
                  className="text-sm font-bold uppercase"
                  style={{ color: 'var(--smuggler-gold)' }}
                >
                  {PLAN_META[p].name}
                </p>
                <p
                  className="mt-1 text-2xl font-bold"
                  style={{ color: 'var(--smuggler-text)' }}
                >
                  {PLAN_META[p].price}
                  <span
                    className="text-sm font-normal"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  >
                    /mo
                  </span>
                </p>
                <button
                  type="button"
                  className={`mt-3 w-full !px-3 !py-2 text-xs ${
                    isCurrent ? 'smuggler-cta-outline' : 'smuggler-cta-premium'
                  }`}
                  disabled={isCurrent}
                  onClick={() => {
                    upgradePlan(p);
                    toast({
                      title: `Switched to ${PLAN_META[p].name}`,
                      description: `Your plan is now ${PLAN_META[p].name}.`,
                    });
                  }}
                  style={
                    isCurrent
                      ? { opacity: 0.6, cursor: 'default' }
                      : undefined
                  }
                >
                  {isCurrent ? 'Current plan' : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment method */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[0.7rem] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Payment method
            </p>
            <p
              className="mt-1 text-base font-medium"
              style={{ color: 'var(--smuggler-text)' }}
            >
              VISA •••• 4242 — Expires 08/27
            </p>
          </div>
          <button
            className="smuggler-cta-outline !px-4 !py-2 text-sm"
            onClick={() =>
              toast({
                title: 'Opening customer portal',
                description: 'Update your card details in the secure portal.',
              })
            }
          >
            Update
          </button>
        </div>
      </div>

      {/* Billing history */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="smuggler-section-heading mb-4 text-lg"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Billing History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--smuggler-text-muted)' }}>
                <th className="pb-3 text-left font-semibold">Date</th>
                <th className="pb-3 text-left font-semibold">Amount</th>
                <th className="pb-3 text-left font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {billing.billingHistory.map((b) => (
                <tr
                  key={b.id}
                  style={{ borderTop: '1px solid var(--smuggler-border)' }}
                >
                  <td className="py-3" style={{ color: 'var(--smuggler-text)' }}>
                    {b.date}
                  </td>
                  <td className="py-3" style={{ color: 'var(--smuggler-text)' }}>
                    {b.amount}
                  </td>
                  <td className="py-3">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase"
                      style={{
                        backgroundColor:
                          b.status === 'paid'
                            ? 'rgba(30,94,62,0.15)'
                            : 'rgba(192,152,88,0.15)',
                        color:
                          b.status === 'paid'
                            ? 'var(--smuggler-accent-green)'
                            : 'var(--smuggler-gold)',
                      }}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      className="inline-flex items-center gap-1 text-xs"
                      style={{ color: 'var(--smuggler-gold)' }}
                      onClick={() =>
                        toast({
                          title: 'Invoice downloaded',
                          description: `${b.date} — ${b.amount}`,
                        })
                      }
                    >
                      <Download size={12} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Tab 7 — Team Members
   ============================================================ */

function TeamTab() {
  const team = useUserStore((s) => s.team);
  const inviteMember = useUserStore((s) => s.inviteMember);
  const removeMember = useUserStore((s) => s.removeMember);
  const updateMemberRole = useUserStore((s) => s.updateMemberRole);
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('editor');

  const handleInvite = () => {
    if (!inviteEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    inviteMember(inviteEmail, inviteRole);
    toast({
      title: 'Invitation sent',
      description: `${inviteEmail} has been invited as ${inviteRole}.`,
    });
    setInviteEmail('');
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Users}
        title="Team Members"
        subtitle="Invite collaborators and manage their roles."
      />

      {/* Invite */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="smuggler-section-heading mb-4 text-lg"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Invite Member
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <PremiumInput
              placeholder="teammate@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
            />
          </div>
          <PremiumSelect
            value={inviteRole}
            onChange={(e) =>
              setInviteRole(e.target.value as TeamMember['role'])
            }
            className="sm:w-40"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </PremiumSelect>
          <button
            className="smuggler-cta-premium !px-4 !py-2"
            onClick={handleInvite}
          >
            <Plus size={16} /> Invite
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="smuggler-panel-premium rounded-2xl p-2">
        {team.length === 0 && (
          <p
            className="p-4 text-sm"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            No team members yet.
          </p>
        )}
        {team.map((m, i) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center gap-3 p-4"
            style={{
              borderTop: i > 0 ? '1px solid var(--smuggler-border)' : 'none',
            }}
          >
            <img
              src={m.avatar || '/smuggler/assets/logo-hq.png'}
              alt={m.name}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              style={{ border: '1px solid var(--smuggler-border)' }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className="truncate font-medium"
                  style={{ color: 'var(--smuggler-text)' }}
                >
                  {m.name}
                </p>
                {m.status === 'invited' && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase"
                    style={{
                      backgroundColor: 'rgba(192,152,88,0.15)',
                      color: 'var(--smuggler-gold)',
                    }}
                  >
                    Invited
                  </span>
                )}
              </div>
              <p
                className="truncate text-xs"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                {m.email}
              </p>
            </div>
            <PremiumSelect
              value={m.role}
              onChange={(e) => {
                updateMemberRole(m.id, e.target.value as TeamMember['role']);
                toast({
                  title: 'Role updated',
                  description: `${m.name} is now ${e.target.value}.`,
                });
              }}
              className="!w-28 !py-1.5 text-xs"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </PremiumSelect>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:brightness-110"
              style={{
                color: 'var(--smuggler-red)',
                backgroundColor: 'rgba(168,72,65,0.1)',
              }}
              aria-label={`Remove ${m.name}`}
              onClick={() => {
                removeMember(m.id);
                toast({
                  title: 'Member removed',
                  description: `${m.name} no longer has access.`,
                });
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Tab 8 — API & Integrations
   ============================================================ */

function ApiTab() {
  const apiKeys = useUserStore((s) => s.apiKeys);
  const generateApiKey = useUserStore((s) => s.generateApiKey);
  const revokeApiKey = useUserStore((s) => s.revokeApiKey);
  const { toast } = useToast();
  const [keyName, setKeyName] = useState('');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [webhook, setWebhook] = useState('');

  const maskKey = (k: string) =>
    k.length > 12 ? `${k.slice(0, 8)}${'•'.repeat(16)}${k.slice(-4)}` : k;

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Code}
        title="API & Integrations"
        subtitle="Generate API keys to integrate Content Smuggler into your stack."
      />

      {/* Generate */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="smuggler-section-heading mb-4 text-lg"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Generate New Key
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <PremiumInput
              placeholder="Key name (e.g. Production API)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
          </div>
          <button
            className="smuggler-cta-premium !px-4 !py-2"
            onClick={() => {
              if (!keyName.trim()) {
                toast({
                  title: 'Name required',
                  description: 'Give your API key a name.',
                  variant: 'destructive',
                });
                return;
              }
              generateApiKey(keyName);
              toast({
                title: 'API key generated',
                description: 'Copy it now — you will not see it again.',
              });
              setKeyName('');
            }}
          >
            <Plus size={16} /> Generate
          </button>
        </div>
      </div>

      {/* Keys */}
      <div className="smuggler-panel-premium rounded-2xl p-2">
        {apiKeys.length === 0 && (
          <p
            className="p-4 text-sm"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            No API keys yet.
          </p>
        )}
        {apiKeys.map((k, i) => (
          <div
            key={k.id}
            className="flex flex-wrap items-center gap-3 p-4"
            style={{
              borderTop: i > 0 ? '1px solid var(--smuggler-border)' : 'none',
            }}
          >
            <Key size={16} style={{ color: 'var(--smuggler-gold)' }} />
            <div className="min-w-0 flex-1">
              <p
                className="font-medium"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {k.name}
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="text-xs"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                >
                  {revealed[k.id] ? k.key : maskKey(k.key)}
                </code>
                <button
                  onClick={() =>
                    setRevealed({ ...revealed, [k.id]: !revealed[k.id] })
                  }
                  style={{ color: 'var(--smuggler-gold)' }}
                  aria-label={revealed[k.id] ? 'Hide key' : 'Show key'}
                >
                  {revealed[k.id] ? (
                    <EyeOff size={12} />
                  ) : (
                    <Eye size={12} />
                  )}
                </button>
              </div>
              <p
                className="text-xs"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                Created {new Date(k.created).toLocaleDateString()}
                {k.lastUsed
                  ? ` · Last used ${new Date(k.lastUsed).toLocaleDateString()}`
                  : ' · Never used'}
              </p>
            </div>
            <button
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: 'var(--smuggler-red)' }}
              onClick={() => {
                revokeApiKey(k.id);
                toast({
                  title: 'Key revoked',
                  description: `${k.name} can no longer be used.`,
                });
              }}
            >
              <Trash2 size={12} /> Revoke
            </button>
          </div>
        ))}
      </div>

      {/* Webhook */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="smuggler-section-heading mb-4 text-lg"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Webhook URL
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <PremiumInput
              placeholder="https://your-app.com/webhooks/content-smuggler"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />
          </div>
          <button
            className="smuggler-cta-outline !px-4 !py-2"
            onClick={() =>
              toast({
                title: 'Webhook saved',
                description: webhook || 'No URL provided.',
              })
            }
          >
            Save
          </button>
        </div>
      </div>

      {/* Usage stats */}
      <div className="smuggler-panel-premium rounded-2xl p-6">
        <h3
          className="smuggler-section-heading mb-4 text-lg"
          style={{ color: 'var(--smuggler-text)' }}
        >
          Usage This Month
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { l: 'Requests', v: '12,480' },
            { l: 'Avg latency', v: '142ms' },
            { l: 'Error rate', v: '0.2%' },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: 'rgba(192,152,88,0.05)' }}
            >
              <p
                className="text-2xl font-bold"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {s.v}
              </p>
              <p
                className="text-[0.65rem] uppercase tracking-wider"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Tab 9 — Danger Zone
   ============================================================ */

function DangerZoneTab() {
  const deleteAccount = useUserStore((s) => s.deleteAccount);
  const resetPreferences = useUserStore((s) => s.resetPreferences);
  const { toast } = useToast();
  const [open, setOpen] = useState<null | 'delete' | 'reset' | 'data'>(null);
  const [pw, setPw] = useState('');

  const confirm = () => {
    if (!pw) {
      toast({
        title: 'Password required',
        description: 'Enter your password to confirm.',
        variant: 'destructive',
      });
      return;
    }
    if (open === 'delete') {
      deleteAccount();
      toast({
        title: 'Account deleted',
        description: 'All your data has been removed.',
      });
    } else if (open === 'reset') {
      resetPreferences();
      toast({
        title: 'Preferences reset',
        description: 'All settings restored to defaults.',
      });
    } else if (open === 'data') {
      deleteAccount();
      toast({
        title: 'All data deleted',
        description: 'Your content has been permanently removed.',
      });
    }
    setOpen(null);
    setPw('');
  };

  const actions: {
    id: 'delete' | 'reset' | 'data';
    title: string;
    desc: string;
    btn: string;
  }[] = [
    {
      id: 'delete',
      title: 'Delete Account',
      desc: 'Permanently delete your account and all associated data. This cannot be undone.',
      btn: 'Delete account',
    },
    {
      id: 'reset',
      title: 'Reset All Preferences',
      desc: 'Restore all preferences, notifications and workspace settings to defaults.',
      btn: 'Reset preferences',
    },
    {
      id: 'data',
      title: 'Delete All Content Data',
      desc: 'Remove all generated content, drafts and library items. Your account stays.',
      btn: 'Delete data',
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={AlertTriangle}
        title="Danger Zone"
        subtitle="Irreversible actions. Proceed with caution."
      />

      <motion.div
        className="rounded-2xl border-2 p-6"
        style={{
          borderColor: 'var(--smuggler-red)',
          background: 'rgba(168,72,65,0.04)',
        }}
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(168,72,65,0.0)',
            '0 0 24px 0 rgba(168,72,65,0.18)',
            '0 0 0 0 rgba(168,72,65,0.0)',
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="space-y-4">
          {actions.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
              style={{ backgroundColor: 'var(--smuggler-bg-panel)' }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="font-semibold"
                  style={{ color: 'var(--smuggler-red)' }}
                >
                  {a.title}
                </p>
                <p
                  className="text-sm"
                  style={{ color: 'var(--smuggler-text-secondary)' }}
                >
                  {a.desc}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-105"
                style={{ backgroundColor: 'var(--smuggler-red)' }}
                onClick={() => {
                  setOpen(a.id);
                  setPw('');
                }}
              >
                <Trash2 size={14} /> {a.btn}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <Dialog
        open={open !== null}
        onOpenChange={(o) => {
          if (!o) {
            setOpen(null);
            setPw('');
          }
        }}
      >
        <DialogContent>
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} style={{ color: 'var(--smuggler-red)' }} />
            <h3
              className="smuggler-section-heading text-xl"
              style={{ color: 'var(--smuggler-text)' }}
            >
              {open === 'delete'
                ? 'Delete Account'
                : open === 'reset'
                ? 'Reset Preferences'
                : 'Delete All Data'}
            </h3>
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--smuggler-text-secondary)' }}
          >
            This action is irreversible. Please enter your password to confirm.
          </p>
          <PremiumInput
            type="password"
            placeholder="Your password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              className="smuggler-cta-outline !px-4 !py-2"
              onClick={() => {
                setOpen(null);
                setPw('');
              }}
            >
              Cancel
            </button>
            <button
              className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--smuggler-red)' }}
              onClick={confirm}
            >
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Main SettingsView
   ============================================================ */

export function SettingsView({ onNavigate }: SettingsViewProps) {
  const hydrate = useUserStore((s) => s.hydrate);
  const [active, setActive] = useState<TabId>('profile');
  const billing = useUserStore((s) => s.billing);
  const displayName = useDisplayName();
  const avatar = useAvatar();
  const { toast } = useToast();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleBack = () => onNavigate('studio');

  return (
    <div className="min-h-screen" style={{ background: 'var(--smuggler-bg)' }}>
      {/* Hero */}
      <div
        className="smuggler-bg-premium relative border-b"
        style={{ borderColor: 'var(--smuggler-border)' }}
      >
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8 lg:px-16">
          <div className="mb-6">
            <BackButton onBack={handleBack} label="Studio" />
          </div>
          <div className="smuggler-hero-title-wrap">
            <h1
              className="smuggler-section-heading text-4xl sm:text-5xl"
              style={{
                background:
                  'linear-gradient(135deg, var(--smuggler-gold) 0%, var(--smuggler-text) 60%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Account Settings
            </h1>
          </div>
          <p
            className="mt-2 text-base"
            style={{ color: 'var(--smuggler-text-secondary)' }}
          >
            Manage your profile, preferences and account security.
          </p>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8 lg:px-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          {/* Tabs */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            {/* Mobile horizontal scroll */}
            <div className="smuggler-scroll-hide flex gap-2 overflow-x-auto pb-2 lg:hidden">
              {TABS.map((t) => {
                const isActive = active === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActive(t.id)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                    style={{
                      backgroundColor: isActive
                        ? 'rgba(192,152,88,0.12)'
                        : 'transparent',
                      color: isActive
                        ? 'var(--smuggler-gold)'
                        : 'var(--smuggler-text-secondary)',
                      border: '1px solid var(--smuggler-border)',
                    }}
                  >
                    <t.icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>
            {/* Desktop vertical */}
            <nav
              className="hidden lg:flex lg:flex-col lg:gap-1"
              aria-label="Settings sections"
            >
              {TABS.map((t) => {
                const isActive = active === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActive(t.id)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive
                        ? 'rgba(192,152,88,0.1)'
                        : 'transparent',
                      color: isActive
                        ? 'var(--smuggler-gold)'
                        : 'var(--smuggler-text-secondary)',
                      borderLeft: isActive
                        ? '3px solid var(--smuggler-gold)'
                        : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.backgroundColor =
                          'rgba(192,152,88,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <t.icon size={16} /> {t.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              >
                {active === 'profile' && <ProfileTab />}
                {active === 'security' && <SecurityTab />}
                {active === 'notifications' && <NotificationsTab />}
                {active === 'connected' && <ConnectedAccountsTab />}
                {active === 'preferences' && <PreferencesTab />}
                {active === 'billing' && <BillingTab />}
                {active === 'team' && <TeamTab />}
                {active === 'api' && <ApiTab />}
                {active === 'danger' && <DangerZoneTab />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Right sidebar */}
          <aside className="sticky top-6 hidden self-start xl:flex xl:flex-col xl:gap-4">
            {/* Plan card */}
            <div className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5">
              <p
                className="text-[0.7rem] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                Your plan
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Crown size={16} style={{ color: 'var(--smuggler-gold)' }} />
                <p
                  className="text-xl font-bold"
                  style={{ color: 'var(--smuggler-text)' }}
                >
                  {PLAN_META[billing.plan].name}
                </p>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--smuggler-text-muted)' }}>
                    Usage
                  </span>
                  <span style={{ color: 'var(--smuggler-text)' }}>
                    {billing.usage}/{billing.usageLimit}
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 overflow-hidden rounded-full"
                  style={{ backgroundColor: 'rgba(192,152,88,0.15)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (billing.usage / billing.usageLimit) * 100,
                      )}%`,
                      backgroundColor: 'var(--smuggler-gold)',
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="smuggler-cta-outline mt-4 w-full !py-2 text-xs"
                onClick={() => setActive('billing')}
              >
                Manage subscription
              </button>
            </div>

            {/* Profile mini */}
            <button
              type="button"
              onClick={() => setActive('profile')}
              className="smuggler-panel-premium w-full rounded-2xl p-5 text-left"
            >
              <div className="flex items-center gap-3">
                <img
                  src={avatar}
                  alt={displayName}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  style={{ border: '1px solid var(--smuggler-border)' }}
                />
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: 'var(--smuggler-text)' }}
                  >
                    {displayName}
                  </p>
                  <p
                    className="truncate text-xs"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  >
                    View profile
                  </p>
                </div>
              </div>
            </button>

            {/* Quick actions */}
            <div className="smuggler-panel-premium rounded-2xl p-5">
              <p
                className="mb-3 text-[0.7rem] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                Quick actions
              </p>
              <div className="space-y-1">
                {[
                  {
                    l: 'Download my data',
                    fn: () =>
                      toast({
                        title: 'Preparing download',
                        description: 'You will get an email when ready.',
                      }),
                  },
                  {
                    l: 'Export my content',
                    fn: () =>
                      toast({
                        title: 'Export started',
                        description: 'Your content is being packaged.',
                      }),
                  },
                  {
                    l: 'Delete account',
                    fn: () => setActive('danger'),
                  },
                ].map((a) => (
                  <button
                    key={a.l}
                    type="button"
                    onClick={a.fn}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors"
                    style={{ color: 'var(--smuggler-text-secondary)' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        'rgba(192,152,88,0.06)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    {a.l}
                    <ChevronDown
                      size={14}
                      className="-rotate-90"
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Help */}
            <div className="smuggler-panel-premium rounded-2xl p-5">
              <p
                className="mb-3 text-[0.7rem] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                Need help?
              </p>
              <div className="space-y-1">
                {['Help Center', 'Contact Support', 'Community Forum', 'Status Page'].map(
                  (l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() =>
                        toast({
                          title: l,
                          description: 'Opening in a new tab…',
                        })
                      }
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
                      style={{ color: 'var(--smuggler-text-secondary)' }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          'rgba(192,152,88,0.06)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      {l}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Home button */}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="smuggler-cta-outline w-full !py-2 text-sm"
            >
              <Home size={14} /> Back to Home
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
