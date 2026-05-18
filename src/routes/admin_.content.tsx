import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnnouncementsSection } from "@/components/admin/content/announcements-section";
import { EventsSection } from "@/components/admin/content/events-section";
import { TrainingSection } from "@/components/admin/content/training-section";
import { LandingPhotosSection } from "@/components/admin/content/landing-photos-section";

const tabSchema = z.enum(["announcements", "events", "training", "landing-photos"]).catch("announcements");

export const Route = createFileRoute("/admin_/content")({
  head: () => ({
    meta: [
      { title: "Content · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: tabSchema.parse(search.tab ?? "announcements"),
  }),
  component: ContentRoute,
});

function ContentRoute() {
  const { signOut } = useAuth();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <RequireAdmin requireAdmin>
      <main className="min-h-screen">
        <HubHeader onLogout={() => signOut()} title="Content" subtitle="Photographer hub publishing" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <Tabs
            value={tab}
            onValueChange={(v) => navigate({ search: { tab: v as typeof tab }, replace: true })}
          >
            <TabsList>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
              <TabsTrigger value="landing-photos">Landing photos</TabsTrigger>
            </TabsList>
            <TabsContent value="announcements" className="mt-0"><AnnouncementsSection /></TabsContent>
            <TabsContent value="events" className="mt-0"><EventsSection /></TabsContent>
            <TabsContent value="training" className="mt-0"><TrainingSection /></TabsContent>
            <TabsContent value="landing-photos" className="mt-0"><LandingPhotosSection /></TabsContent>
          </Tabs>
        </div>
      </main>
    </RequireAdmin>
  );
}
