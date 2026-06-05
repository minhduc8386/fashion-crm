import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        full_name: payload.full_name,
        role: payload.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi server.", error: String(error) },
      { status: 500 }
    );
  }
}
