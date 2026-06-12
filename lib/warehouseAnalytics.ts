import type { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export interface InvoiceItemRecord {
  product_id?: string;
  sku?: string;
  product_name?: string;
  name?: string;
  category?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  price?: number;
  subtotal?: number;
}

interface InvoiceRecord {
  _id?: ObjectId;
  customer_name?: string;
  items?: InvoiceItemRecord[];
  order_date?: Date | string;
  created_at?: Date | string;
  channel?: string;
}

export interface ProductMetric {
  sku: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  current_stock: number;
}

export interface InventoryRow {
  sku: string;
  product_name: string;
  category: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  stock_status: "In Stock" | "Low Stock" | "Out of Stock";
}

export interface InventoryBatch {
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

export interface FifoAllocation {
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

function hashText(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function slugify(value: string) {
  return value
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
}

function toDate(value?: Date | string) {
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function normalizeItem(item: InvoiceItemRecord) {
  const productName = (item.product_name || item.name || "Unknown product").trim();
  const sku = (item.sku || `SKU-${slugify(productName)}-${hashText(productName).toString(36).slice(0, 4)}`).trim();
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const unitPrice = Number(item.unit_price ?? item.price) || 0;
  const totalPrice = Number(item.total_price ?? item.subtotal) || unitPrice * quantity;

  return {
    sku,
    product_id: item.product_id || sku.replace(/^SKU-/, "PRD-"),
    product_name: productName,
    category: item.category?.trim() || "Khác",
    quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
  };
}

async function getInvoices() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  return db
    .collection<InvoiceRecord>("invoices")
    .find({})
    .sort({ created_at: -1 })
    .toArray();
}

export async function getProductMetrics() {
  const invoices = await getInvoices();
  const productMap = new Map<string, ProductMetric>();

  for (const invoice of invoices) {
    for (const item of invoice.items || []) {
      const normalized = normalizeItem(item);
      if (!productMap.has(normalized.sku)) {
        productMap.set(normalized.sku, {
          sku: normalized.sku,
          product_id: normalized.product_id,
          product_name: normalized.product_name,
          category: normalized.category,
          quantity_sold: 0,
          revenue: 0,
          current_stock: 0,
        });
      }

      const product = productMap.get(normalized.sku);
      if (product) {
        product.quantity_sold += normalized.quantity;
        product.revenue += normalized.total_price;
      }
    }
  }

  const products = Array.from(productMap.values()).map((product) => ({
    ...product,
    current_stock: deriveCurrentStock(product),
  }));

  const sortedProducts = products.sort((a, b) => b.revenue - a.revenue);
  const productsSold = products.reduce((sum, product) => sum + product.quantity_sold, 0);
  const productRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const bestSeller = [...products].sort((a, b) => b.quantity_sold - a.quantity_sold)[0] || null;

  return {
    kpis: {
      totalProducts: products.length,
      productsSold,
      productRevenue,
      bestSeller: bestSeller?.product_name || "N/A",
    },
    products: sortedProducts,
    topByQuantity: [...products].sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, 5),
    topByRevenue: sortedProducts.slice(0, 5),
  };
}

function deriveCurrentStock(product: ProductMetric) {
  const seed = hashText(product.sku);
  const baseStock = 40 + (seed % 140);
  return Math.max(0, baseStock - Math.floor(product.quantity_sold * 0.35));
}

function deriveReservedStock(sku: string, currentStock: number) {
  if (currentStock === 0) return 0;
  return Math.min(currentStock, hashText(`${sku}-reserved`) % 12);
}

function deriveReorderLevel(sku: string) {
  return 12 + (hashText(`${sku}-reorder`) % 18);
}

function getStockStatus(availableStock: number, reorderLevel: number): InventoryRow["stock_status"] {
  if (availableStock <= 0) return "Out of Stock";
  if (availableStock <= reorderLevel) return "Low Stock";
  return "In Stock";
}

export async function getInventoryData() {
  const productData = await getProductMetrics();
  const rows = productData.products.map((product) => {
    const current_stock = product.current_stock;
    const reserved_stock = deriveReservedStock(product.sku, current_stock);
    const available_stock = Math.max(0, current_stock - reserved_stock);
    const reorder_level = deriveReorderLevel(product.sku);

    return {
      sku: product.sku,
      product_name: product.product_name,
      category: product.category,
      current_stock,
      reserved_stock,
      available_stock,
      reorder_level,
      stock_status: getStockStatus(available_stock, reorder_level),
    };
  });

  return {
    kpis: {
      totalSkus: rows.length,
      totalStockUnits: rows.reduce((sum, row) => sum + row.current_stock, 0),
      lowStockItems: rows.filter((row) => row.stock_status === "Low Stock").length,
      outOfStockItems: rows.filter((row) => row.stock_status === "Out of Stock").length,
    },
    inventory: rows.sort((a, b) => a.available_stock - b.available_stock),
  };
}

function buildInitialBatches(products: ProductMetric[]) {
  const today = new Date();

  return products.flatMap((product) => {
    const firstQuantity = Math.ceil(product.current_stock * 0.45);
    const secondQuantity = Math.floor(product.current_stock * 0.35);
    const thirdQuantity = Math.max(0, product.current_stock - firstQuantity - secondQuantity);
    const quantities = [firstQuantity, secondQuantity, thirdQuantity].filter((quantity) => quantity > 0);

    return quantities.map((quantity, index) => {
      const received = new Date(today);
      received.setDate(today.getDate() - (120 - index * 38) - (hashText(product.sku) % 12));
      const expiry = new Date(received);
      expiry.setDate(received.getDate() + 420);
      const unit_cost = Math.max(15000, Math.round((product.revenue / Math.max(product.quantity_sold, 1)) * 0.48));

      return {
        batch_id: `BATCH-${product.sku.replace(/^SKU-/, "").slice(0, 12)}-${index + 1}`,
        sku: product.sku,
        product_name: product.product_name,
        received_date: toDateKey(received),
        initial_quantity: quantity,
        remaining_quantity: quantity,
        unit_cost,
        expiry_date: toDateKey(expiry),
        status: "Available" as const,
      };
    });
  });
}

export async function getFifoData() {
  const [invoices, productData] = await Promise.all([getInvoices(), getProductMetrics()]);
  const batches = buildInitialBatches(productData.products);
  const batchBySku = new Map<string, InventoryBatch[]>();

  for (const batch of batches) {
    const list = batchBySku.get(batch.sku) || [];
    list.push(batch);
    batchBySku.set(batch.sku, list);
  }

  for (const batchList of batchBySku.values()) {
    batchList.sort((a, b) => a.received_date.localeCompare(b.received_date));
  }

  const orderLines = invoices
    .flatMap((invoice) =>
      (invoice.items || []).map((item) => ({
        order_id: invoice._id?.toString() || "",
        order_date: toDateKey(toDate(invoice.order_date || invoice.created_at)),
        item: normalizeItem(item),
      }))
    )
    .sort((a, b) => a.order_date.localeCompare(b.order_date))
    .slice(0, 120);

  const allocations: FifoAllocation[] = [];
  const shortageWarnings: FifoAllocation[] = [];

  for (const line of orderLines) {
    let remainingRequest = line.item.quantity;
    const batchList = batchBySku.get(line.item.sku) || [];

    for (const batch of batchList) {
      if (remainingRequest <= 0) break;
      if (batch.remaining_quantity <= 0) continue;

      const allocated = Math.min(remainingRequest, batch.remaining_quantity);
      batch.remaining_quantity -= allocated;
      remainingRequest -= allocated;

      allocations.push({
        order_id: line.order_id,
        order_date: line.order_date,
        product_name: line.item.product_name,
        sku: line.item.sku,
        requested_quantity: line.item.quantity,
        batch_id: batch.batch_id,
        quantity_allocated: allocated,
        remaining_after_allocate: batch.remaining_quantity,
        shortage: 0,
      });
    }

    if (remainingRequest > 0) {
      const warning = {
        order_id: line.order_id,
        order_date: line.order_date,
        product_name: line.item.product_name,
        sku: line.item.sku,
        requested_quantity: line.item.quantity,
        batch_id: "SHORTAGE",
        quantity_allocated: 0,
        remaining_after_allocate: 0,
        shortage: remainingRequest,
      };
      allocations.push(warning);
      shortageWarnings.push(warning);
    }
  }

  const finalBatches = batches.map((batch) => ({
    ...batch,
    status:
      batch.remaining_quantity <= 0
        ? ("Depleted" as const)
        : batch.remaining_quantity <= Math.max(5, Math.round(batch.initial_quantity * 0.15))
          ? ("Low Stock" as const)
          : ("Available" as const),
  }));

  return {
    kpis: {
      totalBatches: finalBatches.length,
      allocatedUnits: allocations.reduce((sum, item) => sum + item.quantity_allocated, 0),
      shortageUnits: shortageWarnings.reduce((sum, item) => sum + item.shortage, 0),
      depletedBatches: finalBatches.filter((batch) => batch.status === "Depleted").length,
    },
    batches: finalBatches.sort((a, b) => a.received_date.localeCompare(b.received_date)),
    allocations: allocations.slice(-80).reverse(),
    shortageWarnings,
  };
}
