import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth/password";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actorId = request.headers.get("x-user-id");
    const actorName = request.headers.get("x-user-name") || "Admin";
    const userRole = request.headers.get("x-user-role");
    const { id } = params;

    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: member, error: findError } = await supabaseAdmin
      .from("members")
      .select("id, full_name")
      .eq("id", id)
      .maybeSingle();

    if (findError) throw findError;

    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    const defaultPassword = process.env.DEFAULT_MEMBER_PASSWORD || "Idanrenewera";
    const newHash = await hashPassword(defaultPassword);

    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({
        password_hash: newHash,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Resolve any pending reset requests for this member
    const { error: resolveError } = await supabaseAdmin
      .from("password_reset_requests")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: actorId || undefined,
      })
      .eq("member_id", id)
      .eq("status", "pending");

    if (resolveError) throw resolveError;

    await logAudit({
      actorId: actorId || undefined,
      actorName,
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      targetId: id,
      targetName: member.full_name,
      details: "Password reset to default by administrator",
    });

    return NextResponse.json({
      success: true,
      message: `Password reset for ${member.full_name}. They must change it on next login.`,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
