"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCombobox, CatalogItemOption } from "@/components/inventory/ItemCombobox";
import { QuantityStepper } from "@/components/inventory/QuantityStepper";
import { inwardStock } from "@/actions/inventory";
import { ArrowDownToLine, CheckCircle2, AlertCircle, Warehouse, FileText } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface InwardFormClientProps {
  items: CatalogItemOption[];
}

export function InwardFormClient({ items }: InwardFormClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<CatalogItemOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [vendorName, setVendorName] = useState("");
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
      setStatusMessage({ type: "error", text: "Please select an item to inward." });
      return;
    }
    if (quantity <= 0) {
      setStatusMessage({ type: "error", text: "Please enter a valid quantity greater than 0." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const res = await inwardStock({
      itemId: selectedItem.id,
      quantity,
      vendorName,
      docNo,
      remarks,
    });

    setLoading(false);

    if (res.success) {
      setStatusMessage({
        type: "success",
        text: (res.message || "Stock inwarded successfully!") + " Navigating to dashboard...",
      });
      // Navigate to dashboard as per role access
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to process inward.",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title & Movement Flow Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Movement 1
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Vendor ➔ Godown
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Receive Vendor Goods
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Log verified incoming factory shipments and materials from suppliers directly into the main Godown warehouse balance.
        </p>
      </div>

      {/* Status Banner */}
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

      {/* Main Inward Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5"
      >
        {/* Item Selector Combobox */}
        <ItemCombobox
          items={items}
          selectedItemId={selectedItem?.id || ""}
          onSelect={(item) => setSelectedItem(item)}
          locationFocus="GODOWN"
          label="Solar Item / Component"
        />

        {/* Live Godown Balance Card */}
        {selectedItem && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Warehouse className="w-4 h-4 text-amber-500" />
              <span>Current Godown Balance:</span>
            </div>
            <span className="font-bold text-slate-900">
              {formatNumber(selectedItem.godownQty)} {selectedItem.unit}
            </span>
          </div>
        )}

        {/* Quantity Stepper */}
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          unit={selectedItem?.unit || "NOS"}
          label="Received Quantity"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Vendor Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Supplier / Vendor Name
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Adani Solar / Waaree / Polycab"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Invoice / Challan / DC No. */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Invoice / DC / Challan No.
            </label>
            <div className="relative">
              <input
                type="text"
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                placeholder="e.g. INV-2026-904"
                className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Remarks / Batch Notes (Optional)
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="e.g. Vehicle GJ-04-XX-1234, Pallet 3 inspected and verified."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedItem || quantity <= 0}
          className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-base shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
        >
          {loading ? (
            <span>Processing Inward...</span>
          ) : (
            <>
              <ArrowDownToLine className="w-5 h-5" />
              <span>Confirm Inward to Godown</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
