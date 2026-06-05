import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
    const { customer_id, customer_name, items, notes } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "customer_id and items are required" },
        { status: 400 }
      );
    }

    const total_amount = items.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0
    );

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const newInvoice = {
      customer_id: new ObjectId(customer_id),
      customer_name: customer_name || "",
      items,
      total_amount,
      notes: notes || "",
      created_at: new Date(),
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
