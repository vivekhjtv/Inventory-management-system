"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowRightLeft,
  Truck,
  RotateCcw,
  PackagePlus,
  Users,
  History,
  Menu,
  X,
  LogOut,
  KeyRound,
} from "lucide-react";
import { SessionUser } from "@/lib/types";
import { getRolePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import { ChangePasswordModal } from "./ChangePasswordModal";

interface BottomNavProps {
  user: SessionUser;
  onOpenChangePassword?: () => void;
}

export function BottomNav({ user, onOpenChangePassword }: BottomNavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const perms = getRolePermissions(user.role, user.status);

  const mainNavItems = [
    {
      label: "Stock",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: perms.canViewDashboard,
    },
    {
      label: "Inward",
      href: "/inward",
      icon: ArrowDownToLine,
      show: perms.canInwardToGodown,
    },
    {
      label: "Transfer",
      href: "/transfer",
      icon: ArrowRightLeft,
      show: perms.canTransferToOffice,
    },
    {
      label: "Dispatch",
      href: "/dispatch",
      icon: Truck,
      show: perms.canDispatchToSite,
    },
  ].filter((item) => item.show);

  return (
    <>
      {/* Mobile Drawer for More Links */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  ⚡
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Additional Modules
                  </h3>
                  <p className="text-xs text-slate-500">{user.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-4">
              {perms.canReturnFromSite && (
                <Link
                  href="/returns"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-100 transition-colors"
                >
                  <RotateCcw className="w-5 h-5 text-indigo-600 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-800">
                    Site Return
                  </span>
                </Link>
              )}

              <Link
                href="/transactions"
                onClick={() => setIsMoreOpen(false)}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-100 transition-colors"
              >
                <History className="w-5 h-5 text-emerald-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">
                  Transactions
                </span>
              </Link>

              {perms.canManageCatalog && (
                <Link
                  href="/catalog"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-100 transition-colors"
                >
                  <PackagePlus className="w-5 h-5 text-blue-600 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-800">
                    Add Catalog Item
                  </span>
                </Link>
              )}

              {perms.canManageUsers && (
                <Link
                  href="/admin/users"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-100 transition-colors"
                >
                  <Users className="w-5 h-5 text-purple-600 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-800">
                    User Management
                  </span>
                </Link>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  onOpenChangePassword?.();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors touch-target"
              >
                <KeyRound className="w-4 h-4 text-slate-500" />
                Change Password
              </button>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-600 font-semibold text-sm hover:bg-rose-100 transition-colors touch-target"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar for Mobile Viewports */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 shadow-lg pb-[env(safe-area-inset-bottom,0.5rem)]">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all touch-target select-none",
                  isActive
                    ? "text-amber-600 font-bold scale-105"
                    : "text-slate-500 hover:text-slate-900 active:scale-95"
                )}
              >
                <div
                  className={cn(
                    "p-1 rounded-xl transition-colors",
                    isActive ? "bg-amber-50 text-amber-600" : "text-slate-500"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* More Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all touch-target select-none text-slate-500 hover:text-slate-900 active:scale-95",
              ["/transactions", "/catalog", "/admin/users", "/returns"].includes(
                pathname
              ) && "text-amber-600 font-bold"
            )}
          >
            <div className="p-1 rounded-xl text-slate-500">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
