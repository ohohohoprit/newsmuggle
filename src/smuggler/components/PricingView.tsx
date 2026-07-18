'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Cloud,
  Smartphone,
  RefreshCw,
  Wrench,
  Users,
  MessageSquare,
  Gift,
  ChevronDown,
  ArrowRight,
  Zap,
  Crown,
  Building2,
  Rocket,
} from 'lucide-react';
import BackButton from '@/smuggler/components/BackButton';

export interface PricingViewProps {
  onNavigate: (view: 'home' | 'tools' | 'library' | 'studio') => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

/* ------------------------------------------------------------------ */
/* Types & data                                                        */
/* ------------------------------------------------------------------ */

type Billing = 'monthly' | 'yearly';

interface Plan {
  id: 'starter' | 'creator' | 'agency';
  name: string;
  tagline: string;
  monthly: number;
  yearly: number; // per month, billed yearly
  icon: typeof Sparkles;
  features: string[];
  cta: string;
  ctaClass: 'outline' | 'premium' | 'gold';
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For creators just getting started',
    monthly: 0,
    yearly: 0,
    icon: Sparkles,
    features: [
      '5 tools per day',
      'Basic AI generation',
      'Community support',
      '1GB storage',
    ],
    cta: 'Get Started Free',
    ctaClass: 'outline',
  },
  {
    id: 'creator',
    name: 'Creator',
    tagline: 'For serious creators & solopreneurs',
    monthly: 19,
    yearly: 15,
    icon: Crown,
    features: [
      'Unlimited tools',
      'Advanced AI models',
      'Priority support',
      '10GB storage',
      'All premium tools',
      'Export & download',
    ],
    cta: 'Upgrade to Creator',
    ctaClass: 'premium',
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'For teams and agencies',
    monthly: 49,
    yearly: 39,
    icon: Building2,
    features: [
      'Everything in Creator',
      'Team access (5 seats)',
      'White-label exports',
      'API access',
      'Custom branding',
      '50GB storage',
      'Dedicated manager',
    ],
    cta: 'Upgrade to Agency',
    ctaClass: 'gold',
  },
];

interface CompareRow {
  label: string;
  starter: string | boolean;
  creator: string | boolean;
  agency: string | boolean;
}

const COMPARE_ROWS: CompareRow[] = [
  { label: 'Tool Usage', starter: '5/day', creator: 'Unlimited', agency: 'Unlimited' },
  { label: 'Premium Tools', starter: false, creator: true, agency: true },
  { label: 'AI Generations', starter: 'Basic', creator: 'Advanced', agency: 'Advanced' },
  { label: 'Storage', starter: '1GB', creator: '10GB', agency: '50GB' },
  { label: 'Export', starter: false, creator: true, agency: true },
  { label: 'Support', starter: 'Community', creator: 'Priority', agency: 'Dedicated' },
  { label: 'Team Seats', starter: '1', creator: '1', agency: '5' },
  { label: 'API Access', starter: false, creator: false, agency: true },
  { label: 'White-label', starter: false, creator: false, agency: true },
  { label: 'Custom Branding', starter: false, creator: false, agency: true },
];

const UNIVERSAL_FEATURES = [
  { icon: ShieldCheck, label: '256-bit encryption' },
  { icon: Cloud, label: 'Cloud sync' },
  { icon: Smartphone, label: 'Mobile access' },
  { icon: RefreshCw, label: 'Regular updates' },
  { icon: Wrench, label: '95+ tools' },
  { icon: Zap, label: 'AI-powered' },
  { icon: Users, label: 'Community access' },
  { icon: Gift, label: 'No setup fees' },
] as const;

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. You can cancel your subscription at any time from your account settings. You will retain access to premium features until the end of your current billing period — no questions asked.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Starter plan is free forever, no credit card required. Paid plans (Creator & Agency) come with a 7-day money-back guarantee so you can try every premium feature risk-free.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express), PayPal, and UPI for customers in supported regions. All payments are processed through secure, PCI-compliant gateways.',
  },
  {
    q: 'Can I upgrade later?',
    a: 'Yes — you can upgrade, downgrade, or switch between monthly and yearly billing at any time. Changes are prorated automatically so you only pay for what you use.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer a 7-day money-back guarantee on all paid plans. If you are not satisfied within the first 7 days, contact our support team for a full refund — no hassle.',
  },
  {
    q: 'Is my data secure?',
    a: 'Your data is protected with 256-bit AES encryption in transit and at rest. We never share or sell your content, and you can export or delete your data at any time. We are GDPR and CCPA compliant.',
  },
];

const PAYMENT_METHODS = [
  { label: 'VISA', bg: '#1A1F71', color: '#fff' },
  { label: 'Mastercard', bg: '#EB001B', color: '#fff' },
  { label: 'Amex', bg: '#006FCF', color: '#fff' },
  { label: 'PayPal', bg: '#003087', color: '#fff' },
  { label: 'UPI', bg: '#09B5BD', color: '#fff' },
];

/* ------------------------------------------------------------------ */
/* Animation variants                                                  */
/* ------------------------------------------------------------------ */

const SECTION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut', staggerChildren: 0.07 },
  },
};

const CHILD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

/* ------------------------------------------------------------------ */
/* Billing toggle                                                      */
/* ------------------------------------------------------------------ */

function BillingToggle({
  billing,
  setBilling,
}: {
  billing: Billing;
  setBilling: (b: Billing) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative inline-flex rounded-full p-1"
        style={{
          backgroundColor: 'rgba(0,0,0,0.04)',
          border: '1px solid var(--smuggler-border)',
        }}
      >
        {(['monthly', 'yearly'] as const).map((b) => {
          const active = billing === b;
          return (
            <button
              key={b}
              type="button"
              onClick={() => setBilling(b)}
              className="relative z-10 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors"
              style={{
                color: active ? 'var(--smuggler-text)' : 'var(--smuggler-text-muted)',
              }}
            >
              {active && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: 'var(--smuggler-bg-panel)',
                    border: '1px solid rgba(192,152,88,0.4)',
                    boxShadow: '0 2px 8px rgba(192,152,88,0.16)',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 capitalize">{b}</span>
              {b === 'yearly' && (
                <span
                  className="relative z-10 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase"
                  style={{
                    backgroundColor: 'rgba(45,90,61,0.14)',
                    color: 'var(--smuggler-green)',
                  }}
                >
                  Save 20%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing card                                                        */
/* ------------------------------------------------------------------ */

function PricingCard({
  plan,
  billing,
  onCta,
}: {
  plan: Plan;
  billing: Billing;
  onCta: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const Icon = plan.icon;
  const price = billing === 'monthly' ? plan.monthly : plan.yearly;
  const isFree = plan.monthly === 0;
  const showOriginal =
    !isFree && billing === 'yearly' && plan.monthly !== plan.yearly;

  const ctaClassMap: Record<Plan['ctaClass'], string> = {
    outline: 'smuggler-cta-outline',
    premium: 'smuggler-cta-premium',
    gold: 'smuggler-cta-gold',
  };

  return (
    <motion.div
      variants={CHILD_VARIANTS}
      whileHover={{ y: -6, scale: plan.popular ? 1.06 : 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`smuggler-panel-premium smuggler-paper-grain relative flex flex-col rounded-2xl p-6 sm:p-7 ${
        plan.popular ? 'lg:scale-[1.05] lg:z-10' : ''
      }`}
      style={
        plan.popular
          ? {
              borderColor: 'rgba(192,152,88,0.55)',
              boxShadow: `0 1px 0 0 rgba(255,255,255,0.7) inset, 0 0 0 1px rgba(192,152,88,0.3), 0 18px 50px -12px rgba(192,152,88,0.32)${isDark ? '' : ', 0 0 40px rgba(192,152,88,0.18)'}`,
            }
          : undefined
      }
    >
      {plan.popular && (
        <motion.div
          initial={{ opacity: 0, rotate: -8, y: -10 }}
          animate={{ opacity: 1, rotate: 0, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          <span
            className="flex items-center gap-1 rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-white"
            style={{
              backgroundColor: 'var(--smuggler-gold)',
              boxShadow: '0 4px 12px rgba(192,152,88,0.45)',
            }}
          >
            <Crown size={11} />
            Most Popular
          </span>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: plan.popular
              ? 'rgba(192,152,88,0.14)'
              : 'rgba(45,90,61,0.1)',
            border: plan.popular
              ? '1px solid rgba(192,152,88,0.35)'
              : '1px solid rgba(45,90,61,0.22)',
            color: plan.popular
              ? 'var(--smuggler-gold)'
              : 'var(--smuggler-green)',
          }}
        >
          <Icon size={20} />
        </div>
        <div>
          <h3
            className="font-serif text-xl font-bold leading-tight"
            style={{ color: 'var(--smuggler-text)' }}
          >
            {plan.name}
          </h3>
          <p className="text-xs" style={{ color: 'var(--smuggler-text-secondary)' }}>
            {plan.tagline}
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="mt-5 flex items-end gap-2">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={price}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="font-serif text-4xl font-bold"
            style={{ color: 'var(--smuggler-text)' }}
          >
            ${price}
          </motion.span>
        </AnimatePresence>
        <span
          className="mb-1 text-sm font-medium"
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          {isFree ? '/forever' : '/mo'}
        </span>
      </div>

      {showOriginal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-1 flex items-center gap-2 text-xs"
        >
          <span
            className="line-through"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            ${plan.monthly}/mo
          </span>
          <span
            className="rounded-full px-2 py-0.5 font-bold uppercase"
            style={{
              backgroundColor: 'rgba(45,90,61,0.12)',
              color: 'var(--smuggler-green)',
            }}
          >
            Save 20%
          </span>
        </motion.div>
      )}

      {plan.popular && (
        <p
          className="mt-2 text-xs font-semibold"
          style={{ color: 'var(--smuggler-gold)' }}
        >
          7-day money-back guarantee
        </p>
      )}

      {/* Features */}
      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <span
              className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(45,90,61,0.12)',
                color: 'var(--smuggler-green)',
              }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
            <span style={{ color: 'var(--smuggler-text-secondary)' }}>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onCta}
        className={`${ctaClassMap[plan.ctaClass]} mt-6 w-full justify-center`}
      >
        {plan.cta}
        <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Comparison table                                                    */
/* ------------------------------------------------------------------ */

function CompareCell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check
        size={16}
        className="mx-auto"
        style={{ color: 'var(--smuggler-green)' }}
        strokeWidth={3}
      />
    ) : (
      <X
        size={16}
        className="mx-auto"
        style={{ color: 'var(--smuggler-text-muted)' }}
      />
    );
  }
  return (
    <span
      className="text-sm font-medium"
      style={{ color: 'var(--smuggler-text)' }}
    >
      {value}
    </span>
  );
}

function ComparisonTable() {
  return (
    <motion.div
      variants={CHILD_VARIANTS}
      className="smuggler-panel-premium smuggler-paper-grain overflow-hidden rounded-2xl"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="sticky top-0 z-10">
              <th
                className="p-4 text-left text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'var(--smuggler-bg-panel)',
                  color: 'var(--smuggler-text-muted)',
                  borderBottom: '1px solid var(--smuggler-border)',
                }}
              >
                Feature
              </th>
              {PLANS.map((p) => (
                <th
                  key={p.id}
                  className="p-4 text-center text-sm font-bold"
                  style={{
                    backgroundColor: p.popular
                      ? 'rgba(192,152,88,0.08)'
                      : 'var(--smuggler-bg-panel)',
                    color: 'var(--smuggler-text)',
                    borderBottom: p.popular
                      ? '2px solid var(--smuggler-gold)'
                      : '1px solid var(--smuggler-border)',
                  }}
                >
                  {p.name}
                  {p.popular && (
                    <span
                      className="ml-1.5 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase"
                      style={{
                        backgroundColor: 'var(--smuggler-gold)',
                        color: '#fff',
                      }}
                    >
                      Popular
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row, i) => (
              <motion.tr
                key={row.label}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="group transition-colors hover:bg-[rgba(192,152,88,0.05)]"
                style={{
                  borderBottom: '1px solid var(--smuggler-border)',
                }}
              >
                <td
                  className="p-4 text-left text-sm font-semibold"
                  style={{ color: 'var(--smuggler-text)' }}
                >
                  {row.label}
                </td>
                <td
                  className="p-4 text-center transition-colors group-hover:bg-[rgba(0,0,0,0.02)]"
                  style={{ color: 'var(--smuggler-text-secondary)' }}
                >
                  <CompareCell value={row.starter} />
                </td>
                <td
                  className="p-4 text-center transition-colors group-hover:bg-[rgba(192,152,88,0.06)]"
                  style={{ backgroundColor: 'rgba(192,152,88,0.03)' }}
                >
                  <CompareCell value={row.creator} />
                </td>
                <td
                  className="p-4 text-center transition-colors group-hover:bg-[rgba(0,0,0,0.02)]"
                  style={{ color: 'var(--smuggler-text-secondary)' }}
                >
                  <CompareCell value={row.agency} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ accordion                                                       */
/* ------------------------------------------------------------------ */

function FaqItem({
  q,
  a,
  isOpen,
  onToggle,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="smuggler-panel-premium overflow-hidden rounded-xl"
      style={{ borderRadius: '0.75rem' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={isOpen}
      >
        <span
          className="font-serif text-base font-bold"
          style={{ color: 'var(--smuggler-text)' }}
        >
          {q}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'rgba(192,152,88,0.1)',
            color: 'var(--smuggler-gold)',
          }}
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p
              className="px-5 pb-5 text-sm leading-relaxed"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
}) {
  return (
    <motion.div variants={CHILD_VARIANTS} className="mx-auto mb-10 max-w-2xl text-center">
      {eyebrow && (
        <span
          className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em]"
          style={{
            backgroundColor: 'rgba(192,152,88,0.1)',
            border: '1px solid rgba(192,152,88,0.25)',
            color: 'var(--smuggler-gold)',
          }}
        >
          <Sparkles size={11} />
          {eyebrow}
        </span>
      )}
      <h2
        className="smuggler-section-heading text-3xl font-bold sm:text-4xl"
        style={{ color: 'var(--smuggler-text)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="mt-3 text-base"
          style={{ color: 'var(--smuggler-text-secondary)' }}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Main PricingView                                                    */
/* ------------------------------------------------------------------ */

export function PricingView({ onNavigate, onOpenAuth }: PricingViewProps) {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const handlePlanCta = (plan: Plan) => {
    if (plan.id === 'starter') {
      onOpenAuth('signup');
    } else {
      onOpenAuth('signup');
    }
  };

  return (
    <div
      className="smuggler-bg-premium relative w-full overflow-hidden"
      style={{ backgroundColor: 'var(--smuggler-bg)' }}
    >
      {/* Subtle paper texture overlay across whole page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/smuggler/assets/paper-grain-noise.jpg)',
          backgroundSize: '240px 240px',
          mixBlendMode: 'multiply',
          opacity: isDark ? 0.05 : 0.06,
        }}
      />

      <motion.div
        variants={SECTION_VARIANTS}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-8 lg:px-16 lg:py-20"
      >
        {/* ===================== HERO HEADER ===================== */}
        <motion.div variants={CHILD_VARIANTS} className="mx-auto mb-10 max-w-3xl text-center">
          <span
            className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em]"
            style={{
              backgroundColor: 'rgba(45,90,61,0.1)',
              border: '1px solid rgba(45,90,61,0.25)',
              color: 'var(--smuggler-green)',
            }}
          >
            <ShieldCheck size={11} />
            Pricing Dossier
          </span>

          <div className="mb-4">
            <BackButton onBack={() => onNavigate('home')} label="Home" />
          </div>

          <div className="smuggler-hero-title-wrap">
            <h1
              className="smuggler-hero-title font-serif text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl"
              style={{
                backgroundImage:
                  'linear-gradient(120deg, var(--smuggler-gold) 0%, #E6C078 40%, var(--smuggler-gold) 80%)',
              }}
            >
              Simple Pricing.
              <br />
              Unlimited Potential.
            </h1>
          </div>
          <p
            className="mx-auto mt-5 max-w-xl text-base sm:text-lg"
            style={{ color: 'var(--smuggler-text-secondary)' }}
          >
            Choose the plan that fits your mission. Upgrade, downgrade, or cancel
            anytime.
          </p>

          <div className="mt-8">
            <BillingToggle billing={billing} setBilling={setBilling} />
          </div>
        </motion.div>

        {/* ===================== PRICING CARDS ===================== */}
        <motion.div
          variants={CHILD_VARIANTS}
          className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8"
        >
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billing={billing}
              onCta={() => handlePlanCta(plan)}
            />
          ))}
        </motion.div>

        {/* ===================== COMPARISON TABLE ===================== */}
        <motion.section
          variants={SECTION_VARIANTS}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-24"
        >
          <SectionHeading
            eyebrow="Field Manual"
            title="Compare every advantage"
            subtitle="A side-by-side breakdown of what each clearance level unlocks."
          />
          <ComparisonTable />
        </motion.section>

        {/* ===================== ALL PLANS INCLUDE ===================== */}
        <motion.section
          variants={SECTION_VARIANTS}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-24"
        >
          <SectionHeading
            eyebrow="Standard Issue"
            title="Every plan includes"
            subtitle="No matter which tier you choose, these essentials come standard."
          />
          <motion.div
            variants={CHILD_VARIANTS}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {UNIVERSAL_FEATURES.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                whileHover={{ y: -4 }}
                className="smuggler-hook-card flex flex-col items-center gap-3 rounded-xl p-5 text-center"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: 'rgba(192,152,88,0.12)',
                    border: '1px solid rgba(192,152,88,0.25)',
                    color: 'var(--smuggler-gold)',
                  }}
                >
                  <Icon size={20} />
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
        </motion.section>

        {/* ===================== FAQ ===================== */}
        <motion.section
          variants={SECTION_VARIANTS}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-24"
        >
          <SectionHeading
            eyebrow="Interrogation Room"
            title="Frequently asked questions"
            subtitle="Straight answers from our field agents."
          />
          <motion.div
            variants={CHILD_VARIANTS}
            className="mx-auto flex max-w-3xl flex-col gap-3"
          >
            {FAQS.map((item, i) => (
              <FaqItem
                key={item.q}
                q={item.q}
                a={item.a}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </motion.div>
        </motion.section>

        {/* ===================== FINAL CTA ===================== */}
        <motion.section
          variants={SECTION_VARIANTS}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-24"
        >
          <motion.div
            variants={CHILD_VARIANTS}
            className="smuggler-panel-premium smuggler-paper-grain relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 0%, rgba(192,152,88,0.12), transparent 50%), radial-gradient(circle at 80% 100%, rgba(45,90,61,0.1), transparent 50%)',
            }}
          >
            {/* Mascot floating */}
            <motion.img
              src="/smuggler/assets/mascot-auth.png"
              alt="Detective mascot with magnifying glass"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute -right-4 bottom-0 hidden h-56 w-auto object-contain lg:block xl:h-64"
              style={{
                mixBlendMode: isDark ? 'normal' : 'multiply',
                filter: isDark
                  ? 'drop-shadow(0 16px 32px rgba(0,0,0,0.5))'
                  : 'drop-shadow(0 12px 24px rgba(60,40,10,0.16))',
                opacity: isDark ? 0.9 : 1,
              }}
            />

            <span
              className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em]"
              style={{
                backgroundColor: 'rgba(192,152,88,0.12)',
                border: '1px solid rgba(192,152,88,0.3)',
                color: 'var(--smuggler-gold)',
              }}
            >
              <Rocket size={11} />
              Begin Your Mission
            </span>

            <h2
              className="font-serif text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
              style={{ color: 'var(--smuggler-text)' }}
            >
              Ready to smuggle your content
              <br />
              to{' '}
              <span style={{ color: 'var(--smuggler-green)' }}>success</span>?
            </h2>
            <p
              className="mx-auto mt-4 max-w-lg text-base"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              Join 10,000+ creators already using Content Smuggler to outrun the
              algorithm. Start free — no credit card required.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:pr-72">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth('signup')}
                className="smuggler-cta-gold w-full justify-center sm:w-auto"
              >
                Get Started Free
                <ArrowRight size={16} />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('tools')}
                className="smuggler-cta-outline w-full justify-center sm:w-auto"
              >
                Explore Tools
              </motion.button>
            </div>
          </motion.div>
        </motion.section>

        {/* ===================== PAYMENT ICONS ===================== */}
        <motion.div
          variants={CHILD_VARIANTS}
          className="mt-16 flex flex-col items-center gap-4"
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            Secured &amp; trusted payment options
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PAYMENT_METHODS.map((m) => (
              <div
                key={m.label}
                className="flex h-9 items-center rounded-lg px-3 text-xs font-bold tracking-wide shadow-sm"
                style={{
                  backgroundColor: m.bg,
                  color: m.color,
                }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <p
            className="mt-2 flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            <ShieldCheck size={13} style={{ color: 'var(--smuggler-green)' }} />
            256-bit SSL encrypted checkout · PCI DSS compliant
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default PricingView;
