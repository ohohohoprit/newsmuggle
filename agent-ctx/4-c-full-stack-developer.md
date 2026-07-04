# Task 4-c — AuthModal + ToolModal

**Agent:** full-stack-developer
**Task:** Build AuthModal (login+signup toggle) and ToolModal (mission parameters + intel acquired workspace) for the Content Smuggler Next.js port.

## Files Created

1. `/home/z/my-project/src/smuggler/components/AuthModal.tsx` (315 lines)
   - Dark-themed smuggler panel modal (`bg-[#13110E]` + paper texture overlay)
   - Toggles between `login` and `signup` modes via `mode` prop + `onSwitchMode` callback
   - Logo badge (44×44): `Crosshair` gold + `UserSearch` cream
   - Form fields with shadcn `<Input>` + custom className override (Mail/Lock/User icons, password show/hide toggle)
   - Animated signup-only "Full name" field with `AnimatePresence` (collapsible height)
   - Error alert, loading-aware submit button (Loader2 spin / ArrowRight), "Forgot password?" link (login only)
   - Divider + 3 social buttons (Chrome/Apple/Github icons)
   - Switch link at bottom triggers `onSwitchMode`
   - Fake auth: validates, sets loading, 1200ms timeout → `onAuthSuccess()` + `onClose()`

2. `/home/z/my-project/src/smuggler/components/ToolModal.tsx` (567 lines)
   - Light/paper-themed large modal (`max-w-[1100px]`, cream `#FDFBF7`)
   - Sticky header with back button + X close
   - Scrollable body with `smuggler-scroll-light` + `max-h: calc(92vh - 65px)`
   - 404 fallback when `toolId` set but tool not found
   - **Tool Hero Card**: gradient forest-green panel, paper texture overlay, rotating `the-smuggler.png` watermark, floating `rocket-mascot-correct.png`, spring-rotated title box, tags row (category / popularity / popular-star / uses)
   - **Two-Pane Workspace** (`grid lg:grid-cols-2`):
     - **Left (Mission Parameters)**: Target Audience (input), Topic/Niche (textarea), Tone (native select with ChevronDown overlay), Platform (4-button grid with brand colors on active), Generate Button (idle/loading states with radar pulse on right pane)
     - **Right (Intel Acquired)**: cream paper panel, Copy All button (top-right), empty state (rotating logo + "Awaiting parameters..."), generating state (Loader2 + radar conic-gradient sweep + pulsing label), generated state (AnimatePresence list of `IntelCard`s with number badges + per-card copy/star/check actions), Save to Vault button (bottom, gold, delayed entrance)
   - State reset on `toolId` change so opening a new tool starts fresh

## Key Decisions

- **shadcn Dialog customization**: DialogContent accepts `className` (cn-merged) and a `showCloseButton` prop — passed `showCloseButton={false}` on both modals to hide the default X (we render our own close UI inside).
- **State-on-prop-change**: The lint rule `react-hooks/set-state-in-effect` forbids `setState` directly inside `useEffect`. Used the React-recommended "adjust state during render" pattern (track `prevMode`/`prevToolId` and call setState inside a conditional during render) instead.
- **Lucide icon substitutions**: No `Spy`/`Detective` in lucide-react → used `UserSearch` for both the logo cream layer and the header icon.
- **IntelCard as separate component**: Each intel card owns its own `copied` state — can't `useState` inside `map()`, so extracted to a non-exported function component within the same file.
- **TypeScript strictness**: `tone` typed as `(typeof TONES)[number]` to keep it narrow; cast `e.target.value` when setting it.
- **Accessibility**: All icon-only buttons have `aria-label`s, the social buttons have visible text, and Dialog provides focus trapping by default.

## Issues Encountered

- Pre-existing tsc errors in other agents' files:
  - `src/smuggler/data/tools.ts` imports `ImageSquare` (not exported by lucide-react — should be `Image` or `ImageIcon`) and `CATEGORY_STATS` includes `"Marketing"` which isn't in the `ToolCategory` union. These are NOT my responsibility (Task 3 territory) but they will block full `tsc --noEmit` until fixed.
  - `src/smuggler/components/ToolsSection.tsx` also imports `ImageSquare` (same problem).
- My two files have ZERO tsc errors and pass `bun run lint` cleanly.

## Lint Status

```
$ bun run lint
$ # (no output, exit 0)
```
