"use client";

import React from "react";
import { Plus, Minus } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  max?: number | null;
  label?: string;
  quickIncrements?: number[];
}

export function QuantityStepper({
  value,
  onChange,
  unit = "NOS",
  max = null,
  label = "Quantity to Move",
  quickIncrements = [1, 5, 10, 25, 50, 100],
}: QuantityStepperProps) {
  const handleDecrement = () => {
    if (value > 1) {
      onChange(Math.max(0, value - 1));
    } else {
      onChange(0);
    }
  };

  const handleIncrement = () => {
    if (max !== null && max !== undefined && value >= max) {
      return;
    }
    onChange(value + 1);
  };

  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  };

  const handleAddQuick = (increment: number) => {
    const next = value + increment;
    if (max !== null && max !== undefined && next > max) {
      onChange(max);
    } else {
      onChange(next);
    }
  };

  const isExceeded = max !== null && max !== undefined && value > max;

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
          {label} <span className="text-amber-500">*</span>
        </label>
        {max !== null && max !== undefined && (
          <span
            className={cn(
              "text-xs font-semibold shrink-0",
              isExceeded ? "text-rose-600 animate-pulse" : "text-slate-500"
            )}
          >
            Available: {formatNumber(max)} {unit}
          </span>
        )}
      </div>

      {/* Primary Stepper Control */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= 0}
          className="w-12 sm:w-14 h-12 sm:h-14 shrink-0 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all touch-target"
          aria-label="Decrease quantity"
        >
          <Minus className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="relative flex-1">
          <input
            type="number"
            step="any"
            inputMode="decimal"
            min="0"
            max={max !== null ? max : undefined}
            value={value === 0 ? "" : value}
            placeholder="0"
            onChange={handleDirectInput}
            className={cn(
              "w-full h-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-2xl border bg-white shadow-xs focus:outline-none transition-all pr-12 pl-4",
              isExceeded
                ? "border-rose-500 text-rose-600 ring-2 ring-rose-500/20"
                : "border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900"
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase pointer-events-none truncate max-w-[40px]">
            {unit}
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={max !== null && max !== undefined && value >= max}
          className="w-12 sm:w-14 h-12 sm:h-14 shrink-0 rounded-2xl bg-amber-500 text-white shadow-xs flex items-center justify-center hover:bg-amber-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all touch-target"
          aria-label="Increase quantity"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Stock warning notification */}
      {isExceeded && (
        <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>
            Quantity exceeds available stock ({formatNumber(max)} {unit}). Cannot proceed with dispatch/transfer.
          </span>
        </div>
      )}

      {/* Fast Mobile Quick-Add Buttons */}
      <div className="pt-1">
        <div className="text-[11px] font-medium text-slate-400 mb-1">
          Quick Add Chips:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              type="button"
              onClick={() => handleAddQuick(inc)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-amber-100 active:text-amber-800 text-slate-700 font-semibold text-xs transition-colors touch-target min-h-[36px]"
            >
              +{inc}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(0)}
            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-colors touch-target min-h-[36px]"
          >
            Reset
          </button>
          {max !== null && max > 0 && (
            <button
              type="button"
              onClick={() => onChange(max)}
              className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs transition-colors ml-auto touch-target min-h-[36px]"
            >
              Max ({formatNumber(max)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
