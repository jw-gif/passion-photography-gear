import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, Wrench, Calendar, PlayCircle, Megaphone, LogOut, Briefcase, Check, Play } from "lucide-react";
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
interface EventRow { id: string; title: string; starts_at: string; ends_at: string | null; location: string | null; capacity: number | null; description: string | null; }
interface Announcement { id: string; title: string; body: string; published_at: string; pinned: boolean; }
interface Video { id: string; title: string; description: string | null; video_url: string; thumbnail_url: string | null; }

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
  const [openEvent, setOpenEvent] = useState<EventRow | null>(null);
  const [openVideo, setOpenVideo] = useState<Video | null>(null);
  const [openAnn, setOpenAnn] = useState<Announcement | null>(null);

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
          .select("id, title, starts_at, ends_at, location, capacity, description")
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
          .select("id, title, description, video_url, thumbnail_url")
          .eq("published", true)
          .order("sort_order", { ascending: true })
          .limit(6),
      ]);
      setMyGear((g ?? []) as MyGearReq[]);
      const evRows = (ev ?? []) as EventRow[];
      setEvents(evRows);
      setAnns((an ?? []) as Announcement[]);
      setVideos((vid ?? []) as Video[]);

      if (evRows.length) {
        const ids = evRows.map((e) => e.id);
        const [{ data: mine }, { data: all }] = await Promise.all([
          supabase.from("event_rsvps").select("event_id").in("event_id", ids).eq("user_id", user.id),
          supabase.from("event_rsvps").select("event_id").in("event_id", ids),
        ]);
        const m: Record<string, boolean> = {};
        (mine ?? []).forEach((r: { event_id: string }) => { m[r.event_id] = true; });
        setRsvps(m);
        const c: Record<string, number> = {};
        (all ?? []).forEach((r: { event_id: string }) => { c[r.event_id] = (c[r.event_id] ?? 0) + 1; });
        setRsvpCounts(c);
      }
    })();
  }, [user]);

  async function toggleRsvp(eventId: string) {
    if (!user) return;
    if (rsvps[eventId]) {
      const { error } = await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
      if (error) { toast.error(error.message); return; }
      setRsvps((s) => ({ ...s, [eventId]: false }));
      setRsvpCounts((s) => ({ ...s, [eventId]: Math.max(0, (s[eventId] ?? 1) - 1) }));
      toast.success("RSVP removed");
    } else {
      const { error } = await supabase.from("event_rsvps").insert({
        event_id: eventId, user_id: user.id, photographer_id: photographerId, status: "going",
      });
      if (error) { toast.error(error.message); return; }
      setRsvps((s) => ({ ...s, [eventId]: true }));
      setRsvpCounts((s) => ({ ...s, [eventId]: (s[eventId] ?? 0) + 1 }));
      toast.success("You're in!");
    }
  }

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
                {events.map((e) => {
                  const going = !!rsvps[e.id];
                  const count = rsvpCounts[e.id] ?? 0;
                  const full = e.capacity != null && count >= e.capacity && !going;
                  return (
                    <li key={e.id} className="py-2 text-sm flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left hover:text-primary transition-colors"
                        onClick={() => setOpenEvent(e)}
                      >
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(e.starts_at).toLocaleString()} {e.location ? `· ${e.location}` : ""}
                          {e.capacity != null && ` · ${count}/${e.capacity}`}
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant={going ? "secondary" : "outline"}
                        disabled={full}
                        onClick={() => toggleRsvp(e.id)}
                      >
                        {going ? <><Check className="size-3.5" /> Going</> : full ? "Full" : "RSVP"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Training videos" icon={<PlayCircle className="size-4" />}>
            {videos.length === 0 ? <Empty text="No videos posted yet." /> : (
              <div className="grid grid-cols-2 gap-2">
                {videos.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setOpenVideo(v)}
                    className="group aspect-video rounded-md bg-muted overflow-hidden relative"
                  >
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{v.title}</div>}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Play className="size-8 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title="Announcements" icon={<Megaphone className="size-4" />}>
            {anns.length === 0 ? <Empty text="No announcements yet." /> : (
              <ul className="divide-y">
                {anns.map((a) => (
                  <li key={a.id} className="py-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setOpenAnn(a)}
                      className="text-left w-full hover:text-primary transition-colors"
                    >
                      <div className="font-medium">{a.pinned ? "📌 " : ""}{a.title}</div>
                      {a.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</div>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <Dialog open={!!openEvent} onOpenChange={(o) => !o && setOpenEvent(null)}>
        <DialogContent>
          {openEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{openEvent.title}</DialogTitle>
                <DialogDescription>
                  {new Date(openEvent.starts_at).toLocaleString()}
                  {openEvent.ends_at ? ` – ${new Date(openEvent.ends_at).toLocaleString()}` : ""}
                  {openEvent.location ? ` · ${openEvent.location}` : ""}
                </DialogDescription>
              </DialogHeader>
              {openEvent.description && (
                <p className="text-sm whitespace-pre-wrap">{openEvent.description}</p>
              )}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  {(rsvpCounts[openEvent.id] ?? 0)}{openEvent.capacity != null ? ` / ${openEvent.capacity}` : ""} going
                </div>
                <Button
                  size="sm"
                  variant={rsvps[openEvent.id] ? "secondary" : "default"}
                  onClick={() => toggleRsvp(openEvent.id)}
                >
                  {rsvps[openEvent.id] ? <><Check className="size-3.5" /> Going</> : "RSVP"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!openVideo} onOpenChange={(o) => !o && setOpenVideo(null)}>
        <DialogContent className="max-w-3xl">
          {openVideo && (
            <>
              <DialogHeader>
                <DialogTitle>{openVideo.title}</DialogTitle>
                {openVideo.description && <DialogDescription>{openVideo.description}</DialogDescription>}
              </DialogHeader>
              <div className="aspect-video rounded-md overflow-hidden bg-black">
                {/youtube\.com|youtu\.be|vimeo\.com/.test(openVideo.video_url) ? (
                  <iframe
                    src={toEmbedUrl(openVideo.video_url)}
                    title={openVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={openVideo.video_url} controls className="w-full h-full" />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!openAnn} onOpenChange={(o) => !o && setOpenAnn(null)}>
        <DialogContent>
          {openAnn && (
            <>
              <DialogHeader>
                <DialogTitle>{openAnn.pinned ? "📌 " : ""}{openAnn.title}</DialogTitle>
                <DialogDescription>{new Date(openAnn.published_at).toLocaleString()}</DialogDescription>
              </DialogHeader>
              {openAnn.body && <p className="text-sm whitespace-pre-wrap">{openAnn.body}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.split("/").pop()}`;
  } catch { /* noop */ }
  return url;
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
