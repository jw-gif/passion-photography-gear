import * as React from "react";
import { cn } from "@/lib/utils";

interface FillBarProps {
  filled: number;
  total: number;
  /** Optional label rendered above the bar (e.g. "1/2 filled") */
  label?: React.ReactNode;
  /** Optional sublabel rendered below the bar (e.g. "open: Photo Booth") */
  sublabel?: React.ReactNode;
  className?: string;
}

/**
 * Progress bar with green/amber/grey color based on fill ratio.
 * Grey at 0, amber for partial, green at full.
 */
export function FillBar({ filled, total, label, sublabel, className }: FillBarProps) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, filled / total)) : 0;
  const pct = Math.round(ratio * 100);
  const color =
    filled === 0
      ? "bg-muted-foreground/30"
      : filled >= total
        ? "bg-emerald-500"
        : "bg-amber-500";
  return (
    <div className={cn("w-full", className)}>
      {label != null ? (
        <div className="text-sm font-medium text-foreground/80 mb-1.5">{label}</div>
      ) : null}
      <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sublabel != null ? (
        <div className="text-xs text-muted-foreground mt-1.5">{sublabel}</div>
      ) : null}
    </div>
  );
}
