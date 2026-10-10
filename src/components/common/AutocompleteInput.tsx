"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, Sparkles, X, ChevronDown } from "lucide-react";

export interface AutocompleteOption {
  label: string;
  subLabel?: string;
  extraData?: any;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: AutocompleteOption) => void;
  options: Array<string | AutocompleteOption>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  leftIcon?: React.ReactNode;
  hasError?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  dropdownTitle?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelectOption,
  options,
  placeholder,
  className,
  inputClassName,
  leftIcon,
  hasError = false,
  name,
  id,
  required = false,
  disabled = false,
  maxLength,
  dropdownTitle = "Suggestions from Database",
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options to AutocompleteOption format
  const normalizedOptions: AutocompleteOption[] = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { label: opt };
      }
      return opt;
    });
  }, [options]);

  // Filter options based on user input
  const filteredOptions = React.useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      // If empty, show first 6 options as quick choices
      return normalizedOptions.slice(0, 6);
    }
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(query)
    );
  }, [normalizedOptions, value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: AutocompleteOption) => {
    onChange(option.label);
    if (onSelectOption) {
      onSelectOption(option);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredOptions.length === 0) {
      if (e.key === "ArrowDown") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const selected = filteredOptions[highlightedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-amber-100 text-amber-900 font-black rounded-xs px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (normalizedOptions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "w-full pr-8 py-2.5 rounded-xl border bg-white text-sm font-medium focus:outline-none transition-all",
            leftIcon ? "pl-9" : "pl-3.5",
            hasError
              ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500",
            inputClassName
          )}
        />

        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </div>
        )}

        {/* Clear Button or Suggestion Indicator */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {normalizedOptions.length > 0 && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-150",
                  isOpen ? "rotate-180 text-amber-600" : ""
                )}
              />
            </button>
          )}
        </div>
      </div>



      {/* Interactive Suggestion Dropdown */}
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{dropdownTitle}</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {filteredOptions.length} available
            </span>
          </div>

          <ul className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredOptions.map((opt, index) => {
              const isSelected =
                value.trim().toLowerCase() === opt.label.trim().toLowerCase();
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={`${opt.label}-${index}`}
                  onMouseDown={(e) => {
                    // Prevent blur so handleSelect executes cleanly
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "px-3.5 py-2 text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors",
                    isHighlighted
                      ? "bg-amber-50/80 text-amber-950"
                      : isSelected
                      ? "bg-slate-50 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold truncate text-slate-900 text-[13px] flex items-center gap-1.5">
                      <span>{highlightMatch(opt.label, value)}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    {opt.subLabel && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1 font-normal">
                        <span>{opt.subLabel}</span>
                      </div>
                    )}
                  </div>

                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    Use ➔
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
