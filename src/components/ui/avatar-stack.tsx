import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

/** Lightly overlapping circular avatar chips with initials. Hover shows full name. */
export function AvatarStack({ items, max = 4, size = "md", className }: AvatarStackProps) {
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;
  const sizeClass = size === "sm" ? "size-6 text-[10px]" : "size-7 text-xs";
  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "group flex items-center -space-x-0.5 [&>*]:transition-[margin] [&>*]:duration-200 hover:[&>*+*]:ml-1.5",
          className,
        )}
      >
        {visible.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full bg-foreground text-background font-semibold ring-2 ring-card cursor-default",
                  sizeClass,
                )}
              >
                {item.initials ?? deriveInitials(item.name)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{item.name}</TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full bg-muted text-foreground font-semibold ring-2 ring-card cursor-default",
                  sizeClass,
                )}
              >
                +{overflow}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {items.slice(max).map((i) => i.name).join(", ")}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

