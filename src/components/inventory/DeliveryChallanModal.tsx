"use client";

import React, { useRef } from "react";
import { Printer, X, Check, Building2, Phone, MapPin, Calendar, FileText, UserCheck } from "lucide-react";

export interface ChallanItem {
  name: string;
  category?: string;
  quantity: number;
  unit: string;
}

export interface DeliveryChallanData {
  challanNo?: string | null;
  date?: string | Date | null;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  technicianName?: string | null;
  dispatchedByName?: string | null;
  items: ChallanItem[];
  remarks?: string | null;
  sourceLocation?: string | null;
}

interface DeliveryChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DeliveryChallanData | null;
}

export function DeliveryChallanModal({
  isOpen,
  onClose,
  data,
}: DeliveryChallanModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = data.date
    ? new Date(data.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:border-none print:shadow-none print:rounded-none print:max-w-none">
        
        {/* Modal Top Action Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm tracking-wide">Delivery Challan Voucher</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all touch-target"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Challan</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors touch-target"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DELIVERY CHALLAN SLIP */}
        <div
          ref={printRef}
          className="p-6 sm:p-8 text-slate-900 font-sans print:p-4 print:text-black print:m-0"
        >
          {/* Challan Border Frame */}
          <div className="border-2 border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 print:border-2 print:border-black print:rounded-none">
            
            {/* Header: Company Name & Contact Info */}
            <div className="text-center border-b-2 border-slate-800 pb-3 relative">
              <div className="text-[11px] font-black tracking-widest text-slate-600 uppercase flex items-center justify-center gap-4">
                <span>DELIVERY CHALLAN</span>
                <span className="text-[10px] font-normal border border-slate-400 px-1.5 py-0.2 rounded">
                  Duplicate / Site Copy
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-950 mt-1 uppercase">
                JAFFINS ENTERPRISE
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-700 font-medium mt-0.5">
                Vazirvali Street, Nr. Barton Library, Diwanpara Road, Bhavnagar - 364 001
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 text-[11px] font-bold text-slate-800 mt-1">
                <span>M.: 7600080410</span>
                <span>•</span>
                <span>GSTIN : 24BEPPK3942B1ZO</span>
              </div>
            </div>

            {/* Top Details Grid: Customer Info & Challan Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b-2 border-slate-800 pb-3">
              {/* Customer Column */}
              <div className="space-y-1.5 pr-2">
                <div className="flex items-start gap-1.5">
                  <span className="font-extrabold text-slate-900 w-16 shrink-0">Name:</span>
                  <span className="font-bold text-slate-900 break-words flex-1">
                    {data.customerName}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-slate-700 w-16 shrink-0">Address:</span>
                  <span className="text-slate-800 break-words flex-1">
                    {data.customerAddress || "Site / Installation Address"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 w-16 shrink-0">Mobile:</span>
                  <span className="font-extrabold font-mono text-slate-900">
                    {data.customerPhone || "-"}
                  </span>
                </div>
              </div>

              {/* Challan Meta Column */}
              <div className="space-y-1.5 sm:border-l-2 sm:border-slate-800 sm:pl-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Challan No.:</span>
                  <span className="font-black text-red-600 font-mono text-sm px-2 py-0.5 bg-red-50 rounded border border-red-200">
                    {data.challanNo || "DSP-" + Math.floor(100 + Math.random() * 900)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Date:</span>
                  <span className="font-mono font-bold text-slate-900">{formattedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Technician:</span>
                  <span className="font-semibold text-slate-900">{data.technicianName || "Assigned Team"}</span>
                </div>
                {data.sourceLocation && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Dispatched Origin:</span>
                    <span className="font-bold text-slate-800">{data.sourceLocation} Stock</span>
                  </div>
                )}
              </div>
            </div>

            {/* Particulars & Quantity Table */}
            <div>
              <table className="w-full text-left border-collapse border border-slate-800 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-800 text-slate-900 font-black">
                    <th className="py-2 px-2.5 border-r border-slate-800 w-10 text-center">Sr.</th>
                    <th className="py-2 px-3 border-r border-slate-800">Particulars (Item & Specifications)</th>
                    <th className="py-2 px-3 text-right w-28">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-800/60">
                      <td className="py-2 px-2.5 border-r border-slate-800 text-center font-bold text-slate-700">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 font-bold text-slate-900">
                        <div>{item.name}</div>
                        {item.category && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            Category: {item.category}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-black font-mono text-sm text-slate-900 whitespace-nowrap">
                        {item.quantity} {item.unit}
                      </td>
                    </tr>
                  ))}
                  {/* Empty rows filler if few items to resemble paper challan */}
                  {data.items.length < 4 &&
                    Array.from({ length: 4 - data.items.length }).map((_, fIdx) => (
                      <tr key={`fill-${fIdx}`} className="border-b border-slate-800/30 h-8">
                        <td className="py-1 px-2.5 border-r border-slate-800 text-center text-transparent">
                          .
                        </td>
                        <td className="py-1 px-3 border-r border-slate-800 text-transparent">.</td>
                        <td className="py-1 px-3 text-transparent">.</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Remarks / Handwritten Notes Box */}
            <div className="border border-slate-800 rounded-xl p-2.5 bg-slate-50/50 text-xs">
              <span className="font-bold text-slate-700 block mb-0.5">Remarks / Field Notes:</span>
              <p className="text-slate-800 italic min-h-[28px] break-words">
                {data.remarks || "Materials verified and received in good working condition."}
              </p>
            </div>

            {/* Signature Footer */}
            <div className="pt-8 flex items-end justify-between text-xs font-bold text-slate-900">
              <div className="text-center w-40">
                <div className="border-b-2 border-slate-800 mb-1 pb-1" />
                <span>Receiver&apos;s Sign.</span>
              </div>
              <div className="text-center w-40">
                <div className="border-b-2 border-slate-800 mb-1 pb-1 text-[11px] text-slate-600 font-normal">
                  {data.dispatchedByName ? `Prepared by ${data.dispatchedByName}` : "Authorized Sign"}
                </div>
                <span>Prepared Sign.</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
