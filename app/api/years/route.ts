import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toFinancialYearDTO } from "@/lib/supabase/mappers";
import { z } from "zod";

const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  label: z.string().min(1),
  isActive: z.boolean().default(false),
});

export async function GET() {
  try {
    const { data: rows, error } = await supabaseAdmin
      .from("financial_years")
      .select("*")
      .order("year", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: (rows || []).map(toFinancialYearDTO) });
  } catch (error) {
    console.error("Get years error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
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

    if (parsed.data.isActive) {
      // Deactivate all other years
      const { error: deactivateError } = await supabaseAdmin
        .from("financial_years")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (deactivateError) throw deactivateError;
    }

    const { data: year, error: insertError } = await supabaseAdmin
      .from("financial_years")
      .insert({
        year: parsed.data.year,
        label: parsed.data.label,
        is_active: parsed.data.isActive,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, data: toFinancialYearDTO(year) }, { status: 201 });
  } catch (error) {
    console.error("Create year error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, isActive } = body;

    if (isActive) {
      const { error: deactivateError } = await supabaseAdmin
        .from("financial_years")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (deactivateError) throw deactivateError;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("financial_years")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: toFinancialYearDTO(updated) });
  } catch (error) {
    console.error("Update year error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
