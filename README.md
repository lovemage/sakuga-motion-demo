# Sakuga Motion Demo · 點擊動畫展示

**繁體中文** | [English](README.en.md)

OceanAds 的點擊回饋動畫展示頁：按鈕被點時會像手繪動畫（作畫／sakuga）一樣壓扁、回彈，再加上 Canvas 畫出的煙霧、爆炸、速度線等特效，以及中文音效字。

**線上展示：https://lovemage.github.io/sakuga-motion-demo/**

全部用原生 JavaScript 和 CSS 寫成，不依賴任何動畫函式庫，也不需要建置步驟。

---

## 展示內容

頁面上每張卡片都是一個元件，可以直接點點看：

| 類別 | 元件 |
| --- | --- |
| 按鈕 | 主要按鈕（迴旋）、行動按鈕（衝擊＋硬邊陰影）、次要按鈕、送出表單（長翅膀的信飛出去） |
| 表單 | 核取方塊、單選、評分（星星）、開關、滑桿、輸入框 |
| 回饋 | 分頁、進度條、通知（toast）、提示（tooltip） |
| 導覽 | 漢堡選單（全螢幕雙層面板）、下拉選單、語言切換、日夜切換、分類標籤、返回上一頁 |
| 內容 | 選文章卡片、文章 Dock（分享／回到頁首） |
| 音效字 | 中文向量音效字一覽 |

每張卡片右上角有一支**速度拉桿（0.1×–1×）**，調慢就能看清楚每一格動作。每張卡片也附了**「提示詞」**按鈕，可以一鍵複製給 AI agent（例如 Claude Code）的設計說明，讓它在你自己的網站上做出同樣的效果。

## 動畫原理

- **彈簧**：`Spring(x, k, d)` 以 8ms 子步長計算 `F = -k(x - to) - d·v`。阻尼故意偏小，讓動作衝過頭再回彈；要「被打一下」就直接加速度。
- **只動 `scale` / `rotate`**：彈簧驅動 CSS 的獨立屬性，不覆蓋元素原本的 `transform`。壓扁時維持體積：`sx = 1 + (1 - sy) × 0.55`。
- **單一時脈**：整頁只有一個 `requestAnimationFrame` 迴圈，`dt` 上限 34ms，沒有東西在動就自動停止。支援 `timeScale` 慢動作。
- **一張特效畫布**：`position: fixed`、`pointer-events: none` 的 canvas，依 `devicePixelRatio`（上限 2）繪製。有 modal `<dialog>` 開著時會移進 dialog，避免被 top layer 蓋住。
- **特效**：賽璐璐雙色煙霧、尖刺爆炸、速度線、月牙斬擊、四角閃光、煙圈、水晶碎片、水花、彩色碎紙、迴旋弧線、打勾等。特效靠「縮小、變細」消失，不靠淡出。
- **配色**：一律讀取 `--ex-*` CSS 變數，深色／亮色模式自動切換。

## 無障礙

- 所有控制項都是原生的 `<button>`、`<a>`、`<input>`，鍵盤和螢幕閱讀器照常可用。
- 系統開啟「減少動態效果」（`prefers-reduced-motion: reduce`）時，狀態照常切換，但不播彈簧位移與特效。
- 連結會等特效播完才跳頁；跳頁前會在元素上派發可取消的 `sakuga:navigate` 事件。

## 在自己的網站使用

把需要的檔案複製到你的專案，依序載入：

```html
<link rel="stylesheet" href="sakuga-motion.css">
<link rel="stylesheet" href="sakuga-controls.css">   <!-- 下拉選單、語言、日夜切換 -->
<link rel="stylesheet" href="sakuga-widgets.css">    <!-- 表單與回饋元件 -->
<link rel="stylesheet" href="navigation-motion.css"> <!-- 全螢幕選單，需要 body.expo-theme -->

<script src="sakuga-sfx-paths.js" defer></script>
<script src="sakuga-motion.js" data-auto defer></script>
<script src="sakuga-controls.js" defer></script>
<script src="sakuga-widgets.js" defer></script>
```

`sakuga-motion.js` 是核心，其他腳本都依賴它，必須排在它後面。

### 指定按鈕動效：`data-sakuga`

```html
<button data-sakuga="spin">迴旋</button>
<button data-sakuga="send" data-done-label="已送出">送出表單</button>
<a href="/blog" data-sakuga="card">文章卡片</a>
<button data-sakuga="off">不要動畫</button>
```

可用的值：`send` `spin` `impact` `spark` `menu` `close` `toggle` `tag` `card` `back` `dock` `menuitem` `off`

### 自動套用：`data-auto`

`<script>` 加上 `data-auto` 後，會依常見的 class 自動套用，不用逐一標記：

| 選擇器 | 動效 |
| --- | --- |
| `.btn-primary` | `spin` |
| `.cta-btn`、`.nav-cta` | `impact` |
| `.btn-outline`、`.btn-outline-light`、`.read-more-btn`、`.view-btn`、`.pf-btn`、`.demo-btn` | `spark` |
| `.filter-btn` | `tag` |
| `.article-card-link` | `card` |
| `.dock-item` | `dock` |
| `#mobile-menu-btn`、`.mobile-menu` | `menu` |
| `.oa-menu-close` | `close` |
| `dialog.mobile-nav li a` | `menuitem` |
| `.theme-toggle`、`[data-oa-theme]` | `toggle` |

元素同時符合兩者時，以比較內層的那個為準；`data-sakuga="off"` 可關掉單一元素的動效。

### 表單與回饋元件：`data-skw`

在根元素標上 `data-skw`：

`check` `radio` `rating` `switch` `slider` `input` `tabs` `progress` `toast` `tip` `done`

### 控制項

```html
<div class="sk-dd" data-sk-dropdown>
  <button class="sk-dd-trigger">服務項目</button>
  <div class="sk-dd-panel" hidden>…</div>
</div>
<button class="sk-lang" data-sk-lang data-current="zh">…兩個 .sk-lang-opt…</button>
<button class="sk-daynight" data-sk-daynight>…</button>
```

### JavaScript API

```js
const K = window.OASakuga;

K.set({ timeScale: 0.25 });   // 慢動作
K.set({ reduce: true });      // 強制關閉動態效果；null 則跟隨系統設定
K.state;                      // { timeScale, reduce, auto, reduced }

K.fx;                         // 特效函式：puff、burst、slash、kira、confetti、shards、splash、check、mail…
const stop = K.drive((dt) => { /* 每格執行，回傳 false 即移除 */ });
```

另外還有 `window.OASakugaControls`（`dropdown`、`lang`、`daynight`）和 `window.OASakugaWidgets`（`init`、`bump`）。

## 檔案說明

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 展示頁 |
| `sakuga-motion.js` / `.css` | 核心：彈簧、共用時脈、特效畫布、按鈕預設動效 |
| `sakuga-widgets.js` / `.css` | 核取方塊、單選、評分、開關、滑桿、輸入框、分頁、進度條、通知、提示、完成打勾 |
| `sakuga-controls.js` / `.css` | 下拉選單、語言切換、日夜切換 |
| `navigation-motion.css` | 全螢幕雙層導覽選單 |
| `sakuga-sfx-paths.js` | 中文音效字的 SVG 路徑（自動產生，請勿手動修改） |
| `sakuga-prompts.js` | 每張卡片的「給 agent 的提示詞」 |
| `fonts/` | Leon Sans 字型 |
| `images/sfx/` | 音效字 SVG |

## 本機預覽

不需要安裝任何東西，在專案資料夾開一個靜態伺服器即可：

```bash
npx serve .
# 或
python -m http.server 8000
```

修改 CSS / JS 後，記得更新 `index.html` 裡的 `?v=` 版本參數，避免瀏覽器讀到快取的舊檔。

## 致謝與授權

- 動畫手法參考 [sakuga-vfx](https://github.com/finktheartist/sakuga-vfx)（MIT）
- 音效字字形來自 Noto Sans CJK TC Black（SIL OFL 1.1）
- Leon Sans 字型授權見 `fonts/OFL-LeonSans.txt`

---

由 [OceanAds 海水不可斗量數位工作室](https://oceanads.org/) 製作。
