import type { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const DASHBOARD_CHANNELS = [
  "Website",
  "Shopee",
  "TikTok Shop",
  "Facebook",
  "Offline Store",
  "Partner/FPT",
  "Walmart",
  "Weee",
] as const;

export type DashboardChannel = (typeof DASHBOARD_CHANNELS)[number] | "Unknown";

interface InvoiceItem {
  quantity?: number;
  price?: number;
  subtotal?: number;
}

interface InvoiceRecord {
  _id?: ObjectId;
  customer_id?: ObjectId | string;
  customer_name?: string;
  items?: InvoiceItem[];
  total_amount?: number;
  channel?: string;
  order_date?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

interface CustomerRecord {
  _id?: ObjectId;
  name?: string;
  total_spent?: number;
  invoice_count?: number;
  mp_expire_time?: Date | string | null;
}

export interface DashboardFilters {
  channels: string[];
  startDate: string | null;
  endDate: string | null;
}

export interface NormalizedOrder {
  id: string;
  customerId: string;
  customerName: string;
  channel: DashboardChannel;
  date: Date;
  dateKey: string;
  totalAmount: number;
  productsSold: number;
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function parseDateBoundary(value: string | null, endOfDay = false) {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  return new Date(`${value}${suffix}`);
}

export function parseDashboardFilters(searchParams: URLSearchParams) {
  const rawChannels = searchParams.get("channels") || "";
  const channels = rawChannels
    .split(",")
    .map((channel) => channel.trim())
    .filter(Boolean);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (startDate && !isValidDateString(startDate)) {
    return { error: "startDate không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD." };
  }

  if (endDate && !isValidDateString(endDate)) {
    return { error: "endDate không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD." };
  }

  const start = parseDateBoundary(startDate);
  const end = parseDateBoundary(endDate, true);

  if (start && end && start > end) {
    return { error: "Khoảng ngày không hợp lệ: startDate phải nhỏ hơn hoặc bằng endDate." };
  }

  return {
    filters: {
      channels,
      startDate,
      endDate,
    } satisfies DashboardFilters,
  };
}

function hashText(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalizeChannel(invoice: InvoiceRecord) {
  const channel = invoice.channel?.trim();
  if (channel) return channel as DashboardChannel;

  const seed = invoice._id?.toString() || invoice.customer_id?.toString() || invoice.customer_name || "unknown";
  return DASHBOARD_CHANNELS[hashText(seed) % DASHBOARD_CHANNELS.length];
}

function normalizeDate(invoice: InvoiceRecord) {
  const rawDate = invoice.order_date || invoice.created_at || invoice.updated_at;
  const date = rawDate ? new Date(rawDate) : new Date(0);

  if (Number.isNaN(date.getTime())) return new Date(0);
  return date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeOrder(invoice: InvoiceRecord): NormalizedOrder {
  const date = normalizeDate(invoice);
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const productsSold = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalFromItems = items.reduce((sum, item) => {
    const subtotal = Number(item.subtotal);
    if (!Number.isNaN(subtotal) && subtotal > 0) return sum + subtotal;
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
  }, 0);

  return {
    id: invoice._id?.toString() || "",
    customerId: invoice.customer_id?.toString() || invoice.customer_name || "unknown",
    customerName: invoice.customer_name || "Khách hàng",
    channel: normalizeChannel(invoice),
    date,
    dateKey: toDateKey(date),
    totalAmount: Number(invoice.total_amount) || totalFromItems,
    productsSold,
  };
}

function withinFilters(order: NormalizedOrder, filters: DashboardFilters) {
  const selectedChannels = new Set(filters.channels);
  if (selectedChannels.size > 0 && !selectedChannels.has(order.channel)) return false;

  const start = parseDateBoundary(filters.startDate);
  const end = parseDateBoundary(filters.endDate, true);

  if (start && order.date < start) return false;
  if (end && order.date > end) return false;

  return true;
}

export async function getDashboardDataset(filters: DashboardFilters) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const [rawInvoices, customers, staffUsersCount] = await Promise.all([
    db.collection<InvoiceRecord>("invoices").find({}).sort({ created_at: -1 }).toArray(),
    db.collection<CustomerRecord>("customers").find({}).toArray(),
    db.collection("staff_users").countDocuments().catch(() => 0),
  ]);

  const customerMap = new Map(customers.map((customer) => [customer._id?.toString() || "", customer]));
  const allOrders = rawInvoices.map(normalizeOrder);
  const orders = allOrders.filter((order) => withinFilters(order, filters));

  const dateKeys = allOrders.map((order) => order.dateKey).filter((dateKey) => dateKey !== "1970-01-01").sort();
  const availableChannels = Array.from(new Set([...DASHBOARD_CHANNELS, ...allOrders.map((order) => order.channel)]));

  return {
    orders,
    allOrders,
    customers,
    customerMap,
    staffUsersCount,
    availableChannels,
    dateBounds: {
      startDate: dateKeys[0] || null,
      endDate: dateKeys[dateKeys.length - 1] || null,
    },
  };
}

export function buildOverview(dataset: Awaited<ReturnType<typeof getDashboardDataset>>, filters: DashboardFilters) {
  const customerRevenue = new Map<string, number>();
  const customerOrderCount = new Map<string, number>();

  for (const order of dataset.orders) {
    customerRevenue.set(order.customerId, (customerRevenue.get(order.customerId) || 0) + order.totalAmount);
    customerOrderCount.set(order.customerId, (customerOrderCount.get(order.customerId) || 0) + 1);
  }

  const uniqueCustomerIds = Array.from(customerRevenue.keys());
  const orders = dataset.orders.length;
  const revenue = dataset.orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const productsSold = dataset.orders.reduce((sum, order) => sum + order.productsSold, 0);
  const repeatCustomers = Array.from(customerOrderCount.values()).filter((count) => count >= 2).length;
  const vipCustomers = Array.from(customerRevenue.values()).filter((total) => total >= 5_000_000).length;
  const now = new Date();
  const activePlans = uniqueCustomerIds.filter((customerId) => {
    const customer = dataset.customerMap.get(customerId);
    const expireTime = customer?.mp_expire_time ? new Date(customer.mp_expire_time) : null;
    return expireTime && !Number.isNaN(expireTime.getTime()) && expireTime >= now;
  }).length;

  const channelSummary = dataset.availableChannels
    .map((channel) => {
      const channelOrders = dataset.orders.filter((order) => order.channel === channel);
      return {
        channel,
        orders: channelOrders.length,
        revenue: channelOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      };
    })
    .filter((item) => item.orders > 0);

  return {
    kpis: {
      customers: uniqueCustomerIds.length,
      orders,
      productsSold,
      revenue,
      averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
      repeatCustomers,
      vipCustomers,
      activePlans,
    },
    filters,
    sources: {
      csv: "Data_Engineer.Customer_Registered.csv",
      mongoCollections: ["customers", "invoices", "staff_users"],
      customersCollectionCount: dataset.customers.length,
      invoicesCollectionCount: dataset.allOrders.length,
      staffUsersCollectionCount: dataset.staffUsersCount,
      fashionOrders: "Mock fashion invoices generated by scripts/seed_from_csv.mjs",
    },
    availableChannels: dataset.availableChannels,
    dateBounds: dataset.dateBounds,
    channelSummary,
    recentOrders: dataset.orders.slice(0, 8),
  };
}

export function buildOrdersByDay(dataset: Awaited<ReturnType<typeof getDashboardDataset>>, filters: DashboardFilters) {
  const selectedChannels = filters.channels.length > 0 ? filters.channels : dataset.availableChannels;
  const dayMap = new Map<string, Record<string, string | number>>();

  for (const order of dataset.orders) {
    if (!dayMap.has(order.dateKey)) {
      dayMap.set(order.dateKey, { date: order.dateKey });
    }

    const row = dayMap.get(order.dateKey);
    if (row) {
      row[order.channel] = Number(row[order.channel] || 0) + 1;
    }
  }

  const data = Array.from(dayMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  return {
    data,
    filters,
    channels: selectedChannels,
  };
}
