## Goal

New hires need accounts that can do everything an admin can — gear, requests, photographers, shot lists, team — **except** see or modify the onboarding admin backend (templates, shared pages, the new-hire roster, other hires' checklists/timelines).

They should still see their **own** new-hire onboarding view at `/onboarding`.

## Approach

Add a second role, `team`, alongside the existing `admin` role. Team members get the same permissions as admins on every table **except** the onboarding admin tables. Admin remains the top role and keeps full access including onboarding.

```text
admin  → everything (you, leadership)
team   → everything EXCEPT onboarding backend (new hires after they finish)
hire   → only their own onboarding view (already works via onboarding_hires.user_id)
```

You'll grant new hires the `team` role from the Admins page once they're ready to be team members. Their personal new-hire view keeps working because it's gated by `user_id` on `onboarding_hires`, not by role.

## What changes

**Database (one migration)**
- Add `'team'` to the `app_role` enum.
- Add a `has_admin_access()` helper = `has_role(uid,'admin') OR has_role(uid,'team')`.
- Update RLS policies on every non-onboarding table currently checking `has_role(uid,'admin')` to use `has_admin_access(uid)` instead. Tables: `gear`, `gear_history`, `gear_requests`, `gear_request_items`, `photo_requests`, `photo_request_openings`, `photo_request_assignments`, `photo_request_shot_lists`, `photographers`, `shot_list_templates`, `shot_list_segment_blocks`, `shot_list_location_blocks`, `admin_profiles`, `user_roles`.
- Leave the onboarding tables (`onboarding_pages`, `onboarding_templates`, `onboarding_hires`, `onboarding_hire_checklist`, `onboarding_hire_timeline`) checking `has_role(uid,'admin')` only — team members will be blocked from the backend automatically.

**Auth context (`src/lib/auth.tsx`)**
- Load both roles in `loadProfile`.
- Expose `isAdmin` (admin only) and a new `isTeam` flag (admin OR team).

**Route guard (`src/components/require-admin.tsx`)**
- Accept an optional `requireAdmin` prop (defaults to false).
- Default behavior: allow admins **and** team.
- When `requireAdmin` is true: only admins pass; team members see the "No admin access" card.

**Route updates**
- All four onboarding admin routes (`admin_.onboarding.tsx`, `admin_.onboarding_.hires.$hireId.tsx`, `admin_.onboarding_.pages.$slug.tsx`, `admin_.onboarding_.templates.$templateId.tsx`) wrap with `<RequireAdmin requireAdmin>` so team members get bounced out.
- Every other admin route stays as-is and now admits team members automatically.

**Admin landing page (`admin.tsx`)**
- Hide the "Onboarding" tile from team members (only render when `isAdmin`).

**Admins management page (`admin_.admins.tsx`)**
- Add UI to grant/revoke the `team` role alongside `admin`. (Existing admins-only — team members can't promote others.)
- Show role badges next to each user.

## Result

- A new hire signs up, completes their personal onboarding view at `/onboarding` (unchanged).
- When they're ready to be on the team, an admin grants them `team` from the Admins page.
- They get the full toolset: gear, requests, photographers, shot lists, history, team.
- Onboarding tile is hidden for them; direct URLs to onboarding admin pages show "No admin access".
- You stay an `admin` and retain full visibility, including managing the onboarding backend.

## Notes

- This is additive and reversible: existing admins keep working immediately, no data migration needed.
- The `user_roles` table is read by team (so badges render), but only admins can insert/delete roles — promotion stays gated to you.
