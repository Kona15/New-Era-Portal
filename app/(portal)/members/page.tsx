"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users, Plus, Search, Filter, ChevronLeft, ChevronRight,
  Eye, Edit, Key, Trash2, UserCheck, UserX, Loader2
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { ResponsiveTable } from "@/components/ResponsiveTable";

interface Member {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  graduationYear: string | null;
  occupation: string | null;
  dateJoined: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-green",
    inactive: "badge-red",
    pending: "badge-yellow",
  };
  return <span className={cn("badge", map[status] || "badge-gray")}>{status}</span>;
}

function ConfirmDialog({
  open, title, message, onConfirm, onCancel, danger,
}: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            className={cn("flex-1", danger ? "btn-danger" : "btn-primary")}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; message: string; action: () => void; danger?: boolean;
  }>({ open: false, title: "", message: "", action: () => {} });

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`/api/members?${params}`);
      const json = await res.json();
      if (json.success) {
        setMembers(json.data);
        setMeta(json.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function handleStatusToggle(member: Member) {
    const newStatus = member.status === "active" ? "inactive" : "active";
    setConfirm({
      open: true,
      title: `${newStatus === "active" ? "Activate" : "Deactivate"} Member`,
      message: `Are you sure you want to ${newStatus === "active" ? "activate" : "deactivate"} ${member.fullName}?`,
      danger: newStatus === "inactive",
      action: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        const res = await fetch(`/api/members/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(`Member ${newStatus}`);
          fetchMembers();
        } else {
          toast.error(json.error);
        }
      },
    });
  }

  async function handleDelete(member: Member) {
    setConfirm({
      open: true,
      title: "Delete Member",
      message: `Delete ${member.fullName}? This action cannot be undone.`,
      danger: true,
      action: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) {
          toast.success("Member deleted");
          fetchMembers();
        } else {
          toast.error(json.error);
        }
      },
    });
  }

  async function handleResetPassword(member: Member) {
    setConfirm({
      open: true,
      title: "Reset Password",
      message: `Reset ${member.fullName}'s password to the default? They will need to change it on next login.`,
      action: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        const res = await fetch(`/api/members/${member.id}/reset-password`, { method: "POST" });
        const json = await res.json();
        if (json.success) {
          toast.success(json.message);
        } else {
          toast.error(json.error);
        }
      },
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
      <ConfirmDialog 
  {...confirm} 
  onConfirm={confirm.action} 
  onCancel={() => setConfirm((c) => ({ ...c, open: false }))} 
/>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">{meta.total} total members</p>
        </div>
        <Link href="/members/new" className="btn-primary">
          <Plus className="w-5 h-5" /> Add Member
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or occupation..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input w-full sm:w-44"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <ResponsiveTable>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No members found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Phone</th>
                <th>Set / Year</th>
                <th>Status</th>
                <th>Date Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div>
                      <p className="font-semibold text-slate-900">{m.fullName}</p>
                      {m.occupation && (
                        <p className="text-xs text-slate-400">{m.occupation}</p>
                      )}
                      {m.mustChangePassword && (
                        <span className="badge badge-yellow mt-0.5">Must change password</span>
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-sm">{m.phone}</td>
                  <td>{m.graduationYear || "—"}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td>{formatDate(m.dateJoined)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/members/${m.id}`}
                        className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/members/${m.id}?edit=true`}
                        className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                        title="Edit Member"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleResetPassword(m)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusToggle(m)}
                        className={cn(
                          "p-2 rounded-lg",
                          m.status === "active"
                            ? "text-slate-500 hover:bg-red-50 hover:text-red-700"
                            : "text-slate-500 hover:bg-green-50 hover:text-green-700"
                        )}
                        title={m.status === "active" ? "Deactivate" : "Activate"}
                      >
                        {m.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ResponsiveTable>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 px-1 flex-wrap">
          <p className="text-sm text-slate-500">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary btn-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
              disabled={page === meta.pages}
              className="btn-secondary btn-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
