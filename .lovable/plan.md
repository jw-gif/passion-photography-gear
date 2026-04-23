

# Phase 2 — Photographer Job Board (revised)

Updates to the previously approved plan based on your feedback. Only the changed parts are listed; everything else from the prior plan stands.

## What changed

1. A photo request now has a **mix of role openings** (e.g. 1 Point + 2 Door Holders + 1 Training Door Holder), not a single `min_tier` gate.
2. Each role opening has its own budget/rate. **Only the Point role is paid**; Door Holder and Training Door Holder are unpaid.
3. **Only photographers with `point` tier can see the budget** for the Point opening. Door Holders and Training Door Holders never see budget info.
4. When a higher-tier opening is already filled, lower-tier photographers (or the same Point photographer) can still claim a remaining lower-tier opening — and the UI must make it clear the spot they're signing up for is **unpaid Door Holder coverage**, not a paid Point spot.

## Data model changes

Replace the `photo_requests.min_tier` column from the prior plan with a new table:

`photo_request_openings`:
- `id uuid pk`
- `request_id uuid not null` → photo_requests
- `role photographer_tier not null` (`point` | `door_holder` | `training_door_holder`)
- `budget_cents integer` — only allowed when `role = 'point'`; enforced by check constraint and validation trigger
- `position smallint not null default 1` — disambiguates multiple openings of the same role on one shoot (e.g. Door Holder #1, Door Holder #2)
- `created_at`
- Unique on `(request_id, role, position)`

`photo_request_assignments` (from prior plan) gains:
- `opening_id uuid not null` → photo_request_openings
- Partial unique index becomes `(opening_id) where released_at is null` so each opening can only have one active claim.

Drop `photo_requests.min_tier` (it isn't created — the prior plan was approved but not yet implemented; this supersedes it).

## RPCs (security-definer functions)

- `list_open_jobs(token)` — returns one row per **open opening** the photographer is eligible for. Eligibility rule: photographer's tier ≥ opening's role (point ≥ door_holder ≥ training_door_holder). Each row carries: request_id, opening_id, role, event details, location, coverage types, on_site_contact, AND `budget_cents` **only when both** the opening's role is `point` AND the calling photographer's tier is `point`. Otherwise budget is returned as `null`.
- `get_job(token, opening_id)` — same field-level redaction rule for budget.
- `claim_job(token, opening_id)` — atomic insert into `photo_request_assignments` with the partial unique index preventing double-claims. Validates the photographer's tier covers the opening's role.
- `release_job(token, opening_id)` — sets `released_at`, only if within 48h of `claimed_at` and the caller owns the active claim.

## Admin UI changes (`/admin/requests-photography` detail)

The "Assignment" panel becomes a **Coverage roster builder**:

- Add Opening button → choose role (Point / Door Holder / Training Door Holder).
- For Point openings, show a **Budget** input (USD, stored as cents). Door Holder and Training Door Holder rows have no budget field at all (the form simply doesn't render it).
- Each opening row shows: role badge, budget (Point only), assigned photographer name + claim time, and a Release button.
- Removing an opening that's already claimed prompts a confirm.
- Visual roster summary: "1 Point ($300) — assigned · 2 Door Holders — 1 open, 1 assigned · 1 Training Door Holder — open".

## Photographer board UI changes

**Open shoots tab**

- One card per **opening** (so a single shoot with 1 Point + 2 Door Holder slots open shows up as 3 cards).
- Card title: event name. Below it, a prominent **role badge**:
  - Point card (visible to Point photographers only): shows budget chip "$300 — Paid".
  - Door Holder card (visible to Point + Door Holder + Training Door Holder photographers): shows "Door Holder · Unpaid coverage" chip.
  - Training Door Holder card: shows "Training · Unpaid coverage" chip.
- Above the cards for a given shoot, a small contextual banner when relevant: "The Point spot for this shoot is already taken — the openings below are unpaid Door Holder coverage." This banner only renders for Point-tier photographers viewing a shoot where the Point opening is filled but Door Holder openings remain. It prevents a Point photographer from accidentally thinking they're claiming a paid spot.
- Claim button label adapts: "Claim paid Point spot" for Point openings; "Sign up as Door Holder (unpaid)" for Door Holder; "Sign up as Training Door Holder (unpaid)" for Training.

**My shoots tab**

- Each row shows the role they claimed and, for Point claims only, the budget. A claimed Door Holder spot never shows any budget figure even if the same photographer is a Point-tier user.

**Job detail page (`/jobs/$openingId?t=...`)**

- Same role/budget rules. Confirmation modal before claiming spells out the role and pay status one more time.

## Backend enforcement summary

Budget visibility is enforced **server-side** in the RPC (not just hidden in UI):
- `list_open_jobs` and `get_job` strip `budget_cents` to `null` whenever the opening role isn't `point` OR the caller isn't a `point`-tier photographer.
- The browser only ever receives a budget value when both conditions are true. A door holder cannot inspect network traffic and see Point pay.

## Out of scope (unchanged)

- SMS sending, AI shot list generator, drag-to-reschedule, conflict detection, automatic notifications.

