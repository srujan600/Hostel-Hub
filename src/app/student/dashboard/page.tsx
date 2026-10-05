"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  AlertCircle,
  CalendarCheck,
  Clock,
  Plus,
  ArrowRight,
  Utensils,
  Bell,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function StudentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get<any>("/api/students/dashboard");
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="warning" dot>Submitted</Badge>;
      case "ASSIGNED":
        return <Badge variant="info" dot>Assigned</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="purple" dot>In Progress</Badge>;
      case "RESOLVED":
      case "APPROVED":
      case "COMPLETED":
        return <Badge variant="success" dot>{status}</Badge>;
      case "REJECTED":
        return <Badge variant="danger" dot>Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="STUDENT">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Resident Portal
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Academic Session 2026-2027
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Welcome, {loading ? <Skeleton className="inline-block w-40 h-8" /> : data?.student?.name}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              {data?.student?.course} • Roll ID: <span className="font-mono font-medium">{data?.student?.studentId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/student/leave">
              <Button size="sm" variant="outline" leftIcon={<CalendarCheck className="w-4 h-4 text-primary" />}>
                Request Leave
              </Button>
            </Link>
            <Link href="/student/complaints">
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                New Ticket
              </Button>
            </Link>
          </div>
        </div>

        {/* Priority Campus Notice Ticker */}
        {data?.notices && data.notices.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-3 shadow-xs">
            <div className="p-1 rounded-md bg-amber-200 text-amber-900 shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-amber-900 px-1.5 py-0.5 rounded bg-amber-100">
                  {data.notices[0].priority} NOTICE
                </span>
                <span className="font-heading text-xs font-bold text-amber-950 truncate">
                  {data.notices[0].title}
                </span>
              </div>
              <p className="text-xs text-amber-900/90 font-sans line-clamp-1 mt-0.5">
                {data.notices[0].content}
              </p>
            </div>
            <Link href="/student/notices" className="text-xs font-heading font-semibold text-amber-950 hover:underline shrink-0 hidden sm:inline-block">
              View All
            </Link>
          </div>
        )}

        {/* Top 4 Telemetry Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: My Room Assignment */}
          <Card className="border-l-4 border-l-primary hoverEffect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider">
                  Assigned Bed
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-extrabold text-slate-900">
                  {loading ? "--" : data?.room ? `Room ${data.room.roomNumber}-${data.room.bedNumber}` : "Unallocated"}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {data?.room?.blockCode}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-sans truncate">
                {data?.room?.hostelName || "Contact administration for allocation"}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Open Complaints */}
          <Card className="border-l-4 border-l-amber-500 hoverEffect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider">
                  Active Tickets
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-extrabold text-slate-900">
                  {loading ? "--" : data?.stats?.pendingComplaints ?? 0}
                </span>
                <span className="text-xs text-slate-500">in resolution</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-sans">
                Maintenance response avg: 4 hrs
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Out-Pass Adjudication */}
          <Card className="border-l-4 border-l-secondary hoverEffect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider">
                  Leave Out-Pass
                </span>
                <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-extrabold text-slate-900">
                  {loading ? "--" : data?.stats?.pendingLeaves ?? 0}
                </span>
                <span className="text-xs text-slate-500">pending review</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-sans">
                Warden approvals monitored live
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Curfew & Roll Call */}
          <Card className="border-l-4 border-l-emerald-600 hoverEffect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider">
                  Gate Protocol
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-2xl font-extrabold text-slate-900">
                  {loading ? "--" : data?.stats?.curfewTime || "22:30"}
                </span>
                <span className="text-xs text-emerald-700 font-semibold font-mono">Curfew</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-sans flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Today Roll Call: {data?.stats?.todayAttendanceStatus || "Present"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2-Column Split: Active Operations & Today's Meals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 spans): Active Complaints & Out-Passes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Complaints */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Maintenance Tickets</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track repair status and technician notes
                  </p>
                </div>
                <Link href="/student/complaints">
                  <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : data?.recentComplaints?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active complaints filed. Everything is running smoothly!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data?.recentComplaints?.map((c: any) => (
                      <div key={c.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-slate-500">
                              {c.complaintCode}
                            </span>
                            <span className="font-heading font-semibold text-xs text-slate-900 truncate">
                              {c.title}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {c.location} • Category: {c.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {getStatusBadge(c.status)}
                          <Link href={`/student/complaints`}>
                            <ChevronRight className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Out-Pass Requests */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Out-Pass Requests</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gate passes and overnight leaves approved by Warden
                  </p>
                </div>
                <Link href="/student/leave">
                  <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : data?.recentLeaves?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No recent leave requests lodged.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data?.recentLeaves?.map((l: any) => (
                      <div key={l.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-slate-500">
                              {l.requestCode}
                            </span>
                            <span className="font-heading font-semibold text-xs text-slate-900">
                              {l.destination}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {l.leaveType.replace("_", " ")} • Return: {new Date(l.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>{getStatusBadge(l.status)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1 span): Today's Dining & Quick Resident Links */}
          <div className="space-y-6">
            {/* Mess Dining Schedule */}
            <Card className="border-t-4 border-t-secondary">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-secondary" />
                    <CardTitle>Today's Dining Menu</CardTitle>
                  </div>
                  <Badge variant="info">Daily Meals</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : data?.todayMeals?.length === 0 ? (
                  <p className="text-xs text-slate-400">Menu not uploaded for today.</p>
                ) : (
                  data?.todayMeals?.map((m: any) => (
                    <div key={m.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                      <div className="flex items-center justify-between text-xs font-heading font-bold text-slate-800">
                        <span>{m.mealType}</span>
                        <span className="font-mono text-[10px] text-slate-500 font-normal">{m.timings}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-sans mt-1 line-clamp-2">
                        {m.items}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Drawer */}
            <Card>
              <CardHeader>
                <CardTitle>Resident Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Link href="/student/visitors" className="block">
                  <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span className="text-xs font-heading font-semibold text-slate-800">
                        Pre-Register Visitor Pass
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>

                <Link href="/student/mess" className="block">
                  <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <Utensils className="w-4 h-4 text-secondary" />
                      <span className="text-xs font-heading font-semibold text-slate-800">
                        Dining Feedback & Suggestions
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>

                <Link href="/student/profile" className="block">
                  <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <Home className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-heading font-semibold text-slate-800">
                        Emergency Contacts & Profile
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
