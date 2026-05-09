## Goal

Make `/photographers/$id` and `/jobs` the same experience: one beautiful, holistic photographer page that keeps the polished card-based look of the current jobs board and adds the dashboard modules (events/RSVPs, gear requests, training videos, announcements, quick actions). Both URLs render the same component; access works either via login or the legacy `?t=token` magic-link.

## What changes

**One unified page** at `/photographers/$id` rendered with the jobs page's visual language:
- Hero header from the jobs page (greeting + tier badge), enriched with a "View as admin" notice when staff browse another photographer.
- Tabs reused from the jobs page, expanded:
  1. **Open shoots** — current jobs board with filters, grouped shoot cards, claim/release.
  2. **My shoots** — current accepted shoots list with ICS export.
  3. **Events** — upcoming events with RSVP toggle and capacity, click-through to event details dialog.
  4. **Training** — training video grid with player dialog.
  5. **Updates** — pinned + recent announcements with detail dialog.
- A persistent quick-action rail under the header (Request gear, Request photography) and a gear-requests strip showing the photographer's recent requests.

**Routing**
- `/photographers/$id` becomes the canonical page.
- `/jobs` keeps working: it reads `?t=token`, resolves the photographer, and forwards to `/photographers/$id?t=token` (preserving the token).
- `/dashboard` keeps its current redirect behavior.
- Logged-in admins/team viewing another photographer see the same page in read-only mode (no claim/RSVP/release buttons; "Admin view" banner).

**Access (login OR token)**
- If `?t=` is present and resolves to this photographer, treat the visitor as the owner — no login required, all owner actions enabled. (Matches today's `/jobs` behavior.)
- Otherwise require login: owner = signed-in user whose `photographers.user_id` matches; team/admin = read-only view.
- The page picks the right Supabase calls based on which credential is active (token-based RPCs vs. user-based queries).

**Visual polish (keep the jobs aesthetic, make it more holistic)**
- Same card style, same tier badge, same filter bar.
- Wider container (`max-w-5xl`) so the extra modules breathe.
- Section headers with the existing icon + title pattern; consistent spacing and dividers.
- Empty states styled like the current jobs empty state (icon + soft copy).
- Mobile: tabs scroll horizontally; cards stack; quick actions wrap.

## Files

- **Rewrite** `src/routes/photographers.$id.tsx` — adopt the jobs page layout, add Events / Training / Updates tabs, support both auth modes.
- **Edit** `src/routes/jobs.tsx` — replace body with a redirect to `/photographers/$id?t=token` after resolving the photographer (keeps emailed links working).
- **Edit** `src/routes/dashboard.tsx` — unchanged behavior; verify it still routes photographers to the new unified page.
- No DB or RPC changes. Existing RPCs (`get_photographer_by_token`, `list_open_jobs`, `list_my_jobs`, `claim_job`, `release_job`) and the existing tables (`event_rsvps`, `gear_requests`, `events`, `announcements`, `training_videos`) cover everything.

## Out of scope

- No changes to admin pages other than the existing "View page" link already pointing to `/photographers/$id`.
- No changes to email templates or the magic-link generator.
- Onboarding, gear request forms, photo request form: untouched (the page links to them).
