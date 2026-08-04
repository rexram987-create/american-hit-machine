const state = { songs: [], filtered: [] };

const elements = {
  year: document.querySelector('#yearFilter'),
  genre: document.querySelector('#genreFilter'),
  chart: document.querySelector('#chartFilter'),
  artist: document.querySelector('#artistFilter'),
  show: document.querySelector('#showButton'),
  reset: document.querySelector('#resetButton'),
  copyAll: document.querySelector('#copyAllButton'),
  results: document.querySelector('#results'),
  empty: document.querySelector('#emptyState'),
  summary: document.querySelector('#resultSummary'),
  toast: document.querySelector('#toast')
};

const chartNames = {
  all: 'כל סוגי המצעדים',
  yearEnd: 'סיכום Billboard השנתי',
  sales: 'מכירות תקליטים של Billboard',
  radio: 'השמעות ברדיו',
  jukebox: 'מכונות ג׳וקבוקס',
  top100: 'דירוג שנתי משולב'
};

function expandDataset(data) {
  if (Array.isArray(data.charts)) return data.charts;
  if (!data.years || typeof data.years !== 'object') return [];

  return Object.entries(data.years).flatMap(([year, songs]) =>
    songs.map(([title, artist], index) => ({
      year: Number(year),
      rank: index + 1,
      title,
      artist,
      chart: data.chart || 'yearEnd',
      chartLabelHe: data.chartLabelHe || chartNames[data.chart] || '',
      genres: data.genres || [],
      sourceStatus: data.sourceStatus || 'verified',
      source: `https://en.wikipedia.org/wiki/Billboard_Year-End_Hot_100_singles_of_${year}`
    }))
  );
}

async function loadData() {
  try {
    const files = [
      'data/charts.json',
      'data/1945.json',
      'data/charts-1946-1949.json',
      'data/charts-1950-1957.json',
      'data/charts-1959-1963.json',
      'data/charts-1964-1968.json',
      'data/charts-1969-1973.json',
      'data/charts-1974-1978.json',
      'data/charts-1979-1983.json',
      'data/charts-1984-1988.json',
      'data/charts-1989-1993.json',
      'data/charts-1994-1998.json',
      'data/charts-1999-2003.json',
      'data/charts-2004-2008.json',
      'data/charts-2009-2018.json',
      'data/charts-2019-2023.json',
      'data/charts-2024-2025.json'
    ];

    const responses = await Promise.all(files.map(file => fetch(file)));
    responses.forEach(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });

    const datasets = await Promise.all(responses.map(response => response.json()));
    state.songs = datasets.flatMap(expandDataset);
    populateFilters();
    updateChartOptions('yearEnd');
    applyFilters();
  } catch (error) {
    console.error('Unable to load chart data:', error);
    elements.results.innerHTML = '<p class="empty-state">אירעה שגיאה בטעינת המאגר. נסו לרענן את העמוד.</p>';
  }
}

function uniqueSorted(values, numeric = false) {
  return [...new Set(values)].sort((a, b) => numeric ? b - a : String(a).localeCompare(String(b), 'he'));
}

function addOptions(select, options, selectedValue) {
  select.replaceChildren();
  options.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = String(value) === String(selectedValue);
    select.append(option);
  });
}

function populateFilters() {
  const years = uniqueSorted(state.songs.map(song => song.year), true);
  addOptions(elements.year, [
    { value: 'all', label: 'כל השנים' },
    ...years.map(year => ({ value: year, label: year }))
  ], years.includes(2025) ? 2025 : years[0]);

  const genres = uniqueSorted(state.songs.flatMap(song => song.genres || []));
  addOptions(elements.genre, [
    { value: 'all', label: 'כל הז׳אנרים' },
    ...genres.map(genre => ({ value: genre, label: genre }))
  ], 'all');
}

function chartsForSelectedYear() {
  const selectedYear = elements.year.value;
  const relevantSongs = selectedYear === 'all'
    ? state.songs
    : state.songs.filter(song => String(song.year) === selectedYear);
  return uniqueSorted(relevantSongs.map(song => song.chart));
}

function updateChartOptions(preferredValue) {
  const availableCharts = chartsForSelectedYear();
  const currentValue = preferredValue || elements.chart.value;
  const selectedValue = availableCharts.includes(currentValue)
    ? currentValue
    : availableCharts[0] || 'all';

  addOptions(elements.chart, [
    ...(elements.year.value === 'all' ? [{ value: 'all', label: chartNames.all }] : []),
    ...availableCharts.map(chart => ({ value: chart, label: chartNames[chart] || chart }))
  ], selectedValue);
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US');
}

function applyFilters() {
  const year = elements.year.value;
  const genre = elements.genre.value;
  const chart = elements.chart.value;
  const artist = normalize(elements.artist.value);

  state.filtered = state.songs
    .filter(song => year === 'all' || String(song.year) === year)
    .filter(song => genre === 'all' || (song.genres || []).includes(genre))
    .filter(song => chart === 'all' || song.chart === chart)
    .filter(song => !artist || normalize(song.artist).includes(artist))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);

  renderResults();
}

function renderResults() {
  elements.results.replaceChildren();
  elements.empty.hidden = state.filtered.length > 0;
  elements.copyAll.disabled = state.filtered.length === 0;

  const chartLabel = elements.chart.options[elements.chart.selectedIndex]?.textContent || '';
  const yearLabel = elements.year.value === 'all' ? 'כל השנים' : elements.year.value;
  elements.summary.textContent = `${state.filtered.length} תוצאות · ${yearLabel} · ${chartLabel}`;

  state.filtered.forEach(song => {
    const article = document.createElement('article');
    article.className = 'song-card';

    const statusLabels = {
      demo: 'נתון הדגמה',
      verified: 'נתון מאומת',
      calculated: 'דירוג מחושב'
    };

    const badges = [
      `${song.year}`,
      song.chartLabelHe || chartNames[song.chart] || song.chart,
      ...(song.genres || []),
      statusLabels[song.sourceStatus] || ''
    ].filter(Boolean);

    article.innerHTML = `
      <div class="rank" aria-label="מקום ${song.rank}">${song.rank}</div>
      <div class="song-info">
        <h3 class="song-title" dir="ltr">${escapeHtml(song.title)}</h3>
        <p class="artist-name" dir="ltr">${escapeHtml(song.artist)}</p>
        <div class="meta">${badges.map(item => `<span class="badge">${escapeHtml(item)}</span>`).join('')}</div>
      </div>
      <div class="copy-actions">
        <button type="button" data-copy="title">העתק שם שיר</button>
        <button type="button" data-copy="artist">העתק מבצע</button>
        <button type="button" data-copy="both">העתק יחד</button>
      </div>
    `;

    article.querySelector('[data-copy="title"]').addEventListener('click', () => copyText(song.title, 'שם השיר הועתק'));
    article.querySelector('[data-copy="artist"]').addEventListener('click', () => copyText(song.artist, 'שם המבצע הועתק'));
    article.querySelector('[data-copy="both"]').addEventListener('click', () => copyText(`${song.title} — ${song.artist}`, 'שם השיר והמבצע הועתקו'));
    elements.results.append(article);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    const temporary = document.createElement('textarea');
    temporary.value = text;
    temporary.setAttribute('readonly', '');
    temporary.style.position = 'fixed';
    temporary.style.opacity = '0';
    document.body.append(temporary);
    temporary.select();
    document.execCommand('copy');
    temporary.remove();
    showToast(message);
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2200);
}

function resetFilters() {
  elements.year.value = [...elements.year.options].some(option => option.value === '2025') ? '2025' : elements.year.options[0]?.value;
  elements.genre.value = 'all';
  elements.artist.value = '';
  updateChartOptions('yearEnd');
  applyFilters();
}

elements.show.addEventListener('click', applyFilters);
elements.reset.addEventListener('click', resetFilters);
elements.year.addEventListener('change', () => {
  updateChartOptions();
  applyFilters();
});
elements.genre.addEventListener('change', applyFilters);
elements.chart.addEventListener('change', applyFilters);
elements.artist.addEventListener('input', applyFilters);
elements.copyAll.addEventListener('click', () => {
  const list = state.filtered.map(song => `${song.rank}. ${song.title} — ${song.artist}`).join('\n');
  if (list) copyText(list, 'הרשימה המלאה הועתקה');
});

document.addEventListener('DOMContentLoaded', loadData);
