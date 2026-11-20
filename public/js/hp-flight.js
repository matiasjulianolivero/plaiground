/* Vuelo cinematográfico tipo dron por la línea de tiempo de Wizarding World (datos del Franchise Brand Barometer). */
(function () {
  const root = document.getElementById('hpfly');
  if (!root) return;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const $ = (s) => root.querySelector(s);
  const H = document.documentElement;
  const lang = () => (H.getAttribute('data-lang') === 'en' ? 'en' : 'es');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FILMS = [[2001, 'La piedra filosofal', "Philosopher's Stone", 966.6, 'm'], [2002, 'La cámara secreta', 'Chamber of Secrets', 876.8, 'm'],
    [2004, 'El prisionero de Azkaban', 'Prisoner of Azkaban', 784.8, 'm'], [2005, 'El cáliz de fuego', 'Goblet of Fire', 886.8, 'm'],
    [2007, 'La Orden del Fénix', 'Order of the Phoenix', 937.4, 'm'], [2009, 'El misterio del príncipe', 'Half-Blood Prince', 926.1, 'm'],
    [2010, 'Reliquias de la Muerte 1', 'Deathly Hallows 1', 943.5, 'm'], [2011, 'Reliquias de la Muerte 2', 'Deathly Hallows 2', 1311.8, 'm'],
    [2016, 'Animales fantásticos', 'Fantastic Beasts', 816.0, 's'], [2018, 'Los crímenes de Grindelwald', 'Crimes of Grindelwald', 655.8, 's'],
    [2022, 'Los secretos de Dumbledore', 'Secrets of Dumbledore', 407.2, 's']];
  const EV = [[1997, 'stage', 'Primer libro', 'First book'], [1999, 'hito', 'Warner compra el cine', 'Warner buys film rights'],
    [2001, 'game', 'Primer videojuego', 'First video game'], [2007, 'stage', 'Último libro', 'Final book'],
    [2010, 'park', 'Wizarding World Orlando', 'Wizarding World Orlando'], [2012, 'park', 'Studio Tour Londres', 'Studio Tour London'],
    [2014, 'park', 'Diagon Alley · Osaka', 'Diagon Alley · Osaka'], [2016, 'stage', 'El legado maldito', 'The Cursed Child'],
    [2016, 'park', 'Hollywood', 'Hollywood'], [2018, 'stage', 'Broadway', 'Broadway'], [2021, 'park', 'Pekín', 'Beijing'],
    [2023, 'game', 'Hogwarts Legacy', 'Hogwarts Legacy'], [2023, 'park', 'Studio Tour Tokio', 'Studio Tour Tokyo'],
    [2025, 'park', 'Epic Universe', 'Epic Universe'], [2027, 'tv', 'Serie de HBO', 'HBO series']];
  const LANE = {
    stage: ['#FF7A59', 'Libros y teatro', 'Books and stage'], hito: ['#E6E8F5', 'Hito', 'Milestone'],
    game: ['#FFC94D', 'Videojuego', 'Video game'], park: ['#3FE0CC', 'Parque', 'Theme park'], tv: ['#F472B6', 'Serie (anunciada)', 'Series (announced)']
  };
  const Y0 = 1997, Y1 = 2027, STEP = 150;
  const STOPS = [...new Set([...FILMS.map(f => f[0]), ...EV.map(e => e[0])])].sort((a, b) => a - b);
  const cum = (y) => FILMS.filter(f => f[0] <= y).reduce((a, f) => a + f[3], 0);
  const CUMMAX = cum(9999);
  const zOf = (y) => (y - Y0) * STEP;
  const px = (z) => Math.sin(z / 420) * 70;
  const dpx = (z) => Math.cos(z / 420) * 70 / 420;

  const towers = FILMS.map(f => {
    const z = zOf(f[0]);
    return { x: px(z) - 58, z, w: 10, h: 20 + f[3] / 1311.8 * 105, film: f, main: f[4] === 'm' };
  });
  const pins = []; const seen = {};
  EV.forEach(e => {
    seen[e[0]] = (seen[e[0]] || 0) + 1;
    const z = zOf(e[0]) + (seen[e[0]] - 1) * 34;
    pins.push({ x: px(z) + 58, z, h: 30 + (seen[e[0]] - 1) * 14, ev: e, c: LANE[e[1]][0] });
  });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const DUST = Array.from({ length: 170 }, () => ({ x: (rnd() - .5) * 520, y: 6 + rnd() * 190, z: rnd() * (zOf(Y1) + 600) - 200, s: .6 + rnd() * 1.6, p: rnd() * 6.28 }));
  const STARS = Array.from({ length: 120 }, () => ({ x: rnd(), y: rnd() * .9, s: .4 + rnd() * 1.2, p: rnd() * 6.28 }));
  const CASTLE = (() => {
    const t = []; let x = 0;
    while (x < 1) { const w = .008 + rnd() * .016, h = .02 + rnd() * .06; if (x > .18 && x < .82 || rnd() < .25) t.push([x, w, h, rnd() < .6]); x += w + .004 + rnd() * .03; }
    return t;
  })();

  let W = 0, Hh = 0, DPR = 1, F = 500;
  function resize() {
    const r = root.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; Hh = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(Hh * DPR);
    cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
    F = Math.max(W, Hh * 1.25) * 0.85;
  }

  let cam = { C: [0, 0, 0], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1] };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function setCam(year, t) {
    const z = zOf(year);
    const C = [px(z - 230) + 46 + Math.sin(t / 2300) * 10, 118 + Math.sin(t / 2900) * 9, z - 230];
    const T = [px(z + 80), 26, z + 110];
    const f = norm(sub(T, C)); const r = norm(cross(f, [0, 1, 0])); const u = cross(r, f);
    const roll = -dpx(z) * 0.9 + Math.sin(t / 3700) * .02;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    cam = { C, f,
      r: [r[0] * cr + u[0] * sr, r[1] * cr + u[1] * sr, r[2] * cr + u[2] * sr],
      u: [u[0] * cr - r[0] * sr, u[1] * cr - r[1] * sr, u[2] * cr - r[2] * sr] };
  }
  const toCam = (P) => { const d = sub(P, cam.C); return [dot(d, cam.r), dot(d, cam.u), dot(d, cam.f)]; };
  const proj = (c) => [W / 2 + c[0] * F / c[2], Hh * 0.52 - c[1] * F / c[2]];
  const NEAR = 10, FAR = 1900;
  const fog = (z) => Math.max(0, Math.min(1, 1 - (z - 700) / (FAR - 700)));

  function seg(a, b, color, width) {
    let A = toCam(a), B = toCam(b);
    if (A[2] < NEAR && B[2] < NEAR) return;
    if (A[2] < NEAR) { const k = (NEAR - A[2]) / (B[2] - A[2]); A = A.map((v, i) => v + (B[i] - v) * k); }
    if (B[2] < NEAR) { const k = (NEAR - B[2]) / (A[2] - B[2]); B = B.map((v, i) => v + (A[i] - v) * k); }
    const p = proj(A), q = proj(B);
    ctx.globalAlpha = fog((A[2] + B[2]) / 2);
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
  }
  function glow(x, y, r, color, a) {
    if (!(r > 0) || a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function poly(P) { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }

  function drawTower(b, active, t) {
    const w = b.w, h = b.h, x0 = b.x - w, x1 = b.x + w, z0 = b.z - w, z1 = b.z + w;
    const V = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]].map(toCam);
    if (V.some(v => v[2] < NEAR)) return null;
    const P = V.map(proj);
    const depth = dot(sub([b.x, h / 2, b.z], cam.C), cam.f), a = fog(depth);
    const base = b.main ? ['#2B23A8', '#8B8CF8', '#C7C8FF'] : ['#07655B', '#3FE0CC', '#B8FFF4'];
    const g0 = proj(toCam([b.x, 0, b.z]));
    ctx.globalCompositeOperation = 'lighter';
    glow(g0[0], g0[1], 900 / depth * (active ? 2.2 : 1.4), b.main ? 'rgba(139,140,248,.55)' : 'rgba(63,224,204,.5)', a);
    ctx.globalCompositeOperation = 'source-over';
    const faces = [[[0, 1, 5, 4], [0, 0, -1], .85], [[1, 2, 6, 5], [1, 0, 0], .6], [[3, 0, 4, 7], [-1, 0, 0], .6], [[2, 3, 7, 6], [0, 0, 1], .5]];
    faces.forEach(([idx, n, k]) => {
      const fc = [b.x + n[0] * w, h / 2, b.z + n[2] * w];
      if (dot(n, sub(cam.C, fc)) <= 0) return;
      const pb = P[idx[0]], pt = P[idx[3]];
      const gr = ctx.createLinearGradient(pb[0], pb[1], pt[0], pt[1]);
      gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]);
      ctx.globalAlpha = Math.min(1, a * k + (active ? .1 : 0)); ctx.fillStyle = gr; poly(idx.map(i => P[i])); ctx.fill();
      ctx.globalAlpha = a * .5; ctx.strokeStyle = base[2]; ctx.lineWidth = .8; ctx.stroke();
    });
    ctx.globalAlpha = a; ctx.fillStyle = base[2]; poly([4, 5, 6, 7].map(i => P[i])); ctx.fill();
    const top = proj(toCam([b.x, h, b.z]));
    ctx.globalCompositeOperation = 'lighter';
    glow(top[0], top[1], 520 / depth * (active ? 2.4 : 1.2), b.main ? 'rgba(199,200,255,.9)' : 'rgba(184,255,244,.9)', a);
    if (active) {
      const skyC = toCam([b.x, h + 260, b.z]);
      if (skyC[2] > NEAR) {
        const sky = proj(skyC), bw = 1400 / depth;
        const gb = ctx.createLinearGradient(top[0], top[1], sky[0], sky[1]);
        gb.addColorStop(0, b.main ? 'rgba(139,140,248,.55)' : 'rgba(63,224,204,.5)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = .8 + Math.sin(t / 300) * .15; ctx.fillStyle = gb;
        ctx.beginPath(); ctx.moveTo(top[0] - bw, top[1]); ctx.lineTo(top[0] + bw, top[1]); ctx.lineTo(sky[0] + bw * .2, sky[1]); ctx.lineTo(sky[0] - bw * .2, sky[1]); ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    return { top, depth, a };
  }

  function drawPin(p, active, t) {
    const c0 = toCam([p.x, 0, p.z]), c1 = toCam([p.x, p.h + Math.sin(t / 600 + p.z) * 3, p.z]);
    if (c0[2] < NEAR || c1[2] < NEAR) return null;
    const a = fog(c0[2]), g = proj(c0), o = proj(c1), s = 360 / c0[2];
    ctx.globalAlpha = a * .7; ctx.strokeStyle = p.c; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(o[0], o[1]); ctx.stroke();
    const ring = ((t / 1400 + p.z * .01) % 1);
    ctx.globalAlpha = a * (1 - ring) * .8;
    ctx.beginPath(); ctx.ellipse(g[0], g[1], 26 * s * (0.3 + ring), 8 * s * (0.3 + ring), 0, 0, 7); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    glow(o[0], o[1], 34 * s * (active ? 1.8 : 1), p.c, a * .9);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o[0], o[1], 4.2 * s, 0, 7); ctx.fill();
    return { top: o, depth: c0[2], a };
  }

  function label(pt, depth, a, lines, color) {
    const s = Math.max(.8, Math.min(1.2, 420 / depth));
    ctx.globalAlpha = a;
    ctx.font = `700 ${Math.round(12.5 * s)}px "DM Sans",system-ui,sans-serif`;
    ctx.textAlign = 'left';
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 18 * s;
    const hh = (lines.length * 15 + 9) * s;
    const x = Math.max(6, Math.min(W - w - 6, pt[0] - w / 2)), y = Math.max(Hh * .24, pt[1] - hh - 14 * s);
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, hh, 9 * s) : ctx.rect(x, y, w, hh); ctx.fill();
    lines.forEach((l, i) => { ctx.fillStyle = i === 0 ? color : '#14162E'; ctx.fillText(l, x + 9 * s, y + (16.5 + i * 15) * s); });
  }

  let si = 0, from = STOPS[0], to = STOPS[0], phase = 'hold', tPhase = 0, last = 0, running = false, curYear = STOPS[0];
  const MOVE = 1150, HOLD = 1450, FIRST = 450, END = 2200, BACK = 1800;
  const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  function hud(year) {
    const L = lang();
    $('.hy').textContent = year;
    const items = [];
    FILMS.filter(f => f[0] === year).forEach(f => items.push(`<li><i style="background:${f[4] === 'm' ? '#8B8CF8' : '#3FE0CC'}"></i><span>${L === 'es' ? 'Película' : 'Film'} · <b>${L === 'es' ? f[1] : f[2]}</b> · ${Math.round(f[3]).toLocaleString(L)} M$</span></li>`));
    EV.filter(e => e[0] === year).forEach(e => items.push(`<li><i style="background:${LANE[e[1]][0]}"></i><span>${LANE[e[1]][L === 'es' ? 1 : 2]} · <b>${L === 'es' ? e[2] : e[3]}</b></span></li>`));
    $('.hl').innerHTML = items.join('');
    const v = cum(year);
    $('.hc b').textContent = (v / 1000).toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (L === 'es' ? ' mil M$' : ' bn $');
    $('.hc i').style.width = (v / CUMMAX * 100) + '%';
    $('.hc small').textContent = L === 'es' ? 'Taquilla acumulada' : 'Cumulative box office';
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(64, t - (last || t)); last = t; tPhase += dt;
    const holdFor = si === 0 ? FIRST : si === STOPS.length - 1 ? END : HOLD;
    if (phase === 'hold' && tPhase > holdFor) {
      from = STOPS[si]; si = (si + 1) % STOPS.length; to = STOPS[si]; phase = 'move'; tPhase = 0;
      $('.hl').innerHTML = '';
    }
    if (phase === 'move') {
      const k = Math.min(1, tPhase / (to < from ? BACK : MOVE));
      curYear = from + (to - from) * ease(k);
      $('.hy').textContent = Math.round(curYear);
      if (k >= 1) { phase = 'hold'; tPhase = 0; curYear = to; hud(to); }
    }
    render(t);
    requestAnimationFrame(frame);
  }

  function render(t) {
    t = t || 0;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'left';
    setCam(curYear, t);
    const hz = toCam([cam.C[0] + cam.f[0] * 6000, 0, cam.C[2] + cam.f[2] * 6000]);
    const horizon = Math.max(Hh * .12, Math.min(Hh * .7, proj(hz)[1]));
    const g = ctx.createLinearGradient(0, 0, 0, Hh);
    g.addColorStop(0, '#07081C'); g.addColorStop(horizon / Hh, '#2A2470'); g.addColorStop(1, '#0B0D24');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    const sx = cam.C[0] * .3;
    ctx.fillStyle = '#fff';
    STARS.forEach(s => {
      const x = ((s.x * W - sx) % W + W) % W, y = s.y * horizon;
      ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(t / 900 + s.p));
      ctx.fillRect(x, y, s.s, s.s);
    });
    ctx.globalCompositeOperation = 'lighter';
    glow(W * .58, horizon, W * .75, 'rgba(255,122,89,.32)', 1);
    glow(W * .28, horizon - 20, W * .55, 'rgba(109,91,240,.45)', 1);
    ctx.globalCompositeOperation = 'source-over';
    const off = -(cam.C[0] * .15);
    ctx.globalAlpha = 1; ctx.fillStyle = '#0B0C26';
    CASTLE.forEach(([x, w, h, roof]) => {
      const X = (x * W * 1.2 + off) - W * .1, Wd = w * W, Hg = h * Hh * .8;
      ctx.fillRect(X, horizon - Hg, Wd, Hg + 2);
      if (roof) { ctx.beginPath(); ctx.moveTo(X - Wd * .15, horizon - Hg); ctx.lineTo(X + Wd / 2, horizon - Hg - Wd * 1.6); ctx.lineTo(X + Wd * 1.15, horizon - Hg); ctx.fill(); }
    });
    ctx.fillStyle = '#FFC94D';
    CASTLE.forEach(([x, w, h], i) => { if (i % 3) return; const X = (x * W * 1.2 + off) - W * .1; ctx.globalAlpha = .5 + .5 * Math.abs(Math.sin(t / 1300 + i)); ctx.fillRect(X + w * W * .4, horizon - h * Hh * .45, 2, 3); });
    ctx.globalAlpha = 1;
    const gg = ctx.createLinearGradient(0, horizon, 0, Hh);
    gg.addColorStop(0, 'rgba(20,22,60,0)'); gg.addColorStop(1, 'rgba(10,11,32,.85)');
    ctx.fillStyle = gg; ctx.fillRect(0, horizon, W, Hh - horizon);
    const cz = zOf(curYear);
    const zA = Math.floor((cz - 260) / STEP) * STEP, zB = cz + FAR;
    for (let z = zA; z <= zB; z += STEP / 2) seg([-420, 0, z], [420, 0, z], 'rgba(139,140,248,.10)', 1);
    for (let x = -420; x <= 420; x += 70) seg([x, 0, zA], [x, 0, zB], 'rgba(139,140,248,.08)', 1);
    ctx.globalCompositeOperation = 'lighter';
    for (let z = Math.max(-60, zA); z < Math.min(zOf(Y1) + 60, zB); z += 18) {
      const lit = z <= cz + 20;
      seg([px(z), .3, z], [px(z + 18), .3, z + 18], lit ? 'rgba(255,201,77,.55)' : 'rgba(255,201,77,.18)', lit ? 5 : 2);
      seg([px(z), .3, z], [px(z + 18), .3, z + 18], lit ? 'rgba(255,240,200,.9)' : 'rgba(255,240,200,.25)', 1.2);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let y = Y0; y <= Y1; y++) {
      if (y < curYear - .6 || y > curYear + 7) continue;
      const c = toCam([px(zOf(y)) + 22, 0, zOf(y)]);
      if (c[2] < NEAR || c[2] > FAR) continue;
      const p = proj(c), s = Math.min(1.25, 300 / c[2]), on = Math.abs(y - curYear) < .5;
      ctx.globalAlpha = fog(c[2]) * (on ? 1 : .55);
      ctx.fillStyle = on ? '#FFE9B0' : '#B3B8FF';
      ctx.font = `800 ${Math.round(18 * s)}px "Bricolage Grotesque",system-ui,sans-serif`;
      ctx.fillText(String(y), p[0], p[1]);
    }
    const gy = (y) => 4 + cum(y) / CUMMAX * 150;
    for (let y = Y0; y < Y1; y++) {
      const z1 = zOf(y), z2 = zOf(y + 1);
      if (z2 < zA || z1 > zB) continue;
      const done = y + 1 <= curYear + .01;
      const q = [[px(z1), 0, z1], [px(z2), 0, z2], [px(z2), gy(y + 1), z2], [px(z1), gy(y), z1]].map(toCam);
      if (q.every(v => v[2] > NEAR)) {
        const P = q.map(proj);
        const gr = ctx.createLinearGradient(0, Math.min(P[2][1], P[3][1]), 0, Math.max(P[0][1], P[1][1]) + 1);
        gr.addColorStop(0, done ? 'rgba(255,122,89,.42)' : 'rgba(255,122,89,.10)'); gr.addColorStop(1, 'rgba(255,122,89,0)');
        ctx.globalAlpha = fog(q[0][2]); ctx.fillStyle = gr; poly(P); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      seg([px(z1), gy(y), z1], [px(z2), gy(y + 1), z2], done ? 'rgba(255,184,166,.95)' : 'rgba(255,184,166,.3)', done ? 3 : 1.5);
      ctx.globalCompositeOperation = 'source-over';
    }
    const tip = toCam([px(cz), gy(Math.floor(curYear + .001)), cz]);
    if (tip[2] > NEAR) { const p = proj(tip); ctx.globalCompositeOperation = 'lighter'; glow(p[0], p[1], 2200 / tip[2], 'rgba(255,200,170,.95)', 1); ctx.globalCompositeOperation = 'source-over'; }
    const objs = [...towers.map(b => ({ b, k: 't' })), ...pins.map(b => ({ b, k: 'p' }))]
      .map(o => ({ ...o, d: dot(sub([o.b.x, 0, o.b.z], cam.C), cam.f) })).filter(o => o.d > NEAR && o.d < FAR).sort((a, b) => b.d - a.d);
    const L = lang(), labs = [];
    objs.forEach(({ b, k }) => {
      const yr = k === 't' ? b.film[0] : b.ev[0], active = Math.abs(yr - curYear) < .5;
      const r = k === 't' ? drawTower(b, active, t) : drawPin(b, active, t);
      if (!r || !active) return;
      labs.push(k === 't'
        ? [r.top, r.depth, r.a, [`${Math.round(b.film[3])} M$`, L === 'es' ? b.film[1] : b.film[2]], b.main ? '#4338CA' : '#0A6E63']
        : [r.top, r.depth, r.a, [LANE[b.ev[1]][L === 'es' ? 1 : 2].toUpperCase(), L === 'es' ? b.ev[2] : b.ev[3]], b.ev[1] === 'hito' ? '#555A7A' : b.ev[1] === 'game' ? '#B7860B' : b.ev[1] === 'park' ? '#0A6E63' : b.c]);
    });
    ctx.globalCompositeOperation = 'lighter';
    DUST.forEach(d => {
      const c = toCam([d.x + px(d.z), d.y + Math.sin(t / 1200 + d.p) * 6, d.z]);
      if (c[2] < NEAR || c[2] > 1100) return;
      const p = proj(c), r = d.s * 260 / c[2];
      glow(p[0], p[1], r * 3, 'rgba(255,233,176,.9)', fog(c[2]) * (.35 + .4 * Math.abs(Math.sin(t / 700 + d.p))));
    });
    ctx.globalCompositeOperation = 'source-over';
    labs.forEach(l => label(...l));
    const vg = ctx.createRadialGradient(W / 2, Hh * .5, Math.min(W, Hh) * .35, W / 2, Hh * .5, Math.max(W, Hh) * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,6,20,.55)');
    ctx.globalAlpha = 1; ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);
  }

  function start() { if (running || reduce) return; running = true; last = 0; requestAnimationFrame(frame); }
  function stop() { running = false; }
  resize(); hud(STOPS[0]);
  if (reduce) { curYear = 2011; hud(2011); }
  render(0);
  new ResizeObserver(() => { resize(); render(performance.now()); }).observe(root);
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()), { threshold: .05, rootMargin: '120px 0px' }).observe(root);
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => { if (phase === 'hold') hud(Math.round(curYear)); render(performance.now()); }));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render(performance.now()));
})();
