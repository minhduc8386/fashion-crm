import { NextResponse } from "next/server";
import { getProductsDashboardData } from "@/lib/warehouseAnalytics";

export async function GET() {
  try {
    const data = await getProductsDashboardData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải dashboard sản phẩm.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
