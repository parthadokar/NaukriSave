const STORAGE_KEY = 'naukriSavedSearches';
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_SEARCH') {
    saveSearch(message.payload).then(sendResponse);
    return true; // keep channel open for async response
  }
});

async function saveSearch(search) {
  if (!search.keyword && !search.location) return { saved: false, reason: 'empty' };

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const searches = result[STORAGE_KEY] || [];

  const isDuplicate = searches.some((s) => {
    const sameCombo =
      s.keyword.toLowerCase() === search.keyword.toLowerCase() &&
      s.location.toLowerCase() === search.location.toLowerCase();
    const recentEnough = search.timestamp - s.timestamp < DEDUP_WINDOW_MS;
    return sameCombo && recentEnough;
  });

  if (isDuplicate) return { saved: false, reason: 'duplicate' };

  searches.unshift(search); // newest first

  await chrome.storage.local.set({ [STORAGE_KEY]: searches });
  return { saved: true };
}
