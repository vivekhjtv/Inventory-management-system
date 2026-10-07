"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Check, Layers, ChevronDown } from "lucide-react";
import { Category, CATEGORIES } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export interface CatalogItemOption {
  id: string;
  name: string;
  category: string;
  unit: string;
  minThreshold?: number | null;
  godownQty: number;
  officeQty: number;
}

interface ItemComboboxProps {
  items: CatalogItemOption[];
  selectedItemId: string;
  onSelect: (item: CatalogItemOption | null) => void;
  locationFocus?: "GODOWN" | "OFFICE";
  label?: string;
  required?: boolean;
}

export function ItemCombobox({
  items,
  selectedItemId,
  onSelect,
  locationFocus,
  label = "Select Material / Component",
  required = true,
}: ItemComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;
      const matchesSearch =
        search.trim() === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, search]);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
        {label} {required && <span className="text-amber-500">*</span>}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full flex items-center justify-between text-left px-3.5 py-3 rounded-xl border bg-white shadow-xs transition-all touch-target",
          isOpen
            ? "border-amber-500 ring-2 ring-amber-500/20"
            : "border-slate-200 hover:border-slate-300",
          !selectedItem && "text-slate-400"
        )}
      >
        <div className="flex-1 min-w-0 pr-2">
          {selectedItem ? (
            <div>
              <div className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                {selectedItem.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 font-medium text-slate-600 uppercase text-[10px]">
                  {selectedItem.category.replace("_", " ")}
                </span>
                <span>• Unit: {selectedItem.unit}</span>
                {locationFocus && (
                  <span
                    className={cn(
                      "font-semibold",
                      (locationFocus === "GODOWN"
                        ? selectedItem.godownQty
                        : selectedItem.officeQty) > 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    )}
                  >
                    • {locationFocus === "GODOWN" ? "Godown" : "Office"} Stock:{" "}
                    {formatNumber(
                      locationFocus === "GODOWN"
                        ? selectedItem.godownQty
                        : selectedItem.officeQty
                    )}{" "}
                    {selectedItem.unit}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm">Search by item name, model, or code...</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-slate-400 shrink-0 transition-transform",
            isOpen && "rotate-180 text-amber-500"
          )}
        />
      </button>

      {/* Dropdown Modal / Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to filter 70+ solar items..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                  selectedCategory === "ALL"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/60"
                )}
              >
                All Items ({items.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = items.filter((i) => i.category === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                      selectedCategory === cat.key
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/60"
                    )}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-medium">No matching items found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Try adjusting your search or category filter.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedItemId;
                const relevantQty =
                  locationFocus === "GODOWN"
                    ? item.godownQty
                    : locationFocus === "OFFICE"
                    ? item.officeQty
                    : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors touch-target",
                      isSelected
                        ? "bg-amber-50 text-amber-950 font-medium"
                        : "hover:bg-slate-50 text-slate-800"
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          {item.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{item.category.replace("_", " ")}</span>
                        {locationFocus && (
                          <span
                            className={cn(
                              "font-medium",
                              (relevantQty ?? 0) > 0
                                ? "text-emerald-600"
                                : "text-rose-500"
                            )}
                          >
                            • Available: {formatNumber(relevantQty)} {item.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {relevantQty !== null && (
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-md text-xs font-semibold",
                            relevantQty > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {formatNumber(relevantQty)}
                        </div>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-600" />
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
