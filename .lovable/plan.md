# Sitemap cleanup — option B (no legacy redirects)

Consolidate sibling pages into tabbed hubs and delete the legacy redirect routes outright. Old bookmarks/emails will hit the 404 page.

## Final sitemap

```text
Public / auth
  /                          sign in + public gear lookup
  /login
  /reset-password
  /onboarding
  /photographer-link

Photographer
  /photographers/$id         unified hub (canonical)
  /jobs                      KEPT as smart redirect (external magic-link emails)

Public request forms
  /request                   tabs: Gear | Photography  (?tab=gear|photography)

Admin
  /admin                              hub
  /admin/requests                     tabs: Gear | Photography
  /admin/gear                         tabs: Board | Inventory | History
  /admin/team                         tabs: Team | Photographers | Admins
  /admin/content                      tabs: Announcements | Events | Training | Landing photos
  /admin/shot-list                    tabs: Blocks | Generator
  /admin/onboarding (+ nested editors unchanged)
```

Exception to the "delete redirects" rule: `/jobs` is kept because it is the URL hard-coded into magic-link emails already sent to photographers. Everything else gets deleted.

## Routes deleted

- `/dashboard` — post-login resolver moves into `login.tsx` / `auth.tsx`.
- `/request` (old redirect) — replaced by a real tabbed page at the same URL.
- `/request-gear`, `/request-photography` — content moves into `/request` tabs.
- `/admin/requests` (old redirect), `/admin/photo-requests` — replaced by real tabbed page at `/admin/requests`.
- `/admin/requests-gear`, `/admin/requests-photography` — content moves into `/admin/requests` tabs.
- `/admin/gear-manage`, `/admin/gear-history` — content moves into `/admin/gear` tabs.
- `/admin/manage`, `/admin/history` — redirect files removed.
- `/admin/photographers`, `/admin/admins` — redirect files removed.
- `/admin/announcements`, `/admin/events`, `/admin/training`, `/admin/landing-photos` — content moves into `/admin/content` tabs.
- `/admin/shot-list-blocks`, `/admin/shot-list-generator` — content moves into `/admin/shot-list` tabs.

## How tabs are wired

Each consolidated route gets a `tab` search param (zod-validated, default to the first tab). The tab state is in the URL so deep-links work (`/admin/gear?tab=history`). Each tab renders the existing page body, lifted into a section component (e.g. `GearBoardSection`, `GearInventorySection`, `GearHistorySection`) inside `src/components/admin/`. No data-fetching or RPC changes — just extracting JSX + state from each existing route file into a component.

## Files

**New tabbed routes (rewrites)**
- `src/routes/request.tsx` — tabbed shell, default Gear.
- `src/routes/admin_.requests.tsx` — tabbed shell, default Gear.
- `src/routes/admin_.gear.tsx` — tabbed shell, default Board.
- `src/routes/admin_.content.tsx` — new, tabs: Announcements / Events / Training / Landing photos.
- `src/routes/admin_.shot-list.tsx` — new, tabs: Blocks / Generator.

**New section components** (extracted bodies; one per old route)
- `src/components/admin/gear-board-section.tsx`
- `src/components/admin/gear-inventory-section.tsx`
- `src/components/admin/gear-history-section.tsx`
- `src/components/admin/requests-gear-section.tsx`
- `src/components/admin/requests-photography-section.tsx`
- `src/components/admin/announcements-section.tsx`
- `src/components/admin/events-section.tsx`
- `src/components/admin/training-section.tsx`
- `src/components/admin/landing-photos-section.tsx`
- `src/components/admin/shot-list-blocks-section.tsx`
- `src/components/admin/shot-list-generator-section.tsx`
- `src/components/request/gear-request-section.tsx` (wraps existing `GearRequestForm`)
- `src/components/request/photography-request-section.tsx` (bodies from `request-photography.tsx`)

**Deleted route files** (12)
- `src/routes/dashboard.tsx`
- `src/routes/request-gear.tsx`
- `src/routes/request-photography.tsx`
- `src/routes/admin_.photo-requests.tsx`
- `src/routes/admin_.requests-gear.tsx`
- `src/routes/admin_.requests-photography.tsx`
- `src/routes/admin_.gear-manage.tsx`
- `src/routes/admin_.gear-history.tsx`
- `src/routes/admin_.manage.tsx`
- `src/routes/admin_.history.tsx`
- `src/routes/admin_.photographers.tsx`
- `src/routes/admin_.admins.tsx`
- `src/routes/admin_.announcements.tsx`
- `src/routes/admin_.events.tsx`
- `src/routes/admin_.training.tsx`
- `src/routes/admin_.landing-photos.tsx`
- `src/routes/admin_.shot-list-blocks.tsx`
- `src/routes/admin_.shot-list-generator.tsx`

**Updated** (link rewrites only)
- `src/components/hub-header.tsx` — admin dropdown points at new URLs (`/admin/content?tab=…`, `/admin/gear?tab=…`, etc.).
- `src/routes/admin.tsx` — quick links point at `/admin/requests?tab=…` and `/admin/gear`.
- `src/routes/login.tsx` — post-login resolver (logic copied from `dashboard.tsx`): staff → `/admin`, photographer → `/photographers/$id`.
- `src/lib/auth.tsx` — if a `redirectAfterLogin` helper lives here, update it; otherwise leave alone.
- Any `<Link>` in the consolidated section components that pointed at a sibling page (e.g. `/admin/gear-manage` → `/admin/gear?tab=inventory`).
- `src/routes/jobs.tsx` — unchanged (kept as the one legacy redirect).

`src/routeTree.gen.ts` regenerates automatically.

## Out of scope

- No database, RPC, RLS, or business-logic changes.
- No visual redesign of individual pages — just regrouping under tabs.
- Onboarding editor routes stay as-is.
- No new sitemap.xml (none exists today; not requested).
