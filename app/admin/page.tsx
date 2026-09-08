import { redirect } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { AUTH_ENABLED } from "@/lib/auth";
import { getAccessContext } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { customers } from "@/lib/data";
import { phaseLabel, PROJECT_STATUS_LABELS } from "@/lib/lifecycle";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  kind: string;
};

type ProjectRow = {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  phase: string;
  status: string;
};

export default async function AdminPage() {
  if (AUTH_ENABLED) {
    const ctx = await getAccessContext();
    if (!ctx) redirect("/login");
    if (!ctx.isPlatformAdmin) redirect("/");
  }

  let orgs: { id: string; name: string; slug: string; projectCount: number }[] = [];

  if (AUTH_ENABLED) {
    const supabase = await createClient();
    const [orgsRes, projectsRes] = await Promise.all([
      supabase.from("gf_organizations").select("id, name, slug, kind").order("name"),
      supabase.from("gf_projects").select("id, org_id, name, slug, phase, status"),
    ]);
    const dbOrgs = (orgsRes.data ?? []) as OrgRow[];
    const dbProjects = (projectsRes.data ?? []) as ProjectRow[];

    orgs = dbOrgs
      .filter((o) => o.slug)
      .map((o) => ({
        id: o.slug,
        name: o.name,
        slug: o.slug,
        projectCount: dbProjects.filter((p) => p.org_id === o.id).length,
      }));
  } else {
    orgs = customers.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.id,
      projectCount: c.units.length,
    }));
  }

  return (
    <AppShell showSignOut={AUTH_ENABLED}>
      <div className="h-full overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
            Part Plattform
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">
            Administration
          </h1>
          <p className="text-ink-2 mt-1 text-sm">
            Hantera bolag, projekt och användare.
          </p>

          <h2 className="mb-3 mt-9 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d6930]">
            Bolag
          </h2>

          {orgs.length === 0 ? (
            <p className="text-[13px] text-ink-3">Inga bolag ännu.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {orgs.map((org) => (
                <div
                  key={org.slug}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#f5e5d9] text-[12px] font-semibold text-[#8a3f20]">
                      {org.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-[14px] truncate">{org.name}</div>
                      <div className="text-[12px] text-ink-3">
                        {org.projectCount} projekt
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/c/${org.slug}`}
                      className="rounded border border-border px-3 py-1 text-[12px] text-ink-2 transition hover:border-border-strong hover:text-ink"
                    >
                      Öppna
                    </Link>
                    <Link
                      href={`/c/${org.slug}/admin`}
                      className="rounded border border-border px-3 py-1 text-[12px] text-ink-2 transition hover:border-border-strong hover:text-ink"
                    >
                      Hantera
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-[13px] text-ink-3">
              Skapa nytt bolag via Supabase admin eller kontakta systemadmin.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
