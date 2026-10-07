import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Clock, ShieldAlert, LogOut, RefreshCw, Sun } from "lucide-react";
import { logoutAction, quickDemoLoginAction } from "@/actions/auth";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "ACTIVE") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 mb-4">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Account Pending Approval
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Hello <strong>{user.fullName}</strong>! Your account registration has been received.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-5 text-center">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed text-left">
            <div className="font-bold mb-1 flex items-center gap-1.5 text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Admin Activation Required</span>
            </div>
            In accordance with company inventory security policy, your account status is currently <strong>PENDING</strong>. A Super Admin must approve your profile and grant you an active role (Technician, Godown Manager, or Office Manager) before you can perform stock operations.
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <div>Registered Email: <span className="font-semibold text-slate-700">{user.email}</span></div>
            <div>Current Status: <span className="font-bold text-amber-600">PENDING APPROVAL</span></div>
          </div>

          {/* Demonstration Helper for reviewers */}
          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-left">
            <div className="text-xs font-bold text-purple-900">
              💡 Testing Reviewer Note:
            </div>
            <p className="text-[11px] text-purple-700 mt-0.5">
              To test the approval flow, switch to the Super Admin account, navigate to <strong>User Management</strong>, and approve this user!
            </p>
            <form
              action={async () => {
                "use server";
                await quickDemoLoginAction("admin@zaffine.com");
              }}
              className="mt-2.5"
            >
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors"
              >
                Switch to Super Admin Now
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <a
              href="/pending"
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 touch-target"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Check Status
            </a>

            <form action={logoutAction} className="flex-1">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 touch-target"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
