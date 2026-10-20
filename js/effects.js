/* Shared UI helpers: DVAGO logo, icon set, glitter particles, bursts, typewriter. */
(function (root) {
  const P = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M10 20v-5h4v5"/>',
    pill: '<path d="M10.5 20.5a5 5 0 01-7-7l7-7a5 5 0 017 7z"/><path d="M8.5 8.5l7 7"/>',
    megaphone: '<path d="M3 11v2a1 1 0 001 1h3l5 4V6L7 10H4a1 1 0 00-1 1z"/><path d="M16 8a5 5 0 010 8M19 5a9 9 0 010 14"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><circle cx="17.5" cy="8.5" r="2.5"/><path d="M18 14c2.5.3 4 1.8 4 4.5"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><rect x="9.5" y="9.5" width="5" height="5"/>',
    truck: '<path d="M1 6h13v10H1zM14 10h4l3 3v3h-7z"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="M16 8l-2 6-6 2 2-6z"/>',
    layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>',
    file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    zap: '<path d="M13 2L3 14h8l-1 8 10-12h-8z"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0014 0v-1M12 18v4M8 22h8"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    volume: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>',
    mute: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
    upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    right: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    camera: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
    link: '<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    kanban: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5z"/><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bell: '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0114.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0020.5 15"/>',
    printer: '<path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>',
    brain: '<path d="M9.5 2A3.5 3.5 0 006 5.5 3.5 3.5 0 003 9a3.5 3.5 0 001 2.5A3.5 3.5 0 003 14a3.5 3.5 0 003 3.5A3.5 3.5 0 009.5 22h.5V2z"/><path d="M14.5 2A3.5 3.5 0 0118 5.5 3.5 3.5 0 0121 9a3.5 3.5 0 01-1 2.5 3.5 3.5 0 011 2.5 3.5 3.5 0 01-3 3.5 3.5 3.5 0 01-3.5 4.5H14V2z"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 16h8M10 13h4"/>',
    wifi: '<path d="M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M2 9a15 15 0 0120 0"/><circle cx="12" cy="19.5" r="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.4L7 22l5-3 5 3-1.2-8.6"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    map: '<path d="M12 22s-8-6-8-13a8 8 0 0116 0c0 7-8 13-8 13z"/><circle cx="12" cy="9" r="3"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    up: '<path d="M18 15l-6-6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>',
    lock: '<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'
  };

  function icon(name, size = 20, extra = '') {
    return `<svg class="ico ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  }

  // DVAGO wordmark: whole wordmark in DVAGO green, with a white halo outline around the heart-check "V".
  // Variants:
  //   logo()                         → green letters + green V + white outline (default)
  //   logo({variant:'white'})        → all white (for dark backgrounds)
  //   logo({color, heartColor, outline:false|'#color'}) → full custom
  function logo(opts = {}) {
    const variant = opts.variant || 'default';
    let c, g, outline;
    if (variant === 'white') { c = '#FFFFFF'; g = '#FFFFFF'; outline = false; }
    else { c = opts.color || '#78B943'; g = opts.heartColor || '#78B943'; outline = opts.outline === false ? false : (opts.outline || '#FFFFFF'); }
    const cls = opts.className || '';
    const outlineLayer = outline ? `
      <g transform="translate(88 6)" fill="none" stroke="${outline}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round">
        <path d="M52 100 L13 50 C-1 31 9 7 31 8 C45 9 52 22 52 36"/>
        <path d="M52 100 L96 10"/>
      </g>` : '';
    return `<svg class="dvago-logo ${cls}" viewBox="0 0 400 118" role="img" aria-label="DVAGO" style="overflow:visible">
      <text x="0" y="104" textLength="84" lengthAdjust="spacingAndGlyphs" fill="${c}" font-family="Poppins, 'Arial Black', sans-serif" font-weight="800" font-size="120">D</text>
      ${outlineLayer}
      <g transform="translate(88 6)" fill="none" stroke="${g}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round">
        <path class="lv-a" d="M52 100 L13 50 C-1 31 9 7 31 8 C45 9 52 22 52 36"/>
        <path class="lv-b" d="M52 100 L96 10"/>
      </g>
      <text x="196" y="104" textLength="204" lengthAdjust="spacingAndGlyphs" fill="${c}" font-family="Poppins, 'Arial Black', sans-serif" font-weight="800" font-size="120">AGO</text>
    </svg>`;
  }

  const reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Twinkling glitter + drifting bokeh on a canvas
  function glitter(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const colors = opts.colors || ['#78B943', '#A8DA7E', '#5A9A2F', '#FFD66B'];
    const density = opts.density || 0.00004;
    let W, H, parts = [], raf, mx = 0, my = 0, running = true;
    const dpr = Math.min(root.devicePixelRatio || 1, 2);
    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H * density) + 30;
      parts = Array.from({ length: n }, () => spawn(true));
    }
    function spawn(init) {
      const star = Math.random() < 0.45;
      return {
        x: Math.random() * W, y: init ? Math.random() * H : H + 10,
        r: star ? 1 + Math.random() * 2.4 : 1 + Math.random() * 3.5,
        vy: -(0.08 + Math.random() * 0.35), vx: (Math.random() - 0.5) * 0.15,
        tw: Math.random() * Math.PI * 2, ts: 0.02 + Math.random() * 0.05,
        c: colors[(Math.random() * colors.length) | 0], star, depth: 0.3 + Math.random()
      };
    }
    function drawStar(x, y, r, a, c) {
      ctx.globalAlpha = a;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 3); ctx.quadraticCurveTo(x, y, x + r * 3, y);
      ctx.quadraticCurveTo(x, y, x, y + r * 3); ctx.quadraticCurveTo(x, y, x - r * 3, y);
      ctx.quadraticCurveTo(x, y, x, y - r * 3); ctx.fill();
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y += p.vy; p.x += p.vx; p.tw += p.ts;
        if (p.y < -12 || p.x < -12 || p.x > W + 12) Object.assign(p, spawn(false));
        const a = 0.25 + 0.75 * Math.abs(Math.sin(p.tw));
        const ox = mx * 14 * p.depth, oy = my * 10 * p.depth;
        if (p.star) drawStar(p.x + ox, p.y + oy, p.r * 0.8, a, p.c);
        else { ctx.globalAlpha = a * 0.35; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x + ox, p.y + oy, p.r, 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    const onMove = (e) => { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; };
    resize();
    root.addEventListener('resize', resize);
    root.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { cancelAnimationFrame(raf); frame(); } });
    if (reduced()) { frame(); running = false; } else frame();
    return { stop() { running = false; cancelAnimationFrame(raf); } };
  }

  // One-shot sparkle/confetti burst
  function burst(x, y, opts = {}) {
    if (reduced()) return;
    const cv = document.createElement('canvas');
    cv.className = 'fx-burst';
    Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 });
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const W = cv.width = innerWidth, H = cv.height = innerHeight;
    x = x == null ? W / 2 : x; y = y == null ? H / 2 : y;
    const colors = opts.colors || ['#78B943', '#B8E994', '#ffffff', '#FFD66B', '#4E8A2A'];
    const ps = Array.from({ length: opts.count || 140 }, () => {
      const ang = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9;
      return { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4, s: 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0], life: 1, shape: Math.random() < 0.5 };
    });
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of ps) {
        p.vy += 0.18; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.009;
        if (p.life <= 0) continue;
        alive++;
        ctx.save(); ctx.globalAlpha = p.life; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.shape) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.4, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      if (alive) requestAnimationFrame(tick); else cv.remove();
    })();
  }

  function typeText(el, text, speed = 22) {
    return new Promise((resolve) => {
      if (reduced()) { el.textContent = text; return resolve(); }
      el.textContent = '';
      let i = 0;
      el.classList.add('typing');
      const id = setInterval(() => {
        el.textContent = text.slice(0, ++i);
        if (i >= text.length) { clearInterval(id); el.classList.remove('typing'); resolve(); }
      }, speed);
      el._typeStop = () => { clearInterval(id); el.textContent = text; el.classList.remove('typing'); resolve(); };
    });
  }

  function countUp(el, to, ms = 1200, suffix = '') {
    const start = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - start) / ms);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(msg, type = 'info', ms = 3200) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML = icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'sparkles', 18) + '<span>' + esc(msg) + '</span>';
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms);
  }

  root.UI = { icon, logo, glitter, burst, typeText, countUp, esc, toast, reduced };
})(window);
