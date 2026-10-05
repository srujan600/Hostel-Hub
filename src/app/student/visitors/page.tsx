"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, Shield, Clock, Phone, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function StudentVisitorsPage() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Register Visitor Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("PARENT");
  const [idProofType, setIdProofType] = useState("NATIONAL_ID");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const res = await api.get<any[]>("/api/visitors");
      if (res.success && res.data) {
        setVisitors(res.data);
      }
    } catch (err) {
      console.error("Failed to load visitors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post("/api/visitors", {
        name: name.trim(),
        phone: phone.trim(),
        relationship,
        idProofType,
        idProofNumber: idProofNumber.trim(),
      });
      if (res.success) {
        setIsDrawerOpen(false);
        setName("");
        setPhone("");
        setIdProofNumber("");
        fetchVisitors();
      }
    } catch (err: any) {
      alert(err.message || "Failed to register visitor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell expectedRole="STUDENT">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Guest Entry Verification
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                Main Gate Security Registration
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Registered Visitors & Guest Passes
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Pre-authorize family, guardians, and visitors for campus reception access
            </p>
          </div>

          <Button
            size="md"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsDrawerOpen(true)}
          >
            Pre-Authorize Guest
          </Button>
        </div>

        {/* Visitors List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={3} cols={4} />
            ) : visitors.length === 0 ? (
              <EmptyState
                icon={<Users className="w-8 h-8 text-slate-400" />}
                title="No Registered Visitors"
                description="You haven't pre-authorized any visitors yet. Register family or guardians to facilitate gate access."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Register Visitor
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50/80 text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Visitor Name</th>
                      <th className="py-3 px-4">Relationship</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Active Passes</th>
                      <th className="py-3 px-4">Pass Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visitors.map((v) => {
                      const latestPass = v.passes?.[0];
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-heading font-bold text-slate-900">
                            {v.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {v.relationship}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono">
                            {v.phone}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-primary">
                            {latestPass ? latestPass.passCode : "None"}
                          </td>
                          <td className="py-3.5 px-4">
                            {latestPass ? (
                              <Badge variant="success" dot>{latestPass.status}</Badge>
                            ) : (
                              <span className="text-slate-400 italic">No Active Pass</span>
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

        {/* REGISTER VISITOR DRAWER */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Pre-Authorize Visitor Pass"
          subtitle="Generates verified security pass for Gate 1 Security Check"
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
                onClick={handleRegister}
              >
                Confirm Pass
              </Button>
            </div>
          }
        >
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Visitor Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Robert Rivers"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98111 22233"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Relationship to Resident
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-sans bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="PARENT">Parent (Father / Mother)</option>
                <option value="GUARDIAN">Official Guardian</option>
                <option value="SIBLING">Sibling (Brother / Sister)</option>
                <option value="RELATIVE">Relative</option>
                <option value="FRIEND">Friend / Academic Peer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Government ID Proof Type
              </label>
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-sans bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="NATIONAL_ID">National ID / Aadhar Card</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                ID Proof Document Number (Optional)
              </label>
              <input
                type="text"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                placeholder="e.g. AADHAR-XXXX-XXXX"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>
        </Drawer>
      </div>
    </AppShell>
  );
}
