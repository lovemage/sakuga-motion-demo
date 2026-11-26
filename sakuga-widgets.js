/* OceanAds Sakuga Widgets — 核取方塊、單選、評分、開關、滑桿、輸入框、分頁、進度條、通知、提示、完成打勾
 * 依賴 sakuga-motion.js（Spring、共用時脈、特效）。每個元件都建立在原生元素上，鍵盤與螢幕閱讀器照常可用；
 * 「減少動態效果」時狀態照常切換，只是不播彈簧與特效。
 * 用 data-skw="check|radio|rating|switch|slider|input|tabs|progress|toast|tip|done" 標記根元素。
 */
(() => {
    'use strict';
    const K = window.OASakuga;
    if (!K || window.OASakugaWidgets) return;
    const { Spring, fx } = K;
    const reduced = () => K.reduced();
    const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
    const rand = (a, b) => a + Math.random() * (b - a);
    const rect = (el) => el.getBoundingClientRect();
    const mid = (r) => [r.left + r.width / 2, r.top + r.height / 2];

    /** 讓一組彈簧驅動某個樣式，全部靜止後自動停 */
    function animate(springs, apply, done) {
        let stop = null;
        const tick = (dt) => {
            for (const s of springs) s.step(dt);
            apply();
            if (springs.every((s) => s.settled)) { stop = null; done && done(); return false; }
        };
        return () => { if (!stop) stop = K.drive(tick); };
    }
    /** 元素被打一下：壓扁、回彈 */
    function bump(el, kick = 3, opt = {}) {
        if (reduced()) return;
        const b = el.__skb || (el.__skb = (() => {
            const sq = new Spring(1, opt.k || 520, opt.d || 14), tilt = new Spring(0, 300, 12), wide = opt.wide ?? 0.5;
            const run = animate([sq, tilt], () => {
                const sy = sq.x, sx = 1 + (1 - sy) * wide;
                el.style.scale = `${sx} ${sy}`; el.style.rotate = `${tilt.x}deg`;
            }, () => { el.style.scale = ''; el.style.rotate = ''; });
            return { sq, tilt, run };
        })());
        b.sq.v += kick; if (opt.tilt) b.tilt.v += opt.tilt;
        b.run();
    }

    // ───────── 核取方塊：兩道月牙繞著框轉、碎片飛出、勾自己畫出來、閃光、網點「嚓！」 ─────────
    function check(root) {
        const input = root.querySelector('input[type="checkbox"]'), box = root.querySelector('.skw-box');
        input.addEventListener('change', () => {
            const r = rect(box), [cx, cy] = mid(r), R = r.width * 0.78;
            if (input.checked) {
                bump(box, -4, { k: 560, d: 13, tilt: rand(-1, 1) * 80 });
                fx.crescent(cx, cy, R, { start: -Math.PI * 0.75, sweep: Math.PI * 1.15, width: 6 });
                fx.crescent(cx, cy, R, { start: Math.PI * 0.25, sweep: Math.PI * 1.15, width: 6, color: '#ff4d6d' });
                fx.shards(cx, cy, { count: 6, speed: 200, size: 4.5, arc: Math.PI * 1.6 });
                K.later(0.22, () => fx.kira(r.right + 2, r.top - 2, 11));
                const lr = rect(root);
                K.later(0.12, () => fx.sfx('cha', lr.right + 34, cy - 20, { size: 40, tone: true }));
            } else {
                bump(box, 2);
                fx.puff(cx, cy, 0, -0.4, { scale: 0.55, life: 0.5 });
            }
        });
    }

    // ───────── 單選：點彈進來、扇形指向線、兩團煙飄走、空心「啵！」 ─────────
    function radio(root) {
        root.querySelectorAll('input[type="radio"]').forEach((input) => {
            input.addEventListener('change', () => {
                if (!input.checked) return;
                const dot = input.parentElement.querySelector('.skw-dot'), pip = dot.querySelector('i');
                const r = rect(dot), [cx, cy] = mid(r);
                if (!reduced()) {
                    const s = new Spring(0, 420, 11);
                    s.to = 1;
                    animate([s], () => { pip.style.scale = String(Math.max(0, s.x)); }, () => { pip.style.scale = ''; })();
                }
                bump(dot, 3);
                fx.ticks(cx, cy, r.width / 2 + 4, { count: 5, spread: 0.5, len: 12 });
                fx.puff(r.left, cy, -1, -0.3, { scale: 0.5, life: 0.6 });
                fx.puff(r.right, cy, 1, -0.3, { scale: 0.5, life: 0.6 });
                const lr = rect(input.parentElement);
                K.later(0.05, () => fx.sfx('bo', lr.right + 34, cy - 16, { size: 36, fill: '#ffffff' }));
            });
        });
    }

    // ───────── 評分：星星依序彈出；最後一顆有扇形指向線、閃光、「啵！」；五顆再加爆炸 ─────────
    function rating(root) {
        const stars = [...root.querySelectorAll('button')];
        let value = Number(root.dataset.value || 0);
        const paint = () => stars.forEach((b, i) => {
            b.classList.toggle('on', i < value);
            b.setAttribute('aria-checked', String(i + 1 === value));
            b.tabIndex = (value ? i + 1 === value : i === 0) ? 0 : -1;
        });
        paint();
        function set(n, fromKey) {
            value = n === value && !fromKey ? 0 : n;
            paint();
            root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value } }));
            if (!value) { const [cx, cy] = mid(rect(root)); fx.puff(cx, cy, 0, -0.5, { scale: 0.6, life: 0.5 }); return; }
            stars.slice(0, value).forEach((b, i) => K.later(i * 0.06, () => bump(b, 5, { k: 520, d: 12, wide: 0.3 })));
            const last = stars[value - 1];
            K.later((value - 1) * 0.06 + 0.04, () => {
                const r = rect(last), [cx, cy] = mid(r);
                if (value === 5) fx.burst(cx, cy, 46, { hole: last });
                fx.ticks(cx, cy, r.width / 2 + 2, { count: 5, spread: 0.45, len: 12 });
                fx.kira(r.right, r.top, 10);
                fx.sfx('bo', cx + 20, r.top - 34, { size: 38, fill: '#ffffff' });
                if (value === 5) fx.confetti(cx, cy, { count: 16 });
            });
        }
        stars.forEach((b, i) => {
            b.addEventListener('click', () => set(i + 1));
            b.addEventListener('keydown', (e) => {
                const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
                if (!d) return;
                e.preventDefault();
                const n = clamp((value || 0) + d, 1, 5);
                set(n, true); stars[n - 1].focus();
            });
        });
    }

    // ───────── 開關：滑塊拖著尾巴衝過去、撞到底濺起水花、軌道灌滿後晃一晃、閃光；關閉時倒放 ─────────
    function toggle(root) {
        const knob = root.querySelector('.skw-knob'), flood = root.querySelector('.skw-flood');
        const pos = new Spring(0, 380, 26), fill = new Spring(0, 160, 7);
        let on = root.getAttribute('aria-checked') === 'true', landed = true;
        pos.x = pos.to = fill.x = fill.to = on ? 1 : 0;
        const travel = () => root.clientWidth - knob.offsetWidth - 2 * knob.offsetLeft;
        const apply = () => {
            const v = pos.v, stretch = 1 + Math.min(Math.abs(v) * 0.09, 0.85);
            knob.style.translate = `${pos.x * travel()}px 0`;
            knob.style.scale = `${stretch} ${1 / Math.sqrt(stretch)}`;
            knob.style.transformOrigin = v >= 0 ? '100% 50%' : '0% 50%';
            flood.style.scale = `${clamp(fill.x, 0, 1.08)} 1`;
            flood.style.skew = `${clamp(-fill.v * 4, -14, 14)}deg 0deg`;
            if (!landed && Math.abs(pos.x - pos.to) < 0.04) {
                landed = true;
                const r = rect(knob), [cx, cy] = mid(r);
                if (on) {
                    fx.splash(r.right - 4, rect(root).top + 2, { width: 22, height: 30 });
                    fill.to = 1; fill.v += 2.5;
                    K.later(0.3, () => fx.kira(r.right - 6, r.top + 4, 10));
                } else {
                    fx.puff(r.left, cy, -1, -0.2, { scale: 0.55, life: 0.5 });
                    fill.to = 0;
                }
            }
        };
        const run = animate([pos, fill], apply, () => { knob.style.scale = ''; flood.style.skew = ''; });
        apply();
        root.addEventListener('click', () => {
            on = !on;
            root.setAttribute('aria-checked', String(on));
            root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { checked: on } }));
            if (reduced()) { pos.x = pos.to = fill.x = fill.to = on ? 1 : 0; pos.v = fill.v = 0; apply(); return; }
            landed = false;
            pos.to = on ? 1 : 0;
            if (!on) fill.to = 0;
            const r = rect(knob), [cx, cy] = mid(r);
            fx.lines(on ? r.left : r.right, cy, { angle: on ? Math.PI : 0, spread: 0, across: r.height * 0.8, count: 4, len: 30, dist: 0, life: 0.32 });
            run();
        });
    }

    // ───────── 滑桿：滑塊被彈簧拖著跑、拉長成水滴、數值泡泡跟著傾斜；拖得快時捲起積雲、速度線、碎片、「咻～」；
    //           還在動時放手，一道月牙往前飛、小爆炸、兩團煙留在原地 ─────────
    function slider(root) {
        const input = root.querySelector('input[type="range"]');
        const thumb = root.querySelector('.skw-thumb'), fillEl = root.querySelector('.skw-fill'), bubble = root.querySelector('.skw-bubble');
        const unit = root.dataset.unit ?? '%';
        const x = new Spring(0, 260, 20);
        let lastFx = 0, lastWord = -9, clock = 0, dragging = false;
        const frac = () => (Number(input.value) - Number(input.min || 0)) / ((Number(input.max || 100) - Number(input.min || 0)) || 1);
        const width = () => root.clientWidth;
        const apply = () => {
            const w = width(), px = x.x * w, v = x.v * w;   // v：每秒像素
            thumb.style.translate = `${px}px 0`;
            fillEl.style.scale = `${clamp(x.x, 0, 1)} 1`;
            const st = 1 + Math.min(Math.abs(v) / 900, 0.7);
            thumb.style.scale = `${st} ${1 / Math.sqrt(st)}`;
            thumb.style.transformOrigin = v >= 0 ? '30% 50%' : '70% 50%';
            bubble.style.translate = `${px}px 0`;
            bubble.style.rotate = `${clamp(-v / 40, -24, 24)}deg`;
            bubble.textContent = `${Math.round(Number(input.value))}${unit}`;
        };
        x.x = x.to = frac(); apply();
        const tick = (dt) => {
            clock += dt;
            x.step(dt); apply();
            const w = width(), v = x.v * w, fast = Math.abs(v) > w * 0.9;   // 每秒超過 0.9 個軌道寬
            if (fast && !reduced() && clock - lastFx > 0.07) {
                lastFx = clock;
                const r = rect(thumb), [cx, cy] = mid(r), back = v > 0 ? -1 : 1;
                fx.puff(cx + back * 10, cy, back, -0.4, { scale: rand(0.55, 0.85), life: 0.6 });
                fx.lines(cx + back * 12, cy, { angle: back > 0 ? 0 : Math.PI, spread: 0, across: 16, count: 3, len: 26, dist: 0, life: 0.28 });
                if (Math.random() < 0.35) fx.shards(cx, cy, { count: 2, speed: 160, size: 3.5 });
                if (clock - lastWord > 0.9) { lastWord = clock; fx.sfx('xiu', cx, r.top - 52, { size: 38 }); }
            }
            if (!dragging && x.settled) return false;
        };
        let stop = null;
        const run = () => { if (!stop) stop = K.drive((dt) => { const r = tick(dt); if (r === false) stop = null; return r; }); };
        input.addEventListener('input', () => {
            if (reduced()) { x.x = x.to = frac(); x.v = 0; apply(); return; }
            x.to = frac(); run();
        });
        input.addEventListener('pointerdown', () => { dragging = true; run(); });
        const release = () => {
            if (!dragging) return;
            dragging = false;
            const w = width(), v = x.v * w;
            if (Math.abs(v) > 260 && !reduced()) {
                const r = rect(thumb), [cx, cy] = mid(r), dir = Math.sign(v);
                fx.slash(cx + dir * 10, cy + 8, cx + dir * 110, cy - 14, { width: 9, bend: 0.12 });
                fx.burst(cx + dir * 96, cy - 10, 18);
                fx.puff(cx - dir * 6, cy, -dir, -0.2, { scale: 0.5 });
                fx.puff(cx - dir * 22, cy + 4, -dir, -0.1, { scale: 0.45 });
            }
        };
        input.addEventListener('pointerup', release);
        input.addEventListener('pointercancel', release);
        input.addEventListener('change', release);
        addEventListener('resize', apply);
    }

    // ───────── 輸入框：聚焦時三道指向線從角落飛出；每打一個字，游標處揚起一小團煙，偶爾彈出碎片，框輕輕一縮 ─────────
    function input(root) {
        const el = root.querySelector('input');
        const meas = document.createElement('canvas').getContext('2d');
        el.addEventListener('focus', () => {
            const r = rect(root);
            fx.ticks(r.right - 4, r.top + 4, 6, { angle: -Math.PI / 4, count: 3, len: 12 });
        });
        el.addEventListener('input', (e) => {
            const cs = getComputedStyle(el);
            meas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
            const caret = el.selectionStart ?? el.value.length;
            const shown = el.type === 'password' ? '•'.repeat(caret) : el.value.slice(0, caret);
            const r = rect(el), x = r.left + parseFloat(cs.paddingLeft) + meas.measureText(shown).width - el.scrollLeft;
            const cx = clamp(x, r.left + 6, r.right - 6), cy = r.top + r.height * 0.3;
            fx.puff(cx, cy, rand(-0.3, 0.3), -0.8, { scale: 0.32, life: 0.45 });
            if (Math.random() < 0.28) fx.shards(cx, cy, { count: 1, speed: 150, size: 3 });
            bump(root, e.inputType && e.inputType.startsWith('delete') ? 0.5 : -0.7, { k: 700, d: 18, wide: 0.15 });
        });
    }

    // ───────── 分頁：選取塊滑過去時被拉長，落地時上方有指向線、來的那一側冒煙、背後速度線 ─────────
    function tabs(root) {
        const ind = root.querySelector('.skw-tab-ind');
        const btns = [...root.querySelectorAll('[role="tab"]')];
        let cur = Math.max(0, btns.findIndex((b) => b.getAttribute('aria-selected') === 'true'));
        const x = new Spring(0, 300, 19), w = new Spring(0, 300, 19);
        let landed = true, from = 0;
        const target = (i) => [btns[i].offsetLeft, btns[i].offsetWidth];
        const apply = () => {
            const stretch = Math.min(Math.abs(x.v) * 0.06, 60);
            ind.style.translate = `${x.x - (x.v < 0 ? stretch : 0)}px 0`;
            ind.style.width = `${w.x + stretch}px`;
            ind.style.scale = `1 ${1 - Math.min(Math.abs(x.v) / 4000, 0.18)}`;
            if (!landed && Math.abs(x.x - x.to) < 3) {
                landed = true;
                const r = rect(btns[cur]), [cx, cy] = mid(r), side = from < cur ? -1 : 1;
                fx.ticks(cx, cy, r.height / 2 + 2, { count: 3, len: 11 });
                fx.puff(side < 0 ? r.left : r.right, cy, side, -0.2, { scale: 0.5, life: 0.5 });
                fx.lines(side < 0 ? r.left : r.right, cy, { angle: side < 0 ? Math.PI : 0, spread: 0, across: r.height * 0.7, count: 4, len: 28, dist: 0, life: 0.3 });
            }
        };
        const run = animate([x, w], apply, () => { ind.style.scale = ''; });
        const place = () => { [x.x, w.x] = target(cur); x.to = x.x; w.to = w.x; apply(); };
        requestAnimationFrame(place); addEventListener('resize', place);
        function select(i, focus) {
            if (i === cur) return;
            from = cur; cur = i;
            btns.forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
            if (focus) btns[i].focus();
            root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { index: i } }));
            if (reduced()) { place(); return; }
            landed = false;
            [x.to, w.to] = target(i);
            run();
        }
        btns.forEach((b, i) => {
            b.tabIndex = i === cur ? 0 : -1;
            b.addEventListener('click', () => select(i));
            b.addEventListener('keydown', (e) => {
                const n = btns.length, map = { ArrowRight: (cur + 1) % n, ArrowLeft: (cur - 1 + n) % n, Home: 0, End: n - 1 };
                if (e.key in map) { e.preventDefault(); select(map[e.key], true); }
            });
        });
    }

    // ───────── 進度條：前緣騎著一朵暴風雲（越填越大、衝刺時頂部往後拖、扯出煙絲、拖著速度線），地面線畫出來、
    //           前緣經過時小石子被掀起，跑起來後出現「轟轟轟」；到底時背後爆炸、「咚！」、打勾、地上留兩朵雲 ─────────
    function progress(root) {
        const bar = root.querySelector('.skw-bar'), fillEl = root.querySelector('.skw-bar i'), pct = root.querySelector('.skw-pct');
        const ground = root.querySelector('.skw-ground');
        let target = 0, shown = 0, speed = 0, cloud = null, stop = null, said = false, done = false, wisp = 0, clock = 0;
        let pebbles = [];
        const paint = () => {
            fillEl.style.scale = `${shown} 1`;
            const n = Math.round(shown * 100);
            pct.textContent = `${n}%`;
            root.setAttribute('aria-valuenow', String(n));
        };
        function drawCloud(c, p, t) {
            const r = rect(bar), ex = r.left + r.width * shown, ey = r.top - 4;
            const size = 8 + shown * 12, drag = clamp(speed * 40, 0, 26);
            const lobes = [[-0.9, 0.1, 0.75], [-0.25, -0.45, 1], [0.45, -0.15, 0.85], [0.05, 0.35, 0.7], [-0.55, -0.85, 0.6]];
            K.fx.blob(c, lobes.map(([ox, oy, k], i) => [
                ex + ox * size - (oy < -0.3 ? drag : drag * 0.3) + Math.sin(t * 6 + i) * 1.4,
                ey + oy * size + Math.cos(t * 5 + i * 2) * 1.2,
                size * k * (0.92 + 0.08 * Math.sin(t * 7 + i)),
            ]));
        }
        const tick = (dt) => {
            clock += dt;
            const prev = shown, gap = target - shown;
            if (Math.abs(gap) > 1e-4) {
                const rate = clamp(Math.abs(gap) * 2.2, 0.12, 0.9);
                shown = gap > 0 ? Math.min(target, shown + rate * dt) : Math.max(target, shown - rate * dt);
            }
            speed = dt > 0 ? (shown - prev) / dt : 0;
            paint();
            if (!reduced() && shown > 0 && shown < 1 && !cloud) cloud = K.effect(Infinity, drawCloud, { fixed: true });
            const r = rect(bar), ex = r.left + r.width * shown;
            if (cloud && speed > 0.05 && clock - wisp > 0.12) {
                wisp = clock;
                fx.puff(ex - 10, r.top - 10, -1, -0.5, { scale: 0.35, life: 0.5, fixed: true });
                if (speed > 0.3) fx.lines(ex - 14, r.top - 6, { angle: Math.PI, spread: 0.15, count: 3, len: 22, dist: 0, life: 0.3, fixed: true });
            }
            for (const pb of pebbles) if (!pb.hit && shown >= pb.at) {
                pb.hit = true;
                const gr = rect(ground);
                fx.shards(gr.left + gr.width * pb.at, gr.top, { count: 2, speed: 120, size: 2.6, fixed: true });
            }
            if (!said && shown > 0.15) { said = true; fx.sfx('hong', r.left + r.width * 0.5, r.top - 62, { size: 34, fixed: true, life: 1.1 }); }
            if (!done && shown >= 1) {
                done = true;
                if (cloud) { cloud.kill(); cloud = null; }
                root.classList.add('is-done');
                const [cx, cy] = [r.right - 10, r.top + r.height / 2];
                fx.burst(cx, cy, 40, { hole: bar });
                fx.sfx('dong', cx - 30, r.top - 58, { size: 44 });
                K.later(0.15, () => fx.check(r.left + r.width / 2, r.top - 26, { size: 22, hold: 1 }));
                const gr = rect(ground);
                fx.puff(gr.left + gr.width * 0.25, gr.top - 4, -0.3, -0.1, { scale: 0.5, life: 1.2 });
                fx.puff(gr.left + gr.width * 0.75, gr.top - 4, 0.3, -0.1, { scale: 0.5, life: 1.2 });
                root.dispatchEvent(new CustomEvent('sakuga:done', { bubbles: true }));
            }
            if (Math.abs(target - shown) < 1e-4 && (shown >= 1 || shown === 0)) { if (cloud) { cloud.kill(); cloud = null; } stop = null; return false; }
        };
        const api = {
            set(v) {
                target = clamp(v);
                if (target < 1) { done = false; root.classList.remove('is-done'); }
                if (!stop) stop = K.drive(tick);
            },
            reset() {
                target = shown = 0; said = false; done = false; paint();
                root.classList.remove('is-done');
                if (cloud) { cloud.kill(); cloud = null; }
                pebbles = Array.from({ length: 6 }, (_, i) => ({ at: (i + 0.5) / 6 + rand(-0.05, 0.05), hit: false }));
                ground.classList.remove('drawn'); void ground.offsetWidth; ground.classList.add('drawn');
            },
        };
        api.reset();
        root.skw = api;
    }

    // ───────── 通知：從左邊拉成一道殘影衝進來、背後速度線、落地揚起塵土與網點「嚓！」、晃一下，時間到縮小離開 ─────────
    function toast(root) {
        const msg = root.querySelector('.skw-toast-msg'), close = root.querySelector('.skw-toast-x');
        const x = new Spring(-1.4, 300, 17), sc = new Spring(0, 420, 22), tilt = new Spring(0, 280, 9);
        let landed = true, timer = null, open = false;
        const apply = () => {
            const st = 1 + Math.min(Math.abs(x.v) * 0.16, 0.9);
            root.style.translate = `${x.x * (root.offsetWidth + 40)}px 0`;
            root.style.scale = `${st * sc.x} ${sc.x / Math.sqrt(st)}`;
            root.style.rotate = `${tilt.x}deg`;
            root.style.transformOrigin = '100% 50%';
            root.style.opacity = sc.x < 0.02 ? '0' : '1';
            if (!landed && x.x > -0.08) {
                landed = true;
                const r = rect(root);
                fx.puff(r.left + 12, r.bottom, -1, -0.2, { scale: 0.6 });
                fx.puff(r.left + r.width * 0.5, r.bottom + 2, 0.4, -0.2, { scale: 0.5 });
                fx.sfx('cha', r.right - 24, r.top - 18, { size: 36, tone: true });
                tilt.v += 70;
            }
        };
        const run = animate([x, sc, tilt], apply, () => { if (!open) root.hidden = true; });
        root.hidden = true;
        function show(text) {
            if (text) msg.textContent = text;
            clearTimeout(timer);
            open = true; root.hidden = false;
            if (reduced()) { x.x = x.to = 0; sc.x = sc.to = 1; x.v = sc.v = tilt.v = 0; apply(); }
            else {
                x.x = -1.4; x.v = 0; x.to = 0; sc.x = sc.to = 1; sc.v = 0; sc.d = 22; landed = false;
                const r = rect(root);
                K.later(0.02, () => fx.lines(r.left - 20, r.top + r.height / 2, { angle: Math.PI, spread: 0, across: r.height * 0.8, count: 5, len: 50, dist: 0, life: 0.4 }));
                run();
            }
            timer = setTimeout(hide, 2600);
        }
        function hide() {
            clearTimeout(timer);
            if (!open) return;
            open = false;
            if (reduced()) { root.hidden = true; return; }
            sc.d = 2 * Math.sqrt(sc.k); sc.to = 0; run();
        }
        close.addEventListener('click', hide);
        root.skw = { show, hide, get open() { return open; } };
    }

    // ───────── 提示：說明泡泡像對話框一樣彈出，兩側冒煙、按鈕頂端飄出煙圈、角落指向線、空心「喀！」 ─────────
    function tip(root) {
        const btn = root.querySelector('button'), bubble = root.querySelector('[role="tooltip"]');
        const s = new Spring(0, 380, 13);
        let open = false;
        const apply = () => { bubble.style.scale = String(Math.max(0, s.x)); bubble.style.opacity = String(clamp(s.x * 3)); };
        const run = animate([s], apply, () => { if (!open) bubble.hidden = true; });
        bubble.hidden = true;
        function show() {
            if (open) return;
            open = true; bubble.hidden = false; btn.setAttribute('aria-expanded', 'true');
            if (reduced()) { s.x = s.to = 1; apply(); return; }
            s.d = 13; s.to = 1; run();
            bump(btn, 3, { tilt: rand(-1, 1) * 60 });
            requestAnimationFrame(() => {
                const r = rect(bubble), br = rect(btn), [bx, by] = mid(br);
                fx.puff(r.left, r.top + r.height / 2, -1, 0, { scale: 0.5, life: 0.55 });
                fx.puff(r.right, r.top + r.height / 2, 1, 0, { scale: 0.5, life: 0.55 });
                fx.ring(bx, br.top, { rx: 18, ry: 6, life: 0.45 });
                fx.ticks(br.right, br.top, 4, { angle: -Math.PI / 4, count: 3, len: 10 });
                fx.sfx('ka', br.right + 46, br.top - 6, { size: 34, fill: '#ffffff' });
            });
        }
        function hide() {
            if (!open) return;
            open = false; btn.setAttribute('aria-expanded', 'false');
            if (reduced()) { s.x = s.to = 0; bubble.hidden = true; return; }
            s.d = 2 * Math.sqrt(s.k); s.to = 0; run();
        }
        btn.addEventListener('click', () => (open ? hide() : show()));
        root.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
        document.addEventListener('pointerdown', (e) => { if (open && !root.contains(e.target)) hide(); });
    }

    // ───────── 完成打勾：按鈕打擊播完後，勾落在按鈕上、閃光，1.8 秒後消失 ─────────
    function done(root) {
        root.addEventListener('click', () => {
            const label = root.dataset.doneLabel;
            K.later(0.55, () => {
                const r = rect(root), [cx, cy] = mid(r);
                fx.check(cx, cy - 2, { size: 30, hold: 1.8 });
                K.later(0.3, () => fx.kira(cx + 22, r.top, 12));
                if (label) { const old = root.textContent; root.textContent = label; setTimeout(() => { root.textContent = old; }, 2400 / K.state.timeScale); }
            });
        });
    }

    const KINDS = { check, radio, rating, switch: toggle, slider, input, tabs, progress, toast, tip, done };
    function init(scope = document) {
        scope.querySelectorAll('[data-skw]').forEach((el) => {
            if (el.__skw) return;
            const f = KINDS[el.dataset.skw];
            if (f) { el.__skw = true; f(el); }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
    window.OASakugaWidgets = { init, bump };
})();
