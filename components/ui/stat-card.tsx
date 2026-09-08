import type { ReactNode } from "react";

// StatCard — KPI-ruta. Port av det tidigare designsystemets packages/ui.
// deltaTone begränsad till tokens (aldrig rå färg).

type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: "accent" | "warn" | "danger" | "muted";
};

const DELTA_TONE: Record<NonNullable<StatCardProps["deltaTone"]>, string> = {
  accent: "text-accent",
  warn: "text-warn",
  danger: "text-danger",
  muted: "text-fg-3",
};

export function StatCard({ label, value, delta, deltaTone = "accent" }: StatCardProps) {
  return (
    <article className="rounded-lg border border-border bg-surface px-5 py-4 shadow-elev1">
      <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-3">{label}</div>
      <div className="mt-[9px] font-serif text-[30px] font-medium leading-none text-fg-warm">
        {value}
      </div>
      {delta && (
        <div className={"mt-[8px] font-mono text-[11px] " + DELTA_TONE[deltaTone]}>{delta}</div>
      )}
    </article>
  );
}

export function StatCardPlaceholder({
  label,
  comingIn,
}: {
  label: ReactNode;
  comingIn: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-dashed border-border-2 bg-elevated px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-3">{label}</div>
      <div className="mt-[9px] font-serif text-[30px] font-medium leading-none text-fg-3">—</div>
      <div className="mt-[8px] font-mono text-[10px] text-fg-3">kommer · {comingIn}</div>
    </article>
  );
}
