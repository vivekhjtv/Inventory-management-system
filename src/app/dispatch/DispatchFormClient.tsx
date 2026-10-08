"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ItemCombobox, CatalogItemOption } from "@/components/inventory/ItemCombobox";
import { QuantityStepper } from "@/components/inventory/QuantityStepper";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  UserCheck,
  FileText,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  ExternalLink,
  PackageCheck,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { SessionUser, DispatchedRecord } from "@/lib/types";
import { dispatchToSite, batchDispatchToSite } from "@/actions/inventory";

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

interface StagedDispatchItem {
  item: CatalogItemOption;
  quantity: number;
}

export function DispatchFormClient({
  items: initialItems,
  workers,
  currentUser,
  recentDispatches = [],
}: DispatchFormClientProps) {
  const router = useRouter();
  const [catalogItems, setCatalogItems] = useState<CatalogItemOption[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"batch" | "single">("batch");
  const [stayOnPage, setStayOnPage] = useState<boolean>(true);

  // Single Item Mode State
  const [selectedItem, setSelectedItem] = useState<CatalogItemOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [siteOrCustomer, setSiteOrCustomer] = useState("");
  const [workerId, setWorkerId] = useState(
    currentUser.role === "WORKER" ? currentUser.id : workers[0]?.id || ""
  );
  const [docNo, setDocNo] = useState("");
  const [remarks, setRemarks] = useState("");

  // Batch Multi-Item Mode State
  const [batchItems, setBatchItems] = useState<StagedDispatchItem[]>([]);
  const [pendingItem, setPendingItem] = useState<CatalogItemOption | null>(null);
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [batchSiteOrCustomer, setBatchSiteOrCustomer] = useState("");
  const [batchWorkerId, setBatchWorkerId] = useState(
    currentUser.role === "WORKER" ? currentUser.id : workers[0]?.id || ""
  );
  const [batchDocNo, setBatchDocNo] = useState("");
  const [batchRemarks, setBatchRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
    processedList?: Array<{ name: string; quantity: number; unit: string; newOffice?: number }>;
  } | null>(null);

  // Helper to update local item stocks in memory
  const updateLocalStock = (processed: Array<{ itemId: string; quantity: number }>) => {
    setCatalogItems((prev) =>
      prev.map((item) => {
        const found = processed.find((p) => p.itemId === item.id);
        if (found) {
          return {
            ...item,
            officeQty: Math.max(0, item.officeQty - found.quantity),
          };
        }
        return item;
      })
    );
  };

  // Add item to batch dispatch list
  const handleAddPendingToBatch = () => {
    if (!pendingItem) return;
    if (pendingQty <= 0) return;

    if (pendingQty > pendingItem.officeQty) {
      setStatusMessage({
        type: "error",
        text: `Cannot dispatch ${pendingQty} ${pendingItem.unit}. Only ${pendingItem.officeQty} available in Office stock.`,
      });
      return;
    }

    setBatchItems((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.item.id === pendingItem.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        const newTotal = copy[existingIndex].quantity + pendingQty;
        if (newTotal > pendingItem.officeQty) {
          setStatusMessage({
            type: "error",
            text: `Total requested (${newTotal} ${pendingItem.unit}) exceeds Office stock (${pendingItem.officeQty}).`,
          });
          return prev;
        }
        copy[existingIndex].quantity = newTotal;
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
      prev.map((entry) => {
        if (entry.item.id === itemId) {
          if (newQty > entry.item.officeQty) {
            return entry;
          }
          return { ...entry, quantity: newQty };
        }
        return entry;
      })
    );
  };

  // Single Item Dispatch
  const handleSingleSubmit = async (e: React.FormEvent) => {
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
    if (quantity > selectedItem.officeQty) {
      setStatusMessage({
        type: "error",
        text: `Cannot dispatch ${quantity} ${selectedItem.unit}. Only ${selectedItem.officeQty} available in Office stock.`,
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
      updateLocalStock([{ itemId: selectedItem.id, quantity }]);
      setStatusMessage({
        type: "success",
        text: res.message || `Dispatched ${quantity} ${selectedItem.unit} of ${selectedItem.name} for "${siteOrCustomer}".`,
        processedList: [
          {
            name: selectedItem.name,
            quantity,
            unit: selectedItem.unit,
            newOffice: res.newOfficeBalance,
          },
        ],
      });

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
        text: res.error || "Failed to process dispatch.",
      });
    }
  };

  // Batch Multi-Item Dispatch
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchSiteOrCustomer.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide a customer name or installation site reference.",
      });
      return;
    }
    if (batchItems.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Please add at least one material to the site dispatch kit.",
      });
      return;
    }

    for (const b of batchItems) {
      if (b.quantity > b.item.officeQty) {
        setStatusMessage({
          type: "error",
          text: `Cannot dispatch ${b.quantity} of ${b.item.name}. Office balance is only ${b.item.officeQty}.`,
        });
        return;
      }
    }

    setLoading(true);
    setStatusMessage(null);

    const payload = {
      items: batchItems.map((b) => ({ itemId: b.item.id, quantity: b.quantity })),
      siteOrCustomer: batchSiteOrCustomer.trim(),
      workerId: batchWorkerId || undefined,
      docNo: batchDocNo.trim() || undefined,
      remarks: batchRemarks.trim() || undefined,
    };

    const res = await batchDispatchToSite(payload);
    setLoading(false);

    if (res.success) {
      updateLocalStock(payload.items);
      setStatusMessage({
        type: "success",
        text: res.message || `Successfully dispatched ${batchItems.length} items for "${batchSiteOrCustomer}".`,
        processedList: batchItems.map((b) => ({
          name: b.item.name,
          quantity: b.quantity,
          unit: b.item.unit,
        })),
      });

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
        text: res.error || "Failed to process batch dispatch.",
      });
    }
  };

  const totalBatchUnits = batchItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const singleAvailableOffice = selectedItem ? selectedItem.officeQty : 0;
  const singleIsExceeded = selectedItem ? quantity > singleAvailableOffice : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Flow Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  Office Hub ➔ Installation Site
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                Site Material Checkout
              </h2>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
          >
            <span>View Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Record solar materials taken by installation technicians from the Office staging hub for a specific customer or site project. Add complete multi-item kits in one checkout.
        </p>

        {/* Mode Selector Tabs */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab("batch");
                setStatusMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "batch"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Multi-Item Site Kit Checkout</span>
              {batchItems.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-black">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "single"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Single Item Quick Checkout</span>
            </button>
          </div>

          {/* Stay on page checkbox toggle */}
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stayOnPage}
              onChange={(e) => setStayOnPage(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
            />
            <span>Stay on page after saving</span>
          </label>
        </div>
      </div>

      {/* Status Banner */}
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
                  <div className="font-semibold text-emerald-800">Dispatched Materials:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {statusMessage.processedList.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white/80 p-2 rounded-xl border border-emerald-200/60 flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800 truncate mr-2">{item.name}</span>
                        <span className="font-black text-amber-700 shrink-0">
                          {item.quantity} {item.unit}
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
          {/* Section 1: Site & Technician Information */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Step 1: Installation Site & Technician Reference</span>
            </h3>

            {/* Site / Customer Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Site / Customer Reference <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={batchSiteOrCustomer}
                  onChange={(e) => setBatchSiteOrCustomer(e.target.value)}
                  placeholder="e.g. Ramesh Patel - 5kW Rooftop Kalvibid, Bhavnagar"
                  className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assigned Technician */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Assigned Solar Technician
                </label>
                <div className="relative">
                  <select
                    value={batchWorkerId}
                    onChange={(e) => setBatchWorkerId(e.target.value)}
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

              {/* Job Card / Delivery Slip No */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Job Card / Delivery Slip No.
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={batchDocNo}
                    onChange={(e) => setBatchDocNo(e.target.value)}
                    placeholder="e.g. JOB-7840"
                    className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Delivery Notes / Site Remarks (Optional)
              </label>
              <input
                type="text"
                value={batchRemarks}
                onChange={(e) => setBatchRemarks(e.target.value)}
                placeholder="e.g. Loaded onto vehicle for morning rooftop setup"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section 2: Add Line Items to Site Kit */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-amber-600" />
              <span>Step 2: Add Components to Installation Kit</span>
            </h3>

            {/* Item selector & quantity input */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <ItemCombobox
                items={catalogItems}
                selectedItemId={pendingItem?.id || ""}
                onSelect={(item) => setPendingItem(item)}
                locationFocus="OFFICE"
                label="Select Solar Item for Site"
              />

              {pendingItem && (
                <div className="p-3 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>Available in Office Stock:</span>
                  </div>
                  <span
                    className={`font-bold ${
                      pendingItem.officeQty > 0 ? "text-slate-900" : "text-rose-600"
                    }`}
                  >
                    {formatNumber(pendingItem.officeQty)} {pendingItem.unit}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <QuantityStepper
                    value={pendingQty}
                    onChange={setPendingQty}
                    unit={pendingItem?.unit || "NOS"}
                    max={pendingItem ? pendingItem.officeQty : null}
                    label="Checkout Quantity"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPendingToBatch}
                  disabled={!pendingItem || pendingQty <= 0 || (pendingItem && pendingQty > pendingItem.officeQty)}
                  className="px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shrink-0 touch-target"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Material to Kit</span>
                </button>
              </div>
            </div>

            {/* Staged Items List */}
            {batchItems.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Installation Kit Items ({batchItems.length})</span>
                  <span>Total Units: {formatNumber(totalBatchUnits)}</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                  {batchItems.map((entry, idx) => (
                    <div
                      key={entry.item.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {entry.item.name}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{entry.item.category}</span>
                            <span>•</span>
                            <span>
                              Office Stock: {formatNumber(entry.item.officeQty)} {entry.item.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls and Remove button */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBatchItemQty(entry.item.id, Math.max(1, entry.quantity - 1))
                            }
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={entry.item.officeQty}
                            value={entry.quantity}
                            onChange={(e) =>
                              handleUpdateBatchItemQty(
                                entry.item.id,
                                Math.min(entry.item.officeQty, Math.max(1, Number(e.target.value) || 1))
                              )
                            }
                            className="w-16 text-center text-xs font-black text-slate-900 py-1 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBatchItemQty(
                                entry.item.id,
                                Math.min(entry.item.officeQty, entry.quantity + 1)
                              )
                            }
                            disabled={entry.quantity >= entry.item.officeQty}
                            className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 w-10">
                          {entry.item.unit}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromBatch(entry.item.id)}
                          title="Remove item"
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
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
                <p className="text-xs font-bold text-slate-600">No components added to this kit yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select items like Panels, Inverters, Rails above, specify quantities, and add to kit.
                </p>
              </div>
            )}
          </div>

          {/* Confirm & Dispatch Batch Button */}
          <button
            type="submit"
            disabled={loading || batchItems.length === 0 || !batchSiteOrCustomer.trim()}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-base shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
          >
            {loading ? (
              <span>Dispatching {batchItems.length} Materials to Site...</span>
            ) : (
              <>
                <Truck className="w-5 h-5" />
                <span>
                  Confirm & Dispatch {batchItems.length} Material{batchItems.length !== 1 ? "s" : ""} (
                  {formatNumber(totalBatchUnits)} Units) for Site
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
          {/* Item Combobox */}
          <ItemCombobox
            items={catalogItems}
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
                  singleAvailableOffice > 0 ? "text-slate-900" : "text-rose-600"
                }`}
              >
                {formatNumber(singleAvailableOffice)} {selectedItem.unit}
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
            {/* Technician */}
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
              singleIsExceeded ||
              singleAvailableOffice <= 0 ||
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
      )}

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
