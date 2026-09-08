import { redirect } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { AUTH_ENABLED } from "@/lib/auth";
import { getAccessContext } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { customers } from "@/lib/data";

type OrgRow = { id: string; name: string; slug: string; kind: string };
type ProjectRow = { id: string; org_id: string; name: string; phase: string; status: string };
type MembershipRow = { org_id: string; user_id: string };

export default async function BolagPage() {
  if (AUTH_ENABLED) {
    const ctx = await getAccessContext();
    if (!ctx) redirect("/login");
    if (!ctx.isPlatformAdmin) redirect("/");
  }

  type OrgItem = {
    id: string;
    name: string;
    slug: string;
    projects: { name: string; phase: string; status: string }[];
    memberCount: number;
  };

  let orgs: OrgItem[] = [];

  if (AUTH_ENABLED) {
    const supabase = await createClient();
    const [orgsRes, projectsRes, membershipsRes] = await Promise.all([
      supabase.from("gf_organizations").select("id, name, slug, kind").order("name"),
      supabase.from("gf_projects").select("id, org_id, name, phase, status"),
      supabase.from("gf_memberships").select("org_id, user_id"),
    ]);
    const dbOrgs = (orgsRes.data ?? []) as OrgRow[];
    const dbProjects = (projectsRes.data ?? []) as ProjectRow[];
    const dbMemberships = (membershipsRes.data ?? []) as MembershipRow[];

    orgs = dbOrgs
      .filter((o) => o.slug)
      .map((o) => ({
        id: o.slug,
        name: o.name,
        slug: o.slug,
        projects: dbProjects
          .filter((p) => p.org_id === o.id)
          .map((p) => ({ name: p.name, phase: p.phase, status: p.status })),
        memberCount: dbMemberships.filter((m) => m.org_id === o.id).length,
      }));
  } else {
    orgs = customers.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.id,
      projects: c.units.map((u) => ({
        name: u.name,
        phase: u.phase ?? "projektering",
        status: u.status ?? "pagaende",
      })),
      memberCount: 0,
    }));
  }

  return (
    <AppShell showSignOut={AUTH_ENABLED}>
      <div className="h-full overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-[12px] text-ink-3 hover:text-ink">
              Administration
            </Link>
            <span className="text-ink-3">›</span>
            <span className="text-[12px] font-medium">Bolag</span>
          </div>

          <h1 className="mt-4 text-2xl font-medium tracking-tight">Bolag</h1>
          <p className="text-ink-2 mt-1 text-sm">
            {orgs.length} bolag registrerade i plattformen.
          </p>

          <div className="mt-6 space-y-4">
            {orgs.map((org) => (
              <div
                key={org.slug}
                className="rounded-lg border border-border bg-panel p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#f5e5d9] text-[13px] font-semibold text-[#8a3f20]">
                      {org.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{org.name}</div>
                      <div className="text-[12px] text-ink-3">
                        {org.projects.length} projekt
                        {org.memberCount > 0 && ` · ${org.memberCount} medlemmar`}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/c/${org.slug}/admin`}
                      className="rounded border border-border px-3 py-1 text-[12px] text-ink-2 transition hover:border-border-strong hover:text-ink"
                    >
                      Hantera
                    </Link>
                  </div>
                </div>

                {org.projects.length > 0 && (
                  <ul className="mt-3 divide-y divide-border border-t border-border">
                    {org.projects.map((p) => (
                      <li
                        key={p.name}
                        className="flex items-center justify-between py-1.5 text-[13px]"
                      >
                        <span className="truncate text-ink-2">{p.name}</span>
                        <span
                          className={`shrink-0 ml-2 h-1.5 w-1.5 rounded-full ${
                            p.status === "arkiverat" ? "bg-ink-3/50" : "bg-[#5e8553]"
                          }`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
