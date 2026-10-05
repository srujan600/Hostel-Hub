"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  AlertCircle,
  CalendarCheck,
  Users,
  ClipboardList,
  BellRing,
  Utensils,
  UserCheck,
  Grid,
  FileText,
  Settings,
  Shield,
  Layers,
  History,
} from "lucide-react";
import { Role } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface SidebarProps {
  role?: Role;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role = "STUDENT", isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const studentNav: NavItem[] = [
    { label: "Dashboard", href: "/student/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "My Room", href: "/student/room", icon: <Home className="w-4 h-4" />, badge: "204-A" },
    { label: "Complaints", href: "/student/complaints", icon: <AlertCircle className="w-4 h-4" /> },
    { label: "Leave & Outing", href: "/student/leave", icon: <CalendarCheck className="w-4 h-4" /> },
    { label: "Visitor Passes", href: "/student/visitors", icon: <Users className="w-4 h-4" /> },
    { label: "Attendance", href: "/student/attendance", icon: <ClipboardList className="w-4 h-4" /> },
    { label: "Notice Board", href: "/student/notices", icon: <BellRing className="w-4 h-4" /> },
    { label: "Mess Schedule", href: "/student/mess", icon: <Utensils className="w-4 h-4" /> },
    { label: "My Profile", href: "/student/profile", icon: <UserCheck className="w-4 h-4" /> },
  ];

  const wardenNav: NavItem[] = [
    { label: "Command Center", href: "/warden/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Occupancy Matrix", href: "/warden/matrix", icon: <Grid className="w-4 h-4" />, badge: "280 Beds" },
    { label: "Residents Roster", href: "/warden/residents", icon: <Users className="w-4 h-4" /> },
    { label: "Leave Adjudication", href: "/warden/leave", icon: <CalendarCheck className="w-4 h-4" />, badge: "1 Pending" },
    { label: "Complaints Desk", href: "/warden/complaints", icon: <AlertCircle className="w-4 h-4" />, badge: "2 Active" },
    { label: "Visitor Registry", href: "/warden/visitors", icon: <Shield className="w-4 h-4" /> },
    { label: "Roll Call Attendance", href: "/warden/attendance", icon: <ClipboardList className="w-4 h-4" /> },
    { label: "Publish Notices", href: "/warden/notices", icon: <BellRing className="w-4 h-4" /> },
    { label: "Mess Oversight", href: "/warden/mess", icon: <Utensils className="w-4 h-4" /> },
    { label: "Operational Reports", href: "/warden/reports", icon: <FileText className="w-4 h-4" /> },
  ];

  const adminNav: NavItem[] = [
    { label: "Executive Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Hostels & Blocks", href: "/admin/hostels", icon: <Layers className="w-4 h-4" /> },
    { label: "Room Allocations", href: "/admin/allocations", icon: <Grid className="w-4 h-4" /> },
    { label: "Student Master", href: "/admin/students", icon: <Users className="w-4 h-4" /> },
    { label: "Staff & Wardens", href: "/admin/staff", icon: <Shield className="w-4 h-4" /> },
    { label: "Institutional Reports", href: "/admin/reports", icon: <FileText className="w-4 h-4" /> },
    { label: "Audit Log Trail", href: "/admin/audit-logs", icon: <History className="w-4 h-4" /> },
    { label: "System Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const securityNav: NavItem[] = [
    { label: "Gate Control Center", href: "/security/dashboard", icon: <Shield className="w-4 h-4" /> },
    { label: "Visitor Passes", href: "/security/visitors", icon: <Users className="w-4 h-4" /> },
  ];

  let currentNav = studentNav;
  if (role === "WARDEN") currentNav = wardenNav;
  if (role === "ADMIN" || role === "SUPER_ADMIN") currentNav = adminNav;
  if (role === "SECURITY") currentNav = securityNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-slate-50 border-r border-slate-200/90 flex flex-col justify-between z-40 transition-transform duration-200 ease-in-out custom-scrollbar overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-3 space-y-1">
          {/* Header Tag */}
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {role === "STUDENT"
              ? "Resident Portal v4.2"
              : role === "WARDEN"
              ? "Operational Terminal v4.2"
              : role === "SECURITY"
              ? "Security Gate Post v4.2"
              : "Institutional Console v4.2"}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5">
            {currentNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-heading font-medium transition-all ${
                    isActive
                      ? "bg-primary-container text-white font-semibold shadow-xs border-l-4 border-secondary"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? "text-white" : "text-slate-400"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700 font-semibold"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Institutional Seal Info */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-100/50">
          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>HostelHub • Encrypted TLS</span>
          </div>
        </div>
      </aside>
    </>
  );
}
