"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  FolderKanban,
  PlayCircle,
  Gauge,
  Sparkles,
  FlaskConical,
  Droplets,
  Waypoints,
  Info,
} from "lucide-react";

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scenarios", label: "Scenarios", icon: FolderKanban },
  { href: "/runs", label: "Runs", icon: PlayCircle },
] as const;

const SECONDARY_LINKS = [
  { href: "/sources", label: "Sources", icon: Droplets },
  { href: "/system-flow", label: "System Flow", icon: Waypoints },
  { href: "/about", label: "About", icon: Info },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  indent,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
        indent && "ml-3.5 border-l border-border pl-3.5",
        active ? "bg-primary-soft text-primary-hover" : "text-ink-muted hover:bg-surface-alt hover:text-ink",
      )}
    >
      <Icon className={clsx("h-4 w-4 shrink-0", active ? "text-primary" : "text-ink-faint")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const runMatch = pathname?.match(/^\/runs\/([^/]+)/);
  const runId = runMatch?.[1];
  const inRunContext = Boolean(runId) && runId !== "new";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink" onClick={onNavigate}>
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-linear-to-br from-accent to-primary" />
          AquaBlend
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-6">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink {...link} active={isActive(pathname, link.href)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        {inRunContext ? (
          <div className="mt-5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">This run</p>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              <li>
                <NavLink
                  href={`/runs/${runId}`}
                  label="Overview"
                  icon={PlayCircle}
                  active={pathname === `/runs/${runId}`}
                  onNavigate={onNavigate}
                />
              </li>
              <li className="mt-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Analysis</li>
              <li>
                <NavLink
                  href={`/runs/${runId}/results/milp`}
                  label="MILP Analysis"
                  icon={Gauge}
                  active={isActive(pathname, `/runs/${runId}/results/milp`)}
                  onNavigate={onNavigate}
                  indent
                />
              </li>
              <li>
                <NavLink
                  href={`/runs/${runId}/results/ai`}
                  label="AI Analysis"
                  icon={Sparkles}
                  active={isActive(pathname, `/runs/${runId}/results/ai`)}
                  onNavigate={onNavigate}
                  indent
                />
              </li>
              <li className="mt-1">
                <NavLink
                  href={`/runs/${runId}/stress-testing`}
                  label="Stress Testing"
                  icon={FlaskConical}
                  active={isActive(pathname, `/runs/${runId}/stress-testing`)}
                  onNavigate={onNavigate}
                />
              </li>
            </ul>
          </div>
        ) : null}

        <div className="mt-6 border-t border-border pt-4">
          <ul className="flex flex-col gap-0.5">
            {SECONDARY_LINKS.map((link) => (
              <li key={link.href}>
                <NavLink {...link} active={isActive(pathname, link.href)} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-surface-alt/60">
      <SidebarContent />
    </aside>
  );
}
