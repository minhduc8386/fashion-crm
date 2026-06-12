"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_CHANNELS = [
  "Website",
  "Shopee",
  "TikTok Shop",
  "Facebook",
  "Offline Store",
  "Partner/FPT",
  "Walmart",
  "Weee",
];

const CHANNEL_COLORS: Record<string, string> = {
  Website: "#2563eb",
  Shopee: "#f97316",
  "TikTok Shop": "#0f172a",
  Facebook: "#0284c7",
  "Offline Store": "#059669",
  "Partner/FPT": "#d97706",
  Walmart: "#0891b2",
  Weee: "#65a30d",
  Unknown: "#64748b",
};

interface Kpis {
  customers: number;
  orders: number;
  productsSold: number;
  revenue: number;
  averageOrderValue: number;
  repeatCustomers: number;
  vipCustomers: number;
  activePlans: number;
}

interface OverviewData {
  kpis: Kpis;
  sources: {
    csv: string;
    mongoCollections: string[];
    customersCollectionCount: number;
    invoicesCollectionCount: number;
    staffUsersCollectionCount: number;
    fashionOrders: string;
  };
  availableChannels: string[];
  dateBounds: {
    startDate: string | null;
    endDate: string | null;
  };
  channelSummary: Array<{
    channel: string;
    orders: number;
    revenue: number;
  }>;
}

interface ChartData {
  data: Array<Record<string, string | number>>;
  channels: string[];
}

const formatNumber = (value: number) => value.toLocaleString("vi-VN");
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

function toQueryString(channels: string[], startDate: string, endDate: string) {
  const params = new URLSearchParams();
  if (channels.length > 0) params.set("channels", channels.join(","));
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  return params.toString();
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(
    async (mode: "load" | "refresh" = "load") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const queryString = toQueryString(selectedChannels, startDate, endDate);
        const suffix = queryString ? `?${queryString}` : "";
        const [overviewRes, chartRes] = await Promise.all([
          fetch(`/api/dashboard/overview${suffix}`, { cache: "no-store" }),
          fetch(`/api/dashboard/orders-by-day${suffix}`, { cache: "no-store" }),
        ]);
        const [overviewJson, chartJson] = await Promise.all([
          overviewRes.json(),
          chartRes.json(),
        ]);

        if (!overviewRes.ok || !overviewJson.success) {
          throw new Error(overviewJson.message || "Không thể tải KPI dashboard.");
        }

        if (!chartRes.ok || !chartJson.success) {
          throw new Error(chartJson.message || "Không thể tải biểu đồ Orders by Day.");
        }

        setOverview(overviewJson.data);
        setChart(chartJson.data);

        if (!startDate && !endDate && overviewJson.data.dateBounds?.startDate) {
          setStartDate(overviewJson.data.dateBounds.startDate);
          setEndDate(overviewJson.data.dateBounds.endDate || "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Dashboard gặp lỗi khi tải dữ liệu.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endDate, selectedChannels, startDate]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchDashboard]);

  const availableChannels = overview?.availableChannels?.length
    ? overview.availableChannels
    : DEFAULT_CHANNELS;

  const visibleChartChannels = useMemo(() => {
    if (selectedChannels.length > 0) return selectedChannels;
    return chart?.channels?.length ? chart.channels : availableChannels;
  }, [availableChannels, chart?.channels, selectedChannels]);

  const toggleChannel = (channel: string) => {
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]
    );
  };

  const kpiCards = overview
    ? [
        {
          label: "Customers",
          value: formatNumber(overview.kpis.customers),
          helper: "Unique customers trong filter",
          tone: "border-blue-200 bg-blue-50 text-blue-700",
        },
        {
          label: "Orders",
          value: formatNumber(overview.kpis.orders),
          helper: "Tổng hóa đơn",
          tone: "border-slate-200 bg-white text-slate-950",
        },
        {
          label: "Products Sold",
          value: formatNumber(overview.kpis.productsSold),
          helper: "Tổng quantity đã bán",
          tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
        },
        {
          label: "Revenue",
          value: formatCurrency(overview.kpis.revenue),
          helper: "Tổng doanh thu",
          tone: "border-amber-200 bg-amber-50 text-amber-700",
        },
        {
          label: "Average Order Value",
          value: formatCurrency(overview.kpis.averageOrderValue),
          helper: "Revenue / Orders",
          tone: "border-sky-200 bg-sky-50 text-sky-700",
        },
        {
          label: "Repeat Customers",
          value: formatNumber(overview.kpis.repeatCustomers),
          helper: "Khách có từ 2 đơn",
          tone: "border-slate-200 bg-white text-slate-950",
        },
        {
          label: "VIP Customers",
          value: formatNumber(overview.kpis.vipCustomers),
          helper: "Doanh thu filter >= 5 triệu",
          tone: "border-blue-200 bg-blue-50 text-blue-700",
        },
        {
          label: "Active Plans",
          value: formatNumber(overview.kpis.activePlans),
          helper: "Gói FPT còn hạn",
          tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Fashion CRM Analytics
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Multichannel Orders Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Theo dõi đơn hàng thời trang từ dữ liệu khách hàng CSV, MongoDB và lịch sử
            hóa đơn mock đã seed cho Customer 360.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchDashboard("refresh")}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.4fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Data Sources</h2>
              <p className="mt-1 text-sm text-slate-500">
                Refresh chỉ refetch dashboard, không chạy lại seed script.
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              MongoDB live
            </span>
          </div>

          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-900">CSV source</p>
              <p className="mt-1 text-slate-500">
                {overview?.sources.csv || "Data_Engineer.Customer_Registered.csv"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-900">MongoDB collections</p>
              <p className="mt-1 text-slate-500">
                {(overview?.sources.mongoCollections || ["customers", "invoices", "staff_users"]).join(", ")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Customers</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatNumber(overview?.sources.customersCollectionCount || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Invoices</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatNumber(overview?.sources.invoicesCollectionCount || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Staff users</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatNumber(overview?.sources.staffUsersCollectionCount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Filters</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bỏ chọn hết channel nghĩa là xem tất cả kênh.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {availableChannels.map((channel) => {
              const active = selectedChannels.includes(channel);
              return (
                <button
                  key={channel}
                  type="button"
                  onClick={() => toggleChannel(channel)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {channel}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              End date
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </section>
      ) : overview && overview.kpis.orders === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Không có dữ liệu phù hợp</h2>
          <p className="mt-2 text-sm text-slate-500">
            Hãy mở rộng khoảng ngày hoặc bỏ bớt channel filter để xem dashboard.
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card) => (
              <article
                key={card.label}
                className={`rounded-lg border p-5 shadow-sm ${card.tone}`}
              >
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Orders by Day</h2>
                  <p className="text-sm text-slate-500">
                    Số lượng đơn hàng theo ngày, phân tách theo channel.
                  </p>
                </div>
              </div>

              <div className="h-80 w-full">
                {chart && chart.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart.data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        minTickGap={28}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={{ stroke: "#cbd5e1" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={{ stroke: "#cbd5e1" }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          borderColor: "#e2e8f0",
                          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                        }}
                      />
                      <Legend />
                      {visibleChartChannels.map((channel) => (
                        <Line
                          key={channel}
                          type="monotone"
                          dataKey={channel}
                          stroke={CHANNEL_COLORS[channel] || CHANNEL_COLORS.Unknown}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                    Chưa có dữ liệu chart cho filter hiện tại.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Channel Summary</h2>
              <div className="mt-4 space-y-3">
                {(overview?.channelSummary || []).length > 0 ? (
                  (overview?.channelSummary || []).map((item) => (
                    <div
                      key={item.channel}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: CHANNEL_COLORS[item.channel] || CHANNEL_COLORS.Unknown }}
                          />
                          <p className="font-medium text-slate-900">{item.channel}</p>
                        </div>
                        <p className="text-sm text-slate-500">{formatNumber(item.orders)} orders</p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {formatCurrency(item.revenue)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    Không có channel summary cho filter hiện tại.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
