// Server: läser grounding-filerna i /Ground/ (finns inte i det här repot —
// funktionerna returnerar tomma listor tills katalogen finns) och parsar
// frontmatter. Används av operatörsytan (/intern/operator). Endast
// server-komponenter.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "Ground");

export interface GroundingFile {
  name: string; // filnamn (t.ex. ClientMJX.md)
  fileType: string; // file_type ur frontmatter
  version: string;
  lastUpdated: string;
  clientSlug?: string;
  unitSlug?: string;
  size: number; // bytes
  content: string;
}

function parseFrontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^([a-z_]+):\s*(.+)$/);
    if (mm) out[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function read(dir: string): GroundingFile[] {
  if (!existsSync(dir)) return [];
  const files: GroundingFile[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) continue;
    const content = readFileSync(full, "utf8");
    const fm = parseFrontmatter(content);
    files.push({
      name,
      fileType: fm.file_type ?? "—",
      version: fm.version ?? "—",
      lastUpdated: fm.last_updated ?? "—",
      clientSlug: fm.client_slug,
      unitSlug: fm.unit_slug,
      size: Buffer.byteLength(content, "utf8"),
      content,
    });
  }
  return files;
}

export function groundingFiles(): GroundingFile[] {
  const top = read(ROOT);
  const tmpl = read(join(ROOT, "templates")).map((f) => ({ ...f, name: `templates/${f.name}` }));
  return [...top, ...tmpl];
}

// Slå upp grounding-filer per OS-nivå för en enhet.
export function groundingFor(clientSlug: string, unitSlug: string) {
  const all = read(ROOT);
  return {
    platform: all.find((f) => f.fileType === "PlattformOS") ?? null,
    client: all.find((f) => f.fileType === "ClientOS" && f.clientSlug === clientSlug) ?? null,
    project:
      all.find(
        (f) => f.fileType === "ProjectOS" && f.clientSlug === clientSlug && f.unitSlug === unitSlug,
      ) ?? null,
    projectTask:
      all.find(
        (f) => f.fileType === "ProjectTask" && f.clientSlug === clientSlug && f.unitSlug === unitSlug,
      ) ?? null,
  };
}
