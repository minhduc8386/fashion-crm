"use client";

import { useState, useEffect, useCallback } from "react";

interface Customer { _id: string; name?: string; full_name?: string; phone: string; }
interface InvoiceItem { product_name: string; quantity: number; price: number; }
interface Invoice {
  _id: string; customer_name: string; items: InvoiceItem[];
  total_amount: number; notes: string; created_at: string;
}

const DEFAULT_ITEM: InvoiceItem = { product_name: "", quantity: 1, price: 0 };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ ...DEFAULT_ITEM }]);
  const [notes, setNotes] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const [invRes, custRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/customers"),
      ]);
      const [invData, custData] = await Promise.all([invRes.json(), custRes.json()]);
      if (invData.success) setInvoices(invData.data);
      if (custData.success) setCustomers(custData.data);
    } catch { console.error("Failed to fetch data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) { setSubmitStatus("error"); setErrorMsg("Vui lòng chọn khách hàng."); return; }
    if (items.some((i) => !i.product_name.trim() || i.price <= 0)) {
      setSubmitStatus("error"); setErrorMsg("Vui lòng điền đủ tên sản phẩm và đơn giá > 0."); return;
    }

    setSubmitStatus("loading"); setErrorMsg("");
    const customer = customers.find((c) => c._id === selectedCustomer);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: selectedCustomer, customer_name: customer?.name || customer?.full_name || "", items, notes }),
      });
      const data = await res.json();

      if (data.success) {
        setSelectedCustomer(""); setItems([{ ...DEFAULT_ITEM }]); setNotes("");
        setShowForm(false); setSubmitStatus("success");
        setTimeout(() => setSubmitStatus("idle"), 3000);
        fetchData();
      } else {
        setSubmitStatus("error"); setErrorMsg(data.message || "Có lỗi xảy ra.");
      }
    } catch { setSubmitStatus("error"); setErrorMsg("Không thể kết nối server."); }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
  const formatDate = (d: string) =>
    new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Danh sách hoá đơn</h1>
            <p className="text-slate-500 text-sm mt-1">Tổng cộng: {invoices.length} hoá đơn</p>
          </div>
          <div className="flex items-center gap-3">
            {submitStatus === "success" && (
              <span className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                ✓ Tạo hoá đơn thành công!
              </span>
            )}
            <button
              id="btn-add-invoice"
              onClick={() => { setShowForm(!showForm); setSubmitStatus("idle"); setErrorMsg(""); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {showForm ? "✕ Đóng" : "+ Tạo hoá đơn"}
            </button>
          </div>
        </div>

        {/* Create Invoice Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-slate-950 font-semibold mb-4">Tạo hoá đơn mới</h2>
            <form onSubmit={handleSubmit} id="form-create-invoice" className="space-y-5">
              {/* Customer select */}
              <div>
                <label className="block text-slate-700 text-sm mb-1">
                  Khách hàng <span className="text-red-600">*</span>
                </label>
                <select
                  id="select-customer"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name || c.full_name || "Khách hàng ẩn danh"} – {c.phone}
                    </option>
                  ))}
                </select>
              </div>

	              {/* Items */}
	              <div>
	                <div className="flex items-center justify-between mb-2">
	                  <label className="text-slate-700 text-sm font-medium">
	                    Sản phẩm <span className="text-red-600">*</span>
	                  </label>
                  <button type="button" id="btn-add-item" onClick={() => setItems([...items, { ...DEFAULT_ITEM }])}
                    className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
                    + Thêm dòng
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 px-1">
                    <span className="col-span-5">Tên sản phẩm</span>
                    <span className="col-span-2">Số lượng</span>
                    <span className="col-span-4">Đơn giá (VND)</span>
                    <span className="col-span-1"></span>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        id={`item-name-${i}`} type="text" value={item.product_name}
                        onChange={(e) => updateItem(i, "product_name", e.target.value)}
                        placeholder="Tên sản phẩm"
                        className="col-span-5 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-colors"
                      />
                      <input
                        id={`item-qty-${i}`} type="number" value={item.quantity} min={1}
                        onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                        className="col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-colors"
                      />
                      <input
                        id={`item-price-${i}`} type="number" value={item.price} min={0}
                        onChange={(e) => updateItem(i, "price", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="col-span-4 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-colors"
                      />
                      <button type="button" onClick={() => items.length > 1 && setItems(items.filter((_, idx) => idx !== i))}
                        className="col-span-1 text-red-600 hover:text-red-700 text-center transition-colors disabled:opacity-30" disabled={items.length === 1}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-6 py-3 text-right">
                  <p className="text-slate-500 text-xs mb-1">Tổng tiền thanh toán</p>
                  <p className="text-slate-950 font-bold text-2xl">{formatCurrency(totalAmount)}</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 text-sm mb-1">Ghi chú</label>
                <textarea id="invoice-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="Ghi chú cho hoá đơn (tuỳ chọn)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors resize-none"
                />
              </div>

              {submitStatus === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  <p className="text-red-700 text-sm">{errorMsg}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button id="btn-save-invoice" type="submit" disabled={submitStatus === "loading"}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
                  {submitStatus === "loading" ? "Đang lưu..." : "Tạo hoá đơn"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Invoice List */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16 text-slate-500">Chưa có hoá đơn nào.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Khách hàng</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Sản phẩm</th>
                  <th className="px-4 py-3 font-medium text-right">Tổng tiền</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv._id} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-950 font-medium">{inv.customer_name}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      {inv.items?.map((it) => `${it.product_name} x${it.quantity}`).join(", ") || "–"}
                    </td>
                    <td className="px-4 py-3 text-slate-950 font-semibold text-right">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDate(inv.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
    </div>
  );
}
