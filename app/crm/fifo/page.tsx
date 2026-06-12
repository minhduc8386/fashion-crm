"use client";

import { useEffect, useState } from "react";

interface InventoryBatch {
  batch_id: string;
  sku: string;
  product_name: string;
  received_date: string;
  initial_quantity: number;
  remaining_quantity: number;
  unit_cost: number;
  expiry_date: string;
  status: "Available" | "Low Stock" | "Depleted";
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
}

interface FifoData {
  kpis: {
    totalBatches: number;
    allocatedUnits: number;
    shortageUnits: number;
    depletedBatches: number;
  };
  batches: InventoryBatch[];
  allocations: FifoAllocation[];
  shortageWarnings: FifoAllocation[];
}

const formatNumber = (value: number) => value.toLocaleString("vi-VN");
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

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
        ["Total Batches", formatNumber(data.kpis.totalBatches), "Lô hàng được mô phỏng"],
        ["Allocated Units", formatNumber(data.kpis.allocatedUnits), "Đã allocate theo FIFO"],
        ["Shortage Units", formatNumber(data.kpis.shortageUnits), "Thiếu hàng khi fulfill"],
        ["Depleted Batches", formatNumber(data.kpis.depletedBatches), "Batch đã dùng hết"],
      ]
    : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Warehouse Operations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">FIFO Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Mô phỏng fulfill order theo nguyên tắc nhập trước xuất trước từ batch cũ nhất.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
          ))}
        </div>
      ) : data && data.batches.length > 0 ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {kpis.map(([label, value, helper]) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
                <p className="mt-2 text-xs text-slate-500">{helper}</p>
              </article>
            ))}
          </section>

          {data.shortageWarnings.length > 0 && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Có {formatNumber(data.shortageWarnings.length)} order line bị thiếu hàng trong mô phỏng FIFO.
            </section>
          )}

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Batch table</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3 text-right">Initial</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3 text-right">Unit cost</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.batches.slice(0, 80).map((batch) => (
                    <tr key={batch.batch_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{batch.batch_id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{batch.sku}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">{batch.product_name}</td>
                      <td className="px-4 py-3 text-slate-600">{batch.received_date}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(batch.initial_quantity)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatNumber(batch.remaining_quantity)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(batch.unit_cost)}</td>
                      <td className="px-4 py-3 text-slate-600">{batch.expiry_date}</td>
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
              <p className="mt-1 text-sm text-slate-500">Order item được allocate vào batch cũ nhất còn tồn.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
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
          <p className="mt-2 text-sm text-slate-500">FIFO cần invoice items để mô phỏng batch allocation.</p>
        </section>
      )}
    </div>
  );
}
