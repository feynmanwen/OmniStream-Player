import { Track, GenreTag } from '../types/player';
import { searchYouTube, YouTubeApiError } from './youtubeService';

const APP_NAME = 'omnistream';
const AUDIUS_API = 'https://api.audius.co/v1';
const FALLBACK_ARTWORK =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop';

export interface FeaturedArtist {
  id: string;
  name: string;
  query: string;
  tagline: string;
}

export const FEATURED_ARTISTS: FeaturedArtist[] = [
  { id: 'jay', name: '周杰倫', query: '周杰倫', tagline: '經典流行' },
  { id: 'zhoushen', name: '周深', query: '周深', tagline: '空靈美聲' },
  { id: 'tomchang', name: '張雨生', query: '張雨生', tagline: '不朽傳奇' },
  { id: 'maobuyi', name: '毛不易', query: '毛不易', tagline: '敘事民謠' },
];

export const POPULAR_GENRES: GenreTag[] = [
  { id: 'lofi', label: 'Lofi 專注', query: 'lofi', description: '溫暖復古節奏' },
  { id: 'jazz', label: '爵士館', query: 'jazz', description: '優雅隨興的爵士鋼琴' },
  { id: 'piano', label: '純音鋼琴', query: 'piano', description: '平靜優美鋼琴獨奏' },
  { id: 'pop', label: '熱門流行', query: 'pop hits', description: '暢銷旋律' },
  { id: 'ambient', label: '助眠放鬆', query: 'ambient', description: '靜心冥想與深度放鬆' },
];

/* ------------------------------------------------------------------ */
/* Audius：去中心化音樂平台，免金鑰、提供創作者授權的「完整曲目」串流 */
/* ------------------------------------------------------------------ */

interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  genre?: string;
  release_date?: string;
  is_streamable?: boolean;
  is_stream_gated?: boolean;
  artwork?: Record<string, string> | null;
  user?: { name?: string; handle?: string };
}

function mapAudiusTrack(t: AudiusTrack): Track {
  const art = t.artwork?.['480x480'] || t.artwork?.['1000x1000'] || t.artwork?.['150x150'] || FALLBACK_ARTWORK;
  return {
    id: `audius-${t.id}`,
    title: t.title || '未知曲名',
    artist: t.user?.name || t.user?.handle || '未知演出者',
    album: 'Audius',
    artwork: art,
    // 透過 API 端點取得完整音訊 (伺服器會 302 轉址至最新簽章的內容節點)
    streamUrl: `${AUDIUS_API}/tracks/${t.id}/stream?app_name=${APP_NAME}`,
    duration: Math.round(t.duration || 0),
    source: 'audius',
    isPreview: false,
    genre: t.genre || undefined,
    year: t.release_date ? t.release_date.substring(0, 4) : undefined,
  };
}

function isPlayableFull(t: AudiusTrack) {
  // 排除不可串流、需付費/解鎖 (gated) 的曲目，確保播放的是完整版本
  return t.is_streamable !== false && !t.is_stream_gated && (t.duration || 0) > 45;
}

async function searchAudius(query: string, limit = 30): Promise<Track[]> {
  const url = `${AUDIUS_API}/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}&app_name=${APP_NAME}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Audius HTTP ${res.status}`);
  const json = await res.json();
  return ((json.data || []) as AudiusTrack[]).filter(isPlayableFull).map(mapAudiusTrack);
}

export async function fetchTrendingTracks(limit = 30): Promise<Track[]> {
  try {
    const res = await fetch(`${AUDIUS_API}/tracks/trending?limit=${limit}&app_name=${APP_NAME}`);
    if (!res.ok) throw new Error(`Audius HTTP ${res.status}`);
    const json = await res.json();
    return ((json.data || []) as AudiusTrack[]).filter(isPlayableFull).map(mapAudiusTrack);
  } catch (err) {
    console.warn('無法取得熱門曲目:', err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* iTunes：僅提供約 30 秒官方試聽片段，作為主流商業歌曲的補充來源       */
/* ------------------------------------------------------------------ */

async function searchITunesPreviews(query: string, limit = 20): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || [])
    .filter((item: any) => item.previewUrl)
    .map(
      (item: any): Track => ({
        id: `itunes-${item.trackId}`,
        title: item.trackName || '未知曲名',
        artist: item.artistName || '未知演出者',
        album: item.collectionName || item.trackName,
        artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg') : FALLBACK_ARTWORK,
        streamUrl: item.previewUrl,
        duration: 30, // 實際可播放長度為試聽片段
        source: 'itunes',
        isPreview: true,
        genre: item.primaryGenreName || 'Music',
        year: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
      })
    );
}

/* ------------------------------------------------------------------ */

export interface SearchOptions {
  /** 為 true 時只回傳完整曲目；為 false 時在完整曲目之後附上 iTunes 30 秒試聽 */
  fullOnly: boolean;
  /** 有值時一併搜尋 YouTube */
  youtubeApiKey?: string;
}

export interface SearchOutcome {
  tracks: Track[];
  /** 非致命的來源錯誤 (例如 YouTube 配額用盡)，搜尋仍會回傳其他來源結果 */
  warnings: string[];
}

export async function searchMediaTracks(query: string, options: SearchOptions): Promise<SearchOutcome> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { tracks: [], warnings: [] };

  // 1. 直接輸入媒體 URL (.mp3, .m4a, .ogg, .wav) → 完整播放該檔案
  if (/^https?:\/\/.*\.(mp3|m4a|ogg|wav|flac)(\?.*)?$/i.test(cleanQuery)) {
    const filename = cleanQuery.split('/').pop()?.split('?')[0] || '網路串流曲目';
    return {
      warnings: [],
      tracks: [
        {
          id: `url-${Date.now()}`,
          title: decodeURIComponent(filename),
          artist: '自訂網路串流',
          album: '外部媒體',
          artwork: FALLBACK_ARTWORK,
          streamUrl: cleanQuery,
          duration: 0,
          source: 'custom',
          isPreview: false,
          genre: 'Custom Stream',
        },
      ],
    };
  }

  // 2. 並行搜尋：YouTube (主流歌曲) → Audius (完整獨立音樂) → iTunes 試聽 (選用)
  const [ytResult, audiusResult, previewResult] = await Promise.allSettled([
    options.youtubeApiKey ? searchYouTube(cleanQuery, options.youtubeApiKey) : Promise.resolve<Track[]>([]),
    searchAudius(cleanQuery),
    options.fullOnly ? Promise.resolve<Track[]>([]) : searchITunesPreviews(cleanQuery),
  ]);

  const warnings: string[] = [];
  const pick = (r: PromiseSettledResult<Track[]>, label: string): Track[] => {
    if (r.status === 'fulfilled') return r.value;
    console.warn(`${label} 搜尋失敗:`, r.reason);
    warnings.push(r.reason instanceof YouTubeApiError ? r.reason.message : `${label} 暫時無法連線`);
    return [];
  };

  const tracks = [
    ...pick(ytResult, 'YouTube'),
    ...pick(audiusResult, 'Audius'),
    ...pick(previewResult, 'iTunes'),
  ];

  return { tracks, warnings };
}

