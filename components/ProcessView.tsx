"use client";

// PM Cloud-paritet: cirkel-flow för projektets livscykel.
// Stora numrerade cirklar i horisontell rad, färgkodade efter status.
// Klick → detalj-panel under med leverabler + framsteg + redigera/radera.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  CheckSquare,
  Activity,
  Calendar,
  FileText,
} from "lucide-react";
import type { PmPhase, PmDeliverableWithJoins, PmDiscipline } from "@/lib/db/deliverables";
import {
  createPhase,
  updatePhase,
  deletePhase,
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  type ActionResult,
  type PhaseInput,
} from "@/app/actions/deliverables";
import DeliverableFormModal from "@/components/DeliverableFormModal";

interface ProcessViewProps {
  orgSlug: string;
  projectSlug: string;
  projectId: string;
  projectName: string;
  phases: PmPhase[];
  deliverables: PmDeliverableWithJoins[];
  disciplines: PmDiscipline[];
  canManage: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  completed: "Klar",
  current: "Pågående",
  upcoming: "Kommande",
};

// Färg-paletten (matchar mockupens cirkel-färger).
const STATUS_COLORS: Record<string, { ring: string; text: string; bg: string; soft: string }> = {
  completed: { ring: "#16a34a", text: "#15803d", bg: "#dcfce7", soft: "#f0fdf4" },
  current: { ring: "#1e40af", text: "#1e40af", bg: "#dbeafe", soft: "#eff6ff" },
  upcoming: { ring: "#cbd5e1", text: "#64748b", bg: "#f1f5f9", soft: "#f8fafc" },
};

function statusOf(phase: PmPhase): "completed" | "current" | "upcoming" {
  if (phase.status === "completed" || phase.status === "klar") return "completed";
  if (phase.status === "current" || phase.status === "pågående" || phase.status === "pagaende")
    return "current";
  return "upcoming";
}

export default function ProcessView({
  orgSlug,
  projectSlug,
  projectId,
  projectName,
  phases,
  deliverables,
  disciplines,
  canManage,
}: ProcessViewProps) {
  const sorted = useMemo(
    () => [...phases].sort((a, b) => a.sort_order - b.sort_order),
    [phases],
  );

  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; phase: PmPhase } | null
  >(null);
  const [delModal, setDelModal] = useState<
    | { mode: "create"; phaseId: string }
    | { mode: "edit"; deliverable: PmDeliverableWithJoins }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = sorted.find((p) => p.id === selectedId) ?? null;
  const phaseDeliverables = useMemo(
    () => (selected ? deliverables.filter((d) => d.phase_id === selected.id) : []),
    [deliverables, selected],
  );
  const phaseDisciplines = useMemo(
    () => (selected ? disciplines.filter((d) => d.phase_id === selected.id) : []),
    [disciplines, selected],
  );

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else after?.();
    });
  }

  async function handleDelete(phase: PmPhase) {
    if (!confirm(`Radera fas "${phase.name}"? Leverabler under fasen tappar koppling.`))
      return;
    run(
      () => deletePhase(orgSlug, projectSlug, phase.id),
      () => setSelectedId(null),
    );
  }

  async function handleDeleteDeliverable(d: PmDeliverableWithJoins) {
    if (!confirm(`Radera leverabel "${d.code} · ${d.name}"?`)) return;
    run(() => deleteDeliverable(orgSlug, projectSlug, d.id));
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-3">
            Projekt
          </p>
          <h1 className="mt-1 text-3xl font-light tracking-tight" style={{ color: "#1e40af" }}>
            Genomförande &amp; framdrift
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-3">{projectName}</p>
        </header>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-lg border border-border bg-surface p-6 shadow-elev1">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-3">
                Livscykel
              </p>
              <h2 className="mt-0.5 text-xl font-medium" style={{ color: "#1e40af" }}>
                Projektets livscykel
              </h2>
              <p className="mt-1 text-[12.5px] text-ink-3">
                Projektets faser från förstudie till drift. Klicka på en fas för detaljer.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setModal({ mode: "create" })}
                className="inline-flex items-center gap-1.5 rounded border border-dashed px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-wider transition hover:bg-secondary/40"
                style={{ borderColor: "#1e40af", color: "#1e40af" }}
              >
                <Plus size={13} />
                Lägg till fas
              </button>
            )}
          </div>

          {sorted.length === 0 ? (
            <div className="rounded border border-dashed border-border px-6 py-12 text-center text-[13px] text-ink-3">
              Inga faser än. Klicka <strong>Lägg till fas</strong> för att börja.
            </div>
          ) : (
            <PhaseFlow
              phases={sorted}
              deliverables={deliverables}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}

          <Legend />
        </section>

        {selected && (
          <PhaseDetail
            phase={selected}
            deliverables={phaseDeliverables}
            disciplines={phaseDisciplines}
            canManage={canManage}
            pending={pending}
            onEdit={() => setModal({ mode: "edit", phase: selected })}
            onDelete={() => handleDelete(selected)}
            onAddDeliverable={() => setDelModal({ mode: "create", phaseId: selected.id })}
            onEditDeliverable={(d) => setDelModal({ mode: "edit", deliverable: d })}
            onDeleteDeliverable={handleDeleteDeliverable}
            basePath={`/c/${orgSlug}/${projectSlug}`}
          />
        )}
      </div>

      {modal && (
        <PhaseFormModal
          initial={modal.mode === "edit" ? modal.phase : null}
          existingStages={sorted.map((p) => p.stage)}
          pending={pending}
          onClose={() => setModal(null)}
          onSave={(data) => {
            const op =
              modal.mode === "edit"
                ? () => updatePhase(orgSlug, projectSlug, modal.phase.id, data)
                : () => createPhase(orgSlug, projectSlug, projectId, data);
            run(op, () => setModal(null));
          }}
        />
      )}

      {delModal && (
        <DeliverableFormModal
          initial={delModal.mode === "edit" ? delModal.deliverable : null}
          phases={sorted}
          disciplines={disciplines}
          presetPhaseId={delModal.mode === "create" ? delModal.phaseId : undefined}
          existingCodes={deliverables
            .map((d) => d.code)
            .filter((c) => delModal.mode !== "edit" || c !== delModal.deliverable.code)}
          pending={pending}
          onClose={() => setDelModal(null)}
          onSave={(data) => {
            const op =
              delModal.mode === "edit"
                ? () =>
                    updateDeliverable(orgSlug, projectSlug, delModal.deliverable.id, data)
                : () => createDeliverable(orgSlug, projectSlug, projectId, data);
            run(op, () => setDelModal(null));
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Cirkel-flow
// =============================================================================

function PhaseFlow({
  phases,
  deliverables,
  selectedId,
  onSelect,
}: {
  phases: PmPhase[];
  deliverables: PmDeliverableWithJoins[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="my-6 grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {phases.map((phase) => {
        const status = statusOf(phase);
        const colors = STATUS_COLORS[status];
        const isSelected = phase.id === selectedId;
        const count = deliverables.filter((d) => d.phase_id === phase.id).length;
        const Icon =
          status === "completed" ? CheckSquare : status === "current" ? Activity : Calendar;

        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => onSelect(phase.id)}
            className="group flex flex-col items-center text-center"
          >
            <span
              className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 transition group-hover:shadow-md"
              style={{
                borderColor: colors.ring,
                background: isSelected ? colors.bg : "#fff",
                boxShadow: isSelected ? `0 0 0 3px ${colors.ring}33` : undefined,
              }}
            >
              <span
                className="font-display text-2xl font-light leading-none"
                style={{ color: colors.text }}
              >
                {phase.stage}
              </span>
              <Icon size={13} className="mt-1" style={{ color: colors.text }} />
            </span>
            <span
              className="mt-2 text-[12.5px] font-medium"
              style={{ color: status === "upcoming" ? "#64748b" : "#0f172a" }}
            >
              {phase.name}
            </span>
            {phase.description && (
              <span className="mt-0.5 line-clamp-2 text-[10.5px] leading-tight text-ink-3">
                {phase.description}
              </span>
            )}
            <span
              className="mt-1.5 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider"
              style={{ background: colors.bg, color: colors.text }}
            >
              {STATUS_LABEL[status]}
            </span>
            {count > 0 && (
              <span className="mt-0.5 text-[10px] text-ink-3">{count} leverabler</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-5 border-t border-border pt-4 text-[11px] text-ink-3">
      <LegendDot color={STATUS_COLORS.completed.ring} label="Avklarade faser" />
      <LegendDot color={STATUS_COLORS.current.ring} label="Pågående fas" />
      <LegendDot color={STATUS_COLORS.upcoming.ring} label="Kommande faser" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

// =============================================================================
// Phase detail
// =============================================================================

function PhaseDetail({
  phase,
  deliverables,
  disciplines,
  canManage,
  pending,
  onEdit,
  onDelete,
  onAddDeliverable,
  onEditDeliverable,
  onDeleteDeliverable,
  basePath,
}: {
  phase: PmPhase;
  deliverables: PmDeliverableWithJoins[];
  disciplines: PmDiscipline[];
  canManage: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddDeliverable: () => void;
  onEditDeliverable: (d: PmDeliverableWithJoins) => void;
  onDeleteDeliverable: (d: PmDeliverableWithJoins) => void;
  basePath: string;
}) {
  const status = statusOf(phase);
  const colors = STATUS_COLORS[status];

  return (
    <div
      className="mt-4 overflow-hidden rounded-lg border bg-surface shadow-elev1"
      style={{ borderColor: colors.ring + "55" }}
    >
      <div
        className="border-l-4 p-5"
        style={{ borderLeftColor: colors.ring, background: colors.soft }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-medium">
            Fas {phase.stage}: {phase.name}
          </h3>
          <span
            className="rounded px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider"
            style={{ background: colors.bg, color: colors.text }}
          >
            {STATUS_LABEL[status]}
          </span>
          {canManage && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[11.5px] text-ink-2 hover:bg-secondary disabled:opacity-50"
              >
                <Pencil size={12} /> Redigera
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[11.5px] text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
        {phase.description && (
          <p className="mt-2 text-[13.5px] text-ink-2">{phase.description}</p>
        )}

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
                <FileText size={11} />
                Leverabler ({deliverables.length})
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={onAddDeliverable}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded border border-dashed border-accent px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent transition hover:bg-accent/5 disabled:opacity-50"
                >
                  <Plus size={11} /> Lägg till
                </button>
              )}
            </div>
            {deliverables.length === 0 ? (
              <div className="rounded border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-ink-3">
                Inga leverabler i fasen ännu.{" "}
                {canManage && (
                  <button
                    type="button"
                    onClick={onAddDeliverable}
                    className="underline-offset-2 hover:underline"
                    style={{ color: "#1e40af" }}
                  >
                    Lägg till den första
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-1">
                {deliverables.map((d) => (
                  <li
                    key={d.id}
                    className="group flex items-center gap-2 rounded px-2 py-1 text-[13px] transition hover:bg-secondary/50"
                  >
                    <Link
                      href={`${basePath}/leverabler/${d.code}`}
                      className="flex flex-1 items-center gap-2 truncate"
                    >
                      <span className="font-mono text-[11px] text-ink-3">{d.code}</span>
                      {d.discipline && (
                        <span
                          className="inline-flex h-4 items-center rounded px-1 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-white"
                          style={{ background: d.discipline.color ?? "#64748b" }}
                        >
                          {d.discipline.code}
                        </span>
                      )}
                      <span className="flex-1 truncate text-ink">{d.name}</span>
                    </Link>
                    {canManage && (
                      <span className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onEditDeliverable(d)}
                          disabled={pending}
                          aria-label="Redigera"
                          className="rounded p-1 text-ink-3 hover:bg-secondary hover:text-ink disabled:opacity-50"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDeliverable(d)}
                          disabled={pending}
                          aria-label="Radera"
                          className="rounded p-1 text-ink-3 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 size={11} />
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
              Framsteg
            </div>
            <div className="mb-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-border">
                <div
                  className="h-full"
                  style={{ width: `${phase.progress}%`, background: colors.ring }}
                />
              </div>
              <span className="font-mono text-[12.5px] font-medium text-ink">
                {phase.progress}%
              </span>
            </div>
            <div className="mt-3 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
              {status === "completed" ? "Avslutad" : "Planerat slutdatum"}
            </div>
            <div className="mt-0.5 font-mono text-[12.5px] text-ink">
              {phase.completion_date ?? "—"}
            </div>

            {disciplines.length > 0 && (
              <>
                <div className="mt-4 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
                  Aktiva teknikområden
                </div>
                <ul className="mt-1 space-y-0.5">
                  {disciplines.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-1.5 text-[12px] text-ink-2"
                    >
                      <span
                        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded font-mono text-[8.5px] font-bold uppercase text-white"
                        style={{ background: d.color ?? "#64748b" }}
                      >
                        {d.code}
                      </span>
                      <span>{d.name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {phase.key_activities && phase.key_activities.length > 0 && (
              <>
                <div className="mt-4 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
                  Nyckelaktiviteter
                </div>
                <ul className="mt-1 space-y-0.5">
                  {phase.key_activities.map((a, i) => (
                    <li key={i} className="text-[12.5px] text-ink-2">
                      · {a}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Phase form modal
// =============================================================================

function PhaseFormModal({
  initial,
  existingStages,
  pending,
  onClose,
  onSave,
}: {
  initial: PmPhase | null;
  existingStages: string[];
  pending: boolean;
  onClose: () => void;
  onSave: (data: PhaseInput) => void;
}) {
  const [stage, setStage] = useState(initial?.stage ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "upcoming");
  const [progress, setProgress] = useState(String(initial?.progress ?? 0));
  const [completionDate, setCompletionDate] = useState(initial?.completion_date ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [keyActivities, setKeyActivities] = useState(
    (initial?.key_activities ?? []).join("\n"),
  );

  const stageTaken = Boolean(
    stage && stage !== initial?.stage && existingStages.includes(stage.trim()),
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (stageTaken) return;
    onSave({
      stage: stage.trim(),
      name: name.trim(),
      description: description.trim() || null,
      status,
      progress: Number(progress) || 0,
      completion_date: completionDate || null,
      sort_order: Number(sortOrder) || 0,
      key_activities: keyActivities
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
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
        className="w-full max-w-lg rounded-lg border border-border bg-surface p-5 shadow-elev2"
      >
        <h2 className="text-lg font-medium">{initial ? "Redigera fas" : "Lägg till fas"}</h2>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage (kort kod, t.ex. 2)">
              <input
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
              {stageTaken && (
                <p className="mt-1 text-[11px] text-red-700">Stage upptagen.</p>
              )}
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
          <Field label="Namn">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
            />
          </Field>
          <Field label="Beskrivning">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              >
                <option value="upcoming">Kommande</option>
                <option value="current">Pågående</option>
                <option value="completed">Klar</option>
              </select>
            </Field>
            <Field label="Framsteg (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
            <Field label="Slutdatum">
              <input
                type="date"
                value={completionDate ?? ""}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
          </div>
          <Field label="Nyckelaktiviteter (en per rad)">
            <textarea
              value={keyActivities}
              onChange={(e) => setKeyActivities(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-[13px] hover:bg-secondary"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={pending || stageTaken}
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
