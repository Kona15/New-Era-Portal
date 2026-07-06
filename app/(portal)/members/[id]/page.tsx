"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft, Edit, Save, X, Key, UserCheck, UserX,
  User, Phone, Calendar, Briefcase, MapPin, BookOpen, Loader2
} from "lucide-react";
import { formatDate, formatDateTime, cn } from "@/lib/utils";

const editSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(7, "Valid phone number required"),
  graduationYear: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isContactAdmin: z.boolean().optional(),
});

type EditData = z.infer<typeof editSchema>;

interface Member {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  graduationYear: string | null;
  occupation: string | null;
  address: string | null;
  dateJoined: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { active: "badge-green", inactive: "badge-red", pending: "badge-yellow" };
  return <span className={cn("badge text-sm py-1 px-3", map[status] || "badge-gray")}>{status}</span>;
}

export default function MemberProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const startEditing = searchParams.get("edit") === "true";

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(startEditing);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditData>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    async function fetchMember() {
      setLoading(true);
      const res = await fetch(`/api/members/${id}`);
      const json = await res.json();
      if (json.success) {
        setMember(json.data);
        reset({
          fullName: json.data.fullName,
          phone: json.data.phone,
          graduationYear: json.data.graduationYear,
          occupation: json.data.occupation,
          address: json.data.address,
          isContactAdmin: json.data.role === "admin",
        });
      } else {
        toast.error("Member not found");
        router.push("/members");
      }
      setLoading(false);
    }
    fetchMember();
  }, [id]);

  async function onSave(data: EditData) {
    setSaving(true);
    try {
      const payload: any = { ...data };
      if (typeof data.isContactAdmin !== "undefined") {
        payload.role = data.isContactAdmin ? "admin" : "member";
        delete payload.isContactAdmin;
      }

      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setMember(json.data);
        setEditing(false);
        toast.success("Member updated successfully");
      } else {
        toast.error(json.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusToggle() {
    if (!member) return;
    const newStatus = member.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.success) {
      setMember(json.data);
      toast.success(`Member ${newStatus}`);
    } else {
      toast.error(json.error);
    }
  }

  async function handleResetPassword() {
    setResetting(true);
    try {
      const res = await fetch(`/api/members/${id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
      } else {
        toast.error(json.error);
      }
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/members" className="flex items-center gap-2 text-blue-700 font-medium text-sm hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </Link>
      </div>

      {/* Profile Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {member.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-slate-900">{member.fullName}</h1>
              <StatusBadge status={member.status} />
              {member.role === "admin" && (
                <span className="badge badge-blue">Admin</span>
              )}
            </div>
            <p className="text-slate-500 text-sm">{member.phone}</p>
            {member.mustChangePassword && (
              <p className="text-amber-600 text-sm font-medium mt-1">⚠ Password change required</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">
                <Edit className="w-4 h-4" /> Edit
              </button>
            )}
            <button
              onClick={handleStatusToggle}
              className={cn("btn-sm", member.status === "active" ? "btn-danger" : "btn-primary")}
            >
              {member.status === "active"
                ? <><UserX className="w-4 h-4" /> Deactivate</>
                : <><UserCheck className="w-4 h-4" /> Activate</>
              }
            </button>
            <button onClick={handleResetPassword} disabled={resetting} className="btn-secondary btn-sm">
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Reset Password
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form or Detail View */}
      <div className="card p-6 mb-6">
        {editing ? (
          <form onSubmit={handleSubmit(onSave)}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">Edit Member Information</h2>
              <button type="button" onClick={() => setEditing(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input {...register("fullName")} className="input" />
                {errors.fullName && <p className="error-text">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input {...register("phone")} type="tel" className="input" />
                {errors.phone && <p className="error-text">{errors.phone.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Graduation Set / Year</label>
                  <input {...register("graduationYear")} className="input" placeholder="e.g. 1998" />
                </div>
                <div>
                  <label className="label">Occupation</label>
                  <input {...register("occupation")} className="input" placeholder="e.g. Engineer" />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea {...register("address")} className="input min-h-[80px] resize-none" placeholder="Residential address" />
              </div>
              <div>
                <label className="label">Make Contact Admin</label>
                <div className="flex items-center gap-3">
                  <input {...register("isContactAdmin")} type="checkbox" className="w-4 h-4" />
                  <p className="text-sm text-slate-600">Grant admin privileges to this member (contact admin)</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h2 className="section-title mb-6">Member Information</h2>
            <div className="space-y-4">
              {[
                { icon: <User className="w-4 h-4" />, label: "Full Name", value: member.fullName },
                { icon: <Phone className="w-4 h-4" />, label: "Phone Number", value: member.phone },
                { icon: <BookOpen className="w-4 h-4" />, label: "Graduation Set / Year", value: member.graduationYear || "Not specified" },
                { icon: <Briefcase className="w-4 h-4" />, label: "Occupation", value: member.occupation || "Not specified" },
                { icon: <MapPin className="w-4 h-4" />, label: "Address", value: member.address || "Not specified" },
                { icon: <Calendar className="w-4 h-4" />, label: "Date Joined", value: formatDate(member.dateJoined) },
                { icon: <Calendar className="w-4 h-4" />, label: "Account Created", value: formatDateTime(member.createdAt) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                  <div className="text-slate-400 mt-0.5 shrink-0">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-slate-800 mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="flex gap-3">
        <Link href={`/ledger?memberId=${member.id}`} className="btn-secondary flex-1">
          <BookOpen className="w-4 h-4" /> View Ledger
        </Link>
        <Link href={`/reports?memberId=${member.id}`} className="btn-secondary flex-1">
          View Reports
        </Link>
      </div>
    </div>
  );
}
