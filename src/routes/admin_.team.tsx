import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  LogOut,
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  Check,
  X,
  Copy,
  Users,
  Wrench,
  History,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import pccLogo from "@/assets/pcc-logo.png";

export const Route = createFileRoute("/admin_/team")({
  head: () => ({
    meta: [
      { title: "Manage Admins · Passion Gear Tracking" },
      { name: "description", content: "Invite and manage admin team members." },
    ],
  }),
  component: AdminsPage,
});

interface AdminItem {
  id: string;
  email: string | null;
  display_name: string;
  created_at: string;
  last_sign_in_at: string | null;
}

function AdminsPage() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <AdminsView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

async function authedFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });
}

function AdminsView({ onLogout }: { onLogout: () => void }) {
  const { user, displayName, refreshProfile } = useAuth();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pwTarget, setPwTarget] = useState<AdminItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminItem | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{
    email: string;
    password: string | null;
  } | null>(null);

  async function load() {
    setLoading(true);
    const res = await authedFetch("/api/admins");
    if (!res.ok) {
      const text = await res.text();
      toast.error("Couldn't load admins", { description: text });
      setAdmins([]);
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { admins: AdminItem[] };
    setAdmins(json.admins);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(input: {
    email: string;
    display_name: string;
    password: string;
  }) {
    const res = await authedFetch("/api/admins", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as {
      admin?: { email: string; temporary_password: string | null };
      error?: string;
    };
    if (!res.ok || !json.admin) {
      toast.error("Couldn't invite admin", { description: json.error });
      return;
    }
    setShowInvite(false);
    setCreatedSummary({
      email: json.admin.email,
      password: json.admin.temporary_password,
    });
    await load();
  }

  async function handleRenameSave(a: AdminItem) {
    const dn = editName.trim();
    if (!dn) {
      toast.error("Name can't be empty");
      return;
    }
    if (dn === a.display_name) {
      setEditingId(null);
      return;
    }
    const res = await authedFetch("/api/admins", {
      method: "PATCH",
      body: JSON.stringify({ id: a.id, display_name: dn }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error("Couldn't rename", { description: json.error });
      return;
    }
    setEditingId(null);
    setAdmins((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, display_name: dn } : x)),
    );
    if (a.id === user?.id) await refreshProfile();
    toast.success(`Renamed to "${dn}"`);
  }

  async function handlePasswordChange(a: AdminItem, pw: string) {
    const res = await authedFetch("/api/admins", {
      method: "PATCH",
      body: JSON.stringify({ id: a.id, password: pw }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error("Couldn't update password", { description: json.error });
      return false;
    }
    toast.success(`Password updated for ${a.display_name}`);
    setPwTarget(null);
    return true;
  }

  async function handleDelete(a: AdminItem) {
    setDeleteTarget(null);
    const res = await authedFetch("/api/admins", {
      method: "DELETE",
      body: JSON.stringify({ id: a.id }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error("Couldn't remove admin", { description: json.error });
      return;
    }
    setAdmins((prev) => prev.filter((x) => x.id !== a.id));
    toast.success(`Removed ${a.display_name}`);
  }

  return (
    <main className="min-h-screen">
      <header className="px-4 sm:px-6 py-4 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link
            to="/admin"
            className="group flex items-center gap-2 rounded-md hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="size-8 rounded-full bg-primary flex items-center justify-center relative overflow-hidden">
              <img
                src={pccLogo}
                alt="PCC"
                className="size-5 object-contain transition-opacity duration-200 group-hover:opacity-0"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <ArrowLeft className="size-4 text-primary-foreground absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-tight">Manage Admins</div>
              <div className="text-xs text-muted-foreground">
                Invite, rename, remove team members
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">
                <ArrowLeft className="size-4" />{" "}
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/manage">
                <Wrench className="size-4" />{" "}
                <span className="hidden sm:inline">Gear</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/requests">
                <Inbox className="size-4" />{" "}
                <span className="hidden sm:inline">Requests</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/history">
                <History className="size-4" />{" "}
                <span className="hidden sm:inline">Activity log</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="size-4" />{" "}
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            {loading ? "Loading…" : `${admins.length} admin${admins.length === 1 ? "" : "s"}`}
            {displayName && (
              <span className="ml-2 text-foreground/70">
                · Signed in as <span className="font-medium text-foreground">{displayName}</span>
              </span>
            )}
          </div>
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="size-4" /> Add admin
          </Button>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">Loading admins…</div>
        ) : admins.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-12 text-center">
            No admins yet.
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border">
              {admins.map((a) => {
                const isEditing = editingId === a.id;
                const isMe = a.id === user?.id;
                return (
                  <li
                    key={a.id}
                    className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap"
                  >
                    <div className="size-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                      {(a.display_name[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameSave(a);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            className="h-8 max-w-[240px]"
                            maxLength={50}
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleRenameSave(a)}>
                            <Check className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium flex items-center gap-2">
                            <span className="truncate">{a.display_name}</span>
                            {isMe && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                                you
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditingId(a.id);
                                setEditName(a.display_name);
                              }}
                              className="text-muted-foreground/50 hover:text-foreground transition-colors"
                              aria-label="Rename"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {a.email ?? "(no email)"}
                            {a.last_sign_in_at && (
                              <>
                                {" · "}
                                Last sign-in {new Date(a.last_sign_in_at).toLocaleDateString()}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPwTarget(a)}
                      aria-label={`Set password for ${a.display_name}`}
                      title={isMe ? "Change your password" : `Set password for ${a.display_name}`}
                    >
                      <KeyRound className="size-4" />
                      <span className="hidden sm:inline ml-1.5">
                        {isMe ? "Change password" : "Set password"}
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(a)}
                      disabled={isMe}
                      title={isMe ? "You can't remove your own account" : `Remove ${a.display_name}`}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {showInvite && (
        <InviteAdminDialog onInvite={handleInvite} onClose={() => setShowInvite(false)} />
      )}

      {pwTarget && (
        <PasswordDialog
          target={pwTarget}
          onClose={() => setPwTarget(null)}
          onSubmit={(pw) => handlePasswordChange(pwTarget, pw)}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes their account and revokes admin access. Activity history they recorded
              will keep their name but they won't be able to sign in. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {createdSummary && (
        <CredentialsDialog
          summary={createdSummary}
          onClose={() => setCreatedSummary(null)}
        />
      )}
    </main>
  );
}

function InviteAdminDialog({
  onInvite,
  onClose,
}: {
  onInvite: (input: { email: string; display_name: string; password: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pw = "";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length; i++) pw += chars[arr[i] % chars.length];
    setPassword(pw + "!");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !displayName.trim()) {
      setError("Email and display name are required.");
      return;
    }
    if (password && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    await onInvite({
      email: email.trim(),
      display_name: displayName.trim(),
      password: password.trim(),
    });
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <Card className="p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-tight">Add admin</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="invite-name" className="text-sm font-medium block mb-2">
              Display name
            </label>
            <Input
              id="invite-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jenna"
              autoFocus
              maxLength={50}
            />
          </div>
          <div>
            <label htmlFor="invite-email" className="text-sm font-medium block mb-2">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@passioncitychurch.com"
              autoComplete="off"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="invite-pw" className="text-sm font-medium">
                Temporary password
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs text-primary hover:underline"
              >
                Generate
              </button>
            </div>
            <PasswordInput
              id="invite-pw"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground mt-2">
              You'll see this once after creating the account — share it with them and have them
              change it from this page after sign-in.
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add admin"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function PasswordDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: AdminItem;
  onClose: () => void;
  onSubmit: (pw: string) => Promise<boolean>;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const ok = await onSubmit(pw);
    setSubmitting(false);
    if (ok) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <Card className="p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-tight">
            Set password for {target.display_name}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="set-pw" className="text-sm font-medium block mb-2">
              New password
            </label>
            <PasswordInput
              id="set-pw"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="set-pw2" className="text-sm font-medium block mb-2">
              Confirm password
            </label>
            <PasswordInput
              id="set-pw2"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function CredentialsDialog({
  summary,
  onClose,
}: {
  summary: { email: string; password: string | null };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  function copy(text: string, which: "email" | "password") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center px-4">
      <Card className="p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-tight">Admin created</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Share these credentials with them. {summary.password ? "This password" : "The password they were given"}{" "}
          won't be shown again.
        </p>
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Email</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-muted rounded px-3 py-2 truncate">
                {summary.email}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(summary.email, "email")}
              >
                <Copy className="size-3.5" />
                {copied === "email" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          {summary.password && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Temporary password
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted rounded px-3 py-2 truncate font-mono">
                  {summary.password}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(summary.password!, "password")}
                >
                  <Copy className="size-3.5" />
                  {copied === "password" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Done</Button>
        </div>
      </Card>
    </div>
  );
}
