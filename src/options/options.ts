import { getSettings, updateSettings, setSettings } from '../utils/storage';
import { isValidUrl } from '../utils/validation';
import { deleteWallpaperMedia, getWallpaperLibraryUsage, listWallpaperMedia, MAX_WALLPAPER_COUNT, MAX_WALLPAPER_STORAGE_BYTES, MAX_WALLPAPER_UPLOAD_BATCH, storeWallpaperMedia, STORED_WALLPAPER_PREFIX } from '../utils/wallpaperMedia';

function normalizeWallpaperBlob(blob: Blob, filename = ''): Blob {
  const extension = filename.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  const fallbackMime: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg', gif: 'image/gif', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
  const mime = blob.type.startsWith('image/') || blob.type.startsWith('video/')
    ? blob.type
    : fallbackMime[extension ?? ''] || '';
  if (!mime.startsWith('image/') && !mime.startsWith('video/')) throw new Error('Choose an image or a supported video file.');
  return new Blob([blob], { type: mime });
}

async function saveWallpaperBlob(blob: Blob, filename = ''): Promise<string> {
  const normalized = normalizeWallpaperBlob(blob, filename);
  const reference = await storeWallpaperMedia(normalized, filename.split(/[?#]/)[0].split('/').pop() || 'Wallpaper');
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
          <div class="settings-card">
            <div class="field-block"><label for="wallpaper-input">Upload wallpapers</label><small>Choose up to 5 images or videos at once. Review a static preview and choose whether to save, add each to your playlist, or use it now. Your library is limited to 20 wallpapers and 1 GB total.</small><input type="file" id="wallpaper-input" accept="image/*,video/*" multiple /></div>
            <div class="field-block"><label for="wallpaper-muted-input">Start new videos muted by default</label><small>This default applies until you set a volume for an individual wallpaper. Browsers may require a click before video audio can play.</small><input type="checkbox" id="wallpaper-muted-input" /></div>
            <div class="field-block"><label for="remote-wallpaper-input">Use a wallpaper URL</label><small>Paste a direct link to an image or video. CyberBrowse asks permission to fetch it from that site.</small><input type="text" id="remote-wallpaper-input" placeholder="https://example.com/wallpaper.mp4" /><div class="button-row"><button id="apply-remote-wallpaper-btn" class="button button-primary" type="button">Apply wallpaper</button><button id="open-opera-wallpapers-btn" class="button button-secondary" type="button">Explore Opera wallpapers ↗</button></div></div>
            <section class="field-block wallpaper-playlist-block" aria-labelledby="wallpaper-playlist-title">
              <div class="wallpaper-library-heading"><div><label id="wallpaper-playlist-title">Wallpaper playlist</label><small>Add saved wallpapers below, then rotate them automatically. Each video can keep its own sound setting.</small></div></div>
              <div class="wallpaper-playlist-controls">
                <label class="wallpaper-playlist-toggle"><input id="wallpaper-playlist-enabled" type="checkbox" /><span>Automatically rotate wallpapers</span></label>
                <label><span>Order</span><select id="wallpaper-playlist-mode"><option value="sequential">Sequential</option><option value="random">Random</option></select></label>
                <label><span>Change every</span><select id="wallpaper-playlist-interval"><option value="1">1 minute</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option></select></label>
              </div>
              <p id="wallpaper-playlist-status" class="wallpaper-playlist-status" aria-live="polite"></p>
              <div id="wallpaper-playlist-list" class="wallpaper-playlist-list" aria-live="polite"></div>
            </section>
            <div class="field-block wallpaper-library-block"><div class="wallpaper-library-heading"><div><label>Saved wallpapers</label><small>Choose one you have used before, or add it to your playlist.</small></div><button id="refresh-wallpaper-library" class="button button-quiet" type="button">Refresh</button></div><div id="wallpaper-library" class="wallpaper-library" aria-live="polite"></div></div>
          </div>
          <dialog id="wallpaper-upload-dialog" class="wallpaper-upload-dialog" aria-labelledby="wallpaper-upload-title">
            <div class="wallpaper-upload-content">
              <div class="wallpaper-library-heading"><div><label id="wallpaper-upload-title">Add your wallpapers</label><small>Preview each file and choose what to do with it. Files are saved in this browser.</small></div><button id="wallpaper-upload-close" class="button button-quiet" type="button" aria-label="Close upload dialog">×</button></div>
              <div id="wallpaper-upload-items" class="wallpaper-upload-items"></div>
              <p id="wallpaper-upload-status" class="wallpaper-playlist-status" role="status"></p>
              <div class="wallpaper-upload-actions"><button id="wallpaper-upload-cancel" class="button button-secondary" type="button">Cancel</button><button id="wallpaper-upload-confirm" class="button button-primary" type="button">Add wallpapers</button></div>
            </div>
          </dialog>
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
  const playlistEnabledInput = document.getElementById('wallpaper-playlist-enabled') as HTMLInputElement;
  const playlistModeSelect = document.getElementById('wallpaper-playlist-mode') as HTMLSelectElement;
  const playlistIntervalSelect = document.getElementById('wallpaper-playlist-interval') as HTMLSelectElement;
  const playlistStatus = document.getElementById('wallpaper-playlist-status') as HTMLParagraphElement;
  const playlistList = document.getElementById('wallpaper-playlist-list') as HTMLDivElement;
  const readPlaylist = (current: Settings): WallpaperPlaylist => current.wallpaperPlaylist ?? {
    enabled: false,
    mode: 'sequential',
    intervalMinutes: 5,
    items: []
  };
  const getWallpaperVolume = (current: Settings, reference: string, mutedFallback?: boolean) => {
    const saved = current.wallpaperVolumes?.[reference];
    if (typeof saved === 'number' && Number.isFinite(saved)) return Math.max(0, Math.min(1, saved));
    if (current.wallpaper === reference) return current.wallpaperMuted === false ? 1 : 0;
    return mutedFallback === false ? 1 : 0;
  };
  const setWallpaperVolume = async (reference: string, volume: number) => {
    const current = await getSettings();
    const normalized = Math.max(0, Math.min(1, volume));
    const playlist = readPlaylist(current);
    await setSettings({
      ...current,
      wallpaperVolumes: { ...current.wallpaperVolumes, [reference]: normalized },
      ...(current.wallpaper === reference ? { wallpaperMuted: normalized === 0 } : {}),
      wallpaperPlaylist: {
        ...playlist,
        items: playlist.items.map(item => item.reference === reference ? { ...item, muted: normalized === 0 } : item)
      }
    });
    await renderWallpaperLibrary();
  };
  const makeVolumeControl = (current: Settings, reference: string, mutedFallback?: boolean) => {
    const label = document.createElement('label');
    label.className = 'wallpaper-volume-control';
    const title = document.createElement('span');
    title.textContent = 'Volume';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.value = String(Math.round(getWallpaperVolume(current, reference, mutedFallback) * 100));
    slider.setAttribute('aria-label', `Wallpaper volume, ${Math.round(Number(slider.value))} percent`);
    const value = document.createElement('output');
    value.textContent = `${slider.value}%`;
    slider.addEventListener('input', () => {
      value.textContent = `${slider.value}%`;
      slider.setAttribute('aria-label', `Wallpaper volume, ${slider.value} percent`);
    });
    slider.addEventListener('change', () => { void setWallpaperVolume(reference, Number(slider.value) / 100); });
    label.append(title, slider, value);
    return label;
  };
  const updatePlaylist = async (mutate: (playlist: WallpaperPlaylist) => WallpaperPlaylist) => {
    const latest = await getSettings();
    await setSettings({ ...latest, wallpaperPlaylist: mutate(readPlaylist(latest)) });
    await renderWallpaperLibrary();
  };
  const renderWallpaperPlaylist = async () => {
    const [current, entries] = await Promise.all([getSettings(), listWallpaperMedia()]);
    const playlist = readPlaylist(current);
    playlistEnabledInput.checked = playlist.enabled;
    playlistModeSelect.value = playlist.mode;
    playlistIntervalSelect.value = String(playlist.intervalMinutes);
    playlistList.replaceChildren();
    const playable = playlist.items.filter(item => entries.some(entry => `${STORED_WALLPAPER_PREFIX}${entry.id}` === item.reference));
    playlistStatus.textContent = playlist.enabled
      ? playable.length < 2 ? 'Add at least two saved wallpapers to start automatic rotation.' : `Rotating ${playable.length} wallpapers ${playlist.mode === 'random' ? 'in random order' : 'in sequence'} every ${playlist.intervalMinutes} minute${playlist.intervalMinutes === 1 ? '' : 's'}.`
      : `${playable.length} wallpaper${playable.length === 1 ? '' : 's'} in your playlist. Rotation is paused.`;
    if (!playable.length) {
      const empty = document.createElement('p');
      empty.className = 'wallpaper-library-empty';
      empty.textContent = 'Add saved wallpapers from the library below.';
      playlistList.append(empty);
      return;
    }
    playlist.items.forEach((item, index) => {
      const entry = entries.find(candidate => `${STORED_WALLPAPER_PREFIX}${candidate.id}` === item.reference);
      if (!entry) return;
      const row = document.createElement('article');
      row.className = 'wallpaper-playlist-row';
      const number = document.createElement('span');
      number.className = 'wallpaper-playlist-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const details = document.createElement('div');
      details.className = 'wallpaper-playlist-details';
      const name = document.createElement('strong');
      name.textContent = entry.name;
      const kind = document.createElement('small');
      const isVideo = entry.media.type.startsWith('video/');
      kind.textContent = isVideo ? 'Live wallpaper' : 'Image wallpaper';
      details.append(name, kind);
      row.append(number, details);
      if (isVideo) {
        row.appendChild(makeVolumeControl(current, item.reference, item.muted));
      }
      const actions = document.createElement('div');
      actions.className = 'wallpaper-playlist-actions';
      const moveButton = (label: string, title: string, targetIndex: number) => {
        const button = document.createElement('button');
        button.className = 'button button-quiet';
        button.type = 'button';
        button.textContent = label;
        button.title = title;
        button.disabled = targetIndex < 0 || targetIndex >= playlist.items.length;
        button.addEventListener('click', () => {
          void updatePlaylist(value => {
            const items = [...value.items];
            const [moved] = items.splice(index, 1);
            items.splice(targetIndex, 0, moved);
            return { ...value, items };
          });
        });
        return button;
      };
      actions.append(moveButton('↑', `Move ${entry.name} up`, index - 1), moveButton('↓', `Move ${entry.name} down`, index + 1));
      const remove = document.createElement('button');
      remove.className = 'button button-quiet';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        void updatePlaylist(value => ({
          ...value,
          items: value.items.filter((_, candidateIndex) => candidateIndex !== index),
          currentReference: value.currentReference === item.reference ? undefined : value.currentReference
        }));
      });
      actions.appendChild(remove);
      row.appendChild(actions);
      playlistList.append(row);
    });
  };
  let previewUrls: string[] = [];
  const renderWallpaperLibrary = async () => {
    previewUrls.forEach(URL.revokeObjectURL);
    previewUrls = [];
    const entries = await listWallpaperMedia();
    const currentSettings = await getSettings();
    const current = currentSettings.wallpaper;
    await renderWallpaperPlaylist();
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
      const isVideo = entry.media.type.startsWith('video/');
      kind.textContent = isVideo ? 'Live wallpaper' : 'Image wallpaper';
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
        const reference = `${STORED_WALLPAPER_PREFIX}${entry.id}`;
        const playlist = readPlaylist(latest);
        const playlistItem = playlist.items.find(item => item.reference === reference);
        const volume = getWallpaperVolume(latest, reference, playlistItem?.muted);
        await setSettings({
          ...latest,
          wallpaper: reference,
          wallpaperMuted: volume === 0,
          ...(playlistItem ? { wallpaperPlaylist: { ...playlist, currentReference: reference } } : {})
        });
        await renderWallpaperLibrary();
      });
      const playlist = readPlaylist(currentSettings);
      const reference = `${STORED_WALLPAPER_PREFIX}${entry.id}`;
      const playlistButton = document.createElement('button');
      playlistButton.className = 'button button-secondary';
      playlistButton.type = 'button';
      const alreadyAdded = playlist.items.some(item => item.reference === reference);
      playlistButton.textContent = alreadyAdded ? 'In playlist' : 'Add to playlist';
      playlistButton.disabled = alreadyAdded;
      playlistButton.addEventListener('click', () => {
        void updatePlaylist(value => ({
          ...value,
          items: [...value.items, { reference, muted: getWallpaperVolume(currentSettings, reference) === 0 }],
          currentReference: value.items.length === 0 && current === reference ? reference : value.currentReference
        }));
      });
      const removeButton = document.createElement('button');
      removeButton.className = 'button button-quiet';
      removeButton.type = 'button';
      removeButton.textContent = 'Remove';
      removeButton.disabled = entry.id === 'current' || current === `${STORED_WALLPAPER_PREFIX}${entry.id}`;
      removeButton.title = removeButton.disabled && entry.id !== 'current' ? 'Switch wallpapers before removing the one in use' : 'Remove saved wallpaper';
      removeButton.addEventListener('click', async () => {
        await deleteWallpaperMedia(entry.id);
        const latest = await getSettings();
        const value = readPlaylist(latest);
        await setSettings({
          ...latest,
          wallpaperPlaylist: {
            ...value,
            items: value.items.filter(item => item.reference !== reference),
            currentReference: value.currentReference === reference ? undefined : value.currentReference
          }
        });
        await renderWallpaperLibrary();
      });
      actions.append(useButton, playlistButton, removeButton);
      card.append(preview, details, actions);
      if (isVideo) card.appendChild(makeVolumeControl(currentSettings, reference, playlist.items.find(item => item.reference === reference)?.muted));
      wallpaperLibrary.append(card);
    }
  };
  void renderWallpaperLibrary();
  document.getElementById('refresh-wallpaper-library')?.addEventListener('click', () => void renderWallpaperLibrary());
  playlistEnabledInput.addEventListener('change', () => {
    void updatePlaylist(playlist => ({ ...playlist, enabled: playlistEnabledInput.checked }));
  });
  playlistModeSelect.addEventListener('change', () => {
    void updatePlaylist(playlist => ({ ...playlist, mode: playlistModeSelect.value as WallpaperPlaylist['mode'] }));
  });
  playlistIntervalSelect.addEventListener('change', () => {
    void updatePlaylist(playlist => ({ ...playlist, intervalMinutes: Number(playlistIntervalSelect.value) || 5 }));
  });
  const uploadDialog = document.getElementById('wallpaper-upload-dialog') as HTMLDialogElement;
  const uploadItems = document.getElementById('wallpaper-upload-items') as HTMLDivElement;
  const uploadStatus = document.getElementById('wallpaper-upload-status') as HTMLParagraphElement;
  const uploadConfirm = document.getElementById('wallpaper-upload-confirm') as HTMLButtonElement;
  let pendingUploadFiles: File[] = [];
  let uploadPreviewUrls: string[] = [];
  const clearUploadDialog = () => {
    uploadPreviewUrls.forEach(URL.revokeObjectURL);
    uploadPreviewUrls = [];
    pendingUploadFiles = [];
    uploadItems.replaceChildren();
    uploadStatus.textContent = '';
    uploadConfirm.disabled = false;
    uploadConfirm.textContent = 'Add wallpapers';
    wallpaperInput.value = '';
  };
  uploadDialog.addEventListener('close', clearUploadDialog);
  document.getElementById('wallpaper-upload-close')?.addEventListener('click', () => uploadDialog.close());
  document.getElementById('wallpaper-upload-cancel')?.addEventListener('click', () => uploadDialog.close());
  uploadDialog.addEventListener('click', event => {
    if (event.target === uploadDialog) uploadDialog.close();
  });
  wallpaperInput.addEventListener('change', () => {
    const files = Array.from(wallpaperInput.files ?? []);
    if (!files.length) return;
    if (files.length > MAX_WALLPAPER_UPLOAD_BATCH) {
      alert(`Choose no more than ${MAX_WALLPAPER_UPLOAD_BATCH} wallpapers at a time.`);
      wallpaperInput.value = '';
      return;
    }
    let normalizedFiles: Blob[];
    try {
      normalizedFiles = files.map(file => normalizeWallpaperBlob(file, file.name));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Choose image or video wallpapers.');
      wallpaperInput.value = '';
      return;
    }
    pendingUploadFiles = files;
    uploadItems.replaceChildren();
    uploadPreviewUrls.forEach(URL.revokeObjectURL);
    uploadPreviewUrls = [];
    files.forEach((file, index) => {
      const row = document.createElement('article');
      row.className = 'wallpaper-upload-item';
      const previewUrl = URL.createObjectURL(file);
      uploadPreviewUrls.push(previewUrl);
      const normalizedFile = normalizedFiles[index];
      const preview = document.createElement(normalizedFile.type.startsWith('video/') ? 'video' : 'img');
      preview.className = 'wallpaper-upload-preview';
      preview.src = previewUrl;
      if (preview instanceof HTMLVideoElement) {
        preview.muted = true;
        preview.preload = 'metadata';
        preview.playsInline = true;
      } else {
        preview.alt = '';
      }
      const details = document.createElement('div');
      details.className = 'wallpaper-upload-details';
      const name = document.createElement('strong');
      name.textContent = file.name;
      const size = document.createElement('small');
      size.textContent = `${normalizedFile.type.startsWith('video/') ? 'Live wallpaper' : 'Image wallpaper'} · ${(file.size / (1024 * 1024)).toFixed(file.size < 1024 * 1024 ? 2 : 1)} MB`;
      details.append(name, size);
      const choice = document.createElement('label');
      choice.className = 'wallpaper-upload-choice';
      const choiceLabel = document.createElement('span');
      choiceLabel.textContent = 'After upload';
      const select = document.createElement('select');
      select.dataset.uploadAction = String(index);
      select.setAttribute('aria-label', `What to do with ${file.name}`);
      select.innerHTML = '<option value="save">Save to library</option><option value="playlist">Add to playlist</option><option value="apply">Use as current wallpaper</option>';
      select.addEventListener('change', () => {
        if (select.value !== 'apply') return;
        uploadItems.querySelectorAll<HTMLSelectElement>('[data-upload-action]').forEach(other => {
          if (other !== select && other.value === 'apply') other.value = 'save';
        });
      });
      choice.append(choiceLabel, select);
      row.append(preview, details, choice);
      uploadItems.append(row);
    });
    uploadStatus.textContent = files.length > 1 ? 'Choose one current wallpaper at most; the other files can still be saved or added to the playlist.' : '';
    uploadDialog.showModal();
  });
  uploadConfirm.addEventListener('click', async () => {
    if (!pendingUploadFiles.length) return;
    const usage = await getWallpaperLibraryUsage();
    const batchBytes = pendingUploadFiles.reduce((total, file) => total + file.size, 0);
    if (usage.count + pendingUploadFiles.length > MAX_WALLPAPER_COUNT) {
      uploadStatus.textContent = `This batch would exceed the ${MAX_WALLPAPER_COUNT}-wallpaper library limit. Remove saved wallpapers or choose fewer files.`;
      return;
    }
    if (usage.bytes + batchBytes > MAX_WALLPAPER_STORAGE_BYTES) {
      uploadStatus.textContent = 'This batch would exceed the 1 GB wallpaper storage limit. Remove saved wallpapers or choose smaller files.';
      return;
    }
    uploadConfirm.disabled = true;
    uploadConfirm.textContent = 'Saving…';
    uploadStatus.textContent = 'Saving your selections…';
    const selections = pendingUploadFiles.map((file, index) => ({
      file,
      action: uploadItems.querySelector<HTMLSelectElement>(`[data-upload-action="${index}"]`)?.value ?? 'save'
    }));
    let latest = await getSettings();
    let playlist = readPlaylist(latest);
    let playlistChanged = false;
    let currentReference = latest.wallpaper;
    let currentMuted = latest.wallpaperMuted ?? true;
    let appliedCurrent = false;
    const failures: string[] = [];
    let savedCount = 0;
    for (const selection of selections) {
      try {
        const normalized = normalizeWallpaperBlob(selection.file, selection.file.name);
        const reference = await storeWallpaperMedia(normalized, selection.file.name);
        savedCount += 1;
        if (selection.action === 'playlist') {
          playlist = { ...playlist, items: [...playlist.items, { reference, muted: true }] };
          playlistChanged = true;
        } else if (selection.action === 'apply') {
          currentReference = reference;
          currentMuted = normalized.type.startsWith('video/') ? true : currentMuted;
          appliedCurrent = true;
        }
      } catch (error) {
        failures.push(`${selection.file.name}: ${error instanceof Error ? error.message : 'Could not save file.'}`);
      }
    }
    latest = await getSettings();
    if (playlistChanged || appliedCurrent) {
      await setSettings({
        ...latest,
        ...(appliedCurrent ? { wallpaper: currentReference, wallpaperMuted: currentMuted } : {}),
        ...(playlistChanged ? { wallpaperPlaylist: playlist } : {})
      });
    }
    await renderWallpaperLibrary();
    if (failures.length && savedCount === 0) {
      uploadStatus.textContent = failures.join(' ');
      uploadConfirm.disabled = false;
      uploadConfirm.textContent = 'Try again';
      return;
    }
    uploadDialog.close();
    if (failures.length) alert(`Saved ${savedCount} wallpaper${savedCount === 1 ? '' : 's'}. Some files could not be added: ${failures.join(' ')}`);
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
