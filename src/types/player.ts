export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork: string;
  /** HTML Audio 可直接播放的網址；YouTube 曲目為空字串 */
  streamUrl: string;
  duration: number; // 秒數
  source: 'youtube' | 'audius' | 'itunes' | 'custom';
  /** YouTube 影片 ID (source === 'youtube' 時使用) */
  youtubeId?: string;
  /** true 表示此來源僅提供約 30 秒試聽片段 (如 iTunes) */
  isPreview?: boolean;
  genre?: string;
  year?: string;
  /** 是否具備本機離線快取音訊 */
  isOfflineAvailable?: boolean;
  /** 播放時間戳記 */
  playedAt?: number;
}

export type PlaybackMode = 'order' | 'repeat-all' | 'repeat-one' | 'shuffle';

export type SourceFilter = 'all' | 'youtube' | 'audius';

export interface GenreTag {
  id: string;
  label: string;
  query: string;
  icon?: string;
  description?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  createdAt: number;
  tracks: Track[];
}

export interface UserAccount {
  username: string;
  displayName: string;
  avatar?: string;
}

export interface UserSettings {
  volume: number;
  fullOnly: boolean;
  userYoutubeApiKey: string;
  sourceFilter: SourceFilter;
  playbackMode: PlaybackMode;
}
