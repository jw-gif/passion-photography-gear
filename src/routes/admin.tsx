import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOCATIONS, locationClasses, formatDate } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ADMIN_PASSWORD, isAdmin, setAdmin } from "@/lib/admin-auth";
import { Camera, Search, QrCode, ChevronDown, LogOut, X, History } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Passion Gear Tracking" },
      { name: "description", content: "Manage photography gear inventory by location." },
    ],
  }),
  component: AdminPage,
});

interface GearRow {
  id: number;
  name: string;
  current_location: string;
  last_note: string | null;
  last_updated: string;
}

interface HistoryRow {
  id: string;
  gear_id: number;
  location: string;
  note: string | null;
  timestamp: string;
}

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(isAdmin());
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (!authed) return <LoginGate onSuccess={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { setAdmin(false); setAuthed(false); }} />;
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

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [gear, setGear] = useState<GearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [qrGearId, setQrGearId] = useState<number | null>(null);

  async function loadGear() {
    setLoading(true);
    const { data } = await supabase
      .from("gear")
      .select("*")
      .order("id", { ascending: true });
    setGear((data || []) as GearRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadGear();
    const channel = supabase
      .channel("gear-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gear" }, () => loadGear())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gear;
    return gear.filter((g) => g.name.toLowerCase().includes(q));
  }, [gear, query]);

  const grouped = useMemo(() => {
    const map: Record<string, GearRow[]> = { "515": [], Cumberland: [], Trilith: [] };
    for (const g of filtered) {
      if (map[g.current_location]) map[g.current_location].push(g);
      else map["515"].push(g);
    }
    return map;
  }, [filtered]);

  return (
    <main className="min-h-screen">
      <header className="px-4 sm:px-6 py-4 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center">
              <Camera className="size-4" />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-tight">Passion Gear</div>
              <div className="text-xs text-muted-foreground">Admin dashboard</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="relative max-w-md mb-6">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gear by name…"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">Loading gear…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {LOCATIONS.map((loc) => (
              <section key={loc}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-bold",
                      locationClasses(loc),
                    )}
                  >
                    {loc}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {grouped[loc].length} item{grouped[loc].length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-3">
                  {grouped[loc].length === 0 && (
                    <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-8 text-center">
                      No gear here
                    </div>
                  )}
                  {grouped[loc].map((g) => (
                    <GearCard
                      key={g.id}
                      gear={g}
                      expanded={expandedId === g.id}
                      onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
                      onShowQr={() => setQrGearId(g.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {qrGearId !== null && (
        <QrModal
          gear={gear.find((g) => g.id === qrGearId)!}
          onClose={() => setQrGearId(null)}
        />
      )}
    </main>
  );
}

function GearCard({
  gear,
  expanded,
  onToggle,
  onShowQr,
}: {
  gear: GearRow;
  expanded: boolean;
  onToggle: () => void;
  onShowQr: () => void;
}) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      const { data } = await supabase
        .from("gear_history")
        .select("*")
        .eq("gear_id", gear.id)
        .order("timestamp", { ascending: false });
      if (!cancelled) {
        setHistory((data || []) as HistoryRow[]);
        setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [expanded, gear.id, gear.last_updated]);

  return (
    <Card className="p-4">
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{gear.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Updated {formatDate(gear.last_updated)}
            </div>
            {gear.last_note && (
              <div className="text-sm mt-2 text-muted-foreground italic line-clamp-2">
                "{gear.last_note}"
              </div>
            )}
          </div>
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform shrink-0 mt-1", expanded && "rotate-180")}
          />
        </div>
      </button>

      <div className="flex items-center gap-2 mt-3">
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-bold",
            locationClasses(gear.current_location),
          )}
        >
          {gear.current_location}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onShowQr(); }}
          className="ml-auto"
        >
          <QrCode className="size-3.5" /> QR
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            History
          </div>
          {loadingHistory ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : history.length === 0 ? (
            <div className="text-sm text-muted-foreground">No history yet</div>
          ) : (
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        locationClasses(h.location),
                      )}
                    >
                      {h.location}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(h.timestamp)}
                    </span>
                  </div>
                  {h.note && (
                    <div className="text-sm text-muted-foreground mt-1 italic pl-1">
                      "{h.note}"
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </Card>
  );
}

function QrModal({ gear, onClose }: { gear: GearRow; onClose: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = `${window.location.origin}/?gear=${gear.id}`;
    setUrl(u);

    // Load qrcode.js from CDN
    const existing = document.getElementById("qrcode-cdn") as HTMLScriptElement | null;
    function render() {
      if (!canvasRef.current) return;
      canvasRef.current.innerHTML = "";
      // @ts-expect-error - QRCode loaded from CDN
      new window.QRCode(canvasRef.current, {
        text: u,
        width: 240,
        height: 240,
        colorDark: "#000000",
        colorLight: "#ffffff",
        // @ts-expect-error CDN constants
        correctLevel: window.QRCode.CorrectLevel.H,
      });
    }
    if (existing && (window as any).QRCode) {
      render();
    } else if (!existing) {
      const s = document.createElement("script");
      s.id = "qrcode-cdn";
      s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
      s.onload = render;
      document.head.appendChild(s);
    } else {
      existing.addEventListener("load", render);
    }
  }, [gear.id]);

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <Card
        className="p-6 max-w-sm w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 size-8 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">QR for</div>
        <div className="font-semibold text-lg mb-4">{gear.name}</div>
        <div className="bg-white p-4 rounded-lg flex items-center justify-center">
          <div ref={canvasRef} />
        </div>
        <div className="mt-4 text-xs text-muted-foreground break-all text-center">
          {url}
        </div>
      </Card>
    </div>
  );
}
