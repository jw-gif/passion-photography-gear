// Standalone shot list generator.
// Accepts a free-form admin payload (location, rooms, segments, roles, focus)
// and returns a brief assembled from the curated content bank. The AI only
// picks which bank entries apply — it never writes new prose.
// Admin-only (verify_jwt = true).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  assembleBrief,
  callLovableAiForPicks,
  corsHeaders,
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
      const { picks } = await callLovableAiForPicks({ apiKey, userPrompt });

      const brief = assembleBrief(picks, {
        location_key: body.location ?? null,
        call_time: body.call_time ?? null,
        wrap_time: body.wrap_time ?? null,
        door_code: body.door_code ?? null,
      });

      return json({
        brief: {
          ...brief,
          generated_with_model: SHOT_LIST_MODEL,
          generation_prompt: body.focus ?? null,
        },
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

function buildUserPrompt(p: Payload): string {
  const lines = [
    "Pick which bank entries apply to this Passion Photography shoot.",
    "",
    `Event: ${p.event_name || "(unspecified Sunday gathering)"}`,
    `Location: ${p.location || "(not specified)"}`,
  ];
  if (p.rooms && p.rooms.length) lines.push(`Rooms / spaces in use: ${p.rooms.join(", ")}`);
  if (p.segments && p.segments.length)
    lines.push(`Segments the admin wants covered (titles, not keys): ${p.segments.join(", ")}`);
  if (p.roles && p.roles.length) lines.push(`Roles available: ${p.roles.join(", ")}`);
  if (p.call_time) lines.push(`Call time: ${p.call_time}`);
  if (p.wrap_time) lines.push(`Wrap: ${p.wrap_time}`);
  if (p.door_code) lines.push(`Door code: ${p.door_code}`);
  if (p.focus) lines.push("", `Focus this shoot: ${p.focus}`);
  lines.push(
    "",
    "Pick the segment_keys that map to the segments listed above (plus editing_uploading at the end). For each segment, pick the shot_keys that fit. Map the requested roles thoughtfully — Point covers main room, Door Holders cover support spaces. Do NOT invent any new keys or prose.",
  );
  return lines.join("\n");
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
