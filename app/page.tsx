import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fashion CRM – Hệ thống quản lý khách hàng thời trang",
  description:
    "Hệ thống CRM dành cho nhãn hàng thời trang X – quản lý khách hàng, hoá đơn và doanh thu.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Logo / Brand */}
        <div className="mb-8">
          <span className="inline-block text-5xl mb-4">✦</span>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Fashion CRM
          </h1>
          <p className="text-purple-300 text-lg">
            Hệ thống quản lý khách hàng – Nhãn hàng thời trang X
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/register"
            id="link-register"
            className="group bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400 rounded-2xl p-6 text-left transition-all duration-200"
          >
            <div className="text-3xl mb-3">📝</div>
            <h2 className="text-white font-semibold text-lg mb-1">
              Đăng ký khách hàng
            </h2>
            <p className="text-purple-200 text-sm">
              Khách hàng tự điền thông tin đăng ký
            </p>
          </Link>

          <Link
            href="/crm/dashboard"
            id="link-dashboard"
            className="group bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400 rounded-2xl p-6 text-left transition-all duration-200"
          >
            <div className="text-3xl mb-3">📊</div>
            <h2 className="text-white font-semibold text-lg mb-1">Dashboard</h2>
            <p className="text-purple-200 text-sm">
              Tổng quan doanh thu và thống kê
            </p>
          </Link>

          <Link
            href="/crm/customers"
            id="link-customers"
            className="group bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400 rounded-2xl p-6 text-left transition-all duration-200"
          >
            <div className="text-3xl mb-3">👥</div>
            <h2 className="text-white font-semibold text-lg mb-1">
              Quản lý khách hàng
            </h2>
            <p className="text-purple-200 text-sm">
              Nhập và xem danh sách khách hàng
            </p>
          </Link>

          <Link
            href="/crm/invoices"
            id="link-invoices"
            className="group bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400 rounded-2xl p-6 text-left transition-all duration-200"
          >
            <div className="text-3xl mb-3">🧾</div>
            <h2 className="text-white font-semibold text-lg mb-1">
              Quản lý hoá đơn
            </h2>
            <p className="text-purple-200 text-sm">
              Tạo và xem lịch sử hoá đơn
            </p>
          </Link>
        </div>

        {/* Dev Tools */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-purple-400 text-xs mb-3 uppercase tracking-wider">
            Dev Tools
          </p>
          <a
            href="/api/test"
            id="link-api-test"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-purple-300 hover:text-white text-sm underline underline-offset-4 transition-colors"
          >
            /api/test – Kiểm tra kết nối MongoDB →
          </a>
        </div>
      </div>
    </div>
  );
}
