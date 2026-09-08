"use client";

// Platshållare-vy för dokumentportalen. Alla pm_deliverables visas grupperade
// per Teknikområde / Fas / Huvuddel. Folder-headers, leverabel-rader med
// meta-pillar och kollapsbara dokumentlistor — design enligt mockup
// (2026-06-03). Drag&drop på en leverabel-rad laddar upp med deliverable_id
// pre-set så filen hamnar rätt.

import { Fragment, useMemo, useState } from "react";
import {
  Upload,
  Folder,
  FolderOpen,
  FileText,
  CheckCircle2,
  Pencil,
  Eye,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  currentVersionUrl,
  formatSize,
  DOC_STATUS,
  type GfDocument,
} from "@/lib/documents";
import type { PmDeliverableWithJoins, PmPhase } from "@/lib/db/deliverables";

export type GroupKey = "discipline" | "phase" | "building";

interface Props {
  deliverables: PmDeliverableWithJoins[];
  phases: PmPhase[];
  documents: GfDocument[];
  groupBy: GroupKey;
  // Owner/User → true, Visitor → false. Drag&drop + Upload-knapp gating:as.
  canUpload?: boolean;
  // Endast Ägare. Visar Pencil + Trash på platshållarens header.
  canManage?: boolean;
  onDropFiles: (deliverableId: string, files: FileList) => void;
  onPickFiles: (deliverableId: string) => void;
  uploading: boolean;
  onPreview: (doc: GfDocument) => void;
  onDownload?: (doc: GfDocument) => void;
  onEditDoc?: (doc: GfDocument) => void;
  onDeleteDoc?: (doc: GfDocument) => void;
  // Platshållare (leverabel) — redigera/radera. Bara aktiv när canManage.
  onEditDeliverable?: (d: PmDeliverableWithJoins) => void;
  onDeleteDeliverable?: (d: PmDeliverableWithJoins) => void;
}

const DEL_STATUS_TONE: Record<string, { bg: string; color: string }> = {
  klar: { bg: "#dcfce7", color: "#166534" },
  pagaende: { bg: "#fef3c7", color: "#92400e" },
  granskning: { bg: "#dbeafe", color: "#1e40af" },
  "ej-paborjad": { bg: "#f1f5f9", color: "#64748b" },
};

export default function DocumentPlaceholderView({
  deliverables,
  phases,
  documents,
  groupBy,
  canUpload = true,
  canManage = false,
  onDropFiles,
  onPickFiles,
  uploading,
  onPreview,
  onDownload,
  onEditDoc,
  onDeleteDoc,
  onEditDeliverable,
  onDeleteDeliverable,
}: Props) {
  // Mappa deliverable_id → dokument[]
  const docsByDel = useMemo(() => {
    const m = new Map<string, GfDocument[]>();
    for (const d of documents) {
      if (!d.deliverable_id) continue;
      const arr = m.get(d.deliverable_id) ?? [];
      arr.push(d);
      m.set(d.deliverable_id, arr);
    }
    return m;
  }, [documents]);

  const phasesById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases]);

  // Gruppera baserat på groupBy
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: PmDeliverableWithJoins[] }>();
    for (const d of deliverables) {
      let key: string;
      let label: string;
      if (groupBy === "discipline") {
        if (d.discipline) {
          key = d.discipline.code;
          label = `${d.discipline.name} (${d.discipline.code})`;
        } else {
          key = "__none__";
          label = "Ej kategoriserad";
        }
      } else if (groupBy === "phase") {
        const phase = d.phase_id ? phasesById.get(d.phase_id) : null;
        if (phase) {
          key = `phase:${phase.stage}`;
          label = `Fas ${phase.stage} · ${phase.name}`;
        } else {
          key = "__none__";
          label = "Utan fas";
        }
      } else {
        if (d.building && d.building.trim()) {
          key = d.building;
          label = d.building;
        } else {
          key = "__none__";
          label = "Utan huvuddel";
        }
      }
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(d);
    }
    // Sortera grupper: ej-kategoriserade sist, annars alfabetiskt
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "__none__") return 1;
      if (b[0] === "__none__") return -1;
      return a[1].label.localeCompare(b[1].label, "sv");
    });
  }, [deliverables, groupBy, phasesById]);

  // Open-state per grupp (default: alla öppna)
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.map(([k]) => k)));
  function toggleGroup(k: string) {
    setOpen((s) => {
      const next = new Set(s);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {groups.map(([key, { label, items }]) => {
        const isOpen = open.has(key);
        const totalFiles = items.reduce(
          (n, d) => n + (docsByDel.get(d.id)?.length ?? 0),
          0,
        );
        const filledCount = items.filter(
          (d) => (docsByDel.get(d.id)?.length ?? 0) > 0,
        ).length;
        return (
          <Fragment key={key}>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <button
                type="button"
                onClick={() => toggleGroup(key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-secondary/40"
              >
                {isOpen ? (
                  <FolderOpen size={16} className="text-amber-600" />
                ) : (
                  <Folder size={16} className="text-amber-600" />
                )}
                <span className="text-[14px] font-medium text-ink">{label}</span>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 font-mono text-[10.5px] text-ink-3">
                  {filledCount}/{items.length} leverabler
                  {totalFiles > 0 && ` · ${totalFiles} fil${totalFiles === 1 ? "" : "er"}`}
                </span>
              </button>

              {isOpen && (
                <ul>
                  {items.map((del) => (
                    <DeliverableRow
                      key={del.id}
                      deliverable={del}
                      documents={docsByDel.get(del.id) ?? []}
                      phase={
                        del.phase_id ? phasesById.get(del.phase_id) ?? null : null
                      }
                      canUpload={canUpload}
                      canManage={canManage}
                      onDropFiles={onDropFiles}
                      onPickFiles={onPickFiles}
                      uploading={uploading}
                      onPreview={onPreview}
                      onDownload={onDownload}
                      onEditDoc={onEditDoc}
                      onDeleteDoc={onDeleteDoc}
                      onEditDeliverable={onEditDeliverable}
                      onDeleteDeliverable={onDeleteDeliverable}
                    />
                  ))}
                </ul>
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

// =============================================================================
// Deliverable row
// =============================================================================

function DeliverableRow({
  deliverable: del,
  documents,
  phase,
  canUpload,
  canManage,
  onDropFiles,
  onPickFiles,
  uploading,
  onPreview,
  onDownload,
  onEditDoc,
  onDeleteDoc,
  onEditDeliverable,
  onDeleteDeliverable,
}: {
  deliverable: PmDeliverableWithJoins;
  documents: GfDocument[];
  phase: PmPhase | null;
  canUpload: boolean;
  canManage: boolean;
  onDropFiles: Props["onDropFiles"];
  onPickFiles: Props["onPickFiles"];
  uploading: boolean;
  onPreview: Props["onPreview"];
  onDownload?: Props["onDownload"];
  onEditDoc?: Props["onEditDoc"];
  onDeleteDoc?: Props["onDeleteDoc"];
  onEditDeliverable?: Props["onEditDeliverable"];
  onDeleteDeliverable?: Props["onDeleteDeliverable"];
}) {
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(documents.length > 0);
  const hasDocs = documents.length > 0;
  const tone = DEL_STATUS_TONE[del.status] ?? DEL_STATUS_TONE["ej-paborjad"];

  return (
    <li
      className={`border-t border-border ${hover ? "bg-accent/5 ring-1 ring-inset ring-accent" : ""}`}
      onDragEnter={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        e.stopPropagation();
        setHover(true);
      }}
      onDragOver={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        e.stopPropagation();
        if (!hover) setHover(true);
      }}
      onDragLeave={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        e.stopPropagation();
        setHover(false);
      }}
      onDrop={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        e.stopPropagation();
        setHover(false);
        if (e.dataTransfer.files.length) {
          onDropFiles(del.id, e.dataTransfer.files);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Fäll ihop" : "Expandera"}
          className="flex h-4 w-4 items-center justify-center text-ink-3 hover:text-ink"
        >
          {hasDocs ? (
            expanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <span className="block h-1 w-1 rounded-full bg-ink-3 opacity-50" />
          )}
        </button>
        <FileText
          size={14}
          className={hasDocs ? "text-emerald-600" : "text-ink-3/60"}
        />
        <span
          className={`font-mono text-[10.5px] ${
            hasDocs ? "text-ink-3" : "text-ink-3/60"
          }`}
        >
          {del.code}
        </span>
        <span
          className={`flex-1 truncate text-[13px] ${
            hasDocs ? "font-medium text-ink" : "font-normal text-ink-3"
          }`}
        >
          {del.name}
        </span>

        {/* Meta-pillar — något nedtonade när leverabeln är tom */}
        <span className={hasDocs ? "" : "opacity-60"}>
          {phase && (
            <Pill bg="#f1f5f9" color="#475569" mono>
              Fas {phase.stage}
            </Pill>
          )}
        </span>
        {del.responsible && (
          <span className={hasDocs ? "" : "opacity-60"}>
            <Pill bg="#dbeafe" color="#1e40af">
              {del.responsible}
            </Pill>
          </span>
        )}
        <Pill bg={tone.bg} color={tone.color} mono>
          {documents.length} fil{documents.length === 1 ? "" : "er"}
        </Pill>

        {/* Actions: upload (user|owner), edit/delete platshållare (owner) */}
        {canUpload && (
          <IconButton
            title="Ladda upp dokument"
            onClick={() => onPickFiles(del.id)}
            disabled={uploading}
          >
            <Upload size={12} />
          </IconButton>
        )}
        {canManage && onEditDeliverable && (
          <IconButton
            title="Redigera platshållare"
            onClick={() => onEditDeliverable(del)}
          >
            <Pencil size={12} />
          </IconButton>
        )}
        {canManage && onDeleteDeliverable && (
          <IconButton
            title="Radera platshållare"
            onClick={() => onDeleteDeliverable(del)}
            danger
          >
            <Trash2 size={12} />
          </IconButton>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div className="bg-secondary/20 px-3 py-1.5">
          {hasDocs ? (
            <ul>
              {documents.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onEditDoc={onEditDoc}
                  onDeleteDoc={onDeleteDoc}
                />
              ))}
            </ul>
          ) : (
            <DropZone canUpload={canUpload} />
          )}
        </div>
      )}
    </li>
  );
}

// =============================================================================
// Doc row (under deliverable)
// =============================================================================

function DocRow({
  doc,
  onPreview,
  onDownload,
  onEditDoc,
  onDeleteDoc,
}: {
  doc: GfDocument;
  onPreview: Props["onPreview"];
  onDownload?: Props["onDownload"];
  onEditDoc?: Props["onEditDoc"];
  onDeleteDoc?: Props["onDeleteDoc"];
}) {
  const status = DOC_STATUS.find((s) => s.id === doc.status);
  const updated = doc.updated_at
    ? new Date(doc.updated_at).toLocaleDateString("sv-SE")
    : null;

  return (
    <li className="group flex items-center gap-2 rounded px-1.5 py-1 text-[12px] transition hover:bg-surface">
      <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
      <button
        type="button"
        onClick={() => onPreview(doc)}
        className="truncate text-left text-ink hover:underline"
      >
        {doc.name}
      </button>
      {onEditDoc && (
        <IconButton
          title="Redigera metadata"
          onClick={() => onEditDoc(doc)}
          className="opacity-0 group-hover:opacity-100"
        >
          <Pencil size={11} />
        </IconButton>
      )}
      {status && (
        <span
          className={`shrink-0 rounded px-1.5 py-px text-[9.5px] font-medium ${status.cls}`}
        >
          {status.label}
        </span>
      )}
      <span className="shrink-0 text-[10.5px] text-ink-3">
        v{doc.current_version}
        {updated && ` · ${updated}`}
      </span>
      <span className="ml-auto flex items-center gap-0.5">
        <IconButton title="Förhandsgranska" onClick={() => onPreview(doc)}>
          <Eye size={12} />
        </IconButton>
        {onDownload && (
          <IconButton title="Ladda ner" onClick={() => onDownload(doc)}>
            <Download size={12} />
          </IconButton>
        )}
        {onDeleteDoc && (
          <IconButton
            title="Skicka till papperskorgen"
            onClick={() => onDeleteDoc(doc)}
            danger
          >
            <Trash2 size={12} />
          </IconButton>
        )}
      </span>
      {doc.description && (
        <span className="ml-2 max-w-[28ch] truncate text-[11px] italic text-ink-3">
          {doc.description}
        </span>
      )}
    </li>
  );
}

// =============================================================================
// Building blocks
// =============================================================================

function DropZone({ canUpload = true }: { canUpload?: boolean }) {
  if (!canUpload) {
    return (
      <div className="rounded border border-dashed border-border bg-bg/40 px-2 py-1 text-center text-[11px] italic text-ink-3">
        Inga dokument uppladdade
      </div>
    );
  }
  return (
    <div className="rounded border border-dashed border-border bg-bg/40 px-2 py-1 text-center text-[11px] text-ink-3">
      <Upload size={11} className="mr-1 inline opacity-50" />
      Dra fil hit för att fylla platshållaren
    </div>
  );
}

function Pill({
  children,
  bg,
  color,
  mono,
}: {
  children: React.ReactNode;
  bg: string;
  color: string;
  mono?: boolean;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        mono ? "font-mono" : ""
      }`}
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}

function IconButton({
  children,
  title,
  onClick,
  disabled,
  danger,
  className = "",
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition disabled:opacity-40 ${
        danger
          ? "text-ink-3 hover:bg-red-50 hover:text-red-700"
          : "text-ink-3 hover:bg-secondary hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}
