"use client";

// Skapa/redigera/arkivera projekt i en kund. Renderas på kundens admin-sida
// när AUTH_ENABLED. Skriver via actions i app/actions/projects.ts.
//
// Slug-fält är valfritt — om tomt genereras det från namnet på servern. När
// arkiverat visas i en kollapsad sektion (klick för att visa).

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Table, Th, TdId, TdName } from "@/components/ui";
import {
  createProjectInOrg,
  updateProjectInOrg,
  archiveProjectInOrg,
  unarchiveProjectInOrg,
  type ProjectActionResult,
} from "@/app/actions/projects";

const PHASE_OPTIONS = [
  ["forstudie", "Förstudie"],
  ["projektering", "Projektering"],
  ["upphandling", "Upphandling"],
  ["anbud", "Anbud"],
  ["utforande", "Utförande"],
  ["overlamning", "Överlämning"],
  ["forvaltning", "Förvaltning"],
] as const;

const PHASE_LABEL: Record<string, string> = Object.fromEntries(PHASE_OPTIONS);

export interface ProjectAdminRow {
  id: string;
  slug: string;
  name: string;
  phase: string;
  status: string;
  meta: string | null;
  program: string | null;
  member_count: number;
}

export default function ProjectAdminPanel({
  orgSlug,
  unitNounSingular,
  unitNounPlural,
  projects,
}: {
  orgSlug: string;
  unitNounSingular: string;
  unitNounPlural: string;
  projects: ProjectAdminRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  function run(action: () => Promise<ProjectActionResult>, successMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setFeedback({ kind: "ok", msg: successMsg });
        setEditingId(null);
      } else setFeedback({ kind: "error", msg: res.error });
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const slug = String(form.get("slug") ?? "").trim();
    const phase = String(form.get("phase") ?? "forstudie");
    const meta = String(form.get("meta") ?? "").trim();
    if (!name) {
      setFeedback({ kind: "error", msg: "Namn krävs." });
      return;
    }
    const formEl = e.currentTarget;
    run(
      () => createProjectInOrg(orgSlug, { name, slug: slug || undefined, phase, meta }),
      `${unitNounSingular} "${name}" skapat.`,
    );
    formEl.reset();
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>, projectId: string) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phase = String(form.get("phase") ?? "");
    const meta = String(form.get("meta") ?? "");
    run(
      () =>
        updateProjectInOrg(orgSlug, projectId, {
          name: name || undefined,
          phase: phase || undefined,
          meta,
        }),
      `${unitNounSingular} uppdaterat.`,
    );
  }

  const active = projects.filter((p) => p.status !== "arkiverat");
  const archived = projects.filter((p) => p.status === "arkiverat");

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

      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
          Nytt {unitNounSingular.toLowerCase()}
        </h3>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
        >
          <input
            name="name"
            type="text"
            required
            placeholder="Namn"
            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
          />
          <input
            name="slug"
            type="text"
            placeholder="Slug (auto om tomt)"
            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
          />
          <select
            name="phase"
            defaultValue="forstudie"
            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
          >
            {PHASE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={pending}>
            Skapa
          </Button>
          <input
            name="meta"
            type="text"
            placeholder="Metarad (valfritt — beställare, AMA-utgåva, mm)"
            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px] sm:col-span-4"
          />
        </form>
      </section>

      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
          {unitNounPlural} ({active.length})
        </h3>
        {active.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-[13.5px] text-fg-2">
            Inga aktiva {unitNounPlural.toLowerCase()} än — skapa ovan.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev1">
            <Table className="!min-w-0">
              <thead>
                <tr>
                  <Th>Namn</Th>
                  <Th>Slug</Th>
                  <Th>Fas</Th>
                  <Th>Medl.</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {active.map((p) =>
                  editingId === p.id ? (
                    <tr key={p.id}>
                      <td colSpan={5} className="bg-elevated">
                        <form
                          onSubmit={(e) => handleEditSubmit(e, p.id)}
                          className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[2fr_1fr_2fr_auto]"
                        >
                          <input
                            name="name"
                            defaultValue={p.name}
                            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                          />
                          <select
                            name="phase"
                            defaultValue={p.phase}
                            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                          >
                            {PHASE_OPTIONS.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <input
                            name="meta"
                            defaultValue={p.meta ?? ""}
                            placeholder="Metarad"
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
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id}>
                      <TdName>
                        <Link
                          href={`/c/${orgSlug}/${p.slug}`}
                          className="hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.meta && (
                          <div className="mt-[2px] text-[11.5px] text-fg-3">{p.meta}</div>
                        )}
                      </TdName>
                      <TdId>{p.slug}</TdId>
                      <td className="text-[12.5px]">{PHASE_LABEL[p.phase] ?? p.phase}</td>
                      <td className="text-[12.5px] text-fg-2">{p.member_count}</td>
                      <td className="space-x-2 text-right">
                        <Link
                          href={`/c/${orgSlug}/${p.slug}/behorighet`}
                          className="text-[12px] text-ink-2 underline-offset-2 hover:underline"
                        >
                          Behörighet
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingId(p.id)}
                          className="text-[12px] text-ink-2 underline-offset-2 hover:underline"
                        >
                          Redigera
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Arkivera ${p.name}?`)) return;
                            run(
                              () => archiveProjectInOrg(orgSlug, p.id),
                              `${unitNounSingular} arkiverat.`,
                            );
                          }}
                          className="text-[12px] text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Arkivera
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3 hover:text-ink-2"
          >
            Arkiverade ({archived.length}) {showArchived ? "▾" : "▸"}
          </button>
          {showArchived && (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <Table className="!min-w-0">
                <thead>
                  <tr>
                    <Th>Namn</Th>
                    <Th>Slug</Th>
                    <Th>Fas</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {archived.map((p) => (
                    <tr key={p.id}>
                      <TdName>{p.name}</TdName>
                      <TdId>{p.slug}</TdId>
                      <td className="text-[12.5px]">{PHASE_LABEL[p.phase] ?? p.phase}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => unarchiveProjectInOrg(orgSlug, p.id),
                              `${unitNounSingular} återöppnat.`,
                            )
                          }
                          className="text-[12px] text-ink-2 underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Återöppna
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
