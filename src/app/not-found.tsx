import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="max-w-md w-full text-center bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#00236F]/10 flex items-center justify-center text-[#00236F]">
          <Compass className="w-8 h-8 stroke-[1.75]" />
        </div>
        <span className="text-xs font-semibold tracking-wider uppercase text-[#00236F] bg-[#00236F]/5 px-3 py-1 rounded-full">
          Error 404
        </span>
        <h1 className="mt-4 text-2xl font-bold text-[#131B2E]">Page Not Found</h1>
        <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
          The requested page or hostel portal route could not be found or may have been relocated.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#00236F] hover:bg-[#001B54] transition-all shadow-sm active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
