"use client";

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Clock,
  CheckCircle2,
  ChevronRight,
  Send,
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

export default function StudentComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // New Complaint Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formCategory, setFormCategory] = useState("ELECTRICAL");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("Block C • Room 204");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Details Modal state
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      let url = "/api/complaints";
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get<any[]>(url);
      if (res.success && res.data) {
        setComplaints(res.data);
      }
    } catch (err) {
      console.error("Failed to load complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter]);

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      setSubmitting(true);
      const res = await api.post("/api/complaints", {
        category: formCategory,
        title: formTitle.trim(),
        description: formDescription.trim(),
        location: formLocation.trim(),
        priority: formPriority,
      });

      if (res.success) {
        setIsDrawerOpen(false);
        setFormTitle("");
        setFormDescription("");
        fetchComplaints();
      } else {
        setFormError(res.error?.message || "Failed to submit ticket.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to submit complaint ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedComplaint) return;

    try {
      setSubmittingComment(true);
      const res = await api.post(`/api/complaints/${selectedComplaint.id}/comments`, {
        comment: commentText.trim(),
      });
      if (res.success && res.data) {
        setSelectedComplaint({
          ...selectedComplaint,
          comments: [...(selectedComplaint.comments || []), res.data],
        });
        setCommentText("");
        fetchComplaints();
      }
    } catch (err: any) {
      alert(err.message || "Failed to add comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="warning" dot>Submitted</Badge>;
      case "ASSIGNED":
        return <Badge variant="info" dot>Assigned</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="purple" dot>In Progress</Badge>;
      case "RESOLVED":
        return <Badge variant="success" dot>Resolved</Badge>;
      case "CLOSED":
        return <Badge variant="neutral">Closed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="danger" size="sm">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="warning" size="sm">High</Badge>;
      case "MEDIUM":
        return <Badge variant="info" size="sm">Medium</Badge>;
      case "LOW":
        return <Badge variant="neutral" size="sm">Low</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{priority}</Badge>;
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
                Maintenance & Support
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Resident Tickets Desk
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Hostel Complaints & Repairs
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Lodge, track, and converse on maintenance requests with staff technicians
            </p>
          </div>

          <Button
            size="md"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsDrawerOpen(true)}
          >
            Lodge New Ticket
          </Button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {["ALL", "SUBMITTED", "IN_PROGRESS", "RESOLVED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-primary-container text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {st === "ALL" ? "All Tickets" : st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-sans hidden sm:inline">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-sans text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Categories</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="CARPENTRY">Carpentry</option>
              <option value="INTERNET_WIFI">Wi-Fi / LAN</option>
              <option value="CLEANLINESS">Cleanliness</option>
              <option value="MESS_FOOD">Mess Food</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Complaints Table / List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : complaints.length === 0 ? (
              <EmptyState
                icon={<AlertCircle className="w-8 h-8 text-slate-400" />}
                title="No Complaints Found"
                description="You currently have no active or historical maintenance complaints under this filter."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Report First Issue
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50/80 text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Ticket Code</th>
                      <th className="py-3 px-4">Issue Title & Location</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned To</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {complaints.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        onClick={() => setSelectedComplaint(c)}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          {c.complaintCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-heading font-bold text-slate-900 text-xs">
                            {c.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {c.location} • Filed {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          {c.category}
                        </td>
                        <td className="py-3.5 px-4">{getPriorityBadge(c.priority)}</td>
                        <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {c.assignedStaff ? (
                            <span className="font-heading font-semibold text-xs text-slate-800">
                              {c.assignedStaff.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComplaint(c);
                            }}
                          >
                            Inspect
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

        {/* LODGE NEW TICKET DRAWER */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Lodge Maintenance Ticket"
          subtitle="Direct escalation to Warden & Campus Maintenance Crews"
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
                onClick={handleCreateComplaint}
              >
                Submit Ticket
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateComplaint} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-sans bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ELECTRICAL">Electrical (Lights, AC, Fan, Sockets)</option>
                <option value="PLUMBING">Plumbing (Washroom, Tap, Geyser)</option>
                <option value="CARPENTRY">Carpentry (Bed, Chair, Door, Lock)</option>
                <option value="INTERNET_WIFI">Internet / LAN / Wi-Fi Network</option>
                <option value="CLEANLINESS">Housekeeping / Waste Management</option>
                <option value="MESS_FOOD">Mess / Dining Hall Provisions</option>
                <option value="SECURITY">Security / Surveillance</option>
                <option value="OTHER">Other Issues</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPriority(p)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-heading font-semibold border transition-all ${
                      formPriority === p
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Location Details
              </label>
              <input
                type="text"
                required
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. Block C • Room 204 or 2nd Floor Corridor"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Issue Summary / Title
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Ceiling fan humming loudly & not spinning"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Detailed Description
              </label>
              <textarea
                required
                rows={4}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe the issue accurately so technicians bring the correct spare parts..."
                className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>
        </Drawer>

        {/* TICKET INSPECTION & COMMENTARY MODAL */}
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title={selectedComplaint ? `${selectedComplaint.complaintCode} — ${selectedComplaint.title}` : ""}
          description={selectedComplaint ? `Logged on ${new Date(selectedComplaint.createdAt).toLocaleString()} • ${selectedComplaint.location}` : ""}
          maxWidth="lg"
        >
          {selectedComplaint && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-heading font-semibold text-slate-500 uppercase">Status:</span>
                  {getStatusBadge(selectedComplaint.status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-heading font-semibold text-slate-500 uppercase">Priority:</span>
                  {getPriorityBadge(selectedComplaint.priority)}
                </div>
              </div>

              {/* Description */}
              <div>
                <h5 className="font-heading font-semibold text-xs text-slate-900 uppercase tracking-wider mb-1.5">
                  Reported Issue Description
                </h5>
                <p className="text-xs text-slate-700 bg-slate-50/60 p-3 rounded-lg border border-slate-200/80 leading-relaxed font-sans">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Technician Notes / Comments Timeline */}
              <div>
                <h5 className="font-heading font-semibold text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-secondary" />
                  <span>Updates & Conversation Trail</span>
                </h5>

                <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {selectedComplaint.comments && selectedComplaint.comments.length > 0 ? (
                    selectedComplaint.comments.map((cm: any) => (
                      <div
                        key={cm.id}
                        className={`p-3 rounded-lg border text-xs font-sans ${
                          cm.authorRole === "WARDEN" || cm.authorRole === "ADMIN"
                            ? "bg-primary-container/5 border-primary/20 text-slate-800"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-heading font-bold text-slate-900">
                            {cm.authorName} ({cm.authorRole})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(cm.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="leading-relaxed">{cm.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      No staff updates posted yet. Technician dispatch in progress.
                    </p>
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add an update or respond to the warden..."
                    className="flex-1 h-9 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    isLoading={submittingComment}
                    rightIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Send
                  </Button>
                </form>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
