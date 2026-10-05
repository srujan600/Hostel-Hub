"use client";

import React, { useState, useEffect } from "react";
import { Grid, Building, Bed as BedIcon, User, Phone, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function WardenMatrixPage() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState("BLK-C");
  const [selectedFloor, setSelectedFloor] = useState("ALL");

  // Selected Bed Drawer state
  const [selectedBed, setSelectedBed] = useState<any | null>(null);

  useEffect(() => {
    async function fetchMatrix() {
      try {
        setLoading(true);
        let url = "/api/warden/matrix";
        const params = new URLSearchParams();
        if (selectedBlock !== "ALL") params.append("block", selectedBlock);
        if (selectedFloor !== "ALL") params.append("floor", selectedFloor);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await api.get<any[]>(url);
        if (res.success && res.data) {
          setHostels(res.data);
        }
      } catch (err) {
        console.error("Matrix fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMatrix();
  }, [selectedBlock, selectedFloor]);

  const currentHostel = hostels[0];
  const currentBlock = currentHostel?.blocks?.find((b: any) => b.code === selectedBlock) || currentHostel?.blocks?.[0];

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Spatial Telemetry
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Real-Time Bed Occupancy Layout
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Hostel Occupancy Matrix
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Tactile bed slot matrix, resident tenancies, and vacant bed capacity
            </p>
          </div>

          {/* Block Selector */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-heading font-semibold text-slate-500 pl-2">Block:</span>
            <button
              onClick={() => setSelectedBlock("BLK-C")}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
                selectedBlock === "BLK-C" ? "bg-primary-container text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Block C (North)
            </button>
          </div>
        </div>

        {/* Floor Filter Buttons */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200/80 shadow-xs w-fit">
          <button
            onClick={() => setSelectedFloor("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
              selectedFloor === "ALL" ? "bg-primary-container text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Floors
          </button>
          <button
            onClick={() => setSelectedFloor("2")}
            className={`px-3 py-1 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
              selectedFloor === "2" ? "bg-primary-container text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            2nd Floor
          </button>
          <button
            onClick={() => setSelectedFloor("3")}
            className={`px-3 py-1 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
              selectedFloor === "3" ? "bg-primary-container text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            3rd Floor
          </button>
        </div>

        {/* Interactive Matrix Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !currentBlock ? (
          <p className="text-xs text-slate-400 p-8 text-center bg-white rounded-xl border">
            No block topology configured.
          </p>
        ) : (
          <div className="space-y-8">
            {currentBlock.floors.map((floor: any) => (
              <div key={floor.id} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" />
                    <span>{floor.name}</span>
                    <span className="font-mono text-[11px] text-slate-400 font-normal">
                      ({floor.rooms.length} Rooms)
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {floor.rooms.map((room: any) => (
                    <Card key={room.id} className="shadow-xs hover:border-slate-400 transition-colors">
                      <CardHeader className="bg-slate-50/70 py-2.5 px-3.5 border-b border-slate-100">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-heading font-extrabold text-sm text-slate-900">
                            Room {room.roomNumber}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200">
                            {room.roomType}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3 space-y-2">
                        {room.beds.map((bed: any) => {
                          const alloc = bed.allocations?.[0];
                          const isOccupied = bed.status === "OCCUPIED" && alloc;

                          return (
                            <div
                              key={bed.id}
                              onClick={() => setSelectedBed({ ...bed, room, floor, alloc })}
                              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                                isOccupied
                                  ? "bg-emerald-50/60 border-emerald-300 hover:bg-emerald-100/60 text-emerald-950"
                                  : "bg-white border-dashed border-slate-300 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <BedIcon className={`w-3.5 h-3.5 ${isOccupied ? "text-emerald-700" : "text-slate-400"}`} />
                                <span className="font-heading font-bold text-xs">
                                  Bed {bed.bedNumber}
                                </span>
                              </div>

                              {isOccupied ? (
                                <div className="text-right">
                                  <div className="font-heading font-semibold text-xs text-slate-900">
                                    {alloc.student.name}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-500">
                                    {alloc.student.studentId}
                                  </div>
                                </div>
                              ) : (
                                <span className="font-mono text-[10px] font-semibold text-slate-400">
                                  VACANT
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bed Inspector Drawer */}
        <Drawer
          isOpen={!!selectedBed}
          onClose={() => setSelectedBed(null)}
          title={selectedBed ? `Bed ${selectedBed.bedNumber} • Room ${selectedBed.room.roomNumber}` : ""}
          subtitle={selectedBed ? `${selectedBed.floor.name} • ${selectedBlock}` : ""}
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBed(null)}
            >
              Close Inspector
            </Button>
          }
        >
          {selectedBed && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                  Status
                </span>
                <span className="font-heading font-bold text-sm text-slate-900">
                  {selectedBed.status}
                </span>
              </div>

              {selectedBed.alloc ? (
                <div className="space-y-3">
                  <h4 className="font-heading font-bold text-xs uppercase text-slate-500 tracking-wider">
                    Resident Tenancy Profile
                  </h4>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs font-sans">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="font-heading font-bold text-sm text-slate-900">
                        {selectedBed.alloc.student.name}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Roll Number: <strong className="font-mono">{selectedBed.alloc.student.studentId}</strong>
                    </p>
                    <p className="text-slate-600">
                      Degree: {selectedBed.alloc.student.course}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedBed.alloc.student.phone}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  Bed is vacant and available for student allocation via the Administration module.
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
}
