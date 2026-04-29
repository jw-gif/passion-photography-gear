# Onboarding module — UX & design polish

The module works, but it currently *looks* and *feels* like an admin CRUD form on both sides. This pass focuses on visual polish, information hierarchy, and small interaction wins — no new data model. Pick any subset.

---

## 1. Hire-side: make day 1 feel personal

The page a new hire opens on their first morning should feel like a welcome, not a settings screen.

**a. Hero header on the Welcome tab.** Replace the small "Onboarding / Welcome, Alex" header with a real hero on the first tab only:
- Big greeting: "Welcome, Alex 👋" (uses `hire.name`)
- Subline: role + start date + coordinator ("Junior Designer · Started Mon, May 4 · Onboarded by Jamie")
- Soft gradient background tile with the PCC mark

**b. "Today" card above the tabs.** A persistent strip showing:
- Day N of 30 (computed from `start_date`)
- Today's milestone title (if any) with a "Jump to first month →" link
- Checklist pulse: "3 of 12 done — 2 due this week"

This turns the hub into something they want to revisit daily, not just on day 1.

**c. Timeline polish.**
- Group the rail by **Week 1 / Week 2 / Week 3 / Week 4** headings (the editor already groups by week — mirror it).
- Auto-scroll to today's milestone on load with a subtle pulse animation on the dot.
- Past items collapse to a single line (date + title) with a "Show 4 completed" expander to keep the page short by week 3.
- Replace the flat green dot with a small icon: ✓ for past, ● ring for today, ○ for upcoming.

**d. Checklist polish.**
- Section cards get a per-section progress chip ("Paperwork · 3/4").
- Confetti / "Section complete" toast when the last item in a section is ticked.
- Sticky overall progress bar at the top of the checklist tab while scrolling.
- Larger tap targets — currently `size-4` checkboxes are tight on mobile.

**e. Mobile.** Tab pills wrap awkwardly past 4 tabs. On `<sm` switch to a horizontal scroll row with snap, or a `<select>` dropdown.

---

## 2. Admin overview: more glanceable

The admin landing page is three stacked sections of similar-looking cards. Add hierarchy and at-a-glance status.

**a. Status chips on hire rows.** Compute from `start_date` + checklist progress and render as a small pill on the right:
- "Starts in 3 days" (amber) — start_date in the future
- "Day 12 of 30" (neutral) — in the first month
- "Onboarded" (muted) — past day 30 and 100% complete
- "Behind" (red) — past day 7 and <25% checklist done

**b. Filter / segment bar** above the hires list: All · Starting soon · Active · Completed · Archived. Just client-side filtering of the existing query.

**c. Archive UI.** The `archived` column exists but has no surface. Add a row menu (`⋯`) with Archive / Delete (delete moves behind a confirm). Default the list to hiding archived, with a toggle.

**d. Group "Shared pages" + "Templates" into a single "Content" section** with a tab switcher. They take up two-thirds of the screen today and aren't touched daily — push the hires list to the top.

**e. Empty states with art.** The current empty states are a single line of muted text. Add a small inline SVG illustration + a one-button next action.

---

## 3. Hire editor: reduce cognitive load

The editor at `/admin/onboarding/hires/$hireId` currently shows: meta card, 3 stat tiles, then tabs with long auto-saving forms. Some friction:

**a. Sticky save indicator.** The `<SaveIndicator>` lives at the bottom of the meta card and on each row — easy to miss whether anything is in flight. Move a single global indicator into the page header next to "Open hire view".

**b. Collapse the meta card by default** once filled in — show a compact summary line ("Alex Liu · alex@… · Junior Designer · Starts May 4 · Coordinator: Jamie") with an Edit button. Saves vertical space for the actual work (timeline + checklist).

**c. Timeline editor density.** Each milestone row is a 4-column grid that wraps on this 867px viewport into a tall card. Tighten to: drag handle · date picker · title (full width) · day# + label collapsed into a popover · description (textarea below, expands on focus only).

**d. "Apply template" needs more context.** Today the button just merges. Show a preview dialog: "This will add 12 checklist items and 8 timeline milestones. Skip duplicates? [Apply / Cancel]".

**e. Replace `confirm()` and `prompt()`** with the project's `<ConfirmDialog>` component (already exists in `src/components/confirm-dialog.tsx`). The browser dialogs look out of place against the rest of the design.

---

## 4. Content blocks: visual upgrades

The renderer covers a lot of types but they all look like the same bordered card.

**a. Distinct block styling.**
- `callout` → colored left border + tinted background + an icon picked from the label ("Note" → ℹ, "Warning" → ⚠, "Tip" → 💡).
- `accordion` → the project already has `@radix-ui/react-accordion` — wire the renderer to use it instead of plain `<details>` for a smoother open/close.
- `link_list` → render as cards with a favicon (auto-fetched via `https://www.google.com/s2/favicons?domain=…`) + arrow icon — currently they look like bullet points.
- `people` → render as avatar circles (initials fallback) in a horizontal scroll on mobile.
- `embed` → detect Loom/YouTube/Figma URLs and use their proper aspect ratio and a poster fallback before iframe loads.

**b. Block editor: visual block picker.** The "Add block" `<Select>` is a long alphabetical dropdown. Replace with a small popover grid of icons + labels (Notion-style), grouped: Text · Media · Lists · Layout.

**c. Better drag affordance.** The grip icon is faint; on hover the row should get a subtle background tint to telegraph drag-target behavior.

---

## 5. Small but high-impact touches

- **Section dividers between weeks** in the hire timeline view, with the date range ("May 4 – May 10").
- **Keyboard shortcut: `e` to enter edit mode** on a focused block, `↵` to add a new block below.
- **Top-of-page breadcrumbs** in the editor: `Onboarding › Hires › Alex Liu` — currently just a Back button, doesn't communicate where you are in deeper flows.
- **Toast on auto-save error** with a "Retry" action — silent failure today.
- **Loading skeletons** instead of "Loading…" text on all three pages (use the existing `list-skeleton.tsx` pattern).
- **Date display consistency.** Mix of "EEE, MMM d, yyyy", "MMM d, yyyy", and "MMM d" across pages — pick one short form ("Mon, May 4") and use it everywhere.

---

## Recommended first batch (highest visible impact, ~1 implementation pass)

1. **Hire-side hero + "Today" card** (§1a, §1b) — transforms the perceived quality of the hub immediately.
2. **Timeline auto-scroll-to-today + week dividers + past-collapse** (§1c) — makes the page feel alive and focused.
3. **Status chips + filter bar on the admin overview** (§2a, §2b) — coordinator dashboards become useful at a glance.
4. **Loading skeletons + ConfirmDialog + sticky save indicator** (§3a, §3e, §5) — removes the "this is a prototype" tells.

Tell me which sections (or numbered items) to do and I'll build them.
