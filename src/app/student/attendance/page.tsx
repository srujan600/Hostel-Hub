"use client";

import React, { useState, useEffect } from "react";
import { ClipboardList, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function StudentAttendancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await api.get<any>("/api/attendance");
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Attendance fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <Badge variant="success" dot>Present</Badge>;
      case "ABSENT":
        return <Badge variant="danger" dot>Absent</Badge>;
      case "LATE":
        return <Badge variant="warning" dot>Late Check-In</Badge>;
      case "EXCUSED":
        return <Badge variant="info" dot>Excused Out-Pass</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="STUDENT">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
              Campus Security Logging
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-sans">
              21:00 Evening Roll Call Registry
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Resident Attendance Record
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-sans">
            Daily physical verification conducted by Lead Warden Marcus Vance
          </p>
        </div>

        {/* Attendance Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-600">
            <CardContent className="p-4">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                Overall Compliance
              </span>
              <span className="font-heading text-2xl font-extrabold text-slate-900 mt-1 block">
                {loading ? "--" : `${data?.summary?.attendancePercentage ?? 100}%`}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium font-sans">
                Good Standing (Req: 75%)
              </span>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                Present Days
              </span>
              <span className="font-heading text-2xl font-extrabold text-slate-900 mt-1 block">
                {loading ? "--" : data?.summary?.presentCount ?? 0}
              </span>
              <span className="text-[11px] text-slate-500 font-sans">Verified in Room</span>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-600">
            <CardContent className="p-4">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                Unexcused Absences
              </span>
              <span className="font-heading text-2xl font-extrabold text-slate-900 mt-1 block">
                {loading ? "--" : data?.summary?.absentCount ?? 0}
              </span>
              <span className="text-[11px] text-rose-600 font-sans">Curfew Breach Count</span>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sky-600">
            <CardContent className="p-4">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                Excused Out-Passes
              </span>
              <span className="font-heading text-2xl font-extrabold text-slate-900 mt-1 block">
                {loading ? "--" : data?.summary?.excusedCount ?? 0}
              </span>
              <span className="text-[11px] text-slate-500 font-sans">Warden Approved</span>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Log History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={4} cols={4} />
            ) : data?.records?.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No attendance logs available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50/80 text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Inspector Remark</th>
                      <th className="py-3 px-4">Correction Trail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.records?.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          {rec.date}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(rec.status)}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {rec.remarks || "Standard evening check-in"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {rec.isCorrected ? "Corrected by Warden" : "Original Record"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
