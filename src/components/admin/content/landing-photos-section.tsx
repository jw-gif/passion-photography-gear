import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, Upload, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface Row { id: string; image_url: string; alt_text: string | null; sort_order: number; }

export function LandingPhotosSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [alt, setAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("landing_photos").select("*").order("sort_order", { ascending: true });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function upload(file: File) {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("landing-photos").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("landing-photos").getPublicUrl(path);
    const nextOrder = (rows[rows.length - 1]?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("landing_photos").insert({
      image_url: pub.publicUrl, alt_text: alt.trim() || null, sort_order: nextOrder,
    });
    setUploading(false);
    if (error) toast.error(error.message);
    else { setAlt(""); toast.success("Added"); load(); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this photo?")) return;
    const { error } = await supabase.from("landing_photos").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  async function reorder(idx: number, dir: -1 | 1) {
    const a = rows[idx], b = rows[idx + dir];
    if (!a || !b) return;
    await supabase.from("landing_photos").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("landing_photos").update({ sort_order: a.sort_order }).eq("id", b.id);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Landing page photos</h1>
        <p className="text-sm text-muted-foreground">Photos shown in the gallery on the public sign-in page.</p>
      </div>

      <Card className="p-4 mb-6 space-y-3">
        <div>
          <Label>Alt text (optional)</Label>
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Worship night, 2025" />
        </div>
        <input type="file" accept="image/*" hidden ref={fileRef}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload photo"}
        </Button>
      </Card>

      {loading ? <Card className="p-12 text-center text-sm text-muted-foreground">Loading…</Card>
       : rows.length === 0 ? <Card className="p-12 text-center text-sm text-muted-foreground"><ImageIcon className="size-8 mx-auto mb-2" />No photos yet.</Card>
       : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {rows.map((r, i) => (
            <Card key={r.id} className="p-2">
              <div className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={r.image_url} alt={r.alt_text ?? ""} className="w-full h-full object-cover" />
              </div>
              {r.alt_text && <div className="text-xs text-muted-foreground mt-2 truncate">{r.alt_text}</div>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => reorder(i, -1)}><ArrowUp className="size-3.5" /></Button>
                  <Button size="sm" variant="ghost" disabled={i === rows.length - 1} onClick={() => reorder(i, 1)}><ArrowDown className="size-3.5" /></Button>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="size-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>}
    </div>
  );
}
