// Export/import av ProjectDoc som JSON (och zip). Export skriver alltid aktuell
// schemaVersion; import går via migrateToLatest (forward-migrering + zod-validering).

import { saveBlob } from "@/lib/io/save-blob";
import { migrateToLatest, type ParseResult } from "@/lib/schema/migrate";
import type { ProjectDoc } from "@/lib/schema/project-doc";

export function projectDocBasename(doc: ProjectDoc): string {
  return `project-${doc.identity.org}-${doc.identity.unit}-v${doc.schemaVersion}`;
}

export function serializeProjectDoc(doc: ProjectDoc): string {
  return JSON.stringify(doc, null, 2);
}

// Ladda ner en enhet som .json.
export function exportProjectDocJson(doc: ProjectDoc): void {
  const blob = new Blob([serializeProjectDoc(doc)], { type: "application/json" });
  saveBlob(blob, `${projectDocBasename(doc)}.json`);
}

// Ladda ner som .zip (project-doc.json + README). jszip laddas dynamiskt.
export async function exportProjectDocZip(doc: ProjectDoc): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("project-doc.json", serializeProjectDoc(doc));
  zip.file(
    "README.txt",
    [
      `Part Plattform — projektexport`,
      `Enhet: ${doc.identity.org}/${doc.identity.unit} (${doc.metadata.name})`,
      `schemaVersion: ${doc.schemaVersion}`,
      ``,
      `project-doc.json följer det gemensamma ProjectDoc-schemat (lib/schema/project-doc.ts).`,
      `Binära dokument (ritningar/filer) ingår INTE — de bor i dokumentbiblioteket.`,
    ].join("\n"),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, `${projectDocBasename(doc)}.zip`);
}

// Parsa + validera inkommande JSON-text. ok=false ger läsbara fel.
export function parseProjectDoc(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Ogiltig JSON: ${(e as Error).message}`] };
  }
  return migrateToLatest(raw);
}
