import { Table, Th, TdName, TdId } from "@/components/ui";
import RoleBadge from "@/components/RoleBadge";

export interface MemberRow {
  name: string;
  email: string;
  role: string;
  extra?: string;
}

// Medlemslista för adminvyerna — bygger på Table-primitiven.
export default function MembersTable({
  rows,
  extraHeader,
  empty = "Inga medlemmar än.",
}: {
  rows: MemberRow[];
  extraHeader?: string;
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-[13.5px] text-fg-2">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev1">
      <Table className="!min-w-0">
        <thead>
          <tr>
            <Th>Namn</Th>
            <Th>E-post</Th>
            {extraHeader && <Th>{extraHeader}</Th>}
            <Th>Roll</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.email}>
              <TdName>{r.name}</TdName>
              <TdId>{r.email}</TdId>
              {extraHeader && <td className="text-fg-2">{r.extra ?? "—"}</td>}
              <td>
                <RoleBadge role={r.role} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
