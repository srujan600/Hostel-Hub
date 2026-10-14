"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserSession } from "@/types";
import { api } from "@/services/api-client";

interface SessionContextType {
  user: UserSession | null;
  loading: boolean;
  setUser: (user: UserSession | null) => void;
  refreshSession: () => Promise<UserSession | null>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshSession: async () => null,
  logout: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize immediately from localStorage for 0ms delay on initial mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("hostelhub_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        setUser(parsed);
        setLoading(false);
      }
    } catch {
      // Ignore parse errors
    }

    // Background verify session once
    let isMounted = true;
    async function verify() {
      try {
        const res = await api.get<any>("/api/auth/me");
        if (isMounted && res.success && res.data) {
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
          localStorage.setItem("hostelhub_user", JSON.stringify(u));
        }
      } catch {
        // Fallback to cached
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
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
        localStorage.setItem("hostelhub_user", JSON.stringify(u));
        return u;
      }
    } catch {
      // Ignore
    }
    return null;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem("hostelhub_token");
      localStorage.removeItem("hostelhub_role");
      localStorage.removeItem("hostelhub_user");
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return (
    <SessionContext.Provider value={{ user, loading, setUser, refreshSession, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
