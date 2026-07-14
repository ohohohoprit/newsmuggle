/**
 * Billing provider registry — singleton instances + selection by env.
 *
 * The active provider is determined by the BILLING_PROVIDER env var:
 *   - 'stripe'    → StripeBillingProvider
 *   - 'razorpay'  → RazorpayBillingProvider
 *   - 'none'      → ManualBillingProvider (default)
 *
 * If the configured provider isn't available (missing API keys), the
 * system falls back to the manual provider so subscriptions can still
 * be created/managed locally.
 */
import type { BillingProviderSlug } from '@/lib/billing/types';
import { BillingProvider } from '@/lib/billing/providers/base';
import { StripeBillingProvider } from '@/lib/billing/providers/stripe';
import { RazorpayBillingProvider } from '@/lib/billing/providers/razorpay';
import { ManualBillingProvider } from '@/lib/billing/providers/manual';

// ===== Singleton instances =====

const stripeProvider = new StripeBillingProvider();
const razorpayProvider = new RazorpayBillingProvider();
const manualProvider = new ManualBillingProvider();

const providerMap = new Map<BillingProviderSlug, BillingProvider>([
  ['stripe', stripeProvider],
  ['razorpay', razorpayProvider],
  ['none', manualProvider],
]);

// ===== Public API =====

/** Get the configured provider (from BILLING_PROVIDER env var). */
export function getConfiguredProvider(): BillingProvider {
  const configured = (process.env.BILLING_PROVIDER ?? 'none').trim().toLowerCase() as BillingProviderSlug;
  const provider = providerMap.get(configured) ?? manualProvider;

  // If the configured provider isn't available (missing keys), fall back to manual
  if (!provider.isConfigured()) {
    return manualProvider;
  }
  return provider;
}

/** Get a specific provider by slug. */
export function getProvider(slug: BillingProviderSlug): BillingProvider {
  return providerMap.get(slug) ?? manualProvider;
}

/** Get all registered providers with their availability. */
export function listProviders(): Array<{
  slug: BillingProviderSlug;
  name: string;
  configured: boolean;
  isDefault: boolean;
}> {
  const defaultSlug = (process.env.BILLING_PROVIDER ?? 'none').trim().toLowerCase() as BillingProviderSlug;
  return Array.from(providerMap.entries()).map(([slug, provider]) => ({
    slug,
    name: provider.name,
    configured: provider.isConfigured(),
    isDefault: slug === defaultSlug,
  }));
}

/** Get the configured provider's slug. */
export function getConfiguredProviderSlug(): BillingProviderSlug {
  return getConfiguredProvider().slug;
}
