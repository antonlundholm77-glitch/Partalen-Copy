import type { ReactNode } from "react";

// EmptyState — den ärliga tomma-vyn. Port av det tidigare designsystemets packages/ui.
export function EmptyState({
  glyph = "◯",
  title,
  sub,
  actions,
  className,
}: {
  glyph?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={"px-5 py-10 text-center " + (className ?? "")}>
      <div className="font-mono text-[22px] text-border-3" aria-hidden="true">
        {glyph}
      </div>
      <div className="mt-3 font-serif text-[18px] text-fg-warm">{title}</div>
      {sub && <div className="mt-1 text-[13.5px] text-fg-2">{sub}</div>}
      {actions && <div className="mt-4 flex justify-center gap-3">{actions}</div>}
    </div>
  );
}
