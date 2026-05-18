import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        onit: "bg-status-onit text-status-onit-foreground",
        hot: "bg-status-hot text-status-hot-foreground",
        pending: "bg-status-pending text-status-pending-foreground",
        new: "bg-status-new text-status-new-foreground",
        done: "bg-status-done text-status-done-foreground",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  icon?: React.ReactNode;
  /** When true (default for onit/hot), shows a default icon */
  showDefaultIcon?: boolean;
}

export function StatusPill({
  variant,
  icon,
  showDefaultIcon = true,
  className,
  children,
  ...props
}: StatusPillProps) {
  const defaultIcon =
    showDefaultIcon && icon === undefined
      ? variant === "onit"
        ? <Check className="size-3" strokeWidth={2.5} />
        : variant === "hot"
          ? <Flame className="size-3" strokeWidth={2.5} />
          : null
      : icon;
  return (
    <span className={cn(pillVariants({ variant }), className)} {...props}>
      {defaultIcon}
      {children}
    </span>
  );
}
