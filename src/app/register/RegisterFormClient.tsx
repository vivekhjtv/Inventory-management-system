"use client";

import React, { useState } from "react";
import Link from "next/link";
import { registerAction } from "@/actions/auth";
import { Sun, UserPlus, AlertCircle, ShieldAlert } from "lucide-react";

export function RegisterFormClient() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("phoneNumber", phoneNumber);
    formData.append("password", password);

    const res = await registerAction(formData);
    if (res && !res.success) {
      setError(res.error || "Registration failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sun className="w-8 h-8 animate-[spin_12s_linear_infinite]" />
          </div>
        </div>
        <h2 className="mt-3 text-center text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Create Account
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 font-medium">
          Register for Zaffine Solar Inventory Access
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80 space-y-5">
          {/* RBAC Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Pending Approval Policy:</span>
              <p className="mt-0.5 text-amber-800">
                Newly registered accounts start in <strong>PENDING</strong> status. A Super Admin must review, activate, and assign your role before you can access inventory movement modules.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Full Name <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Patel"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address <span className="text-amber-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@zaffine.com"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Mobile / Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Password <span className="text-amber-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 touch-target disabled:opacity-50"
            >
              {loading ? (
                <span>Registering Account...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Submit Registration</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-amber-600 hover:text-amber-700 underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
