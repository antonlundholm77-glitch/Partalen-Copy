// rls:proof — verifierar access-modellen (docs/access-control.md).
//
// Fall som testas:
//   1) Kundmedlem ser sin kunds projekt men INTE en annan kunds.
//   2) Enhetsmedlem (projektmedlem) ser sitt projekt men INTE kundens andra
//      projekt, och kan INTE läsa kundens organisation.
//   3) Plattformsadmin (@part-group.example) ser allt.
//
// Service-role används ENDAST för uppsättning, aldrig i verifieringsvägen.
// Kör: node scripts/rls-proof.mjs   (kräver .env.local + applicerade migrations)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* .env.local saknas — förlitar oss på processens env */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error("✗ Saknar NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY / SUPABASE_SERVICE_ROLE_KEY i .env.local");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
const pw = "rls-proof-Test123!";
const stamp = Date.now();

let failed = false;
const created = { users: [], orgs: [] };

function check(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed = true;
}

async function makeUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
  if (error) throw error;
  created.users.push(data.user.id);
  return data.user;
}

async function makeOrg(name) {
  const { data } = await admin.from("gf_organizations").insert({ name }).select().single();
  created.orgs.push(data.id);
  return data;
}

async function asUser(email) {
  const c = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: pw });
  if (error) throw error;
  return c;
}

try {
  // --- Uppsättning ---
  const ua = await makeUser(`rlsproof-a-${stamp}@example.com`);
  const ub = await makeUser(`rlsproof-b-${stamp}@example.com`);
  const uc = await makeUser(`rlsproof-c-${stamp}@example.com`); // enbart enhetsmedlem
  const uAdmin = await makeUser(`rlsproof-admin-${stamp}@part-group.example`); // plattformsadmin via domän

  const orgA = await makeOrg("Org A");
  const orgB = await makeOrg("Org B");
  await admin.from("gf_memberships").insert([
    { user_id: ua.id, org_id: orgA.id, role: "owner" },
    { user_id: ub.id, org_id: orgB.id, role: "owner" },
  ]);

  const { data: pA } = await admin.from("gf_projects").insert({ org_id: orgA.id, name: "Projekt A1" }).select().single();
  const { data: pB1 } = await admin.from("gf_projects").insert({ org_id: orgB.id, name: "Projekt B1" }).select().single();
  const { data: pB2 } = await admin.from("gf_projects").insert({ org_id: orgB.id, name: "Projekt B2" }).select().single();

  // C är enbart enhetsmedlem på B1 (ingen org-medlem i B).
  await admin.from("gf_unit_members").insert({ user_id: uc.id, project_id: pB1.id, role: "member" });

  // --- 1) Kundmedlem ---
  const a = await asUser(ua.email);
  check((await a.from("gf_projects").select("id").eq("id", pA.id).maybeSingle()).data?.id === pA.id,
    "Kundmedlem A ser sitt eget projekt.");
  check(!(await a.from("gf_projects").select("id").eq("id", pB1.id).maybeSingle()).data,
    "Kundmedlem A kan INTE se kund B:s projekt.");

  // --- 2) Enhetsmedlem (projektmedlem) ---
  const c = await asUser(uc.email);
  check((await c.from("gf_projects").select("id").eq("id", pB1.id).maybeSingle()).data?.id === pB1.id,
    "Enhetsmedlem C ser sitt projekt (B1).");
  check(!(await c.from("gf_projects").select("id").eq("id", pB2.id).maybeSingle()).data,
    "Enhetsmedlem C ser INTE kundens andra projekt (B2).");
  check(!(await c.from("gf_organizations").select("id").eq("id", orgB.id).maybeSingle()).data,
    "Enhetsmedlem C kan INTE läsa kundens organisation (landningen låst).");

  // --- 3) Plattformsadmin (domän) ---
  const adminUser = await asUser(uAdmin.email);
  const seesAll =
    (await adminUser.from("gf_projects").select("id").eq("id", pA.id).maybeSingle()).data?.id === pA.id &&
    (await adminUser.from("gf_projects").select("id").eq("id", pB1.id).maybeSingle()).data?.id === pB1.id;
  check(seesAll, "Plattformsadmin (@part-group.example) ser alla kunders projekt.");
} catch (e) {
  console.error("✗ Fel under rls:proof:", e.message);
  failed = true;
} finally {
  for (const id of created.orgs) await admin.from("gf_organizations").delete().eq("id", id);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
}

process.exit(failed ? 1 : 0);
