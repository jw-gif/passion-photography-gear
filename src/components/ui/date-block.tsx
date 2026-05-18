import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateBlockProps {
  date: Date | string;
  /** Show month line under weekday (e.g. "SUN · MAY") */
  showMonth?: boolean;
  size?: "md" | "lg";
  className?: string;
}

/** Big day number stacked over short weekday/month text. */
export function DateBlock({ date, showMonth = false, size = "md", className }: DateBlockProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = format(d, "d");
  const weekday = format(d, "EEE").toUpperCase();
  const month = format(d, "MMM").toUpperCase();
  const dayClass = size === "lg" ? "text-5xl" : "text-4xl";
  return (
    <div className={cn("flex flex-col items-start min-w-[3.5rem] leading-none", className)}>
      <span className={cn("font-bold tracking-tight tabular-nums", dayClass)}>{day}</span>
      <span className="mt-1.5 text-[10px] tracking-[0.15em] font-semibold text-muted-foreground">
        {showMonth ? `${weekday} · ${month}` : weekday}
      </span>
    </div>
  );
}
