/* Voice engine: SARAH speaks (neural voice from the server, browser speechSynthesis as fallback) and listens (SpeechRecognition) + live mic meter. */
(function (root) {
  const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  const synth = root.speechSynthesis;
  let voice = null;
  let muted = false;
  let currentUtterance = null;
  let ttsBroken = false;

  function pickVoice(lang) {
    if (!synth) return null;
    const vs = synth.getVoices();
    if (!vs.length) return null;
    // Preferred natural / neural voices in order (most human-like first)
    const prefs = lang && /^ur/.test(lang)
      ? [/Microsoft Uzma Online/i, /Microsoft Asad Online/i, /Google.*Urdu/i, /ur-PK/i, /ur/i]
      : [
          // Microsoft Natural / Neural (Windows 10/11, Edge)
          /Microsoft Aria Online \(Natural\)/i,
          /Microsoft Jenny Online \(Natural\)/i,
          /Microsoft Guy Online \(Natural\)/i,
          /Microsoft Sonia Online \(Natural\)/i,
          /Microsoft Libby Online \(Natural\)/i,
          /Microsoft (Aria|Jenny|Guy|Sonia|Libby) Online/i,
          // Apple (Enhanced / Siri voices)
          /Samantha \(Enhanced\)/i, /Siri Female/i, /Allison \(Enhanced\)/i, /Ava/i, /Samantha/i,
          // Google Cloud (Chrome streams these when online)
          /Google UK English Female/i, /Google US English/i, /Google.*Natural/i, /Google/i,
          // Legacy Microsoft (less natural but acceptable)
          /Microsoft Zira/i, /Microsoft Hazel/i,
          // Fallbacks
          /en-GB/i, /en-US/i, /^en/i
        ];
    for (const re of prefs) {
      const v = vs.find((x) => re.test(x.name) || re.test(x.lang));
      if (v) return v;
    }
    return vs[0];
  }
  if (synth) {
    voice = pickVoice();
    synth.onvoiceschanged = () => { voice = pickVoice(); };
  }

  function listNaturalVoices() {
    if (!synth) return [];
    return synth.getVoices().map((v) => ({ name: v.name, lang: v.lang, isDefault: v.default, isNatural: /Natural|Enhanced|Siri|Online|Neural|WaveNet|Google/i.test(v.name) }));
  }

  // ---------- Neural voice (server /api/tts -> Groq Orpheus). Falls back to the browser voice on any failure. ----------
  const neural = { failUntil: 0, audio: null, token: 0, stopToken: -1, abort: null, release: null };

  // Split into clips of <= ~190 chars on sentence boundaries (the TTS model accepts ~200 chars per request).
  function chunkText(t, max) {
    max = max || 190;
    const parts = t.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [t];
    const out = []; let cur = '';
    const push = (s) => { s = s.trim(); if (s) out.push(s); };
    for (let p of parts) {
      p = p.trim();
      if (!p) continue;
      while (p.length > max) {            // very long sentence: cut at a comma/space
        let cut = Math.max(p.lastIndexOf(', ', max), p.lastIndexOf(' ', max));
        if (cut < 40) cut = max;
        if (cur) { push(cur); cur = ''; }
        push(p.slice(0, cut + 1)); p = p.slice(cut + 1).trim();
      }
      if (!p) continue;
      if ((cur + ' ' + p).trim().length <= max) cur = (cur + ' ' + p).trim();
      else { push(cur); cur = p; }
    }
    push(cur);
    return out;
  }

  async function fetchClip(text, signal) {
    const r = await fetch('api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal });
    if (!r.ok) throw Object.assign(new Error('tts ' + r.status), { status: r.status });
    return URL.createObjectURL(await r.blob());
  }

  function stopNeural() {
    neural.token++;
    try { if (neural.abort) neural.abort.abort(); } catch (e) {}
    neural.abort = null;
    try { if (neural.audio) { neural.audio.pause(); neural.audio.src = ''; } } catch (e) {}
    neural.audio = null;
    if (neural.release) { const r = neural.release; neural.release = null; r(); }
  }

  // Resolves true if the neural voice handled the line (even if stopped), false if the caller should fall back to the browser voice.
  async function speakNeural(clean, hooks) {
    stopNeural();
    const token = neural.token;
    const ctrl = new AbortController(); neural.abort = ctrl;
    const clips = chunkText(clean).map((c) => fetchClip(c, ctrl.signal));
    clips.forEach((p) => p.catch(() => {}));      // avoid unhandled-rejection noise; errors are handled in the loop
    let started = false;
    try {
      for (let i = 0; i < clips.length; i++) {
        const url = await clips[i];
        if (token !== neural.token) return true;
        await new Promise((resolve, reject) => {
          const a = new Audio(url);
          neural.audio = a; neural.release = resolve;
          a.onplaying = () => { if (!started) { started = true; hooks.onstart && hooks.onstart(); } };
          a.onended = () => { neural.release = null; resolve(); };
          a.onerror = () => { neural.release = null; reject(new Error('audio-error')); };
          a.play().catch((err) => { neural.release = null; reject(err); });
        });
        if (token !== neural.token) { if (neural.stopToken === neural.token) hooks.onend && hooks.onend(); return true; }
      }
      hooks.onend && hooks.onend();
      return true;
    } catch (e) {
      if (token !== neural.token) { if (neural.stopToken === neural.token) hooks.onend && hooks.onend(); return true; }
      if (!started) {                              // nothing was heard yet -> let the browser voice take over
        neural.failUntil = Date.now() + (e && e.status ? 120000 : 30000);
        return false;
      }
      hooks.onend && hooks.onend();                // failed mid-line: just end it
      return true;
    }
  }

  const Voice = {
    canSpeak: !!synth,
    canListen: !!SR,
    get muted() { return muted; },
    setMuted(m) { muted = m; if (m) Voice.stop(); },

    speak(text, hooks = {}) {
      const clean = String(text || '').replace(/\u2014/g, ', ').replace(/\bDVAGO\b/g, 'Dvago').replace(/\bSARAH\b/g, 'Sarah').replace(/\bDIA\b/g, 'Sarah').replace(/\bJD\b/g, 'job description').trim();
      const wantsNeural = !muted && clean.length > 2 && !(hooks.lang && /^ur/.test(hooks.lang)) && !(root.location && root.location.protocol === 'file:') && Date.now() >= neural.failUntil;
      if (synth) synth.cancel();
      if (!wantsNeural) { stopNeural(); return Voice.speakBrowser(text, hooks); }
      return speakNeural(clean, hooks).then((ok) => ok ? undefined : Voice.speakBrowser(text, hooks));
    },

    speakBrowser(text, hooks = {}) {
      return new Promise((resolve) => {
        if (!synth || muted) {
          hooks.onstart && hooks.onstart();
          const ms = Math.min(6000, 600 + text.length * 28);
          setTimeout(() => { hooks.onend && hooks.onend(); resolve(); }, muted ? Math.min(ms, 1800) : ms);
          return;
        }
        synth.cancel();
        const sayable = text.replace(/—/g, ', ').replace(/\bDVAGO\b/g, 'Dvago').replace(/\bSARAH\b/g, 'Sarah').replace(/\bDIA\b/g, 'Sarah').replace(/\bJD\b/g, 'job description');
        const u = new SpeechSynthesisUtterance(sayable);
        // Re-pick voice each time in case voices loaded late
        if (!voice || hooks.lang) voice = pickVoice(hooks.lang);
        if (voice) u.voice = voice;
        // Natural voices sound best at slightly slower pace
        const isNat = voice && /Natural|Enhanced|Siri|Online|Neural|WaveNet/i.test(voice.name);
        u.rate = isNat ? 0.98 : 1.0;
        u.pitch = 1.0;
        u.volume = 1;
        let done = false, started = false;
        const finish = () => { if (done) return; done = true; hooks.onend && hooks.onend(); resolve(); };
        u.onstart = () => { started = true; ttsBroken = false; hooks.onstart && hooks.onstart(); };
        u.onend = finish;
        u.onerror = finish;
        currentUtterance = u;
        synth.speak(u);
        const readMs = Math.min(7000, 500 + text.length * 30);
        // Engines that never start (no voices / blocked audio): fall back to reading time
        setTimeout(() => {
          if (started || done) return;
          ttsBroken = true;
          hooks.onstart && hooks.onstart();
          setTimeout(finish, Math.max(0, readMs - 1200));
        }, ttsBroken ? 300 : 1200);
        setTimeout(finish, 2500 + text.length * 90);
      });
    },
    stop() { if (synth) synth.cancel(); currentUtterance = null; stopNeural(); neural.stopToken = neural.token; },
    get currentVoice() { return voice ? { name: voice.name, lang: voice.lang } : null; },
    listNaturalVoices,

    /* Continuous dictation with interim results. Returns controller {start, stop, active}. */
    recognizer(opts = {}) {
      if (!SR) return null;
      let rec = null, active = false, finalText = opts.initial || '';
      function make() {
        rec = new SR();
        rec.lang = opts.lang || 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalText += (finalText && !/\s$/.test(finalText) ? ' ' : '') + r[0].transcript.trim();
            else interim += r[0].transcript;
          }
          opts.onText && opts.onText(finalText, interim);
        };
        rec.onerror = (e) => {
          if (e.error === 'no-speech' || e.error === 'aborted') return;
          opts.onError && opts.onError(e.error);
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') active = false;
        };
        rec.onend = () => {
          if (active) { try { rec.start(); } catch (err) { setTimeout(() => active && rec.start(), 250); } }
          else opts.onEnd && opts.onEnd(finalText);
        };
      }
      return {
        start() { if (active) return; make(); active = true; try { rec.start(); } catch (e) {} },
        stop() { active = false; try { rec.stop(); } catch (e) {} },
        get active() { return active; },
        get text() { return finalText; },
        set text(v) { finalText = v; }
      };
    },

    /* Live microphone level meter. cb(level 0..1) per frame. */
    async meter(cb) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const AC = root.AudioContext || root.webkitAudioContext;
      const ac = new AC();
      const src = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      let raf, on = true;
      (function loop() {
        if (!on) return;
        an.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        cb(Math.min(1, Math.sqrt(sum / data.length) * 4));
        raf = requestAnimationFrame(loop);
      })();
      return { stop() { on = false; cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ac.close(); } };
    }
  };

  root.Voice = Voice;
})(window);
