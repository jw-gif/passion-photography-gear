import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  Camera,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  User as UserIcon,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  gearRequestBadgeClasses,
  gearRequestStatusLabel,
  PHOTO_REQUEST_STATUSES,
  statusBadgeClasses,
  statusLabel,
  type GearRequestStatus,
  type PhotoRequestStatus,
} from "@/lib/orgs";
import { locationLabel } from "@/lib/locations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DetailEvent =
  | { kind: "photo"; id: string }
  | { kind: "gear"; id: string };

interface PhotoDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  team: string | null;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  spans_multiple_days: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  status: PhotoRequestStatus;
  on_site_contact_name: string | null;
  on_site_contact_phone: string | null;
}

interface GearDetail {
  id: string;
  requestor_name: string;
  location: string;
  needed_date: string;
  notes: string | null;
  status: GearRequestStatus;
}

interface GearItemRow {
  id: string;
  gear_id: number;
}

interface GearRow {
  id: number;
  name: string;
}

interface Props {
  event: DetailEvent | null;
  onClose: () => void;
  onChanged?: () => void;
}

export function EventDetailDialog({ event, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [gear, setGear] = useState<GearDetail | null>(null);
  const [gearItems, setGearItems] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!event) {
      setPhoto(null);
      setGear(null);
      setGearItems([]);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.kind, event?.id]);

  async function load() {
    if (!event) return;
    setLoading(true);
    try {
      if (event.kind === "photo") {
        const { data, error } = await supabase
          .from("photo_requests")
          .select(
            "id, first_name, last_name, email, company, team, event_name, event_location, event_date, event_end_date, spans_multiple_days, start_time, end_time, notes, status, on_site_contact_name, on_site_contact_phone",
          )
          .eq("id", event.id)
          .maybeSingle();
        if (error) throw error;
        setPhoto((data as PhotoDetail | null) ?? null);
      } else {
        const [{ data: req, error: reqErr }, { data: items, error: itemsErr }] =
          await Promise.all([
            supabase
              .from("gear_requests")
              .select("id, requestor_name, location, needed_date, notes, status")
              .eq("id", event.id)
              .maybeSingle(),
            supabase
              .from("gear_request_items")
              .select("id, gear_id")
              .eq("request_id", event.id),
          ]);
        if (reqErr) throw reqErr;
        if (itemsErr) throw itemsErr;
        setGear((req as GearDetail | null) ?? null);
        const ids = (items as GearItemRow[] | null)?.map((i) => i.gear_id) ?? [];
        if (ids.length) {
          const { data: g } = await supabase
            .from("gear")
            .select("id, name")
            .in("id", ids);
          setGearItems(((g as GearRow[] | null) ?? []).map((x) => ({ id: x.id, name: x.name })));
        } else {
          setGearItems([]);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  }

  async function setPhotoStatus(next: PhotoRequestStatus) {
    if (!photo) return;
    setSaving(true);
    const reviewer = user?.email ?? null;
    const { error } = await supabase
      .from("photo_requests")
      .update({
        status: next,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer,
      })
      .eq("id", photo.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPhoto({ ...photo, status: next });
    toast.success(`Marked ${statusLabel(next)}`);
    onChanged?.();
  }

  async function setGearStatus(next: GearRequestStatus) {
    if (!gear) return;
    setSaving(true);
    const reviewer = user?.email ?? null;
    const { error } = await supabase
      .from("gear_requests")
      .update({
        status: next,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer,
      })
      .eq("id", gear.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setGear({ ...gear, status: next });
    toast.success(`Marked ${gearRequestStatusLabel(next)}`);
    onChanged?.();
  }

  const open = event !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : event?.kind === "photo" && photo ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <Camera className="size-3.5" /> Photography Request
              </div>
              <DialogTitle className="text-xl">
                {photo.event_name || `${photo.first_name} ${photo.last_name}`}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      statusBadgeClasses(photo.status),
                    )}
                  >
                    {statusLabel(photo.status)}
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {photo.event_date && (
                <Row icon={<CalendarIcon className="size-4" />}>
                  {format(parseISO(photo.event_date), "EEEE, MMM d, yyyy")}
                  {photo.spans_multiple_days && photo.event_end_date &&
                    ` → ${format(parseISO(photo.event_end_date), "MMM d")}`}
                  {(photo.start_time || photo.end_time) && (
                    <span className="text-muted-foreground">
                      {" · "}
                      {photo.start_time?.slice(0, 5)}
                      {photo.end_time && ` – ${photo.end_time.slice(0, 5)}`}
                    </span>
                  )}
                </Row>
              )}
              {photo.event_location && (
                <Row icon={<MapPin className="size-4" />}>{photo.event_location}</Row>
              )}
              <Row icon={<UserIcon className="size-4" />}>
                {photo.first_name} {photo.last_name}
                <span className="text-muted-foreground"> · {photo.company}</span>
                {photo.team && <span className="text-muted-foreground"> · {photo.team}</span>}
              </Row>
              {photo.on_site_contact_name && (
                <div className="text-xs text-muted-foreground">
                  On-site: {photo.on_site_contact_name}
                  {photo.on_site_contact_phone && ` · ${photo.on_site_contact_phone}`}
                </div>
              )}
              {photo.notes && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                  {photo.notes}
                </div>
              )}

              <div className="pt-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                  value={photo.status}
                  onValueChange={(v) => setPhotoStatus(v as PhotoRequestStatus)}
                  disabled={saving}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHOTO_REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/requests-photography">
                  Open full request <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : event?.kind === "gear" && gear ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <Wrench className="size-3.5" /> Gear Request
              </div>
              <DialogTitle className="text-xl">{gear.requestor_name}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      gearRequestBadgeClasses(gear.status),
                    )}
                  >
                    {gearRequestStatusLabel(gear.status)}
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <Row icon={<CalendarIcon className="size-4" />}>
                {format(parseISO(gear.needed_date), "EEEE, MMM d, yyyy")}
              </Row>
              <Row icon={<MapPin className="size-4" />}>
                {locationLabel(gear.location)}
              </Row>
              {gearItems.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Items ({gearItems.length})
                  </div>
                  <ul className="rounded-md border bg-muted/20 divide-y text-xs">
                    {gearItems.map((it) => (
                      <li key={it.id} className="px-3 py-1.5">
                        {it.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {gear.notes && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                  {gear.notes}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
              {gear.status !== "approved" && (
                <Button
                  size="sm"
                  onClick={() => setGearStatus("approved")}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="size-3.5" /> Approve
                </Button>
              )}
              {gear.status !== "denied" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGearStatus("denied")}
                  disabled={saving}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <X className="size-3.5" /> Deny
                </Button>
              )}
              {gear.status !== "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setGearStatus("pending")}
                  disabled={saving}
                >
                  Reset to pending
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="ml-auto">
                <Link to="/admin/requests-gear">
                  Open full request <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Not found.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
