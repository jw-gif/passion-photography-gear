import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InviteInput = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(255).optional(),
});

export const inviteHire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InviteInput.parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is an admin
    const { data: roleRows, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error("Failed to verify role");
    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden: admin only");

    // Determine the redirect origin from the request
    const origin =
      getRequestHeader("origin") ||
      (() => {
        const host = getRequestHeader("host");
        const proto = getRequestHeader("x-forwarded-proto") || "https";
        return host ? `${proto}://${host}` : "";
      })();
    const redirectTo = `${origin}/reset-password`;

    const email = data.email.toLowerCase();

    // Try inviting. If the user already exists, fall back to a recovery link
    // so they still receive a branded email and can set a new password.
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: data.name ? { name: data.name } : undefined,
      },
    );

    if (inviteErr) {
      const msg = inviteErr.message?.toLowerCase() ?? "";
      const alreadyExists =
        msg.includes("already") ||
        msg.includes("registered") ||
        (inviteErr as unknown as { status?: number }).status === 422;

      if (alreadyExists) {
        const { error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo },
        });
        if (linkErr) throw new Error(linkErr.message);
        return { ok: true, alreadyExists: true };
      }

      throw new Error(inviteErr.message);
    }

    return { ok: true, alreadyExists: false };
  });
