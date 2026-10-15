import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider } from "@/context/session-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "HostelHub — Smart Campus Residential Operations Platform",
  description:
    "Institutional campus operations platform providing role-aware experiences for Students, Wardens, and Administrators.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F8FAFC] text-[#131B2E]">
        <ToastProvider>
          <SessionProvider>{children}</SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

