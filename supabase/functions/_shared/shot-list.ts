// Shared content bank + assembly logic for shot list generation.
//
// Philosophy: the AI is *not* allowed to write any new prose. It only chooses
// which pre-written entries from the bank apply to this event. The brief is
// then assembled server-side from those picks. This keeps the output
// brand-safe and consistent with real Passion call sheets.
//
// To add new arrival blocks, segments, or shots, edit this file and the
// matching client-side bank in src/lib/shot-list-bank.ts. The two should
// stay in sync — keys must match exactly.

export const SHOT_LIST_MODEL = "google/gemini-3-flash-preview";

// =============================================================================
// LOCATION BLOCKS
// =============================================================================

export interface LocationBlock {
  key: string;
  label: string;
  alias?: string;
  address: string;
  arrival: string;
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
      "Take the elevator in the Central Building up to the 4th floor (you'll need to use the door code to activate the button). When you exit the elevator, take a left and then a right through the double doors. The catering space is the first single door on the left. Our unofficial table is next to the column by the window next to the power strip.",
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
// SEGMENT BANK
// =============================================================================

type ShotPriority = "must" | "should" | "nice";
type SegmentRole = "all" | "point" | "door_holder" | "training_door_holder";

export interface BankShot {
  key: string;
  text: string;
  priority: ShotPriority;
}

export interface BankSegment {
  key: string;
  title: string;
  defaultLocation?: string;
  defaultRoles: SegmentRole[];
  focus?: string;
  shots: BankShot[];
}

export const BANK_SEGMENTS: BankSegment[] = [
  {
    key: "pre_gathering",
    title: "Pre-Gathering",
    defaultLocation: "Outside / Lobby",
    defaultRoles: ["all"],
    focus: "Let's focus on shots of people and smiling faces.",
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
// STANDARD NOTES
// =============================================================================

export const STANDARD_DETAILS_NOTES =
  "Wear all black. Fly-on-the-wall posture — tight & medium framing until you get a smile, then pull wider for context. Stay out of the way; capture real moments first, then pull wider for context.";

export const STANDARD_GEAR_NOTES =
  "Two cameras preferred (24-70 + 70-200). Bring extra batteries and at least 2 SD cards each.";

export const STANDARD_EDITING_NOTES =
  "Cull tight, edit warm and natural — match the Passion preset. Upload to the shared drive within 48 hours. Export full-res JPEGs.";

// =============================================================================
// AI PICK SCHEMA + ASSEMBLY
// =============================================================================

export interface BriefPicks {
  /** Optional: location key the AI picked (if not already specified). */
  location_key?: string | null;
  /** Whether to include the standard details/gear/editing notes blocks. */
  include_standard_details?: boolean;
  include_standard_gear?: boolean;
  include_standard_editing?: boolean;
  /** Ordered list of segments to include. */
  segments: SegmentPick[];
}

export interface SegmentPick {
  /** Bank segment key. Must match BANK_SEGMENTS[*].key. */
  segment_key: string;
  /** Optional override of the segment's default location. */
  location?: string | null;
  /** Optional time string (e.g. "9:30a"). */
  time?: string | null;
  /** Roles to assign — overrides bank default if provided. */
  assigned_roles?: SegmentRole[] | null;
  /** Shot keys to include from this segment's bank. Order is preserved. */
  shot_keys: string[];
}

/** Tool exposed to the AI. Note: NO free-text prose fields. */
export const PICK_BRIEF_TOOL = {
  type: "function" as const,
  function: {
    name: "pick_brief",
    description:
      "Pick which entries from the Passion Photography content bank apply to this event. Do not write new prose — only select keys from the bank.",
    parameters: {
      type: "object",
      properties: {
        location_key: {
          type: "string",
          description:
            "Location key from the bank (one of: " +
            LOCATION_BLOCKS.map((b) => b.key).join(", ") +
            "). Only set if the user did not already specify a location.",
        },
        include_standard_details: {
          type: "boolean",
          description: "Include the standard 'wear all black, fly-on-the-wall' details note.",
        },
        include_standard_gear: {
          type: "boolean",
          description: "Include the standard two-camera gear note.",
        },
        include_standard_editing: {
          type: "boolean",
          description: "Include the standard editing/upload note.",
        },
        segments: {
          type: "array",
          description: "Ordered list of segments to include. Pick segment_key from the bank.",
          items: {
            type: "object",
            properties: {
              segment_key: {
                type: "string",
                description:
                  "Bank segment key. One of: " +
                  BANK_SEGMENTS.map((s) => s.key).join(", "),
              },
              location: {
                type: "string",
                description:
                  "Override the segment's default location (e.g. a specific room). Leave empty to use the bank default.",
              },
              time: { type: "string", description: "Optional time like '9:30a'." },
              assigned_roles: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["all", "point", "door_holder", "training_door_holder"],
                },
                description:
                  "Roles for this segment. Leave empty to use the bank default for this segment.",
              },
              shot_keys: {
                type: "array",
                items: { type: "string" },
                description:
                  "Bank shot keys to include for this segment. Pick the ones that fit the event. Order is preserved in the output.",
              },
            },
            required: ["segment_key", "shot_keys"],
          },
        },
      },
      required: ["segments"],
    },
  },
};

// -----------------------------------------------------------------------------
// Brief assembly — turn the AI's picks into the final brief structure.
// -----------------------------------------------------------------------------

interface AssembledShot {
  text: string;
  priority: ShotPriority;
}

interface AssembledSegment {
  title: string;
  location: string | null;
  time: string | null;
  assigned_roles: SegmentRole[];
  focus: string | null;
  shots: AssembledShot[];
}

export interface AssembledBrief {
  call_time: string;
  wrap_time: string;
  door_code: string;
  arrival_notes: string;
  details_notes: string;
  gear_notes: string;
  editing_notes: string;
  segments: AssembledSegment[];
}

export interface AssemblyContext {
  /** Location key from the form/request (takes priority over AI's pick). */
  location_key?: string | null;
  call_time?: string | null;
  wrap_time?: string | null;
  door_code?: string | null;
}

export function assembleBrief(picks: BriefPicks, ctx: AssemblyContext): AssembledBrief {
  const locKey = ctx.location_key || picks.location_key || null;
  const locBlock = getLocationBlock(locKey);

  const arrivalParts: string[] = [];
  if (locBlock) {
    arrivalParts.push(locBlock.address);
    arrivalParts.push("");
    arrivalParts.push(locBlock.arrival);
    arrivalParts.push("");
    arrivalParts.push(`Editing Space Directions: ${locBlock.editingSpace}`);
  }

  const segments: AssembledSegment[] = [];
  for (const pick of picks.segments ?? []) {
    const bank = getBankSegment(pick.segment_key);
    if (!bank) continue; // ignore unknown keys silently
    const shotMap = new Map(bank.shots.map((s) => [s.key, s]));
    const shots: AssembledShot[] = [];
    for (const key of pick.shot_keys ?? []) {
      const s = shotMap.get(key);
      if (s) shots.push({ text: s.text, priority: s.priority });
    }
    // If AI picked a segment but no shots, fall back to all "must" shots.
    if (shots.length === 0) {
      for (const s of bank.shots.filter((x) => x.priority === "must")) {
        shots.push({ text: s.text, priority: s.priority });
      }
    }
    segments.push({
      title: bank.title,
      location: pick.location || bank.defaultLocation || null,
      time: pick.time || null,
      assigned_roles:
        pick.assigned_roles && pick.assigned_roles.length
          ? pick.assigned_roles
          : bank.defaultRoles,
      focus: bank.focus ?? null,
      shots,
    });
  }

  return {
    call_time: ctx.call_time ?? "",
    wrap_time: ctx.wrap_time ?? "",
    door_code: ctx.door_code ?? "",
    arrival_notes: arrivalParts.join("\n"),
    details_notes: picks.include_standard_details === false ? "" : STANDARD_DETAILS_NOTES,
    gear_notes: picks.include_standard_gear === false ? "" : STANDARD_GEAR_NOTES,
    editing_notes: picks.include_standard_editing === false ? "" : STANDARD_EDITING_NOTES,
    segments,
  };
}

// -----------------------------------------------------------------------------
// AI gateway helper
// -----------------------------------------------------------------------------

export const PICK_SYSTEM_PROMPT = `You are a curator for the Passion Photography content bank. You do NOT write any new prose. Your only job is to look at the event context and pick which pre-written entries from the bank apply.

Rules:
- Always call the pick_brief tool. Do not write any text outside the tool call.
- Only use segment_key and shot_key values that exist in the bank — never invent new ones.
- Pick segments in the order they will happen during the day (Pre-Gathering first, Editing + Uploading last).
- For each segment you pick, include the most relevant shot_keys for THIS event. Prioritize "must" shots, add "should" shots that fit, and only include "nice" shots when they obviously apply.
- Tailor assigned_roles to the roster. Use "point" for the lead photographer (worship, hosting, talk). Use "door_holder" / "training_door_holder" for support coverage (kids, MS, family groups). Use "all" for things everyone shares.
- If the user mentions a special focus (e.g. baptism Sunday), include the relevant segment from the bank — do not invent a new one.
- Always include the editing_uploading segment unless the user explicitly says to skip it.
- Set include_standard_details, include_standard_gear, include_standard_editing to true unless the context clearly says to skip them.

Available locations and their keys:
${LOCATION_BLOCKS.map((b) => `- ${b.key} (${b.label}${b.alias ? `, alias ${b.alias}` : ""})`).join("\n")}

Available bank segments (segment_key — title — available shot_keys):
${BANK_SEGMENTS.map(
  (s) =>
    `- ${s.key} — ${s.title} — ${s.shots.map((sh) => `${sh.key}[${sh.priority}]`).join(", ")}`,
).join("\n")}`;

export interface PicksResponse {
  picks: BriefPicks;
  raw: unknown;
}

export async function callLovableAiForPicks(opts: {
  apiKey: string;
  userPrompt: string;
  signal?: AbortSignal;
}): Promise<PicksResponse> {
  const body = {
    model: SHOT_LIST_MODEL,
    messages: [
      { role: "system", content: PICK_SYSTEM_PROMPT },
      { role: "user", content: opts.userPrompt },
    ],
    tools: [PICK_BRIEF_TOOL],
    tool_choice: { type: "function", function: { name: "pick_brief" } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(`AI gateway error ${resp.status}: ${text}`);
    (err as Error & { status?: number }).status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  const argsStr = toolCall?.function?.arguments;
  if (!argsStr) {
    throw new Error("AI response did not include a tool call");
  }
  let parsed: unknown;
  try {
    parsed = typeof argsStr === "string" ? JSON.parse(argsStr) : argsStr;
  } catch {
    throw new Error("AI tool call returned invalid JSON");
  }
  return { picks: parsed as BriefPicks, raw: data };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
