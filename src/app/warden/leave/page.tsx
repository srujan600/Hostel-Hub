"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  Filter,
  Check,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function WardenLeavePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalReq, setRejectModalReq] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let url = "/api/leave-requests";
      if (statusFilter !== "ALL") url += `?status=${statusFilter}`;
      const res = await api.get<any[]>(url);
      if (res.success && res.data) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error("Failed to load leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleAdjudicate = async (id: string, status: "APPROVED" | "REJECTED", remarks?: string) => {
    try {
      setActionLoading(id);
      const res = await api.patch(`/api/leave-requests/${id}`, {
        status,
        reviewRemarks: remarks || (status === "APPROVED" ? "Approved by Lead Warden Marcus Vance" : "Declined"),
      });
      if (res.success) {
        setRejectModalReq(null);
        setRejectReason("");
        fetchRequests();
      }
    } catch (err: any) {
      alert(err.message || "Failed to adjudicate leave request.");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="warning" dot>Pending Review</Badge>;
      case "APPROVED":
        return <Badge variant="success" dot>Approved</Badge>;
      case "REJECTED":
        return <Badge variant="danger" dot>Declined</Badge>;
      case "COMPLETED":
        return <Badge variant="neutral">Completed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Gate Pass Adjudication
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Curfew & Outing Clearances Desk
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Leave & Outings Adjudication Console
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Review destination risks, parent contacts, and authorize verified campus passes
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
            {["ALL", "SUBMITTED", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-primary-container text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {st === "ALL" ? "All Queue" : st === "SUBMITTED" ? "Pending" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : requests.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">
                No leave requests found in this queue.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50/80 text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Pass Code</th>
                      <th className="py-3 px-4">Resident</th>
                      <th className="py-3 px-4">Destination & Purpose</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Departure & Return</th>
                      <th className="py-3 px-4">Emergency Contact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Adjudication</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((r) => {
                      const isPending = r.status === "SUBMITTED";
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                            {r.requestCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-heading font-bold text-slate-900 text-xs">
                              {r.student.name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {r.student.studentId}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-heading font-bold text-slate-800 text-xs flex items-center gap-1.5">
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
                            <div>Dep: {new Date(r.startDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
                            <div className="text-slate-500 font-mono">Ret: {new Date(r.endDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {r.emergencyContact}
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>
                          <td className="py-3.5 px-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  isLoading={actionLoading === r.id}
                                  onClick={() => setRejectModalReq(r)}
                                  className="h-7 px-2 text-[11px]"
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  variant="emerald"
                                  isLoading={actionLoading === r.id}
                                  onClick={() => handleAdjudicate(r.id, "APPROVED")}
                                  className="h-7 px-2.5 text-[11px]"
                                >
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-mono text-slate-400 italic">
                                Finalized
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rejection Modal */}
        <Modal
          isOpen={!!rejectModalReq}
          onClose={() => setRejectModalReq(null)}
          title="Decline Resident Leave Request"
          description={rejectModalReq ? `Decline out-pass ${rejectModalReq.requestCode} for ${rejectModalReq.student.name}` : ""}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Decline Reason / Policy Note
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Unresolved attendance warning or conflicting exam schedule..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalReq(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAdjudicate(rejectModalReq.id, "REJECTED", rejectReason)}
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
