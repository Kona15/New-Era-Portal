import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toLedgerEntryDTO, toFinancialYearDTO } from "@/lib/supabase/mappers";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import { z } from "zod";

const upsertSchema = z.object({
  memberId: z.string().uuid(),
  yearId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  subscription: z.union([z.string(), z.number()]).transform((value) => String(value)).default("0.00"),
  savings: z.union([z.string(), z.number()]).transform((value) => String(value)).default("0.00"),
  interest: z.union([z.string(), z.number()]).transform((value) => String(value)).default("0.00"),
  loanRepayment: z.union([z.string(), z.number()]).transform((value) => String(value)).default("0.00"),
  socialFund: z.union([z.string(), z.number()]).transform((value) => String(value)).default("0.00"),
  hostingFund: z.union([z.string(), z.number()]).transform((value) => String(value)).default("0.00"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const { searchParams } = new URL(request.url);

    const memberId = searchParams.get("memberId");
    const yearId = searchParams.get("yearId");

    // Members can only see their own ledger
    if (userRole !== "admin" && memberId !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (!memberId || !yearId) {
      return NextResponse.json(
        { success: false, error: "memberId and yearId are required" },
        { status: 400 }
      );
    }

    const { data: entryRows, error: entriesError } = await supabaseAdmin
      .from("ledger_entries")
      .select("*")
      .eq("member_id", memberId)
      .eq("year_id", yearId)
      .order("month", { ascending: true });

    if (entriesError) throw entriesError;

    const { data: yearRow, error: yearError } = await supabaseAdmin
      .from("financial_years")
      .select("*")
      .eq("id", yearId)
      .maybeSingle();

    if (yearError) throw yearError;

    return NextResponse.json({
      success: true,
      data: {
        entries: (entryRows || []).map(toLedgerEntryDTO),
        year: yearRow ? toFinancialYearDTO(yearRow) : null,
      },
    });
  } catch (error) {
    console.error("Get ledger error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actorId = request.headers.get("x-user-id");
    const actorName = request.headers.get("x-user-name") || "Admin";
    const userRole = request.headers.get("x-user-role");

    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { memberId, yearId, month, subscription, savings, interest, loanRepayment, socialFund, hostingFund, notes } =
      parsed.data;

    const { data: entry, error } = await supabaseAdmin
      .from("ledger_entries")
      .upsert(
        {
          member_id: memberId,
          year_id: yearId,
          month,
          subscription,
          savings,
          interest,
          loan_repayment: loanRepayment,
          social_fund: socialFund,
          hosting_fund: hostingFund,
          notes,
          updated_at: new Date().toISOString(),
          updated_by: actorId || undefined,
        },
        { onConflict: "member_id,year_id,month" }
      )
      .select("*")
      .single();

    if (error) throw error;

    await logAudit({
      actorId: actorId || undefined,
      actorName,
      action: AUDIT_ACTIONS.LEDGER_UPDATE,
      targetId: memberId,
      details: `Updated ledger for month ${month} in year ${yearId}`,
    });

    return NextResponse.json({ success: true, data: toLedgerEntryDTO(entry) });
  } catch (error) {
    console.error("Update ledger error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
