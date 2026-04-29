import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Camera,
  Wrench,
  ChevronDown,
  Users,
  LogOut,
  ImageIcon,
  Inbox,
  Settings,
  History,
  ArrowLeft,
  ListChecks,
} from "lucide-react";
import pccLogo from "@/assets/pcc-logo.png";
import { cn } from "@/lib/utils";

interface HubHeaderProps {
  onLogout: () => void;
  /** Optional title shown next to the logo on inner pages. Omit on the hub home. */
  title?: string;
  subtitle?: string;
}

export function HubHeader({ onLogout, title, subtitle }: HubHeaderProps) {
  const showInnerLabel = !!title;
  const { pathname } = useLocation();

  // Highlight dropdown triggers when on any of their sub-routes.
  const photographyActive =
    pathname.startsWith("/admin/requests-photography") ||
    pathname.startsWith("/admin/shot-list-generator");
  const gearActive =
    pathname.startsWith("/admin/gear") ||
    pathname.startsWith("/admin/requests-gear");

  return (
    <header className="px-4 sm:px-6 py-4 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
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
          <div className="hidden sm:block">
            <div className="font-semibold tracking-tight leading-tight">
              {showInnerLabel ? title : "Photography Hub"}
            </div>
            <div className="text-xs text-muted-foreground">
              {showInnerLabel ? subtitle ?? "Passion Photography Hub" : "Passion"}
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-muted" }}
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(photographyActive && "bg-muted")}
              >
                <Camera className="size-4" />
                <span className="hidden md:inline">Photography</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Photography</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/requests-photography">
                  <ImageIcon className="size-4" /> Requests
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/shot-list-generator">
                  <ListChecks className="size-4" /> Shot list generator
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(gearActive && "bg-muted")}
              >
                <Wrench className="size-4" />
                <span className="hidden md:inline">Gear</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Gear</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/gear">
                  <LayoutDashboard className="size-4" /> Board
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/requests-gear">
                  <Inbox className="size-4" /> Requests
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/gear-manage">
                  <Settings className="size-4" /> Manage
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/gear-history">
                  <History className="size-4" /> Activity log
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(teamActive && "bg-muted")}
              >
                <Users className="size-4" />
                <span className="hidden md:inline">Team</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Team</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/team">
                  <Users className="size-4" /> Members
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/onboarding">
                  <ListChecks className="size-4" /> Onboarding
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="size-4" />
            <span className="hidden md:inline">Sign out</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
