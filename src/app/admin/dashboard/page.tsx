"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building,
  Users,
  Shield,
  Wrench,
  CalendarCheck,
  Grid,
  Layers,
  ArrowUpRight,
  TrendingUp,
  History,
  Activity,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await api.get<any>("/api/admin/dashboard");
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading || !data) {
    return (
      <AppShell expectedRole="ADMIN">
        <div className="space-y-6">
          <TableSkeleton rows={8} />
        </div>
      </AppShell>
    );
  }

  const { overview, hostelComparison, recentAuditLogs } = data;

  return (
    <AppShell expectedRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Institutional Executive Operations
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              HostelHub Campus Administration • Multi-hostel occupancy, institutional oversight, and operational audit telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/allocations">
              <Button size="sm" className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn text-xs gap-1.5">
                <Grid className="h-3.5 w-3.5" />
                Manage Allocations
              </Button>
            </Link>
          </div>
        </div>

        {/* Primary Operational Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#00236f] bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Global Campus Occupancy</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-[#00236f]">{overview.occupancyRate}%</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({overview.occupiedBeds} / {overview.totalBeds} beds)
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#00236f]">
                <Building className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Enrolled Residents</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-emerald-600">{overview.activeStudents}</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({overview.allocatedStudents} allocated)
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Work Orders</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-amber-600">{overview.openComplaints}</h3>
                  {overview.urgentComplaints > 0 && (
                    <span className="text-xs text-red-600 font-bold">
                      ({overview.urgentComplaints} critical)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Wrench className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Staff Deployments</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-purple-600">{overview.totalStaff}</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({overview.wardensCount} Wardens, {overview.securityCount} Security)
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <Shield className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Launchpad */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/admin/hostels" className="block group">
            <Card className="bg-white border-slate-200 hover:border-[#00236f] hover:shadow-sm transition-all">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 group-hover:text-[#00236f]">Hostels & Blocks</span>
                  <p className="text-[11px] text-slate-400">Inventory & hierarchy</p>
                </div>
                <Layers className="h-4 w-4 text-slate-400 group-hover:text-[#00236f]" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/allocations" className="block group">
            <Card className="bg-white border-slate-200 hover:border-[#00236f] hover:shadow-sm transition-all">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 group-hover:text-[#00236f]">Room Allocations</span>
                  <p className="text-[11px] text-slate-400">Transfers & vacating</p>
                </div>
                <Grid className="h-4 w-4 text-slate-400 group-hover:text-[#00236f]" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/students" className="block group">
            <Card className="bg-white border-slate-200 hover:border-[#00236f] hover:shadow-sm transition-all">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 group-hover:text-[#00236f]">Student Master</span>
                  <p className="text-[11px] text-slate-400">Profiles & credentials</p>
                </div>
                <Users className="h-4 w-4 text-slate-400 group-hover:text-[#00236f]" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/staff" className="block group">
            <Card className="bg-white border-slate-200 hover:border-[#00236f] hover:shadow-sm transition-all">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 group-hover:text-[#00236f]">Staff & Wardens</span>
                  <p className="text-[11px] text-slate-400">Rosters & assignments</p>
                </div>
                <Shield className="h-4 w-4 text-slate-400 group-hover:text-[#00236f]" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Multi-Hostel Operational Comparison Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building className="h-4 w-4 text-[#00236f]" />
              Multi-Hostel Facility Comparison Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Hostel Facility</th>
                    <th className="py-3 px-4">Gender Type</th>
                    <th className="py-3 px-4">Blocks</th>
                    <th className="py-3 px-4">Total Rooms</th>
                    <th className="py-3 px-4">Capacity / Beds</th>
                    <th className="py-3 px-4">Occupied Beds</th>
                    <th className="py-3 px-4">Vacant Beds</th>
                    <th className="py-3 px-4">Occupancy Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hostelComparison.map((h: any) => (
                    <tr key={h.id} className="hover:bg-blue-50/30">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {h.name}
                        <span className="text-slate-400 font-mono text-xs block">{h.code}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="neutral" className="text-[10px]">
                          {h.genderType}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">{h.totalBlocks}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">{h.totalRooms}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">{h.totalBeds}</td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-700">{h.occupiedBeds}</td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-amber-700">{h.availableBeds}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#00236f]">{h.occupancyRate}%</span>
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#00236f] h-1.5 rounded-full" style={{ width: `${h.occupancyRate}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Log Stream */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-[#00236f]" />
              Institutional Audit Trail (Recent Activity)
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">Security & operations ledger</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentAuditLogs.map((log: any) => (
                <div key={log.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[11px] text-[#00236f] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {log.action}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900">{log.actorName}</span>
                      <span className="text-slate-400 ml-1">({log.actorRole})</span>
                      <p className="text-slate-500 mt-0.5">
                        Target: {log.targetType} {log.targetId ? `• ID: ${log.targetId.slice(-6)}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
