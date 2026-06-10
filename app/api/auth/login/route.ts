import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập email." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const staff = await db.collection("staff_users").findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, "i") },
      status: "active",
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy nhân viên với email này." },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: staff._id.toString(),
      email: staff.email,
      full_name: staff.full_name,
      role: staff.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        full_name: staff.full_name,
        email: staff.email,
        role: staff.role,
      },
    });

    // Lưu JWT vào cookie HttpOnly (không thể đọc bằng JS ở browser)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 giờ
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server. Vui lòng thử lại.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
