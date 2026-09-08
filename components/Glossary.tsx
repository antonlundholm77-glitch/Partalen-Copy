"use client";

import { useMemo, useState } from "react";

// Begreppsmodell — kanonisk ordlista för Part Plattform. Avskalad ton; definitionerna
// ska kunna citeras i avtal, säljmaterial och utvecklardokumentation oförändrade.

type Term = {
  term: string;
  def: string;
  note?: string; // kursiv kommentar/exempel
  related?: string[]; // namn på relaterade termer
  link?: { label: string; to: string }; // in-sidlänk till Playbook-sektion (id)
};
type Section = { title: string; terms: Term[] };

const SECTIONS: Section[] = [
  {
    title: "Plattformen",
    terms: [
      {
        term: "Part Plattform",
        def: "Varumärket och produkten. Den tekniska plattformen som stöttar konsultarbetet på ett systematiskt sätt.",
        note: "Part Plattform är paraplyet — det ord kunder, partners och nya medarbetare först möter.",
        related: ["Plattforms-OS"],
      },
      {
        term: "Plattforms-OS",
        def: "Plattformsnivån, det översta lagret inom Part Plattform. Här bor det gemensamma operativsystemet: playbook, standarder, mallar, kvalitetsledning, erfarenhetsbank, kund- och uppdragsregister, team och roller.",
        note: "En instans per organisation. Mönstret är generaliserbart till [Företag] OS om plattformen framöver licensieras vidare.",
        related: ["Part Plattform", "Client OS", "Playbook"],
        link: { label: "Tre nivåer", to: "nivaer" },
      },
      {
        term: "Client OS",
        def: "Kundnivån. En delad yta per kund. Här samlas allt vi gör för och med en specifik kund: portfölj av uppdrag, medlemmar och roller, avtal, kundspecifik kunskap och kontakthistorik.",
        note: "Allt vi gör för en kund samlas här; vi lär av tidigare uppdrag och återanvänder inom kunden.",
        related: ["Plattforms-OS", "Project OS", "Beställare"],
        link: { label: "Tre nivåer", to: "nivaer" },
      },
      {
        term: "Project OS",
        def: "Projektnivån, där det operativa arbetet genomförs. Innehåller modulerna (SmartPrep, Projektkarta, Dokumenthantering, med flera) och projektets livscykel, handlingar, mängd & kalkyl och kontrollplan.",
        note: "Erfarenheter och underlag matas tillbaka uppåt till Client OS och Plattforms-OS.",
        related: ["Client OS", "Modul", "Leverabel"],
        link: { label: "Tre nivåer", to: "nivaer" },
      },
    ],
  },
  {
    title: "Flödet mellan nivåerna",
    terms: [
      {
        term: "Standarder & process flödar nedåt",
        def: "Från Plattforms-OS via Client OS till Project OS. Mallar, AMA-bibliotek, kvalitetskrav och arbetssätt som vi enats om gäller i alla projekt, men kan kundanpassas i Client OS innan de når Project OS.",
        related: ["Frysning mot källversion", "Erfarenhet & kunskap flödar uppåt"],
      },
      {
        term: "Erfarenhet & kunskap flödar uppåt",
        def: "Från Project OS via Client OS till Plattforms-OS. Det som lärs i ett uppdrag återförs så att nästa uppdrag blir bättre — erfarenhetsåterföring vid avslut uppdaterar alla tre nivåer.",
        related: ["Standarder & process flödar nedåt", "Avslut"],
      },
      {
        term: "Frysning mot källversion",
        def: "När en mall eller standard kopieras in i ett projekt fryses projektets kopia mot källversionen vid skapandet. Källreferens och versionsnummer sparas. Om mallen uppdateras i Plattforms-OS får projektet en notifiering med möjlighet att granska skillnaderna och välja att uppdatera — aldrig automatiskt.",
        note: "Skyddar juridisk och kontraktsmässig stabilitet i pågående uppdrag. Vissa infrastruktur-mallar (begreppsmodell, varumärkesprofil, juridiska klausuler) kan undantas och leva som referens i stället.",
        related: ["Standarder & process flödar nedåt"],
      },
    ],
  },
  {
    title: "Roller och aktörer",
    terms: [
      {
        term: "Operatör",
        def: "Den datadrivna konsulten — människa förstärkt med AI — som rör sig mellan alla tre nivåerna. Operatören hämtar precedens från Plattforms-OS, arbetar i Project OS och återför kunskap uppåt. Navet i uppdraget: koordinerar, paketerar information och stöttar kunden och kundens kund.",
        related: ["Plattforms-OS", "Project OS", "Kundens kund"],
        link: { label: "Operatörsrollen", to: "operator" },
      },
      {
        term: "Behörighetsnivåer",
        def: "Åtkomst tilldelas per nivå. Intern nivå: tillgång till hela plattformen (intern personal, domänstyrt). Client-nivå: tillgång till en specifik kunds yta och dess projekt. Project-nivå: tillgång till ett enskilt projekt (här kan även gäster bjudas in).",
        related: ["Admin / Manager / Member / Viewer"],
      },
      {
        term: "Admin / Manager / Member / Viewer",
        def: "Rolltyper som finns på varje nivå (Plattform, Client, Project). Admin: full kontroll över nivån, inklusive medlemshantering och inställningar. Manager: äger nivåns arbete och ansvarar för leveranser. Member: aktiv medarbetare. Viewer: kan följa men inte ändra.",
        related: ["Behörighetsnivåer"],
      },
      {
        term: "Beställare",
        def: "Den part som upphandlat uppdraget och är operatörens motpart i avtalet.",
        related: ["Kundens kund", "Client OS"],
      },
      {
        term: "Kundens kund",
        def: "Slutmottagaren av det som byggs. Playbooken betonar att vi förstår båda — beställaren och kundens kund.",
        related: ["Beställare", "Operatör"],
      },
    ],
  },
  {
    title: "Innehållsobjekt",
    terms: [
      {
        term: "Playbook",
        def: "Det samlade arbetssättet — den kanoniska beskrivningen av hur vi genomför uppdrag på plattformen: process, roller, nivåer och moduler.",
        related: ["Plattforms-OS", "Operatör"],
        link: { label: "Processen", to: "process" },
      },
      {
        term: "Modul",
        def: "En funktionskomponent inom Project OS. Exempel: SmartPrep, Projektkarta, Dokumenthantering, Tidplan, Kontrollplan, Behörighet. Moduler kan ha status Live, Snart eller Platshållare.",
        related: ["Live", "Snart", "Platshållare"],
        link: { label: "Modulkatalogen", to: "moduler" },
      },
      {
        term: "Leverabel",
        def: "Konkret output som produceras inom en fas. Exempel: Behovs- & intressentanalys (Initiering), Teknisk beskrivning & mängd (Genomförande), Egenkontroll (Granskning).",
        note: "Ordet vidgas bortom strikt 'till kund' — allt som har ett identitetsobjekt i Project OS är en leverabel mot någon mottagare: kund, intern granskare, eller framtida operatör som lär av det.",
        related: ["Modul", "TB — Teknisk Beskrivning"],
      },
    ],
  },
  {
    title: "Regelverk",
    terms: [
      {
        term: "ABK 09",
        def: "Allmänna bestämmelser för konsultuppdrag inom arkitekt- och ingenjörsverksamhet 2009. Refereras i Initieringsfasen som grund för förutsättningar.",
      },
      {
        term: "ISO 9001",
        def: "Kvalitetsledningsstandard. Playbooken speglar PDCA-cykeln som är ISO 9001:s ryggrad.",
        related: ["Playbook"],
        link: { label: "Processen", to: "process" },
      },
      {
        term: "AMA",
        def: "Allmän material- och arbetsbeskrivning. Branschstandard för teknisk beskrivning i anläggnings- och husbyggnad. Bär koder (t.ex. DBB.521) som binder ihop teknisk beskrivning, mängdförteckning och kontrollplan.",
        related: ["TB — Teknisk Beskrivning"],
      },
      {
        term: "TB — Teknisk Beskrivning",
        def: "Dokumentet som beskriver vad som ska byggas, vävt mot AMA-koder.",
        note: "I plattformen hanteras TB som vyn av projektets AMA-koder plus mängder, à-priser och kontrollpunkter — en sanning, flera utsnitt.",
        related: ["AMA", "Leverabel"],
      },
    ],
  },
  {
    title: "Modulstatus",
    terms: [
      { term: "Live", def: "Modulen är funktionell och i drift.", related: ["Modul"] },
      {
        term: "Snart",
        def: "Modulen är planerad — namn och scope är beslutade men implementation saknas.",
        related: ["Modul"],
      },
      {
        term: "Platshållare",
        def: "Modulen finns som koncept, men varken funktion eller fast scope är låst.",
        related: ["Modul"],
      },
    ],
  },
  {
    title: "Datalager (för utvecklare)",
    terms: [
      {
        term: "Supabase",
        def: "Den underliggande dataplattformen — Postgres för data, Storage för filer, Auth som integrerar Entra. Alla gf_-tabeller (organizations, projects, modules, documents, schedules, tasks) bor här.",
        note: "Migrationer ligger versionerade i supabase/migrations/. Strukturen är samma i dev och prod.",
        related: ["RLS", "Modul"],
      },
      {
        term: "RLS",
        def: "Row-Level Security i Postgres. Per tabell: vem får läsa, skriva och radera. Plattformen har tre-rolls-modell (Ägare/Användare/Besökare) implementerad via funktioner gf_can_access_unit, gf_can_upload_unit och gf_can_manage_unit.",
        note: "Skyddet är i DB:n, inte i UI:n — direkta API-anrop kan inte kringgå behörigheterna.",
        related: ["Supabase", "Behörighetsnivåer"],
      },
      {
        term: "Entra (multi-tenant)",
        def: "Microsoft Entra ID. Alla användare loggar in med sin egen organisations Entra — inga gäst-konton. Databasen styr access via gf_memberships och gf_unit_members oberoende av Entra-tenant.",
        related: ["Behörighetsnivåer"],
      },
    ],
  },
  {
    title: "Tidplan & schemaläggning",
    terms: [
      {
        term: "CPM (Critical Path Method)",
        def: "Klassisk schemaläggningsalgoritm. Forward pass beräknar tidigaste start/slut (ES/EF), backward pass beräknar senaste start/slut (LS/LF), och float = LS−ES. Tasks med float ≤ 0 ligger på kritisk linje.",
        note: "Implementeras i lib/scheduling/cpm.ts som ren TypeScript utan DB-beroenden — kan användas i andra appar.",
        related: ["FNLT, MSO, SNET (constraints)"],
        link: { label: "Modulkatalogen", to: "moduler" },
      },
      {
        term: "FNLT, MSO, SNET (constraints)",
        def: "MS Project-constraint-typer. FNLT (Finish-No-Later-Than) låser slutdatum, MSO (Must-Start-On) låser startdatum, SNET (Start-No-Earlier-Than) sätter tidigaste start. Används för att representera deadlines och säsongsfönster.",
        note: "FNLT används ofta för IFC-datum; MSO/MFO för fasta entreprenadstart-/slutbesiktningsdatum.",
        related: ["CPM (Critical Path Method)"],
      },
      {
        term: "ScheduleEnvelope",
        def: "Kanoniskt JSON-format för tidplaner i plattformen. Innehåller schedule-header, tasks, dependencies, kalendrar och baselines. Definieras av zod-schema i lib/scheduling/schema.ts.",
        note: "Används för export, import och som promptguide-format mot LLM. Validerar både struktur (zod) och cross-field (cykler, uid-unikhet, calendarRef).",
        related: ["CPM (Critical Path Method)"],
      },
    ],
  },
  {
    title: "Operatör & sessioner",
    terms: [
      {
        term: "Context Cascade",
        def: "Kanonisk uppsättning grounding-filer i Ground/-mappen: PlattformOS → Client<KUND> → Project<ID> → ProjectTask<ID>. Varje nivå ärver kontext från ovanstående och tillför sin egen.",
        note: "Filerna har frontmatter (file_type, client_slug, unit_slug) som /intern/operator matchar mot enheter.",
        related: ["Operatör", "Sessionspaket"],
      },
      {
        term: "Sessionspaket",
        def: "Bundle av grounding-filer som operatörsytan bygger för en specifik enhet — alla fyra OS-filer i ett klick. Kan kopieras till urklipp, laddas ner som .md eller paketeras till zip. Klistras in i Claude Desktop som start på en grundad session.",
        related: ["Context Cascade", "Operatör"],
      },
      {
        term: "Hand-over",
        def: "Strukturerad markdown (frontmatter + JSON-block) som operatören skickar in vid arbetsdagens slut. Plattform-steward läser veckovis och uppdaterar berörda OS-filer — så återförs kunskap uppåt.",
        related: ["Erfarenhet & kunskap flödar uppåt"],
      },
    ],
  },
];

const VERSION = "Version 0.2";
const UPDATED = "2026-06-04";

function slug(s: string): string {
  return (
    "term-" +
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function shortDef(def: string): string {
  const first = def.split(/(?<=\.)\s/)[0];
  return first.length > 140 ? first.slice(0, 137) + "…" : first;
}

export default function Glossary() {
  const [query, setQuery] = useState("");
  const [showLog, setShowLog] = useState(false);

  // Uppslag namn → kort definition (för chip-tooltip) + giltiga termer.
  const lookup = useMemo(() => {
    const m = new Map<string, string>();
    SECTIONS.forEach((s) => s.terms.forEach((t) => m.set(t.term, shortDef(t.def))));
    return m;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      title: s.title,
      terms: s.terms.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.def.toLowerCase().includes(q) ||
          (t.note ?? "").toLowerCase().includes(q),
      ),
    })).filter((s) => s.terms.length > 0);
  }, [query]);

  function goToTerm(name: string) {
    setQuery("");
    const id = slug(name);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }

  function goToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      {/* Rubrik + ingress */}
      <h2 className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
        Ordlista
      </h2>
      <h3 className="text-lg font-medium tracking-tight">Begreppsmodell — Part Plattform</h3>
      <p className="text-ink-2 mt-1 max-w-2xl text-sm">
        Den här ordlistan är den kanoniska källan för hur vi använder begrepp i plattformen. Om något
        här strider mot UI-text, dokumentation eller säljmaterial — det här vinner.
      </p>

      {/* Versionsmarkör (klickbar → ändringslogg) */}
      <button
        onClick={() => setShowLog((v) => !v)}
        className="text-ink-3 mt-2 inline-flex items-center gap-1 text-[11px] hover:text-ink"
      >
        {VERSION} · Senast uppdaterad: {UPDATED} · Ägs av Plattforms-OS
        <span className="text-ink-3">{showLog ? "▾" : "▸"}</span>
      </button>
      {showLog && (
        <div className="text-ink-2 mt-1 rounded-md border border-border bg-panel px-3 py-2 text-[12px]">
          <strong className="font-medium">Ändringslogg</strong>
          <div className="text-ink-3 mt-0.5">
            <div>v0.2 · 2026-06-04 — Datalager utökat (RLS, Entra). Tidplan, Operatör & sessioner som egna sektioner.</div>
            <div>v0.1 · 2026-05-30 — Första versionen av begreppsmodellen.</div>
          </div>
        </div>
      )}

      {/* Sök */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sök i ordlistan…"
        className="mt-4 block w-full max-w-md rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-ink"
      />

      {/* Sektioner */}
      {filtered.length === 0 ? (
        <p className="text-ink-3 mt-6 text-sm">Inga termer matchar ”{query}”.</p>
      ) : (
        filtered.map((section) => (
          <div key={section.title} className="mt-7">
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              {section.title}
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              {section.terms.map((t) => (
                <div
                  key={t.term}
                  id={slug(t.term)}
                  className="scroll-mt-20 rounded-lg border border-border bg-panel p-4"
                >
                  <div className="font-medium">{t.term}</div>
                  <p className="text-ink-2 mt-1 text-[13px] leading-relaxed">{t.def}</p>
                  {t.note && (
                    <p className="text-ink-3 mt-2 text-[12px] italic leading-snug">{t.note}</p>
                  )}
                  {(t.related?.length || t.link) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {t.related?.map((r) => (
                        <button
                          key={r}
                          onClick={() => goToTerm(r)}
                          title={lookup.get(r) ?? r}
                          className="rounded bg-secondary px-2 py-0.5 text-[11px] text-ink-2 hover:bg-[#eae8d0] hover:text-[#4f4b22]"
                        >
                          {r}
                        </button>
                      ))}
                      {t.link && (
                        <button
                          onClick={() => goToSection(t.link!.to)}
                          className="ml-auto rounded px-2 py-0.5 text-[11px] font-medium text-[#6d6930] hover:underline"
                        >
                          Gå till {t.link.label} →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
