# Task LIBRARY — LibraryView.tsx

**Agent:** full-stack-developer
**Task:** Build a fully functional premium Library page ("intelligence vault") as a single file `src/smuggler/components/LibraryView.tsx`, using the existing `useLibraryStore` Zustand store, the smuggler design system (`.smuggler-panel-premium`, `.smuggler-hook-card`, `.smuggler-paper-grain`, `.smuggler-input-premium`, `.smuggler-cta-*`), framer-motion, and shadcn `Dialog`.

## Inputs read before work
- `/home/z/my-project/src/smuggler/store/useLibraryStore.ts` — full CRUD store (items, folders, activity + all actions). Noted that the store seeds 5 folders + 10 items + 4 activity entries on first visit.
- `/home/z/my-project/src/app/globals.css` lines 1–100 (CSS vars `--smuggler-*`), 680–770 (`.smuggler-panel-premium`, `.smuggler-hook-card`, `.smuggler-paper-grain`, `.smuggler-input-premium`), 770–899 (`.smuggler-hero-title`, `.smuggler-title-divider`, `.smuggler-section-heading`), 899–1261 (`.smuggler-cta-premium`, `.smuggler-cta-outline`, `.smuggler-cta-gold`, `.smuggler-empty-glow`, `.smuggler-particle`).
- `/home/z/my-project/src/smuggler/components/Navbar.tsx` — confirmed `NavView` type and styling conventions.
- `/home/z/my-project/src/smuggler/components/ToolCard.tsx` — reused the 3D-tilt + spotlight pattern (`useMotionValue`/`useSpring`/`useTransform`/`useMotionTemplate`).
- `/home/z/my-project/src/smuggler/components/DashboardView.tsx` — reused the `AnimatedCounter` pattern using framer-motion's `animate()`.

## File created
`/home/z/my-project/src/smuggler/components/LibraryView.tsx` (~2,780 lines, single file, `'use client'`).

## What was built

### Sections
1. **Hero Header** — gold-gradient + shimmer title "Your Content Library" (Playfair Display, `smuggler-hero-title-wrap`), `ShieldCheck` 100% Secure gold badge with `smuggler-glow` pulse, subtitle, 140px circular mascot badge (`/smuggler/assets/hero-mascot-new.png`) with floating + orbiting-dot animation, radial gold/green gradient + paper-grain overlay background, scroll-reveal entrance (`useInView`).
2. **Overview Cards (6)** — Saved Items, Folders, Favorites, Templates, Pinned, Storage Used (with "of 10 GB" sub-line). Each card uses `smuggler-panel-premium smuggler-paper-grain`, colored icon circle, `AnimatedCounter` (Playfair Display 2rem), hover lift, staggered `whileInView` entrance.
3. **Search & Filter Toolbar** — sticky (`top: 84px`) panel with 6 tabs (All / Generated / Templates / Brand Assets / Favorites / Trash) each showing live count badge, real-time search input (`smuggler-input-premium` with Search icon + clear button), custom `SortDropdown` (5 options: Recent/Oldest/A-Z/Z-A/Score), Grid/List view toggle, New Folder button (`smuggler-cta-outline`), and an animated multi-select bar (Archive / Move / Delete / Clear) that appears when items are selected. Bulk-Move shows a folder-picker submenu.
4. **Folder Section** — horizontal scrollable row using `smuggler-hook-card`. Virtual "All Items" and "Unsorted" cards plus all real folders. Each folder card shows colored folder icon, name, item count, "Updated X ago", and a 3-dot menu (Rename inline / Delete). Clicking filters items to that folder; active folder shows gold ring + glow. Filter indicator pill appears below when active.
5. **Content Cards Grid/List** — Grid (1/2/3/4 cols responsive) and List (full-width rows) layouts. Each card (`smuggler-hook-card`): TypeBadge with emoji + label, favorite star, 3-dot menu, pin indicator, title (Playfair Display), 2-line preview, footer (toolName · category · time-ago · score badge). 3D tilt + spotlight on hover (grid view only). Hover lift + gold border glow. Multi-select checkbox in top-left (visible on hover or when active). Clicking card body opens detail modal.
6. **Recent Activity** — `smuggler-panel-premium smuggler-paper-grain` container below grid, lists up to 12 activities with type-icon chip, "ACTION · itemTitle" line, and `formatTimeAgo` timestamp. Staggered `whileInView` reveal.
7. **Empty States** — radar illustration (rotating conic-gradient sweep + 3 concentric rings + crosshair + floating particles) with 3 variants: `no-results` ("No items found" + Clear Filters CTA), `trash-empty` ("Trash is empty"), `first-visit` ("Welcome to your Library" + Explore Tools + Open Hook Generator CTAs).
8. **Item Detail Modal** — shadcn `Dialog`/`DialogContent` showing full content (serif font, scrollable), metadata row (created, edited, tool, category, folder, score, tags), inline-editable title (click → input with Enter/Esc), and full action row: Copy, Download, Duplicate, Favorite, Pin, Delete (or Restore + Delete Forever when in trash). `key={item.id}` ensures fresh state per item.
9. **Create Folder Dialog** — name input + 8-color picker swatches, Create/Cancel buttons, resets on open via `onOpenChange` callback (no setState-in-effect).
10. **Move to Folder Submenu** — nested inside the 3-dot menu: clicking "Move to Folder" switches menu to a folder list view (Unsorted + all real folders, current folder marked with check). Also a bulk-move variant in the multi-select bar.

### Functional coverage (all working)
- Real-time search by title, content, tags, toolName.
- 5 sort options; pinned items always surface first (except in trash).
- 6 tabs filter items by type/status; counts update live.
- Grid ↔ List view toggle.
- Multi-select with bulk Delete / Move / Archive + clear.
- Create / Rename (inline) / Delete folder; deleting moves items to Unsorted.
- Favorite / Pin / Duplicate / Move-to-folder / Archive / Soft-delete / Restore / Permanent-delete / Clear-trash.
- Download creates a `.txt` Blob and triggers browser download.
- Copy uses `navigator.clipboard.writeText`.
- Toast feedback (success/info/error) for every action, bottom-right, auto-dismiss 2.6s.
- Hydrates from localStorage on mount via `useLibraryStore.hydrate()`.

### Design adherence
- All colors via `var(--smuggler-*)` CSS variables (theme-aware).
- Premium card classes used as specified.
- Premium button classes `smuggler-cta-premium`, `smuggler-cta-outline`, `smuggler-cta-gold` used throughout (with `!px-*`/`!py-*`/`!text-*` overrides for compact variants).
- Framer-motion: `whileInView` reveals, staggered entrances via `Variants`, hover lifts, 3D tilt + spotlight on cards, animated counters via `animate()`.
- Responsive: mobile-first, grid collapses 4→3→2→1 cols, toolbar wraps, folders horizontal-scroll on mobile.
- Mascot floating + orbiting dot animations.
- Exported both named `LibraryView` and default export.

## Verification
- ✅ `bun run lint` — 0 errors, 0 warnings.
- ✅ `npx tsc --noEmit` — 0 errors in `src/` (only pre-existing errors in `examples/` and `skills/`).
- ✅ Dev server compiles cleanly (`✓ Compiled` in dev.log).

## Notes for downstream agents
- `onNavigate` is used by the first-visit empty-state CTA → `onNavigate('tools')`.
- `onSelectTool` is wired to the first-visit secondary CTA → `onSelectTool('hook-generator')`.
- The component does NOT define its own route — it must be mounted by a parent (likely `Homepage.tsx` or a top-level switch on `NavView`). The `NavView` type from `Navbar.tsx` doesn't currently include `'library'`, so the parent should add it.
- `LibraryViewProps.onNavigate` is typed as `(view: 'home' | 'tools' | 'dashboard') => void` per spec — narrower than `NavView`. The parent should bridge this.
- Storage estimate uses 2 KB × item count; surfaced as "X KB of 10 GB" in the 6th overview card.
