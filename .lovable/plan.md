# Redesigning the new hire view

Goal: a beautiful, calm, intuitive experience for someone on day 1. Right now the page asks the new hire to juggle 3+ ideas at once: a hero, a "Today" card, a tab strip with N tabs, plus separate timeline and checklist views. We'll consolidate.

## The core idea: 3 tabs instead of 5+

Collapse the navigation to a clean, predictable shell:

```text
┌──────────────────────────────────────────┐
│  [Home]   [Your plan]   [Resources ▾]    │
└──────────────────────────────────────────┘
```

- **Home** — landing screen. Personalized hero, "Today" focus card, a peek at the next 2 timeline items, and a peek at the next 3 unchecked checklist items. One screen that answers *"what am I doing today?"*
- **Your plan** — the unified day-by-day view. Timeline milestones and checklist tasks **interleaved by date** (the checklist no longer lives apart from the schedule). Filter chips for "This week / All / Just to-dos / Just events".
- **Resources ▾** — a dropdown (or grouped section) for the static content pages (Welcome, Team, Tools, FAQs, etc.). These are reference material; they don't need top-level real estate.

Net effect: 2 active tabs do all the work. Reference reading is one click away but out of the way.

## Home screen layout

```text
┌─ Hero ──────────────────────────────────────────────┐
│ Welcome, Karis 👋                                   │
│ Operations · Day 3 of 30 · 14 of 58 tasks done      │
│ [progress bar ────────●─────────────────]           │
└─────────────────────────────────────────────────────┘

┌─ Today, Wed Apr 29 ─────────────────────────────────┐
│ ● Team Day at the studio                            │
│   10:00 AM kickoff with Jacob, lunch on us.         │
│                                                     │
│ To do today (3)                                     │
│ ☐ Set up Slack profile photo                        │
│ ☐ Review Q2 calendar with Jacob                     │
│ ☐ Sign payroll form  · HR                           │
│                              [Open full checklist →]│
└─────────────────────────────────────────────────────┘

┌─ Coming up this week ───────────────────────────────┐
│ Thu Apr 30  US> Night recap                         │
│ Fri May 1   1:1 with Chaise                         │
│                              [Open full plan →]     │
└─────────────────────────────────────────────────────┘

┌─ Need help? ────────────────────────────────────────┐
│ Reach out to Jacob (your coordinator) any time.     │
│ [Slack Jacob]   [Email Jacob]                       │
└─────────────────────────────────────────────────────┘
```

Why it works: the hire opens the page and immediately sees today's event + today's tasks + who to ask for help. No tab hunting.

## "Your plan" — unified day-by-day

Replace the separate "First month" + "Checklist" tabs with one merged view. Each day is a single block containing both events and tasks for that day:

```text
─── This week ──────────────────────────────────────────

  WED · APR 29 · TODAY                       ●
  ┌──────────────────────────────────────────┐
  │ EVENTS                                   │
  │ • Team Day at the studio                 │
  │   10am kickoff, lunch provided           │
  │                                          │
  │ TO DO  (1 of 3 done)                     │
  │ ☑ Get badge from front desk              │
  │ ☐ Set up Slack profile  · You            │
  │ ☐ Sign payroll form     · HR             │
  └──────────────────────────────────────────┘

  THU · APR 30                               ○
  ┌──────────────────────────────────────────┐
  │ • US> Night recap (6pm)                  │
  │ ☐ Bring camera B-roll      · You         │
  └──────────────────────────────────────────┘

─── Next week ──────────────────────────────────────────
  ▸ Mon May 4 — 2 events, 4 tasks  (collapsed)
  ▸ Tue May 5 — 1 event, 2 tasks   (collapsed)
  ...

─── Completed (14) ▸                          (collapsed)
```

Behaviors:
- This week is expanded; future weeks are collapsed summaries you can expand.
- Today's card is visually elevated (subtle ring, slight scale, sticky-on-scroll header).
- Filter chips above the list: **All · Events · To-dos · Mine** ("Mine" = owner is the hire).
- Auto-scroll to today on load (already exists; preserve).
- Checking off a task animates a strikethrough and updates the day's "X of Y done" inline — no page jump.
- Section-complete confetti stays.

Owner pills become small avatars or initials chips (e.g. `JR` for Jacob) with a tooltip — easier to scan than text labels.

## Resources area

The current static content tabs (Welcome, Tools, Team, FAQs, etc.) move into a "Resources" dropdown in the top nav, plus a lightweight grid on the Home screen footer:

```text
RESOURCES
┌────────┬────────┬────────┬────────┐
│ 📖     │ 👥     │ 🔧     │ ❓     │
│Welcome │ Team   │ Tools  │ FAQs   │
└────────┴────────┴────────┴────────┘
```

Each card is a one-line summary + click-through. Keeps the home dense with utility but visually calm.

## Visual & typography polish

- **One column, max 720px** on the plan view (currently 4xl / 896px) — easier reading rhythm.
- **Larger headings, more whitespace** between day cards (24px gap → 32px).
- **Soften the timeline rail** — currently a hard border-l line; switch to a subtle dotted/gradient line that fades into the background.
- **Today indicator**: replace the pulsing emerald dot with a soft ring + "TODAY" pill — pulse animation is distracting after the first few seconds. Reduce to a single subtle pulse on mount.
- **Status colors**: past = neutral gray (not green), today = brand primary, upcoming = quiet outline. Green is overused right now; reserve it for the checked-off state only.
- **Skeleton states**: match the new layout (today card skeleton + 3 day-card skeletons).
- **Empty states** get illustrations or large emoji + a friendly sentence + a CTA to message the coordinator.

## Mobile

- Tabs become a segmented control that fits the screen (3 items, no overflow).
- Today card is sticky under the header on scroll so the hire never loses context.
- Day cards stack edge-to-edge with rounded corners only on top/bottom of the group.

## Technical notes

- **One file**: most edits land in `src/routes/onboarding.tsx`. Add a small helper in `src/lib/onboarding.ts` to merge `TimelineItemRow[]` and `ChecklistItemRow[]` into a per-day data structure (`{ date, dayOffset, events, tasks }[]`). Note: checklist items don't currently have a `day_offset` — we'll need to either (a) add an optional `day_offset` column to `onboarding_hire_checklist` so tasks can be tied to a day, or (b) keep "section" as the grouping and only merge events by date while showing all tasks under "Anytime this week" buckets. **Recommendation: add a nullable `day_offset` column** so coordinators can pin tasks to specific days; tasks without one fall into a per-week "Anytime this week" bucket.
- New components: `<HomeView>`, `<PlanDayCard>`, `<TodayFocus>`, `<ResourceGrid>`. Existing `<TodayCard>` becomes `<TodayFocus>` and is only rendered on Home.
- The 3-tab nav becomes a `<SegmentedNav>` component (3 fixed items + a "Resources" dropdown using existing `dropdown-menu` primitives).
- Admin preview banner and the existing checklist toggle/confetti behavior are preserved.
- Migration: add `day_offset INT NULL` to `onboarding_hire_checklist`. Backfill is a no-op (NULL → "Anytime this week" bucket). Editor UI in `admin_.onboarding_.hires.$hireId.tsx` gets a small day-picker per task.

## What we're explicitly removing

- The separate "First month" and "Checklist" tabs (merged into "Your plan").
- The standalone tab pills row when there are 5+ static pages — those move into the Resources dropdown.
- The Today card on every tab — it now lives on Home only, where it belongs.

## Out of scope (worth flagging for later)

- Calendar export (.ics) of the first-month plan.
- Email/Slack reminders the morning of each day.
- A "Done with onboarding" celebration screen at day 30.

Approve and I'll implement.
