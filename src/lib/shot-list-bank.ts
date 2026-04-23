/**
 * Shot list content bank.
 *
 * This is the single source of truth for shot-list copy. The AI never
 * authors new prose — it only picks which entries from this bank to include
 * based on the event context. That keeps the output predictable and brand-safe.
 *
 * To add new locations, segments, or shots, edit this file. The generator
 * automatically picks them up on the next run.
 */

import type { ShotPriority, SegmentRole } from "./shot-list";

// =============================================================================
// LOCATION BLOCKS — arrival + editing-space directions per location
// =============================================================================

export interface LocationBlock {
  /** Stable key, also used as the AI-pick target. Matches LOCATIONS in src/lib/locations.ts. */
  key: string;
  /** Display label admins/photographers see. */
  label: string;
  /** Short alias used in the brief title (e.g. "CBL"). */
  alias?: string;
  /** Address shown in the ARRIVAL block. */
  address: string;
  /** Multi-paragraph arrival instructions (parking, entry, check-in). */
  arrival: string;
  /** Multi-paragraph editing-space directions (where to set up after arrival). */
  editingSpace: string;
}

export const LOCATION_BLOCKS: LocationBlock[] = [
  {
    key: "Cumberland",
    label: "Cumberland",
    alias: "CBL",
    address: "2625 Cumberland Parkway Southeast, Atlanta, GA",
    arrival:
      "When you arrive, the lower gate that goes under the skybridge should be open, pull in and park wherever you see other cars parked. Check-in is at the very far side door of the central building.",
    editingSpace:
      "Take the elevator in the Central Building up to the 4th floor (you’ll need to use the door code to activate the button). When you exit the elevator, take a left and then a right through the double doors. The catering space is the first single door on the left. Our unofficial table is next to the column by the window next to the power strip.",
  },
  {
    key: "515",
    label: "515",
    address: "515 Glenn Iris Dr NE, Atlanta, GA",
    arrival:
      "Park in the lower lot behind the building. Enter through the side door by the loading dock — it'll be propped open. Find Mac (or whoever is leading the shoot) at the photo cart in the AUD.",
    editingSpace:
      "Editing happens in the Creative Suite on the 2nd floor. Head up the back stairwell, take a right at the top, and the Creative Suite is the second door on the left. Plug in at the long table by the windows.",
  },
  {
    key: "Trilith",
    label: "Trilith",
    alias: "TRL",
    address: "350 Trilith Pkwy, Fayetteville, GA",
    arrival:
      "Park in the lot directly in front of the building. Enter through the main lobby doors and check in at the front desk — they'll point you toward the AUD.",
    editingSpace:
      "Set up in the Office on the upper level. From the lobby, take the stairs up, head right past the kitchen, and the Office is the door at the end of the hallway. Use the photo cart corner near the window.",
  },
];

export function getLocationBlock(key: string | null | undefined): LocationBlock | null {
  if (!key) return null;
  return LOCATION_BLOCKS.find((b) => b.key === key) ?? null;
}

// =============================================================================
// SEGMENT BANK — pre-built segments with curated shots
// =============================================================================

export interface BankShot {
  /** Stable key, used for AI to pick this shot. */
  key: string;
  text: string;
  priority: ShotPriority;
}

export interface BankSegment {
  /** Stable key, used for AI to pick this segment. */
  key: string;
  title: string;
  /** Default location to display in the segment header (e.g. "AUD"). */
  defaultLocation?: string;
  /** Default suggested roles. The AI may override based on roster. */
  defaultRoles: SegmentRole[];
  /** One-line italic guidance shown beneath the title. */
  focus?: string;
  /** Curated bank of shots for this segment. AI picks a subset. */
  shots: BankShot[];
}

export const BANK_SEGMENTS: BankSegment[] = [
  {
    key: "pre_gathering",
    title: "Pre-Gathering",
    defaultLocation: "Outside / Lobby",
    defaultRoles: ["all"],
    focus: "Let’s focus on shots of people and smiling faces.",
    shots: [
      { key: "pre_walkup", text: "People walking up to the building", priority: "should" },
      { key: "pre_greeters", text: "Greeters at the door", priority: "must" },
      { key: "pre_lobby", text: "Coffee + connection in the lobby", priority: "should" },
      { key: "pre_first_time", text: "First-time guests at the welcome desk", priority: "nice" },
      { key: "pre_signage", text: "Branded signage / wayfinding details", priority: "nice" },
      { key: "pre_team", text: "Team members praying together before doors", priority: "should" },
    ],
  },
  {
    key: "worship",
    title: "Worship (AUD)",
    defaultLocation: "AUD",
    defaultRoles: ["point"],
    focus: "Centered & off-centered framed with the LED wall.",
    shots: [
      { key: "wor_wide_high", text: "Wide from highest point during opening song", priority: "must" },
      { key: "wor_hands", text: "Tight on hands raised in worship", priority: "must" },
      { key: "wor_leader", text: "Worship leader mid-vocal", priority: "should" },
      { key: "wor_crowd", text: "Crowd singing — variety of faces", priority: "should" },
      { key: "wor_band", text: "Band members in the moment (drummer, guitarist, BVs)", priority: "should" },
      { key: "wor_led_silhouette", text: "Centered framing of the LED wall with worship leader silhouette", priority: "nice" },
    ],
  },
  {
    key: "hosting_giving",
    title: "Hosting + Giving (AUD)",
    defaultLocation: "AUD",
    defaultRoles: ["point"],
    shots: [
      { key: "host_welcome", text: "Host welcoming the room", priority: "must" },
      { key: "host_announcements", text: "Crowd reaction shots during announcements", priority: "should" },
      { key: "host_giving", text: "People giving / scanning QR codes", priority: "nice" },
    ],
  },
  {
    key: "talk",
    title: "Talk (AUD)",
    defaultLocation: "AUD",
    defaultRoles: ["point"],
    focus: "Get the speaker mid-laugh and mid-point.",
    shots: [
      { key: "talk_wide_led", text: "Speaker wide with LED wall", priority: "must" },
      { key: "talk_laugh", text: "Speaker mid-laugh / mid-gesture", priority: "must" },
      { key: "talk_notes", text: "Audience taking notes", priority: "should" },
      { key: "talk_scripture", text: "Scripture on the LED wall with audience in foreground", priority: "should" },
      { key: "talk_close", text: "Tight portrait of the speaker", priority: "nice" },
    ],
  },
  {
    key: "passion_kids",
    title: "Passion Kids + bloom",
    defaultLocation: "Kids Room",
    defaultRoles: ["door_holder", "training_door_holder"],
    focus: "Capture the energy and the leaders connecting with kids.",
    shots: [
      { key: "kids_running", text: "Kids running into the room with their leaders", priority: "must" },
      { key: "kids_worship", text: "Worship time — kids singing/dancing", priority: "must" },
      { key: "kids_teaching", text: "Leaders teaching", priority: "should" },
      { key: "kids_smallgroup", text: "Small group / craft time", priority: "should" },
      { key: "kids_pickup", text: "Pickup — parents reuniting with kids", priority: "nice" },
    ],
  },
  {
    key: "middle_school",
    title: "Middle School",
    defaultLocation: "MS Room",
    defaultRoles: ["door_holder", "training_door_holder"],
    shots: [
      { key: "ms_hangout", text: "Pre-service hangout / games", priority: "should" },
      { key: "ms_worship", text: "Worship — students engaged", priority: "must" },
      { key: "ms_teaching", text: "Speaker on stage with students in foreground", priority: "must" },
      { key: "ms_leaders", text: "Leaders praying with students", priority: "should" },
    ],
  },
  {
    key: "family_groups",
    title: "Family Groups",
    defaultLocation: "Lobby",
    defaultRoles: ["door_holder"],
    shots: [
      { key: "fg_gathering", text: "Families gathering / catching up", priority: "should" },
      { key: "fg_kids", text: "Kids playing during family groups", priority: "nice" },
      { key: "fg_conversation", text: "Adults in conversation — natural moments", priority: "should" },
    ],
  },
  {
    key: "baptisms",
    title: "One-Offs / Baptisms",
    defaultLocation: "AUD",
    defaultRoles: ["point"],
    focus: "Get the moment of the dunk + the celebration after.",
    shots: [
      { key: "bap_walkup", text: "Person walking up to the baptism pool", priority: "should" },
      { key: "bap_dunk", text: "The dunk — wide and tight", priority: "must" },
      { key: "bap_celebration", text: "Celebration / hugs after coming up", priority: "must" },
      { key: "bap_crowd", text: "Crowd reaction during baptism", priority: "should" },
    ],
  },
  {
    key: "editing_uploading",
    title: "Editing + Uploading",
    defaultRoles: ["all"],
    shots: [
      { key: "edit_cull", text: "Cull and edit within 48 hours", priority: "must" },
      { key: "edit_upload", text: "Upload to shared drive — folder named YYYY-MM-DD Sunday", priority: "must" },
      { key: "edit_export", text: "Export full-res JPEGs with Passion preset", priority: "should" },
    ],
  },
];

export function getBankSegment(key: string): BankSegment | null {
  return BANK_SEGMENTS.find((s) => s.key === key) ?? null;
}

// =============================================================================
// STANDARD NOTES — reusable boilerplate for top-level brief sections
// =============================================================================

export const STANDARD_DETAILS_NOTES =
  "Wear all black. Fly-on-the-wall posture — tight & medium framing until you get a smile, then pull wider for context. Stay out of the way; capture real moments first, then pull wider for context.";

export const STANDARD_GEAR_NOTES =
  "Two cameras preferred (24-70 + 70-200). Bring extra batteries and at least 2 SD cards each.";

export const STANDARD_EDITING_NOTES =
  "Cull tight, edit warm and natural — match the Passion preset. Upload to the shared drive within 48 hours. Export full-res JPEGs.";
