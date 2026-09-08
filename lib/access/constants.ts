// Portat från PM Cloud src/lib/access/constants.ts. Statiska kodlistor för
// klassificeringskoder på dokument: {TEKNIK}-{B1}[-{B2}][-{ROLL}].

export interface CodeEntry {
  code: string;
  sv: string;
  en: string;
}

export interface CommercialAccessEntry extends CodeEntry {
  // Hierarki: AVT (2) ⊃ AVTB (1). UTF saknar rank → parallell.
  rank?: number;
}

export const DISCIPLINES: ReadonlyArray<CodeEntry> = [
  { code: "A",   sv: "Arkitektur",                          en: "Architecture" },
  { code: "AK",  sv: "Akustik",                             en: "Acoustics" },
  { code: "BL",  sv: "Belysning och ljusdesign",            en: "Lighting & light design" },
  { code: "BR",  sv: "Brand",                               en: "Fire safety" },
  { code: "C",   sv: "Teknikövergripande samordning",       en: "Cross-discipline coordination" },
  { code: "D",   sv: "Digital projekthantering/BIM",        en: "BIM / digital project mgmt" },
  { code: "E",   sv: "El",                                  en: "Electrical" },
  { code: "EX",  sv: "Energi",                              en: "Energy" },
  { code: "G",   sv: "Geoteknik",                           en: "Geotechnics" },
  { code: "K",   sv: "Konstruktion",                        en: "Structural" },
  { code: "L",   sv: "Landskap",                            en: "Landscape" },
  { code: "M",   sv: "Mark",                                en: "Site / ground" },
  { code: "P",   sv: "Projekt- och entreprenadgemensamt",   en: "Project / contract common" },
  { code: "V",   sv: "Ventilation",                         en: "Ventilation" },
  { code: "VA",  sv: "VA",                                  en: "Water & sewer" },
  { code: "VS",  sv: "VS",                                  en: "Plumbing & heating" },
  { code: "ÖVR", sv: "Övrigt",                              en: "Other" },
];

// Discipliner vars dokument är synliga oavsett discipline-tilldelning.
export const SHARED_DISCIPLINES: ReadonlyArray<string> = ["P", "C"];

export const PERMISSION_LEVELS: ReadonlyArray<CodeEntry> = [
  { code: "ADMH", sv: "Huvudadministratör",     en: "Main administrator" },
  { code: "ADMU", sv: "Projektadministratör",   en: "Project administrator" },
  { code: "INT",  sv: "Intern användare",       en: "Internal user" },
  { code: "EXT",  sv: "Extern användare",       en: "External user" },
  { code: "GST",  sv: "Gästanvändare",          en: "Guest user (read-only)" },
];

export const COMMERCIAL_ACCESS_LEVELS: ReadonlyArray<CommercialAccessEntry> = [
  { code: "AVT",  sv: "Avtalsbehörighet",           en: "Contract access",         rank: 2 },
  { code: "AVTB", sv: "Begränsad avtalsbehörighet", en: "Limited contract access", rank: 1 },
  { code: "UTF",  sv: "Utförarbehörighet",          en: "Performer access" },
];

export const PROJECT_ROLES: ReadonlyArray<CodeEntry> = [
  { code: "PL",  sv: "Projektledare",                  en: "Project manager" },
  { code: "PrL", sv: "Projekteringsledare",            en: "Design manager" },
  { code: "PC",  sv: "Platschef",                      en: "Site manager" },
  { code: "P",   sv: "Projektör",                      en: "Designer" },
  { code: "EK",  sv: "Ekonomi",                        en: "Finance" },
  { code: "CEX", sv: "Sakkunnig energiexpert",         en: "Certified energy expert" },
  { code: "EX",  sv: "Energiexpert",                   en: "Energy expert" },
  { code: "G",   sv: "Geotekniker",                    en: "Geotechnical engineer" },
  { code: "KAL", sv: "Kalkyl",                         en: "Cost estimator" },
  { code: "BH",  sv: "Byggherre / byggherreombud",     en: "Owner / owner representative" },
  { code: "BO",  sv: "Beställarens ombud",             en: "Client's representative" },
  { code: "EO",  sv: "Entreprenörens ombud",           en: "Contractor's representative" },
  { code: "KA",  sv: "Kontrollansvarig PBL",           en: "Building control officer (PBL)" },
  { code: "AL",  sv: "Arbetsledare",                   en: "Foreman" },
  { code: "SAM", sv: "Samordnare / Entreprenadingenjör", en: "Coordinator / contract engineer" },
  { code: "TF",  sv: "Teknisk förvaltare",             en: "Technical facility manager" },
];

// Lookups
const indexBy = <T extends { code: string }>(list: ReadonlyArray<T>): Record<string, T> =>
  Object.fromEntries(list.map((e) => [e.code, e]));

const DISCIPLINE_INDEX = indexBy(DISCIPLINES);
const PERMISSION_LEVEL_INDEX = indexBy(PERMISSION_LEVELS);
const COMMERCIAL_ACCESS_INDEX = indexBy(COMMERCIAL_ACCESS_LEVELS);
const PROJECT_ROLE_INDEX = indexBy(PROJECT_ROLES);

export const getDiscipline = (code: string): CodeEntry | undefined => DISCIPLINE_INDEX[code];
export const getPermissionLevel = (code: string): CodeEntry | undefined =>
  PERMISSION_LEVEL_INDEX[code];
export const getCommercialAccess = (code: string): CommercialAccessEntry | undefined =>
  COMMERCIAL_ACCESS_INDEX[code];
export const getProjectRole = (code: string): CodeEntry | undefined => PROJECT_ROLE_INDEX[code];

export const isValidDiscipline = (code: string): boolean => code in DISCIPLINE_INDEX;
export const isValidPermissionLevel = (code: string): boolean => code in PERMISSION_LEVEL_INDEX;
export const isValidCommercialAccess = (code: string): boolean => code in COMMERCIAL_ACCESS_INDEX;
export const isValidRole = (code: string): boolean => code in PROJECT_ROLE_INDEX;
