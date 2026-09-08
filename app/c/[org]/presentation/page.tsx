import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import PartalenDeck from "@/components/slides/PartalenDeck";
import { getCustomer } from "@/lib/data";
import { AUTH_ENABLED } from "@/lib/auth";

// Säljpresentation per portal-kund. URL: /c/<org>/presentation. Kunden
// väljer vilket deck som ska renderas — fler decks läggs till i samma
// mapp och kopplas via slug här.

export default async function Page({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const customer = getCustomer(org);
  if (!customer) notFound();

  const deck = pickDeck(org);

  return (
    <AppShell currentCustomerId={org} showSignOut={AUTH_ENABLED}>
      <div className="h-full overflow-hidden">{deck}</div>
    </AppShell>
  );
}

function pickDeck(orgSlug: string) {
  switch (orgSlug) {
    case "part-group":
    default:
      return <PartalenDeck />;
  }
}
