import { createFileRoute } from "@tanstack/react-router";
import { GearRequestForm } from "@/components/gear-request-form";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/request-gear")({
  head: () => ({
    meta: [
      { title: "Request Gear · Passion Photography Team" },
      { name: "description", content: "Submit a request for photography gear at a specific location and date." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <GearRequestForm />
    </RequireAuth>
  ),
});
