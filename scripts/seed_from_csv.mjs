/**
 * SEED SCRIPT: Import Dim Customer + Tạo Fact Invoices
 * 
 * Chạy: node scripts/seed_from_csv.mjs
 * 
 * Script này sẽ:
 * 1. Đọc file CSV Customer_Registered từ sếp
 * 2. Import 150 khách hàng đầu vào MongoDB CRM với đầy đủ demographic data
 * 3. Tự sinh dữ liệu fact (invoices / lịch sử mua hàng thời trang) ngẫu nhiên
 * 4. Tính lại total_spent, invoice_count cho mỗi khách
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ========== CONFIG ==========
const MONGODB_URI =
  "mongodb+srv://fashion_crm_user:Tmdcarryu2908@fashion-crm-cluster.lcx7pmj.mongodb.net/fashion_crm?retryWrites=true&w=majority&appName=fashion-crm-cluster";
const DB_NAME = "fashion_crm";
const CSV_PATH = join(
  __dirname,
  "../../Data_Engineer.Customer_Registered.csv"
);
const IMPORT_LIMIT = 150; // Số khách hàng sẽ import

// ========== FASHION PRODUCT CATALOG (Fact Data) ==========
const PRODUCTS = [
  { name: "Áo thun basic unisex", price: 129000, category: "Áo" },
  { name: "Áo polo nam cao cấp", price: 249000, category: "Áo" },
  { name: "Áo sơ mi linen nữ", price: 319000, category: "Áo" },
  { name: "Áo hoodie oversized", price: 399000, category: "Áo" },
  { name: "Áo khoác dù 2 lớp", price: 549000, category: "Áo" },
  { name: "Quần jean slim fit nam", price: 479000, category: "Quần" },
  { name: "Quần short thể thao", price: 199000, category: "Quần" },
  { name: "Quần tây công sở nữ", price: 429000, category: "Quần" },
  { name: "Quần jogger cotton", price: 279000, category: "Quần" },
  { name: "Chân váy midi hoa nhí", price: 359000, category: "Váy" },
  { name: "Đầm wrap midi nữ", price: 589000, category: "Váy" },
  { name: "Giày sneaker basic", price: 799000, category: "Giày" },
  { name: "Dép sandal nữ", price: 349000, category: "Giày" },
  { name: "Túi tote canvas", price: 299000, category: "Phụ kiện" },
  { name: "Thắt lưng da nam", price: 249000, category: "Phụ kiện" },
  { name: "Mũ bucket unisex", price: 179000, category: "Phụ kiện" },
  { name: "Tất vớ fashion set 3 đôi", price: 89000, category: "Phụ kiện" },
  { name: "Set đồ pajama nữ", price: 449000, category: "Đồ bộ" },
  { name: "Áo len cổ lọ", price: 499000, category: "Áo" },
  { name: "Quần cargo nhiều túi", price: 459000, category: "Quần" },
];

// ========== HELPERS ==========
function parseCSV(content) {
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // Handle quoted commas
    const values = [];
    let current = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"' && !inQuote) { inQuote = true; }
      else if (ch === '"' && inQuote) { inQuote = false; }
      else if (ch === "," && !inQuote) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

function generatePhone() {
  const prefixes = ["090", "091", "094", "098", "096", "097", "086", "089", "093", "070", "079", "077", "076", "078"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 9000000 + 1000000).toString();
  return prefix + suffix;
}

function generateInvoices(customerId, customerName, count) {
  const invoices = [];
  const baseDate = new Date("2023-01-01");
  const usedDays = new Set();

  for (let i = 0; i < count; i++) {
    // Sinh ngày mua ngẫu nhiên, không trùng
    let dayOffset;
    do {
      dayOffset = Math.floor(Math.random() * 730); // 2 năm
    } while (usedDays.has(dayOffset));
    usedDays.add(dayOffset);

    const invoiceDate = new Date(baseDate.getTime() + dayOffset * 86400000);

    // Mỗi hóa đơn có 1-4 sản phẩm
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const selectedIndices = new Set();
    while (selectedIndices.size < itemCount) {
      selectedIndices.add(Math.floor(Math.random() * PRODUCTS.length));
    }

    const items = [...selectedIndices].map((idx) => {
      const product = PRODUCTS[idx];
      const quantity = Math.floor(Math.random() * 3) + 1;
      return {
        name: product.name,
        category: product.category,
        price: product.price,
        quantity,
        subtotal: product.price * quantity,
      };
    });

    const total_amount = items.reduce((s, item) => s + item.subtotal, 0);

    invoices.push({
      customer_id: customerId,
      customer_name: customerName,
      items,
      total_amount,
      notes: "",
      created_at: invoiceDate,
      updated_at: invoiceDate,
    });
  }

  return invoices.sort((a, b) => b.created_at - a.created_at);
}

// ========== MAIN ==========
async function main() {
  console.log("🚀 Bắt đầu import Dim Customer + Tạo Fact Invoices...\n");

  // Parse CSV
  console.log(`📂 Đọc file CSV: ${CSV_PATH}`);
  const csvContent = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(csvContent);
  console.log(`✅ Đọc được ${rows.length} dòng từ CSV\n`);

  // Connect MongoDB
  console.log("🔌 Kết nối MongoDB Atlas...");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log("✅ Kết nối thành công!\n");

  // Clear existing seeded data (optional - chỉ xóa những record có field is_seeded)
  const existing = await db.collection("customers").countDocuments({ is_seeded: true });
  if (existing > 0) {
    console.log(`🗑️  Tìm thấy ${existing} bản ghi seeded cũ → Xóa để seed lại...`);
    const oldCustomers = await db.collection("customers").find({ is_seeded: true }, { projection: { _id: 1 } }).toArray();
    const oldIds = oldCustomers.map((c) => c._id);
    await db.collection("customers").deleteMany({ is_seeded: true });
    if (oldIds.length > 0) {
      const { ObjectId } = await import("mongodb");
      await db.collection("invoices").deleteMany({ customer_id: { $in: oldIds } });
    }
    console.log("✅ Đã xóa dữ liệu cũ\n");
  }

  // Import customers
  const limitedRows = rows.slice(0, IMPORT_LIMIT);
  console.log(`👥 Đang import ${limitedRows.length} khách hàng...`);

  let importedCustomers = 0;
  let importedInvoices = 0;
  const usedPhones = new Set();

  for (const row of limitedRows) {
    const name = (row["name"] || "Khách vãng lai").trim().replace(/\s+/g, " ");
    if (!name || name.length < 2) continue;

    // Sinh SĐT duy nhất
    let phone;
    do { phone = generatePhone(); } while (usedPhones.has(phone));
    usedPhones.add(phone);

    // Parse mp_expire_time (Unix timestamp → Date)
    const expireTimestamp = parseInt(row["mp_expire_time.box_maxvip_01042022"]);
    const mp_expire_time = !isNaN(expireTimestamp)
      ? new Date(expireTimestamp * 1000)
      : null;

    const joinTimestamp = parseInt(row["mp_join_time.box_maxvip_01042022"]);
    const mp_join_time = !isNaN(joinTimestamp)
      ? new Date(joinTimestamp * 1000)
      : null;

    const createdDate = row["created_date"]
      ? new Date(row["created_date"])
      : new Date("2022-04-28");

    // Số invoice ngẫu nhiên 1-8
    const invoiceCount = Math.floor(Math.random() * 8) + 1;

    // Thêm khách hàng với đầy đủ Demographic data
    const customerDoc = {
      // --- Thông tin cơ bản CRM ---
      name: name,
      phone: phone,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      address: (row["address"] || "").trim(),
      notes: "",

      // --- Dim Demographic (từ MongoDB sếp) ---
      user_id: row["user_id"] || "",
      status: parseInt(row["status"]) || 1,
      device_model: row["device_model"] || "",
      device_name: row["device_name"] || "",
      mac_address: row["mac_address"] || "",
      platform: row["platform"] || "",
      market_plan: row["market_plan[0]"] || "",
      plan_id: row["plan_ids[0]"] || "",
      mp_join_time: mp_join_time,
      mp_expire_time: mp_expire_time,
      source_id: row["_id"] || "", // ObjectId gốc từ hệ thống sếp

      // --- Metrics (sẽ cập nhật sau khi thêm invoices) ---
      total_spent: 0,
      invoice_count: 0,

      // --- Metadata ---
      is_seeded: true,
      created_at: createdDate,
      updated_at: new Date(),
    };

    const result = await db.collection("customers").insertOne(customerDoc);
    const customerId = result.insertedId;
    importedCustomers++;

    // Tạo Fact Invoices
    const invoices = generateInvoices(customerId, name, invoiceCount);
    if (invoices.length > 0) {
      await db.collection("invoices").insertMany(invoices);
      importedInvoices += invoices.length;

      // Cập nhật metrics cho customer
      const total_spent = invoices.reduce((s, inv) => s + inv.total_amount, 0);
      await db.collection("customers").updateOne(
        { _id: customerId },
        {
          $set: {
            total_spent,
            invoice_count: invoices.length,
            updated_at: new Date(),
          },
        }
      );
    }

    if (importedCustomers % 25 === 0) {
      console.log(
        `   ✓ Đã xử lý ${importedCustomers}/${limitedRows.length} khách hàng...`
      );
    }
  }

  console.log("\n🎉 HOÀN THÀNH!\n");
  console.log("━".repeat(50));
  console.log(`✅ Đã import: ${importedCustomers} khách hàng`);
  console.log(`✅ Đã tạo:   ${importedInvoices} hóa đơn mua hàng`);
  console.log("━".repeat(50));
  console.log("\n📊 Thống kê nhanh:");

  const totalRevenue = await db
    .collection("invoices")
    .aggregate([{ $group: { _id: null, total: { $sum: "$total_amount" } } }])
    .toArray();

  console.log(
    `   Tổng doanh thu fact: ${(totalRevenue[0]?.total || 0).toLocaleString("vi-VN")} VNĐ`
  );

  const topCustomer = await db
    .collection("customers")
    .find({ is_seeded: true })
    .sort({ total_spent: -1 })
    .limit(1)
    .toArray();

  if (topCustomer[0]) {
    console.log(
      `   Khách hàng VIP nhất: ${topCustomer[0].name} — ${topCustomer[0].total_spent.toLocaleString("vi-VN")} VNĐ`
    );
  }

  console.log("\n🚀 Bạn có thể mở CRM và kiểm tra dữ liệu ngay!\n");

  await client.close();
}

main().catch((err) => {
  console.error("❌ Lỗi:", err.message);
  process.exit(1);
});
