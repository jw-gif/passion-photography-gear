import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { HubCalendar, type CalendarEvent } from "@/components/hub-calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Wrench, ArrowRight, Inbox, MapPin, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  statusBadgeClasses,
  statusLabel,
  statusDotColor,
  gearRequestBadgeClasses,
  gearRequestStatusLabel,
  type PhotoRequestStatus,
  type GearRequestStatus,
} from "@/lib/orgs";
import { locationLabel } from "@/lib/locations";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard · Passion Photography Hub" },
      { name: "description", content: "Centralized view of upcoming photography and gear requests." },
    ],
  }),
  component: AdminHubPage,
});

interface PhotoRow {
  id: string;
  first_name: string;
  last_name: string;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  spans_multiple_days: boolean;
  status: PhotoRequestStatus;
}

interface GearReqRow {
  id: string;
  requestor_name: string;
  location: string;
  needed_date: string;
  status: GearRequestStatus;
}

interface GearReqItemRow {
  request_id: string;
  gear_id: number;
}

function AdminHubPage() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <HubView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function HubView({ onLogout }: { onLogout: () => void }) {
  const [photo, setPhoto] = useState<PhotoRow[]>([]);
  const [gearReqs, setGearReqs] = useState<GearReqRow[]>([]);
  const [gearItems, setGearItems] = useState<GearReqItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const today = format(new Date(), "yyyy-MM-dd");
    const horizon = format(addDays(new Date(), 90), "yyyy-MM-dd");
    const past = format(addDays(new Date(), -30), "yyyy-MM-dd");
    const [{ data: p }, { data: g }, { data: gi }] = await Promise.all([
      supabase
        .from("photo_requests")
        .select(
          "id, first_name, last_name, event_name, event_location, event_date, event_end_date, spans_multiple_days, status",
        )
        .gte("event_date", past)
        .lte("event_date", horizon)
        .order("event_date", { ascending: true }),
      supabase
        .from("gear_requests")
        .select("id, requestor_name, location, needed_date, status")
        .gte("needed_date", past)
        .lte("needed_date", horizon)
        .order("needed_date", { ascending: true }),
      supabase.from("gear_request_items").select("request_id, gear_id"),
    ]);
    setPhoto((p ?? []) as PhotoRow[]);
    setGearReqs((g ?? []) as GearReqRow[]);
    setGearItems((gi ?? []) as GearReqItemRow[]);
    setLoading(false);
    void today;
  }

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("hub_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photo_requests" },
        () => loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gear_requests" },
        () => loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gear_request_items" },
        () => loadAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    const evs: CalendarEvent[] = [];
    for (const p of photo) {
      if (!p.event_date) continue;
      evs.push({
        id: `p-${p.id}`,
        kind: "photo",
        date: p.event_date,
        endDate: p.spans_multiple_days ? p.event_end_date ?? null : null,
        title: p.event_name || `${p.first_name} ${p.last_name}`,
        statusColor: statusDotColor(p.status),
        statusLabel: statusLabel(p.status),
        href: `/admin/requests-photography`,
      });
    }
    for (const g of gearReqs) {
      evs.push({
        id: `g-${g.id}`,
        kind: "gear",
        date: g.needed_date,
        title: `${g.requestor_name} — ${locationLabel(g.location)}`,
        statusColor: statusDotColor(g.status),
        statusLabel: gearRequestStatusLabel(g.status),
        href: `/admin/requests-gear`,
      });
    }
    return evs;
  }, [photo, gearReqs]);

  // Upcoming lists: today through next 30 days
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const horizonKey = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const upcomingPhoto = useMemo(
    () =>
      photo
        .filter((p) => p.event_date && p.event_date >= todayKey && p.event_date <= horizonKey)
        .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1)),
    [photo, todayKey, horizonKey],
  );
  const upcomingGear = useMemo(
    () =>
      gearReqs
        .filter((g) => g.needed_date >= todayKey && g.needed_date <= horizonKey)
        .sort((a, b) => (a.needed_date < b.needed_date ? -1 : 1)),
    [gearReqs, todayKey, horizonKey],
  );

  const itemCountFor = (reqId: string) =>
    gearItems.filter((i) => i.request_id === reqId).length;

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upcoming photography and gear requests across the team.
          </p>
        </div>

        {/* Upcoming lists */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Photography */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold tracking-tight inline-flex items-center gap-2">
                <Camera className="size-4 text-muted-foreground" />
                Upcoming Photography Requests
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/requests-photography">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            {loading ? (
              <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
            ) : upcomingPhoto.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <Camera className="size-6 mx-auto text-muted-foreground/60 mb-2" />
                <div className="text-sm text-muted-foreground">
                  No photography requests in the next 30 days.
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingPhoto.slice(0, 6).map((p) => (
                  <Link
                    key={p.id}
                    to="/admin/requests-photography"
                    className="block"
                  >
                    <Card className="p-4 hover:border-foreground/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full border",
                                statusBadgeClasses(p.status),
                              )}
                            >
                              {statusLabel(p.status)}
                            </span>
                          </div>
                          <div className="font-semibold truncate">
                            {p.event_name || `${p.first_name} ${p.last_name}`}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                            {p.event_date && (
                              <span>
                                {format(parseISO(p.event_date), "EEE, MMM d")}
                                {p.spans_multiple_days && p.event_end_date &&
                                  ` → ${format(parseISO(p.event_end_date), "MMM d")}`}
                              </span>
                            )}
                            {p.event_location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3" />
                                {p.event_location}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="size-3" />
                              {p.first_name} {p.last_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Gear */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold tracking-tight inline-flex items-center gap-2">
                <Wrench className="size-4 text-muted-foreground" />
                Upcoming Gear Requests
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/requests-gear">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            {loading ? (
              <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
            ) : upcomingGear.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <Inbox className="size-6 mx-auto text-muted-foreground/60 mb-2" />
                <div className="text-sm text-muted-foreground">
                  No gear requests in the next 30 days.
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingGear.slice(0, 6).map((g) => {
                  const count = itemCountFor(g.id);
                  return (
                    <Link key={g.id} to="/admin/requests-gear" className="block">
                      <Card className="p-4 hover:border-foreground/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={cn(
                                  "text-xs font-medium px-2 py-0.5 rounded-full border",
                                  gearRequestBadgeClasses(g.status),
                                )}
                              >
                                {gearRequestStatusLabel(g.status)}
                              </span>
                            </div>
                            <div className="font-semibold truncate">
                              {g.requestor_name}
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                · {count} item{count === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                              <span>{format(parseISO(g.needed_date), "EEE, MMM d")}</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3" />
                                {locationLabel(g.location)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Calendar */}
        <section>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading calendar…</div>
          ) : (
            <HubCalendar events={events} />
          )}
        </section>
      </div>
    </main>
  );
}
