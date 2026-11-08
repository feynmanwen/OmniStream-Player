import React, { useState } from 'react';
import { X, Lock, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { PREDEFINED_USERS } from '../services/authService';

export const AuthModal: React.FC = () => {
  const {
    currentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    login,
  } = usePlayerStore();

  const [selectedUser, setSelectedUser] = useState<string>(currentUser?.username || 'Feynman');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isAuthModalOpen) return null;

  const handleQuickSelect = (username: string) => {
    setSelectedUser(username);
    setPin('');
    setErrorMsg('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('請輸入通行密碼');
      return;
    }

    const success = login(selectedUser, pin.trim());
    if (success) {
      setErrorMsg('');
      setPin('');
    } else {
      setErrorMsg('密碼不正確，請重新輸入');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl apple-sheet p-6 sm:p-7 shadow-2xl flex flex-col gap-5 border border-white/10">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#fa2d48] to-rose-600 flex items-center justify-center text-white shadow-lg shadow-[#fa2d48]/25">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-[16px] tracking-tight">切換使用者</h3>
              <p className="text-[11px] text-neutral-400">登入後將自動記住，下回免重複輸入</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 位使用者頭像快捷選擇 */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2.5">
            選擇帳號
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {PREDEFINED_USERS.map((user) => {
              const isSelected = selectedUser.toLowerCase() === user.username.toLowerCase();
              return (
                <button
                  key={user.username}
                  type="button"
                  onClick={() => handleQuickSelect(user.username)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-white/15 border-[#fa2d48]/50 shadow-md ring-1 ring-[#fa2d48]/40'
                      : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-neutral-300'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {user.username.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-xs truncate flex items-center gap-1">
                      <span>{user.displayName}</span>
                      {currentUser?.username.toLowerCase() === user.username.toLowerCase() && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="目前使用中" />
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">@{user.username.toLowerCase()}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#fa2d48] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 密碼輸入表單 */}
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5 pt-1">
          <div>
            <label className="text-xs font-medium text-neutral-200 flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <span>輸入 {selectedUser} 的通行密碼</span>
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErrorMsg('');
              }}
              placeholder={`請輸入 4 位數密碼`}
              autoFocus
              className="w-full px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.16] text-white text-sm tracking-widest placeholder-neutral-500 rounded-2xl border border-white/10 focus:border-[#fa2d48]/50 outline-none transition-all font-mono"
            />
            {errorMsg && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 animate-in fade-in duration-150">
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-neutral-400 flex items-center gap-1">
              <span>目前身份：</span>
              <span className="font-semibold text-white">{currentUser?.displayName}</span>
            </div>

            <button
              type="submit"
              disabled={!pin.trim()}
              className="px-5 py-2.5 rounded-full bg-[#fa2d48] hover:bg-[#e0233d] active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-lg shadow-[#fa2d48]/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>登入並載入設定</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
