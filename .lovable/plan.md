

## 1. Line-drawing icons for each gear item

Build a small library of hand-crafted inline SVG icons keyed by gear type, not per-item. The 14 items naturally fall into 5 visual categories — one shape per category, instantly recognizable, consistent stroke weight, matches the existing minimal aesthetic.

### Icon library

New file `src/lib/gear-icons.tsx` exporting a `<GearIcon name={...} />` component that maps each gear name to one of these line drawings:

| Icon | Items |
|---|---|
| **Telephoto zoom** (long barrel + lens hood) | Canon 70-200 (×2), Nikon 70-200mm |
| **Standard zoom** (medium barrel) | Canon 24-105mm, Canon 16-35mm, Nikon 14-24mm |
| **Prime lens** (short, stout barrel) | Canon 35mm, Canon 85mm |
| **Wide prime** (short with bulbous front element) | Canon 14mm, Nikon 14mm |
| **Mirrorless body** (rectangular body + lens mount + grip) | Canon R5, Canon R6 |
| **On-camera flash** (rectangular head on hot-shoe foot) | Profoto A10 for Canon |
| **Studio strobe** (cylindrical head + reflector dish) | Profoto B10 |

Each SVG: ~24×24 viewBox, `stroke="currentColor"`, stroke-width 1.5, no fill. Inherits text color so it reads clean on any background. Lookup by lowercased name keyword (`includes("70-200")` → telephoto, etc.) with a sensible fallback.

### Where icons appear

- **Admin gear cards** (`src/routes/admin.tsx`) — small icon (size-5) left of the gear name.
- **Public gear page** (`src/routes/index.tsx`) — larger icon (size-12) above the gear name as a visual identifier when someone scans a QR.
- **History page** (`src/routes/admin_.history.tsx`) — small icon next to the gear name in each row, for quicker scanning.

### Why hand-crafted SVG instead of AI-generated images

AI image generation for 14 separate items would be slow, inconsistent in line weight, require storage, and break the crisp vector aesthetic. Inline SVG renders instantly, scales perfectly, inherits theme colors, and stays consistent with the lucide-react icons already used elsewhere.

---

## 2. Drag-and-drop gear between location columns (admin)

Make the three location columns on `/admin` into drop targets so gear cards can be dragged between **515**, **Cumberland**, and **Trilith** for fast bulk reorganization.

### Interaction

- Each gear card becomes draggable (cursor-grab on hover, ring + lifted shadow while dragging).
- Each location column becomes a drop zone (highlighted border + tinted background while a card is being dragged over it).
- Dropping a card on a different column:
  1. Optimistically moves the card to the new column in the UI.
  2. Updates `gear.current_location` in the database.
  3. Inserts a `gear_history` row with `moved_by = "Admin"` and `note = "Moved via admin drag"` so the activity log stays complete and consistent with the existing constraint logic.
  4. On error, reverts the optimistic move and shows a toast.
- Dropping on the same column or outside any column: no-op.
- Expand-to-view-history (the existing chevron click) still works — only the card's drag handle area triggers DnD; clicking the title still expands.

### Implementation

- Native HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) — no new dependency. Works well on desktop, which is where admins do bulk reorganization.
- A small `dragGearId` state in the dashboard tracks the in-flight item; column components receive `isDropTarget` based on whether something is being dragged.
- The QR button and chevron toggle remain click-only; only the card body is the drag source, so accidental drags from action buttons don't fire.
- Mobile note: HTML5 DnD doesn't work on touch. The existing per-card flow (open public page → pick location → submit) remains the mobile path; drag-and-drop is a desktop power-user shortcut.

### Files touched

- New: `src/lib/gear-icons.tsx`
- Edit: `src/routes/admin.tsx` (drag-and-drop + icons in cards)
- Edit: `src/routes/index.tsx` (icon on public gear view)
- Edit: `src/routes/admin_.history.tsx` (icon next to gear name in log)

No database, RLS, or auth changes.

