// Ikon-mappning för pm_disciplines.icon_name → lucide-komponent.
// Plockade ikoner från PM Cloud:s getSystemIcon-mönster, anpassade för
// bygg/anläggnings-discipliner.

import {
  Building2,
  HardHat,
  Box,
  Wrench,
  Zap,
  Wind,
  Droplet,
  Flame,
  TreePine,
  Mountain,
  Hexagon,
  Lightbulb,
  Volume2,
  Cog,
  Layers,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  building: Building2,       // Arkitektur
  hardhat: HardHat,          // Konstruktion / Geoteknik
  box: Box,                  // System / generisk teknik
  wrench: Wrench,            // Generell teknik
  zap: Zap,                  // El
  wind: Wind,                // Ventilation
  droplet: Droplet,          // VVS / VA
  flame: Flame,              // Brand
  treepine: TreePine,        // Landskap
  mountain: Mountain,        // Mark / pålning
  hexagon: Hexagon,          // BIM
  lightbulb: Lightbulb,      // Belysning
  volume: Volume2,           // Akustik
  cog: Cog,                  // Styr / hiss
  layers: Layers,            // Default
};

export const DISCIPLINE_ICON_NAMES = Object.keys(ICONS);

// Default-ikoner per discipline-kod (PM Cloud-konvention).
const CODE_DEFAULTS: Record<string, string> = {
  A: "building",
  K: "hardhat",
  E: "zap",
  V: "wind",
  VS: "droplet",
  VA: "droplet",
  BR: "flame",
  L: "treepine",
  M: "mountain",
  G: "mountain",
  D: "hexagon",
  BL: "lightbulb",
  AK: "volume",
  EX: "lightbulb",
  PL: "cog",
  P: "layers",
  C: "layers",
  ÖVR: "layers",
};

export function disciplineIcon(name: string | null, code?: string): LucideIcon {
  if (name && ICONS[name]) return ICONS[name];
  if (code && CODE_DEFAULTS[code] && ICONS[CODE_DEFAULTS[code]]) {
    return ICONS[CODE_DEFAULTS[code]];
  }
  return Layers;
}

export function defaultIconForCode(code: string): string {
  return CODE_DEFAULTS[code] ?? "layers";
}
