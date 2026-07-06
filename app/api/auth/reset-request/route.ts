import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { data: member, error: findError } = await supabaseAdmin
      .from("members")
      .select("id, full_name")
      .eq("phone", parsed.data.phone)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) throw findError;

    // Always return success to prevent phone enumeration
    if (!member) {
      return NextResponse.json({
        success: true,
        message: "If this phone number is registered, a reset request has been submitted.",
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from("password_reset_requests")
      .insert({ member_id: member.id, status: "pending" });

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: "Reset request submitted. Please contact your administrator.",
    });
  } catch (error) {
    console.error("Reset request error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred." },
      { status: 500 }
    );
  }
}
