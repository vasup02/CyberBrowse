// Placeholder for Search Bar widget implementation
import { getSettings } from '../../utils/storage';

export async function renderSearchBar(container: HTMLElement, variant: 'default' | 'command' = 'default') {
  const settings = await getSettings();
  const form = document.createElement('form');
  form.className = 'search-form';
  form.dataset.variant = variant;
  if (variant === 'command') {
    const label = document.createElement('span');
    label.className = 'search-command-label';
    label.textContent = 'PRIVATE SEARCH';
    form.appendChild(label);
  }
  const icon = document.createElement('span');
  icon.className = 'search-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.2 4.2"></path></svg>';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'search-input';
  input.setAttribute('aria-label', 'Search the web');
  input.autocomplete = 'off';
  input.placeholder = variant === 'command' ? 'Ask the web…' : 'Search the web privately';
  form.append(icon, input);
  if (variant === 'command') {
    const key = document.createElement('kbd');
    key.className = 'search-command-key';
    key.textContent = 'ENTER ↵';
    form.appendChild(key);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    const provider = settings.searchProvider;
    const urlMap: Record<string, string> = {
      duckduckgo: 'https://duckduckgo.com/?q=',
      google: 'https://www.google.com/search?q=',
      bing: 'https://www.bing.com/search?q=',
      brave: 'https://search.brave.com/search?q=',
      startpage: 'https://www.startpage.com/do/search?q=',
    };
    const base = provider === 'custom' && settings.customSearchUrl ? settings.customSearchUrl : urlMap[provider] ?? urlMap.duckduckgo;
    const target = base + encodeURIComponent(query);
    // Navigate the current tab to the search URL.
    window.location.href = target;
  });

  container.appendChild(form);
}
