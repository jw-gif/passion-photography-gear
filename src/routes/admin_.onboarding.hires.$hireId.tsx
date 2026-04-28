import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type HireRow,
  type TimelineItemRow,
  type ChecklistItemRow,
  classifyMilestone,
  dayOffsetToDate,
  checklistProgress,
} from "@/lib/onboarding";

export const Route = createFileRoute("/admin_/onboarding/hires/$hireId")({
  head: () => ({ meta: [{ title: "Hire · Staff Onboarding" }] }),
  component: PageWrapper,
});

function PageWrapper() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <HireEditor onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function HireEditor({ onLogout }: { onLogout: () => void }) {
  const { hireId } = Route.useParams();
  const navigate = useNavigate();

  const [hire, setHire] = useState<HireRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineItemRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: h }, { data: t }, { data: c }] = await Promise.all([
      supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .eq("id", hireId)
        .maybeSingle(),
      supabase
        .from("onboarding_hire_timeline")
        .select("id, hire_id, day_offset, label, title, description, sort_order")
        .eq("hire_id", hireId)
        .order("day_offset")
        .order("sort_order"),
      supabase
        .from("onboarding_hire_checklist")
        .select("id, hire_id, section, label, owner, completed, completed_at, sort_order")
        .eq("hire_id", hireId)
        .order("sort_order"),
    ]);
    if (!h) {
      toast.error("Hire not found");
      navigate({ to: "/admin/onboarding" });
      return;
    }
    setHire(h as HireRow);
    setTimeline((t ?? []) as TimelineItemRow[]);
    setChecklist((c ?? []) as ChecklistItemRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [hireId]);

  if (loading || !hire) {
    return (
      <main className="min-h-screen">
        <HubHeader onLogout={onLogout} title="Hire" subtitle="Staff Onboarding" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-sm text-muted-foreground">
          Loading…
        </div>
      </main>
    );
  }

  const progress = checklistProgress(checklist);

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title={hire.name} subtitle="Staff Onboarding" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/onboarding">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/onboarding" target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Open hire view
            </a>
          </Button>
        </div>

        <HireMetaCard hire={hire} onChanged={load} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Start date</div>
            <div className="font-semibold">
              {format(new Date(`${hire.start_date}T00:00:00`), "EEE, MMM d, yyyy")}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Checklist progress</div>
            <div className="font-semibold">
              {progress.done}/{progress.total} ({progress.pct}%)
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Login linked</div>
            <div className="font-semibold">{hire.user_id ? "Yes" : "Not yet"}</div>
            {!hire.user_id && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Linked when they sign in with {hire.email}.
              </div>
            )}
          </Card>
        </div>

        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">First month timeline</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <TimelinePanel
              hire={hire}
              items={timeline}
              onChanged={load}
            />
          </TabsContent>
          <TabsContent value="checklist" className="mt-4">
            <ChecklistPanel hire={hire} items={checklist} onChanged={load} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function HireMetaCard({ hire, onChanged }: { hire: HireRow; onChanged: () => void }) {
  const [name, setName] = useState(hire.name);
  const [email, setEmail] = useState(hire.email);
  const [roleLabel, setRoleLabel] = useState(hire.role_label ?? "");
  const [startDate, setStartDate] = useState(hire.start_date);
  const [coordinator, setCoordinator] = useState(hire.coordinator_name ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("onboarding_hires")
      .update({
        name,
        email: email.toLowerCase(),
        role_label: roleLabel.trim() || null,
        start_date: startDate,
        coordinator_name: coordinator.trim() || null,
      })
      .eq("id", hire.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      onChanged();
    }
  }

  async function remove() {
    if (!confirm(`Delete ${hire.name}? This removes their timeline and checklist.`)) return;
    const { error } = await supabase.from("onboarding_hires").delete().eq("id", hire.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      window.location.href = "/admin/onboarding";
    }
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Role / track</Label>
          <Input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Coordinator</Label>
          <Input value={coordinator} onChange={(e) => setCoordinator(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" /> Delete hire
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </Button>
      </div>
    </Card>
  );
}

function TimelinePanel({
  hire,
  items,
  onChanged,
}: {
  hire: HireRow;
  items: TimelineItemRow[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);

  async function add() {
    setAdding(true);
    const { error } = await supabase.from("onboarding_hire_timeline").insert({
      hire_id: hire.id,
      day_offset: items.length === 0 ? 0 : (items[items.length - 1]?.day_offset ?? 0) + 1,
      label: "Day 1",
      title: "New milestone",
      description: "",
      sort_order: items.length,
    });
    setAdding(false);
    if (error) toast.error(error.message);
    else onChanged();
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground mb-3">No timeline items yet.</div>
        <Button size="sm" onClick={add} disabled={adding}>
          <Plus className="size-4" /> Add first milestone
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Each item is pinned to a number of days after the start date. The hire's view shows past
        items as complete and highlights today.
      </div>
      {items.map((item) => (
        <TimelineItemEditor key={item.id} hire={hire} item={item} onChanged={onChanged} />
      ))}
      <Button variant="outline" size="sm" onClick={add} disabled={adding}>
        <Plus className="size-4" /> Add milestone
      </Button>
    </div>
  );
}

function TimelineItemEditor({
  hire,
  item,
  onChanged,
}: {
  hire: HireRow;
  item: TimelineItemRow;
  onChanged: () => void;
}) {
  const [dayOffset, setDayOffset] = useState(item.day_offset);
  const [label, setLabel] = useState(item.label);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [saving, setSaving] = useState(false);

  const date = dayOffsetToDate(hire.start_date, dayOffset);
  const status = classifyMilestone(hire.start_date, dayOffset);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("onboarding_hire_timeline")
      .update({
        day_offset: dayOffset,
        label,
        title,
        description: description.trim() || null,
      })
      .eq("id", item.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      onChanged();
    }
  }

  async function remove() {
    const { error } = await supabase.from("onboarding_hire_timeline").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-[100px_140px_1fr] gap-2 mb-2">
        <div>
          <Label className="text-[10px] uppercase">Day offset</Label>
          <Input
            type="number"
            value={dayOffset}
            onChange={(e) => setDayOffset(Number.parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase">Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <Label className="text-[10px] uppercase">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="mb-2">
        <Label className="text-[10px] uppercase">Description</Label>
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-muted-foreground">
          Falls on {format(date, "EEE, MMM d, yyyy")} —{" "}
          <span
            className={
              status === "today"
                ? "text-emerald-700 font-semibold"
                : status === "past"
                  ? "text-muted-foreground"
                  : ""
            }
          >
            {status === "past" ? "past" : status === "today" ? "today" : "upcoming"}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
            <Trash2 className="size-3.5" />
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "…" : "Save"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ChecklistPanel({
  hire,
  items,
  onChanged,
}: {
  hire: HireRow;
  items: ChecklistItemRow[];
  onChanged: () => void;
}) {
  const sections = Array.from(new Set(items.map((i) => i.section || "General")));
  const [adding, setAdding] = useState(false);

  async function add(section: string) {
    setAdding(true);
    const sectionItems = items.filter((i) => i.section === section);
    const { error } = await supabase.from("onboarding_hire_checklist").insert({
      hire_id: hire.id,
      section,
      label: "New task",
      owner: null,
      sort_order: sectionItems.length,
    });
    setAdding(false);
    if (error) toast.error(error.message);
    else onChanged();
  }

  async function addSection() {
    const name = prompt("Section name?");
    if (!name) return;
    add(name.trim());
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground mb-3">No checklist items yet.</div>
        <Button size="sm" onClick={() => add("General")} disabled={adding}>
          <Plus className="size-4" /> Add first task
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">{section}</div>
            <Button size="sm" variant="ghost" onClick={() => add(section)} disabled={adding}>
              <Plus className="size-3.5" /> Item
            </Button>
          </div>
          <div className="space-y-2">
            {items
              .filter((i) => i.section === section)
              .map((item) => (
                <ChecklistItemEditor key={item.id} item={item} onChanged={onChanged} />
              ))}
          </div>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addSection}>
        <Plus className="size-4" /> Add section
      </Button>
    </div>
  );
}

function ChecklistItemEditor({
  item,
  onChanged,
}: {
  item: ChecklistItemRow;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [owner, setOwner] = useState(item.owner ?? "");

  async function save() {
    const { error } = await supabase
      .from("onboarding_hire_checklist")
      .update({ label, owner: owner.trim() || null })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  }
  async function toggle() {
    const completed = !item.completed;
    const { error } = await supabase
      .from("onboarding_hire_checklist")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  }
  async function remove() {
    const { error } = await supabase.from("onboarding_hire_checklist").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  }

  return (
    <div className="grid grid-cols-[auto_1fr_160px_auto_auto] gap-2 items-center">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={toggle}
        className="size-4 accent-emerald-600 cursor-pointer"
      />
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={save}
        className={item.completed ? "line-through text-muted-foreground" : ""}
      />
      <Input
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        onBlur={save}
        placeholder="Owner"
        className="text-xs"
      />
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {item.completed && item.completed_at
          ? format(new Date(item.completed_at), "MMM d")
          : ""}
      </span>
      <Button size="sm" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
