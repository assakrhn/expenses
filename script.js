/* =====================================================
   My Financial Tracker – vanilla JS
   ===================================================== */

// >>> KONFIGURASI: tempel URL Web App Apps Script Anda di sini <<<
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzH-gohmi2-HO9yhXBFdiR8yhm6PWDtCg4Vtwa_Wi77Dwm0WsjlaJipjfjMjmLUY3Q/exec";

/* ---------- Data kategori ---------- */
const CATEGORIES = {
  Income: { "Cash": [], "E-wallet": [], "From Other People": [] },
  Expense: {
    "Food": ["Snacks", "Meal", "Hangout", "Drinks", "Other"],
    "Transport": ["Fuel", "Public Transportation", "Other"],
    "Entertainment": ["Internet Package", "Subscription", "Other"],
    "Buy Goods": ["Electronics", "Clothing", "Household Needs", "Other"],
    "Bills": ["Electricity", "Water", "Internet", "Phone", "Rent", "Other"],
    "Personal": ["Skincare", "Salon", "Personal Care", "Health", "Other"],
    "Travel": ["Ticket", "Hotel", "Transportation", "Souvenir", "Other"],
    "Giving": ["Gift", "Donation", "Treating Others", "Other"],
    "Saving / Investment": ["Savings", "Investment", "Emergency Fund", "Other"],
  },
};
const PAYMENT_METHODS = ["Cash", "Bank", "E-wallet", "Credit Card"];

// Daftar nama (harus sama persis dengan USERS di Code.gs dan nama tab di spreadsheet)
const USERS = [
  "ALBAIHAQI KAMIL ARMENT",
  "FERNANDO JOEVA MATURBONGS",
  "FIANNITA PUTRI SURANTO",
  "KEYSA TITIALANI",
  "RAFID HAFY ALRANZA",
  "GRACE KEYLA THERESIA NABABAN",
  "ZIBRAN EJA SYAH PUTRA",
  "ZIKRI ALVI MUZAKKI",
  "ARVIN AZHAR GUNAWAN",
  "ATIQAH MARYAM ZHARIFAH",
  "CHIARA RADELLA FREDELINA",
  "LUTHFI KUMALA FAJRI",
  "ADELIO AZKA",
  "DEWI KUNTI DWIYANTI WAHYUDI",
  "KEYLA NURAZIZAH",
  "LUTFI MAHENDRA KARNO BUONO",
  "MAURA AZALIA",
  "AKMAL ESHAN FAEYZA",
  "AMELIA BILQIS ALI",
  "FANYA ANATASYA PRATAMA",
  "FARIZ RAMADHANI",
  "MUHAMMAD FEBRIAN NADHIR",
  "AHZA ARISTA KAYANA"
];

/* ---------- Helper ---------- */
const $ = (id) => document.getElementById(id);
const isConfigured = () => GOOGLE_APPS_SCRIPT_URL && !GOOGLE_APPS_SCRIPT_URL.startsWith("YOUR_");
const rupiah = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthOffset = (o) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + o); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const parseRupiah = (s) => Number(String(s).replace(/\D/g, "")) || 0; // "Rp 50.000" -> 50000
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2));

let transactions = [];
let pendingId = null;   // ID transaksi yang sedang dikirim: dipakai ulang saat retry agar tidak dobel
let submitting = false;
let currentUser = "";   // nama yang dipilih; disimpan di browser ini
try { currentUser = localStorage.getItem("ft_user") || ""; } catch (e) {}
if (!USERS.includes(currentUser)) currentUser = "";

/* ---------- Navigasi & notifikasi ---------- */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
  document.querySelectorAll(".nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  window.scrollTo(0, 0);
}
let toastTimer;
function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg; t.hidden = false; t.classList.toggle("error-toast", isError);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

/* ---------- Form: dropdown dinamis ---------- */
const fillSelect = (sel, items, placeholder) => {
  sel.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : "") +
    items.map((i) => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join("");
};
function updateCategories() {
  fillSelect($("fCategory"), Object.keys(CATEGORIES[$("fType").value]), "Pilih kategori");
  updateSubcategories();
}
function updateSubcategories() {
  const subs = CATEGORIES[$("fType").value][$("fCategory").value] || [];
  fillSelect($("fSub"), subs, subs.length ? "Pilih subkategori" : "— tidak ada —");
  $("fSub").disabled = !subs.length;
}
function resetForm() {
  $("txForm").reset();
  $("fDate").value = todayStr();
  updateCategories();
  pendingId = null;
}

/* Format input jumlah menjadi "Rp 50.000" saat mengetik */
$("fAmount").addEventListener("input", (e) => {
  const n = parseRupiah(e.target.value);
  e.target.value = n ? rupiah(n) : "";
});

/* ---------- Kirim transaksi ---------- */
function validate(tx) {
  if (!tx.date) return "Tanggal wajib diisi.";
  if (!tx.category) return "Pilih kategori.";
  if ((CATEGORIES[tx.type][tx.category] || []).length && !tx.subcategory) return "Pilih subkategori.";
  if (!(tx.amount > 0)) return "Jumlah harus lebih dari Rp 0.";
  if (!tx.paymentMethod) return "Pilih metode pembayaran.";
  return "";
}
async function submitTransaction(e) {
  e.preventDefault();
  if (submitting) return; // cegah klik ganda
  const tx = {
    id: (pendingId = pendingId || uid()),
    user: currentUser,
    timestamp: new Date().toISOString(),
    date: $("fDate").value, type: $("fType").value,
    category: $("fCategory").value, subcategory: $("fSub").value,
    amount: parseRupiah($("fAmount").value),
    paymentMethod: $("fPay").value, note: $("fNote").value.trim(),
  };
  const err = !tx.user ? "Pilih nama Anda di bagian atas halaman." : validate(tx);
  $("formError").hidden = !err; $("formError").textContent = err;
  if (err) return;
  if (!isConfigured()) { toast("Isi GOOGLE_APPS_SCRIPT_URL di script.js dulu.", true); return; }

  submitting = true; $("btnSave").disabled = true; $("btnSave").textContent = "Menyimpan…";
  try {
    // text/plain menghindari preflight CORS yang tidak didukung Apps Script
    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(tx) });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Server menolak data.");
    transactions.push(tx);
    toast("Transaksi berhasil disimpan ✓");
    resetForm(); renderAll();
  } catch (ex) {
    toast("Gagal menyimpan: " + ex.message + ". Coba lagi (tidak akan dobel).", true);
  } finally {
    submitting = false; $("btnSave").disabled = false; $("btnSave").textContent = "Simpan transaksi";
  }
}

/* ---------- Muat data dari Google Sheets ---------- */
async function loadTransactions() {
  if (!isConfigured()) { $("connStatus").textContent = "Belum dikonfigurasi"; return; }
  if (!currentUser) { $("connStatus").textContent = "Pilih nama dulu"; return; }
  $("connStatus").textContent = "Memuat…";
  try {
    const res = await fetch(GOOGLE_APPS_SCRIPT_URL + "?action=list&user=" + encodeURIComponent(currentUser));
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    transactions = data.transactions;
    $("connStatus").textContent = `Terhubung (${transactions.length} transaksi)`;
    renderAll();
  } catch (ex) {
    $("connStatus").textContent = "Gagal terhubung";
    toast("Gagal memuat data: " + ex.message, true);
  }
}

/* ---------- Dashboard ---------- */
function dashMonth() {
  const m = $("dashMode").value;
  return m === "current" ? monthOffset(0) : m === "previous" ? monthOffset(-1) : $("dashMonth").value;
}
function renderDashboard() {
  const month = dashMonth();
  const list = transactions.filter((t) => !month || String(t.date).slice(0, 7) === month);
  const sum = (type) => list.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);
  const inc = sum("Income"), exp = sum("Expense");
  $("sumIncome").textContent = rupiah(inc);
  $("sumExpense").textContent = rupiah(exp);
  $("sumBalance").textContent = rupiah(inc - exp);
  $("sumCount").textContent = list.length;

  const byCat = {};
  list.filter((t) => t.type === "Expense").forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount)));
  const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  $("catBars").innerHTML = rows.length
    ? rows.map(([c, v]) => `<div class="bar-row"><span>${escapeHtml(c)}</span><div class="bar-track"><div class="bar-fill" style="width:${(v / rows[0][1]) * 100}%"></div></div><b>${rupiah(v)}</b></div>`).join("")
    : `<p class="empty">Belum ada pengeluaran di periode ini.</p>`;
}

/* ---------- Riwayat transaksi ---------- */
function renderCategoryFilter() {
  const type = $("qType").value;
  const cats = type ? Object.keys(CATEGORIES[type]) : [...Object.keys(CATEGORIES.Income), ...Object.keys(CATEGORIES.Expense)];
  const cur = $("qCategory").value;
  fillSelect($("qCategory"), [...new Set(cats)], "Semua kategori");
  $("qCategory").value = cats.includes(cur) ? cur : "";
}
function renderHistory() {
  const q = $("qSearch").value.toLowerCase(), type = $("qType").value, cat = $("qCategory").value, month = $("qMonth").value;
  const list = transactions
    .filter((t) => (!type || t.type === type) && (!cat || t.category === cat) && (!month || String(t.date).slice(0, 7) === month) &&
      (!q || [t.category, t.subcategory, t.note, t.paymentMethod].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.timestamp).localeCompare(String(a.timestamp)));
  $("txBody").innerHTML = list.length
    ? list.map((t) => `<tr><td>${escapeHtml(t.date)}</td><td class="t-${escapeHtml(t.type)}">${escapeHtml(t.type)}</td><td>${escapeHtml(t.category)}</td><td>${escapeHtml(t.subcategory)}</td><td class="num t-${escapeHtml(t.type)}">${t.type === "Expense" ? "−" : "+"}${rupiah(t.amount)}</td><td>${escapeHtml(t.paymentMethod)}</td><td>${escapeHtml(t.note)}</td></tr>`).join("")
    : `<tr><td colspan="7" class="empty">Tidak ada transaksi yang cocok.</td></tr>`;
}
const renderAll = () => { renderDashboard(); renderHistory(); };

/* ---------- Inisialisasi ---------- */
function init() {
  document.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  fillSelect($("fPay"), PAYMENT_METHODS, "Pilih metode");
  fillSelect($("userSelect"), USERS, "Pilih nama…");
  $("userSelect").value = currentUser;
  $("userSelect").addEventListener("change", () => {
    currentUser = $("userSelect").value;
    try { localStorage.setItem("ft_user", currentUser); } catch (e) {}
    transactions = []; renderAll(); loadTransactions();
  });
  resetForm();
  renderCategoryFilter();

  $("fType").addEventListener("change", updateCategories);
  $("fCategory").addEventListener("change", updateSubcategories);
  $("txForm").addEventListener("submit", submitTransaction);

  $("dashMode").addEventListener("change", () => {
    $("dashMonth").hidden = $("dashMode").value !== "specific";
    if (!$("dashMonth").hidden && !$("dashMonth").value) $("dashMonth").value = monthOffset(0);
    renderDashboard();
  });
  $("dashMonth").addEventListener("change", renderDashboard);

  $("qType").addEventListener("change", () => { renderCategoryFilter(); renderHistory(); });
  ["qSearch", "qCategory", "qMonth"].forEach((id) => $(id).addEventListener("input", renderHistory));
  $("qReset").addEventListener("click", () => { $("qSearch").value = ""; $("qType").value = ""; $("qMonth").value = ""; renderCategoryFilter(); renderHistory(); });
  $("btnTest").addEventListener("click", loadTransactions);

  renderAll();
  loadTransactions();
}
init();
