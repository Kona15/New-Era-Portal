import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toResetRequestDTO } from "@/lib/supabase/mappers";

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: rows, error } = await supabaseAdmin
      .from("password_reset_requests")
      .select("*, members(full_name, phone)")
      .eq("status", "pending")
      .order("requested_at", { ascending: false });

    if (error) throw error;

    const data = (rows || []).map((r) =>
      toResetRequestDTO({
        ...r,
        memberName: (r as unknown as { members?: { full_name?: string } }).members?.full_name,
        memberPhone: (r as unknown as { members?: { phone?: string } }).members?.phone,
      })
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get reset requests error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
