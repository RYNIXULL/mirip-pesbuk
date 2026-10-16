/**
 * FaceBook VulnLab - Real Backend Server
 * Dibuat menggunakan Express.js & modul native node:sqlite.
 * Sengaja dibuat sangat rentan terhadap SQL Injection untuk keperluan lab edukasi dan testing (curl / sqlmap / browser).
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Inisialisasi Database SQLite in-memory
const db = new DatabaseSync(':memory:');

// Buat Skema Tabel
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    full_name TEXT,
    email TEXT,
    password TEXT,
    role TEXT,
    bio TEXT,
    avatar TEXT,
    created_at TEXT
  );

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT,
    author_username TEXT,
    content TEXT,
    created_at TEXT,
    likes INTEGER,
    is_private INTEGER
  );

  CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    sender_name TEXT,
    receiver_name TEXT,
    content TEXT,
    created_at TEXT
  );

  CREATE TABLE system_secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flag_name TEXT,
    secret_key TEXT,
    flag_value TEXT,
    description TEXT
  );
`);

// Isi Data Awal (Dummy / Mock Data)
const seedUsers = db.prepare(`
  INSERT INTO users (username, full_name, email, password, role, bio, avatar, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

seedUsers.run('admin', 'Mark Administrator', 'admin@facebook-vuln.local', 'admin_secret_pass#2026', 'administrator', 'Lead Developer & Platform Founder. Don\'t touch my database!', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
seedUsers.run('budi_santoso', 'Budi Santoso', 'budi@example.com', 'password123', 'user', 'Penggemar fotografi jalanan dan penikmat kopi senja.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
seedUsers.run('siti_rahma', 'Siti Rahma', 'siti@example.com', 'rahasia_siti_99', 'user', 'UI/UX Designer | Suka hiking, kucing, dan desain antarmuka kaca.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150');
seedUsers.run('doni_cyber', 'Doni Cyber', 'doni@secmail.local', 'hunter2_doni', 'user', 'Cybersecurity enthusiast. Suka mencari celah keamanan web.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150');

const seedPosts = db.prepare(`
  INSERT INTO posts (author, author_username, content, created_at, likes, is_private)
  VALUES (?, ?, ?, ?, ?, ?)
`);

seedPosts.run('Mark Administrator', 'admin', 'Selamat datang di FaceBook versi internal! Sistem keamanan kami menggunakan database SQL query manual. Jangan coba-coba mencari celah!', '10 menit yang lalu', 42, 0);
seedPosts.run('Budi Santoso', 'budi_santoso', 'Hari ini cuaca cerah sekali untuk hunting foto di sekitaran bundaran HI. Ada yang mau gabung sore ini?', '1 jam yang lalu', 15, 0);
seedPosts.run('Siti Rahma', 'siti_rahma', 'Baru saja update antarmuka aplikasi dengan efek Glassmorphism. Terlihat bersih, transparan, dan sangat estetik!', '3 jam yang lalu', 31, 0);
seedPosts.run('Doni Cyber', 'doni_cyber', 'Catatan untuk tim developer: Jangan pernah menggabungkan input string langsung ke dalam SQL query tanpa prepared statements!', '5 jam yang lalu', 58, 0);

const seedMessages = db.prepare(`
  INSERT INTO messages (sender_id, receiver_id, sender_name, receiver_name, content, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

seedMessages.run(1, 2, 'Mark Administrator', 'Budi Santoso', 'Budi, tolong simpan backup token database di tempat aman ya.', 'Kemarin, 21:00');
seedMessages.run(3, 1, 'Siti Rahma', 'Mark Administrator', 'Mark, tabel rahasia system_secrets di database apakah sudah siap?', 'Kemarin, 22:30');
seedMessages.run(1, 3, 'Mark Administrator', 'Siti Rahma', 'Sudah Siti. Tabel system_secrets hanya bisa diakses via SQL direct access.', 'Hari ini, 07:15');

const seedSecrets = db.prepare(`
  INSERT INTO system_secrets (flag_name, secret_key, flag_value, description)
  VALUES (?, ?, ?, ?)
`);

seedSecrets.run('FLAG_CHALLENGE_ROOT', 'KEY_ROOT_9931', 'FLAG{SQLi_UNION_SELECT_DATABASE_DUMPED_SUCCESS}', 'Secret flag admin tersimpan di tabel internal system_secrets.');
seedSecrets.run('DATABASE_BACKUP_CRED', 'DB_REPLICA_TOKEN', 'FLAG{SUPER_SECRET_ADMIN_TOKEN_X7712}', 'Token replikasi database rahasia untuk cluster internal.');

// ==========================================
// VULNERABLE ENDPOINTS (Sengaja Dibuat Rentan)
// ==========================================

/**
 * 1. Login Rentan (Auth Bypass)
 * Target payload: ' OR '1'='1   atau   admin' --
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // VULNERABILITY: String Concatenation murni tanpa sanitasi
  const rawSql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}';`;
  console.log(`[SQL EXEC] ${rawSql}`);

  try {
    const results = db.prepare(rawSql).all();
    if (results.length > 0) {
      return res.json({
        success: true,
        message: 'Login Berhasil!',
        user: results[0],
        executedQuery: rawSql
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Kredensial tidak valid.',
        executedQuery: rawSql
      });
    }
  } catch (err) {
    console.error(`[SQL ERROR] ${err.message}`);
    return res.status(500).json({
      success: false,
      error: err.message,
      executedQuery: rawSql
    });
  }
});

/**
 * 2. Pencarian Postingan Rentan (UNION-Based SQLi)
 * Target payload: ' UNION SELECT id, username, password, email, role FROM users --
 */
app.get('/api/posts', (req, res) => {
  const search = req.query.search || '';
  
  // VULNERABILITY: String Concatenation dalam klausa LIKE
  const rawSql = `SELECT id, author, content, created_at, likes FROM posts WHERE content LIKE '%${search}%';`;
  console.log(`[SQL EXEC] ${rawSql}`);

  try {
    const results = db.prepare(rawSql).all();
    return res.json({
      success: true,
      count: results.length,
      data: results,
      executedQuery: rawSql
    });
  } catch (err) {
    console.error(`[SQL ERROR] ${err.message}`);
    return res.status(500).json({
      success: false,
      error: err.message,
      executedQuery: rawSql
    });
  }
});

/**
 * 3. Profil Pengguna Berdasarkan ID (Numeric SQLi)
 * Target payload: 1 OR 1=1   atau   -1 UNION SELECT 1, 'hacker', ...
 */
app.get('/api/users/:id', (req, res) => {
  const id = req.params.id;

  // VULNERABILITY: Input angka dimasukkan langsung tanpa validasi tipe integer
  const rawSql = `SELECT id, username, full_name, email, bio, avatar, role FROM users WHERE id = ${id};`;
  console.log(`[SQL EXEC] ${rawSql}`);

  try {
    const results = db.prepare(rawSql).all();
    if (results.length > 0) {
      return res.json({
        success: true,
        data: results[0],
        executedQuery: rawSql
      });
    } else {
      return res.status(404).json({
        success: false,
        error: `Pengguna dengan ID ${id} tidak ditemukan.`,
        executedQuery: rawSql
      });
    }
  } catch (err) {
    console.error(`[SQL ERROR] ${err.message}`);
    return res.status(500).json({
      success: false,
      error: err.message,
      executedQuery: rawSql
    });
  }
});

/**
 * 4. Filter Pesan Rahasia (Boolean / Error-Based SQLi)
 */
app.get('/api/messages', (req, res) => {
  const keyword = req.query.keyword || '';
  const rawSql = `SELECT * FROM messages WHERE content LIKE '%${keyword}%';`;
  console.log(`[SQL EXEC] ${rawSql}`);

  try {
    const results = db.prepare(rawSql).all();
    return res.json({
      success: true,
      data: results,
      executedQuery: rawSql
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      executedQuery: rawSql
    });
  }
});

// Jalankan Server jika dieksekusi langsung
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(` FaceBook VulnLab - Laboratorium SQL Injection Aktif`);
    console.log(` URL Aplikasi: http://localhost:${PORT}`);
    console.log(' Engine: Node.js + Native SQLite (In-Memory)');
    console.log(' Status: SENGAJA RENTAN UNTUK PENGUJIAN KEAMANAN');
    console.log('====================================================');
  });
}

module.exports = app;
