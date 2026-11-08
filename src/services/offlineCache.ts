import { Track } from '../types/player';

const DB_NAME = 'omnistream_offline_db';
const DB_VERSION = 1;
const STORE_TRACKS = 'cached_tracks';
const STORE_AUDIO = 'cached_audio_blobs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const trackStore = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        trackStore.createIndex('playedAt', 'playedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'trackId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const MAX_OFFLINE_TRACKS = 200;

/** 將播放過的曲目加入歷史清單與快取資料庫 (上限 200 首，超過時無法新增) */
export async function saveTrackToHistory(track: Track): Promise<{ success: boolean; limitExceeded?: boolean }> {
  try {
    const db = await openDatabase();

    // 檢查現有曲目總數與是否已存在本曲目
    const countTx = db.transaction(STORE_TRACKS, 'readonly');
    const countStore = countTx.objectStore(STORE_TRACKS);
    const existing = await new Promise<boolean>((resolve) => {
      const getReq = countStore.get(track.id);
      getReq.onsuccess = () => resolve(Boolean(getReq.result));
      getReq.onerror = () => resolve(false);
    });

    if (!existing) {
      const totalCount = await new Promise<number>((resolve) => {
        const countReq = countStore.count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(0);
      });

      if (totalCount >= MAX_OFFLINE_TRACKS) {
        return { success: false, limitExceeded: true };
      }
    }

    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);

    const record = {
      ...track,
      playedAt: Date.now(),
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        // 若該曲目具有可直接存取的音訊 URL (如 Audius / MP3 等)，非同步快取其音訊 blob
        if (track.streamUrl && track.source !== 'youtube') {
          cacheAudioBlob(track.id, track.streamUrl).catch(() => {});
        }
        resolve({ success: true });
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('儲存播放歷史失敗:', err);
    return { success: false };
  }
}

/** 取得所有播放過的歷史歌曲 (依播放時間新到舊排序) */
export async function getHistoryTracks(): Promise<Track[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = async () => {
        const list = (request.result || []) as Array<Track & { playedAt?: number }>;
        list.sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));

        const enriched = await Promise.all(
          list.map(async (t) => {
            const hasBlob = await hasOfflineAudio(t.id);
            return {
              ...t,
              isOfflineAvailable: hasBlob || t.source === 'youtube',
            };
          })
        );

        resolve(enriched);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('讀取歷史清單失敗:', err);
    return [];
  }
}

/** 快取音訊二進位檔案到本機 IndexedDB */
export async function cacheAudioBlob(trackId: string, streamUrl: string): Promise<boolean> {
  try {
    const already = await hasOfflineAudio(trackId);
    if (already) return true;

    const res = await fetch(streamUrl, { mode: 'cors' });
    if (!res.ok) return false;

    const blob = await res.blob();
    const db = await openDatabase();
    const tx = db.transaction(STORE_AUDIO, 'readwrite');
    const store = tx.objectStore(STORE_AUDIO);

    store.put({
      trackId,
      blob,
      size: blob.size,
      mimeType: blob.type || 'audio/mpeg',
      savedAt: Date.now(),
    });

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('快取離線音訊失敗:', err);
    return false;
  }
}

/** 檢查特定曲目是否已有本機離線音訊 */
export async function hasOfflineAudio(trackId: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_AUDIO, 'readonly');
    const store = tx.objectStore(STORE_AUDIO);

    return new Promise((resolve) => {
      const request = store.get(trackId);
      request.onsuccess = () => resolve(Boolean(request.result?.blob));
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/** 取得本機快取的音訊 Blob URL */
export async function getOfflineAudioUrl(trackId: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_AUDIO, 'readonly');
    const store = tx.objectStore(STORE_AUDIO);

    return new Promise((resolve) => {
      const request = store.get(trackId);
      request.onsuccess = () => {
        if (request.result?.blob) {
          const url = URL.createObjectURL(request.result.blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** 清除特定歷史曲目 */
export async function removeHistoryTrack(trackId: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO], 'readwrite');
    tx.objectStore(STORE_TRACKS).delete(trackId);
    tx.objectStore(STORE_AUDIO).delete(trackId);
  } catch (err) {
    console.warn('移除歷史曲目失敗:', err);
  }
}

/** 清空所有歷史清單與本機快取音訊 */
export async function clearAllHistory(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO], 'readwrite');
    tx.objectStore(STORE_TRACKS).clear();
    tx.objectStore(STORE_AUDIO).clear();
  } catch (err) {
    console.warn('清空歷史資料失敗:', err);
  }
}
