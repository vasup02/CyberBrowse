chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Set default settings if they are not already present.
    chrome.storage.local.set({ settings: getDefaultSettings() }, () => {
      // Open the new tab page on first install as a quick welcome.
      chrome.tabs.create({ url: chrome.runtime.getURL('newtab/newtab.html') });
      syncWallpaperPlaylistAlarm();
    });
  } else {
    syncWallpaperPlaylistAlarm();
  }
});

const WALLPAPER_PLAYLIST_ALARM = 'wallpaper-playlist';
const SETTINGS_KEY = 'settings';

function readSettings(): Promise<Settings | undefined> {
  return new Promise(resolve => chrome.storage.local.get([SETTINGS_KEY], result => resolve(result[SETTINGS_KEY] as Settings | undefined)));
}

function playlistScheduleKey(playlist?: WallpaperPlaylist): string {
  if (!playlist) return '';
  return JSON.stringify({ enabled: playlist.enabled, mode: playlist.mode, intervalMinutes: playlist.intervalMinutes, items: playlist.items.map(item => item.reference) });
}

async function syncWallpaperPlaylistAlarm() {
  const settings = await readSettings();
  const playlist = settings?.wallpaperPlaylist;
  chrome.alarms.clear(WALLPAPER_PLAYLIST_ALARM, () => {
    if (!playlist?.enabled || playlist.items.length < 2) return;
    const intervalMinutes = Math.max(1, Math.min(24 * 60, Number(playlist.intervalMinutes) || 1));
    chrome.alarms.create(WALLPAPER_PLAYLIST_ALARM, { delayInMinutes: intervalMinutes, periodInMinutes: intervalMinutes });
  });
}

chrome.runtime.onStartup.addListener(() => { void syncWallpaperPlaylistAlarm(); });

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[SETTINGS_KEY]) return;
  const previous = changes[SETTINGS_KEY].oldValue as Settings | undefined;
  const next = changes[SETTINGS_KEY].newValue as Settings | undefined;
  if (playlistScheduleKey(previous?.wallpaperPlaylist) !== playlistScheduleKey(next?.wallpaperPlaylist)) {
    void syncWallpaperPlaylistAlarm();
  }
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== WALLPAPER_PLAYLIST_ALARM) return;
  void advanceWallpaperPlaylist();
});

async function advanceWallpaperPlaylist() {
  const settings = await readSettings();
  const playlist = settings?.wallpaperPlaylist;
  if (!settings || !playlist?.enabled || playlist.items.length < 2) return;

  const items = playlist.items;
  const currentReference = playlist.currentReference ?? settings.wallpaper;
  const currentIndex = items.findIndex(item => item.reference === currentReference);
  let nextIndex: number;
  let randomOrder = playlist.randomOrder;
  if (playlist.mode === 'random') {
    const available = new Set(items.map(item => item.reference));
    randomOrder = (randomOrder ?? []).filter(reference => available.has(reference) && reference !== currentReference);
    if (randomOrder.length === 0) {
      randomOrder = items.map(item => item.reference).filter(reference => reference !== currentReference);
      // Shuffle the remaining wallpapers; keep this queue in storage so every
      // item appears once before another cycle begins.
      for (let index = randomOrder.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [randomOrder[index], randomOrder[swapIndex]] = [randomOrder[swapIndex], randomOrder[index]];
      }
    }
    const nextReference = randomOrder.shift();
    nextIndex = items.findIndex(item => item.reference === nextReference);
  } else {
    nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    randomOrder = [];
  }
  const next = items[nextIndex];
  if (!next) return;
  const savedVolume = settings.wallpaperVolumes?.[next.reference];
  const muted = typeof savedVolume === 'number' ? savedVolume <= 0 : next.muted;
  chrome.storage.local.set({
    [SETTINGS_KEY]: {
      ...settings,
      wallpaper: next.reference,
      wallpaperMuted: muted,
      wallpaperPlaylist: { ...playlist, currentReference: next.reference, randomOrder }
    }
  });
}

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
