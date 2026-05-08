import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { PlayCircle, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/training")({
  head: () => ({ meta: [{ title: "Training videos · Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => {
    const { signOut } = useAuth();
    return (
      <RequireAdmin requireAdmin>
        <main className="min-h-screen">
          <HubHeader onLogout={() => signOut()} title="Training" subtitle="Videos & workshops" />
          <TrainingAdmin />
        </main>
      </RequireAdmin>
    );
  },
});

interface Row {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  video_url: string;
  thumbnail_url: string | null;
  sort_order: number;
  published: boolean;
}

function TrainingAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("training_videos").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(r: Row) {
    if (!confirm("Delete this video?")) return;
    if (r.video_url.startsWith("training-videos/")) {
      await supabase.storage.from("training-videos").remove([r.video_url.replace("training-videos/", "")]);
    }
    const { error } = await supabase.from("training_videos").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training videos</h1>
          <p className="text-sm text-muted-foreground">Upload videos for the photographer team.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Add video</Button>
      </div>
      {loading ? <Card className="p-12 text-center text-sm text-muted-foreground">Loading…</Card>
       : rows.length === 0 ? <Card className="p-12 text-center text-sm text-muted-foreground">No videos yet.</Card>
       : <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((v) => (
            <Card key={v.id} className="p-3 flex gap-3">
              <div className="size-20 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {v.thumbnail_url
                  ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                  : <PlayCircle className="size-7 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{v.title}</span>
                  {!v.published && <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">Draft</span>}
                </div>
                {v.category && <div className="text-xs text-muted-foreground mt-0.5">{v.category}</div>}
                {v.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>}
                <div className="mt-2 flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(v)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>}
      <VideoEditor open={open} onClose={() => setOpen(false)} initial={editing} onSaved={load} />
    </div>
  );
}

function VideoEditor({ open, onClose, initial, onSaved }:
  { open: boolean; onClose: () => void; initial: Row | null; onSaved: () => void; }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumb, setThumb] = useState("");
  const [order, setOrder] = useState(0);
  const [published, setPublished] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setCategory(initial?.category ?? "");
    setVideoUrl(initial?.video_url ?? "");
    setThumb(initial?.thumbnail_url ?? "");
    setOrder(initial?.sort_order ?? 0);
    setPublished(initial?.published ?? true);
  }, [initial, open]);

  async function uploadFile(file: File) {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("training-videos").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    setVideoUrl(`training-videos/${path}`);
    toast.success("Uploaded");
  }

  async function save() {
    if (!title.trim() || !videoUrl.trim()) { toast.error("Title and video are required"); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      video_url: videoUrl.trim(),
      thumbnail_url: thumb.trim() || null,
      sort_order: Number(order) || 0,
      published,
    };
    const { error } = initial
      ? await supabase.from("training_videos").update(payload).eq("id", initial.id)
      : await supabase.from("training_videos").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onClose(); onSaved(); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Edit video" : "Add video"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Lighting" /></div>
            <div><Label>Sort order</Label><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></div>
          </div>
          <div>
            <Label>Video</Label>
            <div className="flex items-center gap-2">
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="URL or storage path" />
              <input type="file" accept="video/*" ref={fileRef} hidden
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
              <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paste a YouTube/Vimeo URL or upload a file.</p>
          </div>
          <div><Label>Thumbnail URL</Label><Input value={thumb} onChange={(e) => setThumb(e.target.value)} placeholder="https://…" /></div>
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
