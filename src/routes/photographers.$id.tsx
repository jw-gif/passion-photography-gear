import { createFileRoute, Link, Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { format, parseISO, isWithinInterval, addDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  Camera,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Package,
  Phone,
  User as UserIcon,
  Filter,
  X,
  Wrench,
  Megaphone,
  PlayCircle,
  Play,
  Check,
  Briefcase,
  ArrowLeft,
  LogOut,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { IcsExportButton } from "@/components/ics-export-button";
import { ListSkeleton } from "@/components/list-skeleton";
import {
  type PhotographerTier,
  tierLabel,
  tierBadgeClasses,
  formatBudget,
  isPaidRole,
} from "@/lib/photographers";
import {
  type Brief,
  priorityClasses,
  priorityLabel,
  roleShort,
} from "@/lib/shot-list";
import { EventGearPanel } from "@/components/event-gear-panel";

const searchSchema = z.object({
  t: z.string().min(1).optional(),
  tab: z.enum(["open", "mine", "events", "training", "updates"]).optional(),
});

export const Route = createFileRoute("/photographers/$id")({
  head: () => ({
    meta: [
      { title: "Photographer · Passion Photography Team" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: PhotographerPage,
});

interface Me {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  tier: PhotographerTier;
  active?: boolean;
  token?: string;
}

interface OpenJobRow {
  opening_id: string;
  request_id: string;
  role: PhotographerTier;
  budget_cents: number | null;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  spans_multiple_days: boolean;
  start_time: string | null;
  end_time: string | null;
  coverage_types: string[];
  on_site_contact_name: string | null;
  on_site_contact_phone: string | null;
  notes: string | null;
  point_taken: boolean;
}

interface MyJobRow {
  assignment_id: string;
  opening_id: string;
  request_id: string;
  role: PhotographerTier;
  budget_cents: number | null;
  claimed_at: string;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  spans_multiple_days: boolean;
  start_time: string | null;
  end_time: string | null;
  coverage_types: string[];
  on_site_contact_name: string | null;
  on_site_contact_phone: string | null;
  notes: string | null;
  request_status: string;
}

interface MyGearReq { id: string; needed_date: string; status: string; location: string; }
interface EventRow { id: string; title: string; starts_at: string; ends_at: string | null; location: string | null; capacity: number | null; description: string | null; }
interface Announcement { id: string; title: string; body: string; published_at: string; pinned: boolean; }
interface Video { id: string; title: string; description: string | null; video_url: string; thumbnail_url: string | null; }

type DateFilter = "any" | "next7" | "next30";
type RoleFilter = "any" | "point" | "door_holder" | "training_door_holder";

function PhotographerPage() {
  const { id } = Route.useParams();
  const { t, tab } = useSearch({ from: "/photographers/$id" });
  const token = t ?? "";
  const { user, loading: authLoading, isTeam, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [tokenOwner, setTokenOwner] = useState(false);

  // Resolve photographer + access mode
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      // Try token mode first
      if (token) {
        const { data } = await supabase.rpc("get_photographer_by_token", { _token: token });
        const row = (data ?? [])[0] as Me | undefined;
        if (row && row.id === id) {
          setMe(row);
          setTokenOwner(true);
          setMeLoaded(true);
          return;
        }
      }
      // Login-based: must be signed in
      if (!user) {
        navigate({
          to: "/login",
          search: { redirect: `/photographers/${id}${token ? `?t=${token}` : ""}` },
          replace: true,
        });
        return;
      }
      const { data } = await supabase
        .from("photographers")
        .select("id, user_id, name, email, tier, active, token")
        .eq("id", id)
        .maybeSingle();
      setMe((data ?? null) as Me | null);
      setTokenOwner(false);
      setMeLoaded(true);
    })();
  }, [authLoading, user, token, id, navigate]);

  const userOwner = !!me && !!user && me.user_id === user.id;
  const isOwner = tokenOwner || userOwner;
  const canView = isOwner || isTeam || isAdmin;
  const effectiveToken = token || me?.token || "";

  // Data state
  const [openJobs, setOpenJobs] = useState<OpenJobRow[]>([]);
  const [myJobs, setMyJobs] = useState<MyJobRow[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<{ openingId: string; eventName: string } | null>(null);

  const [myGear, setMyGear] = useState<MyGearReq[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [openEvent, setOpenEvent] = useState<EventRow | null>(null);
  const [openVideo, setOpenVideo] = useState<Video | null>(null);
  const [openAnn, setOpenAnn] = useState<Announcement | null>(null);

  // Filters for open jobs
  const [filterLocation, setFilterLocation] = useState<string>("any");
  const [filterDate, setFilterDate] = useState<DateFilter>("any");
  const [filterRole, setFilterRole] = useState<RoleFilter>("any");

  const loadJobs = useCallback(async () => {
    if (!effectiveToken || !canView) return;
    setLoadingJobs(true);
    const [openRes, mineRes] = await Promise.all([
      supabase.rpc("list_open_jobs", { _token: effectiveToken }),
      supabase.rpc("list_my_jobs", { _token: effectiveToken }),
    ]);
    if (openRes.error) toast.error(openRes.error.message);
    if (mineRes.error) toast.error(mineRes.error.message);
    setOpenJobs((openRes.data ?? []) as OpenJobRow[]);
    setMyJobs((mineRes.data ?? []) as MyJobRow[]);
    setLoadingJobs(false);
  }, [effectiveToken, canView]);

  // Load extras (events/training/etc)
  useEffect(() => {
    if (!me || !canView) return;
    loadJobs();
    (async () => {
      const [{ data: g }, { data: ev }, { data: an }, { data: vid }] = await Promise.all([
        supabase
          .from("gear_requests")
          .select("id, needed_date, status, location")
          .eq("photographer_id", me.id)
          .order("needed_date", { ascending: false })
          .limit(10),
        supabase
          .from("events")
          .select("id, title, starts_at, ends_at, location, capacity, description")
          .eq("published", true)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(20),
        supabase
          .from("announcements")
          .select("id, title, body, published_at, pinned")
          .eq("published", true)
          .order("pinned", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(20),
        supabase
          .from("training_videos")
          .select("id, title, description, video_url, thumbnail_url")
          .eq("published", true)
          .order("sort_order", { ascending: true })
          .limit(24),
      ]);
      setMyGear((g ?? []) as MyGearReq[]);
      const evRows = (ev ?? []) as EventRow[];
      setEvents(evRows);
      setAnns((an ?? []) as Announcement[]);
      setVideos((vid ?? []) as Video[]);

      if (evRows.length && me.user_id) {
        const ids = evRows.map((e) => e.id);
        const [{ data: mineR }, { data: all }] = await Promise.all([
          supabase.from("event_rsvps").select("event_id").in("event_id", ids).eq("user_id", me.user_id),
          supabase.from("event_rsvps").select("event_id").in("event_id", ids),
        ]);
        const m: Record<string, boolean> = {};
        (mineR ?? []).forEach((r: { event_id: string }) => { m[r.event_id] = true; });
        setRsvps(m);
        const c: Record<string, number> = {};
        (all ?? []).forEach((r: { event_id: string }) => { c[r.event_id] = (c[r.event_id] ?? 0) + 1; });
        setRsvpCounts(c);
      }
    })();
  }, [me, canView, loadJobs]);

  async function claim(opening_id: string) {
    setClaiming(opening_id);
    const { data, error } = await supabase.rpc("claim_job", { _token: effectiveToken, _opening_id: opening_id });
    setClaiming(null);
    if (error) { toast.error(error.message); return; }
    const result = data as { ok: boolean; error?: string } | null;
    if (result?.ok) {
      toast.success("You got it! See you on the day.");
      await loadJobs();
    } else {
      toast.error(errorMessage(result?.error ?? "unknown"));
      await loadJobs();
    }
  }

  async function release(opening_id: string) {
    const { data, error } = await supabase.rpc("release_job", { _token: effectiveToken, _opening_id: opening_id });
    if (error) { toast.error(error.message); return; }
    const result = data as { ok: boolean; error?: string } | null;
    if (result?.ok) {
      toast.success("Released — back on the board", {
        action: { label: "Undo", onClick: () => { void claim(opening_id); } },
      });
      await loadJobs();
    } else {
      toast.error(errorMessage(result?.error ?? "unknown"));
    }
  }

  async function toggleRsvp(eventId: string) {
    if (!user || !userOwner) return;
    if (rsvps[eventId]) {
      const { error } = await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
      if (error) { toast.error(error.message); return; }
      setRsvps((s) => ({ ...s, [eventId]: false }));
      setRsvpCounts((s) => ({ ...s, [eventId]: Math.max(0, (s[eventId] ?? 1) - 1) }));
    } else {
      const { error } = await supabase.from("event_rsvps").insert({
        event_id: eventId, user_id: user.id, photographer_id: me?.id, status: "going",
      });
      if (error) { toast.error(error.message); return; }
      setRsvps((s) => ({ ...s, [eventId]: true }));
      setRsvpCounts((s) => ({ ...s, [eventId]: (s[eventId] ?? 0) + 1 }));
      toast.success("You're in!");
    }
  }

  const visibleOpenJobs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = filterDate === "next7" ? addDays(today, 7) : filterDate === "next30" ? addDays(today, 30) : null;
    return openJobs.filter((j) => {
      if (filterLocation !== "any" && (j.event_location ?? "") !== filterLocation) return false;
      if (filterRole !== "any" && j.role !== filterRole) return false;
      if (horizon && j.event_date) {
        const d = parseISO(j.event_date);
        if (!isWithinInterval(d, { start: today, end: horizon })) return false;
      }
      return true;
    });
  }, [openJobs, filterLocation, filterDate, filterRole]);

  const groupedOpen = useMemo(() => {
    const groups = new Map<string, OpenJobRow[]>();
    for (const j of visibleOpenJobs) {
      const arr = groups.get(j.request_id) ?? [];
      arr.push(j);
      groups.set(j.request_id, arr);
    }
    return Array.from(groups.entries()).map(([request_id, jobs]) => ({ request_id, jobs }));
  }, [visibleOpenJobs]);

  if (authLoading || !meLoaded) {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }
  if (!me) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md p-8 text-center space-y-3">
          <Camera className="size-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Photographer not found</h1>
          <p className="text-sm text-muted-foreground">
            This photographer profile doesn't exist or your link isn't valid anymore.
          </p>
          <Link to="/" className="text-sm text-primary hover:underline inline-block">Go home</Link>
        </Card>
      </main>
    );
  }
  if (!canView) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 text-sm text-muted-foreground">You don't have access to this page.</Card>
      </main>
    );
  }

  const firstName = me.name.split(" ")[0] || me.name;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Camera className="size-5 text-primary shrink-0" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Passion Photography · Personal Hub
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight truncate">
              {isOwner ? `Hey ${firstName} 👋` : me.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap", tierBadgeClasses(me.tier))}>
              {tierLabel(me.tier)}
            </span>
            {isTeam && !isOwner && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/team" search={{ tab: "photographers" }}>
                  <ArrowLeft className="size-4" /> Team
                </Link>
              </Button>
            )}
            {userOwner && (
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="size-4" /> Sign out
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {isTeam && !isOwner && (
          <Card className="p-3 text-xs text-muted-foreground bg-muted/30">
            Admin view — RSVPs and claim actions are read-only here.
          </Card>
        )}

        {isOwner && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/request-gear"><Wrench className="size-4" /> Request gear</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/request-photography"><Camera className="size-4" /> Request photography</Link>
            </Button>
          </div>
        )}

        <Tabs defaultValue={tab ?? "open"}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="open">
              Open shoots
              {openJobs.length > 0 && (
                <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {openJobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mine">
              My shoots
              {myJobs.length > 0 && (
                <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {myJobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="events">
              Events
              {events.length > 0 && (
                <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                  {events.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="updates">
              Updates
              {anns.length > 0 && (
                <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                  {anns.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* OPEN SHOOTS */}
          <TabsContent value="open" className="mt-4 space-y-4">
            <Card className="p-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
                <Filter className="size-3.5" /> Filter
              </div>
              <Select value={filterDate} onValueChange={(v) => setFilterDate(v as DateFilter)}>
                <SelectTrigger className="h-8 w-auto text-xs gap-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any date</SelectItem>
                  <SelectItem value="next7">Next 7 days</SelectItem>
                  <SelectItem value="next30">Next 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="h-8 w-auto text-xs gap-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All locations</SelectItem>
                  {Array.from(new Set(openJobs.map((j) => j.event_location).filter(Boolean) as string[])).map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={(v) => setFilterRole(v as RoleFilter)}>
                <SelectTrigger className="h-8 w-auto text-xs gap-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any role</SelectItem>
                  <SelectItem value="point">Point</SelectItem>
                  <SelectItem value="door_holder">Door Holder</SelectItem>
                  <SelectItem value="training_door_holder">Training</SelectItem>
                </SelectContent>
              </Select>
              {(filterDate !== "any" || filterLocation !== "any" || filterRole !== "any") && (
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs"
                  onClick={() => { setFilterDate("any"); setFilterLocation("any"); setFilterRole("any"); }}>
                  <X className="size-3" /> Clear
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                Showing {visibleOpenJobs.length} of {openJobs.length}
              </span>
            </Card>

            {loadingJobs ? <ListSkeleton rows={3} /> : groupedOpen.length === 0 ? (
              <Card className="p-10 text-center">
                <Camera className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {openJobs.length === 0
                    ? "Nothing open right now. We'll keep this list fresh — check back soon."
                    : "No shoots match your filters. Try clearing them."}
                </p>
              </Card>
            ) : (
              groupedOpen.map((group) => (
                <ShootGroup
                  key={group.request_id}
                  jobs={group.jobs}
                  myTier={me.tier}
                  claiming={claiming}
                  canClaim={isOwner}
                  onClaim={claim}
                />
              ))
            )}
          </TabsContent>

          {/* MY SHOOTS */}
          <TabsContent value="mine" className="mt-4 space-y-3">
            {loadingJobs ? <ListSkeleton rows={2} /> : myJobs.length === 0 ? (
              <Card className="p-10 text-center space-y-3">
                <CheckCircle2 className="size-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No claimed shoots yet.</p>
                <p className="text-xs text-muted-foreground">
                  Browse the <strong>Open shoots</strong> tab to pick one up.
                </p>
              </Card>
            ) : (
              myJobs.map((j) => (
                <MyJobCard
                  key={j.assignment_id}
                  job={j}
                  photographerName={me.name}
                  token={effectiveToken}
                  canRelease={isOwner}
                  onRelease={() => setReleaseTarget({ openingId: j.opening_id, eventName: j.event_name || "this shoot" })}
                />
              ))
            )}

            {myGear.length > 0 && (
              <Card className="p-4 mt-6">
                <h2 className="font-semibold tracking-tight inline-flex items-center gap-2 mb-3">
                  <Wrench className="size-4" /> Recent gear requests
                </h2>
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
              </Card>
            )}
          </TabsContent>

          {/* EVENTS */}
          <TabsContent value="events" className="mt-4 space-y-3">
            {events.length === 0 ? (
              <Card className="p-10 text-center">
                <CalendarIcon className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
              </Card>
            ) : events.map((e) => {
              const going = !!rsvps[e.id];
              const count = rsvpCounts[e.id] ?? 0;
              const full = e.capacity != null && count >= e.capacity && !going;
              return (
                <Card key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button type="button" className="text-left min-w-0 flex-1 hover:text-primary transition-colors"
                    onClick={() => setOpenEvent(e)}>
                    <div className="font-semibold truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1"><CalendarIcon className="size-3.5" /> {new Date(e.starts_at).toLocaleString()}</span>
                      {e.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {e.location}</span>}
                      {e.capacity != null && <span>{count}/{e.capacity} going</span>}
                    </div>
                  </button>
                  {userOwner && (
                    <Button size="sm" variant={going ? "secondary" : "outline"} disabled={full} onClick={() => toggleRsvp(e.id)}>
                      {going ? <><Check className="size-3.5" /> Going</> : full ? "Full" : "RSVP"}
                    </Button>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {/* TRAINING */}
          <TabsContent value="training" className="mt-4">
            {videos.length === 0 ? (
              <Card className="p-10 text-center">
                <PlayCircle className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No training videos posted yet.</p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((v) => (
                  <button key={v.id} type="button" onClick={() => setOpenVideo(v)}
                    className="group text-left rounded-lg overflow-hidden border bg-card hover:border-primary/50 transition-colors">
                    <div className="aspect-video bg-muted relative">
                      {v.thumbnail_url
                        ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{v.title}</div>}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Play className="size-10 text-white" />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-sm leading-tight">{v.title}</div>
                      {v.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{v.description}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* UPDATES */}
          <TabsContent value="updates" className="mt-4 space-y-3">
            {anns.length === 0 ? (
              <Card className="p-10 text-center">
                <Megaphone className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No announcements yet.</p>
              </Card>
            ) : anns.map((a) => (
              <Card key={a.id} className="p-4">
                <button type="button" onClick={() => setOpenAnn(a)}
                  className="text-left w-full hover:text-primary transition-colors">
                  <div className="font-semibold">{a.pinned ? "📌 " : ""}{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{new Date(a.published_at).toLocaleString()}</div>
                  {a.body && <p className="text-sm text-muted-foreground line-clamp-3 mt-2 whitespace-pre-wrap">{a.body}</p>}
                </button>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={releaseTarget !== null}
        onOpenChange={(open) => { if (!open) setReleaseTarget(null); }}
        title={`Release ${releaseTarget?.eventName ?? "this shoot"}?`}
        description="It will go back on the board for someone else to pick up. You'll have a quick Undo option."
        confirmLabel="Release"
        cancelLabel="Keep it"
        destructive
        onConfirm={async () => {
          const target = releaseTarget;
          setReleaseTarget(null);
          if (target) await release(target.openingId);
        }}
      />

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
              {openEvent.description && <p className="text-sm whitespace-pre-wrap">{openEvent.description}</p>}
              {userOwner && (
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    {(rsvpCounts[openEvent.id] ?? 0)}{openEvent.capacity != null ? ` / ${openEvent.capacity}` : ""} going
                  </div>
                  <Button size="sm" variant={rsvps[openEvent.id] ? "secondary" : "default"} onClick={() => toggleRsvp(openEvent.id)}>
                    {rsvps[openEvent.id] ? <><Check className="size-3.5" /> Going</> : "RSVP"}
                  </Button>
                </div>
              )}
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
                  <iframe src={toEmbedUrl(openVideo.video_url)} title={openVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen />
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

/* ───────── Sub-components (ported from /jobs) ───────── */

function ShootGroup({
  jobs, myTier, claiming, canClaim, onClaim,
}: {
  jobs: OpenJobRow[];
  myTier: PhotographerTier;
  claiming: string | null;
  canClaim: boolean;
  onClaim: (id: string) => void;
}) {
  const first = jobs[0];
  const visibleJobs = useMemo(() => {
    if (myTier !== "point") return jobs;
    const pointOpening = jobs.find((j) => j.role === "point");
    if (pointOpening) return [pointOpening];
    return jobs;
  }, [jobs, myTier]);

  const showPointTakenBanner = myTier === "point" && first.point_taken && !jobs.some((j) => j.role === "point");

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-base sm:text-lg leading-tight">{first.event_name || "Untitled shoot"}</h2>
        <ShootMeta job={first} />
      </div>
      <ShootDetails job={first} />
      {showPointTakenBanner && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
          <Info className="size-4 shrink-0 mt-0.5" />
          <span>Heads up — the Point spot for this shoot is already taken. The openings below are <strong>Door Holder coverage</strong> only.</span>
        </div>
      )}
      <div className="space-y-2">
        {visibleJobs.map((j) => (
          <OpeningCard key={j.opening_id} job={j} claiming={claiming === j.opening_id} canClaim={canClaim}
            onClaim={() => onClaim(j.opening_id)} />
        ))}
      </div>
    </Card>
  );
}

function OpeningCard({ job, claiming, canClaim, onClaim }: {
  job: OpenJobRow; claiming: boolean; canClaim: boolean; onClaim: () => void;
}) {
  const paid = isPaidRole(job.role);
  const claimLabel = job.role === "point" ? "Claim Point spot"
    : job.role === "door_holder" ? "Sign up as Door Holder" : "Sign up as Training";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-md bg-muted/30">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", tierBadgeClasses(job.role))}>
          {tierLabel(job.role)}
        </span>
        {paid && job.budget_cents != null && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
            {formatBudget(job.budget_cents)}
          </span>
        )}
      </div>
      {canClaim && (
        <Button onClick={onClaim} disabled={claiming} size="sm">
          {claiming ? "Claiming…" : claimLabel}
        </Button>
      )}
    </div>
  );
}

function MyJobCard({ job, photographerName, token, canRelease, onRelease }: {
  job: MyJobRow; photographerName: string; token: string; canRelease: boolean; onRelease: () => void;
}) {
  const paid = isPaidRole(job.role);
  const claimedAt = parseISO(job.claimed_at);
  const within48h = Date.now() - claimedAt.getTime() < 48 * 60 * 60 * 1000;
  const within7Days = useMemo(() => {
    if (!job.event_date) return false;
    const d = parseISO(job.event_date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }, [job.event_date]);

  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [gearOpen, setGearOpen] = useState(within7Days);

  async function loadBrief() {
    if (brief || briefLoading) return;
    setBriefLoading(true);
    const { data, error } = await supabase.rpc("get_shot_list", { _token: token, _opening_id: job.opening_id });
    setBriefLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data) {
      const { normalizeBrief } = await import("@/lib/shot-list");
      setBrief(normalizeBrief(data));
    }
  }

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{job.event_name || "Untitled shoot"}</h3>
          <ShootMeta job={job} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", tierBadgeClasses(job.role))}>
            {tierLabel(job.role)}
          </span>
          {paid && job.budget_cents != null && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
              {formatBudget(job.budget_cents)}
            </span>
          )}
          <IcsExportButton
            uid={`assignment-${job.assignment_id}@passion-photography`}
            title={job.event_name || "Photography shoot"}
            description={job.notes ?? null}
            location={job.event_location ?? null}
            startDate={job.event_date ?? ""}
            startTime={job.start_time}
            endDate={job.event_end_date ?? job.event_date ?? null}
            endTime={job.end_time}
            disabled={!job.event_date}
          />
        </div>
      </div>

      {(job.on_site_contact_name || job.on_site_contact_phone) && (
        <div className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          {job.on_site_contact_name && (
            <span className="inline-flex items-center gap-1"><UserIcon className="size-3.5" />{job.on_site_contact_name}</span>
          )}
          {job.on_site_contact_phone && (
            <a href={`tel:${job.on_site_contact_phone}`} className="inline-flex items-center gap-1 hover:underline text-foreground">
              <Phone className="size-3.5" />{job.on_site_contact_phone}
            </a>
          )}
        </div>
      )}

      {job.notes && (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground border-l-2 border-border pl-3">{job.notes}</p>
      )}

      <div className="border-t pt-2">
        <button type="button" onClick={() => { const next = !briefOpen; setBriefOpen(next); if (next) loadBrief(); }}
          className="text-sm font-medium hover:underline">
          {briefOpen ? "▾ Hide brief" : "▸ View brief / shot list"}
        </button>
        {briefOpen && (
          <div className="mt-2">
            {briefLoading ? <p className="text-xs text-muted-foreground">Loading…</p>
              : !brief ? <p className="text-xs text-muted-foreground italic">No brief has been published for this shoot yet.</p>
              : <BriefReadOnly brief={brief} />}
          </div>
        )}
      </div>

      {canRelease && (
        <div className="border-t pt-2">
          <button type="button" onClick={() => setGearOpen((v) => !v)}
            className="text-sm font-medium hover:underline inline-flex items-center gap-1">
            <Package className="size-4" />
            {gearOpen ? "▾ Hide gear request" : "▸ Request gear for this shoot"}
          </button>
          {gearOpen && (
            <div className="mt-3">
              <EventGearPanel
                photoRequestId={job.request_id}
                defaultRequestor={photographerName}
                defaultLocation={job.event_location}
                defaultDate={job.event_date}
                defaultNotes={job.event_name ? `For: ${job.event_name}` : null}
                canDelete={false}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-muted-foreground">Claimed {format(claimedAt, "MMM d, h:mm a")}</span>
        {canRelease && (within48h ? (
          <Button size="sm" variant="ghost" onClick={onRelease}>Release</Button>
        ) : (
          <span className="text-xs text-muted-foreground">Past 48-hour window — contact admin to release</span>
        ))}
      </div>
    </Card>
  );
}

function ShootMeta({ job }: { job: OpenJobRow | MyJobRow }) {
  return (
    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
      {job.event_date && (
        <span className="inline-flex items-center gap-1">
          <CalendarIcon className="size-3.5" />
          {format(parseISO(job.event_date), "EEE, MMM d, yyyy")}
          {job.spans_multiple_days && job.event_end_date && ` → ${format(parseISO(job.event_end_date), "MMM d")}`}
        </span>
      )}
      {(job.start_time || job.end_time) && (
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {formatTime12(job.start_time)} – {formatTime12(job.end_time)}
        </span>
      )}
      {job.event_location && (
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{job.event_location}</span>
      )}
    </div>
  );
}

function ShootDetails({ job }: { job: OpenJobRow }) {
  const hasContact = job.on_site_contact_name || job.on_site_contact_phone;
  const hasCoverage = job.coverage_types && job.coverage_types.length > 0;
  if (!hasContact && !hasCoverage && !job.notes) return null;
  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-sm">
      {hasCoverage && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Coverage:</span>
          {job.coverage_types.map((c) => (
            <span key={c} className="inline-flex text-[11px] px-1.5 py-0.5 rounded border bg-background text-foreground">
              {coverageLabel(c)}
            </span>
          ))}
        </div>
      )}
      {hasContact && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
          <span className="text-xs uppercase tracking-wide font-semibold">On-site:</span>
          {job.on_site_contact_name && (
            <span className="inline-flex items-center gap-1"><UserIcon className="size-3.5" />{job.on_site_contact_name}</span>
          )}
          {job.on_site_contact_phone && (
            <a href={`tel:${job.on_site_contact_phone}`} className="inline-flex items-center gap-1 hover:underline text-foreground">
              <Phone className="size-3.5" />{job.on_site_contact_phone}
            </a>
          )}
        </div>
      )}
      {job.notes && (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground border-l-2 border-border pl-3">{job.notes}</p>
      )}
    </div>
  );
}

function formatTime12(t: string | null | undefined): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mPad = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${h12}${mPad} ${period}`;
}

function coverageLabel(c: string): string {
  switch (c) {
    case "live_event": return "Live event";
    case "photo_booth": return "Photo booth";
    case "other": return "Other";
    default: return c;
  }
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{children}</p>
    </main>
  );
}

function BriefReadOnly({ brief }: { brief: Brief }) {
  const meta: { label: string; value: string }[] = [];
  if (brief.call_time) meta.push({ label: "Call", value: brief.call_time });
  if (brief.wrap_time) meta.push({ label: "Wrap", value: brief.wrap_time });
  if (brief.door_code) meta.push({ label: "Door code", value: brief.door_code });
  return (
    <div className="space-y-3 text-sm">
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {meta.map((m) => (
            <span key={m.label} className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">{m.label}:</span>
              <span className="font-medium">{m.value}</span>
            </span>
          ))}
        </div>
      )}
      {brief.arrival_notes && <BriefSection title="Arrival">{brief.arrival_notes}</BriefSection>}
      {brief.details_notes && <BriefSection title="Details">{brief.details_notes}</BriefSection>}
      {brief.gear_notes && <BriefSection title="Gear">{brief.gear_notes}</BriefSection>}
      {brief.segments.map((seg) => (
        <div key={seg.id} className="border rounded-md p-3 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h4 className="font-semibold">{seg.title}</h4>
            {seg.location && <span className="text-xs text-muted-foreground">({seg.location})</span>}
            {seg.time && <span className="text-xs text-muted-foreground">— {seg.time}</span>}
          </div>
          {seg.assigned_roles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {seg.assigned_roles.map((r) => (
                <span key={r} className="inline-flex text-[10px] px-1.5 py-0.5 rounded border bg-muted/40">{roleShort(r)}</span>
              ))}
            </div>
          )}
          {seg.focus && <p className="text-xs italic text-muted-foreground">{seg.focus}</p>}
          {seg.shots.length > 0 && (
            <ul className="space-y-1">
              {seg.shots.map((shot) => (
                <li key={shot.id} className="flex items-start gap-2">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded border shrink-0 mt-0.5", priorityClasses(shot.priority))}>
                    {priorityLabel(shot.priority)}
                  </span>
                  <span className="text-sm">{shot.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {brief.editing_notes && <BriefSection title="Editing + Uploading">{brief.editing_notes}</BriefSection>}
    </div>
  );
}

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
    </div>
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

function errorMessage(code: string): string {
  switch (code) {
    case "invalid_token": return "Your link is no longer valid. Contact your photo lead.";
    case "opening_not_found": return "This shoot is no longer available.";
    case "request_not_open": return "This shoot is no longer accepting photographers.";
    case "tier_too_low": return "You don't have access to this opening.";
    case "already_claimed": return "Someone else just claimed this spot.";
    case "already_on_shoot": return "You're already signed up for this shoot. Release your current spot first to switch roles.";
    case "no_active_claim": return "You're not assigned to this shoot.";
    case "release_window_expired": return "The 48-hour release window has passed. Contact your photo lead.";
    default: return "Something went wrong — please try again.";
  }
}

// Suppress unused import warning for Navigate (kept for potential redirect usage)
void Navigate;
