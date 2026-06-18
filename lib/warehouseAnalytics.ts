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

interface PersistedBatchRecord {
  _id?: ObjectId;
  batch_id?: string;
  sku?: string;
  product_name?: string;
  name?: string;
  category?: string;
  received_at?: Date | string;
  import_date?: Date | string;
  received_date?: Date | string;
  created_at?: Date | string;
  order_date?: Date | string;
  initial_quantity?: number;
  quantity?: number;
  remaining_quantity?: number;
  current_stock?: number;
  unit_cost?: number;
  expiry_date?: Date | string;
  status?: string;
}

export interface ProductMetric {
  sku: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  current_stock: number;
  stock_status?: "In Stock" | "Low Stock" | "Out of Stock";
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
  category: string;
  received_date: string;
  initial_quantity: number;
  remaining_quantity: number;
  allocated_quantity: number;
  unit_cost: number;
  expiry_date: string;
  days_in_stock: number;
  stock_age_status: "Fresh" | "Normal" | "Aging" | "Old Stock";
  status: "Available" | "Low Stock" | "Depleted";
  source: "inventory_batches" | "Derived from invoices";
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
  allocation_sequence: number;
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

function daysBetween(startDate: Date, endDate = new Date()) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function getStockAgeStatus(days: number): InventoryBatch["stock_age_status"] {
  if (days <= 30) return "Fresh";
  if (days <= 60) return "Normal";
  if (days <= 90) return "Aging";
  return "Old Stock";
}

function getAgingBucket(days: number) {
  if (days <= 30) return "0-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return ">90 days";
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

async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB);
}

async function getInvoices() {
  const db = await getDb();
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

  const products = Array.from(productMap.values()).map((product) => {
    const currentStock = deriveCurrentStock(product);
    const reorderLevel = deriveReorderLevel(product.sku);
    const reservedStock = deriveReservedStock(product.sku, currentStock);
    const availableStock = Math.max(0, currentStock - reservedStock);

    return {
      ...product,
      current_stock: currentStock,
      stock_status: getStockStatus(availableStock, reorderLevel),
    };
  });

  const sortedProducts = [...products].sort((a, b) => b.revenue - a.revenue);
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

async function getPersistedBatches() {
  try {
    const db = await getDb();
    const rows = await db.collection<PersistedBatchRecord>("inventory_batches").find({}).toArray();
    if (rows.length === 0) return [];

    return rows.map((row, index) => {
      const productName = (row.product_name || row.name || "Unknown product").trim();
      const sku = (row.sku || `SKU-${slugify(productName)}-${hashText(productName).toString(36).slice(0, 4)}`).trim();
      const receivedDate = toDate(row.received_at || row.import_date || row.received_date || row.created_at || row.order_date);
      const initialQuantity = Number(row.initial_quantity ?? row.quantity ?? row.current_stock) || 0;
      const remainingQuantity = Number(row.remaining_quantity ?? row.current_stock ?? initialQuantity) || 0;
      const daysInStock = daysBetween(receivedDate);

      return {
        batch_id: row.batch_id || `BATCH-${sku.replace(/^SKU-/, "").slice(0, 12)}-${index + 1}`,
        sku,
        product_name: productName,
        category: row.category || "Khác",
        received_date: toDateKey(receivedDate),
        initial_quantity: initialQuantity,
        remaining_quantity: remainingQuantity,
        allocated_quantity: Math.max(0, initialQuantity - remainingQuantity),
        unit_cost: Number(row.unit_cost) || 0,
        expiry_date: row.expiry_date ? toDateKey(toDate(row.expiry_date)) : "",
        days_in_stock: daysInStock,
        stock_age_status: getStockAgeStatus(daysInStock),
        status: normalizeBatchStatus(row.status, initialQuantity, remainingQuantity),
        source: "inventory_batches" as const,
      };
    });
  } catch {
    return [];
  }
}

function normalizeBatchStatus(
  status: string | undefined,
  initialQuantity: number,
  remainingQuantity: number
): InventoryBatch["status"] {
  if (remainingQuantity <= 0) return "Depleted";
  if (status === "Low Stock" || remainingQuantity <= Math.max(5, Math.round(initialQuantity * 0.15))) {
    return "Low Stock";
  }
  return "Available";
}

function buildDerivedBatches(products: ProductMetric[]) {
  const today = new Date();

  return products.flatMap((product) => {
    const firstQuantity = Math.ceil(product.current_stock * 0.45);
    const secondQuantity = Math.floor(product.current_stock * 0.35);
    const thirdQuantity = Math.max(0, product.current_stock - firstQuantity - secondQuantity);
    const quantities = [firstQuantity, secondQuantity, thirdQuantity].filter((quantity) => quantity > 0);

    return quantities.map((quantity, index) => {
      const received = new Date(today);
      const estimatedAge = 124 - index * 42 + (hashText(`${product.sku}-${index}`) % 16);
      received.setDate(today.getDate() - estimatedAge);
      const expiry = new Date(received);
      expiry.setDate(received.getDate() + 420);
      const unitCost = Math.max(15_000, Math.round((product.revenue / Math.max(product.quantity_sold, 1)) * 0.48));
      const daysInStock = daysBetween(received, today);

      return {
        batch_id: `BATCH-${product.sku.replace(/^SKU-/, "").slice(0, 12)}-${index + 1}`,
        sku: product.sku,
        product_name: product.product_name,
        category: product.category,
        received_date: toDateKey(received),
        initial_quantity: quantity,
        remaining_quantity: quantity,
        allocated_quantity: 0,
        unit_cost: unitCost,
        expiry_date: toDateKey(expiry),
        days_in_stock: daysInStock,
        stock_age_status: getStockAgeStatus(daysInStock),
        status: "Available" as const,
        source: "Derived from invoices" as const,
      };
    });
  });
}

function buildAgingBuckets(batches: InventoryBatch[]) {
  const bucketOrder = ["0-30 days", "31-60 days", "61-90 days", ">90 days"];
  const bucketMap = new Map(
    bucketOrder.map((bucket) => [
      bucket,
      {
        bucket,
        batches: 0,
        remaining_units: 0,
      },
    ])
  );

  for (const batch of batches) {
    const bucket = getAgingBucket(batch.days_in_stock);
    const row = bucketMap.get(bucket);
    if (row) {
      row.batches += 1;
      row.remaining_units += batch.remaining_quantity;
    }
  }

  return bucketOrder.map((bucket) => bucketMap.get(bucket));
}

function buildFifoInsights(batches: InventoryBatch[], shortageWarnings: FifoAllocation[]) {
  const remainingBatches = batches.filter((batch) => batch.remaining_quantity > 0);
  const oldestBatch = [...remainingBatches].sort((a, b) => b.days_in_stock - a.days_in_stock)[0] || null;
  const oldStockUnits = remainingBatches
    .filter((batch) => batch.days_in_stock > 90)
    .reduce((sum, batch) => sum + batch.remaining_quantity, 0);
  const clearanceSkus = new Set(
    remainingBatches.filter((batch) => batch.days_in_stock > 90).map((batch) => batch.sku)
  ).size;

  return {
    oldestBatchText: oldestBatch
      ? `Oldest batch has been in stock for ${oldestBatch.days_in_stock} days`
      : "No remaining batch currently in stock",
    oldStockUnitsText: `${oldStockUnits.toLocaleString("vi-VN")} units are older than 90 days`,
    clearanceSkusText: `${clearanceSkus.toLocaleString("vi-VN")} SKUs may need clearance campaign`,
    shortageText:
      shortageWarnings.length > 0
        ? `${shortageWarnings.length.toLocaleString("vi-VN")} FIFO lines have shortage warnings`
        : "No FIFO shortage warning in the current simulation",
  };
}

export async function getFifoData() {
  const [invoices, productData, persistedBatches] = await Promise.all([
    getInvoices(),
    getProductMetrics(),
    getPersistedBatches(),
  ]);
  const batches = persistedBatches.length > 0 ? persistedBatches : buildDerivedBatches(productData.products);
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
    .slice(0, 140);

  const allocations: FifoAllocation[] = [];
  const shortageWarnings: FifoAllocation[] = [];
  let allocationSequence = 1;

  for (const line of orderLines) {
    let remainingRequest = line.item.quantity;
    const batchList = batchBySku.get(line.item.sku) || [];

    for (const batch of batchList) {
      if (remainingRequest <= 0) break;
      if (batch.remaining_quantity <= 0) continue;

      const allocated = Math.min(remainingRequest, batch.remaining_quantity);
      batch.remaining_quantity -= allocated;
      batch.allocated_quantity += allocated;
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
        allocation_sequence: allocationSequence,
      });
      allocationSequence += 1;
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
        allocation_sequence: allocationSequence,
      };
      allocations.push(warning);
      shortageWarnings.push(warning);
      allocationSequence += 1;
    }
  }

  const finalBatches = batches.map((batch) => ({
    ...batch,
    allocated_quantity: Math.max(0, batch.allocated_quantity),
    status: normalizeBatchStatus(undefined, batch.initial_quantity, batch.remaining_quantity),
  }));
  const remainingBatches = finalBatches.filter((batch) => batch.remaining_quantity > 0);
  const totalRemainingUnits = remainingBatches.reduce((sum, batch) => sum + batch.remaining_quantity, 0);
  const oldestStockAge = remainingBatches.reduce((max, batch) => Math.max(max, batch.days_in_stock), 0);
  const weightedAgeUnits = remainingBatches.reduce(
    (sum, batch) => sum + batch.days_in_stock * batch.remaining_quantity,
    0
  );
  const averageStockAge = totalRemainingUnits > 0 ? Math.round(weightedAgeUnits / totalRemainingUnits) : 0;
  const longAgingStock = remainingBatches.filter((batch) => batch.days_in_stock > 90).length;

  return {
    kpis: {
      totalBatches: finalBatches.length,
      totalRemainingUnits,
      oldestStockAge,
      averageStockAge,
      longAgingStock,
      fifoShortageWarnings: shortageWarnings.length,
      allocatedUnits: allocations.reduce((sum, item) => sum + item.quantity_allocated, 0),
      shortageUnits: shortageWarnings.reduce((sum, item) => sum + item.shortage, 0),
      depletedBatches: finalBatches.filter((batch) => batch.status === "Depleted").length,
    },
    agingBuckets: buildAgingBuckets(finalBatches),
    insights: buildFifoInsights(finalBatches, shortageWarnings),
    batches: finalBatches.sort((a, b) => b.days_in_stock - a.days_in_stock),
    allocations: allocations.slice(-100).reverse(),
    shortageWarnings,
    source:
      persistedBatches.length > 0
        ? "inventory_batches"
        : "Derived from invoices with estimated received dates",
  };
}

export async function getProductsDashboardData() {
  const [productData, inventoryData] = await Promise.all([getProductMetrics(), getInventoryData()]);
  const inventoryBySku = new Map(inventoryData.inventory.map((row) => [row.sku, row]));
  const products = productData.products.map((product) => {
    const inventory = inventoryBySku.get(product.sku);
    return {
      ...product,
      current_stock: inventory?.current_stock ?? product.current_stock,
      stock_status: inventory?.stock_status ?? product.stock_status ?? "In Stock",
    };
  });
  const categories = new Map<string, { category: string; revenue: number; units: number; products: number }>();

  for (const product of products) {
    const row = categories.get(product.category) || {
      category: product.category,
      revenue: 0,
      units: 0,
      products: 0,
    };
    row.revenue += product.revenue;
    row.units += product.quantity_sold;
    row.products += 1;
    categories.set(product.category, row);
  }

  const productRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const bestSeller = [...products].sort((a, b) => b.quantity_sold - a.quantity_sold)[0] || null;

  return {
    kpis: {
      totalProducts: products.length,
      unitsSold: products.reduce((sum, product) => sum + product.quantity_sold, 0),
      productRevenue,
      bestSeller: bestSeller?.product_name || "N/A",
      lowStockProducts: products.filter((product) => product.stock_status === "Low Stock").length,
      outOfStockProducts: products.filter((product) => product.stock_status === "Out of Stock").length,
      averageRevenuePerProduct: products.length > 0 ? Math.round(productRevenue / products.length) : 0,
      activeCategories: categories.size,
    },
    revenueByCategory: Array.from(categories.values()).sort((a, b) => b.revenue - a.revenue),
    unitsSoldByCategory: Array.from(categories.values()).sort((a, b) => b.units - a.units),
    topByRevenue: [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    topByQuantity: [...products].sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, 8),
    lowStockTable: products
      .filter((product) => product.stock_status !== "In Stock")
      .sort((a, b) => a.current_stock - b.current_stock),
    products: products.sort((a, b) => b.revenue - a.revenue),
    source: "Derived from invoices and estimated inventory",
  };
}
