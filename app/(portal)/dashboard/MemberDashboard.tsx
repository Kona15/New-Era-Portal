"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PiggyBank, TrendingUp, BookOpen, User, FileText, Key, RefreshCw } from "lucide-react";
import { formatCurrency, getMonthName } from "@/lib/utils";
import type { JWTPayload } from "@/lib/auth/jwt";

interface MemberStats {
  activeYear: { id: string; year: number; label: string } | null;
  totals: {
    totalSavings: string | null;
    totalSubscription: string | null;
    totalInterest: string | null;
    totalLoanRepayment: string | null;
    totalSocialFund: string | null;
    totalHostingFund: string | null;
  } | null;
  recentEntries: Array<{
    month: number;
    savings: string;
    subscription: string;
    interest: string;
    loanRepayment: string;
    socialFund: string;
    hostingFund: string;
  }>;
}

export default function MemberDashboard({ session }: { session: JWTPayload }) {
  const [data, setData] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/member-stats");
        const json = await res.json();
        if (json.success) setData(json.data);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const totals = data?.totals;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-6 text-white mb-8">
        <p className="text-blue-200 text-sm font-medium mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold">{session.name}</h1>
        {data?.activeYear && (
          <p className="text-blue-200 mt-1">{data.activeYear.label}</p>
        )}
      </div>

      {/* Financial Summary */}
      {totals ? (
        <section className="mb-8">
          <h2 className="section-title mb-4">
            My Contributions {data?.activeYear ? `— ${data.activeYear.year}` : ""}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: <PiggyBank className="w-5 h-5" />, label: "Savings", value: totals.totalSavings, color: "bg-green-50 text-green-700" },
              { icon: <TrendingUp className="w-5 h-5" />, label: "Subscription", value: totals.totalSubscription, color: "bg-blue-50 text-blue-700" },
              { icon: <BookOpen className="w-5 h-5" />, label: "Loan Repayment", value: totals.totalLoanRepayment, color: "bg-purple-50 text-purple-700" },
              { icon: <TrendingUp className="w-5 h-5" />, label: "Interest", value: totals.totalInterest, color: "bg-amber-50 text-amber-700" },
              { icon: <User className="w-5 h-5" />, label: "Social Fund", value: totals.totalSocialFund, color: "bg-teal-50 text-teal-700" },
              { icon: <User className="w-5 h-5" />, label: "Hosting Fund", value: totals.totalHostingFund, color: "bg-rose-50 text-rose-700" },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="stat-card">
                <div className={`p-2.5 rounded-lg w-fit ${color}`}>{icon}</div>
                <div className="mt-3">
                  <div className="stat-value text-xl">{formatCurrency(value || 0)}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="card p-8 text-center text-slate-400 mb-8">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No contributions recorded yet</p>
          <p className="text-sm mt-1">Contact your administrator for assistance.</p>
        </div>
      )}

      {/* Recent Transactions */}
      {data?.recentEntries && data.recentEntries.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title mb-4">Recent Monthly Records</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Savings</th>
                  <th>Subscription</th>
                  <th>Loan Repay.</th>
                  <th>Social Fund</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEntries.slice(-6).reverse().map((entry) => (
                  <tr key={entry.month}>
                    <td className="font-medium">{getMonthName(entry.month)}</td>
                    <td>{formatCurrency(entry.savings)}</td>
                    <td>{formatCurrency(entry.subscription)}</td>
                    <td>{formatCurrency(entry.loanRepayment)}</td>
                    <td>{formatCurrency(entry.socialFund)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section>
        <h2 className="section-title mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { href: "/ledger", icon: <BookOpen className="w-6 h-6" />, label: "View Ledger", desc: "See all contributions" },
            { href: "/reports", icon: <FileText className="w-6 h-6" />, label: "My Statement", desc: "Download PDF report" },
            { href: "/profile", icon: <Key className="w-6 h-6" />, label: "Change Password", desc: "Update your password" },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href}
              className="card p-5 flex flex-col gap-2 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="text-blue-700">{icon}</div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
