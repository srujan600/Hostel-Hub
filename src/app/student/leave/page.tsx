"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Plus,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  QrCode,
  Shield,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function StudentLeavePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // New Request Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("DAY_OUTING");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("+91 98111 22233");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Digital Pass Preview Modal
  const [selectedPass, setSelectedPass] = useState<any | null>(null);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      let url = "/api/leave-requests";
      if (statusFilter !== "ALL") url += `?status=${statusFilter}`;

      const res = await api.get<any[]>(url);
      if (res.success && res.data) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [statusFilter]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!startDate || !endDate) {
      setFormError("Both departure and return dates/times are required.");
      return;
    }

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (end <= start) {
      setFormError("Expected return time must be strictly after departure time.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/api/leave-requests", {
        leaveType,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        destination: destination.trim(),
        reason: reason.trim(),
        emergencyContact: emergencyContact.trim(),
      });

      if (res.success) {
        setIsDrawerOpen(false);
        setReason("");
        setDestination("");
        fetchLeaveRequests();
      } else {
        setFormError(res.error?.message || "Failed to submit request.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="warning" dot>Pending Warden Review</Badge>;
      case "APPROVED":
        return <Badge variant="success" dot>Pass Approved</Badge>;
      case "REJECTED":
        return <Badge variant="danger" dot>Declined</Badge>;
      case "COMPLETED":
        return <Badge variant="neutral">Completed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="STUDENT">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Campus Gate Protocol
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Out-Pass & Curfew Clearances
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Leave & Outing Requests
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Apply for day outings, weekend home visits, and generate verified digital gate passes
            </p>
          </div>

          <Button
            size="md"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsDrawerOpen(true)}
          >
            New Out-Pass Request
          </Button>
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200/80 w-fit">
          {["ALL", "SUBMITTED", "APPROVED", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-primary-container text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st === "ALL" ? "All Requests" : st === "SUBMITTED" ? "Pending Review" : st}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="w-8 h-8 text-slate-400" />}
                title="No Out-Pass Requests"
                description="You currently have no active or archived leave requests under this filter."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Request First Out-Pass
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50/80 text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Pass Code</th>
                      <th className="py-3 px-4">Destination & Reason</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Departure Time</th>
                      <th className="py-3 px-4">Expected Return</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        onClick={() => setSelectedPass(r)}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          {r.requestCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-heading font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-secondary" />
                            {r.destination}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {r.reason}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          {r.leaveType.replace("_", " ")}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {new Date(r.startDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {new Date(r.endDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="subtle"
                            leftIcon={<QrCode className="w-3.5 h-3.5 text-slate-600" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPass(r);
                            }}
                          >
                            Digital Pass
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

        {/* NEW REQUEST DRAWER */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Apply for Campus Out-Pass / Leave"
          subtitle="All requests are timestamped and reviewed by Lead Warden Marcus Vance"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={submitting}
                onClick={handleCreateRequest}
              >
                Submit for Clearance
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateRequest} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Out-Pass Classification
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-sans bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="DAY_OUTING">Day Outing (Curfew Return Same Night)</option>
                <option value="OVERNIGHT">Overnight Stay (Home / Verified Location)</option>
                <option value="VACATION">Term Vacation / Mid-Semester Break</option>
                <option value="EMERGENCY">Medical / Family Emergency</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                  Departure Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                  Expected Return Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Destination Address / City
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. 42 Metro Heights, Home Residence"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Emergency Parent / Guardian Contact
              </label>
              <input
                type="tel"
                required
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Purpose / Reason for Leave
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the academic, medical, or family purpose clearly..."
                className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>
        </Drawer>

        {/* DIGITAL PASS PREVIEW MODAL */}
        <Modal
          isOpen={!!selectedPass}
          onClose={() => setSelectedPass(null)}
          title="Digital Resident Out-Pass"
          description="Present to Main Gate Security Staff for turnstile checkout"
          maxWidth="sm"
        >
          {selectedPass && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-mono text-xl font-extrabold text-primary tracking-widest block">
                  {selectedPass.requestCode}
                </span>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  Campus Verified Pass ID
                </span>

                <div className="my-4 flex items-center justify-center">
                  <div className="w-32 h-32 bg-white rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <QrCode className="w-16 h-16 text-slate-700" />
                    <span className="text-[9px] font-mono text-slate-400 mt-1">SECURITY BARCODE</span>
                  </div>
                </div>

                <div className="text-xs text-left space-y-1.5 pt-2 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Destination:</span>
                    <span className="font-heading font-semibold text-slate-800">{selectedPass.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Return Window:</span>
                    <span className="font-mono text-slate-800">
                      {new Date(selectedPass.endDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Warden Approval:</span>
                    <span>{getStatusBadge(selectedPass.status)}</span>
                  </div>
                </div>

                {selectedPass.reviewRemarks && (
                  <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-left text-xs text-emerald-900">
                    <span className="font-bold block">Warden Remark:</span>
                    {selectedPass.reviewRemarks}
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedPass(null)}
              >
                Close Pass
              </Button>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
