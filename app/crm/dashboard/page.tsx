"use client";

import { useState, useEffect } from "react";
import CrmNavbar from "@/components/CrmNavbar";

interface DashboardData {
  totalCustomers: number;
  totalInvoices: number;
  totalRevenue: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.message || "Không thể tải dữ liệu.");
      })
      .catch(() => setError("Không thể kết nối server."))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  const stats = data
    ? [
        {
          id: "stat-customers",
          icon: "👥",
          label: "Tổng khách hàng",
          value: data.totalCustomers.toLocaleString("vi-VN"),
          sub: "thành viên đã đăng ký",
          gradient: "from-blue-600/20 to-blue-800/10",
          border: "border-blue-500/20",
          valueColor: "text-blue-300",
        },
        {
          id: "stat-invoices",
          icon: "🧾",
          label: "Tổng hoá đơn",
          value: data.totalInvoices.toLocaleString("vi-VN"),
          sub: "giao dịch đã thực hiện",
          gradient: "from-emerald-600/20 to-emerald-800/10",
          border: "border-emerald-500/20",
          valueColor: "text-emerald-300",
        },
        {
          id: "stat-revenue",
          icon: "💰",
          label: "Tổng doanh thu",
          value: formatCurrency(data.totalRevenue),
          sub: "tính từ tất cả hoá đơn",
          gradient: "from-purple-600/20 to-purple-800/10",
          border: "border-purple-500/20",
          valueColor: "text-purple-300",
        },
      ]
    : [];

  const avgRevenue =
    data && data.totalInvoices > 0
      ? data.totalRevenue / data.totalInvoices
      : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <CrmNavbar title="📊 Dashboard tổng quan" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-1">Tổng quan kinh doanh</h2>
          <p className="text-slate-400 text-sm">
            Dữ liệu live từ MongoDB Atlas •{" "}
            <span className="text-green-400">● Đang kết nối</span>
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-slate-900 border border-white/10 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-10 text-center mb-8">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-300 font-semibold mb-1">{error}</p>
            <button onClick={() => window.location.reload()}
              className="mt-3 text-slate-400 hover:text-white text-sm underline transition-colors">
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              {stats.map((stat) => (
                <div key={stat.id} id={stat.id}
                  className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-2xl p-6 hover:border-white/20 transition-colors`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{stat.icon}</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                  <p className={`font-bold text-2xl leading-tight ${stat.valueColor}`}>{stat.value}</p>
                  <p className="text-slate-500 text-xs mt-2">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Secondary stats */}
            {data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                  <p className="text-slate-400 text-sm mb-1">Giá trị trung bình / hoá đơn</p>
                  <p className="text-white font-bold text-xl">{formatCurrency(avgRevenue)}</p>
                </div>
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                  <p className="text-slate-400 text-sm mb-1">Chi tiêu TB / khách hàng</p>
                  <p className="text-white font-bold text-xl">
                    {data.totalCustomers > 0
                      ? formatCurrency(data.totalRevenue / data.totalCustomers)
                      : "–"}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Thao tác nhanh</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { href: "/register", icon: "📝", label: "Đăng ký khách hàng mới", id: "quick-register" },
                  { href: "/crm/customers", icon: "👥", label: "Xem & thêm khách hàng", id: "quick-customers" },
                  { href: "/crm/invoices", icon: "🧾", label: "Tạo hoá đơn mới", id: "quick-invoices" },
                ].map((item) => (
                  <a key={item.id} href={item.href} id={item.id}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 transition-all group">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-slate-300 group-hover:text-white text-sm transition-colors">{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
