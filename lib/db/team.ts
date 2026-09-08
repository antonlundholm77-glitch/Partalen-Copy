// DB-fetchers för /intern/team. RLS = gf_is_platform_admin().

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

const AVATAR_BUCKET = "gf-team-avatars";
const AVATAR_URL_TTL = 60 * 60 * 24 * 7; // 7 dagar

export interface TeamPerson {
  id: string;
  name: string;
  role: string | null;
  title: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  avatar_path: string | null;
  avatar_url: string | null; // signerad nedladdnings-URL
  skills: string[];
  languages: string[];
  start_year: number | null;
  capacity_hours_per_week: number;
  employment_type: "employee" | "consultant";
  active: boolean;
  sort_order: number;
  user_id: string | null;
}

export interface TeamEducation {
  id: string;
  resource_id: string;
  institution: string;
  degree: string | null;
  year_from: number | null;
  year_to: number | null;
  sort_order: number;
}

export interface TeamCertification {
  id: string;
  resource_id: string;
  name: string;
  issuer: string | null;
  issued_year: number | null;
  expires_year: number | null;
  sort_order: number;
}

export interface TeamExperience {
  id: string;
  resource_id: string;
  project_id: string | null;
  project_name: string | null; // joinad från gf_projects om project_id != null
  org_slug: string | null;
  org_name: string | null;
  external_project_name: string | null;
  external_client_name: string | null;
  role: string | null;
  description: string | null;
  year_from: number | null;
  year_to: number | null;
  sort_order: number;
}

// Signerade URLs cachas inom samma render — vi gör bara ett storage-anrop per
// resurs. Anropas alltid med non-null path.
async function signAvatar(
  supabase: AnySupabase,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL);
  if (error) {
    console.warn("signAvatar:", error.message);
    return null;
  }
  return (data as { signedUrl: string }).signedUrl;
}

export const fetchTeam = cache(async (): Promise<TeamPerson[]> => {
  const supabase = (await createClient()) as AnySupabase;
  const { data, error } = await supabase
    .from("gf_resources")
    .select(
      "id, name, role, title, bio, email, phone, linkedin_url, avatar_path, skills, languages, start_year, capacity_hours_per_week, employment_type, active, sort_order, user_id",
    )
    .order("sort_order");
  if (error) {
    console.error("fetchTeam:", error.message);
    return [];
  }
  const rows = data as Record<string, unknown>[];
  const persons: TeamPerson[] = await Promise.all(
    rows.map(async (r) => ({
      id: r.id as string,
      name: r.name as string,
      role: (r.role as string | null) ?? null,
      title: (r.title as string | null) ?? null,
      bio: (r.bio as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      phone: (r.phone as string | null) ?? null,
      linkedin_url: (r.linkedin_url as string | null) ?? null,
      avatar_path: (r.avatar_path as string | null) ?? null,
      avatar_url: await signAvatar(supabase, r.avatar_path as string | null),
      skills: ((r.skills as string[] | null) ?? []) as string[],
      languages: ((r.languages as string[] | null) ?? []) as string[],
      start_year: (r.start_year as number | null) ?? null,
      capacity_hours_per_week: Number(r.capacity_hours_per_week ?? 0),
      employment_type:
        ((r.employment_type as string) === "consultant" ? "consultant" : "employee") as
          | "employee"
          | "consultant",
      active: Boolean(r.active),
      sort_order: Number(r.sort_order ?? 0),
      user_id: (r.user_id as string | null) ?? null,
    })),
  );
  return persons;
});

export async function fetchPerson(id: string): Promise<TeamPerson | null> {
  const supabase = (await createClient()) as AnySupabase;
  const { data, error } = await supabase
    .from("gf_resources")
    .select(
      "id, name, role, title, bio, email, phone, linkedin_url, avatar_path, skills, languages, start_year, capacity_hours_per_week, employment_type, active, sort_order, user_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("fetchPerson:", error.message);
    return null;
  }
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    role: (r.role as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    bio: (r.bio as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    linkedin_url: (r.linkedin_url as string | null) ?? null,
    avatar_path: (r.avatar_path as string | null) ?? null,
    avatar_url: await signAvatar(supabase, r.avatar_path as string | null),
    skills: ((r.skills as string[] | null) ?? []) as string[],
    languages: ((r.languages as string[] | null) ?? []) as string[],
    start_year: (r.start_year as number | null) ?? null,
    capacity_hours_per_week: Number(r.capacity_hours_per_week ?? 0),
    employment_type:
      ((r.employment_type as string) === "consultant" ? "consultant" : "employee") as
        | "employee"
        | "consultant",
    active: Boolean(r.active),
    sort_order: Number(r.sort_order ?? 0),
    user_id: (r.user_id as string | null) ?? null,
  };
}

export async function fetchEducation(resourceId: string): Promise<TeamEducation[]> {
  const supabase = (await createClient()) as AnySupabase;
  const { data, error } = await supabase
    .from("gf_team_education")
    .select("id, resource_id, institution, degree, year_from, year_to, sort_order")
    .eq("resource_id", resourceId)
    .order("sort_order");
  if (error) {
    console.error("fetchEducation:", error.message);
    return [];
  }
  return (data ?? []) as TeamEducation[];
}

export async function fetchCertifications(
  resourceId: string,
): Promise<TeamCertification[]> {
  const supabase = (await createClient()) as AnySupabase;
  const { data, error } = await supabase
    .from("gf_team_certifications")
    .select("id, resource_id, name, issuer, issued_year, expires_year, sort_order")
    .eq("resource_id", resourceId)
    .order("sort_order");
  if (error) {
    console.error("fetchCertifications:", error.message);
    return [];
  }
  return (data ?? []) as TeamCertification[];
}

interface ExperienceJoinRow {
  id: string;
  resource_id: string;
  project_id: string | null;
  external_project_name: string | null;
  external_client_name: string | null;
  role: string | null;
  description: string | null;
  year_from: number | null;
  year_to: number | null;
  sort_order: number;
  project:
    | {
        name: string | null;
        slug: string | null;
        gf_organizations: { slug: string | null; name: string | null } | null;
      }
    | { name: string | null; slug: string | null; gf_organizations: { slug: string | null; name: string | null } | null }[]
    | null;
}

export async function fetchExperiences(resourceId: string): Promise<TeamExperience[]> {
  const supabase = (await createClient()) as AnySupabase;
  const { data, error } = await supabase
    .from("gf_team_experiences")
    .select(
      `id, resource_id, project_id, external_project_name, external_client_name,
       role, description, year_from, year_to, sort_order,
       project:gf_projects(name, slug, gf_organizations(slug, name))`,
    )
    .eq("resource_id", resourceId)
    .order("sort_order");
  if (error) {
    console.error("fetchExperiences:", error.message);
    return [];
  }
  const rows = (data ?? []) as ExperienceJoinRow[];
  return rows.map((r) => {
    const project = Array.isArray(r.project) ? r.project[0] : r.project;
    const org = project?.gf_organizations
      ? Array.isArray(project.gf_organizations)
        ? project.gf_organizations[0]
        : project.gf_organizations
      : null;
    return {
      id: r.id,
      resource_id: r.resource_id,
      project_id: r.project_id,
      project_name: project?.name ?? null,
      org_slug: org?.slug ?? null,
      org_name: org?.name ?? null,
      external_project_name: r.external_project_name,
      external_client_name: r.external_client_name,
      role: r.role,
      description: r.description,
      year_from: r.year_from,
      year_to: r.year_to,
      sort_order: r.sort_order,
    };
  });
}

// För dropdownen i referensuppdrag-redigeraren: alla projekt med "Org — Projekt"
export interface ProjectOption {
  id: string;
  label: string;
}

export const fetchProjectOptionsForTeam = cache(
  async (): Promise<ProjectOption[]> => {
    const supabase = (await createClient()) as AnySupabase;
    const { data, error } = await supabase
      .from("gf_projects")
      .select("id, name, gf_organizations(name)")
      .order("name");
    if (error) {
      console.error("fetchProjectOptionsForTeam:", error.message);
      return [];
    }
    const rows = (data ?? []) as {
      id: string;
      name: string;
      gf_organizations: { name: string | null } | { name: string | null }[] | null;
    }[];
    return rows.map((r) => {
      const org = Array.isArray(r.gf_organizations)
        ? r.gf_organizations[0]
        : r.gf_organizations;
      return {
        id: r.id,
        label: `${org?.name ?? "?"} — ${r.name}`,
      };
    });
  },
);
