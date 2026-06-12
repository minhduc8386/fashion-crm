import { NextResponse } from "next/server";
import { getFifoData } from "@/lib/warehouseAnalytics";

export async function GET() {
  try {
    const data = await getFifoData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải dữ liệu FIFO.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
