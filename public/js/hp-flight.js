/* Vuelo 3D tipo dron por la línea de tiempo de Wizarding World (datos del Franchise Brand Barometer). */
(function () {
  const root = document.getElementById('hpfly');
  if (!root) return;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const $ = (s) => root.querySelector(s);
  const H = document.documentElement;
  const lang = () => (H.getAttribute('data-lang') === 'en' ? 'en' : 'es');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // [año, títuloES, títuloEN, taquilla mundial M$, tipo m=principal s=derivada]
  const FILMS = [[2001, 'La piedra filosofal', "Philosopher's Stone", 966.6, 'm'], [2002, 'La cámara secreta', 'Chamber of Secrets', 876.8, 'm'],
    [2004, 'El prisionero de Azkaban', 'Prisoner of Azkaban', 784.8, 'm'], [2005, 'El cáliz de fuego', 'Goblet of Fire', 886.8, 'm'],
    [2007, 'La Orden del Fénix', 'Order of the Phoenix', 937.4, 'm'], [2009, 'El misterio del príncipe', 'Half-Blood Prince', 926.1, 'm'],
    [2010, 'Reliquias de la Muerte 1', 'Deathly Hallows 1', 943.5, 'm'], [2011, 'Reliquias de la Muerte 2', 'Deathly Hallows 2', 1311.8, 'm'],
    [2016, 'Animales fantásticos', 'Fantastic Beasts', 816.0, 's'], [2018, 'Los crímenes de Grindelwald', 'Crimes of Grindelwald', 655.8, 's'],
    [2022, 'Los secretos de Dumbledore', 'Secrets of Dumbledore', 407.2, 's']];
  // [año, carril, cortoES, cortoEN]
  const EV = [[1997, 'stage', 'Primer libro', 'First book'], [1999, 'hito', 'Warner compra el cine', 'Warner buys film rights'],
    [2001, 'game', 'Primer videojuego', 'First video game'], [2007, 'stage', 'Último libro', 'Final book'],
    [2010, 'park', 'Wizarding World Orlando', 'Wizarding World Orlando'], [2012, 'park', 'Studio Tour Londres', 'Studio Tour London'],
    [2014, 'park', 'Diagon Alley · Osaka', 'Diagon Alley · Osaka'], [2016, 'stage', 'El legado maldito', 'The Cursed Child'],
    [2016, 'park', 'Hollywood', 'Hollywood'], [2018, 'stage', 'Broadway', 'Broadway'], [2021, 'park', 'Pekín', 'Beijing'],
    [2023, 'game', 'Hogwarts Legacy', 'Hogwarts Legacy'], [2023, 'park', 'Studio Tour Tokio', 'Studio Tour Tokyo'],
    [2025, 'park', 'Epic Universe', 'Epic Universe'], [2027, 'tv', 'Serie de HBO', 'HBO series']];
  const LANE = {
    stage: ['#FF7A59', 'Libros y teatro', 'Books and stage'], hito: ['#C9CCEA', 'Hito', 'Milestone'],
    game: ['#E0A100', 'Videojuego', 'Video game'], park: ['#19B5A5', 'Parque', 'Theme park'], tv: ['#F472B6', 'Serie (anunciada)', 'Series (announced)']
  };
  const Y0 = 1997, Y1 = 2027, STEP = 70;
  const STOPS = [...new Set([...FILMS.map(f => f[0]), ...EV.map(e => e[0])])].sort((a, b) => a - b);
  const cum = (y) => FILMS.filter(f => f[0] <= y).reduce((a, f) => a + f[3], 0);
  const CUMMAX = cum(9999);
  const zOf = (y) => (y - Y0) * STEP;
  const px = (z) => Math.sin(z / 260) * 46;

  // Escena
  const boxes = [];
  FILMS.forEach(f => {
    const z = zOf(f[0]);
    boxes.push({ x: px(z) - 44, z, w: 9, h: 14 + f[3] / 1311.8 * 96, film: f,
      c: f[4] === 'm' ? ['#4338CA', '#3730A3', '#8B8CF8'] : ['#0E8F82', '#0A6E63', '#5EE3CF'] });
  });
  const seen = {};
  EV.forEach(e => {
    const k = e[0]; seen[k] = (seen[k] || 0) + 1;
    const z = zOf(e[0]) + (seen[k] - 1) * 22;
    const col = LANE[e[1]][0];
    boxes.push({ x: px(z) + 44, z, w: 2.5, h: 34, ev: e, c: [col, col, col], pin: true });
  });

  let W = 0, Hh = 0, DPR = 1, F = 500;
  function resize() {
    const r = root.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; Hh = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(Hh * DPR);
    cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
    F = Math.max(W, Hh * 1.2) * 0.9;
  }

  // Cámara
  let cam = { C: [0, 0, 0], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1] };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function setCam(year, t) {
    const z = zOf(year);
    const C = [px(z - 260) * 0.6 + 70 + Math.sin(t / 2600) * 12, 150 + Math.sin(t / 3100) * 8, z - 260];
    const T = [px(z + 40) - 6, 18, z + 90];
    const f = norm(sub(T, C)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    cam = { C, r, u, f };
  }
  const toCam = (P) => { const d = sub(P, cam.C); return [dot(d, cam.r), dot(d, cam.u), dot(d, cam.f)]; };
  const proj = (c) => [W / 2 + c[0] * F / c[2], Hh * 0.56 - c[1] * F / c[2]];
  const NEAR = 8, FAR = 1500;
  const fog = (z) => Math.max(0, Math.min(1, 1 - (z - 500) / (FAR - 500)));

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

  function drawBox(b) {
    const x0 = b.x - b.w, x1 = b.x + b.w, z0 = b.z - b.w, z1 = b.z + b.w, h = b.h;
    const V = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]].map(toCam);
    if (V.some(v => v[2] < NEAR)) return;
    const P = V.map(proj);
    const faces = [[[4, 5, 6, 7], [0, 1, 0], 2], [[0, 1, 5, 4], [0, 0, -1], 0], [[1, 2, 6, 5], [1, 0, 0], 1], [[3, 0, 4, 7], [-1, 0, 0], 1], [[2, 3, 7, 6], [0, 0, 1], 1]];
    const center = [b.x, h / 2, b.z];
    const a = fog(dot(sub(center, cam.C), cam.f));
    faces.forEach(([idx, n, ci]) => {
      const fc = [b.x + n[0] * b.w, n[1] ? h : h / 2, b.z + n[2] * b.w];
      if (dot(n, sub(cam.C, fc)) <= 0) return;
      ctx.globalAlpha = a * (b.pin ? .9 : 1);
      ctx.fillStyle = b.c[ci];
      ctx.beginPath(); idx.forEach((i, k) => k ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1])); ctx.closePath(); ctx.fill();
    });
    return { top: proj(toCam([b.x, h, b.z])), depth: dot(sub(center, cam.C), cam.f), a };
  }

  function label(pt, depth, a, lines, color, active) {
    if (depth > 900) return;
    const s = Math.max(.72, Math.min(1.25, 420 / depth));
    ctx.globalAlpha = a * (active ? 1 : .78);
    ctx.font = `700 ${Math.round(12 * s)}px "DM Sans",system-ui,sans-serif`;
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16 * s;
    const hh = (lines.length * 15 + 8) * s;
    const x = Math.max(6, Math.min(W - w - 6, pt[0] - w / 2)), y = Math.max(6, pt[1] - hh - 10 * s);
    ctx.fillStyle = active ? '#ffffff' : 'rgba(28,31,66,.92)';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, hh, 8 * s) : ctx.rect(x, y, w, hh); ctx.fill();
    ctx.fillStyle = active ? '#14162E' : '#E6E8F5';
    lines.forEach((l, i) => { ctx.fillStyle = i === 0 ? color : (active ? '#14162E' : '#E6E8F5'); ctx.fillText(l, x + 8 * s, y + (16 + i * 15) * s); });
  }

  // Estado de vuelo
  let si = 0, from = STOPS[0], to = STOPS[0], tMove = 0, phase = 'hold', tPhase = 0, last = 0, running = false, curYear = STOPS[0];
  const MOVE = 1500, HOLD = 1900, END = 2600;
  const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  function hud(year) {
    const L = lang();
    $('.hy').textContent = year;
    const items = [];
    FILMS.filter(f => f[0] === year).forEach(f => items.push(`<li><i style="background:${f[4] === 'm' ? '#8B8CF8' : '#5EE3CF'}"></i><span>${L === 'es' ? 'Película' : 'Film'} · <b>${L === 'es' ? f[1] : f[2]}</b> · ${Math.round(f[3]).toLocaleString(L)} M$</span></li>`));
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
    if (phase === 'hold' && tPhase > (si === STOPS.length - 1 ? END : HOLD)) {
      from = STOPS[si]; si = (si + 1) % STOPS.length; to = STOPS[si]; phase = 'move'; tPhase = 0;
    }
    if (phase === 'move') {
      const k = Math.min(1, tPhase / (to < from ? 2200 : MOVE));
      curYear = from + (to - from) * ease(k);
      if (k >= 1) { phase = 'hold'; tPhase = 0; curYear = to; hud(to); }
    }
    render(t);
    requestAnimationFrame(frame);
  }

  function render(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, Hh);
    g.addColorStop(0, '#0E1030'); g.addColorStop(.55, '#1B1E48'); g.addColorStop(1, '#14162E');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    const glow = ctx.createRadialGradient(W * .7, Hh * .2, 0, W * .7, Hh * .2, W * .7);
    glow.addColorStop(0, 'rgba(109,91,240,.35)'); glow.addColorStop(1, 'rgba(109,91,240,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, Hh);
    setCam(curYear, t || 0);
    const cz = zOf(curYear);
    // Rejilla
    const zA = Math.floor((cz - 200) / STEP) * STEP, zB = cz + FAR;
    for (let z = zA; z <= zB; z += STEP) seg([-260, 0, z], [260, 0, z], 'rgba(139,140,248,.16)', 1);
    for (let x = -260; x <= 260; x += 52) seg([x, 0, zA], [x, 0, zB], 'rgba(139,140,248,.12)', 1);
    // Camino
    for (let z = Math.max(0, zA); z < Math.min(zOf(Y1), zB); z += 14) seg([px(z), .2, z], [px(z + 14), .2, z + 14], 'rgba(244,245,251,.45)', 2);
    // Curva de crecimiento (taquilla acumulada)
    const gy = (y) => 6 + cum(y) / CUMMAX * 120;
    for (let y = Y0; y < Y1; y++) {
      const z1 = zOf(y), z2 = zOf(y + 1);
      if (z2 < zA || z1 > zB) continue;
      const done = y + 1 <= curYear + .01;
      const q = [[px(z1), 0, z1], [px(z2), 0, z2], [px(z2), gy(y + 1), z2], [px(z1), gy(y), z1]].map(toCam);
      if (q.every(v => v[2] > NEAR)) {
        const P = q.map(proj); ctx.globalAlpha = fog(q[0][2]) * (done ? .32 : .08);
        ctx.fillStyle = '#FF7A59'; ctx.beginPath(); P.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fill();
      }
      seg([px(z1), gy(y), z1], [px(z2), gy(y + 1), z2], done ? '#FFB8A6' : 'rgba(255,184,166,.35)', done ? 3.5 : 2);
    }
    // Hitos de años
    ctx.textAlign = 'left';
    for (let y = Y0; y <= Y1; y++) {
      if (y < curYear - .5 || y > curYear + 8) continue;
      const c = toCam([px(zOf(y)) + 104, 0, zOf(y)]);
      if (c[2] < NEAR || c[2] > FAR) continue;
      const p = proj(c), s = Math.min(1.15, 330 / c[2]);
      ctx.globalAlpha = fog(c[2]) * (Math.abs(y - curYear) < .5 ? 1 : .5);
      ctx.fillStyle = Math.abs(y - curYear) < .5 ? '#FFFFFF' : '#8B8CF8';
      ctx.font = `800 ${Math.round(20 * s)}px "Bricolage Grotesque",system-ui,sans-serif`;
      ctx.fillText(String(y), p[0], p[1]);
    }
    // Cajas ordenadas por profundidad
    const vis = boxes.map(b => ({ b, d: dot(sub([b.x, 0, b.z], cam.C), cam.f) })).filter(o => o.d > NEAR && o.d < FAR).sort((a, b) => b.d - a.d);
    const L = lang(), labs = [];
    vis.forEach(({ b }) => {
      const r = drawBox(b);
      if (!r) return;
      const yr = b.film ? b.film[0] : b.ev[0];
      const active = Math.abs(yr - curYear) < .5;
      if (b.pin) {
        const tp = r.top; ctx.globalAlpha = r.a; ctx.fillStyle = b.c[0];
        const s = Math.min(1.5, 360 / r.depth); ctx.beginPath(); ctx.arc(tp[0], tp[1], 6 * s, 0, 7); ctx.fill();
        labs.push([tp, r.depth, r.a, [LANE[b.ev[1]][L === 'es' ? 1 : 2].toUpperCase(), L === 'es' ? b.ev[2] : b.ev[3]], b.c[0], active]);
      } else {
        labs.push([r.top, r.depth, r.a, [`${Math.round(b.film[3])} M$`, L === 'es' ? b.film[1] : b.film[2]], b.film[4] === 'm' ? '#8B8CF8' : '#0E8F82', active]);
      }
    });
    labs.forEach(l => { if (l[5]) label(...l); });
    ctx.globalAlpha = 1;
  }

  function start() { if (running || reduce) return; running = true; last = 0; requestAnimationFrame(frame); }
  function stop() { running = false; }
  resize(); hud(STOPS[0]);
  if (reduce) { curYear = 2011; hud(2011); render(0); }
  else render(0);
  new ResizeObserver(() => { resize(); render(performance.now()); }).observe(root);
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()), { threshold: .15 }).observe(root);
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => { hud(Math.round(curYear)); render(performance.now()); }));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render(performance.now()));
})();
