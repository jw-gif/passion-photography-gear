import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { ArrowRight, Check, ChevronDown, ChevronRight, Circle, LogOut, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import pccLogo from "@/assets/pcc-logo.png";
import { cn } from "@/lib/utils";
import { BlocksRenderer } from "@/components/onboarding-blocks-renderer";
import {
  type ChecklistItemRow,
  type HireRow,
  type PageRow,
  type TimelineItemRow,
  checklistProgress,
  classifyMilestone,
  dayOffsetToDate,
  safeBlocks,
} from "@/lib/onboarding";

interface Search {
  tab?: string;
  previewHire?: string;
}

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    previewHire: typeof s.previewHire === "string" ? s.previewHire : undefined,
  }),
  head: () => ({
    meta: [{ title: "Onboarding · Passion Staff Hub" }],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading, signOut, isAdmin, displayName } = useAuth();
  const navigate = useNavigate();
  const { tab, previewHire } = Route.useSearch();
  const isPreview = Boolean(previewHire && isAdmin);

  const [pages, setPages] = useState<PageRow[]>([]);
  const [hire, setHire] = useState<HireRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineItemRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItemRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: "/onboarding" }, replace: true });
    }
  }, [loading, user, navigate]);

  async function loadAll(uid: string) {
    setLoadingData(true);
    let hireRow: HireRow | null = null;

    if (isPreview && previewHire) {
      const { data } = await supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .eq("id", previewHire)
        .maybeSingle();
      hireRow = (data as HireRow | null) ?? null;
    } else {
      const { data } = await supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .eq("user_id", uid)
        .maybeSingle();
      hireRow = (data as HireRow | null) ?? null;
      if (!hireRow && user?.email) {
        const { data: byEmail } = await supabase
          .from("onboarding_hires")
          .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
          .eq("email", user.email.toLowerCase())
          .is("user_id", null)
          .maybeSingle();
        if (byEmail) {
          await supabase.from("onboarding_hires").update({ user_id: uid }).eq("id", byEmail.id);
          hireRow = { ...(byEmail as HireRow), user_id: uid };
        }
      }
    }

    const [{ data: p }, t, c] = await Promise.all([
      supabase
        .from("onboarding_pages")
        .select("id, slug, title, subtitle, blocks, sort_order")
        .order("sort_order"),
      hireRow
        ? supabase
            .from("onboarding_hire_timeline")
            .select("id, hire_id, day_offset, label, title, description, sort_order")
            .eq("hire_id", hireRow.id)
            .order("day_offset")
            .order("sort_order")
        : Promise.resolve({ data: [] }),
      hireRow
        ? supabase
            .from("onboarding_hire_checklist")
            .select(
              "id, hire_id, section, label, owner, completed, completed_at, sort_order",
            )
            .eq("hire_id", hireRow.id)
            .order("sort_order")
        : Promise.resolve({ data: [] }),
    ]);

    setPages(
      ((p ?? []) as Array<Omit<PageRow, "blocks"> & { blocks: unknown }>).map((row) => ({
        ...row,
        blocks: safeBlocks(row.blocks),
      })),
    );
    setHire(hireRow);
    setTimeline((t.data ?? []) as TimelineItemRow[]);
    setChecklist((c.data ?? []) as ChecklistItemRow[]);
    setLoadingData(false);
  }

  useEffect(() => {
    if (user) loadAll(user.id);
  }, [user, previewHire, isPreview]);

  const tabs = useMemo(() => {
    const base: { key: string; label: string }[] = pages.map((p) => ({
      key: p.slug,
      label: p.title,
    }));
    if (hire) {
      base.push({ key: "first-month", label: "First month" });
      base.push({ key: "checklist", label: "Checklist" });
    }
    return base;
  }, [pages, hire]);

  const activeKey = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key ?? "welcome";
  const isFirstTab = tabs[0]?.key === activeKey;

  if (loading || !user) return null;

  return (
    <main className="min-h-screen">
      <header className="px-4 sm:px-6 py-4 border-b border-border bg-card">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center">
              <img
                src={pccLogo}
                alt="PCC"
                className="size-5 object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-tight">Onboarding</div>
              <div className="text-xs text-muted-foreground">
                {hire ? `Welcome, ${hire.name.split(" ")[0]}` : displayName ?? user.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/onboarding">Admin view</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {isPreview && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 text-xs px-4 sm:px-6 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <span>
              Admin preview of <strong>{hire?.name ?? "hire"}</strong>'s view. Checklist
              toggles are disabled.
            </span>
            <Link
              to="/admin/onboarding/hires/$hireId"
              params={{ hireId: previewHire ?? "" }}
              className="underline"
            >
              Back to editor
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loadingData ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {/* Hero on first tab */}
            {isFirstTab && hire && <HireHero hire={hire} />}

            {/* Today card visible on all tabs when there's a hire */}
            {hire && (
              <TodayCard
                hire={hire}
                timeline={timeline}
                checklist={checklist}
                activeKey={activeKey}
                isPreview={isPreview}
                previewHire={previewHire}
              />
            )}

            {/* Tabs (horizontal scroll on mobile) */}
            <nav className="flex gap-2 mb-6 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  to="/onboarding"
                  search={{ tab: t.key, previewHire: isPreview ? previewHire : undefined }}
                  replace
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap snap-start",
                    t.key === activeKey
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>

            {activeKey === "first-month" && hire ? (
              <FirstMonthView hire={hire} items={timeline} />
            ) : activeKey === "checklist" && hire ? (
              <ChecklistView
                items={checklist}
                onToggle={
                  isPreview
                    ? () => {}
                    : async (item) => {
                        const completed = !item.completed;
                        const { error } = await supabase
                          .from("onboarding_hire_checklist")
                          .update({
                            completed,
                            completed_at: completed ? new Date().toISOString() : null,
                          })
                          .eq("id", item.id);
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        const next = checklist.map((i) =>
                          i.id === item.id
                            ? {
                                ...i,
                                completed,
                                completed_at: completed ? new Date().toISOString() : null,
                              }
                            : i,
                        );
                        setChecklist(next);
                        // Section-complete celebration
                        if (completed) {
                          const sectionItems = next.filter((i) => i.section === item.section);
                          if (
                            sectionItems.length > 0 &&
                            sectionItems.every((i) => i.completed)
                          ) {
                            confetti({
                              particleCount: 60,
                              spread: 70,
                              origin: { y: 0.6 },
                              disableForReducedMotion: true,
                            });
                            toast.success(`${item.section} complete! 🎉`, {
                              icon: <PartyPopper className="size-4" />,
                            });
                          }
                        }
                      }
                }
              />
            ) : (
              <PageView page={pages.find((p) => p.slug === activeKey)} />
            )}

            {!hire && (
              <Card className="p-4 mt-6 border-dashed">
                <div className="text-sm text-muted-foreground">
                  No personalized first-month plan or checklist is linked to your account
                  yet. Ask your coordinator to add you with the email{" "}
                  <span className="font-mono">{user.email}</span>.
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                               */
/* ------------------------------------------------------------------ */

function HireHero({ hire }: { hire: HireRow }) {
  const firstName = hire.name.split(" ")[0];
  const startDate = new Date(`${hire.start_date}T00:00:00`);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8 mb-5">
      <div
        className="absolute -right-10 -top-10 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute right-6 top-6 size-12 rounded-full bg-primary/20 flex items-center justify-center pointer-events-none"
        aria-hidden
      >
        <img
          src={pccLogo}
          alt=""
          className="size-7 object-contain opacity-80"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>
      <div className="relative">
        <div className="text-xs uppercase tracking-wider text-primary/80 font-semibold mb-1">
          Welcome to Passion
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Welcome, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          {hire.role_label ? `${hire.role_label} · ` : ""}
          {startDate.getTime() > Date.now()
            ? `Starting ${format(startDate, "EEE, MMM d")}`
            : `Started ${format(startDate, "EEE, MMM d")}`}
          {hire.coordinator_name ? ` · Onboarded by ${hire.coordinator_name}` : ""}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Today card                                                         */
/* ------------------------------------------------------------------ */

function TodayCard({
  hire,
  timeline,
  checklist,
  activeKey,
  isPreview,
  previewHire,
}: {
  hire: HireRow;
  timeline: TimelineItemRow[];
  checklist: ChecklistItemRow[];
  activeKey: string;
  isPreview: boolean;
  previewHire: string | undefined;
}) {
  const start = new Date(`${hire.start_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayN = differenceInCalendarDays(today, start) + 1;
  const totalDays = 30;
  const dayLabel =
    dayN <= 0
      ? `Starts in ${Math.abs(dayN) + 1} day${Math.abs(dayN) === 0 ? "" : "s"}`
      : dayN > totalDays
        ? `Past day ${totalDays}`
        : `Day ${dayN} of ${totalDays}`;

  const todaysItem =
    timeline.find((t) => classifyMilestone(hire.start_date, t.day_offset) === "today") ??
    null;
  const upcomingItem =
    !todaysItem
      ? timeline.find((t) => classifyMilestone(hire.start_date, t.day_offset) === "upcoming") ??
        null
      : null;

  const progress = checklistProgress(checklist);
  const remaining = progress.total - progress.done;

  // Don't render on the checklist or first-month tab — duplicative
  if (activeKey === "checklist" || activeKey === "first-month") return null;
  if (timeline.length === 0 && checklist.length === 0) return null;

  return (
    <Card className="p-4 mb-5 bg-card/50 backdrop-blur">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex flex-col items-center justify-center min-w-[72px] py-1 px-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold">
            {dayN <= 0 ? "Soon" : dayN > totalDays ? "Done" : "Today"}
          </div>
          <div className="text-2xl font-semibold leading-tight">
            {dayN <= 0 || dayN > totalDays ? "—" : dayN}
          </div>
          <div className="text-[10px] text-muted-foreground">of {totalDays}</div>
        </div>

        <div className="flex-1 min-w-[200px] space-y-1">
          <div className="text-xs text-muted-foreground">{dayLabel}</div>
          {todaysItem ? (
            <div>
              <div className="text-sm font-medium">Today: {todaysItem.title}</div>
              {todaysItem.description && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {todaysItem.description}
                </div>
              )}
            </div>
          ) : upcomingItem ? (
            <div>
              <div className="text-sm font-medium">
                Up next: {upcomingItem.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(dayOffsetToDate(hire.start_date, upcomingItem.day_offset), "EEE, MMM d")}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No upcoming milestones.</div>
          )}
          {progress.total > 0 && (
            <div className="text-xs text-muted-foreground">
              Checklist: {progress.done}/{progress.total} done
              {remaining > 0 ? ` · ${remaining} to go` : " · all done 🎉"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {timeline.length > 0 && (
            <Button asChild size="sm" variant="outline">
              <Link
                to="/onboarding"
                search={{
                  tab: "first-month",
                  previewHire: isPreview ? previewHire : undefined,
                }}
                replace
              >
                First month <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
          {checklist.length > 0 && (
            <Button asChild size="sm">
              <Link
                to="/onboarding"
                search={{
                  tab: "checklist",
                  previewHire: isPreview ? previewHire : undefined,
                }}
                replace
              >
                Checklist
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page (welcome / shared)                                            */
/* ------------------------------------------------------------------ */

function PageView({ page }: { page: PageRow | undefined }) {
  if (!page) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground">Page not found.</div>
      </Card>
    );
  }
  return (
    <article>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
        {page.subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{page.subtitle}</p>
        )}
      </div>
      <BlocksRenderer blocks={page.blocks} />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* First month timeline                                               */
/* ------------------------------------------------------------------ */

function FirstMonthView({
  hire,
  items,
}: {
  hire: HireRow;
  items: TimelineItemRow[];
}) {
  const [showPast, setShowPast] = useState(false);
  const todayRef = useRef<HTMLLIElement | null>(null);

  // Auto-scroll to today on mount
  useEffect(() => {
    const id = window.setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => window.clearTimeout(id);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground">
          Your coordinator hasn't built your first-month timeline yet.
        </div>
      </Card>
    );
  }

  // Group by week
  const groups = new Map<number, TimelineItemRow[]>();
  for (const it of items) {
    const week = Math.max(0, Math.floor(it.day_offset / 7));
    const arr = groups.get(week) ?? [];
    arr.push(it);
    groups.set(week, arr);
  }
  const weeks = Array.from(groups.keys()).sort((a, b) => a - b);
  const pastItems = items.filter(
    (i) => classifyMilestone(hire.start_date, i.day_offset) === "past",
  );

  return (
    <article>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Your first month</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Starting {format(new Date(`${hire.start_date}T00:00:00`), "EEE, MMM d")} — items
          highlight as you reach each day.
        </p>
      </div>

      {pastItems.length > 0 && !showPast && (
        <button
          onClick={() => setShowPast(true)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3 underline-offset-2 hover:underline"
        >
          <ChevronRight className="size-3" />
          Show {pastItems.length} completed
        </button>
      )}

      <div className="space-y-6">
        {weeks.map((w) => {
          const weekItems = groups.get(w) ?? [];
          const visibleItems = showPast
            ? weekItems
            : weekItems.filter(
                (i) => classifyMilestone(hire.start_date, i.day_offset) !== "past",
              );
          if (visibleItems.length === 0) return null;
          const weekStart = dayOffsetToDate(hire.start_date, w * 7);
          const weekEnd = dayOffsetToDate(hire.start_date, w * 7 + 6);
          return (
            <section key={w}>
              <div className="flex items-baseline justify-between mb-2 pb-1 border-b border-border">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Week {w + 1}
                </h2>
                <span className="text-[10px] text-muted-foreground">
                  {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
                </span>
              </div>
              <ol className="relative pl-6 border-l border-border">
                {visibleItems.map((item) => {
                  const status = classifyMilestone(hire.start_date, item.day_offset);
                  const date = dayOffsetToDate(hire.start_date, item.day_offset);
                  return (
                    <li
                      key={item.id}
                      ref={status === "today" ? todayRef : undefined}
                      className="relative pb-4 last:pb-0"
                    >
                      <span
                        className={cn(
                          "absolute -left-[30px] top-0.5 size-5 rounded-full border-2 flex items-center justify-center bg-card",
                          status === "today" &&
                            "border-emerald-600 bg-emerald-600 text-background animate-pulse",
                          status === "past" && "border-emerald-600/50 bg-emerald-600/20 text-emerald-700",
                          status === "upcoming" && "border-border text-muted-foreground",
                        )}
                      >
                        {status === "past" ? (
                          <Check className="size-3" strokeWidth={3} />
                        ) : status === "today" ? (
                          <span className="size-1.5 rounded-full bg-background" />
                        ) : (
                          <Circle className="size-1.5 fill-current" />
                        )}
                      </span>
                      <div
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider mb-0.5",
                          status === "today" ? "text-emerald-700" : "text-muted-foreground",
                        )}
                      >
                        {item.label} · {format(date, "EEE, MMM d")}
                        {status === "today" && " · Today"}
                      </div>
                      <div
                        className={cn(
                          "font-medium",
                          status === "past" && "text-muted-foreground",
                        )}
                      >
                        {item.title}
                      </div>
                      {item.description && (
                        <div
                          className={cn(
                            "text-sm mt-0.5 whitespace-pre-wrap",
                            status === "past"
                              ? "text-muted-foreground/80"
                              : "text-foreground/80",
                          )}
                        >
                          {item.description}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      {pastItems.length > 0 && showPast && (
        <button
          onClick={() => setShowPast(false)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-4 underline-offset-2 hover:underline"
        >
          <ChevronDown className="size-3" />
          Hide completed
        </button>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Checklist                                                          */
/* ------------------------------------------------------------------ */

function ChecklistView({
  items,
  onToggle,
}: {
  items: ChecklistItemRow[];
  onToggle: (item: ChecklistItemRow) => void;
}) {
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground">
          Your coordinator hasn't created your checklist yet.
        </div>
      </Card>
    );
  }
  const sections = Array.from(new Set(items.map((i) => i.section || "General")));
  const progress = checklistProgress(items);
  return (
    <article>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Your checklist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {progress.done} of {progress.total} complete · {progress.pct}%
        </p>
      </div>

      {/* Sticky progress bar */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/90 backdrop-blur border-b border-border mb-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="text-xs font-medium tabular-nums whitespace-nowrap">
            {progress.done}/{progress.total}
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {progress.pct}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const sItems = items.filter((i) => i.section === section);
          const sDone = sItems.filter((i) => i.completed).length;
          const sTotal = sItems.length;
          const allDone = sTotal > 0 && sDone === sTotal;
          return (
            <Card key={section} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{section}</div>
                <span
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border tabular-nums",
                    allDone
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : "border-border bg-muted/50 text-muted-foreground",
                  )}
                >
                  {sDone}/{sTotal}
                  {allDone && " ✓"}
                </span>
              </div>
              <ul className="divide-y">
                {sItems.map((item) => (
                  <li key={item.id} className="py-3 flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggle(item)}
                      aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
                      className={cn(
                        "size-6 sm:size-5 mt-0.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer",
                        item.completed
                          ? "bg-emerald-600 border-emerald-600 text-background"
                          : "border-input bg-background hover:border-emerald-500",
                      )}
                    >
                      {item.completed && <Check className="size-3.5" strokeWidth={3} />}
                    </button>
                    <span
                      className={cn(
                        "text-sm flex-1 select-none cursor-pointer",
                        item.completed && "line-through text-muted-foreground",
                      )}
                      onClick={() => onToggle(item)}
                    >
                      {item.label}
                    </span>
                    {item.owner && (
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                        {item.owner}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </article>
  );
}
