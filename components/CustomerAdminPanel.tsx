"use client";

// Platform-admin: skapa & redigera kunder (gf_organizations). Lägger sig
// ovanför InternalCustomers-tabellen på /intern/kunder. Anropar
// app/actions/customers via useTransition.

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Table, Th, TdName, TdId } from "@/components/ui";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionResult,
} from "@/app/actions/customers";

export interface CustomerAdminRow {
  id: string;
  slug: string;
  name: string;
  kind: "entreprenad";
  unit_noun: string;
  unit_noun_plural: string;
}

const KIND_LABEL: Record<string, string> = {
  entreprenad: "Entreprenad",
};

export default function CustomerAdminPanel({
  customers,
}: {
  customers: CustomerAdminRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function run(action: () => Promise<CustomerActionResult>, successMsg: string) {
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
    const kind = String(form.get("kind") ?? "entreprenad");
    if (!name) {
      setFeedback({ kind: "error", msg: "Namn krävs." });
      return;
    }
    const formEl = e.currentTarget;
    run(
      () => createCustomerAction({ name, slug: slug || undefined, kind }),
      `Kund "${name}" skapad.`,
    );
    formEl.reset();
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>, c: CustomerAdminRow) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const kind = String(form.get("kind") ?? c.kind);
    const unit_noun = String(form.get("unit_noun") ?? "").trim();
    const unit_noun_plural = String(form.get("unit_noun_plural") ?? "").trim();
    run(
      () =>
        updateCustomerAction(c.id, {
          name: name || undefined,
          kind,
          unit_noun: unit_noun || undefined,
          unit_noun_plural: unit_noun_plural || undefined,
        }),
      `Kund uppdaterad.`,
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

      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
          Ny kund
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
      </section>

      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
          Kunder ({customers.length})
        </h3>
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev1">
          <Table className="!min-w-0">
            <thead>
              <tr>
                <Th>Namn</Th>
                <Th>Slug</Th>
                <Th>Typ</Th>
                <Th>Enhets-substantiv</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={5} className="bg-elevated">
                      <form
                        onSubmit={(e) => handleEditSubmit(e, c)}
                        className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                      >
                        <input
                          name="name"
                          defaultValue={c.name}
                          placeholder="Namn"
                          className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                        />
                        <select
                          name="kind"
                          defaultValue={c.kind}
                          className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                        >
                          <option value="entreprenad">Entreprenad</option>
                        </select>
                        <input
                          name="unit_noun"
                          defaultValue={c.unit_noun}
                          placeholder="kurs / projekt"
                          className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
                        />
                        <input
                          name="unit_noun_plural"
                          defaultValue={c.unit_noun_plural}
                          placeholder="Kurser / Projekt"
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
                  <tr key={c.id}>
                    <TdName>
                      <Link href={`/c/${c.slug}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TdName>
                    <TdId>{c.slug}</TdId>
                    <td className="text-[12.5px]">{KIND_LABEL[c.kind] ?? c.kind}</td>
                    <td className="text-[12.5px] text-fg-2">
                      {c.unit_noun} / {c.unit_noun_plural}
                    </td>
                    <td className="space-x-2 text-right">
                      <Link
                        href={`/c/${c.slug}/admin`}
                        className="text-[12px] text-ink-2 underline-offset-2 hover:underline"
                      >
                        Administration
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingId(c.id)}
                        className="text-[12px] text-ink-2 underline-offset-2 hover:underline"
                      >
                        Redigera
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </Table>
        </div>
      </section>
    </div>
  );
}
