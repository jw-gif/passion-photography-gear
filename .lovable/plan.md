## Goal

When an admin creates a new hire in **Admin → Onboarding**, automatically email them a branded invite that lets them set a password and sign in. On first sign-in they land on `/onboarding` with their plan already linked.

## How it works

```
Admin clicks "Create"  →  insert onboarding_hires row
                       →  call invite-hire server fn
                       →  supabase.auth.admin.inviteUserByEmail(email, redirectTo: /reset-password)
                       →  Supabase fires email hook → auth-email-hook → renders InviteEmail
                       →  Hire clicks link → /reset-password → sets password → signs in
                       →  login.tsx already links onboarding_hires.user_id by email
```

The `InviteEmail` template, `auth-email-hook`, and email queue are already wired up — we just need to trigger the invite.

## Changes

### 1. New server function: `src/server/hires.functions.ts`
- `inviteHire({ email, name })` — admin-only.
- Uses `supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: \`${origin}/reset-password\`, data: { name } })`.
- Verifies caller is admin via `requireSupabaseAuth` middleware + `has_role` check.
- Returns `{ ok, alreadyExists }` so the UI can show "invite resent" vs "invite sent".
- Idempotent: if the user already exists in auth, fall back to `generateLink({ type: 'recovery' })` so they still get an email (handles re-invite case).

### 2. Hook into hire creation: `src/routes/admin_.onboarding.tsx`
In `NewHireDialog.submit()`, after the `onboarding_hires` insert and template population succeed, call `inviteHire({ email, name })`. Show a toast: "Hire created — invite email sent to {email}". Failure to send the invite does NOT roll back the hire (admin can resend).

### 3. Add a "Resend invite" action on the hire detail page
`src/routes/admin_.onboarding_.hires.$hireId.tsx` — small button in the header that calls `inviteHire` again. Useful when the original email is lost or the hire was created before this feature existed (e.g., Jenna).

### 4. Tweak the existing `InviteEmail` template
`src/lib/email-templates/invite.tsx` — copy already says "You've been invited to join the hub." Verify `confirmationUrl` redirects through `/reset-password` so the hire sets a password rather than getting auto-logged-in. The auth-email-hook already passes the right URL based on Supabase's `email_action_type = 'invite'`.

### 5. Login page
No changes needed. `login.tsx` already:
- Links `onboarding_hires.user_id` by email on first sign-in.
- Routes non-admin users to `/onboarding`.

`/reset-password` already exists and handles the recovery/invite token flow.

## Out of scope

- Self-signup form (option B) — not building this.
- Bulk invite for existing un-invited hires — admin can use the per-hire "Resend invite" button.

## Notes

- No new env vars or secrets needed; `SUPABASE_SERVICE_ROLE_KEY` is already set.
- No DB migration needed.
- Branded invite email already routes through `auth-email-hook` and the email queue — DNS for `email.passionphotography.team` must be verified for delivery (you can check in Cloud → Emails).
