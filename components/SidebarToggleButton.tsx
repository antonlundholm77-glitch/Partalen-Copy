"use client";

import { Menu } from "lucide-react";

// Hamburger-knapp som togglar Sidebar.collapsed via Shell.
// Färgen följer aktiv brand (var(--brand-primary)) så Partalen får mörkblå
// hover, plattformens default behåller oliv etc.

export default function SidebarToggleButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? "Visa meny" : "Fäll ihop meny"}
      aria-label={collapsed ? "Visa meny" : "Fäll ihop meny"}
      aria-expanded={!collapsed}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-secondary"
      style={{ ["--hover-color" as string]: "var(--brand-primary, currentColor)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--brand-primary, currentColor)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "";
      }}
    >
      <Menu size={18} strokeWidth={1.75} />
    </button>
  );
}
