const STORAGE_KEY = 'naukriSavedSearches';

const searchList = document.getElementById('searchList');
const emptyState = document.getElementById('emptyState');
const clearAllBtn = document.getElementById('clearAll');

function formatTime(ts) {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function buildNaukriURL(search) {
  // Naukri search URL pattern: /keyword-jobs-in-location?experience=N
  const kw = encodeURIComponent(search.keyword || '').replace(/%20/g, '-').toLowerCase();
  const loc = encodeURIComponent(search.location || '').replace(/%20/g, '-').toLowerCase();

  let path = '/';
  if (kw && loc) path = `/${kw}-jobs-in-${loc}`;
  else if (kw) path = `/${kw}-jobs`;
  else if (loc) path = `/jobs-in-${loc}`;

  const url = new URL(`https://www.naukri.com${path}`);
  if (search.experience) url.searchParams.set('experience', search.experience);
  return url.toString();
}

function createCard(search, index) {
  const card = document.createElement('div');
  card.className = 'search-card';
  card.dataset.index = index;

  const keyword = search.keyword || '';
  const experience = search.experience || '';
  const location = search.location || '';

  const metaTags = [];
  if (experience) metaTags.push(`<span class="tag"><span class="tag-icon">💼</span>${escapeHtml(experience)}</span>`);
  if (location) metaTags.push(`<span class="tag"><span class="tag-icon">📍</span>${escapeHtml(location)}</span>`);

  card.innerHTML = `
    <div class="card-top">
      <div class="card-keyword ${keyword ? '' : 'empty'}">${keyword ? escapeHtml(keyword) : 'No keyword'}</div>
      <button class="btn-danger delete-btn" data-index="${index}" title="Remove this search">✕</button>
    </div>
    ${metaTags.length ? `<div class="card-meta">${metaTags.join('')}</div>` : ''}
    <div class="card-footer">
      <span class="card-time">${formatTime(search.timestamp)}</span>
      <div class="card-actions">
        <button class="btn-accent search-again-btn" data-index="${index}">Search again</button>
      </div>
    </div>
  `;

  card.querySelector('.delete-btn').addEventListener('click', () => deleteSearch(index));
  card.querySelector('.search-again-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: buildNaukriURL(search) });
  });

  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function render(searches) {
  // Clear existing cards but keep emptyState in DOM
  Array.from(searchList.children).forEach((child) => {
    if (child.id !== 'emptyState') child.remove();
  });

  if (!searches || searches.length === 0) {
    emptyState.style.display = 'flex';
    clearAllBtn.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  clearAllBtn.style.display = '';

  searches.forEach((search, i) => {
    searchList.appendChild(createCard(search, i));
  });
}

async function loadSearches() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  render(result[STORAGE_KEY] || []);
}

async function deleteSearch(index) {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const searches = result[STORAGE_KEY] || [];
  searches.splice(index, 1);
  await chrome.storage.local.set({ [STORAGE_KEY]: searches });
  render(searches);
}

clearAllBtn.addEventListener('click', async () => {
  if (!confirm('Clear all saved searches?')) return;
  await chrome.storage.local.remove(STORAGE_KEY);
  render([]);
});

loadSearches();
