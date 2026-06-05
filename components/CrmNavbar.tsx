"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/crm/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/crm/customers", label: "Khách hàng", icon: "👥" },
  { href: "/crm/invoices", label: "Hoá đơn", icon: "🧾" },
];

export default function CrmNavbar({ title }: { title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setUserName(d.user.full_name);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="bg-slate-900 border-b border-white/10 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left: Brand + Nav links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-purple-400 hover:text-white transition-colors">
            <span className="text-lg">✦</span>
            <span className="font-bold text-sm hidden sm:block">Fashion CRM</span>
          </Link>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:block">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: User info + Logout */}
        <div className="flex items-center gap-3">
          {userName && (
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-purple-600/50 flex items-center justify-center text-xs font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-slate-300 text-sm">{userName}</span>
            </div>
          )}

          <button
            id="btn-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:block">{loggingOut ? "Đang thoát..." : "Đăng xuất"}</span>
          </button>
        </div>
      </div>

      {/* Page title */}
      <div className="max-w-6xl mx-auto mt-2">
        <h1 className="text-white font-semibold text-lg">{title}</h1>
      </div>
    </nav>
  );
}
