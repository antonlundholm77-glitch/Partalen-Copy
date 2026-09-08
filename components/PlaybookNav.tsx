"use client";

import { useEffect, useState, type RefObject } from "react";
import type { LucideIcon } from "lucide-react";

export interface PlaybookSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

// Statisk underrad direkt under breadcrumben: snabbnav för Playbooken som
// stannar kvar (sticky top-0) och markerar aktiv sektion (scrollspy).
// Skalbar — lägg till sektioner i SECTIONS i Playbook.
export default function PlaybookNav({
  sections,
  scrollRef,
}: {
  sections: PlaybookSection[];
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive((vis[0].target as HTMLElement).id);
      },
      { root, rootMargin: "-12% 0px -76% 0px", threshold: 0 },
    );
    sections.forEach((s) => {
      const el = root.querySelector(`#${s.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections, scrollRef]);

  function jump(id: string) {
    scrollRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-8 py-2">
        {sections.map((s) => {
          const I = s.icon;
          const on = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => jump(s.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] transition ${
                on ? "bg-[#eae8d0] font-medium text-[#4f4b22]" : "text-ink-2 hover:bg-secondary hover:text-ink"
              }`}
            >
              <I size={14} strokeWidth={1.75} />
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
