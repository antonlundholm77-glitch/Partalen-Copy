// Färgkodad rollchip. Täcker system-, kund- och enhetsroller.
const ROLE_META: Record<string, { label: string; tone: "accent" | "muted" }> = {
  // systemroller
  superadmin: { label: "Systemadmin", tone: "accent" },
  support: { label: "Support", tone: "muted" },
  readonly: { label: "Läs", tone: "muted" },
  // kundroller
  owner: { label: "Ägare", tone: "accent" },
  admin: { label: "Admin", tone: "accent" },
  member: { label: "Medlem", tone: "muted" },
  // enhetsroller
  manager: { label: "Projektledare", tone: "accent" },
  viewer: { label: "Läsare", tone: "muted" },
  larare: { label: "Lärare", tone: "accent" },
  deltagare: { label: "Deltagare", tone: "muted" },
};

export default function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? { label: role, tone: "muted" as const };
  return (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
        m.tone === "accent"
          ? "bg-accent-bg text-accent-text"
          : "bg-secondary text-ink-3"
      }`}
    >
      {m.label}
    </span>
  );
}
