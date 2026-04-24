// ======================== GLOBAL VARIABLES ========================
let mainData = null;
let babData = null;
let closingData = null;
let chapters = [];
let currentPageId = 'homePage';
let darkMode = localStorage.getItem('theme') === 'dark';

// ======================== LOAD DATA FROM JSON ========================
async function loadAllData() {
    try {
        const [mainRes, babRes, closingRes] = await Promise.all([
            fetch('assets/teks/main.json'),
            fetch('assets/teks/bab1_7.json'),
            fetch('assets/teks/closing.json')
        ]);

        if (!mainRes.ok || !babRes.ok || !closingRes.ok) {
            throw new Error('Gagal memuat salah satu file JSON');
        }

        mainData = await mainRes.json();
        babData = await babRes.json();
        closingData = await closingRes.json();

        // Update subtitle dari main.json
        const mainSubtitle = document.getElementById('mainSubtitle');
        if (mainSubtitle && mainData.main) {
            mainSubtitle.textContent = mainData.main.subjudul;
        }

        chapters = [
            { id: "pendahuluan", title: "📖 Pendahuluan" },
            { id: "bab1", title: "⚔️ Bab 1: Manajemen Risiko" },
            { id: "bab2", title: "📊 Bab 2: Alokasi Aset" },
            { id: "bab3", title: "⏳ Bab 3: Kekuatan Waktu" },
            { id: "bab4", title: "🧠 Bab 4: Psikologi Investor" },
            { id: "bab5", title: "🏛️ Bab 5: Piramida Keuangan" },
            { id: "bab6", title: "📐 Bab 6: Implementasi" },
            { id: "bab7", title: "🔥 Bab 7: Konsistensi & Kedisiplinan" },
            { id: "kesimpulan", title: "🎯 Kesimpulan" }
        ];

        initApp();
    } catch (err) {
        console.error('Gagal memuat data JSON:', err);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: Inter, sans-serif;">
                <h2 style="color: #E74C3C;">⚠️ Gagal memuat konten</h2>
                <p>Pastikan file JSON tersedia di folder <strong>assets/teks/</strong></p>
                <p style="font-size: 0.9rem; color: #7F8C8D;">Error: ${err.message}</p>
            </div>
        `;
    }
}

// ======================== MARKDOWN TABLE TO TAB WIDGET PARSER ========================
function parseMarkdownTableToTabWidget(tableText) {
    const trimmed = tableText.trim();
    if (!trimmed) return '';

    const lines = trimmed.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) {
        return `<pre class="fallback-table">${escapeHtml(trimmed)}</pre>`;
    }

    function splitRow(row) {
        let cleaned = row.trim();
        if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
        if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);
        return cleaned.split('|').map(cell => cell.trim());
    }

    const headers = splitRow(lines[0]);
    if (headers.length === 0) {
        return `<pre class="fallback-table">${escapeHtml(trimmed)}</pre>`;
    }

    // Cari baris pemisah (---) untuk menentukan awal data
    let dataStart = 1;
    if (lines[1] && /^[\s\-|]+$/.test(lines[1]) && lines[1].includes('---')) {
        dataStart = 2;
    }

    const rows = [];
    for (let i = dataStart; i < lines.length; i++) {
        const cells = splitRow(lines[i]);
        if (cells.length > 0) rows.push(cells);
    }

    if (rows.length === 0) {
        return `<pre class="fallback-table">${escapeHtml(trimmed)}</pre>`;
    }

    let tabHeadersHtml = `<div class="tab-headers">`;
    let panesHtml = `<div class="tab-content">`;

    headers.forEach((header, idx) => {
        const activeClass = idx === 0 ? 'active' : '';
        tabHeadersHtml += `<button class="tab-btn ${activeClass}" data-tab-idx="${idx}">${escapeHtml(header)}</button>`;

        let paneContent = `<div class="tab-pane ${idx === 0 ? 'active-pane' : ''}" data-pane-idx="${idx}">`;
        rows.forEach((row, rowIdx) => {
            const val = (idx < row.length) ? row[idx] : '-';
            paneContent += `<p><strong>${rowIdx + 1}.</strong> ${escapeHtml(val)}</p>`;
        });
        paneContent += `</div>`;
        panesHtml += paneContent;
    });

    tabHeadersHtml += `</div>`;
    panesHtml += `</div>`;
    return `<div class="tab-widget">${tabHeadersHtml}${panesHtml}</div>`;
}

// Escape HTML untuk keamanan
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ======================== PAGE RENDERING ========================

function renderPendahuluan() {
    const data = mainData.pendahuluan;
    if (!data) return '<div class="content-card"><p>Konten tidak tersedia.</p></div>';

    let html = `<div class="content-card"><h1>${escapeHtml(data.judul)}</h1>`;
    
    for (const item of data.konten) {
        if (item.jenis === 'paragraf') {
            html += `<p>${escapeHtml(item.teks)}</p>`;
        } else if (item.jenis === 'subjudul') {
            html += `<h2>${escapeHtml(item.teks)}</h2>`;
        } else if (item.jenis === 'contoh') {
            html += `<p><em>💡 ${escapeHtml(item.teks)}</em></p>`;
        } else if (item.jenis === 'tabel') {
            html += renderTableWidget(item);
        }
    }
    
    html += `</div>`;
    return html;
}

function renderTableWidget(item) {
    const headers = item.header || [];
    const rows = item.baris || [];

    if (headers.length === 0 || rows.length === 0) {
        return `<p><strong>${escapeHtml(item.judul || 'Tabel')}</strong> tidak dapat ditampilkan.</p>`;
    }

    let tabHeadersHtml = `<div class="tab-headers">`;
    let panesHtml = `<div class="tab-content">`;

    headers.forEach((h, idx) => {
        const activeClass = idx === 0 ? 'active' : '';
        tabHeadersHtml += `<button class="tab-btn ${activeClass}" data-tab-idx="${idx}">${escapeHtml(h)}</button>`;

        let paneContent = `<div class="tab-pane ${idx === 0 ? 'active-pane' : ''}" data-pane-idx="${idx}">`;
        rows.forEach((row, rowIdx) => {
            const val = row[idx] || '-';
            paneContent += `<p><strong>▪ ${rowIdx + 1}.</strong> ${escapeHtml(val)}</p>`;
        });
        paneContent += `</div>`;
        panesHtml += paneContent;
    });

    tabHeadersHtml += `</div>`;
    panesHtml += `</div>`;
    return `<div class="tab-widget">${tabHeadersHtml}${panesHtml}</div>`;
}

// ======================== PERBAIKAN TOTAL: renderBab ========================
function renderBab(babId) {
    let text = babData[babId];
    if (!text) return '<div class="content-card"><p>Konten bab tidak tersedia.</p></div>';

    // PROSES BARIS PER BARIS - State Machine Sederhana
    const lines = text.split(/\r?\n/);
    let html = '';
    let buffer = '';           // Menampung teks paragraf
    let tableBuffer = '';      // Menampung teks tabel
    let inTable = false;       // Flag sedang dalam mode tabel
    let tableJustEnded = false;

    function flushBuffer() {
        if (buffer.trim()) {
            let p = buffer.trim()
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/__(.*?)__/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/_(.*?)_/g, '<em>$1</em>');
            html += `<p>${p}</p>`;
            buffer = '';
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Deteksi heading
        if (!inTable && trimmedLine.startsWith('## ')) {
            flushBuffer();
            html += `<h2>${escapeHtml(trimmedLine.slice(3))}</h2>`;
            continue;
        }
        if (!inTable && trimmedLine.startsWith('### ')) {
            flushBuffer();
            html += `<h3>${escapeHtml(trimmedLine.slice(4))}</h3>`;
            continue;
        }

        // Deteksi marker #tab
        if (!inTable && trimmedLine === '#tab') {
            flushBuffer();
            inTable = true;
            tableBuffer = '';
            continue;
        }

        // Dalam mode tabel
        if (inTable) {
            // Jika bertemu baris kosong DAN setelahnya ada heading atau #tab, akhiri tabel
            if (trimmedLine === '') {
                // Cek apakah baris berikutnya adalah heading atau #tab
                let nextNonEmpty = '';
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() !== '') {
                        nextNonEmpty = lines[j].trim();
                        break;
                    }
                }
                if (nextNonEmpty.startsWith('## ') || nextNonEmpty.startsWith('### ') || nextNonEmpty === '#tab') {
                    // Akhiri tabel
                    if (tableBuffer.trim()) {
                        html += parseMarkdownTableToTabWidget(tableBuffer.trim());
                    }
                    inTable = false;
                    tableJustEnded = true;
                    continue;
                }
            }
            
            tableBuffer += line + '\n';
            continue;
        }

        // Di luar tabel: kumpulkan paragraf
        if (tableJustEnded && trimmedLine === '') {
            tableJustEnded = false;
            continue;
        }
        tableJustEnded = false;

        if (trimmedLine === '') {
            flushBuffer();
        } else {
            if (buffer) buffer += '\n';
            buffer += line;
        }
    }

    // Sisa buffer
    if (inTable && tableBuffer.trim()) {
        html += parseMarkdownTableToTabWidget(tableBuffer.trim());
    } else if (!inTable) {
        flushBuffer();
    }

    return `<div class="content-card">${html}</div>`;
}

function renderKesimpulan() {
    const data = closingData.kesimpulan;
    if (!data) return '<div class="content-card"><p>Konten tidak tersedia.</p></div>';

    let html = `<div class="content-card"><h1>✨ ${escapeHtml(data.judul)}</h1>`;
    
    for (const item of data.konten) {
        if (item.jenis === 'paragraf') {
            html += `<p>${escapeHtml(item.teks)}</p>`;
        } else if (item.jenis === 'kutipan') {
            html += `<blockquote style="
                border-left: 4px solid var(--accent-primary);
                padding: 1.2rem 0 1.2rem 1.5rem;
                margin: 1.5rem 0;
                background: var(--accent-very-light);
                border-radius: 8px;
                font-style: italic;
                color: var(--text-secondary);
            "><strong>❝</strong> ${escapeHtml(item.teks)} <strong>❞</strong></blockquote>`;
        }
    }

    if (data.pesan_penutup) {
        html += `<p style="margin-top: 2rem; font-weight: 600; color: var(--accent-primary);">✓ ${escapeHtml(data.pesan_penutup)}</p>`;
    }

    html += `</div>`;
    return html;
}

function renderPage(pageId) {
    const pageDiv = document.getElementById(pageId);
    if (!pageDiv) return;

    let content = '';
    if (pageId === 'pendahuluan') {
        content = renderPendahuluan();
    } else if (pageId === 'kesimpulan') {
        content = renderKesimpulan();
    } else if (babData && babData[pageId]) {
        content = renderBab(pageId);
    } else {
        content = '<div class="content-card"><p>Konten sedang disiapkan.</p></div>';
    }

    pageDiv.innerHTML = content;
    attachTabEvents(pageDiv);
    attachNavigation(pageId);
}

function attachTabEvents(container) {
    container.querySelectorAll('.tab-widget').forEach(widget => {
        const btns = widget.querySelectorAll('.tab-btn');
        const panes = widget.querySelectorAll('.tab-pane');

        btns.forEach(btn => {
            btn.removeEventListener('click', handleTabClick);
            btn.addEventListener('click', handleTabClick);
        });

        function handleTabClick(e) {
            const btn = e.currentTarget;
            const idx = btn.getAttribute('data-tab-idx');
            const parentWidget = btn.closest('.tab-widget');

            parentWidget.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            parentWidget.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active-pane');
                if (pane.getAttribute('data-pane-idx') === idx) {
                    pane.classList.add('active-pane');
                }
            });
        }
    });
}

function attachNavigation(currentId) {
    const pageDiv = document.getElementById(currentId);
    let existingNav = pageDiv.querySelector('.custom-nav-container');
    if (existingNav) existingNav.remove();

    const index = chapters.findIndex(ch => ch.id === currentId);
    if (index === -1) return;

    const navDiv = document.createElement('div');
    navDiv.className = 'next-section custom-nav-container';

    if (index > 0) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Sebelumnya';
        prevBtn.className = 'nav-btn';
        prevBtn.onclick = () => navigateTo(chapters[index - 1].id);
        navDiv.appendChild(prevBtn);
    }

    if (index < chapters.length - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = `Lanjut → ${chapters[index + 1].title}`;
        nextBtn.className = 'nav-btn';
        nextBtn.onclick = () => navigateTo(chapters[index + 1].id);
        navDiv.appendChild(nextBtn);
    }

    pageDiv.appendChild(navDiv);
}

// ======================== NAVIGATION & UI ========================

function navigateTo(pageId, pushState = true) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        
        if (!targetPage.innerHTML.trim() || targetPage.innerHTML.includes('Konten sedang disiapkan')) {
            renderPage(pageId);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (pushState) {
            history.pushState({ page: pageId }, '', `#${pageId === 'homePage' ? '' : pageId}`);
        }
        
        currentPageId = pageId;
    }

    closeSidebar();
    updateMenuVisibility(pageId !== 'homePage');
}

function updateMenuVisibility(show) {
    const menuBtn = document.getElementById('menuToggleBtn');
    if (menuBtn) {
        menuBtn.style.display = show ? 'flex' : 'none';
    }
}

// ======================== THEME HANDLING ========================

function applyTheme() {
    if (darkMode) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    
    const themeIcon = document.getElementById('themeToggle');
    if (themeIcon) {
        themeIcon.textContent = darkMode ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    darkMode = !darkMode;
    applyTheme();
    initBars();
}

// ======================== SIDEBAR MANAGEMENT ========================

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.querySelector('.menu-btn');

    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
    if (menuBtn) menuBtn.classList.add('morph-active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.querySelector('.menu-btn');

    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    if (menuBtn) menuBtn.classList.remove('morph-active');
}

function buildSidebar() {
    const ul = document.getElementById('chapterSidebarList');
    if (!ul) return;

    ul.innerHTML = '';
    chapters.forEach((ch, idx) => {
        const li = document.createElement('li');
        li.style.setProperty('--index', idx);
        
        const a = document.createElement('a');
        a.href = `#${ch.id === 'homePage' ? '' : ch.id}`;
        a.textContent = ch.title;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(ch.id);
        });

        li.appendChild(a);
        ul.appendChild(li);
    });
}

// ======================== BACKGROUND CANVAS ANIMATION ========================

const canvas = document.getElementById('bgCanvas');
let ctx = canvas ? canvas.getContext('2d') : null;
let bars = [];

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initBars();
}

function initBars() {
    if (!canvas) return;
    bars = [];
    let count = Math.max(15, Math.floor(canvas.width / 60));
    
    for (let i = 0; i < count; i++) {
        const colors = [
            'rgba(44, 110, 73, 0.6)',
            'rgba(212, 175, 55, 0.5)',
            'rgba(76, 154, 111, 0.5)'
        ];
        
        bars.push({
            x: i * (canvas.width / count),
            height: Math.random() * canvas.height * 0.5 + 40,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 2 + 0.5
        });
    }
}

function drawBars() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.3;

    bars.forEach(b => {
        ctx.fillStyle = b.color;
        const barWidth = Math.floor(canvas.width / bars.length) - 8;
        ctx.fillRect(b.x, canvas.height - b.height, barWidth, b.height);

        b.height += (Math.random() - 0.5) * b.speed;
        if (b.height > canvas.height * 0.6) b.height = canvas.height * 0.2;
        if (b.height < 25) b.height = 35;
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(drawBars);
}

// ======================== APP INITIALIZATION ========================

function initApp() {
    applyTheme();
    buildSidebar();

    // Render all pages
    chapters.forEach(ch => renderPage(ch.id));
    renderPage('kesimpulan');

    // Set home page active
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const homePage = document.getElementById('homePage');
    if (homePage) homePage.classList.add('active');
    currentPageId = 'homePage';
    updateMenuVisibility(false);

    // Event listeners
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => navigateTo('pendahuluan'));
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const menuToggleBtn = document.getElementById('menuToggleBtn');
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sidebar = document.getElementById('sidebar');
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        let hash = window.location.hash.slice(1);
        if (hash && document.getElementById(hash)) {
            navigateTo(hash, false);
        } else {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const home = document.getElementById('homePage');
            if (home) home.classList.add('active');
            updateMenuVisibility(false);
            currentPageId = 'homePage';
        }
    });

    // Handle initial URL hash
    if (window.location.hash) {
        let hash = window.location.hash.slice(1);
        if (document.getElementById(hash)) {
            navigateTo(hash, false);
        }
    }

    // Initialize canvas
    resizeCanvas();
    drawBars();
    window.addEventListener('resize', () => { resizeCanvas(); });
}

// ======================== START APPLICATION ========================
loadAllData();
