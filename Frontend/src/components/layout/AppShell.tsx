"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { MobileNavDrawer } from "./MobileNavDrawer";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-full">
      <Sidebar />
      <AppHeader mobileOpen={mobileOpen} onToggle={() => setMobileOpen((open) => !open)} />
      {mobileOpen ? <MobileNavDrawer onClose={() => setMobileOpen(false)} /> : null}
      <div className="lg:pl-64">
        <main>{children}</main>
      </div>
    </div>
  );
}
