import { NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${AUTH_COOKIE}=`))
    ?.split("=")[1];

  if (!token) {
    return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
  }

  const session = await verifySessionToken(decodeURIComponent(token));
  if (!session) {
    return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: session });
}
