// ==================== STATE ====================
let playlist = [];
let currentIndex = -1;
let lyricsData = [];
let isPlaying = false;

// Element references
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
const addSongBtn = document.getElementById('addSongBtn');
const modal = document.getElementById('addModal');
const audioFileInput = document.getElementById('audioFileInput');
const lyricInputsContainer = document.getElementById('lyricInputsContainer');
const addLyricColumnBtn = document.getElementById('addLyricColumnBtn');
const removeLyricColumnBtn = document.getElementById('removeLyricColumnBtn');
const saveSongBtn = document.getElementById('saveSongBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const themeToggle = document.querySelector('.theme-toggle');

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
            
            if (txt) {
                res.push({ time: total, text: txt });
            }
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

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
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

// ==================== PLAYLIST MANAGEMENT ====================
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
            <span>🎵 ${song.title}</span>
            <span class="delete-song" data-idx="${idx}" title="Hapus lagu">❌</span>
        `;
        
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-song')) return;
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
    if (playlist[idx] && playlist[idx].audioBlobURL) {
        URL.revokeObjectURL(playlist[idx].audioBlobURL);
    }
    
    playlist.splice(idx, 1);
    
    if (currentIndex === idx) {
        stopPlayback();
        currentIndex = -1;
        nowPlayingEl.textContent = '🎤 Pilih atau tambah lagu';
        lyricsGrid.innerHTML = '<p class="empty-text" style="grid-column:1/-1;">Lirik akan muncul di sini</p>';
    } else if (currentIndex > idx) {
        currentIndex--;
    }
    
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

    nowPlayingEl.textContent = `🎵 ${song.title}`;
    audio.src = song.audioBlobURL;
    audio.load();

    lyricsData = song.lyricColumns.map(col => ({
        label: col.label,
        lyrics: col.parsed
    }));
    
    renderLyrics();
    renderPlaylistUI();

    try {
        await audio.play();
    } catch (e) {
        console.error('Failed to play audio:', e);
    }
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
                    if (audio.paused) {
                        audio.play().catch(() => {});
                    }
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
            if (ct >= track.lyrics[i].time) {
                active = i;
                break;
            }
        }
        
        lines.forEach((line, i) => {
            line.classList.toggle('active', i === active);
        });
        
        if (active !== -1 && lines[active]) {
            lines[active].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// ==================== PLAYER CONTROLS ====================
function togglePlay() {
    if (!audio.src) return;
    
    if (audio.paused) {
        audio.play().catch(() => {});
    } else {
        audio.pause();
    }
}

function updatePlayIcon() {
    playBtn.textContent = audio.paused ? '▶️' : '⏸️';
    isPlaying = !audio.paused;
}

function previousSong() {
    if (!playlist.length) return;
    const prev = (currentIndex - 1 + playlist.length) % playlist.length;
    loadSong(prev);
}

function nextSong() {
    if (!playlist.length) return;
    const next = (currentIndex + 1) % playlist.length;
    loadSong(next);
}

// Audio event listeners
audio.addEventListener('timeupdate', throttle(() => {
    const dur = audio.duration || 1;
    const pct = (audio.currentTime / dur) * 100;
    progressFill.style.width = `${pct}%`;
    seekSlider.value = pct;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
    updateActiveLyric();
}, 50));

audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayIcon();
});

audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayIcon();
});

audio.addEventListener('ended', () => {
    if (playlist.length > 0) {
        nextSong();
    }
});

audio.addEventListener('error', () => {
    console.error('Error playing audio');
    alert('❌ Error memainkan audio');
});

// Seek slider
seekSlider.addEventListener('input', () => {
    const dur = audio.duration || 0;
    audio.currentTime = (seekSlider.value / 100) * dur;
});

// Volume slider
volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value;
});

// Control buttons
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', previousSong);
nextBtn.addEventListener('click', nextSong);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target === document.body || e.target === document.documentElement) {
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                nextSong();
                break;
            case 'ArrowLeft':
                previousSong();
                break;
            case 'Escape':
                closeSidebar();
                break;
        }
    }
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
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

overlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSidebar();
    }
});

// Close sidebar when clicking on a song
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('song-item') && sidebar.classList.contains('open')) {
        setTimeout(closeSidebar, 200);
    }
});

// ==================== ADD SONG MODAL ====================
let lyricColumnCount = 2;

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
    removeLyricColumnBtn.disabled = lyricColumnCount <= 2;
    addLyricColumnBtn.disabled = lyricColumnCount >= 5;
}

addLyricColumnBtn.addEventListener('click', () => {
    if (lyricColumnCount >= 5) return;
    lyricColumnCount++;
    rebuildLyricInputs();
});

removeLyricColumnBtn.addEventListener('click', () => {
    if (lyricColumnCount <= 2) return;
    lyricColumnCount--;
    rebuildLyricInputs();
});

function openModal() {
    audioFileInput.value = '';
    lyricColumnCount = 2;
    rebuildLyricInputs();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

addSongBtn.addEventListener('click', openModal);
cancelAddBtn.addEventListener('click', closeModal);

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Validate and save song
saveSongBtn.addEventListener('click', async () => {
    const audioFile = audioFileInput.files[0];
    if (!audioFile) {
        alert('❌ Pilih file audio terlebih dahulu');
        return;
    }

    if (audioFile.size > 100 * 1024 * 1024) {
        alert('⚠️ File audio terlalu besar (maksimal 100MB)');
        return;
    }

    try {
        saveSongBtn.disabled = true;
        saveSongBtn.textContent = '⏳ Menyimpan...';

        const lyricColumns = [];
        const columnDivs = document.querySelectorAll('.lyric-column');
        
        for (const col of columnDivs) {
            const labelInput = col.querySelector('.col-label');
            const fileInput = col.querySelector('.col-file');
            
            if (!fileInput.files.length) {
                alert('❌ Semua kolom lirik harus diisi');
                return;
            }
            
            const text = await readFileAsText(fileInput.files[0]);
            const parsed = parseLRC(text);
            
            if (parsed.length === 0) {
                alert('⚠️ Format lirik tidak valid atau file kosong');
                return;
            }
            
            lyricColumns.push({
                label: labelInput.value || 'Lirik',
                parsed
            });
        }

        const audioBlobURL = URL.createObjectURL(audioFile);
        const title = audioFile.name.replace(/\.[^/.]+$/, '');

        playlist.push({
            id: Date.now(),
            title,
            audioBlobURL,
            lyricColumns
        });

        renderPlaylistUI();
        closeModal();
        
        if (playlist.length === 1) {
            loadSong(0);
        }

        saveSongBtn.disabled = false;
        saveSongBtn.textContent = '💾 Simpan Lagu';
        
    } catch (e) {
        console.error('Error saving song:', e);
        alert('❌ Terjadi kesalahan saat menyimpan lagu');
        saveSongBtn.disabled = false;
        saveSongBtn.textContent = '💾 Simpan Lagu';
    }
});

// ==================== THEME ====================
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lirik-player-theme', theme);
    document.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'dark' ? 'light' : 'dark');
});

// ==================== UTILITIES ====================
// Detect screen orientation changes
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        window.scrollTo(0, 0);
        updateActiveLyric();
    }, 100);
});

// Handle visibility changes (pause when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Optional: pause when tab is hidden
        // audio.pause();
    }
});

// Prevent double-tap zoom on buttons
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

// ==================== INITIALIZATION ====================
function init() {
    const savedTheme = localStorage.getItem('lirik-player-theme') || 'dark';
    setTheme(savedTheme);
    
    volumeSlider.value = 0.7;
    audio.volume = 0.7;
    
    updatePlayIcon();
    renderPlaylistUI();
    
    lyricsGrid.innerHTML = '<p class="empty-text" style="grid-column:1/-1;">➕ Tambah lagu untuk memulai</p>';
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
