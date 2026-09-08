"use client";

// PM Cloud-paritet: kort-grid över teknikområden + detalj-panel under
// med fas, status, framsteg, nyckelkomponenter, integrationspunkter.

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type {
  PmDiscipline,
  PmDeliverableWithJoins,
  PmPhase,
} from "@/lib/db/deliverables";
import { DISCIPLINES as ACCESS_DISCIPLINES } from "@/lib/access/constants";
import {
  createDiscipline,
  updateDiscipline,
  deleteDiscipline,
  type ActionResult,
  type DisciplineInput,
} from "@/app/actions/deliverables";
import {
  disciplineIcon,
  defaultIconForCode,
  DISCIPLINE_ICON_NAMES,
} from "@/lib/discipline-icons";

interface Props {
  orgSlug: string;
  projectSlug: string;
  projectId: string;
  projectName: string;
  disciplines: PmDiscipline[];
  deliverables: PmDeliverableWithJoins[];
  phases: PmPhase[];
  canManage: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  planering: "Planering",
  projektering: "Projektering",
  pagaende: "Pågående",
  klar: "Klar",
  paus: "Pausad",
};

const STATUS_TONE: Record<string, { bg: string; color: string }> = {
  planering: { bg: "#f1f5f9", color: "#475569" },
  projektering: { bg: "#dbeafe", color: "#1e40af" },
  pagaende: { bg: "#fef3c7", color: "#92400e" },
  klar: { bg: "#dcfce7", color: "#15803d" },
  paus: { bg: "#fee2e2", color: "#991b1b" },
};

export default function TechnicalAreasView({
  orgSlug,
  projectSlug,
  projectId,
  projectName,
  disciplines,
  deliverables,
  phases,
  canManage,
}: Props) {
  const sorted = useMemo(
    () => [...disciplines].sort((a, b) => a.sort_order - b.sort_order),
    [disciplines],
  );

  const phasesById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases]);
  const countByDisc = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of deliverables) {
      if (d.discipline_id) m.set(d.discipline_id, (m.get(d.discipline_id) ?? 0) + 1);
    }
    return m;
  }, [deliverables]);

  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; discipline: PmDiscipline } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = sorted.find((s) => s.id === selectedId) ?? null;

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else after?.();
    });
  }

  async function handleDelete(d: PmDiscipline) {
    const count = countByDisc.get(d.id) ?? 0;
    const msg =
      count > 0
        ? `Radera "${d.name}"? ${count} leverabler tappar koppling men behålls.`
        : `Radera "${d.name}"?`;
    if (!confirm(msg)) return;
    run(
      () => deleteDiscipline(orgSlug, projectSlug, d.id),
      () => setSelectedId(null),
    );
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-3">
              Projekt
            </p>
            <h1
              className="mt-1 text-3xl font-light tracking-tight"
              style={{ color: "#1e40af" }}
            >
              Teknik
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-3">
              {projectName} · {sorted.length} teknikområden
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
              Lägg till teknikområde
            </button>
          )}
        </header>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
            {error}
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-[13px] text-ink-3">
            Inga teknikområden än. Klicka <strong>Lägg till teknikområde</strong> för att börja.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sorted.map((d) => (
              <DisciplineCard
                key={d.id}
                discipline={d}
                phase={d.phase_id ? phasesById.get(d.phase_id) ?? null : null}
                deliverableCount={countByDisc.get(d.id) ?? 0}
                selected={d.id === selectedId}
                onSelect={() => setSelectedId(d.id)}
              />
            ))}
          </div>
        )}

        {selected && (
          <DisciplineDetail
            discipline={selected}
            phase={selected.phase_id ? phasesById.get(selected.phase_id) ?? null : null}
            deliverableCount={countByDisc.get(selected.id) ?? 0}
            canManage={canManage}
            pending={pending}
            onEdit={() => setModal({ mode: "edit", discipline: selected })}
            onDelete={() => handleDelete(selected)}
          />
        )}
      </div>

      {modal && (
        <DisciplineFormModal
          initial={modal.mode === "edit" ? modal.discipline : null}
          existingCodes={sorted.map((s) => s.code)}
          phases={phases}
          pending={pending}
          onClose={() => setModal(null)}
          onSave={(data) => {
            const op =
              modal.mode === "edit"
                ? () => updateDiscipline(orgSlug, projectSlug, modal.discipline.id, data)
                : () => createDiscipline(orgSlug, projectSlug, projectId, data);
            run(op, () => setModal(null));
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Discipline card (grid item)
// =============================================================================

function DisciplineCard({
  discipline,
  phase,
  deliverableCount,
  selected,
  onSelect,
}: {
  discipline: PmDiscipline;
  phase: PmPhase | null;
  deliverableCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = disciplineIcon(discipline.icon_name, discipline.code);
  const tone = STATUS_TONE[discipline.status] ?? STATUS_TONE.planering;
  const color = discipline.color ?? "#64748b";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-lg border bg-surface p-4 text-left transition hover:shadow-elev1"
      style={{
        borderColor: selected ? color : "#e2e8f0",
        boxShadow: selected ? `0 0 0 2px ${color}33` : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border bg-panel"
          style={{ borderColor: color + "55", color }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{discipline.name}</span>
            <span className="font-mono text-[11px] text-ink-3">({discipline.code})</span>
          </div>
          {phase && (
            <div className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
              {phase.name}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <span
          className="rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: tone.bg, color: tone.color }}
        >
          {STATUS_LABEL[discipline.status] ?? discipline.status}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-1 overflow-hidden rounded bg-border">
          <div
            className="h-full"
            style={{ width: `${discipline.progress}%`, background: color }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-ink-3">
          <span>{deliverableCount} leverabler</span>
          <span className="font-mono">{discipline.progress}%</span>
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// Discipline detail (panel under listan)
// =============================================================================

function DisciplineDetail({
  discipline,
  phase,
  deliverableCount,
  canManage,
  pending,
  onEdit,
  onDelete,
}: {
  discipline: PmDiscipline;
  phase: PmPhase | null;
  deliverableCount: number;
  canManage: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = disciplineIcon(discipline.icon_name, discipline.code);
  const tone = STATUS_TONE[discipline.status] ?? STATUS_TONE.planering;
  const color = discipline.color ?? "#64748b";

  return (
    <div
      className="relative mt-4 overflow-hidden rounded-lg border bg-surface p-5 shadow-elev1"
      style={{ borderColor: color + "55" }}
    >
      <span
        aria-hidden
        className="absolute right-0 top-0 h-6 w-6"
        style={{ background: color }}
      />

      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded border bg-panel"
          style={{ borderColor: color + "55", color }}
        >
          <Icon size={22} strokeWidth={1.75} />
        </span>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium">
              {discipline.name}{" "}
              <span className="font-mono text-[13px] text-ink-3">({discipline.code})</span>
            </h3>
            <span
              className="rounded px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider"
              style={{ background: tone.bg, color: tone.color }}
            >
              {STATUS_LABEL[discipline.status] ?? discipline.status}
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

          {discipline.description && (
            <p className="mt-2 text-[13.5px] text-ink-2">{discipline.description}</p>
          )}

          {/* Meta-rad: team / slutdatum / framsteg */}
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MetaCol label="Ansvarigt team" value={discipline.responsible_team ?? "—"} />
            <MetaCol
              label="Planerat slutdatum"
              value={discipline.target_date ?? "—"}
              mono
            />
            <div>
              <div className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
                Framsteg
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-border">
                  <div
                    className="h-full"
                    style={{ width: `${discipline.progress}%`, background: color }}
                  />
                </div>
                <span className="font-mono text-[12.5px] font-medium text-ink">
                  {discipline.progress}%
                </span>
              </div>
            </div>
          </div>

          {/* Nyckelkomponenter + integrationspunkter */}
          {(discipline.key_components?.length || discipline.integration_points?.length) ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {discipline.key_components && discipline.key_components.length > 0 && (
                <ArrowList title="Nyckelkomponenter" items={discipline.key_components} />
              )}
              {discipline.integration_points && discipline.integration_points.length > 0 && (
                <ArrowList
                  title="Integrationspunkter"
                  items={discipline.integration_points}
                />
              )}
            </div>
          ) : null}

          {/* Fas + leverabler-count */}
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-[12px] text-ink-3">
            <span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
                Fas:
              </span>{" "}
              <span className="text-ink">{phase ? phase.name : "—"}</span>
            </span>
            <span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
                Leverabler:
              </span>{" "}
              <span className="text-ink">{deliverableCount}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCol({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {label}
      </div>
      <div className={`mt-0.5 text-[13px] text-ink ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function ArrowList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[13px] text-ink">
            <span className="mt-0.5 text-accent">›</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// Discipline form modal — rich data
// =============================================================================

const COLOR_PRESETS = [
  "#1E3A8A",
  "#F59E0B",
  "#0EA5E9",
  "#10B981",
  "#EAB308",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#64748B",
];

function DisciplineFormModal({
  initial,
  existingCodes,
  phases,
  pending,
  onClose,
  onSave,
}: {
  initial: PmDiscipline | null;
  existingCodes: string[];
  phases: PmPhase[];
  pending: boolean;
  onClose: () => void;
  onSave: (data: DisciplineInput) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? COLOR_PRESETS[0]);
  const [iconName, setIconName] = useState(
    initial?.icon_name ?? (initial ? defaultIconForCode(initial.code) : "layers"),
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "planering");
  const [progress, setProgress] = useState(String(initial?.progress ?? 0));
  const [phaseId, setPhaseId] = useState(initial?.phase_id ?? "");
  const [team, setTeam] = useState(initial?.responsible_team ?? "");
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? "");
  const [keyComponents, setKeyComponents] = useState(
    (initial?.key_components ?? []).join("\n"),
  );
  const [integrationPoints, setIntegrationPoints] = useState(
    (initial?.integration_points ?? []).join("\n"),
  );
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));

  const codeUpper = code.trim().toUpperCase();
  const codeTaken = Boolean(
    codeUpper && codeUpper !== initial?.code && existingCodes.includes(codeUpper),
  );

  function pickPreset(c: typeof ACCESS_DISCIPLINES[number]) {
    setCode(c.code);
    if (!name.trim()) setName(c.sv);
    if (!initial) setIconName(defaultIconForCode(c.code));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (codeTaken) return;
    onSave({
      code: codeUpper,
      name: name.trim(),
      color,
      icon_name: iconName,
      description: description.trim() || null,
      status,
      progress: Number(progress) || 0,
      phase_id: phaseId || null,
      responsible_team: team.trim() || null,
      target_date: targetDate || null,
      key_components: keyComponents
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      integration_points: integrationPoints
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
          {initial ? "Redigera teknikområde" : "Lägg till teknikområde"}
        </h2>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kod">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="A"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-[13px] uppercase"
              />
            </Field>
            <div className="col-span-2">
              <Field label="Namn">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Arkitektur"
                  className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
                />
              </Field>
            </div>
          </div>

          {codeTaken && (
            <p className="text-[11px] text-red-700">Koden är upptagen.</p>
          )}

          <div>
            <div className="text-[11px] font-medium text-ink-3">
              Snabbval (standardkoder)
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {ACCESS_DISCIPLINES.slice(0, 12).map((d) => (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => pickPreset(d)}
                  className="rounded border border-border bg-panel px-2 py-0.5 font-mono text-[11px] uppercase text-ink-2 hover:bg-secondary"
                  title={d.sv}
                >
                  {d.code}
                </button>
              ))}
            </div>
          </div>

          <Field label="Beskrivning">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Arkitektonisk utformning — planlösningar, fasadgestaltning, materialval…"
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fas">
              <select
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              >
                <option value="">— (ingen fas) —</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    Fas {p.stage} · {p.name}
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
                <option value="planering">Planering</option>
                <option value="projektering">Projektering</option>
                <option value="pagaende">Pågående</option>
                <option value="klar">Klar</option>
                <option value="paus">Pausad</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <Field label="Ansvarigt team">
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Arkitektkonsult"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
            <Field label="Slutdatum">
              <input
                type="date"
                value={targetDate ?? ""}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nyckelkomponenter (en per rad)">
              <textarea
                value={keyComponents}
                onChange={(e) => setKeyComponents(e.target.value)}
                rows={4}
                placeholder="Planlösningar&#10;Fasadgestaltning&#10;…"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
            <Field label="Integrationspunkter (en per rad)">
              <textarea
                value={integrationPoints}
                onChange={(e) => setIntegrationPoints(e.target.value)}
                rows={4}
                placeholder="Konstruktion (bärande väggar)&#10;VVS (schakt)&#10;…"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
              />
            </Field>
          </div>

          <div>
            <div className="text-[11px] font-medium text-ink-3">Färg + ikon</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded border-2 ${
                    color === c ? "border-ink" : "border-transparent"
                  }`}
                  style={{ background: c }}
                  aria-label={`Färg ${c}`}
                />
              ))}
              <input
                type="color"
                value={color ?? "#64748B"}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-12 cursor-pointer rounded border border-border bg-bg"
              />
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="ml-2 rounded-md border border-border bg-bg px-2 py-1.5 text-[12.5px]"
              >
                {DISCIPLINE_ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    Ikon: {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Field label="Sorteringsordning">
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-32 rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]"
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
