## Goal

Replace the current tabbed `/photographers/$id` page with a single-page, scroll-friendly dashboard inspired by the reference mockup: a compact org header, a personal greeting with weekly summary, an "Open opportunities" card grid, an "Your upcoming opportunities" list, and a "Team & resources" zone with Team events, Workshop library, and Announcements side-by-side.

## Layout

```text
┌───────────────────────────────────────────────────────────────┐
│ [logo] Lens & Light Studio                  [bell]  [avatar]  │
│        Photographer dashboard                                 │
├───────────────────────────────────────────────────────────────┤
│ Welcome back, {name}                                          │
│ You have N opportunities this week and M new ones to claim.   │
├───────────────────────────────────────────────────────────────┤
│ Open opportunities                              N available   │
│ ┌─ card ──────────┐  ┌─ card ──────────┐                      │
│ │ Title    [tag]  │  │ Title    [tag]  │   (2-col grid;       │
│ │ Place · Date    │  │ Place · Date    │    1-col on mobile)  │
│ │ hrs · $ · #ph   │  │ hrs · $ · #ph   │                      │
│ │ [Claim] [Det.]  │  │ [Claim] [Det.]  │                      │
│ └─────────────────┘  └─────────────────┘                      │
├───────────────────────────────────────────────────────────────┤
│ Your upcoming opportunities                  X in next 7 days │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ [MAY 12] Title · time · place · hrs   [status][gear ↗] │   │
│ │ [MAY 14] Title · …                    [status][gear ↗] │   │
│ └─────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────┤
│ Team & resources                                              │
│ ┌─ Team events ─────────────────────────────────────────┐     │
│ │ [date] Title · day · time · N going  [RSVP][Maybe]   │     │
│ └───────────────────────────────────────────────────────┘     │
│ ┌─ Workshop library ─────────┐  ┌─ Announcements ─────┐      │
│ │ [▶] Title · min · level    │  │ • Title             │      │
│ │ [▶] Title · min · level    │  │   sub · time        │      │
│ └────────────────────────────┘  └─────────────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

## What changes

- **Drop the tabbed shell.** Replace with a single scrollable page using the sections above.
- **New compact header**: small logo tile + org name + "Photographer dashboard" subtitle on the left; bell + avatar (initials) on the right. Sign-out and admin-view banner move into the avatar menu / a thin bar above the header.
- **Greeting block** computes the week's confirmed shoots count and the open-jobs count to fill the sentence.
- **Open opportunities**: 2-column card grid (1-col on mobile). Each card shows title, segment tag (right-aligned, colored pill), location · date, then `hours · budget · photographers needed`, and two buttons (`Claim opportunity`, `Details`). "N available" counter in the section header. Keeps existing filter logic but condenses it into a single "Filter" popover button next to the counter (so the cleaner look is preserved). Reuses `claim_job` RPC.
- **Your upcoming opportunities**: condensed list rows (date chip on left, title + meta in middle, status pill + "Request gear ↗" link on the right). Sourced from existing "my shoots" data. Status pill derives from gear request state (`Confirmed` / `Gear pending`). Clicking a row opens the existing brief/EventGearPanel in a Dialog (instead of inline expand).
- **Team & resources**:
  - **Team events** card: rows with date chip, title, "day · time · N going", RSVP yes/maybe buttons (uses existing `event_rsvps` write).
  - **Workshop library** card: list of training videos with colored play tile, title, "min · level". Click opens the existing video dialog.
  - **Announcements** card: bulleted list (dot color = unread/pinned), title, sub + relative time. Click opens the existing announcement dialog.
- **Read-only/admin view**: same data, but Claim / RSVP / Request-gear buttons hidden; an "Admin view" strip sits above the header.
- **Token + login auth**: unchanged. Both modes still resolve to this page.

## Files

- **Rewrite** `src/routes/photographers.$id.tsx` — new layout, same data fetching and RPC calls. Keep all existing query logic; only the presentation changes. Pull section JSX into local components (`OpportunityCard`, `UpcomingRow`, `TeamEventRow`, `WorkshopRow`, `AnnouncementRow`) inside the same file to keep the diff scoped.
- **No** changes to `jobs.tsx`, `dashboard.tsx`, RPCs, tables, or admin pages.
- **No** changes to `EventGearPanel`, `ConfirmDialog`, `IcsExportButton`, `event-detail-dialog`, or training/announcement dialogs — they're reused.

## Visual details

- Wider container `max-w-5xl`, generous vertical spacing (`space-y-10`), section headers as `flex justify-between` with title + small right-side meta.
- Cards: `rounded-xl border bg-card p-5` with subtle shadow on hover for clickable cards.
- Segment tags reuse the existing colored pill component.
- Date chips: small rounded square with two lines (`MAY` / `12`) tinted by segment.
- Mobile: header collapses, grids drop to 1 column, buttons stack full-width.
- Tokens only — no hardcoded colors.

## Out of scope

- Notifications bell behavior (render a static bell icon for now; wire later).
- Reordering or DB changes.
- Replacing the gear/photo request forms.
- Changing onboarding, admin pages, or email templates.
