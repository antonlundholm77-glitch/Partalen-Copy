# CLAUDE.md — Part Plattform

Part Plattform, opererad av Part Group.
Hierarki: **Part Group (operatör)** ▸ **Bolag** ▸ **Projekt** ▸ **Modul**

## Kommandon

```bash
pnpm dev          # startar dev-servern (Next.js)
pnpm build        # produktionsbygge
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
```

**Pakethanterare:** pnpm 9.15.

---

## Arkitektur

### Stack

| Lager | Val |
|---|---|
| Ramverk | Next.js 15.5 (App Router), Server Components som default |
| UI | React 19 + TypeScript strict |
| Styling | Tailwind 3.4 + CSS-variabler i `styles/tokens.css` |
| Auth | Microsoft Entra (Azure) via Supabase OAuth |
| DB | Supabase (PostgreSQL + RLS), alla tabeller prefixade `gf_` |
| Pakethanterare | pnpm 9.15 |

### Hierarki

```
Part Group (operatör)  ▸  Bolag  ▸  Projekt  ▸  Modul
```

- **Bolag** = ett dotterbolag eller separat enhet inom Part Group-sfären. I DB:n: `gf_organizations`.
- **Projekt** = ett byggnads- eller hotellprojekt. I DB:n: `gf_projects`.
- **Modul** = en funktion i projektet. Styrs av `modulesFor(kind)` i `lib/modules.ts`.

### Routing

```
/                    Plattforms-översikt (bolag + projekt) eller redirect
/login               Entra-inloggning
/auth/callback       OAuth-callback
/admin               Plattformsadministration (bara platform admin)
/admin/bolag         Lista + hantera alla bolag
/c/[org]             Bolags-landning
/c/[org]/admin       Bolags-administration
/c/[org]/[id]        Projektöversikt (modulkort + livscykel)
/c/[org]/[id]/<modul> Projektmodul
```

### Plattformsadmin

Domäncheck i `gf_is_platform_admin()` (Supabase RLS-funktion) avgör plattformsadmin.
Satt till `partgroup.se` sedan migration 0028.

### Auth

`AUTH_ENABLED = NEXT_PUBLIC_SUPABASE_URL.includes(".supabase.co")`. Utan env → öppen
med testdata från `lib/preview-projects.ts`. Med env → Microsoft Entra OAuth via Supabase.

### Supabase-schema

Alla DB-objekt är `gf_`-prefixade (teknisk konvention, ärvt från plattformens
underliggande schema). Migrationer i `supabase/migrations/`.
Aktuell migration: `0028`. Relevanta tabeller:

| Tabeller | Syfte |
|---|---|
| `gf_organizations` | Bolag (dotterbolag) |
| `gf_memberships` | Bolags-roller (owner/user/visitor) |
| `gf_projects` | Projekt inom ett bolag |
| `gf_unit_members` | Projektroller |
| `gf_invitations` | Inbjudningar (token-baserade) |
| `gf_documents`, `gf_document_versions` | Dokumentbibliotek per projekt |
| `gf_canvases`, `gf_canvas_images` | Canvas-editor |
| `gf_schedules`, `gf_tasks`, `gf_task_dependencies` | Tidplan / Gantt (CPM) |

Fullständig schemareferens: [docs/data-model.md](docs/data-model.md).
Rollmodell & RLS: [docs/access-control.md](docs/access-control.md).

---

## Konventioner

- **Språk:** UI och dokumentation på svenska.
- **Ärligt tomt:** ingen fejkdata — visa "inga rader" / "kommer snart".
- **Service-role:** aldrig i `NEXT_PUBLIC_*`, bara server-side i scripts.
- **gf_-prefix:** alla DB-objekt, ren teknisk namnkonvention.
- **Migrations:** versioneras i `supabase/migrations/`. Inga UI-ändringar i Supabase-dashboarden.
- **Slug-baserade URLs, UUID i DB:** `lib/db/orgs.ts` hanterar tvåstegs-lookup.

## Iteration över perfektion

- Små, testbara steg framåt.
- Reversibla beslut först.
- Commit tidigt och ofta.
