# Routing & moduler

## Routing

```
/                       Plattformsöversikt (Part Group-vy) för platform admin.
                        Icke-admin: redirect till projektet (om project-only-
                        access) eller första tillgängliga bolag, annars
                        "Ingen access än".
/login                  Entra-inloggning
/auth/callback          OAuth-callback (kod → session, PKCE)
/auth/signout           Loggar ut
/auth/invite/[token]    Accepterar en inbjudan (gf_accept_invitation)
/admin                  Plattformsadministration (bara platform admin)
/admin/bolag            Lista + hantera alla bolag

/c/[org]                Bolags-landning (dashboard: enheter, medlemmar, inbjudningar)
/c/[org]/admin          Bolags-administration
/c/[org]/presentation   Säljpresentation (deck väljs på org-slug)
/c/[org]/[id]           Projektöversikt (modulkort + livscykel)
/c/[org]/[id]/<modul>   Projektmodul — se tabell nedan

/api/handover           API route
/api/project-doc        API route
```

`app/c/[org]/layout.tsx` gate:ar bolagsytan: icke-admin måste ha org-sluggen
i `accessibleOrgSlugs`, annars 404 (RLS skyddar redan datan, men detta ger
tydligare UX än en tom sida). Prototype-läge (`AUTH_ENABLED=false`) släpper
igenom allt så fixture-vyn fungerar utan Supabase.

## Modulregister (`lib/modules.ts`)

`status: "soon"` = skal som väntar på implementation, syns i UI men
markerad "kommer snart" (se "Ärligt tomt"-konventionen i CLAUDE.md).

### Projektmoduler

| Modul | Segment | Status |
|---|---|---|
| SmartPrep | `smartprep` | live |
| Projektkarta | `projektkarta` | live |
| Dokumenthantering | `dokument` | live |
| Projektprocessen | `process` | live |
| Riskhantering | `risk` | soon |
| Tidplan | `tidplan` (+ `tidplan-v2` med export/import) | live |
| Arbetsmiljö | `arbetsmiljo` | soon |
| Områden | `omraden` | soon |
| Genomförande | `genomforande` | soon |
| Teknik | `teknik` | live |
| Frågor | `fragor` | soon |
| Kontrollplan | `kontrollplan` | soon |
| Möten | `moten` | soon |
| Behörighet | `behorighet` | live |

### Extramoduler (kurerade enheter, utanför standardraden)

Aktiveras via `unit.moduleGroups` på specifika enheter, inte automatiskt
för alla projekt: `organisation`, `karta` (delar route med `projektkarta`),
`observationer`, `objekt`, `leverabler` (+ `[code]`), `lessons`,
`sammanfattning`, `mangd`.

### Per-projekt override

`gf_project_modules` (se [data-model.md](data-model.md)) kan dölja en modul
för ett specifikt projekt (`enabled = false`). Saknad rad = modulen syns
enligt standard-uppsättningen ovan.

## Känt: föräldralösa komponenter

`lib/modules.ts` innehåller även `INTERNAL_AREAS` — ett register för
`/intern/*`-sidor (Kunder & avtal, Playbook, Operatör, Resurser, Bibliotek,
Team, Grafisk profil m.fl.). De sidorna finns **inte** i `app/` — de togs
bort när plattformen byttes om till Part Group. Komponenterna som skulle
rendera dem (`InternalOverview`, `ResourcePlanner`, `InternalCustomers`,
`InternalAccess`, `Playbook`, `PlaybookNav`, `Glossary` m.fl.) finns kvar i
`components/` men importeras ingenstans i `app/`. Samma sak gäller
databastabellerna de skulle läsa (`gf_resources`, `gf_time_entries`,
`gf_library_documents`, `gf_team_*` — se data-model.md) — schemat finns,
routen gör det inte. Innan de tas i bruk igen: koppla in dem under en
route (t.ex. under `/admin`), eller ta bort dem om Part Group inte vill
återinföra de interna verktygen i den här plattformen.
