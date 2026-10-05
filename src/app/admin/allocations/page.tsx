"use client";

import React, { useState, useEffect } from "react";
import {
  Bed,
  UserCheck,
  ArrowRightLeft,
  LogOut,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  User,
  History,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function AdminAllocationsPage() {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [unallocatedStudents, setUnallocatedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: "ACTIVE" | "WIZARD" | "HISTORY"
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "WIZARD" | "HISTORY">("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");

  // Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<any | null>(null);
  const [transferBedId, setTransferBedId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Vacate Modal
  const [vacateModalOpen, setVacateModalOpen] = useState(false);
  const [vacateReason, setVacateReason] = useState("Semester Completion");
  const [vacateRemarks, setVacateRemarks] = useState("");
  const [vacateBedStatus, setVacateBedStatus] = useState("AVAILABLE");
  const [vacating, setVacating] = useState(false);

  // New Allocation Wizard State
  const [wizardStudentId, setWizardStudentId] = useState("");
  const [wizardBedId, setWizardBedId] = useState("");
  const [wizardYear, setWizardYear] = useState("2026-2027");
  const [wizardRemarks, setWizardRemarks] = useState("");
  const [allocating, setAllocating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allocRes, roomsRes, resRes] = await Promise.all([
        api.get<any[]>("/api/allocations"),
        api.get<any[]>("/api/rooms"),
        api.get<any[]>("/api/warden/residents"),
      ]);

      if (allocRes.success && allocRes.data) {
        setAllocations(allocRes.data);
      }
      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }
      if (resRes.success && resRes.data) {
        // Unallocated residents have roomAllocation === null
        const unallocated = resRes.data.filter((s: any) => !s.roomAllocation);
        setUnallocatedStudents(unallocated);
      }
    } catch (err) {
      console.error("Failed to load allocation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute available beds flatly across all rooms
  const availableBedsList: Array<{
    bedId: string;
    bedNumber: string;
    roomId: string;
    roomNumber: string;
    roomType: string;
    floorName: string;
    blockName: string;
    hostelName: string;
  }> = [];

  rooms.forEach((r) => {
    r.beds?.forEach((b: any) => {
      if (b.status === "AVAILABLE") {
        availableBedsList.push({
          bedId: b.id,
          bedNumber: b.bedNumber,
          roomId: r.id,
          roomNumber: r.roomNumber,
          roomType: r.roomType,
          floorName: r.floorName,
          blockName: r.blockName,
          hostelName: r.hostelName,
        });
      }
    });
  });

  // Action: Execute Transfer
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation || !transferBedId) {
      alert("Please select a target available bed.");
      return;
    }

    try {
      setTransferring(true);
      const res = await api.post(`/api/allocations/${selectedAllocation.id}/transfer`, {
        newBedId: transferBedId,
        reason: transferReason.trim() || "Administrative Transfer",
      });

      if (res.success) {
        setTransferModalOpen(false);
        setSelectedAllocation(null);
        setTransferBedId("");
        setTransferReason("");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to process room transfer.");
    } finally {
      setTransferring(false);
    }
  };

  // Action: Execute Vacate
  const handleExecuteVacate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation) return;

    try {
      setVacating(true);
      const res = await api.post(`/api/allocations/${selectedAllocation.id}/vacate`, {
        reason: vacateReason,
        remarks: vacateRemarks.trim(),
        bedStatus: vacateBedStatus,
      });

      if (res.success) {
        setVacateModalOpen(false);
        setSelectedAllocation(null);
        setVacateRemarks("");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to process room vacating.");
    } finally {
      setVacating(false);
    }
  };

  // Action: Execute New Allocation
  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardStudentId || !wizardBedId) {
      alert("Please choose both an unallocated student and an available bed.");
      return;
    }

    try {
      setAllocating(true);
      const res = await api.post("/api/allocations", {
        studentId: wizardStudentId,
        bedId: wizardBedId,
        academicYear: wizardYear,
        remarks: wizardRemarks.trim() || "Initial Room Allocation",
      });

      if (res.success) {
        setWizardStudentId("");
        setWizardBedId("");
        setWizardRemarks("");
        setActiveTab("ACTIVE");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to allocate room.");
    } finally {
      setAllocating(false);
    }
  };

  // KPIs
  const activeAllocations = allocations.filter((a) => a.status === "ACTIVE");
  const historicalAllocations = allocations.filter((a) => a.status === "TRANSFERRED" || a.status === "VACATED");
  const totalOccupiedBeds = rooms.reduce((acc, r) => acc + (r.occupiedBeds || 0), 0);
  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const totalAvailableBeds = availableBedsList.length;

  // Filtered lists
  const filteredActive = activeAllocations.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.student?.name?.toLowerCase().includes(q);
      const matchRoll = a.student?.studentId?.toLowerCase().includes(q);
      const matchRoom = a.bed?.roomNumber?.toLowerCase().includes(q);
      return matchName || matchRoll || matchRoom;
    }
    return true;
  });

  const filteredHistory = historicalAllocations.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.student?.name?.toLowerCase().includes(q);
      const matchRoll = a.student?.studentId?.toLowerCase().includes(q);
      const matchRoom = a.bed?.roomNumber?.toLowerCase().includes(q);
      return matchName || matchRoll || matchRoom;
    }
    return true;
  });

  return (
    <AppShell expectedRole="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Room Allocations & Bed Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hostel Operations • Live room occupancy management, allocation wizard, transfer requests, and vacating workflows
          </p>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#00236f] bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Capacity</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCapacity} Beds</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#00236f]">
                <Building className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Allocations</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeAllocations.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Beds</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{totalAvailableBeds}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Bed className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unallocated Residents</p>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">{unallocatedStudents.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <User className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === "ACTIVE"
                  ? "bg-white text-[#00236f] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Allocations ({activeAllocations.length})
            </button>
            <button
              onClick={() => setActiveTab("WIZARD")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "WIZARD"
                  ? "bg-white text-[#00236f] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Allocate Bed Wizard
            </button>
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === "HISTORY"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Audit Trail & History ({historicalAllocations.length})
            </button>
          </div>

          {activeTab !== "WIZARD" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student, roll, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00236f]"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Active Allocations Table */}
        {activeTab === "ACTIVE" && (
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#00236f]" />
                Active Resident Allocations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <TableSkeleton rows={6} />
                </div>
              ) : filteredActive.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    title="No active allocations found"
                    description="No residents currently occupy a room matching your search criteria."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4">Resident</th>
                        <th className="py-3 px-4">Roll ID</th>
                        <th className="py-3 px-4">Assigned Room & Bed</th>
                        <th className="py-3 px-4">Block & Floor</th>
                        <th className="py-3 px-4">Academic Year</th>
                        <th className="py-3 px-4">Allocated Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActive.map((a) => (
                        <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {a.student.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {a.student.studentId}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-xs text-[#00236f] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              Room {a.bed.roomNumber} • Bed {a.bed.bedNumber}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {a.bed.roomType} Room
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {a.bed.blockName} • {a.bed.floorName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {a.academicYear}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(a.allocatedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAllocation(a);
                                  setTransferBedId("");
                                  setTransferReason("");
                                  setTransferModalOpen(true);
                                }}
                                className="h-7 text-xs border-blue-200 text-[#00236f] hover:bg-blue-50 gap-1"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Transfer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAllocation(a);
                                  setVacateRemarks("");
                                  setVacateModalOpen(true);
                                }}
                                className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 gap-1"
                              >
                                <LogOut className="h-3.5 w-3.5" />
                                Vacate
                              </Button>
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
        )}

        {/* Tab 2: New Allocation Wizard */}
        {activeTab === "WIZARD" && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Room Allocation Wizard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCreateAllocation} className="max-w-2xl space-y-6">
                {/* Step 1: Resident Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Step 1: Select Unallocated Resident *
                  </label>
                  {unallocatedStudents.length === 0 ? (
                    <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-xs">
                      All enrolled students currently have active room allocations.
                    </div>
                  ) : (
                    <select
                      value={wizardStudentId}
                      onChange={(e) => setWizardStudentId(e.target.value)}
                      required
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                    >
                      <option value="">Choose resident awaiting allocation...</option>
                      {unallocatedStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.studentId}) — {s.course} (Year {s.yearOfStudy})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 2: Available Bed Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Step 2: Choose Available Bed *
                  </label>
                  {availableBedsList.length === 0 ? (
                    <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs">
                      No beds are currently available. Check room inventory or vacate beds.
                    </div>
                  ) : (
                    <select
                      value={wizardBedId}
                      onChange={(e) => setWizardBedId(e.target.value)}
                      required
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                    >
                      <option value="">Select available room & bed slot...</option>
                      {availableBedsList.map((b) => (
                        <option key={b.bedId} value={b.bedId}>
                          Room {b.roomNumber} (Bed {b.bedNumber}) — {b.roomType} • {b.blockName}, {b.floorName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 3: Academic Year & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                    <input
                      type="text"
                      value={wizardYear}
                      onChange={(e) => setWizardYear(e.target.value)}
                      required
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Allocation Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Regular Academic Allotment"
                      value={wizardRemarks}
                      onChange={(e) => setWizardRemarks(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Submission */}
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("ACTIVE")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={allocating || unallocatedStudents.length === 0 || availableBedsList.length === 0}
                    className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
                  >
                    {allocating ? "Allocating..." : "Confirm & Execute Allocation"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: History & Audit Log */}
        {activeTab === "HISTORY" && (
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-[#00236f]" />
                Allocation Audit Trail & Vacated Records
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <TableSkeleton rows={6} />
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    title="No historical records found"
                    description="No previous transfers or vacated room records match your search."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4">Resident</th>
                        <th className="py-3 px-4">Roll ID</th>
                        <th className="py-3 px-4">Previous Room & Bed</th>
                        <th className="py-3 px-4">Lifecycle Status</th>
                        <th className="py-3 px-4">Allocated $\to$ Vacated</th>
                        <th className="py-3 px-4">Remarks & Audit Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {h.student.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">
                            {h.student.studentId}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700">
                            Room {h.bed.roomNumber} ({h.bed.bedNumber})
                          </td>
                          <td className="py-3 px-4">
                            {h.status === "TRANSFERRED" ? (
                              <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">
                                TRANSFERRED
                              </Badge>
                            ) : (
                              <Badge variant="neutral" className="bg-slate-100 text-slate-600">
                                VACATED
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {new Date(h.allocatedAt).toLocaleDateString()} $\to$ {h.vacatedAt ? new Date(h.vacatedAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 italic max-w-xs truncate">
                            {h.remarks || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal: Room Transfer */}
        <Modal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title="Process Room Transfer"
          description={`Transfer resident ${selectedAllocation?.student?.name} from Room ${selectedAllocation?.bed?.roomNumber}-${selectedAllocation?.bed?.bedNumber}`}
        >
          <form onSubmit={handleExecuteTransfer} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Available Bed *</label>
              <select
                value={transferBedId}
                onChange={(e) => setTransferBedId(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
              >
                <option value="">Select target bed...</option>
                {availableBedsList
                  .filter((b) => b.bedId !== selectedAllocation?.bed?.id)
                  .map((b) => (
                    <option key={b.bedId} value={b.bedId}>
                      Room {b.roomNumber} (Bed {b.bedNumber}) — {b.roomType} • {b.blockName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Transfer *</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Medical request / Room upgrade / Noise concern"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferModalOpen(false)}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={transferring}
                className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
              >
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Room Vacate */}
        <Modal
          isOpen={vacateModalOpen}
          onClose={() => setVacateModalOpen(false)}
          title="Process Room Checkout & Vacate"
          description={`Vacate ${selectedAllocation?.student?.name} from Room ${selectedAllocation?.bed?.roomNumber}-${selectedAllocation?.bed?.bedNumber}`}
        >
          <form onSubmit={handleExecuteVacate} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vacate Reason</label>
              <select
                value={vacateReason}
                onChange={(e) => setVacateReason(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              >
                <option value="Semester Completion">Semester / Academic Year Completion</option>
                <option value="Course Graduation">Graduation / Course Completed</option>
                <option value="Disciplinary Eviction">Disciplinary Action</option>
                <option value="Medical Withdrawal">Medical Withdrawal</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Post-Checkout Bed Status</label>
              <select
                value={vacateBedStatus}
                onChange={(e) => setVacateBedStatus(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              >
                <option value="AVAILABLE">AVAILABLE (Immediate Re-allocation)</option>
                <option value="MAINTENANCE">MAINTENANCE (Requires Cleaning / Repair)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Checkout Remarks & Key Return</label>
              <textarea
                rows={3}
                placeholder="Keys returned, room inspected, deposit clearance..."
                value={vacateRemarks}
                onChange={(e) => setVacateRemarks(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVacateModalOpen(false)}
                disabled={vacating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={vacating}
                className="bg-amber-600 hover:bg-amber-700 text-white tactile-btn"
              >
                {vacating ? "Vacating..." : "Confirm & Vacate Bed"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
