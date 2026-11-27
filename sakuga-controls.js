/* OceanAds Sakuga Controls — 下拉選單、語言切換、日夜切換
 * 依賴 sakuga-motion.js（共用 Spring 與時脈）。所有元件都是真正的 <button>，鍵盤可操作；
 * 減少動態效果時直接切到結果狀態，不做位移。
 *
 *   <div class="sk-dd" data-sk-dropdown> <button class="sk-dd-trigger">…</button> <div class="sk-dd-panel" hidden>…</div> </div>
 *   <button class="sk-lang" data-sk-lang data-current="zh"> …兩個 .sk-lang-opt… </button>
 *   <button class="sk-daynight" data-sk-daynight> … </button>
 */
(() => {
    'use strict';
    const K = window.OASakuga;
    if (!K || window.OASakugaControls) return;
    const { Spring } = K;
    const reduced = () => K.reduced();

    // ───────── 下拉選單：面板帶 overshoot 地落下，項目依序彈入；收起時不晃、快速 ─────────
    function dropdown(root) {
        const trigger = root.querySelector('.sk-dd-trigger');
        const panel = root.querySelector('.sk-dd-panel');
        const chev = root.querySelector('.sk-dd-chev');
        const items = [...panel.querySelectorAll('a, button')];
        const drop = new Spring(0, 380, 13);     // 0 收起 → 1 展開（欠阻尼：落下後回彈）
        const turn = new Spring(0, 420, 16);     // 箭頭角度
        const rows = items.map(() => new Spring(0, 420, 14));
        let open = false, stop = null, closing = null;

        trigger.setAttribute('aria-expanded', 'false');
        const paint = (dt) => {
            const p = drop.step(dt), a = turn.step(dt);
            panel.style.opacity = String(Math.min(1, Math.max(0, p * 2.2)));
            panel.style.transform = `translateY(${(1 - p) * -14}px) scaleY(${0.55 + 0.45 * p})`;
            if (chev) chev.style.rotate = `${a * 180}deg`;
            rows.forEach((s, i) => {
                const q = s.step(dt);
                items[i].style.transform = `translateY(${(1 - q) * 12}px)`;
                items[i].style.opacity = String(Math.min(1, Math.max(0, q * 1.6)));
            });
            const still = drop.settled && turn.settled && rows.every((s) => s.settled);
            if (still) {
                if (!open) { panel.hidden = true; clean(); }
                stop = null;
                return false;
            }
        };
        const clean = () => {
            panel.style.opacity = panel.style.transform = '';
            items.forEach((it) => { it.style.transform = it.style.opacity = ''; });
        };
        const run = () => { if (!stop) stop = K.drive(paint); };

        function show() {
            if (open) return;
            open = true;
            clearTimeout(closing);
            panel.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            if (reduced()) { if (chev) chev.style.rotate = '180deg'; return; }
            drop.k = 380; drop.d = 13; drop.to = 1;
            turn.to = 1; turn.v += 4;
            rows.forEach((s, i) => { s.x = Math.min(s.x, 0); s.to = 0; K.later(0.04 + i * 0.035, () => { s.to = 1; run(); }); });
            run();
        }
        function hide(focusBack) {
            if (!open) return;
            open = false;
            trigger.setAttribute('aria-expanded', 'false');
            if (focusBack) trigger.focus();
            if (reduced()) { panel.hidden = true; clean(); if (chev) chev.style.rotate = ''; return; }
            drop.k = 600; drop.d = 2 * Math.sqrt(600);   // 臨界阻尼：收起不回彈
            drop.to = 0; turn.to = 0;
            rows.forEach((s) => { s.to = 0; });
            run();
        }
        trigger.addEventListener('click', () => (open ? hide() : show()));
        root.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && open) { e.preventDefault(); hide(true); }
            if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open) {
                e.preventDefault();
                const i = items.indexOf(document.activeElement);
                const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
                items[i < 0 ? 0 : n].focus();
            }
            if (e.key === 'ArrowDown' && !open && e.target === trigger) { e.preventDefault(); show(); items[0] && items[0].focus(); }
        });
        document.addEventListener('pointerdown', (e) => { if (open && !root.contains(e.target)) hide(); });
        root.addEventListener('focusout', (e) => { if (open && e.relatedTarget && !root.contains(e.relatedTarget)) hide(); });
        items.forEach((it) => it.addEventListener('click', () => hide()));
        return { show, hide };
    }

    // ───────── 語言切換：兩段文字沿圓弧交換位置 → 停一下 → 回到原位，選取色塊同時移到新語言 ─────────
    function lang(btn) {
        const opts = [...btn.querySelectorAll('.sk-lang-opt')];
        const ind = btn.querySelector('.sk-lang-ind');
        if (opts.length !== 2) return;
        const swap = new Spring(0, 300, 15);   // 0 原位 → 1 互換
        const slide = new Spring(0, 360, 17);  // 色塊位置 0 左 / 1 右
        let cur = btn.dataset.current === 'en' ? 1 : 0, stop = null, busy = false;
        slide.x = slide.to = cur;

        const geo = () => {
            const a = opts[0].offsetLeft + opts[0].offsetWidth / 2, b = opts[1].offsetLeft + opts[1].offsetWidth / 2;
            return b - a;
        };
        const place = () => {
            const w = opts[cur].offsetWidth, x = opts[cur].offsetLeft;
            ind.style.width = `${w}px`;
            ind.style.translate = `${x}px 0`;
        };
        const sync = () => {
            opts.forEach((o, i) => o.classList.toggle('is-active', i === cur));
            btn.dataset.current = cur ? 'en' : 'zh';
            // 無障礙標籤可用 data-label-zh / data-label-en 覆寫（多語系頁面）
            btn.setAttribute('aria-label', cur ? (btn.dataset.labelEn || '目前 English，切換為繁體中文') : (btn.dataset.labelZh || '目前繁體中文，切換為 English'));
        };
        sync();
        requestAnimationFrame(place);
        addEventListener('resize', place);

        const paint = (dt) => {
            const s = swap.step(dt), k = slide.step(dt), d = geo();
            const lift = Math.sin(Math.PI * Math.min(Math.max(s, 0), 1)) * 13;
            opts[0].style.transform = `translate(${s * d}px, ${-lift}px)`;   // 左字從上方弧線跨過去
            opts[1].style.transform = `translate(${-s * d}px, ${lift}px)`;   // 右字從下方弧線跨過來
            const x0 = opts[0].offsetLeft, x1 = opts[1].offsetLeft, w0 = opts[0].offsetWidth, w1 = opts[1].offsetWidth;
            ind.style.translate = `${x0 + (x1 - x0) * k}px 0`;
            ind.style.width = `${w0 + (w1 - w0) * k}px`;
            if (!busy && swap.settled && slide.settled) {
                opts.forEach((o) => { o.style.transform = ''; });
                place(); stop = null; return false;
            }
        };
        btn.addEventListener('click', () => {
            if (busy) return;
            cur = 1 - cur;
            if (reduced()) { sync(); place(); btn.dispatchEvent(new CustomEvent('sakuga:lang', { bubbles: true, detail: { lang: btn.dataset.current } })); return; }
            busy = true;
            swap.to = 1; swap.v += 1.5;
            btn.classList.add('is-swapping');
            K.later(0.32, () => {             // 交換完成、停一下
                sync();
                slide.to = cur;               // 色塊移到新語言
                swap.to = 0;                  // 文字回到原位
                busy = false;
                btn.classList.remove('is-swapping');
                K.later(0.3, () => btn.dispatchEvent(new CustomEvent('sakuga:lang', { bubbles: true, detail: { lang: btn.dataset.current } })));
            });
            if (!stop) stop = K.drive(paint);
        });
    }

    // ───────── 日夜切換：太陽與月亮掛在同一個輪子上，順時針轉半圈 = 日落月升／月落日出 ─────────
    function daynight(btn) {
        const wheel = btn.querySelector('.sk-dn-wheel');
        const ang = new Spring(0, 170, 12);    // 角度（度）；欠阻尼，落定時會晃一下
        let stop = null;
        const isDay = () => document.body.classList.contains('day-mode');
        const label = () => {
            // 可用 data-label-day / data-label-night 覆寫（多語系頁面）
            const t = isDay() ? (btn.dataset.labelDay || '切換為夜間模式') : (btn.dataset.labelNight || '切換為日間模式');
            btn.setAttribute('aria-label', t); btn.title = t;
        };
        ang.x = ang.to = isDay() ? 0 : 180;
        wheel.style.rotate = `${ang.x}deg`;
        btn.classList.toggle('is-night', !isDay());
        label();

        const paint = (dt) => {
            const a = ang.step(dt);
            wheel.style.rotate = `${a}deg`;
            btn.style.setProperty('--sk-dn-p', String(((a % 360) + 360) % 360 / 180));
            if (ang.settled) {
                const n = ((ang.to % 360) + 360) % 360;      // 歸一，下一次仍順時針
                ang.x = ang.to = n; wheel.style.rotate = `${n}deg`;
                stop = null; return false;
            }
        };
        btn.addEventListener('click', () => {
            const day = document.body.classList.toggle('day-mode');
            btn.classList.toggle('is-night', !day);
            label();
            document.querySelectorAll('[data-sk-daynight]').forEach((o) => {
                if (o !== btn) o.dispatchEvent(new CustomEvent('sakuga:sync'));
            });
            btn.dispatchEvent(new CustomEvent('sakuga:theme', { bubbles: true, detail: { day } }));
            if (reduced()) { ang.x = ang.to = day ? 0 : 180; wheel.style.rotate = `${ang.x}deg`; return; }
            ang.to += 180;                                   // 永遠順時針：太陽往右落下，月亮從左升起
            ang.v += 90;
            if (!stop) stop = K.drive(paint);
        });
        btn.addEventListener('sakuga:sync', () => {          // 頁面上其他日夜鈕被按時同步
            btn.classList.toggle('is-night', !isDay());
            label();
            if (reduced()) { ang.x = ang.to = isDay() ? 0 : 180; wheel.style.rotate = `${ang.x}deg`; return; }
            ang.to += 180;
            if (!stop) stop = K.drive(paint);
        });
    }

    function init() {
        document.querySelectorAll('[data-sk-dropdown]').forEach(dropdown);
        document.querySelectorAll('[data-sk-lang]').forEach(lang);
        document.querySelectorAll('[data-sk-daynight]').forEach(daynight);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    window.OASakugaControls = { dropdown, lang, daynight };
})();
