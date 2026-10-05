"use client";

import React, { useState, useEffect } from "react";
import {
  Utensils,
  Coffee,
  Sun,
  Cookie,
  Moon,
  Edit2,
  Star,
  MessageSquare,
  Clock,
  Printer,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api-client";

export default function WardenMessPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [feedbackData, setFeedbackData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("MONDAY");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDay, setEditDay] = useState("MONDAY");
  const [editMealType, setEditMealType] = useState("BREAKFAST");
  const [editItems, setEditItems] = useState("");
  const [editTimings, setEditTimings] = useState("");
  const [saving, setSaving] = useState(false);

  const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const mealTypes = [
    { type: "BREAKFAST", label: "Breakfast", icon: Coffee, defaultTime: "07:30 - 09:30 AM" },
    { type: "LUNCH", label: "Lunch", icon: Sun, defaultTime: "12:30 - 02:30 PM" },
    { type: "SNACKS", label: "High Tea & Snacks", icon: Cookie, defaultTime: "05:00 - 06:15 PM" },
    { type: "DINNER", label: "Dinner", icon: Moon, defaultTime: "07:45 - 09:45 PM" },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, feedbackRes] = await Promise.all([
        api.get<any>("/api/mess"),
        api.get<any>("/api/mess/feedback"),
      ]);

      if (menuRes.success && menuRes.data) {
        setMenus(menuRes.data.allMenus || []);
      }
      if (feedbackRes.success && feedbackRes.data) {
        setFeedbackData(feedbackRes.data);
      }
    } catch (err) {
      console.error("Failed to load mess data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEdit = (day: string, mealType: string) => {
    const existing = menus.find((m) => m.dayOfWeek === day && m.mealType === mealType);
    const def = mealTypes.find((m) => m.type === mealType);
    setEditDay(day);
    setEditMealType(mealType);
    setEditItems(existing ? existing.items : "");
    setEditTimings(existing ? existing.timings : def?.defaultTime || "");
    setEditModalOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItems.trim()) {
      alert("Please specify food items for this meal.");
      return;
    }

    try {
      setSaving(true);
      const res = await api.put("/api/mess", {
        dayOfWeek: editDay,
        mealType: editMealType,
        items: editItems.trim(),
        timings: editTimings.trim(),
      });

      if (res.success) {
        setEditModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update mess menu.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter menus for the selected tab
  const dayMeals = menus.filter((m) => m.dayOfWeek === selectedDay);

  return (
    <AppShell expectedRole="WARDEN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Mess Menu & Dietary Oversight
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Warden Operations • Weekly nutritional schedule, meal timing configurations, and resident feedback
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="text-xs gap-1.5 border-slate-200 text-slate-700"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Weekly Menu
          </Button>
        </div>

        {/* Feedback & Satisfaction KPI Strip */}
        {feedbackData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-amber-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Food Quality Rating
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900">{feedbackData.avgRating}</span>
                    <div className="flex items-center text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(feedbackData.avgRating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Utensils className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-[#00236f]">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Resident Reviews Logged
                  </p>
                  <span className="text-2xl font-bold text-[#00236f] mt-1 block">
                    {feedbackData.totalCount} Submissions
                  </span>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#00236f]">
                  <MessageSquare className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-emerald-600">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Dietary Compliance
                  </p>
                  <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                    100% Hygienic
                  </span>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Days Tab Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-100 p-1.5 rounded-xl">
          {daysOfWeek.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                selectedDay === d
                  ? "bg-white text-[#00236f] shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* 4 Meal Cards Grid */}
        {loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mealTypes.map(({ type, label, icon: Icon, defaultTime }) => {
              const currentMeal = dayMeals.find((m) => m.mealType === type);
              return (
                <Card key={type} className="bg-white border-slate-200 shadow-sm hover:shadow transition-shadow">
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#00236f] flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">{label}</CardTitle>
                        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {currentMeal?.timings || defaultTime}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(selectedDay, type)}
                      className="text-xs h-7 gap-1 border-slate-200 text-[#00236f] hover:bg-blue-50"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    {currentMeal?.items ? (
                      <div className="flex flex-wrap gap-1.5">
                        {currentMeal.items.split(",").map((it: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-md font-medium"
                          >
                            {it.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No menu items configured for this meal.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Student Reviews Section */}
        {feedbackData && feedbackData.feedbacks && feedbackData.feedbacks.length > 0 && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#00236f]" />
                Recent Student Meal Feedback & Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {feedbackData.feedbacks.slice(0, 5).map((fb: any) => (
                  <div key={fb.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{fb.student.name}</span>
                        <span className="text-slate-400 font-mono">({fb.student.studentId})</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <span>{fb.rating}★</span>
                      </div>
                    </div>
                    <p className="font-semibold text-slate-800">{fb.title}</p>
                    <p className="text-slate-600">{fb.comments}</p>
                    <span className="text-[10px] text-slate-400 block pt-1">
                      Submitted on {new Date(fb.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal: Edit Meal Menu */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit ${editDay} — ${editMealType}`}
          description="Update the scheduled dietary items and serving timings"
        >
          <form onSubmit={handleSaveMenu} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Serving Timings *</label>
              <input
                type="text"
                required
                placeholder="e.g. 07:30 - 09:30 AM"
                value={editTimings}
                onChange={(e) => setEditTimings(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Meal Items (Comma-separated) *
              </label>
              <textarea
                rows={4}
                required
                placeholder="e.g. Masala Dosa, Sambar, Coconut Chutney, Boiled Eggs, Filter Coffee"
                value={editItems}
                onChange={(e) => setEditItems(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2.5 focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Separate individual items with commas for badge formatting.
              </span>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#00236f] hover:bg-[#1e3a8a] text-white tactile-btn"
              >
                {saving ? "Saving..." : "Update Meal Schedule"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
