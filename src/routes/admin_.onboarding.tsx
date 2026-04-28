import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Pencil, Users, FileText, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type HireRow,
  type PageRow,
  type ChecklistItemRow,
  checklistProgress,
  safeBlocks,
} from "@/lib/onboarding";

export const Route = createFileRoute("/admin_/onboarding")({
  head: () => ({ meta: [{ title: "Staff Onboarding · Passion Photography Hub" }] }),
  component: Page,
});

function Page() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <Inner onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function Inner({ onLogout }: { onLogout: () => void }) {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [hires, setHires] = useState<HireRow[]>([]);
  const [progress, setProgress] = useState<Record<string, { done: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: p }, { data: h }, { data: c }] = await Promise.all([
      supabase
        .from("onboarding_pages")
        .select("id, slug, title, subtitle, blocks, sort_order")
        .order("sort_order"),
      supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .order("start_date", { ascending: false }),
      supabase
        .from("onboarding_hire_checklist")
        .select("id, hire_id, completed"),
    ]);
    setPages(
      ((p ?? []) as Array<Omit<PageRow, "blocks"> & { blocks: unknown }>).map((row) => ({
        ...row,
        blocks: safeBlocks(row.blocks),
      })),
    );
    setHires((h ?? []) as HireRow[]);
    const map: Record<string, { done: number; total: number }> = {};
    for (const item of (c ?? []) as { hire_id: string; completed: boolean }[]) {
      const cur = map[item.hire_id] ?? { done: 0, total: 0 };
      cur.total += 1;
      if (item.completed) cur.done += 1;
      map[item.hire_id] = cur;
    }
    setProgress(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Staff Onboarding" subtitle="New hire resources" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold tracking-tight inline-flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" /> Shared pages
            </h2>
            <span className="text-xs text-muted-foreground">Visible to all hires</span>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pages.map((p) => (
                <Link
                  key={p.id}
                  to="/admin/onboarding/pages/$slug"
                  params={{ slug: p.slug }}
                >
                  <Card className="p-4 hover:border-foreground/30 transition-colors h-full">
                    <div className="font-medium">{p.title}</div>
                    {p.subtitle && (
                      <div className="text-xs text-muted-foreground mt-0.5">{p.subtitle}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Pencil className="size-3" /> {p.blocks.length} block
                      {p.blocks.length === 1 ? "" : "s"}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold tracking-tight inline-flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" /> New hires
            </h2>
            <NewHireDialog onCreated={load} />
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : hires.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <div className="text-sm text-muted-foreground">
                No new hires yet. Add one to start their onboarding.
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {hires.map((h) => {
                const pr = progress[h.id] ?? { done: 0, total: 0 };
                const pct = pr.total === 0 ? 0 : Math.round((pr.done / pr.total) * 100);
                return (
                  <Link
                    key={h.id}
                    to="/admin/onboarding/hires/$hireId"
                    params={{ hireId: h.id }}
                    className="block"
                  >
                    <Card className="p-4 hover:border-foreground/30 transition-colors">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{h.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {h.role_label ? `${h.role_label} · ` : ""}
                            {h.email}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          Starts {format(new Date(`${h.start_date}T00:00:00`), "MMM d, yyyy")}
                        </div>
                        <div className="min-w-[140px]">
                          <div className="text-xs text-muted-foreground mb-1">
                            {pr.done}/{pr.total} checklist · {pct}%
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        {!h.user_id && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-700">
                            No login linked
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function NewHireDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [coordinator, setCoordinator] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !startDate) {
      toast.error("Name, email, and start date are required");
      return;
    }
    setSaving(true);
    // Try to look up an existing auth user by email so the hire can sign in.
    // We can only see admin_profiles; we use email match with the eventual sign-in.
    const { error } = await supabase.from("onboarding_hires").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role_label: roleLabel.trim() || null,
      start_date: startDate,
      coordinator_name: coordinator.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Hire created");
    setOpen(false);
    setName("");
    setEmail("");
    setRoleLabel("");
    setCoordinator("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New hire
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new hire</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Email (must match the email they sign in with)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Role / track (optional)</Label>
            <Input
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="e.g. Junior Designer"
            />
          </div>
          <div>
            <Label className="text-xs">Start date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Coordinator (optional)</Label>
            <Input
              value={coordinator}
              onChange={(e) => setCoordinator(e.target.value)}
              placeholder="Who is onboarding them"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create hire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
