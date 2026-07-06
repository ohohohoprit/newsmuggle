# AUTH-PRICING — full-stack-developer

## Task
Build two premium `'use client'` components for the Content Smuggler creator toolkit:
1. `AuthPages.tsx` — full-screen split-screen auth (login / signup / forgot-password) with Email + Mobile OTP tabs, social login (Google + Facebook), password strength meter.
2. `PricingView.tsx` — premium pricing page with animated billing toggle, 3 plans, comparison table, universal features, FAQ accordion, final CTA with mascot, payment icons.

## Inputs Read
- `src/app/globals.css` lines 1-180 (CSS vars light/dark), 670-790 (premium panel/paper-grain classes), 1100-1260 (premium CTA buttons + gold + outline).
- `src/smuggler/components/Navbar.tsx` (NavView / AuthMode types).
- `/public/smuggler/assets/mascot-auth.png` (1536x1024 RGBA transparent detective) + `logo-hq.png` confirmed present.
- `src/smuggler/components/AuthModal.tsx` (existing modal pattern — for reference on social buttons + form patterns).
- `src/app/page.tsx` (integration contract: `onOpenAuth`, `onNavigate`, view-switching).
- Pre-existing `worklog.md` task records 4-a / 4-c for context on established patterns.

## Files Created
1. `/home/z/my-project/src/smuggler/components/AuthPages.tsx` (~1010 lines)
2. `/home/z/my-project/src/smuggler/components/PricingView.tsx` (~560 lines)

## AuthPages.tsx — Structure
- `AuthPages` (default + named export) — main split-screen wrapper.
  - State: `mode` ('login'|'signup'), `subView` ('auth'|'forgot'). Syncs with `initialMode` prop via render-time `prevInitial` pattern.
  - Left panel (45%, `hidden lg:flex`): logo + badge + headline + mascot + features + TOP SECRET stamp.
  - Right panel (55%): back-to-home + form card (`.smuggler-panel-premium .smuggler-paper-grain`).
- `LeftPanel` — promo panel with paper texture, radial gold gradients, 135° classified diagonal lines, floating mascot (`mixBlendMode: multiply` light / `normal` dark via `useTheme`).
- `LoginForm` — Email/Mobile OTP tabs. Email: validation, show/hide password, remember-me, forgot link. Mobile OTP: country code + Send OTP + 6-digit input + 60s countdown + resend + verify.
- `SignupForm` — Email/Mobile OTP tabs. Email: name, email, password (live strength bar), confirm (match check + green Check), user-type dropdown, terms (required). Mobile OTP: same as login + name.
- `ForgotPasswordFlow` — 3-step with animated stepper: email → OTP → new password + confirm → success.
- `MobileOtpForm` — shared OTP form (login uses `requireName=false`, signup uses `requireName=true`).
- Helpers: `OtpInput` (6-box, auto-advance, paste, arrow keys), `PasswordStrengthBar`, `SocialButtons` (Google + Facebook with inline SVGs), `PremiumInput`/`PremiumSelect` wrappers, `AuthTabSelector` (layoutId pill), `Divider`, `FieldLabel`, `InlineError`.
- Auth methods limited to exactly 4: Google, Facebook, Email+Password, Mobile+OTP.

## PricingView.tsx — Structure
- `PricingView` (default + named export) — 7 sections in one scrollable page.
- Sections: (1) Hero header with billing toggle, (2) 3 pricing cards, (3) comparison table, (4) all-plans-include grid, (5) FAQ accordion, (6) final CTA with mascot, (7) payment icons.
- `BillingToggle` — Monthly/Yearly animated pill (`layoutId="billing-pill"`), yearly shows "Save 20%".
- `PricingCard` — Starter/Creator(popular, scaled+gold glow)/Agency. Animated price swap on billing change. Yearly shows struck-through original.
- `ComparisonTable` — sticky thead, 10 rows × 3 plan cols, Creator column highlighted, boolean→Check/X, hover highlights.
- `FaqItem` — AnimatePresence height accordion, rotating chevron.
- `SectionHeading` — eyebrow + `.smuggler-section-heading` title + subtitle.
- Animations: `whileInView` scroll reveals, staggered children, hover lifts, mascot float, shimmer on hero title (`.smuggler-hero-title-wrap::after`).

## Design Compliance
- All colors via `var(--smuggler-*)` CSS vars (theme-aware light/dark).
- Premium classes used: `.smuggler-panel-premium`, `.smuggler-paper-grain`, `.smuggler-cta-premium/outline/gold`, `.smuggler-input-premium`, `.smuggler-hero-title-wrap`, `.smuggler-hero-title`, `.smuggler-bg-premium`, `.smuggler-stamp-secret`, `.smuggler-hook-card`, `.smuggler-section-heading`.
- Framer-motion: entrance, AnimatePresence tab/step transitions, layoutId pills, button hover/tap, mascot float, stamp spring-settle, strength-bar width, success checkmark pop.
- Responsive: mobile-first, left auth panel hidden below `lg`, comparison table horizontally scrollable, grids collapse.
- Mascot `mixBlendMode: multiply` only in light mode (would be invisible on dark bg).

## Verification
- `bun run lint` → clean (0 errors, 0 warnings).
- `bunx tsc --noEmit` → both files have ZERO errors. (Only pre-existing errors in `examples/` and `skills/` folders, out of scope.)
- Dev server running on port 3000, 200 responses.

## Integration Notes (for future wiring task)
- `AuthPages` props: `initialMode`, `onClose`, `onSuccess`, `onSwitchMode`. Recommended: render as a full-view (not modal) when an `authView` state is active, replacing the main content. `onClose` returns to previous view; `onSuccess` redirects to 'library' (matching existing `handleAuthSuccess`).
- `PricingView` props: `onNavigate` (home/tools/library/studio), `onOpenAuth` (login/signup). Recommended: add 'pricing' to `NavView` type and a new view branch in `page.tsx`'s `AnimatePresence`. Navbar's "Pricing" link (currently no `view`) should call `onNavigate('pricing')` once the type is extended.
- Neither file is currently imported in `page.tsx` — wiring is a separate task to avoid breaking the existing view-switch contract.
