"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/crm/dashboard", label: "Dashboard", icon: "DB" },
  { href: "/crm/customers", label: "Customers", icon: "CU" },
  { href: "/crm/products", label: "Products", icon: "PR" },
  { href: "/crm/fifo", label: "FIFO Dashboard", icon: "FI" },
  { href: "/crm/inventory", label: "Warehouse Inventory", icon: "WH" },
  { href: "/crm/power-bi", label: "Power BI Dashboard", icon: "BI" },
];

export default function CrmSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [staffEmail, setStaffEmail] = useState("staff");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.success) setStaffEmail(json.data.email);
        })
        .catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center justify-between px-5 lg:h-auto lg:flex-col lg:items-start lg:gap-6 lg:px-6 lg:py-6">
        <Link href="/crm/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            FX
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-950">Fashion CRM</span>
            <span className="hidden text-xs text-slate-500 lg:block">Customer 360 Workspace</span>
          </span>
        </Link>

        <div className="hidden w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 lg:block">
          <p className="text-xs text-slate-500">Signed in</p>
          <p className="truncate text-sm font-medium text-slate-900">{staffEmail}</p>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-5 pb-3 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-4 lg:pb-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold ${
                  active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 lg:hidden"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600">
            SO
          </span>
          <span>Sign out</span>
        </button>
      </nav>

      <div className="hidden border-t border-slate-200 p-4 lg:block">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
