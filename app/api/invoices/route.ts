import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const ALLOWED_CHANNELS = new Set([
  "Website",
  "Shopee",
  "TikTok Shop",
  "Facebook",
  "Offline Store",
  "Partner/FPT",
  "Walmart",
  "Weee",
]);

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

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const invoices = await db
      .collection("invoices")
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch invoices",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, customer_name, items, notes, channel, order_date } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "customer_id and items are required" },
        { status: 400 }
      );
    }

    const normalizedItems = items.map(
      (item: {
        product_name?: string;
        name?: string;
        category?: string;
        product_id?: string;
        sku?: string;
        price: number;
        quantity: number;
      }) => {
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const name = (item.name || item.product_name || "").trim();
        const sku = item.sku || `SKU-${slugify(name || "PRODUCT")}`;

        return {
          ...item,
          product_id: item.product_id || sku.replace(/^SKU-/, "PRD-"),
          sku,
          name,
          product_name: item.product_name || name,
          category: item.category?.trim() || "Khác",
          quantity,
          price,
          unit_price: price,
          subtotal: price * quantity,
          total_price: price * quantity,
        };
      }
    );

    const total_amount = normalizedItems.reduce(
      (sum: number, item: { subtotal: number }) => sum + item.subtotal,
      0
    );

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const normalizedChannel = ALLOWED_CHANNELS.has(channel) ? channel : "Website";
    const orderDate = order_date ? new Date(order_date) : new Date();
    const safeOrderDate = Number.isNaN(orderDate.getTime()) ? new Date() : orderDate;

    const newInvoice = {
      customer_id: new ObjectId(customer_id),
      customer_name: customer_name || "",
      items: normalizedItems,
      total_amount,
      channel: normalizedChannel,
      order_date: safeOrderDate,
      notes: notes || "",
      created_at: safeOrderDate,
      updated_at: new Date(),
    };

    const result = await db.collection("invoices").insertOne(newInvoice);

    // Update customer's total_spent and invoice_count
    await db.collection("customers").updateOne(
      { _id: new ObjectId(customer_id) },
      {
        $inc: { total_spent: total_amount, invoice_count: 1 },
        $set: { updated_at: new Date() },
      }
    );

    return NextResponse.json(
      { success: true, data: { _id: result.insertedId, ...newInvoice } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create invoice",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
