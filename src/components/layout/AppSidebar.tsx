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
  Sun,
  LogOut,
  ChevronRight,
  KeyRound,
} from "lucide-react";
import { SessionUser, ROLE_DETAILS } from "@/lib/types";
import { getRolePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import { ChangePasswordModal } from "./ChangePasswordModal";

interface AppSidebarProps {
  user: SessionUser;
}

interface SidebarNavItem {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  iconColor?: string;
  badge?: string;
}

interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const perms = getRolePermissions(user.role, user.status);
  const roleInfo = ROLE_DETAILS[user.role] || {
    label: user.role,
    badgeColor: "bg-slate-100 text-slate-800",
  };

  const navGroups: SidebarNavGroup[] = [
    {
      title: "OVERVIEW",
      items: [
        {
          title: "Live Stock Overview",
          subtitle: "Godown & office balances",
          href: "/dashboard",
          icon: LayoutDashboard,
          show: perms.canViewDashboard,
        },
        {
          title: "Movement History",
          subtitle: "Complete transaction audit",
          href: "/transactions",
          icon: History,
          show: perms.canViewAllTransactions || user.role === "WORKER",
        },
      ],
    },
    {
      title: "STOCK MOVEMENTS",
      items: [
        {
          title: "Vendor Inward",
          subtitle: "Vendor ➔ Godown warehouse",
          href: "/inward",
          icon: ArrowDownToLine,
          show: perms.canInwardToGodown,
          iconColor: "text-emerald-500",
        },
        {
          title: "Warehouse Transfer",
          subtitle: "Godown ➔ Office staging",
          href: "/transfer",
          icon: ArrowRightLeft,
          show: perms.canTransferToOffice,
          iconColor: "text-blue-500",
        },
        {
          title: "Site Dispatch",
          subtitle: "Office ➔ Installation site",
          href: "/dispatch",
          icon: Truck,
          show: perms.canDispatchToSite,
          iconColor: "text-amber-500",
        },
        {
          title: "Site Return",
          subtitle: "Site ➔ Office leftovers",
          href: "/returns",
          icon: RotateCcw,
          show: perms.canReturnFromSite,
          iconColor: "text-indigo-500",
        },
      ],
    },
    {
      title: "ADMINISTRATION",
      items: [
        {
          title: "Item Catalog",
          subtitle: "76+ solar components",
          href: "/catalog",
          icon: PackagePlus,
          show: perms.canManageCatalog,
          iconColor: "text-purple-500",
        },
        {
          title: "User Management",
          subtitle: "Sign-up approvals & roles",
          href: "/admin/users",
          icon: Users,
          show: perms.canManageUsers,
          badge: "Admin",
          iconColor: "text-rose-500",
        },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-80 bg-white border-r border-slate-200/90 h-screen sticky top-0 shrink-0 select-none shadow-xs">
      {/* Brand Header - Exact h-[72px] matching top navbar */}
      <div className="h-[72px] px-6 border-b border-slate-200/90 bg-white flex items-center">
        <Link href="/dashboard" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform shrink-0">
            <Sun className="w-6 h-6 animate-[spin_16s_linear_infinite]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 tracking-tight text-lg">
                ZAFFINE
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700">
                SOLAR
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-tight">
              Stock & Inventory Hub
            </p>
          </div>
        </Link>
      </div>

      {/* Nav Groups with Spacious, Unwarped Typography */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((i) => i.show);
          if (!visibleItems.length) return null;

          return (
            <div key={group.title} className="space-y-1.5">
              <div className="px-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400/90 mb-2.5">
                {group.title}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all",
                        isActive
                          ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                          : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-white group-hover:shadow-2xs"
                          )}
                        >
                          <Icon className={cn("w-4 h-4", !isActive && item.iconColor)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "text-sm font-bold leading-snug whitespace-nowrap overflow-hidden text-ellipsis",
                              isActive ? "text-white" : "text-slate-900"
                            )}
                          >
                            {item.title}
                          </div>
                          <div
                            className={cn(
                              "text-[11px] leading-tight font-medium whitespace-nowrap overflow-hidden text-ellipsis mt-0.5",
                              isActive ? "text-amber-100" : "text-slate-400"
                            )}
                          >
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      {item.badge && !isActive && (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 shrink-0">
                          {item.badge}
                        </span>
                      )}

                      <ChevronRight
                        className={cn(
                          "w-4 h-4 ml-1 shrink-0 transition-transform",
                          isActive
                            ? "text-white/80 translate-x-0.5"
                            : "text-slate-300 opacity-0 group-hover:opacity-100"
                        )}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Profile Card at Bottom */}
      <div className="p-4 border-t border-slate-100/90 bg-slate-50/70">
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-slate-900 truncate">
              {user.fullName}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-tight",
                  roleInfo.badgeColor
                )}
              >
                {roleInfo.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              title="Change Password"
              className="p-2 text-slate-400 hover:text-amber-600 rounded-xl hover:bg-amber-50 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userEmail={user.email}
      />
    </aside>
  );
}
