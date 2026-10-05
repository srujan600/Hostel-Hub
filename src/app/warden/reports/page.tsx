"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Printer,
  Bed,
  Wrench,
  CalendarCheck,
  Users,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function WardenReportsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await api.get<any>("/api/warden/reports");
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const csvRows = [
      ["Metric Category", "Metric Name", "Value"],
      ["Occupancy", "Total Beds", data.occupancy.totalBeds],
      ["Occupancy", "Occupied Beds", data.occupancy.occupiedBeds],
      ["Occupancy", "Available Beds", data.occupancy.availableBeds],
      ["Occupancy", "Occupancy Rate (%)", `${data.occupancy.occupancyRate}%`],
      ["Complaints", "Total Work Orders", data.complaints.total],
      ["Complaints", "Resolution Rate (%)", `${data.complaints.resolutionRate}%`],
      ["Leaves", "Total Leave Requests", data.leaves.total],
      ["Leaves", "Active Outings Now", data.leaves.activeOutingsNow],
      ["Attendance", "Total Residents", data.attendance.totalResidents],
      ["Attendance", "Present Count", data.attendance.presentCount],
      ["Attendance", "Absent Count", data.attendance.absentCount],
      ["Attendance", "Compliance Rate (%)", `${data.attendance.complianceRate}%`],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hostelhub_warden_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <AppShell expectedRole="WARDEN">
        <div className="space-y-6">
          <TableSkeleton rows={8} />
        </div>
      </AppShell>
    );
  }

  const { occupancy, complaints, leaves, attendance, visitors } = data;

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Operational & Facility Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Warden Operations • Live facility metrics, complaint resolution, and curfew audits
          </p>
        </div>
        {/* Actions Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hostel Operational Summary</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live facility metrics generated for Block C & North Wing as of {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5 border-slate-200 text-slate-700"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Briefing
            </Button>
            <Button
              size="sm"
              onClick={handleExportCSV}
              className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Top 4 Primary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#00236f] bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bed Occupancy Rate</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-[#00236f]">{occupancy.occupancyRate}%</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({occupancy.occupiedBeds} / {occupancy.totalBeds} beds)
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#00236f]">
                <Bed className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Work Order Resolution</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-emerald-600">{complaints.resolutionRate}%</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({complaints.total} total)
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Outings Now</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-amber-600">{leaves.activeOutingsNow}</h3>
                  <span className="text-xs text-slate-500 font-medium">residents away</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Curfew Compliance</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-purple-600">{attendance.complianceRate}%</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({attendance.presentCount} present)
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Room Allocation & Inventory */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Bed className="h-4 w-4 text-[#00236f]" />
                Room & Bed Inventory Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-blue-50/50 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Total Rooms</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{occupancy.totalRooms}</p>
                </div>
                <div className="p-2.5 bg-emerald-50/50 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Occupied</span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">{occupancy.occupiedBeds}</p>
                </div>
                <div className="p-2.5 bg-amber-50/50 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-amber-700">Available</span>
                  <p className="text-lg font-bold text-amber-700 mt-0.5">{occupancy.availableBeds}</p>
                </div>
              </div>

              {/* Progress bar of total occupancy */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Occupancy Capacity</span>
                  <span>{occupancy.occupancyRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#00236f] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${occupancy.occupancyRate}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Breakdown by Room Type</h4>
                {occupancy.byType && occupancy.byType.map((item: any) => {
                  const cap = item._sum?.capacity || 1;
                  const occ = item._sum?.occupiedBeds || 0;
                  const pct = Math.round((occ / cap) * 100);
                  return (
                    <div key={item.roomType} className="flex items-center justify-between text-xs p-2 rounded bg-slate-50">
                      <span className="font-semibold text-slate-800">{item.roomType}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono">
                          {occ}/{cap} beds ({pct}%)
                        </span>
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#00236f] h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Turnaround & Category Distribution */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[#00236f]" />
                Maintenance & Incident Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Issue Categories</h4>
                {complaints.byCategory && complaints.byCategory.length > 0 ? (
                  complaints.byCategory.map((cat: any) => {
                    const pct = Math.round((cat.count / complaints.total) * 100) || 0;
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-800">{cat.category}</span>
                          <span className="text-slate-500 font-mono">
                            {cat.count} tickets ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-amber-500 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic">No maintenance tickets logged yet.</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Work Order Status Distribution</h4>
                <div className="flex flex-wrap gap-2">
                  {complaints.byStatus && complaints.byStatus.map((st: any) => (
                    <div
                      key={st.status}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center gap-2"
                    >
                      <span className="font-bold text-slate-900">{st.count}</span>
                      <span className="text-slate-500">{st.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave & Outing Traffic */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#00236f]" />
                Leave & Outing Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Leave Requests by Type</h4>
                {leaves.byType && leaves.byType.map((lt: any) => (
                  <div key={lt.type} className="flex items-center justify-between text-xs p-2.5 rounded bg-slate-50">
                    <span className="font-semibold text-slate-800">{lt.type}</span>
                    <Badge variant="info" className="font-mono">
                      {lt.count} requests
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Adjudication Pipeline</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {leaves.byStatus && leaves.byStatus.map((ls: any) => (
                    <div key={ls.status} className="p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500">{ls.status}</span>
                      <p className="text-base font-bold text-slate-900 mt-0.5">{ls.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Security & Visitor Overview */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-[#00236f]" />
                Security & Gate Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Active On Campus Now</span>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{visitors.activeOnCampus}</p>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-[#00236f]">Scheduled Passes Today</span>
                  <p className="text-2xl font-bold text-[#00236f] mt-1">{visitors.todayPassesCount}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Night Curfew Advisory Note</span>
                </div>
                <p>
                  Night curfew rolls are verified nightly at 22:00 IST. Unaccounted absentees trigger automated SMS alerts to authorized guardians.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
