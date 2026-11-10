// Placeholder for Wallpaper widget – stores a user‑chosen image as a data URL.
export function setWallpaper(imageDataUrl: string) {
  document.body.style.backgroundImage = `url(${imageDataUrl})`;
  document.body.style.backgroundSize = 'cover';
}
