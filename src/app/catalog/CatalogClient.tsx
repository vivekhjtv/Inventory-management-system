"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { addNewItem } from "@/actions/inventory";
import { CATEGORIES, Category } from "@/lib/types";
import {
  PackagePlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Boxes,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface ItemRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  minThreshold: number | null;
  godownQty: number;
  officeQty: number;
  createdAt: string;
}

export function CatalogClient({ initialItems }: { initialItems: ItemRecord[] }) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRecord[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("PANELS");
  const [unit, setUnit] = useState("NOS");
  const [minThreshold, setMinThreshold] = useState("10");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat =
        selectedCategory === "ALL" || item.category === selectedCategory;
      const matchSearch =
        search === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, search]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    const res = await addNewItem({
      name: name.trim().toUpperCase(),
      category,
      unit: unit.toUpperCase(),
      minThreshold: parseFloat(minThreshold) || 0,
    });

    setLoading(false);

    if (res.success && res.item) {
      setStatusMessage({
        type: "success",
        text: `Item "${res.item.name}" registered into catalog successfully! Navigating to dashboard...`,
      });
      setName("");
      setShowAddForm(false);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to create item.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 sm:w-6 h-5 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
              Solar Item Catalog ({items.length})
            </h2>
            <p className="text-xs text-slate-500 line-clamp-2 sm:line-clamp-none">
              Manage pre-seeded solar panels, inverters, cables, and BOS inventory.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 touch-target"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? "Cancel" : "Add New Item"}</span>
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-semibold">{statusMessage.text}</div>
        </div>
      )}

      {/* Add New Item Form Collapsible */}
      {showAddForm && (
        <form
          onSubmit={handleAddItem}
          className="bg-white p-4 sm:p-6 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-4 animate-in slide-in-from-top-4 duration-200"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900 border-b border-amber-200/60 pb-3">
            <PackagePlus className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="truncate">Register New Solar Catalog Item</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Item / Model Name <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 640 ADANI BIFACIAL"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Category <span className="text-amber-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="NOS, METERS, SETS, FT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Min Threshold Alert
              </label>
              <input
                type="number"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                placeholder="10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-xs transition-colors disabled:opacity-50 touch-target"
            >
              {loading ? "Registering..." : "Save Item to Catalog"}
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by name or category..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors touch-target min-h-[36px] shrink-0",
              selectedCategory === "ALL"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All ({items.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat.key).length;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors touch-target min-h-[36px] shrink-0",
                  selectedCategory === cat.key
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-amber-400/60 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-extrabold text-sm text-slate-900 leading-snug break-words min-w-0">
                  {item.name}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold uppercase shrink-0">
                  {item.unit}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                  {item.category.replace("_", " ")}
                </span>
                <span>• Min: {item.minThreshold ?? 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2 rounded-xl min-w-0">
                <span className="text-slate-400 block text-[10px] font-medium">
                  Godown
                </span>
                <span className="font-bold text-amber-700 truncate block">
                  {formatNumber(item.godownQty)} {item.unit}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl min-w-0">
                <span className="text-slate-400 block text-[10px] font-medium">
                  Office
                </span>
                <span className="font-bold text-blue-700 truncate block">
                  {formatNumber(item.officeQty)} {item.unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
