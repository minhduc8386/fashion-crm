"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface InvoiceItem {
  name?: string;
  product_name?: string;
  category?: string;
  price: number;
  quantity: number;
  subtotal?: number;
}

interface Invoice {
  _id: string;
  items: InvoiceItem[];
  total_amount: number;
  notes: string;
  created_at: string;
}

interface Metrics {
  total_spent: number;
  invoice_count: number;
  aov: number;
  tenure_days: number;
  subscription_active: boolean;
  subscription_days_left: number;
  favorite_category: string | null;
  last_purchase_date: string | null;
  tier: string;
}

interface Customer {
  _id: string;
  name?: string;
  full_name?: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  // Demographic from FPT system
  user_id?: string;
  device_model?: string;
  device_name?: string;
  mac_address?: string;
  platform?: string;
  market_plan?: string;
  plan_id?: string;
  mp_join_time?: string;
  mp_expire_time?: string;
  status?: number;
  created_at: string;
}

interface CustomerDetail {
  customer: Customer;
  invoices: Invoice[];
  metrics: Metrics;
}

const TIER_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  "VIP Platinum": { color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200", icon: "💎" },
  "VIP Gold":     { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "🥇" },
  "Thân thiết":   { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: "⭐" },
  "Thường xuyên": { color: "text-sky-700", bg: "bg-sky-50 border-sky-200", icon: "🔵" },
  "Mới":          { color: "text-slate-700", bg: "bg-slate-50 border-slate-200", icon: "🆕" },
};

export default function Customer360Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"invoices" | "demographic">("invoices");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDetail(json.data);
        else setError(json.message || "Không thể tải dữ liệu.");
      })
      .catch(() => setError("Không thể kết nối server."))
      .finally(() => setLoading(false));
  }, [id]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-slate-950">Đang tải Customer 360...</h1>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-lg animate-pulse border border-slate-200" />
            ))}
          </div>
          <div className="h-64 bg-white rounded-lg animate-pulse border border-slate-200" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div>
        <div className="rounded-lg border border-red-200 bg-white px-6 py-20 text-center shadow-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-700 font-semibold mb-4">{error || "Không tìm thấy khách hàng."}</p>
          <button onClick={() => router.push("/crm/customers")}
            className="text-blue-600 hover:text-blue-700 text-sm underline transition-colors">
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const { customer, invoices, metrics } = detail;
  const custName = customer.name || customer.full_name || "Khách hàng";
  const tier = metrics.tier;
  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG["Mới"];

  const kpiCards = [
    {
      id: "kpi-ltv",
      icon: "💰",
      label: "Lifetime Value (LTV)",
      value: fmt(metrics.total_spent),
      sub: "Tổng chi tiêu tích lũy",
      bg: "bg-blue-50",
      border: "border-blue-200",
      valueColor: "text-blue-700",
    },
    {
      id: "kpi-invoices",
      icon: "🧾",
      label: "Số hóa đơn",
      value: metrics.invoice_count.toString(),
      sub: "Giao dịch đã thực hiện",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      valueColor: "text-emerald-700",
    },
    {
      id: "kpi-aov",
      icon: "📊",
      label: "AOV (Giá trị TB / đơn)",
      value: fmt(metrics.aov),
      sub: "Average Order Value",
      bg: "bg-sky-50",
      border: "border-sky-200",
      valueColor: "text-sky-700",
    },
    {
      id: "kpi-tenure",
      icon: "📅",
      label: "Tuổi đời",
      value: `${metrics.tenure_days} ngày`,
      sub: `Từ ${fmtDate(customer.created_at)}`,
      bg: "bg-amber-50",
      border: "border-amber-200",
      valueColor: "text-amber-700",
    },
  ];

  return (
    <div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-lg bg-slate-900 flex items-center justify-center text-2xl font-bold text-white shadow-sm">
              {custName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950 capitalize">{custName}</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {customer.phone} {customer.email && `• ${customer.email}`}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${tierCfg.bg} ${tierCfg.color}`}>
                  {tierCfg.icon} {tier}
                </span>
                {metrics.subscription_active ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    ✅ Gói còn {metrics.subscription_days_left} ngày
                  </span>
                ) : customer.mp_expire_time ? (
                  <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                    ❌ Gói đã hết hạn
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button onClick={() => router.push("/crm/customers")}
            className="text-slate-600 hover:text-slate-950 text-sm border border-slate-200 hover:border-slate-300 bg-white px-4 py-2 rounded-lg transition-all">
            ← Danh sách
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi) => (
            <div key={kpi.id} id={kpi.id}
              className={`${kpi.bg} border ${kpi.border} rounded-lg p-4 transition-colors`}>
              <div className="text-2xl mb-2">{kpi.icon}</div>
              <p className="text-slate-600 text-xs mb-1">{kpi.label}</p>
              <p className={`font-bold text-lg leading-tight ${kpi.valueColor}`}>{kpi.value}</p>
              <p className="text-slate-500 text-xs mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-slate-500 text-xs mb-1">Danh mục yêu thích</p>
            <p className="text-slate-950 font-semibold">{metrics.favorite_category || "—"}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-slate-500 text-xs mb-1">Lần mua gần nhất</p>
            <p className="text-slate-950 font-semibold">{fmtDate(metrics.last_purchase_date)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-slate-500 text-xs mb-1">Thiết bị</p>
            <p className="text-slate-950 font-semibold text-sm">{customer.device_model || "—"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-200">
          <button
            id="tab-invoices"
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "invoices"
                ? "text-blue-700 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            🧾 Lịch sử mua hàng ({invoices.length})
          </button>
          <button
            id="tab-demographic"
            onClick={() => setActiveTab("demographic")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "demographic"
                ? "text-blue-700 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            📋 Thông tin & Thiết bị
          </button>
        </div>

        {/* Tab: Lịch sử mua hàng */}
        {activeTab === "invoices" && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-white border border-slate-200 rounded-lg">
                Chưa có hóa đơn nào.
              </div>
            ) : (
              invoices.map((inv, idx) => (
                <div key={inv._id || idx}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm transition-colors">
                  {/* Invoice Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-xs font-mono">#{String(idx + 1).padStart(3, "0")}</span>
                      <span className="text-slate-600 text-sm">{fmtDate(inv.created_at)}</span>
                    </div>
                    <span className="text-slate-950 font-bold">{fmt(inv.total_amount)}</span>
                  </div>
                  {/* Invoice Items */}
                  <div className="px-5 py-3 space-y-2">
                    {(inv.items || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {item.category || "Khác"}
                          </span>
                          <span className="text-slate-800">{item.name || item.product_name || "Sản phẩm"}</span>
                          <span className="text-slate-500 text-xs">×{item.quantity}</span>
                        </div>
                        <span className="text-slate-600 text-xs">{fmt(item.subtotal ?? item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Thông tin Demographic */}
        {activeTab === "demographic" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Thông tin cá nhân */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">
                Thông tin cá nhân
              </h3>
              {[
                { label: "Họ tên", value: custName },
                { label: "Số điện thoại", value: customer.phone },
                { label: "Email", value: customer.email || "—" },
                { label: "Địa chỉ", value: customer.address || "—" },
                { label: "User ID (gốc)", value: customer.user_id || "—" },
                { label: "Ngày tạo tài khoản", value: fmtDate(customer.created_at) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <span className="text-slate-500 text-sm shrink-0">{row.label}</span>
                  <span className="text-slate-800 text-sm text-right break-all">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Thông tin thiết bị & gói cước */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">
                Thiết bị & Gói cước
              </h3>
              {[
                { label: "Thiết bị", value: customer.device_model || "—" },
                { label: "Tên thiết bị", value: customer.device_name || "—" },
                { label: "MAC Address", value: customer.mac_address || "—" },
                { label: "Platform", value: customer.platform || "—" },
                { label: "Gói cước", value: customer.market_plan || "—" },
                { label: "Ngày tham gia dịch vụ", value: fmtDate(customer.mp_join_time) },
                { label: "Hạn gói cước", value: fmtDate(customer.mp_expire_time) },
                {
                  label: "Trạng thái gói",
                  value: metrics.subscription_active
                    ? `✅ Còn ${metrics.subscription_days_left} ngày`
                    : "❌ Đã hết hạn",
                },
              ].map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <span className="text-slate-500 text-sm shrink-0">{row.label}</span>
                  <span className="text-slate-800 text-sm text-right break-all font-mono">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Ghi chú */}
            {customer.notes && (
              <div className="sm:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-slate-500 text-sm uppercase tracking-wider mb-2">Ghi chú</h3>
                <p className="text-slate-800 text-sm">{customer.notes}</p>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
