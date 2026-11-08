import { Track } from '../types/player';

/**
 * 播放器轉接層：store 只與 controller 溝通，controller 依曲目來源
 * 將指令轉給 HTML Audio 引擎或 YouTube IFrame 引擎。
 */

export type EngineKind = 'audio' | 'youtube';

export interface PlaybackAdapter {
  /** 載入曲目並開始播放 */
  load(track: Track): void;
  play(): void;
  pause(): void;
  /** 停止並釋放目前內容 (切換到另一個引擎時呼叫) */
  stop(): void;
  seek(seconds: number): void;
  setVolume(volume01: number): void;
  setMuted(muted: boolean): void;
}

export interface EngineListeners {
  onPlayState: (playing: boolean) => void;
  onTime: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onError: (message: string) => void;
}

const adapters: Partial<Record<EngineKind, PlaybackAdapter>> = {};
let activeKind: EngineKind | null = null;
let listeners: EngineListeners | null = null;
let volume = 0.85;
let muted = false;

export function engineKindFor(track: Track): EngineKind {
  return track.source === 'youtube' ? 'youtube' : 'audio';
}

export function registerAdapter(kind: EngineKind, adapter: PlaybackAdapter) {
  adapters[kind] = adapter;
  adapter.setVolume(volume);
  adapter.setMuted(muted);
}

export function unregisterAdapter(kind: EngineKind, adapter: PlaybackAdapter) {
  if (adapters[kind] === adapter) delete adapters[kind];
}

export function setEngineListeners(l: EngineListeners) {
  listeners = l;
}

/**
 * 引擎回報事件時呼叫。只轉發「目前作用中」引擎的事件，
 * 避免被停止的引擎送出的 pause/ended 干擾新曲目的狀態。
 */
export function reportFromEngine<K extends keyof EngineListeners>(
  kind: EngineKind,
  event: K,
  ...args: Parameters<EngineListeners[K]>
) {
  if (kind !== activeKind || !listeners) return;
  (listeners[event] as (...a: Parameters<EngineListeners[K]>) => void)(...args);
}

export const playback = {
  get activeKind() {
    return activeKind;
  },

  loadAndPlay(track: Track) {
    const kind = engineKindFor(track);
    // 先停掉另一個引擎，確保不會兩邊同時發聲
    for (const k of Object.keys(adapters) as EngineKind[]) {
      if (k !== kind) adapters[k]?.stop();
    }
    activeKind = kind;
    const adapter = adapters[kind];
    if (!adapter) {
      listeners?.onError(kind === 'youtube' ? 'YouTube 播放器尚未就緒，請稍候再試' : '音訊引擎尚未就緒');
      return;
    }
    adapter.setVolume(volume);
    adapter.setMuted(muted);
    adapter.load(track);
  },

  play() {
    if (activeKind) adapters[activeKind]?.play();
  },

  pause() {
    if (activeKind) adapters[activeKind]?.pause();
  },

  seek(seconds: number) {
    if (activeKind) adapters[activeKind]?.seek(seconds);
  },

  setVolume(v: number) {
    volume = v;
    Object.values(adapters).forEach((a) => a?.setVolume(v));
  },

  setMuted(m: boolean) {
    muted = m;
    Object.values(adapters).forEach((a) => a?.setMuted(m));
  },

  stopAll() {
    Object.values(adapters).forEach((a) => a?.stop());
    activeKind = null;
  },
};
