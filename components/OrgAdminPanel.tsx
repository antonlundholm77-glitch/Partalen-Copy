"use client";

// Klient-komponent som binder admin-vyns medlemmar + invitations till
// identity-actions. Visas när AUTH_ENABLED — fixture-pathen i admin/page
// hanteras parallellt och tar inte detta komponenten.
//
// UX för inbjudningar (alt. C i identity-mapping §5.2 — manuell delning):
// efter "Skicka inbjudan" auto-kopieras ett färdigt meddelande (URL +
// förklaringstext + utgångsdatum + avsändare) till urklipp. På varje rad
// finns två knappar: "Kopiera meddelande" (allt) och "Kopiera länk" (bara URL).

import { useState, useTransition } from "react";
import RoleBadge from "@/components/RoleBadge";
import { Button, Table, Th, TdName, TdId } from "@/components/ui";
import { buildInviteMessage } from "@/lib/invite-message";
import {
  inviteToOrg,
  updateOrgRole,
  removeOrgMember,
  revokeInvite,
  type ActionResult,
} from "@/app/actions/identity";

export interface OrgMemberRow {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export interface OrgInviteRow {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// Tre roller efter migration 0016. Legacy-värden (admin, member) mappas till
// labels så befintlig data inte ser konstig ut innan vi rensar.
const ORG_ROLES = ["owner", "user", "visitor"] as const;
const ROLE_LABEL: Record<string, string> = {
  owner: "Ägare",
  user: "Användare",
  visitor: "Besökare",
  admin: "Ägare",
  member: "Användare",
};

export default function OrgAdminPanel({
  orgSlug,
  orgName,
  senderName,
  canManage = true,
  members,
  invitations,
  inviteBaseUrl,
}: {
  orgSlug: string;
  orgName: string;
  senderName?: string;
  // Sant för plattformsadmin eller org-owner/admin. När falskt visas bara
  // läs-läge — ingen invite-form, inga dropdowns, inga väntande inbjudningar.
  canManage?: boolean;
  members: OrgMemberRow[];
  invitations: OrgInviteRow[];
  inviteBaseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);

  function run(action: () => Promise<ActionResult>, successMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) setFeedback({ kind: "ok", msg: successMsg });
      else setFeedback({ kind: "error", msg: res.error });
    });
  }

  function inviteUrl(token: string): string {
    return `${inviteBaseUrl}/auth/invite/${token}`;
  }

  function messageFor(token: string, expiresAt: string): string {
    return buildInviteMessage({
      url: inviteUrl(token),
      orgName,
      expiresAt,
      senderName,
    });
  }

  async function writeClipboard(text: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ kind: "ok", msg: okMsg });
    } catch {
      setFeedback({
        kind: "error",
        msg: "Kunde inte kopiera. Markera texten och kopiera manuellt.",
      });
    }
  }

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const role = String(form.get("role") ?? "user");
    const formEl = e.currentTarget;

    startTransition(async () => {
      const res = await inviteToOrg(orgSlug, email, role);
      if (!res.ok) {
        setFeedback({ kind: "error", msg: res.error });
        return;
      }
      formEl.reset();
      if (res.data) {
        const msg = messageFor(res.data.token, res.data.expiresAt);
        await writeClipboard(
          msg,
          `Inbjudan till ${email} skapad — meddelande kopierat till urklipp.`,
        );
      } else {
        setFeedback({ kind: "ok", msg: `Inbjudan skapad till ${email}.` });
      }
    });
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

      {!canManage && (
        <div className="rounded border border-border bg-secondary/40 px-3 py-2 text-[12.5px] text-ink-2">
          Du ser organisationens medlemslista. För att bjuda in eller ändra roller
          krävs Ägare-rätt på organisationen.
        </div>
      )}

      {canManage && (
      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
          Bjud in
        </h3>
        <form onSubmit={handleInvite} className="flex flex-wrap items-center gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="namn@kunden.se"
            className="min-w-[240px] rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
          />
          <select
            name="role"
            defaultValue="user"
            className="rounded border border-border bg-surface px-3 py-[7px] text-[13px]"
          >
            {ORG_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={pending}>
            Skicka inbjudan
          </Button>
          <p className="basis-full text-[11.5px] text-ink-3">
            Inget mejl skickas — meddelandet kopieras till urklipp och delas manuellt
            (Slack, Teams, e-post).
          </p>
        </form>
      </section>
      )}

      {canManage && invitations.length > 0 && (
        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
            Väntande inbjudningar ({invitations.length})
          </h3>
          <ul className="space-y-2">
            {invitations.map((inv) => {
              const url = inviteUrl(inv.token);
              return (
                <li
                  key={inv.id}
                  className="rounded-lg border border-border bg-surface p-3 shadow-elev1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[13px]">{inv.email}</span>
                    <RoleBadge role={inv.role} />
                    <span className="text-[11.5px] text-ink-3">
                      utgår {inv.expires_at?.slice(0, 10) ?? "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 break-all rounded bg-secondary/60 px-2 py-1 font-mono text-[11.5px] text-ink-2">
                    {url}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        writeClipboard(
                          messageFor(inv.token, inv.expires_at),
                          `Meddelande för ${inv.email} kopierat.`,
                        )
                      }
                    >
                      Kopiera meddelande
                    </Button>
                    <button
                      type="button"
                      onClick={() => writeClipboard(url, "Länk kopierad.")}
                      className="rounded border border-border bg-surface px-2.5 py-1 text-[12px] text-ink-2 hover:bg-secondary"
                    >
                      Kopiera länk
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => revokeInvite(inv.id, orgSlug),
                          `Inbjudan till ${inv.email} återkallad.`,
                        )
                      }
                      className="ml-auto text-[12px] text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Återkalla
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
          Organisationsmedlemmar ({members.length})
        </h3>
        {members.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-5 py-8 text-center text-[13.5px] text-fg-2">
            Inga organisationsmedlemmar än — bjud in.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev1">
            <Table className="!min-w-0">
              <thead>
                <tr>
                  <Th>Namn</Th>
                  <Th>E-post</Th>
                  <Th>Roll</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <TdName>{m.name}</TdName>
                    <TdId>{m.email}</TdId>
                    <td>
                      {canManage ? (
                        <select
                          defaultValue={m.role}
                          disabled={pending}
                          onChange={(e) =>
                            run(
                              () => updateOrgRole(orgSlug, m.user_id, e.target.value),
                              `Roll för ${m.name} uppdaterad.`,
                            )
                          }
                          className="rounded border border-border bg-surface px-2 py-[5px] text-[12.5px]"
                        >
                          {ORG_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[12.5px] text-ink-2">
                          {ROLE_LABEL[m.role] ?? m.role}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {canManage && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Ta bort ${m.name} från organisationens medlemmar?`)) return;
                            run(
                              () => removeOrgMember(orgSlug, m.user_id),
                              `${m.name} borttagen.`,
                            );
                          }}
                          className="text-[12px] text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Ta bort
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
