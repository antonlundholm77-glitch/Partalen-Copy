// Detalj-vy för en leverabel — visar all metadata + informationContent +
// tillhörande dokument.

import Link from "next/link";
import type { PmDeliverableWithJoins } from "@/lib/db/deliverables";
import type { DeliverableDocument } from "@/lib/db/deliverable-documents";
import DeliverableDocumentsList from "@/components/DeliverableDocumentsList";

const STATUS_LABEL: Record<string, string> = {
  klar: "Klar",
  pagaende: "Pågående",
  granskning: "Granskning",
  "ej-paborjad": "Ej påbörjad",
};

const STATUS_TONE: Record<string, { bg: string; color: string }> = {
  klar: { bg: "#dcfce7", color: "#166534" },
  pagaende: { bg: "#fef3c7", color: "#92400e" },
  granskning: { bg: "#dbeafe", color: "#1e40af" },
  "ej-paborjad": { bg: "#f1f5f9", color: "#64748b" },
};

export default function DeliverableDetail({
  basePath,
  projectBasePath,
  deliverable,
  documents,
}: {
  basePath: string;
  projectBasePath: string;
  deliverable: PmDeliverableWithJoins;
  documents: DeliverableDocument[];
}) {
  const d = deliverable;
  const statusLabel = STATUS_LABEL[d.status] ?? d.status;
  const statusTone = STATUS_TONE[d.status] ?? STATUS_TONE["ej-paborjad"];

  return (
    <div className="space-y-6">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-ink"
      >
        ← Tillbaka till leverabler
      </Link>

      <header>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-ink-3">{d.code}</span>
          {d.discipline && (
            <span
              className="inline-flex h-5 items-center rounded px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-white"
              style={{ background: d.discipline.color ?? "#64748b" }}
            >
              {d.discipline.code} · {d.discipline.name}
            </span>
          )}
          <span
            className="rounded px-2 py-0.5 text-[11px] font-medium"
            style={{ background: statusTone.bg, color: statusTone.color }}
          >
            {statusLabel}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">{d.name}</h1>
        {d.description && <p className="mt-2 text-[14px] text-ink-2">{d.description}</p>}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetaRow label="Fas">
          {d.phase ? (
            <span>
              <span className="font-mono text-[11.5px] text-ink-3">Fas {d.phase.stage}</span>
              {" · "}
              <span>{d.phase.name}</span>
            </span>
          ) : (
            <span className="text-ink-3">—</span>
          )}
        </MetaRow>
        <MetaRow label="Format">
          <span className="font-mono text-[12.5px]">{d.format ?? "—"}</span>
        </MetaRow>
        <MetaRow label="Ansvarig">{d.responsible ?? "—"}</MetaRow>
        <MetaRow label="Måldatum">
          {d.due_date ? (
            <span className="font-mono text-[12.5px]">{d.due_date}</span>
          ) : (
            "—"
          )}
        </MetaRow>
        {d.building && <MetaRow label="Byggnadsdel">{d.building}</MetaRow>}
      </div>

      {d.information_content && d.information_content.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Innehåll
          </h2>
          <ul className="space-y-1.5 rounded-lg border border-border bg-surface px-4 py-3 shadow-elev1">
            {d.information_content.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13.5px] text-ink-2">
                <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Dokument {documents.length > 0 && `(${documents.length})`}
          </h2>
          <Link
            href={projectBasePath + "/dokument"}
            className="text-[11px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
          >
            Hantera i dokumentmodulen →
          </Link>
        </div>
        <DeliverableDocumentsList
          documents={documents}
          projectBasePath={projectBasePath}
        />
      </section>
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        {label}
      </div>
      <div className="mt-0.5 text-[13.5px] text-ink">{children}</div>
    </div>
  );
}
