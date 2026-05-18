# Visual refresh + interleaved consolidation

Inspiration: the three Claude mockups (upcoming/calendar, gear-out + announcements/activity, admin events list). We adopt the *vibe* — warm cream surfaces, large serif display headings with italic accents, soft rounded cards, bright cyan primary, location-coded dots — not the copy or exact pixels.

## 1. Design tokens (foundation, do first)

Edit `src/styles.css`:
- **Surfaces:** add a warm off-white app background (`--background` ~ `oklch(0.97 0.012 80)`), keep card surface near-white, lift border contrast slightly.
- **Primary:** swap to a bright cyan (`--primary` ~ `oklch(0.78 0.13 220)`) with a dark `--primary-foreground`. Re-tint focus rings and link colors.
- **Status pills:** introduce `--status-onit` (mint), `--status-hot` (soft rose), `--status-pending` (amber) with matching `-foreground` tokens. Keep the existing emerald/amber/rose calendar legend mapped to these.
- **Location stripes** already exist (`bg-loc-515`, etc.) — keep, but bump saturation slightly so the dot-pills read at small sizes.
- **Radius:** raise `--radius` to ~14px so cards and pills feel pillowy.
- **Type:**
  - Add a display serif (Instrument Serif or Fraunces — free Google Fonts) loaded in `__root.tsx` next to Inter.
  - New utility classes in `styles.css`: `.font-display` (serif), `.display-xl` (~64px, tight tracking), `.display-lg` (~44px). Italic variant used for the accent word ("you have **out**", "What's *happening*").
  - Keep Inter as body.
- **Section eyebrow:** `.eyebrow` — small uppercase, tracked, with a leading cyan dot (matches "• INVENTORY", "• HEADS UP", "• RECENT ACTIVITY").

Everything below uses these tokens — no raw hex in components.

## 2. Shared building blocks (new components)

Created once, reused across all three surfaces:

- `src/components/ui/section-heading.tsx` — eyebrow + serif display title with italic span support.
- `src/components/ui/fill-bar.tsx` — slim progress bar (green/amber/grey by ratio) used for "1/2 filled" rows and the coverage strip.
- `src/components/ui/avatar-stack.tsx` — overlapping initials chips for assigned photographers.
- `src/components/ui/status-pill.tsx` — variants: `onit`, `hot`, `new`, `pending`, `done`, `claim`.
- `src/components/ui/date-block.tsx` — big day number + tiny weekday/month stack used on every event row.
- `src/components/ui/location-pill.tsx` — colored-dot + label (515 / Cumberland / Trilith), reads from existing `LOCATION_STRIPES`.

## 3. Photographer hub — `/jobs` (screenshot 1)

Restyle the existing route; no data/RPC changes.

- Two-column layout (lg+): left = Upcoming list, right = compact calendar stack. Single column on mobile.
- **Header:** "Upcoming" in serif display + a Yours / Open / All segmented filter (existing data already supports this — just a client-side filter on the events array).
- **Event rows:** date-block · title + meta · location-pill · right-side action area (`StatusPill` "On it" for claimed, `Claim →` button for open). "Need a photographer · Claim one" group header (uses `eyebrow`) separates claimed from open jobs.
- **Right column:**
  - Reuse `HubCalendar` but force `defaultDensity="month"` and render in a compact card; selecting a day shows that day's event chips below (already supported by `eventsByDay`).
  - New "Coverage at a glance" card: list of upcoming events with `FillBar` (data already in event/assignment queries).

## 4. Photographer gear + activity zone (screenshot 2)

Lives on the same `/jobs` page below the upcoming/calendar block (or its own tab — TBD with you during build; default = same page, two stacked sections).

- **"Gear you have out"** card grid (3-col lg, 2-col md, 1-col sm):
  - Each card: gear icon tile · location pill · name · sublocation (locker) · optional note row · footer with "Updated Xh ago" + "Move →".
  - "Scan to log" + "Request gear" buttons in the section header (Request gear routes to `/request?tab=gear`).
- **Announcements** (left) + **What's happening** activity (right) two-column block:
  - Announcement cards: eyebrow tag (EDITING / HEADS UP / NEW) + timestamp + title + body line.
  - Activity feed: avatar initials + verb sentence with bolded nouns + timestamp. Reuse `activity-feed.tsx` data, restyle rows.

## 5. Admin events list (screenshot 3) — interleaved with consolidation

This is the visual half of the `/admin/requests` + events consolidation already planned.

- New shared **TopTabBar** at the top of admin hubs: pill row with icon + label + count badge (Events / Gear / Photo requests / Team / Activity). Active tab = dark pill, inactive = ghost. Right-aligned location filter pills (All locations / 515 / Cumberland / Trilith).
- **Event rows:** date-block · title + meta + location-pill · `FillBar` with "X/Y filled" and "open: …" sublabel · `AvatarStack` of assigned photographers · action cluster (`Hot` badge when understaffed + soon, `Brief` outline button, `Assign` primary button).
- Apply this row pattern to:
  - `admin_.requests-photography.tsx` (becomes the Events + Photo requests tabs of the consolidated hub).
  - `admin_.requests-gear.tsx` (Gear tab).
  - Existing `admin.tsx` overview where event rows render today.
- "Hot" is derived (not stored): event within N days AND fill < 100%.

## 6. Pairing with the consolidation work in flight

Per your "interleave" choice:

| Hub | Consolidation status | Visual pass |
|---|---|---|
| `/admin/content` | Done (tabbed shell exists) | Restyle sections + apply TopTabBar styling |
| `/admin/gear` | Board section extracted, inventory/history pending | Finish extraction, then style board + inventory cards |
| `/admin/requests` | Pending | Build tabbed shell using the new TopTabBar + restyled rows in one pass |
| `/admin/shot-list` | Pending | Build shell first, restyle after (lower priority — internal tool) |
| `/jobs` | Stays a single route | Pure restyle (sections 3 + 4) |

## 7. Out of scope (this plan)

- No DB / RLS / RPC changes.
- No new business logic — "Hot", "On it", and fill % are derived from existing fields.
- No changes to auth, email templates, or onboarding.
- Marketing/landing routes (`/`, `/login`) untouched.

## Technical notes

- Fonts load via `__root.tsx` `<link>` (Google Fonts), preconnect already there.
- Display serif applied via a `.font-display` utility, not as global `body` font — keeps Inter for dense UI.
- All new colors go through CSS variables in `src/styles.css`; components reference them via Tailwind semantic classes (`bg-background`, `text-primary`, etc.) or short bridge classes (`bg-status-onit`).
- Layout uses CSS Grid for the hub two-column split; collapses to single column under `lg`.
- No new dependencies.

## Suggested build order

1. Tokens + fonts + shared primitives (sections 1–2).
2. `/jobs` restyle — upcoming + calendar (section 3).
3. `/jobs` gear-out + announcements + activity (section 4).
4. Admin TopTabBar + event-row pattern, applied as each admin hub gets consolidated (section 5/6).
