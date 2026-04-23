/**
 * Group gear into a small set of human-friendly categories based on the
 * `icon_kind` field used by the gear icon component. Falls back to "Other"
 * for anything we don't recognise.
 */
export type GearCategory = "Camera" | "Lens" | "Audio" | "Lighting" | "Accessory" | "Other";

export const GEAR_CATEGORIES: GearCategory[] = [
  "Camera",
  "Lens",
  "Audio",
  "Lighting",
  "Accessory",
  "Other",
];

export function categoryFor(iconKind: string | null | undefined, name?: string | null): GearCategory {
  const kind = (iconKind ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();
  if (kind.includes("camera") || kind.includes("body") || /\b(a7|r5|r6|z6|z7|gh|fx)\b/.test(n)) return "Camera";
  if (kind.includes("lens") || /\b(mm|prime|zoom|24-70|70-200|50mm|85mm|35mm)\b/.test(n)) return "Lens";
  if (kind.includes("mic") || kind.includes("audio") || kind.includes("recorder") || /\b(mic|audio|recorder|wireless)\b/.test(n)) return "Audio";
  if (kind.includes("light") || kind.includes("flash") || /\b(strobe|softbox|light|flash|aputure|godox)\b/.test(n)) return "Lighting";
  if (
    kind.includes("tripod") ||
    kind.includes("battery") ||
    kind.includes("card") ||
    kind.includes("bag") ||
    kind.includes("accessory") ||
    /\b(tripod|battery|card|bag|cable|adapter|stand)\b/.test(n)
  )
    return "Accessory";
  return "Other";
}
