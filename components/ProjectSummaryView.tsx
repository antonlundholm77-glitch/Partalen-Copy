// Projektsammanfattning: intressenter, restriktioner, viten/bonus och
// kontraktsavvikelser samlat på en sida. Fungerar för alla anläggningsprojekt
// med data i pm_stakeholders/restrictions/penalties/contract_deviations.

import {
  Users,
  AlertTriangle,
  Scale,
  FileWarning,
  Mail,
  Phone,
  Building2,
} from "lucide-react";
import type {
  PmStakeholder,
  PmRestriction,
  PmPenalty,
  PmContractDeviation,
} from "@/lib/db/project-extras";

const CATEGORY_LABEL: Record<string, string> = {
  bestallare: "Beställare",
  entreprenor: "Entreprenör",
  konsult: "Konsult",
  ledningsagare: "Ledningsägare",
  sidoentreprenor: "Sidoentreprenör",
  myndighet: "Myndighet",
  ovrigt: "Övrigt",
  trafik: "Trafik",
  arbetsmiljo: "Arbetsmiljö",
  sasong: "Säsong",
  miljo: "Miljö",
  forsening: "Försening",
  klimat: "Klimat",
  kvalitet: "Kvalitet",
  sysselsattning: "Sysselsättning",
};

const SEVERITY_CLS: Record<string, string> = {
  kritisk: "bg-red-50 text-red-700 border-red-200",
  viktig: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-slate-50 text-slate-600 border-slate-200",
};

function formatSek(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

interface Props {
  projectName: string;
  meta?: string;
  stakeholders: PmStakeholder[];
  restrictions: PmRestriction[];
  penalties: PmPenalty[];
  deviations: PmContractDeviation[];
}

export default function ProjectSummaryView({
  projectName,
  meta,
  stakeholders,
  restrictions,
  penalties,
  deviations,
}: Props) {
  const stakeholdersByCat = groupBy(stakeholders, (s) => s.category);
  const restrictionsByCat = groupBy(restrictions, (r) => r.category);
  const viten = penalties.filter((p) => p.kind === "vite");
  const bonusar = penalties.filter((p) => p.kind === "bonus");

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="border-b border-border bg-surface px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
          Projektsammanfattning
        </p>
        <h1 className="mt-1 text-2xl font-medium text-ink-1">{projectName}</h1>
        {meta && <p className="mt-1.5 text-[13px] text-ink-3">{meta}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={Users}
            label="Intressenter"
            value={stakeholders.length}
          />
          <StatCard
            icon={AlertTriangle}
            label="Restriktioner"
            value={restrictions.length}
          />
          <StatCard
            icon={Scale}
            label="Viten & bonus"
            value={penalties.length}
          />
          <StatCard
            icon={FileWarning}
            label="AB-avvikelser"
            value={deviations.length}
          />
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Intressenter */}
        <Section title="Intressenter & parter" icon={Users}>
          {Object.entries(stakeholdersByCat).map(([cat, list]) => (
            <div key={cat} className="mb-4 last:mb-0">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                {CATEGORY_LABEL[cat] ?? cat}
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {list.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-border bg-white p-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] font-medium text-ink-1">{s.name}</span>
                      {s.role && (
                        <span className="text-[11px] text-ink-3">{s.role}</span>
                      )}
                    </div>
                    {s.organization && s.organization !== s.name && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-2">
                        <Building2 size={12} strokeWidth={2} className="text-ink-3" />
                        {s.organization}
                      </div>
                    )}
                    {(s.email || s.phone) && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-ink-3">
                        {s.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail size={11} /> {s.email}
                          </span>
                        )}
                        {s.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} /> {s.phone}
                          </span>
                        )}
                      </div>
                    )}
                    {s.notes && (
                      <p className="mt-1.5 text-[12px] text-ink-3">{s.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* Restriktioner */}
        <Section title="Restriktioner & begränsningar" icon={AlertTriangle}>
          <div className="space-y-3">
            {Object.entries(restrictionsByCat).map(([cat, list]) => (
              <div key={cat}>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                  {CATEGORY_LABEL[cat] ?? cat}
                </h3>
                <div className="space-y-2">
                  {list.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-border bg-white p-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[14px] font-medium text-ink-1">{r.title}</span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            SEVERITY_CLS[r.severity] ?? SEVERITY_CLS.info
                          }`}
                        >
                          {r.severity}
                        </span>
                      </div>
                      {r.period && (
                        <p className="mt-0.5 text-[12px] text-ink-3">Period: {r.period}</p>
                      )}
                      {r.description && (
                        <p className="mt-1.5 text-[13px] text-ink-2">{r.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Viten & bonus */}
        <Section title="Viten & bonus" icon={Scale}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PenaltyColumn title="Viten" tone="red" items={viten} />
            <PenaltyColumn title="Bonus" tone="green" items={bonusar} />
          </div>
        </Section>

        {/* Kontraktsavvikelser */}
        <Section title="Kontraktsavvikelser från AB 04 / AMA AF" icon={FileWarning}>
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-ink-3">
                  <th className="px-3 py-2 font-medium">Paragraf</th>
                  <th className="px-3 py-2 font-medium">Ändring</th>
                </tr>
              </thead>
              <tbody>
                {deviations.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-3 py-2 font-mono text-[12px] text-ink-2 whitespace-nowrap">
                      {d.section ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-1">{d.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
      <Icon size={18} className="text-ink-3" strokeWidth={2} />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
        <div className="text-lg font-semibold tabular-nums text-ink-1">{value}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-ink-2" strokeWidth={2} />
        <h2 className="text-[14px] font-semibold text-ink-1">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PenaltyColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "red" | "green";
  items: PmPenalty[];
}) {
  const toneCls =
    tone === "red"
      ? "border-red-100 bg-red-50/40"
      : "border-green-100 bg-green-50/40";
  const labelCls = tone === "red" ? "text-red-700" : "text-green-700";

  if (items.length === 0) return null;

  return (
    <div className={`rounded-lg border ${toneCls} p-3`}>
      <h3 className={`mb-3 text-[12px] font-semibold uppercase tracking-wider ${labelCls}`}>
        {title} · {items.length} st
      </h3>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id} className="rounded border border-border bg-white p-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-ink-1">{p.title}</span>
              {p.conditions && (
                <span className="font-mono text-[10px] text-ink-3">{p.conditions}</span>
              )}
            </div>
            {p.description && (
              <p className="mt-0.5 text-[12px] text-ink-2">{p.description}</p>
            )}
            {p.amount !== null && (
              <div className="mt-1 text-[12px] text-ink-3">
                <span className="font-semibold tabular-nums text-ink-1">
                  {formatSek(p.amount)}
                </span>{" "}
                <span>{p.unit}</span>
                {p.cap !== null && (
                  <span className="ml-2 text-ink-3">tak {formatSek(p.cap)}</span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function groupBy<T, K extends string>(arr: T[], fn: (t: T) => K): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = fn(item);
      (acc[k] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
