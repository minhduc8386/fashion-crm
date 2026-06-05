import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

// API một lần dùng để thiết lập mật khẩu ban đầu cho nhân viên
// Sau khi chạy xong, nên xoá hoặc vô hiệu hoá file này
export async function POST(request: Request) {
  try {
    const { email, newPassword, adminSecret } = await request.json();

    // Bảo vệ đơn giản: phải có admin secret đúng
    if (adminSecret !== process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    if (!email || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Email và mật khẩu (tối thiểu 6 ký tự) là bắt buộc.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const staff = await db.collection("staff_users").findOne({
      email: email.toLowerCase().trim(),
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy nhân viên với email này." },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.collection("staff_users").updateOne(
      { _id: new ObjectId(staff._id) },
      {
        $set: {
          password: hashedPassword,
          updated_at: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Đã thiết lập mật khẩu thành công cho ${staff.full_name} (${staff.email}).`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi server.", error: String(error) },
      { status: 500 }
    );
  }
}
