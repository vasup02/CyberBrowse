import { isValidUrl } from '../../utils/validation';
import { updateSettings } from '../../utils/storage';

// Render all shortcuts according to layout (grid or list)
export function renderShortcuts(container: HTMLElement, settings: Settings, isCustomizeMode = false, variant: 'default' | 'ledger' = 'default') {
  container.dataset.variant = variant;
  container.classList.toggle('customize-preview', isCustomizeMode);
  // Clear container
  container.innerHTML = '';

  const heading = document.createElement('div');
  heading.className = 'shortcuts-header';
  const title = document.createElement('h2');
  title.textContent = 'Quick links';
  heading.append(title);
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'shortcuts-list';

  // Render each shortcut
  settings.shortcuts.forEach(shortcut => {
    const item = document.createElement('div');
    item.className = variant === 'ledger' ? 'shortcut-item shortcut-item-ledger' : 'shortcut-item';
    // Link
    const link = document.createElement('a');
    link.href = shortcut.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = variant === 'ledger' ? 'shortcut-link shortcut-link-ledger' : 'shortcut-link';
    if (isCustomizeMode) link.tabIndex = -1;
    link.setAttribute('aria-label', `Open ${shortcut.title}`);
    if (variant === 'ledger') {
      const order = document.createElement('span');
      order.className = 'shortcut-index';
      order.setAttribute('aria-hidden', 'true');
      order.textContent = String(list.children.length + 1).padStart(2, '0');
      link.appendChild(order);
    }
    const monogram = document.createElement('span');
    monogram.className = 'shortcut-monogram';
    monogram.setAttribute('aria-hidden', 'true');
    monogram.textContent = shortcut.title.trim().charAt(0).toUpperCase() || '↗';
    const label = document.createElement('span');
    label.className = 'shortcut-title';
    label.textContent = shortcut.title;
    if (variant === 'ledger') {
      const copy = document.createElement('span');
      copy.className = 'shortcut-copy';
      const domain = document.createElement('span');
      domain.className = 'shortcut-domain';
      try { domain.textContent = new URL(shortcut.url).hostname.replace(/^www\./, ''); } catch { domain.textContent = ''; }
      copy.append(label, domain);
      link.append(monogram, copy);
    } else {
      link.append(monogram, label);
    }
    item.appendChild(link);

    // Delete button (accessible)
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'shortcut-delete';
    delBtn.disabled = isCustomizeMode;
    delBtn.setAttribute('aria-label', `Delete ${shortcut.title}`);
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', async e => {
      e.stopPropagation();
      const newShortcuts = settings.shortcuts.filter(s => s.id !== shortcut.id);
      await updateSettings({ shortcuts: newShortcuts });
      // Re‑render (settings will be re‑fetched by caller on next tick)
      renderShortcuts(container, { ...settings, shortcuts: newShortcuts }, false, variant);
    });
    item.appendChild(delBtn);

    list.appendChild(item);
  });

  // Add button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'shortcut-add';
  addBtn.disabled = isCustomizeMode;
  addBtn.title = isCustomizeMode ? 'Finish customizing to add a shortcut' : 'Add a shortcut';
  const plus = document.createElement('span');
  plus.setAttribute('aria-hidden', 'true');
  plus.textContent = '+';
  const addLabel = document.createElement('span');
  addLabel.textContent = 'Add shortcut';
  addBtn.append(plus, addLabel);
  addBtn.addEventListener('click', () => openAddDialog(container, settings, variant));
  list.appendChild(addBtn);

  container.appendChild(list);
}

function openAddDialog(container: HTMLElement, settings: Settings, variant: 'default' | 'ledger') {
  // Simple prompt dialogs – accessible but minimal.
  const title = prompt('Shortcut title:');
  if (!title) return;
  const url = prompt('Shortcut URL (include http/https):');
  if (!url || !isValidUrl(url)) {
    alert('Invalid URL.');
    return;
  }
  const newShortcut: Shortcut = {
    id: crypto.randomUUID(),
    title,
    url,
  };
  const newShortcuts = [...settings.shortcuts, newShortcut];
  updateSettings({ shortcuts: newShortcuts });
  // Re-render
  renderShortcuts(container, { ...settings, shortcuts: newShortcuts }, false, variant);
}
