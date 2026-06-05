import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

// Các routes không cần đăng nhập
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/setup",
  "/api/test",
  "/_next",
  "/favicon.ico",
];

// Các routes API cần bảo vệ
const PROTECTED_API_PATHS = [
  "/api/customers",
  "/api/invoices",
  "/api/dashboard",
  "/api/auth/me",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua các public paths
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublic) return NextResponse.next();

  // Kiểm tra nếu là route CRM hoặc API cần bảo vệ
  const isCrmRoute = pathname.startsWith("/crm");
  let isProtectedApi = PROTECTED_API_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  // Cho phép khách hàng public đăng ký mới (POST /api/customers)
  if (pathname === "/api/customers" && request.method === "POST") {
    isProtectedApi = false;
  }

  if (!isCrmRoute && !isProtectedApi) return NextResponse.next();

  // Lấy token từ cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập." },
        { status: 401 }
      );
    }
    // Redirect về trang login và nhớ URL hiện tại để sau login quay lại
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Xác thực token
  const payload = await verifyToken(token);
  if (!payload) {
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Thêm thông tin user vào header để các route handler có thể dùng
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/crm/:path*",
    "/api/customers/:path*",
    "/api/invoices/:path*",
    "/api/dashboard/:path*",
    "/api/auth/me",
  ],
};
