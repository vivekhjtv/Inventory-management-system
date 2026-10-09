"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  History,
  Search,
  Download,
  ArrowDownToLine,
  ArrowRightLeft,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  User,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
} from "lucide-react";
import { TRANSACTION_TYPE_DETAILS, TransactionType } from "@/lib/types";
import { cn, formatNumber, formatDate, exportToCSV } from "@/lib/utils";

interface TransactionRow {
  id: string;
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
  referenceDocNo: string | null;
  remarks: string | null;
  createdAt: string;
}

export function TransactionsClient({
  initialTransactions,
}: {
  initialTransactions: TransactionRow[];
}) {
  const [transactions] = useState<TransactionRow[]>(initialTransactions);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedType, pageSize]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchType =
        selectedType === "ALL" || t.transactionType === selectedType;
      const q = search.trim().toLowerCase();
      const matchSearch =
        q === "" ||
        t.itemName.toLowerCase().includes(q) ||
        (t.siteOrCustomer && t.siteOrCustomer.toLowerCase().includes(q)) ||
        (t.referenceDocNo && t.referenceDocNo.toLowerCase().includes(q)) ||
        (t.remarks && t.remarks.toLowerCase().includes(q)) ||
        t.createdByName.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [transactions, selectedType, search]);

  // Pagination Math
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  const startIndexDisplay = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndexDisplay = Math.min(safeCurrentPage * pageSize, totalCount);

  const handleExportCSV = () => {
    const rows = filtered.map((t) => ({
      Date: formatDate(t.createdAt),
      Movement_Type: t.transactionType,
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
    exportToCSV(`zaffine_transactions_${new Date().toISOString().slice(0, 10)}`, rows);
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
              Verified record of all inward arrivals, warehouse transfers, and site dispatches.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shadow-2xs touch-target border border-slate-200/60"
        >
          <Download className="w-4 h-4" />
          <span>Export Transactions CSV</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item name, customer site, doc no, or technician..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

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

      {/* MOBILE VIEW: Cards */}
      <div className="md:hidden space-y-3">
        {paginatedTransactions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border text-center text-slate-400 text-sm">
            No transaction records found matching your filters.
          </div>
        ) : (
          paginatedTransactions.map((t) => {
            const meta = TRANSACTION_TYPE_DETAILS[t.transactionType as TransactionType] || {
              label: t.transactionType,
              badgeClass: "bg-slate-100 text-slate-700",
            };

            return (
              <div
                key={t.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-extrabold border shrink-0",
                      meta.badgeClass
                    )}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium shrink-0">
                    <Calendar className="w-3 h-3" />
                    {formatDate(t.createdAt)}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                    {t.itemName}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5 flex flex-wrap items-center gap-1">
                    <span>Moved:</span>
                    <span className="text-amber-600 font-black font-mono">
                      {formatNumber(t.quantity)} {t.unit}
                    </span>
                    <span className="text-slate-400">({t.fromLocation || "-"} ➔ {t.toLocation || "-"})</span>
                  </div>
                </div>

                {t.siteOrCustomer && (
                  <div className="p-2.5 rounded-xl bg-slate-50 text-xs text-slate-700 font-medium border border-slate-100 min-w-0">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      Site / Customer:
                    </span>
                    <span className="break-words">{t.siteOrCustomer}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 min-w-0">
                  <span className="truncate font-medium min-w-0 flex-1">
                    By: {t.createdByName}
                    {t.workerName ? ` (Tech: ${t.workerName})` : ""}
                  </span>
                  {t.referenceDocNo && (
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                      {t.referenceDocNo}
                    </span>
                  )}
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
            <span className="font-extrabold text-slate-900">{totalCount}</span> movements
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
            <span className="font-extrabold text-slate-900">{totalCount}</span> movements
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
                <th className="py-4 px-4 whitespace-nowrap min-w-[130px]">Movement Type</th>
                <th className="py-4 px-5 whitespace-nowrap min-w-[220px]">Item & Qty</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[170px]">Movement Route</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[200px]">Site / Customer</th>
                <th className="py-4 px-4 whitespace-nowrap min-w-[120px]">Doc No.</th>
                <th className="py-4 px-5 whitespace-nowrap min-w-[160px]">Logged By / Tech</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t, idx) => {
                  const meta = TRANSACTION_TYPE_DETAILS[t.transactionType as TransactionType] || {
                    label: t.transactionType,
                    badgeClass: "bg-slate-100 text-slate-700",
                  };

                  return (
                    <tr
                      key={t.id}
                      className={cn(
                        "hover:bg-amber-50/40 transition-colors",
                        idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                      )}
                    >
                      <td className="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap font-medium">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-extrabold border",
                            meta.badgeClass
                          )}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block leading-tight">
                          {t.itemName}
                        </span>
                        <span className="text-xs font-black text-amber-700 font-mono mt-0.5 block">
                          {formatNumber(t.quantity)} {t.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-bold whitespace-nowrap text-xs">
                        <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200/50">
                          {t.fromLocation || "-"} ➔ {t.toLocation || "-"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium text-xs">
                        {t.siteOrCustomer || "-"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 whitespace-nowrap font-bold">
                        {t.referenceDocNo ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                            {t.referenceDocNo}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-600 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">
                          {t.createdByName}
                        </div>
                        {t.workerName && (
                          <div className="text-[11px] text-slate-400 font-medium">
                            Tech: {t.workerName}
                          </div>
                        )}
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
    </div>
  );
}
