import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Mail,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import {
  PHOTOGRAPHER_TIERS,
  type PhotographerTier,
  tierLabel,
  tierBadgeClasses,
  generatePhotographerToken,
} from "@/lib/photographers";
import { PhotographerBulkImportDialog } from "@/components/photographer-bulk-import-dialog";

export const Route = createFileRoute("/admin_/photographers")({
  head: () => ({
    meta: [
      { title: "Photographers · Passion Photography Hub" },
      {
        name: "description",
        content: "Manage photographers and personal job-board links.",
      },
    ],
  }),
  component: PhotographersRoute,
});

interface Photographer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: PhotographerTier;
  token: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function PhotographersRoute() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <PhotographersView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function PhotographersView({ onLogout }: { onLogout: () => void }) {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Photographer | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("photographers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPhotographers((data ?? []) as Photographer[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("photographers_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photographers" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return photographers;
    return photographers.filter((p) =>
      [p.name, p.email, p.phone ?? "", p.tier].join(" ").toLowerCase().includes(q)
    );
  }, [photographers, query]);

  async function toggleActive(p: Photographer) {
    const { error } = await supabase
      .from("photographers")
      .update({ active: !p.active })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success(p.active ? "Deactivated" : "Activated");
  }

  async function deletePhotographer(p: Photographer) {
    if (
      !confirm(
        `Delete ${p.name}? Their personal link will stop working. Past assignments are preserved.`
      )
    )
      return;
    const { error } = await supabase.from("photographers").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("Deleted");
  }

  function jobsLink(token: string): string {
    if (typeof window === "undefined") return `/jobs?t=${token}`;
    return `${window.location.origin}/jobs?t=${token}`;
  }

  async function copyLink(p: Photographer) {
    const url = jobsLink(p.token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Link copied for ${p.name}`);
    } catch {
      toast.error("Couldn't copy. Long-press to copy manually.");
    }
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Photographers" subtitle="Job-board roster" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Photographers</h1>
            <p className="text-sm text-muted-foreground">
              Each photographer gets a personal link they use to claim shoots — no
              login required.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="pl-9"
              />
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" /> Add
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-4 px-3 py-2 rounded-md border bg-muted/30">
          ⚠️ These links are personal — anyone with the link can claim shoots as
          that photographer. Send via email/SMS only to the intended person.
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {photographers.length === 0
                ? "No photographers yet. Add one to get started."
                : "No matches."}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className={cn("p-4", !p.active && "opacity-60")}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{p.name}</span>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border",
                          tierBadgeClasses(p.tier)
                        )}
                      >
                        {tierLabel(p.tier)}
                      </span>
                      {!p.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <a
                        href={`mailto:${p.email}`}
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        <Mail className="size-3.5" />
                        {p.email}
                      </a>
                      {p.phone && (
                        <>
                          <span className="text-muted-foreground/60">·</span>
                          <span>{p.phone}</span>
                        </>
                      )}
                      <span className="text-muted-foreground/60">·</span>
                      <span>Added {format(parseISO(p.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => copyLink(p)}>
                      <Copy className="size-4" /> Copy link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <a href={jobsLink(p.token)} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" /> Open
                      </a>
                    </Button>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Switch
                        checked={p.active}
                        onCheckedChange={() => toggleActive(p)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePhotographer(p)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PhotographerDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        photographer={null}
      />
      <PhotographerDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        photographer={editing}
      />
    </main>
  );
}

function PhotographerDialog({
  open,
  onClose,
  photographer,
}: {
  open: boolean;
  onClose: () => void;
  photographer: Photographer | null;
}) {
  const isEdit = !!photographer;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<PhotographerTier>("door_holder");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(photographer?.name ?? "");
    setEmail(photographer?.email ?? "");
    setPhone(photographer?.phone ?? "");
    setTier(photographer?.tier ?? "door_holder");
  }, [photographer, open]);

  async function save() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    if (isEdit && photographer) {
      const { error } = await supabase
        .from("photographers")
        .update({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          tier,
        })
        .eq("id", photographer.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Saved");
        onClose();
      }
    } else {
      const { error } = await supabase.from("photographers").insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        tier,
        token: generatePhotographerToken(),
      });
      if (error) toast.error(error.message);
      else {
        toast.success(`${name} added`);
        onClose();
      }
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit photographer" : "Add photographer"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update name, email, phone, or tier. Their personal link does not change."
              : "We'll generate a personal link you can send via email or SMS."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ph-name">Name</Label>
            <Input id="ph-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ph-email">Email</Label>
            <Input
              id="ph-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ph-phone">Phone (optional)</Label>
            <Input
              id="ph-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 5555"
            />
          </div>
          <div>
            <Label>Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as PhotographerTier)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTOGRAPHER_TIERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Point sees paid Point shoots and can also pick up unpaid Door
              Holder spots. Door Holder sees Door Holder + Training. Training
              only sees Training spots.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            <Plus className="size-4" />
            {isEdit ? "Save" : "Add photographer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
