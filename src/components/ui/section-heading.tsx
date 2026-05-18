import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: string;
  title: React.ReactNode;
  /** Word(s) inside the title to render in italic serif accent */
  accent?: string;
  size?: "xl" | "lg" | "md";
  actions?: React.ReactNode;
}

/**
 * Section heading: tracked uppercase eyebrow + large serif display title.
 * Use `accent` to italicize part of the title (matches the "Gear you have *out*" style).
 */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  size = "lg",
  actions,
  className,
  ...props
}: SectionHeadingProps) {
  const sizeClass =
    size === "xl" ? "display-xl" : size === "md" ? "display-md" : "display-lg";

  const rendered = React.useMemo(() => {
    if (!accent || typeof title !== "string") return title;
    const idx = title.toLowerCase().indexOf(accent.toLowerCase());
    if (idx === -1) return title;
    return (
      <>
        {title.slice(0, idx)}
        <em className="italic text-foreground/90">{title.slice(idx, idx + accent.length)}</em>
        {title.slice(idx + accent.length)}
      </>
    );
  }, [title, accent]);

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4 mb-5", className)} {...props}>
      <div className="flex flex-col gap-2 min-w-0">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 className={cn(sizeClass, "text-foreground")}>{rendered}</h2>
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
