"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, ShieldCheck, Mail, MapPin, Save, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const res = await api.get<any>("/api/students/profile");
        if (res.success && res.data) {
          setProfile(res.data);
          setPhone(res.data.phone || "");
          setEmergencyName(res.data.emergencyContactName || "");
          setEmergencyPhone(res.data.emergencyContactPhone || "");
          setAddress(res.data.address || "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.patch("/api/students/profile", {
        phone: phone.trim(),
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        address: address.trim(),
      });
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell expectedRole="STUDENT">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
              Resident Master Record
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-sans">
              Identity & Contact Maintenance
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Student Profile & Settings
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-sans">
            Review academic registration details and update verified emergency contacts
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Card: Academic Record (Read-Only) */}
            <Card className="lg:col-span-1">
              <CardHeader className="bg-slate-50/60 pb-3">
                <CardTitle>Academic Registration</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs font-sans">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-heading font-extrabold text-base shadow-sm">
                    {profile?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-900">
                      {profile?.name}
                    </h3>
                    <p className="font-mono text-slate-500 text-[11px]">
                      {profile?.studentId}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-slate-400 font-semibold block">
                      Degree & Major
                    </span>
                    <span className="font-heading font-semibold text-slate-800">
                      {profile?.course}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-slate-400 font-semibold block">
                      Department / School
                    </span>
                    <span className="text-slate-700">{profile?.department}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-slate-400 font-semibold block">
                      Year of Study
                    </span>
                    <span className="text-slate-700">Year {profile?.yearOfStudy} (Senior Standing)</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-slate-400 font-semibold block">
                      Hostel Status
                    </span>
                    <Badge variant="success" dot className="mt-1">
                      Enrolled & Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Card: Editable Contact & Emergency Details */}
            <Card className="lg:col-span-2">
              <CardHeader className="bg-slate-50/60 flex items-center justify-between pb-3">
                <div>
                  <CardTitle>Contact & Emergency Contacts</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Used by Wardens during emergency notifications and out-pass verifications
                  </p>
                </div>
                {saveSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-heading font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Saved!</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                        Personal Mobile Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                        Campus Email (Read-Only)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={profile?.email || ""}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                        Emergency Parent / Guardian Name
                      </label>
                      <input
                        type="text"
                        required
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                        Emergency Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                      Permanent Home Address
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={saving}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      Update Profile Contacts
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
