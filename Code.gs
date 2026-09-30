/**
 * My Financial Tracker – Google Apps Script API
 * Tempel kode ini di Extensions > Apps Script pada Google Spreadsheet Anda
 * (script "bound", jadi Spreadsheet ID tidak perlu ditulis di mana pun).
 *
 * Kolom: Timestamp | Date | Type | Category | Subcategory | Amount | Payment Method | Note | ID
 * Kolom ID dipakai untuk mencegah transaksi ganda.
 */
// Daftar nama = nama tab di spreadsheet. Hanya nama ini yang diizinkan.
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
const HEADERS = ["Timestamp", "Date", "Type", "Category", "Subcategory", "Amount", "Payment Method", "Note", "ID"];

// Ambil sheet; buat otomatis beserta header jika belum ada
function getSheet_(user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(user);
  if (!sh) {
    sh = ss.insertSheet(user);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Menerima transaksi baru (HTTP POST)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!USERS.includes(d.user)) return json_({ success: false, error: "Nama tidak dikenal." });

    // Validasi sisi server
    const amount = Number(d.amount);
    if (!d.id || !d.date || !["Income", "Expense"].includes(d.type) || !d.category || !(amount > 0) || !d.paymentMethod) {
      return json_({ success: false, error: "Data tidak valid." });
    }

    const sh = getSheet_(d.user);
    const last = sh.getLastRow();

    // Cegah duplikat berdasarkan ID
    if (last > 1) {
      const ids = sh.getRange(2, 9, last - 1, 1).getValues().flat();
      if (ids.includes(d.id)) return json_({ success: true, duplicate: true });
    }

    sh.appendRow([d.timestamp || new Date().toISOString(), d.date, d.type, d.category, d.subcategory || "", amount, d.paymentMethod, d.note || "", d.id]);
    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Mengirim daftar transaksi ke frontend (HTTP GET ?action=list)
function doGet(e) {
  try {
    const user = e.parameter.user;
    if (!USERS.includes(user)) return json_({ success: false, error: "Nama tidak dikenal." });
    const sh = getSheet_(user);
    const last = sh.getLastRow();
    const tz = Session.getScriptTimeZone();
    const rows = last > 1 ? sh.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
    const fmt = (v) => (v instanceof Date ? Utilities.formatDate(v, tz, "yyyy-MM-dd") : String(v));
    const transactions = rows.map((r) => ({
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      date: fmt(r[1]), type: r[2], category: r[3], subcategory: r[4],
      amount: Number(r[5]), paymentMethod: r[6], note: r[7], id: r[8],
    }));
    return json_({ success: true, transactions: transactions });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}
