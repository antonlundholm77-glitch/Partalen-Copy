// Presentationsvyer för kurerat, statiskt projektinnehåll (lib/project-content).
// Server-renderade, ingen interaktivitet.

import { Card, EmptyState, Table, Th, TdName, TdId } from "@/components/ui";
import type {
  Certainty,
  Deliverable,
  DocFolder,
  Lesson,
  Observation,
  ProjectQuestion,
  TechObject,
} from "@/lib/project-content";

type Tone = "green" | "amber" | "red" | "neutral" | "accent";

const PILL: Record<Tone, string> = {
  green: "bg-[#e7efe2] text-[#3f5c38]",
  amber: "bg-[#f5e5d9] text-[#8a3f20]",
  red: "bg-[#f6e4e4] text-[#8f2a2a]",
  neutral: "bg-secondary text-ink-3",
  accent: "bg-accent-bg text-accent-text",
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${PILL[tone]}`}>
      {children}
    </span>
  );
}

function Page({
  title,
  unitName,
  intro,
  children,
}: {
  title: string;
  unitName: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-medium tracking-tight">{title}</h1>
        <p className="text-ink-3 mt-0.5 text-sm">{unitName}</p>
        {intro && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

const CERTAINTY: Record<Certainty, { label: string; tone: Tone }> = {
  kant: { label: "Känt", tone: "green" },
  tolkat: { label: "Tolkat", tone: "amber" },
  osakert: { label: "Osäkert", tone: "red" },
};

export function CertaintyBadge({ value }: { value: Certainty }) {
  const c = CERTAINTY[value];
  return <Pill tone={c.tone}>{c.label}</Pill>;
}

export function ObservationsView({
  unitName,
  observations,
}: {
  unitName: string;
  observations: Observation[];
}) {
  const tone = (s?: Observation["status"]): Tone =>
    s === "stopp" ? "red" : s === "ny" ? "amber" : "green";
  const label = (s?: Observation["status"]) =>
    s === "stopp" ? "Stopp" : s === "ny" ? "Ny" : "Kopplad";
  return (
    <Page
      title="Observationer"
      unitName={unitName}
      intro="Fältobservationer från filmning och inspektion. Varje observation kan kopplas till plats, objekt och leverabel."
    >
      <div className="grid gap-2">
        {observations.map((o) => (
          <Card key={o.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-ink-3">{o.id}</span>
                <Pill tone={tone(o.status)}>{label(o.status)}</Pill>
              </div>
              <p className="mt-1 text-sm text-ink">{o.note}</p>
            </div>
            {o.object && (
              <span className="shrink-0 whitespace-nowrap text-[12px] text-ink-3">{o.object}</span>
            )}
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function ObjectsView({
  unitName,
  objects,
}: {
  unitName: string;
  objects: TechObject[];
}) {
  return (
    <Page
      title="Tekniska objekt"
      unitName={unitName}
      intro="Kända objekt i ledningssystemet. Säkerhetsläget visar hur säkert objektets läge/funktion är — bättre med tolkat än att låtsas att inmätning finns."
    >
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev1">
        <Table className="!min-w-0">
          <thead>
            <tr>
              <Th>Objekt</Th>
              <Th>Typ</Th>
              <Th>Säkerhet</Th>
              <Th>Not</Th>
            </tr>
          </thead>
          <tbody>
            {objects.map((o) => (
              <tr key={o.id}>
                <TdName>{o.name}</TdName>
                <td className="text-ink-2">{o.kind}</td>
                <td><CertaintyBadge value={o.certainty} /></td>
                <td className="text-ink-2">{o.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Page>
  );
}

export function QuestionsView({
  unitName,
  questions,
}: {
  unitName: string;
  questions: ProjectQuestion[];
}) {
  return (
    <Page
      title="Frågor"
      unitName={unitName}
      intro="Öppna frågor till beställaren/kunden — det vi behöver svar på för att kunna leverera rätt."
    >
      <div className="grid gap-2">
        {questions.map((q) => (
          <Card key={q.id} className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-px font-mono text-[12px] text-ink-3">{q.id}</span>
            <p className="text-sm text-ink">{q.text}</p>
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function DeliverablesView({
  unitName,
  deliverables,
}: {
  unitName: string;
  deliverables: Deliverable[];
}) {
  const tone = (s: Deliverable["status"]): Tone =>
    s === "klar" ? "green" : s === "pagar" ? "amber" : "neutral";
  const label = (s: Deliverable["status"]) =>
    s === "klar" ? "Klar" : s === "pagar" ? "Pågår" : "Planerad";
  return (
    <Page
      title="Leverabler"
      unitName={unitName}
      intro="Det vi levererar i uppdraget — renritning, exporter och beslutsunderlag."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {deliverables.map((d) => (
          <Card key={d.id} className="px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{d.name}</span>
              <Pill tone={tone(d.status)}>{label(d.status)}</Pill>
            </div>
            <div className="mt-1 text-[12px] uppercase tracking-wide text-ink-3">
              {d.format ?? "—"}
            </div>
            {d.note && <p className="mt-1.5 text-[13px] text-ink-2">{d.note}</p>}
          </Card>
        ))}
      </div>
    </Page>
  );
}

export function LessonsView({
  unitName,
  lessons,
}: {
  unitName: string;
  lessons: Lesson[];
}) {
  return (
    <Page
      title="Lessons Learned"
      unitName={unitName}
      intro="Lärdomar och metodik värd att fånga, återanvända och lära ut (Academy)."
    >
      {lessons.length === 0 ? (
        <Card>
          <EmptyState
            title="Inga lärdomar än"
            sub="Fångas löpande under uppdraget och via hand-overs. Metodiken från detta showcase ska kunna återanvändas och läras ut."
          />
        </Card>
      ) : (
        <div className="grid gap-2">
          {lessons.map((l) => (
            <Card key={l.id} className="px-4 py-3.5 text-sm text-ink">{l.text}</Card>
          ))}
        </div>
      )}
    </Page>
  );
}

export function DocumentsStaticView({
  unitName,
  intro,
  folders,
}: {
  unitName: string;
  intro?: string;
  folders: DocFolder[];
}) {
  const statusPill = (s?: "underlag" | "leverans" | "platshallare") => {
    if (s === "underlag") return <Pill tone="accent">Underlag</Pill>;
    if (s === "leverans") return <Pill tone="green">Leverans</Pill>;
    return <Pill tone="neutral">Platshållare</Pill>;
  };
  return (
    <Page title="Dokument" unitName={unitName} intro={intro}>
      <div className="grid gap-4">
        {folders.map((f) => (
          <div key={f.name}>
            <h2 className="mb-2 text-[13px] font-medium text-ink-2">{f.name}</h2>
            <div className="grid gap-1.5">
              {f.files.map((file) => (
                <Card key={file.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{file.name}</div>
                    {file.meta && <div className="truncate text-[12px] text-ink-3">{file.meta}</div>}
                  </div>
                  {statusPill(file.status)}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
