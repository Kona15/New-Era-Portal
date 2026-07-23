"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  FileText, Download, Printer, TableProperties, Loader2,
  ChevronDown, BarChart2, PiggyBank, Users, BookOpen
} from "lucide-react";
import { formatCurrency, formatDate, getMonthName, MONTHS } from "@/lib/utils";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import * as XLSX from "xlsx";

interface FinancialYear { id: string; year: number; label: string; isActive: boolean; }
interface Member { id: string; fullName: string; phone: string; }

const REPORT_TYPES = [
  { value: "member-statement", label: "Member Statement", icon: <FileText className="w-4 h-4" />, needsMember: true },
  { value: "annual-ledger", label: "Annual Ledger", icon: <TableProperties className="w-4 h-4" />, needsMember: false },
  { value: "savings-report", label: "Savings Report", icon: <PiggyBank className="w-4 h-4" />, needsMember: false },
];

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const initialMemberId = searchParams.get("memberId") || "";

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMember, setSelectedMember] = useState(initialMemberId);
  const [reportType, setReportType] = useState("member-statement");
  const [reportData, setReportData] = useState<Record<string, unknown> | Array<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (me.success) {
        setIsAdmin(me.data.role === "admin");
        setCurrentUserId(me.data.id);
        if (me.data.role !== "admin") {
          setSelectedMember(me.data.id);
          setReportType("member-statement");
        }
      }
      const yearsRes = await fetch("/api/years");
      const yearsJson = await yearsRes.json();
      if (yearsJson.success) {
        setYears(yearsJson.data);
        const active = yearsJson.data.find((y: FinancialYear) => y.isActive);
        if (active) setSelectedYear(active.id);
      }
      if (me.data?.role === "admin") {
        const membersRes = await fetch("/api/members?limit=200");
        const mj = await membersRes.json();
        if (mj.success) setMembers(mj.data);
      }
    }
    init();
  }, []);

  async function generateReport() {
    if (!selectedYear) { toast.error("Please select a financial year"); return; }
    const rt = REPORT_TYPES.find((r) => r.value === reportType);
    if (rt?.needsMember && !selectedMember) { toast.error("Please select a member"); return; }

    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType, yearId: selectedYear });
      if (selectedMember) params.set("memberId", isAdmin ? selectedMember : currentUserId);
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
        toast.success("Report generated");
      } else {
        toast.error(json.error);
      }
    } finally {
      setLoading(false);
    }
  }

  function exportToExcel() {
    if (!reportData) return;
    const data = reportData as Record<string, unknown>;
    let rows: Record<string, unknown>[] = [];
    let sheetName = "Report";

    if (reportType === "member-statement" && data.entries) {
      const entries = data.entries as Array<Record<string, unknown>>;
      rows = entries.map((e) => ({
        Month: getMonthName(Number(e.month)),
        Subscription: e.subscription,
        Savings: e.savings,
        Interest: e.interest,
        "Loan Repayment": e.loanRepayment,
        "Social Fund": e.socialFund,
        "Hosting Fund": e.hostingFund,
      }));
      sheetName = "Member Statement";
    } else if (reportType === "savings-report" && Array.isArray(reportData)) {
      rows = (reportData as Array<Record<string, unknown>>).map((r) => ({
        Name: r.memberName,
        Phone: r.phone,
        "Total Savings": r.totalSavings,
        "Total Interest": r.totalInterest,
        "Loan Repayment": r.totalLoanRepayment,
      }));
      sheetName = "Savings Report";
    } else if (reportType === "annual-ledger" && data.members) {
      const mems = data.members as Array<Record<string, unknown>>;
      const allEntries = data.entries as Array<Record<string, unknown>>;
      rows = mems.map((m) => {
        const mEntries = allEntries.filter((e) => e.memberId === m.id);
        const totals = { savings: 0, subscription: 0, interest: 0, loanRepayment: 0, socialFund: 0, hostingFund: 0 };
        mEntries.forEach((e) => {
          totals.savings += parseFloat(String(e.savings || 0));
          totals.subscription += parseFloat(String(e.subscription || 0));
          totals.interest += parseFloat(String(e.interest || 0));
          totals.loanRepayment += parseFloat(String(e.loanRepayment || 0));
          totals.socialFund += parseFloat(String(e.socialFund || 0));
          totals.hostingFund += parseFloat(String(e.hostingFund || 0));
        });
        return { Name: m.fullName, Phone: m.phone, ...totals };
      });
      sheetName = "Annual Ledger";
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel file downloaded");
  }

  function printReport() {
    window.print();
  }

  const selectedMemberData = members.find((m) => m.id === selectedMember);
  const selectedYearData = years.find((y) => y.id === selectedYear);
  const data = reportData as Record<string, unknown> | null;
  const needsMember = REPORT_TYPES.find((r) => r.value === reportType)?.needsMember;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full overflow-x-hidden">
      <div className="mb-8">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Generate and export financial statements and summaries</p>
      </div>

      {/* Controls */}
      <div className="card p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isAdmin && (
            <div>
              <label className="label">Report Type</label>
              <div className="relative">
                <select value={reportType} onChange={(e) => { setReportType(e.target.value); setReportData(null); }} className="input appearance-none pr-10">
                  {REPORT_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="label">Financial Year</label>
            <div className="relative">
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="input appearance-none pr-10">
                <option value="">— Select Year —</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {(isAdmin && needsMember) && (
            <div>
              <label className="label">Member</label>
              <div className="relative">
                <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="input appearance-none pr-10">
                  <option value="">— Select Member —</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
          <button onClick={generateReport} disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><BarChart2 className="w-4 h-4" /> Generate Report</>}
          </button>
          {reportData ? (
            <>
              <button onClick={exportToExcel} className="btn-secondary">
                <Download className="w-4 h-4" /> Export Excel
              </button>
              <button onClick={printReport} className="btn-secondary no-print">
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Report Output */}
      {reportData ? (
        <div id="report-output" className="card p-6 md:p-8">
          {/* Report Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-blue-900">
            <h2 className="text-2xl font-bold text-blue-900 uppercase tracking-wide">Idanre New Era Association</h2>
            <p className="text-slate-500 mt-1">{REPORT_TYPES.find((r) => r.value === reportType)?.label}</p>
            {selectedYearData ? <p className="text-slate-600 font-medium mt-1">{selectedYearData.label}</p> : null}
            {reportType === "member-statement" && selectedMemberData ? (
              <div className="mt-3 inline-block text-left bg-slate-50 rounded-lg px-6 py-3">
                <p><span className="font-semibold">Member:</span> {selectedMemberData.fullName}</p>
                <p><span className="font-semibold">Phone:</span> {selectedMemberData.phone}</p>
                <p><span className="font-semibold">Date Generated:</span> {formatDate(new Date())}</p>
              </div>
            ) : null}
          </div>

          {/* Member Statement */}
          {reportType === "member-statement" && data?.entries ? (
            <MemberStatementReport data={data as Record<string, unknown>} />
          ) : null}

          {/* Annual Ledger */}
          {reportType === "annual-ledger" && data?.members ? (
            <AnnualLedgerReport data={data as Record<string, unknown>} />
          ) : null}

          {/* Savings Report */}
          {reportType === "savings-report" && Array.isArray(reportData) ? (
            <SavingsReport data={reportData as Array<Record<string, unknown>>} />
          ) : null}
        </div>
      ) : null}

      {!reportData && !loading && (
        <div className="card p-12 text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg text-slate-500">No report generated yet</p>
          <p className="text-sm mt-1">Select options above and click Generate Report</p>
        </div>
      )}
    </div>
  );
}

function MemberStatementReport({ data }: { data: Record<string, unknown> }) {
  const entries = data.entries as Array<Record<string, string | number>>;
  const fields = ["subscription", "savings", "interest", "loanRepayment", "socialFund", "hostingFund"];
  const labels: Record<string, string> = {
    subscription: "Subscription", savings: "Savings", interest: "Interest",
    loanRepayment: "Loan Repayment", socialFund: "Social Fund", hostingFund: "Hosting Fund"
  };
  const totals = fields.reduce((acc, f) => {
    acc[f] = entries.reduce((s, e) => s + parseFloat(String(e[f] || 0)), 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <ResponsiveTable>
      <table className="table w-full text-sm">
        <thead>
          <tr>
            <th>Month</th>
            {fields.map((f) => <th key={f}>{labels[f]}</th>)}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((month, i) => {
            const entry = entries.find((e) => Number(e.month) === i + 1) || {};
            const rowTotal = fields.reduce((s, f) => s + parseFloat(String(entry[f] || 0)), 0);
            return (
              <tr key={month}>
                <td className="font-medium">{month}</td>
                {fields.map((f) => (
                  <td key={f} className={parseFloat(String(entry[f] || 0)) > 0 ? "font-medium" : "text-slate-300"}>
                    {formatCurrency(entry[f] || 0)}
                  </td>
                ))}
                <td className="font-semibold text-blue-700">{formatCurrency(rowTotal)}</td>
              </tr>
            );
          })}
          <tr className="bg-blue-900 text-white font-bold">
            <td>TOTAL</td>
            {fields.map((f) => <td key={f}>{formatCurrency(totals[f])}</td>)}
            <td className="text-yellow-300">{formatCurrency(Object.values(totals).reduce((a, b) => a + b, 0))}</td>
          </tr>
        </tbody>
      </table>
    </ResponsiveTable>
  );
}

function AnnualLedgerReport({ data }: { data: Record<string, unknown> }) {
  const mems = data.members as Array<Record<string, unknown>>;
  const allEntries = data.entries as Array<Record<string, unknown>>;

  return (
    <ResponsiveTable>
      <table className="table text-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Member</th>
            <th>Phone</th>
            <th>Savings</th>
            <th>Subscription</th>
            <th>Loan Repay.</th>
            <th>Social Fund</th>
            <th>Hosting Fund</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {mems.map((m, idx) => {
            const mEntries = allEntries.filter((e) => e.memberId === m.id);
            const sum = (key: string) => mEntries.reduce((s, e) => s + parseFloat(String(e[key] || 0)), 0);
            const total = ["savings", "subscription", "loanRepayment", "socialFund", "hostingFund"].reduce((s, k) => s + sum(k), 0);
            return (
              <tr key={String(m.id)}>
                <td>{idx + 1}</td>
                <td className="font-semibold">{String(m.fullName)}</td>
                <td className="font-mono text-xs">{String(m.phone)}</td>
                <td>{formatCurrency(sum("savings"))}</td>
                <td>{formatCurrency(sum("subscription"))}</td>
                <td>{formatCurrency(sum("loanRepayment"))}</td>
                <td>{formatCurrency(sum("socialFund"))}</td>
                <td>{formatCurrency(sum("hostingFund"))}</td>
                <td className="font-bold text-blue-700">{formatCurrency(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ResponsiveTable>
  );
}

type SavingsRow = {
  memberId?: string | number | null;
  memberName?: string | null;
  phone?: string | null;
  totalSavings?: string | number | null;
  totalInterest?: string | number | null;
  totalLoanRepayment?: string | number | null;
};

function SavingsReport({ data }: { data: Array<Record<string, unknown>> }) {
  return (
    <ResponsiveTable>
      <table className="table text-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Member</th>
            <th>Phone</th>
            <th>Total Savings</th>
            <th>Total Interest</th>
            <th>Loan Repayment</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const r = row as SavingsRow;
            return (
              <tr key={String(r.memberId ?? idx)}>
                <td>{idx + 1}</td>
                <td className="font-semibold">{String(r.memberName ?? "")}</td>
                <td className="font-mono text-xs">{String(r.phone ?? "")}</td>
                <td className="font-medium text-green-700">{formatCurrency(r.totalSavings ?? 0)}</td>
                <td>{formatCurrency(r.totalInterest ?? 0)}</td>
                <td>{formatCurrency(r.totalLoanRepayment ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ResponsiveTable>
  );
}
