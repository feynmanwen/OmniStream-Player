// 超精簡 1 秒靜音 WAV Data URI，用於在手機背景保持音訊 Session 活躍
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let silentAudioInstance: HTMLAudioElement | null = null;
let keepAliveCount = 0;

/**
 * 啟動靜音音訊背景保活 (專為 iOS Safari / Android Chrome YouTube 視訊背景播放設計)
 * 讓手機瀏覽器將網頁認定為進行中的「音訊播放應用」，避免切出或鎖定螢幕時音訊線路被系統強制銷毀。
 */
export function startSilentAudioKeepAlive(): void {
  keepAliveCount += 1;
  if (silentAudioInstance && !silentAudioInstance.paused) {
    return;
  }

  try {
    if (!silentAudioInstance) {
      silentAudioInstance = new Audio(SILENT_WAV_DATA_URI);
      silentAudioInstance.id = 'omnistream-silent-keepalive';
      silentAudioInstance.loop = true;
      silentAudioInstance.volume = 0.001; // 微小音量避免被省電機制殺死
    }
    silentAudioInstance.play().catch(() => {
      // 忽略自動播放限制，在使用者點擊播放時會自然解除
    });
  } catch (err) {
    console.warn('無法啟動靜音保活:', err);
  }
}

/** 停止背景保活音訊 */
export function stopSilentAudioKeepAlive(): void {
  keepAliveCount = Math.max(0, keepAliveCount - 1);
  if (keepAliveCount === 0 && silentAudioInstance) {
    try {
      silentAudioInstance.pause();
    } catch {
      // 安全忽略
    }
  }
}
