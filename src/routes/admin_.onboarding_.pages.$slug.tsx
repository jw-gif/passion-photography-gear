import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlocksEditor } from "@/components/onboarding-blocks-editor";
import { BlocksRenderer } from "@/components/onboarding-blocks-renderer";
import { type ContentBlock, safeBlocks } from "@/lib/onboarding";

export const Route = createFileRoute("/admin_/onboarding_/pages/$slug")({
  head: () => ({ meta: [{ title: "Edit page · Staff Onboarding" }] }),
  component: PageWrapper,
});

function PageWrapper() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <Editor onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function Editor({ onLogout }: { onLogout: () => void }) {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [pageId, setPageId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("onboarding_pages")
        .select("id, title, subtitle, blocks")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) {
        toast.error("Page not found");
        navigate({ to: "/admin/onboarding" });
        return;
      }
      setPageId(data.id);
      setTitle(data.title);
      setSubtitle(data.subtitle ?? "");
      setBlocks(safeBlocks(data.blocks));
      setLoading(false);
    })();
  }, [slug, navigate]);

  async function save() {
    if (!pageId) return;
    setSaving(true);
    const { error } = await supabase
      .from("onboarding_pages")
      .update({
        title,
        subtitle: subtitle.trim() || null,
        blocks: JSON.parse(JSON.stringify(blocks)),
      })
      .eq("id", pageId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Edit page" subtitle="Staff Onboarding" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/onboarding">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button onClick={save} disabled={saving || loading} size="sm">
            <Save className="size-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <Card className="p-4 mb-4 space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Subtitle</Label>
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
            </Card>

            <Tabs defaultValue="edit">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-4">
                <BlocksEditor blocks={blocks} onChange={setBlocks} />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <div className="mb-4">
                  <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                  )}
                </div>
                <BlocksRenderer blocks={blocks} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </main>
  );
}
