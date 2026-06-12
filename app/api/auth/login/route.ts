import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { AUTH_COOKIE, createSessionToken } from "@/lib/auth";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập email nhân viên hợp lệ." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const staff = await db.collection("staff_users").findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
    });

    const demoEmail = process.env.DEMO_STAFF_EMAIL?.trim().toLowerCase();
    const demoStaffAllowed = !staff && demoEmail && email === demoEmail;

    if (!staff && !demoStaffAllowed) {
      return NextResponse.json(
        { success: false, message: "Email này không tồn tại trong danh sách nhân viên." },
        { status: 401 }
      );
    }

    const session = {
      email,
      name: String(staff?.name || staff?.full_name || email),
      role: String(staff?.role || "staff"),
    };
    const token = await createSessionToken(session);
    const response = NextResponse.json({ success: true, data: session });

    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể đăng nhập. Vui lòng thử lại.",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
