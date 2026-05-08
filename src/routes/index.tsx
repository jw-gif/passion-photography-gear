import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/password-input";
import { Camera, Mail, KeyRound, ArrowRight, QrCode } from "lucide-react";
import pccLogo from "@/assets/pcc-logo.png";
import { PublicGearView } from "@/components/public-gear-view";

interface Search {
  gear?: string;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    gear: search.gear !== undefined && search.gear !== null && search.gear !== ""
      ? String(search.gear)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Passion Photography Team" },
      { name: "description", content: "Sign in to manage opportunities, gear, training and events." },
    ],
  }),
  component: IndexPage,
});

interface LandingPhoto {
  id: string;
  image_url: string;
  alt_text: string | null;
}

function IndexPage() {
  const { gear } = Route.useSearch();
  if (gear) return <PublicGearView gearId={gear} />;
  return <Landing />;
}

function Landing() {
  const { user, loading, isAdmin, isTeam, isPhotographer } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [photos, setPhotos] = useState<LandingPhoto[]>([]);

  useEffect(() => {
    if (loading || !user) return;
    if (isTeam || isAdmin) navigate({ to: "/admin", replace: true });
    else if (isPhotographer) navigate({ to: "/dashboard", replace: true });
    else navigate({ to: "/onboarding", replace: true });
  }, [loading, user, isAdmin, isTeam, isPhotographer, navigate]);

  useEffect(() => {
    supabase
      .from("landing_photos")
      .select("id, image_url, alt_text")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setPhotos((data ?? []) as LandingPhoto[]));
  }, []);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    await Promise.all([
      supabase.rpc("link_hire_to_current_user"),
      supabase.rpc("link_photographer_to_current_user"),
    ]);
    setSubmitting(false);
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setSubmitting(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setMagicSent(true);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="px-6 py-5 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-full bg-primary flex items-center justify-center overflow-hidden">
            <img src={pccLogo} alt="Passion" className="size-5 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <span className="font-semibold tracking-tight">Passion Photography Team</span>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-8 pb-16 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Capture every Passion moment.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Sign in to claim shoots, request gear, RSVP to events, and watch
            training videos — all in one hub.
          </p>
        </div>

        <Card className="p-6 sm:p-7 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="size-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-tight">Sign in to your dashboard</div>
              <div className="text-xs text-muted-foreground">Admins and photographers</div>
            </div>
          </div>

          {mode === "password" ? (
            <form onSubmit={handlePassword} className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1.5" htmlFor="email">Email</label>
                <Input id="email" type="email" autoComplete="email" value={email} required
                  onChange={(e) => { setEmail(e.target.value); setError(""); }} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" htmlFor="pw">Password</label>
                <PasswordInput id="pw" autoComplete="current-password" value={password} required
                  onChange={(e) => { setPassword(e.target.value); setError(""); }} />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                <KeyRound className="size-4" />
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
              <button type="button"
                onClick={() => { setMode("magic"); setError(""); setPassword(""); setMagicSent(false); }}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground pt-1">
                Email me a sign-in link instead
              </button>
              <div className="text-center text-sm pt-1">
                <Link to="/login" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMagic} className="space-y-3">
              {magicSent ? (
                <p className="text-sm text-muted-foreground">
                  If <span className="font-medium text-foreground">{email}</span> has access,
                  a sign-in link is on its way to your inbox.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    We'll email you a one-time link that signs you in instantly.
                  </p>
                  <div>
                    <label className="text-sm font-medium block mb-1.5" htmlFor="memail">Email</label>
                    <Input id="memail" type="email" autoComplete="email" value={email} required autoFocus
                      onChange={(e) => { setEmail(e.target.value); setError(""); }} />
                  </div>
                  {error && <p className="text-destructive text-sm">{error}</p>}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    <Mail className="size-4" />
                    {submitting ? "Sending…" : "Email me a sign-in link"}
                  </Button>
                </>
              )}
              <button type="button"
                onClick={() => { setMode("password"); setError(""); setMagicSent(false); }}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground pt-1">
                ← Back to password sign-in
              </button>
            </form>
          )}
        </Card>
      </section>

      {photos.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={p.image_url} alt={p.alt_text ?? ""} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <QrCode className="size-3.5" />
            Scanning a gear QR code? Open the link from the sticker — no sign-in needed.
          </div>
          <Link to="/login" className="inline-flex items-center gap-1 hover:text-foreground">
            More sign-in options <ArrowRight className="size-3" />
          </Link>
        </div>
      </footer>
    </main>
  );
}
