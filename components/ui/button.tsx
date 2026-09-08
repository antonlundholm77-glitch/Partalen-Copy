import type { ButtonHTMLAttributes, ReactNode } from "react";

// Button — enda knapp-primitiven. Port av det tidigare designsystemets packages/ui.
// Varianter: primary (accent), ghost (border), copper (varm/funktionell).
// Stöder <button> och <a> via `as`.

export type ButtonVariant = "primary" | "ghost" | "copper";
export type ButtonSize = "default" | "sm";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-fg-inv hover:bg-accent-2 border border-transparent",
  ghost:
    "bg-surface text-fg border border-border-2 hover:bg-elevated hover:border-border-3",
  copper:
    "text-fg-inv border border-transparent hover:opacity-90 bg-[color:var(--warm)] hover:bg-[color:var(--warm-2)]",
};

const SIZE: Record<ButtonSize, string> = {
  default: "px-4 py-[9px] text-[13.5px]",
  sm: "px-3 py-[7px] text-[13px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  className?: string;
};

type ButtonElProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };

type AnchorElProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "type"> & {
    as: "a";
    href: string;
  };

type Props = ButtonElProps | AnchorElProps;

export function Button(props: Props) {
  const {
    variant = "primary",
    size = "default",
    leading,
    className,
    children,
    ...rest
  } = props as CommonProps & { children?: ReactNode; [key: string]: unknown };
  const cls = `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className ?? ""}`;

  const inner = (
    <>
      {leading && <span aria-hidden="true">{leading}</span>}
      {children}
    </>
  );

  if ("as" in props && props.as === "a") {
    return (
      <a className={cls} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {inner}
    </button>
  );
}
