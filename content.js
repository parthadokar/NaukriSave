// Naukri.com search field selectors (verified against live site structure)
const SELECTORS = {
  keyword: [
    'input[placeholder*="Skills"]',
    'input[placeholder*="Designation"]',
    'input[placeholder*="keyword"]',
    '.keywordSugg input',
    '#keywordSugg input',
    'input[id*="keyword"]',
  ],
  experience: [
    '.expwrapper .nI-gNb-sb__select',
    'select[id*="experiencelevel"]',
    '.experience select',
    '[class*="expwrapper"] select',
    'select[name*="experience"]',
  ],
  location: [
    'input[placeholder*="Location"]',
    'input[placeholder*="location"]',
    '.locationSugg input',
    '#locationSugg input',
    'input[id*="location"]',
  ],
  searchBtn: [
    'button[type="submit"]',
    '.search-btn',
    'button.nI-gNb-sb__icon--search',
    '[class*="searchButton"]',
    'button[class*="search"]',
  ],
};

function querySelector(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function getFieldValue(selectors) {
  const el = querySelector(selectors);
  if (!el) return '';
  if (el.tagName === 'SELECT') {
    return el.options[el.selectedIndex]?.text?.trim() || '';
  }
  return el.value?.trim() || '';
}

function captureSearch() {
  const keyword = getFieldValue(SELECTORS.keyword);
  const experience = getFieldValue(SELECTORS.experience);
  const location = getFieldValue(SELECTORS.location);

  if (!keyword && !location) return;

  const search = {
    keyword,
    experience,
    location,
    url: window.location.href,
    timestamp: Date.now(),
  };

  chrome.runtime.sendMessage({ type: 'SAVE_SEARCH', payload: search });
}

function attachSearchListener() {
  const btn = querySelector(SELECTORS.searchBtn);
  if (btn && !btn.__naukriSaveAttached) {
    btn.addEventListener('click', captureSearch);
    btn.__naukriSaveAttached = true;
  }

  // Also listen for Enter key in keyword/location inputs
  [...SELECTORS.keyword, ...SELECTORS.location].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el && !el.__naukriSaveAttached) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') captureSearch();
      });
      el.__naukriSaveAttached = true;
    }
  });
}

// Naukri is a SPA — re-attach on navigation
function observeDOM() {
  attachSearchListener();
  const observer = new MutationObserver(() => attachSearchListener());
  observer.observe(document.body, { childList: true, subtree: true });
}

// Capture from URL params — Naukri uses ?k= (keyword) and ?l= (location)
function captureFromURL() {
  const url = new URL(window.location.href);

  // Primary params used by Naukri search results
  const keyword = url.searchParams.get('k') || '';
  const location = url.searchParams.get('l') || '';
  const experience = url.searchParams.get('experience') || url.searchParams.get('exp') || '';

  if (!keyword && !location) return;

  const search = {
    keyword: decodeURIComponent(keyword).trim(),
    experience: decodeURIComponent(experience).trim(),
    location: decodeURIComponent(location).trim(),
    url: window.location.href,
    timestamp: Date.now(),
  };
  chrome.runtime.sendMessage({ type: 'SAVE_SEARCH', payload: search });
}

function isSearchResultPage() {
  const path = window.location.pathname;
  const search = window.location.search;
  return (
    path.includes('-jobs') ||
    search.includes('?k=') ||
    search.includes('&k=') ||
    search.includes('?l=') ||
    search.includes('nignbevent_src=jobsearch')
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    observeDOM();
    if (isSearchResultPage()) captureFromURL();
  });
} else {
  observeDOM();
  if (isSearchResultPage()) captureFromURL();
}

// Handle Naukri SPA navigation (pushState / replaceState)
let lastURL = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastURL) {
    lastURL = window.location.href;
    if (isSearchResultPage()) captureFromURL();
  }
}).observe(document, { subtree: true, childList: true });
