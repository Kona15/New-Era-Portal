import type {
  MemberRow,
  LedgerEntryRow,
  FinancialYearRow,
  AuditLogRow,
  ImportLogRow,
  PasswordResetRequestRow,
} from "./types";

// These mappers exist so every API route can keep returning the exact
// same camelCase JSON shape the frontend already expects (this mirrors
// what drizzle-orm returned automatically), even though Supabase's
// Postgres columns are snake_case.

type MemberDTOInput = Pick<
  MemberRow,
  | "id"
  | "full_name"
  | "phone"
  | "role"
  | "status"
  | "must_change_password"
  | "graduation_year"
  | "occupation"
  | "address"
  | "date_joined"
  | "created_at"
  | "updated_at"
>;

export function toMemberDTO(row: MemberDTOInput) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    mustChangePassword: row.must_change_password,
    graduationYear: row.graduation_year,
    occupation: row.occupation,
    address: row.address,
    dateJoined: row.date_joined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Includes passwordHash — only ever use internally (login, password checks),
// never return this straight from an API response.
export function toMemberFull(row: MemberRow) {
  return {
    ...toMemberDTO(row),
    passwordHash: row.password_hash,
    deletedAt: row.deleted_at,
  };
}

export function toLedgerEntryDTO(row: LedgerEntryRow) {
  return {
    id: row.id,
    memberId: row.member_id,
    yearId: row.year_id,
    month: row.month,
    subscription: row.subscription,
    savings: row.savings,
    interest: row.interest,
    loanRepayment: row.loan_repayment,
    socialFund: row.social_fund,
    hostingFund: row.hosting_fund,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function toFinancialYearDTO(row: FinancialYearRow) {
  return {
    id: row.id,
    year: row.year,
    label: row.label,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function toAuditLogDTO(row: AuditLogRow) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    targetId: row.target_id,
    targetName: row.target_name,
    details: row.details,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

export function toImportLogDTO(row: ImportLogRow) {
  return {
    id: row.id,
    importedBy: row.imported_by,
    fileName: row.file_name,
    totalRows: row.total_rows,
    successRows: row.success_rows,
    failedRows: row.failed_rows,
    status: row.status,
    report: row.report,
    createdAt: row.created_at,
  };
}

export function toResetRequestDTO(
  row: PasswordResetRequestRow & { memberName?: string; memberPhone?: string }
) {
  return {
    id: row.id,
    memberId: row.member_id,
    status: row.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    memberName: row.memberName,
    memberPhone: row.memberPhone,
  };
}
