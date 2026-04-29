# Suggestions for the Onboarding Module

After reviewing the current admin pages, hire editor, blocks editor, and renderer, here are the highest-impact improvements grouped by theme. Each item is independent — tell me which ones to do.

---

## 1. Faster, less-clunky editing (biggest UX wins)

**a. Auto-save instead of per-row Save buttons.** Right now every checklist item, timeline milestone, hire detail, and page block needs a manual save click. Switch to debounced auto-save (~600ms after typing stops) with a small "Saved" indicator. Removes ~80% of clicks during real editing.

**b. Inline rich-text formatting for paragraph/callout/card bodies.** Today they're plain `<textarea>`. Add a minimal toolbar (bold, italic, link, bullet list) — most onboarding content needs at least links and bold.

**c. Drag-and-drop reordering.** Replace the up/down arrow buttons on blocks, checklist items, and timeline milestones with drag handles (`@dnd-kit/sortable`). Much faster when reorganizing a long page.

**d. Keyboard shortcuts in the block editor.** Enter at end of a paragraph adds a new paragraph block; `/` opens the "add block" menu inline (Notion-style). Optional but feels much more like a real editor.

**e. Replace `prompt()` for new section names** with a proper inline input — `prompt()` looks unprofessional and is blocked by some browsers.

---

## 2. Checklist & timeline templates

Right now every new hire starts with an empty checklist and empty timeline. You'll be entering the same ~30 standard items every time.

**a. Template library.** Add an `onboarding_templates` table (checklist + timeline presets). When creating a hire, pick a template and it pre-populates everything. Templates editable from the admin index.

**b. Apply template to existing hire.** Button on the hire page to merge in a template (skipping duplicates).

**c. Duplicate from another hire.** "Copy timeline/checklist from [previous hire]" — useful when onboarding multiple people in the same role.

---

## 3. Smarter timeline

**a. Group milestones by week** in both the editor and hire view (Week 1 / Week 2 / Week 3 / Week 4) instead of a flat list. Easier to scan a 30-day plan.

**b. Date picker alongside day-offset.** Admins think in dates, not "day 14". Let them pick a date and auto-compute the offset (or vice versa).

**c. "Today" anchor in the hire view** — auto-scroll to today's milestone on load, with a colored marker line.

**d. Optional checklist linkage.** Let a timeline milestone reference checklist items so completing the milestone shows progress.

---

## 4. Admin overview improvements

**a. Filter/sort hires** by status (active / archived / starts this week / overdue checklist).

**b. At-a-glance status chips** on the hires list: "Starts in 3 days", "Day 12 of 30", "Onboarding complete".

**c. Archive instead of delete** as the default action — you already have an `archived` column but no UI for it. Hard delete should require a confirm + be in a menu.

**d. Coordinator view.** If `coordinator_name` matches the logged-in admin, surface "My hires" at the top.

---

## 5. Hire-side experience

**a. Welcome email on hire creation** with a sign-in link, sent via the existing email setup.

**b. Progress celebration.** When the hire ticks the last checklist item in a section, show a small confetti / "Section complete" toast.

**c. Notes field per checklist item** so the hire can leave a comment ("done — talked with Alex on Slack") that the coordinator sees.

**d. Mobile polish.** The hire view is the page they'll actually open on their phone day 1; worth a focused mobile pass.

---

## 6. Content & structure

**a. More block types:**
- Image / embed (Loom, YouTube, Figma)
- Link list (cards with icon + title + description + URL — perfect for the Tools page)
- Divider
- Accordion / FAQ block (for the "Who to ask" page)

**b. Markdown shortcuts in textareas** — `**bold**`, `[link](url)`, `- bullets` rendered in the viewer (already established convention from the Slack template).

**c. Page versioning / draft mode.** Edits go live instantly today. A "Publish" button (with a draft preview) prevents half-edited pages being seen by hires mid-edit.

---

## 7. Code hygiene (not user-facing but worth it)

- The hire page does a full reload after every tiny edit (`onChanged → load()` refetches all 3 tables). Switch to React Query so individual mutations only invalidate their slice.
- Several `any` casts around `safeBlocks`/types could be tightened.
- Extract the renderer's markdown-ish parsing into a shared util (will be needed for #6b).

---

## My recommended first batch

If you just want the highest ROI, do these four together:

1. **Templates** (#2a + #2b) — saves the most time long-term
2. **Auto-save** (#1a) — biggest day-to-day annoyance gone
3. **Drag-and-drop reordering** (#1c) — feels dramatically more polished
4. **Image / link-list block types** (#6a) — unlocks the Tools page

Tell me which items (or batches) you want and I'll implement them.
