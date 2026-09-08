import type { AmaCode, MfRow, TbEntry } from "@/lib/types";

// En sammansatt nod = AMA-kod + projektets TB/MF för just den koden.
// Speglar prototypens DATA.nodes-struktur men byggd ur normaliserade tabeller.
export interface TreeNode {
  code: string;
  title: string;
  parent: string | null;
  children: string[];
  tb: string | null;
  mf: MfRow[];
}

export type NodeMap = Record<string, TreeNode>;

export function buildNodeMap(
  codes: AmaCode[],
  tb: TbEntry[],
  mf: MfRow[],
): NodeMap {
  const map: NodeMap = {};
  for (const c of codes) {
    map[c.code] = {
      code: c.code,
      title: c.title,
      parent: c.parent_code,
      children: [],
      tb: null,
      mf: [],
    };
  }
  // Sortera barn under respektive förälder enligt sort/kod.
  const sorted = [...codes].sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code));
  for (const c of sorted) {
    if (c.parent_code && map[c.parent_code]) map[c.parent_code].children.push(c.code);
  }
  for (const t of tb) if (map[t.ama_code]) map[t.ama_code].tb = t.text;
  for (const r of [...mf].sort((a, b) => a.sort - b.sort)) {
    if (map[r.ama_code]) map[r.ama_code].mf.push(r);
  }
  return map;
}

export function roots(map: NodeMap): string[] {
  return Object.values(map)
    .filter((n) => n.parent === null)
    .map((n) => n.code)
    .sort((a, b) => a.localeCompare(b));
}

// Ärvda TB: vandra uppåt via parent och samla icke-tomma TB-paragrafer.
export function getInherited(
  map: NodeMap,
  code: string,
): { code: string; title: string; text: string }[] {
  const result: { code: string; title: string; text: string }[] = [];
  let p = map[code]?.parent ?? null;
  while (p) {
    const n = map[p];
    if (n?.tb?.trim()) result.push({ code: p, title: n.title, text: n.tb });
    p = n?.parent ?? null;
  }
  return result;
}

export function getDescendants(map: NodeMap, code: string): string[] {
  const out: string[] = [];
  const walk = (c: string) => {
    for (const ch of map[c]?.children ?? []) {
      out.push(ch);
      walk(ch);
    }
  };
  walk(code);
  return out;
}

export function getBreadcrumb(map: NodeMap, code: string): string[] {
  const chain: string[] = [];
  let c: string | null = code;
  while (c) {
    chain.unshift(c);
    c = map[c]?.parent ?? null;
  }
  return chain;
}

const nf = new Intl.NumberFormat("sv-SE");

export function formatAmount(n: number): string {
  return nf.format(Math.round(n)) + " kr";
}

export function formatPrice(n: number): string {
  return nf.format(Math.round(n * 100) / 100);
}

export function formatQty(n: number): string {
  return nf.format(n);
}
