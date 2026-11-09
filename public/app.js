"use strict";

/* =========================================
   CONFIGURATION AND STATE
========================================= */

const API = "/api";

const state = {
  role: "admin",
  userNames: {
    admin: "Admin Del Food",
    retail: "Mitra Retail Medan",
    customer: "Customer Del Food"
  },
  data: {
    products: [],
    orders: [],
    transactions: [],
    inventoryLogs: [],
    settings: {}
  },
  cart: [],
  cartType: "B2C",
  compare: [],
  editingProduct: null,
  selectedOrder: null,
  lastCreatedOrder: null,
  mobileMenu: false,
  search: "",
  category: "Semua"
};

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const money = value =>
  "Rp " + Number(value || 0).toLocaleString("id-ID");

const dateFormat = value =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

const dateTime = value =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);

  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.value !== undefined) node.value = options.value;
  if (options.placeholder) node.placeholder = options.placeholder;
  if (options.name) node.name = options.name;
  if (options.href) node.href = options.href;
  if (options.title) node.title = options.title;
  if (options.disabled) node.disabled = true;
  if (options.required) node.required = true;
  if (options.min !== undefined) node.min = options.min;
  if (options.max !== undefined) node.max = options.max;
  if (options.step !== undefined) node.step = options.step;
  if (options.rows) node.rows = options.rows;

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      node.setAttribute(key, String(value));
    });
  }

  if (options.onClick) {
    node.addEventListener("click", options.onClick);
  }

  if (options.onInput) {
    node.addEventListener("input", options.onInput);
  }

  if (options.onChange) {
    node.addEventListener("change", options.onChange);
  }

  for (const child of children) {
    if (child === null || child === undefined) continue;

    node.append(
      typeof child === "string" || typeof child === "number"
        ? document.createTextNode(String(child))
        : child
    );
  }

  return node;
}

function button(label, action, variant = "primary", small = false) {
  return el("button", {
    className: `btn btn-${variant}${small ? " btn-small" : ""}`,
    type: "button",
    text: label,
    onClick: action
  });
}

function badge(status) {
  let color = "gray";

  if (["Selesai", "Berhasil", "Tersedia"].includes(status)) {
    color = "green";
  } else if (["Diproses", "Dikirim"].includes(status)) {
    color = "blue";
  } else if (["Disiapkan", "Menunggu Konfirmasi", "Stok Rendah"].includes(status)) {
    color = "yellow";
  } else if (["Ditolak", "Habis"].includes(status)) {
    color = "red";
  } else if (["B2B", "B2C"].includes(status)) {
    color = "purple";
  }

  return el("span", {
    className: `badge badge-${color}`,
    text: status
  });
}

function showToast(message, type = "success") {
  const toast = el("div", {
    className: `toast ${type}`,
    text: message
  });

  $("#toast-container").append(toast);

  setTimeout(() => toast.remove(), 3500);
}

function emptyState(title, description = "Belum ada data tersedia.") {
  return el("div", { className: "empty-state" }, [
    el("div", { className: "empty-icon", text: "📂" }),
    el("strong", { text: title }),
    el("p", { text: description })
  ]);
}

/* =========================================
   API HANDLER
========================================= */

async function api(endpoint, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (options.body !== undefined) {
    config.body = JSON.stringify(options.body);
  }

  let response;

  try {
    response = await fetch(API + endpoint, config);
  } catch {
    throw new Error("Tidak dapat terhubung ke server. Periksa koneksi.");
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Respons server tidak valid.");
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Terjadi kesalahan.");
  }

  return result.data;
}

async function refreshData() {
  state.data = await api("/bootstrap");
}

/* =========================================
   NAVIGATION
========================================= */

const NAVIGATION = {
  admin: [
    {
      label: "MENU UTAMA",
      items: [
        ["dashboard", "▦", "Dashboard"],
        ["katalog", "▤", "Katalog Produk"],
        ["produk", "▧", "Pengelolaan Produk"]
      ]
    },
    {
      label: "OPERASIONAL",
      items: [
        ["pemesanan", "🛒", "Pemesanan B2B"],
        ["pesanan", "⇄", "Pemeriksaan Pesanan"],
        ["persediaan", "▣", "Persediaan"]
      ]
    },
    {
      label: "LAPORAN",
      items: [
        ["transaksi", "▤", "Transaksi"],
        ["monitoring", "◷", "Pemantauan Pesanan"]
      ]
    }
  ],
  retail: [
    {
      label: "MENU UTAMA",
      items: [
        ["dashboard", "▦", "Dashboard"],
        ["katalog", "▤", "Katalog Produk"],
        ["pemesanan", "🛒", "Pemesanan B2B"],
        ["checkout", "▣", "Keranjang"]
      ]
    },
    {
      label: "AKTIVITAS",
      items: [
        ["monitoring", "◷", "Pesanan Saya"],
        ["persediaan", "▣", "Persediaan Retail"],
        ["transaksi", "▤", "Riwayat Transaksi"]
      ]
    }
  ],
  customer: [
    {
      label: "MENU UTAMA",
      items: [
        ["dashboard", "▦", "Dashboard"],
        ["katalog", "▤", "Katalog Produk"],
        ["checkout", "🛒", "Keranjang"]
      ]
    },
    {
      label: "AKTIVITAS",
      items: [
        ["monitoring", "◷", "Pesanan Saya"],
        ["transaksi", "▤", "Riwayat Transaksi"]
      ]
    }
  ]
};

const PAGE_TITLES = {
  dashboard: "Dashboard",
  katalog: "Katalog Produk",
  detail: "Detail Produk",
  produk: "Pengelolaan Produk",
  pemesanan: "Pemesanan B2B",
  pembelian: "Pemesanan B2C",
  checkout: "Keranjang & Checkout",
  sukses: "Pesanan Berhasil",
  pesanan: "Pemeriksaan Pesanan",
  monitoring: "Pemantauan Pesanan",
  persediaan: "Pengelolaan Persediaan",
  transaksi: "Riwayat Transaksi",
  perbandingan: "Perbandingan Produk"
};

function currentPage() {
  return location.hash.replace("#", "").split("/")[0] || "dashboard";
}

function navigate(page, parameter = "") {
  location.hash = parameter ? `${page}/${parameter}` : page;
}

function getRouteParameter() {
  return location.hash.split("/")[1] || "";
}

function createSidebar() {
  const sidebar = el("aside", {
    className: "sidebar" + (state.mobileMenu ? " open" : "")
  });

  sidebar.append(
    el("div", { className: "brand" }, [
      el("div", { className: "brand-logo", text: "DF" }),
      el("div", {}, [
        el("div", { className: "brand-name", text: "Del Food" }),
        el("span", {
          className: "brand-subtitle",
          text: "DIGITAL PLATFORM"
        })
      ])
    ])
  );

  for (const group of NAVIGATION[state.role]) {
    sidebar.append(
      el("div", { className: "nav-label", text: group.label })
    );

    for (const [route, icon, label] of group.items) {
      const link = el("a", {
        className: "nav-link" +
          (currentPage() === route ? " active" : ""),
        href: "#" + route
      }, [
        el("span", { className: "nav-icon", text: icon }),
        el("span", { text: label })
      ]);

      link.addEventListener("click", () => {
        state.mobileMenu = false;
      });

      sidebar.append(link);
    }
  }

  sidebar.append(
    el("div", { className: "sidebar-bottom" }, [
      el("div", { className: "help-card" }, [
        el("strong", { text: "Del Food Support" }),
        el("p", {
          text: "Platform terintegrasi untuk mendukung aktivitas penjualan dan pemenuhan pesanan."
        })
      ])
    ])
  );

  return sidebar;
}

function createTopbar() {
  const topbar = el("header", { className: "topbar" });

  const left = el("div", {
    className: "breadcrumb"
  }, [
    el("button", {
      className: "mobile-menu",
      type: "button",
      text: "☰",
      onClick: () => {
        state.mobileMenu = !state.mobileMenu;
        render();
      }
    }),
    "Del Food / ",
    el("strong", {
      text: PAGE_TITLES[currentPage()] || "Dashboard"
    })
  ]);

  const roleSelect = el("select", {
    className: "role-select",
    onChange: async event => {
      state.role = event.target.value;
      state.cart = [];
      state.compare = [];
      navigate("dashboard");
    }
  });

  [
    ["admin", "Admin / PT Del Food"],
    ["retail", "Mitra Retail"],
    ["customer", "Customer"]
  ].forEach(([value, label]) => {
    const option = el("option", {
      value,
      text: label
    });

    option.selected = state.role === value;
    roleSelect.append(option);
  });

  const right = el("div", { className: "topbar-right" }, [
    roleSelect,
    el("div", { className: "user-info" }, [
      el("div", { className: "avatar", text: "DF" }),
      el("div", {}, [
        el("div", {
          className: "user-name",
          text: state.userNames[state.role]
        }),
        el("div", {
          className: "user-role",
          text: state.role.toUpperCase()
        })
      ])
    ])
  ]);

  topbar.append(left, right);
  return topbar;
}

function renderLayout(content) {
  const shell = el("div", { className: "app-shell" });

  shell.append(
    createSidebar()
  );

  const main = el("main", { className: "main-area" });

  main.append(
    createTopbar(),
    el("section", {
      className: "content"
    }, [content])
  );

  shell.append(main);
  $("#app").replaceChildren(shell);
}

function heading(title, description, actions = []) {
  return el("div", { className: "page-heading" }, [
    el("div", {}, [
      el("h1", { text: title }),
      el("p", { text: description })
    ]),
    el("div", { className: "toolbar-right" }, actions)
  ]);
}

/* =========================================
   STAT CARDS
========================================= */

function statCard(label, value, icon, foot = "") {
  return el("div", { className: "stat-card" }, [
    el("div", { className: "stat-top" }, [
      el("span", { className: "stat-label", text: label }),
      el("div", { className: "stat-icon", text: icon })
    ]),
    el("div", { className: "stat-value", text: value }),
    el("div", { className: "stat-foot", text: foot })
  ]);
}

function getVisibleOrders() {
  return state.data.orders.filter(order => {
    if (state.role === "admin") return true;

    return order.role === state.role &&
      order.customer === state.userNames[state.role];
  });
}

/* =========================================
   CHART
========================================= */

function createChart() {
  const wrap = el("div", { className: "chart-wrap" });
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg", "svg"
  );

  svg.setAttribute("viewBox", "0 0 600 210");
  svg.setAttribute("preserveAspectRatio", "none");

  const defs = document.createElementNS(
    "http://www.w3.org/2000/svg", "defs"
  );

  const gradient = document.createElementNS(
    "http://www.w3.org/2000/svg", "linearGradient"
  );

  gradient.setAttribute("id", "chartGradient");
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "0");
  gradient.setAttribute("y2", "1");

  const stop1 = document.createElementNS(
    "http://www.w3.org/2000/svg", "stop"
  );
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "#8050c9");
  stop1.setAttribute("stop-opacity", ".2");

  const stop2 = document.createElementNS(
    "http://www.w3.org/2000/svg", "stop"
  );
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "#8050c9");
  stop2.setAttribute("stop-opacity", "0");

  gradient.append(stop1, stop2);
  defs.append(gradient);
  svg.append(defs);

  for (let i = 0; i < 4; i++) {
    const line = document.createElementNS(
      "http://www.w3.org/2000/svg", "line"
    );

    line.setAttribute("x1", "35");
    line.setAttribute("x2", "590");
    line.setAttribute("y1", String(20 + i * 50));
    line.setAttribute("y2", String(20 + i * 50));
    line.setAttribute("class", "chart-grid");

    svg.append(line);
  }

  const completed = state.data.transactions.filter(t =>
    t.status === "Berhasil"
  );

  const amounts = [
    15, 22, 18, 34, 29, 42, 37, 51, 45, 62, 57, 70
  ];

  if (completed.length) {
    amounts[11] += Math.min(completed.length * 2, 20);
  }

  const max = Math.max(...amounts);
  const points = amounts.map((value, index) => {
    const x = 35 + index * 50;
    const y = 180 - (value / max) * 145;
    return [x, y];
  });

  const linePath = points.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`
  ).join(" ");

  const areaPath = linePath +
    ` L ${points[points.length - 1][0]} 190 L ${points[0][0]} 190 Z`;

  const area = document.createElementNS(
    "http://www.w3.org/2000/svg", "path"
  );

  area.setAttribute("d", areaPath);
  area.setAttribute("class", "chart-area");

  const line = document.createElementNS(
    "http://www.w3.org/2000/svg", "path"
  );

  line.setAttribute("d", linePath);
  line.setAttribute("class", "chart-line");

  svg.append(area, line);

  ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
   "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ].forEach((month, index) => {
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg", "text"
    );

    label.setAttribute("x", String(35 + index * 50));
    label.setAttribute("y", "207");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-label");
    label.textContent = month;

    svg.append(label);
  });

  wrap.append(svg);
  return wrap;
}

/* =========================================
   DASHBOARD
========================================= */

function renderDashboard() {
  const page = el("div");

  const orders = getVisibleOrders();
  const products = state.data.products.filter(p => p.active);
  const transactions = state.role === "admin"
    ? state.data.transactions
    : state.data.transactions.filter(t =>
        orders.some(o => o.id === t.orderId)
      );

  const totalRevenue = transactions.reduce(
    (sum, t) => sum + t.total, 0
  );

  const pending = orders.filter(
    o => o.status === "Menunggu Konfirmasi"
  ).length;

  page.append(
    heading(
      "Dashboard",
      "Selamat datang di Platform Digital Del Food. Berikut ringkasan aktivitas platform."
    )
  );

  page.append(
    el("div", { className: "stats-grid" }, [
      statCard(
        "Total Produk Aktif",
        products.length,
        "▤",
        "Produk tersedia di katalog"
      ),
      statCard(
        state.role === "admin" ? "Total Pesanan" : "Pesanan Saya",
        orders.length,
        "🛒",
        `${pending} menunggu konfirmasi`
      ),
      statCard(
        "Transaksi Berhasil",
        transactions.length,
        "▣",
        "Transaksi yang telah selesai"
      ),
      statCard(
        "Total Nilai Transaksi",
        money(totalRevenue),
        "Rp",
        "Akumulasi transaksi berhasil"
      )
    ])
  );

  const chartCard = el("div", { className: "card" }, [
    el("div", { className: "card-header" }, [
      el("div", {}, [
        el("div", {
          className: "card-title",
          text: "Ringkasan Aktivitas Transaksi"
        }),
        el("div", {
          className: "card-subtitle",
          text: "Visualisasi tren aktivitas platform"
        })
      ]),
      badge("B2B")
    ]),
    createChart()
  ]);

  const quickCard = el("div", { className: "card" }, [
    el("div", { className: "card-header" }, [
      el("div", {}, [
        el("div", {
          className: "card-title",
          text: "Akses Cepat"
        }),
        el("div", {
          className: "card-subtitle",
          text: "Menu yang sering digunakan"
        })
      ])
    ])
  ]);

  const quickItems = state.role === "admin"
    ? [
        ["▤", "Kelola Produk", "produk"],
        ["🛒", "Periksa Pesanan", "pesanan"],
        ["▣", "Kelola Persediaan", "persediaan"],
        ["▥", "Lihat Transaksi", "transaksi"]
      ]
    : [
        ["▤", "Lihat Katalog", "katalog"],
        ["🛒", "Buat Pesanan", state.role === "retail" ? "pemesanan" : "pembelian"],
        ["◷", "Pantau Pesanan", "monitoring"],
        ["▥", "Riwayat Transaksi", "transaksi"]
      ];

  quickItems.forEach(([icon, label, route]) => {
    quickCard.append(
      el("div", {
        className: "cart-item",
        attrs: { role: "button", tabindex: "0" },
        onClick: () => navigate(route)
      }, [
        el("div", { className: "stat-icon", text: icon }),
        el("div", { className: "cart-item-info" }, [
          el("strong", { text: label }),
          el("small", { text: "Buka halaman" })
        ]),
        el("span", { text: "→" })
      ])
    );
  });

  page.append(
    el("div", { className: "grid-2" }, [
      chartCard,
      quickCard
    ])
  );

  const recentCard = el("div", { className: "card section-gap" }, [
    el("div", { className: "card-header" }, [
      el("div", {}, [
        el("div", {
          className: "card-title",
          text: "Pesanan Terbaru"
        }),
        el("div", {
          className: "card-subtitle",
          text: "Daftar aktivitas pemesanan terkini"
        })
      ]),
      button("Lihat Semua →", () => navigate("monitoring"), "outline", true)
    ])
  ]);

  const recent = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (!recent.length) {
    recentCard.append(emptyState("Belum ada pesanan."));
  } else {
    recentCard.append(
      createTable(
        ["Nomor Pesanan", "Pemesan", "Jenis", "Tanggal", "Total", "Status"],
        recent.map(o => [
          o.id,
          o.customer,
          badge(o.type),
          dateFormat(o.createdAt),
          money(o.total),
          badge(o.status)
        ])
      )
    );
  }

  page.append(recentCard);

  const lowStock = products.filter(p => p.stock <= 50);

  const stockCard = el("div", { className: "card section-gap" }, [
    el("div", { className: "card-header" }, [
      el("div", {}, [
        el("div", {
          className: "card-title",
          text: "Perhatian Persediaan"
        }),
        el("div", {
          className: "card-subtitle",
          text: "Produk yang perlu diperhatikan"
        })
      ]),
      badge("Stok Rendah")
    ])
  ]);

  if (!lowStock.length) {
    stockCard.append(
      el("div", { className: "notice" }, [
        "Seluruh produk aktif memiliki stok di atas batas minimum."
      ])
    );
  } else {
    stockCard.append(
      createTable(
        ["Produk", "Kategori", "Stok", "Satuan", "Status"],
        lowStock.map(p => [
          p.name,
          p.category,
          p.stock,
          p.unit,
          badge(p.stock === 0 ? "Habis" : "Stok Rendah")
        ])
      )
    );
  }

  page.append(stockCard);
  return page;
}

/* =========================================
   TABLE BUILDER
========================================= */

function createTable(headers, rows) {
  const wrap = el("div", { className: "table-wrap" });
  const table = el("table");
  const thead = el("thead");
  const headerRow = el("tr");

  headers.forEach(header => {
    headerRow.append(el("th", { text: header }));
  });

  thead.append(headerRow);

  const tbody = el("tbody");

  rows.forEach(row => {
    const tr = el("tr");

    row.forEach(cell => {
      const td = el("td");

      if (cell instanceof Node) {
        td.append(cell);
      } else {
        td.textContent = String(cell ?? "-");
      }

      tr.append(td);
    });

    tbody.append(tr);
  });

  table.append(thead, tbody);
  wrap.append(table);

  return wrap;
}

/* =========================================
   PRODUCT CATALOG
========================================= */

function getProductPrice(product) {
  return state.role === "retail" ?
    product.b2bPrice : product.price;
}

function productCard(product, mode = "catalog") {
  const price = getProductPrice(product);

  const visual = el("div", {
    className: "product-visual"
  }, [
    el("span", { text: product.image || "📦" })
  ]);

  if (product.stock <= 50) {
    visual.append(badge(product.stock === 0 ? "Habis" : "Stok Rendah"));
  }

  const info = el("div", { className: "product-info" }, [
    el("div", {
      className: "product-category",
      text: product.category
    }),
    el("div", {
      className: "product-name",
      text: product.name
    }),
    el("div", {
      className: "product-price",
      text: money(price)
    }),
    el("div", {
      className: "product-meta",
      text: `Stok tersedia: ${product.stock} ${product.unit}`
    })
  ]);

  const actions = el("div", { className: "product-actions" });

  actions.append(
    button("Detail", () => navigate("detail", product.id), "outline", true)
  );

  if (mode === "catalog") {
    actions.append(
      button(
        "Bandingkan",
        () => toggleCompare(product.id),
        state.compare.includes(product.id) ? "purple" : "outline",
        true
      )
    );
  }

  if (mode === "order") {
    actions.append(
      button(
        "Tambah",
        () => addToCart(product.id),
        "primary",
        true
      )
    );
  }

  info.append(actions);

  return el("div", { className: "product-card" }, [
    visual,
    info
  ]);
}

function toggleCompare(id) {
  if (state.compare.includes(id)) {
    state.compare = state.compare.filter(x => x !== id);
  } else {
    if (state.compare.length >= 3) {
      showToast("Maksimal membandingkan 3 produk.", "error");
      return;
    }

    state.compare.push(id);
  }

  render();
}

function renderCatalog(orderMode = false) {
  const page = el("div");

  page.append(
    heading(
      orderMode ? "Pemesanan Produk B2B" : "Katalog Produk",
      orderMode
        ? "Pilih produk dan lakukan pemesanan dari PT Del Food."
        : "Temukan produk, lihat informasi, dan bandingkan produk."
    )
  );

  const toolbar = el("div", { className: "toolbar" });

  const search = el("input", {
    className: "form-control search-box",
    placeholder: "Cari nama atau kategori produk...",
    value: state.search,
    onInput: event => {
      state.search = event.target.value;
      updateProductGrid();
    }
  });

  const categorySelect = el("select", {
    className: "form-control",
    value: state.category,
    onChange: event => {
      state.category = event.target.value;
      updateProductGrid();
    }
  });

  const categories = ["Semua", ...new Set(
    state.data.products.map(p => p.category)
  )];

  categories.forEach(category => {
    categorySelect.append(
      el("option", {
        value: category,
        text: category
      })
    );
  });

  const toolbarLeft = el("div", {
    className: "toolbar-left"
  }, [search, categorySelect]);

  const toolbarRight = el("div", {
    className: "toolbar-right"
  });

  if (state.compare.length) {
    toolbarRight.append(
      button(
        `Bandingkan (${state.compare.length})`,
        () => navigate("perbandingan"),
        "purple"
      )
    );
  }

  if (orderMode) {
    toolbarRight.append(
      button(
        `Keranjang (${state.cart.length})`,
        () => navigate("checkout"),
        "primary"
      )
    );
  }

  toolbar.append(toolbarLeft, toolbarRight);
  page.append(toolbar);

  const grid = el("div", { className: "product-grid" });
  grid.id = "product-grid";

  function updateProductGrid() {
    const keyword = state.search.toLowerCase();

    const products = state.data.products.filter(p =>
      p.active &&
      (state.category === "Semua" || p.category === state.category) &&
      (
        p.name.toLowerCase().includes(keyword) ||
        p.category.toLowerCase().includes(keyword)
      )
    );

    grid.replaceChildren();

    if (!products.length) {
      grid.append(emptyState("Produk tidak ditemukan."));
      return;
    }

    products.forEach(product => {
      grid.append(productCard(
        product,
        orderMode ? "order" : "catalog"
      ));
    });
  }

  updateProductGrid();
  page.append(grid);

  return page;
}

/* =========================================
   PRODUCT DETAIL
========================================= */

function renderProductDetail() {
  const page = el("div");
  const product = state.data.products.find(
    p => p.id === getRouteParameter()
  );

  if (!product) {
    page.append(emptyState("Produk tidak ditemukan."));
    return page;
  }

  page.append(
    heading("Detail Produk", "Informasi lengkap produk Del Food.", [
      button("← Kembali ke Katalog", () => navigate("katalog"), "outline")
    ])
  );

  page.append(
    el("div", { className: "grid-2" }, [
      el("div", { className: "card" }, [
        el("div", {
          className: "product-visual",
          text: product.image,
          attrs: { style: "height:300px;font-size:100px;border-radius:8px" }
        }),
        el("div", { className: "card-header section-gap" }, [
          el("div", {
            className: "card-title",
            text: "Informasi Produk"
          }),
          badge(product.active ? "Tersedia" : "Tidak Aktif")
        ]),
        el("p", {
          text: product.description || "Tidak ada deskripsi produk.",
          attrs: { style: "line-height:1.8;color:#8791a2" }
        })
      ]),
      el("div", { className: "card" }, [
        el("div", {
          className: "card-subtitle",
          text: product.category
        }),
        el("h2", {
          text: product.name,
          attrs: { style: "font-size:22px;color:#102e50;margin:10px 0" }
        }),
        el("div", {
          className: "product-price",
          text: money(getProductPrice(product))
        }),
        el("div", {
          className: "notice section-gap",
          text: `Stok tersedia: ${product.stock} ${product.unit}`
        }),
        el("div", { className: "summary-row" }, [
          "Harga Customer",
          money(product.price)
        ]),
        el("div", { className: "summary-row" }, [
          "Harga Mitra Retail",
          money(product.b2bPrice)
        ]),
        el("div", { className: "summary-row" }, [
          "Satuan",
          product.unit
        ]),
        el("div", { className: "section-gap" }, [
          button(
            "Tambah ke Keranjang",
            () => addToCart(product.id),
            "primary"
          )
        ])
      ])
    ])
  );

  return page;
}

/* =========================================
   COMPARE PRODUCTS
========================================= */

function renderComparison() {
  const page = el("div");

  page.append(
    heading("Perbandingan Produk",
      "Bandingkan spesifikasi dan harga beberapa produk."
    )
  );

  const products = state.compare.map(id =>
    state.data.products.find(p => p.id === id)
  ).filter(Boolean);

  if (!products.length) {
    page.append(emptyState(
      "Belum ada produk untuk dibandingkan.",
      "Tambahkan produk melalui katalog."
    ));
    return page;
  }

  const rows = [
    ["Nama Produk", ...products.map(p => p.name)],
    ["Kategori", ...products.map(p => p.category)],
    ["Harga Customer", ...products.map(p => money(p.price))],
    ["Harga Retail", ...products.map(p => money(p.b2bPrice))],
    ["Stok", ...products.map(p => `${p.stock} ${p.unit}`)],
    ["Deskripsi", ...products.map(p => p.description)],
    ["Ketersediaan", ...products.map(p => p.stock > 0 ? "Tersedia" : "Habis")]
  ];

  const table = el("table");
  const tbody = el("tbody");

  rows.forEach(row => {
    const tr = el("tr");

    row.forEach((value, index) => {
      tr.append(el(index === 0 ? "th" : "td", {
        text: value
      }));
    });

    tbody.append(tr);
  });

  table.append(tbody);

  const wrap = el("div", { className: "table-wrap" });
  wrap.append(table);

  page.append(el("div", { className: "card" }, [
    wrap,
    el("div", { className: "toolbar section-gap" }, [
      button("Kembali ke Katalog", () => navigate("katalog"), "outline"),
      button("Kosongkan Perbandingan", () => {
        state.compare = [];
        render();
      }, "danger")
    ])
  ]));

  return page;
}

/* =========================================
   CART
========================================= */

function addToCart(productId) {
  const product = state.data.products.find(p => p.id === productId);

  if (!product || product.stock <= 0) {
    showToast("Produk tidak tersedia.", "error");
    return;
  }

  const existing = state.cart.find(i => i.productId === productId);

  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast("Kuantitas melebihi stok tersedia.", "error");
      return;
    }

    existing.quantity++;
  } else {
    state.cart.push({
      productId,
      quantity: 1
    });
  }

  state.cartType = state.role === "retail" ? "B2B" : "B2C";

  showToast(`${product.name} ditambahkan ke keranjang.`);
  navigate("checkout");
}

function cartTotals() {
  const items = state.cart.map(item => {
    const product = state.data.products.find(
      p => p.id === item.productId
    );

    return {
      ...item,
      product,
      price: product ? getProductPrice(product) : 0
    };
  }).filter(item => item.product);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  const shipping = state.cartType === "B2B"
    ? state.data.settings.shippingB2B
    : state.data.settings.shippingB2C;

  return {
    items,
    subtotal,
    shipping,
    total: subtotal + shipping
  };
}

function updateCart(productId, change) {
  const item = state.cart.find(i => i.productId === productId);
  const product = state.data.products.find(p => p.id === productId);

  if (!item || !product) return;

  const next = item.quantity + change;

  if (next <= 0) {
    state.cart = state.cart.filter(i => i.productId !== productId);
  } else if (next > product.stock) {
    showToast("Jumlah melebihi stok yang tersedia.", "error");
    return;
  } else {
    item.quantity = next;
  }

  render();
}

function renderCheckout() {
  const page = el("div");

  page.append(
    heading(
      "Keranjang & Checkout",
      "Periksa kembali produk sebelum menyelesaikan pemesanan."
    )
  );

  if (!state.cart.length) {
    page.append(
      el("div", { className: "card" }, [
        emptyState("Keranjang masih kosong.",
          "Silakan pilih produk dari katalog terlebih dahulu."),
        button("Lihat Katalog", () => navigate("katalog"), "primary")
      ])
    );

    return page;
  }

  const totals = cartTotals();

  const cartCard = el("div", { className: "card" }, [
    el("div", { className: "card-header" }, [
      el("div", {}, [
        el("div", {
          className: "card-title",
          text: "Daftar Produk"
        }),
        el("div", {
          className: "card-subtitle",
          text: `${totals.items.length} jenis produk`
        })
      ]),
      badge(state.cartType)
    ])
  ]);

  totals.items.forEach(item => {
    const row = el("div", { className: "cart-item" }, [
      el("div", {
        className: "cart-emoji",
        text: item.product.image
      }),
      el("div", { className: "cart-item-info" }, [
        el("strong", { text: item.product.name }),
        el("small", {
          text: `${money(item.price)} / ${item.product.unit}`
        })
      ]),
      el("div", { className: "qty-control" }, [
        el("button", {
          text: "−",
          onClick: () => updateCart(item.productId, -1)
        }),
        el("strong", { text: item.quantity }),
        el("button", {
          text: "+",
          onClick: () => updateCart(item.productId, 1)
        })
      ]),
      el("strong", {
        text: money(item.price * item.quantity)
      })
    ]);

    cartCard.append(row);
  });

  const summary = el("div", { className: "card" }, [
    el("div", {
      className: "card-title",
      text: "Ringkasan Pesanan"
    })
  ]);

  [
    ["Subtotal", money(totals.subtotal)],
    ["Biaya Pengiriman", money(totals.shipping)],
    ["Jenis Pesanan", state.cartType]
  ].forEach(([label, value]) => {
    summary.append(
      el("div", { className: "summary-row" }, [
        label,
        value
      ])
    );
  });

  summary.append(
    el("div", { className: "summary-row total" }, [
      "Total Pembayaran",
      money(totals.total)
    ])
  );

  const form = el("form", { className: "section-gap" });

  const nameInput = el("input", {
    className: "form-control",
    name: "customer",
    value: state.userNames[state.role],
    placeholder: "Nama pemesan",
    required: true
  });

  form.append(
    el("div", { className: "form-group" }, [
      el("label", { text: "Nama Pemesan" }),
      nameInput
    ]),
    el("div", { className: "notice" }, [
      state.cartType === "B2B"
        ? "Pemesanan B2B: pesanan akan diteruskan kepada PT Del Food untuk diperiksa dan dikonfirmasi."
        : "Pemesanan B2C: pesanan akan diteruskan kepada pengelola untuk diproses."
    ])
  );

  form.append(
    el("button", {
      className: "btn btn-primary",
      type: "submit",
      text: "Buat Pesanan"
    })
  );

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const submit = $("button[type=submit]", form);
    submit.disabled = true;

    try {
      const result = await api("/orders", {
        method: "POST",
        body: {
          type: state.cartType,
          customer: nameInput.value,
          items: state.cart
        }
      });

      state.cart = [];
      state.lastCreatedOrder = result;

      await refreshData();
      navigate("sukses");
    } catch (err) {
      showToast(err.message, "error");
      submit.disabled = false;
    }
  });

  summary.append(form);

  page.append(
    el("div", { className: "cart-layout" }, [
      cartCard,
      summary
    ])
  );

  return page;
}

/* =========================================
   SUCCESS PAGE
========================================= */

function renderSuccess() {
  const order = state.lastCreatedOrder;

  const page = el("div");

  const panel = el("div", { className: "success-panel" }, [
    el("div", { className: "success-icon", text: "✓" }),
    el("h2", { text: "Pesanan Berhasil Dibuat!" }),
    el("p", {
      text: "Pesanan Anda telah diterima oleh Platform Digital Del Food dan sedang menunggu konfirmasi."
    })
  ]);

  if (order) {
    panel.append(
      el("div", {
        className: "notice section-gap"
      }, [
        el("strong", { text: order.id }),
        el("p", { text: `Total pesanan: ${money(order.total)}` }),
        el("p", { text: `Jenis pesanan: ${order.type}` })
      ])
    );
  }

  panel.append(
    el("div", { className: "toolbar section-gap" }, [
      button("Kembali ke Dashboard", () => navigate("dashboard"), "outline"),
      button("Pantau Pesanan", () => navigate("monitoring"), "primary")
    ])
  );

  page.append(panel);
  return page;
}

/* =========================================
   ORDER MANAGEMENT
========================================= */

function renderOrderManagement() {
  const page = el("div");

  page.append(
    heading(
      "Pemeriksaan Pesanan",
      "Periksa, konfirmasi, atau tolak pesanan yang diterima."
    )
  );

  const orders = state.data.orders.filter(
    o => o.status === "Menunggu Konfirmasi"
  );

  page.append(
    el("div", { className: "stats-grid" }, [
      statCard("Menunggu Konfirmasi", orders.length, "◷"),
      statCard(
        "Pesanan B2B",
        orders.filter(o => o.type === "B2B").length,
        "▣"
      ),
      statCard(
        "Pesanan B2C",
        orders.filter(o => o.type === "B2C").length,
        "🛒"
      ),
      statCard(
        "Total Nilai Pending",
        money(orders.reduce((s, o) => s + o.total, 0)),
        "Rp"
      )
    ])
  );

  const card = el("div", { className: "card section-gap" }, [
    el("div", { className: "card-header" }, [
      el("div", {}, [
        el("div", {
          className: "card-title",
          text: "Daftar Pesanan Masuk"
        }),
        el("div", {
          className: "card-subtitle",
          text: "Pesanan yang memerlukan pemeriksaan"
        })
      ])
    ])
  ]);

  if (!orders.length) {
    card.append(emptyState("Tidak ada pesanan yang menunggu konfirmasi."));
  } else {
    card.append(
      createTable(
        ["Nomor", "Pemesan", "Jenis", "Tanggal", "Total", "Aksi"],
        orders.map(o => {
          const actions = el("div", { className: "table-actions" }, [
            button("Periksa", () => showOrderModal(o.id), "outline", true)
          ]);

          return [
            o.id,
            o.customer,
            badge(o.type),
            dateFormat(o.createdAt),
            money(o.total),
            actions
          ];
        })
      )
    );
  }

  page.append(card);
  return page;
}

/* =========================================
   ORDER MODAL
========================================= */

function openModal(title, body, actions = []) {
  const backdrop = el("div", { className: "modal-backdrop" });

  const modal = el("div", {
    className: "modal",
    attrs: { role: "dialog", "aria-modal": "true" }
  });

  const close = () => backdrop.remove();

  modal.append(
    el("div", { className: "modal-header" }, [
      el("strong", { text: title }),
      el("button", {
        className: "modal-close",
        text: "×",
        onClick: close
      })
    ]),
    el("div", { className: "modal-body" }, [body]),
    el("div", { className: "modal-footer" }, [
      button("Tutup", close, "outline"),
      ...actions.map(action => {
        const btn = button(
          action.label,
          async () => {
            await action.run(close);
          },
          action.variant || "primary"
        );

        return btn;
      })
    ])
  );

  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) close();
  });

  backdrop.append(modal);
  document.body.append(backdrop);
}

function showOrderModal(orderId) {
  const order = state.data.orders.find(o => o.id === orderId);
  if (!order) return;

  const body = el("div");

  [
    ["Nomor Pesanan", order.id],
    ["Nama Pemesan", order.customer],
    ["Jenis Pesanan", order.type],
    ["Tanggal", dateTime(order.createdAt)],
    ["Status", order.status]
  ].forEach(([label, value]) => {
    body.append(
      el("div", { className: "summary-row" }, [label, value])
    );
  });

  body.append(
    el("div", { className: "card-title section-gap", text: "Rincian Produk" })
  );

  body.append(
    createTable(
      ["Produk", "Harga", "Qty", "Subtotal"],
      order.items.map(item => [
        item.name,
        money(item.price),
        item.quantity,
        money(item.price * item.quantity)
      ])
    )
  );

  body.append(
    el("div", { className: "summary-row total" }, [
      "Total",
      money(order.total)
    ])
  );

  openModal(
    "Detail Pesanan",
    body,
    [
      {
        label: "Tolak Pesanan",
        variant: "danger",
        run: async close => {
          if (!confirm("Yakin ingin menolak pesanan ini?")) return;

          try {
            await api(`/orders/${order.id}/status`, {
              method: "PUT",
              body: {
                status: "Ditolak",
                note: "Pesanan ditolak oleh admin."
              }
            });

            close();
            await refreshData();
            render();
            showToast("Pesanan berhasil ditolak.");
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      },
      {
        label: "Konfirmasi Pesanan",
        variant: "primary",
        run: async close => {
          try {
            await api(`/orders/${order.id}/status`, {
              method: "PUT",
              body: { status: "Diproses" }
            });

            close();
            await refreshData();
            render();
            showToast("Pesanan dikonfirmasi. Stok telah diperbarui.");
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      }
    ]
  );
}

/* =========================================
   ORDER MONITORING
========================================= */

function renderMonitoring() {
  const page = el("div");

  page.append(
    heading(
      "Pemantauan Pesanan",
      "Pantau perkembangan pemenuhan pesanan dan riwayat status."
    )
  );

  const orders = getVisibleOrders();

  const search = el("input", {
    className: "form-control search-box",
    placeholder: "Cari nomor pesanan atau nama pemesan...",
    onInput: event => {
      const q = event.target.value.toLowerCase();

      rows.replaceChildren();

      const filtered = orders.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q)
      );

      filtered.forEach(o => rows.append(createOrderMonitoringCard(o)));

      if (!filtered.length) {
        rows.append(emptyState("Pesanan tidak ditemukan."));
      }
    }
  });

  const toolbar = el("div", {
    className: "toolbar"
  }, [search]);

  const rows = el("div", { className: "stack" });

  orders.forEach(o => rows.append(createOrderMonitoringCard(o)));

  if (!orders.length) {
    rows.append(emptyState("Belum ada pesanan."));
  }

  page.append(toolbar, rows);
  return page;
}

function createOrderMonitoringCard(order) {
  const card = el("div", { className: "card" });

  card.append(
    el("div", { className: "card-header" }, [
      el("div", {}, [
        el("div", {
          className: "card-title",
          text: order.id
        }),
        el("div", {
          className: "card-subtitle",
          text: `${order.customer} • ${dateTime(order.createdAt)}`
        })
      ]),
      badge(order.status)
    ])
  );

  card.append(
    el("div", { className: "summary-row" }, [
      `Jenis: ${order.type}`,
      `Total: ${money(order.total)}`
    ])
  );

  const timeline = el("div", { className: "timeline" });

  const statuses = [
    "Menunggu Konfirmasi",
    "Diproses",
    "Disiapkan",
    "Dikirim",
    "Selesai"
  ];

  statuses.forEach(status => {
    const history = (order.history || []).find(
      h => h.status === status
    );

    timeline.append(
      el("div", {
        className: "timeline-item" + (history ? " done" : "")
      }, [
        el("div", { className: "timeline-dot" }),
        el("strong", { text: status }),
        el("p", {
          text: history
            ? `${dateTime(history.date)} — ${history.note}`
            : "Menunggu tahapan sebelumnya selesai."
        })
      ])
    );
  });

  if (order.status === "Ditolak") {
    timeline.append(
      el("div", { className: "notice error" }, [
        "Pesanan ini telah ditolak."
      ])
    );
  }

  card.append(timeline);

  if (state.role === "admin" &&
      !["Selesai", "Ditolak"].includes(order.status)) {
    const next = {
      "Menunggu Konfirmasi": "Diproses",
      "Diproses": "Disiapkan",
      "Disiapkan": "Dikirim",
      "Dikirim": "Selesai"
    }[order.status];

    if (next) {
      card.append(
        button(
          `Lanjutkan ke ${next}`,
          () => updateOrderStatus(order.id, next),
          "primary"
        )
      );
    }
  }

  return card;
}

async function updateOrderStatus(orderId, status) {
  if (!confirm(`Ubah status pesanan menjadi ${status}?`)) return;

  try {
    await api(`/orders/${orderId}/status`, {
      method: "PUT",
      body: { status }
    });

    await refreshData();
    render();

    showToast(`Status berhasil diubah menjadi ${status}.`);
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* =========================================
   PRODUCT MANAGEMENT
========================================= */

function renderProductManagement() {
  const page = el("div");

  page.append(
    heading(
      "Pengelolaan Data Produk",
      "Kelola katalog, harga, kategori, dan informasi produk.",
      [
        button("＋ Tambah Produk", () => showProductForm(), "primary"),
        button("Impor Produk", () => showImportForm(), "outline")
      ]
    )
  );

  const search = el("input", {
    className: "form-control search-box",
    placeholder: "Cari produk...",
    onInput: event => {
      const q = event.target.value.toLowerCase();

      updateRows(state.data.products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      ));
    }
  });

  const tableCard = el("div", { className: "card" }, [
    el("div", { className: "toolbar" }, [search])
  ]);

  const rows = el("div");
  tableCard.append(rows);

  function updateRows(products) {
    rows.replaceChildren();

    if (!products.length) {
      rows.append(emptyState("Produk tidak ditemukan."));
      return;
    }

    rows.append(
      createTable(
        ["Produk", "Kategori", "Harga Retail", "Harga B2B", "Stok", "Status", "Aksi"],
        products.map(p => [
          p.name,
          p.category,
          money(p.price),
          money(p.b2bPrice),
          `${p.stock} ${p.unit}`,
          badge(p.active ? "Tersedia" : "Tidak Aktif"),
          el("div", { className: "table-actions" }, [
            button("Edit", () => showProductForm(p), "outline", true),
            button("Hapus", () => deleteProduct(p.id), "danger", true)
          ])
        ])
      )
    );
  }

  updateRows(state.data.products);
  page.append(tableCard);

  return page;
}

function showProductForm(product = null) {
  const isEdit = Boolean(product);

  const body = el("form", { className: "form-grid" });

  function field(label, name, value, type = "text", required = true) {
    const input = el("input", {
      className: "form-control",
      name,
      value: value ?? "",
      type,
      required,
      min: type === "number" ? "0" : undefined
    });

    const group = el("div", { className: "form-group" }, [
      el("label", { text: label }),
      input
    ]);

    return group;
  }

  const name = field("Nama Produk", "name", product?.name);
  const category = field("Kategori", "category", product?.category);
  const price = field("Harga Retail (Rp)", "price", product?.price, "number");
  const b2b = field("Harga B2B (Rp)", "b2bPrice", product?.b2bPrice, "number");
  const stock = field("Stok", "stock", product?.stock ?? 0, "number");
  const unit = field("Satuan", "unit", product?.unit || "pcs");
  const image = field("Emoji Produk", "image", product?.image || "📦");
  const description = el("textarea", {
    className: "form-control",
    name: "description",
    value: product?.description || "",
    rows: 3
  });

  const descriptionGroup = el("div", {
    className: "form-group full"
  }, [
    el("label", { text: "Deskripsi" }),
    description
  ]);

  [name, category, price, b2b, stock, unit, image,
   descriptionGroup].forEach(item => body.append(item));

  const modalBackdrop = el("div", { className: "modal-backdrop" });
  const modal = el("div", { className: "modal" });

  const close = () => modalBackdrop.remove();

  modal.append(
    el("div", { className: "modal-header" }, [
      el("strong", {
        text: isEdit ? "Edit Produk" : "Tambah Produk"
      }),
      el("button", {
        className: "modal-close",
        text: "×",
        onClick: close
      })
    ]),
    el("div", { className: "modal-body" }, [body]),
    el("div", { className: "modal-footer" }, [
      button("Batal", close, "outline"),
      button(isEdit ? "Simpan Perubahan" : "Simpan Produk",
        () => body.requestSubmit(), "primary")
    ])
  );

  body.addEventListener("submit", async event => {
    event.preventDefault();

    const values = Object.fromEntries(new FormData(body).entries());

    values.price = Number(values.price);
    values.b2bPrice = Number(values.b2bPrice);
    values.stock = Number(values.stock);

    try {
      await api(
        isEdit ? `/products/${product.id}` : "/products",
        {
          method: isEdit ? "PUT" : "POST",
          body: values
        }
      );

      close();
      await refreshData();
      render();
      showToast("Data produk berhasil disimpan.");
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  modalBackdrop.append(modal);
  document.body.append(modalBackdrop);
}

async function deleteProduct(id) {
  if (!confirm("Yakin ingin menghapus produk ini?")) return;

  try {
    await api(`/products/${id}`, { method: "DELETE" });
    await refreshData();
    render();
    showToast("Produk berhasil dihapus.");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function showImportForm() {
  const body = el("div");

  const help = el("div", {
    className: "notice"
  }, [
    "Masukkan data produk dalam format JSON array. Setiap produk harus memiliki name, category, price, b2bPrice, stock, unit, dan description."
  ]);

  const sample = [
    {
      name: "Produk Baru",
      category: "Snack",
      price: 10000,
      b2bPrice: 8500,
      stock: 100,
      unit: "pcs",
      description: "Deskripsi produk"
    }
  ];

  const textarea = el("textarea", {
    className: "form-control",
    rows: 12,
    value: JSON.stringify(sample, null, 2)
  });

  body.append(help, textarea);

  openModal("Impor Data Produk", body, [
    {
      label: "Impor",
      run: async close => {
        let products;

        try {
          products = JSON.parse(textarea.value);
        } catch {
          showToast("Format JSON tidak valid.", "error");
          return;
        }

        try {
          await api("/products/import", {
            method: "POST",
            body: { products }
          });

          close();
          await refreshData();
          render();
          showToast("Data produk berhasil diimpor.");
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    }
  ]);
}

/* =========================================
   INVENTORY
========================================= */

function renderInventory() {
  const page = el("div");

  page.append(
    heading(
      "Pengelolaan Persediaan",
      "Pantau dan perbarui ketersediaan stok produk."
    )
  );

  const products = state.data.products;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 50);
  const empty = products.filter(p => p.stock === 0);

  page.append(
    el("div", { className: "inventory-summary" }, [
      statCard("Total Unit Stok", totalStock.toLocaleString("id-ID"), "▣"),
      statCard("Stok Rendah", lowStock.length, "⚠"),
      statCard("Stok Habis", empty.length, "×")
    ])
  );

  const search = el("input", {
    className: "form-control search-box",
    placeholder: "Cari nama produk...",
    onInput: event => {
      const q = event.target.value.toLowerCase();

      updateTable(products.filter(p =>
        p.name.toLowerCase().includes(q)
      ));
    }
  });

  const card = el("div", { className: "card" }, [
    el("div", { className: "card-header" }, [
      el("div", {}, [
        el("div", {
          className: "card-title",
          text: "Daftar Persediaan Produk"
        }),
        el("div", {
          className: "card-subtitle",
          text: "Informasi stok aktual"
        })
      ])
    ]),
    el("div", { className: "toolbar" }, [search])
  ]);

  const tableArea = el("div");
  card.append(tableArea);

  function updateTable(list) {
    tableArea.replaceChildren();

    if (!list.length) {
      tableArea.append(emptyState("Produk tidak ditemukan."));
      return;
    }

    tableArea.append(
      createTable(
        ["Produk", "Stok", "Indikator", "Status", "Aksi"],
        list.map(p => {
          const percentage = Math.min(
            100,
            p.stock / Math.max(100, p.stock, 1) * 100
          );

          const fill = el("div", {
            className: "stock-bar"
          });

          fill.append(
            el("div", {
              className: "stock-fill" +
                (p.stock === 0 ? " empty" :
                  p.stock <= 50 ? " low" : ""),
              attrs: {
                style: `width:${percentage}%`
              }
            })
          );

          return [
            p.name,
            `${p.stock} ${p.unit}`,
            fill,
            badge(p.stock === 0 ? "Habis" :
              p.stock <= 50 ? "Stok Rendah" : "Tersedia"),
            button("Ubah Stok", () => showInventoryForm(p), "outline", true)
          ];
        })
      )
    );
  }

  updateTable(products);
  page.append(card);

  const logs = [...state.data.inventoryLogs].reverse().slice(0, 10);

  const logCard = el("div", { className: "card section-gap" }, [
    el("div", {
      className: "card-title",
      text: "Riwayat Perubahan Stok"
    }),
    el("div", {
      className: "card-subtitle",
      text: "10 aktivitas terakhir"
    })
  ]);

  if (!logs.length) {
    logCard.append(emptyState("Belum ada riwayat perubahan stok."));
  } else {
    logCard.append(
      createTable(
        ["Tanggal", "Produk", "Jenis", "Perubahan", "Stok Akhir", "Catatan"],
        logs.map(log => [
          dateTime(log.date),
          log.productName,
          badge(log.type),
          log.quantity,
          log.after,
          log.note
        ])
      )
    );
  }

  page.append(logCard);
  return page;
}

function showInventoryForm(product) {
  const body = el("form");

  const type = el("select", {
    className: "form-control",
    name: "type"
  });

  [
    ["IN", "Stok Masuk"],
    ["OUT", "Stok Keluar"],
    ["SET", "Penyesuaian Stok"]
  ].forEach(([value, label]) => {
    type.append(el("option", { value, text: label }));
  });

  const quantity = el("input", {
    className: "form-control",
    name: "quantity",
    type: "number",
    min: "1",
    required: true,
    placeholder: "Masukkan jumlah stok"
  });

  const note = el("input", {
    className: "form-control",
    name: "note",
    placeholder: "Keterangan perubahan stok"
  });

  body.append(
    el("div", { className: "notice" }, [
      el("strong", { text: product.name }),
      el("p", { text: `Stok saat ini: ${product.stock} ${product.unit}` })
    ]),
    el("div", { className: "form-group" }, [
      el("label", { text: "Jenis Perubahan" }),
      type
    ]),
    el("div", { className: "form-group" }, [
      el("label", { text: "Jumlah" }),
      quantity
    ]),
    el("div", { className: "form-group" }, [
      el("label", { text: "Catatan" }),
      note
    ])
  );

  body.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      await api(`/inventory/${product.id}`, {
        method: "PUT",
        body: {
          type: type.value,
          quantity: Number(quantity.value),
          note: note.value
        }
      });

      closeModal();
      await refreshData();
      render();
      showToast("Persediaan berhasil diperbarui.");
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  openFormModal("Perbarui Persediaan", body);
}

function closeModal() {
  $$(".modal-backdrop").forEach(m => m.remove());
}

function openFormModal(title, form) {
  const backdrop = el("div", { className: "modal-backdrop" });
  const modal = el("div", { className: "modal" });

  modal.append(
    el("div", { className: "modal-header" }, [
      el("strong", { text: title }),
      el("button", {
        className: "modal-close",
        text: "×",
        onClick: () => backdrop.remove()
      })
    ]),
    el("div", { className: "modal-body" }, [form]),
    el("div", { className: "modal-footer" }, [
      button("Batal", () => backdrop.remove(), "outline"),
      button("Simpan", () => form.requestSubmit(), "primary")
    ])
  );

  backdrop.append(modal);
  document.body.append(backdrop);
}

/* =========================================
   TRANSACTIONS
========================================= */

function renderTransactions() {
  const page = el("div");

  page.append(
    heading(
      "Riwayat Transaksi",
      "Rekapitulasi transaksi yang telah diselesaikan."
    )
  );

  let transactions = state.data.transactions;

  if (state.role !== "admin") {
    const orders = getVisibleOrders();

    transactions = transactions.filter(t =>
      orders.some(o => o.id === t.orderId)
    );
  }

  const total = transactions.reduce((sum, t) => sum + t.total, 0);

  page.append(
    el("div", { className: "stats-grid" }, [
      statCard("Total Transaksi", transactions.length, "▤"),
      statCard("Nilai Transaksi", money(total), "Rp"),
      statCard(
        "Transaksi B2B",
        transactions.filter(t => t.type === "B2B").length,
        "▣"
      ),
      statCard(
        "Transaksi B2C",
        transactions.filter(t => t.type === "B2C").length,
        "🛒"
      )
    ])
  );

  const search = el("input", {
    className: "form-control search-box",
    placeholder: "Cari nomor transaksi atau pemesan...",
    onInput: event => updateTable(event.target.value)
  });

  const filter = el("select", { className: "form-control" });

  [
    ["Semua", "Semua Jenis"],
    ["B2B", "B2B"],
    ["B2C", "B2C"]
  ].forEach(([value, label]) => {
    filter.append(el("option", { value, text: label }));
  });

  const tableArea = el("div");

  function updateTable(keyword = "") {
    const q = keyword.toLowerCase();

    const list = transactions.filter(t =>
      (filter.value === "Semua" || t.type === filter.value) &&
      (
        t.id.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.orderId.toLowerCase().includes(q)
      )
    );

    tableArea.replaceChildren();

    if (!list.length) {
      tableArea.append(emptyState("Tidak ada transaksi yang sesuai."));
      return;
    }

    tableArea.append(
      createTable(
        ["No. Transaksi", "No. Pesanan", "Pemesan", "Jenis", "Tanggal", "Total", "Status"],
        list.map(t => [
          t.id,
          t.orderId,
          t.customer,
          badge(t.type),
          dateFormat(t.date),
          money(t.total),
          badge(t.status)
        ])
      )
    );
  }

  filter.addEventListener("change", () => updateTable(search.value));

  const card = el("div", { className: "card" }, [
    el("div", { className: "toolbar" }, [
      el("div", { className: "toolbar-left" }, [search, filter])
    ]),
    tableArea
  ]);

  updateTable();
  page.append(card);

  return page;
}

/* =========================================
   ACCESS CONTROL
========================================= */

function pageAllowed(page) {
  const access = {
    admin: [
      "dashboard", "katalog", "detail", "produk",
      "pemesanan", "pesanan", "monitoring",
      "persediaan", "transaksi", "perbandingan"
    ],
    retail: [
      "dashboard", "katalog", "detail", "pemesanan",
      "checkout", "sukses", "monitoring",
      "persediaan", "transaksi", "perbandingan"
    ],
    customer: [
      "dashboard", "katalog", "detail", "pembelian",
      "checkout", "sukses", "monitoring",
      "transaksi", "perbandingan"
    ]
  };

  return access[state.role].includes(page);
}

function redirectForRole(page) {
  if (page === "produk" || page === "persediaan" ||
      page === "pesanan") {
    return "dashboard";
  }

  if (page === "pemesanan" && state.role !== "retail" &&
      state.role !== "admin") {
    return "dashboard";
  }

  return "dashboard";
}

/* =========================================
   PAGE ROUTER
========================================= */

function render() {
  const pageName = currentPage();

  if (!pageAllowed(pageName)) {
    const destination = redirectForRole(pageName);
    navigate(destination);
    return;
  }

  state.mobileMenu = false;

  let content;

  switch (pageName) {
    case "dashboard":
      content = renderDashboard();
      break;

    case "katalog":
      content = renderCatalog(false);
      break;

    case "detail":
      content = renderProductDetail();
      break;

    case "perbandingan":
      content = renderComparison();
      break;

    case "produk":
      content = renderProductManagement();
      break;

    case "pemesanan":
      content = renderCatalog(true);
      break;

    case "pembelian":
      content = renderCatalog(true);
      break;

    case "checkout":
      content = renderCheckout();
      break;

    case "sukses":
      content = renderSuccess();
      break;

    case "pesanan":
      content = renderOrderManagement();
      break;

    case "monitoring":
      content = renderMonitoring();
      break;

    case "persediaan":
      content = renderInventory();
      break;

    case "transaksi":
      content = renderTransactions();
      break;

    default:
      content = renderDashboard();
  }

  renderLayout(content);
}

/* =========================================
   INITIALIZATION
========================================= */

async function initialize() {
  try {
    await refreshData();

    if (!location.hash) {
      navigate("dashboard");
      return;
    }

    render();

  } catch (err) {
    const app = $("#app");

    const panel = el("div", {
      className: "success-panel"
    }, [
      el("div", {
        className: "success-icon",
        text: "!"
      }),
      el("h2", { text: "Gagal Memuat Aplikasi" }),
      el("p", { text: err.message }),
      el("p", {
        text: "Pastikan server aktif dan file data.json tersedia."
      }),
      button("Coba Lagi", initialize, "primary")
    ]);

    app.replaceChildren(panel);
  }
}

window.addEventListener("hashchange", async () => {
  try {
    await refreshData();
    render();
  } catch (err) {
    showToast(err.message, "error");
  }
});

initialize();