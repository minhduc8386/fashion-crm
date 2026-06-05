"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("Đăng ký thành công! Cảm ơn bạn đã tham gia.");
        setForm({ name: "", phone: "", email: "", address: "", notes: "" });
      } else {
        setStatus("error");
        setMessage(data.message || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch {
      setStatus("error");
      setMessage("Không thể kết nối server. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-purple-300 hover:text-white text-sm mb-4 inline-block transition-colors"
          >
            ← Trang chủ
          </Link>
          <div className="text-4xl mb-3">✦</div>
          <h1 className="text-2xl font-bold text-white mb-2">Đăng ký thành viên</h1>
          <p className="text-purple-300 text-sm">
            Nhãn hàng thời trang X – Nhận ưu đãi độc quyền
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
          {status === "success" ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-green-300 font-semibold text-lg mb-2">{message}</p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-4 text-purple-300 hover:text-white text-sm underline transition-colors"
              >
                Đăng ký thêm
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-1">
                  Họ và tên <span className="text-red-400">*</span>
                </label>
                <input
                  id="input-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-1">
                  Số điện thoại <span className="text-red-400">*</span>
                </label>
                <input
                  id="input-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="0901234567"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="input-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-1">
                  Địa chỉ
                </label>
                <input
                  id="input-address"
                  name="address"
                  type="text"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-1">
                  Ghi chú
                </label>
                <textarea
                  id="input-notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Thông tin thêm (tuỳ chọn)"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 transition-colors resize-none"
                />
              </div>

              {status === "error" && (
                <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
                  {message}
                </p>
              )}

              <button
                id="btn-register-submit"
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {status === "loading" ? "Đang gửi..." : "Đăng ký ngay"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
