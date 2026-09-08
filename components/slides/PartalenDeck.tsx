"use client";

// Plattformspresentation av Partalen. Fem slides som går igenom de viktiga
// funktionerna i ordning:
//   1. Översikt — vad är Partalen + de fem modulerna
//   2. Projektprocessen — 8 faser med cirkel-flow
//   3. Leverabler — kodade leveranser per fas med metadata
//   4. Teknik — 7 teknikområden med rich data
//   5. Dokumenthantering — bibliotek + versioner + klassificering

import {
  LayoutGrid,
  Workflow,
  Package,
  Wrench,
  FileText,
  CheckSquare,
  Activity,
  Calendar,
  Building2,
  HardHat,
  Droplet,
  Zap,
  Flame,
  Lightbulb,
  Cog,
  Trash2,
  History,
  ShieldCheck,
  Link2,
} from "lucide-react";
import SlideViewer, { type Slide } from "@/components/SlideViewer";

const PRIMARY = "#1E3A8A";
const ACCENT = "#F59E0B";

export default function PartalenDeck() {
  const slides: Slide[] = [
    { id: "overview", content: <OverviewSlide /> },
    { id: "process", content: <ProcessSlide /> },
    { id: "deliverables", content: <DeliverablesSlide /> },
    { id: "tech", content: <TechSlide /> },
    { id: "docs", content: <DocsSlide /> },
  ];
  return (
    <SlideViewer
      slides={slides}
      brandPrimary={PRIMARY}
      brandAccent={ACCENT}
      logoSrc="/partgroup/Logotype.png"
      logoAlt="Partalen"
    />
  );
}

// =============================================================================
// Slide 1 — Översikt
// =============================================================================

function OverviewSlide() {
  const modules = [
    { num: "01", icon: LayoutGrid, title: "Översikt", body: "Välkomstvy med snabbåtkomst till allt projektarbete." },
    { num: "02", icon: Workflow, title: "Projektprocessen", body: "Faser från förstudie till drift, med kopplade leverabler." },
    { num: "03", icon: Package, title: "Leverabler", body: "Kodade leveranser per fas med status, ansvarig och innehåll." },
    { num: "04", icon: Wrench, title: "Teknik", body: "Teknikområden, nyckelkomponenter och framsteg per disciplin." },
    { num: "05", icon: FileText, title: "Dokument", body: "Bibliotek med versioner, klassificering och leverabel-koppling." },
  ];

  return (
    <SlideShell background="#f7f8fa">
      <BgGrid />
      <div className="relative flex h-full flex-col px-16 py-12">
        <Eyebrow>Plattformen</Eyebrow>
        <h1
          className="mt-2 font-light leading-[1.05] tracking-tight"
          style={{
            color: PRIMARY,
            fontFamily: "'Roboto', sans-serif",
            fontSize: "clamp(48px, 6.5vw, 80px)",
            maxWidth: "18ch",
          }}
        >
          Partalen — projektets ena hem.
        </h1>
        <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-2">
          Allt arbete kring ett projekt — människor, faser, leverabler, teknik och
          dokument — samlat i en yta. Inga e-postkedjor, inga lokala kopior, inga
          frågor om var senaste versionen ligger.
        </p>

        <div className="mt-10 grid flex-1 grid-cols-5 gap-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.num}
                className="rounded border bg-white p-4"
                style={{ borderColor: "#e2e8f0" }}
              >
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded"
                    style={{ background: `${PRIMARY}0d`, color: PRIMARY }}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span
                    className="font-mono text-[11px] font-semibold"
                    style={{ color: ACCENT }}
                  >
                    {m.num}
                  </span>
                </div>
                <h3
                  className="mt-3 text-[15px] font-medium"
                  style={{ color: PRIMARY, fontFamily: "'Roboto', sans-serif" }}
                >
                  {m.title}
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{m.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </SlideShell>
  );
}

// =============================================================================
// Slide 2 — Projektprocessen
// =============================================================================

function ProcessSlide() {
  const phases = [
    { n: "0", name: "Förstudie", status: "completed" },
    { n: "1", name: "Program", status: "completed" },
    { n: "2", name: "Systemhandling", status: "current" },
    { n: "3", name: "Bygghandling", status: "upcoming" },
    { n: "4", name: "Mark & grund", status: "upcoming" },
    { n: "5", name: "Stomme & modul", status: "upcoming" },
    { n: "6", name: "Färdigställande", status: "upcoming" },
    { n: "7", name: "Drift", status: "upcoming" },
  ];

  return (
    <SlideShell background="#fff">
      <div className="flex h-full flex-col px-16 py-12">
        <Eyebrow>Projektprocessen</Eyebrow>
        <h2
          className="mt-2 text-4xl font-light tracking-tight"
          style={{ color: PRIMARY, fontFamily: "'Roboto', sans-serif" }}
        >
          Åtta faser — en röd tråd
        </h2>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">
          Projektet visualiseras som en flödeskedja från idé till drift. Varje fas
          har egen status, framsteg, nyckelaktiviteter och en lista över de
          leverabler som ska levereras inom fasen.
        </p>

        {/* Cirkel-flow */}
        <div className="my-10 grid grid-cols-8 gap-2">
          {phases.map((p) => {
            const Icon =
              p.status === "completed"
                ? CheckSquare
                : p.status === "current"
                  ? Activity
                  : Calendar;
            const ring =
              p.status === "completed"
                ? "#16a34a"
                : p.status === "current"
                  ? PRIMARY
                  : "#cbd5e1";
            const text =
              p.status === "completed"
                ? "#15803d"
                : p.status === "current"
                  ? PRIMARY
                  : "#64748b";
            return (
              <div key={p.n} className="flex flex-col items-center text-center">
                <span
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-2"
                  style={{ borderColor: ring }}
                >
                  <span
                    className="font-light leading-none"
                    style={{ color: text, fontFamily: "'Roboto', sans-serif", fontSize: 22 }}
                  >
                    {p.n}
                  </span>
                  <Icon size={11} className="mt-1" style={{ color: text }} />
                </span>
                <span className="mt-2 text-[11px] font-medium leading-tight text-ink">
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bullets */}
        <div className="mt-auto grid grid-cols-3 gap-5">
          <Feature title="Faskort">
            Klick på en fas öppnar detaljpanel med leverabler, framsteg och nyckelaktiviteter.
          </Feature>
          <Feature title="Status-koll">
            Färgkodade ringar (grön/blå/grå) ger omedelbar bild av var projektet står.
          </Feature>
          <Feature title="Full CRUD">
            Lägg till, redigera eller ta bort faser och leverabler direkt från panelen.
          </Feature>
        </div>
      </div>
    </SlideShell>
  );
}

// =============================================================================
// Slide 3 — Leverabler
// =============================================================================

function DeliverablesSlide() {
  return (
    <SlideShell background={PRIMARY}>
      <div className="flex h-full flex-col px-16 py-12 text-white">
        <Eyebrow color={ACCENT}>Leverabler</Eyebrow>
        <h2
          className="mt-2 text-4xl font-light tracking-tight"
          style={{ fontFamily: "'Roboto', sans-serif" }}
        >
          D001 — D039: kodade leveranser
        </h2>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-white/80">
          Varje leverabel har en unik kod, en fas, ett teknikområde, en ansvarig och
          ett måldatum. Innehållspunkter beskriver vad som ingår.
        </p>

        {/* Preview-kort */}
        <div className="my-10 grid flex-1 grid-cols-2 gap-4">
          <FakeDeliverableCard
            code="D010"
            name="Systemhandlingsritningar A"
            discCode="A"
            discColor={ACCENT}
            status="Pågående"
            statusBg="rgba(245, 158, 11, 0.2)"
            statusColor={ACCENT}
            meta={[
              { label: "Fas", value: "2 · Systemhandling" },
              { label: "Format", value: "DWG/BIM" },
              { label: "Ansvarig", value: "Arkitektkonsult" },
              { label: "Måldatum", value: "2026-04-15" },
            ]}
            content={[
              "Planlösningar alla plan",
              "Fasader alla väderstreck",
              "Sektioner & detaljer",
            ]}
          />
          <FakeDeliverableCard
            code="D013"
            name="Energiberäkning"
            discCode="ENERGI"
            discColor="#a78bfa"
            status="Ej påbörjad"
            statusBg="rgba(255, 255, 255, 0.1)"
            statusColor="#fff"
            meta={[
              { label: "Fas", value: "2 · Systemhandling" },
              { label: "Format", value: "PDF" },
              { label: "Ansvarig", value: "Energikonsult" },
              { label: "Måldatum", value: "2026-04-01" },
            ]}
            content={[
              "U-värden klimatskal",
              "Energibalansberäkning",
              "Miljöklassning & LCC",
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          <StatTile value="39" label="leverabler totalt" />
          <StatTile value="8" label="faser med kopplade D-koder" />
          <StatTile value="∞" label="dokument per leverabel" />
        </div>
      </div>
    </SlideShell>
  );
}

// =============================================================================
// Slide 4 — Teknik
// =============================================================================

function TechSlide() {
  const disciplines = [
    { code: "PL", name: "Projektledning", icon: Cog, color: PRIMARY },
    { code: "A", name: "Arkitektur", icon: Building2, color: ACCENT },
    { code: "K", name: "Konstruktion", icon: HardHat, color: "#0EA5E9" },
    { code: "VVS", name: "VVS", icon: Droplet, color: "#10B981" },
    { code: "EL", name: "El", icon: Zap, color: "#EAB308" },
    { code: "BRAND", name: "Brand", icon: Flame, color: "#EF4444" },
    { code: "ENERGI", name: "Energi", icon: Lightbulb, color: "#8B5CF6" },
  ];

  return (
    <SlideShell background="#fff">
      <BgGrid />
      <div className="relative flex h-full flex-col px-16 py-12">
        <Eyebrow>Teknik</Eyebrow>
        <h2
          className="mt-2 text-4xl font-light tracking-tight"
          style={{ color: PRIMARY, fontFamily: "'Roboto', sans-serif" }}
        >
          Sju discipliner — en samordnad helhet
        </h2>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">
          Varje teknikområde har egna nyckelkomponenter och integrationspunkter mot
          andra discipliner. Framsteg spåras separat. Discipline-koden klassificerar
          också dokumenten — A för Arkitektur, K för Konstruktion osv.
        </p>

        {/* 7 ikon-kort */}
        <div className="my-10 grid grid-cols-4 gap-3">
          {disciplines.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.code}
                className="flex items-center gap-3 rounded border bg-white p-4"
                style={{ borderColor: "#e2e8f0" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded border"
                  style={{ borderColor: d.color + "55", color: d.color }}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <div>
                  <div className="text-[14px] font-medium" style={{ color: PRIMARY }}>
                    {d.name}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                    {d.code}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-5">
          <Feature title="Nyckelkomponenter">
            Listar de viktigaste delarna inom disciplinen — t.ex. fasadgestaltning,
            stomme, ventilation.
          </Feature>
          <Feature title="Integrationspunkter">
            Visar vart disciplinen möter andra — schakt, brandceller, kabelvägar.
          </Feature>
          <Feature title="Framsteg & ansvar">
            Progress-bar, ansvarigt team och slutdatum syns på varje kort.
          </Feature>
        </div>
      </div>
    </SlideShell>
  );
}

// =============================================================================
// Slide 5 — Dokumenthantering
// =============================================================================

function DocsSlide() {
  const features = [
    {
      icon: History,
      title: "Versionshistorik",
      body: "Varje uppladdning blir en version. Tidigare versioner är alltid åtkomliga.",
    },
    {
      icon: Trash2,
      title: "Papperskorg",
      body: "Borttagna dokument hamnar i papperskorg — kan återställas eller raderas permanent.",
    },
    {
      icon: ShieldCheck,
      title: "Klassificeringskod",
      body: "TEKNIK-B1-B2-ROLL ger åtkomstkontroll per dokument. Färgkodade badges.",
    },
    {
      icon: Link2,
      title: "Leverabel-koppling",
      body: "Dokumentet hör hemma under en specifik D-kod — så det syns där det ska.",
    },
  ];

  return (
    <SlideShell background="#0f172a">
      <div className="flex h-full flex-col px-16 py-12 text-white">
        <Eyebrow color={ACCENT}>Dokumenthantering</Eyebrow>
        <h2
          className="mt-2 text-4xl font-light tracking-tight"
          style={{ fontFamily: "'Roboto', sans-serif" }}
        >
          Ett bibliotek. En sanning.
        </h2>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-white/80">
          Dokumentbiblioteket har drag&amp;drop-upload, in-app-preview för PDF och
          Office, mapp-vy och filter. Men det är kopplingen till leverabel och
          klassificering som gör skillnaden.
        </p>

        <div className="my-10 grid flex-1 grid-cols-2 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="flex items-start gap-4 rounded border p-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded"
                  style={{ background: "rgba(245, 158, 11, 0.15)", color: ACCENT }}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <div>
                  <h3
                    className="text-lg font-light"
                    style={{ fontFamily: "'Roboto', sans-serif" }}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/75">
                    {f.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p className="max-w-[40ch] text-[13px] text-white/60">
            Tillsammans bildar Partalen ett digitalt nav där projektet drivs som en
            produktionslinje — inte som en samling silos.
          </p>
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center font-mono text-lg font-bold"
              style={{ background: ACCENT, color: PRIMARY }}
            >
              P
            </span>
            <div>
              <div
                className="text-base font-light leading-tight"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Partalen
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                av Playze · för Part Group
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// =============================================================================
// Building blocks
// =============================================================================

function SlideShell({
  children,
  background,
}: {
  children: React.ReactNode;
  background: string;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background }}>
      {children}
    </div>
  );
}

function BgGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(0deg, rgba(30,58,138,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,138,0.05) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }}
    />
  );
}

function Eyebrow({
  children,
  color = PRIMARY,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="inline-block font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
      style={{ color }}
    >
      {children}
    </div>
  );
}

function Feature({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: PRIMARY }}
      >
        {title}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function FakeDeliverableCard({
  code,
  name,
  discCode,
  discColor,
  status,
  statusBg,
  statusColor,
  meta,
  content,
}: {
  code: string;
  name: string;
  discCode: string;
  discColor: string;
  status: string;
  statusBg: string;
  statusColor: string;
  meta: { label: string; value: string }[];
  content: string[];
}) {
  return (
    <div
      className="rounded border p-5"
      style={{
        background: "rgba(255, 255, 255, 0.06)",
        borderColor: "rgba(255, 255, 255, 0.12)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[12px] text-white/60">{code}</span>
        <span
          className="inline-flex h-5 items-center rounded px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ background: discColor }}
        >
          {discCode}
        </span>
        <span
          className="ml-auto rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: statusBg, color: statusColor }}
        >
          {status}
        </span>
      </div>
      <h3
        className="mt-2 text-xl font-light"
        style={{ fontFamily: "'Roboto', sans-serif" }}
      >
        {name}
      </h3>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        {meta.map((m) => (
          <div key={m.label}>
            <dt className="font-mono uppercase tracking-wider text-white/40">{m.label}</dt>
            <dd className="mt-0.5 text-white/85">{m.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-4 space-y-1 border-t border-white/10 pt-3">
        {content.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-white/75">
            <span style={{ color: ACCENT, marginTop: 1 }}>›</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div
        className="font-light leading-none tracking-tight text-white"
        style={{ fontFamily: "'Roboto', sans-serif", fontSize: 44 }}
      >
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/60">
        {label}
      </div>
    </div>
  );
}
