import { notFound } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/auth";
import { getAccessContext } from "@/lib/auth/access";

// Kund-yta gate. AUTH_ENABLED + icke-admin: kunden måste finnas i
// accessibleOrgSlugs. Annars 404 (RLS skyddar data, men UX blir
// tydligare än en tom sida).
//
// Plattformsadmin släpps igenom till alla kunder. Prototype-läge
// (AUTH_ENABLED=false) släpper också igenom så att fixture-pathen
// fortsätter fungera på Vercel utan Supabase.
export default async function CustomerScope({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  if (!AUTH_ENABLED) return <>{children}</>;

  const { org } = await params;
  const ctx = await getAccessContext();
  if (!ctx) notFound();
  if (ctx.isPlatformAdmin) return <>{children}</>;
  if (!ctx.accessibleOrgSlugs.includes(org)) notFound();

  return <>{children}</>;
}
