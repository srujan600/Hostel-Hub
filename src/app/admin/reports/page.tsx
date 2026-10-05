"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
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
  RefreshCw,
  TrendingUp,
  Percent,
  Layers,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

interface AnalyticsData {
  occupancy: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    maintenanceBeds: number;
    occupancyRate: number;
    byType: Array<{
      type: string;
      roomCount: number;
      capacity: number;
      occupied: number;
      pct: number;
    }>;
  };
  complaints: {
    total: number;
    resolved: number;
    open: number;
    agingOver48h: number;
    resolutionRate: number;
    byCategory: Array<{ category: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
  };
  attendance: {
    totalMarks: number;
    presentMarks: number;
    absentMarks: number;
    lateMarks: number;
    excusedMarks: number;
    complianceRate: number;
    repeatAbsentees: Array<{
      student: { id: string; name: string; studentId: string };
      count: number;
    }>;
  };
  visitors: {
    totalPasses: number;
    activeOnCampus: number;
    completedVisits: number;
  };
  leaves: {
    total: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    byType: Array<{ type: string; count: number }>;
  };
}

export default function AdminReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "occupancy" | "maintenance" | "attendance" | "visitors" | "leaves"
  >("overview");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get<AnalyticsData>("/api/reports/analytics");
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load institutional analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const triggerExport = (type: string) => {
    window.open(`/api/reports/export?type=${type}`, "_blank");
    setExportDropdownOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <AppShell expectedRole="ADMIN">
        <div className="space-y-6">
          <TableSkeleton rows={8} />
        </div>
      </AppShell>
    );
  }

  const { occupancy, complaints, attendance, visitors, leaves } = data;

  return (
    <AppShell expectedRole="ADMIN">
      <div className="space-y-6">
        {/* Top Header - Hidden on Print */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#00236f]" />
              Institutional Intelligence & Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cross-facility operational telemetry, SLA compliance, residential capacity, and regulatory reporting
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              className="text-xs tactile-btn gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>

            {/* Export CSV Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="text-xs tactile-btn gap-1.5 bg-white border-slate-200"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Export CSV
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </Button>

              {exportDropdownOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1">
                  <button
                    onClick={() => triggerExport("occupancy")}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Occupancy & Beds</span>
                    <Badge variant="neutral" size="sm">CSV</Badge>
                  </button>
                  <button
                    onClick={() => triggerExport("complaints")}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Maintenance & SLAs</span>
                    <Badge variant="neutral" size="sm">CSV</Badge>
                  </button>
                  <button
                    onClick={() => triggerExport("attendance")}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Curfew Attendance</span>
                    <Badge variant="neutral" size="sm">CSV</Badge>
                  </button>
                  <button
                    onClick={() => triggerExport("visitors")}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Visitor Gate Logs</span>
                    <Badge variant="neutral" size="sm">CSV</Badge>
                  </button>
                  <button
                    onClick={() => triggerExport("leaves")}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Leave & Outings</span>
                    <Badge variant="neutral" size="sm">CSV</Badge>
                  </button>
                </div>
              )}
            </div>

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs tactile-btn gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Official Briefing
            </Button>
          </div>
        </div>

        {/* Printable Official Briefing Header (Visible ONLY on Print) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900 font-display">
                HostelHub • Institutional Operations Briefing
              </h1>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Office of the Chief Warden & Campus Facilities Management
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              <p>Generated: {new Date().toLocaleString()}</p>
              <p>Status: CONFIDENTIAL / OFFICIAL</p>
            </div>
          </div>
        </div>

        {/* High-Level Executive KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Bed Occupancy */}
          <Card className="border border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                <span>Bed Occupancy</span>
                <Bed className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {occupancy.occupancyRate}%
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {occupancy.occupiedBeds} / {occupancy.totalBeds}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-[#00236f] h-1.5 rounded-full transition-all"
                  style={{ width: `${occupancy.occupancyRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* SLA Resolution */}
          <Card className="border border-slate-200/80 shadow-sum bg-white hover:border-slate-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                <span>SLA Resolution Rate</span>
                <Wrench className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {complaints.resolutionRate}%
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {complaints.resolved} / {complaints.total}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${complaints.resolutionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Aging SLA Tickets */}
          <Card className={`border shadow-sm transition-colors ${
            complaints.agingOver48h > 0
              ? "border-rose-300 bg-rose-50/30"
              : "border-slate-200/80 bg-white"
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                <span>Aging Tickets (&gt;48h)</span>
                <AlertTriangle className={`w-4 h-4 ${
                  complaints.agingOver48h > 0 ? "text-rose-600" : "text-slate-400"
                }`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${
                  complaints.agingOver48h > 0 ? "text-rose-600" : "text-slate-900"
                }`}>
                  {complaints.agingOver48h}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  overdue tickets
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {complaints.agingOver48h > 0
                  ? "Requires warden escalation"
                  : "All tickets within SLA target"}
              </p>
            </CardContent>
          </Card>

          {/* Attendance Compliance */}
          <Card className="border border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                <span>Curfew Compliance</span>
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {attendance.complianceRate}%
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  30-day average
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${attendance.complianceRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Active Campus Visitors */}
          <Card className="border border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                <span>Active Visitors</span>
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {visitors.activeOnCampus}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  on-campus now
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {visitors.completedVisits} checked out total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Filters (Hidden on Print) */}
        <div className="border-b border-slate-200 flex items-center gap-6 text-sm font-medium print:hidden overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-[#00236f] text-[#00236f] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Institutional Overview
          </button>
          <button
            onClick={() => setActiveTab("occupancy")}
            className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "occupancy"
                ? "border-[#00236f] text-[#00236f] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Occupancy Matrix
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "maintenance"
                ? "border-[#00236f] text-[#00236f] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Maintenance & SLAs
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "attendance"
                ? "border-[#00236f] text-[#00236f] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Curfew & Repeat Absentees
          </button>
          <button
            onClick={() => setActiveTab("visitors")}
            className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "visitors"
                ? "border-[#00236f] text-[#00236f] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Security & Gate Logs
          </button>
          <button
            onClick={() => setActiveTab("leaves")}
            className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "leaves"
                ? "border-[#00236f] text-[#00236f] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Leaves & Gate Passes
          </button>
        </div>

        {/* Section 1: Overview & Highlights */}
        {(activeTab === "overview" || activeTab === "occupancy") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Occupancy Distribution by Room Type */}
            <Card className="border border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800 font-display flex items-center gap-2">
                  <Bed className="w-4 h-4 text-[#00236f]" />
                  Room Type Occupancy Distribution
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerExport("occupancy")}
                  className="text-xs text-[#00236f] hover:bg-slate-50 gap-1 print:hidden"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center pb-2 border-b border-slate-100 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL</span>
                    <span className="text-slate-800 font-bold text-sm">{occupancy.totalBeds}</span>
                  </div>
                  <div>
                    <span className="text-emerald-500 block text-[10px]">OCCUPIED</span>
                    <span className="text-emerald-700 font-bold text-sm">{occupancy.occupiedBeds}</span>
                  </div>
                  <div>
                    <span className="text-blue-500 block text-[10px]">AVAILABLE</span>
                    <span className="text-blue-700 font-bold text-sm">{occupancy.availableBeds}</span>
                  </div>
                  <div>
                    <span className="text-amber-500 block text-[10px]">MAINTENANCE</span>
                    <span className="text-amber-700 font-bold text-sm">{occupancy.maintenanceBeds}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {occupancy.byType.map((item) => (
                    <div key={item.type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700">
                          {item.type.replace(/_/g, " ")} ({item.roomCount} Rooms)
                        </span>
                        <span className="font-mono text-slate-500">
                          {item.occupied} / {item.capacity} ({item.pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            item.pct >= 90
                              ? "bg-rose-500"
                              : item.pct >= 70
                              ? "bg-[#00236f]"
                              : "bg-blue-400"
                          }`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Work Order SLA Summary */}
            <Card className="border border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800 font-display flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  Facility Complaints & SLA Health
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerExport("complaints")}
                  className="text-xs text-[#00236f] hover:bg-slate-50 gap-1 print:hidden"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {complaints.agingOver48h > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-rose-800">
                        SLA Breach Warning: {complaints.agingOver48h} Open Ticket(s) Exceeded 48h
                      </p>
                      <p className="text-[11px] text-rose-600 mt-0.5">
                        These facility work orders have been open longer than the 48-hour institutional resolution SLA.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Category Breakdown */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                      By Category
                    </h4>
                    <div className="space-y-1.5">
                      {complaints.byCategory.map((cat) => (
                        <div
                          key={cat.category}
                          className="flex items-center justify-between text-xs py-1 border-b border-slate-50"
                        >
                          <span className="text-slate-600">{cat.category}</span>
                          <Badge variant="neutral" size="sm" className="font-mono">
                            {cat.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                      By Priority
                    </h4>
                    <div className="space-y-1.5">
                      {complaints.byPriority.map((p) => (
                        <div
                          key={p.priority}
                          className="flex items-center justify-between text-xs py-1 border-b border-slate-50"
                        >
                          <span className="text-slate-600">{p.priority}</span>
                          <Badge
                            variant={
                              p.priority === "URGENT" || p.priority === "HIGH"
                                ? "danger"
                                : p.priority === "MEDIUM"
                                ? "warning"
                                : "info"
                            }
                            size="sm"
                            className="font-mono"
                          >
                            {p.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 2: Curfew Attendance & Repeat Absentees */}
        {(activeTab === "overview" || activeTab === "attendance") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 30-Day Attendance Stats */}
            <Card className="border border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800 font-display flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-indigo-600" />
                  30-Day Curfew Roll Call Audit
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerExport("attendance")}
                  className="text-xs text-[#00236f] hover:bg-slate-50 gap-1 print:hidden"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-slate-600">Total Roll Call Marks</span>
                  <span className="font-mono font-bold text-slate-900">{attendance.totalMarks}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
                  </span>
                  <span className="font-mono font-semibold text-slate-900">{attendance.presentMarks}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-rose-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent (Unexcused)
                  </span>
                  <span className="font-mono font-semibold text-rose-600">{attendance.absentMarks}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Late Entry
                  </span>
                  <span className="font-mono font-semibold text-amber-700">{attendance.lateMarks}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-blue-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Excused (Authorized Leave)
                  </span>
                  <span className="font-mono font-semibold text-blue-700">{attendance.excusedMarks}</span>
                </div>
              </CardContent>
            </Card>

            {/* Repeat Absentee Watchlist */}
            <Card className="border border-slate-200/80 shadow-sm lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800 font-display flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Repeat Absentee Watchlist (&ge; 2 Absences in 30 Days)
                </CardTitle>
                <Badge variant={attendance.repeatAbsentees.length > 0 ? "danger" : "success"} size="sm">
                  {attendance.repeatAbsentees.length} Flagged
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {attendance.repeatAbsentees.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    No students currently exceed the unexcused curfew absence threshold.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-mono text-[11px] uppercase">
                          <th className="py-2.5 px-4">Resident Name</th>
                          <th className="py-2.5 px-4">Roll ID</th>
                          <th className="py-2.5 px-4 text-center">Unexcused Absences</th>
                          <th className="py-2.5 px-4 text-right">Escalation Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendance.repeatAbsentees.map((item) => (
                          <tr key={item.student.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              {item.student.name}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {item.student.studentId}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <Badge variant="danger" size="sm" className="font-mono">
                                {item.count} Days
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="text-[11px] font-mono font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Parent Call Required
                              </span>
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
        )}

        {/* Section 3: Security & Gate Logs / Leaves */}
        {(activeTab === "overview" || activeTab === "visitors" || activeTab === "leaves") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Gate & Visitor Telemetry */}
            <Card className="border border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800 font-display flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  Visitor Gate Pass Telemetry
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerExport("visitors")}
                  className="text-xs text-[#00236f] hover:bg-slate-50 gap-1 print:hidden"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-mono block">TOTAL ISSUED</span>
                    <span className="text-lg font-bold font-mono text-slate-800">{visitors.totalPasses}</span>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-700 font-mono block">ON CAMPUS NOW</span>
                    <span className="text-lg font-bold font-mono text-amber-800">{visitors.activeOnCampus}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 font-mono block">CHECKED OUT</span>
                    <span className="text-lg font-bold font-mono text-emerald-800">{visitors.completedVisits}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  All visitor entries are verified against resident sponsor IDs and government photo credentials by campus security post.
                </p>
              </CardContent>
            </Card>

            {/* Leave Requests & Outings */}
            <Card className="border border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800 font-display flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Leave & Overnight Outings Analytics
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerExport("leaves")}
                  className="text-xs text-[#00236f] hover:bg-slate-50 gap-1 print:hidden"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-slate-600">Total Applications</span>
                  <span className="font-mono font-bold text-slate-900">{leaves.total}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-emerald-700 font-medium">Approved by Warden</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {leaves.approved} ({leaves.approvalRate}%)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-rose-700 font-medium">Rejected / Cancelled</span>
                  <span className="font-mono font-semibold text-rose-700">{leaves.rejected}</span>
                </div>

                <div className="pt-2">
                  <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                    Breakdown by Leave Type
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {leaves.byType.map((lt) => (
                      <span
                        key={lt.type}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {lt.type}: <strong className="text-slate-900">{lt.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Printable Executive Signature Block (Visible ONLY on Print) */}
        <div className="hidden print:block pt-12 mt-8 border-t border-slate-300">
          <div className="grid grid-cols-3 gap-8 text-center text-xs font-mono">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-2"></div>
              <p className="font-bold text-slate-900">Hostel Administrator</p>
              <p className="text-slate-500">Sign & Stamp</p>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-2"></div>
              <p className="font-bold text-slate-900">Chief Warden</p>
              <p className="text-slate-500">Sign & Stamp</p>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-2"></div>
              <p className="font-bold text-slate-900">Dean of Student Affairs</p>
              <p className="text-slate-500">Sign & Stamp</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
