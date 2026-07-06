"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Shield, Phone, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

const schema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Login failed");
        return;
      }

      toast.success("Welcome back!");
      if (json.data.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetRequest() {
    if (!resetPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: resetPhone }),
      });
      const json = await res.json();
      toast.success(json.message || "Reset request submitted");
      setShowResetForm(false);
      setResetPhone("");
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-4 backdrop-blur">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">New Era</h1>
          <p className="text-blue-200 mt-1 text-base">Alumni Association Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!showResetForm ? (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-6">Sign in to your account</h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="label">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      {...register("phone")}
                      type="tel"
                      placeholder="e.g. 08012345678"
                      className="input pl-11"
                      autoComplete="tel"
                    />
                  </div>
                  {errors.phone && <p className="error-text">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="input pl-11 pr-11"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="error-text">{errors.password.message}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-200 text-center">
                <p className="text-slate-500 text-sm mb-3">Forgot your password?</p>
                <button
                  onClick={() => setShowResetForm(true)}
                  className="text-blue-700 font-semibold text-sm hover:underline"
                >
                  Request a password reset
                </button>
              </div>

              <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                <p className="font-semibold mb-1">First time logging in?</p>
                <p>Use your phone number and the default password: <span className="font-mono font-bold">NewEra2026!</span></p>
                <p className="mt-1">You will be asked to set a new password immediately.</p>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowResetForm(false)}
                className="text-blue-700 font-semibold text-sm hover:underline mb-4 flex items-center gap-1"
              >
                ← Back to login
              </button>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Request Password Reset</h2>
              <p className="text-slate-500 text-sm mb-6">
                Enter your phone number and an administrator will reset your password.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="label">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className="input pl-11"
                    />
                  </div>
                </div>

                <button
                  onClick={handleResetRequest}
                  disabled={resetLoading}
                  className="btn-primary w-full"
                >
                  {resetLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                  ) : (
                    "Submit Reset Request"
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-blue-300 text-sm mt-6">
          © {new Date().getFullYear()} New Era Alumni Association
        </p>
      </div>
    </div>
  );
}
