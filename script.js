(function () {
  'use strict';

  /* ============ Konfigurasi ============ */
  var MAX_CATEGORIES = 6;
  var DEFAULT_PALETTE = ['#e63946', '#ffb703', '#2a9d8f', '#457b9d', '#8338ec', '#06d6a0', '#f77f00', '#3a86ff'];

  /* ============ State ============ */
  var state = {
    categories: [],   // { id, name, color, sketch:{rotate,radius}, textOnFill }
    itemLabel: 'Guru',
    rows: [],         // { text, selected:Set<categoryId> }
    currentIndex: 0,
    started: false,
  };
  var nextCategoryId = 1;

  /* ============ DOM shortcuts ============ */
  function $(id) { return document.getElementById(id); }

  var screens = {
    setup: $('screen-setup'),
    upload: $('screen-upload'),
    categorize: $('screen-categorize'),
    done: $('screen-done'),
  };

  var inputLabel = $('input-label');
  var formAddCategory = $('form-add-category');
  var inputCatName = $('input-cat-name');
  var inputCatColor = $('input-cat-color');
  var btnAddCategory = $('btn-add-category');
  var categoryError = $('category-error');
  var categoryListEl = $('category-list');
  var categoryCountHint = $('category-count-hint');
  var emptyCategoryHint = $('empty-category-hint');
  var btnGotoUpload = $('btn-goto-upload');

  var btnBackToSetup = $('btn-back-to-setup');
  var fileDropZone = $('file-drop-zone');
  var fileDropText = $('file-drop-text');
  var inputCsvFile = $('input-csv-file');
  var inputHasHeader = $('input-has-header');
  var csvSummary = $('csv-summary');
  var csvError = $('csv-error');
  var btnStartCategorize = $('btn-start-categorize');

  var progressFill = $('progress-fill');
  var progressLabel = $('progress-label');
  var entryTitle = $('entry-title');
  var categoryGrid = $('category-grid');
  var btnPrev = $('btn-prev');
  var btnNext = $('btn-next');

  var doneSummary = $('done-summary');
  var btnDownloadAgain = $('btn-download-again');
  var btnRestart = $('btn-restart');

  var modalOverlay = $('modal-overlay');
  var modalCancel = $('modal-cancel');
  var modalConfirm = $('modal-confirm');

  /* ============ Util ============ */

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
    window.scrollTo(0, 0);
  }

  function columnLetters(index) {
    var n = index + 1;
    var out = '';
    while (n > 0) {
      var rem = (n - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      n = Math.floor((n - 1) / 26);
    }
    return out;
  }

  function contrastTextColor(hex) {
    var c = hex.replace('#', '');
    var r = parseInt(c.substring(0, 2), 16) || 0;
    var g = parseInt(c.substring(2, 4), 16) || 0;
    var b = parseInt(c.substring(4, 6), 16) || 0;
    var yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? '#161616' : '#ffffff';
  }

  function randomSketch() {
    function rand(min, max) { return Math.random() * (max - min) + min; }
    var rotate = rand(-1.6, 1.6).toFixed(2) + 'deg';
    function r() { return Math.round(rand(4, 20)) + 'px'; }
    var radius = [r(), r(), r(), r()].join(' ') + ' / ' + [r(), r(), r(), r()].join(' ');
    return { rotate: rotate, radius: radius };
  }

  function randomColor() {
    return DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)];
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function timestampSlug() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
  }

  /* ============ CSV parsing ============ */

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    text = text.replace(/^\uFEFF/, '');
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') { field += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { field += ch; }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field); field = '';
      } else if (ch === '\r') {
        /* abaikan, tunggu \n */
      } else if (ch === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else {
        field += ch;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (f) { return f.trim() !== ''; }); });
  }

  function rowsToText(rows, hasHeader) {
    var data = hasHeader ? rows.slice(1) : rows.slice();
    return data
      .map(function (r) { return r.map(function (f) { return f.trim(); }).filter(Boolean).join(' '); })
      .filter(function (t) { return t !== ''; });
  }

  /* ============ Layar 1: Setup kategori ============ */

  function renderCategoryList() {
    categoryListEl.innerHTML = '';
    state.categories.forEach(function (cat) {
      var li = document.createElement('li');
      li.className = 'category-item';

      var swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = cat.color;

      var nameSpan = document.createElement('span');
      nameSpan.className = 'cat-name';
      nameSpan.textContent = cat.name;

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn';
      delBtn.dataset.id = cat.id;
      delBtn.setAttribute('aria-label', 'Hapus kategori ' + cat.name);
      delBtn.textContent = '\u2715';

      li.appendChild(swatch);
      li.appendChild(nameSpan);
      li.appendChild(delBtn);
      categoryListEl.appendChild(li);
    });

    var count = state.categories.length;
    var maxed = count >= MAX_CATEGORIES;
    categoryCountHint.textContent = maxed
      ? count + ' dari ' + MAX_CATEGORIES + ' kategori \u2014 maksimum tercapai'
      : count + ' dari ' + MAX_CATEGORIES + ' kategori';
    emptyCategoryHint.hidden = count > 0;
    btnGotoUpload.disabled = count === 0;

    inputCatName.disabled = maxed;
    inputCatColor.disabled = maxed;
    btnAddCategory.disabled = maxed;
  }

  formAddCategory.addEventListener('submit', function (e) {
    e.preventDefault();
    categoryError.hidden = true;
    var name = inputCatName.value.trim();
    if (!name || state.categories.length >= MAX_CATEGORIES) return;

    var isDuplicate = state.categories.some(function (c) {
      return c.name.toLowerCase() === name.toLowerCase();
    });
    if (isDuplicate) {
      categoryError.textContent = 'Nama kategori sudah dipakai.';
      categoryError.hidden = false;
      inputCatName.focus();
      inputCatName.select();
      return;
    }

    var color = inputCatColor.value || randomColor();
    state.categories.push({
      id: 'cat-' + (nextCategoryId++),
      name: name,
      color: color,
      sketch: randomSketch(),
      textOnFill: contrastTextColor(color),
    });

    inputCatName.value = '';
    inputCatColor.value = randomColor();
    inputCatName.focus();
    renderCategoryList();
  });

  categoryListEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-id]');
    if (!btn) return;
    state.categories = state.categories.filter(function (c) { return c.id !== btn.dataset.id; });
    renderCategoryList();
  });

  btnGotoUpload.addEventListener('click', function () {
    state.itemLabel = inputLabel.value.trim() || 'Data';
    showScreen('upload');
  });

  /* ============ Layar 2: Upload CSV ============ */

  btnBackToSetup.addEventListener('click', function () { showScreen('setup'); });

  fileDropZone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputCsvFile.click();
    }
  });

  function handleCsvFile() {
    var file = inputCsvFile.files && inputCsvFile.files[0];
    csvError.hidden = true;
    csvSummary.hidden = true;
    if (!file) return;

    fileDropText.textContent = file.name;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = parseCSV(String(reader.result));
        var texts = rowsToText(parsed, inputHasHeader.checked);
        if (texts.length === 0) {
          throw new Error('tidak ada baris data yang bisa dibaca.');
        }
        state.rows = texts.map(function (t) { return { text: t, selected: new Set() }; });
        csvSummary.hidden = false;
        csvSummary.textContent = state.rows.length + ' baris data siap dikategorikan.';
        btnStartCategorize.disabled = false;
      } catch (err) {
        state.rows = [];
        btnStartCategorize.disabled = true;
        csvError.hidden = false;
        csvError.textContent = 'Gagal membaca CSV: ' + err.message;
      }
    };
    reader.onerror = function () {
      csvError.hidden = false;
      csvError.textContent = 'Gagal membaca file. Coba lagi.';
    };
    reader.readAsText(file, 'utf-8');
  }

  inputCsvFile.addEventListener('change', handleCsvFile);
  inputHasHeader.addEventListener('change', function () {
    if (inputCsvFile.files && inputCsvFile.files[0]) handleCsvFile();
  });

  btnStartCategorize.addEventListener('click', function () {
    if (state.rows.length === 0) return;
    state.currentIndex = 0;
    state.started = true;
    showScreen('categorize');
    renderEntry();
  });

  /* ============ Layar 3: Kategorisasi ============ */

  function renderEntry() {
    var total = state.rows.length;
    var idx = state.currentIndex;
    var row = state.rows[idx];

    var pct = total > 0 ? ((idx + 1) / total) * 100 : 0;
    progressFill.style.width = pct + '%';
    progressLabel.textContent = (idx + 1) + ' / ' + total;

    entryTitle.textContent = state.itemLabel + ' ' + columnLetters(idx) + ': ' + row.text;

    categoryGrid.innerHTML = '';
    var count = state.categories.length;
    categoryGrid.classList.toggle('grid-1', count <= 2);
    categoryGrid.classList.toggle('grid-2plus', count > 2);

    state.categories.forEach(function (cat, i) {
      var box = document.createElement('button');
      box.type = 'button';
      box.className = 'category-box';
      box.textContent = cat.name;
      box.style.setProperty('--rotate', cat.sketch.rotate);
      box.style.setProperty('--cat-color', cat.color);
      box.style.setProperty('--on-fill', cat.textOnFill);
      box.style.borderRadius = cat.sketch.radius;

      var isSelected = row.selected.has(cat.id);
      box.classList.toggle('is-selected', isSelected);
      box.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      if (count > 2 && count % 2 === 1 && i === count - 1) {
        box.style.gridColumn = '1 / -1';
      }

      box.addEventListener('click', function () {
        if (row.selected.has(cat.id)) row.selected.delete(cat.id);
        else row.selected.add(cat.id);
        var nowSelected = row.selected.has(cat.id);
        box.classList.toggle('is-selected', nowSelected);
        box.setAttribute('aria-pressed', nowSelected ? 'true' : 'false');
      });

      categoryGrid.appendChild(box);
    });

    btnPrev.disabled = idx === 0;
    btnNext.textContent = idx === total - 1 ? 'Selesai' : 'Lanjut \u2192';
  }

  btnPrev.addEventListener('click', function () {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderEntry();
    }
  });

  btnNext.addEventListener('click', function () {
    var isLast = state.currentIndex === state.rows.length - 1;
    if (isLast) {
      openModal();
    } else {
      state.currentIndex++;
      renderEntry();
    }
  });

  /* ============ Modal konfirmasi ============ */

  function onModalKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function openModal() {
    modalOverlay.hidden = false;
    modalConfirm.focus();
    document.addEventListener('keydown', onModalKeydown);
  }

  function closeModal() {
    modalOverlay.hidden = true;
    document.removeEventListener('keydown', onModalKeydown);
  }

  modalCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });
  modalConfirm.addEventListener('click', function () {
    closeModal();
    finishAndDownload();
  });

  /* ============ Selesai & unduh ============ */

  function buildOutputText() {
    var dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    var catNames = state.categories.map(function (c) { return c.name; }).join(', ') || '(tidak ada kategori)';

    var out = 'KATEGORISASI DATA\n';
    out += 'Label item: ' + state.itemLabel + '\n';
    out += 'Tanggal: ' + dateStr + '\n';
    out += 'Total data: ' + state.rows.length + '\n';
    out += 'Kategori: ' + catNames + '\n';
    out += '========================================\n\n';

    state.rows.forEach(function (row, idx) {
      var names = state.categories.filter(function (c) { return row.selected.has(c.id); }).map(function (c) { return c.name; });
      out += state.itemLabel + ' ' + columnLetters(idx) + ': ' + row.text + '\n';
      out += 'Kategori: ' + (names.length > 0 ? names.join(', ') : 'Tidak ada') + '\n\n';
    });

    return out;
  }

  function downloadTextFile(text, filename) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function finishAndDownload() {
    state.started = false;
    downloadTextFile(buildOutputText(), 'kategorisasi_' + timestampSlug() + '.txt');
    doneSummary.textContent = state.rows.length + ' data telah dikategorikan dan diunduh sebagai file .txt.';
    showScreen('done');
  }

  btnDownloadAgain.addEventListener('click', function () {
    downloadTextFile(buildOutputText(), 'kategorisasi_' + timestampSlug() + '.txt');
  });

  btnRestart.addEventListener('click', function () {
    if (!window.confirm('Mulai sesi baru? Semua kategori dan data saat ini akan dihapus.')) return;
    resetApp();
  });

  function resetApp() {
    state.categories = [];
    state.rows = [];
    state.currentIndex = 0;
    state.started = false;
    nextCategoryId = 1;

    inputCatName.value = '';
    inputCatColor.value = randomColor();
    inputLabel.value = 'Guru';
    inputCsvFile.value = '';
    fileDropText.textContent = 'Ketuk untuk memilih file CSV';
    csvSummary.hidden = true;
    csvError.hidden = true;
    btnStartCategorize.disabled = true;

    renderCategoryList();
    showScreen('setup');
  }

  /* ============ Mode layar penuh (best-effort, Android) ============ */

  function requestFullscreenOnce() {
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!req) return;
    try {
      var result = req.call(el);
      if (result && typeof result.catch === 'function') result.catch(function () {});
    } catch (err) { /* abaikan jika ditolak/tidak didukung */ }
  }
  document.addEventListener('click', requestFullscreenOnce, { once: true });

  /* ============ Cegah kehilangan data tanpa sengaja ============ */

  window.addEventListener('beforeunload', function (e) {
    if (state.started && state.rows.length > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ============ Inisialisasi ============ */

  inputCatColor.value = randomColor();
  renderCategoryList();
  showScreen('setup');
})();
