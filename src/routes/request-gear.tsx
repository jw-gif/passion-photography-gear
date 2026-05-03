import { createFileRoute } from "@tanstack/react-router";
import { GearRequestForm } from "@/components/gear-request-form";

export const Route = createFileRoute("/request-gear")({
  head: () => ({
    meta: [
      { title: "Request Gear · Passion Photography Team" },
      { name: "description", content: "Submit a request for photography gear at a specific location and date." },
      { property: "og:title", content: "Request Gear · Passion Photography Team" },
      { property: "og:description", content: "Submit a request for photography gear at a specific location and date." },
    ],
  }),
  component: GearRequestForm,
});
