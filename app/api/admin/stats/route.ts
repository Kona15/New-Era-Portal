import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toAuditLogDTO, toImportLogDTO, toFinancialYearDTO } from "@/lib/supabase/mappers";

const EXCLUDED_PHONE = "08000000000";

function sumField(entries: { [key: string]: string }[], field: string): string {
  const total = entries.reduce((acc, e) => acc + parseFloat(e[field] || "0"), 0);
  return total.toFixed(2);
}

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { count: totalCount, error: totalError } = await supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .neq("phone", EXCLUDED_PHONE);
    if (totalError) throw totalError;

    const { count: activeCount, error: activeError } = await supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .neq("phone", EXCLUDED_PHONE)
      .eq("status", "active");
    if (activeError) throw activeError;

    const { count: pendingResetCount, error: resetError } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (resetError) throw resetError;

    const { data: activeYearRow, error: yearError } = await supabaseAdmin
      .from("financial_years")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (yearError) throw yearError;

    let financialTotals = {
      totalSavings: "0",
      totalSubscription: "0",
      totalLoanRepayment: "0",
      totalSocialFund: "0",
      totalHostingFund: "0",
      totalInterest: "0",
    };

    if (activeYearRow) {
      const { data: entryRows, error: entriesError } = await supabaseAdmin
        .from("ledger_entries")
        .select("subscription, savings, interest, loan_repayment, social_fund, hosting_fund")
        .eq("year_id", activeYearRow.id);
      if (entriesError) throw entriesError;

      const entries = entryRows || [];
      financialTotals = {
        totalSavings: sumField(entries, "savings"),
        totalSubscription: sumField(entries, "subscription"),
        totalLoanRepayment: sumField(entries, "loan_repayment"),
        totalSocialFund: sumField(entries, "social_fund"),
        totalHostingFund: sumField(entries, "hosting_fund"),
        totalInterest: sumField(entries, "interest"),
      };
    }

    const { data: recentLogRows, error: logsError } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (logsError) throw logsError;

    const { data: recentImportRows, error: importsError } = await supabaseAdmin
      .from("import_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (importsError) throw importsError;

    return NextResponse.json({
      success: true,
      data: {
        members: {
          total: totalCount ?? 0,
          active: activeCount ?? 0,
        },
        pendingPasswordResets: pendingResetCount ?? 0,
        financials: financialTotals,
        activeYear: activeYearRow ? toFinancialYearDTO(activeYearRow) : null,
        recentLogs: (recentLogRows || []).map(toAuditLogDTO).reverse(),
        recentImports: (recentImportRows || []).map(toImportLogDTO).reverse(),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
