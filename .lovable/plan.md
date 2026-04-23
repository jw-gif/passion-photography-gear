

# Approved UX Pass — Implementation Plan

Working through your responses point by point. Smart date defaults dropped from #2. Everything else proceeds.

---

## 1. Landing page — gear-only + photographer self-serve link

**Public landing (`/`) becomes:**
- Single primary card: "Request gear" → `/request-gear`
- Secondary text link: "I'm a photographer — find my jobs" → opens a small dialog
- Tiny "Admin" link in the top-right corner (de-emphasized)
- Photography request form is **removed from the public landing entirely**

**Photographer self-serve job link (new):**
- New route `/photographer-link` with an email input
- New edge function `send-photographer-link`:
  - Looks up `photographers` by email (case-insensitive, `active = true`)
  - If found, sends a magic-link email containing `https://.../jobs?token={photographer.token}` via Lovable Emails
  - Always returns the same generic success message ("If that email is registered, we just sent you a link") to avoid leaking which emails are valid
- Admins still keep the existing "copy link" flow on the photographers page

**Photography request form** stays accessible at `/request-photography` (unlinked from public nav, only reachable via direct URL or admin share). Admins can copy/share that URL with staff who need to submit requests. Budget rate-card cards remain on that form — just not exposed to general volunteers.

---

## 2. Photo request form polish (smart date defaults removed)

- Split into 3 numbered sections: ① You ② Event ③ Coverage & budget
- Sticky bottom submit bar with live validation summary ("2 required fields missing")
- Inline validation on blur
- "Same as requester" checkbox for on-site contact
- Concur fields collapsed behind a single "I'll be expensing this" toggle (hides 7 fields by default)
- Confirmation card on success with "Submit another" / "Back home"
- ~~Smart end-time auto-suggest~~ — skipped per your call

---

## 3. Gear request form

- Searchable picker with category tabs (Camera, Lens, Audio, Lighting, Accessory) — derived from `icon_kind`
- Per-item availability indicator pulled from existing approved `gear_requests` overlapping the chosen date
- Sticky cart summary (right column on desktop, bottom sheet on mobile)
- "Recently requested" quick-add chips based on the requester's name (last 5 from `gear_requests`)

---

## 4. Admin dashboard — extra polish

**Approved baseline:**
- "Needs attention" tile strip at top: New requests · Unstaffed in next 7 days · Pending gear (each clickable as a filter)
- Calendar moved above the lists, defaults to 2-week view on desktop
- Calendar event dots colored by status: red=needs action, amber=pending, green=staffed
- Global Cmd+K search across requests/photographers/gear/events
- Relative dates ("Tomorrow", "In 3 days") next to absolute dates

**Extra visual upgrades for the dashboard:**
- **Hero greeting strip** — "Good morning, {firstName} · 3 things need you today" replacing the plain page title
- **Calendar density toggle** — Day / Week / 2-Week / Month buttons with smooth transition
- **Event hover preview** — hovering a calendar dot reveals a popover with event name, location, fill status, claimed photographers (no click needed)
- **Color-coded location stripes** on calendar events — thin left border per location (515, Bloom, Cumberland, etc.) so location patterns are scannable at a glance
- **Activity feed sidebar** (right rail on xl screens) — last 10 events: "Jane claimed Sunday AM Worship · 12m ago", "New request from Cole · 1h ago" with relative timestamps, sourced from `gear_requests`/`photo_requests`/`photo_request_assignments` ordered by `created_at`/`reviewed_at`
- **Empty calendar weekends shaded** lightly so weekday/weekend rhythm reads instantly
- **Staffing health bar** at the top of "Upcoming photo" — horizontal segmented bar (green=fully staffed, amber=partial, red=empty, grey=denied) for the next 14 days

---

## 5. Header / nav + unified Team page

- Mobile (<md) nav collapses into hamburger Sheet with grouped sections
- Active state on dropdown triggers when any child route is active
- Breadcrumbs row on inner admin pages (Dashboard › Photography › Requests)
- Sign-out moves into a user avatar menu (initials) in the top-right; surfaces the signed-in display name

**Unified `/admin/team` page** (combines current `/admin/photographers` + `/admin/admins`):
- Single page titled "Team" with two tabs: **Photographers** | **Admins**
- Shared search/filter bar at the top
- Each row shows: avatar (initials), name, email, role badge (Admin / Point / Door Holder / Trainee), status (active/inactive), last activity
- Photographers tab keeps current actions (toggle active, delete, copy link, bulk import)
- Admins tab keeps invite/role management
- Hierarchy is visual: Admins listed first when "All" view is selected, then photographers grouped by tier
- Old `/admin/photographers` and `/admin/admins` routes redirect to `/admin/team` with the appropriate tab pre-selected

---

## 6. Photo request detail dialog

- Left action rail: Approve to board / Approve to shot list / Needs revisions / Deny (always one click)
- Roster fill indicator pinned to the top of the dialog
- Keyboard shortcuts: `J/K` next/prev request, `Esc` close, `A` approve to board
- History timeline ("Submitted 3d ago → Reviewed 2d ago by Cole → Jane claimed 1h ago") sourced from `created_at`, `reviewed_at`, and `photo_request_assignments.claimed_at`

---

## 7. Photographer "Serving Opportunities"

- Top filter bar: Location, Date range, Role (Point / Door Holder), "Only ones I qualify for" toggle
- "X spots remaining" prominently on each card
- Empty state for "My upcoming shoots" with pointer to the open list
- `.ics` calendar export button per claimed shoot (generated client-side)
- Gear request section auto-expanded if shoot is within 7 days and no gear has been requested yet

---

## 8. Cross-cutting polish

- Standardize toast copy/duration; add Undo on destructive actions (release shoot, delete request) using sonner's action button
- Illustrated empty states across all lists
- Loading skeletons replace "Loading…" text
- Audit dialogs/dropdowns/calendar for focus traps and tab order
- Photo request detail dialog → full-screen Sheet on mobile
- AlertDialog confirms for delete request / release claimed shoot

---

## Technical notes (database & functions)

- **No schema changes** required — everything reuses existing tables
- New edge function: `send-photographer-link` (uses Lovable Emails infrastructure; will need email domain setup if not already configured — I'll check first and prompt if needed)
- New route file: `src/routes/photographer-link.tsx`
- New route file: `src/routes/admin_.team.tsx` (replaces separate photographers/admins pages; old routes become redirects)
- New shared components: `NeedsAttentionStrip`, `ActivityFeed`, `StaffingHealthBar`, `CommandPalette` (Cmd+K), `BreadcrumbsBar`, `UserMenu`, `RequestActionRail`, `HistoryTimeline`, `JobFiltersBar`, `IcsExportButton`, `EmptyState`, `ListSkeleton`

---

## Suggested rollout order

Given the scope, I'd ship in 3 batches so each is testable:

1. **Batch A** (landing + nav + team merge): #1, #5
2. **Batch B** (admin dashboard + detail dialog): #4, #6, plus Cmd+K from earlier scope
3. **Batch C** (forms + photographer page + polish): #2, #3, #7, #8

Reply with **"go batch A"** (or all batches, or any subset) to kick off implementation.

