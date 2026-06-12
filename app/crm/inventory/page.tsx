"use client";

import { useEffect, useState } from "react";

interface InventoryRow {
  sku: string;
  product_name: string;
  category: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  stock_status: "In Stock" | "Low Stock" | "Out of Stock";
}

interface InventoryData {
  kpis: {
    totalSkus: number;
    totalStockUnits: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
  inventory: InventoryRow[];
}

const formatNumber = (value: number) => value.toLocaleString("vi-VN");

function statusClass(status: InventoryRow["stock_status"]) {
  if (status === "In Stock") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Low Stock") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetch("/api/inventory", { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setData(json.data);
          else setError(json.message || "Không thể tải tồn kho.");
        })
        .catch(() => setError("Không thể kết nối server."))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const kpis = data
    ? [
        ["Total SKUs", formatNumber(data.kpis.totalSkus), "SKU đang theo dõi"],
        ["Total Stock Units", formatNumber(data.kpis.totalStockUnits), "Tổng current stock"],
        ["Low Stock Items", formatNumber(data.kpis.lowStockItems), "Cần lên kế hoạch nhập"],
        ["Out of Stock Items", formatNumber(data.kpis.outOfStockItems), "Không còn available stock"],
      ]
    : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Warehouse Operations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Warehouse Inventory</h1>
        <p className="mt-2 text-sm text-slate-500">
          Theo dõi tồn kho theo SKU, reserved stock, available stock và ngưỡng reorder.
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
      ) : data && data.inventory.length > 0 ? (
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

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Inventory table</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Current</th>
                    <th className="px-4 py-3 text-right">Reserved</th>
                    <th className="px-4 py-3 text-right">Available</th>
                    <th className="px-4 py-3 text-right">Reorder</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inventory.map((row) => (
                    <tr key={row.sku} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">{row.product_name}</td>
                      <td className="px-4 py-3 text-slate-600">{row.category}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(row.current_stock)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(row.reserved_stock)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatNumber(row.available_stock)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(row.reorder_level)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(row.stock_status)}`}>
                          {row.stock_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Chưa có dữ liệu tồn kho</h2>
          <p className="mt-2 text-sm text-slate-500">Inventory được dựng từ invoice items, hãy seed hoặc tạo hóa đơn trước.</p>
        </section>
      )}
    </div>
  );
}
