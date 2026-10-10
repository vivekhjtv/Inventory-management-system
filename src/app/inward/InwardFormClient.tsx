"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ItemCombobox, CatalogItemOption } from "@/components/inventory/ItemCombobox";
import { QuantityStepper } from "@/components/inventory/QuantityStepper";
import { inwardStock, batchInwardStock } from "@/actions/inventory";
import {
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle,
  Warehouse,
  FileText,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  ExternalLink,
  RotateCcw,
  PackageCheck,
  Check,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { AutocompleteInput } from "@/components/common/AutocompleteInput";

interface InwardFormClientProps {
  items: CatalogItemOption[];
  existingVendors?: string[];
}

interface StagedInwardItem {
  item: CatalogItemOption;
  quantity: number;
}

export function InwardFormClient({
  items: initialItems,
  existingVendors = [],
}: InwardFormClientProps) {
  const router = useRouter();
  const [catalogItems, setCatalogItems] = useState<CatalogItemOption[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"batch" | "single">("batch");
  const [stayOnPage, setStayOnPage] = useState<boolean>(true);

  // Single Item Mode State
  const [selectedItem, setSelectedItem] = useState<CatalogItemOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [vendorName, setVendorName] = useState("");
  const [docNo, setDocNo] = useState("");
  const [remarks, setRemarks] = useState("");

  // Batch Multi-Item Mode State
  const [batchItems, setBatchItems] = useState<StagedInwardItem[]>([]);
  const [pendingItem, setPendingItem] = useState<CatalogItemOption | null>(null);
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [batchVendorName, setBatchVendorName] = useState("");
  const [batchDocNo, setBatchDocNo] = useState("");
  const [batchRemarks, setBatchRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
    processedList?: Array<{ name: string; quantity: number; unit: string; newBalance?: number }>;
  } | null>(null);

  // Helper to update local item stock in memory
  const updateLocalStock = (processed: Array<{ itemId: string; quantity: number }>) => {
    setCatalogItems((prev) =>
      prev.map((item) => {
        const found = processed.find((p) => p.itemId === item.id);
        if (found) {
          return { ...item, godownQty: item.godownQty + found.quantity };
        }
        return item;
      })
    );
  };

  // Add item to batch staged list
  const handleAddPendingToBatch = () => {
    if (!pendingItem) return;
    if (pendingQty <= 0) return;

    setBatchItems((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.item.id === pendingItem.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex].quantity += pendingQty;
        return copy;
      }
      return [...prev, { item: pendingItem, quantity: pendingQty }];
    });

    setPendingItem(null);
    setPendingQty(1);
    setStatusMessage(null);
  };

  const handleRemoveFromBatch = (itemId: string) => {
    setBatchItems((prev) => prev.filter((entry) => entry.item.id !== itemId));
  };

  const handleUpdateBatchItemQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) return;
    setBatchItems((prev) =>
      prev.map((entry) => (entry.item.id === itemId ? { ...entry, quantity: newQty } : entry))
    );
  };

  // Single Item Inward Submission
  const handleSingleSubmit = async (e: React.FormEvent) => {
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
      updateLocalStock([{ itemId: selectedItem.id, quantity }]);
      setStatusMessage({
        type: "success",
        text: res.message || `Successfully inwarded ${quantity} ${selectedItem.unit} of ${selectedItem.name}.`,
        processedList: [
          {
            name: selectedItem.name,
            quantity,
            unit: selectedItem.unit,
            newBalance: res.newBalance,
          },
        ],
      });

      // Reset item inputs while retaining vendor & doc info for fast re-entry
      setSelectedItem(null);
      setQuantity(1);

      if (!stayOnPage) {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 700);
      } else {
        router.refresh();
      }
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to process inward.",
      });
    }
  };

  // Batch Multi-Item Inward Submission
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchItems.length === 0) {
      setStatusMessage({ type: "error", text: "Please add at least one item to the batch inward list." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const payload = {
      items: batchItems.map((b) => ({ itemId: b.item.id, quantity: b.quantity })),
      vendorName: batchVendorName.trim() || undefined,
      docNo: batchDocNo.trim() || undefined,
      remarks: batchRemarks.trim() || undefined,
    };

    const res = await batchInwardStock(payload);
    setLoading(false);

    if (res.success) {
      updateLocalStock(payload.items);
      setStatusMessage({
        type: "success",
        text: res.message || `Successfully inwarded ${batchItems.length} items to Godown.`,
        processedList: batchItems.map((b) => ({
          name: b.item.name,
          quantity: b.quantity,
          unit: b.item.unit,
        })),
      });

      // Clear the batch
      setBatchItems([]);
      setPendingItem(null);
      setPendingQty(1);

      if (!stayOnPage) {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 700);
      } else {
        router.refresh();
      }
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to process batch inward.",
      });
    }
  };

  const totalBatchUnits = batchItems.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title & Movement Flow Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

          {/* Quick link to Dashboard */}
          <Link
            href="/dashboard"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
          >
            <span>View Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Log verified incoming factory shipments and materials from suppliers directly into the main Godown warehouse. Add items individually or in bulk without leaving this page.
        </p>

        {/* Mode Selector Tabs */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-full sm:w-auto grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("batch");
                setStatusMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all min-w-0 text-center ${
                activeTab === "batch"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Batch Entry</span>
              {batchItems.length > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[10px] font-black shrink-0">
                  {batchItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("single");
                setStatusMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all min-w-0 text-center ${
                activeTab === "single"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <span className="truncate">Single Item</span>
            </button>
          </div>

          {/* Stay on page checkbox toggle */}
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stayOnPage}
              onChange={(e) => setStayOnPage(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <span>Stay on page after saving</span>
          </label>
        </div>
      </div>

      {/* Status Message Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-3xl border animate-in fade-in space-y-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-start gap-3">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="text-sm font-bold">{statusMessage.text}</div>

              {statusMessage.processedList && statusMessage.processedList.length > 0 && (
                <div className="mt-2 text-xs space-y-1">
                  <div className="font-semibold text-emerald-800">Processed Items:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {statusMessage.processedList.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white/80 p-2 rounded-xl border border-emerald-200/60 flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800 truncate mr-2">{item.name}</span>
                        <span className="font-black text-emerald-700 shrink-0">
                          +{item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {statusMessage.type === "success" && stayOnPage && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200/50">
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2.5 py-1 rounded-lg hover:bg-emerald-100/60 transition-colors"
              >
                Dismiss
              </button>
              <Link
                href="/dashboard"
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs"
              >
                <span>Go to Dashboard</span>
                <span>➔</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ================= MULTI-ITEM BATCH MODE ================= */}
      {activeTab === "batch" && (
        <form onSubmit={handleBatchSubmit} className="space-y-6">
          {/* Section 1: Shipment / Invoice Details */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Step 1: Shipment / Invoice Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Supplier / Vendor Name
                </label>
                <AutocompleteInput
                  value={batchVendorName}
                  onChange={setBatchVendorName}
                  options={existingVendors}
                  placeholder="e.g. Adani Solar / Waaree / Polycab"
                  dropdownTitle="Saved Suppliers / Vendors"
                  inputClassName="focus:border-emerald-500 focus:ring-emerald-500 py-3"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Invoice / DC / Challan No.
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={batchDocNo}
                    onChange={(e) => setBatchDocNo(e.target.value)}
                    placeholder="e.g. INV-2026-904"
                    className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Shipment Remarks / Notes (Optional)
              </label>
              <input
                type="text"
                value={batchRemarks}
                onChange={(e) => setBatchRemarks(e.target.value)}
                placeholder="e.g. Truck GJ-04-XX-1234, Pallet 3 inspected and verified"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Section 2: Add Line Items to Batch */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>Step 2: Add Materials to Inward</span>
            </h3>

            {/* Item selector & quantity input row */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <ItemCombobox
                items={catalogItems}
                selectedItemId={pendingItem?.id || ""}
                onSelect={(item) => setPendingItem(item)}
                locationFocus="GODOWN"
                label="Select Solar Item to Add"
              />

              {pendingItem && (
                <div className="p-3 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Warehouse className="w-4 h-4 text-amber-500" />
                    <span>Current Godown Balance:</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {formatNumber(pendingItem.godownQty)} {pendingItem.unit}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <QuantityStepper
                    value={pendingQty}
                    onChange={setPendingQty}
                    unit={pendingItem?.unit || "NOS"}
                    label="Quantity Received"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPendingToBatch}
                  disabled={!pendingItem || pendingQty <= 0}
                  className="px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shrink-0 touch-target"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Inward List</span>
                </button>
              </div>
            </div>

            {/* Staged Items List */}
            {batchItems.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Items Staged for Inward ({batchItems.length})</span>
                  <span>Total Units: {formatNumber(totalBatchUnits)}</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                  {batchItems.map((entry, idx) => (
                    <div
                      key={entry.item.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {entry.item.name}
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{entry.item.category}</span>
                            <span>•</span>
                            <span>
                              Current Godown: {formatNumber(entry.item.godownQty)} {entry.item.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls and Remove button */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBatchItemQty(entry.item.id, Math.max(1, entry.quantity - 1))
                              }
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold touch-target flex items-center justify-center"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={entry.quantity}
                              onChange={(e) =>
                                handleUpdateBatchItemQty(entry.item.id, Math.max(1, Number(e.target.value) || 1))
                              }
                              className="w-16 text-center text-xs font-black text-slate-900 py-1 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateBatchItemQty(entry.item.id, entry.quantity + 1)}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold touch-target flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">
                            {entry.item.unit}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromBatch(entry.item.id)}
                          title="Remove item"
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors touch-target flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No items added to the inward batch yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select an item above, enter the received quantity, and click "Add to Inward List".
                </p>
              </div>
            )}
          </div>

          {/* Confirm & Inward Batch Button */}
          <button
            type="submit"
            disabled={loading || batchItems.length === 0}
            className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
          >
            {loading ? (
              <span>Receiving {batchItems.length} Items into Godown...</span>
            ) : batchItems.length === 0 ? (
              <>
                <ArrowDownToLine className="w-5 h-5 shrink-0" />
                <span>Add Items Above to Inward to Godown</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-5 h-5 shrink-0" />
                <span className="text-center">
                  Confirm & Inward {batchItems.length} Item{batchItems.length !== 1 ? "s" : ""} (
                  {formatNumber(totalBatchUnits)} Units) to Godown
                </span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ================= SINGLE ITEM QUICK ENTRY MODE ================= */}
      {activeTab === "single" && (
        <form
          onSubmit={handleSingleSubmit}
          className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5"
        >
          {/* Item Selector Combobox */}
          <ItemCombobox
            items={catalogItems}
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
              <AutocompleteInput
                value={vendorName}
                onChange={setVendorName}
                options={existingVendors}
                placeholder="e.g. Adani Solar / Waaree / Polycab"
                dropdownTitle="Saved Suppliers / Vendors"
                inputClassName="focus:border-amber-500 focus:ring-amber-500 py-3"
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
              Remarks / Notes (Optional)
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
            className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
          >
            {loading ? (
              <span>Processing Inward...</span>
            ) : (
              <>
                <ArrowDownToLine className="w-5 h-5 shrink-0" />
                <span>Confirm Inward to Godown</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
