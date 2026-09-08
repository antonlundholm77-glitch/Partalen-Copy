# Datamodell

Fullständig referens över Supabase-schemat som det ser ut idag (efter
`supabase/migrations/0001`–`0027`). Alla tabeller är prefixade `gf_` utom
leverabelmodellen som ärvts från PM Cloud och är prefixad `pm_`. Alla
tabeller har Row-Level Security (RLS) aktiverat — se
[access-control.md](access-control.md) för rollmodellen policyerna bygger på.

Detta dokument beskriver **schemat**, inte demo-/testdata. Plattformen körs
"ärligt tomt" (se CLAUDE.md) — enda seedade raden i produktionsseed är
Part Group själv (`supabase/seed/0002_prod_customers.sql`) plus verkliga
leverabler för Part Groups eget projekt Partalen (`0003_partalen_deliverables.sql`).

## Tenant-hierarki

| Tabell | Syfte |
|---|---|
| `gf_organizations` | Bolag (dotterbolag/tenant). `slug`, `kind` (`entreprenad`), `unit_noun(_plural)` styr hur enheter benämns. |
| `gf_memberships` | Bolagsroll per användare (`gf_member_role`: legacy `owner`/`admin`/`member`, aktuellt `owner`/`user`/`visitor` — se access-control.md). |
| `gf_projects` | Projekt inom ett bolag. `slug`, `phase` (`gf_project_phase`: forstudie…förvaltning), `status` (`pagaende`\|`arkiverat`), `meta`/`has_data`/`program` (fri metadata). FK `assignment_id` → `gf_assignments`. |
| `gf_unit_members` | Projektroll per användare (`gf_unit_role`: legacy `manager`/`member`/`viewer`/`larare`/`deltagare`, aktuellt `owner`/`user`/`visitor`). |
| `gf_invitations` | Token-baserade inbjudningar (org- eller projektnivå), 14 dagars TTL. `gf_accept_invitation()` (SECURITY DEFINER) konsumerar token. |
| `gf_profiles` | Spegling av `auth.users` (email, full_name), fylls av trigger `gf_handle_new_user` vid första inloggning. |
| `gf_system_roles` | Plattformsbreda systemroller (`superadmin`\|`support`\|`readonly`) — separat från platform-admin-domänchecken. |
| `gf_assignments` | Uppdrag per bolag (titel, beskrivning, operatör, status). Ett bolag kan ha flera uppdrag; ett projekt kan pekas mot ett uppdrag. |

## Projektinnehåll (JSONB)

| Tabell | Syfte |
|---|---|
| `gf_project_content` | Fri-forms projektinnehåll (observationer, tekniska objekt, leverabler, dokumentmappar, karta/ritning) som JSONB, ett schema per rad. Matchar zod-schemat i `lib/schema/project-doc.ts`; `schema_version` speglar `ProjectDoc.schemaVersion`. |
| `gf_org_content` | Motsvarande för bolagsprofilen (kundlandningens innehåll, brand). |
| `gf_project_modules` | Override-tabell `(project_id, module_id) → enabled/config`. Saknad rad = modulen är på (default). Module_id är fri text, ingen FK — modul-listan speglas i koden (`lib/modules.ts`). |

## Leverabler, faser & discipliner (`pm_`-prefix, ärvt från PM Cloud)

| Tabell | Syfte |
|---|---|
| `pm_disciplines` | Teknikområden per projekt (kod, namn, färg). |
| `pm_phases` | Rik fasdata per projekt (stage 0–7, status, progress, key_activities) — separat från `gf_projects.phase`-enumen, driver `/process`-vyn. |
| `pm_deliverables` | Leverabler (kod, namn, status, format, ansvarig, due_date), FK till fas + disciplin. `gf_documents.deliverable_id` kopplar dokument hit. |
| `pm_stakeholders` | Intressenter per projekt (kategori, namn, roll, kontakt). |
| `pm_restrictions` | Restriktioner/villkor (kategori, period, allvarlighetsgrad). |
| `pm_penalties` | Viten & bonusar (typ, belopp, tak, villkor). |
| `pm_contract_deviations` | Avvikelser mot AB/ABT-kontraktstext (original vs ändrad text). |
| `pm_quantity_items` | Mängdförteckning (AMA-kod, mängd, à-pris, summa) — separat från `gf_mf_rows` (se nedan), används av Mängdförteckning-modulen. |

## AMA-referens & SmartPrep (grundschemat, `0001_init.sql`)

| Tabell | Syfte |
|---|---|
| `gf_ama_codes` | Delat AMA-kodträd (självrefererande parent_code), läsbart för alla autentiserade. |
| `gf_tb_entries` | Teknisk beskrivning per AMA-kod och projekt. |
| `gf_mf_rows` | Mängdförteckningsrader (SmartPrep-modulens ursprungliga modell). |
| `gf_ama_checklists` | Checklistor per AMA-kod (JSONB items). |

## Dokument

| Tabell | Syfte |
|---|---|
| `gf_documents` | Dokument per projekt. `storage_path` som börjar med `public:` tolkas som relativ sökväg under `public/` (statiska filer); övriga går via signerad Supabase Storage-URL. Soft-delete via `deleted_at`. |
| `gf_document_versions` | Versionshistorik per dokument. |

## Tidplan (CPM-motor)

| Tabell | Syfte |
|---|---|
| `gf_calendars` | Arbetskalendrar. `customer_id = NULL` → system-global (seedad svensk standardkalender med helgdagar 2026–2028); satt → bolagsspecifik. |
| `gf_calendar_exceptions` | Undantag (helgdag/arbetsdag/delvis) per kalender och datum. |
| `gf_schedules` | En tidplan per projekt kan ha flera (`kind`: main/tender/what-if/baseline-only; `status`: draft/active/archived). |
| `gf_tasks` | Rekursivt WBS-träd (`parent_id` självref). Planerat/baseline/faktiskt datum, MSP-constraints (`gf_constraint_type`), CPM-cache-kolumner (`computed_early_start` m.fl., `is_critical`) som fylls av CPM-körningen i `lib/scheduling/cpm.ts`. |
| `gf_task_dependencies` | Beroenden mellan tasks (`gf_dep_type`: FS/SS/FF/SF, med lag_days). |
| `gf_schedule_baselines` | Frusna JSONB-snapshots av tasks+deps. |

Tidplanen är en egen entitet, skild från `pm_phases` (som driver `/process`).
På sikt kan `gf_schedules.kind = 'process'` ersätta `pm_phases`, men det är
inte gjort.

## Resursplanering & tidrapportering (plattformsadmin-only)

| Tabell | Syfte |
|---|---|
| `gf_resources` | Leveransteamet (internt). Utökad över flera migrationer: `capacity_hours_per_week`, `employment_type` (employee/consultant), `user_id`-koppling för tidrapportering, samt profilfält (`title`, `bio`, `skills[]`, `languages[]` m.fl.) för teamsidan. |
| `gf_resource_allocations` | Planerade timmar per (resurs × projekt × ISO-vecka). |
| `gf_time_entries` | Rapporterat arbete per (användare × dag × projekt × aktivitet), status draft/submitted/locked. Användaren ser bara sina egna rader; plattformsadmin ser allt. |
| `gf_team_education`, `gf_team_certifications`, `gf_team_experiences` | Teamsidans CV-data per resurs (utbildningar, certifieringar, referensuppdrag — interna via `project_id` eller externa via fritextfält). |

> Dessa tabeller och deras RLS-policys finns i schemat och backas av riktiga
> komponenter (`ResourcePlanner`, `InternalAccess` m.fl.), men har **ingen
> live route** i `app/` just nu — de ursprungliga `/intern/*`-sidorna togs
> bort i samband med Part Group-rebrandet utan att komponenterna som
> konsumerar dem följde med bort. Innan de tas i bruk igen: koppla in dem
> under en route, eller ta bort dem om de inte behövs.

## Internt bibliotek (plattformsadmin-only)

| Tabell | Syfte |
|---|---|
| `gf_doc_categories`, `gf_doc_statuses` | Dynamiska lookup-kataloger (kategori/status), administrerbara via UI. |
| `gf_library_documents` | Interna dokument (mallar, policyer, kontrakt) — helt skilt från `gf_documents` (projekt-scopat). Storage-bucket `gf-library-docs` (privat). |

## Canvas

| Tabell | Syfte |
|---|---|
| `gf_canvases` | Whiteboard-state som JSONB (React Flow-format `{nodes, edges}`). `project_id` nullable — idag bara interna canvases (plattformsadmin). |
| `gf_canvas_images` | Bilder uppladdade i canvas-editorn. Storage-bucket `canvas-assets`. |

## Storage-buckets

| Bucket | Publik? | Syfte |
|---|---|---|
| `gf-library-docs` | Nej | Interna biblioteket. |
| `gf-team-avatars` | Nej | Teamsidans profilbilder (signed URLs). |
| `canvas-assets` | Nej | Bilder uppladdade i canvas-editorn. |
| `public/` (Next.js static) | Ja | `storage_path` som börjar med `public:` pekar hit i stället för Storage — används för dokument som ska vara direktlänkbara utan signering. |
