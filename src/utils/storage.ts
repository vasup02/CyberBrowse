import { debounce } from './debounce';

const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  searchProvider: 'duckduckgo',
  shortcuts: [],
  widgets: [],
  layout: 'simple',
  wallpaper: undefined,
  barPosition: 'center',
  shortcutLayout: 'grid',
  layoutOrder: ['clock', 'search-bar', 'shortcuts'],
  widgetSizes: {}
};

export async function getSettings(): Promise<Settings> {
  return new Promise(resolve => {
    chrome.storage.local.get([SETTINGS_KEY], result => {
      const stored = result[SETTINGS_KEY] as Settings | undefined;
      resolve(stored ?? DEFAULT_SETTINGS);
    });
  });
}

export async function setSettings(settings: Settings): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => resolve());
  });
}

// Debounced partial update
export const updateSettings = debounce(async (partial: Partial<Settings>) => {
  const current = await getSettings();
  const updated = { ...current, ...partial } as Settings;
  await setSettings(updated);
}, 300);

