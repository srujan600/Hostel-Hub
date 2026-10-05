"use client";

import React, { useState, useEffect } from "react";
import { Users, Search, Phone, Mail, Home, AlertCircle, CalendarCheck, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function WardenResidentsPage() {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState<any | null>(null);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      let url = "/api/warden/residents";
      if (search.trim()) url += `?search=${encodeURIComponent(search.trim())}`;
      const res = await api.get<any[]>(url);
      if (res.success && res.data) {
        setResidents(res.data);
      }
    } catch (err) {
      console.error("Failed to load residents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResidents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Resident Roster
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Student Directory & Emergency Verification
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Active Residents Roster
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Search by name, roll number, or room to inspect student emergency files
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resident or roll ID..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-300 bg-white text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>
        </div>

        {/* Residents Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : residents.length === 0 ? (
              <p className="text-xs text-slate-400 p-8 text-center">
                No residents found matching your query.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50/80 text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Roll ID</th>
                      <th className="py-3 px-4">Room / Bed</th>
                      <th className="py-3 px-4">Degree & Year</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {residents.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                        onClick={() => setSelectedResident(r)}
                      >
                        <td className="py-3.5 px-4 font-heading font-bold text-slate-900">
                          {r.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                          {r.studentId}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.roomAllocation ? (
                            <span className="font-mono font-bold text-xs text-primary px-2 py-0.5 rounded bg-primary/10">
                              {r.roomAllocation.roomNumber}-{r.roomAllocation.bedNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unallocated</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {r.course} (Yr {r.yearOfStudy})
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {r.phone}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="success" size="sm" dot>{r.status}</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResident(r);
                            }}
                          >
                            Inspect Profile
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

        {/* Resident File Inspection Drawer */}
        <Drawer
          isOpen={!!selectedResident}
          onClose={() => setSelectedResident(null)}
          title={selectedResident?.name || ""}
          subtitle={selectedResident ? `Roll ID: ${selectedResident.studentId}` : ""}
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedResident(null)}
            >
              Close Record
            </Button>
          }
        >
          {selectedResident && (
            <div className="space-y-4 text-xs font-sans">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-heading font-bold text-sm text-slate-900 block">
                  Accommodation
                </span>
                {selectedResident.roomAllocation ? (
                  <p className="text-slate-700">
                    Room {selectedResident.roomAllocation.roomNumber} • Bed {selectedResident.roomAllocation.bedNumber} ({selectedResident.roomAllocation.block})
                  </p>
                ) : (
                  <p className="text-slate-400 italic">No room allocated.</p>
                )}
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <span className="font-heading font-bold text-xs uppercase text-slate-500 tracking-wider block">
                  Emergency Contact File
                </span>
                <p className="text-slate-800">
                  Guardian: <strong>{selectedResident.emergencyContactName}</strong>
                </p>
                <p className="text-slate-800 flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {selectedResident.emergencyContactPhone}
                </p>
                <p className="text-slate-600 pt-1 border-t border-slate-100">
                  Address: {selectedResident.address || "On file in estate office"}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-heading font-bold text-xs uppercase text-slate-500 tracking-wider block">
                  Active Work Orders & Out-Passes
                </span>
                <p className="text-slate-700">
                  Active Complaints: <strong>{selectedResident.activeComplaintsCount}</strong>
                </p>
                <p className="text-slate-700">
                  Pending Out-Pass Under Review: <strong>{selectedResident.hasPendingLeave ? "Yes (1)" : "No"}</strong>
                </p>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
}
