"use client";

import { useEffect, useRef, useState } from "react";

/** Used to pause/simplify the dotted-water hero when off-screen. */
export function useInView<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.1,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}
