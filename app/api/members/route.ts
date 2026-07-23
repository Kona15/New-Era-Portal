import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toMemberDTO } from "@/lib/supabase/mappers";
import { hashPassword } from "@/lib/auth/password";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import { z } from "zod";

const createSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(7, "Valid phone number required"),
  graduationYear: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

const EXCLUDED_PHONE = "08000000000";

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("members")
      .select(
        "id, full_name, phone, role, status, must_change_password, graduation_year, occupation, address, date_joined, created_at, updated_at",
        { count: "exact" }
      )
      .is("deleted_at", null)
      .neq("phone", EXCLUDED_PHONE);

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%,occupation.ilike.%${search}%`
      );
    }

    if (status && ["active", "inactive", "pending"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data: rows, error, count } = await query
      .order("full_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const total = count ?? 0;

    return NextResponse.json({
      success: true,
      data: (rows || []).map(toMemberDTO),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List members error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actorId = request.headers.get("x-user-id");
    const actorName = request.headers.get("x-user-name") || "Admin";
    const role = request.headers.get("x-user-role");

    if (role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fullName, phone, graduationYear, occupation, address, role: memberRole } = parsed.data;

    const { data: existing, error: findError } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("phone", phone)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A member with this phone number already exists" },
        { status: 409 }
      );
    }

    const defaultPassword = process.env.DEFAULT_MEMBER_PASSWORD || "Idanrenewera";
    const passwordHash = await hashPassword(defaultPassword);

    const { data: newRow, error: insertError } = await supabaseAdmin
      .from("members")
      .insert({
        full_name: fullName,
        phone,
        password_hash: passwordHash,
        role: memberRole,
        status: "pending",
        must_change_password: true,
        graduation_year: graduationYear,
        occupation,
        address,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    await logAudit({
      actorId: actorId || undefined,
      actorName,
      action: AUDIT_ACTIONS.MEMBER_CREATE,
      targetId: newRow.id,
      targetName: fullName,
      details: `Created member with phone ${phone}`,
    });

    return NextResponse.json({ success: true, data: toMemberDTO(newRow) }, { status: 201 });
  } catch (error) {
    console.error("Create member error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
