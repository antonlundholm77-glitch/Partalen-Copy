# Dokumentation

Referensdokumentation för Part Plattform, som den ser ut i koden just nu.
Snabbreferensen (stack, hierarki, routing-översikt, konventioner) ligger i
[CLAUDE.md](../CLAUDE.md) i repo-roten — de här dokumenten fördjupar snarare
än upprepar den.

| Dokument | Innehåll |
|---|---|
| [data-model.md](data-model.md) | Fullständig Supabase-schemareferens, tabell för tabell. |
| [access-control.md](access-control.md) | Rollmodell (plattformsadmin/bolag/projekt), RLS-funktioner, auth-flöde. |
| [modules.md](modules.md) | Routing-karta och modulregistret (`lib/modules.ts`) — vad som är live vs. "kommer snart". |
| [deploy.md](deploy.md) | Körplan för nytt Supabase-projekt + Vercel-deploy. |

## Vad hände med de gamla dokumenten?

`docs/` innehöll tidigare ett tjugotal filer — dels dagsfärska dev-loggar
(handovers, session-recaps, reviews) från byggfasen, dels "evergreen"-märkta
dokument som i praktiken beskrev en äldre version av plattformen (från innan
Part Group-rebrandet och innan tenant-datan städades bort) och därför inte
längre stämde. Allt det är borttaget, medvetet utan att lämna kvar spår i
historiken. Dokumenten ovan är nyskrivna direkt mot aktuell kod och
aktuellt schema.
