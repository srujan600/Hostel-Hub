"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  LogIn,
  LogOut,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Clock,
  Phone,
  Building,
  UserCheck,
  QrCode,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function SecurityDashboardPage() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState("");
  const [scannedPass, setScannedPass] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // On-Spot Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [relationship, setRelationship] = useState("PARENT");
  const [idProofType, setIdProofType] = useState("NATIONAL_ID");
  const [idProofNumber, setIdProofNumber] = useState("");
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
      console.error("Failed to load visitor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract flat list of passes
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

  // Search by pass code or visitor phone
  const handleSearchPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) {
      setScannedPass(null);
      return;
    }
    const q = searchCode.trim().toLowerCase();
    const found = allPasses.find(
      (p) => p.passCode.toLowerCase() === q || p.visitorPhone.includes(q)
    );
    if (found) {
      setScannedPass(found);
    } else {
      alert(`No pass found matching "${searchCode}". Check pass code or phone number.`);
      setScannedPass(null);
    }
  };

  const handleUpdateStatus = async (passId: string, status: string) => {
    try {
      setActionLoading(passId);
      const res = await api.patch(`/api/visitors/passes/${passId}`, { status });
      if (res.success) {
        if (scannedPass?.id === passId) {
          setScannedPass(res.data);
        }
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update gate pass status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Issue on-spot pass
  const handleCreateOnSpotPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !visitorName || !visitorPhone) {
      alert("Please provide the host resident, visitor name, and phone number.");
      return;
    }

    try {
      setSubmittingPass(true);
      const today = new Date().toISOString().split("T")[0];
      const expectedEntryTime = new Date().toISOString();
      const expectedExitTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hour pass

      const res = await api.post("/api/visitors", {
        studentId,
        name: visitorName.trim(),
        phone: visitorPhone.trim(),
        relationship,
        idProofType,
        idProofNumber: idProofNumber.trim() || undefined,
        visitDate: new Date(today).toISOString(),
        expectedEntryTime,
        expectedExitTime,
      });

      if (res.success) {
        setIsModalOpen(false);
        setVisitorName("");
        setVisitorPhone("");
        setIdProofNumber("");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to issue gate pass.");
    } finally {
      setSubmittingPass(false);
    }
  };

  // Active on campus passes
  const activeOnCampus = allPasses.filter((p) => p.status === "CHECKED_IN");
  const expectedToday = allPasses.filter((p) => p.status === "APPROVED");
  const departedToday = allPasses.filter((p) => p.status === "CHECKED_OUT");

  return (
    <AppShell expectedRole="SECURITY">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Main Gate Security & Visitor Screening Post
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Campus Security Operations • Real-time pass verification, entry/exit stamping, and guest screening
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Issue On-Spot Gate Pass
          </Button>
        </div>

        {/* Real-Time Gate Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Currently Inside Campus</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeOnCampus.length} Guests</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <LogIn className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#00236f] bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Passes Expected</p>
                <h3 className="text-2xl font-bold text-[#00236f] mt-1">{expectedToday.length} Visitors</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#00236f]">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-slate-400 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Departed Through Gate</p>
                <h3 className="text-2xl font-bold text-slate-700 mt-1">{departedToday.length} Checked Out</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <LogOut className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Verification & Scan Station */}
        <Card className="bg-white border-slate-200 shadow-sm border-t-4 border-t-[#00236f]">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-4">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[#00236f]" />
              Rapid Pass Verification Station
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSearchPass} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Visitor Pass Code (e.g. VP-2026-...) or Mobile Number"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00236f]"
                />
              </div>
              <Button
                type="submit"
                className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
              >
                Verify Pass
              </Button>
            </form>

            {/* Scanned Pass Result Card */}
            {scannedPass && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-blue-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#00236f] bg-white px-2.5 py-1 rounded shadow-xs">
                      {scannedPass.passCode}
                    </span>
                    <Badge
                      variant={
                        scannedPass.status === "CHECKED_IN"
                          ? "success"
                          : scannedPass.status === "APPROVED"
                          ? "info"
                          : "neutral"
                      }
                    >
                      {scannedPass.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {scannedPass.status === "APPROVED" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(scannedPass.id, "CHECKED_IN")}
                        disabled={actionLoading === scannedPass.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white tactile-btn text-xs gap-1"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        Stamp Gate Check-In
                      </Button>
                    )}
                    {scannedPass.status === "CHECKED_IN" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(scannedPass.id, "CHECKED_OUT")}
                        disabled={actionLoading === scannedPass.id}
                        className="bg-amber-600 hover:bg-amber-700 text-white tactile-btn text-xs gap-1"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Stamp Gate Check-Out
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold uppercase tracking-wider block">
                      Visitor Name & Phone
                    </span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{scannedPass.visitorName}</p>
                    <p className="text-slate-600 font-mono mt-0.5">{scannedPass.visitorPhone}</p>
                    <span className="inline-block mt-1 bg-white px-2 py-0.5 rounded text-slate-700 font-medium">
                      Relationship: {scannedPass.relationship}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold uppercase tracking-wider block">
                      Host Resident
                    </span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{scannedPass.studentName}</p>
                    <p className="text-slate-600 font-mono mt-0.5">Roll: {scannedPass.studentRoll}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold uppercase tracking-wider block">
                      Gate Timestamps
                    </span>
                    <p className="text-slate-700 mt-0.5">
                      Entry:{" "}
                      {scannedPass.actualEntryTime
                        ? new Date(scannedPass.actualEntryTime).toLocaleTimeString()
                        : "Not stamped"}
                    </p>
                    <p className="text-slate-700 mt-0.5">
                      Exit:{" "}
                      {scannedPass.actualExitTime
                        ? new Date(scannedPass.actualExitTime).toLocaleTimeString()
                        : "Not stamped"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live On-Campus Guest Register Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <LogIn className="h-4 w-4 text-emerald-600" />
              Active On-Campus Guests ({activeOnCampus.length})
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">Live campus presence log</span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={4} />
              </div>
            ) : activeOnCampus.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No visitors currently inside campus"
                  description="All checked-in guests have exited or no entries have been recorded today."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Pass Code</th>
                      <th className="py-3 px-4">Visitor Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Host Resident</th>
                      <th className="py-3 px-4">Gate Check-In Time</th>
                      <th className="py-3 px-4 text-right">Quick Checkout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOnCampus.map((p) => (
                      <tr key={p.id} className="hover:bg-blue-50/30">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#00236f]">
                          {p.passCode}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {p.visitorName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {p.visitorPhone}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="font-semibold text-slate-800">{p.studentName}</span>
                          <span className="text-slate-400 font-mono block">({p.studentRoll})</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-emerald-700 font-semibold">
                          {p.actualEntryTime ? new Date(p.actualEntryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(p.id, "CHECKED_OUT")}
                            disabled={actionLoading === p.id}
                            className="bg-amber-600 hover:bg-amber-700 text-white tactile-btn text-xs h-7 gap-1"
                          >
                            <LogOut className="h-3 w-3" />
                            Stamp Exit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Issue On-Spot Visitor Pass */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Issue On-Spot Gate Entry Pass"
          description="Register an incoming guest directly at the security gatepost"
        >
          <form onSubmit={handleCreateOnSpotPass} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Host Resident *</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              >
                <option value="">Select resident being visited...</option>
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
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
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
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
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
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                >
                  <option value="NATIONAL_ID">National ID / Aadhaar</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ID Proof Number</label>
              <input
                type="text"
                placeholder="e.g. XXXX-XXXX-9999"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
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
