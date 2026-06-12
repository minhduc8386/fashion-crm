"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể đăng nhập.");
      }

      router.replace(searchParams.get("redirect") || "/crm/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Email nhân viên
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="staffA@fashionx.com"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Đang đăng nhập..." : "Vào CRM"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Trang chủ
        </Link>
        <div className="mt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            FX
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            Đăng nhập nhân viên
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Chỉ cần email có trong collection staff_users. Hệ thống không dùng password.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
