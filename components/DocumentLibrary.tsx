"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { AUTH_ENABLED } from "@/lib/auth";
import { PROJECT_PHASES, phaseLabel } from "@/lib/lifecycle";
import AccessCodeBuilder from "@/components/AccessCodeBuilder";
import DocumentAccessBadge from "@/components/DocumentAccessBadge";
import DocumentPlaceholderView, { type GroupKey } from "@/components/DocumentPlaceholderView";
import DeliverableFormModal from "@/components/DeliverableFormModal";
import { DISCIPLINES } from "@/lib/access/constants";
import type {
  PmDeliverableWithJoins,
  PmDiscipline,
  PmPhase,
} from "@/lib/db/deliverables";
import {
  updateDeliverable,
  deleteDeliverable,
  type ActionResult as DeliverableActionResult,
} from "@/app/actions/deliverables";
import {
  listDocuments,
  listVersions,
  uploadDocument,
  uploadNewVersion,
  setStatus,
  updateMeta,
  signedUrl,
  currentVersionUrl,
  softDeleteDocument,
  restoreDocument,
  permanentlyDeleteDocument,
  formatSize,
  DOC_STATUS,
  type GfDocument,
  type GfDocumentVersion,
  type GfDocStatus,
} from "@/lib/documents";

type View = "lista" | "mappar";
type GroupBy = "discipline" | "phase" | "status" | "deliverable";
// Bläddra-stöd i preview: spara hela listan av dokument som visas just nu
// plus index för det öppnade. Prev/Next steget byter index, overlayen
// fetchar URL för nya dokumentet.
type PreviewContext = { siblings: GfDocument[]; index: number };

const GROUP_LABELS: Record<GroupBy, string> = {
  discipline: "Teknikområde",
  phase: "Typ",
  status: "Status",
  deliverable: "Leverabel",
};

const STATUS_LABELS: Record<string, string> = {
  arbetsmaterial: "Arbetsmaterial",
  granskning: "Granskning",
  godkand: "Godkänd",
};

const STATUS_ORDER: Record<string, number> = {
  Arbetsmaterial: 0,
  Granskning: 1,
  Godkänd: 2,
};
type Preview = { url: string; mime: string | null; name: string };

export interface DeliverableOption {
  id: string;
  code: string;
  name: string;
}

export interface DisciplineOption {
  code: string;
  name: string;
  color?: string | null;
}

export default function DocumentLibrary({
  projectId,
  unitName,
  variant = "page",
  deliverables = [],
  disciplines = [],
  richDeliverables = [],
  richDisciplines = [],
  phases = [],
  canUpload = true,
  canManage = false,
  orgSlug,
  projectSlug,
  projectIdForActions,
}: {
  projectId: string | null;
  unitName: string;
  // "page" = fyller ytan med egen scroll; "block" = naturlig höjd (ligger överst
  // i ett projekt med annat innehåll under).
  variant?: "page" | "block";
  // Leverabler för projektet — visas som dropdown vid uppladdning så användaren
  // kan koppla nya dokument till en specifik leverabel (D001, D002, ...).
  deliverables?: DeliverableOption[];
  // Teknikområden från projektets pm_disciplines (Tekniksidan). När listan finns
  // ersätts fritext-fältet 'Disciplin' med en select. Lagrat värde är code (t.ex. 'A').
  disciplines?: DisciplineOption[];
  // Full pm_deliverables med joins — behövs för platshållar-vyn (status/discipline-render).
  richDeliverables?: PmDeliverableWithJoins[];
  // Full pm_disciplines (med id) — behövs för DeliverableFormModal när
  // platshållare redigeras.
  richDisciplines?: PmDiscipline[];
  // pm_phases — behövs för Mappar-vyn i platshållar-läget (gruppering per fas).
  phases?: PmPhase[];
  // Owner/User → true, Visitor → false. När false gömms uppladdaren och
  // drag&drop i platshållar-vyn deaktiveras. RLS gör samma block på DB.
  canUpload?: boolean;
  // Endast Ägare. Visar redigera/radera-knappar på platshållare + slug-byte etc.
  canManage?: boolean;
  // Behövs för server actions när platshållare redigeras/raderas.
  orgSlug?: string;
  projectSlug?: string;
  projectIdForActions?: string | null;
}) {
  const [docs, setDocs] = useState<GfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Mappar-vyn är default när man kommer in i biblioteket, grupperat per
  // teknikområde. Lista går alltid att slå om till.
  const [view, setView] = useState<View>("mappar");
  const [groupBy, setGroupBy] = useState<GroupBy>("discipline");
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  // Papperskorg-läge: visar bara dokument med deleted_at IS NOT NULL.
  // Uppladdning är gömd; Återställ/Radera permanent ersätter vanliga åtgärder.
  const [trashView, setTrashView] = useState(false);
  // Platshållar-läge: visar alla pm_deliverables som platshållare med
  // kopplade dokument eller drop-zone. Toggla mellan denna och vanlig
  // dokumentlista. Bara meningsfullt när richDeliverables finns.
  const hasPlaceholders = richDeliverables.length > 0;
  // "Alla uppladdade" är default — mappar-vyn med teknikområde syns direkt.
  // Användaren kan toggle:a till platshållar-vyn när de vill se leverabel-
  // strukturen.
  const [placeholderMode, setPlaceholderMode] = useState(false);
  // Gruppera-efter-val i platshållar-läget. Default Teknikområde.
  const [groupKey, setGroupKey] = useState<GroupKey>("discipline");
  // Modal-state för redigering/radering av platshållare (pm_deliverables).
  // Bara Ägare ser knapparna; mutations validerar via canManageProject + RLS.
  const [editDeliverable, setEditDeliverable] =
    useState<PmDeliverableWithJoins | null>(null);
  const [deletingDeliverable, setDeletingDeliverable] =
    useState<PmDeliverableWithJoins | null>(null);
  const [deliverablePending, setDeliverablePending] = useState(false);
  // Per-row file input — utlöses via ref.current?.click() med pre-set
  // deliverable_id, så Browse-knappen på en specifik platshållare laddar upp
  // med korrekt koppling.
  const rowFileRef = useRef<HTMLInputElement>(null);
  const rowTargetDeliverableRef = useRef<string | null>(null);

  const [metaPhase, setMetaPhase] = useState("");
  const [metaDiscipline, setMetaDiscipline] = useState("");
  const [metaDeliverable, setMetaDeliverable] = useState("");
  // Filter på discipline-segmentet i access_code. Tom = visa alla.
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [versionsFor, setVersionsFor] = useState<GfDocument | null>(null);
  const [versions, setVersions] = useState<GfDocumentVersion[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<GfDocument | null>(null);
  // Enkel preview används bara från versions-modalen (en specifik version
  // utan bläddring). Huvudflödet öppnar browsePreview istället.
  const [preview, setPreview] = useState<Preview | null>(null);
  const [browsePreview, setBrowsePreview] = useState<PreviewContext | null>(null);
  const [editDoc, setEditDoc] = useState<GfDocument | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const versionTargetRef = useRef<GfDocument | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDocs(await listDocuments(projectId, { includeDeleted: trashView }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, trashView]);

  useEffect(() => {
    if (AUTH_ENABLED && projectId) refresh();
    else setLoading(false);
  }, [refresh, projectId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const disc = filterDiscipline.trim().toUpperCase();
    return docs.filter((d) => {
      if (q) {
        const hit =
          d.name.toLowerCase().includes(q) ||
          (d.discipline ?? "").toLowerCase().includes(q) ||
          (d.phase ?? "").toLowerCase().includes(q) ||
          (d.access_code ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (disc) {
        // Matchar mot första segmentet i access_code (TEKNIK)
        const first = (d.access_code ?? "").split("-")[0]?.toUpperCase();
        if (first !== disc) return false;
      }
      return true;
    });
  }, [docs, search, filterDiscipline]);

  // Map för leverabel-gruppering: id → "D001 — namn".
  const deliverableLabels = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of deliverables) m.set(d.id, `${d.code} — ${d.name}`);
    return m;
  }, [deliverables]);

  const groups = useMemo(() => {
    const map = new Map<string, GfDocument[]>();
    for (const d of filtered) {
      let label: string;
      if (groupBy === "discipline") {
        label = d.discipline || "Utan teknikområde";
      } else if (groupBy === "phase") {
        const raw = d.phase;
        // PROJECT_PHASES-värden får sin svenska label; fri text (t.ex.
        // "Plan- & profilritningar") behålls som-is.
        const lifecycle = raw ? phaseLabel(raw as never) : null;
        label = lifecycle || raw || "Utan typ";
      } else if (groupBy === "status") {
        label = STATUS_LABELS[d.status] ?? d.status ?? "Utan status";
      } else {
        // deliverable
        label = d.deliverable_id
          ? deliverableLabels.get(d.deliverable_id) ?? "Okänd leverabel"
          : "Ingen leverabel";
      }
      const arr = map.get(label) ?? [];
      arr.push(d);
      map.set(label, arr);
    }
    const entries = [...map.entries()];
    if (groupBy === "status") {
      entries.sort(
        (a, b) =>
          (STATUS_ORDER[a[0]] ?? 99) - (STATUS_ORDER[b[0]] ?? 99) ||
          a[0].localeCompare(b[0], "sv"),
      );
    } else if (groupBy === "deliverable") {
      entries.sort((a, b) => {
        if (a[0] === "Ingen leverabel") return 1;
        if (b[0] === "Ingen leverabel") return -1;
        return a[0].localeCompare(b[0], "sv");
      });
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0], "sv"));
    }
    return entries;
  }, [filtered, groupBy, deliverableLabels]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !projectId) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(projectId, file, {
          phase: metaPhase || undefined,
          discipline: metaDiscipline || undefined,
          deliverable_id: metaDeliverable || null,
        });
      }
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Upload med pre-set deliverable_id (anropas från platshållare via
  // drag/drop eller "Ladda upp"-knapp). Mappar dokumentet till leverabel
  // automatiskt — användaren behöver inte välja i en dropdown.
  async function handleRowFiles(deliverableId: string, files: FileList | null) {
    if (!files?.length || !projectId) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(projectId, file, {
          deliverable_id: deliverableId,
        });
      }
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setUploading(false);
      if (rowFileRef.current) rowFileRef.current.value = "";
      rowTargetDeliverableRef.current = null;
    }
  }

  function triggerRowPicker(deliverableId: string) {
    rowTargetDeliverableRef.current = deliverableId;
    rowFileRef.current?.click();
  }

  async function handleNewVersion(files: FileList | null) {
    const doc = versionTargetRef.current;
    if (!doc || !files?.length) return;
    setUploading(true);
    setError(null);
    try {
      await uploadNewVersion(doc, files[0]);
      await refresh();
      if (versionsFor?.id === doc.id) openVersions({ ...doc });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setUploading(false);
      versionTargetRef.current = null;
      if (versionRef.current) versionRef.current.value = "";
    }
  }

  async function changeStatus(doc: GfDocument, status: GfDocStatus) {
    setDocs((cur) => cur.map((d) => (d.id === doc.id ? { ...d, status } : d)));
    try {
      await setStatus(doc.id, status);
    } catch (e) {
      setError(errMsg(e));
      refresh();
    }
  }

  function openPreview(doc: GfDocument) {
    setError(null);
    const idx = filtered.findIndex((d) => d.id === doc.id);
    if (idx < 0) return;
    setBrowsePreview({ siblings: filtered, index: idx });
  }

  async function download(doc: GfDocument) {
    try {
      const v = await currentVersionUrl(doc);
      if (v) window.open(v.url, "_blank");
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function openVersions(doc: GfDocument) {
    setVersionsFor(doc);
    setVersions([]);
    try {
      setVersions(await listVersions(doc.id));
    } catch (e) {
      setError(errMsg(e));
    }
  }

  // Soft-delete: skickar till papperskorgen, går att återställa.
  async function doSoftDelete(doc: GfDocument) {
    try {
      await softDeleteDocument(doc.id);
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function doRestore(doc: GfDocument) {
    try {
      await restoreDocument(doc.id);
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  // Hård radering — bara tillgänglig från papperskorgen.
  async function doPermanentDelete(doc: GfDocument) {
    try {
      await permanentlyDeleteDocument(doc.id);
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  function toggleGroup(k: string) {
    setOpenGroups((s) => {
      const next = new Set(s);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  if (!AUTH_ENABLED) {
    return (
      <Notice title={`Dokument — ${unitName}`}>
        Dokumentbiblioteket lagras i Supabase och kräver inloggning. Aktivera
        Supabase (riktig <code>NEXT_PUBLIC_SUPABASE_URL</code>) och logga in för att
        ladda upp och se handlingar. I förhandsvisningsläget är biblioteket avstängt.
      </Notice>
    );
  }

  if (!projectId) {
    return (
      <Notice title={`Dokument — ${unitName}`}>
        Enheten är inte aktiverad i Supabase än. Kör migrationerna så att enheten
        finns som rad i <code>gf_projects</code> — då kopplas dokumentbiblioteket på
        automatiskt.
      </Notice>
    );
  }

  const rootCls =
    variant === "block"
      ? "relative px-6 pb-8 pt-6"
      : "relative h-full overflow-y-auto px-6 py-6";

  const newVersion = (d: GfDocument) => {
    versionTargetRef.current = d;
    versionRef.current?.click();
  };

  return (
    <div
      className={rootCls}
      onDragOver={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Rubrik + vyväxlare */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Dokument</h1>
            <p className="text-ink-3 text-sm">{unitName}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasPlaceholders && !trashView && (
              <div className="flex items-center gap-1 rounded-md border border-border bg-panel p-0.5 text-[12.5px]">
                <button
                  type="button"
                  onClick={() => setPlaceholderMode(true)}
                  className={`rounded px-2.5 py-1 ${
                    placeholderMode
                      ? "bg-secondary font-medium text-ink"
                      : "text-ink-2 hover:text-ink"
                  }`}
                  title="Visa alla leverabler som platshållare med drag&drop"
                >
                  Platshållare
                </button>
                <button
                  type="button"
                  onClick={() => setPlaceholderMode(false)}
                  className={`rounded px-2.5 py-1 ${
                    !placeholderMode
                      ? "bg-secondary font-medium text-ink"
                      : "text-ink-2 hover:text-ink"
                  }`}
                  title="Visa bara uppladdade dokument"
                >
                  Alla uppladdade
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setTrashView((v) => !v)}
              className={`rounded-md border px-2.5 py-1 text-[12.5px] transition ${
                trashView
                  ? "border-amber-300 bg-amber-50 font-medium text-amber-900"
                  : "border-border bg-panel text-ink-2 hover:bg-secondary hover:text-ink"
              }`}
              title={trashView ? "Visa aktiva dokument" : "Visa papperskorg"}
            >
              {trashView ? "← Aktiva" : "Papperskorg"}
            </button>
            {!placeholderMode && (
              <div className="flex items-center gap-1 rounded-md border border-border bg-panel p-0.5 text-[13px]">
                {(["lista", "mappar"] as View[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded px-2.5 py-1 capitalize ${
                      view === v ? "bg-secondary font-medium text-ink" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {trashView && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            Papperskorg — dokument som mjuk-raderats ligger här. Återställ tillbaka till
            biblioteket eller radera permanent (Storage-filer tas bort).
          </div>
        )}

        {!canUpload && !trashView && (
          <div className="mt-3 rounded border border-border bg-secondary/40 px-3 py-2 text-[12.5px] text-ink-2">
            Du ser dokumenten som <strong>Besökare</strong>. För att ladda upp eller
            redigera krävs Ägare- eller Användarrättighet — kontakta en Ägare.
          </div>
        )}

        {/* Verktygsrad — gömd i papperskorg-läget OCH för besökare. */}
        {!trashView && canUpload && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-panel p-3">
          <label className="flex-1 min-w-[160px] text-[11px] font-medium text-ink-3">
            Sök
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="namn, disciplin, fas…"
              className="mt-0.5 block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <label className="text-[11px] font-medium text-ink-3">
            Fas (för uppladdning)
            <select
              value={metaPhase}
              onChange={(e) => setMetaPhase(e.target.value)}
              className="mt-0.5 block rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
            >
              <option value="">—</option>
              {PROJECT_PHASES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-medium text-ink-3">
            Disciplin
            {disciplines.length > 0 ? (
              <select
                value={metaDiscipline}
                onChange={(e) => setMetaDiscipline(e.target.value)}
                className="mt-0.5 block rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
              >
                <option value="">—</option>
                {disciplines.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} · {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={metaDiscipline}
                onChange={(e) => setMetaDiscipline(e.target.value)}
                placeholder="t.ex. Mark, Konstruktion"
                className="mt-0.5 block w-40 rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
              />
            )}
          </label>
          {deliverables.length > 0 && (
            <label className="text-[11px] font-medium text-ink-3">
              Leverabel
              <select
                value={metaDeliverable}
                onChange={(e) => setMetaDeliverable(e.target.value)}
                className="mt-0.5 block max-w-xs rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
              >
                <option value="">— (ingen)</option>
                {deliverables.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? "Laddar upp…" : "Ladda upp"}
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          {view === "mappar" && (
            <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5 text-[12px]">
              <span className="px-1.5 text-ink-3">Gruppera:</span>
              {(["discipline", "phase", "status", "deliverable"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`rounded px-2 py-0.5 ${
                    groupBy === g ? "bg-secondary font-medium text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Sök-fält även i papperskorg-läget (för att hitta mjuk-raderade dokument) */}
        {trashView && (
          <div className="mt-4 rounded-lg border border-border bg-panel p-3">
            <label className="block text-[11px] font-medium text-ink-3">
              Sök
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="namn, disciplin, fas…"
                className="mt-0.5 block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
              />
            </label>
          </div>
        )}

        {/* Klassificerings-filter — bara i aktivt läge */}
        {!trashView && (
          <div className="mt-3 flex flex-wrap items-end gap-2 text-[11.5px]">
            <label className="text-ink-3">
              Filtrera på teknikområde
              <select
                value={filterDiscipline}
                onChange={(e) => setFilterDiscipline(e.target.value)}
                className="ml-1 rounded-md border border-border bg-bg px-2 py-1 text-[12.5px] text-ink"
              >
                <option value="">— alla —</option>
                {DISCIPLINES.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} · {d.sv}
                  </option>
                ))}
              </select>
            </label>
            {filterDiscipline && (
              <button
                type="button"
                onClick={() => setFilterDiscipline("")}
                className="text-ink-3 underline-offset-2 hover:text-ink hover:underline"
              >
                Rensa filter
              </button>
            )}
            <span className="ml-auto text-ink-3">
              Visar {filtered.length} av {docs.length} dokument
            </span>
          </div>
        )}

        <input ref={versionRef} type="file" hidden onChange={(e) => handleNewVersion(e.target.files)} />
        <input
          ref={rowFileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const target = rowTargetDeliverableRef.current;
            if (target) handleRowFiles(target, e.target.files);
          }}
        />

        {error && (
          <div className="mt-3 rounded-md border border-danger bg-danger-bg px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        )}

        {/* Innehåll */}
        <div className="mt-4">
          {loading ? (
            <p className="text-ink-3 py-10 text-center text-sm">Laddar…</p>
          ) : placeholderMode && !trashView ? (
            <>
              {/* Gruppera-efter-knapprad */}
              <div className="mb-3 flex items-center gap-2 text-[12.5px]">
                <span className="text-ink-3">Gruppera efter:</span>
                {([
                  { key: "discipline" as GroupKey, label: "Teknikområde" },
                  { key: "phase" as GroupKey, label: "Fas" },
                  { key: "building" as GroupKey, label: "Huvuddel" },
                ]).map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGroupKey(g.key)}
                    className={`rounded-md px-3 py-1 text-[12.5px] transition ${
                      groupKey === g.key
                        ? "bg-ink text-white"
                        : "bg-panel text-ink-2 hover:bg-secondary"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <DocumentPlaceholderView
                deliverables={richDeliverables}
                phases={phases}
                documents={docs}
                groupBy={groupKey}
                canUpload={canUpload}
                canManage={canManage}
                onDropFiles={(deliverableId, files) =>
                  handleRowFiles(deliverableId, files)
                }
                onPickFiles={triggerRowPicker}
                uploading={uploading}
                onPreview={openPreview}
                onDownload={download}
                onEditDoc={canUpload ? setEditDoc : undefined}
                onDeleteDoc={canUpload ? setConfirmDelete : undefined}
                onEditDeliverable={canManage ? setEditDeliverable : undefined}
                onDeleteDeliverable={canManage ? setDeletingDeliverable : undefined}
              />
            </>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-12 text-center">
              <p className="text-ink-2 text-sm">Inga handlingar än.</p>
              <p className="text-ink-3 mt-1 text-[13px]">
                Dra filer hit eller klicka <strong>Ladda upp</strong>.
              </p>
            </div>
          ) : view === "lista" ? (
            <DocTable
              docs={filtered}
              onStatus={changeStatus}
              onPreview={openPreview}
              onDownload={download}
              onEdit={setEditDoc}
              onVersions={openVersions}
              onDelete={setConfirmDelete}
              trashView={trashView}
              onRestore={doRestore}
              disciplines={disciplines}
            />
          ) : (
            <div className="space-y-2">
              {groups.map(([label, items]) => {
                const open = openGroups.has(label) || !!search;
                return (
                  <div
                    key={label}
                    className="overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    <button
                      onClick={() => toggleGroup(label)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-secondary/40"
                    >
                      {open ? (
                        <FolderOpen size={16} className="text-amber-600" />
                      ) : (
                        <Folder size={16} className="text-amber-600" />
                      )}
                      <span className="text-[14px] font-medium text-ink">{label}</span>
                      <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 font-mono text-[10.5px] text-ink-3">
                        {items.length} fil{items.length === 1 ? "" : "er"}
                      </span>
                    </button>
                    {open && (
                      <DocTable
                        docs={items}
                        flush
                        onStatus={changeStatus}
                        onPreview={openPreview}
                        onDownload={download}
                        onEdit={setEditDoc}
                        onVersions={openVersions}
                        onDelete={setConfirmDelete}
                        trashView={trashView}
                        onRestore={doRestore}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-accent bg-accent-bg/60 text-[15px] font-medium text-accent">
          Släpp för att ladda upp
        </div>
      )}

      {preview && <PreviewOverlay preview={preview} onClose={() => setPreview(null)} />}
      {browsePreview && (
        <BrowsePreviewOverlay
          siblings={browsePreview.siblings}
          initialIndex={browsePreview.index}
          onClose={() => setBrowsePreview(null)}
          onError={setError}
        />
      )}

      {editDoc && (
        <EditMetaModal
          doc={editDoc}
          deliverables={deliverables}
          disciplines={disciplines}
          onClose={() => setEditDoc(null)}
          onSaved={(patch) => {
            setDocs((cur) => cur.map((d) => (d.id === editDoc.id ? { ...d, ...patch } : d)));
            setEditDoc(null);
          }}
          onError={setError}
        />
      )}

      {versionsFor && (
        <Modal title={`Versioner — ${versionsFor.name}`} onClose={() => setVersionsFor(null)}>
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => newVersion(versionsFor)}
              className="rounded-md border border-border px-2.5 py-1 text-[12px] hover:bg-secondary"
            >
              Ladda upp ny version
            </button>
          </div>
          {versions.length === 0 ? (
            <p className="text-ink-3 text-sm">Laddar…</p>
          ) : (
            <ul className="divide-y divide-border">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span>
                    <strong className="font-medium">v{v.version}</strong>
                    <span className="text-ink-3 ml-2">
                      {new Date(v.uploaded_at).toLocaleDateString("sv-SE")} · {formatSize(v.size)}
                    </span>
                  </span>
                  <button
                    onClick={async () => setPreview({ url: await signedUrl(v.storage_path), mime: v.mime, name: `${versionsFor.name} (v${v.version})` })}
                    className="rounded-md border border-border px-2 py-1 text-[12px] hover:bg-secondary"
                  >
                    Visa
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title={trashView ? "Radera permanent?" : "Skicka till papperskorgen?"}
          onClose={() => setConfirmDelete(null)}
        >
          <p className="text-ink-2 text-sm">
            {trashView ? (
              <>
                <strong>{confirmDelete.name}</strong> och alla dess versioner raderas
                permanent. Filer i Storage tas bort — detta går inte att ångra.
              </>
            ) : (
              <>
                <strong>{confirmDelete.name}</strong> flyttas till papperskorgen. Du kan
                återställa det därifrån när som helst.
              </>
            )}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-md border border-border px-3 py-1.5 text-[13px] hover:bg-secondary"
            >
              Avbryt
            </button>
            <button
              onClick={() =>
                trashView ? doPermanentDelete(confirmDelete) : doSoftDelete(confirmDelete)
              }
              className="rounded-md bg-danger px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
            >
              {trashView ? "Radera permanent" : "Skicka till papperskorgen"}
            </button>
          </div>
        </Modal>
      )}

      {/* Platshållare (leverabel) — redigera */}
      {editDeliverable && orgSlug && projectSlug && (
        <DeliverableFormModal
          initial={editDeliverable}
          phases={phases}
          disciplines={richDisciplines}
          existingCodes={richDeliverables
            .filter((d) => d.id !== editDeliverable.id)
            .map((d) => d.code)}
          pending={deliverablePending}
          onClose={() => setEditDeliverable(null)}
          onSave={async (data) => {
            setDeliverablePending(true);
            const res = await updateDeliverable(orgSlug, projectSlug, editDeliverable.id, data);
            setDeliverablePending(false);
            if (!res.ok) {
              setError(res.error);
            } else {
              setEditDeliverable(null);
              await refresh();
            }
          }}
        />
      )}

      {/* Platshållare — confirm radera */}
      {deletingDeliverable && orgSlug && projectSlug && (
        <Modal title="Radera platshållare?" onClose={() => setDeletingDeliverable(null)}>
          <p className="text-ink-2 text-sm">
            Platshållaren <strong>{deletingDeliverable.code} · {deletingDeliverable.name}</strong>{" "}
            tas bort. Eventuella kopplade dokument behålls men tappar koppling.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setDeletingDeliverable(null)}
              className="rounded-md border border-border px-3 py-1.5 text-[13px] hover:bg-secondary"
            >
              Avbryt
            </button>
            <button
              disabled={deliverablePending}
              onClick={async () => {
                setDeliverablePending(true);
                const res = await deleteDeliverable(
                  orgSlug,
                  projectSlug,
                  deletingDeliverable.id,
                );
                setDeliverablePending(false);
                if (!res.ok) {
                  setError(res.error);
                } else {
                  setDeletingDeliverable(null);
                  await refresh();
                }
              }}
              className="rounded-md bg-danger px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {deliverablePending ? "Raderar…" : "Radera platshållare"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

type Kind = "pdf" | "image" | "word" | "excel" | "other";

function fileKind(mime: string | null, name: string): Kind {
  const m = (mime ?? "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (m.includes("pdf") || ext === "pdf") return "pdf";
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "image";
  if (m.includes("wordprocessingml") || ext === "docx") return "word";
  if (m.includes("spreadsheetml") || m.includes("ms-excel") || ["xlsx", "xls", "csv"].includes(ext))
    return "excel";
  return "other";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function PreviewOverlay({ preview, onClose }: { preview: Preview; onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const kind = fileKind(preview.mime, preview.name);

  // Word/Excel renderas klient-sidan (inget innehåll lämnar miljön).
  const [officeHtml, setOfficeHtml] = useState<string | null>(null);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeErr, setOfficeErr] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "word" && kind !== "excel") return;
    let cancelled = false;
    setOfficeLoading(true);
    setOfficeErr(null);
    setOfficeHtml(null);
    (async () => {
      try {
        const res = await fetch(preview.url);
        if (!res.ok) throw new Error("Kunde inte hämta filen");
        const buf = await res.arrayBuffer();
        let html = "";
        if (kind === "word") {
          const mammoth: any = await import("mammoth/mammoth.browser");
          const out = await mammoth.convertToHtml({ arrayBuffer: buf });
          html = out.value || "<p><em>(tomt dokument)</em></p>";
        } else {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(buf, { type: "array" });
          html = wb.SheetNames.map(
            (n) => `<h3>${escapeHtml(n)}</h3>` + XLSX.utils.sheet_to_html(wb.Sheets[n]),
          ).join("");
        }
        if (!cancelled) setOfficeHtml(html);
      } catch (e) {
        if (!cancelled) setOfficeErr(errMsg(e));
      } finally {
        if (!cancelled) setOfficeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview.url, kind]);

  function fullscreen() {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-3 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-3 text-white">
        <span className="truncate text-sm font-medium">{preview.name}</span>
        <div className="flex shrink-0 items-center gap-1.5 text-[13px]">
          <button onClick={fullscreen} className="rounded-md bg-white/15 px-2.5 py-1 hover:bg-white/25">
            Helskärm
          </button>
          <a
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white/15 px-2.5 py-1 hover:bg-white/25"
          >
            Ladda ner
          </a>
          <button onClick={onClose} className="rounded-md bg-white/15 px-2.5 py-1 hover:bg-white/25">
            Stäng
          </button>
        </div>
      </div>
      <div ref={boxRef} className="relative flex-1 overflow-hidden rounded-lg bg-white">
        {kind === "pdf" ? (
          <iframe src={preview.url} title={preview.name} className="h-full w-full border-0" />
        ) : kind === "image" ? (
          <img src={preview.url} alt={preview.name} className="mx-auto h-full w-full object-contain" />
        ) : kind === "word" || kind === "excel" ? (
          officeLoading ? (
            <p className="flex h-full items-center justify-center text-sm text-ink-3">Renderar…</p>
          ) : officeErr ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-2">
              <p className="text-sm">Kunde inte förhandsvisa: {officeErr}</p>
              <a href={preview.url} target="_blank" rel="noreferrer" className="text-accent underline">
                Ladda ner i stället
              </a>
            </div>
          ) : (
            <div
              className="office-render h-full overflow-auto bg-white p-6 text-[13px] text-ink [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-medium [&_h2]:mt-3 [&_h2]:font-medium [&_h3]:mt-3 [&_h3]:font-medium [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:my-2 [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-secondary [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: officeHtml ?? "" }}
            />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-2">
            <p className="text-sm">Den här filtypen kan inte förhandsvisas i appen.</p>
            <a href={preview.url} target="_blank" rel="noreferrer" className="text-accent underline">
              Ladda ner i stället
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// Bläddringsbar preview-overlay. Tar emot en lista av dokument + startindex,
// fetchar URL för det aktuella, navigerar med prev/next-knappar + piltangenter.
function BrowsePreviewOverlay({
  siblings,
  initialIndex,
  onClose,
  onError,
}: {
  siblings: GfDocument[];
  initialIndex: number;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [current, setCurrent] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);

  // Word/Excel-rendering (samma mönster som PreviewOverlay)
  const [officeHtml, setOfficeHtml] = useState<string | null>(null);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeErr, setOfficeErr] = useState<string | null>(null);

  const doc = siblings[index];
  const kind = current ? fileKind(current.mime, current.name) : null;
  const last = siblings.length - 1;
  const hasPrev = index > 0;
  const hasNext = index < last;

  // Fetcha URL när index ändras
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOfficeHtml(null);
    setOfficeErr(null);
    (async () => {
      try {
        const v = await currentVersionUrl(doc);
        if (cancelled) return;
        if (v) setCurrent({ url: v.url, mime: v.mime, name: doc.name });
        else setCurrent(null);
      } catch (e) {
        if (!cancelled) onError(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, onError]);

  // Office-rendering när URL är klar
  useEffect(() => {
    if (!current || (kind !== "word" && kind !== "excel")) return;
    let cancelled = false;
    setOfficeLoading(true);
    setOfficeErr(null);
    setOfficeHtml(null);
    (async () => {
      try {
        const res = await fetch(current.url);
        if (!res.ok) throw new Error("Kunde inte hämta filen");
        const buf = await res.arrayBuffer();
        let html = "";
        if (kind === "word") {
          const mammoth: any = await import("mammoth/mammoth.browser");
          const out = await mammoth.convertToHtml({ arrayBuffer: buf });
          html = out.value || "<p><em>(tomt dokument)</em></p>";
        } else {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(buf, { type: "array" });
          html = wb.SheetNames.map(
            (n) => `<h3>${escapeHtml(n)}</h3>` + XLSX.utils.sheet_to_html(wb.Sheets[n]),
          ).join("");
        }
        if (!cancelled) setOfficeHtml(html);
      } catch (e) {
        if (!cancelled) setOfficeErr(errMsg(e));
      } finally {
        if (!cancelled) setOfficeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current, kind]);

  // Tangentbordsnavigering
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        setIndex((i) => i + 1);
      } else if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        setIndex((i) => i - 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onClose]);

  function fullscreen() {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-3 sm:p-5">
      <div className="mb-2 flex items-center gap-3 text-white">
        <button
          onClick={() => setIndex((i) => i - 1)}
          disabled={!hasPrev}
          aria-label="Föregående dokument"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setIndex((i) => i + 1)}
          disabled={!hasNext}
          aria-label="Nästa dokument"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{doc.name}</div>
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-white/60">
            {index + 1} / {siblings.length}
            {doc.discipline && <> · {doc.discipline}</>}
            {doc.phase && <> · {doc.phase}</>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[13px]">
          <button onClick={fullscreen} className="rounded-md bg-white/15 px-2.5 py-1 hover:bg-white/25">
            Helskärm
          </button>
          {current && (
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white/15 px-2.5 py-1 hover:bg-white/25"
            >
              Ladda ner
            </a>
          )}
          <button onClick={onClose} className="rounded-md bg-white/15 px-2.5 py-1 hover:bg-white/25">
            Stäng
          </button>
        </div>
      </div>
      <div ref={boxRef} className="relative flex-1 overflow-hidden rounded-lg bg-white">
        {loading ? (
          <p className="flex h-full items-center justify-center text-sm text-ink-3">Laddar…</p>
        ) : !current ? (
          <p className="flex h-full items-center justify-center text-sm text-ink-3">
            Ingen version att visa.
          </p>
        ) : kind === "pdf" ? (
          <iframe src={current.url} title={current.name} className="h-full w-full border-0" />
        ) : kind === "image" ? (
          <img
            src={current.url}
            alt={current.name}
            className="mx-auto h-full w-full object-contain"
          />
        ) : kind === "word" || kind === "excel" ? (
          officeLoading ? (
            <p className="flex h-full items-center justify-center text-sm text-ink-3">Renderar…</p>
          ) : officeErr ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-2">
              <p className="text-sm">Kunde inte förhandsvisa: {officeErr}</p>
              <a href={current.url} target="_blank" rel="noreferrer" className="text-accent underline">
                Ladda ner i stället
              </a>
            </div>
          ) : (
            <div
              className="office-render h-full overflow-auto bg-white p-6 text-[13px] text-ink [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-medium [&_h2]:mt-3 [&_h2]:font-medium [&_h3]:mt-3 [&_h3]:font-medium [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:my-2 [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-secondary [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: officeHtml ?? "" }}
            />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-2">
            <p className="text-sm">Den här filtypen kan inte förhandsvisas i appen.</p>
            <a href={current.url} target="_blank" rel="noreferrer" className="text-accent underline">
              Ladda ner i stället
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function EditMetaModal({
  doc,
  deliverables,
  disciplines,
  onClose,
  onSaved,
  onError,
}: {
  doc: GfDocument;
  deliverables: DeliverableOption[];
  disciplines: DisciplineOption[];
  onClose: () => void;
  onSaved: (patch: {
    name: string;
    phase: string | null;
    discipline: string | null;
    description: string | null;
    access_code: string | null;
    deliverable_id: string | null;
  }) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(doc.name);
  const [phase, setPhase] = useState(doc.phase ?? "");
  const [discipline, setDiscipline] = useState(doc.discipline ?? "");
  const [description, setDescription] = useState(doc.description ?? "");
  const [accessCode, setAccessCode] = useState(doc.access_code ?? "");
  const [deliverableId, setDeliverableId] = useState(doc.deliverable_id ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const patch = {
      name: name.trim() || doc.name,
      phase: phase || null,
      discipline: discipline.trim() || null,
      description: description.trim() || null,
      access_code: accessCode.trim() || null,
      deliverable_id: deliverableId || null,
    };
    try {
      await updateMeta(doc.id, patch);
      onSaved(patch);
    } catch (e) {
      onError(errMsg(e));
      setSaving(false);
    }
  }

  return (
    <Modal title="Redigera metadata" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-[11px] font-medium text-ink-3">
          Namn
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-0.5 block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
          />
        </label>
        <label className="block text-[11px] font-medium text-ink-3">
          Fas
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="mt-0.5 block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
          >
            <option value="">—</option>
            {PROJECT_PHASES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] font-medium text-ink-3">
          Disciplin
          {disciplines.length > 0 ? (
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="mt-0.5 block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
            >
              <option value="">— (ingen) —</option>
              {/* Visa nuvarande värde som option om det inte matchar (legacy fritext) */}
              {discipline && !disciplines.some((d) => d.code === discipline) && (
                <option value={discipline}>{discipline} (fritext)</option>
              )}
              {disciplines.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} · {d.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              placeholder="t.ex. Mark, Konstruktion"
              className="mt-0.5 block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
            />
          )}
        </label>
        <label className="block text-[11px] font-medium text-ink-3">
          Beskrivning
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Fri text — vad innehåller dokumentet, status, mottagare"
            className="mt-0.5 block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
          />
        </label>
        <div>
          <div className="text-[11px] font-medium text-ink-3">
            Klassificeringskod
          </div>
          <div className="mt-0.5">
            <AccessCodeBuilder value={accessCode} onChange={setAccessCode} />
          </div>
        </div>
        {deliverables.length > 0 && (
          <label className="block text-[11px] font-medium text-ink-3">
            Leverabel
            <select
              value={deliverableId}
              onChange={(e) => setDeliverableId(e.target.value)}
              className="mt-0.5 block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
            >
              <option value="">— (ingen koppling)</option>
              {deliverables.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} · {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-[13px] hover:bg-secondary">
          Avbryt
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Sparar…" : "Spara"}
        </button>
      </div>
    </Modal>
  );
}

function DocTable({
  docs,
  flush = false,
  onStatus,
  onPreview,
  onDownload,
  onEdit,
  onVersions,
  onDelete,
  trashView = false,
  onRestore,
  disciplines = [],
}: {
  docs: GfDocument[];
  flush?: boolean;
  onStatus: (d: GfDocument, s: GfDocStatus) => void;
  onPreview: (d: GfDocument) => void;
  onDownload: (d: GfDocument) => void;
  onEdit: (d: GfDocument) => void;
  onVersions: (d: GfDocument) => void;
  onDelete: (d: GfDocument) => void;
  trashView?: boolean;
  onRestore?: (d: GfDocument) => void;
  // För att rendera färgad badge när dokumentets discipline-värde matchar en
  // projekt-discipline. Legacy fritext-värden visas oförändrat.
  disciplines?: DisciplineOption[];
}) {
  const discByCode = new Map(disciplines.map((d) => [d.code, d]));
  return (
    <div className={flush ? "" : "overflow-hidden rounded-lg border border-border"}>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-ink-3">
            <th className="px-3 py-2 font-medium">Namn</th>
            <th className="px-3 py-2 font-medium">Fas</th>
            <th className="px-3 py-2 font-medium">Disciplin</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Ver.</th>
            <th className="px-3 py-2 font-medium">Ändrad</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
              <td className="max-w-[280px] px-3 py-2 font-medium text-ink">
                <button
                  onClick={() => onPreview(d)}
                  className="block max-w-full truncate hover:text-accent hover:underline"
                  title="Förhandsgranska"
                >
                  {d.name}
                </button>
                {d.access_code && (
                  <div className="mt-0.5">
                    <DocumentAccessBadge code={d.access_code} />
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-ink-2">{d.phase ? phaseLabel(d.phase as never) : "–"}</td>
              <td className="px-3 py-2 text-ink-2">
                {(() => {
                  if (!d.discipline) return "–";
                  const match = discByCode.get(d.discipline);
                  if (!match) return d.discipline;
                  return (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-flex h-4 items-center rounded px-1 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-white"
                        style={{ background: match.color ?? "#64748b" }}
                      >
                        {match.code}
                      </span>
                      <span>{match.name}</span>
                    </span>
                  );
                })()}
              </td>
              <td className="px-3 py-2">
                <select
                  value={d.status}
                  onChange={(e) => onStatus(d, e.target.value as GfDocStatus)}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    DOC_STATUS.find((s) => s.id === d.status)?.cls ?? ""
                  }`}
                >
                  {DOC_STATUS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 text-ink-2">v{d.current_version}</td>
              <td className="px-3 py-2 text-ink-3">{new Date(d.updated_at).toLocaleDateString("sv-SE")}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <Action onClick={() => onPreview(d)}>Visa</Action>
                <Action onClick={() => onDownload(d)}>Ladda ner</Action>
                {!trashView && <Action onClick={() => onEdit(d)}>Redigera</Action>}
                <Action onClick={() => onVersions(d)}>Versioner</Action>
                {trashView && onRestore ? (
                  <>
                    <Action onClick={() => onRestore(d)}>Återställ</Action>
                    <Action onClick={() => onDelete(d)} danger>
                      Radera permanent
                    </Action>
                  </>
                ) : (
                  <Action onClick={() => onDelete(d)} danger>
                    Ta bort
                  </Action>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Action({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`ml-1 rounded px-1.5 py-1 text-[12px] hover:bg-secondary ${
        danger ? "text-danger" : "text-ink-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-panel p-6">
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="text-ink-2 mt-2 text-sm">{children}</p>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-[61] w-full max-w-md rounded-lg border border-border bg-panel p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-medium">{title}</h2>
          <button onClick={onClose} className="text-ink-3 hover:text-ink">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Något gick fel.";
}
