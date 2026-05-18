import * as React from "react";
import { cn } from "@/lib/utils";

const LOCATION_BG: Record<string, string> = {
  "515": "bg-loc-515/25 text-loc-515-foreground",
  Cumberland: "bg-loc-cumberland/25 text-loc-cumberland-foreground",
  Trilith: "bg-loc-trilith/25 text-loc-trilith-foreground",
};

const LOCATION_DOT: Record<string, string> = {
  "515": "bg-loc-515",
  Cumberland: "bg-loc-cumberland",
  Trilith: "bg-loc-trilith",
};

interface LocationPillProps {
  location: string | null | undefined;
  className?: string;
}

/** Colored-dot + label chip keyed off the project's location palette. */
export function LocationPill({ location, className }: LocationPillProps) {
  if (!location) return null;
  const bg = LOCATION_BG[location] ?? "bg-muted text-muted-foreground";
  const dot = LOCATION_DOT[location] ?? "bg-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        bg,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {location}
    </span>
  );
}
