import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/**
 * Wraps admin pages. Redirects to /login if the visitor isn't a signed-in admin.
 * While loading, shows a small spinner instead of the protected content.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname },
        replace: true,
      });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </main>
    );
  }

  if (!user) {
    // Effect will redirect; render nothing in the meantime
    return null;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center">
          <h1 className="text-lg font-semibold tracking-tight">No admin access</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your account is signed in but doesn't have admin privileges. Ask an existing admin to grant access.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Home</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
