"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface LocalSubNavItem {
  id: string;
  label: string;
}

/**
 * Sticky in-page jump nav for a long analysis page. Lets a reader go straight
 * to a section instead of scrolling past everything ahead of it, and tracks
 * which section is on screen via IntersectionObserver.
 */
export function LocalSubNav({ items }: { items: LocalSubNavItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const reducedMotion = useReducedMotion();
  const clickedRef = useRef(false);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (clickedRef.current) return;
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  function handleClick(id: string) {
    setActiveId(id);
    clickedRef.current = true;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => {
      clickedRef.current = false;
    }, 700);
  }

  return (
    <nav
      aria-label="Section navigation"
      className="sticky top-14 z-20 -mx-4 mb-6 border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-0"
    >
      <ul className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:thin]">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(item.id);
                }}
                aria-current={isActive ? "true" : undefined}
                className={clsx(
                  "block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive ? "bg-primary-soft text-primary-hover" : "text-ink-muted hover:bg-surface-alt hover:text-ink",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
