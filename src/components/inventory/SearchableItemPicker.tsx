"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Check, ChevronDown, AlertCircle, Warehouse, Building2, Package } from "lucide-react";
import { CatalogItemOption } from "./ItemCombobox";
import { cn, formatNumber } from "@/lib/utils";

interface SearchableItemPickerProps {
  items: CatalogItemOption[];
  selectedItemId: string;
  onSelect: (itemId: string) => void;
  sourceLocation: "GODOWN" | "OFFICE";
  placeholder?: string;
  clearLabel?: string;
  allowClear?: boolean;
  compact?: boolean;
  className?: string;
}

export function SearchableItemPicker({
  items,
  selectedItemId,
  onSelect,
  sourceLocation,
  placeholder = "-- Search & Select Item --",
  clearLabel = "-- None / Do Not Dispatch --",
  allowClear = true,
  compact = false,
  className,
}: SearchableItemPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  const selectedStock = useMemo(() => {
    if (!selectedItem) return 0;
    return sourceLocation === "GODOWN" ? selectedItem.godownQty : selectedItem.officeQty;
  }, [selectedItem, sourceLocation]);

  const otherLocation = sourceLocation === "GODOWN" ? "OFFICE" : "GODOWN";
  const otherStock = useMemo(() => {
    if (!selectedItem) return 0;
    return otherLocation === "GODOWN" ? selectedItem.godownQty : selectedItem.officeQty;
  }, [selectedItem, otherLocation]);

  const isZeroStock = selectedItem !== null && selectedStock === 0;

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Extract unique categories from provided items
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((i) => {
      if (i.category) cats.add(i.category);
    });
    return Array.from(cats);
  }, [items]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items by category and text search
  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCategory !== "ALL") {
      list = list.filter((item) => item.category === selectedCategory);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, search, selectedCategory]);

  const handleOpen = () => {
    setIsOpen(true);
    setSearch("");
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
    setSearch("");
  };

  const CATEGORY_LABELS: Record<string, string> = {
    PANELS: "Panels",
    INVERTER: "Inverters",
    CABLES: "Cables",
    PVC_ITEMS: "PVC & BOS",
    STRUCTURE: "Structure",
    OTHER: "Other",
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full flex items-center justify-between text-left rounded-xl border bg-white transition-all shadow-2xs group",
          compact ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2.5 text-sm",
          isOpen
            ? "border-amber-500 ring-2 ring-amber-500/20"
            : isZeroStock
            ? "border-rose-300 ring-1 ring-rose-200 bg-rose-50/20"
            : "border-slate-200 hover:border-slate-300",
          !selectedItem && "text-slate-400 font-normal"
        )}
      >
        <div className="flex-1 min-w-0 pr-2">
          {selectedItem ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "font-bold truncate text-slate-900",
                    compact ? "text-xs" : "text-sm",
                    isZeroStock && "text-rose-950"
                  )}
                  title={selectedItem.name}
                >
                  {selectedItem.name}
                </div>
                {!compact && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-slate-600">{selectedItem.category}</span>
                    <span>•</span>
                    <span>Unit: {selectedItem.unit}</span>
                  </div>
                )}
              </div>

              {/* Live stock badge */}
              <div className="shrink-0 flex items-center gap-1">
                {isZeroStock ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                    <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>0 {sourceLocation === "GODOWN" ? "Godown" : "Office"}</span>
                  </span>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border",
                      sourceLocation === "GODOWN"
                        ? "bg-amber-50 text-amber-900 border-amber-200/80"
                        : "bg-blue-50 text-blue-900 border-blue-200/80"
                    )}
                  >
                    <span>
                      {formatNumber(selectedStock)} {selectedItem.unit}
                    </span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className={cn("text-slate-400 truncate", compact ? "text-xs" : "text-xs sm:text-sm")}>
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedItem && allowClear && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect("");
              }}
              className="p-1 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "transition-transform text-slate-400",
              compact ? "w-4 h-4" : "w-4 h-4",
              isOpen && "rotate-180 text-amber-600"
            )}
          />
        </div>
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, wattage, capacity..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {availableCategories.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all border",
                    selectedCategory === "ALL"
                      ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  All ({items.length})
                </button>
                {availableCategories.map((cat) => {
                  const count = items.filter((i) => i.category === cat).length;
                  const label = CATEGORY_LABELS[cat] || cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all border",
                        selectedCategory === cat
                          ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-1 pt-1.5">
              <span>Showing {filteredItems.length} options</span>
              <span className="font-bold text-slate-700">
                Active Source: {sourceLocation === "GODOWN" ? "Main Godown" : "Office Hub"}
              </span>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
            {allowClear && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between",
                  !selectedItemId
                    ? "bg-amber-50 text-amber-900 font-bold"
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <span>{clearLabel}</span>
                {!selectedItemId && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              </button>
            )}

            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <Package className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p>No matching items found</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedItemId;
                const locStock =
                  sourceLocation === "GODOWN" ? item.godownQty : item.officeQty;
                const altStock =
                  sourceLocation === "GODOWN" ? item.officeQty : item.godownQty;
                const itemIsZero = locStock === 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-2",
                      isSelected
                        ? "bg-amber-500/10 text-amber-950 font-bold"
                        : "hover:bg-slate-50 text-slate-800",
                      itemIsZero && "opacity-90 bg-slate-50/50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate">{item.name}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>Unit: {item.unit}</span>
                      </div>
                    </div>

                    {/* Stock status indicator */}
                    <div className="shrink-0 text-right">
                      {itemIsZero ? (
                        <div className="flex flex-col items-end">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                            0 in {sourceLocation === "GODOWN" ? "Godown" : "Office"}
                          </span>
                          {altStock > 0 && (
                            <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                              ({altStock} in {otherLocation === "GODOWN" ? "Godown" : "Office"})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-extrabold border",
                              sourceLocation === "GODOWN"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            )}
                          >
                            {formatNumber(locStock)} {item.unit}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {otherLocation === "GODOWN" ? "Godown" : "Office"}: {altStock}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
