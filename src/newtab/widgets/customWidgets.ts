import { getSettings, setSettings } from '../../utils/storage';

type WidgetConfig = Record<string, unknown>;

async function saveWidgetConfig(widgetId: string, config: WidgetConfig): Promise<void> {
  const settings = await getSettings();
  const widgets = (settings.widgets ?? []).map(widget => widget.id === widgetId
    ? { ...widget, config: { ...widget.config, ...config } }
    : widget);
  await setSettings({ ...settings, widgets });
}

function readString(config: WidgetConfig, key: string, fallback = ''): string {
  return typeof config[key] === 'string' ? config[key] as string : fallback;
}

function renderNotes(container: HTMLElement, widget: Widget, disabled: boolean): void {
  const title = document.createElement('h2');
  title.className = 'custom-widget-title';
  title.textContent = 'Notes';
  const note = document.createElement('textarea');
  note.className = 'custom-widget-notes';
  note.placeholder = 'Keep a thought here…';
  note.value = readString(widget.config ?? {}, 'text');
  note.readOnly = disabled;
  note.setAttribute('aria-label', 'Quick note');
  let saveTimer = 0;
  note.addEventListener('input', () => {
    window.clearTimeout(saveTimer);
    const text = note.value;
    saveTimer = window.setTimeout(() => void saveWidgetConfig(widget.id, { text }), 350);
  });
  container.append(title, note);
}

interface TaskItem { id: string; text: string; done: boolean }

function renderTasks(container: HTMLElement, widget: Widget, disabled: boolean): void {
  const config = widget.config ?? {};
  let tasks = Array.isArray(config.tasks) ? config.tasks as TaskItem[] : [];
  const header = document.createElement('div');
  header.className = 'custom-widget-heading';
  const title = document.createElement('h2');
  title.className = 'custom-widget-title';
  title.textContent = 'Tasks';
  const remaining = document.createElement('span');
  remaining.className = 'widget-count';
  remaining.textContent = String(tasks.filter(task => !task.done).length);
  header.append(title, remaining);
  const list = document.createElement('ul');
  list.className = 'task-list';
  tasks.forEach(task => {
    const row = document.createElement('li');
    row.className = task.done ? 'task-row is-done' : 'task-row';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = task.done;
    toggle.disabled = disabled;
    toggle.setAttribute('aria-label', `Mark ${task.text} ${task.done ? 'not done' : 'done'}`);
    const text = document.createElement('span');
    text.textContent = task.text;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'task-remove custom-widget-control';
    remove.disabled = disabled;
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${task.text}`);
    toggle.addEventListener('change', () => {
      tasks = tasks.map(item => item.id === task.id ? { ...item, done: toggle.checked } : item);
      void saveWidgetConfig(widget.id, { tasks });
      row.classList.toggle('is-done', toggle.checked);
      text.classList.toggle('task-text-done', toggle.checked);
      remaining.textContent = String(tasks.filter(item => item.id === task.id ? !toggle.checked : !item.done).length);
    });
    remove.addEventListener('click', () => {
      tasks = tasks.filter(item => item.id !== task.id);
      void saveWidgetConfig(widget.id, { tasks });
      row.remove();
      remaining.textContent = String(tasks.filter(item => item.id !== task.id && !item.done).length);
    });
    row.append(toggle, text, remove);
    list.appendChild(row);
  });
  const form = document.createElement('form');
  form.className = 'task-add-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Add a task';
  input.maxLength = 90;
  input.disabled = disabled;
  input.setAttribute('aria-label', 'New task');
  const add = document.createElement('button');
  add.type = 'submit';
  add.disabled = disabled;
  add.textContent = '+';
  add.setAttribute('aria-label', 'Add task');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
      tasks = [...tasks, { id: crypto.randomUUID(), text, done: false }];
      void saveWidgetConfig(widget.id, { tasks });
    input.value = '';
      container.replaceChildren();
      renderTasks(container, { ...widget, config: { ...config, tasks } }, false);
      container.querySelector<HTMLInputElement>('.task-add-form input')?.focus();
  });
  form.append(input, add);
  container.append(header, list, form);
}

function renderFocus(container: HTMLElement, widget: Widget, disabled: boolean): void {
  const config = widget.config ?? {};
  let remaining = typeof config.remainingMs === 'number' ? config.remainingMs : 25 * 60_000;
  const endsAt = typeof config.endsAt === 'number' ? config.endsAt : 0;
  let isRunning = config.running === true && endsAt > Date.now();
  if (isRunning) remaining = endsAt - Date.now();
  const title = document.createElement('h2');
  title.className = 'custom-widget-title';
  title.textContent = 'Focus session';
  const readout = document.createElement('div');
  readout.className = 'focus-readout';
  readout.setAttribute('role', 'timer');
  readout.setAttribute('aria-label', 'Focus session time remaining');
  const controls = document.createElement('div');
  controls.className = 'focus-controls';
  const startPause = document.createElement('button');
  startPause.type = 'button';
  startPause.disabled = disabled;
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.disabled = disabled;
  reset.textContent = 'Reset';
  let end = isRunning ? endsAt : 0;
  let interval = 0;
  const paint = () => {
    const left = isRunning ? Math.max(0, end - Date.now()) : remaining;
    const totalSeconds = Math.ceil(left / 1000);
    readout.textContent = `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
    startPause.textContent = end > Date.now() ? 'Pause' : left === 0 ? 'Done' : 'Start';
    startPause.setAttribute('aria-label', end > Date.now() ? 'Pause focus timer' : left === 0 ? 'Focus session complete' : 'Start focus timer');
    startPause.disabled = disabled || left === 0;
  };
  const stopTick = () => { window.clearInterval(interval); interval = 0; };
  const startTick = () => {
    stopTick();
    interval = window.setInterval(() => {
      if (end <= Date.now()) {
        remaining = 0;
        end = 0;
        isRunning = false;
        stopTick();
        void saveWidgetConfig(widget.id, { remainingMs: 0, endsAt: 0, running: false });
      }
      paint();
    }, 1000);
  };
  startPause.addEventListener('click', () => {
    if (end > Date.now()) {
      remaining = Math.max(0, end - Date.now());
      end = 0;
      isRunning = false;
      stopTick();
      void saveWidgetConfig(widget.id, { remainingMs: remaining, endsAt: 0, running: false });
    } else {
      end = Date.now() + remaining;
      isRunning = true;
      void saveWidgetConfig(widget.id, { remainingMs: remaining, endsAt: end, running: true });
      startTick();
    }
    paint();
  });
  reset.addEventListener('click', () => {
    remaining = 25 * 60_000;
    end = 0;
    isRunning = false;
    stopTick();
    void saveWidgetConfig(widget.id, { remainingMs: remaining, endsAt: 0, running: false });
    paint();
  });
  if (!disabled && isRunning) startTick();
  if (disabled) {
    startPause.title = 'Finish customizing to use the timer';
    reset.title = 'Finish customizing to use the timer';
  }
  controls.append(startPause, reset);
  container.append(title, readout, controls);
  paint();
}

function renderCalendar(container: HTMLElement): void {
  const now = new Date();
  const title = document.createElement('h2');
  title.className = 'custom-widget-title';
  title.textContent = now.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(day => {
    const cell = document.createElement('span');
    cell.className = 'calendar-weekday';
    cell.textContent = day;
    grid.appendChild(cell);
  });
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let index = 0; index < offset; index += 1) {
    const blank = document.createElement('span');
    blank.className = 'calendar-day is-empty';
    blank.setAttribute('aria-hidden', 'true');
    grid.appendChild(blank);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = document.createElement('span');
    cell.className = day === now.getDate() ? 'calendar-day is-today' : 'calendar-day';
    cell.textContent = String(day);
    if (day === now.getDate()) cell.setAttribute('aria-current', 'date');
    grid.appendChild(cell);
  }
  container.append(title, grid);
}

export function renderCustomWidget(container: HTMLElement, widget: Widget, isCustomizeMode: boolean): void {
  container.replaceChildren();
  container.classList.add('custom-widget');
  if (widget.config?.variant === 'compact') container.dataset.variant = 'compact';
  else delete container.dataset.variant;
  switch (widget.type) {
    case 'notes': renderNotes(container, widget, isCustomizeMode); break;
    case 'tasks': renderTasks(container, widget, isCustomizeMode); break;
    case 'focus': renderFocus(container, widget, isCustomizeMode); break;
    case 'calendar': renderCalendar(container); break;
  }
}
