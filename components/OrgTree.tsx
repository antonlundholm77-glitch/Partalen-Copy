"use client";

import { useState, useTransition } from "react";
import RoleBadge from "@/components/RoleBadge";
import {
  inviteToOrg,
  inviteToUnit,
  setSystemRole,
  removeSystemRole,
  deleteUserAccount,
  type ActionResult,
} from "@/app/actions/identity";

export interface TreeUser {
  user_id?: string;
  name?: string;
  email: string;
  role: string;
  pending?: boolean;
}
export interface TreeUnit {
  id: string;
  name: string;
  users: TreeUser[];
}
export interface TreeCustomer {
  id: string;
  name: string;
  tag?: string;
  kind?: "entreprenad";
  users: TreeUser[];
  units: TreeUnit[];
}
export interface OrgTreeData {
  platformUsers: TreeUser[];
  customers: TreeCustomer[];
}

const LEVELS = {
  platform: {
    bar: "border-l-[#6d6930]", bg: "bg-[#eae8d0]", text: "text-[#4f4b22]",
    badge: "bg-[#6d6930] text-white", pill: "bg-[#eae8d0] text-[#4f4b22]",
    guide: "border-[#d9d2bb]", dot: "bg-[#6d6930]",
  },
  kund: {
    bar: "border-l-[#b5532a]", bg: "bg-[#f5e5d9]", text: "text-[#8a3f20]",
    badge: "bg-[#b5532a] text-white", pill: "bg-[#f5e5d9] text-[#8a3f20]",
    guide: "border-[#e8cdbd]", dot: "bg-[#b5532a]",
  },
  projekt: {
    bar: "border-l-[#5e8553]", bg: "bg-[#dde7d5]", text: "text-[#3f5c38]",
    badge: "bg-[#5e8553] text-white", pill: "bg-[#dde7d5] text-[#3f5c38]",
    guide: "border-[#c2d4ba]", dot: "bg-[#5e8553]",
  },
};

const ORG_ROLES = ["owner", "admin", "member"] as const;
const PROJECT_ROLES = ["manager", "member", "viewer"] as const;
const SYSTEM_ROLES = ["superadmin", "support", "readonly"] as const;
const ROLE_LABEL: Record<string, string> = {
  owner: "Ägare", admin: "Admin", member: "Medlem",
  manager: "Projektledare", viewer: "Läsare",
  larare: "Lärare", deltagare: "Deltagare",
  superadmin: "Systemadmin", support: "Support", readonly: "Läs",
};

function initials(text: string): string {
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (text.trim()[0] ?? "?").toUpperCase();
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={`flex w-3 shrink-0 justify-center text-[9px] text-ink-3 transition-transform ${open ? "" : "-rotate-90"}`}>
      ▼
    </span>
  );
}

function Count({ n, pill }: { n: number; pill: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] tnum ${n ? pill : "bg-secondary text-ink-3"}`}>
      {n} användare
    </span>
  );
}

function Branch({ color, children }: { color: string; children: React.ReactNode }) {
  return <div className={`ml-3 border-l-2 pl-2 ${color}`}>{children}</div>;
}

function PlusButton({ onClick, title, disabled }: { onClick: (e: React.MouseEvent) => void; title: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      disabled={disabled}
      title={title}
      className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[14px] text-ink-3 hover:bg-white/60 hover:text-ink-2 disabled:opacity-50"
    >
      +
    </button>
  );
}

export default function OrgTree({ data, canManage = false }: { data: OrgTreeData; canManage?: boolean }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(data.customers.flatMap((c) => c.units.map((u) => u.id))),
  );
  const [inviteOpenId, setInviteOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const open = (id: string) => !collapsed.has(id);

  function run(action: () => Promise<ActionResult>, successMsg: string, onDone?: () => void) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setFeedback({ kind: "ok", msg: successMsg });
        onDone?.();
      } else setFeedback({ kind: "error", msg: res.error });
    });
  }

  function submitOrgInvite(orgSlug: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const role = String(form.get("role") ?? "member");
    const formEl = e.currentTarget;
    run(
      () => inviteToOrg(orgSlug, email, role),
      `Inbjudan skickad till ${email}.`,
      () => { setInviteOpenId(null); formEl.reset(); },
    );
  }

  function submitUnitInvite(orgSlug: string, projectSlug: string, kind: "entreprenad", e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void kind;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const role = String(form.get("role") ?? "member");
    const formEl = e.currentTarget;
    run(
      () => inviteToUnit(orgSlug, projectSlug, email, role),
      `Inbjudan skickad till ${email}.`,
      () => { setInviteOpenId(null); formEl.reset(); },
    );
  }

  function UserRow({ user, scope }: { user: TreeUser; scope: "platform" | "kund" | "projekt" }) {
    const isPlatform = scope === "platform";
    return (
      <div className="flex items-center gap-2.5 rounded-md py-1.5 pl-2 pr-2.5 text-[13px] hover:bg-secondary">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
            user.pending ? "border border-dashed border-border-strong text-ink-3" : "bg-secondary text-ink-2"
          }`}
        >
          {user.pending ? "✉" : initials(user.name ?? user.email)}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {user.name ? (
            <>
              <span className="font-medium">{user.name}</span>{" "}
              <span className="text-ink-3">{user.email}</span>
            </>
          ) : (
            <span className="text-ink-2">{user.email}</span>
          )}
        </span>

        {/* System-roll-dropdown bara för intern personal när admin kan hantera */}
        {canManage && isPlatform && user.user_id ? (
          <select
            value={user.role}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value;
              const userId = user.user_id!;
              const current = user.role;
              if (next === "ingen") {
                run(() => removeSystemRole(userId, current), `Systemroll borttagen för ${user.name ?? user.email}.`);
              } else {
                // Byt sub-roll: ta bort gamla först om olika
                run(
                  async () => {
                    if (current !== next && SYSTEM_ROLES.includes(current as typeof SYSTEM_ROLES[number])) {
                      const r1 = await removeSystemRole(userId, current);
                      if (!r1.ok) return r1;
                    }
                    return setSystemRole(userId, next);
                  },
                  `Systemroll satt till ${ROLE_LABEL[next]} för ${user.name ?? user.email}.`,
                );
              }
            }}
            className="rounded border border-border bg-surface px-2 py-[3px] text-[11.5px]"
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
            <option value="ingen">Ingen sub-roll</option>
          </select>
        ) : (
          <RoleBadge role={user.role} />
        )}

        {user.pending && <span className="shrink-0 text-[11px] text-ink-3">inbjuden</span>}

        {/* Ta bort användare helt (bara intern personal, inte du själv, inte pending) */}
        {canManage && isPlatform && user.user_id && !user.pending && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Ta bort ${user.name ?? user.email} helt? Profil och systemroller raderas.`)) return;
              run(
                () => deleteUserAccount(user.user_id!),
                `${user.name ?? user.email} borttagen.`,
              );
            }}
            className="ml-1 text-[11px] text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
            title="Ta bort användaren helt"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  function InviteForm({ orgSlug, projectSlug, kind }: { orgSlug: string; projectSlug?: string; kind: "entreprenad" }) {
    const roles = projectSlug ? PROJECT_ROLES : ORG_ROLES;
    const defaultRole = "member";
    return (
      <form
        onSubmit={(e) => projectSlug ? submitUnitInvite(orgSlug, projectSlug, kind, e) : submitOrgInvite(orgSlug, e)}
        className="flex items-center gap-2 rounded-md bg-white/60 px-2 py-1.5"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="namn@kunden.se"
          className="min-w-[200px] flex-1 rounded border border-border bg-surface px-2 py-[5px] text-[12.5px]"
        />
        <select
          name="role"
          defaultValue={defaultRole}
          className="rounded border border-border bg-surface px-2 py-[5px] text-[12.5px]"
        >
          {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-2.5 py-[5px] text-[12px] font-medium text-fg-inv hover:bg-accent-2 disabled:opacity-50"
        >
          Skicka
        </button>
        <button
          type="button"
          onClick={() => setInviteOpenId(null)}
          className="text-[12px] text-ink-3 hover:text-ink-2"
        >
          Avbryt
        </button>
      </form>
    );
  }

  const gc = LEVELS.platform;
  const ku = LEVELS.kund;
  const pr = LEVELS.projekt;

  return (
    <div className="space-y-2">
      {feedback && (
        <div
          className={
            feedback.kind === "ok"
              ? "rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[12.5px] text-emerald-800"
              : "rounded border border-red-300 bg-red-50 px-3 py-1.5 text-[12.5px] text-red-800"
          }
        >
          {feedback.msg}
        </div>
      )}

      <div className="rounded-lg border border-border bg-panel p-2">
        {/* Internt (plattformsadmin) */}
        <div className={`flex items-center gap-2.5 rounded-md border-l-4 px-2.5 py-2 ${gc.bar} ${gc.bg}`}>
          <button type="button" onClick={() => toggle("platform")} className="flex flex-1 items-center gap-2.5 text-left">
            <Chevron open={open("platform")} />
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${gc.badge}`}>I</span>
            <span className={`text-[14px] font-semibold ${gc.text}`}>Internt</span>
          </button>
          <Count n={data.platformUsers.length} pill={gc.pill} />
        </div>

        {open("platform") && (
          <Branch color={gc.guide}>
            {data.platformUsers.map((u) => (
              <UserRow key={`gc-${u.email}`} user={u} scope="platform" />
            ))}

            {data.customers.map((c) => {
              const kind = "entreprenad" as const;
              const inviteKey = `c:${c.id}`;
              return (
                <div key={c.id} className="mt-1">
                  {/* Kund */}
                  <div className={`flex items-center gap-2.5 rounded-md border-l-4 px-2.5 py-2 ${ku.bar} ${ku.bg}`}>
                    <button type="button" onClick={() => toggle(c.id)} className="flex flex-1 items-center gap-2.5 text-left">
                      <Chevron open={open(c.id)} />
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${ku.badge}`}>
                        {initials(c.name)}
                      </span>
                      <span className={`font-semibold ${ku.text}`}>{c.name}</span>
                      {c.tag && (
                        <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">{c.tag}</span>
                      )}
                    </button>
                    <Count n={c.users.length} pill={ku.pill} />
                    {canManage && (
                      <PlusButton
                        title={`Bjud in till ${c.name}`}
                        disabled={pending}
                        onClick={() => setInviteOpenId(inviteOpenId === inviteKey ? null : inviteKey)}
                      />
                    )}
                  </div>

                  {open(c.id) && (
                    <Branch color={ku.guide}>
                      {inviteOpenId === inviteKey && (
                        <div className="py-1">
                          <InviteForm orgSlug={c.id} kind={kind} />
                        </div>
                      )}
                      {c.users.map((u) => (
                        <UserRow key={`${c.id}-${u.email}`} user={u} scope="kund" />
                      ))}

                      {c.units.map((unit) => {
                        const unitInviteKey = `p:${c.id}/${unit.id}`;
                        return (
                          <div key={unit.id} className="mt-1">
                            {/* Projekt/Kurs */}
                            <div
                              className={`flex items-center gap-2.5 rounded-md border-l-4 px-2.5 py-2 ${
                                unit.users.length ? `${pr.bar} ${pr.bg}` : "border-l-border-strong bg-secondary"
                              }`}
                            >
                              <button type="button" onClick={() => toggle(unit.id)} className="flex flex-1 items-center gap-2.5 text-left">
                                <Chevron open={open(unit.id)} />
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${unit.users.length ? pr.dot : "bg-border-strong"}`} />
                                <span className={unit.users.length ? `font-medium ${pr.text}` : "text-ink-3"}>{unit.name}</span>
                              </button>
                              <Count n={unit.users.length} pill={pr.pill} />
                              {canManage && (
                                <PlusButton
                                  title={`Bjud in till ${unit.name}`}
                                  disabled={pending}
                                  onClick={() => setInviteOpenId(inviteOpenId === unitInviteKey ? null : unitInviteKey)}
                                />
                              )}
                            </div>

                            {open(unit.id) && (
                              <Branch color={unit.users.length ? pr.guide : "border-border"}>
                                {inviteOpenId === unitInviteKey && (
                                  <div className="py-1">
                                    <InviteForm orgSlug={c.id} projectSlug={unit.id} kind={kind} />
                                  </div>
                                )}
                                {unit.users.length ? (
                                  unit.users.map((u) => (
                                    <UserRow key={`${unit.id}-${u.email}`} user={u} scope="projekt" />
                                  ))
                                ) : (
                                  inviteOpenId !== unitInviteKey && (
                                    <div className="py-1.5 pl-2 text-[12px] text-ink-3">Inga användare än.</div>
                                  )
                                )}
                              </Branch>
                            )}
                          </div>
                        );
                      })}
                    </Branch>
                  )}
                </div>
              );
            })}
          </Branch>
        )}
      </div>
    </div>
  );
}
