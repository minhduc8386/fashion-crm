import type { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

interface CustomerRecord {
  _id?: ObjectId;
  name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  total_spent?: number;
  invoice_count?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
  is_seeded?: boolean;
  source?: string;
  registration_source?: string;
  channel?: string;
  device_model?: string;
}

interface InvoiceRecord {
  customer_id?: ObjectId | string;
}

function toDate(value?: Date | string) {
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function daysBetween(startDate: Date, endDate = new Date()) {
  if (startDate.getTime() === 0) return 0;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function deriveTier(totalSpent: number, invoiceCount: number) {
  if (totalSpent >= 10_000_000) return "VIP";
  if (totalSpent >= 5_000_000) return "Loyal";
  if (invoiceCount >= 2) return "Regular";
  return "New";
}

function deriveSource(customer: CustomerRecord) {
  if (customer.source) return customer.source;
  if (customer.registration_source) return customer.registration_source;
  if (customer.channel) return customer.channel;
  if (customer.is_seeded) return "partner_fpt_csv";
  if (customer.device_model) return "partner_fpt_csv";
  return "manual_staff_input";
}

export async function getCustomersDashboardData() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const [customers, invoices] = await Promise.all([
    db.collection<CustomerRecord>("customers").find({}).sort({ created_at: -1 }).toArray(),
    db.collection<InvoiceRecord>("invoices").find({}, { projection: { customer_id: 1 } }).toArray(),
  ]);
  const invoiceCountByCustomer = new Map<string, number>();

  for (const invoice of invoices) {
    const customerId = invoice.customer_id?.toString();
    if (!customerId) continue;
    invoiceCountByCustomer.set(customerId, (invoiceCountByCustomer.get(customerId) || 0) + 1);
  }

  const now = new Date();
  const enriched = customers.map((customer) => {
    const id = customer._id?.toString() || "";
    const invoiceCount = Number(customer.invoice_count ?? invoiceCountByCustomer.get(id) ?? 0) || 0;
    const totalSpent = Number(customer.total_spent) || 0;
    const createdAt = toDate(customer.created_at || customer.updated_at);
    const tenureDays = daysBetween(createdAt, now);
    const tier = deriveTier(totalSpent, invoiceCount);
    const source = deriveSource(customer);

    return {
      _id: id,
      full_name: customer.name || customer.full_name || "Khách hàng",
      phone: customer.phone || "",
      email: customer.email || "",
      total_spent: totalSpent,
      invoice_count: invoiceCount,
      created_at: createdAt.getTime() === 0 ? null : createdAt.toISOString(),
      tenure_days: tenureDays,
      tier,
      source,
    };
  });

  const totalCustomers = enriched.length;
  const totalSpent = enriched.reduce((sum, customer) => sum + customer.total_spent, 0);
  const totalOrders = enriched.reduce((sum, customer) => sum + customer.invoice_count, 0);
  const totalTenure = enriched.reduce((sum, customer) => sum + customer.tenure_days, 0);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const tierDistribution = ["VIP", "Loyal", "Regular", "New"].map((tier) => ({
    tier,
    customers: enriched.filter((customer) => customer.tier === tier).length,
  }));
  const sourceMap = new Map<string, number>();
  for (const customer of enriched) {
    sourceMap.set(customer.source, (sourceMap.get(customer.source) || 0) + 1);
  }

  return {
    kpis: {
      totalCustomers,
      newCustomers: enriched.filter((customer) => customer.created_at && new Date(customer.created_at) >= thirtyDaysAgo).length,
      repeatCustomers: enriched.filter((customer) => customer.invoice_count > 1).length,
      vipCustomers: enriched.filter((customer) => customer.tier === "VIP").length,
      averageLtv: totalCustomers > 0 ? Math.round(totalSpent / totalCustomers) : 0,
      averageOrdersPerCustomer: totalCustomers > 0 ? Number((totalOrders / totalCustomers).toFixed(1)) : 0,
      averageCustomerTenure: totalCustomers > 0 ? Math.round(totalTenure / totalCustomers) : 0,
      customersWithNoOrders: enriched.filter((customer) => customer.invoice_count === 0).length,
    },
    tierDistribution,
    sourceDistribution: Array.from(sourceMap.entries())
      .map(([source, customers]) => ({ source, customers }))
      .sort((a, b) => b.customers - a.customers),
    topCustomersByLtv: [...enriched]
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 8),
    recentCustomers: [...enriched]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8),
    source: "Derived from customers and invoices",
  };
}
