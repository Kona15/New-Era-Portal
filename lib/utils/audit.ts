import { supabaseAdmin } from "@/lib/supabase/server";

export interface AuditEntry {
  actorId?: string;
  actorName: string;
  action: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      action: entry.action,
      target_id: entry.targetId,
      target_name: entry.targetName,
      details: entry.details,
      ip_address: entry.ipAddress,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

export const AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  MEMBER_CREATE: "MEMBER_CREATE",
  MEMBER_UPDATE: "MEMBER_UPDATE",
  MEMBER_DELETE: "MEMBER_DELETE",
  MEMBER_ACTIVATE: "MEMBER_ACTIVATE",
  MEMBER_DEACTIVATE: "MEMBER_DEACTIVATE",
  PASSWORD_RESET: "PASSWORD_RESET",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  LEDGER_UPDATE: "LEDGER_UPDATE",
  IMPORT: "IMPORT",
  EXPORT: "EXPORT",
  FINANCIAL_YEAR_CREATE: "FINANCIAL_YEAR_CREATE",
} as const;
