"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { BookOpen, Edit, Save, X, ChevronDown, Loader2, Plus } from "lucide-react";
import { formatCurrency, getMonthName, MONTHS } from "@/lib/utils";
import { ResponsiveTable } from "@/components/ResponsiveTable";

interface FinancialYear {
  id: string;
  year: number;
  label: string;
  isActive: boolean;
}

interface Member {
  id: string;
  fullName: string;
  phone: string;
}

interface LedgerEntry {
  id?: string;
  month: number;
  subscription: string;
  savings: string;
  interest: string;
  loanRepayment: string;
  socialFund: string;
  hostingFund: string;
  notes?: string | null;
}

const FIELDS = [
  { key: "subscription", label: "Subscription" },
  { key: "savings", label: "Savings" },
  { key: "interest", label: "Interest" },
  { key: "loanRepayment", label: "Loan Repayment" },
  { key: "socialFund", label: "Social Fund" },
  { key: "hostingFund", label: "Hosting Fund" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

function emptyEntry(month: number): LedgerEntry {
  return { month, subscription: "0", savings: "0", interest: "0", loanRepayment: "0", socialFund: "0", hostingFund: "0" };
}

export default function LedgerPage() {
  const searchParams = useSearchParams();
  const initialMemberId = searchParams.get("memberId") || "";

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<string>(initialMemberId);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<LedgerEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewYear, setShowNewYear] = useState(false);
  const [newYear, setNewYear] = useState("");

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      const meJson = await meRes.json();
      if (meJson.success) {
        const role = meJson.data.role;
        const uid = meJson.data.id;
        setIsAdmin(role === "admin");
        setCurrentUserId(uid);

        const yearsRes = await fetch("/api/years");
        const yearsJson = await yearsRes.json();
        if (yearsJson.success) {
          setYears(yearsJson.data);
          const active = yearsJson.data.find((y: FinancialYear) => y.isActive);
          if (active) setSelectedYear(active.id);
        }

        if (role === "admin") {
          const membersRes = await fetch("/api/members?limit=200");
          const membersJson = await membersRes.json();
          if (membersJson.success) {
            setMembers(membersJson.data);
            if (!initialMemberId && membersJson.data.length > 0) {
              setSelectedMember(membersJson.data[0].id);
            }
          }
        } else {
          setSelectedMember(uid);
        }
      }
    }
    init();
  }, []);

  const fetchLedger = useCallback(async () => {
    if (!selectedMember || !selectedYear) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ledger?memberId=${selectedMember}&yearId=${selectedYear}`);
      const json = await res.json();
      if (json.success) {
        const fetched: LedgerEntry[] = json.data.entries;
        // Fill all 12 months
        const full = MONTHS.map((_, i) => {
          const found = fetched.find((e) => e.month === i + 1);
          return found || emptyEntry(i + 1);
        });
        setEntries(full);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMember, selectedYear]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  function startEdit(entry: LedgerEntry) {
    setEditingMonth(entry.month);
    setEditValues({ ...entry });
  }

  function cancelEdit() {
    setEditingMonth(null);
    setEditValues(null);
  }

  async function saveEntry() {
    if (!editValues || !selectedYear || !selectedMember) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ledger", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editValues, memberId: selectedMember, yearId: selectedYear }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Ledger updated");
        setEditingMonth(null);
        setEditValues(null);
        fetchLedger();
      } else {
        toast.error(json.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function createYear() {
    const yearNum = parseInt(newYear);
    if (!yearNum || yearNum < 2000 || yearNum > 2100) {
      toast.error("Enter a valid year (2000–2100)");
      return;
    }
    const res = await fetch("/api/years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: yearNum, label: `${yearNum} Financial Year`, isActive: false }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(`Year ${yearNum} created`);
      setYears((prev) => [...prev, json.data]);
      setShowNewYear(false);
      setNewYear("");
    } else {
      toast.error(json.error);
    }
  }

  // Totals
  const totals = FIELDS.reduce((acc, f) => {
    acc[f.key] = entries.reduce((s, e) => s + parseFloat(e[f.key] || "0"), 0);
    return acc;
  }, {} as Record<FieldKey, number>);

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  const selectedMemberName = members.find((m) => m.id === selectedMember)?.fullName || "";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="page-title">Financial Ledger</h1>
          <p className="page-subtitle">View and manage contribution records</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNewYear(!showNewYear)} className="btn-secondary btn-sm">
            <Plus className="w-4 h-4" /> Add Year
          </button>
        )}
      </div>

      {/* Add Year */}
      {showNewYear && (
        <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
          <input
            type="number"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            placeholder="e.g. 2024"
            className="input w-40"
          />
          <button onClick={createYear} className="btn-primary btn-sm">Create Year</button>
          <button onClick={() => setShowNewYear(false)} className="btn-secondary btn-sm">Cancel</button>
        </div>
      )}

      {/* Selectors */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="flex-1">
          <label className="label">Financial Year</label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input appearance-none pr-10"
            >
              <option value="">— Select Year —</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label} {y.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {isAdmin && (
          <div className="flex-1">
            <label className="label">Member</label>
            <div className="relative">
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="input appearance-none pr-10"
              >
                <option value="">— Select Member —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName} — {m.phone}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Ledger Header Info */}
      {selectedMemberName && (
        <div className="flex items-center gap-2 mb-4 text-slate-600">
          <BookOpen className="w-4 h-4" />
          <span className="font-medium">{selectedMemberName}</span>
          <span>—</span>
          <span>{years.find((y) => y.id === selectedYear)?.label}</span>
        </div>
      )}

      {/* Ledger Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        </div>
      ) : !selectedYear || !selectedMember ? (
        <div className="card p-12 text-center text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Select a year and member to view the ledger</p>
        </div>
      ) : (
        <ResponsiveTable>
          <table className="table ledger-table">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20">Month</th>
                  {FIELDS.map((f) => <th key={f.key}>{f.label}</th>)}
                  <th>Row Total</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isEditing = editingMonth === entry.month;
                  const rowTotal = FIELDS.reduce((s, f) => {
                    const val = isEditing && editValues ? editValues[f.key] : entry[f.key];
                    return s + parseFloat(val || "0");
                  }, 0);

                  return (
                    <tr key={entry.month} className={isEditing ? "bg-blue-50" : ""}>
                      <td className="sticky left-0 bg-white font-semibold text-slate-800 z-10">
                        {getMonthName(entry.month)}
                      </td>

                      {FIELDS.map((f) => (
                        <td key={f.key}>
                          {isEditing && editValues ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValues[f.key]}
                              onChange={(e) =>
                                setEditValues((v) => v ? { ...v, [f.key]: e.target.value } : v)
                              }
                              className="input py-1.5 text-sm w-28"
                            />
                          ) : (
                            <span className={parseFloat(entry[f.key]) > 0 ? "font-medium" : "text-slate-300"}>
                              {formatCurrency(entry[f.key])}
                            </span>
                          )}
                        </td>
                      ))}

                      <td className="font-semibold text-blue-700">
                        {formatCurrency(rowTotal)}
                      </td>

                      {isAdmin && (
                        <td>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button
                                onClick={saveEntry}
                                disabled={saving}
                                className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                                title="Save"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-700"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* Totals Row */}
                <tr className="bg-blue-900 text-white font-bold">
                  <td className="sticky left-0 bg-blue-900 text-white z-10">TOTAL</td>
                  {FIELDS.map((f) => (
                    <td key={f.key}>{formatCurrency(totals[f.key])}</td>
                  ))}
                  <td className="text-yellow-300">{formatCurrency(grandTotal)}</td>
                  {isAdmin && <td />}
                </tr>
              </tbody>
            </table>
        </ResponsiveTable>
      )}
    </div>
  );
}
