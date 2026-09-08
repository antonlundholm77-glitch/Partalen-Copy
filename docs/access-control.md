# Behörighetsmodell

Beskriver rollmodellen och RLS-policyerna som den faktiskt är implementerad
i `supabase/migrations/`, inte en plan. Se [data-model.md](data-model.md) för
tabellreferens.

## Tre nivåer

```
Plattformsadmin  →  Bolagsroll (gf_memberships)  →  Projektroll (gf_unit_members)
```

En användare kan ha en roll på bolagsnivå (gäller alla projekt i bolaget) och/eller
en roll på enskilda projekt. Åtkomst är alltid en OR — den starkaste träffen vinner.

### Plattformsadmin

```sql
gf_is_platform_admin() = lower(split_part(auth.jwt()->>'email', '@', 2)) = 'part-group.example'
```

Ren domän-check på inloggad e-post, ingen DB-rad. **Idag en platshållardomän**
(`part-group.example`) — måste bytas till Part Groups riktiga domän i en
migration när ett eget Supabase-projekt sätts upp (se CLAUDE.md). Plattformsadmin
har alltid full åtkomst, oavsett bolags-/projektroll.

### Bolagsroll (`gf_memberships.role`, enum `gf_member_role`)

Tre roller sedan migration `0016`/`0017`: **owner / user / visitor**
(enumen har kvar de gamla värdena `admin`/`member` för bakåtkompatibilitet,
men de skrivs inte längre av koden).

- **Owner** — `gf_is_org_admin()` → administrerar bolaget, medlemmar, alla projekt.
- **User** — vanlig medlem, läs/skriv enligt projektroll.
- **Visitor** — läsåtkomst, blockeras från skrivning (se nedan).

### Projektroll (`gf_unit_members.role`, enum `gf_unit_role`)

Samma tre-nivåmodell, applicerad per projekt: owner/user/visitor. Enumen
har kvar legacy-värden (`manager`/`member`/`viewer`/`larare`/`deltagare`)
från innan tre-nivåmodellen och en tidigare utbildningsmodul infördes;
de skrivs inte längre av koden.

## Hjälpfunktioner (SECURITY DEFINER, `stable`)

| Funktion | Betyder |
|---|---|
| `gf_is_org_member(org)` | Har en rad i `gf_memberships` för bolaget. |
| `gf_is_org_admin(org)` | Bolagsroll = owner (legacy: admin). |
| `gf_is_unit_member(project)` | Har en rad i `gf_unit_members` för projektet. |
| `gf_is_unit_manager(project)` | Projektroll = owner (legacy: manager/larare). |
| `gf_can_access_org(org)` | `platform_admin OR org_member`. |
| `gf_can_access_unit(project)` | `platform_admin OR org_member(projektets bolag) OR unit_member`. **Läs**-gate för nästan alla projekttabeller. |
| `gf_can_manage_unit(project)` | `platform_admin OR org_admin OR unit_manager`. Strukturändringar: leverabler/faser/discipliner, radera dokument, hantera medlemmar, togga moduler. |
| `gf_can_upload_unit(project)` | `platform_admin OR (projektroll ≠ visitor) OR (bolagsroll ≠ visitor)`. Ladda upp/redigera dokument, skapa tidplaner/tasks. |

## Skrivbehörighet per operation (sedan migration `0019`)

Innan `0019` hade `gf_documents` och `pm_*`-tabellerna en enda permissiv
`for all`-policy — en Besökare kunde teoretiskt INSERT/UPDATE/DELETE via
direkta API-anrop, UI-gating var enda skyddet. Nu är policyerna delade per
operation:

| Operation | Krav |
|---|---|
| SELECT (dokument, tasks, leverabler, pm_*) | `gf_can_access_unit` — alla med projektåtkomst |
| INSERT/UPDATE dokument, tidplaner, tasks | `gf_can_upload_unit` — owner eller user, **visitor blockeras** |
| DELETE dokument | `gf_can_manage_unit` — bara owner |
| INSERT/UPDATE/DELETE leverabler/faser/discipliner | `gf_can_manage_unit` — bara owner |
| Bolags-/projektmedlemmar, inbjudningar, modul-toggles | `gf_can_manage_unit`/`gf_is_org_admin` |

Plattformsadmin-only tabeller (resursplanering, tidrapportering utom egna
rader, internt bibliotek, team-CV, canvas) har egna, enklare policyer:
`using (gf_is_platform_admin())` rakt av — inget bolags-/projektbegrepp
inblandat, se [data-model.md](data-model.md).

## Inbjudningar

`gf_invitations` (org- eller projektscopad, token + 14 dagars TTL).
`gf_accept_invitation(token)` är en SECURITY DEFINER-funktion som:

1. Slår upp token, kräver `status = 'pending'` och ej utgången.
2. Verifierar att inloggad users e-post matchar inbjudans e-post.
3. Upsertar en rad i `gf_unit_members` (om projektscopad) eller `gf_memberships`
   (om bolagsscopad) med rollen från inbjudan.
4. Markerar inbjudan `accepted`.

## Auth-flöde

`AUTH_ENABLED = NEXT_PUBLIC_SUPABASE_URL.includes(".supabase.co")`. Utan env
→ appen körs öppet mot testdata i `lib/preview-projects.ts`/`lib/preview-people.ts`
(inget RLS inblandat, ren fixture). Med env → Microsoft Entra OAuth via
Supabase (`signInWithOAuth({ provider: "azure" })` → Entra → Supabase →
`/auth/callback`, PKCE-flöde). `middleware.ts` gate:ar hela appen (utom
`/auth/*`, `/login`, statiska filer) bakom inloggning när `AUTH_ENABLED`.

Vid första inloggning skapar triggern `gf_handle_new_user` (på `auth.users`)
automatiskt en rad i `gf_profiles` — ingen manuell provisionering krävs.
