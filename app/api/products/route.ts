import { NextResponse } from "next/server";
import { getProductMetrics } from "@/lib/warehouseAnalytics";

export async function GET() {
  try {
    const data = await getProductMetrics();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải dữ liệu sản phẩm.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
