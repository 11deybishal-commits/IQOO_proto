"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  BookOpen,
  Network,
  Settings,
  LogOut,
  Sparkles,
  Wrench,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { VoiceCommand } from "@/components/voice/VoiceCommand";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/self-healing", label: "Self-Healing", icon: Wrench },
  { href: "/forecasting", label: "Forecasting", icon: TrendingUp },
  { href: "/chatops", label: "ChatOps Swarm", icon: MessageSquare },
  { href: "/blast-radius", label: "Blast Radius", icon: Network },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060913]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Shield size={24} color="white" />
          </div>
          <div className="spinner" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex">
      {/* Sticky Left Sidebar - Natural flexbox column, never overlaps content */}
      <aside className="w-64 min-w-[16rem] h-screen sticky top-0 flex flex-col z-30 bg-[#0a0e1a]/95 border-r border-indigo-500/20 backdrop-blur-2xl flex-shrink-0 select-none">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-indigo-500/15">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <Shield size={18} color="white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm text-white tracking-wide">SentinelOps</p>
                <Sparkles size={11} className="text-indigo-400" />
              </div>
              <p className="text-[11px] text-slate-400">Autonomous SRE Intel</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Main Menu</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <Icon size={17} className={active ? "text-indigo-400" : "text-slate-400"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Voice AI Command Shortcut */}
        <div className="p-3 border-t border-indigo-500/15">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Voice Dispatch</p>
          <VoiceCommand />
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-indigo-500/15 bg-[#080d19]/80">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}
            >
              {(user.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user.full_name || "Lead SRE"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 transition-all"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Area - Clean scrolling view with dedicated padding */}
      <main className="flex-1 min-w-0 min-h-screen overflow-y-auto">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
