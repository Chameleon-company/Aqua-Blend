import Link from "next/link";
import { Menu, X } from "lucide-react";

export interface AppHeaderProps {
  mobileOpen: boolean;
  onToggle: () => void;
}

/** Mobile-only top bar: brand + drawer trigger. The desktop nav lives in <Sidebar>. */
export function AppHeader({ mobileOpen, onToggle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-sm lg:hidden">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-linear-to-br from-accent to-primary" />
          AquaBlend
        </Link>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-sm border border-border-strong p-1.5 text-ink-muted"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          onClick={onToggle}
        >
          <span className="sr-only">Toggle navigation</span>
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
