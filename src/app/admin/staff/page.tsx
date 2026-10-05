"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  UserCheck,
  UserPlus,
  Search,
  Filter,
  Phone,
  Building,
  Mail,
  CheckCircle2,
  XCircle,
  Briefcase,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("staff123");
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("WARDEN");
  const [designation, setDesignation] = useState("Residential Warden");
  const [assignedHostelId, setAssignedHostelId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/staff?";
      if (roleFilter !== "ALL") url += `role=${roleFilter}&`;
      if (statusFilter !== "ALL") url += `status=${statusFilter}&`;

      const [staffRes, hostelsRes] = await Promise.all([
        api.get<any[]>(url),
        api.get<any[]>("/api/hostels"),
      ]);

      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data);
      }
      if (hostelsRes.success && hostelsRes.data) {
        setHostels(hostelsRes.data);
      }
    } catch (err) {
      console.error("Failed to load staff list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter, statusFilter]);

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post("/api/admin/staff", {
        username: username.trim(),
        email: email.trim(),
        password,
        name: name.trim(),
        employeeId: employeeId.trim(),
        phone: phone.trim(),
        role,
        designation: designation.trim(),
        assignedHostelId: assignedHostelId || undefined,
      });

      if (res.success) {
        setIsModalOpen(false);
        setUsername("");
        setEmail("");
        setName("");
        setEmployeeId("");
        setPhone("");
        setDesignation("Residential Warden");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to register staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Are you sure you want to change staff status to ${nextStatus}?`)) return;

    try {
      const res = await api.patch(`/api/admin/staff/${id}`, { status: nextStatus });
      if (res.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update staff status.");
    }
  };

  // KPIs
  const totalCount = staffList.length;
  const wardensCount = staffList.filter((s) => s.role === "WARDEN").length;
  const securityCount = staffList.filter((s) => s.role === "SECURITY").length;
  const adminCount = staffList.filter((s) => s.role === "ADMIN" || s.role === "SUPER_ADMIN").length;

  const filteredStaff = staffList.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchId = s.employeeId.toLowerCase().includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      return matchName || matchId || matchEmail;
    }
    return true;
  });

  const getRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case "WARDEN":
        return <Badge variant="purple">WARDEN</Badge>;
      case "SECURITY":
        return <Badge variant="warning">SECURITY</Badge>;
      case "ADMIN":
      case "SUPER_ADMIN":
        return <Badge variant="info">ADMINISTRATOR</Badge>;
      default:
        return <Badge variant="neutral">{roleStr}</Badge>;
    }
  };

  return (
    <AppShell expectedRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Staff & Warden Directory
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Institutional Personnel • Residential wardens, campus security supervisors, and facilities staff deployments
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff Member
          </Button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#00236f] bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Deployments</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#00236f]">
                <Shield className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Residential Wardens</p>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">{wardensCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <Briefcase className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Security Officers</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{securityCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Shield className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Administrators</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{adminCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Toolbar */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, employee ID..."
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
                  <option value="ALL">All Roles</option>
                  <option value="WARDEN">Wardens Only</option>
                  <option value="SECURITY">Security Only</option>
                  <option value="ADMIN">Administrators</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">
                Displaying {filteredStaff.length} personnel records
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#00236f]" />
              Staff Personnel Roster
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={6} />
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No staff members found"
                  description="No personnel match the filter criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Operational Role</th>
                      <th className="py-3 px-4">Designation & Assignment</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map((s) => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#00236f]">
                          {s.employeeId}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <span className="text-xs text-slate-400 font-mono block mt-0.5">{s.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {getRoleBadge(s.role)}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <p className="font-medium text-slate-800">{s.designation}</p>
                          <span className="text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3 text-slate-400" />
                            {s.assignedHostel ? s.assignedHostel.name : "All Campus Facilities"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-700">
                          {s.phone}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={s.status === "ACTIVE" ? "success" : "neutral"}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(s.id, s.status)}
                            className={`h-7 text-xs ${
                              s.status === "ACTIVE"
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
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

        {/* Modal: Add Staff */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Staff Member / Officer"
          description="Provision institutional personnel profile and role-based login credentials"
        >
          <form onSubmit={handleRegisterStaff} className="space-y-4 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WDN-105 / SEC-204"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Type *</label>
                <select
                  value={role}
                  onChange={(e) => {
                    const r = e.target.value;
                    setRole(r);
                    if (r === "WARDEN") setDesignation("Residential Warden");
                    else if (r === "SECURITY") setDesignation("Campus Gate Security Officer");
                    else setDesignation("Hostel Administrator");
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                >
                  <option value="WARDEN">Hostel Warden</option>
                  <option value="SECURITY">Security Personnel</option>
                  <option value="ADMIN">Hostel Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Designation *</label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Login Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. warden.sarah"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="s.jenkins@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 11102"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Hostel Facility</label>
              <select
                value={assignedHostelId}
                onChange={(e) => setAssignedHostelId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              >
                <option value="">All Campus Hostels</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
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
                className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
              >
                {submitting ? "Provisioning..." : "Provision Staff Member"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
