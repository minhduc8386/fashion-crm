import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function validatePhone(phone: string): string | null {
  if (!phone || !/^0\d{9}$/.test(phone.trim())) {
    return "Số điện thoại phải bắt đầu bằng 0 và đủ 10 chữ số.";
  }
  return null;
}

function validateEmail(email: string): string | null {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email không đúng định dạng.";
  }
  return null;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const customers = await db
      .collection("customers")
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lấy danh sách khách hàng.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email = "", address = "", notes = "" } = body;

    // Validate
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Họ tên là bắt buộc." },
        { status: 400 }
      );
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      return NextResponse.json(
        { success: false, message: phoneError },
        { status: 400 }
      );
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json(
        { success: false, message: emailError },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Kiểm tra số điện thoại đã tồn tại chưa
    const existingCustomer = await db
      .collection("customers")
      .findOne({ phone: phone.trim() });

    if (existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          message: `Số điện thoại ${phone} đã được đăng ký bởi khách hàng "${existingCustomer.name}".`,
        },
        { status: 409 }
      );
    }

    const newCustomer = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
      total_spent: 0,
      invoice_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("customers").insertOne(newCustomer);

    return NextResponse.json(
      { success: true, data: { _id: result.insertedId, ...newCustomer } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể tạo khách hàng.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
