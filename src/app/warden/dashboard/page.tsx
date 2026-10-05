"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Grid,
  CalendarCheck,
  AlertCircle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Plus,
  Building,
  BellRing,
  ExternalLink,
  Shield,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function WardenDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>("/api/warden/dashboard");
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Warden dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleQuickAdjudicate = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      setActionLoading(id);
      const res = await api.patch(`/api/leave-requests/${id}`, {
        status,
        reviewRemarks: status === "APPROVED" ? "Approved by Lead Warden" : "Declined due to campus policy",
      });
      if (res.success) {
        fetchDashboard();
      }
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="danger" size="sm">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="warning" size="sm">High</Badge>;
      case "MEDIUM":
        return <Badge variant="info" size="sm">Medium</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{p}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Command Center Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Operational Command Center
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                North Campus • St. Jude Hall • Block C
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Warden Command Desk
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Real-time bed telemetry, curfew compliance, out-pass adjudication, and facility repairs
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/warden/attendance">
              <Button size="sm" variant="outline" leftIcon={<Clock className="w-4 h-4 text-primary" />}>
                Roll Call Attendance
              </Button>
            </Link>
            <Link href="/warden/leave">
              <Button size="sm" variant="emerald" leftIcon={<CalendarCheck className="w-4 h-4" />}>
                Review Out-Passes
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Main Operational Telemetry KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Occupancy Telemetry */}
          <Card className="border-l-4 border-l-primary hoverEffect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider">
                  Total Bed Occupancy
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-extrabold text-slate-900">
                  {loading ? "--" : `${data?.telemetry?.occupiedBeds ?? 0} / ${data?.telemetry?.totalBeds ?? 0}`}
                </span>
                <span className="text-xs font-mono font-semibold text-primary">
                  {loading ? "--" : `${data?.telemetry?.occupancyRate ?? 0}%`}
                </span>
              </div>
              {/* Capacity Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${data?.telemetry?.occupancyRate || 0}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                <span>{data?.telemetry?.vacantBeds ?? 0} beds vacant</span>
                <Link href="/warden/matrix" className="text-secondary font-semibold hover:underline">
                  Matrix View →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Pending Out-Passes */}
          <Card className="border-l-4 border-l-amber-500 hoverEffect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Out-Passes
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-extrabold text-slate-900">
                  {loading ? "--" : data?.telemetry?.pendingLeavesCount ?? 0}
                </span>
                <span className="text-xs font-semibold text-amber-700">Awaiting Decision</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-sans">
                Requires warden approval before 22:00
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Active Complaints Desk */}
          <Card className="border-l-4 border-l-rose-500 hoverEffect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider">
                  Open Maintenance
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-extrabold text-slate-900">
                  {loading ? "--" : data?.telemetry?.openComplaintsCount ?? 0}
                </span>
                <span className="text-xs text-rose-600 font-semibold">Active Work Orders</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-sans">
                Plumbing & AC technician queue
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Curfew & Security Telemetry */}
          <Card className="border-l-4 border-l-emerald-600 hoverEffect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider">
                  Gate Curfew Status
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-extrabold text-slate-900">
                  {loading ? "--" : data?.telemetry?.curfewTime || "22:30"}
                </span>
                <span className="text-xs text-emerald-700 font-mono font-bold">LOCKED</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-sans">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Present: {data?.telemetry?.todayPresentCount ?? 0} • Absent: {data?.telemetry?.todayAbsentCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operational 2-Column Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 spans): Urgent Action Queue & Open Complaints */}
          <div className="lg:col-span-2 space-y-6">
            {/* Urgent Out-Pass Adjudication Queue */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Urgent Out-Pass Adjudication Queue</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Residents awaiting leave clearance for departures
                  </p>
                </div>
                <Link href="/warden/leave">
                  <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Console View
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : data?.pendingLeaves?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No pending leave requests in the queue. All resident out-passes adjudicated.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data?.pendingLeaves?.map((req: any) => (
                      <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {req.requestCode}
                            </span>
                            <span className="font-heading font-bold text-xs text-slate-900">
                              {req.student.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              ({req.student.studentId})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-sans mt-0.5">
                            Destination: <strong className="text-slate-800">{req.destination}</strong> • Purpose: {req.reason}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Return: {new Date(req.endDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>

                        {/* 1-Click Warden Adjudication Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="destructive"
                            isLoading={actionLoading === req.id}
                            onClick={() => handleQuickAdjudicate(req.id, "REJECTED")}
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="emerald"
                            isLoading={actionLoading === req.id}
                            onClick={() => handleQuickAdjudicate(req.id, "APPROVED")}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Maintenance Incidents */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Open Maintenance Incidents</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assigned technicians and pending resident work orders
                  </p>
                </div>
                <Link href="/warden/complaints">
                  <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Complaints Desk
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : data?.openComplaints?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active maintenance complaints. All facility repairs resolved!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-50/80 text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Ticket</th>
                          <th className="py-2.5 px-4">Location & Issue</th>
                          <th className="py-2.5 px-4">Priority</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Technician</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data?.openComplaints?.map((c: any) => (
                          <tr key={c.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                              {c.complaintCode}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-heading font-bold text-xs text-slate-900">
                                {c.title}
                              </div>
                              <div className="text-[11px] text-slate-500">{c.location}</div>
                            </td>
                            <td className="py-3 px-4">{getPriorityBadge(c.priority)}</td>
                            <td className="py-3 px-4">
                              <Badge variant="purple" size="sm" dot>{c.status}</Badge>
                            </td>
                            <td className="py-3 px-4 font-heading font-semibold text-slate-800">
                              {c.assignedStaff ? c.assignedStaff.name : <span className="text-slate-400 italic">Unassigned</span>}
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

          {/* Right Column (1 span): Live Resident Roster & Today's Visitors */}
          <div className="space-y-6">
            {/* Quick Residents Roster */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Block C Residents</CardTitle>
                <Link href="/warden/residents">
                  <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {data?.residentList?.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="font-heading font-semibold text-xs text-slate-900">
                          {r.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {r.course.slice(0, 22)}...
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                        {r.room}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Today's Visitors Desk */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Today's Guest Passes</CardTitle>
                <Badge variant="info">Gate 1</Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {data?.todayVisitors?.length === 0 ? (
                  <p className="text-xs text-slate-400">No visitors registered for today.</p>
                ) : (
                  data?.todayVisitors?.map((vp: any) => (
                    <div key={vp.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                      <div className="flex items-center justify-between font-heading font-bold text-slate-800">
                        <span>{vp.visitor.name}</span>
                        <Badge variant="success" size="sm">{vp.status}</Badge>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Visiting: <strong className="text-slate-700">{vp.visitor.student.name}</strong> ({vp.visitor.relationship})
                      </p>
                      <p className="font-mono text-[10px] text-slate-400 mt-1">
                        Pass Code: {vp.passCode}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
