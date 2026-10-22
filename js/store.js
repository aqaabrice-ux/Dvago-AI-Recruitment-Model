  /* DVAGO data layer. Uses server.js API when available, otherwise IndexedDB (or localStorage) in this browser. */
  (function (root) {
    const DB_NAME = 'dvago_assessment_v2';
    const STORES = ['invites', 'submissions', 'resumes', 'meta'];
    let mode = null;
    let idb = null;
    const ADMIN_TOKEN_KEY = 'dvago_admin_token';
  
    function uid(prefix) {
      const a = new Uint8Array(8);
      (root.crypto || window.crypto).getRandomValues(a);
      return (prefix || '') + Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12).toUpperCase();
    }
  
    // ---------- local backends ----------
    function openIDB() {
      return new Promise((resolve, reject) => {
        if (!root.indexedDB) return reject(new Error('no idb'));
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => STORES.forEach((s) => { if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    const kvIDB = {
      tx(store, m, fn) {
        return new Promise((resolve, reject) => {
          const t = idb.transaction(store, m);
          const r = fn(t.objectStore(store));
          t.oncomplete = () => resolve(r && r.result);
          t.onerror = () => reject(t.error);
        });
      },
      get(s, k) { return kvIDB.tx(s, 'readonly', (o) => o.get(k)); },
      put(s, k, v) { return kvIDB.tx(s, 'readwrite', (o) => o.put(v, k)); },
      del(s, k) { return kvIDB.tx(s, 'readwrite', (o) => o.delete(k)); },
      all(s) { return kvIDB.tx(s, 'readonly', (o) => o.getAll()); },
      clear(s) { return kvIDB.tx(s, 'readwrite', (o) => o.clear()); }
    };
    const kvLS = {
      _k: (s) => DB_NAME + ':' + s,
      _read(s) { try { return JSON.parse(localStorage.getItem(kvLS._k(s)) || '{}'); } catch (e) { return {}; } },
      _write(s, o) { try { localStorage.setItem(kvLS._k(s), JSON.stringify(o)); } catch (e) { console.warn('storage full', e); } },
      async get(s, k) { return kvLS._read(s)[k]; },
      async put(s, k, v) { const o = kvLS._read(s); o[k] = v; kvLS._write(s, o); },
      async del(s, k) { const o = kvLS._read(s); delete o[k]; kvLS._write(s, o); },
      async all(s) { return Object.values(kvLS._read(s)); },
      async clear(s) { kvLS._write(s, {}); }
    };
    let kv = kvLS;
  
    // ---------- API backend ----------
    async function api(path, opts = {}) {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      let token = null;
      try { token = sessionStorage.getItem(ADMIN_TOKEN_KEY); } catch (e) {}
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await fetch('api/' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { const err = new Error(data.error || res.statusText); err.status = res.status; throw err; }
      return data;
    }
  
    async function init() {
      if (mode) return mode;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 1500);
        const r = await fetch('api/health', { signal: ctrl.signal });
        clearTimeout(timer);
        const j = r.ok ? await r.json() : null;
        if (j && j.ok && j.app === 'dvago') { mode = 'server'; Store.serverInfo = j; return mode; }
      } catch (e) {}
      try { idb = await openIDB(); kv = kvIDB; } catch (e) { kv = kvLS; }
      mode = 'local';
      return mode;
    }
  
    const DEFAULT_SETTINGS = {
      companyName: 'DVAGO',
      allowWalkIn: true,
      showCandidateFeedback: true,
      weights: { voice: 15, sjt: 25, simulation: 10, case: 30, reasoning: 10, resume: 10 },
      thresholds: { strong: 80, hire: 65, consider: 50 },
      adminEmail: 'admin@dvago.com',
      adminPassHash: null
    };
  
    async function sha256(text) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
    }
  
    function stripResume(sub) {
      const s = Object.assign({}, sub);
      if (s.resume) { s.resume = Object.assign({}, s.resume); delete s.resume.dataUrl; }
      return s;
    }
  
    const Store = {
      uid,
      get mode() { return mode; },
      serverInfo: null,
      init,
  
      async getSettings() {
        await init();
        if (mode === 'server') return Object.assign({}, DEFAULT_SETTINGS, await api('settings'));
        return Object.assign({}, DEFAULT_SETTINGS, (await kv.get('meta', 'settings')) || {});
      },
      async saveSettings(patch) {
        await init();
        if (mode === 'server') return api('settings', { method: 'PUT', body: patch });
        const cur = Object.assign({}, DEFAULT_SETTINGS, (await kv.get('meta', 'settings')) || {}, patch);
        await kv.put('meta', 'settings', cur);
        return cur;
      },
  
      // ----- auth (admin) -----
      async login(email, password) {
        await init();
        if (mode === 'server') {
          const r = await api('login', { method: 'POST', body: { email, password } });
          sessionStorage.setItem(ADMIN_TOKEN_KEY, r.token);
          return true;
        }
        const s = await Store.getSettings();
        const hash = s.adminPassHash || (await sha256('dvago@123'));
        const ok = email.trim().toLowerCase() === String(s.adminEmail).toLowerCase() && (await sha256(password)) === hash;
        if (ok) sessionStorage.setItem(ADMIN_TOKEN_KEY, 'local');
        return ok;
      },
      async changePassword(newPass) {
        await init();
        if (mode === 'server') throw new Error('Set ADMIN_PASSWORD in the server environment instead.');
        return Store.saveSettings({ adminPassHash: await sha256(newPass) });
      },
      isLoggedIn() { try { return !!sessionStorage.getItem(ADMIN_TOKEN_KEY); } catch (e) { return false; } },
      logout() { try { sessionStorage.removeItem(ADMIN_TOKEN_KEY); } catch (e) {} },
  
      // ----- invites -----
      async createInvite(data) {
        await init();
        const inv = Object.assign({ token: uid('INV'), createdAt: new Date().toISOString(), status: 'Sent', expiresAt: null, role: '', name: '', email: '', note: '', schedule: null, openedAt: null, completedAt: null }, data);
        if (mode === 'server') return api('invites', { method: 'POST', body: inv });
        await kv.put('invites', inv.token, inv);
        return inv;
      },
      async listInvites() {
        await init();
        if (mode === 'server') return api('invites');
        return (await kv.all('invites')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async getInvite(token) {
        await init();
        if (mode === 'server') { try { return await api('invites/' + encodeURIComponent(token)); } catch (e) { return null; } }
        return (await kv.get('invites', token)) || null;
      },
      async updateInvite(token, patch) {
        await init();
        if (mode === 'server') return api('invites/' + encodeURIComponent(token), { method: 'PATCH', body: patch });
        const cur = await kv.get('invites', token);
        if (!cur) return null;
        const next = Object.assign(cur, patch);
        await kv.put('invites', token, next);
        return next;
      },
      async deleteInvite(token) {
        await init();
        if (mode === 'server') return api('invites/' + encodeURIComponent(token), { method: 'DELETE' });
        return kv.del('invites', token);
      },
  
      // ----- applications (resume screening; server mode only) -----
      async apply(payload) {
        await init();
        if (mode !== 'server') throw new Error('Applications need the DVAGO server to be running.');
        return api('apply', { method: 'POST', body: payload });
      },
      async listApplications() { await init(); return mode === 'server' ? api('applications') : []; },
      async applicationAction(id, action) { await init(); return api('applications/' + encodeURIComponent(id) + '/' + action, { method: 'POST', body: {} }); },
      async deleteApplication(id) { await init(); return api('applications/' + encodeURIComponent(id), { method: 'DELETE' }); },

      // ----- submissions -----
      async hasCompleted(email, role) {
        await init();
        if (!email) return false;
        if (mode === 'server') { const r = await api('check?email=' + encodeURIComponent(email) + '&role=' + encodeURIComponent(role || '')); return r.completed; }
        const all = await kv.all('submissions');
        return all.some((s) => s.candidate && s.candidate.email.toLowerCase() === email.toLowerCase() && (!role || s.role === role));
      },
      async saveSubmission(sub) {
        await init();
        if (mode === 'server') return api('submissions', { method: 'POST', body: sub });
        if (sub.resume && sub.resume.dataUrl) await kv.put('resumes', sub.id, { name: sub.resume.name, type: sub.resume.type, dataUrl: sub.resume.dataUrl });
        await kv.put('submissions', sub.id, stripResume(sub));
        if (sub.invite) await Store.updateInvite(sub.invite, { status: 'Completed', completedAt: sub.completedAt });
        return { id: sub.id };
      },
      async listSubmissions() {
        await init();
        if (mode === 'server') return api('submissions');
        return (await kv.all('submissions')).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
      },
      async getSubmission(id) {
        await init();
        if (mode === 'server') return api('submissions/' + encodeURIComponent(id));
        return kv.get('submissions', id);
      },
      async updateSubmission(id, patch) {
        await init();
        if (mode === 'server') return api('submissions/' + encodeURIComponent(id), { method: 'PATCH', body: patch });
        const cur = await kv.get('submissions', id);
        if (!cur) return null;
        const next = Object.assign(cur, patch);
        await kv.put('submissions', id, next);
        return next;
      },
      async deleteSubmission(id) {
        await init();
        if (mode === 'server') return api('submissions/' + encodeURIComponent(id), { method: 'DELETE' });
        await kv.del('resumes', id);
        return kv.del('submissions', id);
      },
      // ----- positions -----
      async listPositions(roleKey) {
        await init();
        if (mode === 'server') return api('positions' + (roleKey ? '?role=' + encodeURIComponent(roleKey) : ''));
        const custom = (await kv.get('meta', 'positions')) || null;
        let items = custom;
        if (!items) {
          items = [];
          const B = window.DVAGO_BANK;
          Object.entries(B.DEFAULT_POSITIONS || {}).forEach(([rk, arr]) => arr.forEach((p) => items.push(Object.assign({ roleKey: rk, isActive: true }, p))));
          await kv.put('meta', 'positions', items);
        }
        return roleKey ? items.filter((p) => p.roleKey === roleKey) : items;
      },
      async createPosition(data) {
        await init();
        if (mode === 'server') return api('positions', { method: 'POST', body: data });
        const items = (await kv.get('meta', 'positions')) || [];
        const id = (data.id || 'pos-' + Date.now().toString(36)).toLowerCase();
        const pos = { id, roleKey: data.roleKey, title: data.title, jd: data.jd || '', isActive: data.isActive !== false, isDefault: false, createdAt: new Date().toISOString() };
        items.push(pos); await kv.put('meta', 'positions', items);
        return pos;
      },
      async updatePosition(id, patch) {
        await init();
        if (mode === 'server') return api('positions/' + encodeURIComponent(id), { method: 'PATCH', body: patch });
        const items = (await kv.get('meta', 'positions')) || [];
        const p = items.find((x) => x.id === id); if (!p) return null;
        Object.assign(p, patch); await kv.put('meta', 'positions', items);
        return p;
      },
      async deletePosition(id) {
        await init();
        if (mode === 'server') return api('positions/' + encodeURIComponent(id), { method: 'DELETE' });
        let items = (await kv.get('meta', 'positions')) || [];
        items = items.filter((p) => p.id !== id);
        await kv.put('meta', 'positions', items);
        return { ok: true };
      },
      // ----- voice questions overrides -----
      async listVoiceQuestions(roleKey) {
        await init();
        if (mode === 'server') return api('voice-questions' + (roleKey ? '?role=' + encodeURIComponent(roleKey) : ''));
        const custom = (await kv.get('meta', 'voiceQuestions')) || {};
        return roleKey ? (custom[roleKey] || null) : custom;
      },
      async saveVoiceQuestions(roleKey, list) {
        await init();
        if (mode === 'server') return api('voice-questions/' + encodeURIComponent(roleKey), { method: 'PUT', body: { items: list } });
        const custom = (await kv.get('meta', 'voiceQuestions')) || {};
        custom[roleKey] = list;
        await kv.put('meta', 'voiceQuestions', custom);
        return { ok: true };
      },
      async resetVoiceQuestions(roleKey) {
        await init();
        if (mode === 'server') return api('voice-questions/' + encodeURIComponent(roleKey), { method: 'DELETE' });
        const custom = (await kv.get('meta', 'voiceQuestions')) || {};
        delete custom[roleKey];
        await kv.put('meta', 'voiceQuestions', custom);
        return { ok: true };
      },
  
      // ----- SJT (decision scenarios) -----
      async listSJT(roleKey) {
        await init();
        if (mode === 'server') return api('sjt-questions' + (roleKey ? '?role=' + encodeURIComponent(roleKey) : ''));
        const custom = (await kv.get('meta', 'sjt')) || {};
        return roleKey ? (custom[roleKey] || null) : custom;
      },
      async saveSJT(roleKey, list) {
        await init();
        if (mode === 'server') return api('sjt-questions/' + encodeURIComponent(roleKey), { method: 'PUT', body: { items: list } });
        const custom = (await kv.get('meta', 'sjt')) || {}; custom[roleKey] = list; await kv.put('meta', 'sjt', custom);
        return { ok: true };
      },
      async resetSJT(roleKey) {
        await init();
        if (mode === 'server') return api('sjt-questions/' + encodeURIComponent(roleKey), { method: 'DELETE' });
        const custom = (await kv.get('meta', 'sjt')) || {}; delete custom[roleKey]; await kv.put('meta', 'sjt', custom);
        return { ok: true };
      },
  
      // ----- Simulation -----
      async getSimulation(roleKey) {
        await init();
        if (mode === 'server') return api('simulation/' + encodeURIComponent(roleKey));
        const custom = (await kv.get('meta', 'simulation')) || {};
        return custom[roleKey] || null;
      },
      async saveSimulation(roleKey, sim) {
        await init();
        if (mode === 'server') return api('simulation/' + encodeURIComponent(roleKey), { method: 'PUT', body: sim });
        const custom = (await kv.get('meta', 'simulation')) || {}; custom[roleKey] = sim; await kv.put('meta', 'simulation', custom);
        return { ok: true };
      },
      async resetSimulation(roleKey) {
        await init();
        if (mode === 'server') return api('simulation/' + encodeURIComponent(roleKey), { method: 'DELETE' });
        const custom = (await kv.get('meta', 'simulation')) || {}; delete custom[roleKey]; await kv.put('meta', 'simulation', custom);
        return { ok: true };
      },
  
      // ----- Attention challenge (per role) -----
      async getChallenge(roleKey) {
        await init();
        if (mode === 'server') return api('challenge/' + encodeURIComponent(roleKey));
        const custom = (await kv.get('meta', 'challenge')) || {};
        return custom[roleKey] || null;
      },
      async saveChallenge(roleKey, ch) {
        await init();
        if (mode === 'server') return api('challenge/' + encodeURIComponent(roleKey), { method: 'PUT', body: ch });
        const custom = (await kv.get('meta', 'challenge')) || {}; custom[roleKey] = ch; await kv.put('meta', 'challenge', custom);
        return { ok: true };
      },
      async resetChallenge(roleKey) {
        await init();
        if (mode === 'server') return api('challenge/' + encodeURIComponent(roleKey), { method: 'DELETE' });
        const custom = (await kv.get('meta', 'challenge')) || {}; delete custom[roleKey]; await kv.put('meta', 'challenge', custom);
        return { ok: true };
      },
  
      // ----- Case study -----
      async getCaseStudy(roleKey) {
        await init();
        if (mode === 'server') return api('case-study/' + encodeURIComponent(roleKey));
        const custom = (await kv.get('meta', 'caseStudy')) || {};
        return custom[roleKey] || null;
      },
      async saveCaseStudy(roleKey, cs) {
        await init();
        if (mode === 'server') return api('case-study/' + encodeURIComponent(roleKey), { method: 'PUT', body: cs });
        const custom = (await kv.get('meta', 'caseStudy')) || {}; custom[roleKey] = cs; await kv.put('meta', 'caseStudy', custom);
        return { ok: true };
      },
      async resetCaseStudy(roleKey) {
        await init();
        if (mode === 'server') return api('case-study/' + encodeURIComponent(roleKey), { method: 'DELETE' });
        const custom = (await kv.get('meta', 'caseStudy')) || {}; delete custom[roleKey]; await kv.put('meta', 'caseStudy', custom);
        return { ok: true };
      },
  
      // ----- Reasoning MCQs (shared) -----
      async listReasoning() {
        await init();
        if (mode === 'server') return api('reasoning-questions');
        return (await kv.get('meta', 'reasoning')) || null;
      },
      async saveReasoning(list) {
        await init();
        if (mode === 'server') return api('reasoning-questions', { method: 'PUT', body: { items: list } });
        await kv.put('meta', 'reasoning', list); return { ok: true };
      },
      async resetReasoning() {
        await init();
        if (mode === 'server') return api('reasoning-questions', { method: 'DELETE' });
        await kv.del('meta', 'reasoning'); return { ok: true };
      },
  
      async listEmails() {
        await init();
        if (mode !== 'server') return [];
        return api('emails');
      },
  
      async getResume(id) {
        await init();
        if (mode === 'server') {
          let token = null;
          try { token = sessionStorage.getItem(ADMIN_TOKEN_KEY); } catch (e) {}
          const r = await fetch('api/resume/' + encodeURIComponent(id), { headers: token ? { Authorization: 'Bearer ' + token } : {} });
          if (!r.ok) return null;
          const blob = await r.blob();
          const name = decodeURIComponent((r.headers.get('X-File-Name') || 'resume'));
          return { name, type: blob.type, url: URL.createObjectURL(blob) };
        }
        const rec = await kv.get('resumes', id);
        if (!rec) return null;
        const blob = await (await fetch(rec.dataUrl)).blob();
        return { name: rec.name, type: rec.type, url: URL.createObjectURL(blob) };
      },
      async uploadVideoIntro(id, data) {
        await init();
        if (mode === 'server') return api('submissions/' + encodeURIComponent(id) + '/video', { method: 'POST', body: data });
        // Local: patch stored submission with videoIntro
        const sub = await kv.get('submissions', id);
        if (sub) { sub.videoIntro = { dataUrl: data.dataUrl, duration: data.duration, mime: data.mime, size: data.size }; await kv.put('submissions', id, sub); }
        return { ok: true };
      },
      async aiEvaluate(id) {
        await init();
        if (mode !== 'server') throw new Error('AI evaluation with Claude needs the DVAGO server running with ANTHROPIC_API_KEY.');
        return api('submissions/' + encodeURIComponent(id) + '/ai-evaluate', { method: 'POST' });
      },
  
      // ----- team: current user, org structure, HOD users (server mode only; local demo = master) -----
    async me() {
      await init();
      if (mode !== 'server') return { role: 'master', name: 'Admin', email: '', departments: [] };
      return api('me');
    },
    async changeMyPassword(current, password) { await init(); return api('me/password', { method: 'POST', body: { current, password } }); },
    async getOrg() { await init(); return api('org'); },
    async saveOrg(org) { await init(); return api('org', { method: 'PUT', body: org }); },
    async listUsers() { await init(); return api('users'); },
    async createUser(u) { await init(); return api('users', { method: 'POST', body: u }); },
    async updateUser(id, patch) { await init(); return api('users/' + encodeURIComponent(id), { method: 'PATCH', body: patch }); },
    async deleteUser(id) { await init(); return api('users/' + encodeURIComponent(id), { method: 'DELETE' }); },

    async round2Email(id) {
        await init();
        if (mode !== 'server') throw new Error('Sending the invitation needs the DVAGO server running.');
        return api('submissions/' + encodeURIComponent(id) + '/round2-email');
      },
      async round2Send(id) {
        await init();
        if (mode !== 'server') throw new Error('Sending the invitation needs the DVAGO server running.');
        return api('submissions/' + encodeURIComponent(id) + '/round2-send', { method: 'POST' });
      },
  
      // ----- bulk -----
      async exportAll() {
        return { exportedAt: new Date().toISOString(), invites: await Store.listInvites(), submissions: await Store.listSubmissions(), settings: await Store.getSettings() };
      },
      async importAll(data) {
        await init();
        if (mode === 'server') return api('import', { method: 'POST', body: data });
        for (const i of data.invites || []) await kv.put('invites', i.token, i);
        for (const s of data.submissions || []) await kv.put('submissions', s.id, stripResume(s));
        return { ok: true };
      },
      async clearAll() {
        await init();
        if (mode === 'server') return api('clear', { method: 'POST' });
        for (const s of ['invites', 'submissions', 'resumes']) await kv.clear(s);
        return { ok: true };
      }
    };
  
    root.Store = Store;
  })(window);
