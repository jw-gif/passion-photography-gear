// Shared types and helpers for the Staff Onboarding feature.
// Block-based content is stored in onboarding_pages.blocks (JSONB array).
// Each block is one of the variants below.

export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "callout"; label?: string; text: string }
  | { type: "card"; title: string; body: string }
  | { type: "two_col"; left: { title: string; body: string }; right: { title: string; body: string } }
  | { type: "table"; title?: string; columns: string[]; rows: string[][] }
  | { type: "people"; title?: string; people: Person[] }
  | { type: "checklist_preview"; title?: string; items: string[] };

export interface Person {
  name: string;
  role?: string;
  slack?: string;
}

export const BLOCK_TYPE_LABELS: Record<ContentBlock["type"], string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  callout: "Callout box",
  card: "Card",
  two_col: "Two-column cards",
  table: "Table",
  people: "People list",
  checklist_preview: "Bulleted list",
};

export function emptyBlock(type: ContentBlock["type"]): ContentBlock {
  switch (type) {
    case "heading":
      return { type: "heading", text: "New heading" };
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "callout":
      return { type: "callout", label: "Note", text: "" };
    case "card":
      return { type: "card", title: "Card title", body: "" };
    case "two_col":
      return {
        type: "two_col",
        left: { title: "Left title", body: "" },
        right: { title: "Right title", body: "" },
      };
    case "table":
      return { type: "table", columns: ["Column 1", "Column 2"], rows: [["", ""]] };
    case "people":
      return { type: "people", people: [{ name: "", role: "", slack: "" }] };
    case "checklist_preview":
      return { type: "checklist_preview", items: [""] };
  }
}

export function safeBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is ContentBlock => {
    if (!b || typeof b !== "object" || !("type" in b)) return false;
    const t = (b as { type: string }).type;
    return t in BLOCK_TYPE_LABELS;
  });
}

// Page metadata
export interface PageRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  blocks: ContentBlock[];
  sort_order: number;
}

// Hire
export interface HireRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role_label: string | null;
  start_date: string; // YYYY-MM-DD
  coordinator_name: string | null;
  archived: boolean;
}

// Timeline
export interface TimelineItemRow {
  id: string;
  hire_id: string;
  day_offset: number;
  label: string;
  title: string;
  description: string | null;
  sort_order: number;
}

// Checklist
export interface ChecklistItemRow {
  id: string;
  hire_id: string;
  section: string;
  label: string;
  owner: string | null;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

// Helpers for the dynamic timeline view.
// Given the hire's start date and today, classify a milestone as past, today, or upcoming.
export type MilestoneStatus = "past" | "today" | "upcoming";

export function classifyMilestone(
  startDateISO: string,
  dayOffset: number,
  now: Date = new Date(),
): MilestoneStatus {
  const start = new Date(`${startDateISO}T00:00:00`);
  const target = new Date(start);
  target.setDate(target.getDate() + dayOffset);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (target.getTime() < today.getTime()) return "past";
  if (target.getTime() === today.getTime()) return "today";
  return "upcoming";
}

export function dayOffsetToDate(startDateISO: string, dayOffset: number): Date {
  const d = new Date(`${startDateISO}T00:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

export function checklistProgress(items: ChecklistItemRow[]): { done: number; total: number; pct: number } {
  const total = items.length;
  const done = items.filter((i) => i.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}
