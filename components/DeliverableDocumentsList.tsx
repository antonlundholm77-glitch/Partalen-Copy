"use client";

// Listar dokument kopplade till en leverabel. Klick → öppna signerad URL
// i ny flik (snabb download/preview utan att lämna sidan).
//
// Mer avancerad hantering (versioner, ändra status, ta bort) sker i den
// ordinarie dokumentmodulen — denna lista är read-only-snabbåtkomst.

import { useState } from "react";
import Link from "next/link";
import { currentVersionUrl, DOC_STATUS } from "@/lib/documents";
import type { DeliverableDocument } from "@/lib/db/deliverable-documents";

export default function DeliverableDocumentsList({
  documents,
  projectBasePath,
}: {
  documents: DeliverableDocument[];
  projectBasePath: string;
}) {
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(docId: string) {
    setOpening(docId);
    setError(null);
    try {
      // currentVersionUrl behöver hela GfDocument men vi har bara id + current_version
      // — vi mockar minimalt så funktionen kan hitta versionen.
      const doc = documents.find((d) => d.id === docId);
      if (!doc) return;
      const result = await currentVersionUrl({
        id: doc.id,
        project_id: "",
        name: doc.name,
        phase: null,
        discipline: null,
        status: doc.status,
        current_version: doc.current_version,
        created_at: "",
        updated_at: doc.updated_at,
        description: doc.description,
        access_code: null,
        deliverable_id: null,
        deleted_at: null,
      });
      if (result) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        setError("Ingen filversion hittades.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte öppna dokumentet.");
    } finally {
      setOpening(null);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-[13px] text-ink-3 shadow-elev1">
        Inga dokument kopplade än.{" "}
        <Link href={projectBasePath + "/dokument"} className="underline-offset-2 hover:underline">
          Ladda upp via dokumentmodulen
        </Link>{" "}
        — välj denna leverabel i uppladdningsformuläret.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
          {error}
        </div>
      )}
      <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev1">
        {documents.map((d, idx) => {
          const status = DOC_STATUS.find((s) => s.id === d.status);
          return (
            <li
              key={d.id}
              className={idx === 0 ? "" : "border-t border-border"}
            >
              <button
                type="button"
                onClick={() => open(d.id)}
                disabled={opening === d.id}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-secondary/40 disabled:opacity-60"
              >
                <span className="flex-1 truncate text-[13.5px] font-medium text-ink">
                  {d.name}
                </span>
                {status && (
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[10.5px] font-medium ${status.cls}`}
                  >
                    {status.label}
                  </span>
                )}
                <span className="font-mono text-[11px] text-ink-3">
                  v{d.current_version}
                </span>
                <span className="text-[11px] text-ink-3">
                  {opening === d.id ? "Öppnar…" : "Öppna →"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
