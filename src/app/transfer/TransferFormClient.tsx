"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ItemCombobox, CatalogItemOption } from "@/components/inventory/ItemCombobox";
import { QuantityStepper } from "@/components/inventory/QuantityStepper";
import {
  transferStock,
  batchTransferStock,
  dispatchToSite,
  batchDispatchToSite,
} from "@/actions/inventory";
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Warehouse,
  Building2,
  FileText,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  ExternalLink,
  PackageCheck,
  Truck,
  MapPin,
  User,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { SessionUser } from "@/lib/types";

interface WorkerOption {
  id: string;
  fullName: string;
  role: string;
}

interface TransferFormClientProps {
  items: CatalogItemOption[];
  workers?: WorkerOption[];
  currentUser?: SessionUser;
}

interface StagedTransferItem {
  item: CatalogItemOption;
  quantity: number;
}

export function TransferFormClient({
  items: initialItems,
  workers = [],
  currentUser,
}: TransferFormClientProps) {
  const router = useRouter();
  const [catalogItems, setCatalogItems] = useState<CatalogItemOption[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"batch" | "single">("batch");
  const [stayOnPage, setStayOnPage] = useState<boolean>(true);

  // Transfer Destination: Office Warehouse (Godown -> Office) or Direct Site Dispatch (Godown -> Site)
  const [transferDestination, setTransferDestination] = useState<"OFFICE" | "SITE">("OFFICE");

  // Single Item Mode State
  const [selectedItem, setSelectedItem] = useState<CatalogItemOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [docNo, setDocNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [siteOrCustomer, setSiteOrCustomer] = useState("");
  const [workerId, setWorkerId] = useState(
    currentUser?.role === "WORKER" ? currentUser.id : workers[0]?.id || ""
  );

  // Batch Multi-Item Mode State
  const [batchItems, setBatchItems] = useState<StagedTransferItem[]>([]);
  const [pendingItem, setPendingItem] = useState<CatalogItemOption | null>(null);
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [batchDocNo, setBatchDocNo] = useState("");
  const [batchRemarks, setBatchRemarks] = useState("");
  const [batchSiteOrCustomer, setBatchSiteOrCustomer] = useState("");
  const [batchWorkerId, setBatchWorkerId] = useState(
    currentUser?.role === "WORKER" ? currentUser.id : workers[0]?.id || ""
  );

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
    processedList?: Array<{ name: string; quantity: number; unit: string; newGodown?: number; newOffice?: number }>;
  } | null>(null);

  // Helper to update local item stocks in memory
  const updateLocalStock = (
    processed: Array<{ itemId: string; quantity: number }>,
    destination: "OFFICE" | "SITE"
  ) => {
    setCatalogItems((prev) =>
      prev.map((item) => {
        const found = processed.find((p) => p.itemId === item.id);
        if (found) {
          return {
            ...item,
            godownQty: Math.max(0, item.godownQty - found.quantity),
            officeQty: destination === "OFFICE" ? item.officeQty + found.quantity : item.officeQty,
          };
        }
        return item;
      })
    );
  };

  // Add item to batch list
  const handleAddPendingToBatch = () => {
    if (!pendingItem) return;
    if (pendingQty <= 0) return;

    if (pendingQty > pendingItem.godownQty) {
      setStatusMessage({
        type: "error",
        text: `Cannot transfer ${pendingQty} ${pendingItem.unit}. Only ${pendingItem.godownQty} available in Godown.`,
      });
      return;
    }

    setBatchItems((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.item.id === pendingItem.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        const newTotal = copy[existingIndex].quantity + pendingQty;
        if (newTotal > pendingItem.godownQty) {
          setStatusMessage({
            type: "error",
            text: `Total requested (${newTotal} ${pendingItem.unit}) exceeds Godown stock (${pendingItem.godownQty}).`,
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
          if (newQty > entry.item.godownQty) {
            return entry;
          }
          return { ...entry, quantity: newQty };
        }
        return entry;
      })
    );
  };

  // Single Item Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setStatusMessage({ type: "error", text: "Please select an item to transfer." });
      return;
    }
    if (quantity <= 0) {
      setStatusMessage({ type: "error", text: "Quantity must be greater than 0." });
      return;
    }
    if (quantity > selectedItem.godownQty) {
      setStatusMessage({
        type: "error",
        text: `Cannot transfer ${quantity} ${selectedItem.unit}. Only ${selectedItem.godownQty} available in Godown.`,
      });
      return;
    }

    if (transferDestination === "SITE" && !siteOrCustomer.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide the installation site or customer reference.",
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    if (transferDestination === "SITE") {
      // Direct Godown -> Site Dispatch
      const res = await dispatchToSite({
        itemId: selectedItem.id,
        quantity,
        siteOrCustomer: siteOrCustomer.trim(),
        workerId: workerId || undefined,
        docNo,
        remarks,
        fromLocation: "GODOWN",
      });

      setLoading(false);

      if (res.success) {
        updateLocalStock([{ itemId: selectedItem.id, quantity }], "SITE");
        setStatusMessage({
          type: "success",
          text: `Directly dispatched ${quantity} ${selectedItem.unit} of ${selectedItem.name} from Godown to site "${siteOrCustomer}".`,
          processedList: [
            {
              name: selectedItem.name,
              quantity,
              unit: selectedItem.unit,
              newGodown: res.newBalance,
            },
          ],
        });

        setSelectedItem(null);
        setQuantity(1);
        setSiteOrCustomer("");

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
          text: res.error || "Failed to process site dispatch from Godown.",
        });
      }
    } else {
      // Standard Godown -> Office Hub Transfer
      const res = await transferStock({
        itemId: selectedItem.id,
        quantity,
        docNo,
        remarks,
      });

      setLoading(false);

      if (res.success) {
        updateLocalStock([{ itemId: selectedItem.id, quantity }], "OFFICE");
        setStatusMessage({
          type: "success",
          text: res.message || `Transferred ${quantity} ${selectedItem.unit} of ${selectedItem.name} to Office.`,
          processedList: [
            {
              name: selectedItem.name,
              quantity,
              unit: selectedItem.unit,
              newGodown: res.newGodownBalance,
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
          text: res.error || "Failed to process transfer.",
        });
      }
    }
  };

  // Batch Multi-Item Submit
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchItems.length === 0) {
      setStatusMessage({ type: "error", text: "Please add at least one item to the transfer list." });
      return;
    }

    if (transferDestination === "SITE" && !batchSiteOrCustomer.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide the installation site or customer reference for this direct dispatch.",
      });
      return;
    }

    // Check if any item exceeds current godown balance
    for (const b of batchItems) {
      if (b.quantity > b.item.godownQty) {
        setStatusMessage({
          type: "error",
          text: `Cannot transfer ${b.quantity} of ${b.item.name}. Godown balance is only ${b.item.godownQty}.`,
        });
        return;
      }
    }

    setLoading(true);
    setStatusMessage(null);

    if (transferDestination === "SITE") {
      // Direct Godown -> Site Batch Dispatch
      const payload = {
        items: batchItems.map((b) => ({ itemId: b.item.id, quantity: b.quantity })),
        siteOrCustomer: batchSiteOrCustomer.trim(),
        workerId: batchWorkerId || undefined,
        docNo: batchDocNo.trim() || undefined,
        remarks: batchRemarks.trim() || undefined,
        fromLocation: "GODOWN" as const,
      };

      const res = await batchDispatchToSite(payload);
      setLoading(false);

      if (res.success) {
        updateLocalStock(payload.items, "SITE");
        setStatusMessage({
          type: "success",
          text: `Successfully dispatched ${batchItems.length} items directly from Godown to site "${batchSiteOrCustomer.trim()}".`,
          processedList: batchItems.map((b) => ({
            name: b.item.name,
            quantity: b.quantity,
            unit: b.item.unit,
          })),
        });

        setBatchItems([]);
        setPendingItem(null);
        setPendingQty(1);
        setBatchSiteOrCustomer("");

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
          text: res.error || "Failed to process batch dispatch from Godown.",
        });
      }
    } else {
      // Standard Godown -> Office Hub Batch Transfer
      const payload = {
        items: batchItems.map((b) => ({ itemId: b.item.id, quantity: b.quantity })),
        docNo: batchDocNo.trim() || undefined,
        remarks: batchRemarks.trim() || undefined,
      };

      const res = await batchTransferStock(payload);
      setLoading(false);

      if (res.success) {
        updateLocalStock(payload.items, "OFFICE");
        setStatusMessage({
          type: "success",
          text: res.message || `Successfully transferred ${batchItems.length} items to Office hub.`,
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
          text: res.error || "Failed to process batch transfer.",
        });
      }
    }
  };

  const totalBatchUnits = batchItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const singleAvailableGodown = selectedItem ? selectedItem.godownQty : 0;
  const singleIsExceeded = selectedItem ? quantity > singleAvailableGodown : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                transferDestination === "SITE"
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-blue-500/10 text-blue-600"
              }`}
            >
              {transferDestination === "SITE" ? (
                <Truck className="w-6 h-6" />
              ) : (
                <ArrowRightLeft className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    transferDestination === "SITE"
                      ? "text-amber-700 bg-amber-50"
                      : "text-blue-600 bg-blue-50"
                  }`}
                >
                  {transferDestination === "SITE" ? "Direct Site Dispatch" : "Warehouse Transfer"}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {transferDestination === "SITE"
                    ? "Godown ➔ Installation Site"
                    : "Godown ➔ Office Hub"}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                {transferDestination === "SITE"
                  ? "Direct Godown to Site Dispatch"
                  : "Internal Warehouse Transfer"}
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
          {transferDestination === "SITE"
            ? "Directly dispatch materials from the primary Godown warehouse straight to an installation site or customer without routing through the Office first."
            : "Move stock atomically from primary Godown warehouse to Office hub for staging daily solar installation jobs."}
        </p>

        {/* Transfer Destination Switcher (Godown -> Office OR Godown -> Site) */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Where do you want to transfer this stock from Godown?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTransferDestination("OFFICE");
                setStatusMessage(null);
              }}
              className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                transferDestination === "OFFICE"
                  ? "border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20 shadow-xs"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  transferDestination === "OFFICE"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500/10 text-blue-600"
                }`}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs sm:text-sm">To Office Hub</div>
                <div className="text-[11px] text-slate-500 font-medium truncate">
                  Warehouse Transfer (Godown ➔ Office)
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTransferDestination("SITE");
                setStatusMessage(null);
              }}
              className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                transferDestination === "SITE"
                  ? "border-amber-500 bg-amber-50/50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  transferDestination === "SITE"
                    ? "bg-amber-500 text-white"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs sm:text-sm">Direct to Site / Customer</div>
                <div className="text-[11px] text-slate-500 font-medium truncate">
                  Direct Dispatch (Godown ➔ Site)
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (Batch vs Single) */}
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
                  ? transferDestination === "SITE"
                    ? "bg-white text-amber-700 shadow-xs"
                    : "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
              <span className="truncate">Batch Entry</span>
              {batchItems.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-black shrink-0">
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
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
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
                  <div className="font-semibold text-emerald-800">Moved Materials:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {statusMessage.processedList.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white/80 p-2 rounded-xl border border-emerald-200/60 flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800 truncate mr-2">{item.name}</span>
                        <span className="font-black text-blue-700 shrink-0">
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
          {/* Section 1: Transfer Document & Destination Reference */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText
                className={`w-4 h-4 ${
                  transferDestination === "SITE" ? "text-amber-600" : "text-blue-600"
                }`}
              />
              <span>
                Step 1:{" "}
                {transferDestination === "SITE"
                  ? "Site Dispatch Information"
                  : "Transfer Document Reference"}
              </span>
            </h3>

            {/* If Direct to Site: Require Site / Customer Name and Technician */}
            {transferDestination === "SITE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Installation Site / Customer Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={batchSiteOrCustomer}
                    onChange={(e) => setBatchSiteOrCustomer(e.target.value)}
                    placeholder="e.g. Green Energy Project - Phase 2"
                    className="w-full px-3.5 py-3 rounded-xl border border-amber-300 bg-white text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>Assigned Technician / Worker</span>
                  </label>
                  <select
                    value={batchWorkerId}
                    onChange={(e) => setBatchWorkerId(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-amber-300 bg-white text-sm font-medium focus:outline-none focus:border-amber-500"
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.fullName} ({w.role.replace("_", " ")})
                      </option>
                    ))}
                    {workers.length === 0 && (
                      <option value="">Logged by Current User</option>
                    )}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Challan / Gate Pass / Doc No. (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={batchDocNo}
                    onChange={(e) => setBatchDocNo(e.target.value)}
                    placeholder="e.g. TRF-2026-088"
                    className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={batchRemarks}
                  onChange={(e) => setBatchRemarks(e.target.value)}
                  placeholder="e.g. Direct dispatch from warehouse"
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Add Line Items */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PackageCheck
                className={`w-4 h-4 ${
                  transferDestination === "SITE" ? "text-amber-600" : "text-blue-600"
                }`}
              />
              <span>Step 2: Select Items to Move from Godown</span>
            </h3>

            {/* Item selector & quantity input */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <ItemCombobox
                items={catalogItems}
                selectedItemId={pendingItem?.id || ""}
                onSelect={(item) => setPendingItem(item)}
                locationFocus="GODOWN"
                label="Select Item to Transfer"
              />

              {pendingItem && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-slate-200/70 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Warehouse className="w-4 h-4 text-amber-500" />
                    <span>Godown Stock:</span>
                    <span className="font-bold text-slate-900">
                      {formatNumber(pendingItem.godownQty)} {pendingItem.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>Office Stock:</span>
                    <span className="font-bold text-slate-900">
                      {formatNumber(pendingItem.officeQty)} {pendingItem.unit}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <QuantityStepper
                    value={pendingQty}
                    onChange={setPendingQty}
                    unit={pendingItem?.unit || "NOS"}
                    max={pendingItem ? pendingItem.godownQty : null}
                    label="Transfer Quantity"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPendingToBatch}
                  disabled={
                    !pendingItem || pendingQty <= 0 || (pendingItem && pendingQty > pendingItem.godownQty)
                  }
                  className={`px-5 py-3.5 rounded-2xl font-bold text-sm text-white shadow-md active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shrink-0 touch-target ${
                    transferDestination === "SITE"
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Batch List</span>
                </button>
              </div>
            </div>

            {/* Staged Transfer Items */}
            {batchItems.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Items Staged for Movement ({batchItems.length})</span>
                  <span>Total Units: {formatNumber(totalBatchUnits)}</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                  {batchItems.map((entry, idx) => (
                    <div
                      key={entry.item.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {entry.item.name}
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>Godown Available: {formatNumber(entry.item.godownQty)} {entry.item.unit}</span>
                            <span>➔</span>
                            <span>
                              {transferDestination === "SITE"
                                ? `To Site: ${batchSiteOrCustomer || "Installation Site"}`
                                : `To Office Hub`}
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
                              max={entry.item.godownQty}
                              value={entry.quantity}
                              onChange={(e) =>
                                handleUpdateBatchItemQty(
                                  entry.item.id,
                                  Math.min(entry.item.godownQty, Math.max(1, Number(e.target.value) || 1))
                                )
                              }
                              className="w-16 text-center text-xs font-black text-slate-900 py-1 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBatchItemQty(
                                  entry.item.id,
                                  Math.min(entry.item.godownQty, entry.quantity + 1)
                                )
                              }
                              disabled={entry.quantity >= entry.item.godownQty}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold disabled:opacity-40 touch-target flex items-center justify-center"
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
                <p className="text-xs font-bold text-slate-600">No items added to the batch list yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select a material above, set the transfer quantity, and click "Add to Batch List".
                </p>
              </div>
            )}
          </div>

          {/* Confirm & Submit Batch Button */}
          <button
            type="submit"
            disabled={loading || batchItems.length === 0}
            className={`w-full py-3.5 sm:py-4 px-4 rounded-2xl active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target ${
              transferDestination === "SITE"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
            }`}
          >
            {loading ? (
              <span>Processing Batch Movement...</span>
            ) : batchItems.length === 0 ? (
              <>
                <ArrowRightLeft className="w-5 h-5 shrink-0" />
                <span>Add Items Above to Process Movement</span>
              </>
            ) : (
              <>
                {transferDestination === "SITE" ? (
                  <Truck className="w-5 h-5 shrink-0" />
                ) : (
                  <ArrowRightLeft className="w-5 h-5 shrink-0" />
                )}
                <span className="text-center">
                  Confirm & {transferDestination === "SITE" ? "Dispatch" : "Transfer"}{" "}
                  {batchItems.length} Item{batchItems.length !== 1 ? "s" : ""} (
                  {formatNumber(totalBatchUnits)} Units) to{" "}
                  {transferDestination === "SITE"
                    ? `Site "${batchSiteOrCustomer || "Installation Site"}"`
                    : "Office Hub"}
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
          {/* If Direct to Site: Require Site / Customer Name and Technician */}
          {transferDestination === "SITE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Installation Site / Customer Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={siteOrCustomer}
                  onChange={(e) => setSiteOrCustomer(e.target.value)}
                  placeholder="e.g. Green Energy Project - Sector 4"
                  className="w-full px-3.5 py-3 rounded-xl border border-amber-300 bg-white text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>Assigned Technician / Worker</span>
                </label>
                <select
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-amber-300 bg-white text-sm font-medium focus:outline-none focus:border-amber-500"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName} ({w.role.replace("_", " ")})
                    </option>
                  ))}
                  {workers.length === 0 && (
                    <option value="">Logged by Current User</option>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Combobox */}
          <ItemCombobox
            items={catalogItems}
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
                  <span>
                    {transferDestination === "SITE" ? "Site (Destination)" : "Office (Destination)"}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                  {transferDestination === "SITE"
                    ? siteOrCustomer || "Direct to Site"
                    : `${formatNumber(selectedItem.officeQty)} ${selectedItem.unit}`}
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
                Challan / Slip No. (Optional)
              </label>
              <input
                type="text"
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                placeholder="e.g. TRF-2026-088"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Internal Movement Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Direct dispatch from warehouse"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              loading ||
              !selectedItem ||
              quantity <= 0 ||
              singleIsExceeded ||
              singleAvailableGodown <= 0 ||
              (transferDestination === "SITE" && !siteOrCustomer.trim())
            }
            className={`w-full py-3.5 sm:py-4 px-4 rounded-2xl active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target ${
              transferDestination === "SITE"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
            }`}
          >
            {loading ? (
              <span>Processing Movement...</span>
            ) : transferDestination === "SITE" ? (
              <>
                <Truck className="w-5 h-5 shrink-0" />
                <span>Confirm Direct Dispatch to Site</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-5 h-5 shrink-0" />
                <span>Confirm Transfer to Office Hub</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
