# 🎵 OmniStream Player - 跨平台智慧搜尋播放器

> **零安裝、搜尋即動播、PWA 跨平台多媒體串流網頁應用程式**

依據 [PRD.md](file:///c:/Users/feynman/Desktop/Player/PRD.md) 規格打造，支援任何現代桌面與行動端瀏覽器。

---

## 🌟 核心特色 (Key Features)

- ⚡ **搜尋即自動播放 (Search-to-Stream)**：輸入歌曲、歌手名或點擊預設電台，搜尋完成後自動建構動態佇列並**立即由第一首開始播放**。
- 📱 **真正跨平台 (PWA & Responsive)**：
  - 支援桌機、平板、iOS Safari、Android Chrome。
  - 支援「**新增至主畫面**」安裝為獨立全螢幕 App 模式。
- 🎧 **系統 MediaSession API 整合**：
  - 支援鎖定畫面展示高解析度專輯封面與曲目資料。
  - 支援通知列切換、鍵盤多媒體實體按鍵與耳機線控。
- 🎶 **全功能動態佇列**：
  - 順序播放、單曲循環、列表循環與隨機播放模式。
  - 側邊抽屜佇列管理（檢視、切換、移除、清空）。
- 🎨 **現代沉浸式介面 (Glassmorphism)**：
  - 桌面底部控制列與行動端 Mini-Player。
  - 點擊封面即可展開極致視覺感的全螢幕沉浸播放器，搭配動態毛玻璃取色背景。
- 💾 **免登入本機儲存 (IndexedDB / LocalStorage)**：
  - 自動保存搜尋歷史、個人喜愛收藏清單、上次音量偏好。
- ⌨️ **全域多媒體快捷鍵**：
  - `Space`：播放 / 暫停
  - `←` / `→`：快轉 / 倒退 5 秒
  - `↑` / `↓`：音量微調

---

## 🚀 快速啟動 (Quick Start)

### 啟動開發伺服器
```bash
npm run dev
```
瀏覽器訪問：`http://localhost:3000`

### 編譯生產環境檔案
```bash
npm run build
```

### 預覽生產版本
```bash
npm run preview
```

---

## 🛠️ 技術棧 (Tech Stack)

- **前端框架**：React 19 + TypeScript + Vite 6
- **樣式與設計**：Tailwind CSS v4 + Lucide Icons
- **狀態管理**：Zustand
- **音訊驅動**：HTML5 Audio + Web MediaSession API
- **多來源串流**：iTunes Search API + 高音質公開串流 + 自訂 URL 直連
