import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toFinancialYearDTO, toLedgerEntryDTO } from "@/lib/supabase/mappers";

function sumField(entries: { [key: string]: string }[], field: string): string {
  const total = entries.reduce((acc, e) => acc + parseFloat(e[field] || "0"), 0);
  return total.toFixed(2);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: activeYearRow, error: yearError } = await supabaseAdmin
      .from("financial_years")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (yearError) throw yearError;

    if (!activeYearRow) {
      return NextResponse.json({ success: true, data: { activeYear: null, totals: null, recentEntries: [] } });
    }

    const { data: entryRows, error: entriesError } = await supabaseAdmin
      .from("ledger_entries")
      .select("*")
      .eq("member_id", userId)
      .eq("year_id", activeYearRow.id)
      .order("month", { ascending: true });
    if (entriesError) throw entriesError;

    const entries = entryRows || [];

    const totals = {
      totalSavings: sumField(entries, "savings"),
      totalSubscription: sumField(entries, "subscription"),
      totalInterest: sumField(entries, "interest"),
      totalLoanRepayment: sumField(entries, "loan_repayment"),
      totalSocialFund: sumField(entries, "social_fund"),
      totalHostingFund: sumField(entries, "hosting_fund"),
    };

    return NextResponse.json({
      success: true,
      data: {
        activeYear: toFinancialYearDTO(activeYearRow),
        totals,
        recentEntries: entries.slice(0, 6).map(toLedgerEntryDTO),
      },
    });
  } catch (error) {
    console.error("Member stats error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
