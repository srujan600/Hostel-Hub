"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Building,
  GraduationCap,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Mail,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/services/api-client";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [allocationFilter, setAllocationFilter] = useState("ALL");

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("student123");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("B.Tech Computer Science");
  const [department, setDepartment] = useState("School of Engineering");
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [gender, setGender] = useState("MALE");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/students?";
      if (statusFilter !== "ALL") url += `status=${statusFilter}&`;
      if (allocationFilter !== "ALL") url += `allocationStatus=${allocationFilter}&`;

      const res = await api.get<any[]>(url);
      if (res.success && res.data) {
        setStudents(res.data);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [statusFilter, allocationFilter]);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post("/api/admin/students", {
        username: username.trim(),
        email: email.trim(),
        password,
        name: name.trim(),
        studentId: studentId.trim(),
        phone: phone.trim(),
        course: course.trim(),
        department: department.trim(),
        yearOfStudy,
        gender,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        address: address.trim() || undefined,
      });

      if (res.success) {
        setIsRegisterOpen(false);
        // Reset form
        setUsername("");
        setEmail("");
        setName("");
        setStudentId("");
        setPhone("");
        setEmergencyContactName("");
        setEmergencyContactPhone("");
        setAddress("");
        fetchStudents();
      }
    } catch (err: any) {
      alert(err.message || "Failed to register student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Are you sure you want to mark this resident as ${nextStatus}?`)) return;

    try {
      const res = await api.patch(`/api/admin/students/${id}`, { status: nextStatus });
      if (res.success) {
        fetchStudents();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update resident status.");
    }
  };

  const filteredStudents = students.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchRoll = s.studentId.toLowerCase().includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      const matchPhone = s.phone.includes(q);
      return matchName || matchRoll || matchEmail || matchPhone;
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
              Student Master Directory
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Institutional Records • Comprehensive resident database, credentials, departmental profiles, and housing assignments
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsRegisterOpen(true)}
            className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Register Student
          </Button>
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
                    placeholder="Search name, roll ID, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
                  />
                </div>

                <select
                  value={allocationFilter}
                  onChange={(e) => setAllocationFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Housing Statuses</option>
                  <option value="ALLOCATED">Allocated Residents Only</option>
                  <option value="UNALLOCATED">Unallocated Only</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Enrollment Statuses</option>
                  <option value="ACTIVE">Active Enrolled</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="GRADUATED">Graduated</option>
                </select>
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">
                Displaying {filteredStudents.length} of {students.length} resident profiles
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-[#00236f]" />
              Enrolled Resident Profiles
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={8} />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No resident records found"
                  description="No students match the current filter and search criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Roll ID</th>
                      <th className="py-3 px-4">Academic Details</th>
                      <th className="py-3 px-4">Room Allocation</th>
                      <th className="py-3 px-4">Emergency Contact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <span className="text-xs text-slate-400 font-mono block mt-0.5">{s.email}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#00236f]">
                          {s.studentId}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <p className="font-medium text-slate-800">{s.course}</p>
                          <span className="text-slate-400">Year {s.yearOfStudy} • {s.department}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {s.allocation ? (
                            <div>
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Room {s.allocation.roomNumber} ({s.allocation.bedNumber})
                              </span>
                              <span className="text-slate-400 block mt-0.5 text-[11px]">
                                {s.allocation.blockName}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">
                              UNALLOCATED
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-medium text-slate-700">{s.emergencyContactName}</div>
                          <span className="text-slate-500 font-mono text-[11px]">{s.emergencyContactPhone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              s.status === "ACTIVE"
                                ? "success"
                                : s.status === "SUSPENDED"
                                ? "danger"
                                : "info"
                            }
                          >
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
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {s.status === "ACTIVE" ? "Suspend" : "Activate"}
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

        {/* Modal: Register Student */}
        <Modal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          title="Register New Resident Student"
          description="Create student master record and automated login credentials"
        >
          <form onSubmit={handleRegisterStudent} className="space-y-4 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Roll / Student ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-2026-0042"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
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
                  placeholder="e.g. student.alex"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  placeholder="alex@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Degree / Course *</label>
                <input
                  type="text"
                  required
                  placeholder="B.Tech Computer Science"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year of Study</label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                >
                  <option value={1}>Year 1 (Freshman)</option>
                  <option value={2}>Year 2 (Sophomore)</option>
                  <option value={3}>Year 3 (Junior)</option>
                  <option value={4}>Year 4 (Senior)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  placeholder="Guardian / Parent Name"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Permanent Residential Address</label>
              <textarea
                rows={2}
                placeholder="Street address, city, state, postal code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRegisterOpen(false)}
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
                {submitting ? "Enrolling..." : "Register & Create Profile"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
