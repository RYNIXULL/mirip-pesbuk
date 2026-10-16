/**
 * Vulnerable SQL Database Engine (Client-Side SQLite Simulator)
 * Dirancang khusus untuk lab edukasi SQL Injection dengan perilaku autentik:
 * - String concatenation vulnerability
 * - SQLite syntax error pada tanda petik tunggal tak tertutup
 * - Penanganan komentar SQL (--)
 * - Evaluasi logika boolean (' OR '1'='1, OR 1=1, AND)
 * - Ekstraksi data via UNION SELECT
 * - Eksplorasi skema database via sqlite_master
 */

(function (window) {
  'use strict';

  // Seed Data Awal
  const INITIAL_DATA = {
    users: [
      {
        id: 1,
        username: 'admin',
        full_name: 'Mark Administrator',
        email: 'admin@facebook-vuln.local',
        password: 'admin_secret_pass#2026',
        role: 'administrator',
        bio: 'Lead Developer & Platform Founder. Don\'t touch my database!',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        created_at: '2026-01-10 08:30:00'
      },
      {
        id: 2,
        username: 'budi_santoso',
        full_name: 'Budi Santoso',
        email: 'budi@example.com',
        password: 'password123',
        role: 'user',
        bio: 'Penggemar fotografi jalanan dan penikmat kopi senja.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        created_at: '2026-02-14 11:20:00'
      },
      {
        id: 3,
        username: 'siti_rahma',
        full_name: 'Siti Rahma',
        email: 'siti@example.com',
        password: 'rahasia_siti_99',
        role: 'user',
        bio: 'UI/UX Designer | Suka hiking, kucing, dan desain antarmuka kaca.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        created_at: '2026-03-01 14:15:00'
      },
      {
        id: 4,
        username: 'doni_cyber',
        full_name: 'Doni Cyber',
        email: 'doni@secmail.local',
        password: 'hunter2_doni',
        role: 'user',
        bio: 'Cybersecurity enthusiast. Suka mencari celah keamanan web.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        created_at: '2026-03-20 17:45:00'
      }
    ],
    posts: [
      {
        id: 1,
        author: 'Mark Administrator',
        author_username: 'admin',
        content: 'Selamat datang di FaceBook versi internal! Sistem keamanan kami menggunakan database SQL query manual. Jangan coba-coba mencari celah!',
        created_at: '10 menit yang lalu',
        likes: 42,
        is_private: 0
      },
      {
        id: 2,
        author: 'Budi Santoso',
        author_username: 'budi_santoso',
        content: 'Hari ini cuaca cerah sekali untuk hunting foto di sekitaran bundaran HI. Ada yang mau gabung sore ini?',
        created_at: '1 jam yang lalu',
        likes: 15,
        is_private: 0
      },
      {
        id: 3,
        author: 'Siti Rahma',
        author_username: 'siti_rahma',
        content: 'Baru saja update antarmuka aplikasi dengan efek Glassmorphism. Terlihat bersih, transparan, dan sangat estetik!',
        created_at: '3 jam yang lalu',
        likes: 31,
        is_private: 0
      },
      {
        id: 4,
        author: 'Doni Cyber',
        author_username: 'doni_cyber',
        content: 'Catatan untuk tim developer: Jangan pernah menggabungkan input string langsung ke dalam SQL query tanpa prepared statements!',
        created_at: '5 jam yang lalu',
        likes: 58,
        is_private: 0
      }
    ],
    messages: [
      {
        id: 1,
        sender_id: 1,
        receiver_id: 2,
        sender_name: 'Mark Administrator',
        receiver_name: 'Budi Santoso',
        content: 'Budi, tolong simpan backup token database di tempat aman ya.',
        created_at: 'Kemarin, 21:00'
      },
      {
        id: 2,
        sender_id: 3,
        receiver_id: 1,
        sender_name: 'Siti Rahma',
        receiver_name: 'Mark Administrator',
        content: 'Mark, tabel rahasia system_secrets di database apakah sudah siap?',
        created_at: 'Kemarin, 22:30'
      },
      {
        id: 3,
        sender_id: 1,
        receiver_id: 3,
        sender_name: 'Mark Administrator',
        receiver_name: 'Siti Rahma',
        content: 'Sudah Siti. Tabel system_secrets hanya bisa diakses via SQL direct access.',
        created_at: 'Hari ini, 07:15'
      }
    ],
    system_secrets: [
      {
        id: 1,
        flag_name: 'FLAG_CHALLENGE_ROOT',
        secret_key: 'KEY_ROOT_9931',
        flag_value: 'FLAG{SQLi_UNION_SELECT_DATABASE_DUMPED_SUCCESS}',
        description: 'Secret flag admin tersimpan di tabel internal system_secrets.'
      },
      {
        id: 2,
        flag_name: 'DATABASE_BACKUP_CRED',
        secret_key: 'DB_REPLICA_TOKEN',
        flag_value: 'FLAG{SUPER_SECRET_ADMIN_TOKEN_X7712}',
        description: 'Token replikasi database rahasia untuk cluster internal.'
      }
    ],
    sqlite_master: [
      {
        type: 'table',
        name: 'users',
        tbl_name: 'users',
        rootpage: 2,
        sql: 'CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, full_name TEXT, email TEXT, password TEXT, role TEXT, bio TEXT, avatar TEXT, created_at TEXT)'
      },
      {
        type: 'table',
        name: 'posts',
        tbl_name: 'posts',
        rootpage: 3,
        sql: 'CREATE TABLE posts (id INTEGER PRIMARY KEY, author TEXT, author_username TEXT, content TEXT, created_at TEXT, likes INTEGER, is_private INTEGER)'
      },
      {
        type: 'table',
        name: 'messages',
        tbl_name: 'messages',
        rootpage: 4,
        sql: 'CREATE TABLE messages (id INTEGER PRIMARY KEY, sender_id INTEGER, receiver_id INTEGER, sender_name TEXT, receiver_name TEXT, content TEXT, created_at TEXT)'
      },
      {
        type: 'table',
        name: 'system_secrets',
        tbl_name: 'system_secrets',
        rootpage: 5,
        sql: 'CREATE TABLE system_secrets (id INTEGER PRIMARY KEY, flag_name TEXT, secret_key TEXT, flag_value TEXT, description TEXT)'
      }
    ]
  };

  class VulnDatabaseEngine {
    constructor() {
      this.queryHistory = [];
      this.resetDatabase();
    }

    resetDatabase() {
      // Salin data secara mendalam (deep copy)
      this.tables = JSON.parse(JSON.stringify(INITIAL_DATA));
      this.logQuery('SYSTEM', '-- Database diinisialisasi ulang dengan data default.', true);
    }

    logQuery(action, sql, success = true, error = null, executionTime = 1) {
      const record = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        action: action,
        sql: sql,
        success: success,
        error: error,
        executionTimeMs: executionTime
      };
      this.queryHistory.unshift(record);
      if (this.queryHistory.length > 50) this.queryHistory.pop();
      
      // Dispatch event agar UI dapat mengupdate HUD secara real-time
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('vuln-db-query', { detail: record });
        window.dispatchEvent(event);
      }
      return record;
    }

    /**
     * Memeriksa sintaks petik SQL untuk menghasilkan SQLite syntax error realistis
     */
    checkQuoteSyntax(sql) {
      // Potong komentar SQL (--)
      const commentIndex = sql.indexOf('--');
      const activeSql = commentIndex !== -1 ? sql.substring(0, commentIndex) : sql;

      // Hitung jumlah tanda petik tunggal '
      let inQuote = false;
      let quoteCount = 0;
      for (let i = 0; i < activeSql.length; i++) {
        if (activeSql[i] === "'") {
          // Tangani escape petik ganda '' di SQLite
          if (i + 1 < activeSql.length && activeSql[i + 1] === "'") {
            i++; // Lewati petik kedua
          } else {
            inQuote = !inQuote;
            quoteCount++;
          }
        }
      }

      if (inQuote) {
        throw new Error(`SQLITE_ERROR: near "'": syntax error (unclosed quotation mark after character string)`);
      }
      return activeSql;
    }

    /**
     * Eksekusi query Login yang rentan
     * Rentan terhadap Auth Bypass: ' OR '1'='1  |  admin' --  |  ' OR 1=1 --
     */
    loginVulnerable(username, password) {
      const startTime = performance.now();
      // Format query rentan (string concatenation tanpa sanitasi)
      const rawSql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}';`;
      
      try {
        const cleanSql = this.checkQuoteSyntax(rawSql);
        const lowerSql = cleanSql.toLowerCase();

        // 1. Cek apakah ada komentar '--'
        const hasComment = rawSql.includes('--');
        
        // 2. Evaluasi payload bypass autentikasi
        // Kondisi A: bypass boolean umum (' OR '1'='1, ' or 1=1, ' OR 'a'='a, dsb.)
        const hasOrTrue = /or\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i.test(cleanSql) ||
                          /or\s+['"]?([a-z0-9])['"]?\s*=\s*['"]?\1['"]?/i.test(cleanSql) ||
                          /or\s+true/i.test(cleanSql);

        // Kondisi B: admin' -- (komentar setelah nama pengguna admin)
        const isAdminComment = /username\s*=\s*'admin'\s*--/i.test(rawSql) || 
                               (cleanSql.includes("username = 'admin'") && hasComment);

        // Kondisi C: nama pengguna lain diikuti komentar ' --
        const isUserCommentMatch = cleanSql.match(/username\s*=\s*'([^']+)'/i);
        const commentedUser = hasComment && isUserCommentMatch ? isUserCommentMatch[1] : null;

        let matchedUser = null;

        if (isAdminComment) {
          // Login langsung sebagai admin
          matchedUser = this.tables.users.find(u => u.username === 'admin');
        } else if (hasOrTrue) {
          // OR 1=1 menghasilkan kondisi benar untuk semua baris, SQLite mengembalikan baris pertama (admin)
          matchedUser = this.tables.users[0];
        } else if (commentedUser) {
          // Login sebagai user tersebut tanpa memeriksa password
          matchedUser = this.tables.users.find(u => u.username === commentedUser || u.email === commentedUser);
        } else {
          // Logika login normal jika tidak ada SQLi
          matchedUser = this.tables.users.find(u => 
            (u.username === username || u.email === username) && u.password === password
          );
        }

        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('LOGIN_QUERY', rawSql, true, null, execTime);

        if (matchedUser) {
          return { success: true, user: matchedUser, rawSql: rawSql };
        } else {
          return { success: false, error: 'Username atau password salah.', rawSql: rawSql };
        }
      } catch (err) {
        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('LOGIN_QUERY', rawSql, false, err.message, execTime);
        return { success: false, error: err.message, rawSql: rawSql, isSqlError: true };
      }
    }

    /**
     * Pencarian Postingan yang rentan (UNION-Based SQL Injection)
     * Query: SELECT id, author, content, created_at, likes FROM posts WHERE content LIKE '%${term}%'
     */
    searchPostsVulnerable(searchTerm) {
      const startTime = performance.now();
      const rawSql = `SELECT id, author, content, created_at, likes FROM posts WHERE content LIKE '%${searchTerm}%';`;

      try {
        const cleanSql = this.checkQuoteSyntax(rawSql);
        const lowerSql = cleanSql.toLowerCase();

        // Cek adanya UNION SELECT
        if (lowerSql.includes('union') && lowerSql.includes('select')) {
          let fromTable = null;
          let columnsStr = '';
          const fromMatch = cleanSql.match(/union\s+(?:all\s+)?select\s+(.+?)\s+from\s+([a-zA-Z0-9_]+)/i);
          if (fromMatch) {
            columnsStr = fromMatch[1].trim();
            fromTable = fromMatch[2].trim().toLowerCase();
          } else {
            const directMatch = cleanSql.match(/union\s+(?:all\s+)?select\s+(.+?)(?:\s*--.*)?$/i);
            if (directMatch) {
              columnsStr = directMatch[1].trim();
            }
          }
          
          if (columnsStr) {
            const requestedCols = columnsStr.split(',').map(c => c.trim().replace(/^['"]|['"]$/g, ''));

            // SQLite mensyaratkan jumlah kolom sama (posts memiliki 5 kolom)
            if (requestedCols.length !== 5) {
              throw new Error(`SQLITE_ERROR: SELECTs to the left and right of UNION do not have the same number of result columns (expected 5, got ${requestedCols.length})`);
            }

            let injectedRows = [];

            if (fromTable === 'users') {
              injectedRows = this.tables.users.map((u, idx) => ({
                id: 9000 + idx,
                author: `[SQLi DUMP] ${u.username} (${u.role})`,
                author_username: u.username,
                content: `Password Hash/Plain: ${u.password} | Email: ${u.email} | Bio: ${u.bio}`,
                created_at: u.created_at,
                likes: 999,
                isInjected: true
              }));
            } else if (fromTable === 'system_secrets') {
              injectedRows = this.tables.system_secrets.map((s, idx) => ({
                id: 8000 + idx,
                author: `[FLAG DUMP] ${s.flag_name}`,
                author_username: 'system',
                content: `Kunci Rahasia: ${s.secret_key} | NILAI FLAG: ${s.flag_value} (${s.description})`,
                created_at: 'Sistem Terbuka',
                likes: 1337,
                isInjected: true
              }));
            } else if (fromTable === 'sqlite_master' || fromTable === 'sqlite_schema') {
              injectedRows = this.tables.sqlite_master.map((m, idx) => ({
                id: 7000 + idx,
                author: `[SCHEMA DUMP] Tabel: ${m.name}`,
                author_username: 'sqlite_master',
                content: `Definisi DDL: ${m.sql}`,
                created_at: `RootPage: ${m.rootpage}`,
                likes: 0,
                isInjected: true
              }));
            } else if (fromTable === 'messages') {
              injectedRows = this.tables.messages.map((m, idx) => ({
                id: 6000 + idx,
                author: `[MSG DUMP] Dari: ${m.sender_name} -> Ke: ${m.receiver_name}`,
                author_username: 'private_msg',
                content: `Pesan Rahasia: ${m.content}`,
                created_at: m.created_at,
                likes: 0,
                isInjected: true
              }));
            } else {
              // UNION dengan nilai statis bebas (misal: ' UNION SELECT 1, 2, 3, 4, 5 --)
              injectedRows.push({
                id: parseInt(requestedCols[0]) || 9999,
                author: requestedCols[1] || 'UNION_COL_2',
                author_username: 'injected',
                content: requestedCols[2] || 'UNION_COL_3',
                created_at: requestedCols[3] || 'UNION_COL_4',
                likes: parseInt(requestedCols[4]) || 0,
                isInjected: true
              });
            }

            const execTime = Math.round(performance.now() - startTime);
            this.logQuery('SEARCH_POSTS_UNION', rawSql, true, null, execTime);
            return { success: true, results: injectedRows, rawSql: rawSql, isUnionInjected: true };
          }
        }

        // Cek jika ada OR 1=1 di dalam pencarian (' or 1=1 --)
        if (/or\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i.test(cleanSql) || /or\s+true/i.test(cleanSql)) {
          const allPosts = [...this.tables.posts];
          const execTime = Math.round(performance.now() - startTime);
          this.logQuery('SEARCH_POSTS_BOOLEAN', rawSql, true, null, execTime);
          return { success: true, results: allPosts, rawSql: rawSql };
        }

        // Pencarian normal
        const normalResults = this.tables.posts.filter(p => 
          p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.author.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('SEARCH_POSTS', rawSql, true, null, execTime);
        return { success: true, results: normalResults, rawSql: rawSql };

      } catch (err) {
        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('SEARCH_POSTS', rawSql, false, err.message, execTime);
        return { success: false, error: err.message, rawSql: rawSql, isSqlError: true };
      }
    }

    /**
     * Mengambil Profil Pengguna berdasarkan ID (Numeric SQL Injection)
     * Query: SELECT id, username, full_name, email, bio, avatar, role FROM users WHERE id = ${id}
     */
    getUserProfileVulnerable(userIdInput) {
      const startTime = performance.now();
      const rawSql = `SELECT id, username, full_name, email, bio, avatar, role FROM users WHERE id = ${userIdInput};`;

      try {
        const cleanSql = this.checkQuoteSyntax(rawSql);
        const lowerSql = cleanSql.toLowerCase();

        // 1. Numeric Boolean OR: 1 OR 1=1
        if (/id\s*=\s*\d*\s*or\s+1\s*=\s*1/i.test(cleanSql) || /or\s+true/i.test(cleanSql)) {
          // Mengembalikan baris pertama (admin) jika kondisi TRUE untuk semua baris
          const execTime = Math.round(performance.now() - startTime);
          this.logQuery('GET_PROFILE_BOOLEAN', rawSql, true, null, execTime);
          return { success: true, user: this.tables.users[0], rawSql: rawSql };
        }

        // 2. UNION SELECT pada numeric ID: -1 UNION SELECT 1, 'Injected', 'Full Injected', ...
        if (lowerSql.includes('union') && lowerSql.includes('select')) {
          const unionMatch = cleanSql.match(/union\s+select\s+(.+?)(\s+from\s+([a-zA-Z0-9_]+))?(\s*--.*)?$/i);
          if (unionMatch) {
            const requestedCols = unionMatch[1].split(',').map(c => c.trim().replace(/^['"]|['"]$/g, ''));
            if (requestedCols.length !== 7) {
              throw new Error(`SQLITE_ERROR: SELECTs to the left and right of UNION do not have the same number of result columns (expected 7, got ${requestedCols.length})`);
            }

            const injectedUser = {
              id: parseInt(requestedCols[0]) || 999,
              username: requestedCols[1] || 'injected_user',
              full_name: requestedCols[2] || 'Injected Account',
              email: requestedCols[3] || 'pwned@sqli.test',
              bio: requestedCols[4] || 'Akun ini berhasil dimanipulasi via UNION SELECT!',
              avatar: requestedCols[5] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              role: requestedCols[6] || 'administrator',
              isInjected: true
            };

            const execTime = Math.round(performance.now() - startTime);
            this.logQuery('GET_PROFILE_UNION', rawSql, true, null, execTime);
            return { success: true, user: injectedUser, rawSql: rawSql };
          }
        }

        // Jika input bukan angka murni dan bukan SQLi yang terdeteksi
        const cleanNum = parseInt(cleanSql.replace(/[^0-9-]/g, ''));
        const user = this.tables.users.find(u => u.id === cleanNum);

        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('GET_PROFILE', rawSql, true, null, execTime);

        if (user) {
          return { success: true, user: user, rawSql: rawSql };
        } else {
          return { success: false, error: `Pengguna dengan ID ${userIdInput} tidak ditemukan.`, rawSql: rawSql };
        }
      } catch (err) {
        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('GET_PROFILE', rawSql, false, err.message, execTime);
        return { success: false, error: err.message, rawSql: rawSql, isSqlError: true };
      }
    }

    /**
     * Membaca pesan pribadi (Private Messages) dengan filter keyword rentan
     * Query: SELECT * FROM messages WHERE (sender_id = ${uid} OR receiver_id = ${uid}) AND content LIKE '%${keyword}%'
     */
    searchMessagesVulnerable(userId, keyword) {
      const startTime = performance.now();
      const rawSql = `SELECT * FROM messages WHERE (sender_id = ${userId} OR receiver_id = ${userId}) AND content LIKE '%${keyword}%';`;

      try {
        const cleanSql = this.checkQuoteSyntax(rawSql);
        
        // Jika ada bypass petik dan OR 1=1: ' OR 1=1 --
        if (/or\s+1\s*=\s*1/i.test(cleanSql) || /or\s+true/i.test(cleanSql)) {
          // Tampilkan SELURUH pesan rahasia semua user! (Privilege escalation)
          const execTime = Math.round(performance.now() - startTime);
          this.logQuery('SEARCH_MESSAGES_LEAK', rawSql, true, null, execTime);
          return { success: true, messages: this.tables.messages, rawSql: rawSql, isLeaked: true };
        }

        const filtered = this.tables.messages.filter(m => 
          (m.sender_id === userId || m.receiver_id === userId) &&
          m.content.toLowerCase().includes(keyword.toLowerCase())
        );

        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('SEARCH_MESSAGES', rawSql, true, null, execTime);
        return { success: true, messages: filtered, rawSql: rawSql };
      } catch (err) {
        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('SEARCH_MESSAGES', rawSql, false, err.message, execTime);
        return { success: false, error: err.message, rawSql: rawSql, isSqlError: true };
      }
    }

    /**
     * Eksekusi langsung query SQL murni dari Terminal Inspector
     */
    executeRawSql(sql) {
      const startTime = performance.now();
      const trimmed = sql.trim().replace(/;+$/, '');
      const lower = trimmed.toLowerCase();

      try {
        this.checkQuoteSyntax(trimmed);

        if (lower.startsWith('select')) {
          if (lower.includes('from sqlite_master') || lower.includes('from sqlite_schema')) {
            const execTime = Math.round(performance.now() - startTime);
            this.logQuery('RAW_SQL_MASTER', trimmed, true, null, execTime);
            return { success: true, data: this.tables.sqlite_master };
          }
          if (lower.includes('from users')) {
            const execTime = Math.round(performance.now() - startTime);
            this.logQuery('RAW_SQL_USERS', trimmed, true, null, execTime);
            return { success: true, data: this.tables.users };
          }
          if (lower.includes('from posts')) {
            const execTime = Math.round(performance.now() - startTime);
            this.logQuery('RAW_SQL_POSTS', trimmed, true, null, execTime);
            return { success: true, data: this.tables.posts };
          }
          if (lower.includes('from system_secrets')) {
            const execTime = Math.round(performance.now() - startTime);
            this.logQuery('RAW_SQL_SECRETS', trimmed, true, null, execTime);
            return { success: true, data: this.tables.system_secrets };
          }
          if (lower.includes('from messages')) {
            const execTime = Math.round(performance.now() - startTime);
            this.logQuery('RAW_SQL_MESSAGES', trimmed, true, null, execTime);
            return { success: true, data: this.tables.messages };
          }
        }

        throw new Error(`Sintaks query tidak dikenali atau tabel tidak ditemukan di emulator.`);
      } catch (err) {
        const execTime = Math.round(performance.now() - startTime);
        this.logQuery('RAW_SQL_ERROR', trimmed, false, err.message, execTime);
        return { success: false, error: err.message };
      }
    }

    /**
     * Tambah postingan baru
     */
    addPost(authorName, username, content) {
      const newPost = {
        id: this.tables.posts.length + 1,
        author: authorName,
        author_username: username,
        content: content,
        created_at: 'Baru saja',
        likes: 0,
        is_private: 0
      };
      this.tables.posts.unshift(newPost);
      const rawSql = `INSERT INTO posts (author, author_username, content, created_at, likes, is_private) VALUES ('${authorName}', '${username}', '${content}', datetime('now'), 0, 0);`;
      this.logQuery('INSERT_POST', rawSql, true, null, 2);
      return newPost;
    }
  }

  // Daftarkan instance singleton ke window global
  window.VulnDB = new VulnDatabaseEngine();

})(window);
