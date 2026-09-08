"use client";

// Playbook — del 1: vår process genom ett uppdrag.
// Redigerbart utkast (oliv-tema, interna nivån).

import { useRef } from "react";
import { Workflow, Layers, Users, PanelsTopLeft, LayoutDashboard, BookText, UserPlus, Database } from "lucide-react";
import ModuleCatalog from "@/components/ModuleCatalog";
import Glossary from "@/components/Glossary";
import PlaybookNav, { type PlaybookSection } from "@/components/PlaybookNav";

const SECTIONS: PlaybookSection[] = [
  { id: "process", label: "Process", icon: Workflow },
  { id: "nivaer", label: "Tre nivåer", icon: Layers },
  { id: "operator", label: "Operatör", icon: Users },
  { id: "grounding", label: "Grounding", icon: PanelsTopLeft },
  { id: "moduler", label: "Moduler", icon: LayoutDashboard },
  { id: "plattform", label: "Plattform", icon: Database },
  { id: "ordlista", label: "Ordlista", icon: BookText },
  { id: "onboarding", label: "Ny kund", icon: UserPlus },
];

// Plattform: tekniska val + arkitektur. Förklarar varför plattformen ser ut som
// den gör för utvecklare och beslutsfattare.
const PLATFORM: { area: string; tech: string; what: string }[] = [
  { area: "Datalager", tech: "Supabase (Postgres + Storage)", what: "Alla gf_-tabeller (organizations, projects, modules, documents, schedules, tasks, dependencies) + Storage för filer. Migrationer ligger versionerade i supabase/migrations/." },
  { area: "Åtkomstskydd", tech: "Row-Level Security (RLS)", what: "Per tabell + tre-rolls-modell: Ägare / Användare / Besökare. RLS-funktioner gf_can_access_unit / gf_can_upload_unit / gf_can_manage_unit. Inga gäst-konton — alla har en egen Entra-identitet." },
  { area: "Identitet", tech: "Microsoft Entra (multi-tenant)", what: "Alla loggar in med sin egen Entra-organisation. Databasen styr access via gf_memberships (kundnivå) + gf_unit_members (projektnivå)." },
  { area: "App", tech: "Next.js 15 App Router", what: "Server components för all data-fetching (cached() per request). Client components bara där state krävs (Gantt, dropdowns, klick-handlers). Tailwind för styling." },
  { area: "Tidplan", tech: "CPM-motor + MS Project XML", what: "Ren TypeScript-CPM (lib/scheduling/cpm.ts) med forward/backward pass, kritisk linje, FNLT/MSO/SNET-constraints. Kanoniskt JSON-schema via zod. Round-trip-export på roadmap." },
  { area: "Kontextcascade", tech: "Markdown-baserad", what: "Ground/-paket: PlattformOS + Client + Project + ProjectTask. Frontmatter (file_type, client_slug, unit_slug) gör att /intern/operator hittar rätt filer per enhet. Inga eval, inga embeddings." },
];

const PHASES: { n: number; title: string; body: string; activities: string[] }[] = [
  {
    n: 1,
    title: "Initiering",
    body: "Vi förstår kunden — och kundens kund. Var kan vi göra skillnad?",
    activities: [
      "Behovs- & intressentanalys",
      "Kundens kund & värdekedja",
      "Uppdragsmål & nytta",
      "Förutsättningar (ABK 09)",
    ],
  },
  {
    n: 2,
    title: "Planering",
    body: "Vi startar en kundyta, samlar in underlag, strukturerar uppdraget och kommer överens om arbetssättet.",
    activities: [
      "Kundyta & projektrum",
      "Insamling av underlag (FFU/handlingar)",
      "Uppdrags- & leveransplan",
      "Samverkan & arbetssätt",
    ],
  },
  {
    n: 3,
    title: "Genomförande",
    body: "Operativt arbete: analys, projektering och utredning.",
    activities: [
      "Analys & utredning",
      "Projektering",
      "Teknisk beskrivning (AMA) & mängd",
      "Löpande dokumentation (BIM)",
    ],
  },
  {
    n: 4,
    title: "Granskning",
    body: "Vi granskar vår output mot ställda krav.",
    activities: [
      "Egenkontroll",
      "Granskning & verifiering (ISO 9001)",
      "Mot kravställning & standarder",
      "Avvikelser & åtgärder",
    ],
  },
  {
    n: 5,
    title: "Avslut",
    body: "Erfarenhetsåterföring och uppdatering av våra tre nivåer.",
    activities: [
      "Överlämning & slutdokumentation",
      "Erfarenhetsåterföring",
      "Uppdatera Plattforms-OS",
      "Uppdatera Client OS",
      "Uppdatera Project OS",
    ],
  },
];

// De tre OS-nivåerna — färgkodade som resten av appen (oliv/terrakotta/grön).
const LEVELS: {
  name: string;
  tagline: string;
  does: string[];
  how: string;
  bar: string;
  chip: string;
}[] = [
  {
    name: "Plattforms-OS",
    tagline: "Plattformsnivån — vårt gemensamma operativsystem.",
    does: [
      "Playbook & arbetssätt",
      "Mallar & standarder",
      "Kvalitetsledning",
      "Erfarenhetsbank",
      "Kund- & uppdragsregister",
      "Team & roller",
    ],
    how: "Här bor den samlade kunskapen. Standarder och process flödar härifrån ner till varje kund och projekt.",
    bar: "border-l-[#6d6930]",
    chip: "bg-[#eae8d0] text-[#4f4b22]",
  },
  {
    name: "Client OS",
    tagline: "Kundnivån — en delad yta per kund.",
    does: [
      "Kundens projektportfölj",
      "Medlemmar & roller",
      "Uppdrag & avtal",
      "Kundspecifik kunskap",
      "Kontakt & historik",
    ],
    how: "Allt vi gör för en kund samlas här. Vi lär av tidigare uppdrag och återanvänder inom kunden.",
    bar: "border-l-[#b5532a]",
    chip: "bg-[#f5e5d9] text-[#8a3f20]",
  },
  {
    name: "Project OS",
    tagline: "Projektnivån — där uppdraget genomförs.",
    does: [
      "Moduler (Dokument, Tidplan, Process, Teknik, Leverabler…)",
      "Tidplan med CPM, kritisk linje och JSON-export",
      "Dokumentbibliotek (Supabase Storage + soft-delete)",
      "Mängd & kalkyl (MF enligt AMA 23)",
      "Risker, restriktioner & viten",
      "Livscykel, faser & status",
    ],
    how: "Det operativa arbetet. Erfarenheter och underlag matas tillbaka uppåt till Client OS och Plattforms-OS.",
    bar: "border-l-[#5e8553]",
    chip: "bg-[#dde7d5] text-[#3f5c38]",
  },
];

// Operatörsrollen — konsulten som nav i uppdraget.
const OPERATOR: { title: string; body: string }[] = [
  {
    title: "Koordinerar uppdraget",
    body: "Håller ihop process, tidplan och leveranser och driver uppdraget genom faserna.",
  },
  {
    title: "Paketerar informationen",
    body: "Strukturerar och tillgängliggör underlag — gör det komplexa begripligt och beslutbart.",
  },
  {
    title: "Stöttar kunden",
    body: "Kundens kontaktyta och bollplank; ger råd och beslutsstöd genom hela uppdraget.",
  },
  {
    title: "Ser kundens kund",
    body: "Håller slutmottagarens behov och nytta i fokus — inte bara den direkta beställaren.",
  },
  {
    title: "Bryggar nivåerna",
    body: "Verkar i Project OS, samlar i Client OS och återför kunskap till Plattforms-OS.",
  },
  {
    title: "Säkrar kvaliteten",
    body: "Granskning, egenkontroll och erfarenhetsåterföring — äger leveransen och uppföljningen.",
  },
];

// Tre-fönstermodellen.
const WINDOWS: { title: string; body: string }[] = [
  { title: "LLM (tänk)", body: "Modellen som resonerar och formulerar — grundad i sessionens OS-filer." },
  { title: "Verktyg (gör)", body: "Appar och system som utför: plattformen, CAD, kalkyl med mera." },
  { title: "Plattformen (minne)", body: "Den varaktiga kontexten: OS-filerna och datan i plattformen." },
];

// Grounding-filer i /Ground/ (Context Cascade v1.0).
const GROUNDING_FILES: { file: string; level: string; what: string }[] = [
  { file: "PlattformOS.md", level: "Plattform", what: "Plattform, arbetssätt, begreppsmodell, konventioner — ryggraden i varje session." },
  { file: "Client<KUND>.md", level: "Kund", what: "Kundens portfölj, medlemmar, åtagande och kundspecifik kunskap." },
  { file: "Project<ID>.md", level: "Projekt", what: "Enhetens scope, status, innehåll och projektspecifik kontext." },
  { file: "ProjectTask<ID>.md", level: "Projekt", what: "Operativ uppdragsfil per dimension: Kontrakt → WBS → Tasks." },
  { file: "OperatorSystemPrompt.md", level: "Operatör", what: "Systemprompten som styr AI-operatörens beteende i en grundad session." },
  { file: "Strategy.md · HandoverTemplate.md · templates/", level: "Stöd", what: "Strategi, hand-over-mall och kanoniska filmallar (Project/ProjectTask)." },
];

// Customer journey: vad en kund/ett uppdrag går igenom, mappat mot
// de tre affärsbenen (Consulting → Cloud → Academy).
const JOURNEY: { leg: "Consulting" | "Cloud" | "Academy"; title: string; body: string; chip: string }[] = [
  { leg: "Consulting", title: "Första kontakt", body: "Behovet fångas — ofta som filmer, skisser eller muntligt. ”Renrita detta.”", chip: "bg-[#eae8d0] text-[#4f4b22]" },
  { leg: "Consulting", title: "Onboarding", body: "Kund + första enhet skapas i plattformen. Kontakt, roller och uppdrag sätts.", chip: "bg-[#eae8d0] text-[#4f4b22]" },
  { leg: "Cloud", title: "Grounding", body: "Client OS- och Project OS-filer skapas ur mallarna. Operatören tar plats.", chip: "bg-[#dde7d5] text-[#3f5c38]" },
  { leg: "Cloud", title: "Project OS-yta", body: "Ett smalt modulurval aktiveras: översikt, karta, observationer, objekt, dokument.", chip: "bg-[#dde7d5] text-[#3f5c38]" },
  { leg: "Cloud", title: "Leverans", body: "Renritning, exporter och beslutsunderlag levereras i en strukturerad yta.", chip: "bg-[#dde7d5] text-[#3f5c38]" },
  { leg: "Academy", title: "Lessons Learned", body: "Metodiken fångas, återanvänds och kan läras ut.", chip: "bg-[#f5e5d9] text-[#8a3f20]" },
];

// Teknisk checklista: hur vi sätter upp en ny kundinstans i plattformen.
// DB-driven mall — fixture-baserade preview-stubs används bara som
// minsta-möjliga validering, all riktig data ligger i gf_-tabellerna.
const ONBOARDING_STEPS: { title: string; body: string; file?: string }[] = [
  { title: "Seeda kunden + projekt i DB", body: "Skriv en migration som lägger gf_organizations (slug, namn, kind) + gf_projects (slug, name, phase, status, ama_edition) med fasta UUIDs så seeden är idempotent. Applicera via Supabase MCP (apply_migration).", file: "supabase/migrations/000X_seed_<slug>.sql" },
  { title: "Minimal preview-stub", body: "Lägg en stub i PREVIEW_CUSTOMERS — slug, namn, kind, unitNounPlural — och en stub per enhet (id, namn, meta, fas, status). Endast en validerings-rygg så getCustomer/getUnit passerar; medlemmar och innehåll hämtas från DB.", file: "lib/preview-projects.ts" },
  { title: "Grounding-paket (Context Cascade)", body: "Kopiera Ground/templates/ProjectTemplate.md → Ground/Project<Enhet>.md med frontmatter (file_type, client_slug, unit_slug). Skapa ev. ProjectTask<Enhet>.md per dimension. Client<Kund>.md återanvänds om kunden redan finns.", file: "Ground/templates/ → Ground/Client*.md, Project*.md, ProjectTask*.md" },
  { title: "Operatör och behörighet", body: "Skapa inbjudningar via gf_invitations (admin kopierar länk och delar manuellt — inga mejl skickas). Operatören får owner-roll på unit. Medlemmarna ser bara det de har access till.", file: "Admin-sidan /c/[org]/admin · gf_invitations" },
  { title: "Modul-overrides (valfritt)", body: "Vill kunden ha ett smalt urval moduler: använd ProjectModulesPanel i Admin för att toggla synlighet. Skrivs till gf_project_modules — default (saknas rad) = alla standardmoduler.", file: "gf_project_modules · components/ProjectModulesPanel.tsx" },
  { title: "Tidplan (valfritt)", body: "Om uppdraget har tidplan: generera ScheduleEnvelope JSON enligt lib/scheduling/schema.ts, validera via spike-validate-schedule.mjs, seeda gf_schedules + gf_tasks.", file: "scripts/generate-*-schedule.mjs · supabase/seed/000X_*.sql" },
  { title: "Dokumentbibliotek", body: "Storage-mapp under /storage/v1/object/public/documents/<org>/<projekt>/. Soft-delete styrs av gf_documents.deleted_at. För publika PDF:er: lägg under public/ och använd public:-prefix i storage_path.", file: "gf_documents · public/" },
  { title: "Verifiera", body: "Kör npx tsc --noEmit, starta npm run dev, gå till /c/<org>/admin för att verifiera medlemmar, och /intern/operator för att kolla sessionspaketet. Operatörens chips ska visa ✓ för alla grundade filer." },
];

export default function Playbook() {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <PlaybookNav sections={SECTIONS} scrollRef={scrollRef} />
      <div className="px-8 py-8">
        <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          Playbook
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Så jobbar vi</h1>
        <p className="text-ink-2 mt-1 text-sm">
          Vår process genom ett uppdrag — från att förstå kunden till
          erfarenhetsåterföring. Speglar kvalitetsledning (PDCA / ISO 9001).
        </p>

        <section id="process" className="scroll-mt-16">
        {/* Processflöde */}
        <ol className="mt-6 flex flex-wrap items-center gap-y-2">
          {PHASES.map((p, i) => (
            <li key={p.n} className="flex items-center">
              {i > 0 && (
                <span aria-hidden className="px-2 text-border-strong">
                  —
                </span>
              )}
              <span className="flex items-center gap-2 rounded-md border border-border bg-[#eae8d0] px-3 py-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6d6930] text-[10px] font-semibold text-white">
                  {p.n}
                </span>
                <span className="text-[13px] font-medium text-[#4f4b22]">{p.title}</span>
              </span>
            </li>
          ))}
        </ol>

        {/* Vad vi gör per del */}
        <div className="mt-7 space-y-3">
          {PHASES.map((p) => (
            <div key={p.n} className="rounded-lg border border-border border-l-2 border-l-[#6d6930] bg-panel p-4">
              <div className="flex items-baseline gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eae8d0] text-[10px] font-semibold text-[#4f4b22]">
                  {p.n}
                </span>
                <span className="font-medium">{p.title}</span>
                <span className="text-ink-3 text-[13px]">— {p.body}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                {p.activities.map((a) => (
                  <span key={a} className="rounded bg-secondary px-2 py-0.5 text-[12px] text-ink-2">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        </section>

        <section id="nivaer" className="scroll-mt-16">
        {/* De tre nivåerna */}
        <h2 className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          De tre nivåerna
        </h2>
        <p className="text-ink-2 mb-3 text-sm">
          Hur Plattforms-OS, Client OS och Project OS hänger ihop.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {LEVELS.map((l) => (
            <div key={l.name} className={`rounded-lg border border-border border-l-2 bg-panel p-4 ${l.bar}`}>
              <div className="font-medium">{l.name}</div>
              <p className="text-ink-3 mt-0.5 text-[12px] leading-snug">{l.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {l.does.map((d) => (
                  <span key={d} className={`rounded px-2 py-0.5 text-[11px] font-medium ${l.chip}`}>
                    {d}
                  </span>
                ))}
              </div>
              <p className="text-ink-2 mt-3 text-[12px] italic leading-snug">{l.how}</p>
            </div>
          ))}
        </div>
        <div className="text-ink-2 mt-3 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-[12px]">
          ↓ Standarder &amp; process flödar nedåt · ↑ Erfarenhet &amp; kunskap flödar uppåt
        </div>

        </section>

        <section id="operator" className="scroll-mt-16">
        {/* Operatörsrollen */}
        <h2 className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          Operatörsrollen
        </h2>
        <p className="text-ink-2 mb-3 text-sm">
          En konsult är <strong className="text-ink">operatör</strong> — navet i
          uppdraget och spindeln i nätet, som driver processen och rör sig över alla tre nivåer.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OPERATOR.map((o) => (
            <div key={o.title} className="rounded-lg border border-border border-l-2 border-l-[#6d6930] bg-panel p-4">
              <div className="text-[13px] font-medium">{o.title}</div>
              <p className="text-ink-2 mt-1 text-[12px] leading-snug">{o.body}</p>
            </div>
          ))}
        </div>

        </section>

        {/* Grounding & sessioner — tre-fönstermodellen */}
        <section id="grounding" className="scroll-mt-16">
          <h2 className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
            Grounding &amp; sessioner
          </h2>
          <p className="text-ink-2 mb-3 text-sm">
            Operatören arbetar i <strong>tre-fönstermodellen</strong> — LLM (tänk), Verktyg (gör)
            och plattformen (minne). Varje session grundas i markdown-filer så att modellen förstår
            organisationen, kunden och projektet.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {WINDOWS.map((w) => (
              <div key={w.title} className="rounded-lg border border-border border-l-2 border-l-[#6d6930] bg-panel p-4">
                <div className="text-[13px] font-medium">{w.title}</div>
                <p className="text-ink-2 mt-1 text-[12px] leading-snug">{w.body}</p>
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-[12px] font-medium text-ink">
            Grounding-filer (i <code>/Ground/</code>)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border bg-panel">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-medium">Fil</th>
                  <th className="px-3 py-2 font-medium">Nivå</th>
                  <th className="px-3 py-2 font-medium">Innehåll</th>
                </tr>
              </thead>
              <tbody>
                {GROUNDING_FILES.map((g) => (
                  <tr key={g.file} className="border-b border-border align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">{g.file}</td>
                    <td className="px-3 py-2 text-ink-2">{g.level}</td>
                    <td className="px-3 py-2 text-ink-2">{g.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-ink-2 mt-3 text-[13px] leading-relaxed">
            Operatörsytan (<code>/intern/operator</code>) samlar pågående projekt och bygger ett
            <strong> sessionspaket</strong> (upp till fyra filer) — kopiera till urklipp, ladda ner
            (.md) eller hämta som zip. En <strong>hand-over</strong> vid dagens slut matar tillbaka
            kunskap uppåt i de tre nivåerna (erfarenhetsåterföring). Direkt LLM-integration kommer i
            fas 2 via MCP.
          </p>
        </section>

        <section id="moduler" className="scroll-mt-16">
          {/* Project OS — moduler (Lucide-ikoner + kort/lista) */}
          <ModuleCatalog />
        </section>

        <section id="plattform" className="scroll-mt-16">
          <h2 className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
            Plattform
          </h2>
          <p className="text-ink-2 mb-3 text-sm">
            Det tekniska underlaget — Supabase, RLS, Entra, Next.js — som låter
            playbooken fungera i praktiken. Förändringar i datamodellen
            sker via versionerade migrationer i <code>supabase/migrations/</code>.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-panel">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-medium">Område</th>
                  <th className="px-3 py-2 font-medium">Teknik</th>
                  <th className="px-3 py-2 font-medium">Vad det gör</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM.map((p) => (
                  <tr key={p.area} className="border-b border-border align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">{p.area}</td>
                    <td className="px-3 py-2 text-ink-2">{p.tech}</td>
                    <td className="px-3 py-2 text-ink-2">{p.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="ordlista" className="scroll-mt-16">
          <Glossary />
        </section>

        {/* Onboarding — skapa en ny kund (tutorial + customer journey-mall) */}
        <section id="onboarding" className="scroll-mt-16">
          <h2 className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
            Skapa en ny kund
          </h2>
          <p className="text-ink-2 mb-3 text-sm">
            Customer journey-mall + den tekniska checklistan för att rigga en ny
            kundinstans i plattformen.
          </p>

          <h3 className="mb-2 mt-5 text-[12px] font-medium text-ink">Customer journey-mall</h3>
          <p className="text-ink-2 mb-3 text-[13px] leading-relaxed">
            Resan en kund och ett uppdrag tar hos oss — från ”renrita detta” till
            återanvändbar metodik. Stegen mappar mot de tre affärsbenen:
            Consulting → Cloud → Academy.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {JOURNEY.map((j, i) => (
              <div key={j.title} className="rounded-lg border border-border border-l-2 border-l-[#6d6930] bg-panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13px] font-medium">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6d6930] text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                    {j.title}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${j.chip}`}>{j.leg}</span>
                </div>
                <p className="text-ink-2 mt-2 text-[12px] leading-snug">{j.body}</p>
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-7 text-[12px] font-medium text-ink">
            Checklista — sätt upp kunden i repot
          </h3>
          <ol className="space-y-2.5">
            {ONBOARDING_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-lg border border-border bg-panel p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eae8d0] text-[12px] font-semibold text-[#4f4b22]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{s.title}</div>
                  <p className="text-ink-2 mt-0.5 text-[12px] leading-snug">{s.body}</p>
                  {s.file && (
                    <code className="mt-1.5 inline-block rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-ink-3">
                      {s.file}
                    </code>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <p className="text-ink-2 mt-4 text-[13px] leading-relaxed">
            Minimum för att komma igång: steg 1–2 (kund + minst en enhet). Resten
            fylls på efterhand. Målet är inte att överarbeta — utan att visa hur en
            enkel beställning blir ett strukturerat, återanvändbart Project OS-case.
          </p>
        </section>

        <p className="text-ink-3 mt-8 text-[11px]">
          Playbook · utkast att redigera — fler delar kommer.
        </p>
        </div>
      </div>
    </div>
  );
}
