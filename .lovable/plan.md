
# Landing page, photographer accounts & dashboard overhaul

## 1. Landing page (`/`)

Replace the current gear-request-as-homepage with a login-focused landing.

- Hero with sign-in card (email + password, plus "Email me a magic link" option)
- Photo grid section (admin-uploadable images via a new `landing_photos` storage bucket + table; placeholders until you upload)
- Tagline / brief "what is Passion Photography Team" copy
- Footer link: "Find a piece of gear by QR code? Update its location" → keeps the existing public QR flow at `/?gear=xxx` working unauthenticated (no change to that path)
- Removes public access to gear request and photography request forms; both move behind sign-in
- Admin login link stays in footer

After sign-in:
- `admin` / `team` → `/admin`
- `photographer` (new role) → `/dashboard` (new photographer dashboard)

## 2. Photographer auth accounts

Photographers become real auth users.

- Add `user_id uuid` column to `photographers` (nullable, unique)
- New role: `photographer` in the `app_role` enum
- Admin "Photographers" page gets an "Invite to dashboard" button → creates an auth user, assigns `photographer` role, links `photographers.user_id`, sends magic-link/invite email
- New `/auth/magic-link` flow on the landing page: photographer enters email → server fn sends a Supabase magic link (only if a `photographers` row with that email exists). Generic success message either way.
- Existing token-based `/jobs?token=…` deep link still works (back-compat for already-distributed links)
- Update `useAuth` to expose `isPhotographer` and route accordingly

## 3. Photographer dashboard (`/dashboard`)

Single-page overview with cards:

- **Open serving opportunities** — uses existing `list_open_jobs` (rewritten to accept the signed-in photographer instead of token)
- **My accepted jobs** — `list_my_jobs` equivalent
- **My gear requests** — pulls from `gear_requests` filtered by new `photographer_id`
- **Quick actions**: Request gear, Request photography (forms now require sign-in)
- **Upcoming events / RSVP** (module 4a)
- **Training videos** (module 4b)
- **Announcements feed** (module 4c)

## 4. New modules

### 4a. Events & RSVPs
- `events` table: title, description, location, starts_at, ends_at, capacity, cover_image
- `event_rsvps` table: event_id, photographer_id, status (going/maybe/declined), responded_at
- Admin page `/admin/events` for CRUD
- Dashboard card: list upcoming events, one-click RSVP

### 4b. Training & workshop videos
- `training_videos` table: title, description, video_url, thumbnail_url, category, sort_order, published
- New storage bucket `training-videos` (private, photographer-readable) for uploads; admins can also paste an external URL (Vimeo/YouTube)
- Admin page `/admin/training` with upload UI
- Dashboard "Training library" grid with inline player

### 4c. Announcements / posts
- `announcements` table: title, body (markdown), pinned, published_at, author_id
- Admin page `/admin/announcements` with simple editor
- Dashboard feed showing pinned + most-recent

## 5. Gear requests linkage

- Add `photographer_id uuid` (nullable) and `user_id uuid` (nullable) to `gear_requests`
- Authenticated submissions auto-fill these
- Photographer dashboard "My gear requests" filters by `photographer_id` first, falls back to email match for legacy rows
- RLS: photographers can read their own gear requests

## Technical notes

- **DB migrations:** add `user_id` to `photographers`; add `photographer` to `app_role` enum; add `photographer_id`/`user_id` to `gear_requests`; create `events`, `event_rsvps`, `training_videos`, `announcements`; storage buckets `landing-photos` (public) and `training-videos` (private).
- **RLS:**
  - Photographers read their own row, RSVPs, gear requests; read all published events/videos/announcements.
  - Admins (`has_role 'admin'`) full CRUD on everything new.
  - `landing_photos` table: public read, admin write.
- **Helper fn:** `link_photographer_to_current_user()` (mirrors `link_hire_to_current_user`) to attach a photographer row by email on first sign-in.
- **Routing:**
  - `/` — landing (public, with QR `?gear=` short-circuit kept)
  - `/dashboard` — photographer (gated)
  - `/admin/events`, `/admin/training`, `/admin/announcements`
  - `/request-gear`, `/request-photography` become auth-gated
- **Email:** uses existing Lovable auth email infrastructure for magic links — no new provider config.
- **Out of scope this round:** notifications, comments on announcements, video transcoding (uploads play as-is), event waitlists.

## Open assumptions (call out before I build if any are wrong)

1. Magic-link sign-in for photographers piggybacks on Supabase's built-in magic link (so they get a real session, not a token URL).
2. Training videos: direct file upload to storage is fine; we won't transcode. External video URLs (Vimeo/YouTube) also supported.
3. Landing photos are admin-uploaded only — no captions/links per photo, just an ordered grid.
4. Gear-request "manage" for photographers = view + cancel their own pending requests (not edit after submit).
