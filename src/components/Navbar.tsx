import React, { useState } from 'react';
import {
  Search,
  Loader2,
  Music2,
  ListMusic,
  Heart,
  Settings,
  Sparkles,
  History,
  Library,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { FEATURED_ARTISTS, POPULAR_GENRES } from '../services/searchService';

export type MainNavTab = 'search' | 'playlists' | 'favorites' | 'history';

interface NavbarProps {
  activeTab: MainNavTab;
  setActiveTab: (tab: MainNavTab) => void;
  onOpenNewPlaylistModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [inputValue, setInputValue] = useState('');
  const {
    isSearching,
    searchAndAutoplay,
    queue,
    favorites,
    historyTracks,
    playlists,
    currentUser,
    setIsAuthModalOpen,
    isQueueOpen,
    setIsQueueOpen,
    fullOnly,
    setFullOnly,
    setIsSettingsOpen,
    getYoutubeApiKey,
    searchQuery,
  } = usePlayerStore();

  const hasYtKey = Boolean(getYoutubeApiKey());

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setActiveTab('search');
      searchAndAutoplay(inputValue.trim());
    }
  };

  const handleArtistClick = (artistName: string) => {
    setInputValue(artistName);
    setActiveTab('search');
    searchAndAutoplay(artistName);
  };

  return (
    <header className="sticky top-0 z-30 w-full apple-header transition-all">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-col gap-2.5 sm:gap-3">
        {/* 第一行 (行動版) / 主要頂欄 (桌機版)：品牌 + 操作按鈕 (桌機版包含搜尋列) */}
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          {/* Apple Music 風格品牌標誌 */}
          <div
            onClick={() => setActiveTab('search')}
            className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-b from-[#fa2d48] to-[#d61933] flex items-center justify-center shadow-lg shadow-[#fa2d48]/25 group-hover:scale-105 transition-transform">
              <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] sm:text-[17px] font-bold text-white tracking-tight leading-tight">
                音樂
              </span>
              <span className="text-[9px] sm:text-[10px] text-neutral-400 font-medium tracking-wide">
                OmniStream
              </span>
            </div>
          </div>

          {/* 桌機版搜尋框 (大螢幕 inline，手機版隱藏並移至第二行) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md lg:max-w-lg relative">
            <div className="relative flex items-center w-full">
              <div className="absolute left-3.5 pointer-events-none text-neutral-400">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#fa2d48]" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="搜尋歌曲、藝人、專輯 (Enter 即動播)..."
                className="w-full pl-10 pr-20 py-2 bg-white/[0.08] hover:bg-white/[0.11] focus:bg-white/[0.14] text-[13px] text-white placeholder-neutral-400 rounded-full border border-white/[0.08] focus:border-white/20 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={isSearching || !inputValue.trim()}
                className="absolute right-1 px-3 py-1 text-xs font-medium rounded-full bg-[#fa2d48] hover:bg-[#e0233d] active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>動播</span>
              </button>
            </div>
          </form>

          {/* 右側按鈕：使用者頭像 / 歌單 / 歷史暫存 / 收藏 / 待播清單 / 設定 */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 播放清單按鈕 */}
            <button
              onClick={() => setActiveTab(activeTab === 'playlists' ? 'search' : 'playlists')}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'playlists'
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'apple-pill text-neutral-300 hover:text-white'
              }`}
              title="個人自訂播放清單"
            >
              <Library className="w-4 h-4" />
              <span className="hidden lg:inline">歌單</span>
              {playlists.length > 0 && (
                <span className="text-[10px] sm:text-[11px] text-neutral-400 font-mono">
                  {playlists.length}
                </span>
              )}
            </button>

            {/* 歷史播放 (離線可用) */}
            <button
              onClick={() => setActiveTab(activeTab === 'history' ? 'search' : 'history')}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'apple-pill text-neutral-300 hover:text-white'
              }`}
              title="播放歷史 (離線暫存清單)"
            >
              <History className="w-4 h-4" />
              <span className="hidden lg:inline">離線</span>
              {historyTracks.length > 0 && (
                <span className="text-[10px] sm:text-[11px] text-neutral-400 font-mono">
                  {historyTracks.length}
                </span>
              )}
            </button>

            {/* 我的最愛 */}
            <button
              onClick={() => setActiveTab(activeTab === 'favorites' ? 'search' : 'favorites')}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-[#fa2d48]/20 border-[#fa2d48]/40 text-[#fa2d48]'
                  : 'apple-pill text-neutral-300 hover:text-white'
              }`}
              title="已喜愛的曲目"
            >
              <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'fill-current' : ''}`} />
              <span className="hidden lg:inline">喜愛</span>
              {favorites.length > 0 && (
                <span className="text-[10px] sm:text-[11px] text-neutral-400 font-mono">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* 播放佇列 */}
            <button
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                isQueueOpen
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'apple-pill text-neutral-300 hover:text-white'
              }`}
              title="待播清單"
            >
              <ListMusic className="w-4 h-4" />
              <span className="hidden lg:inline">佇列</span>
              {queue.length > 0 && (
                <span className="text-[10px] sm:text-[11px] text-neutral-400 font-mono">
                  {queue.length}
                </span>
              )}
            </button>

            {/* 使用者登入/切換按鈕 */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="p-1 sm:px-2.5 sm:py-1 rounded-full apple-pill text-neutral-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
              title={`目前使用者：${currentUser.displayName} (點擊切換)`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow"
                style={{ backgroundColor: currentUser.avatar || '#fa2d48' }}
              >
                {currentUser.displayName.charAt(0)}
              </div>
              <span className="hidden md:inline text-xs font-medium truncate max-w-[70px]">
                {currentUser.displayName}
              </span>
            </button>

            {/* 設定按鈕 */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full apple-pill text-neutral-400 hover:text-white transition-all relative cursor-pointer"
              title={hasYtKey ? '設定 (YouTube 已啟用)' : '設定 (點擊填入金鑰)'}
            >
              <Settings className="w-4 h-4" />
              {hasYtKey ? (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full" />
              ) : (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* 手機版專屬第二行：寬敞全幅搜尋欄 (打字清晰不擁擠) */}
        <div className="md:hidden w-full">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <div className="relative flex items-center w-full shadow-inner">
              <div className="absolute left-3.5 pointer-events-none text-neutral-400">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#fa2d48]" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="搜尋歌曲、藝人或專輯名稱..."
                className="w-full pl-10 pr-22 py-2.5 bg-white/[0.08] focus:bg-white/[0.14] text-[14px] text-white placeholder-neutral-400 rounded-2xl border border-white/[0.12] focus:border-[#fa2d48]/50 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={isSearching || !inputValue.trim()}
                className="absolute right-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#fa2d48] hover:bg-[#e0233d] active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white transition-all shadow-md flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>動播</span>
              </button>
            </div>
          </form>
        </div>

        {/* 下層：歌手推薦與分類標籤 (Apple Music 膠囊風格) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          {/* 指定預設歌手快捷列 */}
          <span className="text-neutral-500 font-medium text-[11px] tracking-wider uppercase shrink-0 mr-0.5">
            推薦藝人:
          </span>
          {FEATURED_ARTISTS.map((artist) => {
            const isSelected = searchQuery === artist.name;
            return (
              <button
                key={artist.id}
                onClick={() => handleArtistClick(artist.query)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[#fa2d48] text-white border-[#fa2d48] shadow-md shadow-[#fa2d48]/20 font-semibold'
                    : 'apple-pill text-neutral-200 hover:text-white hover:border-white/20'
                }`}
              >
                <span>{artist.name}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                  {artist.tagline}
                </span>
              </button>
            );
          })}

          <div className="h-3 w-[1px] bg-white/10 shrink-0 mx-1" />

          {/* 完整曲目過濾切換 */}
          <button
            onClick={() => setFullOnly(!fullOnly)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
              fullOnly
                ? 'bg-white/10 border-white/20 text-neutral-200'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            {fullOnly ? '完整曲目' : '含試聽'}
          </button>

          {/* 精選風格標籤 */}
          {POPULAR_GENRES.map((genre) => (
            <button
              key={genre.id}
              onClick={() => handleArtistClick(genre.query)}
              className="px-2.5 py-1 rounded-full apple-pill text-neutral-400 hover:text-neutral-200 text-[11px] whitespace-nowrap shrink-0 transition-all cursor-pointer"
            >
              {genre.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
