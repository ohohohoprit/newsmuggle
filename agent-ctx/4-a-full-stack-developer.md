# Task 4-a — full-stack-developer

## Task
Build three Next.js client components for the Content Smuggler landing page:
1. `src/smuggler/components/Navbar.tsx` — sticky top nav with logo, links, auth buttons
2. `src/smuggler/components/Hero.tsx` — two-column hero with 3D tilt paper docs + mascot
3. `src/smuggler/components/ToolsSection.tsx` — 3-column dashboard (Popular Tools / Command Center / Top Categories + Promo)

## Work Log

1. Read project context (`worklog.md`), design system (`globals.css`), tool data (`src/smuggler/data/tools.ts`), and the original Vite reference components at `/tmp/content-smuggler-react/src/components/{Navbar,Hero,ToolsSection}.jsx` plus their CSS class definitions in `index.css`.
2. Verified Next.js project root layout: project uses Next.js 16 + TypeScript + Tailwind 4 + framer-motion 12 + lucide-react 0.525. Existing `src/app/page.tsx` is still the default Z.ai placeholder and will be replaced by Task 5 wiring.
3. Created `Navbar.tsx`:
   - `'use client'` + exported `NavbarProps`, `NavView`, `AuthMode` types.
   - Sticky outer wrapper (`sticky top-0 z-50`) with semi-transparent `rgba(11,10,8,0.72)` background + `backdrop-blur-md` + bottom border `var(--smuggler-border)`/50.
   - Inner `motion.nav` with `initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} transition={{duration:0.6, ease:'easeOut'}}`, max-width 1400px container with px-4/sm:px-8/lg:px-16.
   - Logo: 44x44 circular badge with `Crosshair` (gold, weight 1) overlaid by `Search` (cream, weight 2.5). Stacked text `★ CONTENT ★` / `SMUGGLER` (Playfair Display 900, 1.2rem) + caption `— CREATOR TOOLKIT —` (Inter, 0.55rem, 3px tracking, text-muted). Flanking `Star` icons use `fill-current` + gold.
   - Nav links list (hidden on mobile, `md:flex gap-10`): Dashboard→onNavigate('home'), Tools→onNavigate('tools') with `ChevronDown`, Studio/Library/Pricing/Resources (decorative). Active link colored gold.
   - Right side: `Log in` (smuggler-btn-secondary, hidden on mobile) and `Sign up` (smuggler-btn-primary). On mobile only Sign up shows.
4. Created `Hero.tsx`:
   - `'use client'` + exported `HeroProps`. Imports `useMotionValue`/`useSpring`/`useTransform` from framer-motion (SSR-safe).
   - Left column: gold pill badge (`★ THE ALL-IN-ONE CREATOR TOOLKIT`), hero title with `smuggler-hero-title-shadow` class (clamp(2.75rem, 6vw, 4.5rem), "Smuggle It" in `var(--smuggler-green)`), description, action row with primary `Explore All Tools` (calls `onExploreTools`) + secondary `See How It Works` + social proof block (3 pravatar avatars `https://i.pravatar.cc/100?img=11/12/13` rendered as 3 separate URLs, 28x28 rounded-full border-2 border-bg, overlapping -10px, plus 5 gold stars and "Loved by 10,000+ Creators").
   - Features row: 4 items (Briefcase/Zap/LockKeyhole/Infinity-as-InfinityIcon) in green with strong + span.
   - Right column (`hidden lg:block`): `perspective: 1200px` container with `onMouseMove`/`onMouseLeave` driving `rotateX`/`rotateY` via `useSpring`. Contains absolutely-positioned `.smuggler-paper` documents: Mission Brief (260px, rotate -4deg, translateZ 20px, with Paperclip + "TOP SECRET" stamp), Objectives (220px, rotate 2deg, translateZ 10px, with CheckSquare list + signature), Classified (180x140, rotate -8deg, translateZ 15px), wax seal "C" (50x50, translateZ 40px), plus mascot `<motion.img src="/smuggler/mascot-new.png">` at left -120px / top -50px / 600x600 / translateZ 80px with `y: [0,-8,0]` infinite loop.
   - Container uses `containerVariants`/`itemVariants` staggered children.
5. Created `ToolsSection.tsx`:
   - `'use client'` + exported `ToolsSectionProps`. Imports `POPULAR_TOOLS`, `CATEGORY_STATS`, `TOOL_COUNT`, `SmugglerTool` from `@/smuggler/data/tools`.
   - `motion.main` with `lg:grid-cols-[320px_1fr_300px]`, `whileInView` `viewport={{once:true, amount:0.1}}`, staggerChildren 0.15.
   - Left panel (Popular Tools): renders first 6 from `POPULAR_TOOLS` as `PopularToolCard` buttons (44x44 icon box with tool.bgColor/color, name + desc, ArrowRight). Header has "View all tools →" calling `onExploreTools`.
   - Middle panel (Command Center): time filter pill group (7D/30D/All Time, local `useState`), 4-card stats grid (Eye/Heart/TrendingUp/Wallet with appropriate colors, ArrowUpRight trend badges, "vs last 7 days" compare text), then "RECENT ACTIVITY" header + 3 activity items (Hook Generator green-Completed, Script Writer blue-Completed, Thumbnail Analyzer purple-Analyzed) with 36x36 icon boxes, tag pills, and MoreVertical menu icons.
   - Right panel (Top Categories + Promo): 2-col grid of `CATEGORY_STATS` (icon + name + "{count} Tools"), then promo box with gradient bg + Crown + "Unlock Your Full Potential" + full-width "Upgrade Now" button (with Crown + ArrowRight) calling `onExploreTools`. Added dynamic `{TOOL_COUNT}` count in promo copy.
6. Ran `bun run lint` — passes cleanly with no errors or warnings.

## Stage Summary

**Files created:**
- `/home/z/my-project/src/smuggler/components/Navbar.tsx`
- `/home/z/my-project/src/smuggler/components/Hero.tsx`
- `/home/z/my-project/src/smuggler/components/ToolsSection.tsx`

**Key decisions:**
- All three are `'use client'` components (use framer-motion, useState, mouse handlers).
- Exported prop interfaces (`NavbarProps`, `HeroProps`, `ToolsSectionProps`) plus companion types (`NavView`, `AuthMode`) for reuse by the parent page.
- Aliased `Infinity as InfinityIcon` from lucide-react to avoid shadowing the JS global `Infinity` used in framer-motion's `repeat: Infinity`.
- Used inline `style` with `var(--smuggler-*)` for brand colors (Tailwind doesn't know about them as utility classes), and used the `.smuggler-*` utility classes (`.smuggler-btn`, `.smuggler-paper`, `.smuggler-wax-seal`, `.smuggler-stamp-secret`, `.smuggler-stamp-classified`, `.smuggler-panel`, `.smuggler-hero-title-shadow`) where defined in globals.css.
- Hero title uses `clamp(2.75rem, 6vw, 4.5rem)` for responsive scaling instead of fixed 72px/44px breakpoints (smoother).
- All navigation is via callback props (no `react-router-dom`). All decorative icons are `aria-hidden`; icon-only buttons have `aria-label`.
- Avatar URLs rendered as 3 separate `https://i.pravatar.cc/100?img={n}` requests (the original `img=11/12/13` was a typo shorthand in the spec).
- Lint passes with zero errors/warnings.

**Issues encountered:** None. `dev.log` is currently empty (server hasn't been started in this session); `bun run lint` is the canonical code-quality check and it passed.
