"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Sun,
  Zap,
  Layers,
  Truck,
  Plus,
  Trash2,
  Warehouse,
  Building2,
  MapPin,
  Phone,
  FileText,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  PackageCheck,
  Shield,
  Grid,
  Cable,
} from "lucide-react";
import { CatalogItemOption } from "@/components/inventory/ItemCombobox";
import { SearchableItemPicker } from "@/components/inventory/SearchableItemPicker";
import { SessionUser } from "@/lib/types";
import { batchDispatchToSite } from "@/actions/inventory";
import { DeliveryChallanData } from "@/components/inventory/DeliveryChallanModal";
import { cn, formatNumber } from "@/lib/utils";
import {
  challanHeaderSchema,
  componentItemValidationSchema,
  extraChallanRowValidationSchema,
} from "@/lib/validation";
import { AutocompleteInput, AutocompleteOption } from "@/components/common/AutocompleteInput";

interface WorkerOption {
  id: string;
  fullName: string;
  role: string;
}

interface ExtraChallanRow {
  rowId: string;
  itemId: string;
  quantity: number;
  sourceLocation: "GODOWN" | "OFFICE";
}

interface StandardChallanFormProps {
  catalogItems: CatalogItemOption[];
  workers: WorkerOption[];
  currentUser: SessionUser;
  customerSuggestions?: Array<{ name: string; phone?: string | null; address?: string | null }>;
  onSuccess: (
    processed: Array<{ itemId: string; quantity: number; sourceLocation?: "OFFICE" | "GODOWN" }>,
    challanData: DeliveryChallanData,
    message: string
  ) => void;
  onError: (msg: string) => void;
}

function StockAlert({
  item,
  currentSource,
  onSwitchSource,
}: {
  item: CatalogItemOption | undefined;
  currentSource: "GODOWN" | "OFFICE";
  onSwitchSource: (newSource: "GODOWN" | "OFFICE") => void;
}) {
  if (!item) return null;
  const currentStock = currentSource === "GODOWN" ? item.godownQty : item.officeQty;
  if (currentStock > 0) return null;

  const altSource = currentSource === "GODOWN" ? "OFFICE" : "GODOWN";
  const altStock = altSource === "GODOWN" ? item.godownQty : item.officeQty;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in">
      <div className="flex items-center gap-1.5 font-bold">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>
          Out of Stock in {currentSource === "GODOWN" ? "Main Godown" : "Office Hub"} (0 {item.unit} available)
        </span>
      </div>
      {altStock > 0 ? (
        <button
          type="button"
          onClick={() => onSwitchSource(altSource)}
          className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-extrabold text-[11px] self-start sm:self-auto shrink-0 shadow-2xs transition-colors flex items-center gap-1"
        >
          <span>Switch to {altSource === "GODOWN" ? "Godown" : "Office"} ({altStock} available)</span>
          <span>➔</span>
        </button>
      ) : (
        <span className="text-[10px] font-bold text-rose-600">
          (0 stock in both Godown &amp; Office)
        </span>
      )}
    </div>
  );
}

interface StandardComponentRowProps {
  title: string;
  icon: React.ReactNode;
  options: CatalogItemOption[];
  selectedItemId: string;
  onSelectItem: (id: string) => void;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
  source: "GODOWN" | "OFFICE";
  onChangeSource: (src: "GODOWN" | "OFFICE") => void;
  placeholder: string;
  clearLabel: string;
  fieldError?: string;
  badgeSlot?: React.ReactNode;
  getItem: (id: string) => CatalogItemOption | undefined;
}

function StandardComponentRow({
  title,
  icon,
  options,
  selectedItemId,
  onSelectItem,
  quantity,
  onChangeQuantity,
  source,
  onChangeSource,
  placeholder,
  clearLabel,
  fieldError,
  badgeSlot,
  getItem,
}: StandardComponentRowProps) {
  const currentItem = getItem(selectedItemId);
  const godownStock = currentItem?.godownQty ?? 0;
  const officeStock = currentItem?.officeQty ?? 0;
  const currentStock = source === "GODOWN" ? godownStock : officeStock;
  const hasZeroStock = selectedItemId && currentStock === 0;
  const hasStockDeficit = selectedItemId && quantity > currentStock;

  return (
    <div
      className={cn(
        "p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5",
        hasZeroStock || fieldError || hasStockDeficit
          ? "border-rose-300 bg-rose-50/20 ring-1 ring-rose-200"
          : "border-slate-200 bg-slate-50/70"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-extrabold text-xs sm:text-sm text-slate-900">{title}</span>
          {badgeSlot}
        </div>

        {/* Warehouse Origin Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
          <span className="text-[10px] font-bold text-slate-400 px-1">From:</span>
          <button
            type="button"
            onClick={() => onChangeSource("GODOWN")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all",
              source === "GODOWN"
                ? "bg-amber-500 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Warehouse className="w-3 h-3" />
            <span>Godown ({godownStock})</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeSource("OFFICE")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all",
              source === "OFFICE"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Building2 className="w-3 h-3" />
            <span>Office ({officeStock})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-start">
        <div className="sm:col-span-3">
          <SearchableItemPicker
            items={options}
            selectedItemId={selectedItemId}
            onSelect={(id) => {
              onSelectItem(id);
              if (id && quantity === 0) onChangeQuantity(1);
              const itm = getItem(id);
              if (itm) {
                if (source === "GODOWN" && itm.godownQty === 0 && itm.officeQty > 0) {
                  onChangeSource("OFFICE");
                } else if (source === "OFFICE" && itm.officeQty === 0 && itm.godownQty > 0) {
                  onChangeSource("GODOWN");
                }
              }
            }}
            sourceLocation={source}
            placeholder={placeholder}
            clearLabel={clearLabel}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => onChangeQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="Qty"
              disabled={!selectedItemId}
              className={cn(
                "w-full sm:w-28 px-3 py-2 rounded-xl border bg-white text-sm font-black font-mono text-center focus:outline-none transition-all disabled:opacity-40",
                fieldError || (selectedItemId && currentStock < quantity)
                  ? "border-rose-400 text-rose-700 bg-rose-50/50 ring-1 ring-rose-300"
                  : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              )}
            />
            <span className="text-xs font-bold text-slate-500 shrink-0">
              {currentItem?.unit || "NOS"}
            </span>
          </div>
          {fieldError && (
            <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{fieldError}</span>
            </p>
          )}
        </div>
      </div>

      <StockAlert item={currentItem} currentSource={source} onSwitchSource={onChangeSource} />
    </div>
  );
}

export function StandardChallanForm({
  catalogItems,
  workers,
  currentUser,
  customerSuggestions = [],
  onSuccess,
  onError,
}: StandardChallanFormProps) {
  const [loading, setLoading] = useState(false);

  // Field errors for Zod validation display
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Customer / Challan Header Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [workerId, setWorkerId] = useState(
    currentUser.role === "WORKER" ? currentUser.id : workers[0]?.id || ""
  );
  const [remarks, setRemarks] = useState("");

  // Customer Autocomplete Options
  const customerOptions: AutocompleteOption[] = useMemo(() => {
    return customerSuggestions.map((c) => ({
      label: c.name,
      subLabel: [c.phone, c.address].filter(Boolean).join(" • "),
      extraData: c,
    }));
  }, [customerSuggestions]);

  // Categorized Catalog Options
  const panelOptions = useMemo(
    () => catalogItems.filter((i) => i.category === "PANELS"),
    [catalogItems]
  );
  const inverterOptions = useMemo(
    () => catalogItems.filter((i) => i.category === "INVERTER"),
    [catalogItems]
  );
  const acdbOptions = useMemo(
    () =>
      catalogItems.filter(
        (i) =>
          i.name.toUpperCase().includes("ACDB") ||
          i.name.toUpperCase().includes("DCDB") ||
          i.name.toUpperCase().includes("COMBO")
      ),
    [catalogItems]
  );
  const earthingOptions = useMemo(
    () =>
      catalogItems.filter(
        (i) =>
          i.name.toUpperCase().includes("EA") ||
          i.name.toUpperCase().includes("EARTH") ||
          i.name.toUpperCase().includes("LA") ||
          i.name.toUpperCase().includes("ROD") ||
          i.name.toUpperCase().includes("HOOK")
      ),
    [catalogItems]
  );
  const foundationOptions = useMemo(
    () =>
      catalogItems.filter((i) =>
        i.name.toUpperCase().includes("FOUNDATION")
      ),
    [catalogItems]
  );
  const pvcOptions = useMemo(
    () =>
      catalogItems.filter(
        (i) =>
          i.category === "PVC_ITEMS" &&
          !acdbOptions.some((a) => a.id === i.id) &&
          !earthingOptions.some((e) => e.id === i.id) &&
          !foundationOptions.some((f) => f.id === i.id)
      ),
    [catalogItems, acdbOptions, earthingOptions, foundationOptions]
  );
  const structureOptions = useMemo(
    () => catalogItems.filter((i) => i.category === "STRUCTURE"),
    [catalogItems]
  );
  const cableOptions = useMemo(
    () => catalogItems.filter((i) => i.category === "CABLES"),
    [catalogItems]
  );

  // 1. Solar Panels
  const [panelItemId, setPanelItemId] = useState<string>("");
  const [panelQty, setPanelQty] = useState<number>(6);
  const [panelSource, setPanelSource] = useState<"GODOWN" | "OFFICE">("GODOWN");
  const [panelDcr, setPanelDcr] = useState<"DCR" | "NDCR" | "">("DCR");

  // 2. Inverter
  const [inverterItemId, setInverterItemId] = useState<string>("");
  const [inverterQty, setInverterQty] = useState<number>(1);
  const [inverterSource, setInverterSource] = useState<"GODOWN" | "OFFICE">("OFFICE");

  // 3. ACDB / DCDB Box
  const [acdbItemId, setAcdbItemId] = useState<string>("");
  const [acdbQty, setAcdbQty] = useState<number>(1);
  const [acdbSource, setAcdbSource] = useState<"GODOWN" | "OFFICE">("OFFICE");

  // 4. Earthing Kit & Rods
  const [earthingItemId, setEarthingItemId] = useState<string>("");
  const [earthingQty, setEarthingQty] = useState<number>(1);
  const [earthingSource, setEarthingSource] = useState<"GODOWN" | "OFFICE">("OFFICE");

  // 5. Foundation Kit & Farma
  const [foundationItemId, setFoundationItemId] = useState<string>("");
  const [foundationQty, setFoundationQty] = useState<number>(0);
  const [foundationSource, setFoundationSource] = useState<"GODOWN" | "OFFICE">("GODOWN");

  // 6. PVC Pipes & Conduit BOS Accessories
  const [pvcItemId, setPvcItemId] = useState<string>("");
  const [pvcQty, setPvcQty] = useState<number>(13);
  const [pvcSource, setPvcSource] = useState<"GODOWN" | "OFFICE">("OFFICE");

  // 7. Mounting Structure Hardware
  const [structureItemId, setStructureItemId] = useState<string>("");
  const [structureQty, setStructureQty] = useState<number>(0);
  const [structureSource, setStructureSource] = useState<"GODOWN" | "OFFICE">("GODOWN");

  // 8. Solar & AC Cables
  const [cableItemId, setCableItemId] = useState<string>("");
  const [cableQty, setCableQty] = useState<number>(0);
  const [cableSource, setCableSource] = useState<"GODOWN" | "OFFICE">("OFFICE");

  // 9. Extra Custom Items
  const [extraRows, setExtraRows] = useState<ExtraChallanRow[]>([]);

  // Helper to look up catalog item by ID
  const getItem = (id: string) => catalogItems.find((c) => c.id === id);

  // Auto-initialize first choices with available stock if possible
  useEffect(() => {
    if (!panelItemId && panelOptions.length > 0) {
      const match = panelOptions.find((p) => p.godownQty > 0 || p.officeQty > 0) || panelOptions[0];
      setPanelItemId(match.id);
      if (match.godownQty > 0) setPanelSource("GODOWN");
      else if (match.officeQty > 0) setPanelSource("OFFICE");
    }
    if (!inverterItemId && inverterOptions.length > 0) {
      const match = inverterOptions.find((p) => p.godownQty > 0 || p.officeQty > 0) || inverterOptions[0];
      setInverterItemId(match.id);
      if (match.godownQty > 0) setInverterSource("GODOWN");
      else if (match.officeQty > 0) setInverterSource("OFFICE");
    }
    if (!acdbItemId && acdbOptions.length > 0) {
      const match = acdbOptions.find((p) => p.godownQty > 0 || p.officeQty > 0) || acdbOptions[0];
      setAcdbItemId(match.id);
      if (match.godownQty > 0) setAcdbSource("GODOWN");
      else if (match.officeQty > 0) setAcdbSource("OFFICE");
    }
    if (!earthingItemId && earthingOptions.length > 0) {
      const match = earthingOptions.find((p) => p.godownQty > 0 || p.officeQty > 0) || earthingOptions[0];
      setEarthingItemId(match.id);
      if (match.godownQty > 0) setEarthingSource("GODOWN");
      else if (match.officeQty > 0) setEarthingSource("OFFICE");
    }
    if (!foundationItemId && foundationOptions.length > 0) {
      const match = foundationOptions.find((p) => p.godownQty > 0 || p.officeQty > 0) || foundationOptions[0];
      setFoundationItemId(match.id);
      if (match.godownQty > 0) setFoundationSource("GODOWN");
      else if (match.officeQty > 0) setFoundationSource("OFFICE");
    }
    if (!pvcItemId && pvcOptions.length > 0) {
      const match = pvcOptions.find((p) => p.godownQty > 0 || p.officeQty > 0) || pvcOptions[0];
      setPvcItemId(match.id);
      if (match.godownQty > 0) setPvcSource("GODOWN");
      else if (match.officeQty > 0) setPvcSource("OFFICE");
    }
    if (!structureItemId && structureOptions.length > 0) {
      const match = structureOptions.find((p) => p.godownQty > 0 || p.officeQty > 0) || structureOptions[0];
      setStructureItemId(match.id);
      if (match.godownQty > 0) setStructureSource("GODOWN");
      else if (match.officeQty > 0) setStructureSource("OFFICE");
    }
    if (!cableItemId && cableOptions.length > 0) {
      const match = cableOptions.find((p) => p.godownQty > 0 || p.officeQty > 0) || cableOptions[0];
      setCableItemId(match.id);
      if (match.godownQty > 0) setCableSource("GODOWN");
      else if (match.officeQty > 0) setCableSource("OFFICE");
    }
  }, [
    panelOptions,
    inverterOptions,
    acdbOptions,
    earthingOptions,
    foundationOptions,
    pvcOptions,
    structureOptions,
    cableOptions,
    panelItemId,
    inverterItemId,
    acdbItemId,
    earthingItemId,
    foundationItemId,
    pvcItemId,
    structureItemId,
    cableItemId,
  ]);

  // Active items being dispatched
  const activeItemsList = useMemo(() => {
    const list: Array<{
      item: CatalogItemOption;
      quantity: number;
      sourceLocation: "GODOWN" | "OFFICE";
      labelCategory: string;
    }> = [];

    if (panelItemId && panelQty > 0) {
      const itm = getItem(panelItemId);
      if (itm) list.push({ item: itm, quantity: panelQty, sourceLocation: panelSource, labelCategory: "Solar Panels" });
    }
    if (inverterItemId && inverterQty > 0) {
      const itm = getItem(inverterItemId);
      if (itm) list.push({ item: itm, quantity: inverterQty, sourceLocation: inverterSource, labelCategory: "Inverter" });
    }
    if (acdbItemId && acdbQty > 0) {
      const itm = getItem(acdbItemId);
      if (itm) list.push({ item: itm, quantity: acdbQty, sourceLocation: acdbSource, labelCategory: "ACDB - DCDB Box" });
    }
    if (earthingItemId && earthingQty > 0) {
      const itm = getItem(earthingItemId);
      if (itm) list.push({ item: itm, quantity: earthingQty, sourceLocation: earthingSource, labelCategory: "Earthing Kit" });
    }
    if (foundationItemId && foundationQty > 0) {
      const itm = getItem(foundationItemId);
      if (itm) list.push({ item: itm, quantity: foundationQty, sourceLocation: foundationSource, labelCategory: "Foundation" });
    }
    if (pvcItemId && pvcQty > 0) {
      const itm = getItem(pvcItemId);
      if (itm) list.push({ item: itm, quantity: pvcQty, sourceLocation: pvcSource, labelCategory: "PVC Items" });
    }
    if (structureItemId && structureQty > 0) {
      const itm = getItem(structureItemId);
      if (itm) list.push({ item: itm, quantity: structureQty, sourceLocation: structureSource, labelCategory: "Structure" });
    }
    if (cableItemId && cableQty > 0) {
      const itm = getItem(cableItemId);
      if (itm) list.push({ item: itm, quantity: cableQty, sourceLocation: cableSource, labelCategory: "Cables" });
    }
    for (const extra of extraRows) {
      if (extra.itemId && extra.quantity > 0) {
        const itm = getItem(extra.itemId);
        if (itm) list.push({ item: itm, quantity: extra.quantity, sourceLocation: extra.sourceLocation, labelCategory: itm.category });
      }
    }
    return list;
  }, [
    panelItemId,
    panelQty,
    panelSource,
    inverterItemId,
    inverterQty,
    inverterSource,
    acdbItemId,
    acdbQty,
    acdbSource,
    earthingItemId,
    earthingQty,
    earthingSource,
    foundationItemId,
    foundationQty,
    foundationSource,
    pvcItemId,
    pvcQty,
    pvcSource,
    structureItemId,
    structureQty,
    structureSource,
    cableItemId,
    cableQty,
    cableSource,
    extraRows,
    catalogItems,
  ]);

  // Warehouse breakdown calculation
  const godownCount = activeItemsList.filter((i) => i.sourceLocation === "GODOWN").length;
  const officeCount = activeItemsList.filter((i) => i.sourceLocation === "OFFICE").length;
  const totalUnits = activeItemsList.reduce((acc, curr) => acc + curr.quantity, 0);

  // Check for any stock violations (including 0 stock)
  const stockErrors = useMemo(() => {
    const errors: string[] = [];
    for (const entry of activeItemsList) {
      const available =
        entry.sourceLocation === "GODOWN" ? entry.item.godownQty : entry.item.officeQty;
      if (available <= 0) {
        errors.push(
          `⚠️ ${entry.item.name}: Stock is 0 in ${entry.sourceLocation === "GODOWN" ? "Main Godown" : "Office Hub"}. Cannot dispatch.`
        );
      } else if (entry.quantity > available) {
        errors.push(
          `⚠️ ${entry.item.name}: Requested ${entry.quantity} ${entry.item.unit}, but only ${available} available in ${entry.sourceLocation === "GODOWN" ? "Godown" : "Office"} stock.`
        );
      }
    }
    return errors;
  }, [activeItemsList]);

  const handleAddExtraRow = () => {
    setExtraRows((prev) => [
      ...prev,
      {
        rowId: Math.random().toString(36).substring(2, 9),
        itemId: "",
        quantity: 1,
        sourceLocation: "GODOWN",
      },
    ]);
  };

  const handleRemoveExtraRow = (rowId: string) => {
    setExtraRows((prev) => prev.filter((r) => r.rowId !== rowId));
    clearFieldError(`extra_${rowId}_item`);
    clearFieldError(`extra_${rowId}_qty`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // 1. Zod Header Validation
    const headerResult = challanHeaderSchema.safeParse({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      challanNo: challanNo.trim() || undefined,
      workerId: workerId.trim(),
      remarks: remarks.trim() || undefined,
    });

    if (!headerResult.success) {
      const flattened = headerResult.error.flatten();
      for (const [key, msgs] of Object.entries(flattened.fieldErrors)) {
        if (msgs && msgs[0]) {
          newErrors[key] = msgs[0];
        }
      }
    }

    // 2. Validate Component Rows using Zod schema
    const componentsToValidate = [
      { key: "panelQty", id: panelItemId, qty: panelQty, source: panelSource, name: "Solar Panels" },
      { key: "inverterQty", id: inverterItemId, qty: inverterQty, source: inverterSource, name: "Inverter" },
      { key: "acdbQty", id: acdbItemId, qty: acdbQty, source: acdbSource, name: "ACDB / DCDB Box" },
      { key: "earthingQty", id: earthingItemId, qty: earthingQty, source: earthingSource, name: "Earthing Kit" },
      { key: "foundationQty", id: foundationItemId, qty: foundationQty, source: foundationSource, name: "Foundation Kit" },
      { key: "pvcQty", id: pvcItemId, qty: pvcQty, source: pvcSource, name: "PVC Items" },
      { key: "structureQty", id: structureItemId, qty: structureQty, source: structureSource, name: "Structure" },
      { key: "cableQty", id: cableItemId, qty: cableQty, source: cableSource, name: "Cables" },
    ];

    for (const comp of componentsToValidate) {
      if (comp.qty > 0) {
        const itm = getItem(comp.id);
        const available = itm ? (comp.source === "GODOWN" ? itm.godownQty : itm.officeQty) : 0;
        const res = componentItemValidationSchema.safeParse({
          itemId: comp.id,
          quantity: comp.qty,
          availableStock: available,
          locationName: comp.source === "GODOWN" ? "Main Godown" : "Office Hub",
          itemName: itm?.name,
        });
        if (!res.success) {
          const flattened = res.error.flatten();
          const err = flattened.fieldErrors.quantity?.[0] || flattened.fieldErrors.itemId?.[0];
          if (err) newErrors[comp.key] = err;
        }
      }
    }

    // 3. Validate Extra Rows using Zod schema
    for (const extra of extraRows) {
      const itm = getItem(extra.itemId);
      const available = itm ? (extra.sourceLocation === "GODOWN" ? itm.godownQty : itm.officeQty) : 0;
      const res = extraChallanRowValidationSchema.safeParse({
        rowId: extra.rowId,
        itemId: extra.itemId,
        quantity: extra.quantity,
        availableStock: available,
        locationName: extra.sourceLocation === "GODOWN" ? "Main Godown" : "Office Hub",
      });
      if (!res.success) {
        const flattened = res.error.flatten();
        if (flattened.fieldErrors.itemId?.[0]) {
          newErrors[`extra_${extra.rowId}_item`] = flattened.fieldErrors.itemId[0];
        }
        if (flattened.fieldErrors.quantity?.[0]) {
          newErrors[`extra_${extra.rowId}_qty`] = flattened.fieldErrors.quantity[0];
        }
      }
    }

    // 4. Form-level check: At least 1 item > 0
    if (activeItemsList.length === 0) {
      newErrors.general = "Please specify at least one component with quantity greater than 0 to dispatch.";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      const firstErrMsg = Object.values(newErrors)[0];
      onError(firstErrMsg);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    const payload = {
      items: activeItemsList.map((entry) => ({
        itemId: entry.item.id,
        quantity: entry.quantity,
        sourceLocation: entry.sourceLocation,
      })),
      siteOrCustomer: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      workerId: workerId || undefined,
      docNo: challanNo.trim() || undefined,
      remarks: remarks.trim() || undefined,
    };

    const res = await batchDispatchToSite(payload);
    setLoading(false);

    if (res.success) {
      const workerObj = workers.find((w) => w.id === workerId);
      const challanInfo: DeliveryChallanData = {
        challanNo: challanNo.trim() || `DSP-${Date.now().toString().slice(-4)}`,
        date: new Date(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        customerAddress: customerAddress.trim() || null,
        technicianName: workerObj?.fullName || null,
        dispatchedByName: currentUser.fullName,
        items: activeItemsList.map((entry) => ({
          name: `${entry.item.name}${entry.labelCategory === "Solar Panels" && panelDcr ? ` (${panelDcr})` : ""}`,
          category: `${entry.labelCategory} [From ${entry.sourceLocation}]`,
          quantity: entry.quantity,
          unit: entry.item.unit,
        })),
        remarks: remarks.trim() || null,
        sourceLocation:
          godownCount > 0 && officeCount > 0
            ? "Mixed (Godown & Office)"
            : godownCount > 0
            ? "Main Godown"
            : "Office Hub",
      };

      onSuccess(
        payload.items,
        challanInfo,
        res.message || `Delivery Challan processed successfully for ${customerName.trim()}.`
      );

      // Reset form fields
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setChallanNo("");
      setRemarks("");
      setExtraRows([]);
      setFieldErrors({});
    } else {
      onError(res.error || "Failed to process delivery challan.");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
      {/* SECTION 1: CUSTOMER & CHALLAN HEADER DETAILS */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Step 1: Delivery Challan Header Details
            </h3>
          </div>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 self-start sm:self-auto">
            Matches Physical Paper Challan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Customer Name <span className="text-amber-500">*</span>
            </label>
            <AutocompleteInput
              value={customerName}
              onChange={(val) => {
                setCustomerName(val);
                clearFieldError("customerName");
              }}
              onSelectOption={(opt) => {
                clearFieldError("customerName");
                if (opt.extraData?.phone) {
                  setCustomerPhone(opt.extraData.phone);
                  clearFieldError("customerPhone");
                }
                if (opt.extraData?.address) {
                  setCustomerAddress(opt.extraData.address);
                  clearFieldError("customerAddress");
                }
              }}
              options={customerOptions}
              placeholder="e.g. મહેશ અમરસિંહ પસીયા (Mahesh Amarsinh Pasiya)"
              dropdownTitle="Saved Customers from Database"
              leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
              hasError={!!fieldErrors.customerName}
              inputClassName={cn(
                fieldErrors.customerName
                  ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              )}
            />
            {fieldErrors.customerName && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{fieldErrors.customerName}</span>
              </p>
            )}
          </div>

          {/* Customer Mobile */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Customer Mobile No.
            </label>
            <div className="relative">
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  clearFieldError("customerPhone");
                }}
                placeholder="e.g. 8160275552"
                className={cn(
                  "w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white text-sm font-mono focus:outline-none transition-all",
                  fieldErrors.customerPhone
                    ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                    : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                )}
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            {fieldErrors.customerPhone && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{fieldErrors.customerPhone}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Site / Delivery Address */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Site / Delivery Address
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => {
                setCustomerAddress(e.target.value);
                clearFieldError("customerAddress");
              }}
              placeholder="e.g. ઓપ. પ્લોટ નં. 2369, રાજપુતવાડા, ઘોઘા"
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm focus:outline-none transition-all",
                fieldErrors.customerAddress
                  ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              )}
            />
            {fieldErrors.customerAddress && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{fieldErrors.customerAddress}</span>
              </p>
            )}
          </div>

          {/* Challan No. */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Challan No.
            </label>
            <div className="relative">
              <input
                type="text"
                value={challanNo}
                onChange={(e) => {
                  setChallanNo(e.target.value);
                  clearFieldError("challanNo");
                }}
                placeholder="e.g. 456"
                className={cn(
                  "w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white text-sm font-mono font-black text-red-600 focus:outline-none transition-all",
                  fieldErrors.challanNo
                    ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                    : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                )}
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            {fieldErrors.challanNo && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{fieldErrors.challanNo}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Assigned Technician */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Assigned Solar Technician <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <select
                value={workerId}
                onChange={(e) => {
                  setWorkerId(e.target.value);
                  clearFieldError("workerId");
                }}
                className={cn(
                  "w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white text-sm focus:outline-none transition-all",
                  fieldErrors.workerId
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
            {fieldErrors.workerId && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{fieldErrors.workerId}</span>
              </p>
            )}
          </div>

          {/* Today's Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Dispatch Date
            </label>
            <input
              type="text"
              readOnly
              value={new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-600 cursor-not-allowed select-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: STANDARDIZED PARTICULARS TABLE (ALL 8 COMPONENT ROWS) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-amber-600" />
              <span>Step 2: Component Particulars & Stock Allocation</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select model &amp; choose whether each item comes from <strong>Godown Warehouse</strong> or <strong>Office Hub</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 self-start sm:self-auto">
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              <Warehouse className="w-3.5 h-3.5 text-amber-600" /> Godown
            </span>
            <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              <Building2 className="w-3.5 h-3.5 text-blue-600" /> Office
            </span>
          </div>
        </div>

        {/* 1. SOLAR PANELS ROW */}
        <StandardComponentRow
          title="1. Solar Panels"
          icon={<Sun className="w-4 h-4 text-amber-500 shrink-0" />}
          options={panelOptions}
          selectedItemId={panelItemId}
          onSelectItem={(id) => {
            setPanelItemId(id);
            clearFieldError("panelQty");
          }}
          quantity={panelQty}
          onChangeQuantity={(q) => {
            setPanelQty(q);
            clearFieldError("panelQty");
          }}
          source={panelSource}
          onChangeSource={(s) => {
            setPanelSource(s);
            clearFieldError("panelQty");
          }}
          placeholder="🔍 Search & select Solar Panel model..."
          clearLabel="-- Do not dispatch Solar Panels --"
          fieldError={fieldErrors.panelQty}
          getItem={getItem}
          badgeSlot={
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => setPanelDcr(panelDcr === "DCR" ? "" : "DCR")}
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all",
                  panelDcr === "DCR"
                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                DCR
              </button>
              <button
                type="button"
                onClick={() => setPanelDcr(panelDcr === "NDCR" ? "" : "NDCR")}
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all",
                  panelDcr === "NDCR"
                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                NDCR
              </button>
            </div>
          }
        />

        {/* 2. INVERTER ROW */}
        <StandardComponentRow
          title="2. Inverter"
          icon={<Zap className="w-4 h-4 text-purple-600 shrink-0" />}
          options={inverterOptions}
          selectedItemId={inverterItemId}
          onSelectItem={(id) => {
            setInverterItemId(id);
            clearFieldError("inverterQty");
          }}
          quantity={inverterQty}
          onChangeQuantity={(q) => {
            setInverterQty(q);
            clearFieldError("inverterQty");
          }}
          source={inverterSource}
          onChangeSource={(s) => {
            setInverterSource(s);
            clearFieldError("inverterQty");
          }}
          placeholder="🔍 Search & select Inverter model..."
          clearLabel="-- Do not dispatch Inverter --"
          fieldError={fieldErrors.inverterQty}
          getItem={getItem}
        />

        {/* 3. ACDB - DCDB BOX ROW */}
        <StandardComponentRow
          title="3. ACDB - DCDB Box"
          icon={<Layers className="w-4 h-4 text-emerald-600 shrink-0" />}
          options={acdbOptions}
          selectedItemId={acdbItemId}
          onSelectItem={(id) => {
            setAcdbItemId(id);
            clearFieldError("acdbQty");
          }}
          quantity={acdbQty}
          onChangeQuantity={(q) => {
            setAcdbQty(q);
            clearFieldError("acdbQty");
          }}
          source={acdbSource}
          onChangeSource={(s) => {
            setAcdbSource(s);
            clearFieldError("acdbQty");
          }}
          placeholder="🔍 Search & select ACDB / DCDB Box model..."
          clearLabel="-- Do not dispatch ACDB / DCDB Box --"
          fieldError={fieldErrors.acdbQty}
          getItem={getItem}
        />

        {/* 4. EARTHING KIT & RODS ROW */}
        <StandardComponentRow
          title="4. Earthing Kit & Rods"
          icon={<Shield className="w-4 h-4 text-amber-600 shrink-0" />}
          options={earthingOptions}
          selectedItemId={earthingItemId}
          onSelectItem={(id) => {
            setEarthingItemId(id);
            clearFieldError("earthingQty");
          }}
          quantity={earthingQty}
          onChangeQuantity={(q) => {
            setEarthingQty(q);
            clearFieldError("earthingQty");
          }}
          source={earthingSource}
          onChangeSource={(s) => {
            setEarthingSource(s);
            clearFieldError("earthingQty");
          }}
          placeholder="🔍 Search & select Earthing Kit / Chemical / Rod / LA..."
          clearLabel="-- Do not dispatch Earthing Kit --"
          fieldError={fieldErrors.earthingQty}
          getItem={getItem}
        />

        {/* 5. FOUNDATION KIT & FARMA ROW */}
        <StandardComponentRow
          title="5. Foundation Kit & Farma"
          icon={<Building2 className="w-4 h-4 text-slate-600 shrink-0" />}
          options={foundationOptions}
          selectedItemId={foundationItemId}
          onSelectItem={(id) => {
            setFoundationItemId(id);
            clearFieldError("foundationQty");
          }}
          quantity={foundationQty}
          onChangeQuantity={(q) => {
            setFoundationQty(q);
            clearFieldError("foundationQty");
          }}
          source={foundationSource}
          onChangeSource={(s) => {
            setFoundationSource(s);
            clearFieldError("foundationQty");
          }}
          placeholder="🔍 Search Foundation kit / Farma components..."
          clearLabel="-- Do not dispatch Foundation Kit --"
          fieldError={fieldErrors.foundationQty}
          getItem={getItem}
        />

        {/* 6. PVC PIPES & CONDUIT BOS ROW */}
        <StandardComponentRow
          title="6. PVC Pipes & Conduit BOS Accessories"
          icon={<Grid className="w-4 h-4 text-cyan-600 shrink-0" />}
          options={pvcOptions}
          selectedItemId={pvcItemId}
          onSelectItem={(id) => {
            setPvcItemId(id);
            clearFieldError("pvcQty");
          }}
          quantity={pvcQty}
          onChangeQuantity={(q) => {
            setPvcQty(q);
            clearFieldError("pvcQty");
          }}
          source={pvcSource}
          onChangeSource={(s) => {
            setPvcSource(s);
            clearFieldError("pvcQty");
          }}
          placeholder="🔍 Search PVC Pipe, Bend, Saddle, Glend, Lugs..."
          clearLabel="-- Do not dispatch PVC Items --"
          fieldError={fieldErrors.pvcQty}
          getItem={getItem}
        />

        {/* 7. MOUNTING STRUCTURE HARDWARE ROW */}
        <StandardComponentRow
          title="7. Mounting Structure Hardware"
          icon={<Warehouse className="w-4 h-4 text-indigo-600 shrink-0" />}
          options={structureOptions}
          selectedItemId={structureItemId}
          onSelectItem={(id) => {
            setStructureItemId(id);
            clearFieldError("structureQty");
          }}
          quantity={structureQty}
          onChangeQuantity={(q) => {
            setStructureQty(q);
            clearFieldError("structureQty");
          }}
          source={structureSource}
          onChangeSource={(s) => {
            setStructureSource(s);
            clearFieldError("structureQty");
          }}
          placeholder="🔍 Search Structure rails, clamps, legs, channels..."
          clearLabel="-- Do not dispatch Structure Items --"
          fieldError={fieldErrors.structureQty}
          getItem={getItem}
        />

        {/* 8. SOLAR & AC CABLES ROW */}
        <StandardComponentRow
          title="8. Solar & AC Cables"
          icon={<Cable className="w-4 h-4 text-rose-600 shrink-0" />}
          options={cableOptions}
          selectedItemId={cableItemId}
          onSelectItem={(id) => {
            setCableItemId(id);
            clearFieldError("cableQty");
          }}
          quantity={cableQty}
          onChangeQuantity={(q) => {
            setCableQty(q);
            clearFieldError("cableQty");
          }}
          source={cableSource}
          onChangeSource={(s) => {
            setCableSource(s);
            clearFieldError("cableQty");
          }}
          placeholder="🔍 Search DC Solar Cable 4sqmm, 6sqmm, AC 4C Cables..."
          clearLabel="-- Do not dispatch Cables --"
          fieldError={fieldErrors.cableQty}
          getItem={getItem}
        />

        {/* EXTRA CUSTOM ROWS SECTION */}
        {extraRows.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Additional Custom Materials Added to Challan:</span>
              <span className="text-[11px] font-bold text-amber-600">
                {extraRows.length} Custom Row{extraRows.length > 1 ? "s" : ""}
              </span>
            </div>

            {extraRows.map((extra, idx) => {
              const currentItem = getItem(extra.itemId);
              const extraStock =
                extra.sourceLocation === "GODOWN"
                  ? currentItem?.godownQty ?? 0
                  : currentItem?.officeQty ?? 0;
              const itemError = fieldErrors[`extra_${extra.rowId}_item`];
              const qtyError = fieldErrors[`extra_${extra.rowId}_qty`];

              return (
                <div
                  key={extra.rowId}
                  className={cn(
                    "p-3.5 rounded-2xl border space-y-2.5 transition-all",
                    itemError || qtyError || (extra.itemId && extraStock < extra.quantity)
                      ? "border-rose-300 bg-rose-50/20 ring-1 ring-rose-200"
                      : "border-slate-200 bg-slate-50/70"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-extrabold text-xs text-slate-700">
                      Extra #{idx + 1}
                    </span>

                    {/* Origin switch */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
                      <span className="text-[10px] font-bold text-slate-400 px-1">From:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setExtraRows((prev) =>
                            prev.map((r) =>
                              r.rowId === extra.rowId ? { ...r, sourceLocation: "GODOWN" } : r
                            )
                          );
                          clearFieldError(`extra_${extra.rowId}_qty`);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all",
                          extra.sourceLocation === "GODOWN"
                            ? "bg-amber-500 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        <Warehouse className="w-3 h-3" />
                        <span>Godown ({currentItem?.godownQty ?? 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExtraRows((prev) =>
                            prev.map((r) =>
                              r.rowId === extra.rowId ? { ...r, sourceLocation: "OFFICE" } : r
                            )
                          );
                          clearFieldError(`extra_${extra.rowId}_qty`);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all",
                          extra.sourceLocation === "OFFICE"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        <Building2 className="w-3 h-3" />
                        <span>Office ({currentItem?.officeQty ?? 0})</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-start">
                    <div className="sm:col-span-3">
                      <SearchableItemPicker
                        items={catalogItems}
                        selectedItemId={extra.itemId}
                        onSelect={(id) => {
                          setExtraRows((prev) =>
                            prev.map((r) => (r.rowId === extra.rowId ? { ...r, itemId: id } : r))
                          );
                          clearFieldError(`extra_${extra.rowId}_item`);
                          clearFieldError(`extra_${extra.rowId}_qty`);
                          const itm = getItem(id);
                          if (itm) {
                            if (extra.sourceLocation === "GODOWN" && itm.godownQty === 0 && itm.officeQty > 0) {
                              setExtraRows((prev) =>
                                prev.map((r) =>
                                  r.rowId === extra.rowId ? { ...r, sourceLocation: "OFFICE" } : r
                                )
                              );
                            } else if (extra.sourceLocation === "OFFICE" && itm.officeQty === 0 && itm.godownQty > 0) {
                              setExtraRows((prev) =>
                                prev.map((r) =>
                                  r.rowId === extra.rowId ? { ...r, sourceLocation: "GODOWN" } : r
                                )
                              );
                            }
                          }
                        }}
                        sourceLocation={extra.sourceLocation}
                        allowClear={true}
                        clearLabel="-- Clear Item --"
                        placeholder="🔍 Search Material / Cable / Fastener (Use Category Tabs above)..."
                      />
                      {itemError && (
                        <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{itemError}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={extra.quantity}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setExtraRows((prev) =>
                              prev.map((r) => (r.rowId === extra.rowId ? { ...r, quantity: val } : r))
                            );
                            clearFieldError(`extra_${extra.rowId}_qty`);
                          }}
                          className={cn(
                            "w-full sm:w-24 px-2 py-2 rounded-xl border text-center font-mono font-bold text-xs bg-white focus:outline-none transition-all",
                            qtyError || (extra.itemId && extraStock < extra.quantity)
                              ? "border-rose-400 text-rose-700 bg-rose-50/50 ring-1 ring-rose-300"
                              : "border-slate-200 focus:border-amber-500"
                          )}
                        />
                        <span className="text-xs font-bold text-slate-500 shrink-0">
                          {currentItem?.unit || "NOS"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraRow(extra.rowId)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                          title="Remove Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {qtyError && (
                        <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{qtyError}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <StockAlert
                    item={currentItem}
                    currentSource={extra.sourceLocation}
                    onSwitchSource={(newSrc) => {
                      setExtraRows((prev) =>
                        prev.map((r) =>
                          r.rowId === extra.rowId ? { ...r, sourceLocation: newSrc } : r
                        )
                      );
                      clearFieldError(`extra_${extra.rowId}_qty`);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Add Extra Item Button */}
        <div>
          <button
            type="button"
            onClick={handleAddExtraRow}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Structure / Cable / Other Material to Challan</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: NOTES & LIVE STOCK ALLOCATION SUMMARY */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        {/* Remarks / Field Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Field Notes / Remarks (Written on Challan Slip)
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              clearFieldError("remarks");
            }}
            placeholder="e.g. 6 ફુટ પાઇપ વધેલો છે (60x40) પછી લાવવો"
            className={cn(
              "w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm focus:outline-none transition-all",
              fieldErrors.remarks
                ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
                : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            )}
          />
          {fieldErrors.remarks && (
            <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{fieldErrors.remarks}</span>
            </p>
          )}
        </div>

        {/* Stock Breakdown Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
          <div className="font-extrabold text-slate-900 flex items-center justify-between">
            <span>Live Stock Allocation Summary:</span>
            <span className="font-mono text-amber-700 font-bold">
              Total {activeItemsList.length} Items ({formatNumber(totalUnits)} Units)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-900 font-bold">
                <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                <span>Godown Warehouse Deduction:</span>
              </span>
              <span className="font-mono font-black text-amber-800">
                {godownCount} Component{godownCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-900 font-bold">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Office Hub Deduction:</span>
              </span>
              <span className="font-mono font-black text-blue-800">
                {officeCount} Component{officeCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {stockErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-start gap-2 mt-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {stockErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* General Form Error Banner if no items or overall failure */}
        {fieldErrors.general && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{fieldErrors.general}</span>
          </div>
        )}

        {/* Submit & Generate Slip Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 touch-target"
        >
          {loading ? (
            <span>Processing Dispatch &amp; Deducting Warehouse Stock...</span>
          ) : (
            <>
              <Truck className="w-5 h-5 shrink-0" />
              <span>Confirm Dispatch &amp; Generate Delivery Challan Voucher</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
