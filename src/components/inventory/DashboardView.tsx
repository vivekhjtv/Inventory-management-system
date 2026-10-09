"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  AlertTriangle,
  Warehouse,
  Building2,
  Boxes,
  ArrowDownToLine,
  ArrowRightLeft,
  Truck,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  Package,
  Layers,
  Sparkles,
  MapPin,
  UserCheck,
  Calendar,
  FileText,
  Clock,
  ListFilter,
  BarChart3,
} from "lucide-react";
import { CATEGORIES, SessionUser, DispatchedRecord } from "@/lib/types";
import { cn, formatNumber, exportToCSV } from "@/lib/utils";
import { getRolePermissions } from "@/lib/permissions";

interface DashboardItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  minThreshold: number | null;
  godownQty: number;
  officeQty: number;
  totalQty: number;
}

interface DashboardViewProps {
  items: DashboardItem[];
  dispatches?: DispatchedRecord[];
  user: SessionUser;
  initialTab?: "ALL" | "GODOWN" | "OFFICE" | "DISPATCH";
  stats: {
    totalItems: number;
    totalGodownStock: number;
    totalOfficeStock: number;
    lowStockCount: number;
    todayMovementsCount: number;
    totalDispatchedQty?: number;
    totalDispatchesCount?: number;
  };
}

type SortField =
  | "name"
  | "category"
  | "godownQty"
  | "officeQty"
  | "totalQty"
  | "date"
  | "site"
  | "quantity";
type SortOrder = "asc" | "desc";
type LocationTab = "ALL" | "GODOWN" | "OFFICE" | "DISPATCH";
type DispatchViewMode = "LOG" | "SUMMARY_BY_ITEM";

export function DashboardView({
  items,
  dispatches = [],
  user,
  initialTab = "ALL",
  stats,
}: DashboardViewProps) {
  const perms = getRolePermissions(user.role, user.status);

  // Active Location View Tab: ALL, GODOWN, OFFICE, or DISPATCH
  const [activeLocation, setActiveLocation] = useState<LocationTab>(initialTab);

  // For Dispatched view: individual job events vs aggregated per-item totals
  const [dispatchViewMode, setDispatchViewMode] = useState<DispatchViewMode>("LOG");

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Mobile accordions state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    PANELS: true,
    INVERTER: true,
    CABLES: false,
    PVC_ITEMS: false,
    STRUCTURE: false,
    OTHER: false,
  });

  const toggleCategory = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  // Reset to page 1 whenever any filter or location view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, activeLocation, onlyLowStock, pageSize, dispatchViewMode]);

  // Handle Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // 1. Filter & Sort Inventory Items (Used for ALL, GODOWN, and OFFICE views)
  const processedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;

      // Location specific stock logic
      let relevantQty = item.totalQty;
      if (activeLocation === "GODOWN") relevantQty = item.godownQty;
      if (activeLocation === "OFFICE") relevantQty = item.officeQty;

      const isLowStock =
        item.minThreshold !== null &&
        item.minThreshold > 0 &&
        relevantQty <= item.minThreshold;

      const matchesLowStock = !onlyLowStock || isLowStock;

      return matchesSearch && matchesCategory && matchesLowStock;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (typeof valA === "string") {
        const cmp = valA.localeCompare(valB);
        return sortOrder === "asc" ? cmp : -cmp;
      } else {
        return sortOrder === "asc" ? (valA ?? 0) - (valB ?? 0) : (valB ?? 0) - (valA ?? 0);
      }
    });
  }, [items, search, selectedCategory, activeLocation, onlyLowStock, sortField, sortOrder]);

  // 2. Filter & Sort Dispatched Transactions (Used for DISPATCH view: LOG mode)
  const processedDispatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = dispatches.filter((d) => {
      const matchesSearch =
        q === "" ||
        d.itemName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.siteOrCustomer.toLowerCase().includes(q) ||
        (d.referenceDocNo || "").toLowerCase().includes(q) ||
        (d.workerName || "").toLowerCase().includes(q) ||
        (d.remarks || "").toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "ALL" || d.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      if (sortField === "date") {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "site") {
        const cmp = a.siteOrCustomer.localeCompare(b.siteOrCustomer);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      if (sortField === "quantity") {
        return sortOrder === "asc" ? a.quantity - b.quantity : b.quantity - a.quantity;
      }
      if (sortField === "category") {
        const cmp = a.category.localeCompare(b.category);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      // default name
      const cmp = a.itemName.localeCompare(b.itemName);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [dispatches, search, selectedCategory, sortField, sortOrder]);

  // 3. Aggregate Dispatched Totals by Item (Used for DISPATCH view: SUMMARY_BY_ITEM mode)
  const dispatchedSummaryByItem = useMemo(() => {
    const map = new Map<
      string,
      {
        itemId: string;
        itemName: string;
        category: string;
        unit: string;
        godownQty: number;
        officeQty: number;
        totalDispatchedQty: number;
        dispatchCount: number;
        lastDispatchedDate: string;
        lastSite: string;
      }
    >();

    // Seed from catalog items
    for (const item of items) {
      map.set(item.id, {
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        godownQty: item.godownQty,
        officeQty: item.officeQty,
        totalDispatchedQty: 0,
        dispatchCount: 0,
        lastDispatchedDate: "",
        lastSite: "",
      });
    }

    for (const d of dispatches) {
      const existing = map.get(d.itemId);
      if (existing) {
        existing.totalDispatchedQty += d.quantity;
        existing.dispatchCount += 1;
        if (!existing.lastDispatchedDate || new Date(d.createdAt) > new Date(existing.lastDispatchedDate)) {
          existing.lastDispatchedDate = d.createdAt;
          existing.lastSite = d.siteOrCustomer;
        }
      }
    }

    const q = search.trim().toLowerCase();
    const result = Array.from(map.values()).filter((item) => {
      const matchesSearch =
        q === "" ||
        item.itemName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;

      return (item.totalDispatchedQty > 0 || q !== "") && matchesSearch && matchesCategory;
    });

    return result.sort((a, b) => {
      if (sortField === "quantity") {
        return sortOrder === "asc"
          ? a.totalDispatchedQty - b.totalDispatchedQty
          : b.totalDispatchedQty - a.totalDispatchedQty;
      }
      return sortOrder === "asc"
        ? a.itemName.localeCompare(b.itemName)
        : b.itemName.localeCompare(a.itemName);
    });
  }, [items, dispatches, search, selectedCategory, sortField, sortOrder]);

  // Active Count and Pagination for current view
  const activeCount =
    activeLocation === "DISPATCH"
      ? dispatchViewMode === "LOG"
        ? processedDispatches.length
        : dispatchedSummaryByItem.length
      : processedItems.length;

  const totalPages = Math.max(1, Math.ceil(activeCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Paginated Slices
  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return processedItems.slice(startIndex, startIndex + pageSize);
  }, [processedItems, safeCurrentPage, pageSize]);

  const paginatedDispatches = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return processedDispatches.slice(startIndex, startIndex + pageSize);
  }, [processedDispatches, safeCurrentPage, pageSize]);

  const paginatedSummaryItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return dispatchedSummaryByItem.slice(startIndex, startIndex + pageSize);
  }, [dispatchedSummaryByItem, safeCurrentPage, pageSize]);

  const startIndexDisplay = activeCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndexDisplay = Math.min(safeCurrentPage * pageSize, activeCount);

  // Group by category for mobile view (stock items)
  const itemsByCategory = useMemo(() => {
    const map: Record<string, DashboardItem[]> = {};
    for (const cat of CATEGORIES) {
      map[cat.key] = [];
    }
    for (const item of processedItems) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [processedItems]);

  // Export to CSV
  const handleExportCSV = () => {
    if (activeLocation === "DISPATCH") {
      if (dispatchViewMode === "LOG") {
        const rows = processedDispatches.map((d) => ({
          Dispatch_Date: new Date(d.createdAt).toLocaleString(),
          Installation_Site_Or_Customer: d.siteOrCustomer,
          Solar_Item: d.itemName,
          Category: d.category,
          Quantity: d.quantity,
          Unit: d.unit,
          Assigned_Technician: d.workerName || "Unassigned",
          Challan_Or_DocNo: d.referenceDocNo || "-",
          Dispatched_By: d.dispatchedByName,
          Remarks: d.remarks || "",
        }));
        exportToCSV(
          `zaffine_site_dispatches_log_${new Date().toISOString().slice(0, 10)}`,
          rows
        );
      } else {
        const rows = dispatchedSummaryByItem.map((s) => ({
          Solar_Item: s.itemName,
          Category: s.category,
          Unit: s.unit,
          Total_Dispatched_To_Sites: s.totalDispatchedQty,
          Dispatched_Jobs_Count: s.dispatchCount,
          Current_Office_Stock: s.officeQty,
          Current_Godown_Stock: s.godownQty,
          Last_Site: s.lastSite || "-",
          Last_Dispatched_Date: s.lastDispatchedDate
            ? new Date(s.lastDispatchedDate).toLocaleDateString()
            : "-",
        }));
        exportToCSV(
          `zaffine_dispatches_summary_by_item_${new Date().toISOString().slice(0, 10)}`,
          rows
        );
      }
      return;
    }

    const rows = processedItems.map((item) => {
      if (activeLocation === "GODOWN") {
        return {
          Item_Name: item.name,
          Category: item.category,
          Unit: item.unit,
          Godown_Stock: item.godownQty,
          Min_Threshold: item.minThreshold ?? 0,
          Status: item.minThreshold && item.godownQty <= item.minThreshold ? "LOW" : "ADEQUATE",
        };
      }
      if (activeLocation === "OFFICE") {
        return {
          Item_Name: item.name,
          Category: item.category,
          Unit: item.unit,
          Office_Stock: item.officeQty,
          Min_Threshold: item.minThreshold ?? 0,
          Status: item.minThreshold && item.officeQty <= item.minThreshold ? "LOW" : "READY",
        };
      }
      return {
        Item_Name: item.name,
        Category: item.category,
        Unit: item.unit,
        Godown_Stock: item.godownQty,
        Office_Stock: item.officeQty,
        Total_Stock: item.totalQty,
        Min_Threshold: item.minThreshold ?? 0,
        Status: item.minThreshold && item.totalQty <= item.minThreshold ? "LOW" : "ADEQUATE",
      };
    });
    exportToCSV(
      `zaffine_${activeLocation.toLowerCase()}_stock_${new Date().toISOString().slice(0, 10)}`,
      rows
    );
  };

  // Generate page numbers array with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages);
      }
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 rounded-3xl border border-amber-500/20 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Welcome back, {user.fullName}! 👋
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Real-time solar stock tracking across Godown Warehouse, Office Hub & Customer Installation Sites.
        </p>
      </div>

      {/* KPI METRIC CARDS - ALL 5 CORE LIFECYCLE STAGES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* 1. Godown Stock */}
        <div
          onClick={() => setActiveLocation("GODOWN")}
          className={cn(
            "p-3.5 sm:p-5 rounded-2xl border shadow-2xs relative overflow-hidden cursor-pointer transition-all",
            activeLocation === "GODOWN"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30"
              : "bg-white border-slate-200/90 hover:border-amber-300"
          )}
        >
          <div className="flex items-center justify-between gap-1 text-slate-500 text-[11px] sm:text-xs font-bold mb-1.5 sm:mb-2 min-w-0">
            <span className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <span className="truncate">Godown</span>
            </span>
            <span className="text-[9px] sm:text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
              Main
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {formatNumber(stats.totalGodownStock)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-amber-700/80 mt-1 font-semibold truncate">
            {activeLocation === "GODOWN" ? "● Active View" : "View Godown"}
          </p>
          <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-amber-500/5 rounded-full pointer-events-none" />
        </div>

        {/* 2. Office Stock */}
        <div
          onClick={() => setActiveLocation("OFFICE")}
          className={cn(
            "p-3.5 sm:p-5 rounded-2xl border shadow-2xs relative overflow-hidden cursor-pointer transition-all",
            activeLocation === "OFFICE"
              ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30"
              : "bg-white border-slate-200/90 hover:border-blue-300"
          )}
        >
          <div className="flex items-center justify-between gap-1 text-slate-500 text-[11px] sm:text-xs font-bold mb-1.5 sm:mb-2 min-w-0">
            <span className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
              <span className="truncate">Office Stock</span>
            </span>
            <span className="text-[9px] sm:text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
              Staging
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {formatNumber(stats.totalOfficeStock)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-blue-700/80 mt-1 font-semibold truncate">
            {activeLocation === "OFFICE" ? "● Active View" : "View Office"}
          </p>
          <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-blue-500/5 rounded-full pointer-events-none" />
        </div>

        {/* 3. Dispatched to Sites */}
        <div
          onClick={() => setActiveLocation("DISPATCH")}
          className={cn(
            "p-3.5 sm:p-5 rounded-2xl border shadow-2xs relative overflow-hidden cursor-pointer transition-all",
            activeLocation === "DISPATCH"
              ? "bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/30"
              : "bg-white border-slate-200/90 hover:border-purple-300"
          )}
        >
          <div className="flex items-center justify-between gap-1 text-slate-500 text-[11px] sm:text-xs font-bold mb-1.5 sm:mb-2 min-w-0">
            <span className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
              <span className="truncate">Dispatches</span>
            </span>
            <span className="text-[9px] sm:text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-purple-200 shrink-0">
              {stats.totalDispatchesCount ?? dispatches.length} Jobs
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {formatNumber(stats.totalDispatchedQty ?? 0)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-purple-700/80 mt-1 font-semibold truncate">
            {activeLocation === "DISPATCH" ? "● Active View" : "View Dispatches"}
          </p>
          <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-purple-500/5 rounded-full pointer-events-none" />
        </div>

        {/* 4. Low Stock Alerts */}
        <div
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={cn(
            "p-3.5 sm:p-5 rounded-2xl border shadow-2xs cursor-pointer transition-all relative overflow-hidden",
            stats.lowStockCount > 0
              ? "bg-rose-50/70 border-rose-200 hover:bg-rose-50 text-rose-900"
              : "bg-white border-slate-200/90 text-slate-900"
          )}
        >
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-bold mb-1.5 sm:mb-2 min-w-0">
            <span className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <AlertTriangle
                className={cn(
                  "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0",
                  stats.lowStockCount > 0 ? "text-rose-600" : "text-slate-400"
                )}
              />
              <span className="truncate">Low Alerts</span>
            </span>
            <span
              className={cn(
                "text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0",
                onlyLowStock
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-rose-100 text-rose-800 border-rose-200"
              )}
            >
              {onlyLowStock ? "Filtered" : "Filter"}
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight font-mono">
            {stats.lowStockCount}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium truncate">
            {onlyLowStock ? "Viewing filtered" : "Near threshold"}
          </p>
        </div>

        {/* 5. Catalog Items */}
        <div
          onClick={() => setActiveLocation("ALL")}
          className={cn(
            "p-3.5 sm:p-5 rounded-2xl border shadow-2xs relative overflow-hidden cursor-pointer transition-all col-span-2 sm:col-span-1",
            activeLocation === "ALL"
              ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30"
              : "bg-white border-slate-200/90 hover:border-emerald-300"
          )}
        >
          <div className="flex items-center justify-between gap-1 text-slate-500 text-[11px] sm:text-xs font-bold mb-1.5 sm:mb-2 min-w-0">
            <span className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
              <span className="truncate">Catalog Items</span>
            </span>
            <span className="text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-emerald-200/50 shrink-0">
              {stats.totalItems} Models
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {stats.totalItems}
          </div>
          <p className="text-[10px] sm:text-[11px] text-emerald-700/80 mt-1 font-semibold truncate">
            {activeLocation === "ALL" ? "● Active View" : "View Catalog"}
          </p>
        </div>
      </div>

      {/* DISTINCT 4-WAY LOCATION TAB SWITCHER */}
      <div className="bg-slate-200/70 p-1.5 rounded-2xl grid grid-cols-2 md:flex md:flex-row gap-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveLocation("ALL")}
          className={cn(
            "py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0 text-center",
            activeLocation === "ALL"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
          <span className="truncate">All Facilities</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLocation("GODOWN")}
          className={cn(
            "py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0 text-center",
            activeLocation === "GODOWN"
              ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">Godown</span>
          <span
            className={cn(
              "text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0",
              activeLocation === "GODOWN"
                ? "bg-white/20 text-white"
                : "bg-amber-100 text-amber-900"
            )}
          >
            {formatNumber(stats.totalGodownStock)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLocation("OFFICE")}
          className={cn(
            "py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0 text-center",
            activeLocation === "OFFICE"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">Office Hub</span>
          <span
            className={cn(
              "text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0",
              activeLocation === "OFFICE"
                ? "bg-white/20 text-white"
                : "bg-blue-100 text-blue-900"
            )}
          >
            {formatNumber(stats.totalOfficeStock)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLocation("DISPATCH")}
          className={cn(
            "py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0 text-center",
            activeLocation === "DISPATCH"
              ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">Dispatched</span>
          <span
            className={cn(
              "text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0",
              activeLocation === "DISPATCH"
                ? "bg-white/20 text-white"
                : "bg-purple-100 text-purple-900"
            )}
          >
            {formatNumber(stats.totalDispatchedQty ?? 0)}
          </span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeLocation === "DISPATCH"
                  ? "Search by item name, site, customer, technician, or doc no..."
                  : "Search solar model, category, or brand..."
              }
              className="w-full pl-9 pr-14 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Export CSV */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors touch-target"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all touch-target min-h-[36px] shrink-0",
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
            )}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all touch-target min-h-[36px] shrink-0",
                  isSelected
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE DISPATCH SUB-VIEW SWITCHER */}
      {activeLocation === "DISPATCH" && (
        <div className="md:hidden flex items-center bg-purple-100/70 p-1 rounded-2xl text-xs font-bold gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setDispatchViewMode("LOG")}
            className={cn(
              "flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center min-w-0 touch-target",
              dispatchViewMode === "LOG"
                ? "bg-white text-purple-950 shadow-xs"
                : "text-purple-800 hover:text-purple-950"
            )}
          >
            <ListFilter className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Job Records ({processedDispatches.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setDispatchViewMode("SUMMARY_BY_ITEM")}
            className={cn(
              "flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center min-w-0 touch-target",
              dispatchViewMode === "SUMMARY_BY_ITEM"
                ? "bg-white text-purple-950 shadow-xs"
                : "text-purple-800 hover:text-purple-950"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Item Breakdown ({dispatchedSummaryByItem.length})</span>
          </button>
        </div>
      )}

      {/* MOBILE ACCORDIONS / CARDS VIEW */}
      <div className="md:hidden space-y-3">
        {activeLocation === "DISPATCH" ? (
          dispatchViewMode === "SUMMARY_BY_ITEM" ? (
            /* Mobile Dispatched Summary By Item */
            <div className="space-y-3">
              {paginatedSummaryItems.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                  No items found in dispatch summary.
                </div>
              ) : (
                paginatedSummaryItems.map((s) => (
                  <div
                    key={s.itemId}
                    className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 truncate">
                          {s.itemName}
                        </div>
                        <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          {s.category} • {s.dispatchCount} Dispatched Jobs
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 font-black text-sm font-mono shrink-0">
                        {formatNumber(s.totalDispatchedQty)} {s.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-slate-500 block font-medium">
                          Current Office
                        </span>
                        <span className="font-bold text-blue-700 font-mono text-xs sm:text-sm">
                          {formatNumber(s.officeQty)} {s.unit}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-slate-500 block font-medium">
                          Current Godown
                        </span>
                        <span className="font-bold text-amber-700 font-mono text-xs sm:text-sm">
                          {formatNumber(s.godownQty)} {s.unit}
                        </span>
                      </div>
                    </div>

                    {s.lastSite && (
                      <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                        <span className="truncate">Last site: {s.lastSite}</span>
                        {s.lastDispatchedDate && (
                          <span className="shrink-0 ml-1">
                            {new Date(s.lastDispatchedDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Mobile Dispatches Individual Log List */
            <div className="space-y-3">
              {paginatedDispatches.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                  No dispatched items found matching your filters.
                </div>
              ) : (
                paginatedDispatches.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="truncate">{d.siteOrCustomer}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                          {d.itemName} ({d.category})
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 font-black text-sm font-mono shrink-0">
                        {d.quantity} {d.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px]">Technician:</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {d.workerName || "Unassigned"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px]">Challan / Doc:</span>
                        <span className="font-mono font-bold text-slate-800 truncate block">
                          {d.referenceDocNo || "N/A"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px]">Dispatched:</span>
                        <span className="text-slate-700 truncate block">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-end justify-end">
                        <Link
                          href={`/returns?itemId=${d.itemId}&site=${encodeURIComponent(d.siteOrCustomer)}`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors shrink-0 touch-target flex items-center justify-center"
                        >
                          Return Leftover
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        ) : (
          /* Mobile Stock by Categories */
          CATEGORIES.map((cat) => {
            const catItems = itemsByCategory[cat.key] || [];
            if (catItems.length === 0 && selectedCategory !== "ALL") return null;
            const isExpanded = !!expandedCategories[cat.key];

            return (
              <div
                key={cat.key}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.key)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors touch-target min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                      📦
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {cat.label}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {catItems.length} items
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-slate-400 transition-transform shrink-0 ml-2",
                      isExpanded && "rotate-180 text-amber-500"
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {catItems.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No items matching your filter in this category.
                      </div>
                    ) : (
                      catItems.map((item) => {
                        const isLow =
                          item.minThreshold !== null &&
                          item.minThreshold > 0 &&
                          item.totalQty <= item.minThreshold;

                        return (
                          <div key={item.id} className="p-3.5 hover:bg-slate-50/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm text-slate-900 truncate">
                                  {item.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium truncate">
                                  Unit: {item.unit}
                                  {item.minThreshold ? ` • Min: ${item.minThreshold}` : ""}
                                </div>
                              </div>
                              {isLow && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold shrink-0">
                                  LOW
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2 pt-2 border-t border-slate-100/60 text-center">
                              <div
                                className={cn(
                                  "p-1.5 rounded-xl transition-colors",
                                  activeLocation === "GODOWN"
                                    ? "bg-amber-100 ring-1 ring-amber-500/40"
                                    : "bg-amber-50/60"
                                )}
                              >
                                <span className="text-[10px] text-amber-800 font-medium block">
                                  Godown
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-amber-950 font-mono truncate block">
                                  {formatNumber(item.godownQty)}
                                </span>
                              </div>

                              <div
                                className={cn(
                                  "p-1.5 rounded-xl transition-colors",
                                  activeLocation === "OFFICE"
                                    ? "bg-blue-100 ring-1 ring-blue-500/40"
                                    : "bg-blue-50/60"
                                )}
                              >
                                <span className="text-[10px] text-blue-800 font-medium block">
                                  Office
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-blue-950 font-mono truncate block">
                                  {formatNumber(item.officeQty)}
                                </span>
                              </div>

                              <div
                                className={cn(
                                  "p-1.5 rounded-xl transition-colors",
                                  activeLocation === "ALL"
                                    ? "bg-slate-200 ring-1 ring-slate-400/40"
                                    : "bg-slate-100"
                                )}
                              >
                                <span className="text-[10px] text-slate-600 font-medium block">
                                  Total
                                </span>
                                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono truncate block">
                                  {formatNumber(item.totalQty)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MOBILE-FRIENDLY PAGINATION BAR (Visible when active view has paginated data) */}
      {activeCount > 0 && (
        <div className="md:hidden bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="text-center text-xs text-slate-500 font-medium">
            Showing <span className="font-extrabold text-slate-900">{startIndexDisplay}</span> to{" "}
            <span className="font-extrabold text-slate-900">{endIndexDisplay}</span> of{" "}
            <span className="font-extrabold text-slate-900">{activeCount}</span>{" "}
            {activeLocation === "DISPATCH"
              ? dispatchViewMode === "LOG"
                ? "dispatches"
                : "models"
              : "items"}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage === 1}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors touch-target"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-bold text-slate-700 px-2 shrink-0">
              Page {safeCurrentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage === totalPages}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors touch-target"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP VIEW: PROPORTIONAL DATA TABLE WITH ZERO HORIZONTAL SCROLLBAR */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Context Banner explaining the active table */}
        <div
          className={cn(
            "px-6 py-3 text-xs font-bold flex items-center justify-between border-b transition-colors",
            activeLocation === "GODOWN" && "bg-amber-50 text-amber-900 border-amber-200/60",
            activeLocation === "OFFICE" && "bg-blue-50 text-blue-900 border-blue-200/60",
            activeLocation === "DISPATCH" && "bg-purple-50 text-purple-900 border-purple-200/60",
            activeLocation === "ALL" && "bg-slate-50 text-slate-800 border-slate-200/60"
          )}
        >
          <div className="flex items-center gap-2">
            {activeLocation === "GODOWN" && <Warehouse className="w-4 h-4 text-amber-600" />}
            {activeLocation === "OFFICE" && <Building2 className="w-4 h-4 text-blue-600" />}
            {activeLocation === "DISPATCH" && <Truck className="w-4 h-4 text-purple-600" />}
            {activeLocation === "ALL" && <Layers className="w-4 h-4 text-amber-600" />}
            <span>
              {activeLocation === "GODOWN" &&
                "Godown Warehouse: Material stock received from suppliers and ready for internal transfer."}
              {activeLocation === "OFFICE" &&
                "Office Hub: Material staged for daily field technician dispatches & site returns."}
              {activeLocation === "DISPATCH" &&
                "Dispatched Items: Real-time record of all materials dispatched to customer installation sites."}
              {activeLocation === "ALL" &&
                "Combined Overview: Side-by-side facility comparison between Godown warehouse and Office staging."}
            </span>
          </div>

          {/* Sub-view Mode Switcher for Dispatches */}
          <div className="flex items-center gap-4">
            {activeLocation === "DISPATCH" && (
              <div className="flex items-center bg-purple-200/60 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setDispatchViewMode("LOG")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all flex items-center gap-1",
                    dispatchViewMode === "LOG"
                      ? "bg-white text-purple-950 shadow-2xs"
                      : "text-purple-800 hover:text-purple-950"
                  )}
                >
                  <ListFilter className="w-3 h-3" />
                  <span>Job Records Log ({processedDispatches.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchViewMode("SUMMARY_BY_ITEM")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all flex items-center gap-1",
                    dispatchViewMode === "SUMMARY_BY_ITEM"
                      ? "bg-white text-purple-950 shadow-2xs"
                      : "text-purple-800 hover:text-purple-950"
                  )}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Item Totals Breakdown ({dispatchedSummaryByItem.length})</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-medium">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold text-xs"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW A: DISPATCHED ITEMS TABLE (WHEN activeLocation === "DISPATCH") */}
        {/* ========================================================================= */}
        {activeLocation === "DISPATCH" ? (
          dispatchViewMode === "LOG" ? (
            /* 1. DISPATCH ORDERS LOG */
            <div className="w-full">
              <table className="w-full text-left text-xs sm:text-sm border-collapse table-auto">
                <thead>
                  <tr className="bg-purple-100/40 border-b border-purple-200/80 text-purple-950 text-xs font-black uppercase tracking-wider select-none">
                    {/* Date */}
                    <th
                      onClick={() => handleSort("date")}
                      className="py-3 px-3 cursor-pointer hover:bg-purple-200/40 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Date</span>
                        {sortField === "date" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-purple-700" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-purple-700" />
                          ))}
                      </div>
                    </th>

                    {/* Site / Customer */}
                    <th
                      onClick={() => handleSort("site")}
                      className="py-3 px-3 cursor-pointer hover:bg-purple-200/40 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Installation Site / Customer</span>
                        {sortField === "site" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-purple-700" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-purple-700" />
                          ))}
                      </div>
                    </th>

                    {/* Solar Item */}
                    <th
                      onClick={() => handleSort("name")}
                      className="py-3 px-3 cursor-pointer hover:bg-purple-200/40 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Solar Item & Model</span>
                        {sortField === "name" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-purple-700" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-purple-700" />
                          ))}
                      </div>
                    </th>

                    {/* Category */}
                    <th className="py-3 px-2">Category</th>

                    {/* Dispatched Qty */}
                    <th
                      onClick={() => handleSort("quantity")}
                      className="py-3 px-3 text-right cursor-pointer hover:bg-purple-200/40 transition-colors text-purple-950 font-black"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Qty</span>
                        {sortField === "quantity" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-purple-700" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-purple-700" />
                          ))}
                      </div>
                    </th>

                    {/* Technician */}
                    <th className="py-3 px-2.5">Tech</th>

                    {/* Challan / Doc # */}
                    <th className="py-3 px-2 text-center">Challan / Doc #</th>

                    {/* Action */}
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDispatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <Truck className="w-10 h-10 mx-auto text-purple-300 mb-2" />
                        <p className="font-bold text-slate-700">No dispatch records found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Materials dispatched to sites will appear here in real-time.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedDispatches.map((d, idx) => (
                      <tr
                        key={d.id}
                        className={cn(
                          "hover:bg-purple-50/30 transition-colors",
                          idx % 2 === 1 ? "bg-slate-50/25" : "bg-white"
                        )}
                      >
                        {/* Date & Time */}
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600">
                          <div className="font-bold text-slate-900 leading-tight">
                            {new Date(d.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            {new Date(d.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Installation Site / Customer */}
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5 leading-snug">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span className="truncate max-w-[220px]" title={d.siteOrCustomer}>
                              {d.siteOrCustomer}
                            </span>
                          </div>
                          {d.remarks && (
                            <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] pl-3">
                              {d.remarks}
                            </div>
                          )}
                        </td>

                        {/* Solar Item */}
                        <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap text-xs">
                          {d.itemName}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200/60">
                            {d.category.replace("_", " ")}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3 text-right font-black text-purple-700 whitespace-nowrap font-mono text-sm bg-purple-50/30">
                          {d.quantity}{" "}
                          <span className="text-[10px] font-bold text-purple-500">
                            {d.unit}
                          </span>
                        </td>

                        {/* Technician */}
                        <td className="py-3 px-2.5 whitespace-nowrap text-xs">
                          {d.workerName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium max-w-[130px] truncate">
                              <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{d.workerName.split(" ")[0]}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          )}
                        </td>

                        {/* Challan / Doc # */}
                        <td className="py-3 px-2 text-center whitespace-nowrap text-xs font-mono font-bold text-slate-600">
                          {d.referenceDocNo ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                              {d.referenceDocNo}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Action: Return Leftovers */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <Link
                            href={`/returns?itemId=${d.itemId}&site=${encodeURIComponent(d.siteOrCustomer)}`}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                            title="Return any unused materials back into Office stock"
                          >
                            <RotateCcw className="w-3 h-3 shrink-0" />
                            <span>Return</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* 2. DISPATCHED SUMMARY BY ITEM */
            <div className="w-full">
              <table className="w-full text-left text-xs sm:text-sm border-collapse table-auto">
                <thead>
                  <tr className="bg-purple-100/40 border-b border-purple-200/80 text-purple-950 text-xs font-black uppercase tracking-wider select-none">
                    <th className="py-3.5 px-4">Solar Item & Model</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-2 text-center">Unit</th>
                    <th className="py-3.5 px-3 text-right">Office Staging Stock</th>
                    <th className="py-3.5 px-4 text-right text-purple-950 font-black">
                      Total Dispatched to Sites
                    </th>
                    <th className="py-3.5 px-3 text-center">Dispatch Events</th>
                    <th className="py-3.5 px-4">Last Dispatched Site</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSummaryItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <Truck className="w-10 h-10 mx-auto text-purple-300 mb-2" />
                        <p className="font-bold text-slate-700">No items with dispatch history</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSummaryItems.map((s, idx) => (
                      <tr
                        key={s.itemId}
                        className={cn(
                          "hover:bg-purple-50/30 transition-colors",
                          idx % 2 === 1 ? "bg-slate-50/25" : "bg-white"
                        )}
                      >
                        <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                          {s.itemName}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200/60">
                            {s.category.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-center whitespace-nowrap font-bold text-[11px] text-slate-400">
                          {s.unit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-extrabold text-blue-700 whitespace-nowrap font-mono text-sm">
                          {formatNumber(s.officeQty)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-purple-700 whitespace-nowrap font-mono text-base bg-purple-50/30">
                          {formatNumber(s.totalDispatchedQty)}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-xs">
                            {s.dispatchCount} {s.dispatchCount === 1 ? "Job" : "Jobs"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                          {s.lastSite ? (
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-xs">
                                {s.lastSite}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(s.lastDispatchedDate).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {perms.canDispatchToSite && s.officeQty > 0 && (
                            <Link
                              href="/dispatch"
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors"
                            >
                              Dispatch
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ========================================================================= */
          /* VIEW B: STOCK INVENTORY TABLES (ALL, GODOWN, OR OFFICE) */
          /* ========================================================================= */
          <div className="w-full">
            <table className="w-full text-left text-xs sm:text-sm border-collapse table-auto">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider select-none">
                  {/* 1. Item Name */}
                  <th
                    onClick={() => handleSort("name")}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Solar Item & Model</span>
                      {sortField === "name" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                        ))}
                    </div>
                  </th>

                  {/* 2. Category */}
                  <th
                    onClick={() => handleSort("category")}
                    className="py-3.5 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      {sortField === "category" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                        ))}
                    </div>
                  </th>

                  {/* 3. Unit */}
                  <th className="py-3.5 px-2 text-center">Unit</th>

                  {/* DYNAMIC COLUMNS BASED ON ACTIVE LOCATION */}
                  {activeLocation === "GODOWN" ? (
                    <>
                      <th
                        onClick={() => handleSort("godownQty")}
                        className="py-3.5 px-4 text-right cursor-pointer hover:bg-amber-100/60 transition-colors bg-amber-500/10 text-amber-950 font-black"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Godown Warehouse Stock</span>
                          {sortField === "godownQty" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                            ))}
                        </div>
                      </th>
                      <th className="py-3.5 px-3 text-right">Min Threshold</th>
                      <th className="py-3.5 px-4 text-center">Warehouse Status</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </>
                  ) : activeLocation === "OFFICE" ? (
                    <>
                      <th
                        onClick={() => handleSort("officeQty")}
                        className="py-3.5 px-4 text-right cursor-pointer hover:bg-blue-100/60 transition-colors bg-blue-500/10 text-blue-950 font-black"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Office Staging Stock</span>
                          {sortField === "officeQty" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-700" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-700" />
                            ))}
                        </div>
                      </th>
                      <th className="py-3.5 px-3 text-right">Min Threshold</th>
                      <th className="py-3.5 px-4 text-center">Staging Status</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </>
                  ) : (
                    <>
                      <th
                        onClick={() => handleSort("godownQty")}
                        className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-amber-700 font-extrabold">Godown</span>
                          {sortField === "godownQty" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                            ))}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("officeQty")}
                        className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-blue-700 font-extrabold">Office</span>
                          {sortField === "officeQty" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            ))}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("totalQty")}
                        className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Total</span>
                          {sortField === "totalQty" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                            ))}
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-center">Threshold Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700">No items match your criteria</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Try adjusting the search query or category filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => {
                    const isGodownLow =
                      item.minThreshold !== null &&
                      item.minThreshold > 0 &&
                      item.godownQty <= item.minThreshold;

                    const isOfficeLow =
                      item.minThreshold !== null &&
                      item.minThreshold > 0 &&
                      item.officeQty <= item.minThreshold;

                    const isTotalLow =
                      item.minThreshold !== null &&
                      item.minThreshold > 0 &&
                      item.totalQty <= item.minThreshold;

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "hover:bg-amber-50/30 transition-colors",
                          idx % 2 === 1 ? "bg-slate-50/25" : "bg-white"
                        )}
                      >
                        {/* Name */}
                        <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                          {item.name}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                            {item.category.replace("_", " ")}
                          </span>
                        </td>

                        {/* Unit */}
                        <td className="py-3.5 px-2 text-center whitespace-nowrap">
                          <span className="font-bold text-[11px] text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.unit}
                          </span>
                        </td>

                        {/* DYNAMIC CELLS PER VIEW */}
                        {activeLocation === "GODOWN" ? (
                          <>
                            <td className="py-3.5 px-4 text-right font-black text-amber-700 whitespace-nowrap font-mono text-base bg-amber-500/5">
                              {formatNumber(item.godownQty)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-medium text-slate-500 whitespace-nowrap font-mono text-xs">
                              {item.minThreshold ? `${item.minThreshold} ${item.unit}` : "-"}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {item.godownQty <= 0 ? (
                                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                  Out of Stock
                                </span>
                              ) : isGodownLow ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  Low Warehouse Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  In Warehouse
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {perms.canInwardToGodown && (
                                <Link
                                  href="/inward"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                                >
                                  + Inward
                                </Link>
                              )}
                            </td>
                          </>
                        ) : activeLocation === "OFFICE" ? (
                          <>
                            <td className="py-3.5 px-4 text-right font-black text-blue-700 whitespace-nowrap font-mono text-base bg-blue-500/5">
                              {formatNumber(item.officeQty)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-medium text-slate-500 whitespace-nowrap font-mono text-xs">
                              {item.minThreshold ? `${item.minThreshold} ${item.unit}` : "-"}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {item.officeQty <= 0 ? (
                                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                  No Office Stock
                                </span>
                              ) : isOfficeLow ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  Low Office Staging
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  Ready for Dispatch
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {perms.canDispatchToSite && item.officeQty > 0 && (
                                <Link
                                  href="/dispatch"
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors"
                                >
                                  Dispatch
                                </Link>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3.5 px-3 text-right font-extrabold text-amber-700 whitespace-nowrap font-mono text-sm">
                              {formatNumber(item.godownQty)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-extrabold text-blue-700 whitespace-nowrap font-mono text-sm">
                              {formatNumber(item.officeQty)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-black text-slate-900 whitespace-nowrap font-mono text-base">
                              {formatNumber(item.totalQty)}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {isTotalLow ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  Low (≤{item.minThreshold})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  Adequate
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Complete Pagination Bottom Bar */}
        {activeCount > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-extrabold text-slate-900">{startIndexDisplay}</span> to{" "}
              <span className="font-extrabold text-slate-900">{endIndexDisplay}</span> of{" "}
              <span className="font-extrabold text-slate-900">{activeCount}</span>{" "}
              {activeLocation === "DISPATCH" ? "dispatches" : "items"}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4 text-slate-600" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage === 1}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              <div className="flex items-center gap-1 mx-1">
                {pageNumbers.map((p, idx) =>
                  typeof p === "number" ? (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={cn(
                        "w-9 h-9 rounded-xl text-xs font-bold transition-all",
                        safeCurrentPage === p
                          ? activeLocation === "DISPATCH"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-amber-500 text-white shadow-xs"
                          : "border border-slate-200 hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      {p}
                    </button>
                  ) : (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-xs font-bold text-slate-400"
                    >
                      ...
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
