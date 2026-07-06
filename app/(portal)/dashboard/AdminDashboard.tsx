"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, UserCheck, Key, TrendingUp, BookOpen, Upload,
  PiggyBank, Handshake, Home, AlertTriangle, Activity, RefreshCw, Plus
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { JWTPayload } from "@/lib/auth/jwt";

interface DashboardData {
  members: { total: number; active: number };
  pendingPasswordResets: number;
  financials: {
    totalSavings: string;
    totalSubscription: string;
    totalLoanRepayment: string;
    totalSocialFund: string;
    totalHostingFund: string;
    totalInterest: string;
  };
  activeYear: { year: number; label: string } | null;
  recentLogs: Array<{
    id: string;
    actorName: string;
    action: string;
    targetName: string | null;
    details: string | null;
    createdAt: string;
  }>;
}

export default function AdminDashboard({ session }: { session: JWTPayload }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const StatCard = ({
    icon, label, value, sublabel, href, color = "blue"
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sublabel?: string;
    href?: string;
    color?: string;
  }) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-50 text-blue-700",
      green: "bg-green-50 text-green-700",
      amber: "bg-amber-50 text-amber-700",
      purple: "bg-purple-50 text-purple-700",
      rose: "bg-rose-50 text-rose-700",
      teal: "bg-teal-50 text-teal-700",
    };
    const card = (
      <div className="stat-card hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>{icon}</div>
          {href && <span className="text-blue-600 text-xs font-medium hover:underline">View →</span>}
        </div>
        <div className="mt-3">
          <div className="stat-value">{value}</div>
          <div className="stat-label mt-0.5">{label}</div>
          {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
        </div>
      </div>
    );
    return href ? <Link href={href}>{card}</Link> : card;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const fin = data?.financials;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {session.name} · {data?.activeYear?.label || "No active year"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/members/new" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add Member
          </Link>
          <button onClick={fetchData} className="btn-secondary btn-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Member Stats */}
      <section className="mb-8">
        <h2 className="section-title mb-4">Membership Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Members"
            value={data?.members.total ?? "—"}
            href="/members"
            color="blue"
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5" />}
            label="Active Members"
            value={data?.members.active ?? "—"}
            color="green"
          />
          <StatCard
            icon={<Key className="w-5 h-5" />}
            label="Pending Resets"
            value={data?.pendingPasswordResets ?? "—"}
            sublabel="Password reset requests"
            href="/admin"
            color={data?.pendingPasswordResets ? "amber" : "blue"}
          />
        </div>
      </section>

      {/* Financial Stats */}
      <section className="mb-8">
        <h2 className="section-title mb-4">
          Financial Summary {data?.activeYear ? `— ${data.activeYear.year}` : ""}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={<PiggyBank className="w-5 h-5" />}
            label="Total Savings"
            value={formatCurrency(fin?.totalSavings || 0)}
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Total Subscription"
            value={formatCurrency(fin?.totalSubscription || 0)}
            color="blue"
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5" />}
            label="Loan Repayment"
            value={formatCurrency(fin?.totalLoanRepayment || 0)}
            color="purple"
          />
          <StatCard
            icon={<Handshake className="w-5 h-5" />}
            label="Social Fund"
            value={formatCurrency(fin?.totalSocialFund || 0)}
            color="teal"
          />
          <StatCard
            icon={<Home className="w-5 h-5" />}
            label="Hosting Fund"
            value={formatCurrency(fin?.totalHostingFund || 0)}
            color="rose"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Total Interest"
            value={formatCurrency(fin?.totalInterest || 0)}
            color="amber"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/members/new", icon: <Users className="w-5 h-5" />, label: "Add Member" },
            { href: "/ledger", icon: <BookOpen className="w-5 h-5" />, label: "Edit Ledger" },
            { href: "/import", icon: <Upload className="w-5 h-5" />, label: "Import Data" },
            { href: "/reports", icon: <TrendingUp className="w-5 h-5" />, label: "Generate Report" },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href}
              className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-700">
                {icon}
              </div>
              <span className="text-sm font-semibold text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Activity</h2>
          <Link href="/admin#audit" className="text-blue-700 text-sm font-medium hover:underline">
            View all →
          </Link>
        </div>
        <div className="card overflow-hidden">
          {!data?.recentLogs?.length ? (
            <div className="p-8 text-center text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 text-xs font-bold mt-0.5">
                    {log.actorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{log.actorName}</span>{" "}
                      <span className="text-slate-500 lowercase">{log.action.replace(/_/g, " ")}</span>
                      {log.targetName && (
                        <> — <span className="font-medium">{log.targetName}</span></>
                      )}
                    </p>
                    {log.details && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{log.details}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{formatDateTime(log.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
