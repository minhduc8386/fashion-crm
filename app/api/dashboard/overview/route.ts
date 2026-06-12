import { NextResponse } from "next/server";
import {
  buildOverview,
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
    const overview = buildOverview(dataset, parsed.filters);

    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải dữ liệu dashboard overview.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
