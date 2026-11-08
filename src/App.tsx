import React, { useState, useEffect } from 'react';
import { Navbar, MainNavTab } from './components/Navbar';
import { SearchResults } from './components/SearchResults';
import { PlayerBar } from './components/PlayerBar';
import { QueueDrawer } from './components/QueueDrawer';
import { FullscreenPlayerModal } from './components/FullscreenPlayerModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { PlaylistModal } from './components/PlaylistModal';
import { AudioEngine } from './components/AudioEngine';
import { YouTubeEngine } from './components/YouTubeEngine';
import { usePlayerStore } from './store/usePlayerStore';
import { Track } from './types/player';
import { Info } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainNavTab>('search');
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);

  const {
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    currentTime,
    duration,
    setVolume,
    volume,
    loadTrending,
    loadHistory,
    toast,
  } = usePlayerStore();

  // 啟動時載入熱門完整曲目與本機歷史清單
  useEffect(() => {
    loadTrending();
    loadHistory();
  }, [loadTrending, loadHistory]);

  // 全域鍵盤多媒體熱鍵支援
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 若當前焦點在 input 輸入框，不攔截按鍵
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, nextTrack, prevTrack, seekTo, currentTime, duration, setVolume, volume]);

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-[#fa2d48]/30 selection:text-white">
      {/* 雙引擎驅動：HTML5 Audio + YouTube IFrame Player */}
      <AudioEngine />
      <YouTubeEngine />

      {/* 頂部導航與搜尋列 */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 主要內容區 */}
      <main className="flex-1 w-full">
        <SearchResults
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAddToPlaylist={(track) => {
            setTrackToAdd(track);
            setIsPlaylistModalOpen(true);
          }}
          onOpenCreatePlaylist={() => {
            setTrackToAdd(null);
            setIsPlaylistModalOpen(true);
          }}
        />
      </main>

      {/* 側邊播放佇列抽屜 */}
      <QueueDrawer />

      {/* 底部常駐播放控制列 */}
      <PlayerBar />

      {/* 沉浸式全螢幕播放彈窗 */}
      <FullscreenPlayerModal />

      {/* 設定與 YouTube 金鑰彈窗 */}
      <SettingsModal />

      {/* 使用者登入與帳號切換彈窗 */}
      <AuthModal />

      {/* 自訂播放歌單建立與加入彈窗 */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setTrackToAdd(null);
        }}
        trackToAdd={trackToAdd}
      />

      {/* 全域 Toast 輕量通知 */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 px-4 py-2.5 rounded-full apple-sheet border border-white/10 text-white text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <Info className="w-3.5 h-3.5 text-[#fa2d48] shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};

export default App;
