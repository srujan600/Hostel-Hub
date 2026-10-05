"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { api } from "@/services/api-client";

interface Slide {
  image: string;
  headline: string;
  subtext: string;
  tag: string;
}

const SLIDES: Slide[] = [
  {
    image: "/images/mlrit/mlrit-main-campus.jpg",
    headline: "Collegiate Excellence & Autonomous Legacy",
    subtext:
      "MLR Institute of Technology bridges premier academic innovation with automated residential life, access control, and 24/7 student care.",
    tag: "MLR INSTITUTE OF TECHNOLOGY",
  },
  {
    image: "/images/mlrit/mlrit-hostel-residence.jpg",
    headline: "Comfortable, Secure & Modern Student Hostels",
    subtext:
      "Separate boys and girls residential blocks, high-speed Wi-Fi, hygienic mess dining, and instant out-pass approvals in one unified portal.",
    tag: "STUDENT RESIDENTIAL HOUSING",
  },
  {
    image: "/images/mlrit/mlrit-sports-arena.jpg",
    headline: "World-Class Infrastructure & Sports Arena",
    subtext:
      "26,000 sq.ft indoor stadium, Olympic-grade badminton academy, expansive athletic grounds, and collaborative living spaces.",
    tag: "CAMPUS LIFE & ATHLETICS",
  },
];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Slide state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState<string | null>(null);

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Handle URL errors (e.g. redirected from middleware)
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "session_expired") {
      setErrorMessage("Your session has expired. Please sign in again.");
    } else if (err === "account_suspended") {
      setErrorMessage("Your account has been suspended. Please contact the warden office.");
    }
  }, [searchParams]);

  // Handle submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.post<any>("/api/auth/login", {
        username: username.trim(),
        password,
      });

      if (res.success && res.data) {
        localStorage.setItem("hostelhub_token", res.data.token);
        localStorage.setItem("hostelhub_role", res.data.user.role);
        setSuccessMessage(`Welcome back, ${res.data.user.name}. Redirecting to ${res.data.user.role.toLowerCase()} console...`);
        setTimeout(() => {
          router.push(res.data.redirectUrl);
        }, 600);
      } else {
        setErrorMessage(res.error?.message || "Invalid credentials. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  // Demo user quick-fill
  const fillDemoCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage("");
  };

  // Forgot password submission
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotInput.trim()) return;

    try {
      setForgotLoading(true);
      const res = await api.post<any>("/api/auth/forgot-password", {
        usernameOrEmail: forgotInput.trim(),
      });
      setForgotFeedback(
        res.data?.message || "Instructions dispatched if account exists."
      );
    } catch (err: any) {
      setForgotFeedback(err.message || "An error occurred.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* ================= LEFT HERO SLIDESHOW (STITCH SHOWCASE) ================= */}
      <div className="relative hidden lg:flex lg:w-7/12 min-h-screen bg-slate-950 overflow-hidden select-none">
        {SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105"
            }`}
          >
            {/* Background Image with Deep Gradient Wash */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 transform scale-105"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
            <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />

            {/* Slide Text Content */}
            <div className="absolute bottom-16 left-12 right-12 z-20 text-white">
              <span className="inline-block px-2.5 py-1 mb-3 text-[11px] font-mono tracking-widest uppercase bg-white/20 backdrop-blur-md rounded-md border border-white/30 text-white font-semibold">
                {slide.tag}
              </span>
              <h1 className="font-heading text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight max-w-xl text-white">
                {slide.headline}
              </h1>
              <p className="mt-3 text-slate-200 text-sm xl:text-base font-sans max-w-lg leading-relaxed font-light">
                {slide.subtext}
              </p>
            </div>
          </div>
        ))}

        {/* Slideshow Controls */}
        <div className="absolute bottom-6 left-12 right-12 z-20 flex items-center justify-between">
          {/* Indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % SLIDES.length)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= RIGHT AUTHENTICATION PANEL ================= */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 max-w-xl mx-auto w-full">
        {/* Institutional Branding Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary-container text-white flex items-center justify-center font-heading font-black text-lg shadow-tactile border border-primary">
              HH
            </div>
            <div>
              <span className="font-heading font-extrabold text-xl text-primary tracking-tight block">
                HostelHub
              </span>
              <span className="font-mono text-[11px] text-slate-500 uppercase tracking-wider block">
                North Campus Central Residential Authority
              </span>
            </div>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Sign In to Residence
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-sans mt-1">
            Enter your university credentials. Your dashboard resolves automatically.
          </p>
        </div>

        {/* Demo Role Fast-Selector */}
        <div className="mb-6 p-3 bg-slate-100/80 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-heading font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              Quick Demo Accounts (1-Click Fill)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials("student.alex", "student123")}
              className="px-2 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-left text-xs transition-colors shadow-xs"
            >
              <div className="font-heading font-semibold text-primary text-[11px]">Student</div>
              <div className="font-mono text-[10px] text-slate-400">Alex Rivers</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials("warden.vance", "warden123")}
              className="px-2 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-left text-xs transition-colors shadow-xs"
            >
              <div className="font-heading font-semibold text-emerald-800 text-[11px]">Warden</div>
              <div className="font-mono text-[10px] text-slate-400">Marcus Vance</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials("admin", "admin123")}
              className="px-2 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-left text-xs transition-colors shadow-xs"
            >
              <div className="font-heading font-semibold text-purple-800 text-[11px]">Admin</div>
              <div className="font-mono text-[10px] text-slate-400">Dr. Evelyn Reed</div>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              University Username or Roll ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. student.alex or warden.vance"
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotFeedback(null);
                  setIsForgotModalOpen(true);
                }}
                className="text-xs font-heading text-secondary hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pl-10 pr-11 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            isLoading={loading}
            className="w-full mt-2"
          >
            Authenticate & Proceed
          </Button>
        </form>

        {/* Footer info */}
        <div className="mt-10 pt-6 border-t border-slate-200 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Campus TLS Security Enforced • Biometric Curfew Protocol</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Need housing registration assistance? Contact Estate Office Gate 3.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset University Password"
        description="Enter your registered campus username or email to dispatch reset instructions."
      >
        {forgotFeedback ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">{forgotFeedback}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsForgotModalOpen(false)}
              className="mt-4"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase mb-1">
                Username or Campus Email
              </label>
              <input
                type="text"
                required
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                placeholder="e.g. student.alex or alex.rivers@student.campus.edu"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsForgotModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={forgotLoading}>
                Send Reset Link
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

