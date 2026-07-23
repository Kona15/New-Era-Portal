"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  User, Phone, Calendar, Briefcase, MapPin, BookOpen,
  Lock, Eye, EyeOff, CheckCircle, Loader2, Shield
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[0-9]/, "Must include a number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PwData = z.infer<typeof passwordSchema>;

interface MemberProfile {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  graduationYear: string | null;
  occupation: string | null;
  address: string | null;
  dateJoined: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPwSection, setShowPwSection] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const { register, handleSubmit, reset: resetForm, watch, formState: { errors } } = useForm<PwData>({
    resolver: zodResolver(passwordSchema),
  });

  const newPw = watch("newPassword", "");
  const checks = {
    length: newPw.length >= 8,
    number: /[0-9]/.test(newPw),
  };

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.success) setProfile(json.data);
      setLoading(false);
    }
    fetchProfile();
  }, []);

  async function onChangePassword(data: PwData) {
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Password changed successfully!");
        resetForm();
        setShowPwSection(false);
      } else {
        toast.error(json.error || "Failed to change password");
      }
    } finally {
      setSavingPw(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="page-title mb-8">My Profile</h1>

      {/* Profile Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{profile.fullName}</h2>
            <p className="text-slate-500">{profile.phone}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`badge ${profile.status === "active" ? "badge-green" : "badge-yellow"}`}>
                {profile.status}
              </span>
              {profile.role === "admin" && <span className="badge badge-blue">Administrator</span>}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          {[
            { icon: <Phone className="w-4 h-4" />, label: "Phone", value: profile.phone },
            { icon: <BookOpen className="w-4 h-4" />, label: "Graduation Set", value: profile.graduationYear || "Not specified" },
            { icon: <Briefcase className="w-4 h-4" />, label: "Occupation", value: profile.occupation || "Not specified" },
            { icon: <MapPin className="w-4 h-4" />, label: "Address", value: profile.address || "Not specified" },
            { icon: <Calendar className="w-4 h-4" />, label: "Member Since", value: formatDate(profile.dateJoined) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <div className="text-slate-400 w-5 shrink-0">{icon}</div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-slate-800 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Password Change */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="section-title">Password & Security</h2>
              <p className="text-slate-400 text-sm">Change your account password</p>
            </div>
          </div>
          {!showPwSection && (
            <button onClick={() => setShowPwSection(true)} className="btn-secondary btn-sm">
              <Lock className="w-4 h-4" /> Change Password
            </button>
          )}
        </div>

        {showPwSection && (
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register("currentPassword")}
                  type={showCurrent ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="Your current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && <p className="error-text">{errors.currentPassword.message}</p>}
            </div>

            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register("newPassword")}
                  type={showNew ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="Create a strong new password"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="error-text">{errors.newPassword.message}</p>}
              {newPw && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[
                    { key: "length", label: "8+ characters" },
                    { key: "number", label: "Number" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle className={`w-3.5 h-3.5 ${checks[key as keyof typeof checks] ? "text-green-500" : "text-slate-300"}`} />
                      <span className={checks[key as keyof typeof checks] ? "text-green-700" : "text-slate-400"}>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="Repeat new password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowPwSection(false); resetForm(); }} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={savingPw} className="btn-primary flex-1">
                {savingPw ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Change Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
