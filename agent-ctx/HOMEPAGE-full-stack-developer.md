# Task: HOMEPAGE — Build premium Homepage with 13 sections

**Agent**: full-stack-developer
**Date**: 2025-07-04
**Task ID**: HOMEPAGE
**File created**: `/home/z/my-project/src/smuggler/components/Homepage.tsx` (2446 lines)

## Summary

Built a comprehensive, premium `'use client'` Homepage component with all 13 required sections, using framer-motion throughout for scroll reveal, staggered entrance, animated counters, typewriter effect, 3D tilt mascot, and accordion FAQ.

## Sections built (all 13)

1. **Hero** — Full 92vh hero with gold pill badge, h1 Playfair "Create Legendary Content.", typewriter cycling through 4 phrases (green + `.smuggler-caret-blink`), subtitle, CTA row, social proof (3 avatars + 5 stars + "Loved by 10,000+ Creators"), 4 feature pills. Right column (lg only): 3D mouse-tilt container with `.smuggler-paper` Mission Brief/Objectives/Classified docs + wax seal + floating mascot `/smuggler/assets/mascot-5.png`.
2. **Trusted By** — "TRUSTED BY CREATORS WORLDWIDE" + 6 text logos + 4.9/5 rating.
3. **Statistics** — 4 cards with animated `Counter` (useInView + framer-motion `animate()`): 95+, 2.4M+, 10,000+, 50K+.
4. **Why Content Smuggler** — 3 cards (AI-Powered Intelligence / 95+ Premium Tools / Creator-First Design) with hover gold border + lift.
5. **Feature Highlights** — 3 alternating rows (lg:order-1/lg:order-2) with custom mockup visuals: Hook Generator (3 hooks with score badges), Repurpose Engine (URL → 6 platform tiles), AI Writer (4-phrase cycling mockup with caret).
6. **Popular Creator Tools** — 8 POPULAR_TOOLS cards (motion.button, hover lift + gold border), "View All 95 Tools" gold button.
7. **Creator Workflow** — 4 steps (Describe → Generate → Analyze → Publish) with connecting gradient line.
8. **AI Features** — 3 cards (Smart Scoring / Multi-Platform / Real-Time Analysis) with hover glow effect.
9. **Tool Categories** — 6 CATEGORY_STATS cards as buttons (clickable → onExploreTools).
10. **Testimonials** — 3 cards (Maya Chen / Marcus Reid / Sofia Almeida) with pravatar avatars + 5 stars + serif italic quote.
11. **Pricing Preview** — 3 plans (Free $0, Creator $19/mo highlighted with "MOST POPULAR" + scale(1.05) + gold border + glow, Pro $49/mo).
12. **FAQ** — 5 accordion items with AnimatePresence height animation, single-open pattern, first item open by default.
13. **Final CTA** — Forest green → dark gradient + noise + glow accents, "Ready to Smuggle Your Content to Success?" headline, 2 CTAs (gold Get Started Free + outline Explore Tools), 3 reassurance checkmarks, floating mascot on right (lg only).

## Key technical decisions

- **`useTypewriter` hook**: ref-based recursive `setTimeout` (idxRef/phraseRef/modeRef) avoids stale closures; phrases constant hoisted to module scope so effect deps array stays empty.
- **`Counter`**: framer-motion's `animate(0, value, { duration: 2, onUpdate })` + `useInView(ref, { once: true, amount: 0.5 })` for one-shot scroll-triggered counting. Cleanup returns `() => controls.stop()`.
- **Alternating layout**: Tailwind `lg:order-1`/`lg:order-2` instead of unconventional `direction:rtl` hack.
- **All colors**: inline `style={{ color: 'var(--smuggler-*)' }}` so component adapts to light/dark theme automatically.
- **Reused CSS classes**: `.smuggler-paper`, `.smuggler-wax-seal`, `.smuggler-stamp-secret`, `.smuggler-stamp-classified`, `.smuggler-caret-blink`, `.smuggler-hero-title-shadow`, `.smuggler-btn*` from globals.css.

## Verification

- `bun run lint` → **0 errors, 0 warnings**
- `bunx tsc --noEmit` → **ZERO errors in Homepage.tsx** (only pre-existing out-of-scope errors in `examples/` and `skills/` folders)
- Dev server log: normal traffic, no compilation errors

## Issues encountered

1. Initial typo `{ icon: Mail: undefined as never, label: 'Newsletter' }` — invalid syntax. Fixed by adding `Mail` to lucide-react imports and using `{ icon: Mail, label: 'Newsletter' }`.
2. Unused `eslint-disable-next-line react-hooks/exhaustive-deps` directive on AIWriterVisual effect (the rule wasn't actually triggering). Removed the directive.
3. Initially used `lg:[direction:rtl]` hack for alternating feature layout. Refactored to `lg:order-1`/`lg:order-2` for cleaner code that preserves text direction.

## Out of scope

- Homepage is **not yet wired into `src/app/page.tsx`** — that integration is a separate task.
- Homepage is a standalone `'use client'` component with named `Homepage` export + default export, ready to be imported and rendered by `page.tsx` or any parent component.
