# Fix "Open hire view" slow load

## Root cause

When you click "Open hire view", the URL `/onboarding?previewHire=...` opens with admin preview intent. But the page decides which data to load based on this:

```ts
const isPreview = Boolean(previewHire && isAdmin);
```

On first paint:
1. `loading` flips to false as soon as the session is restored.
2. `isAdmin` is still `false` because the `user_roles` lookup (`loadProfile`) runs separately and hasn't finished yet.
3. `loadAll` therefore runs in the **non-preview branch** — it tries to find a hire row whose `user_id` equals your admin user id, finds nothing, and renders the "no plan / welcome" fallback.
4. A moment later `isAdmin` flips to `true`, the effect re-fires, `loadAll` re-runs in **preview branch**, fetches the hire by id, and finally the hire's view appears.

That's the multi-second flash of the welcome page followed by the real page.

## Fix

Two small, targeted changes — no architectural changes, no new dependencies.

### 1. `src/lib/auth.tsx` — keep `loading` true until roles resolve

Right now `loading` is set to false when `getSession` returns, before `loadProfile` (which fetches `user_roles`) finishes. Change the initial-session branch to await `loadProfile` fully, and also flip `loading` to false from the `onAuthStateChange` path once the deferred `loadProfile` completes (so login flows still work).

Result: `useAuth().loading` stays `true` until both session and roles are known. Consumers that gate on `loading` won't see a stale `isAdmin: false`.

### 2. `src/routes/onboarding.tsx` — gate render and data load on `loading`

- Show a skeleton (not the "no hire" welcome) while `loading || loadingData`.
- Only call `loadAll` after `loading` is false, so `isPreview` is correct on the first call.
- Run the pages query in parallel with the hire lookup (currently the hire lookup blocks the pages query). Minor win, but removes one serial round-trip.

Pseudocode:

```ts
useEffect(() => {
  if (loading) return;          // wait for auth + roles
  if (user) loadAll(user.id);
}, [loading, user, previewHire, isPreview]);

// in render
if (loading || loadingData) return <PageSkeleton />;
```

## Files touched

- `src/lib/auth.tsx` — make `loading` reflect both session and role load.
- `src/routes/onboarding.tsx` — gate effect and render on `loading`; parallelize pages + hire fetch.

## Expected result

Clicking "Open hire view" goes straight to a brief skeleton, then directly to the hire's onboarding view. No more welcome-page flash, and the perceived load time drops to roughly a single round-trip.
