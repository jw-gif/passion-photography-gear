import { cn } from "@/lib/utils";

type IconKind =
  | "telephoto"
  | "standard-zoom"
  | "prime"
  | "wide-prime"
  | "body"
  | "flash"
  | "strobe";

/**
 * Map a gear name to a visual icon category.
 * Order matters: more specific keywords come first.
 */
function iconKindFor(name: string): IconKind {
  const n = name.toLowerCase();
  if (n.includes("b10")) return "strobe";
  if (n.includes("a10") || n.includes("speedlight") || n.includes("flash"))
    return "flash";
  if (n.includes("r5") || n.includes("r6") || n.includes("body")) return "body";
  if (n.includes("70-200") || n.includes("70 200")) return "telephoto";
  if (n.includes("14mm") || n.includes("14 mm")) return "wide-prime";
  if (
    n.includes("24-105") ||
    n.includes("16-35") ||
    n.includes("14-24") ||
    n.includes("zoom")
  )
    return "standard-zoom";
  if (n.includes("35mm") || n.includes("85mm") || n.includes("prime"))
    return "prime";
  return "body";
}

interface SvgProps {
  className?: string;
}

function TelephotoSvg({ className }: SvgProps) {
  // Long zoom barrel with hood on the left
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* lens hood */}
      <path d="M2 8.5h2.5v7H2z" />
      {/* main barrel */}
      <rect x="4.5" y="7" width="13.5" height="10" rx="1" />
      {/* zoom ring */}
      <line x1="9" y1="7" x2="9" y2="17" />
      {/* focus ring */}
      <line x1="13" y1="7" x2="13" y2="17" />
      {/* mount */}
      <path d="M18 9h3v6h-3z" />
    </svg>
  );
}

function StandardZoomSvg({ className }: SvgProps) {
  // Medium-length zoom
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 8.5h2v7H3z" />
      <rect x="5" y="7" width="11" height="10" rx="1" />
      <line x1="9" y1="7" x2="9" y2="17" />
      <path d="M16 9h3v6h-3z" />
    </svg>
  );
}

function PrimeSvg({ className }: SvgProps) {
  // Short stout prime barrel
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="6" width="10" height="12" rx="1" />
      <line x1="9" y1="6" x2="9" y2="18" />
      <path d="M15 8.5h3v7h-3z" />
    </svg>
  );
}

function WidePrimeSvg({ className }: SvgProps) {
  // Short barrel with bulbous front element
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* bulbous front element */}
      <path d="M2 12c0-3 2-5 4.5-5v10C4 17 2 15 2 12z" />
      <rect x="6.5" y="7" width="9" height="10" rx="1" />
      <line x1="10" y1="7" x2="10" y2="17" />
      <path d="M15.5 9h3v6h-3z" />
    </svg>
  );
}

function BodySvg({ className }: SvgProps) {
  // Mirrorless body silhouette: top viewfinder hump, grip on right, lens mount circle
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* viewfinder hump */}
      <path d="M9 6h4v2H9z" />
      {/* body */}
      <path d="M3 8h6l1-1h4l1 1h5a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1z" />
      {/* lens mount */}
      <circle cx="11" cy="14" r="3" />
      {/* grip indicator */}
      <line x1="19" y1="10" x2="19" y2="13" />
    </svg>
  );
}

function FlashSvg({ className }: SvgProps) {
  // On-camera flash: rectangular head on a hot-shoe foot
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* head */}
      <rect x="6" y="3" width="12" height="9" rx="1" />
      {/* fresnel lines */}
      <line x1="9" y1="6" x2="15" y2="6" />
      <line x1="9" y1="9" x2="15" y2="9" />
      {/* neck */}
      <path d="M10 12h4v3h-4z" />
      {/* hot-shoe foot */}
      <path d="M7 15h10v3H7z" />
      <line x1="10" y1="18" x2="10" y2="21" />
      <line x1="14" y1="18" x2="14" y2="21" />
    </svg>
  );
}

function StrobeSvg({ className }: SvgProps) {
  // Studio strobe: cylindrical head with reflector dish
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* reflector dish (trapezoid) */}
      <path d="M2 7l4 2v6l-4 2z" />
      {/* body cylinder */}
      <rect x="6" y="8" width="10" height="8" rx="1" />
      {/* control knob */}
      <circle cx="11" cy="12" r="1.5" />
      {/* mount/yoke */}
      <path d="M16 10h2v4h-2z" />
      {/* stand spigot */}
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

export interface GearIconProps {
  name: string;
  className?: string;
}

export function GearIcon({ name, className }: GearIconProps) {
  const kind = iconKindFor(name);
  const cls = cn("shrink-0", className);
  switch (kind) {
    case "telephoto":
      return <TelephotoSvg className={cls} />;
    case "standard-zoom":
      return <StandardZoomSvg className={cls} />;
    case "prime":
      return <PrimeSvg className={cls} />;
    case "wide-prime":
      return <WidePrimeSvg className={cls} />;
    case "flash":
      return <FlashSvg className={cls} />;
    case "strobe":
      return <StrobeSvg className={cls} />;
    case "body":
    default:
      return <BodySvg className={cls} />;
  }
}
