import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toMemberFull } from "@/lib/supabase/mappers";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain a number"),
});

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userName = request.headers.get("x-user-name") || "Unknown";

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const { data: row, error: findError } = await supabaseAdmin
      .from("members")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!row) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    const member = toMemberFull(row);

    const valid = await verifyPassword(currentPassword, member.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({
        password_hash: newHash,
        must_change_password: false,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    await logAudit({
      actorId: userId,
      actorName: userName,
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      targetId: userId,
      targetName: userName,
      details: "Password changed successfully",
    });

    // Issue new token with mustChangePassword = false
    const newToken = await signToken({
      sub: member.id,
      role: member.role,
      name: member.fullName,
      mustChangePassword: false,
    });

    const response = NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });

    response.cookies.set("new-era-token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
