"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Download, FileArchive, Trash2, Upload } from "lucide-react";
import {
  exportProjectDocJson,
  exportProjectDocZip,
  parseProjectDoc,
} from "@/lib/io/project-doc-io";
import { clearOverlay, listOverlays, writeOverlay } from "@/lib/io/project-doc-overlay";
import type { ProjectDoc } from "@/lib/schema/project-doc";

export interface AdminUnit {
  org: string;
  orgName: string;
  unitId: string;
  unitName: string;
}

type ImportState =
  | { kind: "idle" }
  | { kind: "error"; file: string; errors: string[] }
  | { kind: "ok"; file: string; doc: ProjectDoc };

async function fetchDoc(org: string, unit: string): Promise<ProjectDoc | null> {
  const res = await fetch(
    `/api/project-doc?org=${encodeURIComponent(org)}&unit=${encodeURIComponent(unit)}`,
  );
  if (!res.ok) return null;
  return (await res.json()) as ProjectDoc;
}

export default function ProjectDocAdmin({ units }: { units: AdminUnit[] }) {
  const [selected, setSelected] = useState(
    units[0] ? `${units[0].org}/${units[0].unitId}` : "",
  );
  const [busy, setBusy] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [imp, setImp] = useState<ImportState>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [overlays, setOverlays] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setOverlays(listOverlays()), []);
  const refreshOverlays = () => setOverlays(listOverlays());

  async function doExport(zip: boolean) {
    const [org, unit] = selected.split("/");
    if (!org || !unit) return;
    setBusy(true);
    setExportErr(null);
    try {
      const doc = await fetchDoc(org, unit);
      if (!doc) {
        setExportErr("Kunde inte hämta enheten.");
        return;
      }
      if (zip) await exportProjectDocZip(doc);
      else exportProjectDocJson(doc);
    } catch (e) {
      setExportErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const res = parseProjectDoc(text);
    if (!res.ok) {
      setImp({ kind: "error", file: file.name, errors: res.errors });
      return;
    }
    writeOverlay(res.doc);
    refreshOverlays();
    setImp({ kind: "ok", file: file.name, doc: res.doc });
  }

  return (
    <div>
      <SectionHeader>Projekt-JSON · export &amp; import</SectionHeader>
      <p className="text-ink-2 -mt-1 mb-3 text-[12px]">
        Gemensamt schema (ProjectDoc) — exportera en enhet till JSON/ZIP eller importera en fil.
        Importen valideras mot schemat och sparas lokalt (overlay); team/roller tillämpas aldrig
        automatiskt.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Export */}
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="text-[13px] font-medium">Exportera</div>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-2 w-full rounded border border-border bg-bg px-2 py-1.5 text-[13px]"
          >
            {units.map((u) => (
              <option key={`${u.org}/${u.unitId}`} value={`${u.org}/${u.unitId}`}>
                {u.orgName} · {u.unitName}
              </option>
            ))}
          </select>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy || !selected}
              onClick={() => doExport(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium hover:border-border-strong disabled:opacity-50"
            >
              <Download size={14} /> JSON
            </button>
            <button
              type="button"
              disabled={busy || !selected}
              onClick={() => doExport(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium hover:border-border-strong disabled:opacity-50"
            >
              <FileArchive size={14} /> ZIP
            </button>
          </div>
          {exportErr && (
            <p className="mt-2 flex items-center gap-1 text-[12px] text-danger">
              <AlertTriangle size={13} /> {exportErr}
            </p>
          )}
        </div>

        {/* Import */}
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="text-[13px] font-medium">Importera</div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className={`mt-2 cursor-pointer rounded-md border border-dashed px-3 py-5 text-center text-[12px] transition ${
              dragOver ? "border-[#6d6930] bg-[#eae8d0]/50" : "border-border text-ink-3 hover:border-border-strong"
            }`}
          >
            <Upload size={16} className="mx-auto mb-1 opacity-70" />
            Släpp en .json-fil här eller klicka för att välja
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {/* Importresultat */}
      {imp.kind === "error" && (
        <div className="mt-3 rounded-lg border border-danger/40 bg-danger-bg/50 p-3">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
            <AlertTriangle size={14} /> {imp.file} — validering misslyckades
          </div>
          <ul className="mt-1.5 list-disc pl-5 text-[12px] text-ink-2">
            {imp.errors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {imp.kind === "ok" && (
        <div className="mt-3 rounded-lg border border-[#5e8553]/40 bg-success-bg/50 p-3">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-success-text">
            <Check size={14} /> {imp.doc.identity.org}/{imp.doc.identity.unit} validerad &amp; sparad lokalt
          </div>
          <p className="mt-1 text-[12px] text-ink-2">
            {imp.doc.content.observations?.length ?? 0} observationer ·{" "}
            {imp.doc.content.objects?.length ?? 0} objekt ·{" "}
            {imp.doc.content.deliverables?.length ?? 0} leverabler · {imp.doc.ama.tb.length} TB ·{" "}
            {imp.doc.ama.mf.length} MF · {imp.doc.modules.groups?.length ?? 0} modulgrupper
          </p>
          {(imp.doc.team.members.length > 0 || imp.doc.team.invites.length > 0) && (
            <p className="mt-1.5 flex items-center gap-1 text-[12px] text-warn">
              <AlertTriangle size={13} /> Team i karantän: {imp.doc.team.members.length} medlemmar,{" "}
              {imp.doc.team.invites.length} inbjudningar — tillämpas inte automatiskt.
            </p>
          )}
        </div>
      )}

      {/* Lokala overlays */}
      {overlays.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">
            Lokala importer (overlay)
          </div>
          <div className="flex flex-wrap gap-2">
            {overlays.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-panel px-2 py-1 text-[12px]"
              >
                {key}
                <button
                  type="button"
                  title="Rensa lokal overlay"
                  onClick={() => {
                    const [org, unit] = key.split("/");
                    clearOverlay(org, unit);
                    refreshOverlays();
                  }}
                  className="text-ink-3 hover:text-danger"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-9 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
      {children}
    </h2>
  );
}
