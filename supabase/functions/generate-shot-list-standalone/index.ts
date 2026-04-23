// Standalone shot list generator.
// Accepts a free-form admin payload (location, rooms, segments, roles, focus)
// and returns a generated brief without touching the database.
// Admin-only (verify_jwt = true).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  callLovableAi,
  corsHeaders,
  FEW_SHOT_EXAMPLE,
  PASSION_STYLE_SYSTEM_PROMPT,
  SHOT_LIST_MODEL,
} from "../_shared/shot-list.ts";

interface Payload {
  event_name?: string;
  location?: string;
  rooms?: string[];
  segments?: string[];
  roles?: string[];
  call_time?: string;
  wrap_time?: string;
  door_code?: string;
  focus?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return json({ error: "Admin only" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const userPrompt = buildUserPrompt(body);

    try {
      const { brief } = await callLovableAi({
        apiKey,
        systemPrompt: buildSystemPrompt(),
        userPrompt,
      });

      // Pre-fill metadata from the form when the model didn't include it.
      const merged = mergeMeta(brief, body);

      return json({
        brief: { ...merged, generated_with_model: SHOT_LIST_MODEL, generation_prompt: body.focus ?? null },
      });
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 429) {
        return json({ error: "AI is busy right now. Try again in a moment." }, 429);
      }
      if (status === 402) {
        return json(
          { error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." },
          402
        );
      }
      console.error("AI error:", e);
      return json({ error: e instanceof Error ? e.message : "AI generation failed" }, 500);
    }
  } catch (e) {
    console.error("generate-shot-list-standalone error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function buildSystemPrompt(): string {
  return `${PASSION_STYLE_SYSTEM_PROMPT}

# Few-shot example
User context:
${FEW_SHOT_EXAMPLE.user}

Tool call (propose_brief) you would make:
${JSON.stringify(FEW_SHOT_EXAMPLE.brief, null, 2)}`;
}

function buildUserPrompt(p: Payload): string {
  const lines = [
    "Generate a brief for a Passion Photography shoot.",
    "",
    `Event: ${p.event_name || "(unspecified Sunday gathering)"}`,
    `Location: ${p.location || "(not specified)"}`,
  ];
  if (p.rooms && p.rooms.length) lines.push(`Rooms / spaces in use: ${p.rooms.join(", ")}`);
  if (p.segments && p.segments.length)
    lines.push(`Segments to cover: ${p.segments.join(", ")}`);
  if (p.roles && p.roles.length) lines.push(`Roles available: ${p.roles.join(", ")}`);
  if (p.call_time) lines.push(`Call time: ${p.call_time}`);
  if (p.wrap_time) lines.push(`Wrap: ${p.wrap_time}`);
  if (p.door_code) lines.push(`Door code: ${p.door_code}`);
  if (p.focus) lines.push("", `Focus this shoot: ${p.focus}`);
  lines.push(
    "",
    "Build segments only for the spaces and segments listed above (plus an Editing + Uploading segment). Assign roles thoughtfully — Point covers main room, Door Holders cover support spaces."
  );
  return lines.join("\n");
}

function mergeMeta(brief: unknown, p: Payload): Record<string, unknown> {
  const b = (brief && typeof brief === "object" ? brief : {}) as Record<string, unknown>;
  return {
    ...b,
    call_time: b.call_time || p.call_time || "",
    wrap_time: b.wrap_time || p.wrap_time || "",
    door_code: b.door_code || p.door_code || "",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
