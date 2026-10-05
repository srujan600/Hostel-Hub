"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Plus,
  AlertTriangle,
  Send,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Building,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function WardenNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Compose Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [targetAudience, setTargetAudience] = useState("ALL");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      let url = "/api/notices";
      if (priorityFilter !== "ALL") url += `?priority=${priorityFilter}`;
      const res = await api.get<any[]>(url);
      if (res.success && res.data) {
        setNotices(res.data);
      }
    } catch (err) {
      console.error("Failed to load notices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [priorityFilter]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Please provide both title and content for the circular.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/api/warden/notices", {
        title: title.trim(),
        content: content.trim(),
        priority,
        targetAudience,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      });

      if (res.success) {
        setIsModalOpen(false);
        setTitle("");
        setContent("");
        setPriority("NORMAL");
        setTargetAudience("ALL");
        setExpiryDate("");
        fetchNotices();
      }
    } catch (err: any) {
      alert(err.message || "Failed to publish circular.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter notices by search query
  const filteredNotices = notices.filter((n) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchCode = n.noticeCode?.toLowerCase().includes(q);
      const matchContent = n.content?.toLowerCase().includes(q);
      return matchTitle || matchCode || matchContent;
    }
    return true;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="danger" className="bg-red-600 text-white animate-pulse">URGENT</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="bg-amber-500 text-white">HIGH</Badge>;
      case "NORMAL":
        return <Badge variant="info" className="bg-blue-100 text-blue-800">NORMAL</Badge>;
      case "LOW":
        return <Badge variant="neutral" className="text-slate-600">LOW</Badge>;
      default:
        return <Badge variant="neutral">{p}</Badge>;
    }
  };

  const getAudienceBadge = (aud: string) => {
    switch (aud) {
      case "ALL":
        return <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">All Campus</span>;
      case "STUDENTS":
        return <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">All Students</span>;
      case "WARDENS":
        return <span className="text-[11px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded">Staff Only</span>;
      default:
        return <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{aud}</span>;
    }
  };

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Circulars & Bulletins
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Warden Operations • Broadcast announcements, circulars, and official updates
          </p>
        </div>
        {/* Top Action & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search circulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00236f]"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn gap-1.5 text-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            Publish New Circular
          </Button>
        </div>

        {/* Notices Cards List */}
        {loading ? (
          <div className="space-y-4">
            <TableSkeleton rows={4} />
          </div>
        ) : filteredNotices.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-12">
              <EmptyState
                title="No circulars published"
                description="There are currently no active bulletins or circulars in this category."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredNotices.map((notice) => (
              <Card
                key={notice.id}
                className="bg-white border-slate-200 shadow-sm hover:shadow transition-shadow overflow-hidden"
              >
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#00236f] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {notice.noticeCode}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{notice.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {getAudienceBadge(notice.targetAudience)}
                      {getPriorityBadge(notice.priority)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {notice.content}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Published: {new Date(notice.publishDate).toLocaleDateString()}</span>
                    </div>

                    {notice.expiryDate && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Expires: {new Date(notice.expiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Publish New Circular */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Compose Official Campus Circular"
          description="Broadcast notices, hostel curfew rules, or emergency alerts to residents"
        >
          <form onSubmit={handlePublish} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Circular Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Schedule for Monthly Pest Control & Room Inspection"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
                >
                  <option value="NORMAL">Normal Announcement</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent / Emergency Alert</option>
                  <option value="LOW">Low Priority (Advisory)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
                >
                  <option value="ALL">All Campus Residents & Staff</option>
                  <option value="STUDENTS">Residents / Students Only</option>
                  <option value="WARDENS">Wardens & Staff Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expiration Date (Optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Announcement Text *</label>
              <textarea
                rows={5}
                required
                placeholder="Enter detailed notification body, instructions, timings..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Broadcasting..." : "Publish Circular"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
