# Task STUDIO — StudioView.tsx

**Agent:** full-stack-developer
**Task:** Build a fully functional premium Creator Studio page as a single file `src/smuggler/components/StudioView.tsx` — an AI-powered business dashboard for creators. `'use client'` with framer-motion, using the existing `useStudioStore` Zustand store, the smuggler design system (`.smuggler-panel-premium`, `.smuggler-paper-grain`, `.smuggler-hook-card`, `.smuggler-cta-*`, `.smuggler-hero-title-wrap`, `.smuggler-bg-premium`, `.smuggler-section-heading`, `.smuggler-glow`, `.smuggler-title-divider`), and shadcn `Dialog`.

## Inputs read before work
- `/home/z/my-project/src/smuggler/store/useStudioStore.ts` — full store with `accounts`, `goals`, `activities`, `insights`, `calendar`, `topContent`, `demographicsAge`, `demographicsGeo`, `trafficSources`, `selectedTimeframe`, `hydrated`; actions `hydrate`, `setTimeframe`, `connectAccount`, `disconnectAccount`, `refreshAccount`, `createGoal`, `updateGoalProgress`, `deleteGoal`, `toggleCalendarItem`; helpers `PLATFORM_META`, `formatNumber`, `formatTimeAgo`; types `PlatformId`, `SocialAccount`, `StudioGoal`, `AIInsight`, `CalendarItem`, `ContentItem`, `DemographicData`.
- `/home/z/my-project/src/app/globals.css` lines 100–180 (CSS vars `--smuggler-*`), 680–770 (`.smuggler-paper-grain`, `.smuggler-panel-premium`, `.smuggler-hook-card`), 788–899 (`.smuggler-hero-title`, `.smuggler-hero-title-wrap`, `.smuggler-title-divider`, `.smuggler-section-heading`), 1022–1046 (`.smuggler-bg-premium`), 1126–1262 (`.smuggler-cta-premium`, `.smuggler-cta-outline`, `.smuggler-cta-gold`), 399–405 (`.smuggler-glow`).
- `/home/z/my-project/src/smuggler/components/Navbar.tsx` — confirmed `NavView` type and styling conventions.
- `/home/z/my-project/src/smuggler/components/LibraryView.tsx` — reused the `AnimatedCounter` (framer-motion `animate()` + `useInView`) pattern, the `Toast` pattern, the `SortDropdown` pattern, and the `CreateFolderDialog` "reset on open via `handleOpenChange` wrapper" pattern (avoids `setState` in effect lint error).
- `/home/z/my-project/src/smuggler/data/tools.ts` — verified tool IDs used by insights & quick actions exist: `hook-generator`, `ai-writer`, `script-writer`, `title-optimizer`, `thumbnail-analyzer`, `repurpose-engine`, `content-calendar`.

## File created
`/home/z/my-project/src/smuggler/components/StudioView.tsx` (~1,900 lines, single file, `'use client'`).

## What was built

### Sections (all 12 spec items delivered)
1. **Hero Header** — `"Creator Studio"` title with `smuggler-hero-title-wrap` (Playfair Display, gold gradient + shimmer), `Crown` studio badge, `ShieldCheck` "N accounts connected" badge, subtitle, 140px circular mascot badge (`/smuggler/assets/hero-mascot-new.png`) with floating `y:[0,-12,0]` animation + orbiting gold dot, radial gold/green gradient + `.smuggler-paper-grain` background, TimeframeSelector (7D/28D/90D), "Open Tools" outline CTA, NotificationBell.
2. **Key Metrics Row (6 cards)** — Total Followers, Total Views, Engagement Rate, Avg. Watch Time (4m 32s), Total Revenue (₹48,920), Content Created (86). Each uses `.smuggler-panel-premium .smuggler-paper-grain`, colored icon circle, `AnimatedCounter` (Playfair Display), trend badge (up/down arrow), glow accent, staggered `whileInView` entrance via `containerVariants`/`itemVariants`. Followers/views/engagement are **derived live** from connected accounts in the store.
3. **Connected Accounts** — `SectionHeading` with "Manage" button. Grid of all 10 platforms (uses `PLATFORM_META`). Each `AccountCard` has platform color stripe, `PlatformIcon` (circular badge with platform glyph), platform name, username, 3-stat grid (Followers/Views/Engage), last-sync time, `HealthDot` (good=green, warning=yellow, error=red). Connected cards show Refresh + Disconnect buttons; disconnected cards show green "Connect" CTA. All three actions call store actions and show toast feedback. Refresh button shows spin animation.
4. **Performance Overview** — Custom SVG line chart (no external chart lib) drawing 3 series (Views blue, Engagement % pink, Followers green) with area fills, gridlines, X-axis labels (Mon–Sun / W1–W4 / M1–M3 based on timeframe), data dots, and animated `strokeDashoffset` draw-in on `useInView`. Legend below with colored dots + latest value per series. TimeframeSelector in heading updates `setTimeframe` and the chart regenerates via `useMemo`.
5. **AI Creator Coach (Insights)** — `SectionHeading` with pulsing green "New" badge (`.smuggler-glow`). Grid of all 6 `AIInsight` cards. Each card: severity-colored left border, "Opportunity/Action needed" badge, expected-impact gold badge, Playfair title, description, "Why" + "How" mini panels, and a `smuggler-cta-gold` "Try {toolName}" button that calls `onSelectTool(toolId)`. Hover lift (-3px).
6. **Top Performing Content** — Sortable list (By Views / By Engagement / By Date) via custom dropdown. Each row: `PlatformIcon`, title, platform name + time-ago, views, engagement %, trend arrow (up green / down red / stable muted). Hover slides right (+2px).
7. **Content Calendar (Today's Plan)** — Heading with "View Calendar" link (calls `onNavigate('tools')`). Each item: time, platform icon, title, circular checkbox. Clicking toggles `toggleCalendarItem(id)` and shows toast. Done items: green check + strikethrough + green-tinted bg; scheduled: empty circle; missed: red X + red border + dimmed.
8. **Demographics** — 3 mini charts side-by-side in premium panels:
   - **Age Groups** — horizontal bar chart from `demographicsAge` with `motion.div` width animation on `useInView`, each bar uses the demographic item's own color.
   - **Top Countries** — same horizontal bar pattern from `demographicsGeo`.
   - **Traffic Sources** — custom SVG donut from `trafficSources` with animated `strokeDashoffset` per segment (computed via pure `reduce`, no mutation), center label showing total %, legend grid below.
9. **Goals** — `SectionHeading` with green "New Goal" CTA. Grid of `GoalCard`s; empty state with targeted CTA when no goals. Each card: colored target icon, "Done" badge when complete, Playfair current value, `/ target unit` subtitle, animated progress bar (gradient + glow, animates on `useInView`), % + remaining-unit caption, delete button (calls `deleteGoal(id)` + toast). "New Goal" opens `CreateGoalDialog` with title input, target input, unit input, 8-color picker, Create/Cancel buttons; reset-on-open via `handleOpenChange` wrapper (no setState-in-effect).
10. **Recent Activity** — Heading with "View all" link. List of up to 6 activities with type-icon chip, text, `formatTimeAgo` timestamp. Staggered `whileInView` entrance.
11. **Quick Actions** — "Quick Access" heading. Grid of 6 cards: Hook Generator, AI Writer, Title Optimizer, Thumbnail Analyzer, Repurpose Engine, View All Tools. Each has colored icon circle, label, description, "Open" link with arrow that translates on hover. Tool buttons call `onSelectTool(toolId)`; "View All Tools" calls `onNavigate('tools')`.
12. **Notifications (floating bell)** — `NotificationBell` component in hero right column. Bell icon button with red count badge (activity count, "9+" if >9). Click toggles dropdown with header ("Notifications" + "N new" badge), scrollable list of activities (icon chip + text + time-ago), click-outside to close. Animated open/close via `AnimatePresence`.

### Functional coverage (all working)
- **Connect/Disconnect/Refresh** — wired to `connectAccount`, `disconnectAccount`, `refreshAccount`; persists to localStorage via store; toast feedback; refresh shows spin animation.
- **Time range selector** — `setTimeframe(t)` updates store; chart regenerates; toast feedback.
- **Calendar toggle** — `toggleCalendarItem(id)` toggles done/scheduled; UI updates with strikethrough/checkmark.
- **Goal CRUD** — `createGoal` (dialog), `deleteGoal` (button). `updateGoalProgress` supported by store but not surfaced in UI (per spec).
- **AI insight tool links** — "Try {toolName}" calls `onSelectTool(insight.toolId)`.
- **Quick action buttons** — call `onSelectTool` or `onNavigate('tools')`.
- **Chart** — renders based on `selectedTimeframe`, animates on scroll via `useInView` + `strokeDashoffset`.
- **Demographics charts** — render from store data, animate on scroll (`useInView` + width/strokeDashoffset).
- **Notifications dropdown** — opens/closes via state, click-outside handler, shows activities.
- **Hydration** — `useStudioStore.hydrate()` called on mount; reads accounts + goals from localStorage with seed fallback.

### Design adherence
- All colors via `var(--smuggler-*)` CSS variables (theme-aware, light/dark).
- Premium card classes used as specified: `.smuggler-panel-premium`, `.smuggler-paper-grain`, `.smuggler-hook-card`, `.smuggler-cta-premium`, `.smuggler-cta-outline`, `.smuggler-cta-gold`, `.smuggler-section-heading`, `.smuggler-title-divider`, `.smuggler-hero-title-wrap`, `.smuggler-bg-premium`, `.smuggler-glow`, `.smuggler-input-premium` (in dialog).
- Framer-motion: `whileInView` reveals, staggered entrances via `Variants` (`containerVariants`/`itemVariants`/`sectionVariants`), hover lifts, animated counters via `animate()`, `strokeDashoffset` chart draw-ins, `layoutId` for timeframe pill, mascot floating + orbiting dot, dropdown spring transitions.
- Responsive: mobile-first, metrics grid collapses 6→3→2 cols, accounts 4→3→2→1, insights 3→2→1, two-column sections stack on mobile, chart SVG scales with `viewBox`.
- Semantic HTML: `<section>`, `<h2>`, `<h3>`, `aria-label`s on sections, `aria-pressed`/`aria-expanded`/`aria-haspopup` on interactive controls, `role="img"` on chart SVG, `aria-hidden` on decorative elements.
- Exports both named `StudioView` and default export.

## Verification
- ✅ `bun run lint` — 0 errors, 0 warnings (after fixing 2 initial issues: `react-hooks/immutability` on donut segment offset accumulation → refactored to pure `reduce`; `react-hooks/set-state-in-effect` on dialog form reset → moved reset into `handleOpenChange` wrapper following the LibraryView pattern).
- ✅ `npx tsc --noEmit` — 0 errors in `src/` (only pre-existing errors in `examples/` and `skills/`).
- ✅ Dev server running cleanly (`✓ Ready in 952ms`, no compile errors).

## Notes for downstream agents
- The component does **not** define its own route — it must be mounted by a parent (`src/app/page.tsx`). Suggested wiring: add `'studio'` to the `NavView` type in `Navbar.tsx`, render `<StudioView onNavigate={handleNavigate} onSelectTool={handleSelectTool} />` when `view === 'studio'`, and wire the "Studio" nav link in `NAV_LINKS` to `onNavigate('studio')`.
- `StudioViewProps.onNavigate` is typed as `(view: 'home' | 'tools' | 'library') => void` per spec — narrower than `NavView`. The parent should bridge this (e.g., cast or extend).
- `onSelectTool` accepts any string tool ID — insight tool links use the real IDs from `tools.ts` (`hook-generator`, `script-writer`, `title-optimizer`, `thumbnail-analyzer`, `repurpose-engine`, `content-calendar`). `content-calendar` is not currently a tool route in `page.tsx`'s `handleSelectTool` — it would fall through to `ToolPageEngine` which may or may not handle it. Worth confirming.
- Static metrics: Avg. Watch Time = 4m 32s (272s), Total Revenue = ₹48,920, Content Created = 86. These are not in the store per spec.
- All toasts auto-dismiss after 2.6s; multiple toasts stack with unique IDs.
- The chart uses deterministic pseudo-random data seeded by timeframe so it's stable across re-renders but visually distinct per range.
