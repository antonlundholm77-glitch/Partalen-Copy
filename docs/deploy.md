# Deploy

Kort körplan för att sätta upp ett eget Supabase-projekt + deploy till
Vercel. Ersätt alla `<placeholder>`-värden — inga riktiga nycklar eller
domäner ska in i det här dokumentet eller i git.

## 1. Supabase-projekt

1. Skapa ett nytt Supabase-projekt för Part Group.
2. Applicera schemat: kör varje fil i `supabase/migrations/` i nummerordning
   (`0001` → `0027`) via Supabase SQL-editor, eller `pnpm db:link` +
   `pnpm db:push` med Supabase CLI. `supabase/prod-bundle.sql` är en
   färdig konsolidering av hela schemat (idempotent) om du hellre kör allt
   i ett svep.
3. Kör `supabase/seed/0002_prod_customers.sql` för att lägga Part Groups
   eget bolagsskal. Kör därefter `0001_dev_users.sql` (dev-testanvändare,
   valfritt) och `0003_partalen_deliverables.sql` (kräver att projektet
   `part-group/partalen` redan finns — skapas via UI:t först).
4. **Plattformsadmin-domänen** är satt till `partgroup.se` sedan migration
   0028 (`gf_is_platform_admin()`, ursprungligen `0002_access.sql`).

## 2. Microsoft Entra (Azure AD)

1. Registrera en app i Part Groups Entra-tenant (Azure Portal → App
   registrations).
2. Redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`.
3. Lägg `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID` i
   **Supabase Dashboard → Auth → Providers → Azure** (appen läser inte
   dessa env-variabler direkt, se `.env.example`).

## 3. Miljövariabler (Vercel + `.env.local`)

Se `.env.example` för fullständig lista. Sammanfattat:

| Variabel | Var |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publika, säkra att exponera. Krävs i Vercel + lokalt. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Endast server-side/scripts.** Aldrig `NEXT_PUBLIC_*`, aldrig i klientkod. |
| `SUPABASE_PROJECT_REF` | För `pnpm db:link`/`db:push` lokalt. |
| `AZURE_*` | Matas in i Supabase Dashboard, inte i appens env. |

Utan `NEXT_PUBLIC_SUPABASE_URL` satt till en riktig `*.supabase.co`-URL kör
appen öppet mot fixture-data (`AUTH_ENABLED = false`) — bra för förhandsvisning
på Vercel utan Supabase, men ska inte vara läget i produktion.

## 4. Vercel

1. Importera repot, sätt miljövariablerna ovan (Production + Preview).
2. `next.config.mjs` har en lokal iCloud-workaround (`distDir` bara när
   varken `VERCEL` eller `CI` är satt) — ingen åtgärd krävs på Vercel.
3. Bygg-kommando: `pnpm build`. Inga extra buildsteg.

## 5. Efter första deploy

- Logga in som första användare på Part Groups domän → triggern
  `gf_handle_new_user` skapar `gf_profiles`-raden automatiskt.
- Verifiera att `gf_is_platform_admin()` känner igen dig (steg 1.4 ovan
  måste vara gjort).
- `pnpm rls:proof` (`scripts/rls-proof.mjs`) kan köras mot projektet för att
  sanity-checka att RLS-policyerna faktiskt blockerar otillåten åtkomst.
