"use client";

import { useEffect, useState } from "react";

interface ProductMetric {
  sku: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  current_stock: number;
}

interface ProductsData {
  kpis: {
    totalProducts: number;
    productsSold: number;
    productRevenue: number;
    bestSeller: string;
  };
  products: ProductMetric[];
  topByQuantity: ProductMetric[];
  topByRevenue: ProductMetric[];
}

const formatNumber = (value: number) => value.toLocaleString("vi-VN");
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export default function ProductsPage() {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetch("/api/products", { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setData(json.data);
          else setError(json.message || "Không thể tải dữ liệu sản phẩm.");
        })
        .catch(() => setError("Không thể kết nối server."))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const kpis = data
    ? [
        ["Total Products", formatNumber(data.kpis.totalProducts), "SKU phát sinh từ order items"],
        ["Products Sold", formatNumber(data.kpis.productsSold), "Tổng quantity đã bán"],
        ["Product Revenue", formatCurrency(data.kpis.productRevenue), "Doanh thu theo sản phẩm"],
        ["Best Seller", data.kpis.bestSeller, "Theo quantity sold"],
      ]
    : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Product Analytics</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Products</h1>
        <p className="mt-2 text-sm text-slate-500">
          Aggregate sản phẩm từ invoice items trong MongoDB, gồm doanh thu, số lượng bán và tồn kho hiện tại.
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
      ) : data && data.products.length > 0 ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {kpis.map(([label, value, helper]) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
                <p className="mt-2 text-xs text-slate-500">{helper}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Top products by quantity sold</h2>
              <div className="mt-4 space-y-3">
                {data.topByQuantity.map((product) => (
                  <div key={product.sku} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <p className="font-medium text-slate-900">{product.product_name}</p>
                      <p className="text-xs text-slate-500">{product.sku}</p>
                    </div>
                    <p className="font-semibold text-blue-700">{formatNumber(product.quantity_sold)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Top products by revenue</h2>
              <div className="mt-4 space-y-3">
                {data.topByRevenue.map((product) => (
                  <div key={product.sku} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <p className="font-medium text-slate-900">{product.product_name}</p>
                      <p className="text-xs text-slate-500">{product.category}</p>
                    </div>
                    <p className="font-semibold text-emerald-700">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Product table</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Sold</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Current stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.products.map((product) => (
                    <tr key={product.sku} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{product.sku}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">{product.product_name}</p>
                        <p className="text-xs text-slate-500">{product.product_id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.category}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatNumber(product.quantity_sold)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatCurrency(product.revenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(product.current_stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Chưa có dữ liệu sản phẩm</h2>
          <p className="mt-2 text-sm text-slate-500">Hãy seed hoặc tạo invoice để Products module có dữ liệu.</p>
        </section>
      )}
    </div>
  );
}
