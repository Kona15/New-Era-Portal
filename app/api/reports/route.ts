import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  toMemberDTO,
  toFinancialYearDTO,
  toLedgerEntryDTO,
} from "@/lib/supabase/mappers";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";

function sumField(entries: { [key: string]: string }[], field: string): string {
  const total = entries.reduce((acc, e) => acc + parseFloat(e[field] || "0"), 0);
  return total.toFixed(2);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const actorName = request.headers.get("x-user-name") || "User";
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "member-statement";
    const memberId = searchParams.get("memberId");
    const yearId = searchParams.get("yearId");
    const format = searchParams.get("format") || "json";

    // Members can only get their own statement
    if (userRole !== "admin") {
      if (type !== "member-statement" || memberId !== userId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    let data: unknown;

    if (type === "member-statement" && memberId && yearId) {
      const { data: memberRow, error: memberError } = await supabaseAdmin
        .from("members")
        .select("*")
        .eq("id", memberId)
        .is("deleted_at", null)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!memberRow) {
        return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
      }

      const { data: yearRow, error: yearError } = await supabaseAdmin
        .from("financial_years")
        .select("*")
        .eq("id", yearId)
        .maybeSingle();

      if (yearError) throw yearError;

      const { data: entryRows, error: entriesError } = await supabaseAdmin
        .from("ledger_entries")
        .select("*")
        .eq("member_id", memberId)
        .eq("year_id", yearId)
        .order("month", { ascending: true });

      if (entriesError) throw entriesError;

      data = {
        member: toMemberDTO(memberRow),
        year: yearRow ? toFinancialYearDTO(yearRow) : null,
        entries: (entryRows || []).map(toLedgerEntryDTO),
      };
    } else if (type === "annual-ledger" && yearId) {
      const { data: yearRow, error: yearError } = await supabaseAdmin
        .from("financial_years")
        .select("*")
        .eq("id", yearId)
        .maybeSingle();

      if (yearError) throw yearError;

      const { data: memberRows, error: membersError } = await supabaseAdmin
        .from("members")
        .select("*")
        .is("deleted_at", null)
        .order("full_name", { ascending: true });

      if (membersError) throw membersError;

      const { data: entryRows, error: entriesError } = await supabaseAdmin
        .from("ledger_entries")
        .select("*")
        .eq("year_id", yearId);

      if (entriesError) throw entriesError;

      data = {
        year: yearRow ? toFinancialYearDTO(yearRow) : null,
        members: (memberRows || []).map(toMemberDTO),
        entries: (entryRows || []).map(toLedgerEntryDTO),
      };
    } else if (type === "savings-report" && yearId) {
      const { data: memberRows, error: membersError } = await supabaseAdmin
        .from("members")
        .select("id, full_name, phone")
        .is("deleted_at", null)
        .order("full_name", { ascending: true });

      if (membersError) throw membersError;

      const { data: entryRows, error: entriesError } = await supabaseAdmin
        .from("ledger_entries")
        .select("member_id, savings, interest, loan_repayment")
        .eq("year_id", yearId);

      if (entriesError) throw entriesError;

      data = (memberRows || []).map((m) => {
        const memberEntries = (entryRows || []).filter((e) => e.member_id === m.id);
        return {
          memberId: m.id,
          memberName: m.full_name,
          phone: m.phone,
          totalSavings: sumField(memberEntries, "savings"),
          totalInterest: sumField(memberEntries, "interest"),
          totalLoanRepayment: sumField(memberEntries, "loan_repayment"),
        };
      });
    } else {
      return NextResponse.json({ success: false, error: "Invalid report parameters" }, { status: 400 });
    }

    await logAudit({
      actorId: userId || undefined,
      actorName,
      action: AUDIT_ACTIONS.EXPORT,
      details: `Generated ${type} report, format: ${format}`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
