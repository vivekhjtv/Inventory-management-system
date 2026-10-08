"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Dashboard Loading Issue
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            The server encountered an error while fetching inventory data. This usually occurs if database tables have not been created yet or connection parameters require verification.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 font-mono break-all max-h-36 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-left text-xs text-amber-900 space-y-1">
          <p className="font-bold">Suggested resolution:</p>
          <p className="text-[11px] text-amber-800">
            1. Ensure <code className="bg-amber-100 px-1 py-0.5 rounded">npx prisma db push</code> has been executed against your production database.
          </p>
          <p className="text-[11px] text-amber-800">
            2. If using Supabase Connection Pooler, make sure <code className="bg-amber-100 px-1 py-0.5 rounded">?pgbouncer=true&sslmode=require</code> is present in DATABASE_URL.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Page</span>
          </button>
          <Link
            href="/login"
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
