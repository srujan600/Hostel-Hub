"use client";

import React, { useState, useEffect } from "react";
import {
  Building,
  Layers,
  Bed,
  Plus,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  User,
  Search,
  Filter,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function AdminHostelsPage() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter selections
  const [selectedBlockId, setSelectedBlockId] = useState<string>("ALL");
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Room Modal State
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [roomFloorId, setRoomFloorId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState("DOUBLE");
  const [roomCapacity, setRoomCapacity] = useState(2);
  const [submittingRoom, setSubmittingRoom] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hostelsRes, roomsRes] = await Promise.all([
        api.get<any[]>("/api/hostels"),
        api.get<any[]>("/api/rooms"),
      ]);

      if (hostelsRes.success && hostelsRes.data) {
        setHostels(hostelsRes.data);
      }
      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }
    } catch (err) {
      console.error("Failed to load hostel structure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Collect all available floors from hostels hierarchy for the "Add Room" modal
  const allFloors: Array<{ id: string; name: string; blockName: string; hostelName: string }> = [];
  hostels.forEach((h) => {
    h.blocks?.forEach((b: any) => {
      // Fetch floors from individual hostel if detailed, or from rooms
    });
  });

  // Unique blocks & floors from rooms
  const uniqueBlocks = Array.from(new Set(rooms.map((r) => JSON.stringify({ id: r.blockId, name: r.blockName })))).map((s) => JSON.parse(s));
  const uniqueFloors = Array.from(new Set(rooms.map((r) => r.floorNumber))).sort((a: any, b: any) => a - b);

  // Available floors for modal
  const availableFloorsForAdd = Array.from(
    new Set(rooms.map((r) => JSON.stringify({ id: r.floorId, name: r.floorName, blockName: r.blockName })))
  ).map((s) => JSON.parse(s));

  const handleToggleRoomStatus = async (roomId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "UNDER_MAINTENANCE" : "ACTIVE";
    try {
      const res = await api.patch(`/api/rooms/${roomId}`, { status: nextStatus });
      if (res.success) {
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, status: nextStatus } : r))
        );
      }
    } catch (err: any) {
      alert(err.message || "Failed to update room status.");
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomFloorId || !roomNumber) {
      alert("Please select a floor and enter a room number.");
      return;
    }

    try {
      setSubmittingRoom(true);
      const res = await api.post("/api/rooms", {
        floorId: roomFloorId,
        roomNumber: roomNumber.trim(),
        roomType,
        capacity: roomCapacity,
      });

      if (res.success) {
        setAddRoomModalOpen(false);
        setRoomNumber("");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to create room.");
    } finally {
      setSubmittingRoom(false);
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (selectedBlockId !== "ALL" && r.blockId !== selectedBlockId) return false;
    if (selectedFloorNumber !== "ALL" && String(r.floorNumber) !== selectedFloorNumber) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoom = r.roomNumber.toLowerCase().includes(q);
      const matchBlock = r.blockName.toLowerCase().includes(q);
      return matchRoom || matchBlock;
    }
    return true;
  });

  return (
    <AppShell expectedRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Hostel Hierarchy & Room Inventory
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Campus residential structures, blocks, floors, and real-time room capacity configurations
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setAddRoomModalOpen(true)}
            className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add New Room
          </Button>
        </div>

        {/* Hostel Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((h) => (
            <Card key={h.id} className="bg-white border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-[#00236f]">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#00236f] bg-blue-50 px-2 py-0.5 rounded">
                    {h.code}
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    {h.genderType}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{h.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{h.address || "Main Academic Campus"}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="p-2 bg-slate-50 rounded">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Blocks</span>
                    <p className="text-sm font-bold text-slate-800">{h.totalBlocks}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Rooms</span>
                    <p className="text-sm font-bold text-slate-800">{h.totalRooms}</p>
                  </div>
                  <div className="p-2 bg-blue-50/50 rounded">
                    <span className="text-[10px] uppercase font-bold text-[#00236f]">Occupancy</span>
                    <p className="text-sm font-bold text-[#00236f]">{h.occupancyRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Toolbar */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search room number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                  />
                </div>

                <select
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Blocks</option>
                  {uniqueBlocks.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedFloorNumber}
                  onChange={(e) => setSelectedFloorNumber(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Floors</option>
                  {uniqueFloors.map((f: any) => (
                    <option key={f} value={String(f)}>
                      Floor {f}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">
                Displaying {filteredRooms.length} room inventory records
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Room Inventory Grid */}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : filteredRooms.length === 0 ? (
          <EmptyState
            title="No rooms found"
            description="No room units match the selected block and floor filter criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((r) => {
              const isMaintenance = r.status === "UNDER_MAINTENANCE";
              return (
                <Card
                  key={r.id}
                  className={`bg-white border-slate-200 shadow-sm transition-all overflow-hidden ${
                    isMaintenance ? "border-amber-300 bg-amber-50/20" : ""
                  }`}
                >
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900">Room {r.roomNumber}</span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {r.roomType}
                        </span>
                      </div>
                      <Badge
                        variant={isMaintenance ? "warning" : "success"}
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {r.blockName} • {r.floorName}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {/* Capacity Indicator */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Beds Occupancy:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {r.occupiedBeds} / {r.capacity} Occupied
                      </span>
                    </div>

                    {/* Beds List */}
                    <div className="space-y-1.5">
                      {r.beds?.map((b: any) => {
                        const isOccupied = b.status === "OCCUPIED";
                        return (
                          <div
                            key={b.id}
                            className={`p-2 rounded text-xs flex items-center justify-between border ${
                              isOccupied
                                ? "bg-blue-50/50 border-blue-100 text-blue-900"
                                : b.status === "MAINTENANCE"
                                ? "bg-amber-50/50 border-amber-200 text-amber-900"
                                : "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Bed className="h-3.5 w-3.5" />
                              <span className="font-bold">Bed {b.bedNumber}</span>
                              {b.currentResident && (
                                <span className="text-slate-600 truncate max-w-[120px]">
                                  ({b.currentResident.name})
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider">
                              {b.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Room Status Toggle Action */}
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleRoomStatus(r.id, r.status)}
                        className={`text-[11px] h-7 gap-1 ${
                          isMaintenance
                            ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            : "border-amber-200 text-amber-700 hover:bg-amber-50"
                        }`}
                      >
                        <Wrench className="h-3 w-3" />
                        {isMaintenance ? "Mark Active" : "Flag Maintenance"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Add New Room */}
        <Modal
          isOpen={addRoomModalOpen}
          onClose={() => setAddRoomModalOpen(false)}
          title="Add New Room Unit"
          description="Provision a new room record with automatic bed configuration"
        >
          <form onSubmit={handleCreateRoom} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Floor *</label>
              <select
                value={roomFloorId}
                onChange={(e) => setRoomFloorId(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:ring-1 focus:ring-[#00236f]"
              >
                <option value="">Select target floor...</option>
                {availableFloorsForAdd.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.blockName} — {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 305"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Type</label>
                <select
                  value={roomType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setRoomType(t);
                    setRoomCapacity(t === "SINGLE" ? 1 : t === "TRIPLE" ? 3 : 2);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                >
                  <option value="SINGLE">Single (1 Bed)</option>
                  <option value="DOUBLE">Double (2 Beds)</option>
                  <option value="TRIPLE">Triple (3 Beds)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Bed Capacity</label>
              <input
                type="number"
                min={1}
                max={6}
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Beds (A, B, C...) will be automatically provisioned with AVAILABLE status.
              </span>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddRoomModalOpen(false)}
                disabled={submittingRoom}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingRoom}
                className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
              >
                {submittingRoom ? "Creating..." : "Create Room Unit"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
