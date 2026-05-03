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
    try {
      // Verify caller is an admin
      const { data: roleRows, error: roleErr } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId);
      if (roleErr) {
        console.error("inviteHire: role check failed", roleErr);
        return { ok: false as const, error: "Failed to verify role" };
      }
      const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");
      if (!isAdmin) return { ok: false as const, error: "Forbidden: admin only" };

      const origin =
        getRequestHeader("origin") ||
        (() => {
          const host = getRequestHeader("host");
          const proto = getRequestHeader("x-forwarded-proto") || "https";
          return host ? `${proto}://${host}` : "";
        })();
      const redirectTo = `${origin}/reset-password`;

      const email = data.email.toLowerCase();

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
          const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(
            email,
            { redirectTo },
          );
          if (resetErr) {
            console.error("inviteHire: reset failed", resetErr);
            return { ok: false as const, error: resetErr.message };
          }
          return { ok: true as const, alreadyExists: true };
        }

        console.error("inviteHire: invite failed", inviteErr);
        return { ok: false as const, error: inviteErr.message };
      }

      return { ok: true as const, alreadyExists: false };
    } catch (err) {
      console.error("inviteHire: unexpected error", err);
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Unexpected error",
      };
    }
  });

