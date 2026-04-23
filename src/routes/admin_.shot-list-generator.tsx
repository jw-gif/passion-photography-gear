import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Download, FileText, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { supabase } from "@/integrations/supabase/client";
import { ShotListEditor } from "@/components/shot-list-editor";
import {
  type Brief,
  emptyBrief,
  normalizeBrief,
  renderBriefAsSlack,
  renderBriefAsMarkdown,
} from "@/lib/shot-list";
import { LOCATIONS } from "@/lib/locations";
import { COMMON_SEGMENTS, getRoomsForLocation } from "@/lib/segments";
import { PHOTOGRAPHER_TIERS } from "@/lib/photographers";

export const Route = createFileRoute("/admin_/shot-list-generator")({
  head: () => ({
    meta: [
      { title: "Shot List Generator · Passion Photography Hub" },
      {
        name: "description",
        content:
          "Pick a location, rooms, and segments and generate a Passion-style photographer brief you can copy and paste.",
      },
    ],
  }),
  component: ShotListGeneratorRoute,
});

function ShotListGeneratorRoute() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <ShotListGeneratorPage onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

interface FormState {
  eventName: string;
  location: string;
  rooms: string[];
  customRoom: string;
  segments: string[];
  customSegment: string;
  roles: string[];
  callTime: string;
  wrapTime: string;
  doorCode: string;
  focus: string;
}

function emptyForm(): FormState {
  return {
    eventName: "",
    location: "",
    rooms: [],
    customRoom: "",
    segments: [],
    customSegment: "",
    roles: ["point", "door_holder"],
    callTime: "",
    wrapTime: "",
    doorCode: "",
    focus: "",
  };
}

function ShotListGeneratorPage({ onLogout }: { onLogout: () => void }) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [brief, setBrief] = useState<Brief>(emptyBrief());
  const [generating, setGenerating] = useState(false);

  const availableRooms = useMemo(() => getRoomsForLocation(form.location), [form.location]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleArr<T extends string>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  async function generate() {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-shot-list-standalone", {
        body: {
          event_name: form.eventName || undefined,
          location: form.location || undefined,
          rooms: form.rooms,
          segments: form.segments,
          roles: form.roles,
          call_time: form.callTime || undefined,
          wrap_time: form.wrapTime || undefined,
          door_code: form.doorCode || undefined,
          focus: form.focus || undefined,
        },
      });
      if (error) {
        // Edge function returns the error in `data` for non-2xx responses too
        const msg =
          (data as { error?: string } | null)?.error ?? error.message ?? "Generation failed";
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

  function clearBrief() {
    setBrief(emptyBrief());
  }

  const slackText = useMemo(() => renderBriefAsSlack(brief, form.eventName), [brief, form.eventName]);
  const markdown = useMemo(() => renderBriefAsMarkdown(brief, form.eventName), [brief, form.eventName]);

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Couldn't copy — please select and copy manually");
    }
  }

  function download() {
    const blob = new Blob([slackText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = (form.eventName || "shot-list")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    a.download = `${slug || "shot-list"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function addCustomRoom() {
    const v = form.customRoom.trim();
    if (!v) return;
    if (!form.rooms.includes(v)) patch("rooms", [...form.rooms, v]);
    patch("customRoom", "");
  }

  function addCustomSegment() {
    const v = form.customSegment.trim();
    if (!v) return;
    if (!form.segments.includes(v)) patch("segments", [...form.segments, v]);
    patch("customSegment", "");
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Shot List Generator" subtitle="Quick brief builder" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight">Shot List Generator</h1>
          <p className="text-sm text-muted-foreground">
            Pick a location, rooms, and segments. Generate a Passion-style brief you can edit and
            copy to Slack, email, or your call sheet doc.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inputs */}
          <Card className="p-4 space-y-4 lg:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Inputs
            </h2>

            <div>
              <Label htmlFor="event-name" className="text-xs">Event name (optional)</Label>
              <Input
                id="event-name"
                value={form.eventName}
                onChange={(e) => patch("eventName", e.target.value)}
                placeholder="Sunday Gathering"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Location</Label>
              <Select
                value={form.location}
                onValueChange={(v) => {
                  patch("location", v);
                  patch("rooms", []);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pick a location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.location && (
              <div>
                <Label className="text-xs">Rooms / spaces</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableRooms.map((r) => (
                    <ChipToggle
                      key={r}
                      active={form.rooms.includes(r)}
                      onClick={() => patch("rooms", toggleArr(form.rooms, r))}
                    >
                      {r}
                    </ChipToggle>
                  ))}
                  {form.rooms
                    .filter((r) => !availableRooms.includes(r))
                    .map((r) => (
                      <ChipToggle key={r} active onClick={() => patch("rooms", toggleArr(form.rooms, r))}>
                        {r}
                      </ChipToggle>
                    ))}
                </div>
                <div className="flex gap-1 mt-2">
                  <Input
                    value={form.customRoom}
                    onChange={(e) => patch("customRoom", e.target.value)}
                    placeholder="Add custom room…"
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomRoom();
                      }
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addCustomRoom}>
                    Add
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Segments</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_SEGMENTS.map((s) => (
                  <ChipToggle
                    key={s.title}
                    active={form.segments.includes(s.title)}
                    onClick={() => patch("segments", toggleArr(form.segments, s.title))}
                  >
                    {s.title}
                  </ChipToggle>
                ))}
                {form.segments
                  .filter((s) => !COMMON_SEGMENTS.some((c) => c.title === s))
                  .map((s) => (
                    <ChipToggle
                      key={s}
                      active
                      onClick={() => patch("segments", toggleArr(form.segments, s))}
                    >
                      {s}
                    </ChipToggle>
                  ))}
              </div>
              <div className="flex gap-1 mt-2">
                <Input
                  value={form.customSegment}
                  onChange={(e) => patch("customSegment", e.target.value)}
                  placeholder="Add custom segment…"
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSegment();
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline" onClick={addCustomSegment}>
                  Add
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Roles to cover</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {PHOTOGRAPHER_TIERS.map((t) => (
                  <ChipToggle
                    key={t.value}
                    active={form.roles.includes(t.value)}
                    onClick={() => patch("roles", toggleArr(form.roles, t.value))}
                  >
                    {t.short}
                  </ChipToggle>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="call-time" className="text-xs">Call time</Label>
                <Input
                  id="call-time"
                  value={form.callTime}
                  onChange={(e) => patch("callTime", e.target.value)}
                  placeholder="9:00 AM"
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="wrap" className="text-xs">Wrap</Label>
                <Input
                  id="wrap"
                  value={form.wrapTime}
                  onChange={(e) => patch("wrapTime", e.target.value)}
                  placeholder="12:30 PM"
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="door" className="text-xs">Door code</Label>
              <Input
                id="door"
                value={form.doorCode}
                onChange={(e) => patch("doorCode", e.target.value)}
                placeholder="1234#"
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="focus" className="text-xs">
                Anything special this week?
              </Label>
              <Textarea
                id="focus"
                value={form.focus}
                onChange={(e) => patch("focus", e.target.value)}
                placeholder="e.g. baptism Sunday, sponsor signage, new building tour"
                rows={3}
                className="mt-1"
              />
            </div>

            <Button onClick={generate} disabled={generating} className="w-full">
              <Wand2 className="size-4" />
              {generating
                ? "Generating…"
                : brief.segments.length
                  ? "Regenerate brief"
                  : "Generate brief"}
            </Button>
          </Card>

          {/* Editor */}
          <Card className="p-4 lg:col-span-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Brief
              </h2>
              {brief.segments.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={clearBrief}>
                  Clear
                </Button>
              )}
            </div>
            {brief.segments.length === 0 && !generating ? (
              <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">
                <FileText className="size-8 mx-auto mb-2 opacity-50" />
                Pick your inputs and tap <strong>Generate brief</strong> to start.
              </div>
            ) : (
              <ShotListEditor brief={brief} onChange={setBrief} />
            )}
          </Card>

          {/* Output */}
          <Card className="p-4 lg:col-span-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Output
              </h2>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(slackText, "Slack")}
                  disabled={brief.segments.length === 0}
                >
                  <Copy className="size-4" /> Slack
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(markdown, "Markdown")}
                  disabled={brief.segments.length === 0}
                >
                  <Copy className="size-4" /> MD
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={download}
                  disabled={brief.segments.length === 0}
                >
                  <Download className="size-4" />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="slack">
              <TabsList className="mb-3">
                <TabsTrigger value="slack">Slack</TabsTrigger>
                <TabsTrigger value="markdown">Markdown</TabsTrigger>
              </TabsList>
              <TabsContent value="slack">
                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-[60vh] overflow-y-auto">
                  {slackText.trim() || "Generate a brief to see the preview."}
                </pre>
              </TabsContent>
              <TabsContent value="markdown">
                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-[60vh] overflow-y-auto">
                  {markdown.trim() || "Generate a brief to see the preview."}
                </pre>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </main>
  );
}

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-2 py-1 rounded-full border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted text-foreground border-border"
      )}
    >
      {children}
    </button>
  );
}
