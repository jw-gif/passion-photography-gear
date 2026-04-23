import { useEffect, useMemo, useState } from "react";
import { Copy, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShotListEditor } from "@/components/shot-list-editor";
import {
  type Brief,
  emptyBrief,
  normalizeBrief,
  renderBriefAsText,
  renderBriefAsMarkdown,
} from "@/lib/shot-list";

interface Props {
  requestId: string;
  eventName?: string | null;
}

export function RequestBriefPanel({ requestId, eventName }: Props) {
  const [brief, setBrief] = useState<Brief>(emptyBrief());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("photo_request_shot_lists")
        .select("brief")
        .eq("request_id", requestId)
        .maybeSingle();
      if (cancelled) return;
      if (error && error.code !== "PGRST116") {
        toast.error(`Couldn't load brief: ${error.message}`);
      }
      if (data?.brief) {
        setBrief(normalizeBrief(data.brief));
        setHasSaved(true);
      } else {
        setBrief(emptyBrief());
        setHasSaved(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  async function regenerate(focus: string) {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-shot-list", {
        body: { request_id: requestId, extra_prompt: focus || undefined },
      });
      if (error) {
        const msg = (data as { error?: string } | null)?.error ?? error.message;
        toast.error(msg);
        return;
      }
      const d = data as { brief?: unknown; error?: string };
      if (d.error) {
        toast.error(d.error);
        return;
      }
      if (d.brief) {
        setBrief(normalizeBrief(d.brief));
        toast.success("Brief generated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("photo_request_shot_lists")
      .upsert({ request_id: requestId, brief: brief as unknown as never }, { onConflict: "request_id" });
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    toast.success("Brief saved");
    setHasSaved(true);
  }

  async function clearSaved() {
    if (!confirm("Delete the saved brief for this request?")) return;
    const { error } = await supabase
      .from("photo_request_shot_lists")
      .delete()
      .eq("request_id", requestId);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setBrief(emptyBrief());
    setHasSaved(false);
    toast.success("Brief cleared");
  }

  const plainText = useMemo(() => renderBriefAsText(brief, eventName ?? undefined), [brief, eventName]);
  const markdown = useMemo(() => renderBriefAsMarkdown(brief, eventName ?? undefined), [brief, eventName]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading brief…</p>;

  return (
    <Tabs defaultValue="edit">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <div className="flex gap-1">
          {brief.segments.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => copy(plainText, "Plain text")}>
                <Copy className="size-4" /> Copy
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="size-4" /> {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
          {hasSaved && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={clearSaved}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <TabsContent value="edit">
        <ShotListEditor brief={brief} onChange={setBrief} onRegenerate={regenerate} generating={generating} />
      </TabsContent>
      <TabsContent value="preview">
        <Tabs defaultValue="plain">
          <TabsList className="mb-2">
            <TabsTrigger value="plain">Plain text</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
          </TabsList>
          <TabsContent value="plain">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-[60vh] overflow-y-auto">
              {plainText.trim() || "No brief yet."}
            </pre>
          </TabsContent>
          <TabsContent value="markdown">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-[60vh] overflow-y-auto">
              {markdown.trim() || "No brief yet."}
            </pre>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
