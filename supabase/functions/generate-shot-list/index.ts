// Per-request shot list generator.
// Loads a photo_request, asks the AI to pick which bank entries apply,
// then assembles the brief server-side from the bank. The AI never writes
// any new prose — it only chooses keys from the curated content bank.
// Admin-only (verify_jwt = true).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  assembleBrief,
  callLovableAiForPicks,
  corsHeaders,
  SHOT_LIST_MODEL,
} from "../_shared/shot-list.ts";

interface RequestRow {
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  spans_multiple_days: boolean;
  event_end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  on_site_contact_name: string | null;
  on_site_contact_phone: string | null;
  coverage_types: string[];
  coverage_other: string | null;
  notes: string | null;
  request_types: string[];
}

interface OpeningRow {
  role: "point" | "door_holder" | "training_door_holder";
  position: number;
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

    // Verify caller is an admin using the user's JWT
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

    const body = await req.json().catch(() => ({}));
    const requestId: string | undefined = body?.request_id;
    const extraPrompt: string = typeof body?.extra_prompt === "string" ? body.extra_prompt : "";
    if (!requestId) {
      return json({ error: "request_id required" }, 400);
    }

    const { data: reqRow, error: reqErr } = await admin
      .from("photo_requests")
      .select(
        "event_name, event_location, event_date, spans_multiple_days, event_end_date, start_time, end_time, on_site_contact_name, on_site_contact_phone, coverage_types, coverage_other, notes, request_types"
      )
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr || !reqRow) {
      return json({ error: "Request not found" }, 404);
    }

    const { data: openings } = await admin
      .from("photo_request_openings")
      .select("role, position")
      .eq("request_id", requestId);

    const userPrompt = buildUserPrompt(reqRow as RequestRow, (openings ?? []) as OpeningRow[], extraPrompt);

    try {
      const { picks } = await callLovableAiForPicks({ apiKey, userPrompt });

      const brief = assembleBrief(picks, {
        location_key: (reqRow as RequestRow).event_location ?? null,
        call_time: (reqRow as RequestRow).start_time ?? null,
        wrap_time: (reqRow as RequestRow).end_time ?? null,
        door_code: null,
      });

      return json({
        brief: {
          ...brief,
          generated_with_model: SHOT_LIST_MODEL,
          generation_prompt: extraPrompt || null,
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
    console.error("generate-shot-list error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function buildUserPrompt(req: RequestRow, openings: OpeningRow[], extra: string): string {
  const counts = openings.reduce<Record<string, number>>((acc, o) => {
    acc[o.role] = (acc[o.role] ?? 0) + 1;
    return acc;
  }, {});
  const rosterParts: string[] = [];
  if (counts.point) rosterParts.push(`${counts.point} Point`);
  if (counts.door_holder) rosterParts.push(`${counts.door_holder} Door Holder${counts.door_holder > 1 ? "s" : ""}`);
  if (counts.training_door_holder)
    rosterParts.push(`${counts.training_door_holder} Training Door Holder${counts.training_door_holder > 1 ? "s" : ""}`);
  const roster = rosterParts.length ? rosterParts.join(", ") : "Not yet set";

  const lines = [
    "Pick which bank entries apply to this Passion Photography shoot.",
    "",
    `Event: ${req.event_name ?? "(not specified)"}`,
    `Location: ${req.event_location ?? "(not specified)"}`,
    `Date: ${req.event_date ?? "(not specified)"}${req.spans_multiple_days && req.event_end_date ? ` → ${req.event_end_date}` : ""}`,
    `Time: ${req.start_time ?? "?"} – ${req.end_time ?? "?"}`,
    `Coverage roster: ${roster}`,
    `Coverage types: ${(req.coverage_types ?? []).join(", ") || "(not specified)"}${req.coverage_other ? ` (${req.coverage_other})` : ""}`,
    `Request types: ${(req.request_types ?? []).join(", ") || "(not specified)"}`,
  ];
  if (req.on_site_contact_name) {
    lines.push(`On-site contact: ${req.on_site_contact_name}${req.on_site_contact_phone ? ` (${req.on_site_contact_phone})` : ""}`);
  }
  if (req.notes) {
    lines.push("", `Requestor notes: ${req.notes}`);
  }
  if (extra) {
    lines.push("", `Extra focus from admin: ${extra}`);
  }
  lines.push(
    "",
    "Pick segments and shot_keys that fit this roster and event. Tailor assigned_roles to who is on the team. Do NOT invent any new keys or prose.",
  );
  return lines.join("\n");
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
