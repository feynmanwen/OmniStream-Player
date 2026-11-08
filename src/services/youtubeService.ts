import { Track } from '../types/player';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeApiError extends Error {}

/** 將 YouTube API 的錯誤轉為使用者看得懂的中文訊息 */
function describeError(status: number, body: any): string {
  const reason: string | undefined = body?.error?.errors?.[0]?.reason;
  const message: string = body?.error?.message || '';

  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
    return 'YouTube 今日搜尋配額已用完，明天會自動重置（目前僅顯示 Audius 結果）。';
  }
  if (reason === 'keyInvalid' || /API key not valid/i.test(message)) {
    return 'YouTube API 金鑰無效，請到「設定」確認金鑰。';
  }
  if (reason === 'accessNotConfigured' || /has not been used|is disabled/i.test(message)) {
    return '此金鑰的 Google Cloud 專案尚未啟用「YouTube Data API v3」。';
  }
  if (reason === 'ipRefererBlocked' || /referer/i.test(message)) {
    return 'YouTube 金鑰的 HTTP 參照網址限制不包含目前網址，請在 Google Cloud 加入此網域。';
  }
  return `YouTube 搜尋失敗 (HTTP ${status})${message ? `：${message}` : ''}`;
}

/** ISO 8601 時長 (PT1H2M3S) → 秒 */
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((v) => (v ? parseInt(v, 10) : 0)) as number[];
  return d * 86400 + h * 3600 + min * 60 + s;
}

/** YouTube 標題含 HTML 實體 (&amp; &#39; ...)，需解碼 */
function decodeHtml(text: string): string {
  try {
    return new DOMParser().parseFromString(text, 'text/html').documentElement.textContent || text;
  } catch {
    return text;
  }
}

/**
 * 以官方 YouTube Data API v3 搜尋可嵌入的音樂影片。
 * 配額成本：search.list 100 單位 + videos.list 1 單位。
 */
export async function searchYouTube(query: string, apiKey: string, maxResults = 20): Promise<Track[]> {
  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    videoCategoryId: '10', // 音樂類別
    maxResults: String(maxResults),
    q: query,
    key: apiKey,
  });

  const searchRes = await fetch(`${API_BASE}/search?${searchParams}`);
  const searchJson = await searchRes.json().catch(() => ({}));
  if (!searchRes.ok) throw new YouTubeApiError(describeError(searchRes.status, searchJson));

  const items: any[] = (searchJson.items || []).filter(
    (it: any) => it.id?.videoId && it.snippet?.liveBroadcastContent !== 'upcoming'
  );
  if (items.length === 0) return [];

  // 批次查詢時長與可嵌入狀態
  const ids = items.map((it) => it.id.videoId).join(',');
  const detailParams = new URLSearchParams({ part: 'contentDetails,status', id: ids, key: apiKey });
  const detailMap = new Map<string, { duration: number; embeddable: boolean }>();
  try {
    const detailRes = await fetch(`${API_BASE}/videos?${detailParams}`);
    if (detailRes.ok) {
      const detailJson = await detailRes.json();
      for (const v of detailJson.items || []) {
        detailMap.set(v.id, {
          duration: parseIsoDuration(v.contentDetails?.duration),
          embeddable: v.status?.embeddable !== false,
        });
      }
    }
  } catch {
    // 時長取得失敗不影響播放
  }

  return items
    .filter((it) => detailMap.get(it.id.videoId)?.embeddable !== false)
    .map((it): Track => {
      const sn = it.snippet;
      const thumb = sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || '';
      return {
        id: `youtube-${it.id.videoId}`,
        youtubeId: it.id.videoId,
        title: decodeHtml(sn.title || '未知影片'),
        artist: decodeHtml(sn.channelTitle || 'YouTube'),
        album: 'YouTube',
        artwork: thumb,
        streamUrl: '',
        duration: detailMap.get(it.id.videoId)?.duration || 0,
        source: 'youtube',
        isPreview: false,
        genre: 'YouTube',
        year: sn.publishedAt ? String(sn.publishedAt).substring(0, 4) : undefined,
      };
    });
}
