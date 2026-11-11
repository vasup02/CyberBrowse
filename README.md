# CyberBrowse

CyberBrowse is a customizable new-tab extension for Chromium-based desktop browsers. It supports Chrome, Edge, Brave, and Opera GX on Windows and Linux.

## Features

- Search, clock, quick links, and optional productivity widgets.
- Drag, position, and resize widgets on the new-tab page.
- Light, dark, and system themes.
- Image, animated image, and video wallpapers, including video audio tracks.
- Batch upload up to 5 wallpapers with a preview and a choice to save each one, add it to a playlist, or set one as the current wallpaper. The library holds up to 20 wallpapers and 1 GB total.
- Wallpaper playlists that rotate sequentially or in shuffled cycles on a user-selected interval. In random mode, each other wallpaper appears once before any repeats.
- Per-wallpaper video volume controls on the new-tab page and in Settings. The compact new-tab control reveals its vertical slider on hover or keyboard focus. Audio mutes when the tab or browser is inactive and resumes on return if that wallpaper is not muted.
- Settings and wallpaper files remain in the browser profile. A wallpaper URL requires optional access to that site when you apply it.
- Export and import for settings.

## Browser support

CyberBrowse uses Manifest V3, Chromium extension APIs, IndexedDB, and standard web media APIs. It does not use Windows-specific runtime code. Opera GX for Linux is supported, as are Chromium-based browsers on Linux with extension support. Video playback depends on the codecs available in the browser build.

## Requirements

- Node.js 20 or later
- npm 10 or later
- A Chromium-based desktop browser that supports Manifest V3 (Chrome 98 or later)

## Build

From the repository root:

```sh
npm ci
npm run lint
npm run typecheck
npm run build
```

The unpacked extension is generated in the parent directory’s `dist/` folder (`../dist/`). The build step uses Node.js file APIs and works on Windows and Linux.

## Load the extension locally

1. Open the browser’s extension manager (`chrome://extensions` in Chrome-based browsers or `opera://extensions` in Opera GX).
2. Enable Developer mode.
3. Choose **Load unpacked** and select the generated `../dist/` directory beside the repository folder.
4. Open a new tab to see CyberBrowse.

To apply later code changes to an unpacked extension, rebuild and reload the extension from its extension manager.

## Project layout

```text
src/background/    First-install defaults and toolbar action
src/newtab/        New-tab page, widgets, and layout editor
src/options/       Settings interface
src/utils/         Settings, validation, and wallpaper storage
src/tests/         Unit tests
public/icons/      Extension icons
scripts/           Cross-platform build finalization
```

## Development checks

```sh
npm run lint
npm run typecheck
npm test
```

GitHub Actions runs lint, type checking, and the production build on Ubuntu and Windows for pushes and pull requests.

## Permissions and data

- `storage` saves extension settings in the local browser profile.
- Wallpaper files are stored in IndexedDB in the extension’s local profile.
- CyberBrowse requests access to a wallpaper’s website only when you choose to apply a URL wallpaper. The requested site access is used to fetch and save that file locally.
- Searches are sent to the search provider selected in Settings.

## License

MIT. See [LICENSE](LICENSE).
