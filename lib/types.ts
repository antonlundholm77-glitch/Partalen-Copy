// Lättviktiga DB-typer som speglar supabase/migrations/0001_init.sql.
// När schemat stabiliserats kan dessa genereras med:
//   supabase gen types typescript --linked > lib/database.types.ts

export type Role = "owner" | "admin" | "member";
export type ProjectStatus = "pagaende" | "vilande" | "arkiverat";
export type ProjectPhase =
  | "forstudie"
  | "projektering"
  | "upphandling"
  | "anbud"
  | "utforande"
  | "overlamning"
  | "forvaltning";
export type DocumentKind = "TB" | "MF" | "AMA_CHECK";
export type DocumentStatus = "arbetsmaterial" | "granskning" | "godkand";
export type SystemRole = "superadmin" | "support" | "readonly";
export type UnitRole = "manager" | "member" | "viewer" | "larare" | "deltagare";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface AmaCode {
  code: string;
  parent_code: string | null;
  title: string;
  sort: number;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  slug: string | null;
  ama_edition: string | null;
  contract_form: string | null;
  phase: ProjectPhase;
  status: ProjectStatus;
  created_at: string;
}

export interface TbEntry {
  id: string;
  project_id: string;
  ama_code: string;
  text: string;
}

export interface MfRow {
  id: string;
  project_id: string;
  ama_code: string;
  description: string;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  sort: number;
}

// Minimal Database-shape för @supabase/ssr generics.
export interface Database {
  public: {
    Tables: {
      gf_organizations: {
        Row: { id: string; name: string; slug: string | null; created_at: string };
      };
      gf_memberships: {
        Row: { user_id: string; org_id: string; role: Role; created_at: string };
      };
      gf_ama_codes: { Row: AmaCode };
      gf_projects: { Row: Project };
      gf_tb_entries: { Row: TbEntry };
      gf_mf_rows: { Row: MfRow };
      gf_ama_checklists: {
        Row: { id: string; project_id: string; ama_code: string; items: unknown };
      };
      gf_profiles: {
        Row: { user_id: string; email: string | null; full_name: string | null };
      };
      gf_system_roles: { Row: { user_id: string; role: SystemRole } };
      gf_unit_members: {
        Row: { user_id: string; project_id: string; role: UnitRole };
      };
      gf_invitations: {
        Row: {
          id: string;
          email: string;
          org_id: string;
          project_id: string | null;
          role: string;
          token: string;
          invited_by: string | null;
          status: InviteStatus;
          expires_at: string;
          created_at: string;
        };
      };
      gf_documents: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          phase: string | null;
          discipline: string | null;
          status: DocumentStatus;
          current_version: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          name: string;
          phase?: string | null;
          discipline?: string | null;
          status?: DocumentStatus;
          current_version?: number;
        };
        Update: {
          name?: string;
          phase?: string | null;
          discipline?: string | null;
          status?: DocumentStatus;
          current_version?: number;
        };
      };
      gf_document_versions: {
        Row: {
          id: string;
          document_id: string;
          project_id: string;
          version: number;
          storage_path: string;
          size: number | null;
          mime: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          document_id: string;
          project_id: string;
          version: number;
          storage_path: string;
          size?: number | null;
          mime?: string | null;
        };
      };
      // Tidplan-modulen (migration 0019) — protokoll-disciplinerad
      gf_schedules: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          kind: string;
          status: string;
          calendar_id: string | null;
          project_start_date: string | null;
          data_date: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          project_id: string;
          name: string;
          kind?: string;
          status?: string;
          calendar_id?: string | null;
          project_start_date?: string | null;
          data_date?: string | null;
        };
        Update: {
          name?: string;
          kind?: string;
          status?: string;
          calendar_id?: string | null;
          project_start_date?: string | null;
          data_date?: string | null;
        };
      };
      gf_tasks: {
        Row: {
          id: string;
          schedule_id: string;
          parent_id: string | null;
          external_uid: string | null;
          wbs_code: string | null;
          name: string;
          type: string;
          planned_start: string | null;
          planned_end: string | null;
          planned_duration_days: number | null;
          baseline_start: string | null;
          baseline_end: string | null;
          actual_start: string | null;
          actual_end: string | null;
          percent_complete: number;
          constraint_type: string;
          constraint_date: string | null;
          computed_early_start: string | null;
          computed_early_finish: string | null;
          computed_late_start: string | null;
          computed_late_finish: string | null;
          total_float_days: number | null;
          free_float_days: number | null;
          is_critical: boolean;
          sort_order: number;
          discipline_id: string | null;
          deliverable_id: string | null;
          responsible: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          schedule_id: string;
          parent_id?: string | null;
          external_uid?: string | null;
          wbs_code?: string | null;
          name: string;
          type?: string;
          planned_start?: string | null;
          planned_end?: string | null;
          planned_duration_days?: number | null;
          percent_complete?: number;
          constraint_type?: string;
          constraint_date?: string | null;
          sort_order?: number;
          discipline_id?: string | null;
          deliverable_id?: string | null;
          responsible?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          wbs_code?: string | null;
          planned_start?: string | null;
          planned_end?: string | null;
          planned_duration_days?: number | null;
          actual_start?: string | null;
          actual_end?: string | null;
          percent_complete?: number;
          constraint_type?: string;
          constraint_date?: string | null;
          computed_early_start?: string | null;
          computed_early_finish?: string | null;
          computed_late_start?: string | null;
          computed_late_finish?: string | null;
          total_float_days?: number | null;
          free_float_days?: number | null;
          is_critical?: boolean;
          sort_order?: number;
          discipline_id?: string | null;
          deliverable_id?: string | null;
          responsible?: string | null;
          notes?: string | null;
        };
      };
      gf_task_dependencies: {
        Row: {
          id: string;
          schedule_id: string;
          predecessor_id: string;
          successor_id: string;
          type: string;
          lag_days: number;
          created_at: string;
        };
        Insert: {
          schedule_id: string;
          predecessor_id: string;
          successor_id: string;
          type?: string;
          lag_days?: number;
        };
      };
      gf_calendars: {
        Row: {
          id: string;
          customer_id: string | null;
          ref: string;
          name: string;
          description: string | null;
          working_days: number[];
          working_hours_per_day: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          customer_id?: string | null;
          ref: string;
          name: string;
          description?: string | null;
          working_days?: number[];
          working_hours_per_day?: number;
        };
      };
      gf_calendar_exceptions: {
        Row: {
          id: string;
          calendar_id: string;
          date: string;
          type: string;
          hours: number | null;
          label: string | null;
        };
        Insert: {
          calendar_id: string;
          date: string;
          type: string;
          hours?: number | null;
          label?: string | null;
        };
      };
      gf_schedule_baselines: {
        Row: {
          id: string;
          schedule_id: string;
          name: string;
          snapshot_at: string;
          snapshot_data: unknown;
          created_by: string | null;
        };
        Insert: {
          schedule_id: string;
          name: string;
          snapshot_data: unknown;
        };
      };
    };
  };
}
