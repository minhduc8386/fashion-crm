"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import CrmNavbar from "@/components/CrmNavbar";

interface Customer {
  _id: string;
  name?: string;
  full_name?: string;
  phone: string;
  email: string;
  address: string;
  total_spent: number;
  invoice_count: number;
  created_at: string;
  device_model?: string;
  is_seeded?: boolean;
}

const EMPTY_FORM = { name: "", phone: "", email: "", address: "", notes: "" };

function validatePhone(phone: string): string | null {
  if (!/^0\d{9}$/.test(phone.trim())) {
    return "Số điện thoại phải bắt đầu bằng 0 và đủ 10 chữ số.";
  }
  return null;
}

function validateEmail(email: string): string | null {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email không đúng định dạng.";
  }
  return null;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch {
      console.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Xóa lỗi field khi user nhập lại
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errors.phone = phoneErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) errors.email = emailErr;
    if (!form.name.trim()) errors.name = "Họ tên là bắt buộc.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        setForm(EMPTY_FORM);
        setFieldErrors({});
        setShowForm(false);
        setSubmitStatus("idle");
        fetchCustomers();
      } else {
        setSubmitStatus("error");
        setErrorMsg(data.message || "Có lỗi xảy ra.");
      }
    } catch {
      setSubmitStatus("error");
      setErrorMsg("Không thể kết nối server.");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const filteredCustomers = customers.filter((c) => {
    const custName = c.name || c.full_name || "";
    return (
      custName.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <CrmNavbar title="👥 Quản lý khách hàng" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Danh sách khách hàng</h2>
            <p className="text-slate-400 text-sm mt-1">
              {filteredCustomers.length}/{customers.length} khách hàng
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm w-56 transition-colors"
            />
            <button
              id="btn-add-customer"
              onClick={() => { setShowForm(!showForm); setFieldErrors({}); setErrorMsg(""); }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              {showForm ? "✕ Đóng" : "+ Thêm KH"}
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">Thêm khách hàng mới</h3>
            <form onSubmit={handleSubmit} id="form-add-customer" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-slate-300 text-sm mb-1">
                  Họ tên <span className="text-red-400">*</span>
                </label>
                <input
                  id="customer-name" name="name" type="text"
                  value={form.name} onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-colors ${fieldErrors.name ? "border-red-500" : "border-white/10 focus:border-purple-500"}`}
                />
                {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-slate-300 text-sm mb-1">
                  Số điện thoại <span className="text-red-400">*</span>
                </label>
                <input
                  id="customer-phone" name="phone" type="tel"
                  value={form.phone} onChange={handleChange}
                  placeholder="0901234567" maxLength={10}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-colors ${fieldErrors.phone ? "border-red-500" : "border-white/10 focus:border-purple-500"}`}
                />
                {fieldErrors.phone && <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-300 text-sm mb-1">Email</label>
                <input
                  id="customer-email" name="email" type="email"
                  value={form.email} onChange={handleChange}
                  placeholder="example@email.com"
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-colors ${fieldErrors.email ? "border-red-500" : "border-white/10 focus:border-purple-500"}`}
                />
                {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-slate-300 text-sm mb-1">Địa chỉ</label>
                <input
                  id="customer-address" name="address" type="text"
                  value={form.address} onChange={handleChange}
                  placeholder="Địa chỉ"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-slate-300 text-sm mb-1">Ghi chú</label>
                <textarea
                  id="customer-notes" name="notes"
                  value={form.notes} onChange={handleChange}
                  rows={2} placeholder="Ghi chú thêm"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {submitStatus === "error" && (
                <div className="sm:col-span-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                </div>
              )}

              <div className="sm:col-span-2 flex justify-end">
                <button
                  id="btn-save-customer" type="submit"
                  disabled={submitStatus === "loading"}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  {submitStatus === "loading" ? "Đang lưu..." : "Lưu khách hàng"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              {search ? "Không tìm thấy khách hàng phù hợp." : "Chưa có khách hàng nào."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-left">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Họ tên</th>
                  <th className="px-4 py-3 font-medium">Điện thoại</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Địa chỉ</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Thiết bị</th>
                  <th className="px-4 py-3 font-medium text-right">LTV</th>
                  <th className="px-4 py-3 font-medium text-right">HĐ</th>
                  <th className="px-4 py-3 font-medium text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c, i) => (
                  <tr
                    key={c._id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/crm/customers/${c._id}`)}
                  >
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {(c.name || c.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium capitalize">{c.name || c.full_name || "–"}</span>
                        {c.is_seeded && (
                          <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full">FPT</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px] truncate hidden lg:table-cell">{c.address || "–"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{c.device_model || "–"}</td>
                    <td className="px-4 py-3 text-purple-300 text-right font-semibold">{formatCurrency(c.total_spent || 0)}</td>
                    <td className="px-4 py-3 text-slate-300 text-right">{c.invoice_count || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-purple-400 group-hover:text-purple-300 transition-colors">360° →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
