import { NextResponse } from "next/server";
import {
  buildOrdersByDay,
  getDashboardDataset,
  parseDashboardFilters,
} from "@/lib/dashboardData";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseDashboardFilters(searchParams);

    if ("error" in parsed) {
      return NextResponse.json(
        { success: false, message: parsed.error },
        { status: 400 }
      );
    }

    const dataset = await getDashboardDataset(parsed.filters);
    const ordersByDay = buildOrdersByDay(dataset, parsed.filters);

    return NextResponse.json({ success: true, data: ordersByDay });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải dữ liệu Orders by Day.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
