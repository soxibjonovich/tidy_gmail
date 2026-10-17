# FRONTEND.md

Rules for AI agents building `frontend/`. Stack: **Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui**.
The backend is human-written. You only consume its API (see `AGENTS.md`).

## Stack

| Need | Use |
|------|-----|
| Build | Vite |
| UI | React + TypeScript (strict) |
| Components | shadcn/ui (Radix + Tailwind) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| Server state | TanStack Query |
| Routing | React Router |
| Lists | TanStack Virtual |
| API client | `openapi-fetch` + types from `openapi-typescript` |
| Icons | `lucide-react` (named imports only) |
| Toasts | shadcn `sonner` |
| Forms (if needed) | React Hook Form + Zod |

Do not add other libraries without asking. No Redux. No CSS-in-JS.

## Folder structure

```
frontend/src/
├── api/            # openapi-fetch client + generated types (do not hand-edit generated files)
├── components/
│   ├── ui/         # shadcn components (added by CLI)
│   └── ...         # shared app components
├── features/
│   ├── auth/
│   ├── scan/
│   └── senders/    # each feature: components, hooks, queries
├── pages/          # route-level components (lazy loaded)
├── lib/            # utils, cn()
├── hooks/
└── main.tsx
```

- Path alias: `@/` points to `src/`.
- One component per file, named exports, PascalCase files.
- Server data goes through TanStack Query hooks in `features/*/queries.ts`. Components never call `fetch` directly.

## shadcn rules

- Add components with the CLI: `pnpm dlx shadcn@latest add button table dialog ...`
- Do not rewrite shadcn components from scratch. Compose them.
- Use the `cn()` helper for conditional classes.
- Use theme tokens (`bg-background`, `text-muted-foreground`), never hardcoded hex colors.
- Support dark mode through the shadcn theme setup.

## API rules

- Base URL from `import.meta.env.VITE_API_URL`. Never hardcode.
- Run `pnpm gen:api` to refresh types. Never hand-write API types.
- Auth transport is decided by the human (backend uses JWT). Until told otherwise, assume an httpOnly cookie and use `credentials: "include"`.
- Handle 401 globally: redirect to the login page.
- Never store Google tokens anywhere in the frontend. Never store the app JWT in `localStorage` without the human's approval.
- If an endpoint is missing, write a **Backend request** note. Do not mock it as if it exists.

## Performance rules (important)

The senders list can reach **thousands of rows**. Build for that from the start.

### Loading and bundle

- **Route-level code splitting**: every page uses `React.lazy` + `Suspense`.
- Import icons by name: `import { Mail } from "lucide-react"`. Never import the whole set.
- Initial JS budget: **under 200 KB gzipped**. Check with `pnpm dlx vite-bundle-visualizer`.
- No heavy libraries (moment, lodash full, chart libs) unless justified. Use `Intl` and `Date` for formatting.
- Fonts: system font stack or one self-hosted variable font with `font-display: swap`.

### Rendering

- **Virtualize any list over ~100 rows** with TanStack Virtual. The sender list must always be virtualized.
- Search and filter inputs: use `useDeferredValue` or `useTransition` so typing stays instant.
- Do **not** add `useMemo`, `useCallback`, or `React.memo` by default. Add them only when the Profiler shows a problem, and leave a short comment saying what was measured.
- Keep state as local as possible. Do not lift state to the top "just in case".
- Stable `key` props from IDs, never array index.
- Avoid inline object/array props to memoized children in hot paths (like list rows).
- Row components for the virtualized list should be small and pure.

### Data fetching

- Set sensible `staleTime` in TanStack Query (sender list: 30 to 60 seconds). Avoid refetch storms.
- **Paginate or cursor-load** large lists. Never fetch everything at once.
- Scan progress: poll with `refetchInterval` (1 to 2 s) and **stop polling** when status is `done` or `failed`. Use `refetchIntervalInBackground: false`.
- Prefetch the next page or the likely next route on hover.
- Use **optimistic updates** for unsubscribe actions: update the row instantly, roll back on error.
- Cancel in-flight requests on unmount (TanStack Query does this with `signal`).

### Perceived speed

- Show **skeletons** (shadcn `Skeleton`) that match the final layout. No layout shift.
- Never show a blank screen or a lone spinner for more than a moment.
- Bulk actions: show progress (`3 of 20 done`), don't freeze the UI.
- Every async view has all three states: **loading, empty, error** (with a retry button).

### Measure

- Use React DevTools Profiler for slow renders.
- Run Lighthouse before merging UI-heavy changes. Targets: Performance 90+, Accessibility 95+.
- Watch for layout shift (CLS) and long tasks in the Performance panel.

## UX rules

- Destructive or bulk actions need a confirm dialog that states the count: "Unsubscribe from 12 senders?"
- Show unsubscribe **method level** clearly (automatic, needs confirmation, manual link).
- Manual-only senders: show an "Open link" button (`target="_blank"`, `rel="noopener noreferrer"`).
- Toast on success and failure, with a short message.
- Mobile first: the sender list works on a phone (cards or compact rows).

## Accessibility

- Icon-only buttons need `aria-label`.
- Full keyboard support (shadcn/Radix gives most of it. Don't break it).
- Visible focus rings. Don't remove outlines.
- Color is never the only signal: status badges include text.
- Respect `prefers-reduced-motion`.

## Code style

- TypeScript strict. No `any`. No `// @ts-ignore` without a reason.
- Small components (aim under ~150 lines). Extract hooks for logic.
- No comments that restate code. Comment the *why*.
- No `console.log` left in committed code.
- Don't render email bodies as HTML. Show plain text only, never `dangerouslySetInnerHTML`.

## Before you say "done"

1. `pnpm typecheck && pnpm lint && pnpm build`
2. Loading, empty, and error states exist
3. No new dependency added without asking
4. Sender list still scrolls smoothly with 5,000 mock rows
5. Follows `AGENTS.md`