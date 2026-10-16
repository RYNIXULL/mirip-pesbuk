/**
 * Vulnerable Facebook Web Application Logic
 * Menangani state, interaksi UI, Toast Notification khusus, Modal, dan sinkronisasi SQLi HUD.
 */

(function () {
  'use strict';

  // State Aplikasi
  const state = {
    currentUser: null,
    activeTab: 'feed', // 'feed' | 'directory' | 'messages' | 'terminal'
    currentSearchTerm: '',
    searchFilterActive: false,
    completedMissions: {
      auth_bypass: false,
      syntax_error: false,
      union_dump: false,
      flag_extracted: false,
      message_leak: false
    }
  };

  // Referensi DOM Elemen
  const DOM = {};

  // Inisialisasi setelah DOM siap
  document.addEventListener('DOMContentLoaded', () => {
    cacheDomElements();
    attachEventListeners();
    setupQueryListener();
    initDefaultUser();
    renderFeed();
    updateMissionsUI();
  });

  function cacheDomElements() {
    DOM.toastContainer = document.getElementById('toast-container');
    DOM.loginModal = document.getElementById('login-modal');
    DOM.loginForm = document.getElementById('login-form');
    DOM.loginUsername = document.getElementById('login-username');
    DOM.loginPassword = document.getElementById('login-password');
    DOM.loginErrorBox = document.getElementById('login-error-box');
    DOM.loginSqlPreview = document.getElementById('login-sql-preview');
    
    // Navbar & User Info
    DOM.navUserAvatar = document.getElementById('nav-user-avatar');
    DOM.navUserName = document.getElementById('nav-user-name');
    DOM.navUserRole = document.getElementById('nav-user-role');
    DOM.globalSearchInput = document.getElementById('global-search-input');
    DOM.globalSearchBtn = document.getElementById('global-search-btn');

    // Sidebar
    DOM.sideUserAvatar = document.getElementById('side-user-avatar');
    DOM.sideUserName = document.getElementById('side-user-name');
    DOM.sideUserHandle = document.getElementById('side-user-handle');
    DOM.sideUserRole = document.getElementById('side-user-role');
    DOM.sideUserBio = document.getElementById('side-user-bio');

    // Feed & Views
    DOM.feedContainer = document.getElementById('feed-container');
    DOM.searchBanner = document.getElementById('search-banner');
    DOM.searchBannerQuery = document.getElementById('search-banner-query');
    DOM.postInput = document.getElementById('post-input');
    DOM.btnCreatePost = document.getElementById('btn-create-post');

    // Views Containers
    DOM.viewFeed = document.getElementById('view-feed');
    DOM.viewDirectory = document.getElementById('view-directory');
    DOM.viewMessages = document.getElementById('view-messages');
    DOM.viewTerminal = document.getElementById('view-terminal');

    // HUD & Inspector
    DOM.hudRawSql = document.getElementById('hud-raw-sql');
    DOM.hudStatusBadge = document.getElementById('hud-status-badge');
    DOM.hudExecTime = document.getElementById('hud-exec-time');
    DOM.hudErrorDetails = document.getElementById('hud-error-details');
    DOM.hudVulnerablePattern = document.getElementById('hud-vulnerable-pattern');

    // Directory View Elements
    DOM.dirUserIdInput = document.getElementById('dir-user-id-input');
    DOM.btnDirSearch = document.getElementById('btn-dir-search');
    DOM.dirResultCard = document.getElementById('dir-result-card');

    // Messages View Elements
    DOM.msgKeywordInput = document.getElementById('msg-keyword-input');
    DOM.btnMsgSearch = document.getElementById('btn-msg-search');
    DOM.msgListContainer = document.getElementById('msg-list-container');

    // Terminal View Elements
    DOM.terminalSqlInput = document.getElementById('terminal-sql-input');
    DOM.btnTerminalExec = document.getElementById('btn-terminal-exec');
    DOM.terminalOutput = document.getElementById('terminal-output');
  }

  function initDefaultUser() {
    // Mulai dengan akun Budi Santoso sebagai pengguna standar
    state.currentUser = window.VulnDB.tables.users.find(u => u.username === 'budi_santoso');
    updateUserUI();
  }

  function updateUserUI() {
    if (!state.currentUser) {
      showLoginModal();
      return;
    }

    const u = state.currentUser;
    if (DOM.navUserAvatar) DOM.navUserAvatar.src = u.avatar;
    if (DOM.navUserName) DOM.navUserName.textContent = u.full_name;
    if (DOM.navUserRole) {
      DOM.navUserRole.textContent = u.role === 'administrator' ? 'ADMIN' : 'USER';
      DOM.navUserRole.className = u.role === 'administrator' 
        ? 'text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200' 
        : 'text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200';
    }

    if (DOM.sideUserAvatar) DOM.sideUserAvatar.src = u.avatar;
    if (DOM.sideUserName) DOM.sideUserName.textContent = u.full_name;
    if (DOM.sideUserHandle) DOM.sideUserHandle.textContent = '@' + u.username;
    if (DOM.sideUserBio) DOM.sideUserBio.textContent = u.bio;
    if (DOM.sideUserRole) {
      DOM.sideUserRole.textContent = u.role === 'administrator' ? 'Administrator Akun' : 'Pengguna Standar';
    }
  }

  // ==========================================
  // CUSTOM TOAST NOTIFICATION (Pengganti Alert)
  // ==========================================
  window.showToast = function (type, title, message, duration = 4000) {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'flex items-start gap-3 p-4 rounded-xl shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 max-w-md w-full border backdrop-blur-md pointer-events-auto';

    let iconSvg = '';
    let colorStyles = '';

    if (type === 'success') {
      colorStyles = 'bg-white/90 border-emerald-300 text-slate-800 shadow-emerald-500/10';
      iconSvg = `<svg class="w-6 h-6 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`;
    } else if (type === 'error') {
      colorStyles = 'bg-white/95 border-rose-300 text-slate-800 shadow-rose-500/15';
      iconSvg = `<svg class="w-6 h-6 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>`;
    } else if (type === 'warning') {
      colorStyles = 'bg-white/90 border-amber-300 text-slate-800 shadow-amber-500/10';
      iconSvg = `<svg class="w-6 h-6 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`;
    } else {
      colorStyles = 'bg-white/90 border-blue-300 text-slate-800 shadow-blue-500/10';
      iconSvg = `<svg class="w-6 h-6 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`;
    }

    toast.classList.add(...colorStyles.split(' '));
    toast.innerHTML = `
      ${iconSvg}
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-bold text-slate-900">${escapeHtml(title)}</h4>
        <p class="text-xs text-slate-600 mt-0.5 break-words font-mono leading-relaxed">${escapeHtml(message)}</p>
      </div>
      <button class="text-slate-400 hover:text-slate-700 transition p-1" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;

    DOM.toastContainer.appendChild(toast);

    // Animasi Masuk
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Otomatis tutup setelah durasi
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  // ==========================================
  // REAL-TIME SQL QUERY HUD & MONITOR
  // ==========================================
  function setupQueryListener() {
    window.addEventListener('vuln-db-query', (e) => {
      const q = e.detail;
      updateHudUI(q);
      evaluateMissions(q);
    });
  }

  function updateHudUI(queryRecord) {
    if (!DOM.hudRawSql) return;

    // Format tampilan query dengan highlight merah pada input rentan
    DOM.hudRawSql.textContent = queryRecord.sql;

    if (queryRecord.success) {
      DOM.hudStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1';
      DOM.hudStatusBadge.innerHTML = `
        <svg class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Berhasil Dieksekusi
      `;
      DOM.hudErrorDetails.classList.add('hidden');
    } else {
      DOM.hudStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1';
      DOM.hudStatusBadge.innerHTML = `
        <svg class="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        SQLite Syntax Error
      `;
      DOM.hudErrorDetails.textContent = queryRecord.error || 'Terjadi kesalahan sintaks SQL.';
      DOM.hudErrorDetails.classList.remove('hidden');
    }

    if (DOM.hudExecTime) {
      DOM.hudExecTime.textContent = `${queryRecord.executionTimeMs} ms`;
    }
  }

  // ==========================================
  // EVALUASI MISI LAB SQL INJECTION
  // ==========================================
  function evaluateMissions(queryRecord) {
    const sql = queryRecord.sql;

    // Misi 1: Bypass Login Autentikasi
    if (queryRecord.action === 'LOGIN_QUERY' && queryRecord.success && state.currentUser && state.currentUser.role === 'administrator') {
      if (!state.completedMissions.auth_bypass) {
        state.completedMissions.auth_bypass = true;
        showToast('success', 'Misi 1 Selesai!', 'Berhasil login sebagai Administrator tanpa memasukkan kata sandi asli!');
      }
    }

    // Misi 2: Pancing SQL Syntax Error dengan petik tunggal
    if (!queryRecord.success && queryRecord.error && queryRecord.error.includes('SQLITE_ERROR')) {
      if (!state.completedMissions.syntax_error) {
        state.completedMissions.syntax_error = true;
        showToast('warning', 'Misi 2 Selesai!', 'Sintaks error terpicu! Aplikasi terbukti membocorkan pesan error database mentah.');
      }
    }

    // Misi 3: Dump tabel users via UNION SELECT
    if (queryRecord.action === 'SEARCH_POSTS_UNION' && sql.toLowerCase().includes('from users')) {
      if (!state.completedMissions.union_dump) {
        state.completedMissions.union_dump = true;
        showToast('success', 'Misi 3 Selesai!', 'Data tabel users dan kata sandi berhasil diekstrak melalui UNION SELECT!');
      }
    }

    // Misi 4: Ekstraksi Flag Rahasia dari tabel system_secrets
    if (queryRecord.action === 'SEARCH_POSTS_UNION' && sql.toLowerCase().includes('from system_secrets')) {
      if (!state.completedMissions.flag_extracted) {
        state.completedMissions.flag_extracted = true;
        showToast('success', 'Misi 4 Selesai!', 'FLAG Rahasia ditemukan! Anda berhasil membaca tabel rahasia sistem.');
      }
    }

    // Misi 5: Akses pesan rahasia / leak pesan
    if (queryRecord.action === 'SEARCH_MESSAGES_LEAK') {
      if (!state.completedMissions.message_leak) {
        state.completedMissions.message_leak = true;
        showToast('success', 'Misi 5 Selesai!', 'Seluruh percakapan rahasia antara Mark dan Siti bocor via SQL Injection!');
      }
    }

    updateMissionsUI();
  }

  function updateMissionsUI() {
    const keys = ['auth_bypass', 'syntax_error', 'union_dump', 'flag_extracted', 'message_leak'];
    keys.forEach(k => {
      const el = document.getElementById(`mission-check-${k}`);
      if (el) {
        if (state.completedMissions[k]) {
          el.className = 'w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center';
          el.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`;
        } else {
          el.className = 'w-5 h-5 rounded-md border-2 border-slate-300 flex items-center justify-center';
          el.innerHTML = '';
        }
      }
    });

    const completedCount = Object.values(state.completedMissions).filter(Boolean).length;
    const progressEl = document.getElementById('mission-progress-text');
    const barEl = document.getElementById('mission-progress-bar');
    if (progressEl) progressEl.textContent = `${completedCount} / 5 Misi`;
    if (barEl) barEl.style.width = `${(completedCount / 5) * 100}%`;
  }

  // ==========================================
  // EVENT LISTENERS & UI HANDLERS
  // ==========================================
  function attachEventListeners() {
    // Navigasi Tab
    document.querySelectorAll('[data-nav-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-nav-target');
        switchTab(target);
      });
    });

    // Tombol Ganti Akun / Login Modal
    const btnSwitchAccount = document.getElementById('btn-switch-account');
    if (btnSwitchAccount) {
      btnSwitchAccount.addEventListener('click', () => showLoginModal());
    }

    const btnNavLogin = document.getElementById('btn-nav-login');
    if (btnNavLogin) {
      btnNavLogin.addEventListener('click', () => showLoginModal());
    }

    // Tutup Login Modal
    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => hideLoginModal());
    }

    // Submit Form Login
    if (DOM.loginForm) {
      DOM.loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Live update SQL preview saat mengetik di form login
    if (DOM.loginUsername && DOM.loginPassword && DOM.loginSqlPreview) {
      const updatePreview = () => {
        const u = DOM.loginUsername.value || '';
        const p = DOM.loginPassword.value || '';
        DOM.loginSqlPreview.textContent = `SELECT * FROM users WHERE username = '${u}' AND password = '${p}';`;
      };
      DOM.loginUsername.addEventListener('input', updatePreview);
      DOM.loginPassword.addEventListener('input', updatePreview);
    }

    // Pencarian Global (Search Bar Navbar)
    if (DOM.globalSearchBtn) {
      DOM.globalSearchBtn.addEventListener('click', handleGlobalSearch);
    }
    if (DOM.globalSearchInput) {
      DOM.globalSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleGlobalSearch();
      });
    }

    // Tombol Reset Pencarian pada Banner
    const btnClearSearch = document.getElementById('btn-clear-search');
    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        DOM.globalSearchInput.value = '';
        state.searchFilterActive = false;
        state.currentSearchTerm = '';
        DOM.searchBanner.classList.add('hidden');
        renderFeed();
        showToast('info', 'Pencarian Direset', 'Menampilkan linimasa postingan standar.');
      });
    }

    // Tambah Postingan Baru
    if (DOM.btnCreatePost) {
      DOM.btnCreatePost.addEventListener('click', () => {
        const content = DOM.postInput.value.trim();
        if (!content) {
          showToast('warning', 'Peringatan', 'Isi postingan tidak boleh kosong.');
          return;
        }

        window.VulnDB.addPost(state.currentUser.full_name, state.currentUser.username, content);
        DOM.postInput.value = '';
        renderFeed();
        showToast('success', 'Diposting', 'Status Anda berhasil dibagikan ke linimasa.');
      });
    }

    // Reset Database
    const btnResetDb = document.getElementById('btn-reset-db');
    if (btnResetDb) {
      btnResetDb.addEventListener('click', () => {
        window.VulnDB.resetDatabase();
        initDefaultUser();
        renderFeed();
        showToast('info', 'Database Direset', 'Semua data telah dikembalikan ke kondisi awal.');
      });
    }

    // Direktori Pengguna (Numeric SQLi)
    if (DOM.btnDirSearch) {
      DOM.btnDirSearch.addEventListener('click', handleDirSearch);
    }

    // Pencarian Pesan Pribadi
    if (DOM.btnMsgSearch) {
      DOM.btnMsgSearch.addEventListener('click', handleMsgSearch);
    }

    // Eksekusi Terminal SQL Langsung
    if (DOM.btnTerminalExec) {
      DOM.btnTerminalExec.addEventListener('click', handleTerminalExec);
    }

    // Tombol Quick Payload (Cheat Sheet)
    document.querySelectorAll('[data-quick-payload]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const payload = e.currentTarget.getAttribute('data-quick-payload');
        const targetInput = e.currentTarget.getAttribute('data-target-input');

        if (targetInput === 'login') {
          showLoginModal();
          DOM.loginUsername.value = payload;
          DOM.loginPassword.value = 'bebas_sembarang';
          DOM.loginUsername.dispatchEvent(new Event('input'));
          showToast('info', 'Payload Ditempel', `Payload "${payload}" disiapkan di kolom login.`);
        } else if (targetInput === 'search') {
          switchTab('feed');
          DOM.globalSearchInput.value = payload;
          handleGlobalSearch();
          showToast('info', 'Pencarian SQLi Dijalankan', `Mengeksekusi: ${payload}`);
        } else if (targetInput === 'directory') {
          switchTab('directory');
          DOM.dirUserIdInput.value = payload;
          handleDirSearch();
          showToast('info', 'Numeric SQLi Dijalankan', `Mengeksekusi: ${payload}`);
        } else if (targetInput === 'messages') {
          switchTab('messages');
          DOM.msgKeywordInput.value = payload;
          handleMsgSearch();
          showToast('info', 'Message SQLi Dijalankan', `Mengeksekusi: ${payload}`);
        }
      });
    });

    // Pilihan Akun Cepat di Sidebar
    document.querySelectorAll('[data-switch-to-user]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetUsername = e.currentTarget.getAttribute('data-switch-to-user');
        const found = window.VulnDB.tables.users.find(u => u.username === targetUsername);
        if (found) {
          state.currentUser = found;
          updateUserUI();
          showToast('success', 'Akun Dialihkan', `Masuk sebagai ${found.full_name} (${found.role}).`);
        }
      });
    });
  }

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  function switchTab(tabId) {
    state.activeTab = tabId;

    // Atur kelas tombol nav
    document.querySelectorAll('[data-nav-target]').forEach(btn => {
      const target = btn.getAttribute('data-nav-target');
      if (target === tabId) {
        btn.classList.add('text-blue-600', 'border-blue-600', 'bg-blue-50/50');
        btn.classList.remove('text-slate-500', 'border-transparent');
      } else {
        btn.classList.remove('text-blue-600', 'border-blue-600', 'bg-blue-50/50');
        btn.classList.add('text-slate-500', 'border-transparent');
      }
    });

    // Atur visibilitas kontainer tampilan
    if (DOM.viewFeed) DOM.viewFeed.classList.toggle('hidden', tabId !== 'feed');
    if (DOM.viewDirectory) DOM.viewDirectory.classList.toggle('hidden', tabId !== 'directory');
    if (DOM.viewMessages) DOM.viewMessages.classList.toggle('hidden', tabId !== 'messages');
    if (DOM.viewTerminal) DOM.viewTerminal.classList.toggle('hidden', tabId !== 'terminal');

    if (tabId === 'messages') {
      loadMessagesList();
    }
  }

  // ==========================================
  // LOGIN MODAL & SUBMIT
  // ==========================================
  function showLoginModal() {
    if (DOM.loginModal) {
      DOM.loginModal.classList.remove('hidden');
      DOM.loginModal.classList.add('flex');
    }
  }

  function hideLoginModal() {
    if (DOM.loginModal) {
      DOM.loginModal.classList.add('hidden');
      DOM.loginModal.classList.remove('flex');
    }
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    const username = DOM.loginUsername.value;
    const password = DOM.loginPassword.value;

    const result = window.VulnDB.loginVulnerable(username, password);

    if (result.success && result.user) {
      state.currentUser = result.user;
      updateUserUI();
      hideLoginModal();

      if (username.includes("'") || username.includes("--")) {
        if (!state.completedMissions.auth_bypass) {
          state.completedMissions.auth_bypass = true;
          updateMissionsUI();
        }
        showToast('success', 'SQL Injection Berhasil!', `Bypass login sukses! Anda masuk sebagai ${result.user.full_name} (${result.user.role}).`);
      } else {
        showToast('success', 'Login Berhasil', `Selamat datang kembali, ${result.user.full_name}.`);
      }
      renderFeed();
    } else {
      if (result.isSqlError) {
        showToast('error', 'Database Syntax Error!', result.error, 6000);
      } else {
        showToast('error', 'Login Gagal', result.error || 'Username atau password salah.');
      }
    }
  }

  // ==========================================
  // PENCARIAN GLOBAL (UNION SQLi)
  // ==========================================
  function handleGlobalSearch() {
    const query = DOM.globalSearchInput.value.trim();
    if (!query) {
      state.searchFilterActive = false;
      state.currentSearchTerm = '';
      if (DOM.searchBanner) DOM.searchBanner.classList.add('hidden');
      renderFeed();
      return;
    }

    state.searchFilterActive = true;
    state.currentSearchTerm = query;

    const result = window.VulnDB.searchPostsVulnerable(query);

    if (DOM.searchBanner && DOM.searchBannerQuery) {
      DOM.searchBannerQuery.textContent = query;
      DOM.searchBanner.classList.remove('hidden');
    }

    if (result.success) {
      renderPostsList(result.results);
      if (result.isUnionInjected) {
        showToast('success', 'UNION SELECT Berhasil!', `Data dari tabel target berhasil diekstrak dan disuntikkan ke tampilan feed.`);
      } else {
        showToast('info', 'Pencarian Selesai', `Ditemukan ${result.results.length} hasil postingan.`);
      }
    } else {
      renderPostsList([]);
      showToast('error', 'SQLite Error!', result.error, 6000);
    }
  }

  // ==========================================
  // RENDER FEED & POSTS
  // ==========================================
  function renderFeed() {
    if (!DOM.feedContainer) return;
    const posts = window.VulnDB.tables.posts;
    renderPostsList(posts);
  }

  function renderPostsList(posts) {
    if (!DOM.feedContainer) return;
    DOM.feedContainer.innerHTML = '';

    if (!posts || posts.length === 0) {
      DOM.feedContainer.innerHTML = `
        <div class="bg-white/60 backdrop-blur-md rounded-2xl p-8 border border-white/60 shadow-sm text-center">
          <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p class="text-sm font-semibold text-slate-700">Tidak ada postingan yang sesuai</p>
          <p class="text-xs text-slate-500 mt-1">Gunakan payload SQLi atau bersihkan kolom pencarian.</p>
        </div>
      `;
      return;
    }

    posts.forEach(post => {
      const card = document.createElement('div');
      card.className = post.isInjected 
        ? 'bg-amber-50/90 backdrop-blur-md rounded-2xl p-5 border-2 border-amber-300 shadow-md transition-all hover:shadow-lg'
        : 'bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm transition-all hover:shadow-md';

      const badgeHtml = post.isInjected 
        ? `<div class="mb-3 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 text-xs font-mono font-bold flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              DATA HASIL INJEKSI UNION SELECT
            </span>
            <span class="text-[10px] text-amber-700 uppercase">Ekstraksi Memori</span>
          </div>`
        : '';

      card.innerHTML = `
        ${badgeHtml}
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 overflow-hidden shrink-0">
              ${post.isInjected ? 'SQL' : (post.author ? post.author.charAt(0) : 'U')}
            </div>
            <div>
              <h4 class="font-bold text-sm text-slate-800">${escapeHtml(post.author || 'Anonim')}</h4>
              <p class="text-xs text-slate-400">@${escapeHtml(post.author_username || 'user')} &bull; ${post.created_at}</p>
            </div>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            ID: #${post.id}
          </span>
        </div>
        <div class="text-sm text-slate-700 mb-4 leading-relaxed font-sans ${post.isInjected ? 'font-mono bg-amber-100/50 p-3 rounded-lg border border-amber-200 text-amber-950 font-semibold text-xs' : ''}">
          ${escapeHtml(post.content)}
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs text-slate-500">
          <button class="flex items-center gap-1.5 hover:text-blue-600 font-semibold transition" onclick="window.showToast('info', 'Suka', 'Anda menyukai postingan ini.')">
            <svg class="w-4 h-4 text-slate-400 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span>${post.likes || 0} Suka</span>
          </button>
          <button class="flex items-center gap-1.5 hover:text-blue-600 font-semibold transition" onclick="window.showToast('info', 'Komentar', 'Fitur komentar hanya untuk pengguna terverifikasi.')">
            <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Komentari</span>
          </button>
          <button class="flex items-center gap-1.5 hover:text-blue-600 font-semibold transition" onclick="window.showToast('info', 'Bagikan', 'Tautan postingan berhasil disalin ke clipboard.')">
            <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Bagikan</span>
          </button>
        </div>
      `;

      DOM.feedContainer.appendChild(card);
    });
  }

  // ==========================================
  // DIREKTORI PENGGUNA (Numeric SQLi)
  // ==========================================
  function handleDirSearch() {
    const rawInput = DOM.dirUserIdInput.value.trim();
    if (!rawInput) {
      showToast('warning', 'Input Kosong', 'Masukkan ID pengguna atau payload numeric SQLi.');
      return;
    }

    const result = window.VulnDB.getUserProfileVulnerable(rawInput);

    if (result.success && result.user) {
      const u = result.user;
      DOM.dirResultCard.innerHTML = `
        <div class="flex items-center gap-4 mb-4">
          <img src="${u.avatar}" class="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover" alt="Avatar">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-lg text-slate-900">${escapeHtml(u.full_name)}</h3>
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${u.role === 'administrator' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}">
                ${u.role}
              </span>
            </div>
            <p class="text-xs text-slate-500 font-mono">@${escapeHtml(u.username)} &bull; ${escapeHtml(u.email)}</p>
          </div>
        </div>
        <div class="bg-white/80 p-3.5 rounded-xl border border-white/60 mb-4 text-xs text-slate-700 leading-relaxed">
          <p class="font-semibold text-slate-900 mb-1">Tentang Pengguna:</p>
          <p>${escapeHtml(u.bio)}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div><span class="text-slate-400">ID Database:</span> <span class="font-bold text-slate-800">${u.id}</span></div>
          <div><span class="text-slate-400">Status:</span> <span class="text-emerald-600 font-bold">Terverifikasi</span></div>
        </div>
      `;
      DOM.dirResultCard.classList.remove('hidden');

      if (u.isInjected) {
        showToast('success', 'Numeric SQLi Berhasil!', `Data pengguna berhasil disuntikkan secara dinamis!`);
      } else {
        showToast('info', 'Pengguna Ditemukan', `Memuat data profil untuk ID ${rawInput}.`);
      }
    } else {
      DOM.dirResultCard.innerHTML = `
        <div class="text-center py-6 text-rose-600">
          <svg class="w-10 h-10 mx-auto mb-2 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="font-bold text-sm">Kesalahan Query Database</p>
          <p class="text-xs font-mono mt-1 text-slate-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">${escapeHtml(result.error)}</p>
        </div>
      `;
      DOM.dirResultCard.classList.remove('hidden');
      showToast('error', 'Query Gagal', result.error, 6000);
    }
  }

  // ==========================================
  // PESAN PRIBADI (Privilege Escalation SQLi)
  // ==========================================
  function loadMessagesList() {
    if (!state.currentUser) return;
    const result = window.VulnDB.searchMessagesVulnerable(state.currentUser.id, '');
    renderMessagesList(result.messages || []);
  }

  function handleMsgSearch() {
    const keyword = DOM.msgKeywordInput.value.trim();
    const result = window.VulnDB.searchMessagesVulnerable(state.currentUser.id, keyword);

    if (result.success) {
      renderMessagesList(result.messages || []);
      if (result.isLeaked) {
        showToast('success', 'Bocor!', 'Seluruh percakapan rahasia berhasil dibocorkan via SQL Injection!');
      } else {
        showToast('info', 'Pesan Difilter', `Ditemukan ${result.messages.length} pesan.`);
      }
    } else {
      renderMessagesList([]);
      showToast('error', 'SQLite Error!', result.error, 6000);
    }
  }

  function renderMessagesList(messages) {
    if (!DOM.msgListContainer) return;
    DOM.msgListContainer.innerHTML = '';

    if (!messages || messages.length === 0) {
      DOM.msgListContainer.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-xs font-mono">
          Tidak ada percakapan pribadi yang ditemukan.
        </div>
      `;
      return;
    }

    messages.forEach(m => {
      const isFromAdmin = m.sender_name.toLowerCase().includes('admin');
      const item = document.createElement('div');
      item.className = 'p-3.5 rounded-xl border transition-all ' + 
        (isFromAdmin 
          ? 'bg-rose-50/70 border-rose-200 text-slate-800' 
          : 'bg-white/70 border-white/60 text-slate-800');

      item.innerHTML = `
        <div class="flex items-center justify-between text-xs mb-1.5">
          <span class="font-bold ${isFromAdmin ? 'text-rose-700' : 'text-blue-700'}">
            ${escapeHtml(m.sender_name)} &rarr; ${escapeHtml(m.receiver_name)}
          </span>
          <span class="text-[10px] text-slate-400 font-mono">${m.created_at}</span>
        </div>
        <p class="text-xs text-slate-700 leading-relaxed font-sans">${escapeHtml(m.content)}</p>
      `;

      DOM.msgListContainer.appendChild(item);
    });
  }

  // ==========================================
  // TERMINAL SQL LANGSUNG
  // ==========================================
  function handleTerminalExec() {
    const query = DOM.terminalSqlInput.value.trim();
    if (!query) {
      showToast('warning', 'Input Kosong', 'Tuliskan query SQL yang ingin diuji.');
      return;
    }

    const res = window.VulnDB.executeRawSql(query);

    if (res.success) {
      DOM.terminalOutput.textContent = JSON.stringify(res.data, null, 2);
      showToast('success', 'Eksekusi Berhasil', 'Query SQL sukses dijalankan.');
    } else {
      DOM.terminalOutput.textContent = `ERROR:\n${res.error}`;
      showToast('error', 'Eksekusi Gagal', res.error, 6000);
    }
  }

  // Utilitas Helper: Mencegah XSS murni saat rendering
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
