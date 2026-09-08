"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

interface ImportResult {
  ok: boolean;
  message: string;
}

export default function ScheduleImportExportBar({
  org,
  id,
}: {
  org: string;
  id: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const exportHref = `/c/${encodeURIComponent(org)}/${encodeURIComponent(id)}/tidplan-v2/export`;

  async function onImport(file: File) {
    setImporting(true);
    setResult(null);
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        setResult({ ok: false, message: "Filen är inte giltig JSON." });
        return;
      }
      const res = await fetch(
        `/c/${encodeURIComponent(org)}/${encodeURIComponent(id)}/tidplan-v2/import`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(json),
        },
      );
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const issues = [
          ...((data.schemaIssues as Array<{ path: string; message: string }>) ?? []),
          ...((data.crossFieldIssues as Array<{ path: string; message: string }>) ?? []),
        ];
        const detail = issues.length
          ? issues.slice(0, 3).map((i) => `${i.path}: ${i.message}`).join(" · ")
          : (data.error as string) ?? "Okänt fel";
        setResult({ ok: false, message: `Import misslyckades — ${detail}` });
        return;
      }
      setResult({
        ok: true,
        message: `Importerat: ${data.tasksInserted} tasks, ${data.dependenciesInserted} beroenden. Ladda om sidan för att se nya tidplanen.`,
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-surface-1 px-4 py-2">
      <a
        href={exportHref}
        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary"
        title="Ladda ner ScheduleEnvelope-JSON"
      >
        <Download size={13} /> Exportera (JSON)
      </a>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] hover:bg-secondary disabled:opacity-40"
        title="Skapar en ny tidplan från JSON enligt schema.ts"
      >
        <Upload size={13} /> {importing ? "Importerar…" : "Importera (JSON)"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
        }}
      />
      {result && (
        <span
          className={`text-[12px] ${
            result.ok ? "text-success-text" : "text-danger"
          }`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
