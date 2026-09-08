// Klient-overlay för importerade ProjectDoc (localStorage). Icke-destruktivt ovanpå
// fixturerna: en importerad enhet sparas här tills vidare. I Supabase-fasen ersätts
// detta av en riktig skrivning. SSR-säkert (no-op när window saknas).

import { migrateToLatest } from "@/lib/schema/migrate";
import type { ProjectDoc } from "@/lib/schema/project-doc";

const PREFIX = "gf-projectdoc-";

export function overlayKey(org: string, unit: string): string {
  return `${PREFIX}${org}/${unit}`;
}

export function writeOverlay(doc: ProjectDoc): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(overlayKey(doc.identity.org, doc.identity.unit), JSON.stringify(doc));
}

export function readOverlay(org: string, unit: string): ProjectDoc | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(overlayKey(org, unit));
  if (!raw) return null;
  try {
    const res = migrateToLatest(JSON.parse(raw));
    return res.ok ? res.doc : null;
  } catch {
    return null;
  }
}

export function clearOverlay(org: string, unit: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(overlayKey(org, unit));
}

// Lista enheter som har en lokal overlay ("org/unit").
export function listOverlays(): string[] {
  if (typeof window === "undefined") return [];
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
  }
  return out;
}
