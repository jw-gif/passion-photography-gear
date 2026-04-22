

# Photography Hub Restructure

Transform the app from "gear-tracking-first" to a unified Photography Hub with a centralized admin home, calendar view, and consistent URL structure across photography and gear workflows.

## URL & naming changes

| Old | New |
|---|---|
| `/request` | `/request-gear` |
| `/request-photography` | `/request-photography` (unchanged) |
| `/admin` (gear board) | `/admin/gear` |
| `/admin/requests` | `/admin/requests-gear` |
| `/admin/photo-requests` | `/admin/requests-photography` |
| `/admin/manage` | `/admin/gear-manage` |
| `/admin/history` | `/admin/gear-history` |
| `/admin/admins` | `/admin/team` |
| `/admin` (NEW) | Hub home — calendar + upcoming requests |

The old `/request` route stays as a thin redirect to `/request-gear` so existing QR codes and links still resolve. (Public gear QR scans use `/?gear=ID`, which is unchanged.)

App-wide copy update: "Passion Gear" / "Passion Gear Tracking" → **"Passion Photography Hub"** in headers, page titles, meta descriptions, and the landing page.

## New `/admin` Hub home

Replaces today's gear board as the admin landing page.

**Top section — Month calendar**
- Month grid (week starts Sunday), prev/next/today controls.
- Each day cell shows compact "pills" for items happening that day:
  - Gear requests → use `needed_date`
  - Photography requests → use `event_date` (and span across `event_end_date` when `spans_multiple_days`)
- Pill color = status, with a shared legend:
  - Green = approved / scheduled
  - Amber = pending / in review
  - Blue = new
  - Violet = scheduled (photo)
  - Red = denied / declined
  - Gray = completed / archived
- Pill icon distinguishes type (camera vs. gear box). Click a pill → opens existing detail view in the relevant admin route.

**Below calendar — Upcoming list (two columns on desktop, stacked on mobile)**
- **Photography Requests** — next 30 days, sorted by event date, showing status badge, requester, event name, date, location.
- **Gear Requests** — next 30 days, sorted by needed date, showing status badge, requestor, item count, location, needed date.
- Each card links to the corresponding admin detail route.
- Empty states + "View all" links to the full list pages.

**Header** — unified hub nav with grouped sections:
- Hub (home)
- Photography → Requests
- Gear → Board, Requests, Manage, History
- Team
- Sign out

Use a compact dropdown/segmented nav so it fits on one row at desktop and collapses to a sheet on mobile.

## Landing page (`/`)

Rewrite as a hub entry point:
- Headline: "Passion Photography Hub"
- Subhead: "Request photography, request gear, and track everything the team is shooting."
- Three primary CTAs: **Request photography**, **Request gear**, **Admin hub**.
- Public gear-QR view (`/?gear=ID`) keeps current behavior, just rebranded header.

## Technical implementation

**New files**
- `src/routes/admin.index.tsx` — replaces current `admin.tsx` content; renders the Hub home (calendar + upcoming lists). The current `/admin` root becomes a layout shell with `<Outlet />`.

  Actually, since we use flat file-based routing (`admin.tsx` + `admin_.*.tsx`), simpler approach: **rewrite `src/routes/admin.tsx`** to be the Hub home. The existing gear board moves to a new `src/routes/admin_.gear.tsx`.

- `src/routes/admin_.gear.tsx` — extracted gear board (Dashboard + GearCard + QrModal from current admin.tsx).
- `src/routes/admin_.requests-gear.tsx` — copy of `admin_.requests.tsx` at new path.
- `src/routes/admin_.requests-photography.tsx` — copy of `admin_.photo-requests.tsx` at new path.
- `src/routes/admin_.gear-manage.tsx`, `admin_.gear-history.tsx`, `admin_.team.tsx` — renames of manage/history/admins.
- `src/routes/request-gear.tsx` — copy of `request.tsx` at new path.
- `src/components/hub-header.tsx` — shared admin header (logo, nav, sign out) used across all admin routes.
- `src/components/hub-calendar.tsx` — month calendar grid component.

**Deleted/redirected files**
- `src/routes/admin_.requests.tsx` → replace body with a `<Navigate to="/admin/requests-gear" />` to avoid breaking bookmarks.
- `src/routes/admin_.photo-requests.tsx` → redirect to `/admin/requests-photography`.
- `src/routes/admin_.manage.tsx`, `admin_.history.tsx`, `admin_.admins.tsx` → redirects to new paths.
- `src/routes/request.tsx` → redirect to `/request-gear`.

**Data loading for hub**
- Single combined fetch on hub mount:
  - `gear_requests` where `needed_date >= today AND needed_date <= today + 60 days`
  - `photo_requests` where `event_date >= today AND event_date <= today + 60 days`
- Realtime subscriptions on both tables to refresh automatically.
- Memoize a unified `events[]` array keyed by date for the calendar.

**Status color mapping**
- Reuse `statusBadgeClasses` from `src/lib/orgs.ts` for photo statuses.
- Add equivalent helper for gear request statuses (`pending`, `approved`, `denied`).
- Extract a shared `statusDotColor(status, kind)` util into `src/lib/orgs.ts` so calendar pills and list badges stay consistent.

**Header copy & meta**
- Update `<title>` and `<meta description>` in `__root.tsx` and every route's `head()` to "Passion Photography Hub" branding.
- Update landing page hero copy.

## ASCII layout — admin hub home

```text
┌─────────────────────────────────────────────────────────────┐
│ [logo] Passion Photography Hub    Photo · Gear · Team · Out │
├─────────────────────────────────────────────────────────────┤
│  ◀  April 2026  ▶                              [Today]      │
│  Sun  Mon  Tue  Wed  Thu  Fri  Sat                          │
│  ┌──┬──┬──┬──┬──┬──┬──┐                                     │
│  │  │  │ 1│ 2│ 3│ 4│ 5│                                     │
│  │  │  │📷│  │🎒│📷│  │  ← color-coded pills                │
│  └──┴──┴──┴──┴──┴──┴──┘                                     │
│  Legend: ● Approved  ● Pending  ● New  ● Declined           │
├─────────────────────────────────────────────────────────────┤
│  Upcoming Photography          │  Upcoming Gear              │
│  ─────────────────────         │  ──────────────────         │
│  [Scheduled] Easter Service    │  [Approved] Sunday kit      │
│  Apr 5 · 515 · Jacob W.        │  Apr 4 · 515 · Sarah        │
│  ...                           │  ...                        │
└─────────────────────────────────────────────────────────────┘
```

## Out of scope (future phases)

- Photographer job board (Phase 2)
- AI shot list generator (Phase 3)
- Drag-to-reschedule on calendar
- Week/day calendar views

