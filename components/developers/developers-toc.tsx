"use client";

import * as React from "react";
import { LineNav } from "@/components/line-nav";

interface Section {
  id: string;
  label: string;
}

/**
 * "On this page" nav for the developer docs, upgraded to a LineNav whose
 * active indicator grows as you scroll through sections. Scroll-spy via
 * IntersectionObserver — the line tracks where you actually are, not just
 * what you clicked.
 */
export function DevelopersToc({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = React.useState(sections[0]?.id ?? "");

  React.useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;

    // Track the topmost section currently within the upper third of the
    // viewport, so the active item flips as a heading reaches reading height.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <LineNav
      items={sections.map((s) => ({ title: s.label, href: `#${s.id}` }))}
      activeHref={`#${activeId}`}
      scrollActiveIntoView={false}
    />
  );
}
