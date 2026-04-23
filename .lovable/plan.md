

# Phase 3 — AI Shot List Generator (final scope)

Two surfaces for shot lists:

1. **Per-request brief** inside the admin photo-request dialog (already scoped in the prior plan — unchanged below).
2. **Standalone shot list generator page** at `/admin/shot-list-generator` — pick options, generate, copy to clipboard. No request needed.

## 1. Standalone generator page (`/admin/shot-list-generator`)

Admin-only route. Single screen with three columns on desktop, stacked on mobile.

**Left column — Inputs**
- Location: select from `EVENT_LOCATIONS` (`src/lib/locations.ts`).
- Rooms / spaces: multi-select chips populated from a new `LOCATION_ROOMS` map (e.g. 515 → AUD, Lobby, Oval, Outside; bloom → Kids Room, Hallway). Admin can also type a custom room.
- Segments: multi-select chips of common segments pulled from the uploaded samples — Pre-Gathering, Worship, Hosting + Giving, Talk, Passion Kids + bloom, Middle School, Family Groups, One-Offs / Baptisms, Editing + Uploading. Admin can add a custom segment.
- Roles to cover: multi-select Point / Door Holder / Training Door Holder / All.
- Optional fields: Call time, Door code, Wrap time, Event name (free text).
- Focus textarea: "Anything special this week? e.g. baptism Sunday, sponsor signage, new building tour."

**Middle column — Generated brief**
- Generate button → calls a new edge function `generate-shot-list-standalone` with the form payload.
- Renders the same `Brief` shape used by per-request briefs (reusing the renderer in `src/lib/shot-list.ts`).
- Each segment is editable inline (rename, edit shots, add/remove, change priority, reassign roles).
- Regenerate button (keeps current inputs, replaces output).

**Right column — Output / Copy**
- Live "Plain text preview" rendered in the Slack/PDF style (`// SECTION //`, role tags, bullet shots) so admin sees exactly what gets copied.
- Buttons: **Copy as plain text**, **Copy as Markdown**, **Download .txt**.
- Clipboard uses `navigator.clipboard.writeText` with toast confirmation.

The page does NOT save to the database — it's a one-shot generator. A small "Save as template" follow-up is out of scope.

## 2. Per-request brief (unchanged from prior approved plan)

- New table `photo_request_shot_lists (request_id unique, brief jsonb)`.
- New tab "Brief" in the photo-request admin dialog using the same `ShotListEditor` component.
- New RPC `get_shot_list(_token, _opening_id)` filters segments by photographer role and returns the brief on the photographer job board.
- Edge function `generate-shot-list` (admin-only, JWT verified).

Both edge functions use `google/gemini-3-flash-preview` via Lovable AI Gateway with the same `propose_brief` tool schema and the same Passion-style system prompt + few-shot example built from the uploaded samples.

## Shared building blocks

- `src/lib/shot-list.ts` — TypeScript types for `Brief`, `Segment`, `Shot`, plus `renderBriefAsText(brief)` used by both the per-request preview and the standalone copy buttons.
- `src/lib/segments.ts` — `COMMON_SEGMENTS`, `LOCATION_ROOMS`, default focus copy.
- `src/components/shot-list-editor.tsx` — reused by both surfaces, accepts `{ brief, onChange, onRegenerate }` so it doesn't care whether the source is a saved request or a transient generator session.

## Files to create / edit

Create:
- `supabase/migrations/<ts>_shot_lists.sql` — table, RLS, `get_shot_list` RPC.
- `supabase/functions/generate-shot-list/index.ts` (per-request).
- `supabase/functions/generate-shot-list-standalone/index.ts` (standalone, accepts free-form payload).
- `src/lib/shot-list.ts`, `src/lib/segments.ts`.
- `src/components/shot-list-editor.tsx`.
- `src/routes/admin_.shot-list-generator.tsx`.

Edit:
- `src/routes/admin_.requests-photography.tsx` — add Brief tab inside detail dialog.
- `src/routes/jobs.tsx` — render filtered brief on claimed jobs.
- `src/components/hub-header.tsx` — add "Shot list generator" link in admin nav.

## Out of scope

- Saving standalone generator outputs as reusable templates.
- Photographer "captured" check-offs.
- AI mood boards / reference imagery.
- Auto-emailing briefs to claimed photographers.

