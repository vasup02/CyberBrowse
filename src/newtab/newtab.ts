import { getSettings, setSettings } from '../utils/storage';
import { renderClock } from './widgets/clock';
import { renderSearchBar } from './widgets/searchBar';
import { renderShortcuts } from './widgets/shortcutsContainer';
import { renderCustomWidget } from './widgets/customWidgets';
import { loadWallpaperMedia, STORED_WALLPAPER_PREFIX } from '../utils/wallpaperMedia';

interface LayoutDraft {
  layouts: Record<string, WidgetLayout>;
  widgets: Widget[];
  hiddenWidgetIds: string[];
}

const builtInWidgets = [
  { id: 'clock', type: 'clock', label: 'Clock' },
  { id: 'search-bar', type: 'search', label: 'Search' },
  { id: 'shortcuts', type: 'shortcuts', label: 'Quick links' }
] as const;

const widgetCatalog = [
  { type: 'clock', variant: 'editorial', title: 'Dial clock', detail: 'An analog face with a separate digital time and date rail.', icon: '◷', group: 'Widget styles' },
  { type: 'search', variant: 'command', title: 'Search console', detail: 'A borderless, labeled search panel with an input underline.', icon: '⌕', group: 'Widget styles' },
  { type: 'shortcuts', variant: 'ledger', title: 'Bookmark ledger', detail: 'A ruled, numbered list of saved places.', icon: '↗', group: 'Widget styles' },
  { type: 'notes', title: 'Quick notes', detail: 'A private scratchpad stored on this device.', icon: '✎', group: 'Everyday' },
  { type: 'tasks', title: 'Task list', detail: 'Keep a short checklist in view.', icon: '☑', group: 'Everyday' },
  { type: 'focus', title: 'Focus timer', detail: 'A simple 25-minute focus session.', icon: '◴', group: 'Everyday' },
  { type: 'calendar', title: 'Monthly calendar', detail: 'See the current month at a glance.', icon: '▦', group: 'Everyday' }
];

function applyTheme(settings: Settings) {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (settings.theme === 'light') {
    root.classList.add('theme-light');
  } else if (settings.theme === 'dark') {
    root.classList.add('theme-dark');
  }
  // 'system' leaves no class – CSS respects prefers-color-scheme.
}

let wallpaperRenderVersion = 0;

async function applyWallpaper(settings: Settings, transition = false): Promise<HTMLVideoElement | null> {
  const renderVersion = ++wallpaperRenderVersion;
  const existingLayers = Array.from(document.querySelectorAll<HTMLElement>('.wallpaper-layer'));
  if (!transition) {
    existingLayers.forEach(layer => {
      layer.remove();
      const objectUrl = layer.dataset.objectUrl;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    });
  }
  document.body.style.backgroundImage = '';
  if (!settings.wallpaper) {
    existingLayers.forEach(layer => { layer.classList.remove('is-active'); });
    window.setTimeout(() => existingLayers.forEach(layer => {
      const objectUrl = layer.dataset.objectUrl;
      layer.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }), 760);
    return null;
  }

  let source = settings.wallpaper;
  let mime = '';
  let objectUrl = '';
  if (source.startsWith(STORED_WALLPAPER_PREFIX)) {
    const media = await loadWallpaperMedia(source);
    if (!media) return null;
    mime = media.type;
    objectUrl = URL.createObjectURL(media);
    source = objectUrl;
  } else if (source.startsWith('data:')) {
    mime = source.slice(5, source.indexOf(';') > -1 ? source.indexOf(';') : source.indexOf(','));
  } else {
    mime = /\.(mp4|m4v|webm|ogv|ogg|mov)(?:[?#].*)?$/i.test(source) ? 'video/*' : '';
  }
  if (renderVersion !== wallpaperRenderVersion) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return null;
  }

  const layerClass = `wallpaper-layer${transition ? '' : ' is-active'}`;
  const layerStyle = (element: HTMLElement) => {
    element.className = layerClass;
    if (objectUrl) element.dataset.objectUrl = objectUrl;
  };

  if (mime.startsWith('video/') || mime === 'video/*') {
    const video = document.createElement('video');
    video.id = 'wallpaper-video';
    layerStyle(video);
    video.src = source;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    const savedVolume = settings.wallpaperVolumes?.[settings.wallpaper];
    const playlistItem = settings.wallpaperPlaylist?.items.find(item => item.reference === settings.wallpaper);
    const inactive = document.hidden || !document.hasFocus();
    const initialVolume = typeof savedVolume === 'number'
      ? Math.max(0, Math.min(1, savedVolume))
      : 0.5;
    video.volume = initialVolume;
    video.muted = inactive || (playlistItem ? playlistItem.muted : (settings.wallpaperMuted ?? (savedVolume === 0)));
    video.setAttribute('aria-hidden', 'true');
    document.body.appendChild(video);
    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play().catch(() => undefined);
    }
    if (renderVersion !== wallpaperRenderVersion) {
      video.pause();
      video.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      return null;
    }
    requestAnimationFrame(() => video.classList.add('is-active'));
    existingLayers.forEach(layer => layer.classList.remove('is-active'));
    window.setTimeout(() => existingLayers.forEach(layer => {
      const oldObjectUrl = layer.dataset.objectUrl;
      layer.remove();
      if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
    }), 760);
    return video;
  }

  const image = new Image();
  image.src = source;
  await image.decode().catch(() => undefined);
  if (renderVersion !== wallpaperRenderVersion) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return null;
  }
  const imageLayer = document.createElement('div');
  imageLayer.id = 'wallpaper-image';
  layerStyle(imageLayer);
  const imageElement = document.createElement('img');
  imageElement.src = source;
  imageElement.alt = '';
  imageElement.setAttribute('aria-hidden', 'true');
  imageLayer.appendChild(imageElement);
  document.body.appendChild(imageLayer);
  requestAnimationFrame(() => imageLayer.classList.add('is-active'));
  existingLayers.forEach(layer => layer.classList.remove('is-active'));
  window.setTimeout(() => existingLayers.forEach(layer => {
    const oldObjectUrl = layer.dataset.objectUrl;
    layer.remove();
    if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
  }), 760);
  return null;
}

async function renderNewTab() {
  const settings = await getSettings();
  const isCustomizeMode = new URLSearchParams(location.search).get('customize') === '1';
  const app = document.getElementById('app');
  if (!app) return;

  let draftWidgets: Widget[] = structuredClone(settings.widgets ?? []);
  let draftHiddenWidgetIds = new Set(settings.hiddenWidgets ?? []);

  if (isCustomizeMode) document.body.classList.add('layout-edit-mode');

  app.innerHTML = `
  ${isCustomizeMode ? `
  <aside class="editor-banner" role="region" aria-label="Layout editor">
    <div><strong>Customize your new tab</strong><span>Drag widgets to place them. Pull an outline dot to resize.</span></div>
    <button id="done-btn" class="btn btn-solid">Done</button>
  </aside>` : ''}
  ${!isCustomizeMode ? '<button id="settings-btn" class="settings-button" type="button" aria-label="Open settings" title="Settings">⚙</button>' : ''}
  ${!isCustomizeMode ? '<div id="wallpaper-audio-control" class="wallpaper-audio-control" hidden><label class="sr-only" for="wallpaper-volume-input">Wallpaper volume</label><output id="wallpaper-volume-value" class="wallpaper-volume-value">50%</output><input id="wallpaper-volume-input" class="wallpaper-volume-input" type="range" min="0" max="100" step="1" value="50" orient="vertical" aria-label="Wallpaper volume" /><button id="wallpaper-audio-btn" class="wallpaper-audio-button" type="button" aria-pressed="false" aria-label="Mute wallpaper sound" title="Mute wallpaper sound"></button></div>' : ''}
  ${isCustomizeMode ? `
  <aside class="widget-shelf" aria-label="Widget shelf">
    <div class="shelf-intro"><p class="shelf-kicker">YOUR CANVAS</p><h2>Widgets</h2><p>Add useful panels, then arrange them on your page.</p></div>
    <section class="shelf-current" aria-labelledby="shelf-current-title"><h3 id="shelf-current-title">On your page</h3><div id="shelf-current-list"></div></section>
    <section class="shelf-current shelf-hidden" aria-labelledby="shelf-hidden-title"><h3 id="shelf-hidden-title">Available to restore</h3><div id="shelf-hidden-list"></div></section>
    <section class="shelf-catalog" aria-labelledby="shelf-catalog-title"><h3 id="shelf-catalog-title">Add a widget</h3>
      ${['Widget styles', 'Everyday'].map(group => `<div class="shelf-group"><h4>${group}</h4>${widgetCatalog.filter(item => item.group === group).map(item => `<button type="button" class="shelf-add" data-add-widget="${item.type}" data-widget-variant="${item.variant ?? ''}"><span class="shelf-add-icon" aria-hidden="true">${item.icon}</span><span class="shelf-add-copy"><strong>${item.title}</strong><small>${item.detail}</small></span><span class="shelf-add-mark" aria-hidden="true">+</span></button>`).join('')}</div>`).join('')}
    </section>
  </aside>` : ''}
  <div class="newtab" aria-label="New tab layout"></div>

  <!-- Control strip -->
  ${isCustomizeMode ? `
  <div class="control-strip">
    <button id="undo-btn" class="btn btn-solid">↶ Undo</button>
    <button id="reset-btn" class="btn btn-solid">Reset layout</button>
  </div>` : ''}

`;


  // Apply theme and wallpaper first
  applyTheme(settings);
  let wallpaperVideo = await applyWallpaper(settings);
  const audioButton = document.getElementById('wallpaper-audio-btn') as HTMLButtonElement | null;
  const audioControl = document.getElementById('wallpaper-audio-control') as HTMLDivElement | null;
  const volumeInput = document.getElementById('wallpaper-volume-input') as HTMLInputElement | null;
  const volumeValue = document.getElementById('wallpaper-volume-value') as HTMLOutputElement | null;
  let activeWallpaperReference = settings.wallpaper;
  const initialPlaylistItem = settings.wallpaperPlaylist?.items.find(item => item.reference === activeWallpaperReference);
  const initialAudioDesired = initialPlaylistItem
    ? !initialPlaylistItem.muted
    : settings.wallpaperMuted === false;
  let mutedForBackground = Boolean(wallpaperVideo && initialAudioDesired && (document.hidden || !document.hasFocus()));
  let wallpaperSwapToken = 0;
  const syncAudioButton = () => {
    if (!audioButton) return;
    if (audioControl) audioControl.hidden = !wallpaperVideo;
    if (!wallpaperVideo) return;
    if (volumeInput) volumeInput.value = String(Math.round(wallpaperVideo.volume * 100));
    audioButton.setAttribute('aria-pressed', String(!wallpaperVideo.muted));
    audioButton.setAttribute('aria-label', wallpaperVideo.muted ? 'Turn wallpaper sound on' : 'Mute wallpaper sound');
    audioButton.title = wallpaperVideo.muted ? 'Turn wallpaper sound on' : 'Mute wallpaper sound';
    if (volumeValue) volumeValue.value = `${Math.round(wallpaperVideo.volume * 100)}%`;
    volumeInput?.setAttribute('aria-valuetext', `${Math.round(wallpaperVideo.volume * 100)} percent${wallpaperVideo.muted ? ', muted' : ''}`);
    audioButton.innerHTML = wallpaperVideo.muted
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l5 4V6l-5 4H4Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l5 4V6l-5 4H4Z"/><path d="M16 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12"/></svg>';
  };
  const applyVideoAudioSettings = (video: HTMLVideoElement, latest: Settings, inactive: boolean) => {
    if (!latest.wallpaper) return;
    const savedVolume = latest.wallpaperVolumes?.[latest.wallpaper];
    const playlistItem = latest.wallpaperPlaylist?.items.find(item => item.reference === latest.wallpaper);
    video.volume = typeof savedVolume === 'number'
      ? Math.max(0, Math.min(1, savedVolume))
      : 0.5;
    const shouldMute = playlistItem ? playlistItem.muted : (latest.wallpaperMuted ?? true);
    mutedForBackground = inactive && !shouldMute;
    video.muted = inactive || shouldMute;
  };
  syncAudioButton();
  volumeInput?.addEventListener('input', () => {
    if (!wallpaperVideo || !activeWallpaperReference) return;
    const volume = Number(volumeInput.value) / 100;
    wallpaperVideo.volume = volume;
    const inactive = document.hidden || !document.hasFocus();
    wallpaperVideo.muted = volume === 0 || inactive;
    mutedForBackground = volume > 0 && inactive;
    syncAudioButton();
  });
  volumeInput?.addEventListener('change', async () => {
    if (!wallpaperVideo || !activeWallpaperReference) return;
    const latest = await getSettings();
    const volume = Number(volumeInput.value) / 100;
    const muted = volume === 0;
    await setSettings({
      ...latest,
      wallpaperMuted: muted,
      wallpaperVolumes: { ...latest.wallpaperVolumes, [activeWallpaperReference]: volume },
      ...(latest.wallpaperPlaylist ? {
        wallpaperPlaylist: {
          ...latest.wallpaperPlaylist,
          items: latest.wallpaperPlaylist.items.map(item => item.reference === activeWallpaperReference ? { ...item, muted } : item)
        }
      } : {})
    });
    if (volume > 0 && !document.hidden && document.hasFocus()) await wallpaperVideo.play().catch(() => undefined);
  });
  audioButton?.addEventListener('click', async () => {
    if (!wallpaperVideo || !activeWallpaperReference) return;
    const latest = await getSettings();
    const unmuting = wallpaperVideo.muted;
    if (unmuting && wallpaperVideo.volume === 0) {
      const savedVolume = latest.wallpaperVolumes?.[activeWallpaperReference];
      wallpaperVideo.volume = typeof savedVolume === 'number' && savedVolume > 0 ? savedVolume : 0.5;
    }
    const muted = !unmuting;
    wallpaperVideo.muted = muted || document.hidden || !document.hasFocus();
    mutedForBackground = !muted && (document.hidden || !document.hasFocus());
    if (!wallpaperVideo.muted) await wallpaperVideo.play().catch(() => { if (wallpaperVideo) wallpaperVideo.muted = true; });
    syncAudioButton();
    await setSettings({
      ...latest,
      wallpaperMuted: muted,
      wallpaperVolumes: { ...latest.wallpaperVolumes, [activeWallpaperReference]: wallpaperVideo.volume || latest.wallpaperVolumes?.[activeWallpaperReference] || 0.5 },
      ...(latest.wallpaperPlaylist ? {
        wallpaperPlaylist: {
          ...latest.wallpaperPlaylist,
          items: latest.wallpaperPlaylist.items.map(item => item.reference === activeWallpaperReference ? { ...item, muted } : item)
        }
      } : {})
    });
  });
  const muteWhenInactive = () => {
    if (!document.hidden && document.hasFocus()) return;
    if (!wallpaperVideo) return;
    if (!wallpaperVideo.muted) mutedForBackground = true;
    wallpaperVideo.muted = true;
    syncAudioButton();
  };
  const restoreWhenActive = async () => {
    if (document.hidden || !document.hasFocus() || !mutedForBackground) return;
    const latest = await getSettings();
    if (latest.wallpaper !== activeWallpaperReference) return;
    mutedForBackground = false;
    if (wallpaperVideo) {
      applyVideoAudioSettings(wallpaperVideo, latest, false);
      if (!wallpaperVideo.muted) await wallpaperVideo.play().catch(() => { if (wallpaperVideo) wallpaperVideo.muted = true; });
    }
    syncAudioButton();
  };
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.settings) return;
    const latest = changes.settings.newValue as Settings | undefined;
    if (!latest) return;
    applyTheme(latest);
    if (latest.wallpaper !== activeWallpaperReference) {
      const swapToken = ++wallpaperSwapToken;
      if (wallpaperVideo) {
        wallpaperVideo.muted = true;
        wallpaperVideo.pause();
      }
      activeWallpaperReference = latest.wallpaper;
      mutedForBackground = false;
      void applyWallpaper(latest, true).then(nextVideo => {
        if (swapToken !== wallpaperSwapToken) {
          nextVideo?.pause();
          nextVideo?.remove();
          return;
        }
        wallpaperVideo = nextVideo;
      if (wallpaperVideo) applyVideoAudioSettings(wallpaperVideo, latest, document.hidden || !document.hasFocus());
        syncAudioButton();
      });
      return;
    }
    if (wallpaperVideo) applyVideoAudioSettings(wallpaperVideo, latest, document.hidden || !document.hasFocus());
    syncAudioButton();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) muteWhenInactive();
    else void restoreWhenActive();
  });
  window.addEventListener('blur', muteWhenInactive);
  window.addEventListener('focus', () => { void restoreWhenActive(); });
  window.addEventListener('pagehide', muteWhenInactive);

  const container = document.querySelector('.newtab') as HTMLElement;
  const defaultLayouts: Record<string, WidgetLayout> = {
    clock: { x: 0.72, y: 0.1, w: 0.25, h: 0.12, fitContent: true },
    'search-bar': { x: 0.08, y: 0.1, w: 0.48, h: 0.13 },
    shortcuts: { x: 0.08, y: 0.3, w: 0.84, h: 0.42 }
  };
  const layouts: Record<string, WidgetLayout> = { ...defaultLayouts };
  for (const [id, saved] of Object.entries(settings.widgetLayouts ?? {})) {
    const legacyGridCoordinates = saved.y >= 1 || saved.h >= 1;
    layouts[id] = legacyGridCoordinates
      ? { ...saved, y: Math.max(0, Math.min(0.85, (saved.y - 1) * 0.11)), h: Math.max(0.1, Math.min(0.8, saved.h * 0.11)) }
      : { ...saved };
  }
  const layoutForCustomWidget = (type: string): WidgetLayout => {
    if (type === 'clock') return { x: 0, y: 0, w: 0.24, h: 0.16, fitContent: true };
    if (type === 'search') return { x: 0, y: 0, w: 0.42, h: 0.16 };
    if (type === 'shortcuts') return { x: 0, y: 0, w: 0.34, h: 0.3 };
    if (type === 'tasks' || type === 'calendar') return { x: 0, y: 0, w: 0.28, h: 0.3 };
    if (type === 'focus') return { x: 0, y: 0, w: 0.32, h: 0.25 };
    return { x: 0, y: 0, w: 0.24, h: 0.25 };
  };
  const findFreeLayout = (type: string): WidgetLayout => {
    const size = layoutForCustomWidget(type);
    const occupied = Object.entries(layouts).filter(([id]) => !draftHiddenWidgetIds.has(id));
    for (let y = 0.03; y + size.h <= 0.96; y += 0.035) {
      for (let x = 0.02; x + size.w <= 0.98; x += 0.035) {
        const free = occupied.every(([, rect]) =>
          x + size.w <= rect.x || rect.x + rect.w <= x ||
          y + size.h <= rect.y || rect.y + rect.h <= y);
        if (free) return { ...size, x, y };
      }
    }
    return { ...size, x: 0.04, y: 0.66 };
  };
  draftWidgets.forEach(widget => {
    if (!layouts[widget.id]) layouts[widget.id] = findFreeLayout(widget.type);
  });
  if (!draftHiddenWidgetIds.has('clock') && !draftHiddenWidgetIds.has('search-bar')) {
    const search = layouts['search-bar'];
    const clock = layouts.clock;
    const clockWidth = clock.fitContent !== false ? Math.max(0.16, Math.min(clock.w, 0.24)) : clock.w;
    const gap = 0.035;
    const verticalOverlap = search.y < clock.y + clock.h && clock.y < search.y + search.h;
    if (verticalOverlap && clock.x < search.x + search.w + gap && search.x < clock.x + clockWidth + gap) {
      const rightX = search.x + search.w + gap;
      if (rightX + clockWidth <= 0.98) clock.x = rightX;
      else {
        clock.x = Math.max(0.02, search.x);
        clock.y = Math.min(0.82, search.y + search.h + gap);
      }
    }
  }
  const captureDraft = (): LayoutDraft => ({
    layouts: structuredClone(layouts),
    widgets: structuredClone(draftWidgets),
    hiddenWidgetIds: [...draftHiddenWidgetIds]
  });
  const layoutHistory: LayoutDraft[] = [];
  const keepHistory = (snapshot: LayoutDraft) => {
    layoutHistory.push(structuredClone(snapshot));
    if (layoutHistory.length > 20) layoutHistory.shift();
  };
  const restoreDraft = (snapshot: LayoutDraft) => {
    Object.keys(layouts).forEach(key => delete layouts[key]);
    Object.assign(layouts, structuredClone(snapshot.layouts));
    draftWidgets = structuredClone(snapshot.widgets);
    draftHiddenWidgetIds = new Set(snapshot.hiddenWidgetIds);
  };
  const getWidgetKey = (widget: HTMLElement) => widget.dataset.widgetKey ?? widget.id;
  const getSafeTop = (bounds: DOMRect) => {
    if (!isCustomizeMode) return 0;
    const bannerBottom = document.querySelector<HTMLElement>('.editor-banner')?.getBoundingClientRect().bottom ?? 0;
    const shelfRect = document.querySelector<HTMLElement>('.widget-shelf')?.getBoundingClientRect();
    const canvasRect = container.getBoundingClientRect();
    const shelfOverlapsCanvas = shelfRect && shelfRect.left < canvasRect.right && shelfRect.right > canvasRect.left;
    const safeTop = shelfOverlapsCanvas ? Math.max(bannerBottom, shelfRect.bottom) : bannerBottom;
    return Math.max(0, Math.min(1, safeTop / bounds.height));
  };
  const applyWidgetLayouts = () => {
    const bounds = container.getBoundingClientRect();
    const safeTop = getSafeTop(bounds);
    container.querySelectorAll<HTMLElement>('.widget').forEach(widget => {
      const key = getWidgetKey(widget);
      const layout = layouts[key];
      if (!layout) return;
      const fitContent = widget.dataset.widgetType === 'clock' && layout.fitContent !== false;
      if (!fitContent) {
        const minimumWidthPixels = widget.dataset.widgetType === 'focus' ? 190 : widget.dataset.variant === 'editorial' && widget.dataset.widgetType === 'clock' ? 150 : 0;
        const minimumHeightPixels = widget.dataset.widgetType === 'focus' ? 96 : widget.dataset.variant === 'editorial' && widget.dataset.widgetType === 'clock' ? 70 : 0;
        const minimumWidth = minimumWidthPixels ? Math.min(0.85, minimumWidthPixels / bounds.width) : 0.08;
        const minimumHeight = minimumHeightPixels ? Math.min(0.8, minimumHeightPixels / bounds.height) : 0.08;
        layout.w = Math.max(minimumWidth, Math.min(1, layout.w));
        layout.h = Math.max(minimumHeight, Math.min(1, layout.h));
      }
      widget.dataset.fitContent = fitContent ? 'true' : 'false';
      widget.style.width = fitContent ? '' : `${layout.w * 100}%`;
      widget.style.height = fitContent ? '' : `${layout.h * 100}%`;
      const widthRatio = fitContent ? widget.offsetWidth / bounds.width : layout.w;
      const heightRatio = fitContent ? widget.offsetHeight / bounds.height : layout.h;
      layout.x = Math.max(0, Math.min(1 - widthRatio, layout.x));
      layout.y = Math.max(Math.min(safeTop, Math.max(0, 1 - heightRatio)), Math.min(1 - heightRatio, layout.y));
      widget.style.left = `${layout.x * 100}%`;
      widget.style.top = `${layout.y * 100}%`;
      const renderedWidth = fitContent ? widget.offsetWidth : layout.w * bounds.width;
      const renderedHeight = fitContent ? widget.offsetHeight : layout.h * bounds.height;
      const compact = (widget.dataset.widgetType === 'shortcuts' && layout.h <= 0.12)
        || (widget.dataset.widgetType === 'focus' && (layout.w <= 0.22 || layout.h <= 0.18))
        || (widget.dataset.widgetType === 'clock' && widget.dataset.variant === 'editorial' && (renderedWidth <= 220 || renderedHeight <= 86));
      widget.dataset.compact = compact ? 'true' : 'false';
      if (widget.dataset.widgetType === 'clock' && widget.dataset.variant === 'editorial') {
        const scale = Math.max(0.45, Math.min(2, Math.sqrt((renderedWidth / 270) * (renderedHeight / 112))));
        widget.style.setProperty('--widget-scale', String(scale));
      }
    });
  };
  window.addEventListener('resize', applyWidgetLayouts);

  // --- Draggable & Resizable widgets -------------------------------------------------
  function makeDraggable(el: HTMLElement) {
    el.addEventListener('pointerdown', event => {
      if ((event.target as HTMLElement).closest('.resize-handle, .custom-widget-control')) return;
      event.preventDefault();
      const key = getWidgetKey(el);
      const bounds = container.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const initialDraft = captureDraft();
      const initialLayout = { ...layouts[key] };
      const rect = el.getBoundingClientRect();
      const offsetX = startX - rect.left;
      const offsetY = startY - rect.top;
      let moved = false;
      el.classList.add('dragging');

      const move = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < 3) return;
        moved = true;
        const width = el.dataset.fitContent === 'true' ? el.offsetWidth / bounds.width : initialLayout.w;
        const height = el.dataset.fitContent === 'true' ? el.offsetHeight / bounds.height : initialLayout.h;
        layouts[key].x = Math.max(0, Math.min(1 - width, (moveEvent.clientX - bounds.left - offsetX) / bounds.width));
        layouts[key].y = Math.max(0, Math.min(1 - height, (moveEvent.clientY - bounds.top - offsetY) / bounds.height));
        applyWidgetLayouts();
      };
      const finish = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', finish);
        document.removeEventListener('pointercancel', finish);
        el.classList.remove('dragging');
        if (moved) keepHistory(initialDraft);
        else restoreDraft(initialDraft);
        applyWidgetLayouts();
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', finish, { once: true });
      document.addEventListener('pointercancel', finish, { once: true });
    });
  }

  function makeResizable(el: HTMLElement) {
    const label = el.getAttribute('aria-label') ?? 'widget';

    const addHandle = (axis: 'horizontal' | 'vertical' | 'both', side: 'left' | 'right' | 'top' | 'bottom', accessibleName: string) => {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = `resize-handle resize-${axis} resize-${side}`;
      handle.setAttribute('aria-label', `Resize ${label} ${accessibleName}`);
      handle.setAttribute('title', `Resize ${accessibleName}`);
      handle.draggable = false;
      el.appendChild(handle);

      handle.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
        const bounds = container.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const key = getWidgetKey(el);
        const initialLayout = { ...layouts[key] };
        const initialDraft = captureDraft();
        const minimumWidthPixels = el.dataset.widgetType === 'focus' ? 190 : el.dataset.variant === 'editorial' && el.dataset.widgetType === 'clock' ? 150 : 0;
        const minimumHeightPixels = el.dataset.widgetType === 'focus' ? 96 : el.dataset.variant === 'editorial' && el.dataset.widgetType === 'clock' ? 70 : 0;
        const minimumWidth = minimumWidthPixels ? Math.min(0.85, minimumWidthPixels / bounds.width) : 0.08;
        const minimumHeight = minimumHeightPixels ? Math.min(0.8, minimumHeightPixels / bounds.height) : 0.08;
        if (el.dataset.fitContent === 'true') {
          initialLayout.w = el.offsetWidth / bounds.width;
          initialLayout.h = el.offsetHeight / bounds.height;
        }
        let changed = false;

        const resize = (moveEvent: PointerEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          if (!changed && Math.hypot(dx, dy) < 3) return;
          changed = true;
          const widthDelta = dx / bounds.width;
          const heightDelta = dy / bounds.height;
          const leftSide = handle.classList.contains('resize-left');
          const topSide = handle.classList.contains('resize-top');
          const nextX = leftSide ? Math.max(0, Math.min(initialLayout.x + initialLayout.w - minimumWidth, initialLayout.x + widthDelta)) : initialLayout.x;
          const nextY = topSide ? Math.max(0, Math.min(initialLayout.y + initialLayout.h - minimumHeight, initialLayout.y + heightDelta)) : initialLayout.y;
          const nextWidth = axis === 'vertical' ? initialLayout.w : leftSide
            ? initialLayout.x + initialLayout.w - nextX
            : Math.max(minimumWidth, Math.min(1 - initialLayout.x, initialLayout.w + widthDelta));
          const nextHeight = axis === 'horizontal' ? initialLayout.h : topSide
            ? initialLayout.y + initialLayout.h - nextY
            : Math.max(minimumHeight, Math.min(1 - initialLayout.y, initialLayout.h + heightDelta));
          layouts[key] = {
            ...initialLayout,
            x: nextX,
            y: nextY,
            w: nextWidth,
            h: nextHeight,
            fitContent: el.dataset.widgetType === 'clock' ? false : initialLayout.fitContent
          };
          applyWidgetLayouts();
        };

        const finishResize = async () => {
          document.removeEventListener('pointermove', resize);
          document.removeEventListener('pointerup', finishResize);
          if (!changed) return;
          keepHistory(initialDraft);
        };

        document.addEventListener('pointermove', resize);
        document.addEventListener('pointerup', finishResize, { once: true });
      });
    };

    addHandle('horizontal', 'left', 'width from left edge');
    addHandle('horizontal', 'right', 'width from right edge');
    addHandle('vertical', 'top', 'height from top edge');
    addHandle('vertical', 'bottom', 'height from bottom edge');
    addHandle('both', 'left', 'width and height from top left');
    el.lastElementChild?.classList.add('resize-top');
    addHandle('both', 'right', 'width and height from top right');
    el.lastElementChild?.classList.add('resize-top');
    addHandle('both', 'left', 'width and height from bottom left');
    el.lastElementChild?.classList.add('resize-bottom');
    addHandle('both', 'right', 'width and height from bottom right');
    el.lastElementChild?.classList.add('resize-bottom');
  }

  const coreRole = (id: string) => builtInWidgets.find(widget => widget.id === id)?.type ?? null;

  const renderShelfList = () => {
    if (!isCustomizeMode) return;
    const list = document.getElementById('shelf-current-list');
    if (!list) return;
    const rows = builtInWidgets.filter(widget => !draftHiddenWidgetIds.has(widget.id)).map(widget =>
      `<div class="shelf-current-row"><span>${widget.label}<small>Built-in</small></span><button type="button" data-remove-widget="${widget.id}" title="Remove ${widget.label}" aria-label="Remove ${widget.label}">×</button></div>`);
    draftWidgets.forEach(widget => {
      const title = widgetCatalog.find(item => item.type === widget.type && item.variant === widget.config?.variant)?.title
        ?? ({ notes: 'Quick notes', tasks: 'Task list', focus: 'Focus timer', calendar: 'Monthly calendar' } as Record<string, string>)[widget.type]
        ?? widget.type;
      rows.push(`<div class="shelf-current-row"><span>${title}<small>Added widget</small></span><button type="button" data-remove-widget="${widget.id}" title="Remove ${title}" aria-label="Remove ${title}">×</button></div>`);
    });
    list.innerHTML = rows.length ? rows.join('') : '<p class="shelf-empty">Your page is clear. Add a widget to get started.</p>';
    const hiddenList = document.getElementById('shelf-hidden-list');
    if (hiddenList) {
      const hidden = builtInWidgets.filter(widget => draftHiddenWidgetIds.has(widget.id));
      hiddenList.innerHTML = hidden.length ? hidden.map(widget => `<div class="shelf-current-row"><span>${widget.label}<small>Built-in widget</small></span><button type="button" data-restore-widget="${widget.id}" title="Restore ${widget.label}" aria-label="Restore ${widget.label}">↺</button></div>`).join('') : '<p class="shelf-empty">None hidden.</p>';
    }
  };

  const renderAllWidgets = async () => {
    container.replaceChildren();
    const visibleCore = builtInWidgets.filter(widget => !draftHiddenWidgetIds.has(widget.id));
    const entries: Array<{ id: string; type: string; config?: Record<string, unknown>; core: boolean }> = [
      ...visibleCore.map(widget => ({ ...widget, core: true })),
      ...draftWidgets.map(widget => ({ ...widget, core: false }))
    ];
    for (const widget of entries) {
      const el = document.createElement(widget.type === 'clock' ? 'header' : 'section');
      el.className = `widget ${widget.type}`;
      el.id = widget.core ? widget.id : `added-${widget.id}`;
      el.dataset.widgetKey = widget.id;
      el.dataset.widgetType = widget.type;
      el.setAttribute('aria-label', widget.type === 'shortcuts' ? 'Quick links' : widget.type === 'search' ? 'Search' : widget.type === 'clock' ? 'Clock' : widget.type);
      if (widget.config?.variant) el.dataset.variant = String(widget.config.variant);
      container.appendChild(el);
      if (widget.type === 'clock') renderClock(el, widget.config?.variant === 'editorial' ? 'editorial' : 'default');
      else if (widget.type === 'search') await renderSearchBar(el, widget.config?.variant === 'command' ? 'command' : 'default');
      else if (widget.type === 'shortcuts') renderShortcuts(el, settings, isCustomizeMode, widget.config?.variant === 'ledger' ? 'ledger' : 'default');
      else renderCustomWidget(el, widget as Widget, isCustomizeMode);
      if (isCustomizeMode) {
        makeDraggable(el);
        makeResizable(el);
      }
    }
    applyWidgetLayouts();
  };

  if (isCustomizeMode) {
    document.querySelectorAll<HTMLButtonElement>('[data-add-widget]').forEach(button => button.addEventListener('click', async () => {
      const type = button.dataset.addWidget ?? '';
      if (!type) return;
      keepHistory(captureDraft());
      const id = `widget-${crypto.randomUUID()}`;
      const variant = button.dataset.widgetVariant;
      const widget: Widget = { id, type, ...(variant ? { config: { variant } } : {}) };
      layouts[id] = findFreeLayout(type);
      draftWidgets.push(widget);
      await renderAllWidgets();
      renderShelfList();
    }));
    document.getElementById('shelf-current-list')?.addEventListener('click', async event => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-widget]');
      if (!target) return;
      const key = target.dataset.removeWidget ?? '';
      const role = coreRole(key);
      if (role) {
        keepHistory(captureDraft());
        draftHiddenWidgetIds.add(key);
      } else {
        const removing = draftWidgets.find(widget => widget.id === key);
        if (!removing) return;
        keepHistory(captureDraft());
        draftWidgets = draftWidgets.filter(widget => widget.id !== key);
        delete layouts[key];
      }
      await renderAllWidgets();
      renderShelfList();
    });
    document.getElementById('shelf-hidden-list')?.addEventListener('click', async event => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-restore-widget]');
      const id = target?.dataset.restoreWidget;
      if (!id) return;
      keepHistory(captureDraft());
      draftHiddenWidgetIds.delete(id);
      if (!layouts[id]) layouts[id] = structuredClone(defaultLayouts[id]);
      await renderAllWidgets();
      renderShelfList();
    });
  }

  await renderAllWidgets();
  renderShelfList();

  // Event handlers for control buttons
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('done-btn')?.addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      const latest = await getSettings();
      const finalLayouts = structuredClone(layouts);
      const finalWidgets = structuredClone(draftWidgets);
      const finalHiddenWidgetIds = [...draftHiddenWidgetIds].sort();
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ settings: { ...latest, widgetLayouts: finalLayouts, widgets: finalWidgets, hiddenWidgets: finalHiddenWidgetIds } }, () => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve();
        });
      });
      // Chrome invokes the storage callback after the full settings object has been committed.
      // Treating a read-back serialization difference as a failed save caused false retries.
      window.close();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Retry saving';
      const message = document.querySelector('.editor-banner span');
      if (message) message.textContent = error instanceof Error ? error.message : 'Could not save layout. Please try again.';
    }
  });

  document.getElementById('undo-btn')?.addEventListener('click', async () => {
    const previous = layoutHistory.pop();
    if (!previous) return;
    restoreDraft(previous);
    await renderAllWidgets();
    renderShelfList();
  });

  document.getElementById('reset-btn')?.addEventListener('click', async () => {
    keepHistory(captureDraft());
    draftHiddenWidgetIds.clear();
    Object.keys(layouts).forEach(key => delete layouts[key]);
    Object.assign(layouts, structuredClone(defaultLayouts));
    draftWidgets.forEach(widget => { layouts[widget.id] = findFreeLayout(widget.type); });
    await renderAllWidgets();
    renderShelfList();
  });
}

document.addEventListener('DOMContentLoaded', renderNewTab);
