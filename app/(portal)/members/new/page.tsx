"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(7, "Enter a valid phone number"),
  graduationYear: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(["member", "admin"]),
});

type FormData = z.infer<typeof schema>;

export default function NewMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "member" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to create member");
        return;
      }

      toast.success(`Member "${data.fullName}" created successfully!`);
      router.push("/members");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/members" className="flex items-center gap-2 text-blue-700 font-medium text-sm hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </Link>
        <h1 className="page-title">Add New Member</h1>
        <p className="page-subtitle">Create a new member account. They will use the default password: <span className="font-mono font-bold">Idanrenewera</span></p>
      </div>

      <div className="card p-6 md:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Required Fields */}
          <div>
            <h2 className="section-title mb-4 pb-3 border-b border-slate-200">Required Information</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input {...register("fullName")} className="input" placeholder="e.g. John Adebayo Okafor" />
                {errors.fullName && <p className="error-text">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="label">Phone Number *</label>
                <input
                  {...register("phone")}
                  type="tel"
                  className="input"
                  placeholder="e.g. 08012345678"
                />
                <p className="text-slate-400 text-xs mt-1">This will be used as the login identifier.</p>
                {errors.phone && <p className="error-text">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="label">Account Role *</label>
                <select {...register("role")} className="input">
                  <option value="member">Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div>
            <h2 className="section-title mb-4 pb-3 border-b border-slate-200">Additional Information (Optional)</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Graduation Set / Year</label>
                <input
                  {...register("graduationYear")}
                  className="input"
                  placeholder="e.g. 1998 or Class of 98"
                />
              </div>

              <div>
                <label className="label">Occupation</label>
                <input
                  {...register("occupation")}
                  className="input"
                  placeholder="e.g. Engineer, Doctor, Teacher"
                />
              </div>

              <div>
                <label className="label">Address</label>
                <textarea
                  {...register("address")}
                  className="input min-h-[80px] resize-none"
                  placeholder="Residential or office address"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">What happens after creation?</p>
            <ul className="space-y-1 list-disc list-inside text-blue-600">
              <li>The member receives a default password: <span className="font-mono font-bold">Idanrenewera</span></li>
              <li>On first login, they must immediately change this password</li>
              <li>Their account becomes active after password change</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/members" className="btn-secondary flex-1">Cancel</Link>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
              ) : (
                <><UserPlus className="w-5 h-5" /> Create Member</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
