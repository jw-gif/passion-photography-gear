

## Add a global activity log page

A new admin-only page that shows every gear location change across all items in one chronological feed.

### Route

- New file `src/routes/admin.history.tsx` → `/admin/history`
- Reuses the same shared-password gate as `/admin` (via `isAdmin()` from `src/lib/admin-auth.ts`); redirects to login if not authed.

### Data

- Single query: `gear_history` joined with `gear` (name) ordered by `timestamp` desc, limit 200 with a "Load more" button.
- Subscribes to `postgres_changes` on `gear_history` so new entries appear live.
- Existing RLS already permits public read on both tables — no migration needed.

### UI

- Header: "Activity Log" + back link to `/admin`.
- Filters bar:
  - Location filter (All / 515 / Cumberland / Trilith)
  - Gear filter (dropdown of all 14 items, default All)
- Feed: table on desktop, stacked cards on mobile. Each row shows:
  - Timestamp (relative + absolute on hover)
  - Gear name (links to `/?gear=<id>` public page)
  - Location badge (reuses `locationClasses` from `src/lib/locations.ts`)
  - Note (if any)
- Empty state when filters return nothing.

### Admin dashboard tweak

- Add a "View activity log" link in the `/admin` header next to the logout button.

### Files touched

- New: `src/routes/admin.history.tsx`
- Edit: `src/routes/admin.tsx` (add header link only)

No database, RLS, or auth changes.

