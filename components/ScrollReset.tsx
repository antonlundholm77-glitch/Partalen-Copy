"use client";

import { useEffect, useRef } from "react";

// Scroll-container som startar högst upp. Behövs när en inbäddad portal-iframe
// (med #fragment i src) annars drar containern nedåt vid laddning.
export default function ScrollReset({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const top = () => {
      el.scrollTop = 0;
    };
    top();
    const raf = requestAnimationFrame(top);
    const timer = setTimeout(top, 300); // fånga iframens fragment-scroll efter laddning
    const iframe = el.querySelector("iframe");
    iframe?.addEventListener("load", top);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      iframe?.removeEventListener("load", top);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
