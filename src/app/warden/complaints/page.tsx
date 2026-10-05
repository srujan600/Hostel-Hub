"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  UserCheck,
  MessageSquare,
  Search,
  ChevronRight,
  ShieldAlert,
  Send,
  Building,
  User,
  Phone,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function WardenComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspector Drawer State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateStaffId, setUpdateStaffId] = useState("");
  const [updatePriority, setUpdatePriority] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      let url = "/api/complaints?";
      if (statusFilter !== "ALL") url += `status=${statusFilter}&`;
      if (categoryFilter !== "ALL") url += `category=${categoryFilter}&`;
      
      const [compRes, staffRes] = await Promise.all([
        api.get<any[]>(url),
        api.get<any[]>("/api/staff"),
      ]);

      if (compRes.success && compRes.data) {
        setComplaints(compRes.data);
      }
      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data);
      }
    } catch (err) {
      console.error("Failed to load complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, categoryFilter]);

  const handleOpenTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status);
    setUpdateStaffId(ticket.assignedStaffId || "");
    setUpdatePriority(ticket.priority);
    setNewComment("");
    setIsInternalComment(false);
    setDrawerOpen(true);
  };

  const handleSaveTicket = async () => {
    if (!selectedTicket) return;
    try {
      setSaving(true);
      const payload: any = {
        status: updateStatus,
        priority: updatePriority,
        assignedStaffId: updateStaffId || null,
      };
      if (newComment.trim()) {
        payload.comment = newComment.trim();
        payload.isInternal = isInternalComment;
      }

      const res = await api.patch(`/api/complaints/${selectedTicket.id}`, payload);
      if (res.success) {
        setDrawerOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update complaint work order.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered complaints by search and priority
  const filteredComplaints = complaints.filter((c) => {
    if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = c.complaintCode?.toLowerCase().includes(q);
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchLoc = c.location?.toLowerCase().includes(q);
      const matchStudent = c.student?.name?.toLowerCase().includes(q);
      return matchCode || matchTitle || matchLoc || matchStudent;
    }
    return true;
  });

  // KPI Computations
  const totalCount = complaints.length;
  const urgentCount = complaints.filter((c) => c.priority === "URGENT" && c.status !== "RESOLVED" && c.status !== "CLOSED").length;
  const inProgressCount = complaints.filter((c) => c.status === "IN_PROGRESS" || c.status === "ASSIGNED").length;
  const resolvedCount = complaints.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="danger" className="bg-red-600 text-white font-semibold animate-pulse">URGENT</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="bg-amber-500 text-white">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="info" className="bg-blue-100 text-blue-800">MEDIUM</Badge>;
      case "LOW":
        return <Badge variant="neutral" className="text-slate-600">LOW</Badge>;
      default:
        return <Badge variant="neutral">{p}</Badge>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "SUBMITTED":
        return <Badge variant="info" className="bg-blue-50 text-blue-700 border-blue-200">SUBMITTED</Badge>;
      case "ASSIGNED":
        return <Badge variant="purple" className="bg-purple-50 text-purple-700 border-purple-200">ASSIGNED</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">IN PROGRESS</Badge>;
      case "RESOLVED":
        return <Badge variant="success" className="bg-emerald-50 text-emerald-800 border-emerald-200">RESOLVED</Badge>;
      case "CLOSED":
        return <Badge variant="neutral" className="bg-slate-50 text-slate-600">CLOSED</Badge>;
      default:
        return <Badge variant="neutral">{s}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Maintenance & Work Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Warden Operations • Work order dispatch, technician routing, and grievance tracking
          </p>
        </div>
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#00236f] bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Work Orders</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#00236f]">
                <Wrench className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Urgent Tickets</p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{urgentCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">In Remediation</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{inProgressCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resolved / Closed</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{resolvedCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ticket, room, resident..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00236f]"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter:</span>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                >
                  <option value="ALL">All Categories</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="PLUMBING">Plumbing</option>
                  <option value="CARPENTRY">Carpentry</option>
                  <option value="CLEANLINESS">Cleanliness</option>
                  <option value="INTERNET_WIFI">Internet & WiFi</option>
                  <option value="MESS_FOOD">Mess & Food</option>
                  <option value="DISCIPLINE">Discipline</option>
                  <option value="SECURITY">Security</option>
                  <option value="OTHER">Other</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent Only</option>
                  <option value="HIGH">High Only</option>
                  <option value="MEDIUM">Medium Only</option>
                  <option value="LOW">Low Only</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium shrink-0">
                Showing {filteredComplaints.length} of {complaints.length} work orders
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complaints Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[#00236f]" />
              Work Order Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={6} />
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No complaints found"
                  description="No maintenance tickets or grievances match the selected filter criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Issue Details</th>
                      <th className="py-3 px-4">Resident & Location</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned To</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredComplaints.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => handleOpenTicket(c)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#00236f]">
                          {c.complaintCode}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-semibold text-slate-900 truncate">{c.title}</p>
                          <span className="text-xs text-slate-500 font-mono">{c.category}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-medium text-slate-800">{c.student?.name || "Unknown"}</div>
                          <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3 text-slate-400" />
                            {c.location}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getPriorityBadge(c.priority)}</td>
                        <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>
                        <td className="py-3.5 px-4 text-xs">
                          {c.assignedStaff ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              <UserCheck className="h-3 w-3 text-emerald-600" />
                              {c.assignedStaff.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1 border-slate-200 text-[#00236f] hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTicket(c);
                            }}
                          >
                            Manage
                            <ChevronRight className="h-3 w-3" />
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

        {/* Ticket Management Drawer */}
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={`Work Order ${selectedTicket?.complaintCode || ""}`}
          subtitle="Update dispatch status, technician assignments, and add internal notes"
          width="lg"
        >
          {selectedTicket && (
            <div className="space-y-6 text-sm">
              {/* Resident Context Card */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reported By</span>
                  <span className="text-xs text-slate-400">
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#00236f]" />
                    <span className="font-bold text-slate-900">{selectedTicket.student?.name}</span>
                    <span className="text-xs text-slate-500 font-mono">({selectedTicket.student?.studentId})</span>
                  </div>
                  {selectedTicket.student?.phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {selectedTicket.student.phone}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-200">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">Location:</span> {selectedTicket.location}
                </div>
              </div>

              {/* Ticket Details */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-base">{selectedTicket.title}</h4>
                <div className="p-3.5 rounded-md bg-white border border-slate-200 text-slate-700 leading-relaxed text-xs">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Status & Assignment Dispatch Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-[#00236f]"
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={updatePriority}
                    onChange={(e) => setUpdatePriority(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-[#00236f]"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Technician / Staff</label>
                  <select
                    value={updateStaffId}
                    onChange={(e) => setUpdateStaffId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-[#00236f]"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.designation || s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comments Timeline */}
              <div className="space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[#00236f]" />
                  Activity & Communication History
                </h5>

                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                    selectedTicket.comments.map((cm: any) => (
                      <div
                        key={cm.id}
                        className={`p-2.5 rounded text-xs border ${
                          cm.isInternal
                            ? "bg-amber-50/60 border-amber-200 text-amber-900"
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">
                            {cm.authorName} ({cm.authorRole})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(cm.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {cm.isInternal && (
                          <span className="inline-block text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1 rounded mb-1">
                            Internal Note
                          </span>
                        )}
                        <p>{cm.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No comments or activity logged yet.</p>
                  )}
                </div>

                {/* Add Comment Input */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Add an update or internal dispatch note..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded border-slate-300 text-[#00236f] focus:ring-[#00236f]"
                      />
                      <span>Internal staff note (hidden from student)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTicket}
                  disabled={saving}
                  className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
                >
                  {saving ? "Saving..." : "Save Work Order"}
                </Button>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
}
