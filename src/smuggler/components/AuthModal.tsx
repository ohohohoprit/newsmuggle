'use client';

import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Crosshair,
  UserSearch,
  User,
  Chrome,
  Apple,
  Github,
} from 'lucide-react';

export interface AuthModalProps {
  open: boolean;
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
  onAuthSuccess: () => void;
}

const SOCIAL_BUTTONS: { Icon: typeof Chrome; label: string }[] = [
  { Icon: Chrome, label: 'Continue with Google' },
  { Icon: Apple, label: 'Continue with Apple' },
  { Icon: Github, label: 'Continue with GitHub' },
];

export function AuthModal({
  open,
  mode,
  onClose,
  onSwitchMode,
  onAuthSuccess,
}: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear error and reset loading state when the user toggles modes.
  // (Adjusting state during render — the React-recommended pattern for
  // "reset state when a prop changes".)
  const [prevMode, setPrevMode] = useState(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    setError('');
    setLoading(false);
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onAuthSuccess();
      // Reset form state for next time.
      setEmail('');
      setPassword('');
      setName('');
      setError('');
      setShowPassword(false);
      onClose();
    }, 1200);
  };

  const isLogin = mode === 'login';
  const title = isLogin ? 'Welcome back' : 'Join the network';
  const subtitle = isLogin
    ? 'Log in to your Content Smuggler account'
    : 'Create your Content Smuggler account';
  const submitLabel = loading
    ? isLogin
      ? 'Logging in...'
      : 'Creating account...'
    : isLogin
      ? 'Log in to your account'
      : 'Create my account';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="bg-[#13110E] border border-[#24211D] text-[#F4EEDF] rounded-2xl max-w-[440px] w-[92vw] p-0 overflow-hidden gap-0"
      >
        {/* Paper texture overlay */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: 'url(/smuggler/assets/paper-grain-noise.jpg)',
            backgroundSize: 'cover',
            mixBlendMode: 'overlay',
          }}
        />

        <div className="relative z-10 p-8 sm:p-10 max-h-[92vh] overflow-y-auto smuggler-scroll">
          {/* Header */}
          <DialogHeader className="items-center text-center mb-8 gap-0">
            <div className="relative w-11 h-11 rounded-full bg-[#1A3620] border border-[#C09858]/30 flex items-center justify-center mb-4">
              <Crosshair
                className="absolute w-7 h-7 text-[#C09858]"
                strokeWidth={1.5}
              />
              <UserSearch className="w-3.5 h-3.5 text-[#F4EEDF]" />
            </div>
            <DialogTitle className="font-serif text-2xl font-bold mb-2 flex items-center justify-center gap-2 text-[#F4EEDF]">
              {title}
              <UserSearch className="w-7 h-7 text-[#C09858]" />
            </DialogTitle>
            <DialogDescription className="text-sm text-[#9A9386]">
              {subtitle}
            </DialogDescription>
          </DialogHeader>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <Label className="text-xs font-semibold uppercase tracking-wide text-[#9A9386] mb-1.5 block">
                    Full name
                  </Label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3 text-[#9A9386] w-5 h-5 pointer-events-none" />
                    <Input
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-black/30 border-[#24211D] text-[#F4EEDF] placeholder:text-[#6B655E] rounded-lg pl-11 pr-4 py-3 h-auto text-sm focus:border-[#C09858]/60 focus-visible:ring-[#C09858]/20"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email field */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-[#9A9386] mb-1.5 block">
                Email address
              </Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 text-[#9A9386] w-5 h-5 pointer-events-none" />
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/30 border-[#24211D] text-[#F4EEDF] placeholder:text-[#6B655E] rounded-lg pl-11 pr-4 py-3 h-auto text-sm focus:border-[#C09858]/60 focus-visible:ring-[#C09858]/20"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-[#9A9386] mb-1.5 block">
                Password
              </Label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-[#9A9386] w-5 h-5 pointer-events-none" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/30 border-[#24211D] text-[#F4EEDF] placeholder:text-[#6B655E] rounded-lg pl-11 pr-11 py-3 h-auto text-sm focus:border-[#C09858]/60 focus-visible:ring-[#C09858]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 text-[#9A9386] hover:text-[#C09858] transition p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {isLogin && (
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    className="text-xs text-[#9A9386] hover:text-[#C09858] transition"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-[#A84841]/30 bg-[#A84841]/10 px-4 py-3 text-sm text-[#EC7063] flex items-center gap-2"
                role="alert"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="smuggler-btn smuggler-btn-primary w-full rounded-lg py-3 font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{submitLabel}</span>
                </>
              ) : (
                <>
                  <span>{submitLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#24211D]" />
            <span className="text-xs text-[#6B655E] uppercase tracking-wider">
              or continue with
            </span>
            <div className="flex-1 h-px bg-[#24211D]" />
          </div>

          {/* Social buttons */}
          <div className="flex flex-col gap-2">
            {SOCIAL_BUTTONS.map(({ Icon, label }) => (
              <button
                key={label}
                type="button"
                className="flex items-center justify-center gap-3 rounded-lg border border-[#24211D] bg-black/20 px-4 py-3 text-sm font-medium text-[#F4EEDF] hover:bg-black/40 hover:border-[#C09858]/30 transition"
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Switch link */}
          <div className="text-center text-sm text-[#9A9386] mt-6">
            {isLogin ? 'New to Content Smuggler? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => onSwitchMode(isLogin ? 'signup' : 'login')}
              className="text-[#C09858] font-semibold hover:underline"
            >
              {isLogin ? 'Create an account' : 'Log in'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
