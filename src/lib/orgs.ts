export const COMPANIES = [
  "Passion City Church",
  "Passion Conference",
  "Passion Institute",
  "Passion Publishing",
  "Passion Resources",
  "sixstepsrecords",
] as const;
export type Company = (typeof COMPANIES)[number];

// Sub-teams shown when "Passion City Church" is selected as the company
export const PCC_TEAMS = [
  "Atlanta City",
  "bloom",
  "Building",
  "Care",
  "Community",
  "CORE",
  "Creative",
  "Design",
  "Experience",
  "Fight Club",
  "Film",
  "Finance",
  "Flourish",
  "Global Brand",
  "Grove",
  "Hospitality",
  "Love Atlanta",
  "Operations",
  "Passion Kids",
  "Passion Leadership Experience",
  "Pastor's Team",
  "Production",
  "Social Media/Communications",
  "Students",
  "Team Development/HR",
  "Technology",
  "UNITE",
  "Worship",
  "Young Adults",
] as const;
export type PccTeam = (typeof PCC_TEAMS)[number];

export const EVENT_LOCATIONS = [
  "515",
  "Cumberland",
  "Trilith",
  "Other",
] as const;
export type EventLocation = (typeof EVENT_LOCATIONS)[number];

export const COVERAGE_TYPES = [
  { value: "live_event", label: "Live Event Coverage" },
  { value: "photo_booth", label: "Photo Booth" },
  { value: "other", label: "Other" },
] as const;
export type CoverageType = (typeof COVERAGE_TYPES)[number]["value"];

export const REQUEST_TYPES = [
  {
    value: "photography_team",
    label: "Photography Team",
    description:
      "Book a team for your Gathering/Event (Community Groups, The Rising, Christmas Smile, etc.) or a Sunday event that needs additional photographers — Photo Booths, Team Headshots, Celebrations, Team Meetings, etc.",
  },
  {
    value: "shot_list_addition",
    label: "Shot List Addition",
    description:
      "Add specific shots to an existing scheduled shoot — moments, people, or details we should be sure to capture.",
  },
  {
    value: "photoshoot",
    label: "Photoshoot",
    description:
      "A scheduled photoshoot (headshots, branded content, environmental portraits, product, etc.) outside of a live event.",
  },
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number]["value"];

export const PHOTO_REQUEST_STATUSES = [
  { value: "new", label: "New" },
  { value: "in_review", label: "In Review" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "archived", label: "Archived" },
] as const;
export type PhotoRequestStatus = (typeof PHOTO_REQUEST_STATUSES)[number]["value"];

export function statusLabel(s: PhotoRequestStatus): string {
  return PHOTO_REQUEST_STATUSES.find((x) => x.value === s)?.label ?? s;
}

export function statusBadgeClasses(s: PhotoRequestStatus): string {
  switch (s) {
    case "new":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "in_review":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "scheduled":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "declined":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "archived":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
