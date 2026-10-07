"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCombobox, CatalogItemOption } from "@/components/inventory/ItemCombobox";
import { QuantityStepper } from "@/components/inventory/QuantityStepper";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  UserCheck,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { SessionUser, DispatchedRecord } from "@/lib/types";
import { dispatchToSite } from "@/actions/inventory";
import Link from "next/link";

interface WorkerOption {
  id: string;
  fullName: string;
  role: string;
}

interface DispatchFormClientProps {
  items: CatalogItemOption[];
  workers: WorkerOption[];
  currentUser: SessionUser;
  recentDispatches?: DispatchedRecord[];
}

export function DispatchFormClient({
  items,
  workers,
  currentUser,
  recentDispatches = [],
}: DispatchFormClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<CatalogItemOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [siteOrCustomer, setSiteOrCustomer] = useState("");
  const [workerId, setWorkerId] = useState(
    currentUser.role === "WORKER" ? currentUser.id : workers[0]?.id || ""
  );
  const [docNo, setDocNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const availableOffice = selectedItem ? selectedItem.officeQty : 0;
  const isExceeded = selectedItem ? quantity > availableOffice : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setStatusMessage({ type: "error", text: "Please select an item to dispatch." });
      return;
    }
    if (quantity <= 0) {
      setStatusMessage({ type: "error", text: "Quantity must be greater than 0." });
      return;
    }
    if (!siteOrCustomer.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide a customer name or site location.",
      });
      return;
    }
    if (quantity > availableOffice) {
      setStatusMessage({
        type: "error",
        text: `Cannot dispatch ${quantity} ${selectedItem.unit}. Only ${availableOffice} available in Office stock.`,
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const res = await dispatchToSite({
      itemId: selectedItem.id,
      quantity,
      siteOrCustomer: siteOrCustomer.trim(),
      workerId: workerId || undefined,
      docNo,
      remarks,
    });

    setLoading(false);

    if (res.success) {
      setStatusMessage({
        type: "success",
        text: (res.message || "Material dispatched for site installation successfully!") + " Navigating to dashboard...",
      });
      // Navigate to dashboard as per role access
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to process dispatch.",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Flow Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                Movement 3
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Office ➔ Site
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Site Material Checkout
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Record solar materials taken by installation technicians from the Office staging hub for a specific customer or site project.
        </p>
      </div>

      {/* Status Alert */}
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

      {/* Dispatch Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5"
      >
        {/* Item Combobox */}
        <ItemCombobox
          items={items}
          selectedItemId={selectedItem?.id || ""}
          onSelect={(item) => setSelectedItem(item)}
          locationFocus="OFFICE"
          label="Solar Item to Dispatch"
        />

        {/* Live Office Stock Pill */}
        {selectedItem && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>Available in Office Stock:</span>
            </div>
            <span
              className={`font-bold ${
                availableOffice > 0 ? "text-slate-900" : "text-rose-600"
              }`}
            >
              {formatNumber(availableOffice)} {selectedItem.unit}
            </span>
          </div>
        )}

        {/* Quantity Stepper with Office Stock Limit */}
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          unit={selectedItem?.unit || "NOS"}
          max={selectedItem ? selectedItem.officeQty : null}
          label="Dispatch Quantity"
        />

        {/* Customer / Site Reference */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Site / Customer Reference <span className="text-amber-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={siteOrCustomer}
              onChange={(e) => setSiteOrCustomer(e.target.value)}
              placeholder="e.g. Ramesh Patel - 5kW Kalvibid, Bhavnagar"
              className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Technician / Worker who physically took material */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Assigned Solar Technician
            </label>
            <div className="relative">
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.role.replace("_", " ")})
                  </option>
                ))}
              </select>
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Job Card / DC No */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Job Card / Delivery Slip No.
            </label>
            <input
              type="text"
              value={docNo}
              onChange={(e) => setDocNo(e.target.value)}
              placeholder="e.g. JOB-7840"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Installation / Delivery Notes
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Loaded onto field vehicle for 10:00 AM roof setup"
            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            loading ||
            !selectedItem ||
            quantity <= 0 ||
            isExceeded ||
            availableOffice <= 0 ||
            !siteOrCustomer.trim()
          }
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-base shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
        >
          {loading ? (
            <span>Processing Dispatch...</span>
          ) : (
            <>
              <Truck className="w-5 h-5" />
              <span>Confirm Dispatch to Site</span>
            </>
          )}
        </button>
      </form>

      {/* Recent Dispatched Records Table */}
      {recentDispatches && recentDispatches.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Recent Dispatches to Sites
              </h3>
            </div>
            <Link
              href="/dashboard?tab=dispatch"
              className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1"
            >
              <span>View All Dispatches Table</span>
              <span>➔</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Site / Customer</th>
                  <th className="py-3 px-4">Solar Item</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Doc / Job #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {new Date(d.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {d.siteOrCustomer}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{d.itemName}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({d.category})</span>
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-purple-700 whitespace-nowrap">
                      {d.quantity} {d.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {d.workerName || "Unassigned"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {d.referenceDocNo || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
