import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HostelHub — Smart Campus Residential Operations Platform",
  description:
    "Institutional campus operations platform providing role-aware experiences for Students, Wardens, and Administrators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="antialiased min-h-screen bg-[#F8FAFC] text-[#131B2E]">
        {children}
      </body>
    </html>
  );
}
