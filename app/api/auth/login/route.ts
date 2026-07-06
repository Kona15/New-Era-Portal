import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toMemberFull } from "@/lib/supabase/mappers";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import { z } from "zod";

const loginSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { phone, password } = parsed.data;

    const { data: row, error: findError } = await supabaseAdmin
      .from("members")
      .select("*")
      .eq("phone", phone)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) throw findError;

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    const member = toMemberFull(row);

    if (member.status === "inactive") {
      return NextResponse.json(
        { success: false, error: "Your account has been deactivated. Contact an administrator." },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(password, member.passwordHash);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    const token = await signToken({
      sub: member.id,
      role: member.role,
      name: member.fullName,
      mustChangePassword: member.mustChangePassword,
    });

    await logAudit({
      actorId: member.id,
      actorName: member.fullName,
      action: AUDIT_ACTIONS.LOGIN,
      details: `Login from ${request.headers.get("x-forwarded-for") || "unknown IP"}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: member.id,
        name: member.fullName,
        role: member.role,
        mustChangePassword: member.mustChangePassword,
      },
    });

    response.cookies.set("new-era-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
