import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Tar emot en hand-over, validerar och sparar till Ground/handovers/.
// Skriver till arbetsträdet — fungerar lokalt (dev); på read-only FS (Vercel)
// returneras ett tydligt fel. Plattform-steward läser och uppdaterar OS-filer.
export async function POST(req: Request) {
  let content = "";
  try {
    ({ content } = await req.json());
  } catch {
    return NextResponse.json({ error: "Ogiltig request-body." }, { status: 400 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Tomt innehåll." }, { status: 400 });
  }

  // Validera frontmatter (file_type: Handover) + giltigt JSON-block.
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm || !/file_type:\s*Handover/i.test(fm[1])) {
    return NextResponse.json({ error: "Frontmatter saknar file_type: Handover." }, { status: 422 });
  }
  const json = content.match(/```json\s*([\s\S]*?)```/);
  if (!json) {
    return NextResponse.json({ error: "Saknar json-block." }, { status: 422 });
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json[1]);
  } catch {
    return NextResponse.json({ error: "JSON-blocket är inte giltig JSON." }, { status: 422 });
  }

  // Filnamn: <datum>_handover_<initialer>_<projekt-slug>.md (ur JSON om möjligt).
  const date = String(parsed.date ?? new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
  const op = String(parsed.operator ?? "xx").replace(/[^a-zA-ZåäöÅÄÖ]/g, "").slice(0, 4) || "xx";
  const unit = String(parsed.unit_slug ?? "okant").replace(/[^a-z0-9-]/gi, "");
  const fname = `${date}_handover_${op}_${unit}.md`;

  try {
    const dir = join(process.cwd(), "Ground", "handovers");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, fname), content, { encoding: "utf8", flag: "wx" });
  } catch (e) {
    const ro = e instanceof Error && /EROFS|EACCES|EEXIST/.test(e.message);
    return NextResponse.json(
      {
        error: ro
          ? "Kunde inte skriva (read-only miljö eller filen finns redan). Spara hand-overn manuellt i Ground/handovers/."
          : "Kunde inte spara hand-overn.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ path: `Ground/handovers/${fname}` });
}
