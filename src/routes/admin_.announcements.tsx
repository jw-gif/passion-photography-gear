import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Megaphone, Plus, Pencil, Trash2, Pin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/announcements")({
  head: () => ({ meta: [{ title: "Announcements · Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => {
    const { signOut } = useAuth();
    return (
      <RequireAdmin requireAdmin>
        <main className="min-h-screen">
          <HubHeader onLogout={() => signOut()} title="Announcements" subtitle="Posts to the team" />
          <AnnouncementsAdmin />
        </main>
      </RequireAdmin>
    );
  },
});

interface Row { id: string; title: string; body: string; pinned: boolean; published: boolean; published_at: string; }

function AnnouncementsAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("announcements")
      .select("id, title, body, pinned, published, published_at")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">Post updates to the photographer dashboard.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> New post</Button>
      </div>
      {loading ? <Card className="p-12 text-center text-sm text-muted-foreground">Loading…</Card>
       : rows.length === 0 ? <Card className="p-12 text-center text-sm text-muted-foreground">No announcements yet.</Card>
       : <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Megaphone className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.pinned && <Pin className="size-3.5 text-amber-600" />}
                    <span className="font-semibold">{a.title}</span>
                    {!a.published && <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">Draft</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{format(parseISO(a.published_at), "PPP p")}</div>
                  {a.body && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.body}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>}
      <Editor open={open} onClose={() => setOpen(false)} initial={editing} onSaved={load} authorId={user?.id ?? null} />
    </div>
  );
}

function Editor({ open, onClose, initial, onSaved, authorId }:
  { open: boolean; onClose: () => void; initial: Row | null; onSaved: () => void; authorId: string | null }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setBody(initial?.body ?? "");
    setPinned(initial?.pinned ?? false);
    setPublished(initial?.published ?? true);
  }, [initial, open]);

  async function save() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const payload = { title: title.trim(), body: body.trim(), pinned, published, author_id: authorId };
    const { error } = initial
      ? await supabase.from("announcements").update(payload).eq("id", initial.id)
      : await supabase.from("announcements").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onClose(); onSaved(); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Edit announcement" : "New announcement"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <div className="flex items-center justify-between"><Label>Pin to top</Label><Switch checked={pinned} onCheckedChange={setPinned} /></div>
          <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={published} onCheckedChange={setPublished} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
