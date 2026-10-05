"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Shield,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Info,
  Layers,
  ChevronRight,
  Clock,
  Terminal,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");

  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableTargets, setAvailableTargets] = useState<string[]>([]);

  // Log Details Modal State
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/audit-logs?";
      if (actionFilter !== "ALL") url += `action=${actionFilter}&`;
      if (roleFilter !== "ALL") url += `actorRole=${roleFilter}&`;
      if (targetFilter !== "ALL") url += `targetType=${targetFilter}&`;

      const res = await api.get<any>(url);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        if (res.data.availableActions) setAvailableActions(res.data.availableActions);
        if (res.data.availableTargets) setAvailableTargets(res.data.availableTargets);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, roleFilter, targetFilter]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const csvRows = [
      ["Timestamp", "Action", "Actor Name", "Actor Role", "Target Type", "Target ID", "IP Address", "Details"],
      ...logs.map((l) => [
        `"${new Date(l.createdAt).toISOString()}"`,
        `"${l.action}"`,
        `"${l.actorName}"`,
        `"${l.actorRole}"`,
        `"${l.targetType}"`,
        `"${l.targetId || ""}"`,
        `"${l.ipAddress || ""}"`,
        `"${(l.details || "").replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hostelhub_audit_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((l) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = l.action.toLowerCase().includes(q);
      const matchActor = l.actorName.toLowerCase().includes(q);
      const matchTarget = l.targetType.toLowerCase().includes(q);
      const matchDetails = l.details?.toLowerCase().includes(q);
      return matchAction || matchActor || matchTarget || matchDetails;
    }
    return true;
  });

  const getActionBadge = (act: string) => {
    if (act.includes("ALLOCATED") || act.includes("TRANSFERRED")) {
      return <Badge variant="purple">{act}</Badge>;
    }
    if (act.includes("APPROVED") || act.includes("CHECKED_IN") || act.includes("RESOLVED")) {
      return <Badge variant="success">{act}</Badge>;
    }
    if (act.includes("REJECTED") || act.includes("SUSPENDED") || act.includes("ARCHIVED")) {
      return <Badge variant="danger">{act}</Badge>;
    }
    if (act.includes("VACATED") || act.includes("CHECKED_OUT")) {
      return <Badge variant="warning">{act}</Badge>;
    }
    return <Badge variant="info">{act}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
      case "SUPER_ADMIN":
        return <span className="text-[10px] font-bold bg-blue-100 text-[#00236f] px-1.5 py-0.5 rounded">ADMIN</span>;
      case "WARDEN":
        return <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">WARDEN</span>;
      case "SECURITY":
        return <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">SECURITY</span>;
      default:
        return <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{role}</span>;
    }
  };

  return (
    <AppShell expectedRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Institutional Audit Trail & Event Ledger
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Compliance & Security • Comprehensive tamper-evident ledger tracking institutional operations, permissions, and status changes
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export Audit Ledger
          </Button>
        </div>

        {/* Filter Controls */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search action, actor, target..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Actor Roles</option>
                  <option value="ADMIN">Administrators</option>
                  <option value="WARDEN">Wardens</option>
                  <option value="SECURITY">Security</option>
                  <option value="STUDENT">Students</option>
                </select>

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Actions</option>
                  {availableActions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>

                <select
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Target Entities</option>
                  {availableTargets.map((tar) => (
                    <option key={tar} value={tar}>
                      {tar}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">
                Displaying {filteredLogs.length} audit entries
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-[#00236f]" />
              Immutable Activity Journal
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">Logged in real-time</span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={8} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No audit entries found"
                  description="No recorded events match the selected criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action Event</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Target Entity</th>
                      <th className="py-3 px-4">Client IP</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {new Date(l.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          {getActionBadge(l.action)}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-semibold text-slate-900">{l.actorName}</div>
                          <div className="mt-0.5">{getRoleBadge(l.actorRole)}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="font-semibold text-slate-800">{l.targetType}</span>
                          {l.targetId && (
                            <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                              ID: {l.targetId.slice(-8)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {l.ipAddress || "127.0.0.1"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLog(l)}
                            className="h-7 text-xs border-slate-200 text-[#00236f] hover:bg-blue-50 gap-1"
                          >
                            <Terminal className="h-3 w-3" />
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

        {/* Modal: Log Inspection Details */}
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Inspection • ${selectedLog?.action || ""}`}
          description={`Logged at ${selectedLog ? new Date(selectedLog.createdAt).toLocaleString() : ""}`}
        >
          {selectedLog && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Actor</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5">{selectedLog.actorName}</span>
                  <span className="text-slate-500 block">({selectedLog.actorRole})</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Target Entity</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5">{selectedLog.targetType}</span>
                  <span className="font-mono text-slate-500 block">{selectedLog.targetId || "Global Event"}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-700 font-bold block mb-1">Raw Payload Details:</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-xs overflow-x-auto max-h-60 whitespace-pre-wrap">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedLog.details);
                      return JSON.stringify(parsed, null, 2);
                    } catch {
                      return selectedLog.details || "No payload metadata attached.";
                    }
                  })()}
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
                >
                  Close Inspection
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
