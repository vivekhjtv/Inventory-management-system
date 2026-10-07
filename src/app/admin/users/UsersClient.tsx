"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Search,
  Trash2,
  Clock,
  Shield,
  Phone,
  Mail,
} from "lucide-react";
import { Role, UserStatus, ROLE_DETAILS } from "@/lib/types";
import {
  approveUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from "@/actions/users";
import { cn, formatDate } from "@/lib/utils";

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
  transactionCount: number;
}

export function UsersClient({
  initialUsers,
  currentAdminId,
}: {
  initialUsers: UserRow[];
  currentAdminId: string;
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === "PENDING"),
    [users]
  );

  const activeOrSuspendedUsers = useMemo(() => {
    return users
      .filter((u) => u.status !== "PENDING")
      .filter(
        (u) =>
          search === "" ||
          u.fullName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.phoneNumber && u.phoneNumber.includes(search))
      );
  }, [users, search]);

  const handleApprove = async (userId: string, role: Role) => {
    setLoadingId(userId);
    setStatusMessage(null);
    const res = await approveUser(userId, role);
    setLoadingId(null);

    if (res.success) {
      setStatusMessage({ type: "success", text: res.message || "User approved." });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: "ACTIVE", role } : u
        )
      );
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to approve user." });
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setLoadingId(userId);
    setStatusMessage(null);
    const res = await updateUserRole(userId, newRole);
    setLoadingId(null);

    if (res.success) {
      setStatusMessage({ type: "success", text: res.message || "Role updated." });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to change role." });
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: UserStatus) => {
    const nextStatus: UserStatus =
      currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setLoadingId(userId);
    setStatusMessage(null);
    const res = await updateUserStatus(userId, nextStatus);
    setLoadingId(null);

    if (res.success) {
      setStatusMessage({ type: "success", text: res.message || "Status updated." });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
      );
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update status." });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user account?")) return;
    setLoadingId(userId);
    setStatusMessage(null);
    const res = await deleteUser(userId);
    setLoadingId(null);

    if (res.success) {
      setStatusMessage({ type: "success", text: "User account deleted." });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to delete user." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                Admin Exclusive
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              User Approvals & Role-Based Access Control
            </h2>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-semibold">{statusMessage.text}</div>
        </div>
      )}

      {/* PENDING APPROVALS QUEUE */}
      <div className="bg-white rounded-3xl border border-amber-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-amber-500/10 border-b border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-700" />
            <h3 className="font-extrabold text-amber-950 text-base">
              Pending Sign-up Approvals ({pendingUsers.length})
            </h3>
          </div>
          <span className="text-xs font-semibold text-amber-800">
            Action Required
          </span>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No pending user sign-ups at this time. All registrations approved!
          </div>
        ) : (
          <div className="divide-y divide-amber-100 p-2 sm:p-4">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-2xl hover:bg-amber-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">
                      {u.fullName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      PENDING
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {u.email}
                    </span>
                    {u.phoneNumber && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {u.phoneNumber}
                      </span>
                    )}
                    <span>• Registered: {formatDate(u.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-600">
                      Assign Role:
                    </span>
                    <select
                      id={`role-select-${u.id}`}
                      defaultValue="WORKER"
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="WORKER">Technician / Worker</option>
                      <option value="OFFICE_MANAGER">Office Manager</option>
                      <option value="GODOWN_MANAGER">Godown Manager</option>
                      <option value="OPERATIONS_MANAGER">Operations Manager</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={loadingId === u.id}
                    onClick={() => {
                      const select = document.getElementById(
                        `role-select-${u.id}`
                      ) as HTMLSelectElement;
                      handleApprove(u.id, select.value as Role);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 touch-target shadow-xs"
                  >
                    <UserCheck className="w-4 h-4" />
                    Approve & Activate
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(u.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Reject and delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIVE & SUSPENDED USERS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Active & Existing Users ({activeOrSuspendedUsers.length})</span>
          </h3>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user by name or email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role Assignment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeOrSuspendedUsers.map((u) => {
                const isCurrentAdmin = u.id === currentAdminId;
                const roleInfo = ROLE_DETAILS[u.role] || {
                  label: u.role,
                  badgeColor: "bg-slate-100 text-slate-800",
                };

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{u.fullName}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                      {u.phoneNumber && (
                        <div className="text-[11px] text-slate-400">
                          {u.phoneNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isCurrentAdmin ? (
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold border",
                            roleInfo.badgeColor
                          )}
                        >
                          {roleInfo.label} (You)
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as Role)
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                        >
                          <option value="WORKER">Technician / Worker</option>
                          <option value="OFFICE_MANAGER">Office Manager</option>
                          <option value="GODOWN_MANAGER">Godown Manager</option>
                          <option value="OPERATIONS_MANAGER">Operations Manager</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase",
                          u.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        )}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {u.transactionCount} transactions
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!isCurrentAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(u.id, u.status)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                              u.status === "ACTIVE"
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            )}
                          >
                            {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
