"use client";

import React, { useState, useEffect } from "react";
import { Utensils, Star, Send, CheckCircle2, Calendar } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api-client";

export default function StudentMessPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("TODAY");

  // Feedback form state
  const [title, setTitle] = useState("");
  const [comments, setComments] = useState("");
  const [rating, setRating] = useState(5);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoading(true);
        const res = await api.get<any>("/api/mess");
        if (res.success && res.data) {
          setData(res.data);
          setSelectedDay(res.data.todayDay);
        }
      } catch (err) {
        console.error("Failed to load mess menu:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      const res = await api.post("/api/mess", {
        title: title.trim(),
        comments: comments.trim(),
        rating,
        category: "MESS",
      });
      if (res.success) {
        setFeedbackSuccess(true);
        setTitle("");
        setComments("");
        setTimeout(() => setFeedbackSuccess(false), 4000);
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const displayedMeals =
    data?.allMenus?.filter((m: any) => m.dayOfWeek === selectedDay) || [];

  return (
    <AppShell expectedRole="STUDENT">
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-secondary">
                Dining Hall Services
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-sans">
                North Wing Mess Hall
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Mess Dietary Menu & Timings
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-sans">
              Weekly seasonal provisions, meal hours, and resident catering feedback
            </p>
          </div>

          <Badge variant="success" dot size="md">
            Mess Operational Today ({data?.todayDay})
          </Badge>
        </div>

        {/* Day Selector Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-white rounded-xl border border-slate-200 shadow-xs custom-scrollbar">
          {daysOfWeek.map((day) => {
            const isToday = day === data?.todayDay;
            const isSelected = day === selectedDay;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-primary-container text-white shadow-xs"
                    : isToday
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {day} {isToday ? "(Today)" : ""}
              </button>
            );
          })}
        </div>

        {/* 2-Column: Meals on Left, Feedback Form on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
              <Utensils className="w-4 h-4 text-secondary" />
              <span>{selectedDay} Meal Timetable</span>
            </h3>

            {loading ? (
              <div className="space-y-3">
                <div className="h-24 bg-slate-200 animate-pulse rounded-xl" />
                <div className="h-24 bg-slate-200 animate-pulse rounded-xl" />
              </div>
            ) : displayedMeals.length === 0 ? (
              <p className="text-xs text-slate-400 p-8 text-center bg-white rounded-xl border border-dashed border-slate-300">
                Menu schedule for this day has not been populated yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayedMeals.map((meal: any) => (
                  <Card key={meal.id} className="border-t-4 border-t-primary shadow-xs">
                    <CardHeader className="bg-slate-50/60 pb-2">
                      <div className="flex items-center justify-between w-full">
                        <CardTitle className="text-sm font-bold text-primary">
                          {meal.mealType}
                        </CardTitle>
                        <span className="font-mono text-[11px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                          {meal.timings}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-700 font-sans leading-relaxed">
                        {meal.items}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Feedback Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Mess Quality Feedback</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {feedbackSuccess ? (
                  <div className="p-6 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="font-heading font-bold text-sm text-slate-900">
                      Feedback Lodged!
                    </h4>
                    <p className="text-xs text-slate-500">
                      Thank you. Your ratings directly inform weekly mess committee evaluations.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleFeedback} className="space-y-4">
                    <div>
                      <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                        Meal Quality Rating (1 - 5 Stars)
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="p-1 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-mono font-bold text-slate-700 ml-2">
                          {rating} / 5
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                        Feedback Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Wednesday dinner rice quality"
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                        Specific Suggestions
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Provide concrete notes for the kitchen supervisor..."
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={submittingFeedback}
                      className="w-full"
                      rightIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      Submit Evaluation
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
