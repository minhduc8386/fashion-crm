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

interface ProductMetric {
  sku: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  current_stock: number;
  stock_status: "In Stock" | "Low Stock" | "Out of Stock";
}

interface ProductsDashboardData {
  kpis: {
    totalProducts: number;
    unitsSold: number;
    productRevenue: number;
    bestSeller: string;
    lowStockProducts: number;
    outOfStockProducts: number;
    averageRevenuePerProduct: number;
    activeCategories: number;
  };
  revenueByCategory: Array<{ category: string; revenue: number; units: number; products: number }>;
  unitsSoldByCategory: Array<{ category: string; revenue: number; units: number; products: number }>;
  topByRevenue: ProductMetric[];
  topByQuantity: ProductMetric[];
  lowStockTable: ProductMetric[];
  products: ProductMetric[];
  source: string;
}

const formatNumber = (value: number) => value.toLocaleString("vi-VN");
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

function stockStatusClass(status: ProductMetric["stock_status"]) {
  if (status === "In Stock") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Low Stock") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export default function ProductsPage() {
  const [data, setData] = useState<ProductsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetch("/api/products/dashboard", { cache: "no-store" })
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
        ["Total Products / SKUs", formatNumber(data.kpis.totalProducts), "Derived from invoices"],
        ["Units Sold", formatNumber(data.kpis.unitsSold), "Tổng quantity bán ra"],
        ["Product Revenue", formatCurrency(data.kpis.productRevenue), "Doanh thu sản phẩm"],
        ["Best Seller", data.kpis.bestSeller, "Theo quantity sold"],
        ["Low Stock Products", formatNumber(data.kpis.lowStockProducts), "Estimated inventory"],
        ["Out of Stock Products", formatNumber(data.kpis.outOfStockProducts), "Estimated inventory"],
        ["Avg Revenue / Product", formatCurrency(data.kpis.averageRevenuePerProduct), "Revenue / SKUs"],
        ["Active Categories", formatNumber(data.kpis.activeCategories), "Category đang có sales"],
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Product Analytics</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Products Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            Phân tích SKU, category, doanh thu và tồn kho. Stock status hiện được estimated từ invoice items.
          </p>
        </div>
        {data && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {data.source}
          </span>
        )}
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
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
              <h2 className="font-semibold text-slate-950">Revenue by Category</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByCategory}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Units Sold by Category</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.unitsSoldByCategory}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="units" name="Units sold" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <RankingCard title="Top Products by Revenue" products={data.topByRevenue} metric="revenue" />
            <RankingCard title="Top Products by Quantity Sold" products={data.topByQuantity} metric="quantity" />
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Low Stock Table</h2>
              <p className="mt-1 text-sm text-slate-500">Estimated inventory; cần import tồn kho thật để vận hành production.</p>
            </div>
            {data.lowStockTable.length > 0 ? (
              <ProductTable products={data.lowStockTable} compact />
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">Không có sản phẩm Low Stock hoặc Out of Stock.</div>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Product Performance Table</h2>
            </div>
            <ProductTable products={data.products} />
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

function RankingCard({
  title,
  products,
  metric,
}: {
  title: string;
  products: ProductMetric[];
  metric: "revenue" | "quantity";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {products.map((product) => (
          <div key={`${title}-${product.sku}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div>
              <p className="font-medium text-slate-900">{product.product_name}</p>
              <p className="text-xs text-slate-500">{product.sku}</p>
            </div>
            <p className="font-semibold text-blue-700">
              {metric === "revenue" ? formatCurrency(product.revenue) : formatNumber(product.quantity_sold)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductTable({ products, compact = false }: { products: ProductMetric[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Product ID</th>
            <th className="px-4 py-3">Product Name</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Units Sold</th>
            <th className="px-4 py-3 text-right">Revenue</th>
            <th className="px-4 py-3 text-right">Current Stock</th>
            <th className="px-4 py-3">Stock Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.slice(0, compact ? 12 : 120).map((product) => (
            <tr key={`${compact ? "low" : "all"}-${product.sku}`} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{product.sku}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{product.product_id}</td>
              <td className="px-4 py-3 font-medium text-slate-950">{product.product_name}</td>
              <td className="px-4 py-3 text-slate-600">{product.category}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatNumber(product.quantity_sold)}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatCurrency(product.revenue)}</td>
              <td className="px-4 py-3 text-right">{formatNumber(product.current_stock)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stockStatusClass(product.stock_status)}`}>
                  {product.stock_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
