import { getSettings, updateSettings, setSettings } from '../utils/storage';
import { isValidUrl } from '../utils/validation';
import { deleteWallpaperMedia, listWallpaperMedia, storeWallpaperMedia, STORED_WALLPAPER_PREFIX } from '../utils/wallpaperMedia';

async function saveWallpaperBlob(blob: Blob, filename = ''): Promise<string> {
  const extension = filename.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  const fallbackMime: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg', gif: 'image/gif', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
  const mime = blob.type.startsWith('image/') || blob.type.startsWith('video/')
    ? blob.type
    : fallbackMime[extension ?? ''] || '';
  if (!mime.startsWith('image/') && !mime.startsWith('video/')) throw new Error('Choose an image or a supported video file.');
  const reference = await storeWallpaperMedia(new Blob([blob], { type: mime }), filename.split(/[?#]/)[0].split('/').pop() || 'Wallpaper');
  const current = await getSettings();
  await setSettings({ ...current, wallpaper: reference, wallpaperMuted: true });
  return reference;
}

async function initOptions() {
  const settings = await getSettings();
  const applyOptionsTheme = (theme: Settings['theme']) => {
    document.documentElement.dataset.theme = theme ?? 'system';
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === 'light' || (theme === 'system' && prefersLight) ? '#f4f1e9' : '#1c1b18';
  };
  applyOptionsTheme(settings.theme ?? 'system');
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (document.documentElement.dataset.theme === 'system') applyOptionsTheme('system');
  });
  const root = document.getElementById('options-root');
  if (!root) return;

  root.innerHTML = `
  <div class="settings-shell">
    <header class="settings-header">
      <div class="brand-lockup"><img class="brand-mark" src="../icons/128.png" alt="" /><div><p class="overline">CYBERBROWSE</p><h1>Settings</h1></div></div>
      <span class="save-indicator"><i aria-hidden="true"></i> Changes save automatically</span>
    </header>
    <div class="settings-layout">
      <nav class="tabs" aria-label="Settings navigation">
        <p class="nav-caption">PREFERENCES</p>
        <ul>
          <li><a href="#general" class="tab active" aria-current="page"><span class="tab-icon">◈</span>General</a></li>
          <li><a href="#search" class="tab"><span class="tab-icon">⌕</span>Search</a></li>
          <li><a href="#wallpaper" class="tab"><span class="tab-icon">▧</span>Wallpaper</a></li>
          <li><a href="#widgets" class="tab"><span class="tab-icon">▦</span>Widgets</a></li>
          <li><a href="#advanced" class="tab"><span class="tab-icon">⚙</span>Advanced</a></li>
        </ul>
        <div class="privacy-note"><span class="privacy-dot"></span><div><strong>Your space, your rules</strong><small>Settings stay in this browser.</small></div></div>
      </nav>

      <main class="settings-main">
        <section id="general" class="panel active" aria-labelledby="general-title">
          <div class="panel-heading"><div><p class="overline">YOUR WORKSPACE</p><h2 id="general-title">General</h2><p>Set the look and starting layout for your new tab.</p></div></div>
          <div class="settings-card">
            <div class="setting-row"><div class="setting-copy"><label for="theme-select">Appearance</label><small>Choose a theme for CyberBrowse.</small></div><select id="theme-select"><option value="light">Light</option><option value="dark">Dark</option><option value="system">Match browser</option></select></div>
            <div class="setting-row"><div class="setting-copy"><label for="bar-position-select">Search placement</label><small>Choose where the search widget starts.</small></div><select id="bar-position-select"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div>
          </div>
          <div class="danger-row"><div><strong>Start fresh</strong><small>Restore the default theme, search and layout settings.</small></div><button id="reset-btn" class="button button-quiet" type="button">Reset settings</button></div>
        </section>

        <section id="search" class="panel" aria-labelledby="search-title">
          <div class="panel-heading"><div><p class="overline">WEB SEARCH</p><h2 id="search-title">Search</h2><p>Choose the provider used by your new-tab search field.</p></div></div>
          <div class="settings-card"><div class="setting-row"><div class="setting-copy"><label for="search-provider-select">Search provider</label><small>Pick a provider or add your own endpoint.</small></div><select id="search-provider-select"><option value="duckduckgo">DuckDuckGo</option><option value="google">Google</option><option value="bing">Bing</option><option value="brave">Brave Search</option><option value="startpage">Startpage</option><option value="custom">Custom</option></select></div>
            <section id="custom-url-section" class="field-block" style="display:none"><label for="custom-url-input">Custom search URL</label><small>Use %s where your search query should go.</small><input type="text" id="custom-url-input" placeholder="https://example.com/search?q=%s" /></section>
          </div>
        </section>

        <section id="wallpaper" class="panel" aria-labelledby="wallpaper-title">
          <div class="panel-heading"><div><p class="overline">MAKE IT YOURS</p><h2 id="wallpaper-title">Wallpaper</h2><p>Set the backdrop that welcomes you to every new tab.</p></div></div>
          <div class="settings-card"><div class="field-block"><label for="wallpaper-input">Upload an image or live wallpaper</label><small>Choose an image, GIF, or video from your device. Videos loop; use the speaker on your new tab to hear the original audio.</small><input type="file" id="wallpaper-input" accept="image/*,video/*" /></div><div class="field-block"><label for="wallpaper-muted-input">Start video wallpapers muted</label><small>Browsers may require a click before video audio can play.</small><input type="checkbox" id="wallpaper-muted-input" /></div><div class="field-block"><label for="remote-wallpaper-input">Use a wallpaper URL</label><small>Paste a direct link to an image or video. CyberBrowse asks permission to fetch it from that site.</small><input type="text" id="remote-wallpaper-input" placeholder="https://example.com/wallpaper.mp4" /><div class="button-row"><button id="apply-remote-wallpaper-btn" class="button button-primary" type="button">Apply wallpaper</button><button id="open-opera-wallpapers-btn" class="button button-secondary" type="button">Explore Opera wallpapers ↗</button></div></div><div class="field-block wallpaper-library-block"><div class="wallpaper-library-heading"><div><label>Saved wallpapers</label><small>Choose one you have used before, or remove it from this device.</small></div><button id="refresh-wallpaper-library" class="button button-quiet" type="button">Refresh</button></div><div id="wallpaper-library" class="wallpaper-library" aria-live="polite"></div></div></div>
        </section>

        <section id="widgets" class="panel" aria-labelledby="widgets-title">
          <div class="panel-heading"><div><p class="overline">NEW TAB</p><h2 id="widgets-title">Widgets</h2><p>Arrange the clock, search and quick links around your page.</p></div></div>
          <div class="widget-preview" aria-hidden="true"><div class="preview-search"><span>⌕</span>Search the web privately</div><div class="preview-clock"><b>09:41</b><span>Today</span></div><div class="preview-links"><i>M</i><i>A</i><i>+</i></div></div>
          <div class="settings-card widget-action"><div class="setting-copy"><strong>Make the layout yours</strong><small>Drag widgets into place and resize them to fit.</small></div><button id="customize-tabs-btn" class="button button-primary" type="button">Customize layout <span aria-hidden="true">↗</span></button></div>
        </section>

        <section id="advanced" class="panel" aria-labelledby="advanced-title">
          <div class="panel-heading"><div><p class="overline">BACKUP & TOOLS</p><h2 id="advanced-title">Advanced</h2><p>Move your preferences between browser profiles.</p></div></div>
          <div class="settings-card"><div class="setting-row"><div class="setting-copy"><strong>Export settings</strong><small>Download a copy of your current preferences.</small></div><button id="export-btn" class="button button-secondary" type="button">Export JSON</button></div><div class="setting-row"><div class="setting-copy"><strong>Import settings</strong><small>Restore preferences from a CyberBrowse backup.</small></div><button id="import-btn" class="button button-secondary" type="button">Choose file</button><input type="file" id="import-file" accept="application/json" hidden /></div></div>
        </section>
      </main>
    </div>
  </div>`;


  // Populate current values
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
  themeSelect.value = settings.theme ?? 'system';

  const providerSelect = document.getElementById('search-provider-select') as HTMLSelectElement;
  providerSelect.value = settings.searchProvider ?? 'duckduckgo';

  const customUrlSection = document.getElementById('custom-url-section') as HTMLElement;
  const customUrlInput = document.getElementById('custom-url-input') as HTMLInputElement;
  if (settings.searchProvider === 'custom') {
    customUrlSection.style.display = '';
    customUrlInput.value = settings.customSearchUrl ?? '';
  }

  const barPositionSelect = document.getElementById('bar-position-select') as HTMLSelectElement;
  barPositionSelect.value = settings.barPosition ?? 'center';
  const wallpaperMutedInput = document.getElementById('wallpaper-muted-input') as HTMLInputElement;
  wallpaperMutedInput.checked = settings.wallpaperMuted ?? true;

  // Event listeners
  themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value as Settings['theme'];
    applyOptionsTheme(theme);
    updateSettings({ theme });
  });

  providerSelect.addEventListener('change', () => {
    const val = providerSelect.value as Settings['searchProvider'];
    updateSettings({ searchProvider: val });
    if (val === 'custom') {
      customUrlSection.style.display = '';
    } else {
      customUrlSection.style.display = 'none';
    }
  });

  customUrlInput.addEventListener('blur', () => {
    const url = customUrlInput.value.trim();
    if (url && !isValidUrl(url)) {
      alert('Invalid custom URL');
    } else {
      updateSettings({ customSearchUrl: url || undefined });
    }
  });

  barPositionSelect.addEventListener('change', () => {
    updateSettings({ barPosition: barPositionSelect.value as Settings['barPosition'] });
  });

  // Wallpaper handling
  const wallpaperInput = document.getElementById('wallpaper-input') as HTMLInputElement;
  const wallpaperLibrary = document.getElementById('wallpaper-library') as HTMLDivElement;
  let previewUrls: string[] = [];
  const renderWallpaperLibrary = async () => {
    previewUrls.forEach(URL.revokeObjectURL);
    previewUrls = [];
    const entries = await listWallpaperMedia();
    const current = (await getSettings()).wallpaper;
    wallpaperLibrary.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'wallpaper-library-empty';
      empty.textContent = 'Your saved wallpapers will appear here.';
      wallpaperLibrary.append(empty);
      return;
    }
    for (const entry of entries) {
      const card = document.createElement('article');
      card.className = 'wallpaper-card';
      const previewUrl = URL.createObjectURL(entry.media);
      previewUrls.push(previewUrl);
      const preview = document.createElement(entry.media.type.startsWith('video/') ? 'video' : 'img');
      preview.className = 'wallpaper-card-preview';
      preview.src = previewUrl;
      if (preview instanceof HTMLVideoElement) {
        preview.muted = true;
        preview.loop = true;
        preview.autoplay = true;
        preview.playsInline = true;
      } else {
        preview.alt = '';
      }
      const details = document.createElement('div');
      details.className = 'wallpaper-card-details';
      const name = document.createElement('strong');
      name.textContent = entry.name;
      const kind = document.createElement('small');
      kind.textContent = entry.media.type.startsWith('video/') ? 'Live wallpaper' : 'Image wallpaper';
      details.append(name, kind);
      const actions = document.createElement('div');
      actions.className = 'wallpaper-card-actions';
      const useButton = document.createElement('button');
      useButton.className = 'button button-secondary';
      useButton.type = 'button';
      useButton.textContent = current === `${STORED_WALLPAPER_PREFIX}${entry.id}` ? 'Using now' : 'Use wallpaper';
      useButton.disabled = current === `${STORED_WALLPAPER_PREFIX}${entry.id}`;
      useButton.addEventListener('click', async () => {
        const latest = await getSettings();
        await setSettings({ ...latest, wallpaper: `${STORED_WALLPAPER_PREFIX}${entry.id}` });
        await renderWallpaperLibrary();
      });
      const removeButton = document.createElement('button');
      removeButton.className = 'button button-quiet';
      removeButton.type = 'button';
      removeButton.textContent = 'Remove';
      removeButton.disabled = entry.id === 'current' || current === `${STORED_WALLPAPER_PREFIX}${entry.id}`;
      removeButton.title = removeButton.disabled && entry.id !== 'current' ? 'Switch wallpapers before removing the one in use' : 'Remove saved wallpaper';
      removeButton.addEventListener('click', async () => {
        await deleteWallpaperMedia(entry.id);
        await renderWallpaperLibrary();
      });
      actions.append(useButton, removeButton);
      card.append(preview, details, actions);
      wallpaperLibrary.append(card);
    }
  };
  void renderWallpaperLibrary();
  document.getElementById('refresh-wallpaper-library')?.addEventListener('click', () => void renderWallpaperLibrary());
  wallpaperInput.addEventListener('change', () => {
    const file = wallpaperInput.files?.[0];
    if (!file) return;
    void saveWallpaperBlob(file, file.name).then(() => {
      void renderWallpaperLibrary();
      alert('Wallpaper updated. Reload New Tab to see it.');
    }).catch(error => {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Could not save this wallpaper.');
    });
  });

  wallpaperMutedInput.addEventListener('change', async () => {
    const current = await getSettings();
    await setSettings({ ...current, wallpaperMuted: wallpaperMutedInput.checked });
  });


  // Export / Import
  // Remote wallpaper event listeners
  const remoteInput = document.getElementById('remote-wallpaper-input') as HTMLInputElement;
  const applyRemoteBtn = document.getElementById('apply-remote-wallpaper-btn') as HTMLButtonElement;
  const openOperaBtn = document.getElementById('open-opera-wallpapers-btn') as HTMLButtonElement;

  applyRemoteBtn.addEventListener('click', async () => {
    const url = remoteInput.value.trim();
    if (!url) {
      alert('Please enter a wallpaper URL.');
      return;
    }
    if (!isValidUrl(url)) {
      alert('Invalid URL.');
      return;
    }
    try {
      const wallpaperUrl = new URL(url);
      const granted = await chrome.permissions.request({ origins: [`${wallpaperUrl.protocol}//${wallpaperUrl.hostname}/*`] });
      if (!granted) {
        alert('Site access was not granted, so the wallpaper URL was not fetched.');
        return;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      await saveWallpaperBlob(blob, url);
      await renderWallpaperLibrary();
      alert('Remote wallpaper applied. Reload New Tab to see it.');
    } catch (e) {
      console.error(e);
      alert('Failed to fetch or apply wallpaper.');
    }
  });

  openOperaBtn.addEventListener('click', () => {
    window.open('https://addons.opera.com/en/wallpapers/', '_blank');
  });

  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  exportBtn.addEventListener('click', async () => {
    const current = await getSettings();
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cyberbrowse-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
  const importFile = document.getElementById('import-file') as HTMLInputElement;
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text) as Settings;
      // Minimal validation
      if (!obj.theme || !obj.searchProvider) {
        alert('Invalid settings file.');
        return;
      }
      await setSettings(obj);
      applyOptionsTheme(obj.theme);
      alert('Settings imported. Reload New Tab to apply.');
    } catch (e) {
      console.error(e);
      alert('Failed to import settings.');
    }
  });

  const customizeLayoutBtn = document.getElementById('customize-tabs-btn') as HTMLButtonElement;
  customizeLayoutBtn.addEventListener('click', () => {
    const editorUrl = chrome.runtime.getURL('newtab/newtab.html?customize=1');
    window.open(editorUrl, '_blank');
  });

  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  resetBtn.addEventListener('click', async () => {
    if (confirm('Reset all settings to defaults?')) {
      const defaultSettings: Settings = {
        theme: 'system',
        searchProvider: 'duckduckgo',
        shortcuts: [],
        widgets: [],
        layout: 'simple',
        wallpaper: undefined,
        wallpaperMuted: true,
        barPosition: 'center',
        shortcutLayout: 'grid',
      };
      await setSettings(defaultSettings);
      applyOptionsTheme(defaultSettings.theme);
      alert('Settings reset. Reload New Tab to see defaults.');
    }
  });

  // Tab navigation logic
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = (tab as HTMLAnchorElement).getAttribute('href')?.substring(1);
      if (!targetId) return;
      tabs.forEach(t => {
        t.classList.remove('active');
        t.removeAttribute('aria-current');
      });
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-current', 'page');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
    });
  });
}

      // Remote wallpaper UI will be generated in initOptions

      document.addEventListener('DOMContentLoaded', initOptions);
