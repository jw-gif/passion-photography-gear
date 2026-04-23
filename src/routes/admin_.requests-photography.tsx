import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Inbox,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Trash2,
  Search,
  Settings,
  History,
  Users as UsersIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { toast } from "sonner";
import { HubHeader } from "@/components/hub-header";
import { CoverageRoster } from "@/components/coverage-roster";
import {
  PHOTO_REQUEST_STATUSES,
  REQUEST_TYPES,
  COVERAGE_TYPES,
  statusBadgeClasses,
  statusLabel,
  type PhotoRequestStatus,
} from "@/lib/orgs";

export const Route = createFileRoute("/admin_/requests-photography")({
  head: () => ({
    meta: [
      { title: "Photography Requests · Passion Photography Hub" },
      { name: "description", content: "Triage and manage incoming photography requests." },
    ],
  }),
  component: PhotoRequestsRoute,
});

interface PhotoRequest {
  id: string;
  company: string;
  team: string | null;
  first_name: string;
  last_name: string;
  email: string;
  request_types: string[];
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  spans_multiple_days: boolean;
  event_end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  on_site_contact_name: string | null;
  on_site_contact_phone: string | null;
  coverage_types: string[];
  coverage_other: string | null;
  budget: string | null;
  concur_budget_approver: string | null;
  concur_company: string | null;
  concur_class: string | null;
  concur_department: string | null;
  concur_expense_category: string | null;
  concur_project: string | null;
  concur_people_resource_type: string | null;
  notes: string | null;
  status: PhotoRequestStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  assigned_to: string | null;
  created_at: string;
}

function PhotoRequestsRoute() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <PhotoRequestsView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function PhotoRequestsView({ onLogout }: { onLogout: () => void }) {
  const { displayName } = useAuth();
  const reviewerName = displayName ?? "Admin";

  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"open" | "all">("open");
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const { data, error } = await supabase
      .from("photo_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(`Couldn't load requests: ${error.message}`);
    setRequests((data ?? []) as PhotoRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("photo_requests_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photo_requests" },
        () => loadAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (activeTab === "open" && (r.status === "completed" || r.status === "archived" || r.status === "declined")) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        r.first_name,
        r.last_name,
        r.email,
        r.company,
        r.team,
        r.event_name,
        r.event_location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, query, activeTab]);

  const openCount = requests.filter(
    (r) => r.status !== "completed" && r.status !== "archived" && r.status !== "declined"
  ).length;

  const detail = openDetailId ? requests.find((r) => r.id === openDetailId) ?? null : null;

  async function setStatus(req: PhotoRequest, status: PhotoRequestStatus) {
    const { error } = await supabase
      .from("photo_requests")
      .update({
        status,
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (error) toast.error(`Update failed: ${error.message}`);
    else toast.success(`Marked ${statusLabel(status)}`);
  }

  async function saveAdminNotes(req: PhotoRequest, notes: string, assignedTo: string) {
    const { error } = await supabase
      .from("photo_requests")
      .update({ admin_notes: notes || null, assigned_to: assignedTo || null })
      .eq("id", req.id);
    if (error) toast.error(`Save failed: ${error.message}`);
    else toast.success("Saved");
  }

  async function deleteRequest(req: PhotoRequest) {
    if (!confirm(`Delete request from ${req.first_name} ${req.last_name}?`)) return;
    const { error } = await supabase.from("photo_requests").delete().eq("id", req.id);
    if (error) toast.error(`Delete failed: ${error.message}`);
    else {
      toast.success("Deleted");
      setOpenDetailId(null);
    }
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Photography Requests" subtitle="Triage & assign" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Photography Requests</h1>
            <p className="text-sm text-muted-foreground">
              Triage incoming requests, assign coverage, and track status.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, event, company…"
              className="pl-9"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "open" | "all")}>
          <TabsList>
            <TabsTrigger value="open">
              Open
              {openCount > 0 && (
                <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {openCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <Inbox className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {activeTab === "open" ? "No open requests." : "No requests yet."}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => (
                  <RequestRow
                    key={r.id}
                    req={r}
                    onOpen={() => setOpenDetailId(r.id)}
                    onSetStatus={(s) => setStatus(r, s)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RequestDetailDialog
        request={detail}
        onClose={() => setOpenDetailId(null)}
        onSetStatus={(s) => detail && setStatus(detail, s)}
        onSave={(notes, assigned) => detail && saveAdminNotes(detail, notes, assigned)}
        onDelete={() => detail && deleteRequest(detail)}
      />
    </main>
  );
}

function RequestRow({
  req,
  onOpen,
  onSetStatus,
}: {
  req: PhotoRequest;
  onOpen: () => void;
  onSetStatus: (s: PhotoRequestStatus) => void;
}) {
  const types = req.request_types
    .map((v) => REQUEST_TYPES.find((t) => t.value === v)?.label ?? v)
    .join(", ");

  return (
    <Card
      className="p-4 hover:border-foreground/30 transition-colors cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full border",
                statusBadgeClasses(req.status)
              )}
            >
              {statusLabel(req.status)}
            </span>
            <span className="text-xs text-muted-foreground">{types}</span>
          </div>
          <div className="mt-1.5 font-semibold truncate">
            {req.event_name || `${req.first_name} ${req.last_name} — ${types}`}
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {req.first_name} {req.last_name}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span>{req.company}{req.team ? ` / ${req.team}` : ""}</span>
            {req.event_date && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3.5" />
                  {format(parseISO(req.event_date), "MMM d, yyyy")}
                </span>
              </>
            )}
            {req.event_location && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {req.event_location}
                </span>
              </>
            )}
          </div>
        </div>
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Select
            value={req.status}
            onValueChange={(v) => onSetStatus(v as PhotoRequestStatus)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
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
          <Button size="sm" variant="outline" onClick={onOpen}>
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RequestDetailDialog({
  request,
  onClose,
  onSetStatus,
  onSave,
  onDelete,
}: {
  request: PhotoRequest | null;
  onClose: () => void;
  onSetStatus: (s: PhotoRequestStatus) => void;
  onSave: (notes: string, assignedTo: string) => void;
  onDelete: () => void;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    setAdminNotes(request?.admin_notes ?? "");
    setAssignedTo(request?.assigned_to ?? "");
  }, [request?.id, request?.admin_notes, request?.assigned_to]);

  if (!request) return null;

  const types = request.request_types
    .map((v) => REQUEST_TYPES.find((t) => t.value === v)?.label ?? v)
    .join(", ");
  const coverage = request.coverage_types
    .map((v) => COVERAGE_TYPES.find((c) => c.value === v)?.label ?? v)
    .join(", ");

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full border",
                statusBadgeClasses(request.status)
              )}
            >
              {statusLabel(request.status)}
            </span>
            <span className="text-xs text-muted-foreground">{types}</span>
          </div>
          <DialogTitle className="text-xl">
            {request.event_name || `Request — ${request.first_name} ${request.last_name}`}
          </DialogTitle>
          <DialogDescription>
            Submitted {format(parseISO(request.created_at), "MMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Requestor */}
          <DetailSection title="Requestor">
            <DetailGrid>
              <DetailItem label="Name">
                {request.first_name} {request.last_name}
              </DetailItem>
              <DetailItem label="Company">
                {request.company}
                {request.team && <span className="text-muted-foreground"> / {request.team}</span>}
              </DetailItem>
              <DetailItem label="Email">
                <a href={`mailto:${request.email}`} className="hover:underline inline-flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {request.email}
                </a>
              </DetailItem>
            </DetailGrid>
          </DetailSection>

          {/* Event */}
          {(request.event_name || request.event_date) && (
            <DetailSection title="Event">
              <DetailGrid>
                {request.event_location && (
                  <DetailItem label="Location">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {request.event_location}
                    </span>
                  </DetailItem>
                )}
                {request.event_date && (
                  <DetailItem label="Date">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="size-3.5" />
                      {format(parseISO(request.event_date), "MMM d, yyyy")}
                      {request.spans_multiple_days && request.event_end_date &&
                        ` → ${format(parseISO(request.event_end_date), "MMM d, yyyy")}`}
                    </span>
                  </DetailItem>
                )}
                {(request.start_time || request.end_time) && (
                  <DetailItem label="Time">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {request.start_time?.slice(0, 5)} – {request.end_time?.slice(0, 5)}
                    </span>
                  </DetailItem>
                )}
                {coverage && <DetailItem label="Coverage">{coverage}</DetailItem>}
                {request.coverage_other && (
                  <DetailItem label="Other coverage">{request.coverage_other}</DetailItem>
                )}
                {request.on_site_contact_name && (
                  <DetailItem label="On-site contact">
                    <div>{request.on_site_contact_name}</div>
                    {request.on_site_contact_phone && (
                      <a
                        href={`tel:${request.on_site_contact_phone}`}
                        className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="size-3.5" />
                        {request.on_site_contact_phone}
                      </a>
                    )}
                  </DetailItem>
                )}
              </DetailGrid>
            </DetailSection>
          )}

          {/* Notes from requestor */}
          {request.notes && (
            <DetailSection title="Notes from requestor">
              <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
            </DetailSection>
          )}

          {/* Budget */}
          {(request.budget ||
            request.concur_budget_approver ||
            request.concur_company ||
            request.concur_class) && (
            <DetailSection title="Budget & Concur">
              <DetailGrid>
                {request.budget && <DetailItem label="Budget">{request.budget}</DetailItem>}
                {request.concur_budget_approver && (
                  <DetailItem label="Approver">{request.concur_budget_approver}</DetailItem>
                )}
                {request.concur_company && (
                  <DetailItem label="Company">{request.concur_company}</DetailItem>
                )}
                {request.concur_class && <DetailItem label="Class">{request.concur_class}</DetailItem>}
                {request.concur_department && (
                  <DetailItem label="Department">{request.concur_department}</DetailItem>
                )}
                {request.concur_expense_category && (
                  <DetailItem label="Expense Category">
                    {request.concur_expense_category}
                  </DetailItem>
                )}
                {request.concur_project && (
                  <DetailItem label="Project">{request.concur_project}</DetailItem>
                )}
                {request.concur_people_resource_type && (
                  <DetailItem label="People/Resource Type">
                    {request.concur_people_resource_type}
                  </DetailItem>
                )}
              </DetailGrid>
            </DetailSection>
          )}

          {/* Coverage roster */}
          <DetailSection title="Coverage roster">
            <p className="text-xs text-muted-foreground mb-3">
              Add openings for this shoot. Only Point openings have a budget; Door
              Holder and Training spots are unpaid coverage. Photographers will
              see only the openings they're eligible for.
            </p>
            <CoverageRoster requestId={request.id} />
          </DetailSection>

          {/* Brief / shot list */}
          <DetailSection title="Brief / shot list">
            <p className="text-xs text-muted-foreground mb-3">
              Generate an AI call sheet for this shoot. Photographers see only the
              segments their role is on.
            </p>
            <RequestBriefPanel requestId={request.id} eventName={request.event_name} />
          </DetailSection>

          {/* Admin workspace */}
          <DetailSection title="Admin workspace">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={request.status}
                  onValueChange={(v) => onSetStatus(v as PhotoRequestStatus)}
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
              <div>
                <Label className="text-xs" htmlFor="assigned-to">
                  Assigned to
                </Label>
                <Input
                  id="assigned-to"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Photographer or lead name"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs" htmlFor="admin-notes">
                Internal notes
              </Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notes for the photo team (not visible to requestor)"
                rows={3}
                className="mt-1"
                maxLength={4000}
              />
            </div>
            {request.reviewed_by && request.reviewed_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Last touched by <strong>{request.reviewed_by}</strong> on{" "}
                {format(parseISO(request.reviewed_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </DetailSection>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive sm:mr-auto">
            <Trash2 className="size-4" /> Delete
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onSave(adminNotes, assignedTo)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 bg-card/50">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5">{children}</div>
    </div>
  );
}
