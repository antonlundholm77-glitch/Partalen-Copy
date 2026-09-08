import type { ReactNode } from "react";

// Card / Panel — bas-ytan för paneler. Port av det tidigare designsystemets packages/ui.
// Card ramar in; Panel = Card + CardHeader + (valfri) body-padding.

type CardProps = {
  children: ReactNode;
  /** Lägg standard innepadding (px-5 py-4). */
  padded?: boolean;
  /** Streckad border för "kommer"/placeholder-mood. */
  dashed?: boolean;
  className?: string;
};

export function Card({ children, padded, dashed, className }: CardProps) {
  return (
    <article
      className={
        "rounded-lg border bg-surface shadow-elev1 " +
        (dashed ? "border-dashed border-border-2 bg-elevated " : "border-border ") +
        (padded ? "px-5 py-4 " : "") +
        (className ?? "")
      }
    >
      {children}
    </article>
  );
}

type CardHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function CardHeader({ title, subtitle, actions, className }: CardHeaderProps) {
  return (
    <header
      className={
        "flex items-center gap-3 border-b border-border px-5 py-4 " + (className ?? "")
      }
    >
      <h2 className="text-[14px] font-semibold tracking-[0.01em] text-fg">{title}</h2>
      {subtitle && <span className="font-mono text-[10px] text-fg-3">{subtitle}</span>}
      {actions && <div className="ml-auto flex items-center gap-3">{actions}</div>}
    </header>
  );
}

type PanelProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Innepadding under headern (default false — så tabeller streckar kant-till-kant). */
  paddedBody?: boolean;
  className?: string;
};

export function Panel({
  title,
  subtitle,
  actions,
  children,
  paddedBody,
  className,
}: PanelProps) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} actions={actions} />
      {paddedBody ? <div className="px-5 py-4">{children}</div> : children}
    </Card>
  );
}
