"use client";

import { SidebarContent } from "./Sidebar";

/**
 * Rendered as a direct child of the app shell root, not inside <AppHeader> —
 * that header uses backdrop-blur, which establishes a containing block for
 * `position: fixed` descendants and would trap this drawer inside its own
 * (56px-tall) box instead of the viewport.
 */
export function MobileNavDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex lg:hidden" id="mobile-nav-drawer">
      <div className="fixed inset-0 bg-ink/40" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 flex h-full w-72 max-w-[80vw] flex-col border-r border-border bg-surface shadow-xl">
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
