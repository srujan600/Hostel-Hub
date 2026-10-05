"use client";

import React, { useState, useEffect } from "react";
import { TopHeader } from "./top-header";
import { Sidebar } from "./sidebar";
import { UserSession } from "@/types";
import { api } from "@/services/api-client";

export interface AppShellProps {
  children: React.ReactNode;
  expectedRole?: "STUDENT" | "WARDEN" | "ADMIN" | "SUPER_ADMIN" | "SECURITY";
}

export function AppShell({ children, expectedRole }: AppShellProps) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await api.get<any>("/api/auth/me");
        if (res.success && res.data) {
          const u: UserSession = {
            id: res.data.id,
            username: res.data.username,
            name: res.data.name,
            email: res.data.email,
            role: res.data.role,
            status: res.data.status,
            studentId: res.data.studentProfile?.studentId,
            staffId: res.data.staffProfile?.employeeId,
            hostelId: res.data.staffProfile?.assignedHostel?.id,
          };
          setUser(u);
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <TopHeader
        user={user}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex">
        <Sidebar
          role={user?.role || expectedRole || "STUDENT"}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Stage (offset by 256px for desktop sidebar) */}
        <main className="flex-1 lg:pl-64 min-h-[calc(100vh-4rem)]">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
