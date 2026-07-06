export type Role = "admin" | "member";
export type MemberStatus = "active" | "inactive" | "pending";

export interface MemberRow {
  id: string;
  full_name: string;
  phone: string;
  password_hash: string;
  role: Role;
  status: MemberStatus;
  must_change_password: boolean;
  graduation_year: string | null;
  occupation: string | null;
  address: string | null;
  date_joined: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PasswordResetRequestRow {
  id: string;
  member_id: string;
  status: string;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface FinancialYearRow {
  id: string;
  year: number;
  label: string;
  is_active: boolean;
  created_at: string;
}

export interface LedgerEntryRow {
  id: string;
  member_id: string;
  year_id: string;
  month: number;
  subscription: string;
  savings: string;
  interest: string;
  loan_repayment: string;
  social_fund: string;
  hosting_fund: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  target_id: string | null;
  target_name: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ImportLogRow {
  id: string;
  imported_by: string | null;
  file_name: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  status: string;
  report: string | null;
  created_at: string;
}

// Minimal Database shape so createClient<Database>() gives us
// typed .from(...) calls without needing the full generated types.
export interface Database {
  public: {
    Tables: {
      members: {
        Row: MemberRow;
        Insert: Partial<MemberRow> & {
          full_name: string;
          phone: string;
          password_hash: string;
        };
        Update: Partial<MemberRow>;
      };
      password_reset_requests: {
        Row: PasswordResetRequestRow;
        Insert: Partial<PasswordResetRequestRow> & { member_id: string };
        Update: Partial<PasswordResetRequestRow>;
      };
      financial_years: {
        Row: FinancialYearRow;
        Insert: Partial<FinancialYearRow> & { year: number; label: string };
        Update: Partial<FinancialYearRow>;
      };
      ledger_entries: {
        Row: LedgerEntryRow;
        Insert: Partial<LedgerEntryRow> & {
          member_id: string;
          year_id: string;
          month: number;
        };
        Update: Partial<LedgerEntryRow>;
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Partial<AuditLogRow> & { actor_name: string; action: string };
        Update: Partial<AuditLogRow>;
      };
      import_logs: {
        Row: ImportLogRow;
        Insert: Partial<ImportLogRow> & { file_name: string };
        Update: Partial<ImportLogRow>;
      };
    };
  };
}
