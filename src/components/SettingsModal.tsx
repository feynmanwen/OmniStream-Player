import React, { useState } from 'react';
import { X, Key, ExternalLink, Check, AlertCircle, Trash2 } from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { usePlayerStore, ENV_YOUTUBE_API_KEY } from '../store/usePlayerStore';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    userYoutubeApiKey,
    setUserYoutubeApiKey,
    showToast,
  } = usePlayerStore();

  const [inputKey, setInputKey] = useState(userYoutubeApiKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isSettingsOpen) return null;

  const currentActiveKey = ENV_YOUTUBE_API_KEY || userYoutubeApiKey;

  const handleSave = () => {
    setUserYoutubeApiKey(inputKey.trim());
    showToast('YouTube API 金鑰已儲存');
    setTestResult(null);
  };

  const handleClear = () => {
    setInputKey('');
    setUserYoutubeApiKey('');
    setTestResult(null);
    showToast('已清除個人 YouTube API 金鑰');
  };

  const handleTestKey = async () => {
    const keyToTest = inputKey.trim() || ENV_YOUTUBE_API_KEY;
    if (!keyToTest) {
      setTestResult({ success: false, message: '請先輸入金鑰' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=test&maxResults=1&key=${encodeURIComponent(
          keyToTest
        )}`
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setTestResult({ success: true, message: '金鑰連線成功！配額正常。' });
      } else {
        const errMsg = json?.error?.message || `HTTP ${res.status}`;
        setTestResult({ success: false, message: `金鑰驗證失敗: ${errMsg}` });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: `連線失敗: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl apple-sheet p-6 sm:p-7 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-[15px] tracking-tight">偏好設定</h3>
              <p className="text-[11px] text-neutral-400">管理多媒體串流與 API 金鑰</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* YouTube API 設定區 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <YoutubeIcon className="w-4 h-4 text-[#fa2d48]" />
              YouTube Data API v3 金鑰
            </label>
            {currentActiveKey && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center gap-1 border border-emerald-500/30">
                <Check className="w-3 h-3" /> 已生效
              </span>
            )}
          </div>

          {ENV_YOUTUBE_API_KEY ? (
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-300">
              <p className="font-medium text-emerald-400 mb-1">系統內建 YouTube API 金鑰已生效啟用</p>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                目前所有搜尋皆會自動查詢 YouTube 官方音樂。您亦可於下方填入自訂金鑰覆寫。
              </p>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">
              填入免費金鑰即可在搜尋時取得 YouTube 官方音樂影片與完整歌曲（支援中文主流歌手）。
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder={ENV_YOUTUBE_API_KEY ? '（使用內建金鑰中）' : '貼上 AIzaSy... 金鑰'}
              className="flex-1 px-3.5 py-2.5 bg-white/[0.06] border border-white/[0.1] focus:border-white/30 rounded-2xl text-xs text-white placeholder-neutral-500 outline-none font-mono"
            />
            {userYoutubeApiKey && (
              <button
                onClick={handleClear}
                className="p-2.5 rounded-2xl apple-pill text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="清除個人金鑰"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!inputKey.trim()}
              className="px-4 py-2.5 rounded-2xl bg-[#fa2d48] hover:bg-[#e0233d] active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              儲存
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleTestKey}
              disabled={testing || (!inputKey.trim() && !ENV_YOUTUBE_API_KEY)}
              className="text-xs text-neutral-400 hover:text-white underline disabled:opacity-40 cursor-pointer"
            >
              {testing ? '正在測試連線...' : '測試金鑰連線狀態'}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* 申請教學說明 */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-neutral-300 flex flex-col gap-2">
          <h4 className="font-medium text-neutral-200 flex items-center justify-between text-[12px]">
            <span>如何申請個人 YouTube API 金鑰？</span>
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noreferrer"
              className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
            >
              Google Cloud Console <ExternalLink className="w-3 h-3" />
            </a>
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-neutral-400 text-[11px] leading-relaxed">
            <li>登入 Google Cloud Console 並建立專案。</li>
            <li>至「API 和服務」&gt;「程式庫」，搜尋並啟用 <strong>YouTube Data API v3</strong>。</li>
            <li>至「憑證」點選「建立憑證」&gt;「API 金鑰」。</li>
            <li>建議將「應用程式限制」設定為 <code>http://localhost:3000/*</code>。</li>
          </ol>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-5 py-2 rounded-full apple-pill text-neutral-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
