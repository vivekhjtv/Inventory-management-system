"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCombobox, CatalogItemOption } from "@/components/inventory/ItemCombobox";
import { QuantityStepper } from "@/components/inventory/QuantityStepper";
import { transferStock } from "@/actions/inventory";
import { ArrowRightLeft, CheckCircle2, AlertCircle, Warehouse, Building2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface TransferFormClientProps {
  items: CatalogItemOption[];
}

export function TransferFormClient({ items }: TransferFormClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<CatalogItemOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [docNo, setDocNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const availableGodown = selectedItem ? selectedItem.godownQty : 0;
  const isExceeded = selectedItem ? quantity > availableGodown : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setStatusMessage({ type: "error", text: "Please select an item to transfer." });
      return;
    }
    if (quantity <= 0) {
      setStatusMessage({ type: "error", text: "Quantity must be greater than 0." });
      return;
    }
    if (quantity > availableGodown) {
      setStatusMessage({
        type: "error",
        text: `Cannot transfer ${quantity} ${selectedItem.unit}. Only ${availableGodown} available in Godown.`,
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const res = await transferStock({
      itemId: selectedItem.id,
      quantity,
      docNo,
      remarks,
    });

    setLoading(false);

    if (res.success) {
      setStatusMessage({
        type: "success",
        text: (res.message || "Stock transferred to office hub successfully!") + " Navigating to dashboard...",
      });
      // Navigate to dashboard as per role access
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to process transfer.",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Movement 2
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Godown ➔ Office
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Internal Warehouse Transfer
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Move stock atomically from the primary Godown warehouse to the Office hub for staging daily solar installation jobs.
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

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5"
      >
        {/* Combobox */}
        <ItemCombobox
          items={items}
          selectedItemId={selectedItem?.id || ""}
          onSelect={(item) => setSelectedItem(item)}
          locationFocus="GODOWN"
          label="Select Item to Transfer"
        />

        {/* Live Side-by-side Balances Visualizer */}
        {selectedItem && (
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <Warehouse className="w-3.5 h-3.5" />
                <span>Godown (Source)</span>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatNumber(selectedItem.godownQty)} {selectedItem.unit}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                <Building2 className="w-3.5 h-3.5" />
                <span>Office (Destination)</span>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatNumber(selectedItem.officeQty)} {selectedItem.unit}
              </div>
            </div>
          </div>
        )}

        {/* Quantity Stepper with Godown Stock Max Guard */}
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          unit={selectedItem?.unit || "NOS"}
          max={selectedItem ? selectedItem.godownQty : null}
          label="Transfer Quantity"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Transfer DC / Slip No */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Transfer Challan / Slip No.
            </label>
            <input
              type="text"
              value={docNo}
              onChange={(e) => setDocNo(e.target.value)}
              placeholder="e.g. TRF-2026-088"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Internal Transfer Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Weekly staging for installation team"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedItem || quantity <= 0 || isExceeded || availableGodown <= 0}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-base shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
        >
          {loading ? (
            <span>Processing Transfer...</span>
          ) : (
            <>
              <ArrowRightLeft className="w-5 h-5" />
              <span>Confirm Transfer to Office</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
