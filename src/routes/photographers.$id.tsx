import { createFileRoute, Link, Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { format, parseISO, isWithinInterval, addDays, startOfWeek, endOfWeek } from "date-fns";
import {
  Bell,
  Calendar as CalendarIcon,
  Camera,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Megaphone,
  Package,
  Phone,
  Play,
  PlayCircle,
  User as UserIcon,
  Wrench,
  Filter,
  X,
  ArrowUpRight,
  ArrowLeft,
  LogOut,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
import { shortRelative } from "@/lib/relative-date";
import { EventGearPanel } from "@/components/event-gear-panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { DateBlock } from "@/components/ui/date-block";
import { LocationPill } from "@/components/ui/location-pill";
import { StatusPill } from "@/components/ui/status-pill";

const searchSchema = z.object({
  t: z.string().min(1).optional(),
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

interface MyGearReq { id: string; needed_date: string; status: string; location: string; photo_request_id: string | null; }
interface EventRow { id: string; title: string; starts_at: string; ends_at: string | null; location: string | null; capacity: number | null; description: string | null; }
interface Announcement { id: string; title: string; body: string; published_at: string; pinned: boolean; }
interface Video { id: string; title: string; description: string | null; video_url: string; thumbnail_url: string | null; }

type DateFilter = "any" | "next7" | "next30";
type RoleFilter = "any" | "point" | "door_holder" | "training_door_holder";

function PhotographerPage() {
  const { id } = Route.useParams();
  const { t } = useSearch({ from: "/photographers/$id" });
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
  const [openShoot, setOpenShoot] = useState<MyJobRow | null>(null);
  const [openDetails, setOpenDetails] = useState<OpenJobRow | null>(null);

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

  useEffect(() => {
    if (!me || !canView) return;
    loadJobs();
    (async () => {
      const [{ data: g }, { data: ev }, { data: an }, { data: vid }] = await Promise.all([
        supabase
          .from("gear_requests")
          .select("id, needed_date, status, location, photo_request_id")
          .eq("photographer_id", me.id)
          .order("needed_date", { ascending: false })
          .limit(50),
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
      setOpenDetails(null);
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
      setOpenShoot(null);
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

  // Group openings by request for the open opportunities grid (one card per shoot)
  const groupedOpen = useMemo(() => {
    const groups = new Map<string, OpenJobRow[]>();
    for (const j of visibleOpenJobs) {
      const arr = groups.get(j.request_id) ?? [];
      arr.push(j);
      groups.set(j.request_id, arr);
    }
    return Array.from(groups.entries()).map(([request_id, jobs]) => ({ request_id, jobs }));
  }, [visibleOpenJobs]);

  // Weekly summary
  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now);
    const end = endOfWeek(now);
    return myJobs.filter((j) => j.event_date && isWithinInterval(parseISO(j.event_date), { start, end })).length;
  }, [myJobs]);

  const upcomingMine = useMemo(() => {
    return [...myJobs]
      .filter((j) => j.event_date)
      .sort((a, b) => (a.event_date! > b.event_date! ? 1 : -1))
      .slice(0, 8);
  }, [myJobs]);

  const next7Count = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = addDays(today, 7);
    return myJobs.filter((j) => j.event_date && isWithinInterval(parseISO(j.event_date), { start: today, end: horizon })).length;
  }, [myJobs]);

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
  const initials = me.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <main className="min-h-screen bg-background">
      {/* Admin view banner */}
      {isTeam && !isOwner && (
        <div className="bg-muted/40 border-b">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Admin view — actions like Claim, RSVP, and gear requests are read-only here.
            </span>
            <Button asChild variant="ghost" size="sm" className="h-7">
              <Link to="/admin/team" search={{ tab: "photographers" }}>
                <ArrowLeft className="size-3.5" /> Back to team
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Compact header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
              <Camera className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate leading-tight">Passion Photography</div>
              <div className="text-xs text-muted-foreground leading-tight">Photographer dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("hidden sm:inline-flex text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap", tierBadgeClasses(me.tier))}>
              {tierLabel(me.tier)}
            </span>
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-9 rounded-full bg-primary/15 text-primary font-semibold text-sm flex items-center justify-center hover:bg-primary/25 transition-colors"
                  aria-label="Account menu"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="font-medium truncate">{me.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{me.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isOwner && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/request-gear"><Wrench className="size-4" /> Request gear</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/request-photography"><Camera className="size-4" /> Request photography</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {userOwner && (
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                )}
                {!userOwner && tokenOwner && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    Signed in via personal link
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Greeting */}
        <section>
          <h1 className="text-3xl font-bold tracking-tight">
            {isOwner ? `Welcome back, ${firstName}` : me.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isOwner ? (
              <>
                You have <strong className="text-foreground">{thisWeekCount}</strong> {thisWeekCount === 1 ? "shoot" : "shoots"} this week
                {openJobs.length > 0 ? <> and <strong className="text-foreground">{openJobs.length}</strong> open {openJobs.length === 1 ? "opportunity" : "opportunities"} to claim.</> : "."}
              </>
            ) : (
              <>Viewing this photographer's hub.</>
            )}
          </p>
        </section>

        {/* Open opportunities */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Open opportunities</h2>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                    <Filter className="size-3.5" /> Filter
                    {(filterDate !== "any" || filterLocation !== "any" || filterRole !== "any") && (
                      <span className="size-1.5 rounded-full bg-primary" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Date</label>
                    <Select value={filterDate} onValueChange={(v) => setFilterDate(v as DateFilter)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any date</SelectItem>
                        <SelectItem value="next7">Next 7 days</SelectItem>
                        <SelectItem value="next30">Next 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Location</label>
                    <Select value={filterLocation} onValueChange={setFilterLocation}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">All locations</SelectItem>
                        {Array.from(new Set(openJobs.map((j) => j.event_location).filter(Boolean) as string[])).map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Role</label>
                    <Select value={filterRole} onValueChange={(v) => setFilterRole(v as RoleFilter)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any role</SelectItem>
                        <SelectItem value="point">Point</SelectItem>
                        <SelectItem value="door_holder">Door Holder</SelectItem>
                        <SelectItem value="training_door_holder">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(filterDate !== "any" || filterLocation !== "any" || filterRole !== "any") && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-full text-xs"
                      onClick={() => { setFilterDate("any"); setFilterLocation("any"); setFilterRole("any"); }}>
                      <X className="size-3" /> Clear filters
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
              <span className="text-sm text-muted-foreground tabular-nums">
                {visibleOpenJobs.length} available
              </span>
            </div>
          </div>

          {loadingJobs ? <ListSkeleton rows={2} /> : groupedOpen.length === 0 ? (
            <Card className="p-10 text-center">
              <Camera className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {openJobs.length === 0
                  ? "Nothing open right now. We'll keep this list fresh — check back soon."
                  : "No shoots match your filters. Try clearing them."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groupedOpen.map((group) => (
                <OpportunityCard
                  key={group.request_id}
                  jobs={group.jobs}
                  myTier={me.tier}
                  claiming={claiming}
                  canClaim={isOwner}
                  onClaim={claim}
                  onDetails={(j) => setOpenDetails(j)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Your upcoming opportunities */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Your upcoming opportunities</h2>
            <span className="text-sm text-muted-foreground">
              {next7Count} in next 7 days
            </span>
          </div>
          <Card className="overflow-hidden">
            {upcomingMine.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No claimed shoots yet — pick one up above.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {upcomingMine.map((j) => (
                  <UpcomingRow
                    key={j.assignment_id}
                    job={j}
                    gearStatus={gearStatusForJob(j, myGear)}
                    canRequestGear={isOwner}
                    onOpen={() => setOpenShoot(j)}
                  />
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Team & resources */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Team &amp; resources</h2>

          {/* Team events */}
          <Card className="p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold">Team events</h3>
              <span className="text-xs text-muted-foreground">{events.length} upcoming</span>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No team events scheduled.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {events.slice(0, 4).map((e) => (
                  <TeamEventRow
                    key={e.id}
                    event={e}
                    going={!!rsvps[e.id]}
                    count={rsvpCounts[e.id] ?? 0}
                    canRsvp={!!userOwner}
                    onToggle={() => toggleRsvp(e.id)}
                    onOpen={() => setOpenEvent(e)}
                  />
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Workshop library */}
            <Card className="p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="font-semibold">Workshop library</h3>
                <span className="text-xs text-muted-foreground">{videos.length} {videos.length === 1 ? "video" : "videos"}</span>
              </div>
              {videos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No videos posted yet.</p>
              ) : (
                <ul className="space-y-3">
                  {videos.slice(0, 4).map((v, i) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => setOpenVideo(v)}
                        className="flex items-center gap-3 w-full text-left rounded-md hover:bg-muted/40 p-1 -m-1 transition-colors"
                      >
                        <div className={cn("size-12 rounded-md flex items-center justify-center shrink-0 text-white", videoTileColor(i))}>
                          <Play className="size-5 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{v.title}</div>
                          {v.description && (
                            <div className="text-xs text-muted-foreground truncate">{v.description}</div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Announcements */}
            <Card className="p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="font-semibold">Announcements</h3>
                <span className="text-xs text-muted-foreground">
                  {anns.filter((a) => a.pinned).length} pinned
                </span>
              </div>
              {anns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No announcements yet.</p>
              ) : (
                <ul className="space-y-3">
                  {anns.slice(0, 4).map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setOpenAnn(a)}
                        className="flex items-start gap-3 w-full text-left rounded-md hover:bg-muted/40 p-1 -m-1 transition-colors"
                      >
                        <span className={cn(
                          "mt-1.5 size-2 rounded-full shrink-0",
                          a.pinned ? "bg-primary" : "bg-muted-foreground/40",
                        )} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{a.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {a.body ? `${a.body.split("\n")[0].slice(0, 60)}${a.body.length > 60 ? "…" : ""} · ` : ""}
                            {shortRelative(a.published_at)}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>
      </div>

      {/* Dialogs */}
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

      {/* Shoot details (claimed) */}
      <Dialog open={!!openShoot} onOpenChange={(o) => !o && setOpenShoot(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {openShoot && (
            <>
              <DialogHeader>
                <DialogTitle>{openShoot.event_name || "Untitled shoot"}</DialogTitle>
                <DialogDescription className="sr-only">Shoot details</DialogDescription>
              </DialogHeader>
              <MyJobBody
                job={openShoot}
                photographerName={me.name}
                token={effectiveToken}
                canRelease={isOwner}
                onRelease={() => setReleaseTarget({ openingId: openShoot.opening_id, eventName: openShoot.event_name || "this shoot" })}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Open opportunity details */}
      <Dialog open={!!openDetails} onOpenChange={(o) => !o && setOpenDetails(null)}>
        <DialogContent className="max-w-lg">
          {openDetails && (
            <>
              <DialogHeader>
                <DialogTitle>{openDetails.event_name || "Untitled shoot"}</DialogTitle>
                <DialogDescription>
                  <ShootMeta job={openDetails} />
                </DialogDescription>
              </DialogHeader>
              <ShootDetails job={openDetails} />
              {isOwner && (
                <div className="flex justify-end pt-2">
                  <Button onClick={() => claim(openDetails.opening_id)} disabled={claiming === openDetails.opening_id}>
                    {claiming === openDetails.opening_id ? "Claiming…" : "Claim opportunity"}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

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
                    {rsvps[openEvent.id] ? "Going" : "RSVP yes"}
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

/* ───────── Sub-components ───────── */

function OpportunityCard({
  jobs, myTier, claiming, canClaim, onClaim, onDetails,
}: {
  jobs: OpenJobRow[];
  myTier: PhotographerTier;
  claiming: string | null;
  canClaim: boolean;
  onClaim: (id: string) => void;
  onDetails: (job: OpenJobRow) => void;
}) {
  const first = jobs[0];
  // Prefer the opening that matches my tier, else first
  const target = useMemo(() => {
    if (myTier === "point") {
      const p = jobs.find((j) => j.role === "point");
      if (p) return p;
    }
    return jobs.find((j) => j.role === myTier) ?? first;
  }, [jobs, myTier, first]);

  const paid = isPaidRole(target.role);
  const photographerCount = jobs.length;
  const showPointTaken = myTier === "point" && first.point_taken && !jobs.some((j) => j.role === "point");
  const isClaiming = claiming === target.opening_id;

  const hours = computeHours(first.start_time, first.end_time);

  return (
    <Card className="p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-tight truncate">{first.event_name || "Untitled shoot"}</h3>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0", tierBadgeClasses(target.role))}>
          {tierLabel(target.role)}
        </span>
      </div>
      <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
        {first.event_location && <span>{first.event_location}</span>}
        {first.event_location && first.event_date && <span>·</span>}
        {first.event_date && <span>{format(parseISO(first.event_date), "EEE, MMM d")}</span>}
      </div>
      <div className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
        {hours && <span>{hours}</span>}
        {paid && first.budget_cents != null && (
          <>
            {hours && <span className="text-muted-foreground">·</span>}
            <span className="font-medium">{formatBudget(first.budget_cents)}</span>
          </>
        )}
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{photographerCount} {photographerCount === 1 ? "photographer" : "photographers"}</span>
      </div>
      {showPointTaken && (
        <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <span>Point spot is taken — Door Holder coverage only.</span>
        </div>
      )}
      <div className="flex gap-2 mt-auto pt-1">
        {canClaim && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onClaim(target.opening_id)}
            disabled={isClaiming}
          >
            {isClaiming ? "Claiming…" : "Claim opportunity"}
          </Button>
        )}
        <Button
          variant={canClaim ? "ghost" : "outline"}
          className={canClaim ? "" : "flex-1"}
          onClick={() => onDetails(target)}
        >
          Details
        </Button>
      </div>
    </Card>
  );
}

function UpcomingRow({
  job, gearStatus, canRequestGear, onOpen,
}: {
  job: MyJobRow;
  gearStatus: "confirmed" | "pending" | "none";
  canRequestGear: boolean;
  onOpen: () => void;
}) {
  const date = job.event_date ? parseISO(job.event_date) : null;

  return (
    <li className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
      <button type="button" onClick={onOpen} className="flex items-center gap-4 flex-1 min-w-0 text-left">
        {date && (
          <div className="size-12 rounded-md bg-primary/10 text-primary flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold uppercase leading-none">{format(date, "MMM")}</span>
            <span className="text-base font-bold leading-tight">{format(date, "d")}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{job.event_name || "Untitled shoot"}</div>
          <div className="text-xs text-muted-foreground truncate">
            {[
              job.start_time ? formatTime12(job.start_time) : null,
              job.event_location,
              computeHours(job.start_time, job.end_time),
            ].filter(Boolean).join(" · ")}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-3 shrink-0">
        <span className={cn(
          "hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap",
          gearStatus === "confirmed"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            : gearStatus === "pending"
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
              : "bg-muted text-muted-foreground border-border",
        )}>
          {gearStatus === "confirmed" ? "Confirmed" : gearStatus === "pending" ? "Gear pending" : "No gear yet"}
        </span>
        {canRequestGear && (
          <button
            type="button"
            onClick={onOpen}
            className="text-sm text-primary hover:underline inline-flex items-center gap-0.5 whitespace-nowrap"
          >
            Request gear <ArrowUpRight className="size-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}

function TeamEventRow({
  event, going, count, canRsvp, onToggle, onOpen,
}: {
  event: EventRow;
  going: boolean;
  count: number;
  canRsvp: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const start = parseISO(event.starts_at);
  const dayName = format(start, "EEEE");
  const time = format(start, "h:mm a");

  return (
    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/20">
      <div className="size-12 rounded-md bg-card border flex flex-col items-center justify-center shrink-0">
        <span className="text-[10px] font-semibold uppercase leading-none text-muted-foreground">{format(start, "MMM")}</span>
        <span className="text-base font-bold leading-tight">{format(start, "d")}</span>
      </div>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="font-medium text-sm truncate text-left hover:text-primary block w-full">
          {event.title}
        </button>
        <div className="text-xs text-muted-foreground truncate">
          {dayName} · {time}
          {count > 0 && <> · {count} going</>}
        </div>
        {canRsvp && (
          <div className="flex gap-1 mt-1.5">
            <Button
              size="sm"
              variant={going ? "secondary" : "outline"}
              className="h-6 text-xs px-2"
              onClick={onToggle}
            >
              {going ? "Going" : "RSVP yes"}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-muted-foreground" onClick={onOpen}>
              Maybe
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Detail body for the upcoming-shoot dialog (ported MyJobCard internals) ───────── */

function MyJobBody({ job, photographerName, token, canRelease, onRelease }: {
  job: MyJobRow; photographerName: string; token: string; canRelease: boolean; onRelease: () => void;
}) {
  const paid = isPaidRole(job.role);
  const claimedAt = parseISO(job.claimed_at);
  const within48h = Date.now() - claimedAt.getTime() < 48 * 60 * 60 * 1000;

  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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

      <ShootMeta job={job} />

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

      <div className="border-t pt-3">
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
        <div className="border-t pt-3">
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

      <div className="flex items-center justify-between gap-3 pt-1 border-t">
        <span className="text-xs text-muted-foreground pt-3">Claimed {format(claimedAt, "MMM d, h:mm a")}</span>
        {canRelease && (within48h ? (
          <Button size="sm" variant="ghost" className="mt-2" onClick={onRelease}>Release</Button>
        ) : (
          <span className="text-xs text-muted-foreground pt-3">Past 48h — contact admin to release</span>
        ))}
      </div>
    </div>
  );
}

function ShootMeta({ job }: { job: OpenJobRow | MyJobRow }) {
  return (
    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
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

function gearStatusForJob(job: MyJobRow, gear: MyGearReq[]): "confirmed" | "pending" | "none" {
  const matches = gear.filter((g) => g.photo_request_id === job.request_id);
  if (matches.length === 0) return "none";
  if (matches.some((g) => ["approved", "fulfilled", "ready", "checked_out"].includes(g.status))) return "confirmed";
  return "pending";
}

function computeHours(start: string | null | undefined, end: string | null | undefined): string | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return null;
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return null;
  const hours = mins / 60;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${rounded === 1 ? "hour" : "hours"}`;
}

function videoTileColor(i: number): string {
  const colors = [
    "bg-emerald-500",
    "bg-violet-500",
    "bg-orange-500",
    "bg-sky-500",
    "bg-rose-500",
  ];
  return colors[i % colors.length];
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

void Navigate;
void PlayCircle;
void Megaphone;
