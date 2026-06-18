"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface InventoryBatch {
  batch_id: string;
  sku: string;
  product_name: string;
  category: string;
  received_date: string;
  initial_quantity: number;
  remaining_quantity: number;
  allocated_quantity: number;
  unit_cost: number;
  expiry_date: string;
  days_in_stock: number;
  stock_age_status: "Fresh" | "Normal" | "Aging" | "Old Stock";
  status: "Available" | "Low Stock" | "Depleted";
  source: "inventory_batches" | "Derived from invoices";
}

interface FifoAllocation {
  order_id: string;
  order_date: string;
  product_name: string;
  sku: string;
  requested_quantity: number;
  batch_id: string;
  quantity_allocated: number;
  remaining_after_allocate: number;
  shortage: number;
  allocation_sequence: number;
}

interface FifoData {
  kpis: {
    totalBatches: number;
    totalRemainingUnits: number;
    oldestStockAge: number;
    averageStockAge: number;
    longAgingStock: number;
    fifoShortageWarnings: number;
  };
  agingBuckets: Array<{
    bucket: string;
    batches: number;
    remaining_units: number;
  }>;
  insights: {
    oldestBatchText: string;
    oldStockUnitsText: string;
    clearanceSkusText: string;
    shortageText: string;
  };
  batches: InventoryBatch[];
  allocations: FifoAllocation[];
  shortageWarnings: FifoAllocation[];
  source: string;
}

const formatNumber = (value: number) => value.toLocaleString("vi-VN");

function ageStatusClass(status: InventoryBatch["stock_age_status"]) {
  if (status === "Fresh") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Normal") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "Aging") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function batchStatusClass(status: InventoryBatch["status"]) {
  if (status === "Available") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Low Stock") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export default function FifoDashboardPage() {
  const [data, setData] = useState<FifoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetch("/api/fifo", { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setData(json.data);
          else setError(json.message || "Không thể tải FIFO dashboard.");
        })
        .catch(() => setError("Không thể kết nối server."))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const kpis = data
    ? [
        ["Total Batches", formatNumber(data.kpis.totalBatches), "Lô hàng đang theo dõi"],
        ["Total Remaining Units", formatNumber(data.kpis.totalRemainingUnits), "Tồn còn lại sau mô phỏng"],
        ["Oldest Stock Age", `${formatNumber(data.kpis.oldestStockAge)} days`, "Batch cũ nhất còn tồn"],
        ["Average Stock Age", `${formatNumber(data.kpis.averageStockAge)} days`, "Tuổi tồn kho bình quân"],
        ["Long Aging Stock", formatNumber(data.kpis.longAgingStock), "Batch tồn trên 90 ngày"],
        ["FIFO Shortage Warnings", formatNumber(data.kpis.fifoShortageWarnings), "Dòng order bị thiếu hàng"],
      ]
    : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Warehouse Operations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">FIFO Aging Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Phân tích tuổi tồn kho, batch tồn lâu và mô phỏng xuất kho theo nguyên tắc nhập trước xuất trước.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
          ))}
        </div>
      ) : data && data.batches.length > 0 ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {kpis.map(([label, value, helper]) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
                <p className="mt-2 text-xs text-slate-500">{helper}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-950">Aging Buckets</h2>
                  <p className="mt-1 text-sm text-slate-500">Nhóm tuổi tồn kho theo số ngày hàng nằm trong kho.</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  {data.source}
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.agingBuckets}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="remaining_units" name="Remaining units" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="batches" name="Batches" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">FIFO Insights</h2>
              <div className="mt-4 space-y-3">
                {Object.values(data.insights).map((insight) => (
                  <div key={insight} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {insight}
                  </div>
                ))}
              </div>
              {data.shortageWarnings.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                  Shortage warning: nhu cầu fulfill lớn hơn tồn kho khả dụng ở một số SKU.
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Batch Aging</h2>
              <p className="mt-1 text-sm text-slate-500">
                Days in stock = hôm nay trừ ngày nhập/received date. Dữ liệu fallback được ghi rõ là derived.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Batch ID</th>
                    <th className="px-4 py-3">Import Date</th>
                    <th className="px-4 py-3 text-right">Days</th>
                    <th className="px-4 py-3 text-right">Original</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3 text-right">Allocated</th>
                    <th className="px-4 py-3">Age Status</th>
                    <th className="px-4 py-3">Batch Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.batches.slice(0, 100).map((batch) => (
                    <tr key={batch.batch_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{batch.sku}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">{batch.product_name}</p>
                        <p className="text-xs text-slate-500">{batch.source}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{batch.batch_id}</td>
                      <td className="px-4 py-3 text-slate-600">{batch.received_date}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatNumber(batch.days_in_stock)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(batch.initial_quantity)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatNumber(batch.remaining_quantity)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(batch.allocated_quantity)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ageStatusClass(batch.stock_age_status)}`}>
                          {batch.stock_age_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${batchStatusClass(batch.status)}`}>
                          {batch.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">FIFO allocation simulation</h2>
              <p className="mt-1 text-sm text-slate-500">Allocation sequence cho thấy batch cũ nhất được dùng trước.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Seq</th>
                    <th className="px-4 py-3">Order date</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3 text-right">Requested</th>
                    <th className="px-4 py-3">Batch used</th>
                    <th className="px-4 py-3 text-right">Allocated</th>
                    <th className="px-4 py-3 text-right">Remaining after</th>
                    <th className="px-4 py-3 text-right">Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.allocations.map((allocation, index) => (
                    <tr key={`${allocation.order_id}-${allocation.batch_id}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{allocation.allocation_sequence}</td>
                      <td className="px-4 py-3 text-slate-600">{allocation.order_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">{allocation.product_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{allocation.sku}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(allocation.requested_quantity)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{allocation.batch_id}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatNumber(allocation.quantity_allocated)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(allocation.remaining_after_allocate)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-700">{formatNumber(allocation.shortage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Chưa có dữ liệu FIFO</h2>
          <p className="mt-2 text-sm text-slate-500">FIFO cần invoice items hoặc inventory_batches để phân tích.</p>
        </section>
      )}
    </div>
  );
}
