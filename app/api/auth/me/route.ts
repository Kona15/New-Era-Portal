import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toMemberDTO } from "@/lib/supabase/mappers";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: row, error } = await supabaseAdmin
      .from("members")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!row) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: toMemberDTO(row) });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
