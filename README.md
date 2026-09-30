# My Financial Tracker

Aplikasi pencatat keuangan pribadi: frontend statis (GitHub Pages) + Google Sheets sebagai database lewat Google Apps Script.

```
/
├── index.html
├── style.css
├── script.js            <- isi GOOGLE_APPS_SCRIPT_URL di sini
├── apps-script/Code.gs  <- tempel di Apps Script (bukan bagian dari website)
└── assets/icons/
```

## 1. Buat Google Spreadsheet
1. Buka [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**.
2. Beri nama, misalnya `My Financial Tracker Data`.
3. Tidak perlu membuat kolom manual. Sheet `Transactions` beserta header
   `Timestamp | Date | Type | Category | Subcategory | Amount | Payment Method | Note | ID`
   dibuat otomatis saat pertama kali dipakai. Kolom `ID` tambahan dipakai untuk mencegah transaksi ganda.

## 2. Pasang kode Apps Script
1. Di spreadsheet: **Extensions → Apps Script**.
2. Hapus isi `Code.gs` bawaan, lalu tempel seluruh isi file `apps-script/Code.gs`.
3. Klik **Save** (ikon disket).

Karena script dibuat dari dalam spreadsheet, Spreadsheet ID tidak perlu ditulis di kode mana pun.

## 3. Deploy sebagai Web App
1. Klik **Deploy → New deployment**.
2. Ikon roda gigi → pilih **Web app**.
3. Isi:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
4. Klik **Deploy**, setujui izin akses (klik *Advanced → Go to project* jika muncul peringatan).
5. Salin **Web app URL** (berakhiran `/exec`).

> Setiap kali Anda mengubah `Code.gs`, buat versi baru lewat **Deploy → Manage deployments → Edit → New version**. URL tetap sama.

## 4. Hubungkan frontend
Buka `script.js` dan ganti:

```js
const GOOGLE_APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";
```

dengan URL `/exec` tadi. Untuk uji lokal, jalankan `python3 -m http.server` di folder proyek lalu buka `http://localhost:8000`.

## 5. Publikasikan dengan GitHub Pages
1. Buat repository baru di GitHub, misalnya `my-financial-tracker`.
2. Upload `index.html`, `style.css`, `script.js`, `README.md`, dan folder `assets` (folder `apps-script` boleh ikut sebagai dokumentasi).
3. Buka **Settings → Pages**.
4. *Source*: **Deploy from a branch**, branch `main`, folder `/ (root)` → **Save**.
5. Tunggu 1–2 menit. Situs tersedia di `https://USERNAME.github.io/my-financial-tracker/`.

## Catatan keamanan
- Yang ada di frontend hanya URL Web App. Tidak ada Spreadsheet ID, kredensial, atau token.
- Karena akses diset **Anyone**, siapa pun yang tahu URL tersebut bisa membaca dan menambah data. Jangan bagikan URL, dan jangan pakai repository publik jika Anda tidak ingin URL-nya terlihat orang lain (gunakan repository private dengan GitHub Pages jika akun Anda mendukung).
- Jika URL bocor, buat deployment baru (URL baru) dan hapus deployment lama.

## Cara memakai
- **Add Transaction**: pilih tipe → kategori → subkategori otomatis menyesuaikan. Jumlah ditulis seperti `50000` dan otomatis menjadi `Rp 50.000`; yang disimpan ke Sheets adalah angka murni.
- **Transactions**: cari dan filter berdasarkan tipe, kategori, dan bulan.
- **Settings**: tes koneksi dan muat ulang data dari Sheets.

## Satu spreadsheet, satu tab per orang (23 nama)
- Import `Financial-Tracker-Per-Orang.xlsx` ke Google Sheets (**File → Import → Upload → Create new spreadsheet**). Setiap orang punya tab sendiri dengan header siap pakai.
- Buka **Extensions → Apps Script** dari spreadsheet hasil import itu, tempel `apps-script/Code.gs` versi terbaru, lalu deploy (langkah 3 di atas).
- Di website, pilih nama di bagian atas halaman. Data dikirim dan dibaca hanya dari tab milik nama tersebut. Pilihan nama diingat di browser masing-masing.
- Menambah orang baru: tambahkan nama di `USERS` pada `script.js` dan `Code.gs`, lalu deploy versi baru. Tab dibuat otomatis saat transaksi pertama.

## Troubleshooting
- **"Unexpected token '<' ... is not valid JSON"**: Web App mengembalikan halaman HTML (biasanya halaman login Google). Buka **Deploy → Manage deployments → Edit (ikon pensil)**, pastikan *Who has access* = **Anyone**, pilih **New version**, lalu **Deploy**. Pakai URL `/exec` (bukan `/dev`).
- Uji cepat: buka `URL_ANDA?action=list&user=ADELIO%20AZKA` di tab baru. Hasil yang benar berupa teks JSON `{"success":true,...}`.

## Membuat dashboard di Looker Studio
Website ini hanya untuk **input data**. Dashboard dibuat siswa sendiri di [Looker Studio](https://lookerstudio.google.com):
1. **Create → Report → Google Sheets**, pilih spreadsheet lalu tab **nama masing-masing**.
2. Pastikan kolom `Date` bertipe *Date* dan `Amount` bertipe *Number* (Currency → IDR).
3. Ide latihan: scorecard total Income/Expense, bar chart per `Category`, time series per `Date`, filter `Payment Method`.
