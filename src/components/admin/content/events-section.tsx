import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Pencil, Trash2, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  cover_image_url: string | null;
  published: boolean;
}

export function EventsSection() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: false });
    const list = (data ?? []) as EventRow[];
    setRows(list);
    if (list.length) {
      const { data: r } = await supabase.from("event_rsvps").select("event_id").in("event_id", list.map((e) => e.id));
      const c: Record<string, number> = {};
      for (const row of (r ?? []) as { event_id: string }[]) c[row.event_id] = (c[row.event_id] ?? 0) + 1;
      setCounts(c);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this event? RSVPs will be removed.")) return;
    await supabase.from("event_rsvps").delete().eq("event_id", id);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">Create workshops, meetups, and trainings.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> New event</Button>
      </div>
      {loading ? <Card className="p-12 text-center text-sm text-muted-foreground">Loading…</Card>
       : rows.length === 0 ? <Card className="p-12 text-center text-sm text-muted-foreground">No events yet.</Card>
       : <div className="space-y-3">
          {rows.map((e) => (
            <Card key={e.id} className="p-4 flex items-start gap-3">
              <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{e.title}</span>
                  {!e.published && <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">Draft</span>}
                </div>
                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  <span>{format(parseISO(e.starts_at), "PPP p")}</span>
                  {e.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {e.location}</span>}
                  <span className="inline-flex items-center gap-1"><Users className="size-3" /> {counts[e.id] ?? 0}{e.capacity ? ` / ${e.capacity}` : ""} RSVPs</span>
                </div>
                {e.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{e.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(e.id)}><Trash2 className="size-4" /></Button>
              </div>
            </Card>
          ))}
        </div>}
      <EventDialog open={open} onClose={() => setOpen(false)} initial={editing} onSaved={load} />
    </div>
  );
}

function EventDialog({ open, onClose, initial, onSaved }:
  { open: boolean; onClose: () => void; initial: EventRow | null; onSaved: () => void; }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [cover, setCover] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setLocation(initial?.location ?? "");
    setStartsAt(initial?.starts_at ? initial.starts_at.slice(0, 16) : "");
    setEndsAt(initial?.ends_at ? initial.ends_at.slice(0, 16) : "");
    setCapacity(initial?.capacity?.toString() ?? "");
    setCover(initial?.cover_image_url ?? "");
    setPublished(initial?.published ?? true);
  }, [initial, open]);

  async function save() {
    if (!title.trim() || !startsAt) { toast.error("Title and start time are required"); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      capacity: capacity ? Number(capacity) : null,
      cover_image_url: cover.trim() || null,
      published,
    };
    const { error } = initial
      ? await supabase.from("events").update(payload).eq("id", initial.id)
      : await supabase.from("events").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onClose(); onSaved(); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Starts at</Label><Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
            <div><Label>Ends at</Label><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div><Label>Capacity</Label><Input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
          </div>
          <div><Label>Cover image URL</Label><Input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" /></div>
          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
