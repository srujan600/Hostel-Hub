"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  Users,
  CheckCircle,
  AlertCircle,
  Plus,
  Building,
  Shield,
  Wifi,
  Sparkles,
  Bed as BedIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function MyRoomPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await api.get<any>("/api/students/room");
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Room fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRoom();
  }, []);

  return (
    <AppShell expectedRole="STUDENT">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Accommodation Details
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Active Residential Assignment
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              My Room & Living Quarters
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Verified room assignment, bed designation, and roommate roster
            </p>
          </div>

          <Link href="/student/complaints">
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Report Room Issue
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !data?.hasAllocation ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Home className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-heading text-lg font-bold text-slate-800">
                No Active Room Allocation
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                You are currently not allocated to a hostel room. If this is unexpected, please report to the Warden Office.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Room Allocation Card (2 spans) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-t-4 border-t-primary shadow-md">
                <CardHeader className="bg-slate-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-heading font-bold text-xs">
                      {data.room.roomNumber}
                    </div>
                    <div>
                      <CardTitle>
                        Room {data.room.roomNumber} • Bed {data.room.myBedNumber}
                      </CardTitle>
                      <p className="text-xs text-slate-500 font-mono">
                        {data.block.name} • {data.floor.name}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" dot>Active Tenancy</Badge>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Physical Hierarchy Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                        Hostel
                      </span>
                      <span className="font-heading font-bold text-xs text-slate-800 block truncate">
                        {data.hostel.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                        Wing / Block
                      </span>
                      <span className="font-heading font-bold text-xs text-slate-800 block">
                        {data.block.code}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                        Room Type
                      </span>
                      <span className="font-heading font-bold text-xs text-slate-800 block">
                        {data.room.roomType}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                        Academic Year
                      </span>
                      <span className="font-mono font-bold text-xs text-primary block">
                        {data.allocation.academicYear}
                      </span>
                    </div>
                  </div>

                  {/* Bed Occupancy Matrix Nodes (Stitch Pattern) */}
                  <div>
                    <h4 className="font-heading font-semibold text-xs text-slate-900 uppercase tracking-wider mb-3">
                      Room Bed Matrix Layout
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {data.room.beds.map((b: any) => {
                        const isMyBed = b.isMyBed;
                        const isOccupied = b.status === "OCCUPIED";

                        return (
                          <div
                            key={b.bedId}
                            className={`p-4 rounded-xl border transition-all ${
                              isMyBed
                                ? "bg-primary-container/5 border-primary shadow-xs ring-1 ring-primary/20"
                                : isOccupied
                                ? "bg-emerald-50/50 border-emerald-200"
                                : "bg-white border-dashed border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <BedIcon className={`w-4 h-4 ${isMyBed ? "text-primary" : "text-slate-500"}`} />
                                <span className="font-heading font-bold text-sm text-slate-900">
                                  Bed {b.bedNumber}
                                </span>
                              </div>
                              {isMyBed ? (
                                <Badge variant="info">Your Bed</Badge>
                              ) : isOccupied ? (
                                <Badge variant="success">Occupied</Badge>
                              ) : (
                                <Badge variant="neutral">Vacant</Badge>
                              )}
                            </div>

                            {b.occupant ? (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                <div className="font-heading font-semibold text-xs text-slate-800">
                                  {b.occupant.name}
                                </div>
                                <div className="text-[11px] text-slate-500 font-sans">
                                  {b.occupant.course} (Yr {b.occupant.yearOfStudy})
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic mt-2">
                                Available for administrative allocation
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Room Facilities & Amenities */}
                  <div>
                    <h4 className="font-heading font-semibold text-xs text-slate-900 uppercase tracking-wider mb-3">
                      Room Inventory & Provisions
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>High-Speed 1Gbps LAN</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Individual Study Desk</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Lockable Wardrobe</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Ceiling Fan & Vent</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Split Air Conditioner</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>24/7 Power Backup</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Roommate & Rules Sidebar (1 span) */}
            <div className="space-y-6">
              {/* Room Rules & Curfew */}
              <Card>
                <CardHeader>
                  <CardTitle>Residential Living Policies</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs text-slate-600 font-sans">
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-amber-900">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <span className="font-heading font-semibold block">Curfew 22:30 Sharp</span>
                      Biometric gate turnstiles lock automatically.
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1.5">
                    <div className="font-heading font-semibold text-slate-800">Room Regulations</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500">
                      <li>Quiet study hours: 23:00 - 06:00</li>
                      <li>No unapproved high-wattage cooking appliances</li>
                      <li>Overnight visitors prohibited in student rooms</li>
                      <li>Keys must remain with registered occupant</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Maintenance Escalation Link */}
              <Card className="bg-primary-container text-white">
                <CardContent className="p-5">
                  <h4 className="font-heading font-bold text-base mb-1">
                    Need Room Repairs?
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed mb-4">
                    Report electrical, plumbing, carpentry, or Wi-Fi troubles directly to Warden Marcus Vance.
                  </p>
                  <Link href="/student/complaints">
                    <Button variant="emerald" size="sm" className="w-full">
                      Lodge Room Maintenance Ticket
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
