import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number | null | undefined): string {
  const num = parseFloat(String(amount || 0));
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getMonthName(month: number): string {
  return MONTHS[month - 1] || "Unknown";
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, "").trim();
}

export function generateDefaultPassword(): string {
  return process.env.DEFAULT_MEMBER_PASSWORD || "NewEra2026!";
}

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export function apiSuccess<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

export function apiError(error: string): ApiResponse {
  return { success: false, error };
}
