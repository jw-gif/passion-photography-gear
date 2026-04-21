import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOCATIONS, MOVERS, locationClasses, formatDate, getSubLocations, type Location } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Camera, Check, ArrowRight } from "lucide-react";
import { GearIcon } from "@/lib/gear-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Search {
  gear?: number;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    gear: search.gear ? Number(search.gear) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Passion Photography Gear Tracking" },
      { name: "description", content: "Track photography gear locations across 515, Cumberland, and Trilith." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { gear } = Route.useSearch();
  if (gear) return <PublicGearView gearId={gear} />;
  return <Landing />;
}

function Landing() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <Camera className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Passion Photography Gear</span>
        </div>
        <Link to="/admin">
          <Button variant="outline" size="sm">Admin</Button>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Photography Gear Tracking
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Scan a gear tag's QR code to view or update its location.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/admin">
              <Button size="lg">
                Open admin dashboard
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

interface GearRow {
  id: number;
  name: string;
  current_location: string;
  sub_location: string | null;
  last_note: string | null;
  last_updated: string;
  moved_by: string | null;
}

function PublicGearView({ gearId }: { gearId: number }) {
  const [gear, setGear] = useState<GearRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<Location>("515");
  const [subLocChoice, setSubLocChoice] = useState<string>("");
  const [otherSubLoc, setOtherSubLoc] = useState("");
  const [subLocError, setSubLocError] = useState("");
  const [note, setNote] = useState("");
  const [moverChoice, setMoverChoice] = useState<string>("");
  const [otherName, setOtherName] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gear")
        .select("*")
        .eq("id", gearId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setGear(data as GearRow);
        setSelectedLoc(data.current_location as Location);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [gearId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gear) return;

    const movedBy =
      moverChoice === "Other" ? otherName.trim() : moverChoice;
    if (!movedBy) {
      setNameError(
        moverChoice === "Other"
          ? "Please enter your name"
          : "Please select your name",
      );
      return;
    }
    setNameError("");

    setSubmitting(true);
    const trimmedNote = note.trim() || null;
    const { error: updateErr } = await supabase
      .from("gear")
      .update({
        current_location: selectedLoc,
        last_note: trimmedNote,
        last_updated: new Date().toISOString(),
        moved_by: movedBy,
      })
      .eq("id", gear.id);
    if (!updateErr) {
      await supabase.from("gear_history").insert({
        gear_id: gear.id,
        location: selectedLoc,
        note: trimmedNote,
        moved_by: movedBy,
      });
      // refresh
      const { data } = await supabase
        .from("gear")
        .select("*")
        .eq("id", gear.id)
        .maybeSingle();
      if (data) setGear(data as GearRow);
      setNote("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-muted-foreground">Loading…</div>
      </main>
    );
  }
  if (notFound || !gear) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Gear not found</h1>
          <p className="text-muted-foreground mt-2">No item with ID {gearId}.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="size-7 rounded-full bg-primary flex items-center justify-center">
            <Camera className="size-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Passion Photography Gear</span>
        </div>

        <GearIcon name={gear.name} className="size-12 text-foreground/80 mb-4" />

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          {gear.name}
        </h1>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Current location
          </div>
          <div
            className={cn(
              "inline-flex items-center px-5 py-3 rounded-full text-2xl font-bold",
              locationClasses(gear.current_location),
            )}
          >
            {gear.current_location}
          </div>
        </div>

        <div className="mt-6 space-y-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Last updated
          </div>
          <div className="text-sm">
            {formatDate(gear.last_updated)}
            {gear.moved_by && (
              <span className="text-muted-foreground"> · by {gear.moved_by}</span>
            )}
          </div>
          {gear.last_note && (
            <div className="text-sm text-muted-foreground italic pt-1">
              "{gear.last_note}"
            </div>
          )}
        </div>

        <Card className="mt-10 p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="text-sm font-semibold mb-3">Move to</div>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSelectedLoc(loc)}
                    className={cn(
                      "py-3 rounded-lg text-sm font-semibold border-2 transition-all",
                      selectedLoc === loc
                        ? cn(locationClasses(loc), "border-transparent")
                        : "bg-background border-border text-foreground hover:border-foreground/30",
                    )}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2" htmlFor="mover">
                Your name <span className="text-destructive">*</span>
              </label>
              <Select
                value={moverChoice}
                onValueChange={(v) => {
                  setMoverChoice(v);
                  setNameError("");
                }}
              >
                <SelectTrigger id="mover" className="w-full">
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  {MOVERS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {moverChoice === "Other" && (
                <Input
                  className="mt-2"
                  value={otherName}
                  onChange={(e) => {
                    setOtherName(e.target.value);
                    setNameError("");
                  }}
                  placeholder="Enter your name"
                  maxLength={50}
                  autoFocus
                />
              )}
              {nameError && (
                <p className="text-destructive text-sm mt-2">{nameError}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2" htmlFor="note">
                Note (optional)
              </label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Left at FOH for Ivana"
                maxLength={200}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? "Updating…" : "Update location"}
            </Button>

            {success && (
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-loc-trilith bg-loc-trilith/10 rounded-lg py-3">
                <Check className="size-4" /> Location updated
              </div>
            )}
          </form>
        </Card>
      </div>
    </main>
  );
}
