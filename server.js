const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

let database;
let writeQueue = Promise.resolve();

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error("File data.json tidak ditemukan.");
  }

  database = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  for (const key of ["products", "orders", "transactions", "inventoryLogs"]) {
    if (!Array.isArray(database[key])) {
      database[key] = [];
    }
  }
}

function saveData() {
  const snapshot = JSON.stringify(database, null, 2);

  writeQueue = writeQueue.then(async () => {
    const tempFile = DATA_FILE + ".tmp";
    await fs.promises.writeFile(tempFile, snapshot, "utf8");
    await fs.promises.rename(tempFile, DATA_FILE);
  });

  return writeQueue;
}

function error(res, message, status = 400) {
  return res.status(status).json({
    success: false,
    message
  });
}

function success(res, data, message = "Berhasil") {
  return res.json({
    success: true,
    message,
    data
  });
}

function generateId(prefix) {
  return prefix + "-" + Date.now() + "-" +
    Math.floor(Math.random() * 1000);
}

function rupiah(value) {
  return Number(value).toLocaleString("id-ID");
}

const ORDER_STATUSES = [
  "Menunggu Konfirmasi",
  "Diproses",
  "Disiapkan",
  "Dikirim",
  "Selesai"
];

function getProduct(id) {
  return database.products.find(p => p.id === id);
}

function getOrder(id) {
  return database.orders.find(o => o.id === id);
}

function addHistory(order, status, note) {
  order.status = status;
  order.history = order.history || [];

  order.history.push({
    status,
    date: new Date().toISOString(),
    note
  });
}

function validateProduct(body, id = null) {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const description = String(body.description || "").trim();
  const price = Number(body.price);
  const b2bPrice = Number(body.b2bPrice);
  const stock = Number(body.stock);
  const unit = String(body.unit || "pcs").trim();

  if (!name || name.length > 100) {
    return "Nama produk wajib diisi (maksimal 100 karakter).";
  }

  if (!category || category.length > 60) {
    return "Kategori produk wajib diisi.";
  }

  if (!Number.isFinite(price) || price <= 0) {
    return "Harga retail harus lebih besar dari 0.";
  }

  if (!Number.isFinite(b2bPrice) || b2bPrice <= 0 ||
      b2bPrice > price) {
    return "Harga B2B harus lebih dari 0 dan tidak melebihi harga retail.";
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return "Stok harus berupa bilangan bulat minimal 0.";
  }

  if (!unit || unit.length > 20) {
    return "Satuan produk tidak valid.";
  }

  if (description.length > 500) {
    return "Deskripsi maksimal 500 karakter.";
  }

  return null;
}

// Bootstrap
app.get("/api/bootstrap", (req, res) => {
  success(res, database);
});

// PRODUCTS
app.get("/api/products", (req, res) => {
  const { search, category, active } = req.query;

  let products = [...database.products];

  if (search) {
    const keyword = String(search).toLowerCase();

    products = products.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.category.toLowerCase().includes(keyword)
    );
  }

  if (category && category !== "Semua") {
    products = products.filter(p => p.category === category);
  }

  if (active === "true") {
    products = products.filter(p => p.active);
  }

  success(res, products);
});

app.post("/api/products", async (req, res) => {
  const validation = validateProduct(req.body);

  if (validation) return error(res, validation);

  const product = {
    id: generateId("PRD"),
    name: String(req.body.name).trim(),
    category: String(req.body.category).trim(),
    price: Number(req.body.price),
    b2bPrice: Number(req.body.b2bPrice),
    stock: Number(req.body.stock),
    unit: String(req.body.unit || "pcs").trim(),
    description: String(req.body.description || "").trim(),
    image: String(req.body.image || "📦").slice(0, 10),
    active: true,
    updatedAt: new Date().toISOString()
  };

  database.products.push(product);

  try {
    await saveData();
    success(res, product, "Produk berhasil ditambahkan.");
  } catch {
    error(res, "Gagal menyimpan produk.", 500);
  }
});

app.put("/api/products/:id", async (req, res) => {
  const product = getProduct(req.params.id);

  if (!product) return error(res, "Produk tidak ditemukan.", 404);

  const validation = validateProduct(req.body);

  if (validation) return error(res, validation);

  Object.assign(product, {
    name: String(req.body.name).trim(),
    category: String(req.body.category).trim(),
    price: Number(req.body.price),
    b2bPrice: Number(req.body.b2bPrice),
    stock: Number(req.body.stock),
    unit: String(req.body.unit || "pcs").trim(),
    description: String(req.body.description || "").trim(),
    image: String(req.body.image || product.image).slice(0, 10),
    updatedAt: new Date().toISOString()
  });

  try {
    await saveData();
    success(res, product, "Produk berhasil diperbarui.");
  } catch {
    error(res, "Gagal menyimpan perubahan.", 500);
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const product = getProduct(req.params.id);

  if (!product) return error(res, "Produk tidak ditemukan.", 404);

  const used = database.orders.some(order =>
    !["Selesai", "Ditolak"].includes(order.status) &&
    order.items.some(item => item.productId === product.id)
  );

  if (used) {
    return error(res, "Produk masih digunakan pada pesanan aktif.");
  }

  database.products = database.products.filter(
    p => p.id !== product.id
  );

  try {
    await saveData();
    success(res, null, "Produk berhasil dihapus.");
  } catch {
    error(res, "Gagal menghapus produk.", 500);
  }
});

// IMPORT PRODUCTS
app.post("/api/products/import", async (req, res) => {
  const rows = req.body.products;

  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
    return error(res, "Data impor harus berupa array berisi 1–500 produk.");
  }

  const errors = [];
  const prepared = [];

  rows.forEach((row, index) => {
    const validation = validateProduct(row);

    if (validation) {
      errors.push(`Baris ${index + 1}: ${validation}`);
      return;
    }

    prepared.push({
      id: generateId("PRD"),
      name: String(row.name).trim(),
      category: String(row.category).trim(),
      price: Number(row.price),
      b2bPrice: Number(row.b2bPrice),
      stock: Number(row.stock),
      unit: String(row.unit || "pcs"),
      description: String(row.description || ""),
      image: "📦",
      active: true,
      updatedAt: new Date().toISOString()
    });
  });

  if (errors.length) {
    return error(res, errors.join("\n"));
  }

  database.products.push(...prepared);

  try {
    await saveData();
    success(res, prepared, `${prepared.length} produk berhasil diimpor.`);
  } catch {
    error(res, "Gagal menyimpan data impor.", 500);
  }
});

// ORDERS
app.get("/api/orders", (req, res) => {
  let orders = [...database.orders];

  if (req.query.type) {
    orders = orders.filter(o => o.type === req.query.type);
  }

  if (req.query.status) {
    orders = orders.filter(o => o.status === req.query.status);
  }

  if (req.query.search) {
    const q = String(req.query.search).toLowerCase();

    orders = orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q)
    );
  }

  orders.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  success(res, orders);
});

app.post("/api/orders", async (req, res) => {
  const { type, customer, items } = req.body;

  if (!["B2B", "B2C"].includes(type)) {
    return error(res, "Jenis pesanan tidak valid.");
  }

  if (typeof customer !== "string" ||
      !customer.trim() || customer.trim().length > 100) {
    return error(res, "Nama pemesan wajib diisi.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    return error(res, "Pesanan harus memiliki minimal satu produk.");
  }

  const merged = new Map();

  for (const item of items) {
    const product = getProduct(item.productId);
    const quantity = Number(item.quantity);

    if (!product || !product.active) {
      return error(res, "Terdapat produk yang tidak tersedia.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 ||
        quantity > 10000) {
      return error(res, "Kuantitas produk tidak valid.");
    }

    merged.set(product.id,
      (merged.get(product.id) || 0) + quantity
    );
  }

  const orderItems = [];

  for (const [productId, quantity] of merged) {
    const product = getProduct(productId);

    if (product.stock < quantity) {
      return error(
        res,
        `Stok ${product.name} tidak mencukupi. Tersedia ${product.stock}.`
      );
    }

    const price = type === "B2B" ?
      product.b2bPrice : product.price;

    orderItems.push({
      productId: product.id,
      name: product.name,
      price,
      quantity
    });
  }

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  const shipping = type === "B2B" ?
    database.settings.shippingB2B :
    database.settings.shippingB2C;

  const order = {
    id: generateId("ORD"),
    type,
    customer: customer.trim(),
    role: type === "B2B" ? "retail" : "customer",
    items: orderItems,
    subtotal,
    shipping,
    total: subtotal + shipping,
    status: "Menunggu Konfirmasi",
    createdAt: new Date().toISOString(),
    history: [{
      status: "Menunggu Konfirmasi",
      date: new Date().toISOString(),
      note: "Pesanan berhasil dibuat dan menunggu pemeriksaan admin."
    }]
  };

  database.orders.push(order);

  try {
    await saveData();
    success(res, order, "Pesanan berhasil dibuat.");
  } catch {
    database.orders = database.orders.filter(o => o.id !== order.id);
    error(res, "Gagal menyimpan pesanan.", 500);
  }
});

app.put("/api/orders/:id/status", async (req, res) => {
  const order = getOrder(req.params.id);
  const { status, note } = req.body;

  if (!order) return error(res, "Pesanan tidak ditemukan.", 404);

  if (!ORDER_STATUSES.includes(status) && status !== "Ditolak") {
    return error(res, "Status pesanan tidak valid.");
  }

  if (["Selesai", "Ditolak"].includes(order.status)) {
    return error(res, "Pesanan sudah berstatus final.");
  }

  if (status === "Ditolak") {
    if (order.status !== "Menunggu Konfirmasi") {
      return error(res, "Pesanan yang sudah diproses tidak dapat ditolak.");
    }

    addHistory(order, status, note || "Pesanan ditolak oleh admin.");
  } else {
    const currentIndex = ORDER_STATUSES.indexOf(order.status);
    const nextIndex = ORDER_STATUSES.indexOf(status);

    if (nextIndex !== currentIndex + 1) {
      return error(
        res,
        "Tahapan status harus dilakukan secara berurutan."
      );
    }

    if (status === "Diproses") {
      for (const item of order.items) {
        const product = getProduct(item.productId);

        if (!product || product.stock < item.quantity) {
          return error(
            res,
            `Stok ${item.name} tidak mencukupi untuk konfirmasi.`
          );
        }
      }

      for (const item of order.items) {
        const product = getProduct(item.productId);
        const before = product.stock;

        product.stock -= item.quantity;

        database.inventoryLogs.push({
          id: generateId("INV"),
          productId: product.id,
          productName: product.name,
          type: "OUT",
          quantity: item.quantity,
          before,
          after: product.stock,
          note: `Konfirmasi ${order.id}`,
          date: new Date().toISOString()
        });
      }
    }

    addHistory(order, status, note ||
      `Status pesanan diperbarui menjadi ${status}.`
    );
  }

  if (status === "Selesai") {
    const exists = database.transactions.some(
      t => t.orderId === order.id
    );

    if (!exists) {
      database.transactions.push({
        id: generateId("TRX"),
        orderId: order.id,
        customer: order.customer,
        type: order.type,
        total: order.total,
        date: new Date().toISOString(),
        status: "Berhasil"
      });
    }
  }

  try {
    await saveData();
    success(res, order, "Status pesanan berhasil diperbarui.");
  } catch {
    error(res, "Gagal menyimpan perubahan status.", 500);
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  const order = getOrder(req.params.id);

  if (!order) return error(res, "Pesanan tidak ditemukan.", 404);

  if (!["Menunggu Konfirmasi", "Ditolak"].includes(order.status)) {
    return error(res, "Pesanan yang sudah diproses tidak dapat dihapus.");
  }

  database.orders = database.orders.filter(o => o.id !== order.id);

  try {
    await saveData();
    success(res, null, "Pesanan berhasil dihapus.");
  } catch {
    error(res, "Gagal menghapus pesanan.", 500);
  }
});

// INVENTORY
app.get("/api/inventory", (req, res) => {
  const products = database.products.map(product => ({
    ...product,
    stockStatus: product.stock === 0 ?
      "Habis" :
      product.stock <= 50 ? "Stok Rendah" : "Tersedia"
  }));

  success(res, {
    products,
    logs: database.inventoryLogs
  });
});

app.put("/api/inventory/:id", async (req, res) => {
  const product = getProduct(req.params.id);

  if (!product) return error(res, "Produk tidak ditemukan.", 404);

  const quantity = Number(req.body.quantity);
  const type = req.body.type;
  const note = String(req.body.note || "Penyesuaian persediaan");

  if (!Number.isInteger(quantity) || quantity <= 0 ||
      quantity > 1000000) {
    return error(res, "Jumlah stok tidak valid.");
  }

  if (!["IN", "OUT", "SET"].includes(type)) {
    return error(res, "Jenis perubahan stok tidak valid.");
  }

  if (type === "OUT" && product.stock < quantity) {
    return error(res, "Stok tidak mencukupi.");
  }

  const before = product.stock;

  if (type === "IN") product.stock += quantity;
  if (type === "OUT") product.stock -= quantity;
  if (type === "SET") product.stock = quantity;

  database.inventoryLogs.push({
    id: generateId("INV"),
    productId: product.id,
    productName: product.name,
    type,
    quantity,
    before,
    after: product.stock,
    note,
    date: new Date().toISOString()
  });

  product.updatedAt = new Date().toISOString();

  try {
    await saveData();
    success(res, product, "Persediaan berhasil diperbarui.");
  } catch {
    error(res, "Gagal menyimpan persediaan.", 500);
  }
});

// TRANSACTIONS
app.get("/api/transactions", (req, res) => {
  let transactions = [...database.transactions];

  if (req.query.type) {
    transactions = transactions.filter(t => t.type === req.query.type);
  }

  if (req.query.search) {
    const q = String(req.query.search).toLowerCase();

    transactions = transactions.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.orderId.toLowerCase().includes(q) ||
      t.customer.toLowerCase().includes(q)
    );
  }

  success(res, transactions.sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  ));
});

// CATEGORIES
app.get("/api/categories", (req, res) => {
  const categories = [...new Set(
    database.products.map(p => p.category)
  )];

  success(res, categories);
});

// FALLBACK API
app.use("/api", (req, res) => {
  error(res, "Endpoint API tidak ditemukan.", 404);
});

// SPA FALLBACK
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) return next(err);

  error(res, "Terjadi kesalahan pada server.", 500);
});

function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const list of Object.values(interfaces)) {
    for (const info of list || []) {
      if (info.family === "IPv4" && !info.internal) {
        addresses.push(info.address);
      }
    }
  }

  return addresses;
}

try {
  loadData();

  app.listen(PORT, HOST, () => {
    console.log("\n========================================");
    console.log("  PLATFORM DIGITAL DEL FOOD");
    console.log("========================================");
    console.log(`Localhost : http://localhost:${PORT}`);

    getNetworkAddresses().forEach(ip => {
      console.log(`Jaringan  : http://${ip}:${PORT}`);
    });

    console.log("========================================\n");
  });
} catch (err) {
  console.error("Gagal menjalankan server:", err.message);
  process.exit(1);
}