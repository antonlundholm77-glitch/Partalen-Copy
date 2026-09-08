// Modulregister — projektmoduler (SmartPrep m.fl.).
// status 'live' = byggd, 'soon' = skal som väntar på implementation.

export type UnitKind = "entreprenad";
export type ModuleStatus = "live" | "soon";

export interface NavItem {
  key: string;
  label: string;
  segment: string | null; // null = workspace-roten (Översikt)
  status: ModuleStatus;
  blurb: string;
}

export const OVERVIEW: NavItem = {
  key: "oversikt",
  label: "Översikt",
  segment: null,
  status: "live",
  blurb: "Enhetens verktyg och status på ett ställe.",
};

// Projektmoduler (entreprenad)
export const PROJECT_MODULES: NavItem[] = [
  {
    key: "smartprep",
    label: "SmartPrep",
    segment: "smartprep",
    status: "live",
    blurb: "TB, mängdförteckning och AMA-checklistor vävda per AMA-kod.",
  },
  {
    key: "projektkarta",
    label: "Projektkarta",
    segment: "projektkarta",
    status: "live",
    blurb: "Geografisk översikt med baskartor (OpenLayers) och adressökning.",
  },
  {
    key: "dokument",
    label: "Dokumenthantering",
    segment: "dokument",
    status: "live",
    blurb: "Ritningar, handlingar och versioner samlat på ett ställe.",
  },
  {
    key: "process",
    label: "Projektprocessen",
    segment: "process",
    status: "live",
    blurb: "Projektets faser från förstudie till drift, med kopplade leverabler per fas.",
  },
  {
    key: "risk",
    label: "Riskhantering",
    segment: "risk",
    status: "soon",
    blurb: "Riskregister, bedömning och åtgärder kopplade till projektet.",
  },
  {
    key: "tidplan",
    label: "Tidplan",
    segment: "tidplan",
    status: "live",
    blurb: "Etapper, nyckelaktiviteter och avslutsdatum över tid.",
  },
  {
    key: "arbetsmiljo",
    label: "Arbetsmiljö",
    segment: "arbetsmiljo",
    status: "soon",
    blurb: "AMP, skyddsronder och arbetsmiljöansvar.",
  },
  {
    key: "omraden",
    label: "Områden",
    segment: "omraden",
    status: "soon",
    blurb: "Områden, ytor och objekt i projektet.",
  },
  {
    key: "genomforande",
    label: "Genomförande",
    segment: "genomforande",
    status: "soon",
    blurb: "Genomförandeplan, metod och sekvens.",
  },
  {
    key: "teknik",
    label: "Teknik",
    segment: "teknik",
    status: "live",
    blurb: "Teknikområden och deras innehåll — nyckelkomponenter, framsteg, integrationspunkter.",
  },
  {
    key: "fragor",
    label: "Frågor",
    segment: "fragor",
    status: "soon",
    blurb: "Frågor till beställaren.",
  },
  {
    key: "kontrollplan",
    label: "Kontrollplan",
    segment: "kontrollplan",
    status: "soon",
    blurb: "Kontrollplan och egenkontroll.",
  },
  {
    key: "moten",
    label: "Möten",
    segment: "moten",
    status: "soon",
    blurb: "Mötesanteckningar och beslut.",
  },
  {
    key: "behorighet",
    label: "Behörighet",
    segment: "behorighet",
    status: "live",
    blurb: "Projektets medlemmar och roller (manager/member/viewer).",
  },
];

// Extra moduler som bara används av kurerade enheter (unit.moduleGroups). Hålls
// utanför PROJECT_MODULES så att standard-kundernas modulrad inte påverkas.
export const EXTRA_MODULES: NavItem[] = [
  {
    key: "organisation",
    label: "Organisation",
    segment: "organisation",
    status: "live",
    blurb: "Projektets parter — internt team, kund och projektmedlemmar.",
  },
  {
    key: "karta",
    label: "Karta",
    segment: "projektkarta", // delar route med projektkartan
    status: "live",
    blurb: "Schematisk vy över objekt, flöden och osäkra lägen.",
  },
  {
    key: "observationer",
    label: "Observationer",
    segment: "observationer",
    status: "live",
    blurb: "Fältobservationer från filmning och inspektion, kopplade till objekt.",
  },
  {
    key: "objekt",
    label: "Tekniska objekt",
    segment: "objekt",
    status: "live",
    blurb: "Kända objekt: rännor, OA, pumpgrop, ledningar — med säkerhetsläge.",
  },
  {
    key: "leverabler",
    label: "Leverabler",
    segment: "leverabler",
    status: "live",
    blurb: "Det vi levererar: renritning, exporter och beslutsunderlag.",
  },
  {
    key: "lessons",
    label: "Lessons Learned",
    segment: "lessons",
    status: "live",
    blurb: "Lärdomar och metodik värd att fånga, återanvända och lära ut.",
  },
  {
    key: "sammanfattning",
    label: "Sammanfattning",
    segment: "sammanfattning",
    status: "live",
    blurb: "Intressenter, restriktioner, viten & bonus och AB-avvikelser samlat.",
  },
  {
    key: "mangd",
    label: "Mängdförteckning",
    segment: "mangd",
    status: "live",
    blurb: "MF enligt AMA 23 — poster, mängder, à-priser och summor per sektion.",
  },
];

const ALL_NAV: NavItem[] = [OVERVIEW, ...PROJECT_MODULES, ...EXTRA_MODULES];

// Slå upp en NavItem på nyckel (över alla register, inkl. OVERVIEW och extra).
export function navItemByKey(key: string): NavItem | undefined {
  return ALL_NAV.find((m) => m.key === key);
}

export interface ResolvedGroup {
  section: string;
  items: NavItem[];
}

// Lös upp en enhets kurerade modulgrupper till NavItems (okända nycklar hoppas
// tyst över).
export function resolveModuleGroups(
  groups: { section: string; keys: string[] }[],
): ResolvedGroup[] {
  return groups.map((g) => ({
    section: g.section,
    items: g.keys
      .map(navItemByKey)
      .filter((x): x is NavItem => Boolean(x)),
  }));
}

// Bakåtkompatibelt alias (projektmodulernas placeholder-sidor).
export const MODULES = PROJECT_MODULES;

export function modulesFor(kind: UnitKind): NavItem[] {
  void kind;
  return PROJECT_MODULES;
}

export function navItemsFor(kind: UnitKind): NavItem[] {
  return [OVERVIEW, ...modulesFor(kind)];
}

export function getModule(key: string): NavItem | undefined {
  return [...PROJECT_MODULES, ...EXTRA_MODULES].find((m) => m.key === key);
}

export function moduleHref(basePath: string, segment: string | null): string {
  return segment ? `${basePath}/${segment}` : basePath;
}

// Interna ytor (topp-landningen, endast plattformsadmin).
export interface InternalArea {
  key: string;
  label: string;
  blurb: string;
  segment: string | null; // route under /intern/<segment> (null = ej byggd)
  status: ModuleStatus;
}

export const INTERNAL_AREAS: InternalArea[] = [
  {
    key: "dashboard",
    label: "Intern översikt",
    blurb: "Nyckeltal och status över alla kunder och projekt.",
    segment: null,
    status: "soon",
  },
  {
    key: "kunder",
    label: "Kunder & avtal",
    blurb: "Administrera kunder, kontaktpersoner och avtal.",
    segment: "kunder",
    status: "live",
  },
  {
    key: "playbook",
    label: "Playbook",
    blurb: "Så jobbar vi — processen genom ett uppdrag.",
    segment: "playbook",
    status: "live",
  },
  {
    key: "operator",
    label: "Operatör",
    blurb: "Starta LLM-sessioner grundade i de tre OS-filerna.",
    segment: "operator",
    status: "live",
  },
  {
    key: "deck",
    label: "Kick-off deck",
    blurb: "Presentationsdeck — operatörsmodellen, AI, plattformen.",
    segment: "deck",
    status: "live",
  },
  {
    key: "resurser",
    label: "Resurser",
    blurb: "Planerad beläggning och rapporterad tid — vem gör vad och vad blev gjort.",
    segment: "resurser",
    status: "live",
  },
  {
    key: "bibliotek",
    label: "Bibliotek",
    blurb: "Gemensamma dokument — mallar, policyer, kontrakt, kvalitetshandbok.",
    segment: "bibliotek",
    status: "live",
  },
  {
    key: "team",
    label: "Team",
    blurb: "Personer i leveransteamet med CV, kompetenser och referensuppdrag.",
    segment: "team",
    status: "live",
  },
  {
    key: "grafiskProfil",
    label: "Grafisk profil",
    blurb: "Färgpalett, typografi, logotyp och nedladdningsbara Word-mallar.",
    segment: "grafisk-profil",
    status: "live",
  },
  {
    key: "behorighet",
    label: "Användare & behörighet",
    blurb: "Användare, systemroller och åtkomst i plattformen.",
    segment: "behorighet",
    status: "live",
  },
];
