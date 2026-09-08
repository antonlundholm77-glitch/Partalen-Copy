// Gemensamt projekt-schema (ProjectDoc) — EN källa för formen på ett projekt/enhet.
// zod ger både runtime-validering (import/export) och TypeScript-typer (z.infer).
// Detta är transportformatet för JSON import/export och, längre fram, mappningen
// mot Supabase (relationellt + JSONB). Se docs/plan: konsolidering & migrering.
//
// Filen är en LEAF — den importerar inga andra lib-moduler (utom type-only från
// lib/types för enum-likhetsassertioner), så project-content.ts m.fl. kan derivera
// sina typer härifrån utan cykler.

import { z } from "zod";
import type {
  AmaCode,
  MfRow,
  ProjectPhase,
  ProjectStatus,
  TbEntry,
  UnitRole,
} from "@/lib/types";

export const CURRENT_SCHEMA_VERSION = 1 as const;

// ── enums (redeklarerade som zod; likhet mot lib/types säkras av asserts nedan) ──
export const PhaseEnum = z.enum([
  "forstudie",
  "projektering",
  "upphandling",
  "anbud",
  "utforande",
  "overlamning",
  "forvaltning",
]);
export const StatusEnum = z.enum(["pagaende", "vilande", "arkiverat"]);
export const UnitRoleEnum = z.enum(["manager", "member", "viewer", "larare", "deltagare"]);
export const KindEnum = z.enum(["entreprenad"]);
export const CertaintyEnum = z.enum(["kant", "tolkat", "osakert"]);

// ── rikt innehåll (speglar lib/project-content.ts 1:1) ──
export const ObservationSchema = z.object({
  id: z.string(),
  note: z.string(),
  object: z.string().optional(),
  status: z.enum(["kopplad", "stopp", "ny"]).optional(),
});

export const ProjectQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const TechObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  certainty: CertaintyEnum,
  note: z.string().optional(),
});

export const DeliverableSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: z.string().optional(),
  status: z.enum(["klar", "pagar", "planerad"]),
  note: z.string().optional(),
});

export const LessonSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const DocFolderSchema = z.object({
  name: z.string(),
  files: z.array(
    z.object({
      name: z.string(),
      meta: z.string().optional(),
      status: z.enum(["underlag", "leverans", "platshallare"]).optional(),
    }),
  ),
});

export const SchematicNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  sub: z.string().optional(),
  x: z.number(),
  y: z.number(),
  certainty: CertaintyEnum,
});

export const SchematicEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  certainty: CertaintyEnum,
  issue: z.literal("stopp").optional(),
});

export const DrawingPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  node: z.string().optional(),
});

export const DrawingObservationSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  status: z.enum(["kopplad", "stopp", "ny"]).optional(),
  label: z.string().optional(),
});

export const DrawingNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.string(),
  x: z.number(),
  y: z.number(),
  certainty: CertaintyEnum.optional(),
});

export const DrawingPipeSchema = z.object({
  id: z.string(),
  certainty: CertaintyEnum,
  issue: z.literal("stopp").optional(),
  label: z.string().optional(),
  labelPos: DrawingPointSchema.optional(),
  points: z.array(DrawingPointSchema),
});

export const DrawingBackgroundSchema = z.object({
  id: z.string(),
  label: z.string(),
  src: z.string(),
});

export const DrawingTextSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  text: z.string(),
  size: z.number().optional(),
});

export const DrawingSchema = z.object({
  backgrounds: z.array(DrawingBackgroundSchema),
  w: z.number(),
  h: z.number(),
  intro: z.string().optional(),
  observations: z.array(DrawingObservationSchema),
  nodes: z.array(DrawingNodeSchema),
  pipes: z.array(DrawingPipeSchema),
  texts: z.array(DrawingTextSchema).optional(),
});

export const ProjectContentSchema = z.object({
  purpose: z.string().optional(),
  observations: z.array(ObservationSchema).optional(),
  questions: z.array(ProjectQuestionSchema).optional(),
  objects: z.array(TechObjectSchema).optional(),
  deliverables: z.array(DeliverableSchema).optional(),
  lessons: z.array(LessonSchema).optional(),
  documents: z
    .object({ intro: z.string().optional(), folders: z.array(DocFolderSchema) })
    .optional(),
  schematic: z
    .object({
      intro: z.string().optional(),
      nodes: z.array(SchematicNodeSchema),
      edges: z.array(SchematicEdgeSchema),
    })
    .optional(),
  drawing: DrawingSchema.optional(),
});

// ── modul/portal-config (speglar PreviewUnit.moduleGroups / .portal) ──
export const ModuleGroupSchema = z.object({
  section: z.string(),
  keys: z.array(z.string()),
});

export const PortalSchema = z.object({
  src: z.string(),
  sections: z.record(z.string(), z.string()),
});

// ── AMA-paket (speglar lib/types.ts) ──
export const AmaCodeSchema = z.object({
  code: z.string(),
  parent_code: z.string().nullable(),
  title: z.string(),
  sort: z.number(),
});

export const TbEntrySchema = z.object({
  id: z.string(),
  project_id: z.string(),
  ama_code: z.string(),
  text: z.string(),
});

export const MfRowSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  ama_code: z.string(),
  description: z.string(),
  unit: z.string().nullable(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  amount: z.number().nullable(),
  sort: z.number(),
});

// ── team & uppdrag ──
// OBS: roller/inbjudningar är säkerhetskänsliga. Schemat är lossless, men en
// importrutin får ALDRIG tyst tillämpa team — se applier (karantän, default ignorera).
export const ProjectTeamSchema = z.object({
  members: z.array(z.object({ personId: z.string(), role: UnitRoleEnum })),
  invites: z.array(z.object({ email: z.string(), role: z.string() })),
  assignment: z
    .object({ uppdrag: z.string(), beskrivning: z.string(), operator: z.string() })
    .optional(),
});

// ── topp-dokument ──
export const ProjectDocSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  identity: z.object({ org: z.string(), unit: z.string() }),
  metadata: z.object({
    name: z.string(),
    meta: z.string(),
    hasData: z.boolean(),
    kind: KindEnum.optional(),
    program: z.string().optional(),
    edition: z.string().nullable().optional(),
    phase: PhaseEnum.optional(),
    status: StatusEnum.optional(),
  }),
  content: ProjectContentSchema,
  ama: z.object({
    codes: z.array(AmaCodeSchema),
    tb: z.array(TbEntrySchema),
    mf: z.array(MfRowSchema),
  }),
  modules: z.object({
    groups: z.array(ModuleGroupSchema).optional(),
    portal: PortalSchema.optional(),
  }),
  team: ProjectTeamSchema,
});

// ── inferred typer (project-content.ts deriverar sina typer härifrån) ──
export type Certainty = z.infer<typeof CertaintyEnum>;
export type Observation = z.infer<typeof ObservationSchema>;
export type ProjectQuestion = z.infer<typeof ProjectQuestionSchema>;
export type TechObject = z.infer<typeof TechObjectSchema>;
export type Deliverable = z.infer<typeof DeliverableSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type DocFolder = z.infer<typeof DocFolderSchema>;
export type SchematicNode = z.infer<typeof SchematicNodeSchema>;
export type SchematicEdge = z.infer<typeof SchematicEdgeSchema>;
export type DrawingPoint = z.infer<typeof DrawingPointSchema>;
export type DrawingObservation = z.infer<typeof DrawingObservationSchema>;
export type DrawingNode = z.infer<typeof DrawingNodeSchema>;
export type DrawingPipe = z.infer<typeof DrawingPipeSchema>;
export type DrawingBackground = z.infer<typeof DrawingBackgroundSchema>;
export type DrawingText = z.infer<typeof DrawingTextSchema>;
export type Drawing = z.infer<typeof DrawingSchema>;
export type ProjectContent = z.infer<typeof ProjectContentSchema>;
export type ModuleGroup = z.infer<typeof ModuleGroupSchema>;
export type ProjectDoc = z.infer<typeof ProjectDocSchema>;

// Identitetsnyckel — matchar dagens "<org>/<unit>"-konvention i fixturerna.
export function projectKey(org: string, unit: string): string {
  return `${org}/${unit}`;
}

// ── compile-time: zod-enums får inte drifta från lib/types (DB-källan) ──
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
// Om någon av dessa blir röd har en enum/typ glidit isär mellan zod och lib/types.
type _PhaseOk = Assert<Equals<z.infer<typeof PhaseEnum>, ProjectPhase>>;
type _StatusOk = Assert<Equals<z.infer<typeof StatusEnum>, ProjectStatus>>;
type _UnitRoleOk = Assert<Equals<z.infer<typeof UnitRoleEnum>, UnitRole>>;
type _AmaCodeOk = Assert<Equals<z.infer<typeof AmaCodeSchema>, AmaCode>>;
type _TbOk = Assert<Equals<z.infer<typeof TbEntrySchema>, TbEntry>>;
type _MfOk = Assert<Equals<z.infer<typeof MfRowSchema>, MfRow>>;
