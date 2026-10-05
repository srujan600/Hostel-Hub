"use client";

import React, { useState, useEffect } from "react";
import { BellRing, AlertCircle, Calendar, Shield, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function StudentNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  useEffect(() => {
    async function fetchNotices() {
      try {
        setLoading(true);
        let url = "/api/notices";
        if (priorityFilter !== "ALL") url += `?priority=${priorityFilter}`;
        const res = await api.get<any[]>(url);
        if (res.success && res.data) {
          setNotices(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch notices:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotices();
  }, [priorityFilter]);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="danger" dot>Urgent Circular</Badge>;
      case "HIGH":
        return <Badge variant="warning" dot>High Priority</Badge>;
      default:
        return <Badge variant="info">General Notice</Badge>;
    }
  };

  return (
    <AppShell expectedRole="STUDENT">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Official Campus Dispatch
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Hostel Administration Notices
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Notice Board & Circulars
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Curfew updates, fire drills, mess changes, and holiday schedules
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
            {["ALL", "URGENT", "HIGH", "NORMAL"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
                  priorityFilter === p
                    ? "bg-primary-container text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Notices Cards Grid */}
        {loading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : notices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-slate-400 text-xs">
              No notices published under this priority filter.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map((n) => (
              <Card
                key={n.id}
                className="hoverEffect cursor-pointer flex flex-col justify-between"
                onClick={() => setSelectedNotice(n)}
              >
                <CardHeader className="bg-slate-50/50 pb-3">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-[10px] text-slate-400 font-semibold">
                      {n.noticeCode}
                    </span>
                    {getPriorityBadge(n.priority)}
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex-1">
                  <CardTitle className="text-base line-clamp-1 mb-2">
                    {n.title}
                  </CardTitle>
                  <p className="text-xs text-slate-600 font-sans line-clamp-3 leading-relaxed">
                    {n.content}
                  </p>
                </CardContent>
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 rounded-b-xl flex items-center justify-between text-xs text-slate-400 font-sans">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(n.publishDate).toLocaleDateString()}
                  </span>
                  <span className="font-heading font-semibold text-secondary flex items-center gap-1">
                    Read Notice <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Notice Detail Modal */}
        <Modal
          isOpen={!!selectedNotice}
          onClose={() => setSelectedNotice(null)}
          title={selectedNotice?.title || "Notice"}
          description={selectedNotice ? `Circular Code: ${selectedNotice.noticeCode} • Published on ${new Date(selectedNotice.publishDate).toLocaleDateString()}` : ""}
          maxWidth="lg"
        >
          {selectedNotice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-mono text-slate-500 uppercase">
                  Target Audience: <strong className="text-slate-800">{selectedNotice.targetAudience}</strong>
                </span>
                {getPriorityBadge(selectedNotice.priority)}
              </div>

              <div className="p-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                {selectedNotice.content}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNotice(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
