"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  LogOut,
  Menu,
  ShieldAlert,
  Building,
  ChevronDown,
} from "lucide-react";
import { UserSession } from "@/types";
import { api } from "@/services/api-client";

export interface TopHeaderProps {
  user: UserSession | null;
  onToggleSidebar?: () => void;
}

export function TopHeader({ user, onToggleSidebar }: TopHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await api.post("/api/auth/logout");
      localStorage.removeItem("hostelhub_token");
      localStorage.removeItem("hostelhub_role");
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      localStorage.removeItem("hostelhub_token");
      localStorage.removeItem("hostelhub_role");
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="w-full h-16 px-4 sm:px-6 flex items-center justify-between z-40 sticky top-0 bg-white border-b border-slate-200/90 shadow-xs">
      {/* Left Cluster: Mobile toggle + Brand & Hall Switcher */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Brand Emblem */}
        <div className="flex items-center gap-2.5 pr-4 border-r border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center font-heading font-extrabold text-sm shadow-xs border border-primary">
            HH
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="font-heading font-bold text-primary tracking-tight text-base block">
              HostelHub
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block -mt-0.5">
              Residential OS
            </span>
          </div>
        </div>

        {/* Campus / Block Breadcrumb Switcher */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition-colors cursor-pointer">
            <Building className="w-4 h-4 text-primary" />
            <span className="font-heading text-xs font-semibold text-primary tracking-tight">
              North Campus • St. Jude Hall / Block C
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] font-semibold tracking-wider uppercase">
              System Live • Curfew 22:30
            </span>
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resident, room 204..301, badge, pass... (⌘K)"
            className="w-full h-9 pl-9 pr-12 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-secondary focus:bg-white placeholder:text-slate-400 transition-all font-sans"
          />
          <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Cluster: Emergency Broadcast, Notifications, Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user?.role !== "STUDENT" && (
          <button
            onClick={() => alert("Emergency alert broadcast opened")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error hover:bg-rose-700 text-white font-heading text-xs font-semibold shadow-xs active:translate-y-[1px] transition-all cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Broadcast</span>
          </button>
        )}

        {/* Notifications Icon Button */}
        <button
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Campus Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white" />
        </button>

        {/* User Identity Badge */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-white font-heading font-bold flex items-center justify-center text-xs ring-1 ring-primary/20">
              {getInitials(user.name)}
            </div>
            <div className="hidden sm:block leading-tight text-left">
              <div className="font-heading text-xs font-semibold text-slate-900">
                {user.name}
              </div>
              <div className="font-mono text-[10px] text-slate-500">
                {user.role} {user.studentId ? `• ${user.studentId}` : user.staffId ? `• ${user.staffId}` : ""}
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
