"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Shield, LayoutDashboard, Users, BookOpen, BarChart2, Upload,
  Settings, LogOut, Menu, X, User, FileText, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
  { href: "/members", icon: <Users className="w-5 h-5" />, label: "Members", adminOnly: true },
  { href: "/ledger", icon: <BookOpen className="w-5 h-5" />, label: "Ledger" },
  { href: "/reports", icon: <BarChart2 className="w-5 h-5" />, label: "Reports" },
  { href: "/import", icon: <Upload className="w-5 h-5" />, label: "Import Data", adminOnly: true },
  { href: "/admin", icon: <Settings className="w-5 h-5" />, label: "Admin", adminOnly: true },
  { href: "/profile", icon: <User className="w-5 h-5" />, label: "My Profile" },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = userRole === "admin";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      toast.error("Logout failed");
      setLoggingOut(false);
    }
  }

  const filteredItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const NavLinks = () => (
    <nav className="flex-1 py-4 overflow-y-auto">
      <div className="px-3 space-y-1">
        {filteredItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-link", active && "active")}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  const UserSection = () => (
    <div className="border-t border-blue-800 p-4">
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{userName}</p>
          <p className="text-blue-300 text-xs capitalize">{userRole}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white transition-colors text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        {loggingOut ? "Signing out..." : "Sign Out"}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-blue-900 min-h-screen fixed left-0 top-0 z-30">
        <div className="flex items-center gap-3 p-5 border-b border-blue-800">
          <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">New Era</p>
            <p className="text-blue-300 text-xs">Alumni Portal</p>
          </div>
        </div>
        <NavLinks />
        <UserSection />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-blue-900 h-16 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-white" />
          <span className="text-white font-bold text-lg">New Era</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-white rounded-lg hover:bg-blue-800"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 bg-blue-900 flex flex-col h-full pt-16">
            <NavLinks />
            <UserSection />
          </div>
        </div>
      )}
    </>
  );
}
