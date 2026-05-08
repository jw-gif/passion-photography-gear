import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

/** Gate that requires any signed-in user. Sends visitors to /login with redirect. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname + location.searchStr },
        replace: true,
      });
    }
  }, [loading, user, navigate, location.pathname, location.searchStr]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </main>
    );
  }
  return <>{children}</>;
}
