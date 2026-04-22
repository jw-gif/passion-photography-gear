import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Camera, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarEventKind = "photo" | "gear";

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD — optional end date for multi-day events */
  endDate?: string | null;
  title: string;
  /** A semantic status string mapped to a color token */
  statusColor: string; // a tailwind class chunk e.g. "bg-emerald-500"
  statusLabel: string;
  href: string; // navigate target on click (using Link component); raw string for now
}

interface HubCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

const LEGEND: { color: string; label: string }[] = [
  { color: "bg-emerald-500", label: "Approved / Scheduled" },
  { color: "bg-amber-500", label: "Pending / In Review" },
  { color: "bg-blue-500", label: "New" },
  { color: "bg-rose-500", label: "Denied / Declined" },
  { color: "bg-zinc-400", label: "Completed / Archived" },
];

export function HubCalendar({ events, onEventClick }: HubCalendarProps) {
  const [cursor, setCursor] = useState<Date>(new Date());

  // Always anchor the grid to the current week as the top row.
  // `cursor` advances/retreats by week (not month) so navigation slides forward in time.
  const gridStart = useMemo(() => startOfWeek(cursor, { weekStartsOn: 0 }), [cursor]);
  const gridEnd = useMemo(() => addDays(gridStart, 7 * 5 - 1), [gridStart]); // 5 weeks visible

  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  // Label for the visible range header
  const rangeLabel = useMemo(() => {
    const sameMonth = isSameMonth(gridStart, gridEnd);
    if (sameMonth) return format(gridStart, "MMMM yyyy");
    if (gridStart.getFullYear() === gridEnd.getFullYear()) {
      return `${format(gridStart, "MMM")} – ${format(gridEnd, "MMM yyyy")}`;
    }
    return `${format(gridStart, "MMM yyyy")} – ${format(gridEnd, "MMM yyyy")}`;
  }, [gridStart, gridEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const start = parseISO(ev.date);
      const end = ev.endDate ? parseISO(ev.endDate) : start;
      let cur = start;
      while (cur <= end) {
        const key = format(cur, "yyyy-MM-dd");
        const arr = map.get(key) ?? [];
        arr.push(ev);
        map.set(key, arr);
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [events]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => addDays(c, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums min-w-[180px] text-center">
            {rangeLabel}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => addDays(c, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            This week
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="bg-muted/40 text-xs uppercase tracking-wider font-medium text-muted-foreground px-2 py-1.5 text-center"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={cn(
                "bg-background min-h-[120px] sm:min-h-[140px] p-1.5 flex flex-col gap-1 relative",
                !inMonth && "bg-muted/20",
              )}
            >
              <div
                className={cn(
                  "text-xs font-semibold tabular-nums leading-none self-start",
                  !inMonth && "text-muted-foreground/60",
                  isToday &&
                    "inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => {
                  const isPhoto = ev.kind === "photo";
                  const Icon = isPhoto ? Camera : Wrench;
                  return (
                    <button
                      key={ev.id + key}
                      onClick={() => onEventClick?.(ev)}
                      className={cn(
                        "group flex items-stretch w-full text-left rounded-md overflow-hidden border border-border/60 bg-card hover:bg-accent/40 hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                      title={`${isPhoto ? "Photography" : "Gear"} · ${ev.statusLabel} · ${ev.title}`}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center px-1.5 shrink-0",
                          ev.statusColor,
                        )}
                        aria-hidden
                      >
                        <Icon className="size-3 text-white" strokeWidth={2.5} />
                      </span>
                      <span className="flex-1 min-w-0 px-1.5 py-1 flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground leading-none">
                          {isPhoto ? "Photo" : "Gear"}
                        </span>
                        <span className="text-[11px] font-medium truncate leading-tight text-foreground">
                          {ev.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
