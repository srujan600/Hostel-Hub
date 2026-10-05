"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  LogIn,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  Phone,
  Building,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function WardenVisitorsPage() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ACTIVE" | "PENDING" | "ALL">("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal State for New Pass
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [relationship, setRelationship] = useState("PARENT");
  const [idProofType, setIdProofType] = useState("NATIONAL_ID");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryTime, setEntryTime] = useState("10:00");
  const [exitTime, setExitTime] = useState("18:00");
  const [submittingPass, setSubmittingPass] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [visRes, resRes] = await Promise.all([
        api.get<any[]>("/api/visitors"),
        api.get<any[]>("/api/warden/residents"),
      ]);

      if (visRes.success && visRes.data) {
        setVisitors(visRes.data);
      }
      if (resRes.success && resRes.data) {
        setResidents(resRes.data);
      }
    } catch (err) {
      console.error("Failed to load visitors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract all passes flatly with visitor & student context
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

  // Sorting: most recent first
  allPasses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pass Action Handlers
  const handleUpdatePassStatus = async (passId: string, status: string) => {
    try {
      setActionLoading(passId);
      const res = await api.patch(`/api/visitors/passes/${passId}`, { status });
      if (res.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update visitor pass status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Submit New Pass
  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !visitorName || !visitorPhone) {
      alert("Please provide the host resident, visitor name, and phone number.");
      return;
    }

    try {
      setSubmittingPass(true);
      const expectedEntryTime = new Date(`${visitDate}T${entryTime}:00`).toISOString();
      const expectedExitTime = new Date(`${visitDate}T${exitTime}:00`).toISOString();

      const res = await api.post("/api/visitors", {
        studentId,
        name: visitorName.trim(),
        phone: visitorPhone.trim(),
        relationship,
        idProofType,
        idProofNumber: idProofNumber.trim() || undefined,
        visitDate: new Date(visitDate).toISOString(),
        expectedEntryTime,
        expectedExitTime,
      });

      if (res.success) {
        setIsPassModalOpen(false);
        // Reset form
        setVisitorName("");
        setVisitorPhone("");
        setIdProofNumber("");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to issue visitor pass.");
    } finally {
      setSubmittingPass(false);
    }
  };

  // KPIs
  const activeOnCampus = allPasses.filter((p) => p.status === "CHECKED_IN").length;
  const pendingApprovals = allPasses.filter((p) => p.status === "PENDING").length;
  const approvedExpected = allPasses.filter((p) => p.status === "APPROVED").length;
  const totalCompleted = allPasses.filter((p) => p.status === "CHECKED_OUT").length;

  // Filtered Passes
  const filteredPasses = allPasses.filter((p) => {
    if (filterTab === "ACTIVE" && p.status !== "CHECKED_IN" && p.status !== "APPROVED") return false;
    if (filterTab === "PENDING" && p.status !== "PENDING") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPass = p.passCode?.toLowerCase().includes(q);
      const matchName = p.visitorName?.toLowerCase().includes(q);
      const matchPhone = p.visitorPhone?.toLowerCase().includes(q);
      const matchStudent = p.studentName?.toLowerCase().includes(q);
      return matchPass || matchName || matchPhone || matchStudent;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CHECKED_IN":
        return <Badge variant="success" className="bg-emerald-600 text-white font-bold animate-pulse">ON CAMPUS</Badge>;
      case "APPROVED":
        return <Badge variant="info" className="bg-blue-100 text-blue-800">APPROVED</Badge>;
      case "PENDING":
        return <Badge variant="warning" className="bg-amber-100 text-amber-800">PENDING</Badge>;
      case "CHECKED_OUT":
        return <Badge variant="neutral" className="bg-slate-100 text-slate-600">CHECKED OUT</Badge>;
      case "REJECTED":
        return <Badge variant="danger" className="bg-red-100 text-red-700">REJECTED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Visitor Management & Entry Passes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Warden Operations • Campus guest registration, pass adjudication, and gate log
          </p>
        </div>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Currently On Campus</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeOnCampus}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <LogIn className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Authorization</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingApprovals}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#00236f] bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved / Expected</p>
                <h3 className="text-2xl font-bold text-[#00236f] mt-1">{approvedExpected}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#00236f]">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-slate-400 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Departed Today</p>
                <h3 className="text-2xl font-bold text-slate-700 mt-1">{totalCompleted}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <LogOut className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Controls & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterTab("ACTIVE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                filterTab === "ACTIVE"
                  ? "bg-white text-[#00236f] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active / Expected ({activeOnCampus + approvedExpected})
            </button>
            <button
              onClick={() => setFilterTab("PENDING")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                filterTab === "PENDING"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending Approval ({pendingApprovals})
            </button>
            <button
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                filterTab === "ALL"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Registry ({allPasses.length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search visitor, code, student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00236f]"
              />
            </div>

            <Button
              size="sm"
              onClick={() => setIsPassModalOpen(true)}
              className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn gap-1.5 text-xs shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Issue Gate Pass
            </Button>
          </div>
        </div>

        {/* Visitor Passes Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-[#00236f]" />
              Visitor Passes & Gate Log
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
                  description="No visitors match the active tab and search criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Pass Code</th>
                      <th className="py-3 px-4">Visitor Information</th>
                      <th className="py-3 px-4">Host Resident</th>
                      <th className="py-3 px-4">Visit Schedule</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Gate Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPasses.map((p) => (
                      <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#00236f]">
                          {p.passCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{p.visitorName}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono flex items-center gap-0.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {p.visitorPhone}
                            </span>
                            <span>•</span>
                            <span className="text-slate-600 uppercase font-medium text-[10px]">
                              {p.relationship}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-medium text-slate-800">{p.studentName}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{p.studentRoll}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-medium text-slate-700">
                            {new Date(p.visitDate).toLocaleDateString()}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {new Date(p.expectedEntryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" - "}
                            {new Date(p.expectedExitTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(p.status)}</td>
                        <td className="py-3.5 px-4 text-xs">
                          {p.actualEntryTime ? (
                            <div className="text-emerald-700 font-mono text-[11px]">
                              In: {new Date(p.actualEntryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          ) : null}
                          {p.actualExitTime ? (
                            <div className="text-slate-500 font-mono text-[11px]">
                              Out: {new Date(p.actualExitTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          ) : null}
                          {!p.actualEntryTime && !p.actualExitTime && (
                            <span className="text-slate-400 italic text-[11px]">Awaiting Gate Entry</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdatePassStatus(p.id, "APPROVED")}
                                  disabled={actionLoading === p.id}
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white tactile-btn"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdatePassStatus(p.id, "REJECTED")}
                                  disabled={actionLoading === p.id}
                                  className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                            {p.status === "APPROVED" && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePassStatus(p.id, "CHECKED_IN")}
                                disabled={actionLoading === p.id}
                                className="h-7 text-xs bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn gap-1"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                Check In
                              </Button>
                            )}
                            {p.status === "CHECKED_IN" && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePassStatus(p.id, "CHECKED_OUT")}
                                disabled={actionLoading === p.id}
                                className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white tactile-btn gap-1"
                              >
                                <LogOut className="h-3.5 w-3.5" />
                                Check Out
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Issue On-Spot / Pre-Register Visitor Pass */}
        <Modal
          isOpen={isPassModalOpen}
          onClose={() => setIsPassModalOpen(false)}
          title="Issue Visitor Gate Pass"
          description="Pre-register or authorize an incoming visitor for a resident"
        >
          <form onSubmit={handleCreatePass} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Host Resident *</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
              >
                <option value="">Select resident...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.studentId}) — Room {r.roomNumber || "N/A"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Visitor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
                >
                  <option value="PARENT">Parent</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="SIBLING">Sibling</option>
                  <option value="RELATIVE">Relative</option>
                  <option value="FRIEND">Friend</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ID Proof Type</label>
                <select
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
                >
                  <option value="NATIONAL_ID">National ID / Aadhaar</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ID Proof Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. XXXX-XXXX-1234"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Visit Date</label>
                <input
                  type="date"
                  required
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entry Time</label>
                <input
                  type="time"
                  required
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Exit Time</label>
                <input
                  type="time"
                  required
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPassModalOpen(false)}
                disabled={submittingPass}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingPass}
                className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
              >
                {submittingPass ? "Issuing..." : "Issue & Authorize Pass"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
