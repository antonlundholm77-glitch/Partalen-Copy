import { type NextRequest, NextResponse } from "next/server";
import { getProjectDoc } from "@/lib/data";

// Export-källa för ProjectDoc — assemblar server-side så den tunga AMA-fixturen
// inte hamnar i klientbundlen. GET /api/project-doc?org=<slug>&unit=<slug>
export function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get("org");
  const unit = req.nextUrl.searchParams.get("unit");
  if (!org || !unit) {
    return NextResponse.json({ error: "org och unit krävs" }, { status: 400 });
  }
  const doc = getProjectDoc(org, unit);
  if (!doc) {
    return NextResponse.json({ error: "okänd enhet" }, { status: 404 });
  }
  return NextResponse.json(doc);
}
