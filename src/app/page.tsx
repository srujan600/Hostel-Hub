"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // If token exists, direct to role-specific dashboard or /login
    const token = localStorage.getItem("hostelhub_token");
    const role = localStorage.getItem("hostelhub_role");

    if (token && role) {
      switch (role) {
        case "STUDENT":
          router.replace("/student/dashboard");
          return;
        case "WARDEN":
          router.replace("/warden/dashboard");
          return;
        case "ADMIN":
        case "SUPER_ADMIN":
          router.replace("/admin/dashboard");
          return;
        default:
          router.replace("/login");
          return;
      }
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="font-heading font-semibold text-primary text-sm tracking-wide">
          Connecting to HostelHub Platform...
        </p>
      </div>
    </div>
  );
}
