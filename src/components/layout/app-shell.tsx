"use client";

import React, { useState } from "react";
import { TopHeader } from "./top-header";
import { Sidebar } from "./sidebar";
import { useSession } from "@/context/session-context";

export interface AppShellProps {
  children: React.ReactNode;
  expectedRole?: "STUDENT" | "WARDEN" | "ADMIN" | "SUPER_ADMIN" | "SECURITY";
}

export function AppShell({ children, expectedRole }: AppShellProps) {
  const { user } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
