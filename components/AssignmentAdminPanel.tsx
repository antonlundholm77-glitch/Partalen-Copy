"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  createAssignmentInOrg,
  updateAssignmentInOrg,
  setAssignmentStatusInOrg,
  deployProjectFromAssignment,
  type AssignmentActionResult,
} from "@/app/actions/assignments";
import {
  archiveProjectInOrg,
  unarchiveProjectInOrg,
} from "@/app/actions/projects";

const PHASE_OPTIONS = [
  ["forstudie",    "Förstudie"],
  ["projektering", "Projektering"],
  ["upphandling",  "Upphandling"],
  ["anbud",        "Anbud"],
  ["utforande",    "Utförande"],
  ["overlamning",  "Överlämning"],
  ["forvaltning",  "Förvaltning"],
] as const;

const STATUS_LABEL: Record<string, string> = {
  draft:    "Utkast",
  active:   "Aktivt",
  inactive: "Inaktivt",
};

const STATUS_CLASS: Record<string, string> = {
  draft:    "text-ink-3 bg-secondary/40 border-border",
  active:   "text-emerald-700 bg-emerald-50 border-emerald-200",
  inactive: "text-amber-700 bg-amber-50 border-amber-200",
};

export interface AssignmentAdminRow {
  id: string;
  title: string;
  description: string | null;
  operator: string | null;
  status: "draft" | "active" | "inactive";
  projects: { id: string; slug: string; name: string; status: string }[];
}

export default function AssignmentAdminPanel({
  orgSlug,
  assignments,
}: {
  orgSlug: string;
  assignments: AssignmentAdminRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deployingId, setDeployingId] = useState<string | null>(null);

  function run(action: () => Promise<AssignmentActionResult>, successMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setFeedback({ kind: "ok", msg: successMsg });
        setEditingId(null);
        setDeployingId(null);
      } else {
        setFeedback({ kind: "error", msg: res.error });
      }
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title       = String(fd.get("title")       ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const operator    = String(fd.get("operator")    ?? "").trim();
    if (!title) { setFeedback({ kind: "error", msg: "Titel krävs." }); return; }
    const formEl = e.currentTarget;
    run(
      () => createAssignmentInOrg(orgSlug, {
        title,
        description: description || undefined,
        operator:    operator    || undefined,
      }),
      `Uppdrag "${title}" skapat.`,
    );
    formEl.reset();
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>, assignmentId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title       = String(fd.get("title")       ?? "").trim();
    const description = String(fd.get("description") ?? "").trim() || null;
    const operator    = String(fd.get("operator")    ?? "").trim() || null;
    run(
      () => updateAssignmentInOrg(orgSlug, assignmentId, { title, description, operator }),
      "Uppdrag sparat.",
    );
  }

  function handleDeploySubmit(e: React.FormEvent<HTMLFormElement>, assignmentId: string) {
    e.preventDefault();
    const fd    = new FormData(e.currentTarget);
    const name  = String(fd.get("name")  ?? "").trim();
    const phase = String(fd.get("phase") ?? "forstudie");
    if (!name) { setFeedback({ kind: "error", msg: "Projektnamn krävs." }); return; }
    run(
      () => deployProjectFromAssignment(orgSlug, assignmentId, { name, phase }),
      `Projektsida "${name}" deployad.`,
    );
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={
            feedback.kind === "ok"
              ? "rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800"
              : "rounded border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-800"
          }
        >
          {feedback.msg}
        </div>
      )}

      {/* ── Skapa nytt uppdrag ── */}
      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
          Nytt uppdrag
        </h3>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[2fr_1fr_auto]"
        >
          <input
            name="title"
            type="text"
            required
            placeholder="Uppdragstitel"
            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
          />
          <input
            name="operator"
            type="text"
            placeholder="Operatör"
            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
          />
          <Button type="submit" size="sm" disabled={pending}>
            Skapa
          </Button>
          <textarea
            name="description"
            rows={2}
            placeholder="Beskrivning (valfritt)"
            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px] sm:col-span-3"
          />
        </form>
      </section>

      {/* ── Uppdragslista ── */}
      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
          Uppdrag ({assignments.length})
        </h3>

        {assignments.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-[13.5px] text-fg-2">
            Inga uppdrag än — skapa ovan.
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                {editingId === a.id ? (
                  /* ── Redigeringsform ── */
                  <form
                    onSubmit={(e) => handleEditSubmit(e, a.id)}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_auto]"
                  >
                    <input
                      name="title"
                      defaultValue={a.title}
                      required
                      className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                    />
                    <input
                      name="operator"
                      defaultValue={a.operator ?? ""}
                      placeholder="Operatör"
                      className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={pending}>
                        Spara
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Avbryt
                      </Button>
                    </div>
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={a.description ?? ""}
                      placeholder="Beskrivning"
                      className="rounded border border-border bg-surface px-3 py-[7px] text-[13px] sm:col-span-3"
                    />
                  </form>
                ) : (
                  <>
                    {/* ── Rubrik + statusknappar ── */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[13.5px] text-fg">{a.title}</span>
                        <span
                          className={
                            "rounded-full border px-2 py-0.5 text-[10.5px] font-medium " +
                            (STATUS_CLASS[a.status] ?? "text-ink-3 bg-secondary/40 border-border")
                          }
                        >
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
                      </div>
                      <div className="flex gap-3 text-[12px]">
                        <button
                          type="button"
                          onClick={() => setEditingId(a.id)}
                          className="text-ink-2 underline-offset-2 hover:underline"
                        >
                          Redigera
                        </button>
                        {a.status === "draft" && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setAssignmentStatusInOrg(orgSlug, a.id, "active"),
                                "Uppdrag aktiverat.",
                              )
                            }
                            className="text-emerald-700 underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            Aktivera
                          </button>
                        )}
                        {a.status === "active" && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setAssignmentStatusInOrg(orgSlug, a.id, "inactive"),
                                "Uppdrag inaktiverat.",
                              )
                            }
                            className="text-amber-700 underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            Inaktivera
                          </button>
                        )}
                        {a.status === "inactive" && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setAssignmentStatusInOrg(orgSlug, a.id, "active"),
                                "Uppdrag återaktiverat.",
                              )
                            }
                            className="text-emerald-700 underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            Återaktivera
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Metadata ── */}
                    {a.description && (
                      <p className="mt-1.5 text-[12.5px] text-ink-2">{a.description}</p>
                    )}
                    {a.operator && (
                      <p className="mt-1 text-[11.5px] text-ink-3">
                        Operatör: {a.operator}
                      </p>
                    )}

                    {/* ── Länkade projektsidor med aktiv/inaktiv-toggle ── */}
                    {a.projects.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.projects.map((p) => {
                          const isActive = p.status !== "arkiverat";
                          return (
                            <div
                              key={p.id}
                              className="inline-flex items-center overflow-hidden rounded border border-border bg-elevated text-[11.5px]"
                            >
                              <Link
                                href={`/c/${orgSlug}/${p.slug}`}
                                className="px-2 py-0.5 text-ink-2 hover:text-fg hover:bg-panel transition-colors"
                              >
                                {p.name} ↗
                              </Link>
                              <button
                                type="button"
                                disabled={pending}
                                title={isActive ? "Aktiv — klicka för att inaktivera" : "Inaktiv — klicka för att aktivera"}
                                onClick={() =>
                                  run(
                                    () => isActive
                                      ? archiveProjectInOrg(orgSlug, p.id)
                                      : unarchiveProjectInOrg(orgSlug, p.id),
                                    isActive ? `"${p.name}" inaktiverat.` : `"${p.name}" aktiverat.`,
                                  )
                                }
                                className={
                                  "border-l border-border px-1.5 py-0.5 font-medium transition-colors disabled:opacity-50 " +
                                  (isActive
                                    ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                    : "text-gray-400 bg-gray-50 hover:bg-gray-100")
                                }
                              >
                                {isActive ? "●" : "○"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Deploy projektsida ── */}
                    <div className="mt-3 border-t border-border pt-3">
                      {deployingId === a.id ? (
                        <form
                          onSubmit={(e) => handleDeploySubmit(e, a.id)}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            name="name"
                            type="text"
                            required
                            placeholder="Projektnamn"
                            className="rounded border border-border bg-surface px-3 py-[6px] text-[13px] min-w-[160px]"
                          />
                          <select
                            name="phase"
                            defaultValue="forstudie"
                            className="rounded border border-border bg-surface px-3 py-[6px] text-[13px]"
                          >
                            {PHASE_OPTIONS.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" size="sm" disabled={pending}>
                            Deploya
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeployingId(null)}
                          >
                            Avbryt
                          </Button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeployingId(a.id)}
                          className="text-[12px] font-medium text-ink-2 hover:text-fg underline-offset-2 hover:underline"
                        >
                          + Deploy projektsida
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
