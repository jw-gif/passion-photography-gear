## Root cause

Two bugs prevent Jenna (and any newly-invited hire) from being linked to her `onboarding_hires` row:

1. **`/reset-password` always redirects to `/admin`** after a successful password set. Hires aren't admins, so `RequireAdmin` shows the "No access" card. Nothing ever takes them to `/onboarding`.

2. **The "link hire by email on first sign-in" code can't actually run for hires.** Both `login.tsx` and `onboarding.tsx` try to:
   - `select` from `onboarding_hires where email = ... and user_id is null`, then
   - `update onboarding_hires set user_id = ...`

   But the RLS policies on `onboarding_hires` only allow:
   - SELECT: `has_role(auth.uid(), 'admin')` OR `user_id = auth.uid()`
   - UPDATE: admin only

   For a freshly-signed-in hire whose row has `user_id = null`, both the SELECT and the UPDATE silently return nothing. The link never happens, so `/onboarding` shows the generic welcome page and the admin dashboard keeps showing "not linked".

   I confirmed Jenna's row in the DB still has `user_id = null` and her email is already lowercase, ruling out a casing mismatch.

## Fix

### 1. New SECURITY DEFINER function: `link_hire_to_current_user()`

Migration adds a Postgres function that:
- Reads `auth.uid()` and `auth.jwt() ->> 'email'` (lowercased).
- Updates `onboarding_hires set user_id = auth.uid() where email = <jwt email> and user_id is null`.
- Returns the linked hire id (or null).
- `GRANT EXECUTE ... TO authenticated`.

This bypasses RLS safely because it only ever links a row to the currently-authenticated user's own email.

### 2. Reset-password redirect (`src/routes/reset-password.tsx`)

After `updateUser({ password })` succeeds:
- Call `supabase.rpc("link_hire_to_current_user")`.
- Re-check role via `useAuth` / a fresh `user_roles` query.
- Route admins → `/admin`, everyone else → `/onboarding`. (Mirrors the logic already in `login.tsx`.)

### 3. Login page (`src/routes/login.tsx`)

Replace the inline `update onboarding_hires` call with `supabase.rpc("link_hire_to_current_user")`. The existing `useAuth` effect already handles admin-vs-hire routing.

### 4. Onboarding page (`src/routes/onboarding.tsx`)

In `loadData`, when no hire row is found by `user_id`, call `supabase.rpc("link_hire_to_current_user")` and re-query by `user_id` instead of trying to SELECT an unlinked row directly. Removes the dead by-email SELECT branch that RLS was blocking.

### 5. Backfill Jenna

The migration also runs a one-shot UPDATE to link her existing auth user to her hire row by email, so she doesn't have to log out/in again.

## Files

- new migration: `link_hire_to_current_user()` function + grant + Jenna backfill
- `src/routes/reset-password.tsx` — call RPC, route by role
- `src/routes/login.tsx` — call RPC instead of direct update
- `src/routes/onboarding.tsx` — call RPC in the unlinked-hire fallback

## Out of scope

- Changing the invite email template or auth-email-hook.
- Adding RLS policies that would let hires see/update their own pre-link row directly (the SECURITY DEFINER RPC is safer and narrower).
