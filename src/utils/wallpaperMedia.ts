const DATABASE_NAME = 'cyberbrowse-media';
const LEGACY_STORE_NAME = 'wallpapers';
const LIBRARY_STORE_NAME = 'wallpaper-library';
const LEGACY_WALLPAPER_KEY = 'current';
export const STORED_WALLPAPER_PREFIX = 'cyberbrowse-media:';
export const STORED_WALLPAPER_MARKER = `${STORED_WALLPAPER_PREFIX}${LEGACY_WALLPAPER_KEY}`;
export const MAX_WALLPAPER_COUNT = 20;
export const MAX_WALLPAPER_STORAGE_BYTES = 1024 * 1024 * 1024;
export const MAX_WALLPAPER_UPLOAD_BATCH = 5;

export interface WallpaperEntry {
  id: string;
  name: string;
  media: Blob;
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_STORE_NAME)) database.createObjectStore(LEGACY_STORE_NAME);
      if (!database.objectStoreNames.contains(LIBRARY_STORE_NAME)) database.createObjectStore(LIBRARY_STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open wallpaper storage.'));
  });
}

export async function storeWallpaperMedia(media: Blob, name: string): Promise<string> {
  const id = crypto.randomUUID();
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
    // Count and write in one read/write transaction so concurrent imports cannot
    // slip past either library limit.
    const transaction = database.transaction([LIBRARY_STORE_NAME, LEGACY_STORE_NAME], 'readwrite');
    const library = transaction.objectStore(LIBRARY_STORE_NAME);
    const entriesRequest = library.getAll();
    const legacyRequest = transaction.objectStore(LEGACY_STORE_NAME).get(LEGACY_WALLPAPER_KEY);
    const entry: WallpaperEntry = { id, name: name || 'Wallpaper', media, createdAt: Date.now() };
    let entries: WallpaperEntry[] | undefined;
    let legacyMedia: unknown;
    let legacyLoaded = false;
    let writeStarted = false;
    const validateAndWrite = () => {
      if (!entries || !legacyLoaded || writeStarted) return;
      writeStarted = true;
      const validEntries = entries.filter(candidate => candidate?.media instanceof Blob);
      const count = validEntries.length + (legacyMedia instanceof Blob ? 1 : 0);
      const bytes = validEntries.reduce((total, candidate) => total + candidate.media.size, legacyMedia instanceof Blob ? legacyMedia.size : 0);
      if (count >= MAX_WALLPAPER_COUNT) {
        reject(new Error(`You can save up to ${MAX_WALLPAPER_COUNT} wallpapers. Remove one before adding another.`));
        transaction.abort();
        return;
      }
      if (bytes + media.size > MAX_WALLPAPER_STORAGE_BYTES) {
        reject(new Error('This upload would exceed the 1 GB wallpaper storage limit. Remove saved wallpapers or choose a smaller file.'));
        transaction.abort();
        return;
      }
      library.put(entry);
    };
    entriesRequest.onsuccess = () => { entries = entriesRequest.result as WallpaperEntry[]; validateAndWrite(); };
    legacyRequest.onsuccess = () => { legacyMedia = legacyRequest.result; legacyLoaded = true; validateAndWrite(); };
    entriesRequest.onerror = () => { reject(entriesRequest.error ?? new Error('Could not check wallpaper storage.')); transaction.abort(); };
    legacyRequest.onerror = () => { reject(legacyRequest.error ?? new Error('Could not check wallpaper storage.')); transaction.abort(); };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save wallpaper media.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Wallpaper save was interrupted.'));
    });
  } finally {
    database.close();
  }
  return `${STORED_WALLPAPER_PREFIX}${id}`;
}

export async function getWallpaperLibraryUsage(): Promise<{ count: number; bytes: number }> {
  const entries = await listWallpaperMedia();
  return entries.reduce((usage, entry) => ({ count: usage.count + 1, bytes: usage.bytes + entry.media.size }), { count: 0, bytes: 0 });
}

export async function loadWallpaperMedia(reference = STORED_WALLPAPER_MARKER): Promise<Blob | null> {
  const key = reference.slice(STORED_WALLPAPER_PREFIX.length);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const isLegacy = key === LEGACY_WALLPAPER_KEY;
    const transaction = database.transaction(isLegacy ? LEGACY_STORE_NAME : LIBRARY_STORE_NAME, 'readonly');
    const request = transaction.objectStore(isLegacy ? LEGACY_STORE_NAME : LIBRARY_STORE_NAME).get(key);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result instanceof Blob ? result : result?.media instanceof Blob ? result.media : null);
    };
    request.onerror = () => reject(request.error ?? new Error('Could not read wallpaper media.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Could not read wallpaper media.')); };
  });
}

export async function listWallpaperMedia(): Promise<WallpaperEntry[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([LIBRARY_STORE_NAME, LEGACY_STORE_NAME], 'readonly');
    const request = transaction.objectStore(LIBRARY_STORE_NAME).getAll();
    const legacyRequest = transaction.objectStore(LEGACY_STORE_NAME).get(LEGACY_WALLPAPER_KEY);
    let libraryEntries: WallpaperEntry[] | null = null;
    let legacyMedia: unknown;
    let legacyReady = false;
    const finishWhenReady = () => {
      if (!libraryEntries || !legacyReady) return;
      if (legacyMedia instanceof Blob) libraryEntries.push({ id: LEGACY_WALLPAPER_KEY, name: 'Previously uploaded wallpaper', media: legacyMedia, createdAt: 0 });
      resolve(libraryEntries.sort((a, b) => b.createdAt - a.createdAt));
    };
    request.onsuccess = () => {
      libraryEntries = (request.result as WallpaperEntry[]).filter(entry => entry?.media instanceof Blob);
      finishWhenReady();
    };
    legacyRequest.onsuccess = () => { legacyMedia = legacyRequest.result; legacyReady = true; finishWhenReady(); };
    request.onerror = () => reject(request.error ?? new Error('Could not list saved wallpapers.'));
    legacyRequest.onerror = () => reject(legacyRequest.error ?? new Error('Could not list saved wallpapers.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Could not list saved wallpapers.')); };
  });
}

export async function deleteWallpaperMedia(id: string): Promise<void> {
  if (id === LEGACY_WALLPAPER_KEY) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LIBRARY_STORE_NAME, 'readwrite');
    transaction.objectStore(LIBRARY_STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove wallpaper.'));
  }).finally(() => database.close());
}
