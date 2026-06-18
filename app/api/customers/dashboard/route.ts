import { NextResponse } from "next/server";
import { getCustomersDashboardData } from "@/lib/customerAnalytics";

export async function GET() {
  try {
    const data = await getCustomersDashboardData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải dashboard khách hàng.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
