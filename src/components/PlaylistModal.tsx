import React, { useState } from 'react';
import { X, FolderPlus, ListPlus, Check } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Track } from '../types/player';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackToAdd?: Track | null;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  trackToAdd,
}) => {
  const {
    playlists,
    createPlaylist,
    addTrackToPlaylist,
    currentUser,
  } = usePlayerStore();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = createPlaylist(newTitle.trim(), newDesc.trim());
    if (trackToAdd) {
      addTrackToPlaylist(created.id, trackToAdd);
    }
    setNewTitle('');
    setNewDesc('');
    setIsCreatingNew(false);
    onClose();
  };

  const handleSelectPlaylist = (playlistId: string) => {
    if (trackToAdd) {
      addTrackToPlaylist(playlistId, trackToAdd);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl apple-sheet p-6 sm:p-7 shadow-2xl flex flex-col gap-5 border border-white/10">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#fa2d48] to-rose-600 flex items-center justify-center text-white shadow-lg shadow-[#fa2d48]/25">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-[16px] tracking-tight">
                {trackToAdd ? '加入播放清單' : '建立播放清單'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                使用者：<span className="text-white font-medium">{currentUser.displayName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 若有選中歌曲，顯示歌曲資訊 */}
        {trackToAdd && (
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
            <img
              src={trackToAdd.artwork}
              alt={trackToAdd.title}
              className="w-10 h-10 rounded-xl object-cover shadow"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-white truncate">{trackToAdd.title}</h4>
              <p className="text-[11px] text-neutral-400 truncate">{trackToAdd.artist}</p>
            </div>
          </div>
        )}

        {/* 既有清單選擇列表 (若有歌曲待加入) */}
        {trackToAdd && !isCreatingNew && (
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                選擇現有清單 ({playlists.length})
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="text-xs text-[#fa2d48] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>+ 新建清單</span>
              </button>
            </div>

            {playlists.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                目前尚無清單，請點擊下方新建專屬歌單！
              </div>
            ) : (
              playlists.map((pl) => {
                const hasSong = pl.tracks.some((t) => t.id === trackToAdd.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => handleSelectPlaylist(pl.id)}
                    disabled={hasSong}
                    className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] disabled:opacity-50 border border-white/[0.06] text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white text-xs truncate">{pl.name}</div>
                      <div className="text-[10px] text-neutral-400">{pl.tracks.length} 首曲目</div>
                    </div>
                    {hasSong ? (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> 已在清單
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400 hover:text-white">點擊加入</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* 新增播放清單表單 */}
        {(isCreatingNew || !trackToAdd) && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">歌單名稱 *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例如：深夜放鬆、工作專注、開車歌單..."
                autoFocus
                className="w-full px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.16] text-white text-xs placeholder-neutral-500 rounded-2xl border border-white/10 focus:border-[#fa2d48]/50 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">歌單簡介 (選填)</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="隨心情紀錄..."
                className="w-full px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.16] text-white text-xs placeholder-neutral-500 rounded-2xl border border-white/10 focus:border-[#fa2d48]/50 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {trackToAdd && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 rounded-full text-neutral-400 hover:text-white text-xs cursor-pointer"
                >
                  返回清單
                </button>
              )}
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-5 py-2.5 rounded-full bg-[#fa2d48] hover:bg-[#e0233d] active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-lg shadow-[#fa2d48]/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>立即建立</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
