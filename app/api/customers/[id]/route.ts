import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID khách hàng không hợp lệ." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // 1. Lấy thông tin khách hàng
    const customer = await db
      .collection("customers")
      .findOne({ _id: new ObjectId(id) });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng." },
        { status: 404 }
      );
    }

    // 2. Lấy tất cả hóa đơn của khách này
    const invoices = await db
      .collection("invoices")
      .find({ customer_id: new ObjectId(id) })
      .sort({ created_at: -1 })
      .toArray();

    // 3. Tính Metrics (Customer 360 KPIs)
    const total_spent = invoices.reduce(
      (sum, inv) => sum + (inv.total_amount || 0),
      0
    );
    const invoice_count = invoices.length;
    const aov = invoice_count > 0 ? Math.round(total_spent / invoice_count) : 0;

    // Tenure: Số ngày kể từ ngày tạo tài khoản
    const createdAt = customer.created_at
      ? new Date(customer.created_at)
      : new Date(customer.mp_join_time || Date.now());
    const tenureDays = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Gói cước còn hạn không?
    const now = Date.now();
    const expireTime = customer.mp_expire_time
      ? new Date(customer.mp_expire_time).getTime()
      : 0;
    const subscription_active = expireTime > now;
    const subscription_days_left = subscription_active
      ? Math.floor((expireTime - now) / (1000 * 60 * 60 * 24))
      : 0;

    // Danh mục mua nhiều nhất
    const categoryCount: Record<string, number> = {};
    invoices.forEach((inv) => {
      (inv.items || []).forEach((item: { category?: string; quantity?: number }) => {
        const category = item.category?.trim();
        if (!category) return;
        categoryCount[category] = (categoryCount[category] || 0) + (item.quantity || 0);
      });
    });
    const favorite_category =
      Object.keys(categoryCount).sort(
        (a, b) => categoryCount[b] - categoryCount[a]
      )[0] || null;

    // Lần mua gần nhất
    const last_purchase_date =
      invoices.length > 0 ? invoices[0].created_at : null;

    // Phân loại khách hàng (Tier)
    let tier = "Mới";
    if (total_spent >= 10000000) tier = "VIP Platinum";
    else if (total_spent >= 5000000) tier = "VIP Gold";
    else if (total_spent >= 2000000) tier = "Thân thiết";
    else if (invoice_count >= 2) tier = "Thường xuyên";

    const metrics = {
      total_spent,
      invoice_count,
      aov,
      tenure_days: tenureDays,
      subscription_active,
      subscription_days_left,
      favorite_category,
      last_purchase_date,
      tier,
    };

    return NextResponse.json({
      success: true,
      data: {
        customer,
        invoices,
        metrics,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy thông tin khách hàng.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
