"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  History,
  Search,
  Download,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  X,
  ExternalLink,
  MapPin,
  Building2,
  FileText,
  User,
  Filter,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Printer,
  Phone,
} from "lucide-react";
import { TRANSACTION_TYPE_DETAILS, TransactionType } from "@/lib/types";
import { cn, formatNumber, formatDate, exportToCSV } from "@/lib/utils";
import { DeliveryChallanModal, DeliveryChallanData } from "@/components/inventory/DeliveryChallanModal";

export interface TransactionRow {
  id: string;
  batchId: string | null;
  transactionType: string;
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
  fromLocation: string | null;
  toLocation: string | null;
  createdByName: string;
  workerName: string | null;
  siteOrCustomer: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  referenceDocNo: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface AuditGroupItem {
  id: string;
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
}

export interface AuditGroup {
  id: string;
  isBatch: boolean;
  batchId: string | null;
  transactionType: string;
  fromLocation: string | null;
  toLocation: string | null;
  createdByName: string;
  workerName: string | null;
  siteOrCustomer: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  referenceDocNo: string | null;
  remarks: string | null;
  createdAt: string;
  totalQuantity: number;
  totalItems: number;
  items: AuditGroupItem[];
  rawTransactions: TransactionRow[];
}

export function TransactionsClient({
  initialTransactions,
}: {
  initialTransactions: TransactionRow[];
}) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Date Filter State
  const [datePreset, setDatePreset] = useState<
    "ALL" | "TODAY" | "YESTERDAY" | "LAST_7" | "THIS_MONTH" | "CUSTOM"
  >("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State for viewing details
  const [selectedGroup, setSelectedGroup] = useState<AuditGroup | null>(null);
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Group raw transactions into Audit Groups (Group batches together)
  const auditGroups = useMemo(() => {
    const groups: AuditGroup[] = [];
    const batchMap = new Map<string, AuditGroup>();

    // Helper to format ISO date or extract timestamp
    const getTs = (isoStr: string) => new Date(isoStr).getTime();

    for (const t of initialTransactions) {
      if (t.batchId) {
        // Group by explicit batchId
        let existing = batchMap.get(t.batchId);
        if (!existing) {
          existing = {
            id: t.batchId,
            isBatch: true,
            batchId: t.batchId,
            transactionType: t.transactionType,
            fromLocation: t.fromLocation,
            toLocation: t.toLocation,
            createdByName: t.createdByName,
            workerName: t.workerName,
            siteOrCustomer: t.siteOrCustomer,
            customerPhone: t.customerPhone || null,
            customerAddress: t.customerAddress || null,
            referenceDocNo: t.referenceDocNo,
            remarks: t.remarks,
            createdAt: t.createdAt,
            totalQuantity: 0,
            totalItems: 0,
            items: [],
            rawTransactions: [],
          };
          batchMap.set(t.batchId, existing);
          groups.push(existing);
        }
        existing.totalQuantity += t.quantity;
        existing.totalItems += 1;
        existing.items.push({
          id: t.id,
          itemName: t.itemName,
          category: t.category,
          unit: t.unit,
          quantity: t.quantity,
        });
        existing.rawTransactions.push(t);
      } else {
        // Historical / fallback grouping: check if consecutive transaction matches within 3 seconds
        const lastGroup = groups[groups.length - 1];
        const canGroupFallback =
          lastGroup &&
          !lastGroup.batchId &&
          lastGroup.transactionType === t.transactionType &&
          lastGroup.createdByName === t.createdByName &&
          lastGroup.fromLocation === t.fromLocation &&
          lastGroup.toLocation === t.toLocation &&
          (lastGroup.referenceDocNo === t.referenceDocNo || (!lastGroup.referenceDocNo && !t.referenceDocNo)) &&
          (lastGroup.siteOrCustomer === t.siteOrCustomer || (!lastGroup.siteOrCustomer && !t.siteOrCustomer)) &&
          Math.abs(getTs(lastGroup.createdAt) - getTs(t.createdAt)) <= 3500;

        if (canGroupFallback) {
          lastGroup.isBatch = true;
          lastGroup.totalQuantity += t.quantity;
          lastGroup.totalItems += 1;
          lastGroup.items.push({
            id: t.id,
            itemName: t.itemName,
            category: t.category,
            unit: t.unit,
            quantity: t.quantity,
          });
          lastGroup.rawTransactions.push(t);
        } else {
          // New single entry
          const singleGroup: AuditGroup = {
            id: t.id,
            isBatch: false,
            batchId: null,
            transactionType: t.transactionType,
            fromLocation: t.fromLocation,
            toLocation: t.toLocation,
            createdByName: t.createdByName,
            workerName: t.workerName,
            siteOrCustomer: t.siteOrCustomer,
            customerPhone: t.customerPhone || null,
            customerAddress: t.customerAddress || null,
            referenceDocNo: t.referenceDocNo,
            remarks: t.remarks,
            createdAt: t.createdAt,
            totalQuantity: t.quantity,
            totalItems: 1,
            items: [
              {
                id: t.id,
                itemName: t.itemName,
                category: t.category,
                unit: t.unit,
                quantity: t.quantity,
              },
            ],
            rawTransactions: [t],
          };
          groups.push(singleGroup);
        }
      }
    }

    // Only mark as batch if there are multiple items (more than 1)
    for (const g of groups) {
      g.isBatch = g.items.length > 1;
    }

    return groups;
  }, [initialTransactions]);

  // Handle Date Preset changes
  const handleDatePresetChange = (preset: "ALL" | "TODAY" | "YESTERDAY" | "LAST_7" | "THIS_MONTH" | "CUSTOM") => {
    setDatePreset(preset);
    const today = new Date();
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = toYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = toYMD(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "LAST_7") {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 6);
      setStartDate(toYMD(past7));
      setEndDate(toYMD(today));
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(today));
    }
  };

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedType, startDate, endDate, pageSize]);

  // Filter groups
  const filtered = useMemo(() => {
    return auditGroups.filter((g) => {
      // 1. Movement Type Filter
      const matchType = selectedType === "ALL" || g.transactionType === selectedType;

      // 2. Date Filter
      let matchDate = true;
      if (startDate || endDate) {
        const itemDate = new Date(g.createdAt);
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`);
          if (itemDate < start) matchDate = false;
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59.999`);
          if (itemDate > end) matchDate = false;
        }
      }

      // 3. Search Filter
      const q = search.trim().toLowerCase();
      let matchSearch = true;
      if (q !== "") {
        const itemNamesMatch = g.items.some((i) =>
          i.itemName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
        );
        matchSearch =
          itemNamesMatch ||
          (g.siteOrCustomer && g.siteOrCustomer.toLowerCase().includes(q)) ||
          (g.referenceDocNo && g.referenceDocNo.toLowerCase().includes(q)) ||
          (g.remarks && g.remarks.toLowerCase().includes(q)) ||
          (g.batchId && g.batchId.toLowerCase().includes(q)) ||
          g.createdByName.toLowerCase().includes(q) ||
          (g.workerName && g.workerName.toLowerCase().includes(q)) ||
          false;
      }

      return matchType && matchDate && matchSearch;
    });
  }, [auditGroups, selectedType, startDate, endDate, search]);

  // Pagination Math
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedGroups = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  const startIndexDisplay = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndexDisplay = Math.min(safeCurrentPage * pageSize, totalCount);

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    const rows = filtered.flatMap((g) =>
      g.rawTransactions.map((t) => ({
        Date: formatDate(t.createdAt),
        Movement_Type: t.transactionType,
        Batch_Status: g.isBatch ? `Batch (${g.totalItems} items)` : "Single Entry",
        Batch_ID: g.batchId || "",
        Item: t.itemName,
        Category: t.category,
        Quantity: t.quantity,
        Unit: t.unit,
        From: t.fromLocation || "",
        To: t.toLocation || "",
        Site_Customer: t.siteOrCustomer || "",
        Doc_No: t.referenceDocNo || "",
        Technician: t.workerName || "",
        Logged_By: t.createdByName,
        Remarks: t.remarks || "",
      }))
    );
    exportToCSV(`jaffine_movements_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const typeButtons = [
    { key: "ALL", label: "All Movements" },
    { key: "INWARD_TO_GODOWN", label: "Vendor Inward" },
    { key: "TRANSFER_TO_OFFICE", label: "Office Transfer" },
    { key: "DISPATCH_TO_SITE", label: "Site Dispatch" },
    { key: "RETURN_TO_OFFICE", label: "Site Return" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Movement Audit History ({totalCount})
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Verified record of inward arrivals, batch movements, warehouse transfers, and site dispatches.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shadow-2xs touch-target border border-slate-200/60"
        >
          <Download className="w-4 h-4" />
          <span>Export History CSV</span>
        </button>
      </div>

      {/* Filter and Search Card */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item name, site, doc no, batch ID, or user..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        {/* Date Filter Bar */}
        <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <CalendarDays className="w-4 h-4 text-amber-500" />
              <span>Filter by Date:</span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { key: "ALL", label: "All Time" },
                { key: "TODAY", label: "Today" },
                { key: "YESTERDAY", label: "Yesterday" },
                { key: "LAST_7", label: "Last 7 Days" },
                { key: "THIS_MONTH", label: "This Month" },
                { key: "CUSTOM", label: "Custom Range" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleDatePresetChange(p.key as any)}
                  className={cn(
                    "px-3 py-1 rounded-lg font-bold text-xs transition-colors",
                    datePreset === p.key
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Inputs */}
          {(datePreset === "CUSTOM" || startDate || endDate) && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset("CUSTOM");
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset("CUSTOM");
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => handleDatePresetChange("ALL")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors ml-auto flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Date Filter</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Movement Type Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {typeButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setSelectedType(btn.key)}
              className={cn(
                "px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors touch-target min-h-[38px] shrink-0",
                selectedType === btn.key
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/40"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE VIEW: Grouped Cards */}
      <div className="md:hidden space-y-3">
        {paginatedGroups.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border text-center text-slate-400 text-sm">
            No movement records found matching your filters.
          </div>
        ) : (
          paginatedGroups.map((g) => {
            const meta = TRANSACTION_TYPE_DETAILS[g.transactionType as TransactionType] || {
              label: g.transactionType,
              badgeClass: "bg-slate-100 text-slate-700",
            };

            return (
              <div
                key={g.id}
                onClick={() => setSelectedGroup(g)}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 cursor-pointer hover:border-amber-300 active:bg-amber-50/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-extrabold border shrink-0",
                        meta.badgeClass
                      )}
                    >
                      {meta.label}
                    </span>

                    {g.isBatch && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 shrink-0">
                        <Layers className="w-3 h-3" />
                        Batch ({g.totalItems} Items)
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium shrink-0">
                    <Calendar className="w-3 h-3" />
                    {formatDate(g.createdAt)}
                  </span>
                </div>

                <div className="min-w-0">
                  {g.isBatch ? (
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="text-purple-700">{g.totalItems} Items Transferred</span>
                        <span className="text-xs font-semibold text-slate-500">
                          (Total {formatNumber(g.totalQuantity)} units)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 truncate">
                        {g.items?.[0]?.itemName || "Item"}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-0.5 flex flex-wrap items-center gap-1">
                        <span>Quantity:</span>
                        <span className="text-amber-600 font-black font-mono">
                          {formatNumber(g.totalQuantity)} {g.items?.[0]?.unit || "NOS"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-600 font-semibold mt-1">
                    Route: <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">{g.fromLocation || "-"} ➔ {g.toLocation || "-"}</span>
                  </div>
                </div>

                {g.siteOrCustomer && (
                  <div className="p-2 rounded-xl bg-slate-50 text-xs text-slate-700 font-medium border border-slate-100 min-w-0">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      Site / Customer:
                    </span>
                    <span className="break-words font-semibold">{g.siteOrCustomer}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 min-w-0">
                  <span className="truncate font-medium min-w-0 flex-1">
                    By: {g.createdByName}
                    {g.workerName ? ` (Tech: ${g.workerName})` : ""}
                  </span>
                  <span className="text-amber-600 font-bold text-xs flex items-center gap-0.5 shrink-0">
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MOBILE-FRIENDLY PAGINATION BAR */}
      {totalCount > 0 && (
        <div className="md:hidden bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="text-center text-xs text-slate-500 font-medium">
            Showing <span className="font-extrabold text-slate-900">{startIndexDisplay}</span> to{" "}
            <span className="font-extrabold text-slate-900">{endIndexDisplay}</span> of{" "}
            <span className="font-extrabold text-slate-900">{totalCount}</span> entries
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

      {/* DESKTOP VIEW: Data Table with Pagination */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Top Info */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-semibold text-slate-600">
            Showing <span className="font-extrabold text-slate-900">{startIndexDisplay}</span> to{" "}
            <span className="font-extrabold text-slate-900">{endIndexDisplay}</span> of{" "}
            <span className="font-extrabold text-slate-900">{totalCount}</span> entries
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-xs font-extrabold uppercase tracking-wider select-none">
                <th className="py-4 px-5 whitespace-nowrap min-w-[150px]">Date & Time</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[150px]">Movement Type</th>
                <th className="py-4 px-5 whitespace-nowrap min-w-[240px]">Items & Quantity</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[170px]">Movement Route</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[180px]">Site / Customer</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[120px]">Doc No.</th>
                <th className="py-4 px-5 whitespace-nowrap min-w-[160px]">Logged By / Tech</th>
                <th className="py-4 px-4 whitespace-nowrap text-right min-w-[100px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your date or search filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g, idx) => {
                  const meta = TRANSACTION_TYPE_DETAILS[g.transactionType as TransactionType] || {
                    label: g.transactionType,
                    badgeClass: "bg-slate-100 text-slate-700",
                  };

                  return (
                    <tr
                      key={g.id}
                      onClick={() => setSelectedGroup(g)}
                      className={cn(
                        "hover:bg-amber-50/50 transition-colors cursor-pointer group",
                        idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                      )}
                    >
                      <td className="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap font-medium">
                        {formatDate(g.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-extrabold border",
                              meta.badgeClass
                            )}
                          >
                            {meta.label}
                          </span>
                          {g.isBatch && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              Batch ({g.totalItems} Items)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {g.isBatch ? (
                          <div className="max-w-[260px]">
                            <div className="font-extrabold text-slate-900 flex items-center gap-1">
                              <span className="text-purple-700">{g.totalItems} Items Transferred</span>
                            </div>
                            <div className="text-xs text-amber-700 font-mono font-bold">
                              Total: {formatNumber(g.totalQuantity)} Units
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-[240px]">
                            <span className="font-bold text-slate-900 block leading-tight truncate">
                              {g.items?.[0]?.itemName || "Item"}
                            </span>
                            <span className="text-xs font-black text-amber-700 font-mono mt-0.5 block">
                              {formatNumber(g.totalQuantity)} {g.items?.[0]?.unit || "NOS"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-bold whitespace-nowrap text-xs">
                        <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200/50">
                          {g.fromLocation || "-"} ➔ {g.toLocation || "-"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium text-xs">
                        {g.siteOrCustomer || "-"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 whitespace-nowrap font-bold">
                        {g.referenceDocNo ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                            {g.referenceDocNo}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-600 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">
                          {g.createdByName}
                        </div>
                        {g.workerName && (
                          <div className="text-[11px] text-slate-400 font-medium">
                            Tech: {g.workerName}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroup(g);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Complete Pagination Bottom Bar */}
        {totalCount > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="text-xs text-slate-500 font-medium">
              Page <span className="font-bold text-slate-900">{safeCurrentPage}</span> of{" "}
              <span className="font-bold text-slate-900">{totalPages}</span>
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

      {/* ======================================================== */}
      {/* MODAL: BATCH / MOVEMENT AUDIT DETAILS MODAL              */}
      {/* ======================================================== */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  {selectedGroup.isBatch ? (
                    <Layers className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Package className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {selectedGroup.isBatch ? "Batch Movement Details" : "Movement Audit Details"}
                    </h3>
                    {selectedGroup.isBatch && selectedGroup.items.length > 1 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">
                        {selectedGroup.totalItems} Items
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Recorded on {formatDate(selectedGroup.createdAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
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
                    Movement Type
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">
                    {TRANSACTION_TYPE_DETAILS[selectedGroup.transactionType as TransactionType]?.label ||
                      selectedGroup.transactionType}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Route
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">
                    {selectedGroup.fromLocation || "-"} ➔ {selectedGroup.toLocation || "-"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Logged By
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                    {selectedGroup.createdByName}
                  </span>
                </div>

                {selectedGroup.workerName && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Technician
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                      {selectedGroup.workerName}
                    </span>
                  </div>
                )}

                {selectedGroup.siteOrCustomer && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Site / Customer Details
                    </span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block break-words">
                      {selectedGroup.siteOrCustomer}
                    </span>
                    {selectedGroup.customerPhone && (
                      <span className="text-[11px] font-mono text-slate-600 block mt-1">
                        📞 Mobile: {selectedGroup.customerPhone}
                      </span>
                    )}
                    {selectedGroup.customerAddress && (
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        📍 Address: {selectedGroup.customerAddress}
                      </span>
                    )}
                  </div>
                )}

                {selectedGroup.referenceDocNo && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Doc / Challan No.
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">
                      {selectedGroup.referenceDocNo}
                    </span>
                  </div>
                )}

                {selectedGroup.batchId && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Batch Identifier
                    </span>
                    <span className="text-[11px] font-mono text-slate-600 mt-0.5 block truncate">
                      {selectedGroup.batchId}
                    </span>
                  </div>
                )}
              </div>

              {selectedGroup.remarks && (
                <div className="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-xs">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                    Remarks / Notes
                  </span>
                  <p className="text-slate-700 font-medium">{selectedGroup.remarks}</p>
                </div>
              )}

              {/* Items Table in Modal */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    {selectedGroup.isBatch ? `Items in this Batch (${selectedGroup.totalItems})` : "Item Detail"}
                  </h4>
                  <span className="text-xs font-extrabold text-amber-700 font-mono">
                    Total: {formatNumber(selectedGroup.totalQuantity)} Units
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedGroup.items?.map((item, idx) => (
                        <tr key={item?.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{item?.itemName || "Item"}</td>
                          <td className="py-2.5 px-3 text-slate-500">{item?.category || "OTHER"}</td>
                          <td className="py-2.5 px-3 text-right font-black font-mono text-amber-600">
                            {formatNumber(item?.quantity || 0)} {item?.unit || "NOS"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rows = selectedGroup.rawTransactions.map((t) => ({
                      Date: formatDate(t.createdAt),
                      Movement_Type: t.transactionType,
                      Batch_ID: selectedGroup.batchId || "",
                      Item: t.itemName,
                      Category: t.category,
                      Quantity: t.quantity,
                      Unit: t.unit,
                      From: t.fromLocation || "",
                      To: t.toLocation || "",
                      Site_Customer: t.siteOrCustomer || "",
                      Doc_No: t.referenceDocNo || "",
                      Technician: t.workerName || "",
                      Logged_By: t.createdByName,
                      Remarks: t.remarks || "",
                    }));
                    exportToCSV(`jaffine_batch_${selectedGroup.id}`, rows);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Batch CSV</span>
                </button>

                {selectedGroup.transactionType === "DISPATCH_TO_SITE" && (
                  <button
                    type="button"
                    onClick={() => setIsChallanModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform touch-target"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>🖨️ Print Delivery Challan</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Challan Voucher Modal */}
      {selectedGroup && (
        <DeliveryChallanModal
          isOpen={isChallanModalOpen}
          onClose={() => setIsChallanModalOpen(false)}
          data={{
            challanNo: selectedGroup.referenceDocNo || `DSP-${selectedGroup.id.slice(-4).toUpperCase()}`,
            date: selectedGroup.createdAt,
            customerName: selectedGroup.siteOrCustomer || "Valued Customer",
            customerPhone: selectedGroup.customerPhone || null,
            customerAddress: selectedGroup.customerAddress || null,
            technicianName: selectedGroup.workerName || null,
            dispatchedByName: selectedGroup.createdByName,
            items: selectedGroup.items.map((i) => ({
              name: i.itemName,
              category: i.category,
              quantity: i.quantity,
              unit: i.unit,
            })),
            remarks: selectedGroup.remarks || null,
            sourceLocation: selectedGroup.fromLocation || "Warehouse",
          }}
        />
      )}
    </div>
  );
}
