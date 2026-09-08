"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import AssignmentAdminPanel, { type AssignmentAdminRow } from "@/components/AssignmentAdminPanel";
import { Button } from "@/components/ui";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionResult,
} from "@/app/actions/customers";

export interface OrgAccordionRow {
  orgId: string;
  orgSlug: string;
  orgName: string;
  kind: "entreprenad";
  unit_noun: string;
  unit_noun_plural: string;
  assignments: AssignmentAdminRow[];
}

const KIND_LABEL: Record<string, string> = {
  entreprenad: "Entreprenad",
};

const KIND_CLASS: Record<string, string> = {
  entreprenad: "text-sky-700 bg-sky-50 border-sky-200",
};

export default function KunderUppdragAccordion({ orgs }: { orgs: OrgAccordionRow[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback]       = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [open, setOpen]               = useState<Set<string>>(new Set());
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);

  function run(action: () => Promise<CustomerActionResult>, successMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setFeedback({ kind: "ok", msg: successMsg });
        setEditingOrgId(null);
        setShowCreate(false);
      } else {
        setFeedback({ kind: "error", msg: res.error });
      }
    });
  }

  function toggleOrg(slug: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd   = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const slug = String(fd.get("slug") ?? "").trim();
    const kind = String(fd.get("kind") ?? "entreprenad");
    if (!name) { setFeedback({ kind: "error", msg: "Namn krävs." }); return; }
    run(
      () => createCustomerAction({ name, slug: slug || undefined, kind }),
      `Kund "${name}" skapad.`,
    );
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>, orgId: string) {
    e.preventDefault();
    const fd              = new FormData(e.currentTarget);
    const name            = String(fd.get("name") ?? "").trim();
    const kind            = String(fd.get("kind") ?? "");
    const unit_noun       = String(fd.get("unit_noun") ?? "").trim();
    const unit_noun_plural = String(fd.get("unit_noun_plural") ?? "").trim();
    run(
      () => updateCustomerAction(orgId, {
        name: name || undefined,
        kind: kind || undefined,
        unit_noun: unit_noun || undefined,
        unit_noun_plural: unit_noun_plural || undefined,
      }),
      "Kund uppdaterad.",
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Feedback ── */}
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

      {/* ── Ny kund ── */}
      <div className="rounded-lg border border-border bg-surface">
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-ink-2 hover:text-fg transition-colors"
        >
          <span className="text-[11px]">{showCreate ? "▾" : "▸"}</span>
          + Ny kund
        </button>
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-2 border-t border-border p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
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
              placeholder="Slug (auto)"
              className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
            />
            <select
              name="kind"
              defaultValue="entreprenad"
              className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
            >
              <option value="entreprenad">Entreprenad</option>
            </select>
            <Button type="submit" size="sm" disabled={pending}>
              Skapa
            </Button>
          </form>
        )}
      </div>

      {/* ── Org-accordion ── */}
      <div className="space-y-1">
        {orgs.map((org) => {
          const isOpen    = open.has(org.orgSlug);
          const isEditing = editingOrgId === org.orgId;

          return (
            <div
              key={org.orgSlug}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              {/* Header-rad */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleOrg(org.orgSlug)}
                  className="flex flex-1 items-center gap-2 text-left"
                  aria-expanded={isOpen}
                >
                  <span
                    className={
                      "text-[10px] text-ink-3 transition-transform duration-150 " +
                      (isOpen ? "rotate-90" : "")
                    }
                    aria-hidden
                  >
                    ▶
                  </span>
                  <span className="font-medium text-[13.5px] text-fg">{org.orgName}</span>
                  <span
                    className={
                      "rounded-full border px-1.5 py-0.5 text-[10px] font-medium " +
                      (KIND_CLASS[org.kind] ?? "text-ink-3 bg-secondary/30 border-border")
                    }
                  >
                    {KIND_LABEL[org.kind] ?? org.kind}
                  </span>
                  <span className="ml-1 text-[11.5px] text-ink-3">
                    {org.assignments.length} uppdrag
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-3 text-[12px]">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingOrgId(isEditing ? null : org.orgId)
                    }
                    className="text-ink-2 underline-offset-2 hover:underline"
                  >
                    {isEditing ? "Avbryt" : "Redigera"}
                  </button>
                  <Link
                    href={`/c/${org.orgSlug}/admin`}
                    className="text-ink-3 underline-offset-2 hover:text-fg hover:underline"
                  >
                    Admin ↗
                  </Link>
                </div>
              </div>

              {/* Inline edit-form */}
              {isEditing && (
                <form
                  onSubmit={(e) => handleEdit(e, org.orgId)}
                  className="grid grid-cols-1 gap-2 border-t border-border bg-elevated/60 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                >
                  <input
                    name="name"
                    defaultValue={org.orgName}
                    placeholder="Namn"
                    className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                  />
                  <select
                    name="kind"
                    defaultValue={org.kind}
                    className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                  >
                    <option value="entreprenad">Entreprenad</option>
                  </select>
                  <input
                    name="unit_noun"
                    defaultValue={org.unit_noun}
                    placeholder="kurs / projekt"
                    className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                  />
                  <input
                    name="unit_noun_plural"
                    defaultValue={org.unit_noun_plural}
                    placeholder="Kurser / Projekt"
                    className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                  />
                  <Button type="submit" size="sm" disabled={pending}>
                    Spara
                  </Button>
                </form>
              )}

              {/* Expanderad body: uppdrag */}
              {isOpen && (
                <div className="border-t border-border bg-surface/50 p-4">
                  <AssignmentAdminPanel
                    orgSlug={org.orgSlug}
                    assignments={org.assignments}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
