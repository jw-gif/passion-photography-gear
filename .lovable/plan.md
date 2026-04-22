

## Plan: Real authentication + role-based access + display name everywhere

This replaces the shared `passion.268!` password with proper email/password sign-in, adds an admins table with display names, hardens the database, and uses the signed-in person's name in QR/update flows.

---

### 1. Authentication system

**Sign-in method**: Email + password (no Google, since this is a small internal team — but I'll leave that easy to add later). New admins are created from inside the app by an existing admin.

**New page**: `/login`
- Email + password fields.
- Show/hide password toggle (eye icon button on the right of the field) — applies to every password field in the app.
- "Forgot password?" link → triggers a Supabase reset email → user lands on `/reset-password` to set a new one.
- Redirects back to where you came from after success (`?redirect=...`).

**New page**: `/reset-password`
- Reads the recovery token, lets the user set a new password (with show/hide).

**Removed**: `src/lib/admin-auth.ts` and the four `LoginGate` components in admin routes. The hardcoded `passion.268!` is gone from the bundle.

**Initial admin**: I'll seed one admin row for you to claim. You'll get a sign-up link once and set your password — then you create the rest of the team from inside the Manage page.

---

### 2. Database changes

**New tables**:

- `admin_profiles` — stores display name per admin user.
  - `id uuid` (FK → `auth.users.id`, cascade delete)
  - `display_name text not null` (e.g. "Jacob", "Jenna")
  - `created_at`, `updated_at`
- `user_roles` — separate table per security best practice.
  - `id uuid pk`, `user_id uuid` (FK → `auth.users.id`, cascade), `role app_role not null`
  - Unique on `(user_id, role)`
- New enum `app_role` with one value: `admin`. (Easy to extend later.)

**New SECURITY DEFINER function**: `public.has_role(_user_id uuid, _role app_role) returns boolean` — used in all admin RLS checks. Avoids recursive RLS.

**Trigger**: when a new row is added to `auth.users` for someone we've pre-authorized, auto-create their `admin_profiles` row. (For simplicity, I'll just have the admin invite flow insert both rows together.)

**RLS policy overhaul** (replaces all the current `true` policies):

| Table | Public can | Admin can |
|---|---|---|
| `gear` | SELECT, UPDATE (location fields only — see #3) | INSERT, DELETE, full UPDATE |
| `gear_history` | SELECT, INSERT | (no changes needed) |
| `gear_requests` | SELECT, INSERT | UPDATE, DELETE |
| `gear_request_items` | SELECT, INSERT | UPDATE, DELETE |
| `admin_profiles` | SELECT (so we can show names on history) | UPDATE own, admin can UPDATE all |
| `user_roles` | nothing | SELECT, INSERT, DELETE (admins only) |

---

### 3. Lock down public gear updates (Input validation finding)

A DB trigger on `gear` UPDATE rejects unauthenticated edits to anything except `current_location`, `sub_location`, `last_note`, `moved_by`, `last_updated`. Also caps lengths (sub_location ≤ 100, note ≤ 200, moved_by ≤ 50) and validates `current_location` is one of `'515' | 'Cumberland' | 'Trilith'`. Authenticated admins bypass these checks.

---

### 4. Use the signed-in admin's display name everywhere

**On `/admin` (drag & drop)**: when logged-in, use the admin's `display_name` for `moved_by` instead of the literal string `"Admin"`.

**On `/?gear=<id>` (public QR update form)**:
- If signed in as an admin, the **"Your name"** dropdown is pre-selected to the admin's `display_name` (added to the dropdown if not already in `MOVERS`). The form still lets them change it if they're updating on someone else's behalf.
- If not signed in, the form behaves exactly as today.

**On `/admin/history`, `/admin/requests`, gear card history popovers**: anywhere the code currently renders the literal `"Admin"`, swap to the actual person's name (already stored in `moved_by` from the writes above).

**Approve/deny on `/admin/requests`**: `reviewed_by` gets the admin's display name instead of `"Admin"`.

---

### 5. Show/hide password toggle (your request)

A small reusable `<PasswordInput />` component with an eye icon button on the right that toggles `type="password"` ↔ `type="text"`. Used on:
- `/login`
- `/reset-password`
- Manage admins page (when creating new admin or changing password)

---

### 6. Manage admins (under `/admin/manage`)

A new "Admins" tab/section on the existing manage page so you can:
- See all admins (email + display name)
- Invite a new admin (email + display name → sends magic invite link)
- Rename / remove admins
- Reset your own password from inside the app

---

### Files

**New**:
- `src/routes/login.tsx`
- `src/routes/reset-password.tsx`
- `src/components/password-input.tsx`
- `src/lib/auth.tsx` — `useAuth()` hook + provider wrapping the app, exposes `user`, `displayName`, `isAdmin`, `signIn`, `signOut`
- `src/routes/_authenticated.tsx` — pathless layout route that gates `/admin*` behind auth + admin role
- Migration: `admin_profiles`, `user_roles`, `app_role` enum, `has_role()`, RLS policies, gear-update validation trigger

**Edited**:
- `src/routes/__root.tsx` — wrap in auth provider
- `src/routes/admin.tsx`, `admin_.manage.tsx`, `admin_.history.tsx`, `admin_.requests.tsx` — move under `_authenticated`, drop `LoginGate`, use display name for `moved_by` / `reviewed_by`
- `src/routes/index.tsx` — auto-fill mover name when admin is signed in
- `src/router.tsx` — pass auth context to router

**Deleted**:
- `src/lib/admin-auth.ts`

---

### Initial setup (one-time, after this lands)

1. I'll seed one admin row with your email — you'll get an invite email, set your password, and you're in.
2. From `/admin/manage` → Admins tab, you invite the rest of the team.
3. The old shared password no longer works.

### What this fixes from the security scan

- ✅ `SECRETS_EXPOSED` — hardcoded password gone
- ✅ `CLIENT_SIDE_AUTH` — replaced with real Supabase Auth
- ✅ `PUBLIC_DATA_EXPOSURE` — RLS policies now require admin role for destructive ops
- ✅ `UNRESTRICTED_WRITE_ACCESS` — same
- ✅ `INPUT_VALIDATION` — DB trigger caps what public QR scans can write

