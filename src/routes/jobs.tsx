import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  Camera,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Phone,
  User as UserIcon,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  type PhotographerTier,
  tierLabel,
  tierBadgeClasses,
  formatBudget,
  isPaidRole,
} from "@/lib/photographers";

const searchSchema = z.object({
  t: z.string().min(1).optional(),
});

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Photographer Job Board · Passion Photography Hub" },
      {
        name: "description",
        content: "Pick up upcoming photography shoots from your personal job board.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: JobBoardPage,
});

interface Me {
  id: string;
  name: string;
  email: string;
  tier: PhotographerTier;
  active: boolean;
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

function JobBoardPage() {
  const { t } = useSearch({ from: "/jobs" });
  const token = t ?? "";

  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [openJobs, setOpenJobs] = useState<OpenJobRow[]>([]);
  const [myJobs, setMyJobs] = useState<MyJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    if (!token) {
      setMeLoaded(true);
      return;
    }
    const { data, error } = await supabase.rpc("get_photographer_by_token", {
      _token: token,
    });
    if (error) {
      console.error(error);
    }
    const row = (data ?? [])[0] as Me | undefined;
    setMe(row ?? null);
    setMeLoaded(true);
  }, [token]);

  const loadJobs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const [openRes, mineRes] = await Promise.all([
      supabase.rpc("list_open_jobs", { _token: token }),
      supabase.rpc("list_my_jobs", { _token: token }),
    ]);
    if (openRes.error) toast.error(openRes.error.message);
    if (mineRes.error) toast.error(mineRes.error.message);
    setOpenJobs((openRes.data ?? []) as OpenJobRow[]);
    setMyJobs((mineRes.data ?? []) as MyJobRow[]);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (me) loadJobs();
  }, [me, loadJobs]);

  async function claim(opening_id: string) {
    setClaiming(opening_id);
    const { data, error } = await supabase.rpc("claim_job", {
      _token: token,
      _opening_id: opening_id,
    });
    setClaiming(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { ok: boolean; error?: string } | null;
    if (result?.ok) {
      toast.success("You got it! See you on the day.");
      await loadJobs();
    } else {
      const msg = errorMessage(result?.error ?? "unknown");
      toast.error(msg);
      await loadJobs();
    }
  }

  async function release(opening_id: string) {
    if (
      !confirm(
        "Release this shoot? It will go back on the board for someone else to pick up."
      )
    )
      return;
    const { data, error } = await supabase.rpc("release_job", {
      _token: token,
      _opening_id: opening_id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { ok: boolean; error?: string } | null;
    if (result?.ok) {
      toast.success("Released");
      await loadJobs();
    } else {
      toast.error(errorMessage(result?.error ?? "unknown"));
    }
  }

  // Group open jobs by request so we can render the "Point taken" banner once.
  const groupedOpen = useMemo(() => {
    const groups = new Map<string, OpenJobRow[]>();
    for (const j of openJobs) {
      const arr = groups.get(j.request_id) ?? [];
      arr.push(j);
      groups.set(j.request_id, arr);
    }
    return Array.from(groups.entries()).map(([request_id, jobs]) => ({
      request_id,
      jobs,
    }));
  }, [openJobs]);

  if (!token) return <InvalidTokenScreen reason="missing" />;
  if (!meLoaded) return <CenteredMessage>Loading…</CenteredMessage>;
  if (!me) return <InvalidTokenScreen reason="invalid" />;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Camera className="size-5 text-primary shrink-0" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Passion Photography Job Board
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight truncate">
              Hey {me.name.split(" ")[0]} 👋
            </h1>
          </div>
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap",
              tierBadgeClasses(me.tier)
            )}
          >
            {tierLabel(me.tier)}
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="open">
          <TabsList>
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
          </TabsList>

          <TabsContent value="open" className="mt-4 space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : groupedOpen.length === 0 ? (
              <Card className="p-10 text-center">
                <Camera className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nothing open right now. We'll keep this list fresh — check back soon.
                </p>
              </Card>
            ) : (
              groupedOpen.map((group) => (
                <ShootGroup
                  key={group.request_id}
                  jobs={group.jobs}
                  myTier={me.tier}
                  claiming={claiming}
                  onClaim={claim}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : myJobs.length === 0 ? (
              <Card className="p-10 text-center">
                <CheckCircle2 className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  You haven't claimed any shoots yet.
                </p>
              </Card>
            ) : (
              myJobs.map((j) => (
                <MyJobCard key={j.assignment_id} job={j} onRelease={() => release(j.opening_id)} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function ShootGroup({
  jobs,
  myTier,
  claiming,
  onClaim,
}: {
  jobs: OpenJobRow[];
  myTier: PhotographerTier;
  claiming: string | null;
  onClaim: (id: string) => void;
}) {
  const first = jobs[0];
  const showPointTakenBanner =
    myTier === "point" &&
    first.point_taken &&
    !jobs.some((j) => j.role === "point");

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-base sm:text-lg leading-tight">
          {first.event_name || "Untitled shoot"}
        </h2>
        <ShootMeta job={first} />
      </div>

      {showPointTakenBanner && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
          <Info className="size-4 shrink-0 mt-0.5" />
          <span>
            Heads up — the Point spot for this shoot is already taken. The
            openings below are <strong>unpaid Door Holder coverage</strong>.
          </span>
        </div>
      )}

      <div className="space-y-2">
        {jobs.map((j) => (
          <OpeningCard
            key={j.opening_id}
            job={j}
            claiming={claiming === j.opening_id}
            onClaim={() => onClaim(j.opening_id)}
          />
        ))}
      </div>
    </Card>
  );
}

function OpeningCard({
  job,
  claiming,
  onClaim,
}: {
  job: OpenJobRow;
  claiming: boolean;
  onClaim: () => void;
}) {
  const paid = isPaidRole(job.role);
  const claimLabel =
    job.role === "point"
      ? "Claim paid Point spot"
      : job.role === "door_holder"
        ? "Sign up as Door Holder (unpaid)"
        : "Sign up as Training (unpaid)";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-md bg-muted/30">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border",
            tierBadgeClasses(job.role)
          )}
        >
          {tierLabel(job.role)}
        </span>
        {paid && job.budget_cents != null ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
            {formatBudget(job.budget_cents)} · Paid
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
            Unpaid coverage
          </span>
        )}
      </div>
      <Button onClick={onClaim} disabled={claiming} size="sm">
        {claiming ? "Claiming…" : claimLabel}
      </Button>
    </div>
  );
}

function MyJobCard({ job, onRelease }: { job: MyJobRow; onRelease: () => void }) {
  const paid = isPaidRole(job.role);
  const claimedAt = parseISO(job.claimed_at);
  const within48h = Date.now() - claimedAt.getTime() < 48 * 60 * 60 * 1000;
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{job.event_name || "Untitled shoot"}</h3>
          <ShootMeta job={job} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              tierBadgeClasses(job.role)
            )}
          >
            {tierLabel(job.role)}
          </span>
          {paid && job.budget_cents != null && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
              {formatBudget(job.budget_cents)} · Paid
            </span>
          )}
        </div>
      </div>

      {(job.on_site_contact_name || job.on_site_contact_phone) && (
        <div className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          {job.on_site_contact_name && (
            <span className="inline-flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {job.on_site_contact_name}
            </span>
          )}
          {job.on_site_contact_phone && (
            <a
              href={`tel:${job.on_site_contact_phone}`}
              className="inline-flex items-center gap-1 hover:underline text-foreground"
            >
              <Phone className="size-3.5" />
              {job.on_site_contact_phone}
            </a>
          )}
        </div>
      )}

      {job.notes && (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground border-l-2 border-border pl-3">
          {job.notes}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-muted-foreground">
          Claimed {format(claimedAt, "MMM d, h:mm a")}
        </span>
        {within48h ? (
          <Button size="sm" variant="ghost" onClick={onRelease}>
            Release
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Past 48-hour window — contact admin to release
          </span>
        )}
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
          {job.spans_multiple_days && job.event_end_date &&
            ` → ${format(parseISO(job.event_end_date), "MMM d")}`}
        </span>
      )}
      {(job.start_time || job.end_time) && (
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {job.start_time?.slice(0, 5)} – {job.end_time?.slice(0, 5)}
        </span>
      )}
      {job.event_location && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {job.event_location}
        </span>
      )}
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{children}</p>
    </main>
  );
}

function InvalidTokenScreen({ reason }: { reason: "missing" | "invalid" }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md p-8 text-center space-y-3">
        <Camera className="size-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">
          {reason === "missing" ? "No link provided" : "This link isn't valid"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {reason === "missing"
            ? "Open the personal link your photo lead sent you via email or SMS."
            : "Your link may have been deactivated. Reach out to your photo lead for a new one."}
        </p>
        <Link to="/" className="text-sm text-primary hover:underline inline-block">
          Go to homepage
        </Link>
      </Card>
    </main>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "invalid_token":
      return "Your link is no longer valid. Contact your photo lead.";
    case "opening_not_found":
      return "This shoot is no longer available.";
    case "request_not_open":
      return "This shoot is no longer accepting photographers.";
    case "tier_too_low":
      return "You don't have access to this opening.";
    case "already_claimed":
      return "Someone else just claimed this spot.";
    case "no_active_claim":
      return "You're not assigned to this shoot.";
    case "release_window_expired":
      return "The 48-hour release window has passed. Contact your photo lead.";
    default:
      return "Something went wrong — please try again.";
  }
}
