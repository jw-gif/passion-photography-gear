

## Option 2: Server-side validation for gear updates

Lock down what can be written to the `gear` and `gear_history` tables at the database level, so the public update form can't be abused via direct API calls. No UI or auth changes — admin password stays as-is.

### Database migration

Add constraints + a trigger to both tables:

- **`current_location`** — CHECK constraint: must be one of `'515'`, `'Cumberland'`, `'Trilith'`.
- **`last_note` / `note`** — CHECK constraint: length ≤ 200 characters.
- **`moved_by`** — CHECK constraint: length ≤ 50 characters.
- **`gear.name`** — CHECK constraint: length ≤ 100 characters (defensive; admin-only field today but cheap to add).
- **`gear_history.location`** — same CHECK as `current_location`.
- **Trigger on `gear` UPDATE** — force `last_updated = now()` server-side so clients can't backdate or skip it.

These are static value/length checks (no `now()` calls), so they're immutable and safe as CHECK constraints per project rules.

### What this blocks

- Garbage location strings that would break admin grouping.
- Unbounded note/name strings that could break rendering or bloat the table.
- Backdated `last_updated` timestamps.

### What this does NOT change

- The admin password stays hardcoded (accepted risk per your earlier decision).
- The public update form keeps working exactly as it does today — valid submissions pass the constraints fine.
- No RLS policy changes; updates remain public.

### Files touched

- New: `supabase/migrations/<timestamp>_gear_constraints.sql`

No app code changes needed. Existing client-side `maxLength` limits already keep legitimate users inside these bounds, so no user will ever see a constraint error in normal use.

