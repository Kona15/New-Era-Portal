"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Key, Activity, Loader2, CheckCircle, Clock, ChevronDown,
  Shield, RefreshCw, AlertTriangle
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { ResponsiveTable } from "@/components/ResponsiveTable";

interface ResetRequest {
  id: string;
  memberId: string;
  memberName: string | null;
  memberPhone: string | null;
  status: string;
  requestedAt: string;
}

interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  targetName: string | null;
  details: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "badge-blue",
  LOGOUT: "badge-gray",
  MEMBER_CREATE: "badge-green",
  MEMBER_UPDATE: "badge-yellow",
  MEMBER_DELETE: "badge-red",
  PASSWORD_RESET: "badge-yellow",
  PASSWORD_CHANGE: "badge-blue",
  LEDGER_UPDATE: "badge-blue",
  IMPORT: "badge-green",
  EXPORT: "badge-gray",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"resets" | "audit">("resets");
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingResets, setLoadingResets] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    fetchResets();
    fetchLogs();
  }, []);

  async function fetchResets() {
    setLoadingResets(true);
    try {
      const res = await fetch("/api/admin/reset-requests");
      const json = await res.json();
      if (json.success) setResets(json.data);
    } finally {
      setLoadingResets(false);
    }
  }

  async function fetchLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/audit-logs?limit=100");
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleResetPassword(request: ResetRequest) {
    if (!request.memberId) return;
    setResolvingId(request.id);
    try {
      const res = await fetch(`/api/members/${request.memberId}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchResets();
      } else {
        toast.error(json.error);
      }
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full overflow-x-hidden">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">Manage reset requests and view system activity</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-full sm:w-fit">
        {[
          { key: "resets", label: "Password Resets", icon: <Key className="w-4 h-4" />, count: resets.length },
          { key: "audit", label: "Audit Logs", icon: <Activity className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "resets" | "audit")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Password Reset Requests */}
      {activeTab === "resets" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Pending Password Reset Requests</h2>
            <button onClick={fetchResets} className="btn-secondary btn-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {loadingResets ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : resets.length === 0 ? (
            <div className="card p-12 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No pending reset requests</p>
              <p className="text-slate-400 text-sm mt-1">All password reset requests have been resolved.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resets.map((req) => (
                <div key={req.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{req.memberName || "Unknown Member"}</p>
                      <p className="text-slate-500 text-sm font-mono">{req.memberPhone || "—"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs text-slate-400">Requested {formatDateTime(req.requestedAt)}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResetPassword(req)}
                    disabled={resolvingId === req.id}
                    className="btn-primary btn-sm shrink-0"
                  >
                    {resolvingId === req.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
                    ) : (
                      <><Key className="w-4 h-4" /> Reset Password</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === "audit" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">System Audit Log</h2>
            <button onClick={fetchLogs} className="btn-secondary btn-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <ResponsiveTable>
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap text-xs text-slate-500">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="font-medium">{log.actorName}</td>
                        <td>
                          <span className={`badge ${ACTION_COLORS[log.action] || "badge-gray"} text-xs`}>
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="text-slate-600">{log.targetName || "—"}</td>
                        <td className="text-xs text-slate-500 max-w-xs truncate">
                          {log.details || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </div>
      )}
    </div>
  );
}
