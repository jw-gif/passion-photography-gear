import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

/**
 * Legacy route — resolves the signed-in user's photographer record and
 * forwards to /photographers/$id (or /admin for staff).
 */
export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Passion Photography Team" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const { user, loading, isTeam } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Loading…");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/dashboard" }, replace: true });
      return;
    }
    if (isTeam) {
      navigate({ to: "/admin", replace: true });
      return;
    }
    (async () => {
      // Ensure linkage exists
      await supabase.rpc("link_photographer_to_current_user");
      const { data } = await supabase
        .from("photographers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.id) {
        navigate({ to: "/photographers/$id", params: { id: data.id }, replace: true });
      } else {
        setMessage("Your account isn't linked to a photographer profile yet. Ask an admin to add you with this email.");
      }
    })();
  }, [loading, user, isTeam, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="p-6 text-sm text-muted-foreground max-w-md text-center">{message}</Card>
    </main>
  );
}
