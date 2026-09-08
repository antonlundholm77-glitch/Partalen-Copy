// Statiskt projektinnehåll (mockdata) för kurerade Project OS-ytor utan
// Supabase-backend. Nyckel: "<org>/<enhet>". Moduler (Observationer, Tekniska
// objekt, Leverabler, Lessons, Dokument, Karta) läser härifrån; saknas posten
// faller modulen tillbaka till ett ärligt tomt skal.

// Typerna för projektinnehåll bor nu i det gemensamma schemat (zod) i
// lib/schema/project-doc.ts. Vi re-exporterar dem här under samma namn så att
// alla befintliga importer (ProjectContentViews, DrawingEditor, SchematicMap …)
// är oförändrade.
export type {
  Certainty,
  Observation,
  ProjectQuestion,
  TechObject,
  Deliverable,
  Lesson,
  DocFolder,
  SchematicNode,
  SchematicEdge,
  DrawingPoint,
  DrawingObservation,
  DrawingNode,
  DrawingPipe,
  DrawingBackground,
  DrawingText,
  Drawing,
  ProjectContent,
} from "@/lib/schema/project-doc";

import type { ProjectContent } from "@/lib/schema/project-doc";

export const PROJECT_CONTENT: Record<string, ProjectContent> = {};

export function projectContent(org: string, id: string): ProjectContent | undefined {
  return PROJECT_CONTENT[`${org}/${id}`];
}
