import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { LOCATIONS, locationLabel } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GearIcon } from "@/lib/gear-icons";
import pccLogo from "@/assets/pcc-logo.png";
import { Calendar as CalendarIcon, Check, Search, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request Gear · Passion Photography" },
      { name: "description", content: "Submit a request for photography gear at a specific location and date." },
      { property: "og:title", content: "Request Gear · Passion Photography" },
      { property: "og:description", content: "Submit a request for photography gear at a specific location and date." },
    ],
  }),
  component: RequestPage,
});

interface GearRow {
  id: number;
  name: string;
  icon_kind: string | null;
  status: "active" | "out_of_service" | "out_for_repair";
}

function RequestPage() {
  const [gear, setGear] = useState<GearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedGear, setSelectedGear] = useState<Set<number>>(new Set());

  const [name, setName] = useState("");
  const [location, setLocation] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gear")
        .select("id, name, icon_kind, status")
        .eq("status", "active")
        .order("name", { ascending: true });
      setGear((data || []) as GearRow[]);
      setLoading(false);
    })();
  }, []);

  const filteredGear = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gear;
    return gear.filter((g) => g.name.toLowerCase().includes(q));
  }, [gear, query]);

  function toggleGear(id: number) {
    setSelectedGear((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setErrors((e) => ({ ...e, gear: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const requestor = name.trim();
    const newErrors: Record<string, string> = {};
    if (!requestor) newErrors.name = "Please enter your name";
    if (selectedGear.size === 0) newErrors.gear = "Please select at least one gear item";
    if (!location) newErrors.location = "Please select a location";
    if (!date) newErrors.date = "Please pick a date";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setSubmitting(true);
    const { data: req, error: reqErr } = await supabase
      .from("gear_requests")
      .insert({
        requestor_name: requestor,
        location: location,
        needed_date: format(date!, "yyyy-MM-dd"),
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (reqErr || !req) {
      toast.error("Couldn't submit request", { description: reqErr?.message });
      setSubmitting(false);
      return;
    }

    const items = Array.from(selectedGear).map((gid) => ({
      request_id: req.id,
      gear_id: gid,
    }));
    const { error: itemsErr } = await supabase.from("gear_request_items").insert(items);
    if (itemsErr) {
      toast.error("Request submitted but gear list failed to save", { description: itemsErr.message });
    }

    setSubmitting(false);
    setSuccess(true);
    toast.success("Request submitted!");
    // Reset form
    setSelectedGear(new Set());
    setNotes("");
    setDate(undefined);
    setLocation("");
    setName("");
    setQuery("");
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="size-14 rounded-full bg-loc-trilith/15 mx-auto flex items-center justify-center">
            <Check className="size-7 text-loc-trilith" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Request submitted</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Thanks! An admin will review your request shortly.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => setSuccess(false)} size="lg">Submit another request</Button>
            <Button asChild variant="ghost">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="px-4 sm:px-6 py-4 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
              <img src={pccLogo} alt="PCC" className="size-5 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-tight">Request Gear</div>
              <div className="text-xs text-muted-foreground">Passion Photography</div>
            </div>
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Request gear</h1>
          <p className="mt-2 text-muted-foreground">
            Tell us what you need, where, and when — we'll get it ready for you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <Card className="p-5">
            <label className="text-sm font-semibold block mb-3" htmlFor="requestor-name">
              Your name <span className="text-destructive">*</span>
            </label>
            <Input
              id="requestor-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((er) => ({ ...er, name: "" }));
              }}
              placeholder="Enter your name"
              maxLength={50}
            />
            {errors.name && <p className="text-destructive text-sm mt-2">{errors.name}</p>}
          </Card>

          {/* Gear multi-select */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 gap-3">
              <label className="text-sm font-semibold">
                Gear needed <span className="text-destructive">*</span>
              </label>
              {selectedGear.size > 0 && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                  {selectedGear.size} selected
                </span>
              )}
            </div>

            <div className="relative mb-3">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search gear…"
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Loading gear…</div>
            ) : filteredGear.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No gear matches your search.</div>
            ) : (
              <div className="max-h-72 overflow-y-auto -mx-1 pr-1 space-y-1">
                {filteredGear.map((g) => {
                  const checked = selectedGear.has(g.id);
                  return (
                    <label
                      key={g.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors border-2",
                        checked
                          ? "bg-primary/5 border-primary/40"
                          : "border-transparent hover:bg-muted/60",
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleGear(g.id)} />
                      <GearIcon name={g.name} iconKind={g.icon_kind} className="size-5 text-foreground/70" />
                      <span className="text-sm font-medium flex-1">{g.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {errors.gear && <p className="text-destructive text-sm mt-2">{errors.gear}</p>}
          </Card>

          {/* Location + Date */}
          <Card className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold block mb-3">
                Location <span className="text-destructive">*</span>
              </label>
              <Select
                value={location}
                onValueChange={(v) => {
                  setLocation(v);
                  setErrors((e) => ({ ...e, location: "" }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{locationLabel(loc)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location && <p className="text-destructive text-sm mt-2">{errors.location}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold block mb-3">
                Date needed <span className="text-destructive">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="size-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      setErrors((e) => ({ ...e, date: "" }));
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {errors.date && <p className="text-destructive text-sm mt-2">{errors.date}</p>}
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-5">
            <label className="text-sm font-semibold block mb-2" htmlFor="notes">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else we should know?"
              maxLength={500}
              rows={3}
            />
          </Card>

          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            <Send className="size-4" />
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </form>
      </div>
    </main>
  );
}
