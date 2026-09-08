// Bygger färdigt inbjudningsmeddelande som admin kan klistra in i Slack/mejl.
// Inkluderar URL, scope (kund/projekt), utgångsdatum och ev. avsändare.

export interface BuildInviteMessageOptions {
  url: string;
  orgName: string;
  projectName?: string;
  expiresAt: string; // ISO-string
  senderName?: string;
}

export function buildInviteMessage(opts: BuildInviteMessageOptions): string {
  const { url, orgName, projectName, expiresAt, senderName } = opts;
  const scope = projectName ? `${orgName} · ${projectName}` : orgName;
  const expDate = formatDate(expiresAt);
  const senderLine = senderName ? `\n\nSkickat av ${senderName}` : "";

  return (
    `Hej!\n\n` +
    `Du har bjudits in till ${scope} på Part Plattform.\n\n` +
    `Klicka på länken för att acceptera inbjudan:\n` +
    `${url}\n\n` +
    `Du loggar in med ditt Microsoft-konto (Entra ID). ` +
    `Länken är giltig till ${expDate}.` +
    senderLine
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
}
