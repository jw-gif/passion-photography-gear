// Shared system prompt + tool schema for shot list generation.
// Used by both the per-request and standalone generators.

export const SHOT_LIST_MODEL = "google/gemini-3-flash-preview";

export const PROPOSE_BRIEF_TOOL = {
  type: "function" as const,
  function: {
    name: "propose_brief",
    description:
      "Produce a structured photographer brief / call sheet for a Passion Photography shoot.",
    parameters: {
      type: "object",
      properties: {
        call_time: { type: "string", description: "When photographers should arrive (e.g. '8:30 AM')" },
        wrap_time: { type: "string", description: "Approximate wrap time" },
        door_code: { type: "string" },
        arrival_notes: {
          type: "string",
          description: "Where to park / enter / who to find on arrival.",
        },
        details_notes: {
          type: "string",
          description: "Dress code, posture, framing reminders.",
        },
        gear_notes: {
          type: "string",
          description: "Cameras, lenses, batteries, cards.",
        },
        editing_notes: {
          type: "string",
          description: "Where to upload, export specs, deadline.",
        },
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              location: { type: "string" },
              time: { type: "string" },
              assigned_roles: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["all", "point", "door_holder", "training_door_holder"],
                },
              },
              focus: { type: "string", description: "One-line italic guidance for this segment." },
              shots: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    priority: { type: "string", enum: ["must", "should", "nice"] },
                  },
                  required: ["text", "priority"],
                },
              },
            },
            required: ["title", "assigned_roles", "shots"],
          },
        },
      },
      required: ["segments"],
    },
  },
};

export const PASSION_STYLE_SYSTEM_PROMPT = `You are the Passion Photography lead writing a call sheet / shot list for a volunteer photo team covering a Passion City Church gathering or event.

Your voice and style:
- Direct, warm, and concise. Sentence fragments and shorthand are fine ("tight & medium until you get a smile", "wide from highest point").
- Fly-on-the-wall posture. Photographers stay out of the way, capture real moments, then pull wider for context.
- Wear all black. Two cameras preferred (24-70 + 70-200).
- Brand-friendly framing: centered & off-centered with the LED wall, wide from the highest point, faces and hands.

Brief structure (always follow this):
- Top-level metadata: call_time, wrap_time, door_code, arrival_notes, details_notes, gear_notes, editing_notes.
- Segments are ordered by when they happen during the day.
- Common segment names: "Pre-Gathering", "Worship (AUD)", "Hosting + Giving (AUD)", "Talk (AUD)", "Passion Kids + bloom", "Middle School", "Family Groups", "One-Offs / Baptisms", "Editing + Uploading".
- Each segment has assigned_roles. Use "point" for the lead photographer's coverage (worship, hosting, talk). Use "door_holder" or "training_door_holder" for support coverage (kids, MS, family groups). Use "all" for things everyone handles.
- Each shot is short, specific, and visual. Priority "must" = required hero shot. "should" = standard coverage. "nice" = bonus if time allows.
- Include a focus line per segment when helpful (e.g. "Let's focus on shots of people and smiling faces.").

Example shots:
- "Wide from highest point during opening song"
- "Tight on hands raised in worship"
- "Pastor mid-laugh during welcome"
- "Kids running into the room with their leaders"
- "Centered framing of the LED wall with the speaker silhouette"

Always call the propose_brief tool with the structured response. Do not write any prose outside the tool call.`;

export const FEW_SHOT_EXAMPLE = {
  user: `Sample shoot context:
- Event: Sunday Gathering at the 515 building
- Coverage roster: 1 Point, 2 Door Holders
- Coverage types: live event
- Notes: Standard Sunday — no baptisms this week.`,
  brief: {
    call_time: "8:30 AM",
    wrap_time: "12:30 PM",
    door_code: "1234#",
    arrival_notes:
      "Park in the lower lot. Enter through the side door by the loading dock. Find Mac at the photo cart in the AUD.",
    details_notes:
      "Wear all black. Fly-on-the-wall posture — tight & medium until you get a smile, then pull wider for context.",
    gear_notes:
      "Two cameras (24-70 + 70-200). Bring extra batteries and at least 2 SD cards each.",
    editing_notes:
      "Cull tight, edit warm and natural — Passion preset. Upload to the shared drive within 48 hours. Export full-res JPEGs.",
    segments: [
      {
        title: "Pre-Gathering",
        location: "Outside / Lobby",
        time: "9:00a",
        assigned_roles: ["all"],
        focus: "Let's focus on shots of people and smiling faces.",
        shots: [
          { text: "People walking up to the building", priority: "should" },
          { text: "Greeters at the door", priority: "must" },
          { text: "Coffee + connection in the lobby", priority: "should" },
          { text: "First-time guests at the welcome desk", priority: "nice" },
        ],
      },
      {
        title: "Worship (AUD)",
        location: "AUD",
        time: "9:30a",
        assigned_roles: ["point"],
        focus: "Centered & off-centered framed with the LED wall.",
        shots: [
          { text: "Wide from highest point during opening song", priority: "must" },
          { text: "Tight on hands raised", priority: "must" },
          { text: "Worship leader mid-vocal", priority: "should" },
          { text: "Crowd singing — variety of faces", priority: "should" },
        ],
      },
      {
        title: "Hosting + Giving (AUD)",
        location: "AUD",
        assigned_roles: ["point"],
        shots: [
          { text: "Host welcoming the room", priority: "must" },
          { text: "Crowd reaction shots during announcements", priority: "should" },
        ],
      },
      {
        title: "Talk (AUD)",
        location: "AUD",
        assigned_roles: ["point"],
        focus: "Get the speaker mid-laugh and mid-point.",
        shots: [
          { text: "Speaker wide with LED wall", priority: "must" },
          { text: "Speaker mid-laugh / mid-gesture", priority: "must" },
          { text: "Audience taking notes", priority: "should" },
        ],
      },
      {
        title: "Passion Kids + bloom",
        location: "Kids Room",
        assigned_roles: ["door_holder", "training_door_holder"],
        focus: "Capture the energy and the leaders connecting with kids.",
        shots: [
          { text: "Kids running into the room", priority: "must" },
          { text: "Worship time — kids singing/dancing", priority: "must" },
          { text: "Leaders teaching", priority: "should" },
        ],
      },
      {
        title: "Editing + Uploading",
        assigned_roles: ["all"],
        shots: [
          { text: "Cull and edit within 48 hours", priority: "must" },
          { text: "Upload to shared drive — folder named YYYY-MM-DD Sunday", priority: "must" },
        ],
      },
    ],
  },
};

export interface ParsedBriefResponse {
  brief: unknown;
  raw: unknown;
}

export async function callLovableAi(opts: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
}): Promise<ParsedBriefResponse> {
  const body = {
    model: SHOT_LIST_MODEL,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userPrompt },
    ],
    tools: [PROPOSE_BRIEF_TOOL],
    tool_choice: { type: "function", function: { name: "propose_brief" } },
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
  return { brief: parsed, raw: data };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
