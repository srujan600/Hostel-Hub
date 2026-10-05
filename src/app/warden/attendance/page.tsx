"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function WardenAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ date: string; roster: any[] }>(`/api/warden/attendance?date=${selectedDate}`);
      if (res.success && res.data) {
        setRoster(res.data.roster);
      }
    } catch (err) {
      console.error("Failed to load attendance roster:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const handleUpdateStatus = async (studentId: string, status: string, remarks?: string) => {
    try {
      setUpdatingId(studentId);
      const res = await api.post("/api/warden/attendance", {
        date: selectedDate,
        studentId,
        status,
        remarks,
      });

      if (res.success) {
        setRoster((prev) =>
          prev.map((item) =>
            item.studentId === studentId ? { ...item, status, remarks: remarks || item.remarks } : item
          )
        );
      }
    } catch (err: any) {
      alert(err.message || "Failed to update attendance.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!confirm(`Mark all active residents as PRESENT for ${selectedDate}?`)) return;

    try {
      setBatchLoading(true);
      const res = await api.post("/api/warden/attendance", {
        date: selectedDate,
        markAllPresent: true,
      });

      if (res.success) {
        fetchAttendance();
      }
    } catch (err: any) {
      alert(err.message || "Failed to mark all present.");
    } finally {
      setBatchLoading(false);
    }
  };

  // Date Navigator Helpers
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Stats Calculations
  const totalStudents = roster.length;
  const presentCount = roster.filter((r) => r.status === "PRESENT").length;
  const absentCount = roster.filter((r) => r.status === "ABSENT").length;
  const lateCount = roster.filter((r) => r.status === "LATE").length;
  const excusedCount = roster.filter((r) => r.status === "EXCUSED").length;
  const unmarkedCount = roster.filter((r) => r.status === "UNMARKED").length;
  const complianceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount + excusedCount) / totalStudents) * 100) : 0;

  // Filtered Roster
  const filteredRoster = roster.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchRoll = item.rollNumber?.toLowerCase().includes(q);
      const matchRoom = item.roomNumber?.toLowerCase().includes(q);
      return matchName || matchRoll || matchRoom;
    }
    return true;
  });

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Daily Roll Call & Night Curfew Audit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Warden Operations • Night roll verification and compliance tracking
          </p>
        </div>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500">Total Residents</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{totalStudents}</div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50/50 border-emerald-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Present</span>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">{presentCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-red-50/50 border-red-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase font-bold text-red-700">Absent</span>
              <div className="text-xl font-bold text-red-700 mt-0.5">{absentCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/50 border-amber-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase font-bold text-amber-700">Late Return</span>
              <div className="text-xl font-bold text-amber-700 mt-0.5">{lateCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 border-blue-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase font-bold text-blue-700">On Leave / Excused</span>
              <div className="text-xl font-bold text-blue-700 mt-0.5">{excusedCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#00236f]/5 border-[#00236f]/20 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase font-bold text-[#00236f]">Compliance</span>
              <div className="text-xl font-bold text-[#00236f] mt-0.5">{complianceRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Date Selector & Action Toolbar */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Date Control */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shiftDate(-1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-[#00236f]" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shiftDate(1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className="text-xs h-8 text-slate-600"
                >
                  Today
                </Button>
              </div>

              {/* Batch Actions & Search */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, roll, room..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="EXCUSED">Excused</option>
                  <option value="UNMARKED">Unmarked</option>
                </select>

                <Button
                  size="sm"
                  onClick={handleMarkAllPresent}
                  disabled={batchLoading}
                  className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn text-xs h-8 gap-1.5 shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {batchLoading ? "Marking..." : "Mark All Present"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roll Call Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-[#00236f]" />
              Roll Call Roster • {selectedDate}
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              {unmarkedCount} pending verification
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={8} />
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No residents found"
                  description="No roster entries match your search or filter settings."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Resident Name</th>
                      <th className="py-3 px-4">Roll ID</th>
                      <th className="py-3 px-4">Room / Bed</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right">Instant Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoster.map((r) => {
                      const isUpdating = updatingId === r.studentId;
                      return (
                        <tr key={r.studentId} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{r.name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">
                            {r.rollNumber}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-[#00236f]">
                            {r.roomNumber}
                          </td>
                          <td className="py-3 px-4">
                            {r.status === "PRESENT" && (
                              <Badge variant="success" className="bg-emerald-100 text-emerald-800">
                                PRESENT
                              </Badge>
                            )}
                            {r.status === "ABSENT" && (
                              <Badge variant="danger" className="bg-red-100 text-red-800 font-bold">
                                ABSENT
                              </Badge>
                            )}
                            {r.status === "LATE" && (
                              <Badge variant="warning" className="bg-amber-100 text-amber-800">
                                LATE
                              </Badge>
                            )}
                            {r.status === "EXCUSED" && (
                              <Badge variant="info" className="bg-blue-100 text-blue-800">
                                EXCUSED
                              </Badge>
                            )}
                            {r.status === "UNMARKED" && (
                              <Badge variant="neutral" className="text-slate-400">
                                UNMARKED
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 italic max-w-xs truncate">
                            {r.remarks || "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                title="Mark Present"
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(r.studentId, "PRESENT")}
                                className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                                  r.status === "PRESENT"
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
                                }`}
                              >
                                P
                              </button>

                              <button
                                title="Mark Absent"
                                disabled={isUpdating}
                                onClick={() => {
                                  const reason = prompt("Enter reason for absence (optional):", r.remarks || "");
                                  if (reason !== null) {
                                    handleUpdateStatus(r.studentId, "ABSENT", reason);
                                  }
                                }}
                                className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                                  r.status === "ABSENT"
                                    ? "bg-red-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700"
                                }`}
                              >
                                A
                              </button>

                              <button
                                title="Mark Late Return"
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(r.studentId, "LATE", "Returned past curfew")}
                                className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                                  r.status === "LATE"
                                    ? "bg-amber-500 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700"
                                }`}
                              >
                                L
                              </button>

                              <button
                                title="Mark Excused / Leave"
                                disabled={isUpdating}
                                onClick={() => {
                                  const reason = prompt("Enter excuse / approved leave code:", r.remarks || "Approved Overnight Outing");
                                  if (reason !== null) {
                                    handleUpdateStatus(r.studentId, "EXCUSED", reason);
                                  }
                                }}
                                className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                                  r.status === "EXCUSED"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                                }`}
                              >
                                E
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
