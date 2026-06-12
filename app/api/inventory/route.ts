import { NextResponse } from "next/server";
import { getInventoryData } from "@/lib/warehouseAnalytics";

export async function GET() {
  try {
    const data = await getInventoryData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải dữ liệu tồn kho.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
