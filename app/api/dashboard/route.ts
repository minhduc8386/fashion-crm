import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const [totalCustomers, totalInvoices, revenueResult] = await Promise.all([
      db.collection("customers").countDocuments(),
      db.collection("invoices").countDocuments(),
      db
        .collection("invoices")
        .aggregate([
          { $group: { _id: null, total: { $sum: "$total_amount" } } },
        ])
        .toArray(),
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].total : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers,
        totalInvoices,
        totalRevenue,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch dashboard data",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
