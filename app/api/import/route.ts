import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth/password";
import { logAudit, AUDIT_ACTIONS } from "@/lib/utils/audit";
import * as XLSX from "xlsx";

interface ImportRow {
  fullName: string;
  phone: string;
  month: number;
  year: number;
  subscription?: number;
  savings?: number;
  interest?: number;
  loanRepayment?: number;
  socialFund?: number;
  hostingFund?: number;
}

function parseAmount(val: unknown): string {
  if (val === null || val === undefined || val === "") return "0.00";
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role");
    const actorId = request.headers.get("x-user-id");
    const actorName = request.headers.get("x-user-name") || "Admin";

    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mode = (formData.get("mode") as string) || "preview";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const validRows: ImportRow[] = [];
    const errors: { row: number; issue: string; data: unknown }[] = [];
    const warnings: { row: number; issue: string; data: unknown }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i] as Record<string, unknown>;
      const rowNum = i + 2; // Account for header

      const phone = String(raw["Phone"] || raw["phone"] || raw["PHONE"] || "").trim().replace(/\s+/g, "");
      const fullName = String(raw["Name"] || raw["Full Name"] || raw["name"] || raw["FULL_NAME"] || "").trim();
      const month = parseInt(String(raw["Month"] || raw["month"] || "0"));
      const year = parseInt(String(raw["Year"] || raw["year"] || new Date().getFullYear()));

      if (!phone) {
        errors.push({ row: rowNum, issue: "Missing phone number", data: raw });
        continue;
      }

      if (!fullName) {
        errors.push({ row: rowNum, issue: "Missing member name", data: raw });
        continue;
      }

      if (!month || month < 1 || month > 12) {
        errors.push({ row: rowNum, issue: `Invalid month: ${month}`, data: raw });
        continue;
      }

      validRows.push({
        fullName,
        phone,
        month,
        year,
        subscription: parseFloat(parseAmount(raw["Subscription"] || raw["subscription"])),
        savings: parseFloat(parseAmount(raw["Savings"] || raw["savings"])),
        interest: parseFloat(parseAmount(raw["Interest"] || raw["interest"])),
        loanRepayment: parseFloat(parseAmount(raw["Loan Repayment"] || raw["loan_repayment"] || raw["LoanRepayment"])),
        socialFund: parseFloat(parseAmount(raw["Social Fund"] || raw["social_fund"] || raw["SocialFund"])),
        hostingFund: parseFloat(parseAmount(raw["Hosting Fund"] || raw["hosting_fund"] || raw["HostingFund"])),
      });
    }

    if (mode === "preview") {
      return NextResponse.json({
        success: true,
        data: {
          preview: validRows.slice(0, 20),
          totalRows: rawRows.length,
          validRows: validRows.length,
          errorRows: errors.length,
          errors: errors.slice(0, 10),
          warnings,
        },
      });
    }

    // Confirm import — no multi-statement transaction over the REST API,
    // so we process rows sequentially and collect any failures.
    let successCount = 0;
    const failedRows: { row: unknown; reason: string }[] = [];
    const defaultPassword = process.env.DEFAULT_MEMBER_PASSWORD || "Idanrenewera";
    const yearCache = new Map<number, string>();
    const memberCache = new Map<string, string>();

    for (const row of validRows) {
      try {
        // Find or create financial year
        let yearId = yearCache.get(row.year);
        if (!yearId) {
          const { data: existingYear, error: yearFindError } = await supabaseAdmin
            .from("financial_years")
            .select("id")
            .eq("year", row.year)
            .maybeSingle();
          if (yearFindError) throw yearFindError;

          if (existingYear) {
            yearId = existingYear.id;
          } else {
            const { data: newYear, error: yearInsertError } = await supabaseAdmin
              .from("financial_years")
              .insert({ year: row.year, label: `${row.year} Financial Year`, is_active: false })
              .select("id")
              .single();
            if (yearInsertError) throw yearInsertError;
            yearId = newYear.id;
          }
          if (!yearId) {
  throw new Error(`Failed to resolve financial year ${row.year}`);
}
          yearCache.set(row.year, yearId);
        }

        // Find or create member
        let memberId = memberCache.get(row.phone);
        if (!memberId) {
          const { data: existingMember, error: memberFindError } = await supabaseAdmin
            .from("members")
            .select("id")
            .eq("phone", row.phone)
            .is("deleted_at", null)
            .maybeSingle();
          if (memberFindError) throw memberFindError;

          if (existingMember) {
            memberId = existingMember.id;
          } else {
            const passwordHash = await hashPassword(defaultPassword);
            const { data: newMember, error: memberInsertError } = await supabaseAdmin
              .from("members")
              .insert({
                full_name: row.fullName,
                phone: row.phone,
                password_hash: passwordHash,
                role: "member",
                status: "pending",
                must_change_password: true,
              })
              .select("id")
              .single();
            if (memberInsertError) throw memberInsertError;
            memberId = newMember.id;
          }
          if (!memberId) {
  throw new Error(`Failed to resolve member ${row.phone}`);
}
          memberCache.set(row.phone, memberId);
        }

        // Upsert ledger entry
        const { error: ledgerError } = await supabaseAdmin.from("ledger_entries").upsert(
          {
            member_id: memberId,
            year_id: yearId,
            month: row.month,
            subscription: String(row.subscription || 0),
            savings: String(row.savings || 0),
            interest: String(row.interest || 0),
            loan_repayment: String(row.loanRepayment || 0),
            social_fund: String(row.socialFund || 0),
            hosting_fund: String(row.hostingFund || 0),
            updated_at: new Date().toISOString(),
            updated_by: actorId || undefined,
          },
          { onConflict: "member_id,year_id,month" }
        );

        if (ledgerError) throw ledgerError;

        successCount++;
      } catch (rowError) {
        failedRows.push({ row, reason: String(rowError) });
      }
    }

    // Record import log
    const { error: logError } = await supabaseAdmin.from("import_logs").insert({
      imported_by: actorId || undefined,
      file_name: file.name,
      total_rows: rawRows.length,
      success_rows: successCount,
      failed_rows: failedRows.length + errors.length,
      status: "completed",
      report: JSON.stringify({ errors: errors.slice(0, 50), failedRows: failedRows.slice(0, 50) }),
    });
    if (logError) console.error("Failed to write import log:", logError);

    await logAudit({
      actorId: actorId || undefined,
      actorName,
      action: AUDIT_ACTIONS.IMPORT,
      details: `Imported ${successCount} rows from ${file.name}. Errors: ${errors.length + failedRows.length}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRows: rawRows.length,
        successRows: successCount,
        failedRows: failedRows.length + errors.length,
        errors: [...errors, ...failedRows.map((f) => ({ issue: f.reason, data: f.row }))].slice(0, 20),
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ success: false, error: "Import failed: " + String(error) }, { status: 500 });
  }
}
