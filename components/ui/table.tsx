import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

// Table — datapanel-tabell med låst anatomi. Port av det tidigare
// designsystemets packages/ui. Stylar via wrapper-cascading ([&_th]/[&_td]) — caller skriver
// vanlig HTML-markup utan att tagga varje cell.

export function Table({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={
          "w-full min-w-[720px] border-collapse " +
          "[&_thead_th]:bg-elevated [&_thead_th]:border-b [&_thead_th]:border-border " +
          "[&_thead_th]:px-5 [&_thead_th]:py-[11px] [&_thead_th]:text-left " +
          "[&_thead_th]:font-mono [&_thead_th]:text-[9.5px] [&_thead_th]:uppercase " +
          "[&_thead_th]:tracking-[0.09em] [&_thead_th]:text-fg-3 [&_thead_th]:font-medium " +
          "[&_tbody_td]:px-5 [&_tbody_td]:py-[13px] [&_tbody_td]:text-[13.5px] " +
          "[&_tbody_td]:border-b [&_tbody_td]:border-border [&_tbody_td]:align-middle " +
          "[&_tbody_tr:last-child_td]:border-b-0 " +
          "[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-elevated " +
          (className ?? "")
        }
      >
        {children}
      </table>
    </div>
  );
}

/** Mono-ID-cell (t.ex. "L-022"). */
export function TdId({
  children,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={"font-mono text-[11.5px] text-fg-3 " + (className ?? "")} {...rest}>
      {children}
    </td>
  );
}

/** Tjock namn-cell med valfri meta-rad under. */
export function TdName({
  children,
  meta,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { meta?: ReactNode }) {
  return (
    <td className={"font-medium text-fg " + (className ?? "")} {...rest}>
      {children}
      {meta && (
        <div className="mt-[2px] font-mono text-[10.5px] font-normal text-fg-3">{meta}</div>
      )}
    </td>
  );
}

export function Th({
  children,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={className} {...rest}>
      {children}
    </th>
  );
}
