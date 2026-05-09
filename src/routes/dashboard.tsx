import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Wrench, Calendar, PlayCircle, Megaphone, LogOut, Briefcase, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Passion Photography Team" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardPage,
});

interface OpenJob { opening_id: string; event_name: string | null; event_date: string | null; }
interface MyJob { assignment_id: string; event_name: string | null; event_date: string | null; }
interface MyGearReq { id: string; needed_date: string; status: string; location: string; }
interface EventRow { id: string; title: string; starts_at: string; location: string | null; capacity: number | null; }
interface Announcement { id: string; title: string; body: string; published_at: string; pinned: boolean; }
interface Video { id: string; title: string; thumbnail_url: string | null; }

function DashboardPage() {
  const { user, loading, signOut, isPhotographer, isTeam } = useAuth();
  const navigate = useNavigate();

  const [photographerId, setPhotographerId] = useState<string | null>(null);
  const [openJobs, setOpenJobs] = useState<OpenJob[]>([]);
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [myGear, setMyGear] = useState<MyGearReq[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});

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
    // Try to attach photographer record on first visit
    supabase.rpc("link_photographer_to_current_user").then(({ data }) => {
      if (data) setPhotographerId(data as string);
    });
  }, [loading, user, isTeam, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ph } = await supabase
        .from("photographers")
        .select("id, token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ph) {
        setPhotographerId(ph.id);
        // Use existing token-based RPCs to keep behaviour consistent
        const [{ data: open }, { data: mine }] = await Promise.all([
          supabase.rpc("list_open_jobs", { _token: ph.token }),
          supabase.rpc("list_my_jobs", { _token: ph.token }),
        ]);
        setOpenJobs((open ?? []) as OpenJob[]);
        setMyJobs((mine ?? []) as MyJob[]);
      }

      const [{ data: g }, { data: ev }, { data: an }, { data: vid }] = await Promise.all([
        supabase
          .from("gear_requests")
          .select("id, needed_date, status, location")
          .eq("user_id", user.id)
          .order("needed_date", { ascending: false })
          .limit(10),
        supabase
          .from("events")
          .select("id, title, starts_at, location")
          .eq("published", true)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(5),
        supabase
          .from("announcements")
          .select("id, title, body, published_at, pinned")
          .eq("published", true)
          .order("pinned", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(5),
        supabase
          .from("training_videos")
          .select("id, title, thumbnail_url")
          .eq("published", true)
          .order("sort_order", { ascending: true })
          .limit(6),
      ]);
      setMyGear((g ?? []) as MyGearReq[]);
      setEvents((ev ?? []) as EventRow[]);
      setAnns((an ?? []) as Announcement[]);
      setVideos((vid ?? []) as Video[]);
    })();
  }, [user]);

  if (loading || !user) {
    return <main className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</main>;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center">
              <Camera className="size-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-tight">Photographer Dashboard</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {!photographerId && isPhotographer === false && (
          <Card className="p-4 text-sm text-muted-foreground">
            Your account isn't linked to a photographer record yet. Ask an admin
            to add you with this email so you can see opportunities.
          </Card>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/request-gear"><Wrench className="size-4" /> Request gear</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/request-photography"><Camera className="size-4" /> Request photography</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/jobs"><Briefcase className="size-4" /> Full jobs board</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Open opportunities" icon={<Briefcase className="size-4" />}>
            {openJobs.length === 0 ? <Empty text="Nothing open right now." /> : (
              <ul className="divide-y">
                {openJobs.slice(0, 5).map((j) => (
                  <li key={j.opening_id} className="py-2 text-sm">
                    <div className="font-medium">{j.event_name ?? "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">{j.event_date ?? ""}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="My accepted jobs" icon={<Camera className="size-4" />}>
            {myJobs.length === 0 ? <Empty text="No accepted jobs yet." /> : (
              <ul className="divide-y">
                {myJobs.map((j) => (
                  <li key={j.assignment_id} className="py-2 text-sm">
                    <div className="font-medium">{j.event_name ?? "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">{j.event_date ?? ""}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="My gear requests" icon={<Wrench className="size-4" />}>
            {myGear.length === 0 ? <Empty text="No gear requests on file." /> : (
              <ul className="divide-y">
                {myGear.map((g) => (
                  <li key={g.id} className="py-2 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-medium">{g.location} · {g.needed_date}</div>
                      <div className="text-xs text-muted-foreground capitalize">{g.status}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Upcoming events" icon={<Calendar className="size-4" />}>
            {events.length === 0 ? <Empty text="No events scheduled." /> : (
              <ul className="divide-y">
                {events.map((e) => (
                  <li key={e.id} className="py-2 text-sm">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.starts_at).toLocaleString()} {e.location ? `· ${e.location}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Training videos" icon={<PlayCircle className="size-4" />}>
            {videos.length === 0 ? <Empty text="No videos posted yet." /> : (
              <div className="grid grid-cols-2 gap-2">
                {videos.map((v) => (
                  <div key={v.id} className="aspect-video rounded-md bg-muted overflow-hidden">
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">{v.title}</div>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Announcements" icon={<Megaphone className="size-4" />}>
            {anns.length === 0 ? <Empty text="No announcements yet." /> : (
              <ul className="divide-y">
                {anns.map((a) => (
                  <li key={a.id} className="py-2 text-sm">
                    <div className="font-medium">{a.pinned ? "📌 " : ""}{a.title}</div>
                    {a.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="font-semibold tracking-tight inline-flex items-center gap-2 mb-3">
        {icon} {title}
      </h2>
      {children}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground py-2">{text}</div>;
}
