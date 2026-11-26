/* OceanAds Sakuga Motion — 點擊回饋動畫引擎
 * 依 docs/sakuga-vfx-動畫原理指南.md 實作：
 *   彈簧驅動 CSS scale / rotate（壓扁、回彈、傾斜）＋ 單一 rAF 時脈 ＋ 一張 fixed canvas 特效層。
 * 色彩一律讀 --ex-* token（深色／亮色自動切換）；音效字來自 sakuga-sfx-paths.js（中文向量路徑）。
 *
 * 用法：
 *   <link rel="stylesheet" href="sakuga-motion.css">
 *   <script src="sakuga-sfx-paths.js" defer></script>
 *   <script src="sakuga-motion.js" data-auto defer></script>
 *   - data-auto：依網站既有 class 自動套用（.btn-primary、.mobile-menu、.article-card-link…）
 *   - 個別元素可用 data-sakuga="send|spin|impact|spark|menu|close|toggle|tag|card|back|dock|menuitem|off" 指定
 *   - 連結在播放特效時會延後跳頁；跳頁前會在元素上派發可取消的 `sakuga:navigate` 事件
 */
(() => {
    'use strict';
    if (window.OASakuga) return;

    const TAU = Math.PI * 2;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const S = { timeScale: 1, reduce: null, auto: false };
    const reduced = () => (S.reduce === null ? mq.matches : S.reduce);

    // ───────── 數學工具 ─────────
    const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
    const rand = (a, b) => a + Math.random() * (b - a);
    const sign = () => (Math.random() < 0.5 ? -1 : 1);
    const easeOut = (p) => 1 - (1 - p) ** 3;
    const easeInOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
    const easeOutBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2; };

    // ───────── 彈簧（F = -kx - dv，8ms 子步長）─────────
    class Spring {
        constructor(x = 0, k = 300, d = 20) { this.x = x; this.v = 0; this.to = x; this.k = k; this.d = d; }
        step(dt) {
            if (!(dt > 0)) return this.x;
            for (let n = Math.ceil(dt / 0.008), h = dt / n; n--;) {
                this.v += (-this.k * (this.x - this.to) - this.d * this.v) * h;
                this.x += this.v * h;
            }
            return this.x;
        }
        get settled() { return Math.abs(this.x - this.to) < 1e-3 && Math.abs(this.v) < 1e-3; }
    }

    // ───────── 色票：讀 --ex-* token，主題切換時失效重算 ─────────
    let pal = null;
    const hex = (s) => {
        s = (s || '').trim();
        if (s[0] !== '#') return null;
        if (s.length === 4) s = '#' + [...s.slice(1)].map((c) => c + c).join('');
        const n = parseInt(s.slice(1, 7), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const mix = (a, b, t) => {
        const A = hex(a), B = hex(b);
        return A && B ? `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})` : a;
    };
    function palette() {
        if (pal) return pal;
        const cs = getComputedStyle(document.body);
        const g = (n, f) => cs.getPropertyValue(n).trim() || f;
        const dark = !document.body.classList.contains('day-mode');
        const ink = g('--ex-ink', '#0c1e1c'), bg = g('--ex-bg', '#eae6da'), surface = g('--ex-surface', '#faf8f1');
        const strong = g('--ex-border-strong', '#c5bfad'), text2 = g('--ex-text-2', '#57675f'), link = g('--ex-link', '#0f5f4b');
        // 可用 --sk-* 自訂特效配色（未設定時沿用 --ex-* 單色系）
        const v = (n) => cs.getPropertyValue(n).trim();
        const paper = v('--sk-paper') || (dark ? ink : surface);
        const inkC = v('--sk-ink') || ink;
        const smokeShade = v('--sk-smoke-shade') || strong;
        const pop = (v('--sk-pop') || '').split(',').map((s) => s.trim()).filter(Boolean);
        pal = {
            dark, link,
            ink: inkC,
            paper,                                                   // 亮面（音效字、爆炸、閃光的填色）
            outline: v('--sk-outline') || (dark ? bg : ink),          // 外框
            shade: v('--sk-shade') || (dark ? mix(strong, text2, 0.3) : strong),
            spike: v('--sk-spike') || link,
            kira: v('--sk-kira') || paper,
            slash: v('--sk-slash') || inkC,
            tone: v('--sk-tone') || link,
            ring: v('--sk-ring') || smokeShade,
            pop: pop.length ? pop : [inkC],                           // 速度線、指向線、碎片輪流使用
            smokeLine: v('--sk-smoke-line') || text2,
            smokeShade,
            smokeLight: v('--sk-smoke-light') || (dark ? mix(strong, text2, 0.45) : surface),
            sfxFill: (id) => v(`--sk-sfx-${id}`) || paper,
            sfxDepth: v('--sk-sfx-depth'),                           // 音效字立體厚度色（空值＝不畫）
        };
        return pal;
    }

    // ───────── 特效圖層：一張 fixed canvas；有 modal dialog 時移進 top layer ─────────
    let cv = null, ctx = null, W = 0, H = 0, dpr = 1;
    function ensureCanvas() {
        if (cv) return;
        cv = document.createElement('canvas');
        cv.className = 'sk-fx';
        cv.setAttribute('aria-hidden', 'true');
        ctx = cv.getContext('2d');
        resize();
    }
    function resize() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        W = innerWidth; H = innerHeight;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        sfxCache.clear();
    }
    const hostFor = () => {
        const open = document.querySelectorAll('dialog[open]');
        return open.length ? open[open.length - 1] : document.body;
    };

    // ───────── 共用時脈 ─────────
    const effects = [], frames = new Set(), timers = [];
    let now = 0, last = 0, running = false;

    function start() {
        if (running) return;
        ensureCanvas();
        running = true;
        last = performance.now();
        requestAnimationFrame(loop);
    }
    function later(sec, f) { timers.push({ at: now + sec, f }); start(); }

    /** 註冊一個特效。draw(ctx, p) 的 p 從 0 跑到 1。
     *  opt.hole：畫在該元素「後面」（以裁切挖掉元素範圍）；opt.fixed：不隨頁面捲動 */
    function fx(life, draw, opt = {}) {
        if (reduced()) return { kill() {}, dead: true };   // 減少動態：不畫特效
        let hole = null;
        if (opt.hole) {
            const r = parseFloat(getComputedStyle(opt.hole).borderTopLeftRadius) || 0;
            hole = { el: opt.hole, radius: r };
        }
        const e = { life, draw, t: 0, hole, dead: false, sx: opt.fixed ? null : scrollX, sy: opt.fixed ? null : scrollY };
        e.kill = () => { e.dead = true; };
        effects.push(e);
        start();
        return e;   // life 為 Infinity 時是常駐特效，呼叫 kill() 移除
    }

    function loop(ms) {
        const dt = clamp((ms - last) / 1000, 0, 0.034) * S.timeScale;   // dt 上限 34ms
        last = ms; now += dt;

        for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= now) timers.splice(i, 1)[0].f();
        for (const f of frames) f(dt);

        const host = hostFor();
        if (cv.parentNode !== host) host.append(cv);
        if (W !== innerWidth || H !== innerHeight) resize();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        for (const back of [true, false]) {           // 先畫「後面」的特效，再畫前景
            for (const e of effects) {
                if (!!e.hole !== back || e.t >= e.life || e.dead) continue;
                ctx.save();
                if (e.hole) {
                    const r = e.hole.el.getBoundingClientRect();
                    ctx.beginPath();
                    ctx.rect(0, 0, W, H);
                    if (ctx.roundRect) ctx.roundRect(r.left, r.top, r.width, r.height, Math.min(e.hole.radius, r.height / 2));
                    else ctx.rect(r.left, r.top, r.width, r.height);
                    ctx.clip('evenodd');
                }
                if (e.sx !== null) ctx.translate(e.sx - scrollX, e.sy - scrollY);
                e.draw(ctx, e.life === Infinity ? 0 : e.t / e.life, e.t);
                ctx.restore();
            }
        }
        for (let i = effects.length - 1; i >= 0; i--) { effects[i].t += dt; if (effects[i].dead || effects[i].t >= effects[i].life) effects.splice(i, 1); }

        if (!effects.length && !timers.length && !frames.size) {   // 沒東西在動就停
            ctx.clearRect(0, 0, W, H);
            running = false;
            return;
        }
        requestAnimationFrame(loop);
    }

    // ───────── 元素本體：彈簧 → CSS scale / rotate（與既有 transform 疊加，不互相覆蓋）─────────
    const bodies = new WeakMap();
    function bodyOf(el, cfg) {
        let b = bodies.get(el);
        if (!b) {
            b = { sq: new Spring(1, 520, 15), tilt: new Spring(0, 260, 10), wide: 0.55, held: false };
            b.tick = (dt) => {
                const sy = b.sq.step(dt), r = b.tilt.step(dt), sx = 1 + (1 - sy) * b.wide;  // 壓扁變寬、拉長變窄
                el.style.scale = `${sx.toFixed(4)} ${sy.toFixed(4)}`;
                el.style.rotate = `${r.toFixed(3)}deg`;
                el.style.setProperty('--sk-lift', (sy - 1).toFixed(4));   // 給 CSS 陰影用：壓下為負、彈起為正
                if (!b.held && b.sq.settled && b.tilt.settled) {
                    frames.delete(b.tick);
                    b.tilt.x = b.tilt.to = 0;   // 迴旋轉完一圈後歸零，下次仍從 0 開始
                    el.style.scale = ''; el.style.rotate = '';
                    el.style.removeProperty('--sk-lift');
                    el.classList.remove('sk-live');
                }
            };
            bodies.set(el, b);
        }
        if (cfg) {
            b.sq.k = cfg.k; b.sq.d = cfg.d; b.wide = cfg.wide;
            b.tilt.k = cfg.tk || 260; b.tilt.d = cfg.td || 10;
        }
        return b;
    }
    function wake(el, cfg) {
        const b = bodyOf(el, cfg);
        el.classList.add('sk-live');
        frames.add(b.tick);
        start();
        return b;
    }
    function impactFrame(el) {   // 衝擊幀：反色只維持一幀
        el.classList.add('sk-inv');
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('sk-inv')));
    }

    // ───────── 特效畫法 ─────────

    // 賽璐璐雙色 blob：外框 → 陰影色 → 亮面往左上平移
    function blob(c, circles) {
        const P = palette(), path = new Path2D();
        let any = false;
        for (const [x, y, r] of circles) {
            if (r <= 0.5) continue;
            any = true; path.moveTo(x + r, y); path.arc(x, y, r, 0, TAU);
        }
        if (!any) return;
        c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = P.smokeLine; c.stroke(path);
        c.fillStyle = P.smokeShade; c.fill(path);
        c.save(); c.clip(path); c.translate(-3, -4); c.fillStyle = P.smokeLight; c.fill(path); c.restore();
    }

    // 煙霧：帶 overshoot 膨脹 → 往外飄、縮小
    function puff(x, y, dx, dy, o = {}) {
        const k = o.scale || 1;
        const lobes = Array.from({ length: 4 }, () => ({ ox: rand(-11, 11) * k, oy: rand(-8, 8) * k, r: rand(7, 14) * k }));
        fx(o.life || 0.7, (c, p) => {
            const s = p < 0.35 ? easeOutBack(p / 0.35) : 1 - (p - 0.35) / 0.65;
            const mx = x + dx * easeOut(p) * 36 * k, my = y + dy * easeOut(p) * 36 * k - p * 10;
            const spread = 0.6 + p;
            blob(c, lobes.map((l) => [mx + l.ox * spread, my + l.oy * spread, l.r * s]));
        }, o);
    }

    // 星形（thin 越小尖刺越細）
    function star(c, x, y, n, inner, lengths, thin, rot = 0) {
        c.beginPath();
        for (let i = 0; i < n; i++) {
            const a = rot + (i / n) * TAU, w = (Math.PI / n) * 0.9 * thin;
            c.lineTo(x + Math.cos(a - w) * inner, y + Math.sin(a - w) * inner);
            c.lineTo(x + Math.cos(a) * lengths[i], y + Math.sin(a) * lengths[i]);
            c.lineTo(x + Math.cos(a + w) * inner, y + Math.sin(a + w) * inner);
        }
        c.closePath();
    }

    // 衝擊爆炸：青綠尖刺 + 陰影色星形 + 亮面星形；消失時尖角變細
    function burst(x, y, R, o = {}) {
        const n = 12, rot = Math.random() * Math.PI;
        const k = Array.from({ length: n }, () => rand(0.75, 1.25));
        fx(0.45, (c, p) => {
            const P = palette();
            const grow = easeOutBack(Math.min(p * 2.5, 1)), thin = 1 - p, inner = R * 0.35 * grow * thin;
            const L = (m) => k.map((v) => v * R * grow * m);
            c.fillStyle = P.spike; star(c, x, y, n, inner, L(1.25), thin * 0.4, rot + Math.PI / n); c.fill();
            c.fillStyle = P.shade; star(c, x + 5, y + 6, n, inner, L(1), thin, rot); c.fill();
            c.fillStyle = P.paper; star(c, x, y, n, inner, L(1), thin, rot); c.fill();
            c.lineWidth = 2.5; c.lineJoin = 'round'; c.strokeStyle = P.outline; c.stroke();
        }, o);
    }

    // 指向線：尖端指著物體 → 飛離、變細
    function ticks(x, y, R, o = {}) {
        const count = o.count || 3, base = o.angle ?? -Math.PI / 2, spread = o.spread || 0.45, len = o.len || 18;
        const angles = Array.from({ length: count }, (_, i) => base + (i - (count - 1) / 2) * spread);
        fx(0.35, (c, p) => {
            const P = palette();
            for (const [i, a] of angles.entries()) {
                c.fillStyle = P.pop[i % P.pop.length];
                const ux = Math.cos(a), uy = Math.sin(a), d = R + easeOut(p) * 26, l = len * (1 - p), w = 4 * (1 - p);
                const tx = x + ux * d, ty = y + uy * d, bx = tx + ux * l, by = ty + uy * l;
                c.beginPath(); c.moveTo(tx, ty); c.lineTo(bx - uy * w, by + ux * w); c.lineTo(bx + uy * w, by - ux * w); c.fill();
            }
        }, o);
    }

    // 速度線：往一個方向射出，頭先衝、尾巴追上，邊走邊變細
    function lines(x, y, o = {}) {
        const angle = o.angle || 0, spread = o.spread ?? 0.35, count = o.count || 7, len = o.len || 46, dist = o.dist || 10, width = o.width || 3.2;
        const ls = Array.from({ length: count }, (_, i) => ({
            a: angle + (count > 1 ? (i / (count - 1) - 0.5) * 2 * spread : 0) + rand(-0.05, 0.05),
            s0: dist + rand(0, 14), L: len * rand(0.6, 1.2), d: rand(0, 0.22),
            px: o.across ? (i / (count - 1) - 0.5) * o.across : 0,
        }));
        fx(o.life || 0.45, (c, p) => {
            const P = palette();
            for (const [i, l] of ls.entries()) {
                c.fillStyle = P.pop[i % P.pop.length];
                const q = clamp((p - l.d) / (1 - l.d));
                if (q <= 0) continue;
                const head = l.s0 + easeOut(q) * l.L * 1.8, tail = l.s0 + easeOut(clamp((q - 0.28) / 0.72)) * l.L * 1.8;
                if (head - tail < 0.5) continue;
                const ux = Math.cos(l.a), uy = Math.sin(l.a), w = width * (1 - q) + 0.4;
                const ox = x - uy * l.px, oy = y + ux * l.px;
                c.beginPath();
                c.moveTo(ox + ux * head, oy + uy * head);
                c.lineTo(ox + ux * tail - uy * w, oy + uy * tail + ux * w);
                c.lineTo(ox + ux * tail + uy * w, oy + uy * tail - ux * w);
                c.fill();
            }
        }, o);
    }

    // 閃光：四角星，張開再合上
    function kira(x, y, size, o = {}) {
        const rot = rand(-0.3, 0.3), delay = o.delay || 0;
        fx(0.5 + delay, (c, p) => {
            const q = clamp((p * (0.5 + delay) - delay) / 0.5);
            if (q <= 0) return;
            const k = q < 0.4 ? easeOutBack(q / 0.4) : 1 - easeOut((q - 0.4) / 0.6);
            const s = size * k, P = palette();
            if (s < 0.5) return;
            c.translate(x, y); c.rotate(rot + q * 0.6);
            c.beginPath();
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * TAU, b = ((i + 1) / 4) * TAU;
                if (i === 0) c.moveTo(Math.cos(a) * s, Math.sin(a) * s);
                c.quadraticCurveTo(0, 0, Math.cos(b) * s, Math.sin(b) * s);
            }
            c.closePath();
            c.fillStyle = P.kira; c.fill();
            c.lineWidth = 2; c.lineJoin = 'round'; c.strokeStyle = P.outline; c.stroke();
        }, o);
    }

    // 碎片：彩色小菱形與圓點往外噴、受重力落下、邊轉邊縮小
    function confetti(x, y, o = {}) {
        const n = o.count || 14, power = o.power || 1;
        const bits = Array.from({ length: n }, (_, i) => {
            const a = (o.angle ?? -Math.PI / 2) + rand(-1, 1) * (o.spread ?? 1.4);
            const s = rand(160, 340) * power;
            return { vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(3, 6.5), spin: rand(-12, 12), kind: i % 3, ci: i };
        });
        const life = o.life || 0.75;
        fx(life, (c, p) => {
            const P = palette(), t = p * life;
            for (const b of bits) {
                const bx = x + b.vx * t, by = y + b.vy * t + 520 * t * t, k = 1 - easeOut(p) * 0.85;
                c.save(); c.translate(bx, by); c.rotate(b.spin * t);
                c.fillStyle = P.pop[b.ci % P.pop.length];
                c.beginPath();
                if (b.kind === 0) c.arc(0, 0, b.r * k * 0.7, 0, TAU);
                else if (b.kind === 1) { const r = b.r * k; c.moveTo(0, -r * 1.3); c.lineTo(r * 0.7, 0); c.lineTo(0, r * 1.3); c.lineTo(-r * 0.7, 0); }
                else c.rect(-b.r * k, -b.r * k * 0.35, b.r * k * 2, b.r * k * 0.7);
                c.fill(); c.restore();
            }
        }, o);
    }

    // 斬擊：月牙形，頭先衝出去，尾巴再追上
    function slash(x1, y1, x2, y2, o = {}) {
        const w = o.width || 10, bend = o.bend ?? 0.16;
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        const cx = (x1 + x2) / 2 + nx * len * bend, cy = (y1 + y2) / 2 + ny * len * bend;
        const at = (u) => [(1 - u) ** 2 * x1 + 2 * (1 - u) * u * cx + u * u * x2, (1 - u) ** 2 * y1 + 2 * (1 - u) * u * cy + u * u * y2];
        fx(o.life || 0.38, (c, p) => {
            const head = easeOut(clamp(p / 0.55)), tail = easeInOut(clamp((p - 0.18) / 0.82));
            if (head - tail < 0.005) return;
            const N = 16, top = [], bot = [];
            for (let i = 0; i <= N; i++) {
                const v = i / N, u = tail + (head - tail) * v, [px, py] = at(u);
                const th = w * Math.sin(Math.PI * v) ** 0.8 * (1 - p * 0.4);
                top.push([px + nx * th, py + ny * th]); bot.push([px, py]);
            }
            c.beginPath();
            c.moveTo(...bot[0]);
            for (const pt of top) c.lineTo(...pt);
            for (let i = bot.length - 1; i >= 0; i--) c.lineTo(...bot[i]);
            c.closePath();
            c.fillStyle = palette().slash; c.fill();
        }, o);
    }

    // 迴旋：沿著橢圓繞圈的彩色弧線，頭先衝、尾巴追上、邊轉邊變細並往外擴
    function swirl(x, y, rx, ry, o = {}) {
        const n = o.count || 3, w = o.width || 5, rot0 = rand(0, TAU), sweep = o.sweep || Math.PI * 1.25;
        return fx(o.life || 0.6, (c, p) => {
            const P = palette(), head = easeOut(clamp(p / 0.6)), tail = easeInOut(clamp((p - 0.18) / 0.82));
            if (head - tail < 0.01) return;
            const grow = 1 + easeOut(p) * 0.3, spin = easeOut(p) * Math.PI * 1.6;
            for (let i = 0; i < n; i++) {
                const a0 = rot0 + (i / n) * TAU + spin, N = 22, outer = [], inner = [];
                for (let j = 0; j <= N; j++) {
                    const v = j / N, u = tail + (head - tail) * v, a = a0 + sweep * u, th = w * Math.sin(Math.PI * v) * (1 - p * 0.5);
                    outer.push([x + Math.cos(a) * (rx * grow + th), y + Math.sin(a) * (ry * grow + th)]);
                    inner.push([x + Math.cos(a) * rx * grow, y + Math.sin(a) * ry * grow]);
                }
                c.beginPath(); c.moveTo(...inner[0]);
                for (const pt of outer) c.lineTo(...pt);
                for (let j = inner.length - 1; j >= 0; j--) c.lineTo(...inner[j]);
                c.closePath(); c.fillStyle = P.pop[i % P.pop.length]; c.fill();
            }
        }, o);
    }

    // 長翅膀的信：從按鈕彈出 → 翅膀拍動、沿弧線加速飛走、越飛越小，身後拖彩色軌跡
    function mail(x, y, o = {}) {
        const s = o.size || 36, life = o.life || 1.3, dir = o.dir || 1;
        const sx = x, sy = y - 20, ex = x + (o.tx ?? 230) * dir, ey = y + (o.ty ?? -180), qx = x - 60 * dir, qy = y - 120;
        const trail = [];
        const wing = (c) => {
            c.beginPath(); c.moveTo(0, 0);
            c.quadraticCurveTo(s * 0.25, -s * 0.62, s * 0.88, -s * 0.64);
            c.quadraticCurveTo(s * 0.8, -s * 0.44, s * 0.64, -s * 0.42);
            c.quadraticCurveTo(s * 0.6, -s * 0.25, s * 0.44, -s * 0.24);
            c.quadraticCurveTo(s * 0.38, -s * 0.07, s * 0.18, -s * 0.03);
            c.closePath();
        };
        return fx(life, (c, p, t) => {
            const P = palette();
            let px, py, k, rot;
            if (p < 0.16) {
                const q = p / 0.16;
                k = easeOutBack(q) * 1.08; px = sx; py = y - 20 * easeOut(q); rot = -0.12 * dir * q;
            } else {
                const u = ((p - 0.16) / 0.84) ** 1.5, a = 1 - u;   // 越飛越快
                px = a * a * sx + 2 * a * u * qx + u * u * ex;
                py = a * a * sy + 2 * a * u * qy + u * u * ey;
                const dx = 2 * a * (qx - sx) + 2 * u * (ex - qx), dy = 2 * a * (qy - sy) + 2 * u * (ey - qy);
                rot = clamp(Math.atan2(dy, dx * dir) * 0.35, -0.5, 0.5) * dir;
                k = 1.08 - 0.62 * u;
            }
            trail.push([px, py]); if (trail.length > 16) trail.shift();
            c.save();
            c.lineCap = 'round';
            for (let i = 1; i < trail.length; i++) {
                const f = i / trail.length;
                c.strokeStyle = P.pop[i % P.pop.length]; c.lineWidth = 3.5 * f * k;
                c.globalAlpha = f * 0.9;
                c.beginPath(); c.moveTo(...trail[i - 1]); c.lineTo(...trail[i]); c.stroke();
            }
            c.restore();
            if (p > 0.88) c.globalAlpha = 1 - (p - 0.88) / 0.12;
            c.translate(px, py); c.rotate(rot); c.scale(k, k);
            const flap = Math.sin(t * 30) * 0.6, w = s, h = s * 0.66;
            c.lineJoin = 'round'; c.lineWidth = 2.2; c.strokeStyle = P.outline;
            for (const side of [-1, 1]) {     // 翅膀在信封後面，從兩側上緣長出
                c.save(); c.translate(side * w * 0.36, -h * 0.22); c.scale(side, 1); c.rotate(0.32 - flap);
                wing(c); c.fillStyle = P.paper; c.fill(); c.stroke();
                c.beginPath(); c.moveTo(s * 0.12, -s * 0.1); c.quadraticCurveTo(s * 0.35, -s * 0.38, s * 0.7, -s * 0.5); c.stroke();
                c.restore();
            }
            c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fillStyle = P.paper; c.fill(); c.lineWidth = 2.4; c.stroke();
            c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(0, h * 0.08); c.lineTo(w / 2, -h / 2);
            c.moveTo(-w / 2, h / 2); c.lineTo(-w * 0.1, -h * 0.02); c.moveTo(w / 2, h / 2); c.lineTo(w * 0.1, -h * 0.02); c.lineWidth = 2; c.stroke();
            c.beginPath(); c.arc(0, h * 0.06, s * 0.09, 0, TAU); c.fillStyle = P.pop[0]; c.fill(); c.lineWidth = 1.6; c.stroke();   // 封蠟
        }, o);
    }

    // 停止線：物體剛停住時旁邊的兩條小弧線
    function wob(x, y, side, o = {}) {
        const s = o.size || 1;
        fx(0.42, (c, p) => {
            const k = p < 0.3 ? easeOutBack(p / 0.3) : 1 - (p - 0.3) / 0.7;
            c.strokeStyle = palette().ink; c.lineCap = 'round'; c.lineWidth = 2.6 * (1 - p) + 0.6;
            const base = side > 0 ? 0 : Math.PI;
            for (const r of [7, 13]) {
                c.beginPath(); c.arc(x - side * 6, y, r * s * (0.7 + 0.3 * k), base - 0.55 * k, base + 0.55 * k); c.stroke();
            }
        }, o);
    }

    // 煙圈：凹凸不平的圓環，邊擴散邊變細
    function donut(x, y, R, o = {}) {
        const ph = Math.random() * TAU, n = 9;
        fx(0.55, (c, p) => {
            const P = palette(), g = 0.55 + 0.6 * easeOut(p), th = 9 * (1 - p) + 0.5;
            c.beginPath();
            for (let i = 0; i <= 48; i++) {
                const a = (i / 48) * TAU, r = R * g * (1 + 0.08 * Math.sin(n * a + ph + p * 3));
                i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
            }
            c.closePath();
            c.lineJoin = 'round';
            c.lineWidth = th + 4; c.strokeStyle = P.smokeLine; c.stroke();
            c.lineWidth = th; c.strokeStyle = P.ring; c.stroke();
        }, o);
    }

    // 水晶碎片：長條菱形加一條邊線，邊翻滾邊被拋出、落下
    function shards(x, y, o = {}) {
        const n = o.count || 7, dir = o.angle ?? -Math.PI / 2, arc = o.arc ?? Math.PI * 0.9, life = o.life || 0.75;
        const bits = Array.from({ length: n }, (_, i) => {
            const a = dir + (n > 1 ? (i / (n - 1) - 0.5) : 0) * arc + rand(-0.12, 0.12), sp = rand(0.6, 1.1) * (o.speed || 210);
            return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, spin: rand(-14, 14), s: rand(0.7, 1.3) * (o.size || 6), ci: i };
        });
        return fx(life, (c, p) => {
            const P = palette(), t = p * life;
            for (const b of bits) {
                const k = 1 - easeOut(clamp((p - 0.45) / 0.55)), s = b.s * k;
                if (s < 0.4) continue;
                c.save(); c.translate(x + b.vx * t, y + b.vy * t + 420 * t * t); c.rotate(b.spin * t);
                c.beginPath(); c.moveTo(0, -s * 1.9); c.lineTo(s * 0.75, 0); c.lineTo(0, s * 1.9); c.lineTo(-s * 0.75, 0); c.closePath();
                c.fillStyle = P.pop[b.ci % P.pop.length]; c.fill();
                c.lineWidth = 1.6; c.strokeStyle = P.outline; c.stroke();
                c.beginPath(); c.moveTo(0, -s * 1.9); c.lineTo(0, s * 1.9); c.strokeStyle = P.paper; c.lineWidth = 1; c.stroke();
                c.restore();
            }
        }, o);
    }

    // 水花：水舌從一條線冒起再落下，尖端帶泡沫，水滴飛散
    function splash(x, y, o = {}) {
        const w = o.width || 40, h = o.height || 34, life = o.life || 0.7, n = o.count || 7;
        const tongues = Array.from({ length: n }, (_, i) => ({ dx: (i / (n - 1) - 0.5) * w * 2, hh: h * rand(0.55, 1.1) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.7), lean: (i / (n - 1) - 0.5) * 0.9 }));
        const drops = Array.from({ length: 8 }, () => ({ vx: rand(-160, 160), vy: rand(-280, -150), r: rand(2, 4.5) }));
        return fx(life, (c, p) => {
            const P = palette(), t = p * life, rise = p < 0.4 ? easeOutBack(p / 0.4) : 1 - easeInOut((p - 0.4) / 0.6);
            c.lineJoin = 'round';
            for (const g of tongues) {
                const hh = g.hh * rise, bw = 5 * (1 - p * 0.6) + 1.5;
                if (hh < 1) continue;
                const tx = x + g.dx + g.lean * hh, ty = y - hh;
                c.beginPath(); c.moveTo(x + g.dx - bw, y); c.quadraticCurveTo(x + g.dx - bw * 0.3 + g.lean * hh * 0.4, y - hh * 0.6, tx, ty);
                c.quadraticCurveTo(x + g.dx + bw * 0.3 + g.lean * hh * 0.4, y - hh * 0.6, x + g.dx + bw, y); c.closePath();
                c.fillStyle = P.shade; c.fill(); c.lineWidth = 2; c.strokeStyle = P.outline; c.stroke();
                c.beginPath(); c.arc(tx, ty, bw * 0.9, 0, TAU); c.fillStyle = P.paper; c.fill(); c.stroke();
            }
            for (const d of drops) {
                const r = d.r * (1 - p);
                if (r < 0.4) continue;
                c.beginPath(); c.arc(x + d.vx * t, y + d.vy * t + 700 * t * t, r, 0, TAU);
                c.fillStyle = P.slash; c.fill();
            }
        }, o);
    }

    // 橢圓煙圈：貼地擴散的扁圓環
    function ring(x, y, o = {}) {
        const rx = o.rx || 40, ry = o.ry || 12, w = o.width || 5;
        return fx(o.life || 0.5, (c, p) => {
            const P = palette(), s = easeOut(p), lw = w * (1 - p);
            c.beginPath(); c.ellipse(x, y, rx * (0.3 + s), ry * (0.3 + s), 0, 0, TAU);
            c.strokeStyle = P.outline; c.lineWidth = lw + 2.4; c.stroke();
            if (lw > 0.3) { c.strokeStyle = P.ring; c.lineWidth = lw; c.stroke(); }
        }, o);
    }

    // 飄走的煙圈：帶彈性長出來的甜甜圈，邊飄邊縮
    function smokeRing(x, y, o = {}) {
        const r = o.r || 18, vx = o.vx ?? rand(-30, 30), vy = o.vy ?? -50, life = o.life || 1, tilt = o.tilt ?? -0.25;
        return fx(life, (c, p, t) => {
            const P = palette(), s = easeOutBack(clamp(t / 0.22)) * (1 - easeInOut(clamp((p - 0.6) / 0.4)));
            if (s < 0.03) return;
            const px = x + vx * easeOut(p) * life, py = y + vy * easeOut(p) * life, hole = 0.42 + 0.22 * p;
            c.translate(px, py); c.rotate(tilt);
            const path = new Path2D();
            path.ellipse(0, 0, r * s, r * s * 0.62, 0, 0, TAU);
            path.ellipse(0, 0, r * s * hole, r * s * 0.62 * hole, 0, TAU, 0);
            c.lineWidth = 3; c.strokeStyle = P.smokeLine; c.stroke(path);
            c.fillStyle = P.smokeShade; c.fill(path, 'evenodd');
            c.save(); c.clip(path, 'evenodd'); c.translate(-2, -3); c.fillStyle = P.smokeLight; c.fill(path, 'evenodd'); c.restore();
        }, o);
    }

    // 打勾：粗勾自己畫出來、落定，停留 hold 秒後縮小消失
    function check(x, y, o = {}) {
        const size = o.size || 26, hold = o.hold ?? 1.2, life = 0.45 + hold + 0.3;
        return fx(life, (c, p, t) => {
            const P = palette(), draw = easeOut(clamp(t / 0.32)), land = t < 0.45 ? easeOutBack(clamp(t / 0.45)) : 1;
            const out = clamp((t - 0.45 - hold) / 0.3), k = land * (1 - easeInOut(out));
            if (k < 0.02) return;
            c.translate(x, y); c.scale(k, k); c.rotate(-0.08);
            const pts = [[-size * 0.5, 0], [-size * 0.12, size * 0.38], [size * 0.55, -size * 0.45]];
            const L1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), L2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
            const d = draw * (L1 + L2);
            c.beginPath(); c.moveTo(...pts[0]);
            if (d <= L1) c.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * d / L1, pts[0][1] + (pts[1][1] - pts[0][1]) * d / L1);
            else { c.lineTo(...pts[1]); const q = (d - L1) / L2; c.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * q, pts[1][1] + (pts[2][1] - pts[1][1]) * q); }
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.strokeStyle = P.outline; c.lineWidth = size * 0.36; c.stroke();
            c.strokeStyle = P.ring; c.lineWidth = size * 0.2; c.stroke();
        }, o);
    }

    // 月牙繞圈：沿著圓弧掃過去的斬擊（核取方塊用）
    function crescent(x, y, r, o = {}) {
        const a0 = o.start ?? rand(0, TAU), sweep = o.sweep ?? Math.PI * 1.1, w = o.width || 6;
        return fx(o.life || 0.42, (c, p) => {
            const head = easeOut(clamp(p / 0.6)), tail = easeInOut(clamp((p - 0.15) / 0.85));
            if (head - tail < 0.01) return;
            const N = 18, outer = [], inner = [];
            for (let i = 0; i <= N; i++) {
                const v = i / N, u = tail + (head - tail) * v, a = a0 + sweep * u, th = w * Math.sin(Math.PI * v);
                outer.push([x + Math.cos(a) * (r + th), y + Math.sin(a) * (r + th)]);
                inner.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
            }
            c.beginPath(); c.moveTo(...inner[0]);
            for (const pt of outer) c.lineTo(...pt);
            for (let i = inner.length - 1; i >= 0; i--) c.lineTo(...inner[i]);
            c.closePath(); c.fillStyle = o.color || palette().slash; c.fill();
        }, o);
    }

    // ───────── 中文音效字：每個字、每種配色只預先渲染一次 ─────────
    const sfxCache = new Map();
    function sfxImage(id, tone, fill) {
        const P = palette(), key = `${id}|${tone ? 1 : 0}|${fill || ''}|${P.dark ? 1 : 0}|${dpr}`;
        let img = sfxCache.get(key);
        if (img) return img;
        const data = (window.OA_SFX || {})[id];
        if (!data) return null;
        const [w, h, d] = data, pad = 10, path = new Path2D(d);
        const off = document.createElement('canvas');
        off.width = Math.ceil((w + pad * 2) * dpr); off.height = Math.ceil((h + pad * 2) * dpr);
        const o = off.getContext('2d');
        o.scale(dpr, dpr); o.translate(pad, pad);
        o.lineJoin = 'round'; o.lineWidth = 15; o.strokeStyle = P.outline;
        if (P.sfxDepth) {   // 立體厚度：同一字形往右下疊一層
            o.save(); o.translate(5, 6); o.fillStyle = P.sfxDepth; o.stroke(path); o.fill(path); o.restore();
        }
        o.stroke(path);
        o.fillStyle = fill || P.sfxFill(id); o.fill(path);
        if (tone) {   // 網點字：在字形內鋪網點
            o.save(); o.clip(path); o.fillStyle = P.tone;
            for (let yy = 0, row = 0; yy < h + 8; yy += 5.5, row++)
                for (let xx = row % 2 ? 2.75 : 0; xx < w + 8; xx += 5.5) { o.beginPath(); o.arc(xx, yy, 1.5, 0, TAU); o.fill(); }
            o.restore();
        }
        img = { canvas: off, w: w + pad * 2, h: h + pad * 2, inner: h };
        sfxCache.set(key, img);
        return img;
    }

    // 先大一號落下 → 停留時微微晃動 → 縮小淡出
    function sfx(id, x, y, o = {}) {
        const size = o.size || 52, rot = o.rot ?? rand(-0.14, 0.14), tone = !!o.tone;
        x = clamp(x, size, innerWidth - size);
        y = clamp(y, size * 0.6, innerHeight - size * 0.6);
        fx(o.life || 0.85, (c, p) => {
            const img = sfxImage(id, tone, o.fill);
            if (!img) return;
            const land = p < 0.16 ? 1.35 - 0.35 * easeOutBack(p / 0.16) : p > 0.82 ? 1 - 0.35 * easeOut((p - 0.82) / 0.18) : 1;
            const wobble = Math.sin(p * 40) * 0.04 * (1 - p);
            c.globalAlpha = p > 0.82 ? 1 - (p - 0.82) / 0.18 : 1;
            c.translate(x, y); c.rotate(rot + wobble);
            const k = (size / img.inner) * land;
            c.drawImage(img.canvas, (-img.w / 2) * k, (-img.h / 2) * k, img.w * k, img.h * k);
        }, o);
    }

    // ───────── 預設組合：每種控制項一套「打擊」───────────
    const fixedOf = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
            const pos = getComputedStyle(n).position;
            if (pos === 'fixed' || pos === 'sticky' || n.tagName === 'DIALOG') return true;
        }
        return false;
    };
    const PRESETS = {
        // 送出：按鈕彈一下，一封長翅膀的信飛出去，「咻～」，飛遠時閃一下
        send: {
            press: 0.84, k: 520, d: 15, wide: 0.55, nav: 0,
            hit(el, r, b, o) {
                b.sq.v += 4; b.tilt.v += rand(-1, 1) * 40;
                const cx = r.left + r.width / 2, top = r.top, dir = cx < innerWidth * 0.62 ? 1 : -1;
                mail(cx, top + 6, { ...o, dir, size: 46 });
                puff(cx - 18, top, -1, -0.2, { ...o, scale: 0.55, hole: el });
                puff(cx + 18, top, 1, -0.2, { ...o, scale: 0.55, hole: el });
                lines(cx, top + 2, { ...o, angle: Math.PI / 2, spread: 0.55, count: 5, len: 24, dist: 6 });
                later(0.12, () => sfx('xiu', cx - dir * 70, top - 40, { ...o, size: 40 }));
                later(1.15, () => { kira(cx + 230 * dir, top + 6 - 180, 14, o); confetti(cx + 230 * dir, top + 6 - 180, { ...o, count: 10, power: 0.6 }); });
                const label = el.dataset.doneLabel;
                if (label && !el.__sent) {
                    el.__sent = el.textContent;
                    later(0.5, () => { el.textContent = label; });
                    later(2.6, () => { el.textContent = el.__sent; el.__sent = null; });
                }
            },
        },
        // 主要按鈕：迴旋——反色一幀後整顆轉一圈、衝過頭再回正，周圍繞出彩色迴旋弧線，「咻嚕嚕」
        spin: {
            press: 0.82, k: 520, d: 15, wide: 0.55, tk: 150, td: 12, nav: 320,
            hit(el, r, b, o) {
                impactFrame(el);
                b.tilt.to += 360; b.sq.v += 3;
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                swirl(cx, cy, r.width * 0.66, r.height * 1.05, o);
                swirl(cx, cy, r.width * 0.9, r.height * 1.5, { ...o, count: 2, width: 3.5, life: 0.75 });
                kira(r.right + 4, r.top - 4, 14, o);
                kira(r.left - 4, r.bottom + 4, 10, { ...o, delay: 0.12 });
                confetti(cx, cy, { ...o, count: 20, spread: Math.PI, power: 0.9 });
                later(0.06, () => sfx('lulu', cx + r.width * 0.3, r.top < 90 ? r.bottom + 40 : r.top - 40, { ...o, size: 44 }));
            },
        },
        // 主要 CTA：壓扁 → 反色衝擊幀 → 爆炸＋四角煙霧＋指向線＋「咚！」
        impact: {
            press: 0.82, k: 520, d: 15, wide: 0.55, nav: 260,
            hit(el, r, b, o) {
                impactFrame(el);
                b.tilt.v += sign() * 120; b.sq.v += 4;
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                burst(cx, cy, clamp(r.width * 0.62, 46, 130), { ...o, hole: el });
                for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
                    puff(cx + (sx * r.width) / 2, cy + (sy * r.height) / 2, sx, sy * 0.6, { ...o, hole: el });
                ticks(cx, cy, r.height / 2 + 8, o);
                confetti(cx, r.top, { ...o, count: 18 });
                shards(cx, cy, { ...o, count: 6, speed: 240 });
                later(0.28, () => { for (let i = 0; i < 3; i++) smokeRing(cx + (i - 1) * r.width * 0.3, r.top, { ...o, r: rand(11, 16), vx: (i - 1) * 40, vy: rand(-70, -45) }); });
                const below = r.top < 90;
                later(0.05, () => sfx('dong', cx + r.width * 0.22, below ? r.bottom + 40 : r.top - 38, { ...o, size: 50 }));
            },
        },
        // 次要按鈕：輕彈＋閃光＋停止線＋網點「叮！」
        spark: {
            press: 0.88, k: 520, d: 16, wide: 0.5, nav: 180,
            hit(el, r, b, o) {
                b.sq.v += 2.6; b.tilt.v += sign() * 55;
                kira(r.right - 4, r.top + 2, 15, o);
                kira(r.left + 10, r.bottom - 2, 9, { ...o, delay: 0.08 });
                wob(r.left - 6, r.top + r.height / 2, -1, o);
                wob(r.right + 6, r.top + r.height / 2, 1, o);
                confetti(r.right - 10, r.top, { ...o, count: 8, power: 0.7, angle: -Math.PI / 3, spread: 0.8 });
                later(0.04, () => sfx('ding', r.right + 16, r.top - 18, { ...o, size: 34, tone: true }));
            },
        },
        // 漢堡選單：被打歪＋往下射的速度線（呼應選單由上落下）＋「唰！」
        menu: {
            press: 0.8, k: 520, d: 14, wide: 0.5, nav: 0,
            hit(el, r, b, o) {
                b.tilt.v += sign() * 110; b.sq.v += 3.2;
                const cx = r.left + r.width / 2;
                lines(cx, r.bottom - 4, { ...o, angle: Math.PI / 2, spread: 0.55, count: 7, len: 40, dist: 6 });
                puff(r.left, r.top + r.height / 2, -1, 0.2, { ...o, scale: 0.7, hole: el });
                puff(r.right, r.top + r.height / 2, 1, 0.2, { ...o, scale: 0.7, hole: el });
                confetti(cx, r.bottom, { ...o, count: 10, power: 0.6, angle: Math.PI / 2, spread: 0.9 });
                later(0.05, () => sfx('shua', cx - 64, r.bottom + 46, { ...o, size: 48 }));
            },
        },
        // 關閉選單：斬擊劃過＋煙霧＋「啪！」
        close: {
            press: 0.8, k: 520, d: 14, wide: 0.5, nav: 0,
            hit(el, r, b, o) {
                b.tilt.v += 150; b.sq.v += 3;
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                slash(cx - 70, cy - 46, cx + 64, cy + 40, { ...o, width: 9 });
                puff(cx, cy, -0.8, -0.6, { ...o, scale: 0.8, hole: el });
                confetti(cx, cy, { ...o, count: 10, power: 0.8 });
                later(0.04, () => sfx('pa', cx - 90, cy + 50, { ...o, size: 44 }));
            },
        },
        // 主題／設定切換：煙圈＋閃光＋「啪！」
        toggle: {
            press: 0.8, k: 520, d: 14, wide: 0.5, nav: 0,
            hit(el, r, b, o) {
                b.sq.v += 3; b.tilt.v += sign() * 100;
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                donut(cx, cy, r.width * 0.75, { ...o, hole: el });
                kira(r.right, r.top, 12, o);
                kira(r.left, r.bottom, 8, { ...o, delay: 0.1 });
                confetti(cx, r.top, { ...o, count: 12, power: 0.8 });
                later(0.05, () => sfx('pa', cx - 52, r.top < 90 ? r.bottom + 36 : r.top - 30, { ...o, size: 40 }));
            },
        },
        // 分類標籤：小彈＋停止線＋指向線（頻繁操作，不放音效字）
        tag: {
            press: 0.86, k: 560, d: 16, wide: 0.45, nav: 0,
            hit(el, r, b, o) {
                b.sq.v += 2.2;
                wob(r.left - 4, r.top + r.height / 2, -1, { ...o, size: 0.8 });
                wob(r.right + 4, r.top + r.height / 2, 1, { ...o, size: 0.8 });
                ticks(r.left + r.width / 2, r.top + r.height / 2, r.height / 2 + 4, { ...o, len: 12 });
            },
        },
        // 文章卡片：整張輕壓＋斬擊劃過封面＋往右的速度線＋「咻～」→ 跳頁
        card: {
            press: 0.975, k: 420, d: 17, wide: 0.3, tk: 300, td: 16, nav: 340,
            hit(el, r, b, o) {
                b.sq.v += 0.7; b.tilt.v += sign() * 6;
                const img = el.querySelector('.card-cover, img');
                const ir = img ? img.getBoundingClientRect() : r;
                slash(ir.left - 10, ir.bottom - ir.height * 0.15, ir.right + 10, ir.top + ir.height * 0.2, { ...o, width: 12, bend: 0.1, life: 0.42 });
                lines(r.right - 10, r.top + r.height / 2, { ...o, angle: 0, spread: 0, across: Math.min(r.height * 0.7, 220), count: 6, len: 60, dist: 0 });
                confetti(ir.right - 20, ir.top + 10, { ...o, count: 12, power: 0.8, angle: -Math.PI / 4, spread: 0.9 });
                const title = el.querySelector('.card-title') || el;
                const tr = title.getBoundingClientRect();
                later(0.06, () => sfx('xiu', Math.min(tr.right, r.right) - 40, tr.top - 22, { ...o, size: 46 }));
            },
        },
        // 返回／上一頁：往左倒＋往左的速度線＋煙霧被甩在後面＋「咻～」
        back: {
            press: 0.86, k: 520, d: 15, wide: 0.5, nav: 240,
            hit(el, r, b, o) {
                b.tilt.v -= 120; b.sq.v += 3;
                const cy = r.top + r.height / 2;
                lines(r.left + 4, cy, { ...o, angle: Math.PI, spread: 0, across: r.height * 1.4, count: 5, len: 44, dist: 0 });
                puff(r.right, cy, 1, 0.1, { ...o, scale: 0.75, hole: el });
                confetti(r.left, cy, { ...o, count: 8, power: 0.6, angle: Math.PI + 0.4, spread: 0.6 });
                later(0.04, () => sfx('xiu', r.left + r.width / 2, r.top < 90 ? r.bottom + 38 : r.top - 32, { ...o, size: 40 }));
            },
        },
        // Dock 圖示：小彈＋閃光＋指向線
        dock: {
            press: 0.82, k: 540, d: 15, wide: 0.5, nav: 180,
            hit(el, r, b, o) {
                b.sq.v += 2.8; b.tilt.v += sign() * 70;
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                ticks(cx, cy, r.height / 2 + 4, { ...o, len: 12 });
                kira(r.right - 2, r.top + 2, 10, o);
                confetti(cx, r.top, { ...o, count: 6, power: 0.5 });
            },
        },
        // 選單項目：輕壓＋往右的速度線
        menuitem: {
            press: 0.97, k: 480, d: 16, wide: 0.3, tk: 320, td: 16, nav: 240,
            hit(el, r, b, o) {
                b.sq.v += 0.9; b.tilt.v += sign() * 4;
                lines(r.right - 24, r.top + r.height / 2, { ...o, angle: 0, spread: 0, across: r.height * 0.6, count: 4, len: 40, dist: 0 });
                ticks(r.right - 14, r.top + r.height / 2, 14, { ...o, angle: -Math.PI / 2, count: 3, len: 10 });
            },
        },
    };

    // 依網站既有 class 自動套用（data-auto 開啟）；data-sakuga 永遠優先
    const AUTO = [
        ['dialog.mobile-nav li a', 'menuitem'],
        ['.oa-menu-close', 'close'],
        ['#mobile-menu-btn, .mobile-menu', 'menu'],
        ['.theme-toggle, [data-oa-theme]', 'toggle'],
        ['.btn-primary', 'spin'],
        ['.cta-btn, .nav-cta', 'impact'],
        ['.btn-outline-light, .btn-outline, .read-more-btn, .view-btn, .pf-btn, .demo-btn', 'spark'],
        ['.filter-btn', 'tag'],
        ['.article-card-link', 'card'],
        ['.dock-item', 'dock'],
    ];
    const AUTO_SEL = AUTO.map((a) => a[0]).join(',');
    function resolve(target) {
        if (!(target instanceof Element)) return null;
        const tagged = target.closest('[data-sakuga]');
        const auto = S.auto ? target.closest(AUTO_SEL) : null;
        // 取比較「內層」的那一個
        let el = tagged, name = tagged && tagged.dataset.sakuga;
        if (auto && (!tagged || tagged.contains(auto)) && auto !== tagged) {
            el = auto;
            name = (AUTO.find(([sel]) => auto.matches(sel)) || [])[1];
        }
        if (!el || !name || name === 'off' || !PRESETS[name]) return null;
        if (el.matches(':disabled, [aria-disabled="true"]')) return null;
        return { el, name, preset: PRESETS[name] };
    }

    // ───────── 事件委派 ─────────
    let pressed = null;
    function press(hit) {
        if (reduced()) return;
        const b = wake(hit.el, hit.preset);
        b.sq.to = hit.preset.press; b.held = true;
        pressed = hit.el;
    }
    function release() {
        if (!pressed) return;
        const b = bodyOf(pressed);
        b.sq.to = 1; b.held = false;
        wake(pressed);
        pressed = null;
    }
    const plainClick = (e, a) =>
        e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey &&
        (!a.target || a.target === '_self') && !a.hasAttribute('download') &&
        new URL(a.href, location.href).origin === location.origin &&
        !(a.hash && a.pathname === location.pathname && a.search === location.search);

    /** 直接對元素播放某個預設（不經點擊），回傳是否有播放 */
    function play(el, name = 'impact') {
        const preset = PRESETS[name];
        if (!preset || !el) return false;
        if (reduced()) { ack(el); return false; }
        const b = wake(el, preset);
        b.sq.to = 1; b.held = false;
        const o = fixedOf(el) ? { fixed: true } : {};
        preset.hit(el, el.getBoundingClientRect(), b, o);
        return true;
    }
    function ack(el) {   // 減少動態：保留不帶位移的確認回饋
        el.classList.add('sk-ack');
        setTimeout(() => el.classList.remove('sk-ack'), 160);
    }

    document.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const hit = resolve(e.target);
        if (hit) press(hit);
    }, true);
    for (const t of ['pointerup', 'pointercancel', 'dragstart']) document.addEventListener(t, release, true);
    document.addEventListener('pointerout', (e) => { if (pressed && e.target === pressed && !pressed.contains(e.relatedTarget)) release(); }, true);
    document.addEventListener('keydown', (e) => {
        if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
        const hit = resolve(e.target);
        if (hit && hit.el === e.target) press(hit);
    }, true);
    document.addEventListener('keyup', release, true);

    document.addEventListener('click', (e) => {
        const hit = resolve(e.target);
        if (!hit) return;
        release();
        const played = play(hit.el, hit.name);
        const a = hit.el.closest('a[href]');
        if (!played || !hit.preset.nav || !a || e.defaultPrevented || !plainClick(e, a)) return;
        // 延後跳頁，讓打擊播完；監聽 sakuga:navigate 並 preventDefault() 可自行接手
        e.preventDefault();
        const delay = Math.round(hit.preset.nav / Math.max(S.timeScale, 0.1));
        const ev = new CustomEvent('sakuga:navigate', { bubbles: true, cancelable: true, detail: { href: a.href, delay, preset: hit.name } });
        if (a.dispatchEvent(ev)) setTimeout(() => location.assign(a.href), delay);
    }, true);

    // 主題切換 → 色票與音效字快取失效
    const watchTheme = () => new MutationObserver(() => { pal = null; sfxCache.clear(); })
        .observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (document.body) watchTheme(); else document.addEventListener('DOMContentLoaded', watchTheme);

    const script = document.currentScript;
    if (script && script.hasAttribute('data-auto')) S.auto = true;

    window.OASakuga = {
        Spring, PRESETS, play, later, reduced,
        /** 把 f(dt) 掛到共用時脈；f 回傳 false 時自動移除。回傳取消函式 */
        drive(f) {
            const w = (dt) => { if (f(dt) === false) frames.delete(w); };
            frames.add(w); start();
            return () => frames.delete(w);
        },
        fx: { puff, burst, ticks, lines, kira, slash, wob, donut, sfx, confetti, shards, splash, ring, smokeRing, check, crescent, blob, swirl, mail },
        palette,
        /** 原始特效註冊：effect(life, (ctx, p, t) => {}, { hole, fixed })；life 可為 Infinity，回傳物件有 kill() */
        effect: fx,
        /** set({ timeScale, reduce, auto }) — reduce: true/false 強制，null 跟隨系統設定 */
        set(opts) { Object.assign(S, opts); },
        get state() { return { ...S, reduced: reduced() }; },
    };
})();
