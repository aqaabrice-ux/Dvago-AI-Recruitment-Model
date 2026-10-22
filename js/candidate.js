/* DVAGO candidate portal — SARAH guided interview flow */
(function () {
  const B = window.DVAGO_BANK, I = UI.icon, esc = UI.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const stageEl = $('#stage');
  const SESSION_KEY = 'dvago_session_v2';
  const CLOSED_KEY = 'dvago_closed_v2';
  // Resume parsers are bundled locally (vendor/) so reading never depends on an external CDN;
  // if a local file is ever missing we fall back to the CDN.
  const PDFJS = 'vendor/pdf.min.js';
  const PDFJS_WORKER = 'vendor/pdf.worker.min.js';
  const MAMMOTH = 'vendor/mammoth.browser.min.js';
  const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const MAMMOTH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
  const ANSWER_LIMIT = 120;
  // After the fixed (scored) voice questions SARAH asks a few personalised deep-dive questions. They are NOT scored,
  // so every candidate is still compared on the same core questions; recruiters see them separately.
  const ADAPTIVE_COUNT = 2;
  const ADAPTIVE_BACKUP = ['Tell me about a challenge you faced in your most recent role and how you handled it.', 'Which part of this position do you feel most confident about, and which part would you want support to learn?'];
  const GAME_SECONDS = 40;

  const CITIES = ['Karachi', 'Lahore', 'Multan', 'Hyderabad', 'Bahawalpur', 'Sahiwal', 'Kasur', 'Burewala', 'Vehari', 'Khanewal'];
  const EDUCATION = ['Matric / O-Levels', 'Intermediate / A-Levels', 'Diploma / Certificate', "Bachelor's Degree", "Master's Degree", 'Pharm-D', 'ACCA / CA / CMA'];
  const EXPERIENCE = ['Fresh / No experience', 'Less than 1 year', '1 – 2 years', '3 – 5 years', '5 – 10 years', '10+ years'];
  const ACKS = ['Thank you, that is really helpful.', 'Great, thanks for sharing that.', 'Wonderful, I appreciate the detail.', 'Thank you — that gives me a clear picture.'];

  const STEPS = [
    { label: 'Welcome', stages: ['greet', 'schedule', 'scheduled'] },
    { label: 'Role', stages: ['role', 'position', 'jd'] },
    { label: 'Profile', stages: ['profile'] },
    { label: 'Voice interview', stages: ['syscheck', 'voice'] },
    { label: 'Assessment', stages: ['brief', 'exam'] },
    { label: 'Done', stages: ['processing', 'done'] }
  ];
  // Application mode (resume screening first): the interview link comes later by email, so the journey is shorter.
  const APPLY_STEPS = [
    { label: 'Welcome', stages: ['greet'] },
    { label: 'Role', stages: ['role', 'position', 'jd'] },
    { label: 'Profile', stages: ['profile'] },
    { label: 'Submitted', stages: ['applied'] }
  ];

  let S = null;
  let settings = {};
  let teardown = [];
  const onLeave = (fn) => teardown.push(fn);

  // ---------------- state ----------------
  function newState() {
    return {
      v: 2, stage: 'splash', sessionId: Store.uid('S'), createdAt: new Date().toISOString(),
      inviteToken: null, invite: null, schedule: null, applyMode: false, applied: null,
      candidate: { fullName: '', email: '', phone: '', cnic: '', city: '', education: '', experience: '', employer: '', currentSalary: '', currentPerks: '', expectedSalary: '', linkedin: '' },
      consent: false, resume: null, role: null, position: null, voiceLang: 'en-US', voiceTyping: false,
      voice: [], voiceIdx: 0,
      answers: { sjt: {}, simulation: null, simulationTouched: false, case: {}, caseMode: {}, reasoning: {}, game: null },
      game: null, exam: null,
      integrity: { events: [], tabSwitches: 0, fullscreenExits: 0, pasteAttempts: 0 },
      videoIntro: null,
      submissionId: null, result: null
    };
  }
  function save() {
    if (!S) return;
    // Never persist raw video / voice audio to sessionStorage (too large; kept in memory until submission)
    try {
      const safe = JSON.parse(JSON.stringify(S));
      if (safe.videoIntro && safe.videoIntro.dataUrl) safe.videoIntro = { duration: safe.videoIntro.duration, mime: safe.videoIntro.mime, size: safe.videoIntro.size, dataUrl: null };
      if (Array.isArray(safe.voice)) safe.voice.forEach((v) => { if (v && v.audio && v.audio.dataUrl) v.audio = { mime: v.audio.mime, size: v.audio.size, duration: v.audio.duration, dataUrl: null }; });
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    } catch (e) {
      try {
        const c = JSON.parse(JSON.stringify(S));
        if (c.resume) c.resume.dataUrl = null;
        if (c.videoIntro) c.videoIntro.dataUrl = null;
        if (Array.isArray(c.voice)) c.voice.forEach((v) => { if (v && v.audio) v.audio.dataUrl = null; });
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(c));
      } catch (_) {}
    }
  }
  let saveTimer = null;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); };
  const first = () => ((S && S.candidate.fullName) || '').trim().split(/\s+/)[0] || '';
  const role = () => B.ROLES[S.role];
  const rq = () => S._customRQ || B.roleQuestions(S.role);
  async function fetchAllOverrides(roleKey) {
    const base = B.roleQuestions(roleKey);
    const out = { voice: base.voice, sjt: base.sjt, simulation: base.simulation, caseStudy: base.caseStudy, reasoning: base.reasoning };
    try {
      const [sjt, sim, cs, reas, chal] = await Promise.all([
        Store.listSJT(roleKey).catch(() => null),
        Store.getSimulation(roleKey).catch(() => null),
        Store.getCaseStudy(roleKey).catch(() => null),
        Store.listReasoning().catch(() => null),
        Store.getChallenge(roleKey).catch(() => null)
      ]);
      if (chal && Array.isArray(chal.tiles) && chal.tiles.length >= 4) out.challenge = chal;
      if (Array.isArray(sjt) && sjt.length) out.sjt = (B.COMMON_SJT || []).concat(sjt.filter((q) => !out.sjt.slice(0, (B.COMMON_SJT || []).length).find((cq) => cq.id === q.id)));
      if (sim && sim.title) out.simulation = sim;
      if (cs && cs.questions) out.caseStudy = cs;
      if (Array.isArray(reas) && reas.length) out.reasoning = reas;
      if (S._voiceOverride && S._voiceOverride.length) out.voice = S._voiceOverride;
    } catch (e) {}
    return out;
  }
  const wc = (t) => (String(t || '').trim().match(/\S+/g) || []).length;
  const logEvent = (type, detail) => { S.integrity.events.push({ type, detail: detail || '', t: new Date().toISOString() }); saveSoon(); };

  // ---------------- navigation ----------------
  function go(stage, restoring) {
    teardown.forEach((fn) => { try { fn(); } catch (e) {} });
    teardown = [];
    Voice.stop();
    closeModal();
    S.stage = stage;
    save();
    // Screenshot/copy deterrents run across the whole interview (every stage except the entry/exit screens).
    if (['splash', 'closed', 'loggedout', 'done', 'applied'].includes(stage)) Guard.stop(); else Guard.start();
    if (!restoring) history.pushState({ dvago: stage }, '');
    updateTopbar();
    window.scrollTo({ top: 0 });
    const r = RENDER[stage];
    r ? r() : renderSplash();
  }

  window.addEventListener('popstate', () => {
    if (!S || ['splash', 'closed', 'loggedout'].includes(S.stage)) return;
    history.pushState({ dvago: S.stage }, '');
    UI.toast('Going back is disabled during your interview.', 'info');
  });

  function screen(html, cls = '') {
    stageEl.innerHTML = `<section class="screen ${cls}">${html}</section>`;
    return stageEl.firstElementChild;
  }

  function updateTopbar() {
    const hide = !S || ['splash', 'closed', 'loggedout'].includes(S.stage);
    $('#topbar').classList.toggle('hidden', hide);
    document.body.classList.toggle('with-top', !hide);
    if (hide) return;
    const steps = S.applyMode ? APPLY_STEPS : STEPS;
    const idx = steps.findIndex((s) => s.stages.includes(S.stage));
    $('#tbSteps').innerHTML = steps.map((s, i) => {
      const st = i < idx ? 'done' : i === idx ? 'active' : '';
      return (i ? `<span class="tb-sep ${i <= idx ? 'done' : ''}"></span>` : '') +
        `<span class="tb-step ${st}"><span class="dot">${i < idx ? I('check', 12) : i + 1}</span><span class="lbl">${s.label}</span></span>`;
    }).join('');
    const exam = S.stage === 'exam';
    $('#tbTimer').classList.toggle('hidden', !exam);
    $('#tbProctor').classList.toggle('hidden', !exam);
  }

  function setMuteIcon() { $('#muteBtn').innerHTML = I(Voice.muted ? 'mute' : 'volume', 18); }

  // ---------------- SARAH helpers ----------------
  const orbHTML = (cls = '') => `<div class="orb ${cls}" data-state="idle"><div class="orb-glow"></div><div class="orb-ring r1"></div><div class="orb-ring r2"></div><div class="orb-ring r3"></div><div class="orb-core"></div></div>`;
  const orbState = (orb, st) => orb && orb.setAttribute('data-state', st);

  async function say(text, orb, captionEl) {
    const typing = captionEl ? UI.typeText(captionEl, text, 24) : Promise.resolve();
    await Voice.speak(text, { onstart: () => orbState(orb, 'speaking'), onend: () => orbState(orb, 'idle') });
    if (captionEl && captionEl._typeStop) captionEl._typeStop();
    await typing;
  }

  // ---------------- modal ----------------
  function modal(html) {
    const host = $('#modalHost');
    host.innerHTML = `<div class="glass modal">${html}</div>`;
    host.classList.remove('hidden');
    return host.firstElementChild;
  }
  function closeModal() { const h = $('#modalHost'); if (h) { h.classList.add('hidden'); h.innerHTML = ''; } }

  // ---------------- util ----------------
  const scriptCache = {};
  function loadScript(src) {
    if (!scriptCache[src]) {
      scriptCache[src] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = () => { delete scriptCache[src]; rej(new Error('Failed to load ' + src)); };
        document.head.appendChild(s);
      });
    }
    return scriptCache[src];
  }
  const readAs = (file, how) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; how === 'text' ? r.readAsText(file) : r.readAsDataURL(file); });
  const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await Promise.race([document.documentElement.requestFullscreen({ navigationUI: 'hide' }), new Promise((r) => setTimeout(r, 800))]);
      }
    } catch (e) {}
  }
  function exitFullscreen() { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }

  // ---------------- persistent interview camera ----------------
  // The candidate's camera turns on right after the profile/resume step and stays on
  // (shown as a small, draggable live preview) for the whole interview. The feed is
  // recorded at a low bitrate and uploaded with the submission so HR can review it.
  const REC_BITRATE = 60000; // ~60 kbps: a 40-minute session is ~18 MB, keeping server storage small
  const Cam = {
    stream: null, pip: null, rec: null, chunks: [], recMime: '', startedAt: 0,
    supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },
    active() { return !!(this.stream && this.stream.active); },
    async start() {
      if (this.active()) { this.showPip(); return true; }
      if (!this.supported()) return false;
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 20 }, facingMode: 'user' }, audio: false });
      } catch (e) { console.warn('[camera] unavailable:', e && (e.name || e.message) || e); this.stream = null; return false; }
      this.showPip();
      this.startRec();
      return true;
    },
    startRec() {
      if (!window.MediaRecorder || !this.stream || (this.rec && this.rec.state === 'recording')) return;
      const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      this.recMime = cands.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
      try {
        this.rec = new MediaRecorder(this.stream, this.recMime ? { mimeType: this.recMime, videoBitsPerSecond: REC_BITRATE } : { videoBitsPerSecond: REC_BITRATE });
      } catch (e) { try { this.rec = new MediaRecorder(this.stream); } catch (e2) { this.rec = null; return; } }
      this.chunks = [];
      this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
      this.startedAt = Date.now();
      try { this.rec.start(2000); } catch (e) { this.rec = null; }
    },
    // Stop the recorder and return { dataUrl, duration, mime, size } (or null). Does not drop the stream.
    async finishRec() {
      if (!this.rec || !this.chunks) return null;
      const duration = Math.round((Date.now() - this.startedAt) / 1000);
      const stopped = new Promise((resolve) => {
        if (this.rec.state === 'inactive') return resolve();
        this.rec.onstop = () => resolve();
        try { this.rec.stop(); } catch (e) { resolve(); }
      });
      await stopped;
      if (!this.chunks.length) return null;
      const blob = new Blob(this.chunks, { type: this.recMime || 'video/webm' });
      if (!blob.size) return null;
      try {
        const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('read failed')); r.readAsDataURL(blob); });
        return { dataUrl, duration, mime: blob.type, size: blob.size };
      } catch (e) { return null; }
    },
    showPip() {
      if (!this.stream) return;
      if (!this.pip) {
        this.pip = document.createElement('div');
        this.pip.className = 'cam-pip';
        this.pip.innerHTML = `<video autoplay muted playsinline></video><div class="cam-tag"><span class="cam-dot"></span>Camera on · drag to move</div>`;
        document.body.appendChild(this.pip);
        makeDraggable(this.pip);
      }
      const v = this.pip.querySelector('video');
      if (v && v.srcObject !== this.stream) { v.srcObject = this.stream; v.style.transform = 'scaleX(-1)'; }
      this.pip.classList.remove('hidden');
    },
    stop() {
      if (this.rec && this.rec.state !== 'inactive') { try { this.rec.stop(); } catch (e) {} }
      this.rec = null; this.chunks = [];
      if (this.stream) { this.stream.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} }); this.stream = null; }
      if (this.pip) { this.pip.remove(); this.pip = null; }
      Guard.stop();
    }
  };

  // Make the floating camera window draggable (mouse + touch) and kept inside the viewport.
  function makeDraggable(el) {
    let ox = 0, oy = 0, dragging = false;
    const clamp = (x, y) => [
      Math.max(6, Math.min(window.innerWidth - el.offsetWidth - 6, x)),
      Math.max(6, Math.min(window.innerHeight - el.offsetHeight - 6, y))
    ];
    const move = (e) => {
      if (!dragging) return;
      const [x, y] = clamp(e.clientX - ox, e.clientY - oy);
      el.style.left = x + 'px'; el.style.top = y + 'px';
    };
    const up = () => {
      dragging = false; el.classList.remove('dragging');
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointerdown', (e) => {
      const r = el.getBoundingClientRect();
      el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      dragging = true; el.classList.add('dragging');
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      e.preventDefault();
    });
    // Keep it on-screen if the window is resized after a manual move.
    window.addEventListener('resize', () => {
      if (el.style.left === '' ) return;
      const [x, y] = clamp(parseInt(el.style.left, 10) || 0, parseInt(el.style.top, 10) || 0);
      el.style.left = x + 'px'; el.style.top = y + 'px';
    });
  }

  // ---------------- screenshot / copy deterrents ----------------
  // Browsers cannot fully block OS-level screenshots or a phone camera, but we can block the
  // common ones (PrintScreen, right-click save, copy, Ctrl+P/S), blank the screen when the
  // window loses focus (Snipping Tool / alt-tab), and log every attempt for HR.
  const Guard = {
    on: false, overlay: null, shieldTimer: null,
    start() {
      if (this.on) return; this.on = true;
      document.body.classList.add('no-shot');
      document.addEventListener('keydown', this.onKeyDown, true);
      document.addEventListener('keyup', this.onKeyUp, true);
      document.addEventListener('contextmenu', this.onCtx, true);
      window.addEventListener('blur', this.onBlur);
      window.addEventListener('focus', this.onFocus);
      document.addEventListener('visibilitychange', this.onVis);
    },
    stop() {
      if (!this.on) return; this.on = false;
      document.body.classList.remove('no-shot');
      document.removeEventListener('keydown', this.onKeyDown, true);
      document.removeEventListener('keyup', this.onKeyUp, true);
      document.removeEventListener('contextmenu', this.onCtx, true);
      window.removeEventListener('blur', this.onBlur);
      window.removeEventListener('focus', this.onFocus);
      document.removeEventListener('visibilitychange', this.onVis);
      Guard.hideShield();
    },
    // Hide the screen immediately (and for a moment) when a screenshot shortcut is pressed.
    shieldFor(ms) {
      Guard.showShield();
      clearTimeout(Guard.shieldTimer);
      Guard.shieldTimer = setTimeout(() => { if (document.hasFocus()) Guard.hideShield(); }, ms);
    },
    warn(msg) { try { UI.toast(msg, 'error', 2600); } catch (e) {} },
    onCtx(e) { e.preventDefault(); },
    onKeyDown(e) {
      const k = (e.key || '').toLowerCase();
      // Windows key (Win+Shift+S / Snipping Tool) and Cmd+Shift+3/4/5 on Mac: black out the page before the capture happens.
      const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
      if ((e.key === 'Meta' && !isMac) || (e.metaKey && e.shiftKey) || (e.altKey && e.key === 'PrintScreen')) {
        Guard.shieldFor(2500);
        try { logEvent('screenshot_attempt', e.metaKey || e.key === 'Meta' ? 'Win/Cmd shortcut' : e.key); } catch (_) {}
      }
      if (e.key === 'PrintScreen' || ((e.ctrlKey || e.metaKey) && ['p', 's', 'u', 'c'].includes(k))) {
        e.preventDefault();
        try { logEvent('screenshot_attempt', e.key); } catch (_) {}
      }
    },
    onKeyUp(e) {
      if (e.key === 'PrintScreen') {
        try { navigator.clipboard && navigator.clipboard.writeText(''); } catch (_) {}
        try { logEvent('screenshot_attempt', 'PrintScreen'); } catch (_) {}
        Guard.flash();
        Guard.warn('Screenshots are disabled during the interview.');
      }
    },
    onBlur() { Guard.showShield(); try { logEvent('window_blur', ''); } catch (_) {} },
    onFocus() { Guard.hideShield(); },
    onVis() { if (document.hidden) Guard.showShield(); else Guard.hideShield(); },
    showShield() {
      if (!this.on) return;
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'shot-shield';
        this.overlay.innerHTML = `<div class="ss-box">${I('eye', 30)}<b>Interview paused</b><span>Please return to this window to continue. This screen is hidden while it is not in focus.</span></div>`;
        document.body.appendChild(this.overlay);
      }
      this.overlay.classList.add('on');
    },
    hideShield() { if (this.overlay) this.overlay.classList.remove('on'); },
    flash() {
      const f = document.createElement('div');
      f.className = 'shot-flash';
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 500);
    }
  };

  // If the resume looks like a weak match for the chosen position, ask once before moving on.
  function confirmFit(next) {
    const rel = S.resume && S.resume.insights && S.resume.insights.relevance;
    const key = S.role + '|' + (S.position && S.position.id);
    if (!rel || rel.level !== 'weak' || S._relAck === key) return next();
    const title = (S.position && S.position.title) || rel.roleTitle || 'this position';
    const why = rel.reason || 'Your resume does not seem to match the main requirements of this position.';
    const m = modal(`<div class="m-ico">${I('alert', 30)}</div>
      <h3 class="h3">Your resume may not match this position</h3>
      <p><b>${esc(title)}</b></p>
      <p>${esc(why)}</p>
      <p>You can still continue with this interview, or go back and choose a position that fits your experience better. A DVAGO recruiter reviews every application.</p>
      <div class="row" style="gap:10px;flex-wrap:wrap"><button class="btn btn-ghost btn-lg" id="fitBack">${I('left', 16)} Change position</button><button class="btn btn-primary btn-lg" id="fitGo">Continue anyway ${I('right', 16)}</button></div>`);
    $('#fitBack', m).addEventListener('click', () => { closeModal(); go('role'); });
    $('#fitGo', m).addEventListener('click', () => { S._relAck = key; save(); closeModal(); next(); });
  }

  // Notify the candidate, turn the camera on, then continue to the next stage.
  function enableCameraThen(next) {
    if (Cam.active()) return next();
    const m = modal(`<div class="m-ico">${I('camera', 30)}</div>
      <h3 class="h3">We're turning on your camera</h3>
      <p>For a fair and secure interview, your camera will stay on from here until you finish. Please choose <b>Allow</b> when your browser asks for camera access. Your video is used only for this DVAGO interview.</p>
      <div class="row"><button class="btn btn-primary btn-lg" id="camOk">Turn on camera &amp; continue ${I('right', 16)}</button></div>`);
    $('#camOk', m).addEventListener('click', async () => {
      const btn = $('#camOk', m);
      btn.disabled = true; btn.innerHTML = `${I('refresh', 16)} Turning on camera…`;
      const ok = await Cam.start();
      closeModal();
      if (ok) UI.toast('Camera is on — you are all set.', 'success');
      else UI.toast('We could not turn on your camera. You can continue, but please allow camera access for a complete interview.', 'error', 4500);
      next();
    });
  }

  // ================= STAGES =================

  function renderSplash() {
    // Insert slideshow bg BEHIND the main glitter canvas (only on splash)
    const existing = document.querySelector('.bg-slideshow');
    if (existing) existing.remove();
    const bgEl = document.createElement('div');
    bgEl.className = 'bg-slideshow on';
    bgEl.innerHTML = `
      <div class="bg-slide" style="background-image:url('assets/bg-store.png')"></div>
      <div class="bg-slide" style="background-image:url('assets/bg-brand.jpg')"></div>`;
    const bg = document.querySelector('.bg');
    bg.insertBefore(bgEl, bg.querySelector('.bg-grid'));
    const slides = bgEl.querySelectorAll('.bg-slide');
    let idx = 0;
    slides[0].classList.add('show');
    const bgTimer = setInterval(() => {
      slides[idx].classList.remove('show');
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add('show');
    }, 5000);
    onLeave(() => { clearInterval(bgTimer); bgEl.remove(); });

    screen(`
      <div class="splash-logo">${UI.logo()}</div>
      <div class="splash-tag">Pharmacy &amp; Wellness Experts</div>
      <div class="splash-sub">
        <span class="splash-pill">${I('sparkles', 16)} <b>AI Interview Experience</b> · powered by SARAH</span>
        <button class="btn btn-primary btn-lg btn-shine" id="enter">${S.applyMode ? 'Apply to DVAGO' : S.candidate.fullName ? 'Welcome, ' + esc(first()) + ' — enter' : 'Enter your interview'} ${I('right', 18)}</button>
        <span class="small muted" style="display:inline-flex;gap:6px;align-items:center">${I('volume', 14)} Turn your sound on — SARAH will speak with you</span>
      </div>
      <div class="splash-foot"><span>${I('lock', 14)} Secure &amp; private</span><span>${I('clock', 14)} ${S.applyMode ? 'Takes about 3 minutes' : 'About 40 minutes'}</span><span>${I('globe', 14)} Best in Chrome or Edge</span></div>
    `, 'splash');
    $('#enter').addEventListener('click', (e) => {
      UI.burst(e.clientX, e.clientY, { count: 90 });
      Voice.speak(' ');
      setTimeout(() => go('greet'), 250);
    });
  }

  function renderClosed(reason) {
    S = S || newState();
    S.stage = 'closed';
    updateTopbar();
    const M = {
      invalid: ['This link is not valid', 'We could not find this interview invitation. Please check the link in your email or contact DVAGO HR.'],
      used: ['Interview already completed', 'This interview link has already been used. Each link can be used only once — thank you for your time!'],
      expired: ['This link has expired', 'Your invitation is no longer active. Please contact DVAGO HR to request a new interview link.'],
      inviteOnly: ['Invitation required', 'DVAGO interviews are by invitation only. Apply through the DVAGO job form; if your profile is shortlisted, your personal interview link will be emailed to you.']
    }[reason] || ['Unavailable', 'This interview is not available.'];
    screen(`<div class="splash-logo" style="height:56px;margin-bottom:10px">${UI.logo()}</div>
      <div class="lock">${I('lock', 40)}</div><h1 class="h2">${M[0]}</h1><p class="lead">${M[1]}</p>`, 'closed');
  }

  // ---------- Greeting slideshow ----------
  function renderGreet() {
    const f = first();
    const AM = !!S.applyMode;
    const slides = AM ? [
      { title: `Assalam-o-Alaikum${f ? ', ' + esc(f) : ''}!`, sub: "I am SARAH — DVAGO's Personal Recruiter Agent.", say: `Assalam-o-Alaikum${f ? ' ' + f : ''}, and welcome to DVAGO! I am SARAH, your personal recruiter agent.` },
      { title: 'How applying works', sub: 'Three short steps — it takes about three minutes.', journey: true, say: "Here is how it works. You choose your role, then fill in your profile and upload your resume. Our team reviews your application, and if your profile matches the role, I will email you a personal interview link." }
    ] : [
      { title: `Assalam-o-Alaikum${f ? ', ' + esc(f) : ''}!`, sub: "I am SARAH — DVAGO's Personal Recruiter Agent.", say: `Assalam-o-Alaikum${f ? ' ' + f : ''}, and welcome to DVAGO! I am SARAH, your personal recruiter agent.` },
      { title: 'Hope you are doing well.', sub: "I'll be with you at every step of today's interview. It's friendly, fair, and takes about 40 minutes.", say: "I hope you are doing well. I'll be with you at every step of today's interview. It is friendly, fair, and takes about forty minutes." },
      { title: 'Your interview journey', sub: 'Five simple steps — I will guide you through each one.', journey: true, say: "Here is how it works. First, you choose your role. Then your profile and resume. Next, a short voice conversation with me. After that, a real-world assessment. And then, you're done!" },
      { title: 'A few quick tips', sub: 'Small things that help you perform at your best.', tips: true, say: "A few quick tips before we begin. Find a quiet place, keep your microphone on, and most importantly, be yourself. Ready? Let's begin!" }
    ];
    let i = 0, auto = true, token = 0;
    screen(`
      ${orbHTML()}
      <div class="orb-label"><span class="live"></span> SARAH · Personal Recruiter Agent</div>
      <div class="slide-wrap" id="slide"></div>
      <div class="slide-nav">
        <button class="btn btn-ghost btn-icon" id="prev" aria-label="Previous">${I('left', 18)}</button>
        <div class="dots" id="dots">${slides.map(() => '<i></i>').join('')}</div>
        <button class="btn btn-primary" id="next">Next ${I('right', 16)}</button>
      </div>
      <button class="skip" id="skip">Skip intro ${I('right', 14)}</button>
    `, 'greet');
    const orb = $('.orb');
    const journey = AM
      ? [['target', 'Role', 'Pick your position'], ['user', 'Profile', 'Details & resume'], ['send', 'Interview link', 'Emailed if shortlisted']]
      : [['user', 'Profile', 'Details & resume'], ['target', 'Role', 'Pick your position'], ['mic', 'Voice chat', 'Talk with SARAH'], ['file', 'Assessment', 'Real-world tasks'], ['award', 'Done', 'Submit & relax']];
    const tips = [['volume', 'Quiet place', 'Find a calm spot with little background noise.'], ['mic', 'Mic & speakers on', 'You can answer by voice — or type if you prefer.'], ['wifi', 'Stable internet', 'Your progress is saved if you get disconnected.'], ['sparkles', 'Be yourself', 'There are no trick questions. Honest answers win.']];

    async function show(n) {
      i = n; const my = ++token; const s = slides[i];
      $$('#dots i').forEach((d, k) => d.classList.toggle('on', k === i));
      $('#prev').disabled = i === 0;
      $('#next').innerHTML = i === slides.length - 1 ? `I'm ready — let's begin ${I('right', 16)}` : `Next ${I('right', 16)}`;
      $('#next').classList.toggle('btn-shine', i === slides.length - 1);
      let extra = '';
      if (s.journey) extra = `<div class="journey">${journey.map((j, k) => `<div class="glass j-step" style="animation-delay:${0.15 + k * 0.12}s"><div class="j-ico">${I(j[0], 22)}</div><b>${j[1]}</b><span>${j[2]}</span></div>`).join('')}</div>`;
      if (s.tips) extra = `<div class="tips">${tips.map((t, k) => `<div class="glass tip" style="animation-delay:${0.1 + k * 0.1}s"><div class="t-ico">${I(t[0], 18)}</div><div><b>${t[1]}</b><span>${t[2]}</span></div></div>`).join('')}</div>`;
      $('#slide').innerHTML = `<div class="slide"><h1 class="h1 grad-text">${s.title}</h1><p class="caption" id="cap"></p>${extra}</div>`;
      UI.typeText($('#cap'), s.sub, 26);
      await say(s.say, orb, null);
      if (my !== token) return;
      if (auto && i < slides.length - 1) setTimeout(() => { if (my === token && auto) show(i + 1); }, 1100);
    }
    const afterGreet = () => go(AM ? 'role' : 'schedule');
    $('#next').addEventListener('click', () => { auto = false; Voice.stop(); i < slides.length - 1 ? show(i + 1) : afterGreet(); });
    $('#prev').addEventListener('click', () => { auto = false; Voice.stop(); if (i > 0) show(i - 1); });
    $('#skip').addEventListener('click', afterGreet);
    onLeave(() => { token++; });
    show(0);
  }

  // ---------- Schedule ----------
  function renderSchedule() {
    const existing = S.schedule || (S.invite && S.invite.schedule);
    screen(`<div class="glass panel panel-narrow">
      <span class="eyebrow">Your time, your choice</span>
      <h2 class="h2" style="margin-top:10px">When would you like to take your interview?</h2>
      <p class="lead" style="margin-top:8px">${existing ? `Welcome back! You booked <b>${esc(existing.label)}</b>. You can start now whenever you are ready.` : 'Start right away, or pick a slot that suits you in the next 7 days.'}</p>
      <div class="choice-grid">
        <button class="choice sel" data-c="now"><span class="badge-rec">RECOMMENDED</span><div class="c-ico">${I('zap', 24)}</div><b>Start now</b><span>Takes about 40 minutes. Make sure you have a quiet space.</span></button>
        <button class="choice" data-c="later"><div class="c-ico">${I('calendar', 24)}</div><b>Schedule for later</b><span>Pick a date and time — we'll keep your link ready.</span></button>
      </div>
      <div id="slots" class="hidden" style="margin-top:24px"></div>
      <div class="row-end"><span class="small muted">${I('lock', 14).replace('class="ico', 'style="display:inline;vertical-align:-2px" class="ico')} Your data is used only for DVAGO recruitment.</span><button class="btn btn-primary btn-lg" id="go">Continue ${I('right', 18)}</button></div>
    </div>`);
    let choice = 'now', date = null, time = null;
    const slots = $('#slots');
    $$('.choice').forEach((c) => c.addEventListener('click', () => {
      choice = c.dataset.c;
      $$('.choice').forEach((x) => x.classList.toggle('sel', x === c));
      slots.classList.toggle('hidden', choice !== 'later');
      $('#go').innerHTML = choice === 'later' ? `Confirm booking ${I('check', 18)}` : `Continue ${I('right', 18)}`;
      if (choice === 'later' && !slots.innerHTML) buildSlots();
    }));
    const ALL_TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    const todayStr = () => new Date().toISOString().slice(0, 10);
    function futureTimesFor(dateStr) {
      if (dateStr !== todayStr()) return ALL_TIMES;
      const now = new Date();
      const minHour = now.getHours() + (now.getMinutes() > 10 ? 1 : 0);
      return ALL_TIMES.filter((t) => +t.slice(0, 2) > minHour);
    }
    function buildSlots() {
      const days = [];
      const hasToday = futureTimesFor(todayStr()).length > 0;
      for (let d = hasToday ? 0 : 1; d <= (hasToday ? 6 : 7); d++) { const x = new Date(); x.setDate(x.getDate() + d); days.push(x); }
      date = null; time = null;
      slots.innerHTML = `<label class="field"><span class="small muted" style="font-weight:600">Pick a date</span></label>
        <div class="slots-dates">${days.map((d, k) => { const ds = d.toISOString().slice(0, 10); return `<button class="slot-date" data-d="${ds}"><small>${ds === todayStr() ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('en-GB', { month: 'short' })}</small></button>`; }).join('')}</div>
        <span class="small muted" style="font-weight:600;display:block;margin:12px 0 10px">Pick a time</span>
        <div class="slots-times" id="slotTimes"><p class="small muted" style="grid-column:1/-1;text-align:center;padding:10px">Please select a date first</p></div>`;
      $$('.slot-date', slots).forEach((b) => b.addEventListener('click', () => {
        date = b.dataset.d;
        time = null;
        $$('.slot-date', slots).forEach((x) => x.classList.toggle('sel', x === b));
        const avail = futureTimesFor(date);
        const grid = $('#slotTimes', slots);
        if (avail.length === 0) { grid.innerHTML = `<p class="small muted" style="grid-column:1/-1;text-align:center;padding:10px">No slots left today — please pick another date</p>`; return; }
        grid.innerHTML = avail.map((t) => { const h = +t.slice(0, 2); return `<button class="slot-time" data-t="${t}">${(h % 12) || 12}:00 ${h < 12 ? 'AM' : 'PM'}</button>`; }).join('');
        $$('.slot-time', grid).forEach((b2) => b2.addEventListener('click', () => { time = b2.dataset.t; $$('.slot-time', grid).forEach((x) => x.classList.toggle('sel', x === b2)); }));
      }));
    }
    $('#go').addEventListener('click', async () => {
      if (choice === 'now') return go('role');
      if (!date || !time) return UI.toast('Please choose both a date and a time.', 'error');
      const at = new Date(date + 'T' + time + ':00');
      if (at <= new Date()) return UI.toast('That time has already passed — please pick a later slot.', 'error');
      S.schedule = { at: at.toISOString(), label: fmtDate(at) + ' at ' + at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) };
      if (S.inviteToken) {
        try { await Store.updateInvite(S.inviteToken, { schedule: S.schedule, status: 'Scheduled' }); } catch (e) {}
      } else if (S.candidate.email && isEmail(S.candidate.email) && Store.mode === 'server') {
        // Walk-in: still send a confirmation if we already have email
        try { await fetch('api/notify-schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: S.candidate.email, name: S.candidate.fullName, schedule: S.schedule }) }); } catch (e) {}
      }
      go('scheduled');
    });
  }

  function renderScheduled() {
    const at = new Date(S.schedule.at);
    const emailLine = S.inviteToken || (S.candidate.email && isEmail(S.candidate.email))
      ? `<p class="small muted" style="max-width:520px">A confirmation email has been sent${S.candidate.email ? ' to <b style="color:#fff">' + esc(S.candidate.email) + '</b>' : ''}. Open <b>this same link</b> at your scheduled time — SARAH will be waiting for you.</p>`
      : `<p class="small muted" style="max-width:520px">Open <b>this same link</b> at your scheduled time. You can close this window now — SARAH will be waiting for you.</p>`;
    screen(`<div class="done-badge">${I('calendar', 52)}</div>
      <h1 class="h1 grad-text">You're booked${first() ? ', ' + esc(first()) : ''}!</h1>
      <p class="lead">Your DVAGO AI interview is scheduled for</p>
      <div class="glass" style="padding:18px 26px;border-radius:18px"><b class="h3">${esc(S.schedule.label)}</b></div>
      ${emailLine}
      <div class="row" style="justify-content:center"><button class="btn btn-ghost" id="ics">${I('download', 16)} Add to calendar</button><button class="btn btn-primary" id="now">Actually, I'm ready now ${I('right', 16)}</button></div>`, 'done-screen');
    UI.burst(null, innerHeight * 0.3, { count: 120 });
    say(`You're all set${first() ? ', ' + first() : ''}. See you on ${fmtDate(at)}.`, null, null);
    $('#ics').addEventListener('click', () => {
      const p = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const end = new Date(at.getTime() + 45 * 60000);
      const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DVAGO//AI Interview//EN', 'BEGIN:VEVENT', 'UID:' + S.sessionId + '@dvago', 'DTSTAMP:' + p(new Date()), 'DTSTART:' + p(at), 'DTEND:' + p(end), 'SUMMARY:DVAGO AI Interview', 'DESCRIPTION:Open your interview link: ' + location.href, 'URL:' + location.href, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:DVAGO interview in 15 minutes', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'DVAGO-Interview.ics';
      a.click();
    });
    $('#now').addEventListener('click', () => go('role'));
  }

  // ---------- Profile + resume ----------
  function renderProfile() {
    const c = S.candidate;
    const opt = (list, v) => `<option value="">Select…</option>` + list.map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
    screen(`<div class="split">
      <aside class="glass side">
        <div class="dia-head">${orbHTML('orb-xs')}<div><strong>SARAH</strong><span class="small muted">Recruiter Agent · online</span></div></div>
        <div class="bubble"><span class="bubble-text" id="bub"></span></div>
        <input type="file" id="file" accept=".pdf,.docx,.doc,.txt" hidden>
        <div id="resumeBox"></div>
        <div id="insBox"></div>
      </aside>
      <section class="glass form-card">
        <span class="eyebrow">Step 2 · Your profile</span>
        <h2 class="h2" style="margin-top:10px">Tell us about yourself</h2>
        <p class="muted" style="margin-top:6px">Fields marked <span style="color:#ff9da0">*</span> are required. Upload your resume and SARAH will fill in what it can.</p>
        <div class="form-grid">
          <div class="field"><label>Full name <i>*</i></label><input class="input" id="fullName" autocomplete="name" value="${esc(c.fullName)}" placeholder="e.g. Ayesha Khan"></div>
          <div class="field"><label>Personal email <i>*</i></label><input class="input" id="email" type="email" autocomplete="email" value="${esc(c.email)}" placeholder="you@example.com"></div>
          <div class="field"><label>Mobile number <i>*</i></label><input class="input" id="phone" type="tel" autocomplete="tel" value="${esc(c.phone)}" placeholder="03XX-XXXXXXX"></div>
          <div class="field"><label>CNIC</label><input class="input" id="cnic" value="${esc(c.cnic)}" placeholder="XXXXX-XXXXXXX-X" maxlength="15"></div>
          <div class="field"><label>City <i>*</i></label><select class="input" id="city">${opt(CITIES, c.city)}</select></div>
          <div class="field"><label>Highest education <i>*</i></label><select class="input" id="education">${opt(EDUCATION, c.education)}</select></div>
          <div class="field"><label>Total experience <i>*</i></label><select class="input" id="experience">${opt(EXPERIENCE, c.experience)}</select></div>
          <div class="field"><label>Current / last company <i>*</i></label><input class="input" id="employer" value="${esc(c.employer)}" placeholder="Company name (write 'Fresher' if none)"></div>
          <div class="field"><label>Current salary (PKR / month)</label><input class="input" id="currentSalary" inputmode="numeric" maxlength="9" value="${esc(c.currentSalary || '')}" placeholder="e.g. 45000 (leave blank if fresher)"></div>
          <div class="field"><label>Other perks / benefits (if applicable)</label><input class="input" id="currentPerks" maxlength="200" value="${esc(c.currentPerks || '')}" placeholder="e.g. medical, fuel allowance, bonus"></div>
          <div class="field"><label>Expected salary (PKR / month) <i>*</i></label><input class="input" id="expectedSalary" inputmode="numeric" maxlength="9" value="${esc(c.expectedSalary || '')}" placeholder="e.g. 60000"></div>
          <div class="field full"><label>LinkedIn profile</label><input class="input" id="linkedin" value="${esc(c.linkedin)}" placeholder="https://linkedin.com/in/…"></div>
          <label class="check field full"><input type="checkbox" id="consent" ${S.consent ? 'checked' : ''}><span>I agree that DVAGO may process my information and use AI-assisted evaluation for this recruitment. A human recruiter makes the final decision.</span></label>
        </div>
        <div id="perr"></div>
        <div class="row-end"><button class="btn btn-ghost" id="back">${I('left', 16)} Back</button><button class="btn btn-primary btn-lg" id="go">Continue ${I('right', 18)}</button></div>
      </section></div>`);
    const orb = $('.orb');
    say(S.resume ? 'Your resume is attached. Please double-check your details.' : "Let's get to know you. Upload your resume and I'll fill in the details for you.", orb, $('#bub'));
    // Role/position may have changed since the resume was uploaded — refresh its relevance.
    if (S.resume && S.resume.text && S.resume.insights && S.role) {
      const cur = S.resume.insights.relevance;
      const stillValid = cur && cur.source === 'ai' && cur.role === S.role && cur.pos === (S.position && S.position.id);
      if (!stillValid) {
        const rel = resumeRelevance(S.role, S.position && S.position.jd);
        if (rel) S.resume.insights.relevance = rel;
      }
    }
    drawResume();
    $('#back').addEventListener('click', () => go('jd'));
    $$('.form-card .input').forEach((el) => el.addEventListener('input', () => { el.classList.remove('err', 'autofilled'); collect(); }));
    $('#consent').addEventListener('change', collect);
    ['currentSalary', 'expectedSalary'].forEach((id) => $('#' + id).addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9); }));
    $('#cnic').addEventListener('input', (e) => {
      const d = e.target.value.replace(/\D/g, '').slice(0, 13);
      e.target.value = d.length > 12 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    });
    function collect() {
      ['fullName', 'email', 'phone', 'cnic', 'city', 'education', 'experience', 'employer', 'currentSalary', 'currentPerks', 'expectedSalary', 'linkedin'].forEach((k) => { const el = $('#' + k); if (el) S.candidate[k] = el.value.trim(); });
      S.consent = $('#consent').checked;
      saveSoon();
    }
    $('#go').addEventListener('click', async () => {
      collect();
      const c2 = S.candidate;
      const bad = [];
      if (c2.fullName.split(/\s+/).length < 2) bad.push('fullName');
      if (!isEmail(c2.email)) bad.push('email');
      if (c2.phone.replace(/\D/g, '').length < 10) bad.push('phone');
      ['city', 'education', 'experience'].forEach((k) => { if (!c2[k]) bad.push(k); });
      if (c2.employer.length < 2) bad.push('employer');
      if (!/^\d{3,9}$/.test(c2.expectedSalary || '')) bad.push('expectedSalary');
      bad.forEach((k) => $('#' + k).classList.add('err'));
      const perr = $('#perr');
      if (bad.length) { perr.innerHTML = `<p class="err-msg">${I('alert', 16)} Please complete the highlighted fields (all fields marked * are required).</p>`; return; }
      if (!S.consent) { perr.innerHTML = `<p class="err-msg">${I('alert', 16)} Please accept the consent to continue.</p>`; return; }
      $('#go').disabled = true;
      try {
        if (await Store.hasCompleted(c2.email)) {
          perr.innerHTML = `<p class="err-msg">${I('alert', 16)} An interview has already been completed with this email. Re-attempts are not allowed — please contact DVAGO HR.</p>`;
          $('#go').disabled = false;
          return;
        }
      } catch (e) {}
      if (S.applyMode) return submitApplication();
      $('#go').disabled = false;
      confirmFit(() => enableCameraThen(() => go('syscheck')));
    });
    // Resume screening mode: send the application. The candidate is never told a score; an interview link arrives by email only if shortlisted.
    async function submitApplication() {
      const perr = $('#perr');
      if (!S.resume || !S.resume.dataUrl) { $('#go').disabled = false; perr.innerHTML = `<p class="err-msg">${I('alert', 16)} Please upload your resume to apply.</p>`; return; }
      if (S.resume.parsing) { $('#go').disabled = false; perr.innerHTML = `<p class="err-msg">${I('alert', 16)} SARAH is still reading your resume — please wait a moment.</p>`; return; }
      $('#go').innerHTML = `${I('refresh', 16)} Submitting…`;
      try {
        const r = await Store.apply({ candidate: S.candidate, role: S.role, positionId: S.position && S.position.id, resume: { name: S.resume.name, type: S.resume.type, size: S.resume.size, dataUrl: S.resume.dataUrl, text: S.resume.text } });
        if (r && r.ok === false) {
          $('#go').disabled = false; $('#go').innerHTML = `Continue ${I('right', 18)}`;
          perr.innerHTML = `<p class="err-msg">${I('alert', 16)} ${r.reason === 'already-completed' ? 'An interview has already been completed with this email. Please contact DVAGO HR.' : 'We already have an application from you. Our team will contact you by email if you are shortlisted — please do not submit again.'}</p>`;
          return;
        }
        S.applied = { at: new Date().toISOString(), email: S.candidate.email, position: S.position && S.position.title };
        S.resume.dataUrl = null;
        go('applied');
      } catch (e) {
        $('#go').disabled = false; $('#go').innerHTML = `Continue ${I('right', 18)}`;
        perr.innerHTML = `<p class="err-msg">${I('alert', 16)} ${esc(e.message || 'Could not submit your application. Please try again.')}</p>`;
      }
    }
  }

  function renderApplied() {
    const a = S.applied || {};
    screen(`<div class="splash-logo" style="height:56px;margin-bottom:10px">${UI.logo()}</div>
      <div class="glass panel panel-narrow" style="text-align:center">
        <div class="lock" style="color:var(--green,#78B943)">${I('check', 40)}</div>
        <h1 class="h2">Application received</h1>
        <p class="lead" style="margin-top:8px">Thank you${S.candidate.fullName ? ', ' + esc(first()) : ''}! Your application${a.position ? ' for <b>' + esc(a.position) + '</b>' : ''} has been submitted.</p>
        <p class="muted" style="margin-top:12px">Our team will review your resume. If your profile matches the role, SARAH will email a personal interview link to <b>${esc(a.email || S.candidate.email)}</b>. Please keep an eye on your inbox (and spam folder).</p>
        <p class="small muted" style="margin-top:16px">You do not need to apply again — duplicate applications are not reviewed.</p>
      </div>`, 'closed');
    Voice.speak(`Thank you ${first()}. Your application has been received. If your profile matches the role, I will email you an interview link.`);
  }

  // Ask the server's AI to read the resume. Returns validated fields + fit, or null (not configured / offline / error / timeout).
  async function aiResumeCheck(text) {
    if (!S.role) return null;
    const roleDef = B.ROLES[S.role];
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), 14000);
    try {
      const res = await fetch('api/resume-check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({ text: text.slice(0, 12000), roleTitle: roleDef ? roleDef.title : '', positionTitle: S.position ? S.position.title : '', jd: S.position ? S.position.jd : '' })
      });
      if (!res.ok) return null;
      const d = await res.json();
      return d && d.ok ? d : null;
    } catch (e) { return null; } finally { clearTimeout(timer); }
  }

  // Skill match: short terms (pos, ca, sap…) must be whole words so "position"/"mechanical" don't match.
  function hasSkill(low, s) {
    if (s.length > 4) return low.includes(s);
    return new RegExp('(^|[^a-z0-9])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z0-9])').test(low);
  }

  // Real-time check: does the uploaded resume look relevant to the given role (and position JD)?
  // Returns { score 0-100, level: 'strong'|'moderate'|'weak', matched[], roleTitle } or null.
  function resumeRelevance(roleKey, jdText) {
    const r = S.resume;
    if (!r || !r.text || !r.text.trim()) return null;
    const roleDef = B.ROLES[roleKey];
    if (!roleDef) return null;
    const low = r.text.toLowerCase();
    const pool = roleDef.skills || [];
    const matched = pool.filter((s) => hasSkill(low, String(s).toLowerCase()));
    const need = Math.max(3, Math.round(pool.length * 0.3));
    const skillScore = Math.min(1, matched.length / need);
    // Position JD keyword overlap (only when a JD is available)
    let jdScore = skillScore;
    if (jdText && jdText.trim()) {
      const STOP = new Set('the and for with you are will that this your our job role dvago pakistan description responsibilities requirements about have from into must should able who what when candidate team work experience years based full time position apply ability strong good excellent able'.split(' '));
      const jdWords = Array.from(new Set((jdText.toLowerCase().match(/[a-z][a-z+&-]{3,}/g) || []).filter((w) => !STOP.has(w))));
      if (jdWords.length) {
        const jdMatched = jdWords.filter((w) => low.includes(w));
        jdScore = Math.min(1, jdMatched.length / Math.max(6, Math.round(jdWords.length * 0.18)));
      }
    }
    const score = Math.round(100 * (0.65 * skillScore + 0.35 * jdScore));
    const level = score >= 50 ? 'strong' : score >= 25 ? 'moderate' : 'weak';
    return { score, level, matched, roleTitle: roleDef.title };
  }

  function drawResume() {
    const box = $('#resumeBox');
    const ins = $('#insBox');
    if (!box) return;
    if (!S.resume) {
      box.innerHTML = `<div class="drop" id="drop" tabindex="0" role="button" aria-label="Upload resume"><div class="d-ico">${I('upload', 26)}</div><b>Upload your resume</b><span>Drag &amp; drop or click · PDF, DOCX or TXT · max 5 MB</span></div>`;
      ins.innerHTML = '';
      const drop = $('#drop');
      drop.addEventListener('click', () => $('#file').click());
      drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') $('#file').click(); });
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
      $('#file').onchange = (e) => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ''; };
      return;
    }
    const r = S.resume;
    box.innerHTML = `<div class="file-card ${r.parsing ? 'scan' : ''}"><div class="f-ico">${I('file', 20)}</div><div class="f-meta"><b>${esc(r.name)}</b><span>${Math.max(1, Math.round(r.size / 1024))} KB ·${r.parsing ? 'SARAH is reading…' : r.text ? 'Analysed by SARAH' : 'Attached'}</span></div>${r.fromApplication ? '' : `<button class="btn btn-ghost btn-sm btn-icon" id="rmResume" aria-label="Remove resume">${I('x', 16)}</button>`}</div>`;
    const rm = $('#rmResume');
    if (rm) rm.addEventListener('click', () => { S.resume = null; save(); drawResume(); });
    if (r.insights) {
      const a = r.insights;
      const rel = a.relevance;
      const relReason = rel ? (rel.reason || (rel.level === 'weak' ? 'Few of the key skills for this role were found in your resume.' : '')) : '';
      const relText = rel ? (rel.level === 'weak' ? `May not match the ${esc(rel.roleTitle)} role` : rel.level === 'moderate' ? `Partial match for ${esc(rel.roleTitle)}` : `Good match for ${esc(rel.roleTitle)}`) : '';
      ins.innerHTML = `<div class="insights"><h4>${I('sparkles', 14)} SARAH resume insights</h4>
        ${rel ? `<div class="rel-badge rel-${rel.level}">${I(rel.level === 'weak' ? 'alert' : 'check', 14)} <span>${relText}</span></div>` : ''}
        ${rel && relReason ? `<p class="rel-reason rel-reason-${rel.level}">${esc(relReason)}</p>` : ''}
        ${a.years != null ? `<div class="ins-row"><span>Experience detected</span><b>${a.years} yr${a.years === 1 ? '' : 's'}</b></div>` : ''}
        ${a.education ? `<div class="ins-row"><span>Education</span><b>${esc(a.education)}</b></div>` : ''}
        <div class="ins-row"><span>Contact found</span><b>${a.email || a.phone ? 'Yes' : 'No'}</b></div>
        ${a.skills.length ? `<div class="chips">${a.skills.slice(0, 10).map((s) => `<span class="chip chip-g">${esc(s)}</span>`).join('')}</div>` : '<span class="small muted">No specific skills detected — that is okay, the assessment matters most.</span>'}
      </div>`;
    } else if (!r.parsing && !r.text) {
      ins.innerHTML = `<p class="small muted">SARAH could not read the text of this file, but it is attached for the recruiter.</p>`;
    }
  }

  async function handleFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext)) return UI.toast('Please upload a PDF, DOCX or TXT file.', 'error');
    if (file.size > 5 * 1024 * 1024) return UI.toast('File is larger than 5 MB.', 'error');
    S.resume = { name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataUrl: null, text: '', parsing: true };
    drawResume();
    const bub = $('#bub');
    if (bub) UI.typeText(bub, 'Reading your resume… give me a second.', 18);
    try { S.resume.dataUrl = await readAs(file, 'dataURL'); } catch (e) {}
    let text = '';
    try {
      if (ext === 'pdf') {
        let worker = PDFJS_WORKER;
        try { await loadScript(PDFJS); } catch (e) { await loadScript(PDFJS_CDN); worker = PDFJS_WORKER_CDN; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
        const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        for (let p = 1; p <= Math.min(pdf.numPages, 8); p++) {
          const tc = await (await pdf.getPage(p)).getTextContent();
          text += tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n';
        }
      } else if (ext === 'docx') {
        try { await loadScript(MAMMOTH); } catch (e) { await loadScript(MAMMOTH_CDN); }
        text = (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
      } else if (ext === 'txt') text = await readAs(file, 'text');
    } catch (e) { console.warn('resume parse failed', e); }
    await new Promise((r) => setTimeout(r, 900));
    S.resume.text = text.slice(0, 20000);
    S.resume.parsing = false;
    if (text.trim()) {
      const a = DIA_EVAL.analyzeResume(text, S.role || Object.keys(B.ROLES)[0]);
      const all = Array.from(new Set(Object.values(B.ROLES).flatMap((r) => r.skills)));
      const low = text.toLowerCase();
      a.skills = all.filter((s) => hasSkill(low, s));

      // Detect city (match against our city list)
      let detectedCity = CITIES.find((c) => new RegExp('\\b' + c + '\\b', 'i').test(text));
      if (detectedCity) a.cityMatched = detectedCity;

      // Map detected education label to our dropdown values
      const eduMap = {
        'Pharm-D': ['Pharm-D', 'Pharm.D', 'PharmD', 'Doctor of Pharmacy'],
        'ACCA / CA / CMA': ['ACCA', 'CA', 'CA Finalist', 'Chartered Accountant', 'CMA', 'CFA'],
        "Master's Degree": ['Master', 'MBA', 'M.Com', 'MSc', 'M.Sc', 'MPhil'],
        "Bachelor's Degree": ['Bachelor', 'BBA', 'B.Com', 'BSc', 'B.Sc', 'BS', 'B.E', 'BCS', 'Graduate'],
        'Intermediate / A-Levels': ['Intermediate', 'FSc', 'F.Sc', 'FA', 'F.A', 'ICS', 'I.Com', 'A level', 'A-Level', 'HSSC'],
        'Matric / O-Levels': ['Matric', 'O level', 'O-Level', 'SSC']
      };
      // Whole-word match; very short abbreviations (CA, BS, FA) must be written in capitals.
      const eduHit = (k) => new RegExp('(^|[^A-Za-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9])', k.length <= 2 ? '' : 'i').test(text);
      let detectedEdu = null;
      for (const [label, keys] of Object.entries(eduMap)) {
        if (keys.some(eduHit)) { detectedEdu = label; break; }
      }
      if (detectedEdu) a.educationMatched = detectedEdu;

      // Map detected years to experience dropdown
      const yrs = a.years;
      let detectedExp = null;
      if (yrs != null) {
        if (yrs < 1) detectedExp = 'Less than 1 year';
        else if (yrs <= 2) detectedExp = '1 – 2 years';
        else if (yrs <= 5) detectedExp = '3 – 5 years';
        else if (yrs <= 10) detectedExp = '5 – 10 years';
        else detectedExp = '10+ years';
      } else if (/fresh\s*(graduate|hire)|no experience|intern(ship)?/i.test(text)) {
        detectedExp = 'Fresh / No experience';
      }
      if (detectedExp) a.experienceMatched = detectedExp;

      // Current/last employer: look for lines like "at Company" or "Company (2023 – Present)"
      let employer = '';
      const empPatterns = [
        /(?:currently|presently|now)\s+(?:working|employed)\s+at\s+([A-Z][\w &.,'-]{2,50})/i,
        /\bat\s+([A-Z][\w &.'-]{2,50})\s*(?:\(|,|\s+-|\s+–|\n)/,
        /([A-Z][\w &.'-]{2,50})\s*(?:\(|-|–)\s*(?:\d{4})\s*(?:to|-|–|~)\s*(?:present|current|now|\d{4})/i
      ];
      for (const p of empPatterns) { const m = text.match(p); if (m) { employer = m[1].trim(); break; } }
      if (employer) a.employerMatched = employer;

      // Real-time relevance check. Rule-based first (instant, always available)...
      let rel = S.role ? resumeRelevance(S.role, S.position && S.position.jd) : null;
      if (rel) a.relevance = rel;
      // ...then the AI check on the server. If it is unavailable or fails, the rule-based results above are kept.
      const ai = await aiResumeCheck(text);
      if (ai) {
        if (ai.name) a.name = ai.name;
        if (ai.email && !a.email) a.email = ai.email;
        if (ai.phone && !a.phone) a.phone = ai.phone;
        if (ai.city) detectedCity = ai.city;
        if (ai.education) detectedEdu = ai.education;
        if (ai.experience) detectedExp = ai.experience;
        if (ai.employer) employer = ai.employer;
        if (ai.years != null) a.years = ai.years;
        const roleDef = S.role && B.ROLES[S.role];
        rel = { score: ai.fitScore, level: ai.fit, matched: (rel && rel.matched) || [], roleTitle: (S.position && S.position.title) || (roleDef && roleDef.title) || 'this', reason: ai.reason, source: 'ai', pos: S.position && S.position.id, role: S.role };
        a.relevance = rel;
      }
      S.resume.insights = a;

      const fill = (id, v) => { const el = $('#' + id); if (el && v && !el.value.trim()) { el.value = v; el.classList.add('autofilled'); return true; } return false; };
      const selectFill = (id, v) => {
        const el = $('#' + id);
        if (!el || !v || el.value) return false;
        const opt = Array.from(el.options).find((o) => o.value.toLowerCase() === v.toLowerCase() || o.text.toLowerCase() === v.toLowerCase());
        if (opt) { el.value = opt.value; el.classList.add('autofilled'); return true; }
        return false;
      };
      const results = [
        fill('fullName', a.name),
        fill('email', a.email),
        fill('phone', a.phone),
        selectFill('city', detectedCity),
        selectFill('education', detectedEdu),
        selectFill('experience', detectedExp),
        fill('employer', employer)
      ];
      const filled = results.filter(Boolean).length;
      const filledNote = filled ? `Done! I filled in ${filled} field${filled > 1 ? 's' : ''} from your resume — highlighted in gold.` : 'Done! I have read your resume.';
      let msg;
      if (rel && rel.level === 'weak') {
        msg = `${filledNote} One honest note — ${rel.reason || `your experience does not seem directly relevant to the ${rel.roleTitle} position.`} You are welcome to continue; a DVAGO recruiter reviews every application carefully.`;
      } else if (rel && rel.level !== 'weak') {
        msg = `${filledNote} Your background looks relevant to the ${rel.roleTitle} role. Please double-check your details before continuing.`;
      } else {
        msg = filled ? `${filledNote} Please double-check them before continuing.` : `${filledNote} Please complete your details below.`;
      }
      if (bub) say(msg, $('.orb'), bub);
      ['fullName', 'email', 'phone', 'city', 'education', 'experience', 'employer'].forEach((k) => { const el = $('#' + k); if (el) S.candidate[k] = el.value.trim(); });
    } else if (bub) {
      UI.typeText(bub, 'Your resume is attached. I could not read its text automatically, so please fill in your details.', 18);
    }
    save();
    drawResume();
  }

  // ---------- Role ----------
  function renderRole() {
    const locked = S.invite && S.invite.role && B.ROLES[S.invite.role];
    if (locked) S.role = S.invite.role;
    
    screen(`<div class="glass panel">
      <span class="eyebrow">Step 1 · Choose your department</span>
      <h2 class="h2" style="margin-top:10px">${locked ? 'Your interview is for this department' : 'Which department are you applying to?'}</h2>
      <p class="lead" style="margin-top:6px">Your voice questions, scenarios and case study will be tailored to this department. Next you will pick your exact role.</p>
      ${locked ? `<div class="locked-note">${I('lock', 14)} Set by DVAGO HR in your invitation</div>` : ''}
      <div class="role-grid" id="roles"></div>
      <div class="row-end"><button class="btn btn-ghost" id="back">${I('left', 16)} Back</button><button class="btn btn-primary btn-lg" id="go" ${S.role ? '' : 'disabled'}>Continue ${I('right', 18)}</button></div>
    </div>`);
    function draw() {
      const list = Object.entries(B.ROLES).filter(([k, r]) => (!locked || k === S.role));
      $('#roles').innerHTML = list.map(([k, r], n) => `<button class="role ${S.role === k ? 'sel' : ''}" data-r="${k}" style="animation:fadeUp .5s var(--ease) ${n * 0.05}s both">
        <span class="tick">${I('check', 14)}</span><div class="r-ico">${I(r.icon, 24)}</div><b>${esc(r.title)}</b><span>${esc(r.tagline)}</span>
        <div class="r-meta"><span class="chip">${I('clock', 11).replace('class="ico', 'style="display:inline;vertical-align:-1px" class="ico')} ~40 min</span><span class="chip">Voice + Case study</span></div></button>`).join('');
      $$('#roles .role').forEach((b) => b.addEventListener('click', () => {
        if (locked) return;
        S.role = b.dataset.r; save();
        $$('#roles .role').forEach((x) => x.classList.toggle('sel', x === b));
        $('#go').disabled = false;
      }));
    }
    draw();
    $('#back').addEventListener('click', () => go(S.applyMode ? 'greet' : 'schedule'));
    $('#go').addEventListener('click', () => {
      if (!S.role) return;
      S.voice = []; S.voiceIdx = 0;
      S.position = null;
      go('position');
    });
    if (!locked) Voice.speak('Great. Now choose the department you are applying to.');
    else Voice.speak(`Your interview today is for the ${B.ROLES[S.role].title} department.`);
  }

  // ---------- Position selection ----------
  let allPositions = null;
  async function fetchPositions() {
    if (allPositions) return allPositions;
    try {
      allPositions = await Store.listPositions();
    } catch (e) {
      allPositions = [];
      Object.entries(B.DEFAULT_POSITIONS || {}).forEach(([roleKey, arr]) => arr.forEach((p) => allPositions.push(Object.assign({ roleKey }, p))));
    }
    return allPositions;
  }

  function renderPosition() {
    const r = role();
    screen(`<div class="glass panel">
      <span class="eyebrow">Step 1 · Specific position</span>
      <h2 class="h2" style="margin-top:10px">You picked <span class="grad-text">${esc(r.title)}</span></h2>
      <p class="lead" style="margin-top:6px">Choose the specific position that matches your experience. SARAH will tailor your interview and share the job description.</p>
      <div class="role-grid" id="positions" style="margin-top:22px"><p class="small muted">Loading positions…</p></div>
      <div class="row-end"><button class="btn btn-ghost" id="back">${I('left', 16)} Back</button><button class="btn btn-primary btn-lg" id="go" disabled>Continue ${I('right', 18)}</button></div>
    </div>`);
    $('#back').addEventListener('click', () => go('role'));
    Voice.speak(`You selected the ${r.title} role. Now please pick the specific position you are applying for.`);

    fetchPositions().then((all) => {
      const list = all.filter((p) => p.roleKey === S.role && p.isActive !== false);
      if (list.length === 0) {
        list.push({ id: S.role + '-default', roleKey: S.role, title: r.title, jd: 'A ' + r.title + ' role at DVAGO. Full job description will be shared by the recruiter.', isActive: true });
      }
      // An invitation from resume screening is for one specific position: no choice to make.
      const pinned = S.invite && S.invite.positionId && all.find((p) => p.id === S.invite.positionId);
      if (pinned) { S.position = pinned; save(); go('jd'); return; }
      if (list.length === 1) { S.position = list[0]; save(); go('jd'); return; }
      const grid = $('#positions');
      grid.innerHTML = list.map((p, n) => `<button class="role ${S.position && S.position.id === p.id ? 'sel' : ''}" data-id="${esc(p.id)}" style="animation:fadeUp .5s var(--ease) ${n * 0.05}s both">
        <span class="tick">${I('check', 14)}</span>
        <div class="r-ico">${I(r.icon, 24)}</div>
        <b>${esc(p.title)}</b>
        <span>${esc((p.jd || '').split('\n')[1] || '').slice(0, 120)}…</span>
        <div class="r-meta"><span class="chip">${I('file', 11).replace('class="ico', 'style="display:inline;vertical-align:-1px" class="ico')} View JD</span></div>
      </button>`).join('');
      $$('#positions .role').forEach((b) => b.addEventListener('click', () => {
        const p = list.find((x) => x.id === b.dataset.id);
        S.position = p;
        save();
        $$('#positions .role').forEach((x) => x.classList.toggle('sel', x === b));
        $('#go').disabled = false;
      }));
      if (S.position) $('#go').disabled = false;
      $('#go').addEventListener('click', () => { if (S.position) go('jd'); });
    });
  }

  // ---------- Job description screen ----------
  function renderJD() {
    const p = S.position;
    if (!p) return go('position');
    const r = role();
    const jd = String(p.jd || '').trim();
    // Real-time relevance of the uploaded resume to this specific position (role + JD now both known).
    const rel = (S.resume && S.resume.text) ? resumeRelevance(S.role, jd) : null;
    if (rel && S.resume && S.resume.insights) S.resume.insights.relevance = rel;
    // Split on double newlines (sections), or on a heading-like line followed by content
    const sections = jd.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    const renderSection = (s) => {
      const i = s.indexOf('\n');
      if (i < 0) return `<p>${esc(s)}</p>`;
      const head = s.slice(0, i).trim();
      const body = s.slice(i + 1).trim();
      const looksLikeHead = head.length < 60 && !/[.!?]$/.test(head);
      if (!looksLikeHead) return `<p>${esc(s)}</p>`;
      const bullets = body.split('\n').filter((l) => l.trim());
      const isList = bullets.length > 0 && bullets.every((l) => /^[•\-*]/.test(l));
      if (isList) return `<h4>${esc(head)}</h4><ul>${bullets.map((l) => `<li>${esc(l.replace(/^[•\-*]\s*/, ''))}</li>`).join('')}</ul>`;
      return `<h4>${esc(head)}</h4><p>${esc(body)}</p>`;
    };
    screen(`<div class="split">
      <aside class="glass side">
        <div class="dia-head">${orbHTML('orb-xs')}<div><strong>SARAH</strong><span class="small muted">Recruiter Agent · online</span></div></div>
        <div class="bubble"><span class="bubble-text" id="bub"></span></div>
        <div class="insights" style="margin-top:4px">
          <h4>${I('target', 14)} Your interview</h4>
          <div class="ins-row"><span>Role</span><b>${esc(r.title)}</b></div>
          <div class="ins-row"><span>Position</span><b>${esc(p.title)}</b></div>
          <div class="ins-row"><span>Category</span><b>${esc(B.CATEGORIES[r.category].label)}</b></div>
          <div class="ins-row"><span>Duration</span><b>~40 min</b></div>
        </div>
      </aside>
      <section class="glass form-card">
        <span class="eyebrow">Step 1 · Job description</span>
        <h2 class="h2" style="margin-top:10px">${esc(p.title)}</h2>
        <p class="muted" style="margin-top:4px">${esc(r.title)} · ${esc(B.CATEGORIES[r.category].label)} · DVAGO Pakistan</p>
        ${rel && rel.level === 'weak' ? `<div class="rel-warn">${I('alert', 18)}<div><b>Your experience may not match this position</b><span>Based on your resume, your background does not seem directly relevant to the ${esc(p.title)} role. You can still continue — a DVAGO recruiter reviews every application carefully.</span></div></div>` : ''}
        <div class="jd-doc">${sections.map(renderSection).join('')}</div>
        <div class="row-end"><button class="btn btn-ghost" id="back">${I('left', 16)} Change position</button><button class="btn btn-primary btn-lg btn-shine" id="go">Continue to my details ${I('right', 18)}</button></div>
      </section>
    </div>`);
    const orb = $('.orb');
    const jdSay = rel && rel.level === 'weak'
      ? `Here is the job description for the ${p.title} position. I should mention — based on your resume, your experience does not look directly relevant to this role. You are welcome to continue; our recruiters review every application. When you are ready, click to begin.`
      : `Here is the job description for the ${p.title} position. Your interview today will be tailored to this role. When you are ready, click continue.`;
    say(jdSay, orb, $('#bub'));
    $('#back').addEventListener('click', () => go('position'));
    $('#go').addEventListener('click', () => go('profile'));
  }

  // ---------- System check ----------
  function renderSyscheck() {
    const sr = Voice.canListen;
    screen(`<div class="glass panel panel-narrow">
      <span class="eyebrow">Step 3 · Quick system check</span>
      <h2 class="h2" style="margin-top:10px">Let's make sure SARAH can hear you</h2>
      <p class="lead" style="margin-top:6px">Next is a short voice conversation. It takes 30 seconds to check your setup.</p>
      <div class="checks">
        <div class="chk"><div class="k-ico">${I('globe', 20)}</div><div class="k-txt"><b>Browser voice support</b><span>${sr ? 'Speech recognition is available.' : 'Voice answers need Chrome or Edge — you can still type.'}</span></div><span class="k-state ${sr ? 'k-ok' : 'k-bad'}">${sr ? 'Ready' : 'Typing mode'}</span></div>
        <div class="chk"><div class="k-ico">${I('mic', 20)}</div><div class="k-txt"><b>Microphone</b><span id="micTxt">Click test and say a few words.</span></div><div class="meter" id="meter">${'<i></i>'.repeat(12)}</div><button class="btn btn-ghost btn-sm" id="micBtn">Test</button></div>
        <div class="chk"><div class="k-ico">${I('volume', 20)}</div><div class="k-txt"><b>Speakers</b><span id="spkTxt">Play a short message from SARAH.</span></div><button class="btn btn-ghost btn-sm" id="spkBtn">Play</button></div>
        <div class="chk"><div class="k-ico">${I('wifi', 20)}</div><div class="k-txt"><b>Internet</b><span>${navigator.onLine ? 'You are online.' : 'You appear to be offline.'}</span></div><span class="k-state ${navigator.onLine ? 'k-ok' : 'k-bad'}">${navigator.onLine ? 'Online' : 'Offline'}</span></div>
        <div class="chk"><div class="k-ico">${I('globe', 20)}</div><div class="k-txt"><b>Answer language</b><span>Speak in English or Urdu — SARAH understands both.</span></div><div class="lang-pick" id="lang"><button data-l="en-US">English</button><button data-l="ur-PK">اردو Urdu</button></div></div>
      </div>
      <div class="row-end"><button class="btn btn-ghost" id="back">${I('left', 16)} Back</button><button class="btn btn-primary btn-lg" id="go">Start voice interview ${I('right', 18)}</button></div>
    </div>`);
    let micOk = false, meter = null;
    const bars = $$('#meter i');
    const drawLang = () => $$('#lang button').forEach((b) => b.classList.toggle('on', b.dataset.l === S.voiceLang));
    drawLang();
    $$('#lang button').forEach((b) => b.addEventListener('click', () => { S.voiceLang = b.dataset.l; save(); drawLang(); }));
    $('#micBtn').addEventListener('click', async () => {
      try {
        if (meter) { meter.stop(); meter = null; }
        $('#micTxt').textContent = 'Listening… say "Hello SARAH".';
        meter = await Voice.meter((lvl) => {
          const n = Math.round(lvl * bars.length);
          bars.forEach((b, k) => { b.style.height = (20 + Math.min(80, lvl * 220 * Math.random() + k * 2)) + '%'; b.classList.toggle('on', k < n); });
          if (lvl > 0.12 && !micOk) { micOk = true; $('#micTxt').innerHTML = `<span style="color:var(--g-300)">Microphone works perfectly.</span>`; $('#micBtn').textContent = 'Working'; }
        });
      } catch (e) {
        $('#micTxt').innerHTML = `<span style="color:#ffaaad">Microphone blocked or not found. Allow access in your browser, or continue in typing mode.</span>`;
      }
    });
    $('#spkBtn').addEventListener('click', async () => {
      $('#spkTxt').textContent = 'Playing…';
      await Voice.speak('Hello! Can you hear me clearly? Great, let\'s continue.');
      $('#spkTxt').innerHTML = `<span style="color:var(--g-300)">Played. If you heard SARAH, your speakers are fine.</span>`;
    });
    onLeave(() => meter && meter.stop());
    $('#back').addEventListener('click', () => go('profile'));
    $('#go').addEventListener('click', async () => {
      // Pre-fetch admin-overridden voice questions for this role so renderVoice uses them
      try { S._voiceOverride = await fetchVoiceQuestions(S.role); } catch (e) { S._voiceOverride = null; }
      if (!sr || !micOk) {
        const m = modal(`<div class="m-ico">${I('keyboard', 30)}</div><h3 class="h3">${sr ? 'Microphone not confirmed' : 'Typing mode'}</h3>
          <p>${sr ? 'We could not confirm your microphone. You can continue and try speaking, or type your answers instead.' : 'Your browser does not support voice answers. You will type your answers instead — that is completely fine.'}</p>
          <div class="row">${sr ? '<button class="btn btn-ghost" id="mTry">Try speaking anyway</button>' : ''}<button class="btn btn-primary" id="mType">Continue by typing</button></div>`);
        $('#mType', m).addEventListener('click', () => { S.voiceTyping = true; go('voice'); });
        const t = $('#mTry', m); if (t) t.addEventListener('click', () => { S.voiceTyping = false; go('voice'); });
        return;
      }
      S.voiceTyping = false;
      go('voice');
    });
  }

  // ---------- Voice interview ----------
  async function fetchVoiceQuestions(roleKey) {
    try {
      const list = await Store.listVoiceQuestions(roleKey);
      if (Array.isArray(list) && list.length) return list;
    } catch (e) {}
    return rq().voice;
  }

  function renderVoice() {
    // Default: current role's hardcoded voice. If server has overrides, we fetch and re-render on return.
    const qs = (S._voiceOverride && S._voiceOverride.length) ? S._voiceOverride : rq().voice;
    screen(`<div class="voice-wrap">
      <aside class="glass voice-side">${orbHTML()}<div class="orb-label"><span class="live"></span> SARAH · Recruiter Agent</div>
        <div><div class="h3">Voice conversation</div><p class="small muted" id="vLabel"></p></div>
        <div class="v-progress" id="vProg">${qs.map(() => '<i></i>').join('')}</div>
        <p class="small muted">Speak naturally, like a real conversation. Aim for 1–2 minutes per answer. ${S.voiceLang === 'ur-PK' ? 'Answering in Urdu.' : ''}</p>
      </aside>
      <section class="glass voice-main">
        <div class="q-top"><span class="q-tag">${I('mic', 14)} Step 3 · Voice interview</span><span class="q-count" id="vCount"></span></div>
        <div class="chat" id="chat"></div>
        <div id="vCtl"></div>
      </section></div>`);
    const V = { qs, orb: $('.orb'), chat: $('#chat'), ctl: $('#vCtl'), rec: null, meter: null, timer: null, typing: S.voiceTyping || !Voice.canListen, part: 'main', live: null, t0: 0, alive: true, totalFollowUps: 0, perQFollowUps: 0, mediaRec: null, mediaChunks: [], mediaStream: null, vad: null, startAt: Date.now() };
    const onEnterKey = (ev) => { if (ev.key === 'Enter' && V.phase === 'recording' && !ev.repeat) { ev.preventDefault(); stopRec(false); } };
    document.addEventListener('keydown', onEnterKey);
    onLeave(() => { V.alive = false; document.removeEventListener('keydown', onEnterKey); stopRec(true); teardownAudio(); });

    function teardownAudio() {
      try { if (V.mediaRec && V.mediaRec.state !== 'inactive') V.mediaRec.stop(); } catch (e) {}
      try { if (V.keepStream) V.keepStream.getTracks().forEach((t) => t.stop()); } catch (e) {}
      try { if (V.mediaStream) V.mediaStream.getTracks().forEach((t) => t.stop()); } catch (e) {}
      try { if (V.vad) V.vad.destroy(); } catch (e) {}
      V.mediaRec = null; V.mediaStream = null; V.keepStream = null; V.vad = null;
    }

    function addMsg(who, text, meta) {
      const el = document.createElement('div');
      el.className = 'msg ' + (who === 'SARAH' ? 'dia' : who);
      el.innerHTML = who === 'SARAH' ? `<div style="display:block;line-height:0"><span class="who">SARAH</span></div><span class="bubble-text"></span>` : `<span class="txt">${esc(text)}</span>${meta ? `<span class="meta">${meta}</span>` : ''}`;
      if (who === 'SARAH') el.querySelector('.bubble-text').textContent = text;
      V.chat.appendChild(el);
      V.chat.scrollTop = V.chat.scrollHeight;
      return el;
    }
    const metaFor = (e) => `${e.mode === 'voice' ? '\u{1F399} Voice' : '\u2328 Typed'} · ${wc(e.answer)} words${e.durationSec ? ' · ' + mmss(Math.round(e.durationSec)) : ''}`;

    // rebuild previous turns after refresh
    for (let k = 0; k < S.voiceIdx; k++) {
      const e = S.voice[k]; if (!e) continue;
      addMsg('SARAH', qs[k].q); addMsg('me', e.answer, metaFor(e));
      if (e.followUp) { addMsg('SARAH', e.followUp.q); addMsg('me', e.followUp.answer, metaFor(e.followUp)); }
    }

    function progress() {
      const idx = S.voiceIdx;
      $$('#vProg i').forEach((b, k) => { b.className = k < idx ? 'done' : k === idx ? 'on' : ''; });
      $('#vLabel').textContent = idx < qs.length ? `Question ${idx + 1} of ${qs.length}` : (V.part === 'adaptive' ? `Final question ${V.adIdx + 1} of ${ADAPTIVE_COUNT}` : 'Complete');
      $('#vCount').textContent = idx < qs.length ? `${idx + 1} / ${qs.length}` : '';
    }

    async function ask(text, prefix) {
      setPhase('speaking');
      const full = prefix ? prefix + ' ' + text : text;
      const m = addMsg('SARAH', '');
      const bt = m.querySelector('.bubble-text');
      await say(full, V.orb, bt);
      if (!V.alive) return;
      setPhase('ready');
    }

    function entry() {
      if (V.part === 'adaptive') return S.adaptive[V.adIdx];
      const e = S.voice[S.voiceIdx];
      if (V.part === 'followUp') return e.followUp;
      if (V.part === 'clarify') return e.clarify;
      return e;
    }

    function setPhase(p) {
      V.phase = p;
      const ctl = V.ctl;
      if (p === 'speaking') { ctl.innerHTML = `<div class="mic-hint">SARAH is speaking…</div>`; return; }
      if (p === 'ready' && V.typing) {
        ctl.innerHTML = `<div class="type-box"><textarea class="input" id="typeAns" placeholder="Type your answer and press Enter to send (Shift+Enter for a new line)…" rows="4"></textarea>
          <div class="ans-tools"><span class="wc" id="twc"><b>0</b> words</span><div class="row">${Voice.canListen ? `<button class="btn btn-ghost btn-sm" id="useMic">${I('mic', 14)} Use microphone</button>` : ''}<button class="btn btn-primary" id="sendTyped">Send answer ${I('send', 16)}</button></div></div></div>`;
        const ta = $('#typeAns');
        ta.focus();
        ta.addEventListener('input', () => { $('#twc').innerHTML = `<b>${wc(ta.value)}</b> words`; });
        ta.addEventListener('paste', (e) => { e.preventDefault(); S.integrity.pasteAttempts++; logEvent('paste', 'voice typed answer'); UI.toast('Pasting is disabled — please type your own answer.', 'error'); });
        const um = $('#useMic'); if (um) um.addEventListener('click', () => { V.typing = false; setPhase('ready'); });
        const sendBtn = $('#sendTyped');
        const sendTyped = () => {
          const v = ta.value.trim();
          if (wc(v) < 1) return UI.toast('Please type your answer first.', 'error');
          if (sendBtn.disabled) return;
          sendBtn.disabled = true; ta.disabled = true;
          commit(v, 'text', 0);
        };
        sendBtn.addEventListener('click', sendTyped);
        ta.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); sendTyped(); } });
        return;
      }
      if (p === 'ready') {
        ctl.innerHTML = `<div class="v-controls"><span class="ans-timer" id="aTimer">${mmss(ANSWER_LIMIT)}</span><button class="mic" id="micB" aria-label="Start answering">${I('mic', 32)}</button><span style="min-width:52px"></span></div>
          <div class="mic-hint">Tap the mic and start speaking · <button class="btn-link" id="toType">type instead</button></div>`;
        $('#micB').addEventListener('click', startRec);
        $('#toType').addEventListener('click', () => { V.typing = true; setPhase('ready'); });
        return;
      }
      if (p === 'recording') {
        ctl.innerHTML = `<div class="v-controls"><span class="ans-timer" id="aTimer">${mmss(ANSWER_LIMIT)}</span><button class="mic rec" id="micB" aria-label="Finish answer">${I('stop', 28)}</button><span style="min-width:52px"></span></div>
          <div class="mic-hint">Listening… tap to finish when you're done</div>`;
        $('#micB').addEventListener('click', () => stopRec(false));
        return;
      }
      if (p === 'review') {
        const e = entry();
        ctl.innerHTML = `<div class="row" style="justify-content:center">${!e.redone ? `<button class="btn btn-ghost" id="redo">${I('refresh', 16)} Answer again</button>` : ''}<button class="btn btn-primary btn-lg" id="cont">Continue ${I('right', 18)}</button></div>`;
        const r = $('#redo');
        if (r) r.addEventListener('click', () => {
          e.redone = true; e.answer = ''; e.durationSec = 0;
          if (V.lastMe) V.lastMe.remove();
          setPhase('ready');
        });
        $('#cont').addEventListener('click', next);
      }
    }

    // One long-lived mic stream shared by the audio recorder (the speech recogniser uses the mic separately).
    // Acquired before recognition starts so Windows/Chrome don't refuse a second capture mid-answer.
    async function startAudioCapture() {
      V.mediaChunks = [];
      try {
        if (!V.keepStream || !V.keepStream.active) V.keepStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        V.mediaStream = V.keepStream;
        const mime = window.MediaRecorder && (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
        if (window.MediaRecorder) {
          V.mediaRec = new MediaRecorder(V.mediaStream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
          V.mediaRec.ondataavailable = (e) => { if (e.data && e.data.size) V.mediaChunks.push(e.data); };
          V.mediaRec.start(250);
        }
      } catch (e) { console.warn('[audio] recording unavailable:', e && (e.name || e.message) || e); V.mediaRec = null; }
    }

    async function startRec() {
      await startAudioCapture();
      V.live = addMsg('me', '');
      V.live.querySelector('.txt').innerHTML = '<span class="interim">Listening…</span>';
      V.rec = Voice.recognizer({
        lang: S.voiceLang,
        onText: (f, i) => { if (V.live) V.live.querySelector('.txt').innerHTML = esc(f) + ' <span class="interim">' + esc(i) + '</span>'; V.chat.scrollTop = V.chat.scrollHeight; },
        onError: (err) => {
          if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
            UI.toast('Microphone is not available — switching to typing.', 'error');
            stopRec(true);
            if (V.live) V.live.remove();
            V.typing = true; setPhase('ready');
          } else if (err === 'network') UI.toast('Voice service needs internet. You can type instead.', 'error');
        }
      });
      if (!V.rec) { V.typing = true; return setPhase('ready'); }
      V.rec.start();
      V.t0 = Date.now();
      orbState(V.orb, 'listening');
      setPhase('recording');

      // ---- VAD auto-stop after ~1.5s silence (optional, graceful fallback) ----
      try {
        if (window.VAD && VAD.isSupported()) {
          V.vad = await VAD.startMic({
            onSpeechEnd: () => { if (V.rec && V.phase === 'recording') { setTimeout(() => { if (V.phase === 'recording') stopRec(false); }, 100); } }
          });
        }
      } catch (e) { console.warn('VAD unavailable, using manual stop', e); }

      try {
        V.meter = await Voice.meter((lvl) => { V.orb.style.setProperty('--lvl', lvl.toFixed(2)); const mb = $('#micB'); if (mb) mb.style.setProperty('--lvl', lvl.toFixed(2)); });
      } catch (e) {}
      V.timer = setInterval(() => {
        const left = ANSWER_LIMIT - Math.floor((Date.now() - V.t0) / 1000);
        const t = $('#aTimer'); if (t) t.textContent = mmss(Math.max(0, left));
        if (left <= 0) stopRec(false);
      }, 500);
    }

    async function stopRec(silent) {
      clearInterval(V.timer); V.timer = null;
      if (V.meter) { V.meter.stop(); V.meter = null; }
      if (V.orb) { V.orb.style.setProperty('--lvl', 0); orbState(V.orb, 'idle'); }
      try { if (V.vad) V.vad.destroy(); } catch (e) {} V.vad = null;
      // Stop the media recorder and collect its blob (fire the stop event)
      let audioBlob = null;
      if (V.mediaRec && V.mediaRec.state !== 'inactive') {
        audioBlob = await new Promise((resolve) => {
          V.mediaRec.onstop = () => resolve(new Blob(V.mediaChunks, { type: V.mediaRec.mimeType || 'audio/webm' }));
          try { V.mediaRec.stop(); } catch (e) { resolve(null); }
        });
      }
      V.mediaStream = null;
      V.mediaRec = null;
      if (!audioBlob || !audioBlob.size) console.warn('[audio] no audio captured for this answer');
      if (!V.rec) return;
      const rec = V.rec; V.rec = null;
      rec.stop();
      if (silent) return;
      const dur = (Date.now() - V.t0) / 1000;
      setPhase('speaking');
      V.ctl.innerHTML = `<div class="mic-hint">Processing your answer…</div>`;
      setTimeout(async () => {
        const browserText = rec.text.trim();
        let audioData = null;
        if (audioBlob && audioBlob.size) {
          try {
            audioData = await new Promise((resolve, reject) => {
              const r = new FileReader(); r.onload = () => resolve({ dataUrl: r.result, size: audioBlob.size, mime: audioBlob.type }); r.onerror = reject; r.readAsDataURL(audioBlob);
            });
          } catch (e) {}
        }
        // Accurate final text from Whisper (server); falls back to the browser's live text when unavailable.
        let text = browserText, engine = 'browser';
        const wt = audioData && dur >= 1 ? await whisperText(audioData.dataUrl) : '';
        if (wt && !(HALLUCINATION.test(wt) && browserText)) { text = wt; engine = 'whisper'; }
        if (!text) {
          if (V.live) V.live.remove();
          UI.toast("I couldn't catch that — please try again or type your answer.", 'error');
          return setPhase('ready');
        }
        if (V.live) V.live.remove();
        commit(text, 'voice', dur, audioData, engine, browserText);
      }, 700);
    }

    // Whisper on the server: returns the transcript, or '' if unavailable / timed out (caller then uses the browser text).
    const HALLUCINATION = /^\W*(thank you( so much)?( for watching)?|thanks for watching|you|bye)\W*$/i;
    async function whisperText(dataUrl) {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => ctl && ctl.abort(), 25000);
      try {
        const res = await fetch('api/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined, body: JSON.stringify({ audio: dataUrl, lang: S.voiceLang }) });
        if (!res.ok) return '';
        const d = await res.json();
        return d && d.ok && d.text ? String(d.text).trim() : '';
      } catch (e) { return ''; } finally { clearTimeout(timer); }
    }

    function commit(text, mode, dur, audio, engine, browserText) {
      const e = entry();
      e.answer = text; e.mode = mode; e.durationSec = Math.round(dur);
      if (engine) { e.stt = engine; if (engine === 'whisper' && browserText && browserText !== text) e.sttBrowser = browserText; }
      if (audio && V.part !== 'adaptive') e.audio = { dataUrl: audio.dataUrl, mime: audio.mime, size: audio.size, duration: Math.round(dur) };
      V.lastMe = addMsg('me', text, metaFor(e));
      save();
      next();
    }

    // Ask SARAH's brain (server -> Groq) what to do after an answer: follow up, clarify, or move on with a natural reaction.
    async function judge(q, answerText, isFollowUp) {
      let fu = { action: 'next' };
      try {
        setPhase('speaking');
        V.ctl.innerHTML = `<div class="mic-hint">SARAH is thinking…</div>`;
        orbState(V.orb, 'thinking');
        const res = await fetch('api/sarah-followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleTitle: role().title,
            questionText: isFollowUp ? S.voice[S.voiceIdx].followUp.q : q.q,
            answerText,
            isFollowUp: !!isFollowUp,
            rubric: (q.checks || []).map((c) => c.label),
            rubricCovered: (q.checks || []).filter((c) => (c.kw || []).some((kw) => answerText.toLowerCase().includes(String(kw).toLowerCase()))).map((c) => c.label),
            alreadyAskedForQ: V.perQFollowUps,
            totalAsked: V.totalFollowUps,
            alreadyClarified: V.perQClarifies || 0,
            elapsedSec: Math.round((Date.now() - V.startAt) / 1000)
          })
        });
        if (res.ok) fu = await res.json();
      } catch (err) { console.warn('follow-up fetch failed', err); }
      return fu;
    }

    function advance(fu) {
      V.part = 'main';
      V.perQFollowUps = 0;
      V.perQClarifies = 0;
      S.voiceIdx++;
      save();
      progress();
      if (S.voiceIdx >= qs.length) return adaptiveStep(fu && fu.ack);
      begin((fu && fu.ack) || ACKS[S.voiceIdx % ACKS.length]);
    }

    async function next() {
      if (V.part === 'adaptive') {
        const ack = ACKS[(V.adIdx + 1) % ACKS.length];
        return adaptiveDone() >= ADAPTIVE_COUNT ? finish(ack) : adaptiveStep(ack);
      }
      const e = S.voice[S.voiceIdx];
      const q = qs[S.voiceIdx];
      // Reply to one of SARAH's follow-ups: she reacts naturally, then moves to the next main question.
      if (V.part === 'followUp') {
        const fu = await judge(q, e.followUp.answer || '', true);
        return advance(fu);
      }
      // Main answer (or clarify-retry). If we came from clarify, its answer is the REAL answer.
      const effectiveAnswer = (V.part === 'clarify' && e.clarify && e.clarify.answer) ? e.clarify.answer : e.answer;
      const fu = await judge(q, effectiveAnswer, false);

      // Clarify: SARAH politely asks the candidate to try again — no budget consumed
      if (fu.action === 'clarify' && fu.q && (V.perQClarifies || 0) < 1) {
        V.part = 'clarify';
        V.perQClarifies = (V.perQClarifies || 0) + 1;
        e.clarify = { q: fu.q, answer: '', mode: null, durationSec: 0 };
        save();
        return ask(fu.q);
      }

      if (fu.action === 'followup' && fu.q && V.perQFollowUps < 2 && V.totalFollowUps < 5) {
        V.part = 'followUp';
        V.perQFollowUps++;
        V.totalFollowUps++;
        e.followUp = { q: fu.q, answer: '', mode: null, durationSec: 0 };
        save();
        return ask(fu.q);
      }

      // No follow-up — react naturally and move on
      advance(fu);
    }

    function begin(prefix) {
      const k = S.voiceIdx;
      if (!S.voice[k]) S.voice[k] = { id: qs[k].id, q: qs[k].q, answer: '', mode: null, durationSec: 0 };
      V.part = S.voice[k].followUp && S.voice[k].answer ? 'followUp' : 'main';
      const e = entry();
      if (e && e.answer) {
        V.lastMe = addMsg('me', e.answer, metaFor(e));
        return next();
      }
      ask(V.part === 'main' ? qs[k].q : S.voice[k].followUp.q, prefix);
    }

    // ---- Adaptive deep-dive questions (AI-written from resume + JD + answers; fixed backup if the AI is unavailable) ----
    const adaptiveDone = () => (S.adaptive || []).filter((a) => a.answer).length;
    async function aiAdaptive() {
      const turns = [];
      (S.voice || []).forEach((v) => {
        if (v && v.answer) turns.push({ q: v.q, a: v.answer });
        if (v && v.followUp && v.followUp.answer) turns.push({ q: v.followUp.q, a: v.followUp.answer });
      });
      (S.adaptive || []).filter((a) => a.answer).forEach((a) => turns.push({ q: a.q, a: a.answer }));
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => ctl && ctl.abort(), 12000);
      try {
        const res = await fetch('api/sarah-adaptive', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
          body: JSON.stringify({ roleTitle: role().title, positionTitle: S.position ? S.position.title : '', jd: S.position ? S.position.jd : '', resumeText: S.resume && S.resume.text ? S.resume.text : '', turns, asked: (S.adaptive || []).map((a) => a.q) })
        });
        if (!res.ok) return null;
        const d = await res.json();
        return d && d.ok && d.q ? { q: d.q, why: d.why || '', source: 'ai' } : null;
      } catch (e) { return null; } finally { clearTimeout(timer); }
    }
    async function adaptiveStep(prefix) {
      if (!Array.isArray(S.adaptive)) S.adaptive = [];
      if (adaptiveDone() >= ADAPTIVE_COUNT) return finish(prefix);
      let idx = S.adaptive.findIndex((a) => !a.answer);
      if (idx < 0) {
        setPhase('speaking');
        V.ctl.innerHTML = '<div class="mic-hint">SARAH is thinking…</div>';
        orbState(V.orb, 'thinking');
        let item = await aiAdaptive();
        if (!V.alive) return;
        if (!item) item = { q: ADAPTIVE_BACKUP[S.adaptive.length % ADAPTIVE_BACKUP.length], why: 'Standard backup question (AI was unavailable).', source: 'backup' };
        S.adaptive.push(Object.assign({ answer: '', mode: null, durationSec: 0 }, item));
        idx = S.adaptive.length - 1;
        save();
      }
      V.part = 'adaptive'; V.adIdx = idx;
      progress();
      const lead = [prefix, idx === 0 ? 'I have two quick questions about your background.' : ''].filter(Boolean).join(' ');
      ask(S.adaptive[idx].q, lead);
    }

    async function finish(ack) {
      setPhase('speaking');
      const m = addMsg('SARAH', '');
      await say(`${ack ? ack + ' ' : ''}Thank you${first() ? ' ' + first() : ''}! That's our conversation done. Next, I'll explain your assessment.`, V.orb, m.querySelector('.bubble-text'));
      if (V.alive) setTimeout(() => go('brief'), 600);
    }

    // rebuild answered deep-dive turns after a refresh
    (S.adaptive || []).forEach((a) => { if (a.answer) { addMsg('SARAH', a.q); addMsg('me', a.answer, metaFor(a)); } });

    progress();
    if (S.voiceIdx >= qs.length) return adaptiveStep('');
    begin(S.voiceIdx === 0 ? `Let's begin, ${first() || 'and relax'}.` : '');
  }

  // ---------- Assessment briefing ----------
  function examPlan() {
    const q = rq();
    return [
      { key: 'sjt', items: q.sjt },
      { key: 'simulation', items: [q.simulation] },
      { key: 'case', items: q.caseStudy.questions },
      { key: 'reasoning', items: q.reasoning.concat([{ id: 'game', game: true }]) }
    ];
  }
  const totalMinutes = () => B.SECTIONS.reduce((s, x) => s + x.minutes, 0);

  function renderBrief() {
    const plan = examPlan();
    const counts = [`${plan[0].items.length} scenarios`, '1 task', `${plan[2].items.length} questions`, `${plan[3].items.length - 1} questions + 1 challenge`];
    const totalQ = plan.reduce((s, p) => s + p.items.length, 0);
    screen(`<div class="glass panel">
      <span class="eyebrow">Step 4 · Assessment briefing</span>
      <h2 class="h2" style="margin-top:10px">Here's what your assessment looks like</h2>
      <p class="lead" style="margin-top:6px">Built around real situations at DVAGO for the <b style="color:#fff">${esc(role().title)}</b> role. There are no trick questions.</p>
      <div class="sec-grid">${B.SECTIONS.map((s, k) => `<div class="sec-card" style="animation-delay:${0.1 + k * 0.1}s"><div class="s-ico">${I(s.icon, 22)}</div><span class="s-num">SECTION ${k + 1}</span><b>${s.label}</b><span>${s.desc}</span><span class="s-time">${I('clock', 13)} ~${s.minutes} min · ${counts[k]}</span></div>`).join('')}</div>
      <div class="stat-strip"><div><b>${totalMinutes()} min</b><span>Total time (one timer)</span></div><div><b>${totalQ}</b><span>Tasks &amp; questions</span></div><div><b>1 attempt</b><span>No retakes after submission</span></div></div>
      <h3 class="h3" style="margin-top:26px">Rules &amp; integrity</h3>
      <div class="rules">
        <div class="rule">${I('eye', 16)} The assessment runs in fullscreen. Leaving the tab or fullscreen is recorded.</div>
        <div class="rule">${I('lock', 16)} Copy &amp; paste are disabled. Answers must be your own.</div>
        <div class="rule">${I('mic', 16)} In the case study you can type or speak your answers.</div>
        <div class="rule">${I('layers', 16)} Once you move to the next section you cannot go back.</div>
        <div class="rule">${I('clock', 16)} The timer keeps running even if you refresh the page.</div>
        <div class="rule">${I('zap', 16)} When time runs out, your answers are submitted automatically.</div>
      </div>
      <label class="check" style="margin-top:22px"><input type="checkbox" id="agree"><span>I have read the instructions and will complete this assessment honestly, on my own, without outside help or AI tools.</span></label>
      <div class="ready-box"><div><b class="h3">Are you ready to start now?</b><p class="small muted">The ${totalMinutes()}-minute timer starts as soon as you click start.</p></div>
        <div class="row"><button class="btn btn-ghost" id="notYet">Not yet</button><button class="btn btn-primary btn-lg btn-shine" id="start" disabled>Yes, start my assessment ${I('right', 18)}</button></div></div>
    </div>`);
    say(`Your assessment has four sections and takes about ${totalMinutes()} minutes. Please read the rules carefully, and when you are ready, click start. Good luck!`, null, null);
    $('#agree').addEventListener('change', (e) => { $('#start').disabled = !e.target.checked; });
    $('#notYet').addEventListener('click', () => {
      const m = modal(`<div class="m-ico green">${I('clock', 30)}</div><h3 class="h3">Take a moment</h3><p>Get a glass of water and settle in. Click start whenever you're ready — the timer has not started yet.</p><div class="row"><button class="btn btn-primary" id="ok">I'm ready</button></div>`);
      $('#ok', m).addEventListener('click', closeModal);
    });
    $('#start').addEventListener('click', async () => {
      const btn = $('#start'); btn.disabled = true; btn.innerHTML = `Loading… ${I('refresh', 16)}`;
      try { S._customRQ = await fetchAllOverrides(S.role); } catch (e) { S._customRQ = null; }
      await enterFullscreen();
      const now = Date.now();
      const sim = rq().simulation;
      S.answers.simulation = S.answers.simulation || shuffle(sim.items.map((x) => x.id), sim.ideal);
      S.game = S.game || makeGame();
      S.exam = { sec: 0, q: 0, startedAt: new Date(now).toISOString(), endsAt: now + totalMinutes() * 60000, warned5: false, warned1: false };
      logEvent('start', 'assessment started');
      go('exam');
    });
  }

  function shuffle(ids, ideal) {
    let a = ids.slice();
    for (let t = 0; t < 10; t++) {
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      if (a.join() !== ideal.join()) break;
    }
    return a;
  }

  function makeGame() {
    const ch = rq().challenge;
    if (ch && Array.isArray(ch.tiles) && ch.tiles.length >= 4) {
      const items = ch.tiles.map((t, k) => ({ id: 'p' + k, name: t.name, line2: t.line2 || '', line3: t.line3 || '', target: !!t.target })).sort(() => Math.random() - 0.5);
      return { custom: true, title: ch.title, prompt: ch.prompt, intro: ch.intro, seconds: ch.seconds || GAME_SECONDS, items, today: null, started: false, done: false, picks: [], startedAt: null };
    }
    const names = ['Paracetamol 500mg', 'Ibuprofen 400mg', 'Amoxicillin 500mg', 'Omeprazole 20mg', 'ORS Sachets', 'Cough Syrup 120ml', 'Vitamin C 500mg', 'Cetirizine 10mg', 'Metformin 500mg', 'Insulin Pen', 'Zinc Syrup', 'Antacid Suspension', 'Multivitamin', 'Aspirin 75mg', 'Loratadine 10mg', 'Calcium + D3'];
    const pool = names.sort(() => Math.random() - 0.5).slice(0, 12);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const offsets = [-40, -6, 9, 24, 33, 47, 95, 160, 240, 380, 520, 700].sort(() => Math.random() - 0.5);
    const items = pool.map((n, k) => {
      const d = new Date(today); d.setDate(d.getDate() + offsets[k]);
      return { id: 'p' + k, name: n, batch: 'B' + (1000 + Math.floor(Math.random() * 8999)), exp: d.toISOString(), target: offsets[k] <= 30 };
    });
    return { items, today: today.toISOString(), started: false, done: false, picks: [], startedAt: null };
  }

  // ---------- Exam ----------
  let examTimer = null;
  function renderExam() {
    const plan = examPlan();
    let gameInterval = null;
    onLeave(() => clearInterval(gameInterval));
    stageEl.innerHTML = `<div class="exam-full" id="examFull">
      <header class="exam-head">
        <div class="eh-steps" id="ehSteps"></div>
        <div class="eh-right">
          <div class="q-dots" id="qDots"></div>
        </div>
      </header>
      <div class="exam-body">
        <section class="exam-question" id="qTop"></section>
        <section class="exam-answer" id="qBottom"></section>
      </div>
      <footer class="exam-foot" id="qFoot"></footer>
    </div>`;
    $('#tbProctor').innerHTML = `<span class="live"></span> Proctoring on`;
    installProctoring();
    startTimer();
    draw();

    function answered(secKey, item) {
      const a = S.answers;
      if (secKey === 'sjt') return a.sjt[item.id] != null;
      if (secKey === 'simulation') return a.simulationTouched;
      if (secKey === 'case') return wc(a.case[item.id]) > 0;
      if (item.game) return !!(a.game && a.game.done);
      return a.reasoning[item.id] != null;
    }

    function draw() {
      const ex = S.exam;
      const sec = plan[ex.sec];
      const item = sec.items[ex.q];
      const isLastQ = ex.q === sec.items.length - 1;
      const isLastSec = ex.sec === plan.length - 1;

      // Section pills at top
      $('#ehSteps').innerHTML = plan.map((p, k) => {
        const meta = B.SECTIONS[k];
        const st = k < ex.sec ? 'done' : k === ex.sec ? 'on' : '';
        const done = p.items.filter((it) => answered(p.key, it)).length;
        return `<div class="eh-step ${st}"><span class="n">${k < ex.sec ? I('check', 10) : k + 1}</span><span class="lbl">${esc(meta.label)}</span><span class="small">${done}/${p.items.length}</span></div>`;
      }).join('');

      // Question dots
      $('#qDots').innerHTML = sec.items.map((it, j) => `<button data-j="${j}" class="${answered(sec.key, it) ? 'ans' : ''} ${j === ex.q ? 'cur' : ''}" aria-label="Question ${j + 1}">${it.game ? '★' : j + 1}</button>`).join('');
      $$('#qDots button').forEach((b) => b.addEventListener('click', () => { S.exam.q = +b.dataset.j; save(); draw(); }));

      const top = $('#qTop');
      const bot = $('#qBottom');
      top.className = 'exam-question' + ((sec.key === 'reasoning' || sec.key === 'simulation') ? ' narrow' : '');
      top.innerHTML = `<div class="q-top-tags"><span class="q-tag">${I(B.SECTIONS[ex.sec].icon, 13)} Section ${ex.sec + 1} · ${esc(B.SECTIONS[ex.sec].label)}</span><span class="q-count">${item.game ? 'Attention challenge' : `Question ${ex.q + 1} of ${sec.items.length}`}</span></div>`;
      bot.innerHTML = '';

      if (sec.key === 'sjt') drawSJT(top, bot, item);
      else if (sec.key === 'simulation') drawSim(top, bot, item);
      else if (sec.key === 'case') drawCase(top, bot, item);
      else if (item.game) drawGame(top, bot);
      else drawMCQ(top, bot, item);

      const keyHint = (sec.key === 'sjt' || (sec.key === 'reasoning' && !item.game))
        ? `<span class="kbd-hint">Press <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> to pick · <kbd>←</kbd> <kbd>→</kbd> to navigate</span>`
        : `<span class="kbd-hint">Press <kbd>←</kbd> <kbd>→</kbd> to navigate</span>`;
      $('#qFoot').innerHTML = `
        <button class="btn btn-ghost" id="prevQ" ${ex.q === 0 ? 'disabled' : ''}>${I('left', 16)} Previous</button>
        ${keyHint}
        ${!isLastQ ? `<button class="btn btn-primary" id="nextQ">Next ${I('right', 16)}</button>` : isLastSec ? `<button class="btn btn-primary btn-shine" id="submitBtn">Submit assessment ${I('check', 16)}</button>` : `<button class="btn btn-primary" id="nextSec">Finish section ${I('right', 16)}</button>`}`;
      $('#prevQ').addEventListener('click', () => { S.exam.q--; save(); draw(); });
      const n = $('#nextQ'); if (n) n.addEventListener('click', () => { S.exam.q++; save(); draw(); });
      const ns = $('#nextSec'); if (ns) ns.addEventListener('click', confirmNextSection);
      const sb = $('#submitBtn'); if (sb) sb.addEventListener('click', confirmSubmit);
    }
    S._redraw = draw;

    function drawSJT(top, bot, q) {
      const sel = S.answers.sjt[q.id];
      top.innerHTML += `<div class="scenario"><h3>${esc(q.title)}</h3><p>${esc(q.scenario)}</p></div><div class="q-text">${esc(q.question)}</div>`;
      bot.innerHTML = `<div class="exam-answer-head"><span>Choose the most effective action</span><span class="ea-tip">Tip: press A–D on your keyboard</span></div>
        <div class="opts">${q.options.map((o, k) => `<button class="opt ${sel === k ? 'sel' : ''}" data-k="${k}"><span class="L">${'ABCD'[k]}</span><span>${esc(o.t)}</span></button>`).join('')}</div>`;
      $$('.opt', bot).forEach((b) => b.addEventListener('click', () => { S.answers.sjt[q.id] = +b.dataset.k; save(); draw(); }));
    }

    function drawMCQ(top, bot, q) {
      const sel = S.answers.reasoning[q.id];
      top.innerHTML += `<div class="q-text">${esc(q.q)}</div>`;
      bot.innerHTML = `<div class="exam-answer-head"><span>Select the correct answer</span><span class="ea-tip">Tip: press A–D on your keyboard</span></div>
        <div class="opts">${q.options.map((o, k) => `<button class="opt ${sel === k ? 'sel' : ''}" data-k="${k}"><span class="L">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
      $$('.opt', bot).forEach((b) => b.addEventListener('click', () => { S.answers.reasoning[q.id] = +b.dataset.k; save(); draw(); }));
    }

    function drawSim(top, bot, sim) {
      const map = Object.fromEntries(sim.items.map((x) => [x.id, x.t]));
      top.innerHTML += `<div class="scenario"><h3>${esc(sim.title)}</h3><p>${esc(sim.brief)}</p></div>`;
      bot.innerHTML = `<div class="exam-answer-head"><span>Rank your tasks</span><span class="ea-tip">Drag items or use the arrows · Top = first</span></div><div class="rank-list" id="rank"></div>`;
      const list = $('#rank', bot);
      function paint() {
        const order = S.answers.simulation;
        list.innerHTML = order.map((id, k) => `<div class="rank" draggable="true" data-id="${id}"><span class="grip">${I('grip', 18)}</span><span class="pos">${k + 1}</span><span class="rt">${esc(map[id])}</span>
          <span class="mv"><button data-mv="-1" ${k === 0 ? 'disabled' : ''} aria-label="Move up">${I('up', 16)}</button><button data-mv="1" ${k === order.length - 1 ? 'disabled' : ''} aria-label="Move down">${I('down', 16)}</button></span></div>`).join('');
        $$('.rank', list).forEach((el) => {
          el.addEventListener('dragstart', (e) => { el.classList.add('dragging'); e.dataTransfer.setData('text/plain', el.dataset.id); });
          el.addEventListener('dragend', () => el.classList.remove('dragging'));
          el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('over'); });
          el.addEventListener('dragleave', () => el.classList.remove('over'));
          el.addEventListener('drop', (e) => {
            e.preventDefault();
            const from = e.dataTransfer.getData('text/plain'), to = el.dataset.id;
            if (from === to) return;
            const o = S.answers.simulation.filter((x) => x !== from);
            o.splice(o.indexOf(to) + (S.answers.simulation.indexOf(from) < S.answers.simulation.indexOf(to) ? 1 : 0), 0, from);
            move(o);
          });
          $$('[data-mv]', el).forEach((b) => b.addEventListener('click', () => {
            const o = S.answers.simulation.slice(); const i = o.indexOf(el.dataset.id), j = i + +b.dataset.mv;
            [o[i], o[j]] = [o[j], o[i]]; move(o);
          }));
        });
      }
      function move(o) {
        const wasTouched = S.answers.simulationTouched;
        S.answers.simulation = o; S.answers.simulationTouched = true; save();
        if (!wasTouched) draw(); else paint();
      }
      paint();
    }

    function drawCase(top, bot, q) {
      const cs = rq().caseStudy;
      const val = S.answers.case[q.id] || '';
      top.innerHTML += `<div class="q-text q-text-sm">${esc(q.q)}</div>`;
      bot.innerHTML = `<div class="exam-answer-head"><span>Analyse the case and write your answer</span><span class="ea-tip">You can also click 'Speak answer' to dictate</span></div>
        <div class="case-split">
          <div class="case-ctx"><span class="eyebrow">Case study</span><h3 style="margin-top:8px">${esc(cs.title)}</h3><p>${esc(cs.context)}</p>
            <table class="exhibit"><caption>${esc(cs.exhibit.caption)}</caption><thead><tr>${cs.exhibit.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${cs.exhibit.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <div class="case-ans">
            <textarea class="input" id="caseTa" placeholder="Write your answer — use steps or bullet points if it helps. You can also click 'Speak answer'.">${esc(val)}</textarea>
            <div class="interim-line" id="interim"></div>
            <div class="ans-tools"><span class="wc" id="cwc"></span>${Voice.canListen ? `<button class="dictate" id="dict">${I('mic', 15)} Speak answer</button>` : ''}</div>
          </div>
        </div>`;
      const ta = $('#caseTa', bot);
      const updWc = () => { const n = wc(ta.value); const el = $('#cwc', bot); el.className = 'wc' + (n >= 80 ? ' good' : ''); el.innerHTML = `<b>${n}</b> words · aim for 80–250`; };
      updWc();
      ta.addEventListener('input', () => { S.answers.case[q.id] = ta.value; updWc(); saveSoon(); markDots(); });
      ta.addEventListener('paste', (e) => { e.preventDefault(); S.integrity.pasteAttempts++; logEvent('paste', 'case ' + q.id); UI.toast('Pasting is disabled — please write your own answer.', 'error'); });
      ta.addEventListener('drop', (e) => e.preventDefault());
      const d = $('#dict', bot);
      if (d) {
        let rec = null, base = '';
        const stop = () => { if (rec) { rec.stop(); rec = null; } d.classList.remove('rec'); d.innerHTML = `${I('mic', 15)} Speak answer`; $('#interim', bot).textContent = ''; };
        d.addEventListener('click', () => {
          if (rec) return stop();
          base = ta.value.trim();
          rec = Voice.recognizer({
            lang: S.voiceLang,
            onText: (f, i) => { ta.value = (base ? base + ' ' : '') + f; S.answers.case[q.id] = ta.value; updWc(); saveSoon(); $('#interim', bot).textContent = i; },
            onError: (err) => { if (err === 'not-allowed' || err === 'audio-capture') { UI.toast('Microphone not available — please type.', 'error'); stop(); } }
          });
          rec.start();
          S.answers.caseMode[q.id] = 'voice';
          d.classList.add('rec'); d.innerHTML = `<span class="pulse"></span> Listening… click to stop`;
        });
        onLeave(stop);
        S._stopDictation = stop;
      }
    }

    function markDots() {
      const sec = plan[S.exam.sec];
      $$('#qDots button').forEach((b, j) => b.classList.toggle('ans', answered(sec.key, sec.items[j])));
    }

    function drawGame(top, bot) {
      clearInterval(gameInterval);
      const G = S.game;
      const SECS = G.seconds || GAME_SECONDS;
      const oldQ = top.querySelector('.q-text'); if (oldQ) oldQ.remove();
      top.innerHTML += `<div class="q-text">${esc(G.custom ? (G.prompt || G.title || 'Attention challenge') : 'Attention challenge — spot expired or near-expiry products')}</div>`;
      if (!G.started) {
        const introText = G.custom
          ? `${esc(G.intro || 'Tap every item that matches the instruction.')} You have <b style="color:var(--text)">${SECS} seconds</b>. Accuracy matters more than speed.`
          : `You'll see 12 products on a pharmacy shelf. In <b style="color:var(--text)">${SECS} seconds</b>, tap every product that is <b style="color:var(--text)">already expired or expires within 30 days</b> of today. Accuracy matters more than speed.`;
        bot.innerHTML = `<div class="game-intro"><div class="g-ico">${I('eye', 34)}</div><h3 class="h2">${esc(G.custom ? (G.title || 'Attention challenge') : 'Expiry Check challenge')}</h3>
          <p class="muted" style="max-width:520px">${introText}</p>
          <button class="btn btn-primary btn-lg" id="gStart">${I('zap', 18)} Start challenge</button><span class="small muted">You can play this only once.</span></div>`;
        $('#gStart', bot).addEventListener('click', () => { G.started = true; G.startedAt = Date.now(); save(); drawGame(top, bot); });
        return;
      }
      const today = G.today ? new Date(G.today) : null;
      const tile = (p) => G.custom
        ? `<b>${esc(p.name)}</b>${p.line2 ? `<span>${esc(p.line2)}</span>` : ''}${p.line3 ? `<span class="exp">${esc(p.line3)}</span>` : ''}`
        : `<b>${esc(p.name)}</b><span>Batch ${p.batch}</span><span class="exp">EXP ${fmtShort(new Date(p.exp))}</span>`;
      bot.innerHTML = `<div class="game-head">${today && !G.custom ? `<span class="today">Today: ${fmtShort(today)}</span>` : '<span></span>'}<span class="small muted" id="gLeft"></span>${G.done ? '' : '<button class="btn btn-ghost btn-sm" id="gDone">I\'m done</button>'}</div>
        <div class="game-bar"><i id="gBar" style="width:100%"></i></div>
        <div class="game-grid">${G.items.map((p) => {
          const picked = G.picks.includes(p.id);
          const cls = G.done ? (p.target && picked ? 'hit' : p.target ? 'miss' : picked ? 'pick' : '') : picked ? 'pick' : '';
          return `<button class="prod ${cls}" data-id="${p.id}" ${G.done ? 'disabled' : ''}>${tile(p)}</button>`;
        }).join('')}</div>
        ${G.done ? `<p class="small muted" style="margin-top:14px">${I('check', 14).replace('class="ico', 'style="display:inline;vertical-align:-2px" class="ico')} Challenge complete — green = correctly spotted, gold = missed, red = ${G.custom ? 'should not have been selected' : 'not actually expiring'}.</p>` : ''}`;
      if (G.done) { $('#gBar', bot).style.width = '0%'; return; }
      $$('.prod', bot).forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.id; const i = G.picks.indexOf(id);
        i >= 0 ? G.picks.splice(i, 1) : G.picks.push(id);
        b.classList.toggle('pick'); saveSoon();
      }));
      $('#gDone', bot).addEventListener('click', endGame);
      const tick = () => {
        const left = SECS - (Date.now() - G.startedAt) / 1000;
        const bar = $('#gBar'); if (bar) bar.style.width = Math.max(0, (left / SECS) * 100) + '%';
        const l = $('#gLeft'); if (l) l.textContent = Math.max(0, Math.ceil(left)) + 's left';
        if (left <= 0) endGame();
      };
      tick();
      gameInterval = setInterval(tick, 250);
      function endGame() {
        clearInterval(gameInterval);
        if (G.done) return;
        G.done = true;
        const targets = G.items.filter((p) => p.target);
        const hits = targets.filter((p) => G.picks.includes(p.id)).length;
        const fp = G.picks.filter((id) => !G.items.find((p) => p.id === id).target).length;
        S.answers.game = { targets: targets.length, hits, falsePositives: fp, timeUsed: Math.round(Math.min(SECS, (Date.now() - G.startedAt) / 1000)), done: true };
        save();
        draw();
      }
    }

    function confirmNextSection() {
      const sec = plan[S.exam.sec];
      const left = sec.items.filter((it) => !answered(sec.key, it)).length;
      const m = modal(`<div class="m-ico">${I('layers', 30)}</div><h3 class="h3">Finish "${B.SECTIONS[S.exam.sec].label}"?</h3>
        <p>${left ? `You have <b style="color:var(--text)">${left} unanswered</b> item${left > 1 ? 's' : ''} in this section. ` : 'All items answered. '}You won't be able to return to this section.</p>
        <div class="row"><button class="btn btn-ghost" id="mNo">Review</button><button class="btn btn-primary" id="mYes">Next section ${I('right', 16)}</button></div>`);
      $('#mNo', m).addEventListener('click', closeModal);
      $('#mYes', m).addEventListener('click', () => {
        if (S._stopDictation) S._stopDictation();
        closeModal(); S.exam.sec++; S.exam.q = 0; logEvent('section', 'entered section ' + (S.exam.sec + 1)); save(); draw();
        UI.toast(`Section ${S.exam.sec + 1}: ${B.SECTIONS[S.exam.sec].label}`, 'info');
      });
    }

    function confirmSubmit() {
      const rows = plan.map((p, k) => `<div><span>${B.SECTIONS[k].label}</span><b>${p.items.filter((it) => answered(p.key, it)).length}/${p.items.length}</b></div>`).join('');
      const m = modal(`<div class="m-ico green">${I('send', 30)}</div><h3 class="h3">Submit your assessment?</h3><div class="sum-grid">${rows}</div>
        <p>Once submitted, you cannot change answers or retake the interview.</p>
        <div class="row"><button class="btn btn-ghost" id="mNo">Review answers</button><button class="btn btn-primary" id="mYes">Submit now ${I('check', 16)}</button></div>`);
      $('#mNo', m).addEventListener('click', closeModal);
      $('#mYes', m).addEventListener('click', () => submit(false));
    }

    document.addEventListener('keydown', keyNav);
    onLeave(() => document.removeEventListener('keydown', keyNav));
    function keyNav(e) {
      if (S.stage !== 'exam' || /TEXTAREA|INPUT/.test(document.activeElement.tagName) || !$('#modalHost').classList.contains('hidden')) return;
      const k = 'abcd'.indexOf(e.key.toLowerCase());
      const sec = plan[S.exam.sec]; const item = sec.items[S.exam.q];
      if (k >= 0 && (sec.key === 'sjt' || (sec.key === 'reasoning' && !item.game))) {
        if (sec.key === 'sjt') S.answers.sjt[item.id] = k; else S.answers.reasoning[item.id] = k;
        save(); draw();
      }
    }
  }

  function startTimer() {
    clearInterval(examTimer);
    const el = $('#tbTimer');
    const tick = () => {
      const left = Math.round((S.exam.endsAt - Date.now()) / 1000);
      el.innerHTML = `${I('clock', 16)} ${mmss(Math.max(0, left))}`;
      el.classList.toggle('warn', left <= 300 && left > 60);
      el.classList.toggle('crit', left <= 60);
      if (left <= 300 && !S.exam.warned5) { S.exam.warned5 = true; UI.toast('5 minutes remaining.', 'info'); Voice.speak('Five minutes remaining.'); }
      if (left <= 60 && !S.exam.warned1) { S.exam.warned1 = true; UI.toast('1 minute remaining — your answers will be submitted automatically.', 'info'); }
      if (left <= 0) submit(true);
    };
    tick();
    examTimer = setInterval(tick, 1000);
    onLeave(() => clearInterval(examTimer));
  }

  // ---------- Proctoring ----------
  function installProctoring() {
    const onVis = () => {
      if (S.stage !== 'exam') return;
      if (document.hidden) { S.integrity.tabSwitches++; logEvent('tab-switch', 'left the assessment tab'); }
      else warn('You left the assessment', 'Switching tabs or windows is recorded and shared with the recruiter. Please stay on this page until you submit.');
    };
    const onFs = () => {
      if (S.stage !== 'exam' || document.fullscreenElement || !document.fullscreenEnabled) return;
      S.integrity.fullscreenExits++; logEvent('fullscreen-exit', 'exited fullscreen');
      warn('Fullscreen exited', 'Please return to fullscreen to continue your assessment.', true);
    };
    const block = (e) => { if (S.stage === 'exam' && !/TEXTAREA/.test(e.target.tagName)) e.preventDefault(); };
    const onUnload = (e) => { if (S.stage === 'exam') { e.preventDefault(); e.returnValue = ''; } };
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('contextmenu', block);
    window.addEventListener('beforeunload', onUnload);
    onLeave(() => {
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('contextmenu', block);
      window.removeEventListener('beforeunload', onUnload);
    });
    function warn(title, text, fs) {
      const m = modal(`<div class="m-ico red">${I('alert', 30)}</div><h3 class="h3">${title}</h3><p>${text}</p><p class="small" style="color:#ffb0b3">Recorded: ${S.integrity.tabSwitches} tab switch(es), ${S.integrity.fullscreenExits} fullscreen exit(s)</p>
        <div class="row"><button class="btn btn-primary" id="mOk">${fs ? 'Return to fullscreen' : 'Continue assessment'}</button></div>`);
      $('#mOk', m).addEventListener('click', async () => { closeModal(); if (fs) await enterFullscreen(); });
    }
  }

  // ---------- Submit / processing ----------
  function submit(auto) {
    if (S.stage !== 'exam') return;
    clearInterval(examTimer);
    if (auto) logEvent('auto-submit', 'time expired');
    S.exam.completedAt = new Date().toISOString();
    S._autoSubmitted = !!auto;
    exitFullscreen();
    go('processing');
  }

  // The end-of-interview video recorder has been removed: the candidate camera now
  // stays on throughout the interview via the persistent Cam manager defined above.

  async function renderProcessing() {
    if (S.submissionId && S.result) return go('done');
    const steps = ['Transcribing & analysing your voice answers', 'Scoring decision-making scenarios', 'Evaluating your case study', 'Checking reasoning & attention', 'Matching your resume to the role', 'Building your candidate profile'];
    screen(`${orbHTML()}<div><h2 class="h2">SARAH is reviewing your interview</h2><p class="lead" style="margin:8px auto 0">Please keep this window open — this takes a few seconds.</p></div>
      <div class="proc-steps">${steps.map((s) => `<div class="ps"><span class="s"></span><span>${s}</span></div>`).join('')}</div><div id="perr"></div>`, 'proc');
    orbState($('.orb'), 'thinking');
    const els = $$('.ps');
    const anim = (async () => { for (let k = 0; k < els.length; k++) { els[k].classList.add('run'); await new Promise((r) => setTimeout(r, 850)); els[k].classList.remove('run'); els[k].classList.add('ok'); els[k].querySelector('.s').innerHTML = I('check', 12); } })();
    try {
      const now = new Date();
      const r = role();
      const id = S.submissionId || 'DVG-' + Store.uid().slice(0, 8);
      const sub = {
        id, invite: S.inviteToken, sessionId: S.sessionId, createdAt: S.createdAt, startedAt: S.exam.startedAt, completedAt: S.exam.completedAt || now.toISOString(),
        candidate: S.candidate, role: S.role, roleTitle: r.title, category: r.category, schedule: S.schedule,
        position: S.position ? { id: S.position.id, title: S.position.title, jd: S.position.jd } : null,
        positionTitle: S.position ? S.position.title : null,
        resume: S.resume ? { name: S.resume.name, type: S.resume.type, size: S.resume.size, dataUrl: S.resume.dataUrl, text: S.resume.text } : null,
        voice: (S.voice || []).map((v) => ({
          id: v.id, q: v.q, answer: v.answer, mode: v.mode, durationSec: v.durationSec,
          audio: v.audio && v.audio.dataUrl ? { dataUrl: v.audio.dataUrl, mime: v.audio.mime, size: v.audio.size, duration: v.audio.duration } : null,
          followUp: v.followUp || null
        })),
        adaptive: (S.adaptive || []).map((a) => ({ q: a.q, why: a.why, source: a.source, answer: a.answer, mode: a.mode, durationSec: a.durationSec })),
        voiceLang: S.voiceLang, answers: S.answers, integrity: S.integrity,
        timings: { assessmentSeconds: Math.round((new Date(S.exam.completedAt || now) - new Date(S.exam.startedAt)) / 1000), totalSeconds: Math.round((now - new Date(S.createdAt)) / 1000) },
        stage: 'New', notes: '', rating: 0, userAgent: navigator.userAgent
      };
      sub.evaluation = DIA_EVAL.evaluate(sub, settings);
      await Store.saveSubmission(sub);
      S.submissionId = id;
      S.result = { ref: id, strengths: (sub.evaluation.strengths || []).slice(0, 3) };
      if (S.resume) S.resume.dataUrl = null;
      save();
      await anim;
      // Upload the interview camera recording for HR review (best effort; never blocks completion).
      try {
        const rec = await Cam.finishRec();
        if (rec && rec.dataUrl && S.submissionId) {
          await Store.uploadVideoIntro(S.submissionId, rec);
          console.log('[camera] recording uploaded:', Math.round((rec.size || 0) / 1024) + ' KB, ' + rec.duration + 's');
        }
      } catch (e) { console.warn('[camera] recording upload failed:', e && e.message); }
      // Submission locked in — go straight to the completion screen.
      setTimeout(() => go('done'), 500);
    } catch (e) {
      console.error(e);
      await anim;
      const dup = e.status === 409;
      $('#perr').innerHTML = `<p class="err-msg" style="justify-content:center">${I('alert', 16)} ${dup ? 'This interview was already submitted.' : 'We could not submit your interview. Please check your connection and try again.'}</p>${dup ? '' : '<button class="btn btn-primary" id="retry" style="margin-top:12px">Try again</button>'}`;
      const rt = $('#retry'); if (rt) rt.addEventListener('click', () => renderProcessing());
      if (dup) setTimeout(() => logout(), 2500);
    }
  }

  function renderDone() {
    exitFullscreen();
    Cam.stop();
    const f = first();
    const hl = settings.showCandidateFeedback !== false && S.result && S.result.strengths.length;
    screen(`<div class="done-badge">${I('check', 60)}</div>
      <h1 class="h1"><span class="grad-text">Best of luck${f ? ', ' + esc(f) : ''}!</span></h1>
      <p class="lead">Your interview for <b style="color:#fff">${esc(role().title)}</b> has been submitted successfully. Thank you for your time and effort today.</p>
      <span class="ref">Reference <b>${esc(S.result.ref)}</b></span>
      <div class="next-steps">
        <div class="glass ns"><span class="n">1</span><b>Confirmation email sent</b><span>Check <b>${esc(S.candidate.email)}</b> for your reference and next steps.</span></div>
        <div class="glass ns"><span class="n">2</span><b>HR review</b><span>A recruiter personally reviews every candidate within 3–5 working days.</span></div>
        <div class="glass ns"><span class="n">3</span><b>We'll be in touch</b><span>You'll hear from us by email or phone at the number you provided.</span></div>
      </div>
      ${hl ? `<div class="glass highlights"><h4>${I('star', 14)} Highlights SARAH noticed</h4>${S.result.strengths.map((s) => `<div class="hl">${I('check', 16)} ${esc(s)}</div>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center;margin-top:8px"><button class="btn btn-primary btn-lg" id="out">${I('logout', 18)} Finish &amp; log out</button></div>
      <p class="small muted" id="autoOut"></p>`, 'done-screen');
    UI.burst(innerWidth / 2, innerHeight * 0.3, { count: 200 });
    setTimeout(() => UI.burst(innerWidth * 0.2, innerHeight * 0.5, { count: 90 }), 600);
    setTimeout(() => UI.burst(innerWidth * 0.8, innerHeight * 0.5, { count: 90 }), 1000);
    say(`Thank you${f ? ' ' + f : ''}! Your interview is complete. Best of luck — we hope to welcome you to the DVAGO family soon.`, null, null);
    let left = 90;
    const t = setInterval(() => { left--; const el = $('#autoOut'); if (el) el.textContent = `You'll be logged out automatically in ${left}s.`; if (left <= 0) logout(); }, 1000);
    onLeave(() => clearInterval(t));
    $('#out').addEventListener('click', logout);
  }

  function logout() {
    const ref = (S && S.result && S.result.ref) || '';
    try { sessionStorage.removeItem(SESSION_KEY); sessionStorage.setItem(CLOSED_KEY, ref || '1'); } catch (e) {}
    exitFullscreen();
    Cam.stop();
    teardown.forEach((fn) => { try { fn(); } catch (e) {} });
    teardown = [];
    history.replaceState(null, '', location.pathname + location.search);
    renderLoggedOut(false);
  }

  function renderLoggedOut(fromReload) {
    S = S || newState();
    S.stage = 'loggedout';
    updateTopbar();
    let ref = '';
    try { ref = sessionStorage.getItem(CLOSED_KEY) || ''; } catch (e) {}
    screen(`<div class="splash-logo" style="height:56px;margin-bottom:6px">${UI.logo()}</div>
      <div class="lock">${I('lock', 40)}</div>
      <h1 class="h2">You have been logged out securely</h1>
      <p class="lead">${fromReload ? 'This interview session has ended and cannot be reopened.' : 'Your interview is complete and this session is now closed.'} You may close this window.</p>
      ${ref && ref !== '1' ? `<span class="ref">Reference <b>${esc(ref)}</b></span>` : ''}
      <p class="small muted">Questions? Contact DVAGO HR · careers@dvago.pk</p>`, 'closed');
  }

  const RENDER = { splash: renderSplash, greet: renderGreet, schedule: renderSchedule, scheduled: renderScheduled, profile: renderProfile, role: renderRole, position: renderPosition, jd: renderJD, syscheck: renderSyscheck, voice: renderVoice, brief: renderBrief, exam: renderExam, processing: renderProcessing, done: renderDone, applied: renderApplied };

  // ---------------- boot ----------------
  async function boot() {
    UI.glitter($('#glitter'));
    $('#tbLogo').innerHTML = UI.logo();
    setMuteIcon();
    $('#muteBtn').addEventListener('click', () => { Voice.setMuted(!Voice.muted); setMuteIcon(); UI.toast(Voice.muted ? 'SARAH voice muted' : 'SARAH voice on', 'info', 1600); });

    await Store.init();
    try { settings = await Store.getSettings(); } catch (e) { settings = {}; }

    let closed = null;
    try { closed = sessionStorage.getItem(CLOSED_KEY); } catch (e) {}
    if (closed) return renderLoggedOut(true);

    const token = new URLSearchParams(location.search).get('invite');
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) {}

    if (saved && saved.v === 2 && (saved.inviteToken || null) === (token || null) && saved.stage && !['splash', 'closed', 'loggedout'].includes(saved.stage)) {
      S = saved;
      if (S.stage === 'exam' && S.exam && Date.now() >= S.exam.endsAt) { S.exam.completedAt = new Date(S.exam.endsAt).toISOString(); S.stage = 'processing'; }
      // Camera was on before the reload for these stages — turn it back on (best effort; no modal).
      if (['syscheck', 'voice', 'brief', 'exam', 'processing'].includes(S.stage)) { Cam.start().catch(() => {}); Guard.start(); }
      UI.toast('Welcome back — resuming where you left off.', 'success');
      history.replaceState({ dvago: S.stage }, '');
      return go(S.stage, true);
    }

    S = newState();
    if (token) {
      const inv = await Store.getInvite(token);
      if (!inv) return renderClosed('invalid');
      if (inv.status === 'Completed') return renderClosed('used');
      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return renderClosed('expired');
      S.inviteToken = token;
      S.invite = inv;
      S.candidate.fullName = inv.name || '';
      S.candidate.email = inv.email || '';
      if (inv.role && B.ROLES[inv.role]) S.role = inv.role;
      // Invitation from resume screening: carry over the screened details and the exact resume that was scored.
      if (inv.profile) Object.keys(inv.profile).forEach((k) => { if (inv.profile[k]) S.candidate[k] = inv.profile[k]; });
      if (inv.resume && inv.resume.text) S.resume = { name: inv.resume.name, type: inv.resume.type, size: inv.resume.size, dataUrl: null, text: inv.resume.text, parsing: false, fromApplication: true };
      if (inv.status === 'Sent') { try { await Store.updateInvite(token, { status: 'Opened', openedAt: new Date().toISOString() }); } catch (e) {} }
    } else if (settings.screening && settings.screening.enabled !== false && Store.mode === 'server') {
      // Screening is on and there is no personal link. Pilot: applications come through the Google Form, so this page is invitation-only.
      // With "portalApply" on (IT-server version) the visitor applies right here and gets a link only if the resume screening passes.
      if (!settings.screening.portalApply) return renderClosed('inviteOnly');
      S.applyMode = true;
    } else if (settings.allowWalkIn === false) {
      return renderClosed('inviteOnly');
    }
    history.replaceState({ dvago: 'splash' }, '');
    go('splash', true);
  }

  boot();
})();

