// Placeholder for Shortcut handling – renders a clickable tile.
export function renderShortcut(container: HTMLElement, title: string, url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.textContent = title;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  container.appendChild(link);
}
