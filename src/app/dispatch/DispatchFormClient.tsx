"use client";

import React, { useState, useMemo } from "react";
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
  Warehouse,
  Printer,
  Phone,
  ClipboardList,
  X,
  ArrowRight,
  Package,
} from "lucide-react";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import { SessionUser, DispatchedRecord } from "@/lib/types";
import { dispatchToSite, batchDispatchToSite } from "@/actions/inventory";
import { DeliveryChallanModal, DeliveryChallanData } from "@/components/inventory/DeliveryChallanModal";
import { StandardChallanForm } from "./StandardChallanForm";
import {
  singleDispatchSchema,
  batchDispatchHeaderSchema,
  batchStagingItemSchema,
} from "@/lib/validation";
import { AutocompleteInput, AutocompleteOption } from "@/components/common/AutocompleteInput";

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
  customerSuggestions?: Array<{ name: string; phone?: string | null; address?: string | null }>;
}

interface StagedDispatchItem {
  item: CatalogItemOption;
  quantity: number;
  sourceLocation?: "OFFICE" | "GODOWN";
}

export interface DispatchedBatchGroup {
  id: string;
  isBatch: boolean;
  batchId: string | null;
  siteOrCustomer: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  workerName: string | null;
  dispatchedByName: string;
  referenceDocNo: string | null;
  remarks: string | null;
  createdAt: string;
  totalQuantity: number;
  totalItems: number;
  items: Array<{
    id: string;
    itemName: string;
    category: string;
    unit: string;
    quantity: number;
  }>;
  rawRecords: DispatchedRecord[];
}

export function DispatchFormClient({
  items: initialItems,
  workers,
  currentUser,
  recentDispatches = [],
  customerSuggestions = [],
}: DispatchFormClientProps) {
  const router = useRouter();
  const [catalogItems, setCatalogItems] = useState<CatalogItemOption[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"challan" | "batch" | "single">("challan");
  const [stayOnPage, setStayOnPage] = useState<boolean>(true);

  // Customer Autocomplete Options
  const customerOptions: AutocompleteOption[] = useMemo(() => {
    return customerSuggestions.map((c) => ({
      label: c.name,
      subLabel: [c.phone, c.address].filter(Boolean).join(" • "),
      extraData: c,
    }));
  }, [customerSuggestions]);

  // Single Item Mode State
  const [selectedItem, setSelectedItem] = useState<CatalogItemOption | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [siteOrCustomer, setSiteOrCustomer] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [workerId, setWorkerId] = useState(
    currentUser.role === "WORKER" ? currentUser.id : workers[0]?.id || ""
  );
  const [docNo, setDocNo] = useState("");
  const [remarks, setRemarks] = useState("");

  // Batch Multi-Item Mode State
  const [batchItems, setBatchItems] = useState<StagedDispatchItem[]>([]);
  const [pendingItem, setPendingItem] = useState<CatalogItemOption | null>(null);
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [pendingLocation, setPendingLocation] = useState<"OFFICE" | "GODOWN">("GODOWN");
  const [batchSiteOrCustomer, setBatchSiteOrCustomer] = useState("");
  const [batchCustomerPhone, setBatchCustomerPhone] = useState("");
  const [batchCustomerAddress, setBatchCustomerAddress] = useState("");
  const [batchWorkerId, setBatchWorkerId] = useState(
    currentUser.role === "WORKER" ? currentUser.id : workers[0]?.id || ""
  );
  const [batchDocNo, setBatchDocNo] = useState("");
  const [batchRemarks, setBatchRemarks] = useState("");

  // Validation Error States for Single & Batch Forms
  const [singleErrors, setSingleErrors] = useState<Record<string, string>>({});
  const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});
  const [stagingError, setStagingError] = useState<string | null>(null);

  const clearSingleError = (key: string) => {
    setSingleErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearBatchError = (key: string) => {
    setBatchErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Delivery Challan Modal State
  const [activeChallan, setActiveChallan] = useState<DeliveryChallanData | null>(null);
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [selectedGroupModal, setSelectedGroupModal] = useState<DispatchedBatchGroup | null>(null);

  // Group raw dispatches into batches (matching Movement Audit History)
  const groupedDispatches = useMemo(() => {
    const groups: DispatchedBatchGroup[] = [];
    const batchMap = new Map<string, DispatchedBatchGroup>();
    const getTs = (isoStr: string) => new Date(isoStr).getTime();

    for (const d of recentDispatches) {
      if (d.batchId) {
        let existing = batchMap.get(d.batchId);
        if (!existing) {
          existing = {
            id: d.batchId,
            isBatch: true,
            batchId: d.batchId,
            siteOrCustomer: d.siteOrCustomer,
            customerPhone: d.customerPhone || null,
            customerAddress: d.customerAddress || null,
            workerName: d.workerName || null,
            dispatchedByName: d.dispatchedByName,
            referenceDocNo: d.referenceDocNo,
            remarks: d.remarks,
            createdAt: d.createdAt,
            totalQuantity: 0,
            totalItems: 0,
            items: [],
            rawRecords: [],
          };
          batchMap.set(d.batchId, existing);
          groups.push(existing);
        }
        existing.totalQuantity += d.quantity;
        existing.totalItems += 1;
        existing.items.push({
          id: d.id,
          itemName: d.itemName,
          category: d.category,
          unit: d.unit,
          quantity: d.quantity,
        });
        existing.rawRecords.push(d);
      } else {
        // Fallback grouping for records with same customer/doc created within 3.5s
        const lastGroup = groups[groups.length - 1];
        const canGroupFallback =
          lastGroup &&
          !lastGroup.batchId &&
          lastGroup.siteOrCustomer === d.siteOrCustomer &&
          (lastGroup.referenceDocNo === d.referenceDocNo || (!lastGroup.referenceDocNo && !d.referenceDocNo)) &&
          Math.abs(getTs(lastGroup.createdAt) - getTs(d.createdAt)) <= 3500;

        if (canGroupFallback) {
          lastGroup.isBatch = true;
          lastGroup.totalQuantity += d.quantity;
          lastGroup.totalItems += 1;
          lastGroup.items.push({
            id: d.id,
            itemName: d.itemName,
            category: d.category,
            unit: d.unit,
            quantity: d.quantity,
          });
          lastGroup.rawRecords.push(d);
        } else {
          groups.push({
            id: d.id,
            isBatch: false,
            batchId: null,
            siteOrCustomer: d.siteOrCustomer,
            customerPhone: d.customerPhone || null,
            customerAddress: d.customerAddress || null,
            workerName: d.workerName || null,
            dispatchedByName: d.dispatchedByName,
            referenceDocNo: d.referenceDocNo,
            remarks: d.remarks,
            createdAt: d.createdAt,
            totalQuantity: d.quantity,
            totalItems: 1,
            items: [
              {
                id: d.id,
                itemName: d.itemName,
                category: d.category,
                unit: d.unit,
                quantity: d.quantity,
              },
            ],
            rawRecords: [d],
          });
        }
      }
    }

    // Only mark as batch if there are multiple items (more than 1)
    for (const g of groups) {
      g.isBatch = g.items.length > 1;
    }

    return groups;
  }, [recentDispatches]);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
    processedList?: Array<{ name: string; quantity: number; unit: string; newOffice?: number }>;
  } | null>(null);

  // Origin Location: Office Hub (Default) or Godown Warehouse (Direct)
  const [dispatchSource, setDispatchSource] = useState<"OFFICE" | "GODOWN">("OFFICE");

  // Helper to get available stock from selected source
  const getSourceQty = (item: CatalogItemOption | null | undefined, loc?: "OFFICE" | "GODOWN") => {
    if (!item) return 0;
    const targetLoc = loc || dispatchSource;
    return targetLoc === "GODOWN" ? item.godownQty : item.officeQty;
  };

  // Helper to update local item stocks in memory
  const updateLocalStock = (
    processed: Array<{ itemId: string; quantity: number; sourceLocation?: "OFFICE" | "GODOWN" }>
  ) => {
    setCatalogItems((prev) =>
      prev.map((item) => {
        const found = processed.find((p) => p.itemId === item.id);
        if (found) {
          const loc = found.sourceLocation || dispatchSource;
          if (loc === "GODOWN") {
            return {
              ...item,
              godownQty: Math.max(0, item.godownQty - found.quantity),
            };
          }
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
    if (!pendingItem) {
      setStagingError("Please select a solar item to add to the kit.");
      return;
    }

    const available = getSourceQty(pendingItem);
    const parsed = batchStagingItemSchema.safeParse({
      itemId: pendingItem.id,
      quantity: pendingQty,
      availableStock: available,
      locationName: dispatchSource === "GODOWN" ? "Main Godown" : "Office Hub",
    });

    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const err = flattened.fieldErrors.quantity?.[0] || flattened.fieldErrors.itemId?.[0] || "Invalid item or quantity";
      setStagingError(err);
      return;
    }

    const sourceLabel = dispatchSource === "GODOWN" ? "Godown" : "Office";
    setBatchItems((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.item.id === pendingItem.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        const newTotal = copy[existingIndex].quantity + pendingQty;
        if (newTotal > available) {
          setStagingError(
            `Total requested (${newTotal} ${pendingItem.unit}) exceeds ${sourceLabel} stock (${available}).`
          );
          return prev;
        }
        copy[existingIndex].quantity = newTotal;
        return copy;
      }
      return [...prev, { item: pendingItem, quantity: pendingQty }];
    });

    setPendingItem(null);
    setPendingQty(1);
    setStagingError(null);
    clearBatchError("batchItems");
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
          const available = getSourceQty(entry.item);
          if (newQty > available) {
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

    const parsed = singleDispatchSchema.safeParse({
      itemId: selectedItem?.id || "",
      quantity,
      availableStock: selectedItem ? getSourceQty(selectedItem) : 0,
      locationName: dispatchSource === "GODOWN" ? "Main Godown" : "Office Hub",
      siteOrCustomer: siteOrCustomer.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      docNo: docNo.trim() || undefined,
      workerId: workerId.trim(),
      remarks: remarks.trim() || undefined,
    });

    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const errors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(flattened.fieldErrors)) {
        if (msgs && msgs[0]) errors[key] = msgs[0];
      }
      setSingleErrors(errors);
      const firstMsg = Object.values(errors)[0];
      setStatusMessage({ type: "error", text: firstMsg });
      return;
    }

    setSingleErrors({});
    const sourceLabel = dispatchSource === "GODOWN" ? "Godown" : "Office";
    setLoading(true);
    setStatusMessage(null);

    const res = await dispatchToSite({
      itemId: selectedItem!.id,
      quantity,
      siteOrCustomer: siteOrCustomer.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      workerId: workerId || undefined,
      docNo: docNo.trim() || undefined,
      remarks: remarks.trim() || undefined,
      fromLocation: dispatchSource,
    });

    setLoading(false);

    if (res.success) {
      updateLocalStock([{ itemId: selectedItem!.id, quantity }]);
      const workerObj = workers.find((w) => w.id === workerId);
      const challanInfo: DeliveryChallanData = {
        challanNo: docNo.trim() || `DSP-${Date.now().toString().slice(-4)}`,
        date: new Date(),
        customerName: siteOrCustomer.trim(),
        customerPhone: customerPhone.trim() || null,
        customerAddress: customerAddress.trim() || null,
        technicianName: workerObj?.fullName || null,
        dispatchedByName: currentUser.fullName,
        items: [
          {
            name: selectedItem!.name,
            category: selectedItem!.category,
            quantity,
            unit: selectedItem!.unit,
          },
        ],
        remarks: remarks.trim() || null,
        sourceLocation: dispatchSource === "GODOWN" ? "Godown" : "Office",
      };
      setActiveChallan(challanInfo);

      setStatusMessage({
        type: "success",
        text: res.message || `Dispatched ${quantity} ${selectedItem!.unit} of ${selectedItem!.name} from ${sourceLabel} for "${siteOrCustomer}".`,
        processedList: [
          {
            name: selectedItem!.name,
            quantity,
            unit: selectedItem!.unit,
            newOffice: res.newBalance,
          },
        ],
      });

      setSelectedItem(null);
      setQuantity(1);
      setSingleErrors({});

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

    const parsed = batchDispatchHeaderSchema.safeParse({
      siteOrCustomer: batchSiteOrCustomer.trim(),
      customerPhone: batchCustomerPhone.trim() || undefined,
      customerAddress: batchCustomerAddress.trim() || undefined,
      docNo: batchDocNo.trim() || undefined,
      workerId: batchWorkerId.trim(),
      remarks: batchRemarks.trim() || undefined,
    });

    const errors: Record<string, string> = {};
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      for (const [key, msgs] of Object.entries(flattened.fieldErrors)) {
        if (msgs && msgs[0]) errors[key] = msgs[0];
      }
    }

    if (batchItems.length === 0) {
      errors.batchItems = "Please add at least one material to the site dispatch kit.";
    }

    const sourceLabel = dispatchSource === "GODOWN" ? "Godown" : "Office";
    for (const b of batchItems) {
      const available = getSourceQty(b.item);
      if (b.quantity > available) {
        errors.batchItems = `Cannot dispatch ${b.quantity} of ${b.item.name}. ${sourceLabel} balance is only ${available}.`;
        break;
      }
    }

    if (Object.keys(errors).length > 0) {
      setBatchErrors(errors);
      setStatusMessage({
        type: "error",
        text: Object.values(errors)[0],
      });
      return;
    }

    setBatchErrors({});
    setLoading(true);
    setStatusMessage(null);

    const payload = {
      items: batchItems.map((b) => ({ itemId: b.item.id, quantity: b.quantity })),
      siteOrCustomer: batchSiteOrCustomer.trim(),
      customerPhone: batchCustomerPhone.trim() || undefined,
      customerAddress: batchCustomerAddress.trim() || undefined,
      workerId: batchWorkerId || undefined,
      docNo: batchDocNo.trim() || undefined,
      remarks: batchRemarks.trim() || undefined,
      fromLocation: dispatchSource,
    };

    const res = await batchDispatchToSite(payload);
    setLoading(false);

    if (res.success) {
      updateLocalStock(payload.items);
      const workerObj = workers.find((w) => w.id === batchWorkerId);
      const challanInfo: DeliveryChallanData = {
        challanNo: batchDocNo.trim() || `DSP-${Date.now().toString().slice(-4)}`,
        date: new Date(),
        customerName: batchSiteOrCustomer.trim(),
        customerPhone: batchCustomerPhone.trim() || null,
        customerAddress: batchCustomerAddress.trim() || null,
        technicianName: workerObj?.fullName || null,
        dispatchedByName: currentUser.fullName,
        items: batchItems.map((b) => ({
          name: b.item.name,
          category: b.item.category,
          quantity: b.quantity,
          unit: b.item.unit,
        })),
        remarks: batchRemarks.trim() || null,
        sourceLocation: dispatchSource === "GODOWN" ? "Godown" : "Office",
      };
      setActiveChallan(challanInfo);

      setStatusMessage({
        type: "success",
        text: res.message || `Successfully dispatched ${batchItems.length} items from ${sourceLabel} for "${batchSiteOrCustomer}".`,
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
  const singleAvailableQty = selectedItem ? getSourceQty(selectedItem) : 0;
  const singleIsExceeded = selectedItem ? quantity > singleAvailableQty : false;

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
                  {dispatchSource === "GODOWN"
                    ? "Godown Warehouse ➔ Installation Site"
                    : "Office Hub ➔ Installation Site"}
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
          Record solar materials taken by installation technicians from the Office staging hub or directly from the Godown warehouse for a specific customer or site project.
        </p>

        {/* Dispatch Source Selector (Only needed for Single / Batch mode; Challan mode has per-item selection) */}
        {activeTab === "challan" ? (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/50 p-3 rounded-2xl border border-amber-200/60">
            <div className="flex items-center gap-2.5 text-xs text-amber-950">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <Warehouse className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-amber-900">Per-Item Warehouse Stock Allocation</div>
                <div className="text-[11px] text-amber-800">
                  You can choose <span className="font-bold underline">Main Godown</span> or <span className="font-bold underline">Office Hub</span> individually for each solar item below.
                </div>
              </div>
            </div>
            <span className="self-start sm:self-auto text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
              ✓ Multi-Warehouse Active
            </span>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Dispatch Origin:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDispatchSource("OFFICE");
                  setStatusMessage(null);
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  dispatchSource === "OFFICE"
                    ? "border-amber-500 bg-amber-50/50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    dispatchSource === "OFFICE"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm">Office Staging Hub</div>
                  <div className="text-[11px] text-slate-500 font-medium truncate">
                    Office Stock (Office ➔ Site)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDispatchSource("GODOWN");
                  setStatusMessage(null);
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  dispatchSource === "GODOWN"
                    ? "border-amber-500 bg-amber-50/50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    dispatchSource === "GODOWN"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  <Warehouse className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm">Main Godown Warehouse</div>
                  <div className="text-[11px] text-slate-500 font-medium truncate">
                    Direct Warehouse Dispatch (Godown ➔ Site)
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-full sm:w-auto grid grid-cols-3 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("challan");
                setStatusMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all min-w-0 text-center ${
                activeTab === "challan"
                  ? "bg-white text-amber-800 shadow-xs ring-1 ring-amber-500/30 font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
              <span className="truncate">Challan Form</span>
              <span className="hidden md:inline px-1 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-black shrink-0">
                Challan Slip
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("batch");
                setStatusMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all min-w-0 text-center ${
                activeTab === "batch"
                  ? "bg-white text-amber-700 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
              <span className="truncate">Custom Kit</span>
              {batchItems.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-black shrink-0">
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
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all min-w-0 text-center ${
                activeTab === "single"
                  ? "bg-white text-slate-900 shadow-xs font-black"
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

          {statusMessage.type === "success" && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/50">
              {activeChallan && (
                <button
                  type="button"
                  onClick={() => setIsChallanModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform touch-target"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ Print Delivery Challan Voucher</span>
                </button>
              )}
              {stayOnPage && (
                <div className="flex items-center gap-2 ml-auto">
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
        </div>
      )}

      {/* ================= STANDARD DELIVERY CHALLAN SLIP MODE ================= */}
      {activeTab === "challan" && (
        <StandardChallanForm
          catalogItems={catalogItems}
          workers={workers}
          currentUser={currentUser}
          customerSuggestions={customerSuggestions}
          onSuccess={(processedItems, challanData, msg) => {
            updateLocalStock(processedItems);
            setActiveChallan(challanData);
            setStatusMessage({
              type: "success",
              text: msg,
              processedList: challanData.items.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
              })),
            });

            if (!stayOnPage) {
              setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
              }, 700);
            } else {
              router.refresh();
            }
          }}
          onError={(err) => {
            setStatusMessage({
              type: "error",
              text: err,
            });
          }}
        />
      )}

      {/* ================= MULTI-ITEM BATCH MODE ================= */}
      {activeTab === "batch" && (
        <form onSubmit={handleBatchSubmit} className="space-y-6">
          {/* Section 1: Customer & Delivery Challan Information */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Step 1: Customer & Delivery Challan Details</span>
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-full border border-blue-200/60">
                Matches Jaffins Challan Slip
              </span>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Customer Name / Site Reference <span className="text-amber-500">*</span>
              </label>
              <AutocompleteInput
                value={batchSiteOrCustomer}
                onChange={(val) => {
                  setBatchSiteOrCustomer(val);
                  clearBatchError("siteOrCustomer");
                }}
                onSelectOption={(opt) => {
                  clearBatchError("siteOrCustomer");
                  if (opt.extraData?.phone) {
                    setBatchCustomerPhone(opt.extraData.phone);
                    clearBatchError("customerPhone");
                  }
                  if (opt.extraData?.address) {
                    setBatchCustomerAddress(opt.extraData.address);
                  }
                }}
                options={customerOptions}
                placeholder="e.g. મહેશ અમરસિંહ પસીયા (Mahesh Amarsinh Pasiya)"
                dropdownTitle="Saved Customers from Database"
                leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
                hasError={!!batchErrors.siteOrCustomer}
                inputClassName={cn(
                  "py-3 font-medium",
                  batchErrors.siteOrCustomer
                    ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                    : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                )}
              />
              {batchErrors.siteOrCustomer && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{batchErrors.siteOrCustomer}</span>
                </p>
              )}
            </div>

            {/* Mobile & Challan No. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Customer Mobile Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={batchCustomerPhone}
                    onChange={(e) => {
                      setBatchCustomerPhone(e.target.value);
                      clearBatchError("customerPhone");
                    }}
                    placeholder="e.g. 8160275552"
                    className={cn(
                      "w-full pl-9 pr-3.5 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all font-mono",
                      batchErrors.customerPhone
                        ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                        : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    )}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {batchErrors.customerPhone && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{batchErrors.customerPhone}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Delivery Challan No.
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={batchDocNo}
                    onChange={(e) => {
                      setBatchDocNo(e.target.value);
                      clearBatchError("docNo");
                    }}
                    placeholder="e.g. 456 or CH-102"
                    className={cn(
                      "w-full pl-9 pr-3.5 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all font-mono font-bold",
                      batchErrors.docNo
                        ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                        : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    )}
                  />
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {batchErrors.docNo && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{batchErrors.docNo}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Site / Delivery Address
              </label>
              <input
                type="text"
                value={batchCustomerAddress}
                onChange={(e) => {
                  setBatchCustomerAddress(e.target.value);
                  clearBatchError("customerAddress");
                }}
                placeholder="e.g. ઓપ. પ્લોટ નં. 2369, રાજપુતવાડા, ઘોઘા (Opp. Plot 2369, Rajputwada, Ghogha)"
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm focus:outline-none transition-all",
                  batchErrors.customerAddress
                    ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                    : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                )}
              />
              {batchErrors.customerAddress && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{batchErrors.customerAddress}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assigned Technician */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Assigned Solar Technician <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={batchWorkerId}
                    onChange={(e) => {
                      setBatchWorkerId(e.target.value);
                      clearBatchError("workerId");
                    }}
                    className={cn(
                      "w-full pl-9 pr-3.5 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all",
                      batchErrors.workerId
                        ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                        : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    )}
                  >
                    <option value="">-- Select Solar Technician --</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.fullName} ({w.role.replace("_", " ")})
                      </option>
                    ))}
                  </select>
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {batchErrors.workerId && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{batchErrors.workerId}</span>
                  </p>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Delivery Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={batchRemarks}
                  onChange={(e) => {
                    setBatchRemarks(e.target.value);
                    clearBatchError("remarks");
                  }}
                  placeholder="e.g. 6 ફુટ પાઇપ વધેલો છે (60x40) પછી લાવવો"
                  className={cn(
                    "w-full px-3.5 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all",
                    batchErrors.remarks
                      ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                      : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  )}
                />
                {batchErrors.remarks && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{batchErrors.remarks}</span>
                  </p>
                )}
              </div>
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
                locationFocus={dispatchSource}
                label="Select Solar Item for Site"
              />

              {pendingItem && (
                <div className="p-3 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    {dispatchSource === "GODOWN" ? (
                      <Warehouse className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Building2 className="w-4 h-4 text-blue-500" />
                    )}
                    <span>Available in {dispatchSource === "GODOWN" ? "Godown" : "Office"} Stock:</span>
                  </div>
                  <span
                    className={`font-bold ${
                      getSourceQty(pendingItem) > 0 ? "text-slate-900" : "text-rose-600"
                    }`}
                  >
                    {formatNumber(getSourceQty(pendingItem))} {pendingItem.unit}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <QuantityStepper
                    value={pendingQty}
                    onChange={setPendingQty}
                    unit={pendingItem?.unit || "NOS"}
                    max={pendingItem ? getSourceQty(pendingItem) : null}
                    label="Checkout Quantity"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPendingToBatch}
                  disabled={!pendingItem || pendingQty <= 0}
                  className="px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shrink-0 touch-target"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Material to Kit</span>
                </button>
              </div>

              {stagingError && (
                <p className="text-xs text-rose-600 font-bold mt-2 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{stagingError}</span>
                </p>
              )}
            </div>

            {/* Batch Items Error Message */}
            {batchErrors.batchItems && (
              <p className="text-xs text-rose-600 font-bold p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{batchErrors.batchItems}</span>
              </p>
            )}

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
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 text-xs font-black flex items-center justify-center shrink-0">
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
                              Office Stock: {formatNumber(entry.item.officeQty)} {entry.item.unit}
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
            className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
          >
            {loading ? (
              <span>Dispatching {batchItems.length} Materials to Site...</span>
            ) : batchItems.length === 0 ? (
              <>
                <Truck className="w-5 h-5 shrink-0" />
                <span>Add Materials Above to Dispatch to Site</span>
              </>
            ) : (
              <>
                <Truck className="w-5 h-5 shrink-0" />
                <span className="text-center">
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
          noValidate
          className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5"
        >
          {/* Item Combobox */}
          <div>
            <ItemCombobox
              items={catalogItems}
              selectedItemId={selectedItem?.id || ""}
              onSelect={(item) => {
                setSelectedItem(item);
                clearSingleError("itemId");
                clearSingleError("quantity");
              }}
              locationFocus={dispatchSource}
              label="Solar Item to Dispatch"
            />
            {singleErrors.itemId && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{singleErrors.itemId}</span>
              </p>
            )}
          </div>

          {/* Live Stock Pill */}
          {selectedItem && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                {dispatchSource === "GODOWN" ? (
                  <Warehouse className="w-4 h-4 text-amber-500" />
                ) : (
                  <Building2 className="w-4 h-4 text-blue-500" />
                )}
                <span>Available in {dispatchSource === "GODOWN" ? "Godown" : "Office"} Stock:</span>
              </div>
              <span
                className={`font-bold ${
                  singleAvailableQty > 0 ? "text-slate-900" : "text-rose-600"
                }`}
              >
                {formatNumber(singleAvailableQty)} {selectedItem.unit}
              </span>
            </div>
          )}

          {/* Quantity Stepper with Stock Limit */}
          <div>
            <QuantityStepper
              value={quantity}
              onChange={(q) => {
                setQuantity(q);
                clearSingleError("quantity");
              }}
              unit={selectedItem?.unit || "NOS"}
              max={selectedItem ? getSourceQty(selectedItem) : null}
              label="Dispatch Quantity"
            />
            {singleErrors.quantity && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{singleErrors.quantity}</span>
              </p>
            )}
          </div>

          {/* Customer / Site Reference */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Customer Name / Site Reference <span className="text-amber-500">*</span>
            </label>
            <AutocompleteInput
              value={siteOrCustomer}
              onChange={(val) => {
                setSiteOrCustomer(val);
                clearSingleError("siteOrCustomer");
              }}
              onSelectOption={(opt) => {
                clearSingleError("siteOrCustomer");
                if (opt.extraData?.phone) {
                  setCustomerPhone(opt.extraData.phone);
                  clearSingleError("customerPhone");
                }
                if (opt.extraData?.address) {
                  setCustomerAddress(opt.extraData.address);
                }
              }}
              options={customerOptions}
              placeholder="e.g. મહેશ અમરસિંહ પસીયા (Mahesh Amarsinh Pasiya)"
              dropdownTitle="Saved Customers from Database"
              leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
              hasError={!!singleErrors.siteOrCustomer}
              inputClassName={cn(
                "py-3 font-medium",
                singleErrors.siteOrCustomer
                  ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              )}
            />
            {singleErrors.siteOrCustomer && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{singleErrors.siteOrCustomer}</span>
              </p>
            )}
          </div>

          {/* Customer Phone & Challan No. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Customer Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    clearSingleError("customerPhone");
                  }}
                  placeholder="e.g. 8160275552"
                  className={cn(
                    "w-full pl-9 pr-3.5 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all font-mono",
                    singleErrors.customerPhone
                      ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                      : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  )}
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              {singleErrors.customerPhone && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{singleErrors.customerPhone}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Delivery Challan No.
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={docNo}
                  onChange={(e) => {
                    setDocNo(e.target.value);
                    clearSingleError("docNo");
                  }}
                  placeholder="e.g. 456 or CH-102"
                  className={cn(
                    "w-full pl-9 pr-3.5 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all font-mono font-bold",
                    singleErrors.docNo
                      ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                      : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  )}
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              {singleErrors.docNo && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{singleErrors.docNo}</span>
                </p>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Site / Delivery Address
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => {
                setCustomerAddress(e.target.value);
                clearSingleError("customerAddress");
              }}
              placeholder="e.g. ઓપ. પ્લોટ નં. 2369, રાજપુતવાડા, ઘોઘા (Opp. Plot 2369, Rajputwada, Ghogha)"
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm focus:outline-none transition-all",
                singleErrors.customerAddress
                  ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              )}
            />
            {singleErrors.customerAddress && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{singleErrors.customerAddress}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Technician */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Assigned Solar Technician <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={workerId}
                  onChange={(e) => {
                    setWorkerId(e.target.value);
                    clearSingleError("workerId");
                  }}
                  className={cn(
                    "w-full pl-9 pr-3.5 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all",
                    singleErrors.workerId
                      ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                      : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  )}
                >
                  <option value="">-- Select Solar Technician --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName} ({w.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              {singleErrors.workerId && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{singleErrors.workerId}</span>
                </p>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Delivery Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  clearSingleError("remarks");
                }}
                placeholder="e.g. 6 ફુટ પાઇપ વધેલો છે (60x40) પછી લાવવો"
                className={cn(
                  "w-full px-3.5 py-3 rounded-xl border bg-white text-sm focus:outline-none transition-all",
                  singleErrors.remarks
                    ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                    : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                )}
              />
              {singleErrors.remarks && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{singleErrors.remarks}</span>
                </p>
              )}
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
              singleAvailableQty <= 0 ||
              !siteOrCustomer.trim()
            }
            className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
          >
            {loading ? (
              <span>Processing Dispatch...</span>
            ) : (
              <>
                <Truck className="w-5 h-5 shrink-0" />
                <span>Confirm Dispatch to Site</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Recent Dispatched Records Table (Grouped by Batch identically to Movement Audit History) */}
      {groupedDispatches && groupedDispatches.length > 0 && (
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
                  <th className="py-3 px-4">Dispatched Materials</th>
                  <th className="py-3 px-4 text-right">Total Units</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Doc / Job #</th>
                  <th className="py-3 px-4 text-center">Challan Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedDispatches.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => setSelectedGroupModal(g)}
                    className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {new Date(g.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="text-sm font-extrabold text-slate-900">{g.siteOrCustomer}</div>
                      {g.customerPhone && (
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{g.customerPhone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {g.isBatch && g.items.length > 1 ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-100 text-purple-700 border border-purple-200 inline-flex items-center gap-1.5 shadow-2xs">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          <span>Batch ({g.totalItems} Items)</span>
                        </span>
                      ) : (
                        <div className="whitespace-nowrap">
                          <span className="font-bold text-slate-900">{g.items[0]?.itemName}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                            ({g.items[0]?.category})
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {g.isBatch && g.items.length > 1 ? (
                        <div>
                          <span className="font-black font-mono text-purple-700 text-sm">
                            {formatNumber(g.totalQuantity)} Units
                          </span>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {g.totalItems} distinct items
                          </div>
                        </div>
                      ) : (
                        <span className="font-black font-mono text-purple-700 text-sm">
                          {formatNumber(g.totalQuantity)} {g.items[0]?.unit}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {g.workerName || "Unassigned"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {g.referenceDocNo || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChallan({
                            challanNo: g.referenceDocNo || `DSP-${g.id.slice(-4).toUpperCase()}`,
                            date: g.createdAt,
                            customerName: g.siteOrCustomer,
                            customerPhone: g.customerPhone || null,
                            customerAddress: g.customerAddress || null,
                            technicianName: g.workerName || null,
                            dispatchedByName: g.dispatchedByName,
                            items: g.items.map((i) => ({
                              name: i.itemName,
                              category: i.category,
                              quantity: i.quantity,
                              unit: i.unit,
                            })),
                            remarks: g.remarks || null,
                          });
                          setIsChallanModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors"
                        title="Print Delivery Challan Voucher"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-600" />
                        <span>Print Voucher</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grouped Dispatch Details Modal */}
      {selectedGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Site Dispatch Voucher Details
                    </h3>
                    {selectedGroupModal.isBatch && selectedGroupModal.items.length > 1 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">
                        {selectedGroupModal.totalItems} Items
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Dispatched on {formatDate(selectedGroupModal.createdAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroupModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer / Site
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 mt-0.5 block truncate">
                    {selectedGroupModal.siteOrCustomer}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Contact Phone
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">
                    {selectedGroupModal.customerPhone || "Not specified"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Challan / Doc #
                  </span>
                  <span className="text-xs font-mono font-black text-amber-700 mt-0.5 block">
                    {selectedGroupModal.referenceDocNo || "Auto-Generated"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Technician
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                    {selectedGroupModal.workerName || "Unassigned"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Dispatched By
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {selectedGroupModal.dispatchedByName}
                  </span>
                </div>
              </div>

              {/* Items List Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Materials Dispatched ({selectedGroupModal.totalItems} Items)
                  </span>
                  <span className="text-xs font-mono font-black text-purple-700">
                    Total: {formatNumber(selectedGroupModal.totalQuantity)} Units
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedGroupModal.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{item.itemName}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black font-mono text-purple-700">
                            {formatNumber(item.quantity)} {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedGroupModal.remarks && (
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/60 text-xs text-amber-900">
                  <span className="font-bold block text-[10px] uppercase text-amber-700 mb-0.5">
                    Field Notes / Remarks:
                  </span>
                  {selectedGroupModal.remarks}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedGroupModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveChallan({
                    challanNo: selectedGroupModal.referenceDocNo || `DSP-${selectedGroupModal.id.slice(-4).toUpperCase()}`,
                    date: selectedGroupModal.createdAt,
                    customerName: selectedGroupModal.siteOrCustomer,
                    customerPhone: selectedGroupModal.customerPhone || null,
                    customerAddress: selectedGroupModal.customerAddress || null,
                    technicianName: selectedGroupModal.workerName || null,
                    dispatchedByName: selectedGroupModal.dispatchedByName,
                    items: selectedGroupModal.items.map((i) => ({
                      name: i.itemName,
                      category: i.category,
                      quantity: i.quantity,
                      unit: i.unit,
                    })),
                    remarks: selectedGroupModal.remarks || null,
                  });
                  setSelectedGroupModal(null);
                  setIsChallanModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Delivery Challan Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Challan Print / Preview Modal */}
      <DeliveryChallanModal
        isOpen={isChallanModalOpen}
        onClose={() => setIsChallanModalOpen(false)}
        data={activeChallan}
      />
    </div>
  );
}
