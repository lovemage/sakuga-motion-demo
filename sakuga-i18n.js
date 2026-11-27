/* 點擊動畫展示頁的多語系：繁體中文（原文）、English、日本語、한국어
 * 語言由網址 ?lang=en|ja|ko 決定，沒有參數就是繁體中文。
 * 頁面以繁體中文撰寫；這支腳本在其他腳本初始化之前，把文字、無障礙標籤、音效字換成目標語言。
 * 必須排在 sakuga-sfx-paths*.js 之後、sakuga-motion.js 之前載入（defer）。
 */
(() => {
    'use strict';
    const LANGS = ['zh', 'en', 'ja', 'ko'];
    const q = new URLSearchParams(location.search).get('lang');
    const lang = LANGS.includes(q) ? q : 'zh';
    const HTML_LANG = { zh: 'zh-Hant-TW', en: 'en', ja: 'ja', ko: 'ko' };
    const PICKER = { zh: '繁中', en: 'English', ja: '日本語', ko: '한국어' };

    // 卡片標題（只套用在 .card h2，因為「通知」「評分」等字在別處另有意思）
    const TITLES = {
        '主要按鈕': ['Primary button', 'メインボタン', '기본 버튼'],
        '行動按鈕': ['Call-to-action button', 'CTA ボタン', 'CTA 버튼'],
        '次要按鈕': ['Secondary button', 'サブボタン', '보조 버튼'],
        '送出完成': ['Submit', '送信完了', '전송 완료'],
        '核取方塊': ['Checkbox', 'チェックボックス', '체크박스'],
        '單選': ['Radio', 'ラジオボタン', '라디오 버튼'],
        '評分': ['Rating', '評価', '별점'],
        '開關': ['Switch', 'スイッチ', '스위치'],
        '滑桿': ['Slider', 'スライダー', '슬라이더'],
        '輸入框': ['Text input', '入力欄', '입력창'],
        '分頁': ['Tabs', 'タブ', '탭'],
        '進度條': ['Progress bar', 'プログレスバー', '진행 표시줄'],
        '通知': ['Toast', 'トースト通知', '토스트 알림'],
        '提示': ['Tooltip', 'ツールチップ', '툴팁'],
        '選單': ['Menu', 'メニュー', '메뉴'],
        '下拉選單': ['Dropdown', 'ドロップダウン', '드롭다운'],
        '語言切換': ['Language switch', '言語切替', '언어 전환'],
        '日夜切換': ['Day/night toggle', '昼夜切替', '주야 전환'],
        '分類標籤': ['Filter tags', 'カテゴリタグ', '카테고리 태그'],
        '選文章': ['Article card', '記事カード', '글 카드'],
        '返回上一頁': ['Back button', '戻るボタン', '뒤로 가기'],
        '文章 Dock': ['Article dock', '記事 Dock', '글 Dock'],
        '音效字': ['Sound-effect lettering', '擬音（オノマトペ）文字', '의성어 글자'],
    };

    // 其他文字與無障礙標籤：原文 → [en, ja, ko]
    const TEXT = {
        '點擊動畫展示 | OceanAds': ['Click Animation Demo | OceanAds', 'クリックアニメーション デモ | OceanAds', '클릭 애니메이션 데모 | OceanAds'],
        '點擊動畫展示': ['Click Animation Demo', 'クリックアニメーション デモ', '클릭 애니메이션 데모'],
        '免費看網站草稿': ['See a free site draft', '無料でサイト案を見る', '무료 사이트 시안 보기'],
        '開始免費諮詢 →': ['Start a free consultation →', '無料相談を始める →', '무료 상담 시작 →'],
        '查看作品案例': ['View our work', '制作実績を見る', '포트폴리오 보기'],
        '送出表單': ['Submit form', 'フォームを送信', '양식 전송'],
        '已送出': ['Sent', '送信済み', '전송됨'],
        '記住我': ['Remember me', 'ログイン状態を保持', '로그인 유지'],
        '方案': ['Plan', 'プラン', '요금제'],
        '基本方案': ['Basic', 'ベーシック', '베이직'],
        '進階方案': ['Pro', 'プロ', '프로'],
        '買斷方案': ['Lifetime', '買い切り', '평생 이용'],
        '評分': ['Rating', '評価', '별점'],
        '通知': ['Notifications', '通知', '알림'],
        '音量': ['Volume', '音量', '볼륨'],
        '帳戶': ['Account', 'アカウント', '계정'],
        '總覽': ['Overview', '概要', '개요'],
        '個人資料': ['Profile', 'プロフィール', '프로필'],
        '設定': ['Settings', '設定', '설정'],
        '上傳中': ['Uploading', 'アップロード中', '업로드 중'],
        '開始上傳': ['Start upload', 'アップロード開始', '업로드 시작'],
        '重新上傳': ['Upload again', 'もう一度アップロード', '다시 업로드'],
        '儲存設定': ['Save settings', '設定を保存', '설정 저장'],
        '已儲存！': ['Saved!', '保存しました！', '저장했어요!'],
        '關閉通知': ['Close notification', '通知を閉じる', '알림 닫기'],
        '為什麼需要 Email': ['Why do you need my email?', 'メールアドレスが必要な理由', '이메일이 필요한 이유'],
        '我們只用 Email 寄送報價與收據。': ['We only use your email to send quotes and receipts.', 'メールアドレスは見積書と領収書の送付にのみ使用します。', '이메일은 견적서와 영수증 발송에만 사용합니다.'],
        '開啟導覽選單': ['Open navigation menu', 'ナビゲーションメニューを開く', '내비게이션 메뉴 열기'],
        '關閉導覽選單': ['Close navigation menu', 'ナビゲーションメニューを閉じる', '내비게이션 메뉴 닫기'],
        '網站導覽': ['Site navigation', 'サイトナビゲーション', '사이트 내비게이션'],
        '服務項目': ['Services', 'サービス', '서비스'],
        '網站與電商': ['Web & e-commerce', 'Web・EC サイト', '웹 & 이커머스'],
        'Google 排名': ['Google ranking', 'Google 検索順位', '구글 검색 순위'],
        'AI 自動化': ['AI automation', 'AI 自動化', 'AI 자동화'],
        'Telegram 機器人': ['Telegram bots', 'Telegram ボット', '텔레그램 봇'],
        '影片拍攝剪輯': ['Video production', '動画撮影・編集', '영상 촬영·편집'],
        'AI 搜尋曝光': ['AI search visibility', 'AI 検索での露出', 'AI 검색 노출'],
        '作品案例': ['Portfolio', '制作実績', '포트폴리오'],
        '免費諮詢': ['Free consultation', '無料相談', '무료 상담'],
        '首頁': ['Home', 'ホーム', '홈'],
        '切換為夜間模式': ['Switch to night mode', 'ナイトモードに切り替え', '야간 모드로 전환'],
        '切換為日間模式': ['Switch to day mode', 'デイモードに切り替え', '주간 모드로 전환'],
        '文章分類': ['Article categories', '記事カテゴリ', '글 카테고리'],
        '全部': ['All', 'すべて', '전체'],
        'AI 與科技': ['AI & tech', 'AI・テクノロジー', 'AI·테크'],
        '數位行銷': ['Digital marketing', 'デジタルマーケティング', '디지털 마케팅'],
        '創業策略': ['Startup strategy', '起業戦略', '창업 전략'],
        'Claude Code 做的資料都是字？一段提示詞改掉 AI 的 4 個壞習慣': [
            'Is everything Claude Code makes just text? One prompt that fixes 4 bad AI habits',
            'Claude Code の資料が文字ばかり？AI の 4 つの悪い癖を直すプロンプト',
            'Claude Code 결과물이 글자뿐이라면? AI의 나쁜 습관 4가지를 고치는 프롬프트'],
        '返回': ['Back', '戻る', '뒤로'],
        '返回文章列表': ['Back to articles', '記事一覧に戻る', '글 목록으로'],
        '快速導覽': ['Quick navigation', 'クイックナビ', '빠른 탐색'],
        '全部文章': ['All articles', 'すべての記事', '전체 글'],
        '分享': ['Share', '共有', '공유'],
        '回到頁首': ['Back to top', 'ページトップへ', '맨 위로'],
        // 頁面腳本用到的字
        '提示詞': ['Prompt', 'プロンプト', '프롬프트'],
        '複製提示詞': ['Copy prompt', 'プロンプトをコピー', '프롬프트 복사'],
        '已複製': ['Copied', 'コピーしました', '복사됨'],
        '複製失敗': ['Copy failed', 'コピー失敗', '복사 실패'],
        '已複製「{0}」提示詞': ['Copied the “{0}” prompt', '「{0}」のプロンプトをコピーしました', '“{0}” 프롬프트를 복사했어요'],
        '複製失敗，請展開後手動選取': ['Copy failed. Open the prompt and select it by hand.', 'コピーできませんでした。展開して手動で選択してください。', '복사하지 못했어요. 펼친 뒤 직접 선택해 주세요.'],
        '給 Agent 的總提示詞': ['Master prompt for agents', 'エージェント向け全体プロンプト', '에이전트용 전체 프롬프트'],
        '播放 {0}': ['Play {0}', '{0} を再生', '{0} 재생'],
        '{0} 播放速度': ['{0} playback speed', '{0} の再生速度', '{0} 재생 속도'],
        '語言': ['Language', '言語', '언어'],
    };
    const STARS = [(n) => `${n} star${n > 1 ? 's' : ''}`, (n) => `星 ${n} つ`, (n) => `별 ${n}개`];

    // 音效字的唸法（按鈕的無障礙標籤用）；字形在 sakuga-sfx-paths.js / sakuga-sfx-paths.intl.js
    const SFX_NAMES = {
        zh: { dong: '咚！', peng: '砰！', shua: '唰！', ding: '叮！', pa: '啪！', xiu: '咻～', hong: '轟轟轟', ka: '喀！', bo: '啵！', cha: '嚓！', lulu: '咻嚕嚕' },
        en: { dong: 'THUD!', peng: 'BANG!', shua: 'SWISH!', ding: 'DING!', pa: 'WHAP!', xiu: 'ZIP!', hong: 'RUMBLE', ka: 'CLICK!', bo: 'POP!', cha: 'SNAP!', lulu: 'WHIRR!' },
        ja: { dong: 'ドン！', peng: 'バン！', shua: 'シュッ', ding: 'チーン', pa: 'パシッ', xiu: 'ヒュッ', hong: 'ゴゴゴ', ka: 'カチッ', bo: 'ポン！', cha: 'パチッ', lulu: 'クルクル' },
        ko: { dong: '쿵!', peng: '쾅!', shua: '슉!', ding: '띵!', pa: '탁!', xiu: '휙~', hong: '우르릉', ka: '딸깍!', bo: '뽕!', cha: '착!', lulu: '빙글~' },
    };

    // 語言切換示範按鈕：左邊顯示本頁語言，右邊是 EN（英文頁顯示 中 / EN）
    const TOGGLE = {
        zh: ['中', '繁體中文', '目前繁體中文，切換為 English', '目前 English，切換為繁體中文'],
        en: ['中', 'Traditional Chinese', 'Current: Traditional Chinese. Switch to English', 'Current: English. Switch to Traditional Chinese'],
        ja: ['日', '日本語', '現在：日本語。English に切り替え', '現在：English。日本語に切り替え'],
        ko: ['한', '한국어', '현재 한국어. English로 전환', '현재 English. 한국어로 전환'],
    };

    const i = LANGS.indexOf(lang) - 1;   // TEXT / TITLES 陣列裡的位置；繁中為 -1
    const fill = (s, args) => s.replace(/\{(\d)\}/g, (_, n) => args[n]);
    /** t('播放 {0}', '咚！')：取目前語言的字串；找不到就用原文 */
    function t(src, ...args) {
        const row = TEXT[src];
        return fill(i >= 0 && row ? row[i] : src, args);
    }
    const title = (src) => (i >= 0 && TITLES[src] ? TITLES[src][i] : src);

    function apply() {
        const root = document.documentElement;
        root.lang = HTML_LANG[lang];
        root.dataset.lang = lang;

        // 每張卡片記住原文標題（提示詞以它為鍵），再換成目標語言
        document.querySelectorAll('.card > header h2').forEach((h) => {
            const key = h.textContent.trim();
            h.closest('.card').dataset.key = key;
            if (i >= 0) h.textContent = title(key);
        });

        // 語言切換示範按鈕
        const tg = document.querySelector('[data-sk-lang]');
        if (tg) {
            const [label, , ariaA, ariaB] = TOGGLE[lang];
            const first = tg.querySelector('.sk-lang-opt');
            if (first) { first.textContent = label; first.lang = HTML_LANG[lang === 'en' ? 'zh' : lang]; }
            tg.dataset.labelZh = ariaA; tg.dataset.labelEn = ariaB;
        }
        const dn = document.querySelector('[data-sk-daynight]');
        if (dn) { dn.dataset.labelDay = t('切換為夜間模式'); dn.dataset.labelNight = t('切換為日間模式'); }

        // 頁首語言選單
        const nav = document.querySelector('[data-lang-picker]');
        if (nav) {
            nav.setAttribute('aria-label', t('語言'));
            nav.innerHTML = LANGS.map((l) => `<a href="${l === 'zh' ? location.pathname : `?lang=${l}`}" lang="${HTML_LANG[l]}" hreflang="${HTML_LANG[l]}"${l === lang ? ' aria-current="page"' : ''}>${PICKER[l]}</a>`).join('');
        }

        // 音效字換成本頁語言的字形
        if (lang !== 'zh' && window.OA_SFX_SETS && window.OA_SFX_SETS[lang]) window.OA_SFX = window.OA_SFX_SETS[lang];

        if (i < 0) return;
        document.title = t(document.title);

        // 文字節點
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (n.parentElement.closest('script, style, .card > header h2, [data-lang-picker]')) continue;
            const s = n.nodeValue.trim();
            if (s && TEXT[s]) n.nodeValue = n.nodeValue.replace(s, TEXT[s][i]);
        }
        // 屬性
        for (const attr of ['aria-label', 'title', 'data-done-label']) {
            document.querySelectorAll(`[${attr}]`).forEach((el) => {
                const v = el.getAttribute(attr);
                const star = /^(\d) 顆星$/.exec(v);
                if (star) el.setAttribute(attr, STARS[i](Number(star[1])));
                else if (TEXT[v]) el.setAttribute(attr, TEXT[v][i]);
            });
        }
        // 全螢幕選單：英文頁不需要再列一次英文副標
        if (lang === 'en') document.querySelectorAll('dialog.mobile-nav li a .en').forEach((el) => el.remove());
    }

    /** 某張卡片的提示詞（key 為原文卡片標題） */
    function prompt(key) {
        const set = (window.SK_PROMPTS_I18N || {})[lang];
        return (set && set[key]) || (window.SK_PROMPTS || {})[key];
    }

    window.SK_I18N = {
        lang, t, title, prompt,
        sfxName: (id) => SFX_NAMES[lang][id] || id,
        toggleName: () => TOGGLE[lang][1],
    };
    apply();
    document.documentElement.classList.remove('i18n-wait');   // 翻譯完才顯示頁面，避免先閃一下中文
})();
