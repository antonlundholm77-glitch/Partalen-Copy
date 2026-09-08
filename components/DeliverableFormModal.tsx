"use client";

// CRUD-modal för pm_deliverables. Används från ProcessView (PhaseDetail)
// och kan återanvändas från leverabel-listan. När phase pre-väljs döljs
// fas-dropdownen (den är redan satt från kontext).

import { useState } from "react";
import type { PmDeliverableWithJoins, PmDiscipline, PmPhase } from "@/lib/db/deliverables";
import type { DeliverableInput } from "@/app/actions/deliverables";

const STATUS_OPTIONS = [
  { value: "ej-paborjad", label: "Ej påbörjad" },
  { value: "pagaende", label: "Pågående" },
  { value: "granskning", label: "Granskning" },
  { value: "klar", label: "Klar" },
];

export default function DeliverableFormModal({
  initial,
  phases,
  disciplines,
  presetPhaseId,
  existingCodes,
  pending,
  onClose,
  onSave,
}: {
  initial: PmDeliverableWithJoins | null;
  phases: PmPhase[];
  disciplines: PmDiscipline[];
  // När satt: phase låses till denna fas (används från PhaseDetail-knappen)
  presetPhaseId?: string;
  existingCodes: string[];
  pending: boolean;
  onClose: () => void;
  onSave: (data: DeliverableInput) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? suggestNextCode(existingCodes));
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [phaseId, setPhaseId] = useState(initial?.phase_id ?? presetPhaseId ?? "");
  const [disciplineId, setDisciplineId] = useState(initial?.discipline_id ?? "");
  const [status, setStatus] = useState(initial?.status ?? "ej-paborjad");
  const [format, setFormat] = useState(initial?.format ?? "");
  const [responsible, setResponsible] = useState(initial?.responsible ?? "");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [building, setBuilding] = useState(initial?.building ?? "");
  const [informationContent, setInformationContent] = useState(
    (initial?.information_content ?? []).join("\n"),
  );
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));

  const codeUpper = code.trim();
  const codeTaken = Boolean(
    codeUpper && codeUpper !== initial?.code && existingCodes.includes(codeUpper),
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (codeTaken) return;
    onSave({
      code: codeUpper,
      name: name.trim(),
      description: description.trim() || null,
      phase_id: phaseId || null,
      discipline_id: disciplineId || null,
      status,
      format: format.trim() || null,
      responsible: responsible.trim() || null,
      due_date: dueDate || null,
      building: building.trim() || null,
      information_content: informationContent
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      sort_order: Number(sortOrder) || 0,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-elev2"
      >
        <h2 className="text-lg font-medium">
          {initial ? `Redigera leverabel ${initial.code}` : "Lägg till leverabel"}
        </h2>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kod">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="D001"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-[13px] uppercase"
              />
              {codeTaken && (
                <p className="mt-1 text-[11px] text-red-700">Koden är upptagen.</p>
              )}
            </Field>
            <div className="col-span-2">
              <Field label="Namn">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Systemhandlingsritningar A"
                  className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
                />
              </Field>
            </div>
          </div>

          <Field label="Beskrivning">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            {!presetPhaseId && (
              <Field label="Fas">
                <select
                  value={phaseId}
                  onChange={(e) => setPhaseId(e.target.value)}
                  className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
                >
                  <option value="">— (ingen) —</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      Fas {p.stage} · {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Teknikområde">
              <select
                value={disciplineId}
                onChange={(e) => setDisciplineId(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              >
                <option value="">— (ingen) —</option>
                {disciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Format">
              <input
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="PDF / DWG / IFC"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
            <Field label="Ansvarig">
              <input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Arkitektkonsult"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
            <Field label="Måldatum">
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Byggnadsdel">
              <input
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="Hus A / B / C"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
            <Field label="Sorteringsordning">
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
          </div>

          <Field label="Innehåll (en punkt per rad)">
            <textarea
              value={informationContent}
              onChange={(e) => setInformationContent(e.target.value)}
              rows={4}
              placeholder="Planlösningar alla plan&#10;Fasader alla väderstreck&#10;…"
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
            />
          </Field>
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex justify-end gap-2 border-t border-border bg-surface px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-[13px] hover:bg-secondary"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={pending || codeTaken}
            className="rounded bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Spara"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-medium text-ink-3">
      {label}
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

// Föreslå nästa kod baserat på vilka som finns. D001, D002 … osv.
function suggestNextCode(existing: string[]): string {
  const nums = existing
    .map((c) => /^D(\d+)$/i.exec(c))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => parseInt(m[1], 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `D${String(next).padStart(3, "0")}`;
}
