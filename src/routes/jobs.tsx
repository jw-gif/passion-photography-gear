import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

/**
 * Legacy /jobs route — resolves the photographer for the magic-link token,
 * then forwards to /photographers/$id?t=<token> which is the unified page.
 */
const searchSchema = z.object({ t: z.string().min(1).optional() });

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Serving Opportunities · Passion Photography Team" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: JobsRedirect,
});

function JobsRedirect() {
  const { t } = useSearch({ from: "/jobs" });
  const navigate = useNavigate();
  const [error, setError] = useState<"missing" | "invalid" | null>(null);

  useEffect(() => {
    if (!t) { setError("missing"); return; }
    (async () => {
      const { data } = await supabase.rpc("get_photographer_by_token", { _token: t });
      const row = (data ?? [])[0] as { id: string } | undefined;
      if (!row) { setError("invalid"); return; }
      navigate({
        to: "/photographers/$id",
        params: { id: row.id },
        search: { t },
        replace: true,
      });
    })();
  }, [t, navigate]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md p-8 text-center space-y-3">
          <Camera className="size-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">
            {error === "missing" ? "No link provided" : "This link isn't valid"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {error === "missing"
              ? "Open the personal link your photo lead sent you via email or SMS."
              : "Your link may have been deactivated. Reach out to your photo lead for a new one."}
          </p>
          <Link to="/" className="text-sm text-primary hover:underline inline-block">Go to homepage</Link>
        </Card>
      </main>
    );
  }
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </main>
  );
}
