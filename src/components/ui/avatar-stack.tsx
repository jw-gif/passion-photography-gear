import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarStackItem {
  id: string;
  name: string;
  /** Optional explicit initials override; otherwise derived from name */
  initials?: string;
}

interface AvatarStackProps {
  items: AvatarStackItem[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Overlapping circular avatar chips with initials. */
export function AvatarStack({ items, max = 4, size = "md", className }: AvatarStackProps) {
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;
  const sizeClass = size === "sm" ? "size-6 text-[10px]" : "size-7 text-xs";
  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {visible.map((item) => (
        <span
          key={item.id}
          title={item.name}
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-foreground text-background font-semibold ring-2 ring-card",
            sizeClass,
          )}
        >
          {item.initials ?? deriveInitials(item.name)}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-muted text-foreground font-semibold ring-2 ring-card",
            sizeClass,
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
