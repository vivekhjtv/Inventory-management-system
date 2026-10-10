"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { SessionUser, ROLE_DETAILS } from "@/lib/types";
import { Sun, LogOut, ArrowRightLeft, ArrowDownToLine, Truck, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import { getRolePermissions } from "@/lib/permissions";
import { ChangePasswordModal } from "./ChangePasswordModal";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

const SHORT_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Admin",
  OPERATIONS_MANAGER: "Ops",
  GODOWN_MANAGER: "Godown",
  OFFICE_MANAGER: "Office",
  WORKER: "Tech",
};

export function AppShell({ user, children }: AppShellProps) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Invalidate bfcache on back navigation if user signed out
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);
  const roleInfo = ROLE_DETAILS[user.role] || {
    label: user.role,
    badgeColor: "bg-slate-100 text-slate-800",
  };
  const roleShort = SHORT_ROLE_LABELS[user.role] || roleInfo.label.split(" ")[0];
  const perms = getRolePermissions(user.role, user.status);

  return (
    <div className="flex h-screen h-dvh w-full overflow-hidden bg-slate-50/60 font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <AppSidebar
        user={user}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Main Content Area - Scrollable with its own viewport-anchored scrollbar */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto overflow-x-hidden">
        {/* Mobile Top App Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shadow-2xs">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-slate-900 tracking-tight text-xs sm:text-sm truncate">
                JAFFINE ENTERPRISE
              </div>
              <div className="text-[10px] text-slate-400 -mt-0.5 font-medium truncate">
                Stock Manager
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                roleInfo.badgeColor
              )}
            >
              {roleShort}
            </span>
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              title="Change Password"
              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 shrink-0 touch-target flex items-center justify-center"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <form action={logoutAction} className="shrink-0 flex items-center">
              <button
                type="submit"
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 shrink-0 touch-target flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Desktop Top Header Bar - Exact h-[72px] to match sidebar header */}
        <header className="hidden md:flex h-[72px] items-center justify-between px-8 bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-20 shrink-0">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
              Solar Inventory Hub
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Godown Warehouse & Office Staging Center
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Action Badges */}
            {perms.canInwardToGodown && (
              <Link
                href="/inward"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                + Inward
              </Link>
            )}
            {perms.canTransferToOffice && (
              <Link
                href="/transfer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer
              </Link>
            )}
            {perms.canDispatchToSite && (
              <Link
                href="/dispatch"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition-colors"
              >
                <Truck className="w-3.5 h-3.5" />
                Dispatch
              </Link>
            )}

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-lg border",
                  roleInfo.badgeColor
                )}
              >
                {roleInfo.label}
              </span>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                title="Change your password"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Password</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content with safe padding for mobile bottom nav */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 pb-28 md:pb-10 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Sticky Bottom Navigation for Mobile Devices */}
      <BottomNav
        user={user}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userEmail={user.email}
      />
    </div>
  );
}
