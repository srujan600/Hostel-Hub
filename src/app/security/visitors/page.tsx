"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Search,
  Filter,
  Phone,
  Clock,
  LogIn,
  LogOut,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function SecurityVisitorsPage() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get<any[]>("/api/visitors");
      if (res.success && res.data) {
        setVisitors(res.data);
      }
    } catch (err) {
      console.error("Failed to load visitor log:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allPasses = visitors.flatMap((v) =>
    (v.passes || []).map((p: any) => ({
      ...p,
      visitorName: v.name,
      visitorPhone: v.phone,
      relationship: v.relationship,
      idProofType: v.idProofType,
      idProofNumber: v.idProofNumber,
      studentName: v.student?.name || "Unknown",
      studentRoll: v.student?.studentId || "N/A",
    }))
  );

  allPasses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredPasses = allPasses.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = p.passCode?.toLowerCase().includes(q);
      const matchName = p.visitorName?.toLowerCase().includes(q);
      const matchPhone = p.visitorPhone?.toLowerCase().includes(q);
      const matchStudent = p.studentName?.toLowerCase().includes(q);
      return matchCode || matchName || matchPhone || matchStudent;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CHECKED_IN":
        return <Badge variant="success" className="bg-emerald-600 text-white font-bold animate-pulse">ON CAMPUS</Badge>;
      case "APPROVED":
        return <Badge variant="info">APPROVED</Badge>;
      case "PENDING":
        return <Badge variant="warning">PENDING</Badge>;
      case "CHECKED_OUT":
        return <Badge variant="neutral">CHECKED OUT</Badge>;
      case "REJECTED":
        return <Badge variant="danger">REJECTED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="SECURITY">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Gate Pass Registry & Archival Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Security Gatehouse • Complete log of visitor arrivals, gate passes, identity verification, and checkout logs
          </p>
        </div>

        {/* Filter Toolbar */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search pass code, visitor, resident..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CHECKED_IN">On Campus</option>
                  <option value="APPROVED">Approved / Expected</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">
                Displaying {filteredPasses.length} total pass records
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Passes Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#00236f]" />
              Visitor Passes & Screening History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={6} />
              </div>
            ) : filteredPasses.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No visitor passes found"
                  description="No historical entries match your search criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Pass Code</th>
                      <th className="py-3 px-4">Visitor Information</th>
                      <th className="py-3 px-4">ID Verification</th>
                      <th className="py-3 px-4">Host Resident</th>
                      <th className="py-3 px-4">Visit Date</th>
                      <th className="py-3 px-4">Gate In / Out</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPasses.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-[#00236f]">
                          {p.passCode}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{p.visitorName}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono flex items-center gap-0.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {p.visitorPhone}
                            </span>
                            <span>•</span>
                            <span className="uppercase text-[10px] text-slate-600">
                              {p.relationship}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600">
                          <div>{p.idProofType}</div>
                          <div className="text-slate-400 text-[11px]">{p.idProofNumber || "N/A"}</div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="font-semibold text-slate-800">{p.studentName}</span>
                          <span className="text-slate-400 font-mono block">({p.studentRoll})</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {new Date(p.visitDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          {p.actualEntryTime ? (
                            <span className="text-emerald-700 block">
                              In: {new Date(p.actualEntryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : null}
                          {p.actualExitTime ? (
                            <span className="text-slate-500 block">
                              Out: {new Date(p.actualExitTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : null}
                          {!p.actualEntryTime && !p.actualExitTime && (
                            <span className="text-slate-400 italic">Not stamped</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {getStatusBadge(p.status)}
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
