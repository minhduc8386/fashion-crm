"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import CrmNavbar from "@/components/CrmNavbar";

interface InvoiceItem {
  name: string;
  category: string;
  price: number;
  quantity: number;
  subtotal: number;
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
  "VIP Platinum": { color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/30", icon: "💎" },
  "VIP Gold":     { color: "text-yellow-300", bg: "bg-yellow-500/10 border-yellow-500/30", icon: "🥇" },
  "Thân thiết":   { color: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/30", icon: "⭐" },
  "Thường xuyên": { color: "text-blue-300", bg: "bg-blue-500/10 border-blue-500/30", icon: "🔵" },
  "Mới":          { color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/30", icon: "🆕" },
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
      <div className="min-h-screen bg-slate-950 text-white">
        <CrmNavbar title="⏳ Đang tải..." />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
          <div className="h-64 bg-slate-900 rounded-2xl animate-pulse border border-white/5" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <CrmNavbar title="Customer 360" />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-400 font-semibold mb-4">{error || "Không tìm thấy khách hàng."}</p>
          <button onClick={() => router.push("/crm/customers")}
            className="text-purple-400 hover:text-white text-sm underline transition-colors">
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
      gradient: "from-purple-600/20 to-purple-900/10",
      border: "border-purple-500/20",
      valueColor: "text-purple-300",
    },
    {
      id: "kpi-invoices",
      icon: "🧾",
      label: "Số hóa đơn",
      value: metrics.invoice_count.toString(),
      sub: "Giao dịch đã thực hiện",
      gradient: "from-emerald-600/20 to-emerald-900/10",
      border: "border-emerald-500/20",
      valueColor: "text-emerald-300",
    },
    {
      id: "kpi-aov",
      icon: "📊",
      label: "AOV (Giá trị TB / đơn)",
      value: fmt(metrics.aov),
      sub: "Average Order Value",
      gradient: "from-blue-600/20 to-blue-900/10",
      border: "border-blue-500/20",
      valueColor: "text-blue-300",
    },
    {
      id: "kpi-tenure",
      icon: "📅",
      label: "Tuổi đời",
      value: `${metrics.tenure_days} ngày`,
      sub: `Từ ${fmtDate(customer.created_at)}`,
      gradient: "from-orange-600/20 to-orange-900/10",
      border: "border-orange-500/20",
      valueColor: "text-orange-300",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <CrmNavbar title={`👤 ${custName}`} />

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl font-bold shadow-lg">
              {custName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold capitalize">{custName}</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {customer.phone} {customer.email && `• ${customer.email}`}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${tierCfg.bg} ${tierCfg.color}`}>
                  {tierCfg.icon} {tier}
                </span>
                {metrics.subscription_active ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full">
                    ✅ Gói còn {metrics.subscription_days_left} ngày
                  </span>
                ) : customer.mp_expire_time ? (
                  <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-1 rounded-full">
                    ❌ Gói đã hết hạn
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button onClick={() => router.push("/crm/customers")}
            className="text-slate-400 hover:text-white text-sm border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg transition-all">
            ← Danh sách
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi) => (
            <div key={kpi.id} id={kpi.id}
              className={`bg-gradient-to-br ${kpi.gradient} border ${kpi.border} rounded-2xl p-4 hover:border-white/20 transition-colors`}>
              <div className="text-2xl mb-2">{kpi.icon}</div>
              <p className="text-slate-400 text-xs mb-1">{kpi.label}</p>
              <p className={`font-bold text-lg leading-tight ${kpi.valueColor}`}>{kpi.value}</p>
              <p className="text-slate-500 text-xs mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Danh mục yêu thích</p>
            <p className="text-white font-semibold">{metrics.favorite_category || "—"}</p>
          </div>
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Lần mua gần nhất</p>
            <p className="text-white font-semibold">{fmtDate(metrics.last_purchase_date)}</p>
          </div>
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Thiết bị</p>
            <p className="text-white font-semibold text-sm">{customer.device_model || "—"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-white/10">
          <button
            id="tab-invoices"
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "invoices"
                ? "text-white border-b-2 border-purple-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🧾 Lịch sử mua hàng ({invoices.length})
          </button>
          <button
            id="tab-demographic"
            onClick={() => setActiveTab("demographic")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "demographic"
                ? "text-white border-b-2 border-purple-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📋 Thông tin & Thiết bị
          </button>
        </div>

        {/* Tab: Lịch sử mua hàng */}
        {activeTab === "invoices" && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-900 border border-white/10 rounded-2xl">
                Chưa có hóa đơn nào.
              </div>
            ) : (
              invoices.map((inv, idx) => (
                <div key={inv._id || idx}
                  className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors">
                  {/* Invoice Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-xs font-mono">#{String(idx + 1).padStart(3, "0")}</span>
                      <span className="text-slate-300 text-sm">{fmtDate(inv.created_at)}</span>
                    </div>
                    <span className="text-purple-300 font-bold">{fmt(inv.total_amount)}</span>
                  </div>
                  {/* Invoice Items */}
                  <div className="px-5 py-3 space-y-2">
                    {(inv.items || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            {item.category}
                          </span>
                          <span className="text-slate-200">{item.name}</span>
                          <span className="text-slate-500 text-xs">×{item.quantity}</span>
                        </div>
                        <span className="text-slate-300 text-xs">{fmt(item.subtotal)}</span>
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
            <div className="bg-slate-900 border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider text-slate-400">
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
                  <span className="text-slate-200 text-sm text-right break-all">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Thông tin thiết bị & gói cước */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider text-slate-400">
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
                  <span className="text-slate-200 text-sm text-right break-all font-mono">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Ghi chú */}
            {customer.notes && (
              <div className="sm:col-span-2 bg-slate-900 border border-white/10 rounded-xl p-5">
                <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-2">Ghi chú</h3>
                <p className="text-slate-200 text-sm">{customer.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
