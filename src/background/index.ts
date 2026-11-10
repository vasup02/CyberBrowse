chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Set default settings if they are not already present.
    chrome.storage.local.set({ settings: getDefaultSettings() }, () => {
      // Open the new tab page on first install as a quick welcome.
      chrome.tabs.create({ url: chrome.runtime.getURL('newtab/newtab.html') });
    });
  }
});

function getDefaultSettings(): Settings {
  return {
    theme: 'system',
    searchProvider: 'duckduckgo',
    shortcuts: [],
    widgets: [],
    layout: 'simple',
    wallpaper: '',
    barPosition: 'center',
    shortcutLayout: 'grid',
    layoutOrder: ['clock', 'search-bar', 'shortcuts'],
    widgetSizes: {}
  };
}

// Open CyberBrowse New Tab when the user clicks the toolbar button
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('newtab/newtab.html') });
});
