interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon?: string;
  hidden?: boolean;
}

interface Widget {
  id: string;
  type: 'clock' | 'search' | 'wallpaper' | string;
  config?: Record<string, unknown>;
}

interface WidgetLayout {
  x: number; // normalized horizontal position from 0 to 1
  y: number; // grid row, starting at 1
  w: number; // normalized width from 0 to 1
  h: number; // grid row span
  fitContent?: boolean; // keep compact content-sized widgets compact until manually resized
}

interface WallpaperPlaylistItem {
  reference: string;
  muted: boolean;
}

interface WallpaperPlaylist {
  enabled: boolean;
  mode: 'sequential' | 'random';
  intervalMinutes: number;
  items: WallpaperPlaylistItem[];
  currentReference?: string;
  /** Random-mode queue: wallpapers still to show in the current shuffled cycle. */
  randomOrder?: string[];
}

type Theme = 'light' | 'dark' | 'system';

type SearchProvider = 'duckduckgo' | 'google' | 'bing' | 'brave' | 'startpage' | 'custom';

type BarPosition = 'top' | 'center' | 'bottom';

type ShortcutLayout = 'grid' | 'list';

interface Settings {
  theme: Theme;
  searchProvider: SearchProvider;
  customSearchUrl?: string;
  shortcuts: Shortcut[];
  widgets: Widget[];
  hiddenWidgets?: string[];
  layout: 'simple' | 'advanced';
  wallpaper?: string; // base64 data URL or remote URL
  wallpaperMuted?: boolean;
  wallpaperVolumes?: Record<string, number>;
  wallpaperPlaylist?: WallpaperPlaylist;
  barPosition: BarPosition;
  shortcutLayout: ShortcutLayout;
  layoutOrder?: string[]; // order of widget IDs (e.g., ['clock','search','shortcuts'])
  widgetSizes?: Record<string, { width?: number; height?: number }>;
  widgetLayouts?: Record<string, WidgetLayout>;
}

