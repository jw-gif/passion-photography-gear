import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOCATIONS, locationClasses, formatDate } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isAdmin, setAdmin, ADMIN_PASSWORD } from "@/lib/admin-auth";
import { Camera, ArrowLeft, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/history")({
  head: () => ({
    meta: [
      { title: "Activity Log · Passion Gear Tracking" },
      { name: "description", content: "Chronological log of all gear location changes." },
    ],
  }),
  component: HistoryPage,
});

interface HistoryRow {
  id: string;
  gear_id: number;
  location: string;
  note: string | null;
  timestamp: string;
}

interface GearRow {
  id: number;
  name: string;
}

const PAGE_SIZE = 200;

function HistoryPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(isAdmin());
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (!authed) return <LoginGate onSuccess={() => setAuthed(true)} />;
  return <HistoryView onLogout={() => { setAdmin(false); setAuthed(false); }} />;
}

function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      setAdmin(true);
      onSuccess();
    } else {
      setError("Incorrect password");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <Camera className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Admin sign in</span>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2" htmlFor="pw">Password</label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(""); }}
              autoFocus
            />
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>
          <Button type="submit" className="w-full">Sign in</Button>
          <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </form>
      </Card>
    </main>
  );
}

function HistoryView({ onLogout }: { onLogout: () => void }) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [gear, setGear] = useState<GearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [locFilter, setLocFilter] = useState<string>("all");
  const [gearFilter, setGearFilter] = useState<string>("all");

  async function loadAll(currentLimit: number) {
    setLoading(true);
    const [{ data: h }, { data: g }] = await Promise.all([
      supabase
        .from("gear_history")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(currentLimit + 1),
      supabase.from("gear").select("id, name").order("id", { ascending: true }),
    ]);
    const rows = (h || []) as HistoryRow[];
    setHasMore(rows.length > currentLimit);
    setHistory(rows.slice(0, currentLimit));
    setGear((g || []) as GearRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll(limit);
    const channel = supabase
      .channel("gear-history-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gear_history" },
        () => loadAll(limit),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const gearMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of gear) m.set(g.id, g.name);
    return m;
  }, [gear]);

  const filtered = useMemo(() => {
    return history.filter((h) => {
      if (locFilter !== "all" && h.location !== locFilter) return false;
      if (gearFilter !== "all" && String(h.gear_id) !== gearFilter) return false;
      return true;
    });
  }, [history, locFilter, gearFilter]);

  return (
    <main className="min-h-screen">
      <header className="px-4 sm:px-6 py-4 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center">
              <Camera className="size-4" />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-tight">Activity Log</div>
              <div className="text-xs text-muted-foreground">All gear location changes</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">
                <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
              Location
            </label>
            <Select value={locFilter} onValueChange={setLocFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
              Gear
            </label>
            <Select value={gearFilter} onValueChange={setGearFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All gear</SelectItem>
                {gear.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && history.length === 0 ? (
          <div className="text-muted-foreground text-sm">Loading activity…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-12 text-center">
            No activity matches these filters
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Card className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">When</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Gear</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((h) => (
                      <tr key={h.id} className="border-t border-border align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          <span title={new Date(h.timestamp).toLocaleString()}>
                            {formatDate(h.timestamp)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to="/"
                            search={{ gear: h.gear_id }}
                            className="font-medium hover:underline"
                          >
                            {gearMap.get(h.gear_id) ?? `Gear #${h.gear_id}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-bold",
                              locationClasses(h.location),
                            )}
                          >
                            {h.location}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground italic">
                          {h.note ? `"${h.note}"` : <span className="opacity-50">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((h) => (
                <Card key={h.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold",
                        locationClasses(h.location),
                      )}
                    >
                      {h.location}
                    </span>
                    <span
                      className="text-xs text-muted-foreground ml-auto"
                      title={new Date(h.timestamp).toLocaleString()}
                    >
                      {formatDate(h.timestamp)}
                    </span>
                  </div>
                  <Link
                    to="/"
                    search={{ gear: h.gear_id }}
                    className="font-semibold hover:underline"
                  >
                    {gearMap.get(h.gear_id) ?? `Gear #${h.gear_id}`}
                  </Link>
                  {h.note && (
                    <div className="text-sm text-muted-foreground mt-2 italic">
                      "{h.note}"
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
