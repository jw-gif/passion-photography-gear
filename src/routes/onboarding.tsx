import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      // Admin preview: load the specified hire by id (admin RLS allows it)
      const { data } = await supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .eq("id", previewHire)
        .maybeSingle();
      hireRow = (data as HireRow | null) ?? null;
    } else {
      // Normal hire flow: find by user_id, or link by email
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
              <div className="font-semibold tracking-tight leading-tight">
                Onboarding
              </div>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loadingData ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <nav className="flex flex-wrap gap-2 mb-6">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  to="/onboarding"
                  search={{ tab: t.key }}
                  replace
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
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
                onToggle={async (item) => {
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
                  } else {
                    setChecklist((prev) =>
                      prev.map((i) =>
                        i.id === item.id
                          ? {
                              ...i,
                              completed,
                              completed_at: completed ? new Date().toISOString() : null,
                            }
                          : i,
                      ),
                    );
                  }
                }}
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

function FirstMonthView({
  hire,
  items,
}: {
  hire: HireRow;
  items: TimelineItemRow[];
}) {
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground">
          Your coordinator hasn't built your first-month timeline yet.
        </div>
      </Card>
    );
  }
  return (
    <article>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Your first month</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Starting {format(new Date(`${hire.start_date}T00:00:00`), "EEE, MMM d")} — items
          highlight as you reach each day.
        </p>
      </div>
      <ol className="relative pl-6 border-l border-border">
        {items.map((item) => {
          const status = classifyMilestone(hire.start_date, item.day_offset);
          const date = dayOffsetToDate(hire.start_date, item.day_offset);
          return (
            <li key={item.id} className="relative pb-5">
              <span
                className={cn(
                  "absolute -left-[27px] top-1 size-3 rounded-full border-2 bg-card",
                  status === "today"
                    ? "border-emerald-600 bg-emerald-600"
                    : status === "past"
                      ? "border-emerald-600/40 bg-emerald-600/40"
                      : "border-border",
                )}
              />
              <div
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider mb-0.5",
                  status === "today"
                    ? "text-emerald-700"
                    : status === "past"
                      ? "text-muted-foreground"
                      : "text-muted-foreground",
                )}
              >
                {item.label} · {format(date, "MMM d")}
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
                    status === "past" ? "text-muted-foreground" : "text-foreground/80",
                  )}
                >
                  {item.description}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </article>
  );
}

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
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section} className="p-4">
            <div className="font-semibold mb-2">{section}</div>
            <ul className="divide-y">
              {items
                .filter((i) => i.section === section)
                .map((item) => (
                  <li key={item.id} className="py-2.5 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => onToggle(item)}
                      className="size-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                    <span
                      className={cn(
                        "text-sm flex-1",
                        item.completed && "line-through text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.owner && (
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {item.owner}
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
    </article>
  );
}
