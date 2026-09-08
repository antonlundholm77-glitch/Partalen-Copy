"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Copy, Check, Download, FileDown, FileText, Search, Upload } from "lucide-react";
import { saveBlob } from "@/lib/io/save-blob";

export interface OpProject {
  clientSlug: string;
  clientName: string;
  unitSlug: string;
  unitName: string;
  kind: "entreprenad";
  phase?: string;
  badge: string; // fas-label eller termin
  files: {
    platform: { name: string; content: string } | null;
    client: { name: string; content: string } | null;
    project: { name: string; content: string } | null;
    projectTask: { name: string; content: string } | null;
  };
}

export interface OpFile {
  name: string;
  fileType: string;
  version: string;
  lastUpdated: string;
  size: number;
  content: string;
}

function fmtSize(b: number) {
  return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} kB`;
}

// CC-kommando: startar en Claude Code-session grundad i de tre OS-filerna.
function ccCommand(p: OpProject): string {
  const refs = [p.files.platform, p.files.client, p.files.project, p.files.projectTask]
    .filter(Boolean)
    .map((f) => `@Ground/${f!.name}`)
    .join(" ");
  return `claude "Läs ${refs} och grunda sessionen enligt dem. Vi arbetar i tre-fönstermodellen (LLM/Verktyg/Plattform) med ${p.clientName} · ${p.unitName}."`;
}

export default function OperatorView({
  projects,
  files,
}: {
  projects: OpProject[];
  files: OpFile[];
}) {
  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
          Internt · Operatörsyta
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Operatör</h1>
        <p className="text-ink-2 mt-1 text-sm">
          Starta LLM-sessioner grundade i de tre OS-filerna. Startare och bibliotek — inte en
          chatt (LLM-integration kommer i fas 2 via MCP).
        </p>

        <Section1 projects={projects} />
        <Section2 files={files} />
        <Section3 />
      </div>
    </div>
  );
}

/* ── Sektion 1 — Pågående projekt ── */
function Section1({ projects }: { projects: OpProject[] }) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Unika kunder + antal projekt per kund, ordningen från projects-listan
  const clientChips = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const p of projects) {
      const entry = counts.get(p.clientSlug);
      if (entry) entry.count += 1;
      else counts.set(p.clientSlug, { name: p.clientName, count: 1 });
    }
    return [...counts.entries()].map(([slug, v]) => ({ slug, ...v }));
  }, [projects]);

  const shown = selectedClient
    ? projects.filter((p) => p.clientSlug === selectedClient)
    : projects;

  return (
    <>
      <h2 className="mb-1 mt-9 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
        Pågående projekt
      </h2>
      <p className="text-ink-2 mb-3 text-sm">
        <strong>Kopiera sessionspaket</strong> → klistra in i Claude Desktop (alla OS-filer i
        ett klipp — mest pålitligt). Eller <strong>Ladda ner (.md)</strong> och dra in filen
        från Finder. Direkt-drag från webbläsaren in i Desktop stöds inte.
      </p>

      {/* Kundfilter */}
      {clientChips.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-ink-3 mr-1 text-[11px] uppercase tracking-wider">Kund:</span>
          <ClientChip
            label="Alla"
            count={projects.length}
            active={selectedClient === null}
            onClick={() => setSelectedClient(null)}
          />
          {clientChips.map((c) => (
            <ClientChip
              key={c.slug}
              label={c.name}
              count={c.count}
              active={selectedClient === c.slug}
              onClick={() => setSelectedClient(c.slug)}
            />
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-ink-3 text-sm">Inga pågående enheter.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((p) => (
            <ProjectCard key={`${p.clientSlug}/${p.unitSlug}`} p={p} />
          ))}
        </div>
      )}
    </>
  );
}

function ClientChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition ${
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-panel text-ink-2 hover:bg-secondary"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span
        className={`rounded-full px-1.5 text-[10px] font-mono ${
          active ? "bg-white/20 text-white" : "bg-secondary text-ink-3"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ProjectCard({ p }: { p: OpProject }) {
  const [copied, setCopied] = useState<null | "bundle" | "cc">(null);
  const missing = !p.files.project;
  const osFiles = [
    { label: "PlattformOS", f: p.files.platform },
    { label: p.files.client?.name.replace(/\.md$/, "") ?? "Client OS", f: p.files.client },
    { label: p.files.project?.name.replace(/\.md$/, "") ?? "Project OS", f: p.files.project },
    { label: p.files.projectTask?.name.replace(/\.md$/, "") ?? "ProjectTask", f: p.files.projectTask },
  ];

  async function copyCC() {
    await navigator.clipboard.writeText(ccCommand(p));
    setCopied("cc");
    setTimeout(() => setCopied(null), 1500);
  }

  // Kopiera hela sessionspaketet till urklipp — klistra in i Claude Desktop.
  // Mest pålitliga vägen: paste fungerar överallt (drag in i Desktop gör inte).
  async function copyBundle() {
    await navigator.clipboard.writeText(bundleText());
    setCopied("bundle");
    setTimeout(() => setCopied(null), 1500);
  }

  // Ett sammanslaget sessionspaket (en .md) — alla OS-filer i en fil.
  const bundleName = `session-${p.clientSlug}-${p.unitSlug}.md`;
  function bundleText(): string {
    const sep = (name: string) =>
      `\n\n${"=".repeat(72)}\n=== ${name} ===\n${"=".repeat(72)}\n\n`;
    const parts = [p.files.platform, p.files.client, p.files.project, p.files.projectTask].filter(Boolean);
    const body = parts.map((f) => sep(f!.name) + f!.content).join("");
    const header =
      `# Sessionspaket — ${p.clientName} · ${p.unitName}\n\n` +
      `Grounding för en LLM-session i tre-fönstermodellen (LLM/Verktyg/Plattform).\n` +
      `Innehåller ${parts.length} av upp till 4 OS-filer (PlattformOS, ClientOS, ProjectOS, ProjectTask).\n` +
      `Läs hela och grunda sessionen enligt dem.\n`;
    return header + body;
  }

  function downloadBundle() {
    saveBlob(new Blob([bundleText()], { type: "text/markdown" }), bundleName);
  }

  async function downloadZip() {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const included = [p.files.platform, p.files.client, p.files.project, p.files.projectTask].filter(
      Boolean,
    );
    included.forEach((f) => zip.file(f!.name, f!.content));
    const readme =
      `Sessionspaket — ${p.clientName} · ${p.unitName}\n` +
      `Grounding för en LLM-session i tre-fönstermodellen (LLM/Verktyg/Plattform).\n\n` +
      `Innehåller ${included.length} av upp till 4 OS-filer:\n` +
      included.map((f) => `- ${f!.name}`).join("\n") +
      `\n\nLadda in alla filer som kontext i din LLM-session.\n`;
    zip.file("README.txt", readme);
    const blob = await zip.generateAsync({ type: "blob" });
    saveBlob(blob, `session-${p.clientSlug}-${p.unitSlug}.zip`);
  }

  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{p.unitName}</div>
          <div className="text-ink-3 text-[12px]">{p.clientName}</div>
        </div>
        <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
          {p.badge}
        </span>
      </div>

      {/* OS-filers närvaro */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {osFiles.map((t) => (
          <span
            key={t.label}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              t.f ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text"
            }`}
            title={t.f ? t.f.name : "saknas"}
          >
            {t.f ? "✓" : "✗"} {t.label}
          </span>
        ))}
      </div>

      {missing && (
        <div className="text-warning-text mt-2 flex items-start gap-1.5 text-[11px]">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          <span>
            Project OS grounding-fil saknas — skapa den först från
            <code> templates/ProjectTemplate.md</code>.
          </span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={copyBundle}
          disabled={missing}
          title="Kopiera hela sessionspaketet — klistra in i Claude Desktop"
          className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {copied === "bundle" ? <Check size={13} /> : <Copy size={13} />}
          {copied === "bundle" ? "Kopierat — klistra in" : "Kopiera sessionspaket"}
        </button>
        <button
          onClick={downloadBundle}
          disabled={missing}
          title="Ladda ner .md — dra sedan in från Finder i Claude Desktop"
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
        >
          <FileDown size={13} /> Ladda ner (.md)
        </button>
        <button
          onClick={copyCC}
          disabled={missing}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
        >
          {copied === "cc" ? <Check size={13} /> : <Copy size={13} />}
          {copied === "cc" ? "Kopierat" : "CC-kommando"}
        </button>
        <button
          onClick={downloadZip}
          disabled={missing}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
        >
          <Download size={13} /> Zip
        </button>
      </div>
    </div>
  );
}

/* ── Sektion 2 — Filbibliotek ── */
function Section2({ files }: { files: OpFile[] }) {
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<OpFile | null>(null);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return files.filter(
      (f) => !s || f.name.toLowerCase().includes(s) || f.fileType.toLowerCase().includes(s),
    );
  }, [files, q]);

  return (
    <>
      <h2 className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
        Grounding-filer
      </h2>
      <p className="text-ink-2 mb-3 text-sm">Alla aktiva OS-filer och mallar i /Ground/.</p>
      <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-1.5">
        <Search size={14} className="text-ink-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Sök fil eller typ…"
          className="w-full border-0 bg-transparent text-[13px] outline-none"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-panel">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-ink-3">
              <th className="px-3 py-2 font-medium">Fil</th>
              <th className="px-3 py-2 font-medium">Typ</th>
              <th className="px-3 py-2 font-medium">Version</th>
              <th className="px-3 py-2 font-medium">Senast uppdaterad</th>
              <th className="px-3 py-2 font-medium">Storlek</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <tr
                key={f.name}
                onClick={() => setPreview(f)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/30"
              >
                <td className="px-3 py-2 font-medium text-ink">
                  <span className="flex items-center gap-2">
                    <FileText size={14} className="text-ink-3" />
                    {f.name}
                  </span>
                </td>
                <td className="px-3 py-2 text-ink-2">{f.fileType}</td>
                <td className="px-3 py-2 text-ink-2">{f.version}</td>
                <td className="px-3 py-2 text-ink-3">{f.lastUpdated}</td>
                <td className="px-3 py-2 text-ink-3">{fmtSize(f.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreview(null)} />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-panel shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-[13px] font-medium">{preview.name}</span>
              <button onClick={() => setPreview(null)} className="text-ink-3 hover:text-ink">
                ✕
              </button>
            </div>
            <pre className="overflow-auto whitespace-pre-wrap p-4 text-[12px] leading-relaxed text-ink-2">
              {preview.content}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sektion 3 — Hand-over-inkorg ── */
function Section3() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null);
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fm || !/file_type:\s*Handover/i.test(fm[1])) {
      setMsg({ ok: false, text: "Saknar frontmatter med file_type: Handover." });
      return;
    }
    const json = text.match(/```json\s*([\s\S]*?)```/);
    if (!json) {
      setMsg({ ok: false, text: "Saknar json-block (se HandoverTemplate.md)." });
      return;
    }
    try {
      JSON.parse(json[1]);
    } catch {
      setMsg({ ok: false, text: "JSON-blocket är inte giltig JSON." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setMsg({
        ok: true,
        text: `Hand-over mottagen: ${data.path}. Plattform-steward läser och uppdaterar OS-filer veckovis.`,
      });
      setText("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Inlämning misslyckades." });
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File) {
    file.text().then(setText);
  }

  return (
    <>
      <h2 className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
        Lämna in dagens hand-over
      </h2>
      <p className="text-ink-2 mb-3 text-sm">Markdown med inbäddat JSON enligt HandoverTemplate.md.</p>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className="mb-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-panel py-4 text-[13px] text-ink-3 hover:border-border-strong"
      >
        <Upload size={15} />
        Dra hit en .md-fil eller klicka för att välja
        <input
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="…eller klistra in hand-over-innehållet här"
        rows={8}
        className="block w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-[12px] text-ink"
      />
      <p className="text-ink-3 mt-1 text-[11px]">
        Filnamn enligt mönster <code>&lt;datum&gt;_handover_&lt;initialer&gt;_&lt;projekt-slug&gt;.md</code>
      </p>

      {msg && (
        <div
          className={`mt-2 rounded-md border px-3 py-2 text-[13px] ${
            msg.ok
              ? "border-success-text/30 bg-success-bg text-success-text"
              : "border-danger bg-danger-bg text-danger"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || !text.trim()}
        className="mt-2 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Lämnar in…" : "Lämna in"}
      </button>
    </>
  );
}
