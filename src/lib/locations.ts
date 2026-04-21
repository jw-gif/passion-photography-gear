export const LOCATIONS = ["515", "Cumberland", "Trilith"] as const;
export type Location = (typeof LOCATIONS)[number];

export function locationClasses(loc: string): string {
  switch (loc) {
    case "515":
      return "bg-loc-515 text-loc-515-foreground";
    case "Cumberland":
      return "bg-loc-cumberland text-loc-cumberland-foreground";
    case "Trilith":
      return "bg-loc-trilith text-loc-trilith-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function locationRing(loc: string): string {
  switch (loc) {
    case "515":
      return "ring-loc-515";
    case "Cumberland":
      return "ring-loc-cumberland";
    case "Trilith":
      return "ring-loc-trilith";
    default:
      return "ring-border";
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
