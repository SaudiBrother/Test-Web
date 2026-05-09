// ==================== STATE ====================
let playlist = [];
let currentIndex = -1;
let lyricsData = [];
let isPlaying = false;

// DOM Elements
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seekSlider = document.getElementById('seekSlider');
const volumeSlider = document.getElementById('volumeSlider');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const nowPlayingEl = document.getElementById('nowPlaying');
const lyricsGrid = document.getElementById('lyricsGrid');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const menuBtn = document.getElementById('menuBtn');
const playlistContainer = document.getElementById('playlistContainer');
const modal = document.getElementById('addModal');
const audioFileInput = document.getElementById('audioFileInput');
const lyricInputsContainer = document.getElementById('lyricInputsContainer');
const addLyricColumnBtn = document.getElementById('addLyricColumnBtn');
const removeLyricColumnBtn = document.getElementById('removeLyricColumnBtn');
const saveSongBtn = document.getElementById('saveSongBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const panelToggleBtn = document.getElementById('panelToggleBtn');
const controlPanel = document.getElementById('controlPanel');
const addSongPanelBtn = document.getElementById('addSongPanelBtn');
const themeOptions = document.querySelectorAll('.theme-option');

// ==================== UTILS ====================
function formatTime(sec) {
    if (isNaN(sec) || sec === Infinity) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseLRC(text) {
    const lines = text.split('\n');
    const res = [];
    const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/;
    lines.forEach(line => {
        const match = line.match(regex);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
            const total = min * 60 + sec + ms / 1000;
            const txt = line.replace(regex, '').trim();
            if (txt) res.push({ time: total, text: txt });
        }
    });
    return res.sort((a, b) => a.time - b.time);
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==================== PANEL CONTROL ====================
function openPanel() {
    controlPanel.classList.add('open');
    panelToggleBtn.classList.add('open');
    controlPanel.setAttribute('aria-hidden', 'false');
}

function closePanel() {
    controlPanel.classList.remove('open');
    panelToggleBtn.classList.remove('open');
    controlPanel.setAttribute('aria-hidden', 'true');
}

panelToggleBtn.addEventListener('click', () => {
    if (controlPanel.classList.contains('open')) {
        closePanel();
    } else {
        openPanel();
    }
});

document.addEventListener('click', (e) => {
    if (!panelToggleBtn.contains(e.target) && !controlPanel.contains(e.target)) {
        closePanel();
    }
});

// Tombol "+" morph ke "x" saat modal terbuka
function updateAddBtnState() {
    if (modal.classList.contains('active')) {
        addSongPanelBtn.classList.add('modal-open');
        addSongPanelBtn.querySelector('.add-icon').innerHTML = '<path class="cross" d="M18 6L6 18M6 6l12 12" />';
    } else {
        addSongPanelBtn.classList.remove('modal-open');
        addSongPanelBtn.querySelector('.add-icon').innerHTML = '<path class="plus" d="M12 5v14M5 12h14" />';
    }
}

addSongPanelBtn.addEventListener('click', () => {
    if (modal.classList.contains('active')) {
        closeModal();
    } else {
        openModal();
        closePanel(); // opsional: tutup panel setelah klik tambah
    }
});

// ==================== THEME ====================
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lrc-player-theme', theme);
    themeOptions.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

themeOptions.forEach(btn => {
    btn.addEventListener('click', () => {
        setTheme(btn.dataset.theme);
    });
});

// ==================== SIDEBAR ====================
function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    menuBtn.classList.add('morph-active');
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    menuBtn.classList.remove('morph-active');
    document.body.style.overflow = '';
}
menuBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay.addEventListener('click', closeSidebar);

// ==================== PLAYLIST ====================
function renderPlaylistUI() {
    playlistContainer.innerHTML = '';
    if (playlist.length === 0) {
        playlistContainer.innerHTML = '<p class="empty-text">📭 Belum ada lagu</p>';
        return;
    }
    playlist.forEach((song, idx) => {
        const div = document.createElement('div');
        div.className = `song-item ${idx === currentIndex ? 'active' : ''}`;
        div.innerHTML = `
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.5rem;"><circle cx="5" cy="18" r="2"/><circle cx="18" cy="16" r="2"/><path d="M8 18V5l12-2v13"/></svg>${song.title}</span>
            <span class="delete-song" data-idx="${idx}" title="Hapus lagu">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </span>
        `;
        div.addEventListener('click', (e) => {
            if (e.target.closest('.delete-song')) return;
            loadSong(idx);
            closeSidebar();
        });
        playlistContainer.appendChild(div);
    });
    document.querySelectorAll('.delete-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            deleteSong(idx);
        });
    });
}

function deleteSong(idx) {
    if (playlist[idx]?.audioBlobURL) URL.revokeObjectURL(playlist[idx].audioBlobURL);
    playlist.splice(idx, 1);
    if (currentIndex === idx) {
        stopPlayback();
        currentIndex = -1;
        nowPlayingEl.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span>Pilih atau tambah lagu</span>`;
        lyricsGrid.innerHTML = '<p class="empty-text" style="grid-column:1/-1;">📝 Lirik akan muncul di sini</p>';
    } else if (currentIndex > idx) currentIndex--;
    renderPlaylistUI();
}

function stopPlayback() {
    audio.pause();
    audio.src = '';
    lyricsData = [];
    isPlaying = false;
    updatePlayIcon();
}

// ==================== LOAD SONG ====================
async function loadSong(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[index];
    nowPlayingEl.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="18" r="2"/><circle cx="18" cy="16" r="2"/><path d="M8 18V5l12-2v13"/></svg><span>${song.title}</span>`;
    audio.src = song.audioBlobURL;
    audio.load();
    lyricsData = song.lyricColumns.map(col => ({ label: col.label, lyrics: col.parsed }));
    renderLyrics();
    renderPlaylistUI();
    try { await audio.play(); } catch (e) {}
}

function renderLyrics() {
    lyricsGrid.innerHTML = '';
    if (!lyricsData.length) {
        lyricsGrid.innerHTML = '<p class="empty-text" style="grid-column:1/-1;">📝 Pilih lagu untuk melihat lirik</p>';
        return;
    }
    lyricsData.forEach((track, trackIdx) => {
        const panel = document.createElement('div');
        panel.className = 'lyric-panel';
        panel.innerHTML = `<h3>📜 ${track.label}</h3>`;
        const list = document.createElement('div');
        if (track.lyrics.length === 0) {
            list.innerHTML = '<p class="empty-text">Belum ada lirik</p>';
        } else {
            track.lyrics.forEach((line, lineIdx) => {
                const p = document.createElement('p');
                p.className = 'lyric-line';
                p.textContent = line.text;
                p.dataset.time = line.time;
                p.dataset.index = lineIdx;
                p.addEventListener('click', () => {
                    audio.currentTime = line.time;
                    if (audio.paused) audio.play().catch(() => {});
                });
                list.appendChild(p);
            });
        }
        panel.appendChild(list);
        lyricsGrid.appendChild(panel);
    });
}

function updateActiveLyric() {
    const ct = audio.currentTime;
    lyricsData.forEach((track, trackIdx) => {
        const panel = lyricsGrid.children[trackIdx];
        if (!panel) return;
        const lines = panel.querySelectorAll('.lyric-line');
        let active = -1;
        for (let i = track.lyrics.length - 1; i >= 0; i--) {
            if (ct >= track.lyrics[i].time) { active = i; break; }
        }
        lines.forEach((line, i) => line.classList.toggle('active', i === active));
        if (active !== -1 && lines[active]) {
            lines[active].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// ==================== PLAYER CONTROLS ====================
function togglePlay() {
    if (!audio.src) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
}
function updatePlayIcon() {
    const playPath = playBtn.querySelector('.play-path');
    const pausePath = playBtn.querySelector('.pause-path');
    if (audio.paused) {
        playPath.style.display = '';
        pausePath.style.display = 'none';
    } else {
        playPath.style.display = 'none';
        pausePath.style.display = '';
    }
}
function previousSong() {
    if (!playlist.length) return;
    loadSong((currentIndex - 1 + playlist.length) % playlist.length);
}
function nextSong() {
    if (!playlist.length) return;
    loadSong((currentIndex + 1) % playlist.length);
}

audio.addEventListener('timeupdate', throttle(() => {
    const dur = audio.duration || 1;
    const pct = (audio.currentTime / dur) * 100;
    progressFill.style.width = `${pct}%`;
    seekSlider.value = pct;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
    updateActiveLyric();
}, 50));

audio.addEventListener('loadedmetadata', () => durationEl.textContent = formatTime(audio.duration));
audio.addEventListener('play', updatePlayIcon);
audio.addEventListener('pause', updatePlayIcon);
audio.addEventListener('ended', () => { if (playlist.length) nextSong(); });

seekSlider.addEventListener('input', () => audio.currentTime = (seekSlider.value / 100) * (audio.duration || 0));
volumeSlider.addEventListener('input', () => audio.volume = volumeSlider.value);
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', previousSong);
nextBtn.addEventListener('click', nextSong);

document.addEventListener('keydown', (e) => {
    if (e.target === document.body || e.target === document.documentElement) {
        switch (e.code) {
            case 'Space': e.preventDefault(); togglePlay(); break;
            case 'ArrowRight': nextSong(); break;
            case 'ArrowLeft': previousSong(); break;
            case 'Escape':
                if (sidebar.classList.contains('open')) closeSidebar();
                else if (modal.classList.contains('active')) closeModal();
                else if (controlPanel.classList.contains('open')) closePanel();
                break;
        }
    }
});

// ==================== MODAL ADD SONG ====================
let lyricColumnCount = 1;   // Mulai dengan 1 kolom

function createLyricColumn(index) {
    const div = document.createElement('div');
    div.className = 'lyric-column';
    div.innerHTML = `
        <input type="text" placeholder="Label (misal: Romaji)" class="col-label" value="Kolom ${index + 1}">
        <input type="file" accept=".lrc,.txt" class="col-file" required>
    `;
    return div;
}

function rebuildLyricInputs() {
    lyricInputsContainer.innerHTML = '';
    for (let i = 0; i < lyricColumnCount; i++) {
        lyricInputsContainer.appendChild(createLyricColumn(i));
    }
    removeLyricColumnBtn.disabled = lyricColumnCount <= 1;   // minimal 1
    addLyricColumnBtn.disabled = lyricColumnCount >= 5;
}

addLyricColumnBtn.addEventListener('click', () => {
    if (lyricColumnCount >= 5) return;
    lyricColumnCount++;
    rebuildLyricInputs();
});

removeLyricColumnBtn.addEventListener('click', () => {
    if (lyricColumnCount <= 1) return;
    lyricColumnCount--;
    rebuildLyricInputs();
});

function openModal() {
    audioFileInput.value = '';
    lyricColumnCount = 1;   // reset ke 1 kolom
    rebuildLyricInputs();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateAddBtnState();
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    updateAddBtnState();
}

cancelAddBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

saveSongBtn.addEventListener('click', async () => {
    const audioFile = audioFileInput.files[0];
    if (!audioFile) { alert('Pilih file audio terlebih dahulu'); return; }
    if (audioFile.size > 100 * 1024 * 1024) { alert('File audio terlalu besar (maks 100MB)'); return; }
    try {
        saveSongBtn.disabled = true;
        saveSongBtn.innerHTML = '⏳ Menyimpan...';
        const lyricColumns = [];
        const columnDivs = document.querySelectorAll('.lyric-column');
        for (const col of columnDivs) {
            const labelInput = col.querySelector('.col-label');
            const fileInput = col.querySelector('.col-file');
            if (!fileInput.files.length) { alert('Semua kolom lirik harus diisi'); return; }
            const text = await readFileAsText(fileInput.files[0]);
            const parsed = parseLRC(text);
            if (parsed.length === 0) { alert('Format lirik tidak valid atau kosong'); return; }
            lyricColumns.push({ label: labelInput.value || 'Lirik', parsed });
        }
        const audioBlobURL = URL.createObjectURL(audioFile);
        const title = audioFile.name.replace(/\.[^/.]+$/, '');
        playlist.push({ id: Date.now(), title, audioBlobURL, lyricColumns });
        renderPlaylistUI();
        closeModal();
        if (playlist.length === 1) loadSong(0);
    } catch (e) {
        alert('Terjadi kesalahan saat menyimpan');
    } finally {
        saveSongBtn.disabled = false;
        saveSongBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan Lagu`;
    }
});

// ==================== INIT ====================
function init() {
    const savedTheme = localStorage.getItem('lrc-player-theme') || 'dark';
    setTheme(savedTheme);
    volumeSlider.value = 0.7;
    audio.volume = 0.7;
    updatePlayIcon();
    renderPlaylistUI();
    lyricsGrid.innerHTML = '<p class="empty-text" style="grid-column:1/-1;">➕ Tambah lagu untuk memulai</p>';
    updateAddBtnState();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
        }
