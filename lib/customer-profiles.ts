// Kundspecifikt, redigerbart innehåll för kund-dashboarden (CustomerOverview).
// Berika en kund i taget genom att lägga till en post här. Allt här är utkast
// härlett ur appens egen data (projekt, faser, beställare) — fritt att justera.

export interface CustomerProfile {
  tagline?: string; // kort rad under kundnamnet
  about?: string; // stycke om kunden
  contact?: { name: string; role: string; email: string };
  highlights?: { title: string; body: string }[]; // "I fokus"
}

export const CUSTOMER_PROFILES: Record<string, CustomerProfile> = {};

export function customerProfile(org: string): CustomerProfile | undefined {
  return CUSTOMER_PROFILES[org];
}
