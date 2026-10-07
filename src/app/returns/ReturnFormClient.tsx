"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCombobox, CatalogItemOption } from "@/components/inventory/ItemCombobox";
import { QuantityStepper } from "@/components/inventory/QuantityStepper";
import { returnFromSite } from "@/actions/inventory";
import { RotateCcw, CheckCircle2, AlertCircle, Building2, MapPin, UserCheck } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { SessionUser } from "@/lib/types";

interface WorkerOption {
  id: string;
  fullName: string;
  role: string;
}

interface ReturnFormClientProps {
  items: CatalogItemOption[];
  workers: WorkerOption[];
  currentUser: SessionUser;
  initialItemId?: string;
  initialSite?: string;
}

export function ReturnFormClient({
  items,
  workers,
  currentUser,
  initialItemId,
  initialSite,
}: ReturnFormClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<CatalogItemOption | null>(() => {
    if (initialItemId) {
      return items.find((i) => i.id === initialItemId) || null;
    }
    return null;
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [siteOrCustomer, setSiteOrCustomer] = useState(initialSite || "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setStatusMessage({ type: "error", text: "Please select an item to return." });
      return;
    }
    if (quantity <= 0) {
      setStatusMessage({ type: "error", text: "Quantity must be greater than 0." });
      return;
    }
    if (!siteOrCustomer.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide the originating site or customer reference.",
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const res = await returnFromSite({
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
        text: (res.message || "Material returned to Office hub successfully!") + " Navigating to dashboard...",
      });
      // Navigate to dashboard as per role access
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to process return.",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Flow Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Movement 4
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Site ➔ Office
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Return Leftover Site Stock
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Log unused panels, cable rolls, and BOS items returned by technicians back into the Office inventory balance.
        </p>
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

      {/* Return Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5"
      >
        <ItemCombobox
          items={items}
          selectedItemId={selectedItem?.id || ""}
          onSelect={(item) => setSelectedItem(item)}
          locationFocus="OFFICE"
          label="Returned Material"
        />

        {selectedItem && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>Current Office Stock:</span>
            </div>
            <span className="font-bold text-slate-900">
              {formatNumber(selectedItem.officeQty)} {selectedItem.unit}
            </span>
          </div>
        )}

        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          unit={selectedItem?.unit || "NOS"}
          label="Returned Quantity"
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Original Site / Customer Reference <span className="text-amber-500">*</span>
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Returning Technician
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Return Slip / DC Reference
            </label>
            <input
              type="text"
              value={docNo}
              onChange={(e) => setDocNo(e.target.value)}
              placeholder="e.g. RET-009"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Condition / Return Remarks
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Unopened box, verified in working order"
            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedItem || quantity <= 0 || !siteOrCustomer.trim()}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-base shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
        >
          {loading ? (
            <span>Processing Return...</span>
          ) : (
            <>
              <RotateCcw className="w-5 h-5" />
              <span>Confirm Return to Office Stock</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
