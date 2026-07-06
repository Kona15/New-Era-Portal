import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toMemberDTO } from "@/lib/supabase/mappers";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import { z } from "zod";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  graduationYear: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  role: z.enum(["admin", "member"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const { id } = params;

    // Members can only view their own profile
    if (userRole !== "admin" && userId !== id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: row, error } = await supabaseAdmin
      .from("members")
      .select(
        "id, full_name, phone, role, status, must_change_password, graduation_year, occupation, address, date_joined, created_at, updated_at"
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;

    if (!row) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: toMemberDTO(row) });
  } catch (error) {
    console.error("Get member error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.fullName !== undefined) updates.full_name = parsed.data.fullName;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.graduationYear !== undefined) updates.graduation_year = parsed.data.graduationYear;
    if (parsed.data.occupation !== undefined) updates.occupation = parsed.data.occupation;
    if (parsed.data.address !== undefined) updates.address = parsed.data.address;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("members")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    await logAudit({
      actorId: actorId || undefined,
      actorName,
      action: AUDIT_ACTIONS.MEMBER_UPDATE,
      targetId: id,
      targetName: updated.full_name,
      details: `Updated: ${JSON.stringify(parsed.data)}`,
    });

    return NextResponse.json({ success: true, data: toMemberDTO(updated) });
  } catch (error) {
    console.error("Update member error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const nowIso = new Date().toISOString();

    const { data: deleted, error: updateError } = await supabaseAdmin
      .from("members")
      .update({ deleted_at: nowIso, updated_at: nowIso })
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    await logAudit({
      actorId: actorId || undefined,
      actorName,
      action: AUDIT_ACTIONS.MEMBER_DELETE,
      targetId: id,
      targetName: deleted.full_name,
      details: "Soft deleted",
    });

    return NextResponse.json({ success: true, message: "Member deleted" });
  } catch (error) {
    console.error("Delete member error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
