/* DVAGO Admin Dashboard */
(function () {
  const B = window.DVAGO_BANK, I = UI.icon, esc = UI.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const view = $('#view');
  let charts = {};
  let data = [], allData = [];
  let me = { role: 'master', name: 'Admin', email: '', departments: [] };
  const isMaster = () => me.role === 'master';
  // Roles visible in pickers/filters: everything for master, otherwise the roles of the selected department(s).
  const deptRoleKeys = () => {
    const ds = state.dept ? me.departments.filter((x) => x.id === state.dept) : me.departments;
    return new Set(ds.flatMap((x) => x.roleKeys || []));
  };
  const myRoleEntries = () => Object.entries(B.ROLES).filter(([k]) => (isMaster() && !state.dept) || deptRoleKeys().has(k));
  function applyDept() { data = state.dept ? allData.filter((d) => deptRoleKeys().has(d.role)) : allData; }
  async function loadData() { allData = await Store.listSubmissions(); applyDept(); }
  let state = { tab: 'dashboard', filters: { role: '', stage: '', q: '' }, sort: 'date-desc', page: 1, perPage: 15, candidateId: null, dept: '' };

  const AVATAR_COLORS = ['#78B943', '#3987e5', '#8B5CF6', '#F5A524', '#14B8A6', '#E34948', '#4a3aa7', '#eb6834'];
  const avColor = (name) => AVATAR_COLORS[Math.abs([...String(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];
  const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const scoreColor = (n) => n >= 80 ? '#0CA30C' : n >= 65 ? '#78B943' : n >= 50 ? '#F5A524' : '#D03B3B';
  const recClass = (r) => r === 'Strong Hire' ? 'rec-Strong' : r === 'Hire' ? 'rec-Hire' : r === 'Consider' ? 'rec-Consider' : 'rec-Not';
  const recBadge = (r) => `<span class="badge ${r === 'Strong Hire' ? 'b-good' : r === 'Hire' ? 'b-good' : r === 'Consider' ? 'b-warn' : 'b-bad'}">${esc(r)}</span>`;
  const dt = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const dtTime = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
  const chartTxt = () => getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#7A8691';
  const chartGrid = () => getComputedStyle(document.body).getPropertyValue('--line').trim() || '#E6EBE2';

  // ================= Login =================
  async function initLogin() {
    const info = Store.serverInfo || {};
    const canvas = $('#loginFx'); if (canvas) UI.glitter(canvas, { density: 0.00006 });
    $('#lbLogo').innerHTML = UI.logo({ variant: 'white' });
    $('#lf1').innerHTML = I('mic', 16);
    $('#lf2').innerHTML = I('file', 16);
    $('#lf3').innerHTML = I('shield', 16);
    $('#pwToggle').innerHTML = I('eye', 16);
    $('#pwToggle').addEventListener('click', () => {
      const i = $('#lPass'); const t = i.type === 'password'; i.type = t ? 'text' : 'password';
      $('#pwToggle').innerHTML = I(t ? 'mute' : 'eye', 16);
    });
    const hint = $('#lHint');
    if (Store.mode === 'local') hint.innerHTML = `Demo mode — try <b>admin@dvago.com</b> / <b>dvago@123</b>`;
    else hint.innerHTML = `Server mode${info.ai ? ' · <b>Claude AI</b> evaluation on' : ''}`;

    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#lBtn'); btn.disabled = true; btn.innerHTML = 'Signing in…';
      const err = $('#lErr'); err.classList.add('hidden');
      try {
        const ok = await Store.login($('#lEmail').value, $('#lPass').value);
        if (!ok) throw new Error('Invalid email or password');
        showApp();
      } catch (e) {
        err.classList.remove('hidden');
        err.innerHTML = `${I('alert', 14)} ${esc(e.message)}`;
        btn.disabled = false; btn.innerHTML = 'Sign in';
      }
    });
    $('#login').classList.remove('hidden');
  }

  // ================= App =================
  function showApp() {
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#sideLogo').innerHTML = UI.logo();
    $('#menuBtn').innerHTML = I('menu', 20);
    $('#themeBtn').innerHTML = I(getTheme() === 'dark' ? 'sun' : 'moon', 18);
    $('#bellBtn').innerHTML = I('bell', 18);
    $('#gSearchIco').innerHTML = I('search', 16);
    $('#modeBadge').innerHTML = `<span class="pulse"></span> ${Store.mode === 'server' ? 'Server' : 'Local'} ${Store.serverInfo && Store.serverInfo.ai ? '· AI on' : ''}`;
    renderNav();
    $('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));
    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#meBtn').addEventListener('click', (e) => openMenu(e, [
      isMaster() ? { icon: 'settings', label: 'Settings', fn: () => switchTab('settings') } : { icon: 'shield', label: 'Change password', fn: openMyPassword },
      { icon: 'logout', label: 'Sign out', danger: true, fn: () => { Store.logout(); location.reload(); } }
    ]));
    $('#gSearch').addEventListener('input', (e) => { state.filters.q = e.target.value; if (state.tab === 'candidates') { state.page = 1; render(); } });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#gSearch').focus(); }
      if (e.key === 'Escape') { closeMenu(); closeModal(); }
    });
    boot();
  }

  function getTheme() { try { return localStorage.getItem('dvago_admin_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) { return 'light'; } }
  function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('dvago_admin_theme', next); } catch (e) {}
    document.documentElement.setAttribute('data-theme', next);
    $('#themeBtn').innerHTML = I(next === 'dark' ? 'sun' : 'moon', 18);
    Object.values(charts).forEach((c) => c && c.destroy()); charts = {};
    render();
  }

  async function boot() {
    try { me = await Store.me(); } catch (e) { console.error(e); }
    try { const sd = sessionStorage.getItem('dvago_admin_dept'); if (sd && me.departments.some((x) => x.id === sd)) state.dept = sd; } catch (e) {}
    $('#meBtn').innerHTML = `<span class="av">${esc(initials(me.name || 'AD'))}</span><span class="me-txt"><b>${esc(me.name || 'HR Admin')}</b><small>${esc(me.email || '')}${isMaster() ? ' · Master' : ' · HOD'}</small></span>`;
    try { await loadData(); } catch (e) { console.error(e); data = allData = []; }
    renderNav();
    renderSideCard();
    render();
    try { const n = fbCount(); if (n && Store.mode === 'server') UI.toast(n + ' interview' + (n === 1 ? ' is' : 's are') + ' waiting for your feedback (Interview feedback tab)', 'info'); } catch (e) {}
  }

  function renderNav() {
    const n = data.length;
    const newCount = data.filter((d) => d.stage === 'New' || !d.stage).length;
    const M = isMaster();
    const dsw = (M ? me.departments.length > 0 : me.departments.length > 1)
      ? `<label class="dept-switch">${I('target', 14)}<select id="deptSel"><option value="">${M ? 'All departments' : 'All my departments'}</option>${me.departments.map((x) => `<option value="${esc(x.id)}" ${state.dept === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`
      : (!M && me.departments.length === 1 ? `<div class="dept-switch one">${I('target', 14)}<span>${esc(me.departments[0].name)}</span></div>` : '');
    $('#nav').innerHTML = dsw + [
      { k: 'dashboard', ico: 'grid', label: 'Dashboard' },
      { k: 'candidates', ico: 'people', label: 'Candidates', cnt: n },
      { k: 'inbox', ico: 'bell', label: 'Inbox', cnt: newCount || null },
      { k: 'review', ico: 'award', label: 'Recommended', cnt: pendingReviewCount() || null },
      { k: 'feedback', ico: 'star', label: 'Interview feedback', cnt: fbCount() || null, server: true },
      { k: 'applications', ico: 'file', label: 'Applications', server: true },
      { k: 'hierarchy', ico: 'store', label: 'Org structure', server: true },
      { k: 'invites', ico: 'send', label: 'Invitations' },
      { k: 'analytics', ico: 'chart', label: 'Analytics' },
      { k: 'positions', ico: 'target', label: 'Positions & JDs', master: true },
      { k: 'roles', ico: 'book', label: 'Questions Editor', master: true },
      { k: 'emails', ico: 'mail', label: 'Email outbox', master: true },
      { k: 'org', ico: 'target', label: 'Department setup', master: true, server: true },
      { k: 'users', ico: 'people', label: 'Users (HODs)', master: true, server: true },
      { k: 'settings', ico: 'settings', label: 'Settings', master: true }
    ].filter((it) => (M || !it.master) && (!it.server || Store.mode === 'server')).map((it) => `<button class="nav-item ${state.tab === it.k ? 'active' : ''}" data-k="${it.k}">${I(it.ico, 18)}<span>${esc(it.label)}</span>${it.cnt ? `<span class="cnt">${it.cnt}</span>` : ''}</button>`).join('');
    $$('.nav-item').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.k)));
    const ds = $('#deptSel');
    if (ds) ds.addEventListener('change', () => {
      state.dept = ds.value; state.filters.role = ''; state.page = 1; applyDept();
      try { sessionStorage.setItem('dvago_admin_dept', state.dept); } catch (e) {}
      renderNav(); render();
    });
  }
  function renderSideCard() {
    const ai = Store.serverInfo && Store.serverInfo.ai;
    $('#sideCard').innerHTML = ai
      ? `${I('brain', 20).replace('class="ico', 'style="margin-bottom:6px;color:var(--brand-dark)" class="ico')}<b>Claude AI active</b>New submissions are automatically evaluated by Claude. Re-run from any candidate's page.`
      : `${I('sparkles', 20).replace('class="ico', 'style="margin-bottom:6px;color:var(--brand-dark)" class="ico')}<b>Need deeper evaluation?</b>Enable Claude AI by setting <code style="font-size:11px">ANTHROPIC_API_KEY</code> in your server environment.`;
  }

  function switchTab(k) {
    state.tab = k; state.candidateId = null; state.page = 1;
    renderNav();
    render();
    document.querySelector('.main').scrollTo({ top: 0 });
    $('#side').classList.remove('open');
  }

  function render() {
    if (!isMaster() && ['positions', 'roles', 'emails', 'settings', 'org', 'users'].includes(state.tab)) state.tab = 'dashboard';
    view.classList.toggle('wide', state.tab === 'hierarchy' && !state.candidateId); view.style.maxWidth = (state.tab === 'hierarchy' && !state.candidateId) ? 'none' : '';   // the org chart uses the full width
    document.body.classList.remove('org-full');
    if (state.candidateId) return renderDetail();
    ({
      org: renderOrg,
      users: renderUsers,
      dashboard: renderDashboard,
      candidates: renderCandidates,
      inbox: renderInbox,
      review: renderReview,
      feedback: renderFeedback,
      applications: renderApplications,
      hierarchy: renderHierarchy,
      invites: renderInvites,
      analytics: renderAnalytics,
      positions: renderPositions,
      roles: renderRoles,
      emails: renderEmails,
      settings: renderSettings
    }[state.tab] || renderDashboard)();
  }

  // ---------- Positions management ----------
  async function renderPositions() {
    const positions = await Store.listPositions();
    let pqInfo = {}; try { pqInfo = await Store.positionQuestionInfo(); } catch (e) {}
    const roleFilter = state.posRoleFilter || '';
    const filtered = roleFilter ? positions.filter((p) => p.roleKey === roleFilter) : positions;
    const nHave = positions.filter((p) => pqInfo[p.id] && pqInfo[p.id].has).length;

    view.innerHTML = `<div class="page-head">
        <div><h1>Positions & JDs</h1><p>Create, edit, and manage every DVAGO position. Each position can have its own interview questions, built from its JD · ${nHave} of ${positions.length} have them.</p></div>
        <div class="actions">
          ${Store.mode === 'server' ? `<button class="btn btn-outline btn-sm" id="genMissing">${I('zap', 15)} Generate missing questions (AI)</button>` : ''}
          <button class="btn btn-primary btn-sm" id="newPos">${I('plus', 15)} New position</button>
        </div>
      </div>
      <div class="table-wrap">
        <div class="table-ctrls">
          <label class="chip-sel ${roleFilter ? 'active' : ''}">${I('target', 14)}<select id="fPosRole"><option value="">All roles</option>${Object.entries(B.ROLES).map(([k, r]) => `<option value="${k}" ${roleFilter === k ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>
          <span style="margin-left:auto;color:var(--muted);font-size:13px">${filtered.length} position${filtered.length === 1 ? '' : 's'}</span>
        </div>
        ${filtered.length === 0 ? `<div class="empty"><div class="ei">${I('target', 24)}</div><h3>No positions yet</h3><p>Create your first position so candidates can see a tailored job description.</p></div>` : `
        <table class="tbl"><thead><tr><th>Title</th><th>Role</th><th>JD length</th><th>Questions</th><th>Status</th><th>Type</th><th></th></tr></thead><tbody>
          ${filtered.map((p) => {
            const r = B.ROLES[p.roleKey];
            const pq = pqInfo[p.id];
            return `<tr>
              <td><b>${esc(p.title)}</b></td>
              <td><span class="badge b-info">${esc(r ? r.title : p.roleKey)}</span></td>
              <td style="font-variant-numeric:tabular-nums">${(p.jd || '').length} chars</td>
              <td>${pq && pq.has ? '<span class="badge b-good">JD-based</span>' : '<span class="badge b-neutral">Department default</span>'}</td>
              <td><span class="badge ${p.isActive !== false ? 'b-good' : 'b-neutral'}">${p.isActive !== false ? 'Active' : 'Hidden'}</span></td>
              <td>${p.isDefault ? '<span class="badge b-neutral">Default</span>' : '<span class="badge b-info">Custom</span>'}</td>
              <td style="display:flex;gap:6px;justify-content:flex-end">
                <button class="btn btn-outline btn-sm" data-pq="${esc(p.id)}">${I('book', 13)} Questions</button>
                <button class="btn btn-outline btn-sm" data-edit="${esc(p.id)}">${I('eye', 13)} Edit</button>
                <button class="btn btn-outline btn-sm" data-del="${esc(p.id)}">${I('trash', 13)}</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody></table>`}
      </div>`;
    $('#fPosRole').addEventListener('change', (e) => { state.posRoleFilter = e.target.value; render(); });
    $('#newPos').addEventListener('click', () => openPositionEditor(null));
    $$('[data-pq]').forEach((b) => b.addEventListener('click', () => { state.rqRole = 'pos:' + b.dataset.pq; state.rqTab = state.rqTab || 'sjt'; switchTab('roles'); }));
    const gm = $('#genMissing');
    if (gm) gm.addEventListener('click', async () => {
      const missing = positions.filter((p) => p.isActive !== false && !(pqInfo[p.id] && pqInfo[p.id].has)).length;
      if (!missing) return UI.toast('Every active position already has its own questions', 'success');
      if (!confirm(`Generate JD-based questions for ${missing} position${missing === 1 ? '' : 's'} with AI? This runs in the background (about ${Math.max(1, Math.round(missing * 0.4))} min) and you can keep working.`)) return;
      try { await Store.generateMissingQuestions(false); } catch (e) { return UI.toast(e.message, 'error'); }
      gm.disabled = true;
      const poll = async () => {
        let s; try { s = await Store.questionJobStatus(); } catch (e) { return; }
        if (state.tab !== 'positions') return;
        gm.innerHTML = s.running ? `${I('refresh', 15)} Generating ${s.done}/${s.total}…` : `${I('check', 15)} Done`;
        if (s.running) setTimeout(poll, 4000);
        else { UI.toast(`Questions generated${s.failed && s.failed.length ? ' (' + s.failed.length + ' failed, try again)' : ''}`, s.failed && s.failed.length ? 'info' : 'success'); render(); }
      };
      poll();
    });
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openPositionEditor(positions.find((p) => p.id === b.dataset.edit))));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => confirmDeletePosition(positions.find((p) => p.id === b.dataset.del))));
  }

  function openPositionEditor(pos) {
    const isNew = !pos;
    pos = pos || { title: '', roleKey: Object.keys(B.ROLES)[0], jd: '', isActive: true };
    const placeholder = `About the role\nWhat the person does, and why it matters at DVAGO.\n\nKey responsibilities\n• First responsibility\n• Second responsibility\n• Third responsibility\n\nWhat we are looking for\n• Required education / experience\n• Must-have skills\n• Nice-to-have skills\n\nWhat you'll get\n• Salary / benefit 1\n• Salary / benefit 2`;
    modal(`<div class="m-head"><div class="m-ico brand">${I('target', 20)}</div><div><h3>${isNew ? 'New' : 'Edit'} position</h3><p>${isNew ? 'Create a new specific position candidates can apply for' : 'Update this position — changes show up to candidates immediately'}</p></div></div>
      <div class="m-body">
        <label class="fld"><span>Position title</span><input class="inp" id="pTitle" value="${esc(pos.title)}" placeholder="e.g. Data Analyst"></label>
        <label class="fld"><span>Parent role (which category of questions)</span><select class="inp" id="pRole">${Object.entries(B.ROLES).map(([k, r]) => `<option value="${k}" ${pos.roleKey === k ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>
        <label class="fld"><span>Job description</span><textarea class="inp" id="pJD" rows="14" placeholder="${esc(placeholder)}" style="font-family:ui-monospace,monospace;font-size:12.5px;line-height:1.55">${esc(pos.jd || '')}</textarea><span style="font-size:11.5px;color:var(--muted);margin-top:4px">Tip: start each section with a title on its own line (About the role, Key responsibilities, etc.) and use • for bullet points.</span></label>
        <label class="check" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="pActive" ${pos.isActive !== false ? 'checked' : ''}><span>Active (visible to candidates)</span></label>
      </div>
      <div class="m-foot">
        <button class="btn btn-outline" data-dismiss>Cancel</button>
        <button class="btn btn-primary" id="pSave">${I('check', 15)} ${isNew ? 'Create' : 'Save'} position</button>
      </div>`, 'wide');
    $('#pSave').addEventListener('click', async () => {
      const payload = {
        title: $('#pTitle').value.trim(),
        roleKey: $('#pRole').value,
        jd: $('#pJD').value.trim(),
        isActive: $('#pActive').checked
      };
      if (!payload.title) return UI.toast('Please enter a title', 'error');
      try {
        if (isNew) await Store.createPosition(payload);
        else await Store.updatePosition(pos.id, payload);
        UI.toast(isNew ? 'Position created' : 'Position updated', 'success');
        closeModal(); render();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
    attachModalCloses();
  }

  function confirmDeletePosition(pos) {
    modal(`<div class="m-head"><div class="m-ico bad">${I('trash', 20)}</div><div><h3>Delete this position?</h3><p>Candidates will no longer see <b>${esc(pos.title)}</b> as an option. Existing submissions keep their data.</p></div></div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-danger" id="posDel">Delete</button></div>`);
    $('#posDel').addEventListener('click', async () => { await Store.deletePosition(pos.id); UI.toast('Position deleted', 'success'); closeModal(); render(); });
    attachModalCloses();
  }

  // ---------- Voice questions CRUD ----------
  async function renderVoiceQuestions() {
    const roleKey = state.vqRole || Object.keys(B.ROLES)[0];
    let items = [];
    try { items = await Store.listVoiceQuestions(roleKey); } catch (e) { items = []; }
    if (!Array.isArray(items)) items = [];

    view.innerHTML = `<div class="page-head">
        <div><h1>Voice Questions</h1><p>Edit, add, delete the questions SARAH asks candidates during the voice interview.</p></div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" id="vqReset">${I('refresh', 15)} Reset to default</button>
          <button class="btn btn-primary btn-sm" id="vqAdd">${I('plus', 15)} Add question</button>
        </div>
      </div>
      <div class="table-wrap">
        <div class="table-ctrls">
          <label class="chip-sel active">${I('target', 14)}<select id="fVqRole">${Object.entries(B.ROLES).map(([k, r]) => `<option value="${k}" ${roleKey === k ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>
          <span style="margin-left:auto;color:var(--muted);font-size:13px">${items.length} question${items.length === 1 ? '' : 's'} for this role</span>
        </div>
        ${items.length === 0 ? `<div class="empty"><div class="ei">${I('mic', 24)}</div><h3>No voice questions</h3><p>Click "Add question" to create the first voice interview question for this role.</p></div>` : `
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
          ${items.map((q, k) => `<div class="ans"><div class="ans-head"><b>Question ${k + 1}${q.id ? ' · ' + esc(q.id) : ''}</b><div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" data-up="${k}" ${k === 0 ? 'disabled' : ''}>${I('up', 13)}</button>
            <button class="btn btn-outline btn-sm" data-down="${k}" ${k === items.length - 1 ? 'disabled' : ''}>${I('down', 13)}</button>
            <button class="btn btn-outline btn-sm" data-edit="${k}">${I('eye', 13)} Edit</button>
            <button class="btn btn-outline btn-sm" data-del="${k}">${I('trash', 13)}</button>
          </div></div>
          <div class="q">${esc(q.q)}</div>
          ${(q.checks && q.checks.length) ? `<div class="rub">${q.checks.map((c) => `<span class="r ok">${I('check', 10)} ${esc(c.label)}</span>`).join('')}</div>` : '<div class="meta"><span style="color:var(--muted);font-size:12px">No scoring rubric defined</span></div>'}
          </div>`).join('')}
        </div>`}
      </div>`;
    $('#fVqRole').addEventListener('change', (e) => { state.vqRole = e.target.value; render(); });
    $('#vqAdd').addEventListener('click', () => openVQEditor(roleKey, items, null));
    $('#vqReset').addEventListener('click', () => confirmVQReset(roleKey));
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openVQEditor(roleKey, items, +b.dataset.edit)));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => confirmVQDelete(roleKey, items, +b.dataset.del)));
    $$('[data-up]').forEach((b) => b.addEventListener('click', async () => { const i = +b.dataset.up; [items[i - 1], items[i]] = [items[i], items[i - 1]]; await Store.saveVoiceQuestions(roleKey, items); render(); }));
    $$('[data-down]').forEach((b) => b.addEventListener('click', async () => { const i = +b.dataset.down; [items[i + 1], items[i]] = [items[i], items[i + 1]]; await Store.saveVoiceQuestions(roleKey, items); render(); }));
  }

  function openVQEditor(roleKey, items, idx) {
    const isNew = idx == null;
    const q = isNew ? { id: 'q-' + Date.now().toString(36).slice(-6), q: '', checks: [] } : JSON.parse(JSON.stringify(items[idx]));
    modal(`<div class="m-head"><div class="m-ico brand">${I('mic', 20)}</div><div><h3>${isNew ? 'Add' : 'Edit'} voice question</h3><p>SARAH will speak this question to the candidate</p></div></div>
      <div class="m-body">
        <label class="fld"><span>Question text (what SARAH asks)</span><textarea class="inp" id="vqText" rows="3" placeholder="e.g. Tell me about a time you handled a difficult customer. What did you do, and what was the result?">${esc(q.q)}</textarea></label>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <label style="font-size:13px;font-weight:600;color:var(--ink-2)">Scoring rubric (what a good answer should cover)</label>
            <button class="btn btn-outline btn-sm" id="addCheck">${I('plus', 12)} Add check</button>
          </div>
          <div id="vqChecks" style="display:flex;flex-direction:column;gap:8px"></div>
          <p style="font-size:12px;color:var(--muted);margin-top:6px">Each check awards points if the candidate's answer mentions any of its keywords (case-insensitive).</p>
        </div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="vqSave">${I('check', 15)} ${isNew ? 'Add' : 'Save'} question</button></div>`, 'wide');

    const checksBox = $('#vqChecks');
    const drawChecks = () => {
      checksBox.innerHTML = q.checks.map((c, k) => `<div style="display:flex;gap:8px;align-items:center">
        <input class="inp" style="flex:0 0 180px" placeholder="Label (what to look for)" data-ck="label" data-i="${k}" value="${esc(c.label)}">
        <input class="inp" style="flex:1" placeholder="keyword1, keyword2, phrase" data-ck="kw" data-i="${k}" value="${esc((c.kw || []).join(', '))}">
        <button class="btn btn-outline btn-sm" data-rck="${k}">${I('trash', 13)}</button>
      </div>`).join('') || '<p style="font-size:13px;color:var(--muted);text-align:center;padding:14px">No checks yet — click "Add check" above.</p>';
      $$('[data-ck]', checksBox).forEach((el) => el.addEventListener('input', (e) => {
        const i = +el.dataset.i;
        if (el.dataset.ck === 'label') q.checks[i].label = el.value;
        else q.checks[i].kw = el.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      }));
      $$('[data-rck]', checksBox).forEach((b) => b.addEventListener('click', () => { q.checks.splice(+b.dataset.rck, 1); drawChecks(); }));
    };
    drawChecks();
    $('#addCheck').addEventListener('click', () => { q.checks.push({ label: '', kw: [] }); drawChecks(); });
    $('#vqSave').addEventListener('click', async () => {
      q.q = $('#vqText').value.trim();
      if (!q.q) return UI.toast('Please enter a question', 'error');
      q.checks = q.checks.filter((c) => c.label.trim() && c.kw.length);
      const list = isNew ? items.concat([q]) : items.map((x, i) => i === idx ? q : x);
      await Store.saveVoiceQuestions(roleKey, list);
      UI.toast(isNew ? 'Question added' : 'Question updated', 'success');
      closeModal(); render();
    });
    attachModalCloses();
  }

  function confirmVQDelete(roleKey, items, idx) {
    modal(`<div class="m-head"><div class="m-ico bad">${I('trash', 20)}</div><div><h3>Delete this question?</h3><p>SARAH will no longer ask this question.</p></div></div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-danger" id="vqDelCfm">Delete</button></div>`);
    $('#vqDelCfm').addEventListener('click', async () => { const list = items.slice(); list.splice(idx, 1); await Store.saveVoiceQuestions(roleKey, list); UI.toast('Question deleted', 'success'); closeModal(); render(); });
    attachModalCloses();
  }

  function confirmVQReset(roleKey) {
    modal(`<div class="m-head"><div class="m-ico warn">${I('refresh', 20)}</div><div><h3>Reset to default questions?</h3><p>All your edits for <b>${esc(titleOfKey(roleKey))}</b> will be removed and SARAH will go back to the built-in questions.</p></div></div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="vqRstCfm">Reset</button></div>`);
    $('#vqRstCfm').addEventListener('click', async () => { await Store.resetVoiceQuestions(roleKey); UI.toast('Reset to default', 'success'); closeModal(); render(); });
    attachModalCloses();
  }

  // ---------- Email outbox ----------
  async function renderEmails() {
    const emails = await Store.listEmails();
    view.innerHTML = `<div class="page-head"><div><h1>Email outbox</h1><p>${Store.mode === 'server' ? 'All emails sent by the DVAGO platform. ' + (Store.serverInfo?.mail ? 'SMTP is configured — emails are being delivered.' : 'SMTP is not configured — emails are saved to data/emails/.') : 'Email outbox requires the server backend. Run <code>node server.js</code>.'}</p></div></div>
      <div class="table-wrap">
        ${emails.length === 0 ? `<div class="empty"><div class="ei">${I('mail', 24)}</div><h3>No emails sent yet</h3><p>Candidate confirmations, schedule reminders and invitation emails will appear here.</p></div>` : `
        <table class="tbl"><thead><tr><th>Status</th><th>To</th><th>Subject</th><th>Kind</th><th>Sent</th></tr></thead><tbody>
          ${emails.map((e) => `<tr>
            <td><span class="badge ${e.status === 'sent' ? 'b-good' : e.status === 'failed' ? 'b-bad' : 'b-warn'}">${esc(e.status)}</span></td>
            <td><b>${esc(e.to)}</b></td>
            <td>${esc(e.subject)}</td>
            <td><span class="badge b-neutral">${esc((e.meta && e.meta.kind) || '-')}</span></td>
            <td>${dtTime(e.createdAt)}</td>
          </tr>`).join('')}
        </tbody></table>`}
      </div>`;
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const n = data.length;
    const now = Date.now();
    const today = data.filter((d) => (new Date(d.completedAt || d.createdAt).toDateString()) === new Date().toDateString()).length;
    const avg = n ? Math.round(data.reduce((s, d) => s + (d.evaluation?.overall || 0), 0) / n) : 0;
    const hirable = data.filter((d) => ['Strong Hire', 'Hire'].includes(d.evaluation?.recommendation)).length;
    const rate = n ? Math.round(hirable / n * 100) : 0;

    view.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your AI-powered recruitment pipeline</p>
        </div>
        <div class="actions">
          ${isMaster() ? (allData.some((d) => d.demo)
            ? `<button class="btn btn-outline btn-sm" id="unseedBtn">${I('trash', 15)} Remove demo data</button>`
            : `<button class="btn btn-outline btn-sm" id="seedBtn">${I('sparkles', 15)} Load demo data</button>`) : ''}
          <button class="btn btn-primary btn-sm" id="newInvite">${I('plus', 15)} New invitation</button>
        </div>
      </div>
      <div class="cards">
        ${statCard('Total candidates', n, 'people', n > 0 ? '+' + Math.min(n, 5) + ' this week' : null, 'up')}
        ${statCard("Today's assessments", today, 'activity', today > 0 ? 'Active today' : 'Quiet day', today > 0 ? 'up' : 'flat')}
        ${statCard('Average score', avg + '%', 'target', avg >= 65 ? 'Strong pool' : 'Mixed pool', avg >= 65 ? 'up' : 'flat')}
        ${statCard('Hirable rate', rate + '%', 'award', hirable + ' recommended', rate >= 50 ? 'up' : 'flat')}
      </div>
      <div class="panels">
        <div class="panel">
          <div class="panel-head"><div><h3>Assessments over time</h3><div class="sub">Last 14 days of completed interviews</div></div></div>
          <div class="panel-body"><div class="chart-wrap tall"><canvas id="chTrend"></canvas></div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Recommendations</h3><div class="sub">Pipeline breakdown by AI signal</div></div></div>
          <div class="panel-body"><div class="chart-wrap tall"><canvas id="chRec"></canvas></div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <div><h3>Recent candidates</h3><div class="sub">Latest 8 completed assessments</div></div>
          <button class="btn btn-outline btn-sm" id="viewAll">${I('right', 14)} View all</button>
        </div>
        ${renderMiniTable(data.slice(0, 8))}
      </div>`;
    const seed = $('#seedBtn'); if (seed) seed.addEventListener('click', doSeed);
    const unseed = $('#unseedBtn'); if (unseed) unseed.addEventListener('click', doUnseed);
    $('#newInvite').addEventListener('click', openInviteModal);
    const va = $('#viewAll'); if (va) va.addEventListener('click', () => switchTab('candidates'));
    drawTrend(); drawRec();
  }

  function statCard(label, value, icon, trend, dir) {
    return `<div class="card">
      <div class="corner">${I(icon, 18)}</div>
      <div class="label">${esc(label)}</div>
      <div class="value">${esc(String(value))}</div>
      ${trend ? `<div class="trend ${dir || 'flat'}">${I(dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'activity', 12)}${esc(trend)}</div>` : ''}
    </div>`;
  }

  function drawTrend() {
    const bins = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); bins[d.toISOString().slice(0, 10)] = 0; }
    data.forEach((s) => { const k = (s.completedAt || s.createdAt || '').slice(0, 10); if (k in bins) bins[k]++; });
    const labels = Object.keys(bins).map((k) => new Date(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
    const values = Object.values(bins);
    charts.trend = new Chart($('#chTrend'), {
      type: 'line',
      data: { labels, datasets: [{ data: values, borderColor: '#78B943', backgroundColor: 'rgba(120,185,67,0.12)', fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: '#78B943', pointHoverRadius: 6, borderWidth: 2.5 }] },
      options: chartBase({ x: { ticks: { maxTicksLimit: 7 } }, y: { beginAtZero: true, ticks: { precision: 0 } } })
    });
  }

  function drawRec() {
    const buckets = { 'Strong Hire': 0, 'Hire': 0, 'Consider': 0, 'Not Recommended': 0 };
    data.forEach((d) => { if (buckets[d.evaluation?.recommendation] != null) buckets[d.evaluation.recommendation]++; });
    charts.rec = new Chart($('#chRec'), {
      type: 'doughnut',
      data: { labels: Object.keys(buckets), datasets: [{ data: Object.values(buckets), backgroundColor: ['#0CA30C', '#78B943', '#F5A524', '#D03B3B'], borderWidth: 0, hoverOffset: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: chartTxt(), font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 14 } } } }
    });
  }

  function chartBase(scaleOverride) {
    const t = chartTxt(), g = chartGrid();
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0F1A10', titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 8 } },
      scales: Object.assign({ x: { grid: { color: g, display: false }, ticks: { color: t, font: { family: 'Inter' } }, border: { color: g } }, y: { grid: { color: g }, ticks: { color: t, font: { family: 'Inter' } }, border: { display: false } } }, scaleOverride || {})
    };
  }

  function renderMiniTable(items) {
    if (items.length === 0) return `<div class="empty"><div class="ei">${I('people', 24)}</div><h3>No candidates yet</h3><p>Invite candidates by clicking "New invitation", or load demo data to explore the dashboard.</p></div>`;
    return `<table class="tbl"><thead><tr><th>Candidate</th><th>Role</th><th>Score</th><th>Recommendation</th><th>Date</th></tr></thead><tbody>
      ${items.map((d) => `<tr data-id="${d.id}">
        <td><div class="td-cand"><div class="av" style="background:${avColor(d.candidate.fullName)}">${initials(d.candidate.fullName)}</div><div><b>${esc(d.candidate.fullName)}${d.videoIntro && d.videoIntro.file ? ` <span class="vid-chip" title="Has interview recording">${I('camera', 10)}</span>` : ''}</b><span>${esc(d.candidate.email)}</span></div></div></td>
        <td>${esc(d.roleTitle)}</td>
        <td>${scorePill(d.evaluation?.overall || 0)}${d.evaluation?.ai ? ' <span class="ai-tag">AI</span>' : ''}</td>
        <td>${recBadge(d.evaluation?.recommendation || '-')}</td>
        <td>${dt(d.completedAt || d.createdAt)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  function scorePill(n) {
    return `<span class="score-pill"><span class="d" style="background:${scoreColor(n)}"></span>${n}%</span>`;
  }

  // ---------- Candidates list ----------
  function renderCandidates() {
    view.innerHTML = `
      <div class="page-head">
        <div><h1>Candidates</h1><p>All completed assessments · ${data.length} total</p></div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" id="refreshBtn">${I('refresh', 15)} Refresh</button>
          <button class="btn btn-outline btn-sm" id="exportBtn">${I('download', 15)} Export CSV</button>
          <button class="btn btn-primary btn-sm" id="newInvite">${I('plus', 15)} New invitation</button>
        </div>
      </div>
      <div class="table-wrap">
        <div class="table-ctrls">
          <label class="chip-sel ${state.filters.role ? 'active' : ''}">${I('target', 14)}<select id="fRole"><option value="">All roles</option>${myRoleEntries().map(([k, r]) => `<option value="${k}" ${state.filters.role === k ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>
          <label class="chip-sel ${state.filters.stage ? 'active' : ''}">${I('kanban', 14)}<select id="fStage"><option value="">All stages</option>${['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'].map((s) => `<option ${state.filters.stage === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
          <button class="chip-sel" id="clearF">${I('x', 14)} Clear</button>
        </div>
        ${renderBigTable()}
      </div>`;
    $('#fRole').addEventListener('change', (e) => { state.filters.role = e.target.value; state.page = 1; render(); });
    $('#fStage').addEventListener('change', (e) => { state.filters.stage = e.target.value; state.page = 1; render(); });
    $('#clearF').addEventListener('click', () => { state.filters = { role: '', stage: '', q: '' }; $('#gSearch').value = ''; state.page = 1; render(); });
    $('#newInvite').addEventListener('click', openInviteModal);
    $('#exportBtn').addEventListener('click', exportCSV);
    $('#refreshBtn').addEventListener('click', async () => { await loadData(); UI.toast('Refreshed · ' + data.length + ' candidates', 'success'); render(); });
    attachRowClicks();
    attachSort();
  }

  function filtered() {
    const q = state.filters.q.toLowerCase().trim();
    return data.filter((d) => {
      if (state.filters.role && d.role !== state.filters.role) return false;
      if (state.filters.stage && d.stage !== state.filters.stage) return false;
      if (q && !(d.candidate.fullName.toLowerCase().includes(q) || d.candidate.email.toLowerCase().includes(q) || d.roleTitle.toLowerCase().includes(q))) return false;
      return true;
    }).sort((a, b) => {
      const [k, dir] = state.sort.split('-'); const s = dir === 'desc' ? -1 : 1;
      if (k === 'name') return s * a.candidate.fullName.localeCompare(b.candidate.fullName);
      if (k === 'role') return s * a.roleTitle.localeCompare(b.roleTitle);
      if (k === 'score') return s * ((a.evaluation?.overall || 0) - (b.evaluation?.overall || 0));
      return s * (new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt));
    });
  }

  function renderBigTable() {
    const items = filtered();
    if (items.length === 0) return `<div class="empty"><div class="ei">${I('search', 24)}</div><h3>No candidates match</h3><p>Try adjusting your filters or clearing the search.</p></div>`;
    const start = (state.page - 1) * state.perPage;
    const page = items.slice(start, start + state.perPage);
    const totalPages = Math.ceil(items.length / state.perPage);
    const sortIco = (k) => state.sort.startsWith(k + '-') ? I(state.sort.endsWith('desc') ? 'down' : 'up', 12, 'sort') : I('up', 12, 'sort');
    return `<table class="tbl"><thead><tr>
        <th class="${state.sort.startsWith('name') ? 'sorted' : ''}" data-sort="name">Candidate ${sortIco('name')}</th>
        <th class="${state.sort.startsWith('role') ? 'sorted' : ''}" data-sort="role">Role ${sortIco('role')}</th>
        <th class="${state.sort.startsWith('score') ? 'sorted' : ''}" data-sort="score">Score ${sortIco('score')}</th>
        <th>Recommendation</th>
        <th>Stage</th>
        <th>Integrity</th>
        <th class="${state.sort.startsWith('date') ? 'sorted' : ''}" data-sort="date">Submitted ${sortIco('date')}</th>
      </tr></thead><tbody>
        ${page.map((d) => {
          const integ = d.evaluation?.integrity?.level || 'High';
          return `<tr data-id="${d.id}">
            <td><div class="td-cand"><div class="av" style="background:${avColor(d.candidate.fullName)}">${initials(d.candidate.fullName)}</div><div><b>${esc(d.candidate.fullName)}${d.videoIntro && d.videoIntro.file ? ` <span class="vid-chip" title="Has interview recording">${I('camera', 10)}</span>` : ''}</b><span>${esc(d.candidate.email)}</span></div></div></td>
            <td>${esc(d.roleTitle)}<br><span style="font-size:12px;color:var(--muted)">${esc(B.CATEGORIES[d.category]?.label || '')}</span></td>
            <td>${scorePill(d.evaluation?.overall || 0)}${d.evaluation?.ai ? ' <span class="ai-tag">AI</span>' : ''}</td>
            <td>${recBadge(d.evaluation?.recommendation || '-')}</td>
            <td><span class="badge b-info">${esc(d.stage || 'New')}</span></td>
            <td><span class="badge ${integ === 'High' ? 'b-good' : integ === 'Medium' ? 'b-warn' : 'b-bad'}">${esc(integ)}</span></td>
            <td>${dtTime(d.completedAt || d.createdAt)}</td>
          </tr>`;
        }).join('')}
      </tbody></table>
      <div class="pager">
        <span>Showing ${start + 1}–${Math.min(start + state.perPage, items.length)} of ${items.length}</span>
        <div class="pager-btns">
          <button class="pbtn" ${state.page === 1 ? 'disabled' : ''} onclick="void 0" data-p="prev">${I('left', 14)}</button>
          ${Array.from({ length: Math.min(totalPages, 7) }, (_, i) => { const p = i + 1; return `<button class="pbtn ${p === state.page ? 'active' : ''}" data-p="${p}">${p}</button>`; }).join('')}
          <button class="pbtn" ${state.page === totalPages ? 'disabled' : ''} data-p="next">${I('right', 14)}</button>
        </div>
      </div>`;
  }

  function attachRowClicks() {
    $$('.tbl tbody tr').forEach((tr) => tr.addEventListener('click', () => { state.candidateId = tr.dataset.id; render(); }));
    $$('.pbtn[data-p]').forEach((b) => b.addEventListener('click', (e) => {
      const p = b.dataset.p;
      const total = Math.ceil(filtered().length / state.perPage);
      state.page = p === 'prev' ? Math.max(1, state.page - 1) : p === 'next' ? Math.min(total, state.page + 1) : +p;
      render();
    }));
  }
  function attachSort() {
    $$('.tbl th[data-sort]').forEach((th) => th.addEventListener('click', () => {
      const k = th.dataset.sort;
      const dir = state.sort === k + '-asc' ? 'desc' : 'asc';
      state.sort = k + '-' + dir;
      render();
    }));
  }

  // ---------- Candidate detail ----------
  function renderDetail() {
    const d = data.find((x) => x.id === state.candidateId);
    if (!d) { state.candidateId = null; return render(); }
    const ev = d.evaluation || {};
    const comps = ev.competencies || {};
    const sections = ev.sections || {};
    view.innerHTML = `
      <div class="page-head">
        <div>
          <button class="btn btn-outline btn-sm" id="backBtn">${I('left', 14)} Back</button>
        </div>
        <div class="actions">
          ${d.videoIntro && d.videoIntro.file ? `<button class="btn btn-outline btn-sm" id="playVid">${I('camera', 15)} Watch recording</button>` : ''}
          ${Store.serverInfo?.ai ? `<button class="btn btn-outline btn-sm" id="aiBtn">${I('brain', 15)} ${ev.ai ? 'Re-run AI' : 'Run Claude AI'}</button>` : ''}
          ${d.resume ? `<button class="btn btn-outline btn-sm" id="dlResume">${I('download', 15)} Resume</button>` : ''}
          <button class="btn btn-outline btn-sm" id="menuBtn2">${I('settings', 15)}</button>
        </div>
      </div>
      <div class="detail">
        <div class="detail-main">
          <div class="d-head">
            <div class="d-head-top">
              <div class="big-av" style="color:${avColor(d.candidate.fullName)}">${initials(d.candidate.fullName)}</div>
              <div>
                <h2>${esc(d.candidate.fullName)}</h2>
                <div class="d-meta">
                  <span>${I('target', 13)}${esc(d.roleTitle)}</span>
                  <span>${I('map', 13)}${esc(d.candidate.city)}</span>
                  <span>${I('mail', 13)}${esc(d.candidate.email)}</span>
                  <span>${I('clock', 13)}${dtTime(d.completedAt)}</span>
                </div>
              </div>
              <div class="big-score">
                <div class="score-ring" style="--v:${ev.overall || 0};--c:${scoreColor(ev.overall || 0)}"><span>${ev.overall || 0}</span></div>
                <div class="rec-tag ${recClass(ev.recommendation || 'Not')}">${esc(ev.recommendation || '-')}</div>
              </div>
            </div>
          </div>

          ${ev.summary ? `<div class="summary-box ${ev.ai ? 'ai' : ''}">
            <div class="sb-head">${I('sparkles', 16)}<b>${ev.ai ? 'Claude AI Evaluation' : 'SARAH Evaluation'}</b></div>
            <p>${esc(ev.summary)}</p>
            <div class="sb-cols">
              <div class="sb-col"><h4>Strengths</h4><ul class="pos">${(ev.strengths || []).map((s) => `<li><span class="m">${I('check', 12)}</span>${esc(s)}</li>`).join('')}</ul></div>
              <div class="sb-col"><h4>Development areas</h4><ul class="neg">${(ev.concerns || []).map((s) => `<li><span class="m">${I('alert', 12)}</span>${esc(s)}</li>`).join('')}</ul></div>
            </div>
          </div>` : ''}

          <div class="panel">
            <div class="panel-head"><div><h3>Section scores</h3><div class="sub">Breakdown of each assessment section</div></div></div>
            <div class="panel-body">
              <div class="scorebars">
                ${['voice', 'sjt', 'simulation', 'case', 'reasoning', 'resume'].map((k) => {
                  const s = sections[k];
                  if (!s) return '';
                  const n = s.score || 0;
                  const label = { voice: 'Voice interview', sjt: 'Decision making', simulation: 'Job simulation', case: 'Case study', reasoning: 'Reasoning', resume: 'Resume fit' }[k];
                  return `<div class="sbar"><div class="lbl">${label}</div><div class="bar"><div class="fill" style="width:${n}%;background:${scoreColor(n)}"></div></div><div class="n">${n}</div></div>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><div><h3>Competency profile</h3><div class="sub">How this candidate performed on key competencies</div></div></div>
            <div class="panel-body"><div class="chart-wrap" style="height:280px"><canvas id="chRadar"></canvas></div></div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div><h3>Interview & answers</h3><div class="sub">Voice conversation and case study responses</div></div>
            </div>
            <div class="panel-body">
              <div class="sec-tabs" id="ansTabs">
                <button class="sec-tab active" data-s="voice">${I('mic', 14)} Voice</button>
                <button class="sec-tab" data-s="case">${I('file', 14)} Case study</button>
                <button class="sec-tab" data-s="sjt">${I('compass', 14)} Scenarios</button>
                ${ev.followUps?.length ? `<button class="sec-tab" data-s="followups">${I('sparkles', 14)} Follow-ups</button>` : ''}
              </div>
              <div style="margin-top:16px" id="ansBody"></div>
            </div>
          </div>
        </div>

        <div class="detail-side">
          <div class="side-panel">
            <h4>Hiring stage</h4>
            <div class="stage-pick">
              ${['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'].map((s) => `<button class="stage-btn ${d.stage === s ? 'active' : ''}" data-s="${s}"><span class="st-dot"></span>${esc(s)}</button>`).join('')}
            </div>
          </div>
          ${(isRecommended(d) || d.round2) ? `<div class="side-panel">
            <h4>Next round</h4>
            <div style="display:flex;flex-direction:column;gap:10px">
              <div><span class="badge ${R2_STATUS[r2Status(d)].cls}">${esc(R2_STATUS[r2Status(d)].label)}</span></div>
              ${d.round2 && d.round2.slot ? `<div style="font-size:13px">${I('clock', 13)} <b>${esc(slotLabel(d.round2.slot.at))}</b> · ${d.round2.slot.durationMin} min${d.round2.interviewer ? '<br><span style="color:var(--muted)">with ' + esc(d.round2.interviewer) + '</span>' : ''}<br><span style="color:var(--muted)">${d.round2.mode === 'onsite' ? 'On-site' : 'Online'}</span>${d.round2.meetLink ? ' · <a href="' + esc(d.round2.meetLink) + '" target="_blank" rel="noopener">Meet link</a>' : ''}</div>` : ''}
              ${r2Status(d) === 'slot-set' ? `<button class="btn btn-primary btn-sm" id="r2Send">${I('send', 14)} ${d.round2.send && d.round2.send.state === 'failed' ? 'Retry email' : 'Send email'}</button>` : ''}
              ${r2Status(d) === 'pending' ? `<button class="btn btn-primary btn-sm" id="r2Approve">${I('check', 14)} Approve</button>` : `<button class="btn ${r2Status(d) === 'approved' ? 'btn-primary' : 'btn-outline'} btn-sm" id="r2Invite">${I(r2Status(d) === 'approved' ? 'send' : 'clock', 14)} ${r2Status(d) === 'approved' ? 'Invite for next round' : 'Change slot'}</button>`}
              ${d.round2 && d.round2.history && d.round2.history.length ? `<div style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px">${d.round2.history.slice().reverse().map((h) => `<span>${esc(h.event)} · ${esc(h.by || '')} · ${dtTime(h.at)}</span>`).join('')}</div>` : ''}
            </div>
          </div>` : ''}
          ${(d.round2 && ['slot-set', 'sent'].includes(d.round2.status)) ? `<div class="side-panel"><h4>Interview feedback & offer</h4><div style="display:flex;flex-direction:column;gap:10px">
              ${(d.reviews || []).length ? reviewBlock(d) : '<div class="rv-note">No feedback yet.</div>'}
              <button class="btn ${needsMe(d) ? 'btn-primary' : 'btn-outline'} btn-sm" id="fbOpen">${I('star', 14)} ${myReview(d) ? 'Edit my feedback' : 'Give feedback'}</button>
              ${OFFER_META[offerSt(d)] ? `<span class="badge ${OFFER_META[offerSt(d)].cls}" style="align-self:flex-start">${OFFER_META[offerSt(d)].label}</span>` : ''}
              <div style="display:flex;flex-wrap:wrap;gap:8px">${offerActions(d)}</div>
            </div></div>` : ''}
          <div class="side-panel">
            <h4>Rating</h4>
            <div class="stars" id="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-n="${n}" class="${(d.rating || 0) >= n ? 'on' : ''}" aria-label="${n} stars">${I('star', 22)}</button>`).join('')}</div>
          </div>
          <div class="side-panel">
            <h4>Notes</h4>
            <textarea class="inp" id="notes" placeholder="Add private notes for the hiring team…">${esc(d.notes || '')}</textarea>
          </div>
          <div class="side-panel">
            <h4>Candidate info</h4>
            <div class="info-row"><span>Phone</span><span>${esc(d.candidate.phone || '-')}</span></div>
            <div class="info-row"><span>Education</span><span>${esc(d.candidate.education || '-')}</span></div>
            <div class="info-row"><span>Experience</span><span>${esc(d.candidate.experience || '-')}</span></div>
            <div class="info-row"><span>Current / last company</span><span>${esc(d.candidate.employer || '-')}</span></div>
            <div class="info-row"><span>Current salary</span><span>${d.candidate.currentSalary ? 'PKR ' + Number(d.candidate.currentSalary).toLocaleString() + ' / mo' : '-'}</span></div>
            <div class="info-row"><span>Other perks</span><span style="text-align:right">${esc(d.candidate.currentPerks || '-')}</span></div>
            <div class="info-row"><span>Expected salary</span><span><b>${d.candidate.expectedSalary ? 'PKR ' + Number(d.candidate.expectedSalary).toLocaleString() + ' / mo' : '-'}</b></span></div>
            <div class="info-row"><span>City</span><span>${esc(d.candidate.city || '-')}</span></div>
            <div class="info-row"><span>Resume</span><span>${d.resume ? esc(d.resume.name) : '<span style="color:var(--muted)">None</span>'}</span></div>
            <div class="info-row"><span>Interview recording</span><span>${d.videoIntro && d.videoIntro.file ? `<a href="#" id="playVideoLink" style="color:var(--brand-dark);font-weight:600">▶ ${d.videoIntro.duration || 0}s</a>` : '<span style="color:var(--muted)">Not available</span>'}</span></div>
            <div class="info-row"><span>Integrity</span><span>${ev.integrity?.level || 'High'}</span></div>
            <div class="info-row"><span>Tab switches</span><span>${ev.integrity?.tabSwitches || 0}</span></div>
            <div class="info-row"><span>Paste attempts</span><span>${ev.integrity?.pasteAttempts || 0}</span></div>
            <div class="info-row"><span>Submitted</span><span>${dtTime(d.completedAt)}</span></div>
            <div class="info-row"><span>Reference</span><span style="font-family:ui-monospace,monospace;font-size:12px">${esc(d.id)}</span></div>
          </div>
        </div>
      </div>`;

    $('#backBtn').addEventListener('click', () => { state.candidateId = null; render(); });
    $('#menuBtn2').addEventListener('click', (e) => openMenu(e, [
      { icon: 'printer', label: 'Print profile', fn: () => window.print() },
      { icon: 'mail', label: 'Email candidate', fn: () => location.href = 'mailto:' + d.candidate.email },
      { icon: 'trash', label: 'Delete candidate', danger: true, fn: () => confirmDelete(d) }
    ]));
    const ab = $('#aiBtn'); if (ab) ab.addEventListener('click', async () => {
      ab.disabled = true; ab.innerHTML = `${I('refresh', 15)} AI thinking…`;
      try { await Store.aiEvaluate(d.id); UI.toast('AI evaluation complete', 'success'); await loadData(); render(); }
      catch (e) { UI.toast(e.message, 'error'); ab.disabled = false; ab.innerHTML = `${I('brain', 15)} Run Claude AI`; }
    });
    const dlr = $('#dlResume'); if (dlr) dlr.addEventListener('click', async () => {
      const r = await Store.getResume(d.id);
      if (!r) return UI.toast('Resume unavailable', 'error');
      const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click();
    });
    const r2a = $('#r2Approve'); if (r2a) r2a.addEventListener('click', async () => { await reviewAction('approve', d.id); renderDetail(); });
    const r2s = $('#r2Send'); if (r2s) r2s.addEventListener('click', () => openSendModal(d));
    const r2i = $('#r2Invite'); if (r2i) r2i.addEventListener('click', () => openSlotModal(d));
    const fbo = $('#fbOpen'); if (fbo) fbo.addEventListener('click', () => openFeedbackModal(d, renderDetail));
    $$('[data-fa]').forEach((b) => b.addEventListener('click', () => feedbackAction(b.dataset.fa, b.dataset.id, renderDetail)));
    const pv = $('#playVideoLink'); if (pv) pv.addEventListener('click', (e) => { e.preventDefault(); openVideoModal(d); });
    const pv2 = $('#playVid'); if (pv2) pv2.addEventListener('click', () => openVideoModal(d));
    $$('.stage-btn').forEach((b) => b.addEventListener('click', async () => {
      $$('.stage-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      await Store.updateSubmission(d.id, { stage: b.dataset.s });
      d.stage = b.dataset.s;
      UI.toast('Stage updated to ' + b.dataset.s, 'success');
    }));
    $$('#stars button').forEach((b) => b.addEventListener('click', async () => {
      const n = +b.dataset.n;
      d.rating = d.rating === n ? 0 : n;
      $$('#stars button').forEach((x) => x.classList.toggle('on', +x.dataset.n <= d.rating));
      await Store.updateSubmission(d.id, { rating: d.rating });
    }));
    let noteT;
    $('#notes').addEventListener('input', (e) => {
      clearTimeout(noteT);
      noteT = setTimeout(async () => { await Store.updateSubmission(d.id, { notes: e.target.value }); d.notes = e.target.value; }, 600);
    });

    renderAnswers('voice', d);
    $$('#ansTabs .sec-tab').forEach((b) => b.addEventListener('click', () => {
      $$('#ansTabs .sec-tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      renderAnswers(b.dataset.s, d);
    }));
    drawRadar(comps);
  }

  function renderAnswers(section, d) {
    const body = $('#ansBody');
    const ev = d.evaluation || {};
    if (section === 'voice') {
      body.innerHTML = `<div class="ans-list">${(d.voice || []).map((v, k) => {
        const vi = (ev.sections?.voice?.items || [])[k] || {};
        const hasAudio = v.audio && v.audio.file;
        return `<div class="ans"><div class="ans-head"><b>Q${k + 1} · ${v.mode === 'voice' ? 'Voice' : 'Typed'}${hasAudio ? ' · <span style="color:var(--brand-dark)">🔊 Audio</span>' : ''}</b><span class="badge ${vi.score >= 70 ? 'b-good' : vi.score >= 50 ? 'b-warn' : 'b-bad'}">${vi.score || 0}/100</span></div>
          <div class="q">${esc(v.q)}</div>
          <div class="a ${v.mode === 'voice' ? 'voice' : ''}">${esc(v.answer) || '<em style="color:var(--muted)">No answer</em>'}</div>
          ${hasAudio ? `<div class="aud-wrap" style="margin-top:8px"><button type="button" class="btn btn-outline btn-sm" data-aud="${esc(d.id)}|${esc(v.id)}">\u25B6 Play voice answer</button></div>` : '<div class="muted" style="margin-top:8px;font-size:12px">No audio recorded for this answer</div>'}
          ${v.followUp ? `<div class="q" style="margin-top:10px"><b style="color:var(--brand-dark)">Follow-up:</b> ${esc(v.followUp.q)}</div><div class="a ${v.followUp.mode === 'voice' ? 'voice' : ''}">${esc(v.followUp.answer) || '<em>No answer</em>'}</div>` : ''}
          <div class="meta"><span>${I('clock', 11)}${v.durationSec || 0}s</span><span>${(v.answer || '').split(/\s+/).filter(Boolean).length} words</span>${vi.wpm ? `<span>${vi.wpm} wpm</span>` : ''}${vi.fillers != null ? `<span>${vi.fillers} fillers</span>` : ''}</div>
        </div>`;
      }).join('') || '<p class="muted" style="text-align:center;padding:20px">No voice answers</p>'}</div>`
        + ((d.adaptive || []).length ? `<h4 style="margin:22px 0 4px">${I('sparkles', 14)} SARAH deep-dive questions <span class="muted" style="font-weight:400;font-size:12px">· personalised, not scored</span></h4><div class="ans-list">${d.adaptive.map((a, k) => `<div class="ans"><div class="ans-head"><b>Deep-dive ${k + 1} · ${a.mode === 'voice' ? 'Voice' : 'Typed'}</b><span class="badge ${a.source === 'ai' ? 'b-good' : 'b-warn'}">${a.source === 'ai' ? 'AI-written' : 'Backup question'}</span></div><div class="q">${esc(a.q)}</div>${a.why ? `<div class="muted" style="font-size:12px;margin:2px 0 6px">Why asked: ${esc(a.why)}</div>` : ''}<div class="a ${a.mode === 'voice' ? 'voice' : ''}">${esc(a.answer) || '<em style="color:var(--muted)">No answer</em>'}</div></div>`).join('')}</div>` : '');
      // Lazy-load audio via admin auth
      let tok = null; try { tok = sessionStorage.getItem('dvago_admin_token'); } catch (e) {}
      $$('button[data-aud]', body).forEach((btn) => {
        const [subId, qId] = btn.dataset.aud.split('|');
        btn.addEventListener('click', async () => {
          btn.disabled = true; btn.textContent = 'Loading audio\u2026';
          try {
            const r = await fetch('api/voice-audio/' + encodeURIComponent(subId) + '/' + encodeURIComponent(qId), { headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const url = URL.createObjectURL(await r.blob());
            const au = document.createElement('audio');
            au.controls = true; au.autoplay = true; au.src = url; au.style.cssText = 'width:100%';
            btn.parentNode.replaceChild(au, btn);
          } catch (err) { btn.disabled = false; btn.textContent = '\u25B6 Play voice answer'; UI.toast('Audio unavailable', 'error'); }
        });
      });
    } else if (section === 'case') {
      const cs = d.qset ? d.qset.caseStudy : (B.ROLES[d.role] && B.roleQuestions(d.role).caseStudy);
      body.innerHTML = `<div class="ans-list">${(cs?.questions || []).map((q, k) => {
        const ans = (d.answers?.case || {})[q.id] || '';
        const item = (ev.sections?.case?.items || [])[k] || {};
        return `<div class="ans"><div class="ans-head"><b>Case Q${k + 1}</b><span class="badge ${item.score >= 70 ? 'b-good' : item.score >= 50 ? 'b-warn' : 'b-bad'}">${item.score || 0}/100</span></div>
          <div class="q">${esc(q.q)}</div>
          <div class="a">${esc(ans) || '<em>No answer</em>'}</div>
          ${item.covered?.length || item.missed?.length ? `<div class="rub">${(item.covered || []).map((p) => `<span class="r ok">${I('check', 10)} ${esc(p)}</span>`).join('')}${(item.missed || []).map((p) => `<span class="r no">${esc(p)}</span>`).join('')}</div>` : ''}
          ${item.aiFeedback ? `<div class="ai-fb"><b>${I('brain', 11)} Claude AI</b>${esc(item.aiFeedback)}</div>` : ''}
          <div class="meta"><span>${item.words || (ans.split(/\s+/).filter(Boolean).length)} words</span></div>
        </div>`;
      }).join('') || '<p class="muted" style="text-align:center;padding:20px">No case answers</p>'}</div>`;
    } else if (section === 'sjt') {
      const sjts = d.qset ? d.qset.sjt : (B.ROLES[d.role] && B.roleQuestions(d.role).sjt);
      body.innerHTML = `<div class="ans-list">${(sjts || []).map((q, k) => {
        const sel = (d.answers?.sjt || {})[q.id];
        const item = (ev.sections?.sjt?.items || [])[k] || {};
        return `<div class="ans"><div class="ans-head"><b>${esc(q.title)}</b><span class="badge ${item.score >= 70 ? 'b-good' : item.score >= 50 ? 'b-warn' : 'b-bad'}">${item.score || 0}/100</span></div>
          <div class="q">${esc(q.question)}</div>
          <div class="a">${sel != null ? esc(q.options[sel].t) : '<em>Not answered</em>'}</div>
          ${sel !== item.best ? `<div class="meta"><span style="color:var(--good)">${I('check', 11)} Best answer: ${esc(q.options[item.best].t)}</span></div>` : '<div class="meta"><span style="color:var(--good)">${I("check",11)} Chose the strongest option</span></div>'}
        </div>`;
      }).join('') || '<p class="muted" style="text-align:center;padding:20px">No scenario answers</p>'}</div>`;
    } else if (section === 'followups') {
      body.innerHTML = `<div class="ans-list">${(ev.followUps || []).map((q, k) => `<div class="ans"><div class="ans-head"><b>Suggested question ${k + 1}</b></div><div class="q" style="font-size:14px">${esc(q)}</div></div>`).join('')}</div>`;
    }
  }

  function drawRadar(comps) {
    const labels = Object.keys(B.COMPETENCIES).map((k) => B.COMPETENCIES[k].short);
    const values = Object.keys(B.COMPETENCIES).map((k) => comps[k] || 0);
    charts.radar = new Chart($('#chRadar'), {
      type: 'radar',
      data: { labels, datasets: [{ data: values, backgroundColor: 'rgba(120,185,67,0.2)', borderColor: '#78B943', borderWidth: 2, pointBackgroundColor: '#78B943', pointRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, color: chartTxt(), font: { family: 'Inter', size: 10 }, backdropColor: 'transparent' }, grid: { color: chartGrid() }, angleLines: { color: chartGrid() }, pointLabels: { color: chartTxt(), font: { family: 'Inter', size: 12, weight: '600' } } } }
      }
    });
  }

  function openVideoModal(d) {
    const url = 'api/video/' + encodeURIComponent(d.id);
    let token = null; try { token = sessionStorage.getItem('dvago_admin_token'); } catch (e) {}
    modal(`<div class="m-head"><div class="m-ico brand">${I('camera', 20)}</div><div><h3>${esc(d.candidate.fullName)}'s interview recording</h3><p>${d.videoIntro.duration || 0} seconds · ${Math.round((d.videoIntro.size || 0) / 1024)} KB</p></div></div>
      <div class="m-body" style="padding:0 4px"><video id="introVideo" controls autoplay playsinline style="width:100%;border-radius:12px;background:#0a1a0c;max-height:480px"></video></div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Close</button><a class="btn btn-outline" id="dlVid" download="${esc(d.candidate.fullName)}-interview.webm">${I('download', 14)} Download</a></div>`, 'wide');
    const v = $('#introVideo');
    fetch(url, { headers: token ? { Authorization: 'Bearer ' + token } : {} })
      .then((r) => r.ok ? r.blob() : Promise.reject())
      .then((blob) => { const u = URL.createObjectURL(blob); v.src = u; $('#dlVid').href = u; })
      .catch(() => UI.toast('Video unavailable', 'error'));
    attachModalCloses();
  }

  function confirmDelete(d) {
    modal(`
      <div class="m-head"><div class="m-ico bad">${I('trash', 20)}</div><div><h3>Delete this candidate?</h3><p>This will permanently remove ${esc(d.candidate.fullName)}'s submission.</p></div></div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-danger" id="confirmDel">Delete</button></div>
    `);
    $('#confirmDel').addEventListener('click', async () => { await Store.deleteSubmission(d.id); UI.toast('Candidate deleted', 'success'); state.candidateId = null; await loadData(); render(); closeModal(); });
  }

  // ---------- Inbox ----------
  function renderInbox() {
    const newOnes = data.filter((d) => d.stage === 'New' || !d.stage);
    view.innerHTML = `<div class="page-head"><div><h1>Inbox</h1><p>New candidates waiting for your review · ${newOnes.length} items</p></div></div>
      <div class="table-wrap">${renderMiniTable(newOnes)}</div>`;
    attachRowClicks();
  }

  // ---------- Review (recommended candidates -> Round 2) ----------
  const R2_STATUS = {
    pending: { label: 'Awaiting approval', cls: 'b-warn' },
    approved: { label: 'Approved', cls: 'b-info' },
    'slot-set': { label: 'Invite ready', cls: 'b-good' },
    sent: { label: 'Email sent', cls: 'b-good' }
  };
  const isRecommended = (d) => ['Strong Hire', 'Hire'].includes(d.evaluation && d.evaluation.recommendation);
  const r2Status = (d) => (d.round2 && d.round2.status) || 'pending';
  const reviewList = () => data.filter((d) => isRecommended(d) || d.round2);
  const pendingReviewCount = () => reviewList().filter((d) => r2Status(d) === 'pending').length;
  const myName = () => { if (!isMaster()) return me.name || ''; try { return localStorage.getItem('dvago_admin_name') || ''; } catch (e) { return ''; } };
  const tzShort = () => new Date().getTimezoneOffset() === -300 ? 'PKT' : (new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName') || {}).value || '';
  const slotLabel = (at) => new Date(at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) + ' (' + tzShort() + ')';

  function renderReview() {
    const all = reviewList();
    const f = state.reviewFilter || 'all';
    const items = all.filter((d) => f === 'all' || r2Status(d) === f).sort((a, b) => (b.evaluation?.overall || 0) - (a.evaluation?.overall || 0));
    const cnt = (k) => all.filter((d) => r2Status(d) === k).length;
    view.innerHTML = `
      <div class="page-head">
        <div><h1>Recommended</h1><p>Recommended candidates for leadership review · approve, set the interview and email the invitation</p></div>
        <div class="actions"><button class="btn btn-outline btn-sm" id="refreshBtn">${I('refresh', 15)} Refresh</button></div>
      </div>
      <div class="sec-tabs" id="rvTabs" style="margin-bottom:16px">
        ${[['all', 'All', all.length], ['pending', 'Awaiting approval', cnt('pending')], ['approved', 'Approved', cnt('approved')], ['slot-set', 'Invite ready', cnt('slot-set')], ['sent', 'Email sent', cnt('sent')]].map(([k, l, n]) => `<button class="sec-tab ${f === k ? 'active' : ''}" data-f="${k}">${esc(l)} (${n})</button>`).join('')}
      </div>
      <div class="rv-list">
        ${items.length === 0 ? `<div class="table-wrap"><div class="empty"><div class="ei">${I('award', 24)}</div><h3>Nothing to review here</h3><p>Candidates recommended as "Hire" or "Strong Hire" will appear here for approval.</p></div></div>` : items.map((d) => {
            const st = r2Status(d); const meta = R2_STATUS[st]; const r2 = d.round2 || {};
            const act = st === 'pending'
              ? `<button class="btn btn-primary btn-sm" data-act="approve" data-id="${d.id}">${I('check', 14)} Approve</button>`
              : st === 'approved'
                ? `<button class="btn btn-primary btn-sm" data-act="invite" data-id="${d.id}">${I('send', 14)} Invite for next round</button><button class="btn btn-outline btn-sm" data-act="undo" data-id="${d.id}" title="Undo approval">${I('x', 14)} Undo</button>`
                : st === 'slot-set'
                  ? `<button class="btn btn-primary btn-sm" data-act="send" data-id="${d.id}">${I('send', 14)} ${r2.send && r2.send.state === 'failed' ? 'Retry email' : 'Send email'}</button><button class="btn btn-outline btn-sm" data-act="invite" data-id="${d.id}">${I('clock', 14)} Change slot</button>`
                  : `<button class="btn btn-outline btn-sm" data-act="invite" data-id="${d.id}">${I('clock', 14)} Change slot</button>`;
            return `<div class="rv-card" data-id="${d.id}">
              <div class="rv-main">
                <div class="rv-c1"><div class="td-cand"><div class="av" style="background:${avColor(d.candidate.fullName)}">${initials(d.candidate.fullName)}</div><div><b>${esc(d.candidate.fullName)}</b><span>${esc(d.candidate.email)}</span></div></div></div>
                <div class="rv-c2"><small>Role</small><b>${esc(d.positionTitle || d.roleTitle)}</b>${d.positionTitle ? `<span>${esc(d.roleTitle)}</span>` : ''}</div>
                <div class="rv-c3"><small>Score</small><div class="rv-sc">${scorePill(d.evaluation?.overall || 0)}${recBadge(d.evaluation?.recommendation || '-')}</div></div>
                <div class="rv-c4"><small>Expected salary</small><b>${d.candidate.expectedSalary ? 'PKR ' + Number(d.candidate.expectedSalary).toLocaleString() : '-'}</b></div>
                <div class="rv-c5"><span class="badge ${meta.cls}">${esc(meta.label)}</span>${r2.slot ? `<div class="rv-note">${I('clock', 11)} ${esc(slotLabel(r2.slot.at))} · ${r2.slot.durationMin} min · ${r2.mode === 'onsite' ? 'On-site' : 'Online'}</div>` : ''}${r2.meetLink ? `<div class="rv-note"><a href="${esc(r2.meetLink)}" target="_blank" rel="noopener">Meet link</a></div>` : ''}${r2.send && r2.send.state === 'failed' ? `<div class="rv-note bad" title="${esc(r2.send.error)}">${I('alert', 11)} Email failed</div>` : ''}${r2.approvedBy && st !== 'pending' ? `<div class="rv-note">approved by ${esc(r2.approvedBy)}</div>` : ''}</div>
              </div>
              <div class="rv-actions">
                <button class="btn btn-outline btn-sm" data-act="resume" data-id="${d.id}" ${d.resume ? '' : 'disabled title="No resume uploaded"'}>${I('download', 14)} Resume</button>
                <button class="btn btn-outline btn-sm" data-act="view" data-id="${d.id}">${I('right', 14)} View</button>
                ${act}
              </div>
            </div>`;
          }).join('')}
      </div>`;
    $$('#rvTabs .sec-tab').forEach((b) => b.addEventListener('click', () => { state.reviewFilter = b.dataset.f; renderReview(); }));
    $('#refreshBtn').addEventListener('click', async () => { await loadData(); renderNav(); UI.toast('Refreshed', 'success'); renderReview(); });
    $$('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); reviewAction(b.dataset.act, b.dataset.id); }));
  }

  async function saveRound2(d, patch, event) {
    const prev = d.round2 || {};
    const r2 = Object.assign({}, prev, patch);
    r2.history = (prev.history || []).concat([{ at: new Date().toISOString(), event, by: r2.approvedBy || myName() || 'Admin' }]);
    const body = { round2: r2 };
    if (patch.status === 'slot-set') body.stage = 'Interview';
    await Store.updateSubmission(d.id, body);
    d.round2 = r2; if (body.stage) d.stage = body.stage;
  }

  async function reviewAction(act, id) {
    const d = data.find((x) => x.id === id); if (!d) return;
    if (act === 'view') { state.candidateId = id; return render(); }
    if (act === 'resume') {
      const r = await Store.getResume(d.id);
      if (!r) return UI.toast('Resume unavailable', 'error');
      const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click(); return;
    }
    if (act === 'approve') {
      try { await saveRound2(d, { status: 'approved', approvedBy: myName() || 'Admin', approvedAt: new Date().toISOString() }, 'Approved'); }
      catch (e) { return UI.toast('Could not save: ' + e.message, 'error'); }
      UI.toast(d.candidate.fullName + ' approved', 'success'); renderNav(); return renderReview();
    }
    if (act === 'undo') {
      try { await Store.updateSubmission(d.id, { round2: null }); } catch (e) { return UI.toast('Could not save: ' + e.message, 'error'); }
      d.round2 = null; UI.toast('Approval undone', 'success'); renderNav(); return renderReview();
    }
    if (act === 'invite') return openSlotModal(d);
    if (act === 'send') return openSendModal(d);
  }

  async function openSendModal(d) {
    const r2 = d.round2 || {};
    let em;
    try { em = await Store.round2Email(d.id); } catch (e) { return UI.toast(e.message, 'error'); }
    modal(`
      <div class="m-head"><div class="m-ico brand">${I('send', 20)}</div><div><h3>Send invitation email</h3><p>${esc(d.candidate.fullName)} · ${esc(r2.mode === 'onsite' ? 'On-site' : 'Online (Google Meet)')}</p></div></div>
      <div class="m-body">
        ${em.configured ? '' : `<div class="slot-sum" style="background:var(--warn-bg,#fff4e0);color:var(--warn,#8a5a00)">${I('alert', 14)} Email sender is not connected yet (ROUND2_SCRIPT_URL / ROUND2_SCRIPT_KEY missing). You can preview, but sending will fail.</div>`}
        <div style="font-size:13px;color:var(--muted)">From <b>${esc(em.sender)}</b> · To <b>${esc(em.to)}</b>${r2.mode === 'onsite' ? '' : ' · a Google Meet link is created automatically'}</div>
        <div style="font-size:13px"><b>Subject:</b> ${esc(em.subject)}</div>
        <div style="border:1px solid var(--line,#e3e6ee);border-radius:10px;padding:14px;max-height:320px;overflow:auto;background:#fff;color:#1a1f36">${em.html}</div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="sendGo">${I('send', 15)} Send now</button></div>
    `);
    $('#sendGo').addEventListener('click', async () => {
      const btn = $('#sendGo'); btn.disabled = true; btn.textContent = 'Sending…';
      try {
        const sub = await Store.round2Send(d.id);
        d.round2 = sub.round2;
        closeModal(); UI.toast('Invitation emailed to ' + d.candidate.fullName, 'success');
      } catch (e) {
        UI.toast('Could not send: ' + e.message, 'error'); closeModal();
        try { await loadData(); } catch (x) {}
      }
      renderNav(); if (state.candidateId) renderDetail(); else renderReview();
    });
  }

  function openSlotModal(d) {
    const r2 = d.round2 || {};
    const cur = r2.slot ? new Date(r2.slot.at) : null;
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (x) => x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
    // Preparation window: nothing can be booked for today or tomorrow (e.g. on the 21st the earliest day is the 23rd).
    const days = []; const t = new Date(); t.setDate(t.getDate() + 1);
    const minDay = new Date(); minDay.setDate(minDay.getDate() + 2);
    let mode = r2.mode === 'onsite' ? 'onsite' : 'online';
    while (days.length < 8) { t.setDate(t.getDate() + 1); if (t.getDay() !== 0 && t.getDay() !== 6) days.push(new Date(t)); }
    const times = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    const fmt12 = (hm) => { const [h, m] = hm.split(':').map(Number); return (h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM'); };
    modal(`
      <div class="m-head"><div class="m-ico brand">${I('send', 20)}</div><div><h3>Invite for next round</h3><p>${esc(d.candidate.fullName)} · ${esc(d.roleTitle)}</p></div></div>
      <div class="m-body">
        <div class="fld"><span>Interview type</span>
          <div class="slot-chips" id="sMode"><button type="button" class="slot-chip" data-m="online"><b>Online</b>Google Meet link</button><button type="button" class="slot-chip" data-m="onsite"><b>On-site</b>Venue details</button></div>
        </div>
        <div id="sVenue" class="slot-sum" style="display:none">${I('alert', 14)} The venue, address and whom to meet are added automatically from the email script.</div>
        <div class="fld"><span>Pick a day</span>
          <small style="color:var(--muted);font-weight:400">Earliest bookable day is ${esc(minDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }))} (a 24-hour preparation window is kept free)</small>
          <div class="slot-chips" id="sDays">${days.map((x) => `<button type="button" class="slot-chip" data-v="${ymd(x)}"><b>${x.toLocaleDateString('en-GB', { weekday: 'short' })}</b>${x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</button>`).join('')}</div>
          <label class="fld" style="margin-top:6px"><span style="font-weight:500;color:var(--muted)">or choose another date</span><input class="inp" id="sDate" type="date" min="${ymd(minDay)}"></label>
        </div>
        <div class="fld"><span>Pick a time (${esc(tzShort())})</span>
          <div class="slot-chips" id="sTimes">${times.map((x) => `<button type="button" class="slot-chip" data-v="${x}">${fmt12(x)}</button>`).join('')}</div>
          <label class="fld" style="margin-top:6px"><span style="font-weight:500;color:var(--muted)">or enter a custom time</span><input class="inp" id="sTime" type="time"></label>
        </div>
        <div class="fld"><span>Duration</span><select class="inp" id="sDur">${[30, 45, 60].map((n) => `<option value="${n}" ${(r2.slot ? r2.slot.durationMin : 45) === n ? 'selected' : ''}>${n} minutes</option>`).join('')}</select></div>
        <label class="fld"><span>Interviewer(s)</span><input class="inp" id="sWho" placeholder="e.g. Abdul Hafeez, Head of HR" value="${esc(r2.interviewer || myName())}"></label>
        <label class="fld"><span>Note for the candidate (optional)</span><textarea class="inp" id="sNote" placeholder="e.g. Please keep your CNIC and latest salary slip ready">${esc(r2.note || '')}</textarea></label>
        <div class="slot-sum" id="sSum">Select a day and a time</div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="sGo">${I('check', 15)} Confirm slot</button></div>
    `);
    const dEl = $('#sDate'), tEl = $('#sTime');
    if (cur) { dEl.value = ymd(cur); tEl.value = pad(cur.getHours()) + ':' + pad(cur.getMinutes()); }
    const sync = () => {
      $$('#sMode .slot-chip').forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
      $('#sVenue').style.display = mode === 'onsite' ? 'block' : 'none';
      $$('#sDays .slot-chip').forEach((b) => b.classList.toggle('on', b.dataset.v === dEl.value));
      $$('#sTimes .slot-chip').forEach((b) => b.classList.toggle('on', b.dataset.v === tEl.value));
      const sum = $('#sSum');
      if (dEl.value && tEl.value) sum.innerHTML = `${I('clock', 14)} <b>${esc(slotLabel(new Date(dEl.value + 'T' + tEl.value + ':00')))}</b> · ${$('#sDur').value} min`;
      else sum.textContent = 'Select a day and a time';
    };
    $$('#sMode .slot-chip').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.m; sync(); }));
    $$('#sDays .slot-chip').forEach((b) => b.addEventListener('click', () => { dEl.value = b.dataset.v; sync(); }));
    $$('#sTimes .slot-chip').forEach((b) => b.addEventListener('click', () => { tEl.value = b.dataset.v; sync(); }));
    [dEl, tEl, $('#sDur')].forEach((el) => el.addEventListener('input', sync));
    sync();
    $('#sGo').addEventListener('click', async () => {
      if (!dEl.value || !tEl.value) return UI.toast('Please select a day and a time', 'error');
      const start = new Date(dEl.value + 'T' + tEl.value + ':00');
      if (isNaN(start) || start.getTime() < Date.now() + 5 * 60000) return UI.toast('Please pick a time in the future', 'error');
      if (dEl.value < ymd(minDay)) return UI.toast('Interviews need a 24-hour preparation window. Earliest day: ' + minDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }), 'error');
      const dur = +$('#sDur').value;
      const end = start.getTime() + dur * 60000;
      const clash = data.find((x) => x.id !== d.id && x.round2 && x.round2.slot && start.getTime() < new Date(x.round2.slot.at).getTime() + x.round2.slot.durationMin * 60000 && end > new Date(x.round2.slot.at).getTime());
      if (clash) return UI.toast(`That time overlaps with ${clash.candidate.fullName}'s interview (${slotLabel(clash.round2.slot.at)})`, 'error');
      const who = $('#sWho').value.trim();
      if (who) { try { localStorage.setItem('dvago_admin_name', who.split(',')[0].trim()); } catch (e) {} }
      const btn = $('#sGo'); btn.disabled = true;
      try {
        await saveRound2(d, { status: 'slot-set', mode, meetLink: null, send: null, slot: { at: start.toISOString(), durationMin: dur, label: slotLabel(start), tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '') }, interviewer: who, note: $('#sNote').value.trim() }, r2.slot ? 'Slot changed' : 'Slot set');
      } catch (e) { btn.disabled = false; return UI.toast('Could not save: ' + e.message, 'error'); }
      closeModal(); UI.toast('Slot saved for ' + d.candidate.fullName, 'success'); renderNav();
      if (state.candidateId) renderDetail(); else renderReview();
    });
  }

  // ---------- After the 2nd-round interview: panel feedback, then the job offer ----------
  // HOD (or master) scores the interview and says Good to go / On hold / Not a fit. A "Good to go" can be turned into "Make offer";
  // only HR (master) then sets the salary and sends the offer email. HODs never see salary figures.
  const FB_CRITERIA = [['knowledge', 'Role knowledge', 'Knows the work of this position'], ['communication', 'Communication', 'Clear, structured, listens well'], ['problem', 'Problem solving', 'Practical judgement in the discussion'], ['culture', 'Culture fit', 'Attitude, ownership, teamwork']];
  const REC_META = { go: { label: 'Good to go', cls: 'b-good' }, hold: { label: 'On hold', cls: 'b-warn' }, no: { label: 'Not a fit', cls: 'b-bad' } };
  const fbList = () => data.filter((d) => d.round2 && ['slot-set', 'sent'].includes(d.round2.status));
  const myKey = () => (isMaster() ? 'master' : me.id);
  const myReview = (d) => (d.reviews || []).find((r) => r.key === myKey());
  const offerSt = (d) => (d.offer && d.offer.status) || 'none';
  const needsMe = (d) => (isMaster() ? !(d.reviews || []).length : !myReview(d)) && !['accepted', 'declined'].includes(offerSt(d));
  const fbCount = () => fbList().filter(needsMe).length;
  const fbStage = (d) => { const o = offerSt(d); if (['sent', 'accepted', 'declined'].includes(o)) return 'sent'; if (['approved', 'ready'].includes(o)) return 'offer'; return (d.reviews || []).length ? 'feedback' : 'awaiting'; };
  const OFFER_META = { none: null, approved: { label: 'Offer approved · salary pending', cls: 'b-info' }, ready: { label: 'Offer ready to send', cls: 'b-info' }, sent: { label: 'Offer sent', cls: 'b-good' }, accepted: { label: 'Offer accepted', cls: 'b-good' }, declined: { label: 'Offer declined', cls: 'b-bad' } };
  const interviewOver = (d) => d.round2 && d.round2.slot && new Date(d.round2.slot.at).getTime() + (d.round2.slot.durationMin || 45) * 60000 < Date.now();

  function reviewBlock(d) {
    const rs = d.reviews || [];
    if (!rs.length) return `<div class="rv-note">${interviewOver(d) ? 'Interview is over. Waiting for feedback.' : 'Opens after the interview.'}</div>`;
    return rs.map((r) => `<div class="fb-r"><span class="badge ${REC_META[r.recommend].cls}">${REC_META[r.recommend].label}</span> <b>${r.overall}%</b> <small>${esc(r.by)}</small>${r.feedback ? `<div class="fb-t">${esc(r.feedback.length > 110 ? r.feedback.slice(0, 110) + '…' : r.feedback)}</div>` : ''}</div>`).join('');
  }
  function offerActions(d, after) {
    const o = offerSt(d), M = isMaster(), has = (d.reviews || []).some((r) => r.recommend === 'go');
    const out = [];
    if (o === 'none' && has) out.push(`<button class="btn btn-primary btn-sm" data-fa="approve" data-id="${d.id}">${I('check', 14)} Make offer</button>`);
    if (['approved', 'ready'].includes(o)) out.push(M ? `<button class="btn btn-primary btn-sm" data-fa="offer" data-id="${d.id}">${I('send', 14)} ${o === 'ready' ? 'Review & send offer' : 'Set salary & send offer'}</button>` : `<span class="rv-note">Waiting for HR to set the salary</span>`);
    if (o === 'sent' && M) out.push(`<button class="btn btn-outline btn-sm" data-fa="offer" data-id="${d.id}">${I('mail', 14)} Offer details / resend</button><button class="btn btn-outline btn-sm" data-fa="accepted" data-id="${d.id}">${I('check', 14)} Accepted</button><button class="btn btn-outline btn-sm" data-fa="declined" data-id="${d.id}">${I('x', 14)} Declined</button>`);
    if (['approved', 'ready'].includes(o) && M) out.push(`<button class="btn btn-outline btn-sm" data-fa="withdraw" data-id="${d.id}">${I('x', 14)} Withdraw</button>`);
    return out.join('');
  }
  async function feedbackAction(act, id, after) {
    const d = data.find((x) => x.id === id); if (!d) return;
    if (act === 'view') { state.candidateId = id; return render(); }
    if (act === 'review') return openFeedbackModal(d, after);
    if (act === 'offer') return openOfferModal(d, after);
    const msg = { approve: 'Make an offer to ' + d.candidate.fullName + '? HR will then set the salary and send it.', withdraw: 'Withdraw this offer?', accepted: 'Mark the offer as accepted? The candidate moves to Hired.', declined: 'Mark the offer as declined? The candidate moves to Rejected.' }[act];
    if (msg && !confirm(msg)) return;
    try { const s = await Store.offerAction(id, { action: act }); Object.assign(d, s); UI.toast({ approve: 'Offer approved. HR can now set the salary.', withdraw: 'Offer withdrawn', accepted: 'Marked as accepted', declined: 'Marked as declined' }[act], 'success'); }
    catch (e) { UI.toast(e.message, 'error'); }
    renderNav(); after();
  }

  function renderFeedback() {
    const all = fbList();
    const f = state.fbFilter || 'all';
    const items = all.filter((d) => f === 'all' || fbStage(d) === f).sort((a, b) => (needsMe(b) - needsMe(a)) || new Date(a.round2.slot.at) - new Date(b.round2.slot.at));
    const cnt = (k) => all.filter((d) => fbStage(d) === k).length;
    view.innerHTML = `
      <div class="page-head">
        <div><h1>Interview feedback</h1><p>After the 2nd-round interview: score the candidate, say whether they are good to go, then make the offer${isMaster() ? ' · HR sets the salary and sends it' : ''}</p></div>
        <div class="actions"><button class="btn btn-outline btn-sm" id="refreshBtn">${I('refresh', 15)} Refresh</button></div>
      </div>
      <div class="sec-tabs" id="fbTabs" style="margin-bottom:16px">
        ${[['all', 'All', all.length], ['awaiting', 'Awaiting feedback', cnt('awaiting')], ['feedback', 'Feedback in', cnt('feedback')], ['offer', 'Offer in progress', cnt('offer')], ['sent', 'Offer sent', cnt('sent')]].map(([k, l, n]) => `<button class="sec-tab ${f === k ? 'active' : ''}" data-f="${k}">${esc(l)} (${n})</button>`).join('')}
      </div>
      <div class="rv-list">
        ${items.length === 0 ? `<div class="table-wrap"><div class="empty"><div class="ei">${I('star', 24)}</div><h3>Nothing here yet</h3><p>Candidates appear once their 2nd-round interview is scheduled.</p></div></div>` : items.map((d) => {
          const r2 = d.round2, om = OFFER_META[offerSt(d)], mine = myReview(d);
          return `<div class="rv-card" data-id="${d.id}">
            <div class="rv-main fb-main">
              <div class="rv-c1"><div class="td-cand"><div class="av" style="background:${avColor(d.candidate.fullName)}">${initials(d.candidate.fullName)}</div><div><b>${esc(d.candidate.fullName)}</b><span>${esc(d.candidate.email)}</span></div></div></div>
              <div class="rv-c2"><small>Role</small><b>${esc(d.positionTitle || d.roleTitle)}</b><span>AI score ${d.evaluation?.overall || 0}%</span></div>
              <div class="rv-c2"><small>Interview</small><b>${esc(slotLabel(r2.slot.at))}</b><span>${r2.mode === 'onsite' ? 'On-site' : 'Online'}${r2.interviewer ? ' · ' + esc(r2.interviewer) : ''}</span></div>
              <div class="rv-c5 fb-c4"><small>Panel feedback</small>${reviewBlock(d)}</div>
              <div class="rv-c5"><small>Offer</small>${om ? `<span class="badge ${om.cls}">${om.label}</span>` : '<span class="rv-note">Not started</span>'}${d.offer && d.offer.send && d.offer.send.state === 'failed' ? `<div class="rv-note bad" title="${esc(d.offer.send.error)}">${I('alert', 11)} Email failed</div>` : ''}${d.offer && d.offer.send && d.offer.send.state === 'queued' ? `<div class="rv-note">Saved in Email outbox (email not connected)</div>` : ''}${d.offer && d.offer.salary && isMaster() ? `<div class="rv-note">PKR ${Number(d.offer.salary).toLocaleString()} / month</div>` : ''}</div>
            </div>
            <div class="rv-actions">
              <button class="btn btn-outline btn-sm" data-fa="view" data-id="${d.id}">${I('right', 14)} View</button>
              <button class="btn ${needsMe(d) ? 'btn-primary' : 'btn-outline'} btn-sm" data-fa="review" data-id="${d.id}">${I('star', 14)} ${mine ? 'Edit my feedback' : 'Give feedback'}</button>
              ${offerActions(d)}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    $$('#fbTabs .sec-tab').forEach((b) => b.addEventListener('click', () => { state.fbFilter = b.dataset.f; renderFeedback(); }));
    $('#refreshBtn').addEventListener('click', async () => { await loadData(); renderNav(); UI.toast('Refreshed', 'success'); renderFeedback(); });
    $$('[data-fa]').forEach((b) => b.addEventListener('click', () => feedbackAction(b.dataset.fa, b.dataset.id, renderFeedback)));
  }

  function openFeedbackModal(d, after) {
    const mine = myReview(d);
    const ratings = Object.assign({ knowledge: 0, communication: 0, problem: 0, culture: 0 }, mine ? mine.ratings : {});
    let rec = mine ? mine.recommend : '';
    const others = (d.reviews || []).filter((r) => !mine || r.key !== mine.key);
    modal(`
      <div class="m-head"><div class="m-ico brand">${I('star', 20)}</div><div><h3>Interview feedback</h3><p>${esc(d.candidate.fullName)} · ${esc(d.positionTitle || d.roleTitle)} · AI score ${d.evaluation?.overall || 0}%</p></div></div>
      <div class="m-body" style="max-height:66vh;overflow:auto">
        ${d.round2 && d.round2.slot ? `<div class="slot-sum">${I('clock', 14)} Interview: <b>${esc(slotLabel(d.round2.slot.at))}</b>${d.round2.interviewer ? ' · with ' + esc(d.round2.interviewer) : ''}</div>` : ''}
        <div class="fld"><span>Your scores (1 = weak, 5 = excellent)</span>
          <div class="fb-crit">${FB_CRITERIA.map(([k, l, h]) => `<div class="fb-row"><div><b>${esc(l)}</b><small>${esc(h)}</small></div><div class="fb-pick" data-k="${k}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="slot-chip ${ratings[k] === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div></div>`).join('')}</div>
        </div>
        <div class="fld"><span>Your recommendation</span>
          <div class="fb-rec" id="fbRec">${[['go', 'Good to go', 'Recommend making an offer'], ['hold', 'On hold', 'Need more time or another round'], ['no', 'Not a fit', 'Do not proceed']].map(([k, l, h]) => `<button type="button" class="slot-chip ${rec === k ? 'on' : ''}" data-r="${k}"><b>${l}</b>${h}</button>`).join('')}</div>
        </div>
        <label class="fld"><span>Feedback</span><textarea class="inp" id="fbText" rows="5" placeholder="Strengths, concerns and what you saw in the interview…">${esc(mine ? mine.feedback : '')}</textarea></label>
        ${others.length ? `<div class="fld"><span>Other feedback on this candidate</span>${others.map((r) => `<div class="fb-r" style="margin-top:6px"><span class="badge ${REC_META[r.recommend].cls}">${REC_META[r.recommend].label}</span> <b>${r.overall}%</b> <small>${esc(r.by)}</small><div class="fb-t">${esc(r.feedback)}</div></div>`).join('')}</div>` : ''}
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="fbSave">${I('check', 15)} Submit feedback</button></div>`, 'wide');
    $$('.fb-pick').forEach((box) => $$('button', box).forEach((b) => b.addEventListener('click', () => { ratings[box.dataset.k] = +b.dataset.n; $$('button', box).forEach((x) => x.classList.toggle('on', x === b)); })));
    $$('#fbRec button').forEach((b) => b.addEventListener('click', () => { rec = b.dataset.r; $$('#fbRec button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#fbSave').addEventListener('click', async () => {
      if (Object.values(ratings).some((v) => !v)) return UI.toast('Please score all four criteria', 'error');
      if (!rec) return UI.toast('Please choose Good to go / On hold / Not a fit', 'error');
      const feedback = $('#fbText').value.trim();
      if (rec !== 'hold' && feedback.length < 10) return UI.toast('Please add a short feedback note', 'error');
      const btn = $('#fbSave'); btn.disabled = true;
      try { const s = await Store.submitReview(d.id, { ratings, recommend: rec, feedback }); Object.assign(d, s); }
      catch (e) { btn.disabled = false; return UI.toast(e.message, 'error'); }
      closeModal(); UI.toast('Feedback saved', 'success'); renderNav(); after();
    });
    attachModalCloses();
  }

  function openOfferModal(d, after) {
    const o = d.offer || {};
    const exp = d.candidate.expectedSalary, cur = d.candidate.currentSalary;
    modal(`
      <div class="m-head"><div class="m-ico brand">${I('send', 20)}</div><div><h3>Job offer</h3><p>${esc(d.candidate.fullName)} · ${esc(d.positionTitle || d.roleTitle)}</p></div></div>
      <div class="m-body" style="max-height:68vh;overflow:auto">
        <div class="slot-sum" style="flex-wrap:wrap">${I('people', 14)} Candidate expects <b>${exp ? 'PKR ' + Number(exp).toLocaleString() : 'not stated'}</b>${cur ? ' · currently earns PKR ' + Number(cur).toLocaleString() : ''} · panel average <b>${(d.reviews || []).length ? Math.round(d.reviews.reduce((t, r) => t + r.overall, 0) / d.reviews.length) + '%' : '-'}</b></div>
        <label class="fld"><span>Monthly gross salary offered (PKR)</span><input class="inp" id="ofSal" type="number" min="1000" step="500" value="${o.salary || ''}" placeholder="e.g. 85000"></label>
        <label class="fld"><span>Proposed joining date (optional)</span><input class="inp" id="ofJoin" type="date" value="${esc(o.joiningDate || '')}"></label>
        <label class="fld"><span>Note in the email (optional)</span><textarea class="inp" id="ofNote" rows="2" placeholder="e.g. Please bring your original documents on the first day">${esc(o.note || '')}</textarea></label>
        <div id="ofPrev"></div>
        ${o.send && o.send.state === 'failed' ? `<div class="slot-sum" style="color:var(--bad)">${I('alert', 14)} Last send failed: ${esc(o.send.error)}</div>` : ''}
        <div class="slot-sum" id="ofMail">${I('mail', 14)} ${Store.serverInfo && Store.serverInfo.mail ? 'The offer is emailed from the platform mailbox.' : 'Email is not connected yet: sending saves the offer in Email outbox. The Apps Script mailer will be connected later.'}</div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Close</button><button class="btn btn-outline" id="ofPrevBtn">${I('eye', 14)} Preview email</button><button class="btn btn-primary" id="ofSend">${I('send', 15)} ${offerSt(d) === 'sent' ? 'Save & resend' : 'Save & send offer'}</button></div>`, 'wide');
    const save = async () => {
      const salary = +$('#ofSal').value;
      if (!(salary >= 1000)) { UI.toast('Enter the monthly salary (PKR)', 'error'); return false; }
      const s = await Store.offerAction(d.id, { action: 'prepare', salary, joiningDate: $('#ofJoin').value, note: $('#ofNote').value.trim() });
      Object.assign(d, s); return true;
    };
    $('#ofPrevBtn').addEventListener('click', async () => {
      try { if (!(await save())) return; const p = await Store.offerAction(d.id, { action: 'preview' }); $('#ofPrev').innerHTML = `<div style="font-size:13px;margin:6px 0"><b>To:</b> ${esc(p.to)}<br><b>Subject:</b> ${esc(p.subject)}</div><div style="border:1px solid var(--line);border-radius:10px;padding:14px;max-height:260px;overflow:auto;background:#fff;color:#1a1f36">${p.html}</div>`; }
      catch (e) { UI.toast(e.message, 'error'); }
    });
    $('#ofSend').addEventListener('click', async () => {
      const btn = $('#ofSend'); btn.disabled = true;
      try {
        if (!(await save())) { btn.disabled = false; return; }
        const s = await Store.offerAction(d.id, { action: 'send' }); Object.assign(d, s);
        closeModal();
        UI.toast(d.offer.send && d.offer.send.state === 'queued' ? 'Saved in Email outbox (email is not connected yet)' : 'Offer emailed to ' + d.candidate.fullName, 'success');
      } catch (e) { btn.disabled = false; UI.toast('Could not send: ' + e.message, 'error'); try { await loadData(); } catch (x) {} return; }
      renderNav(); after();
    });
    attachModalCloses();
  }

  // ---------- Department setup (master): which roles belong to which department / HOD ----------
  async function renderOrg() {
    let org; try { org = await Store.getOrg(); } catch (e) { view.innerHTML = `<div class="empty"><h3>Could not load</h3><p>${esc(e.message)}</p></div>`; return; }
    const deps = org.departments.map((x) => Object.assign({}, x, { roleKeys: (x.roleKeys || []).slice() }));
    const draw = () => {
      const used = new Set(deps.flatMap((x) => x.roleKeys));
      const free = Object.entries(B.ROLES).filter(([k]) => !used.has(k));
      view.innerHTML = `
        <div class="page-head">
          <div><h1>Department setup</h1><p>Which roles belong to each department. HODs only see candidates of the departments assigned to them (Users tab). The team tree is in <b>Org structure</b>.</p></div>
          <div class="actions"><button class="btn btn-outline btn-sm" id="addDep">${I('plus', 15)} Add department</button> <button class="btn btn-primary btn-sm" id="saveOrg">${I('check', 15)} Save structure</button></div>
        </div>
        ${free.length ? `<div class="slot-sum" style="margin-bottom:14px">${I('alert', 14)} Not in any department (visible to master only): <b>${free.map(([, r]) => esc(r.title)).join(', ')}</b></div>` : ''}
        <div style="display:grid;gap:14px">
          ${deps.map((x, i) => `<div class="side-panel" data-i="${i}">
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><input class="inp dep-name" data-i="${i}" value="${esc(x.name)}" placeholder="Department name" style="flex:1;font-weight:600"><button class="btn btn-outline btn-sm" data-deldep="${i}" title="Remove department">${I('x', 14)}</button></div>
            <div class="slot-chips">${Object.entries(B.ROLES).map(([k, r]) => `<button type="button" class="slot-chip ${x.roleKeys.includes(k) ? 'on' : ''}" data-i="${i}" data-role="${k}">${esc(r.title)}</button>`).join('')}</div>
          </div>`).join('') || `<div class="empty"><h3>No departments yet</h3><p>Add your first department.</p></div>`}
        </div>`;
      $$('.dep-name').forEach((el) => el.addEventListener('input', () => { deps[+el.dataset.i].name = el.value; }));
      $$('[data-role]').forEach((el) => el.addEventListener('click', () => { const x = deps[+el.dataset.i]; const k = el.dataset.role; x.roleKeys = x.roleKeys.includes(k) ? x.roleKeys.filter((r) => r !== k) : x.roleKeys.concat(k); draw(); }));
      $$('[data-deldep]').forEach((el) => el.addEventListener('click', () => { deps.splice(+el.dataset.deldep, 1); draw(); }));
      $('#addDep').addEventListener('click', () => { deps.push({ id: '', name: '', roleKeys: [] }); draw(); });
      $('#saveOrg').addEventListener('click', async () => {
        if (deps.some((x) => !x.name.trim())) return UI.toast('Every department needs a name', 'error');
        try { const saved = await Store.saveOrg({ departments: deps }); deps.splice(0, deps.length, ...saved.departments); me = await Store.me(); UI.toast('Department setup saved', 'success'); renderNav(); draw(); }
        catch (e) { UI.toast('Could not save: ' + e.message, 'error'); }
      });
    };
    draw();
  }

  // ---------- Users / HODs (master) ----------
  async function renderUsers() {
    let users = [], org;
    try { [users, org] = await Promise.all([Store.listUsers(), Store.getOrg()]); } catch (e) { view.innerHTML = `<div class="empty"><h3>Could not load</h3><p>${esc(e.message)}</p></div>`; return; }
    const dn = (id) => (org.departments.find((x) => x.id === id) || {}).name || id;
    view.innerHTML = `
      <div class="page-head"><div><h1>Users (HODs)</h1><p>Heads of departments who can sign in to review their own candidates · ${users.length} user${users.length === 1 ? '' : 's'}</p></div>
        <div class="actions"><button class="btn btn-primary btn-sm" id="newUser">${I('plus', 15)} New user</button></div></div>
      <div class="table-wrap">${users.length ? `<table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Departments</th><th>Status</th><th style="text-align:right">Action</th></tr></thead><tbody>
        ${users.map((u) => `<tr><td><div class="td-cand"><div class="av" style="background:${avColor(u.name)}">${initials(u.name)}</div><div><b>${esc(u.name)}</b></div></div></td><td>${esc(u.email)}</td>
          <td>${u.allDepartments ? '<span class="badge b-good">All departments (CEO)</span>' : u.departmentIds.length ? u.departmentIds.map((id) => `<span class="badge b-info" style="margin-right:4px">${esc(dn(id))}</span>`).join('') : '<span style="color:var(--muted)">None</span>'}</td>
          <td><span class="badge ${u.active ? 'b-good' : 'b-neutral'}">${u.active ? 'Active' : 'Disabled'}</span>${u.hasPassword ? '' : ' <span class="badge b-warn" title="Open Edit, set the real email and a password">Set password</span>'}</td>
          <td style="text-align:right;white-space:nowrap"><button class="btn btn-outline btn-sm" data-edit="${u.id}">${I('settings', 14)} Edit</button> <button class="btn btn-outline btn-sm" data-rm="${u.id}" title="Delete">${I('trash', 14)}</button></td></tr>`).join('')}
      </tbody></table>` : `<div class="empty"><div class="ei">${I('people', 24)}</div><h3>No HODs yet</h3><p>Create a user and assign their departments.</p></div>`}</div>`;
    $('#newUser').addEventListener('click', () => openUserModal(null, org, renderUsers));
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openUserModal(users.find((u) => u.id === b.dataset.edit), org, renderUsers)));
    $$('[data-rm]').forEach((b) => b.addEventListener('click', async () => {
      const u = users.find((x) => x.id === b.dataset.rm);
      if (!confirm('Delete ' + u.name + '? They will no longer be able to sign in.')) return;
      try { await Store.deleteUser(u.id); UI.toast('User deleted', 'success'); renderUsers(); } catch (e) { UI.toast(e.message, 'error'); }
    }));
  }
  function openUserModal(u, org, done) {
    const gen = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const a = new Uint32Array(12); crypto.getRandomValues(a); return Array.from(a, (n) => c[n % c.length]).join(''); };
    modal(`
      <div class="m-head"><div class="m-ico brand">${I('people', 20)}</div><div><h3>${u ? 'Edit user' : 'New user (HOD)'}</h3><p>${u ? esc(u.email) : 'They sign in at this same admin page'}</p></div></div>
      <div class="m-body">
        <label class="fld"><span>Full name</span><input class="inp" id="uName" value="${esc(u ? u.name : '')}" placeholder="e.g. Hafeez Ahmed"></label>
        <label class="fld"><span>Email (login)</span><input class="inp" id="uEmail" type="email" value="${esc(u ? u.email : '')}" placeholder="name@dvago.com"></label>
        <label class="fld"><span>${u && u.hasPassword ? 'New password (leave empty to keep)' : 'Password (min 8 characters)'}</span><div style="display:flex;gap:8px"><input class="inp" id="uPass" style="flex:1" value="${u && u.hasPassword ? '' : gen()}"><button type="button" class="btn btn-outline btn-sm" id="uGen">Generate</button></div></label>
        <label class="fld" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="uAll" ${u && u.allDepartments ? 'checked' : ''}> <span>All departments (CEO: sees everything, with a department filter)</span></label>
        <div class="fld"><span>Departments</span><div class="slot-chips" id="uDeps">${org.departments.map((x) => `<button type="button" class="slot-chip ${u && u.departmentIds.includes(x.id) ? 'on' : ''}" data-id="${esc(x.id)}">${esc(x.name)}</button>`).join('') || 'No departments yet. Create them in the Department setup tab.'}</div></div>
        ${u ? `<label class="fld" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="uActive" ${u.active ? 'checked' : ''}> <span>Account active</span></label>` : ''}
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="uSave">${I('check', 15)} ${u ? 'Save' : 'Create user'}</button></div>`);
    $$('#uDeps .slot-chip').forEach((b) => b.addEventListener('click', () => b.classList.toggle('on')));
    $('#uGen').addEventListener('click', () => { $('#uPass').value = gen(); });
    $('#uSave').addEventListener('click', async () => {
      const body = { name: $('#uName').value.trim(), email: $('#uEmail').value.trim(), departmentIds: $$('#uDeps .slot-chip.on').map((b) => b.dataset.id), allDepartments: $('#uAll').checked };
      const pw = $('#uPass').value; if (pw) body.password = pw;
      if (u) body.active = $('#uActive').checked;
      if (!body.name || !body.email) return UI.toast('Name and email are required', 'error');
      if (!u && pw.length < 8) return UI.toast('Password must be at least 8 characters', 'error');
      try {
        if (u) await Store.updateUser(u.id, body); else await Store.createUser(body);
      } catch (e) { return UI.toast(e.message, 'error'); }
      if (!u || body.password) {
        $('#mCard').innerHTML = `<div class="m-head"><div class="m-ico brand">${I('check', 20)}</div><div><h3>${u ? 'Password updated' : 'User created'}</h3><p>Share these login details with ${esc(body.name)} (the password is not shown again)</p></div></div>
          <div class="invite-success"><div class="invite-url"><input readonly id="uCred" value="${esc(body.email + '  /  ' + body.password)}"><button class="btn btn-primary btn-sm" id="uCopy">${I('copy', 13)} Copy</button></div></div>
          <div class="m-foot"><button class="btn btn-primary" data-dismiss>Done</button></div>`;
        $('#uCopy').addEventListener('click', () => { navigator.clipboard.writeText($('#uCred').value).then(() => UI.toast('Copied', 'success')); });
        attachModalCloses(); done();
      } else { closeModal(); UI.toast('User updated', 'success'); done(); }
    });
  }
  function openMyPassword() {
    modal(`
      <div class="m-head"><div class="m-ico brand">${I('shield', 20)}</div><div><h3>Change password</h3><p>${esc(me.email)}</p></div></div>
      <div class="m-body">
        <label class="fld"><span>Current password</span><input class="inp" id="pCur" type="password"></label>
        <label class="fld"><span>New password (min 8 characters)</span><input class="inp" id="pNew" type="password"></label>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="pSave">Save</button></div>`);
    $('#pSave').addEventListener('click', async () => {
      try { await Store.changeMyPassword($('#pCur').value, $('#pNew').value); closeModal(); UI.toast('Password changed', 'success'); }
      catch (e) { UI.toast(e.message, 'error'); }
    });
  }

  // ---------- Invites ----------
  async function renderInvites() {
    let invs = []; try { invs = await Store.listInvites(); } catch (e) {}
    view.innerHTML = `<div class="page-head"><div><h1>Invitations</h1><p>Create and manage personal interview links · ${invs.length} total</p></div><div class="actions"><button class="btn btn-primary btn-sm" id="newInvite">${I('plus', 15)} New invitation</button></div></div>
      <div class="table-wrap">
        ${invs.length ? `<table class="tbl"><thead><tr><th>Candidate</th><th>Role</th><th>Status</th><th>Created</th><th>Link</th><th></th></tr></thead><tbody>
          ${invs.map((i) => `<tr>
            <td><div class="td-cand"><div class="av" style="background:${avColor(i.name)}">${initials(i.name || i.email)}</div><div><b>${esc(i.name || '(no name)')}</b><span>${esc(i.email || '-')}</span></div></div></td>
            <td>${esc(B.ROLES[i.role]?.title || 'Any')}</td>
            <td><span class="badge ${i.status === 'Completed' ? 'b-good' : i.status === 'Opened' ? 'b-info' : 'b-neutral'}">${esc(i.status)}</span></td>
            <td>${dt(i.createdAt)}</td>
            <td><button class="btn btn-outline btn-sm" data-copy="${esc(buildInviteUrl(i.token))}">${I('copy', 13)} Copy</button></td>
            <td><button class="btn btn-outline btn-sm" data-del="${i.token}">${I('trash', 13)}</button></td>
          </tr>`).join('')}
        </tbody></table>` : `<div class="empty"><div class="ei">${I('send', 24)}</div><h3>No invitations yet</h3><p>Create your first invitation to share a personal interview link with a candidate.</p><button class="btn btn-primary btn-sm" id="newInvite2">${I('plus', 15)} New invitation</button></div>`}
      </div>`;
    const n1 = $('#newInvite'); if (n1) n1.addEventListener('click', openInviteModal);
    const n2 = $('#newInvite2'); if (n2) n2.addEventListener('click', openInviteModal);
    $$('[data-copy]').forEach((b) => b.addEventListener('click', () => { navigator.clipboard.writeText(b.dataset.copy); UI.toast('Link copied', 'success'); }));
    $$('[data-del]').forEach((b) => b.addEventListener('click', async () => { await Store.deleteInvite(b.dataset.del); UI.toast('Invitation removed', 'success'); render(); }));
  }
  // ---------- Org structure (company tree) ----------
  // Top-down chart like the company organogram: CEO > heads > teams. The master sees everything and edits; a HOD sees their own branch.
  let hierData = null;
  async function renderHierarchy(refetch) {
    if (!hierData || refetch !== false) { try { hierData = await Store.getHierarchy(); } catch (e) { view.innerHTML = `<div class="empty"><h3>Could not load the org structure</h3><p>${esc(e.message || '')}</p></div>`; return; } }
    const H = hierData, M = !!H.canEdit;
    const f = state.hier = state.hier || {};
    if (f.q == null) f.q = ''; if (f.status == null) f.status = ''; if (!f.open) f.open = {};
    const nodes = H.nodes || [];
    const byId = {}, kids = {};
    nodes.forEach((x) => { byId[x.id] = x; });
    nodes.forEach((x) => { const p = byId[x.parentId] ? x.parentId : ''; (kids[p] = kids[p] || []).push(x); });
    const kidsOf = (id) => kids[id] || [];
    const people = nodes.filter((x) => x.kind === 'person');
    const nVac = people.filter((x) => x.status === 'Vacant').length, nAct = people.length - nVac;
    const descIds = (id) => { const out = new Set(), st = [id]; while (st.length) { const c = st.pop(); if (out.has(c)) continue; out.add(c); kidsOf(c).forEach((k) => st.push(k.id)); } return out; };
    const countPeople = (id) => [...descIds(id)].filter((i) => i !== id && byId[i].kind === 'person').length;

    // ---- which boxes are the top of the chart ----
    let roots;
    if (f.focus && byId[f.focus]) roots = [byId[f.focus]];
    else if (state.dept) roots = nodes.filter((x) => x.deptId === state.dept && !(byId[x.parentId] && byId[x.parentId].deptId === state.dept));
    else roots = (H.rootIds || []).map((id) => byId[id]).filter(Boolean);

    // ---- search / status filter: keep matches and the path above them ----
    const q = f.q.trim().toLowerCase();
    const searching = !!(q || f.status);
    let keep = null, hits = 0;
    const matched = new Set();
    if (searching) {
      keep = new Set();
      nodes.forEach((x) => {
        if (x.kind === 'info') return;
        const text = (x.name + ' ' + x.designation + ' ' + (x.vacatedName || '') + ' ' + (x.location || '') + ' ' + (x.note || '')).toLowerCase();
        const stOk = !f.status || (x.kind === 'person' && (f.status === 'Vacant') === (x.status === 'Vacant'));
        if (stOk && (!q || text.includes(q))) { hits++; matched.add(x.id); let c = x; while (c && !keep.has(c.id)) { keep.add(c.id); c = byId[c.parentId]; } }
      });
    }
    const isOpen = (id, depth) => (searching ? true : (id in f.open ? f.open[id] : depth === 0));

    // ---- boxes ----
    const card = (x, depth, mini) => {
      if (x.kind === 'info') return `<div class="oc info">${esc(x.name)}</div>`;
      if (x.kind === 'unit') return `<button type="button" class="oc unit" data-hp="${esc(x.id)}"><span class="oc-m"><b>${esc(x.name)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}</span></button>`;
      const vac = x.status === 'Vacant';
      const sub = [x.grade, x.location, x.note].filter(Boolean).join(' · ');
      return `<div class="oc ${mini ? 'mini' : ''} ${vac ? 'vac' : ''} ${x.flag || ''} ${x.isHead ? 'head' : ''} ${!x.parentId ? 'root' : ''}" data-hp="${esc(x.id)}" role="button" tabindex="0" title="${esc((vac ? 'Vacant' : x.name) + ' · ' + x.designation)}">
        <i class="av" style="background:${vac ? '#b9a800' : avColor(x.name)}">${vac ? '?' : initials(x.name)}</i>
        <span class="oc-m"><b>${vac ? 'Vacant position' : esc(x.name)}</b><span>${esc(x.designation)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
        <button type="button" class="jdb" data-jd="${esc(x.id)}" title="View job description">JD</button>
      </div>`;
    };
    const node = (x, depth) => {
      const ks = kidsOf(x.id).filter((k) => !keep || keep.has(k.id));
      const open = ks.length > 0 && isOpen(x.id, depth);
      let sub = '';
      if (open) {
        const leaves = ks.filter((k) => k.kind !== 'unit' && !kidsOf(k.id).length);
        const stack = leaves.length >= 3;   // many single people under one box: list them in one column instead of a very wide row
        sub = ks.filter((k) => !(stack && leaves.includes(k))).map((k) => node(k, depth + 1)).join('') + (stack ? `<li><div class="ot-stack">${leaves.map((k) => card(k, depth + 1, true)).join('')}</div></li>` : '');
      }
      const tot = countPeople(x.id);
      return `<li>${card(x, depth)}${x.note && x.kind === 'unit' ? '' : ''}${ks.length ? `<button type="button" class="oc-t ${open ? 'open' : ''}" data-tg="${esc(x.id)}" data-depth="${depth}" title="${kidsOf(x.id).length} direct · ${tot} people in this branch">${open ? '▴' : '▾'} ${kidsOf(x.id).length}${tot > kidsOf(x.id).length ? ` <span style="opacity:.7">(${tot})</span>` : ''}</button>` : ''}${sub ? `<ul>${sub}</ul>` : ''}</li>`;
    };
    const chain = (id) => { const out = []; let c = byId[id]; while (c) { out.unshift(c); c = byId[c.parentId]; } return out; };
    const crumb = f.focus && byId[f.focus] ? `<div class="o-crumb"><button type="button" data-focus="">All</button>${chain(f.focus).map((c) => `<span>›</span><button type="button" data-focus="${esc(c.id)}">${esc(c.name || c.designation)}</button>`).join('')}</div>` : '';
    const chartRoots = roots.filter((r) => !keep || keep.has(r.id));
    if (!f.zoom) f.zoom = 1;
    const full = !!f.full;
    document.body.classList.toggle('org-full', full);
    const expBtns = `<button type="button" class="btn btn-outline btn-sm js-exp">Expand all</button><button type="button" class="btn btn-outline btn-sm js-col">Collapse all</button>`;
    const bar = `<div class="ochart-bar">${full ? `<b class="ob-t">Org structure</b>` : ''}${crumb}<span class="grow"></span>
        ${full ? `<input class="inp ob-q" id="hQ2" placeholder="Search" value="${esc(f.q)}">` : ''}
        <span class="ob-zoom"><button type="button" class="btn btn-outline btn-sm" id="zOut" title="Zoom out">−</button><span id="zVal">${Math.round(f.zoom * 100)}%</span><button type="button" class="btn btn-outline btn-sm" id="zIn" title="Zoom in">+</button><button type="button" class="btn btn-outline btn-sm" id="zFit" title="Fit the whole chart to the screen width">Fit</button></span>
        ${expBtns}<button type="button" class="btn ${full ? 'btn-primary' : 'btn-outline'} btn-sm" id="oFull">${full ? 'Exit full screen' : '⤢ Full screen'}</button></div>`;
    const chart = !chartRoots.length ? '' : `<div class="ochart ${full ? 'full' : ''}" id="oChart">${bar}<div class="otree"><ul class="ot" style="zoom:${f.zoom}">${chartRoots.map((r) => node(r, 0)).join('')}</ul></div></div>`;
    const chartOrEmpty = chart || `<div class="empty"><h3>${searching ? 'No one matches this search' : 'Nothing to show'}</h3><p>${searching ? 'Try a different name or clear the filter.' : (M ? 'Pick a department or add people.' : 'No team is assigned to your account yet.')}</p></div>`;
    const sc = $('.otree');
    const keepScroll = sc ? { x: sc.scrollLeft, y: sc.scrollTop } : null;
    view.innerHTML = `<div class="page-head"><div><h1>Org structure</h1><p>${M ? 'Company chart as per the organogram. Click a box for details; ▾ opens a team.' : 'Your team, by branch. ▾ opens a team.'} · ${people.length} positions · ${nAct} active · ${nVac} vacant</p></div>
        <div class="actions">${M ? `<button class="btn btn-primary btn-sm" id="hNew">${I('plus', 14)} Add person</button>` : ''}</div></div>
      <div class="h-tools"><input class="inp" id="hQ" placeholder="Search name, designation or city" value="${esc(f.q)}" style="max-width:300px">
        ${[['', 'All'], ['Active', 'Active'], ['Vacant', 'Vacant']].map(([k, l]) => `<button class="btn btn-sm ${f.status === k ? 'btn-primary' : 'btn-outline'}" data-hs="${k}">${l}</button>`).join('')}
        ${searching ? `<span class="muted" style="font-size:13px">${hits} match${hits === 1 ? '' : 'es'}</span>` : ''}
</div>
      <div class="o-legend"><span><i style="background:#fff8b8"></i>Vacant</span><span><i style="background:#d6efff"></i>Consultant</span><span><i style="background:#ffe1df"></i>Marked red in the organogram</span><span><i style="background:var(--brand-pale)"></i>Head of department</span></div>
      ${chartOrEmpty}`;
    const sc2 = $('.otree'); if (sc2 && keepScroll) { sc2.scrollLeft = keepScroll.x; sc2.scrollTop = keepScroll.y; }

    ['#hQ', '#hQ2'].forEach((sel) => {
      const qEl = $(sel);
      if (qEl) qEl.addEventListener('input', () => { f.q = qEl.value; const p = qEl.selectionStart; renderHierarchy(false).then(() => { const e = $(sel); if (e) { e.focus(); try { e.setSelectionRange(p, p); } catch (_) {} } }); });
    });
    // zoom + full screen (applied in place so the scroll position stays)
    const applyZoom = () => { const ot = $('.ot'), box = $('.otree'); if (!ot || !box) return; ot.style.zoom = f.zoom; ot.style.minWidth = Math.max(0, (box.clientWidth - 24) / f.zoom) + 'px'; const z = $('#zVal'); if (z) z.textContent = Math.round(f.zoom * 100) + '%'; };
    const fitNow = () => { const ot = $('.ot'), box = $('.otree'); if (!ot || !box) return; ot.style.zoom = 1; ot.style.minWidth = '0px'; const w = ot.scrollWidth, c = box.clientWidth - 24; f.zoom = Math.max(0.3, Math.min(1, Math.floor((c / w) * 100) / 100)); applyZoom(); box.scrollLeft = 0; };
    if (f.autoFit) { f.autoFit = false; fitNow(); } else applyZoom();
    if (f._rs) window.removeEventListener('resize', f._rs);
    f._rs = () => { if (state.tab === 'hierarchy') applyZoom(); };
    window.addEventListener('resize', f._rs);
    const zb = (id, fn) => { const b = $('#' + id); if (b) b.addEventListener('click', fn); };
    zb('zIn', () => { f.zoom = Math.min(1.5, Math.round((f.zoom + 0.1) * 10) / 10); applyZoom(); });
    zb('zOut', () => { f.zoom = Math.max(0.3, Math.round((f.zoom - 0.1) * 10) / 10); applyZoom(); });
    zb('zFit', fitNow);
    zb('oFull', () => { f.full = !f.full; f.autoFit = true; renderHierarchy(false); });
    if (f._esc) document.removeEventListener('keydown', f._esc);
    f._esc = (e) => { if (e.key === 'Escape' && f.full && !document.querySelector('.modal-back')) { f.full = false; renderHierarchy(false); } };
    document.addEventListener('keydown', f._esc);
    $$('[data-hs]').forEach((b) => b.addEventListener('click', () => { f.status = b.dataset.hs; renderHierarchy(false); }));
    $$('[data-focus]').forEach((b) => b.addEventListener('click', () => { f.focus = b.dataset.focus || null; renderHierarchy(false); }));
    $$('[data-tg]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const id = b.dataset.tg; f.open[id] = !isOpen(id, +b.dataset.depth); renderHierarchy(false); }));
    $$('.js-exp').forEach((b) => b.addEventListener('click', () => { roots.forEach((r) => descIds(r.id).forEach((i) => { f.open[i] = true; })); renderHierarchy(false); }));
    $$('.js-col').forEach((b) => b.addEventListener('click', () => { f.open = {}; renderHierarchy(false); }));

    // ---- job description (placeholder until the JDs are provided) ----
    const openJd = (x) => {
      const has = !!(x.jd && x.jd.trim());
      modal(`<div class="m-head"><div class="m-ico brand">${I('file', 20)}</div><div><h3>Job description</h3><p>${esc(x.status === 'Vacant' ? 'Vacant position' : x.name)} · ${esc(x.designation)}</p></div></div>
        <div class="m-body">${has ? `<div class="jd-text">${esc(x.jd)}</div>` : `<div class="jd-ph"><b>Job description coming soon</b>The JD for this position has not been added yet.</div>`}
          ${M ? `<label class="fld" style="margin-top:14px"><span>${has ? 'Edit' : 'Add'} job description (optional)</span><textarea class="inp" id="jdText" rows="7" placeholder="Paste the JD here">${esc(x.jd || '')}</textarea></label>` : ''}</div>
        <div class="m-foot"><button class="btn btn-outline" data-dismiss>Close</button>${M ? `<button class="btn btn-primary" id="jdSave">${I('check', 15)} Save</button>` : ''}</div>`);
      const sv = $('#jdSave');
      if (sv) sv.addEventListener('click', async () => { try { await Store.updateMember(x.id, { jd: $('#jdText').value }); UI.toast('Job description saved', 'success'); closeModal(); await renderHierarchy(true); } catch (e) { UI.toast(e.message || 'Failed', 'error'); } });
      attachModalCloses();
    };
    $$('[data-jd]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const x = byId[b.dataset.jd]; if (x) openJd(x); }));

    // ---- person sheet ----
    const refresh = async (msg) => { if (msg) UI.toast(msg, 'success'); closeModal(); await renderHierarchy(true); };
    const doVac = async (x) => {
      if (x.status === 'Vacant') return openMemberModal(x, null, true);
      try { await Store.updateMember(x.id, { status: 'Vacant' }); await refresh(x.name + ' marked vacant'); } catch (e) { UI.toast(e.message, 'error'); }
    };
    const doDel = (x) => {
      modal(`<div class="m-head"><div class="m-ico bad">${I('alert', 20)}</div><div><h3>Remove this box?</h3><p>${esc(x.name || 'Vacant position')}${x.designation ? ' · ' + esc(x.designation) : ''}. ${kidsOf(x.id).length ? 'Their team will move up to ' + esc((byId[x.parentId] || {}).name || 'the level above') + '. ' : ''}To keep the position but empty it, use Mark vacant instead.</p></div></div><div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-danger" id="hDelOk">Remove</button></div>`);
      $('#hDelOk').addEventListener('click', async () => { try { await Store.deleteMember(x.id); if (f.focus === x.id) f.focus = x.parentId || null; await refresh('Removed'); } catch (e) { UI.toast(e.message, 'error'); } });
      attachModalCloses();
    };
    const openSheet = (x) => {
      if (x.kind === 'info') return;
      const vac = x.status === 'Vacant', unit = x.kind === 'unit', mgr = byId[x.parentId], dep = H.departments.find((d) => d.id === x.deptId);
      const row = (l, v) => (v ? `<div style="color:var(--muted)">${l}</div><div>${v}</div>` : '');
      const direct = kidsOf(x.id).length, tot = countPeople(x.id);
      modal(`<div class="m-head"><div class="m-ico brand">${I('people', 20)}</div><div><h3>${vac ? 'Vacant position' : esc(x.name)}</h3><p>${esc(unit ? 'Team' : x.designation)}${x.isHead ? ' · Head of department' : ''}${vac && x.vacatedName ? ' · previously ' + esc(x.vacatedName) : ''}</p></div></div>
        <div class="m-body"><div style="display:grid;grid-template-columns:110px 1fr;gap:8px 12px;font-size:13.5px">
          ${row('Grade', esc(x.grade))}${row('Location', esc(x.location))}${row('Department', esc(dep ? dep.name : ''))}${row('Reports to', mgr ? esc((mgr.name || 'Vacant') + (mgr.designation ? ' · ' + mgr.designation : '')) : '')}
          ${row('Team', direct ? `${direct} direct${tot > direct ? ' · ' + tot + ' people in this branch' : ''}` : '')}${row('Note', esc(x.note))}${row('Status', vac ? 'Vacant' : x.flag === 'consultant' ? 'Consultant' : x.flag === 'alert' ? 'Marked red in the organogram' : 'Active')}
        </div></div>
        <div class="m-foot" style="flex-wrap:wrap;gap:8px"><button class="btn btn-outline" data-dismiss>Close</button>
          ${!unit ? `<button class="btn btn-outline" id="paJd">${I('file', 14)} View JD</button>` : ''}
          ${direct ? `<button class="btn btn-outline" id="paFocus">${I('eye', 14)} Open this branch</button>` : ''}
          ${M ? `<button class="btn btn-outline" id="paAdd">${I('plus', 14)} Add report</button>${!unit ? `<button class="btn btn-outline" id="paVac">${vac ? 'Fill position' : 'Mark vacant'}</button>` : ''}<button class="btn btn-outline" id="paDel">${I('trash', 14)} Remove</button><button class="btn btn-primary" id="paEdit">Edit</button>` : ''}</div>`);
      const on = (id, fn) => { const b = $('#' + id); if (b) b.addEventListener('click', fn); };
      on('paJd', () => { closeModal(); openJd(x); });
      on('paFocus', () => { closeModal(); f.focus = x.id; renderHierarchy(false); });
      on('paAdd', () => { closeModal(); openMemberModal(null, x.id); });
      on('paVac', () => { closeModal(); doVac(x); });
      on('paDel', () => { closeModal(); doDel(x); });
      on('paEdit', () => { closeModal(); openMemberModal(x, null); });
      attachModalCloses();
    };
    $$('[data-hp]').forEach((b) => {
      const go = () => { const x = byId[b.dataset.hp]; if (x) openSheet(x); };
      b.addEventListener('click', go);
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    // ---- add / edit ----
    function openMemberModal(x, parentId, fillOnly) {
      const isNew = !x;
      const banned = x ? descIds(x.id) : new Set();
      const mgrOpts = nodes.filter((n) => n.kind !== 'info' && !banned.has(n.id)).map((n) => `<option value="${esc(n.id)}" ${(x ? x.parentId : parentId) === n.id ? 'selected' : ''}>${esc((n.kind === 'unit' ? '[Team] ' : '') + (n.name || 'Vacant') + (n.designation ? ' - ' + n.designation : ''))}</option>`).join('');
      const kind = x ? x.kind : 'person';
      const defDept = x ? x.deptId : ((byId[parentId] || {}).deptId || '');
      modal(`<div class="m-head"><div class="m-ico brand">${I('people', 20)}</div><div><h3>${fillOnly ? 'Fill vacant position' : isNew ? 'Add to the org chart' : 'Edit'}</h3><p>${fillOnly ? esc(x.designation) : 'Changes are visible to the department HOD straight away'}</p></div></div>
        <div class="m-body">
          ${fillOnly ? '' : `<label class="fld"><span>Type</span><select class="inp" id="hmKind"><option value="person" ${kind === 'person' ? 'selected' : ''}>Person / position</option><option value="unit" ${kind === 'unit' ? 'selected' : ''}>Team label (box without a person)</option><option value="info" ${kind === 'info' ? 'selected' : ''}>Note box (headcount etc.)</option></select></label>`}
          <label class="fld"><span id="hmNameL">${kind === 'person' || fillOnly ? 'Name' : 'Text'}</span><input class="inp" id="hmName" value="${esc(x && x.status !== 'Vacant' ? x.name : '')}" placeholder="Full name"></label>
          ${fillOnly ? '' : `<div id="hmPersonOnly"><label class="fld"><span>Designation</span><input class="inp" id="hmDes" value="${esc(x ? x.designation : '')}" placeholder="e.g. Assistant Manager - Planning"></label>
          <div style="display:flex;gap:10px"><label class="fld" style="flex:1"><span>Grade</span><input class="inp" id="hmGrade" value="${esc(x ? x.grade : '')}" placeholder="e.g. M3"></label><label class="fld" style="flex:2"><span>Location</span><input class="inp" id="hmLoc" value="${esc(x ? x.location : '')}" placeholder="e.g. Karachi"></label></div>
          <label class="fld"><span>Status</span><select class="inp" id="hmStatus"><option value="Active" ${!x || x.status !== 'Vacant' ? 'selected' : ''}>Active</option><option value="Vacant" ${x && x.status === 'Vacant' ? 'selected' : ''}>Vacant (position open, no name)</option></select></label>
          <label class="fld"><span>Mark as</span><select class="inp" id="hmFlag"><option value="">Normal</option><option value="consultant" ${x && x.flag === 'consultant' ? 'selected' : ''}>Consultant (blue)</option><option value="alert" ${x && x.flag === 'alert' ? 'selected' : ''}>Red flag</option></select></label>
          <label class="fld" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="hmHead" ${x && x.isHead ? 'checked' : ''}> <span>Head of this department</span></label></div>
          <label class="fld"><span>Reports to</span><select class="inp" id="hmParent">${mgrOpts}</select></label>
          <label class="fld"><span>Department</span><select class="inp" id="hmDept"><option value="">None</option>${H.departments.map((d) => `<option value="${esc(d.id)}" ${defDept === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>
          <label class="fld"><span>Note (optional)</span><input class="inp" id="hmNote" value="${esc(x ? x.note : '')}" placeholder="e.g. Night shift, Hospitals"></label>`}
        </div>
        <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="hmSave">${I('check', 15)} Save</button></div>`);
      const kSel = $('#hmKind');
      const sync = () => { const k = kSel ? kSel.value : 'person'; const po = $('#hmPersonOnly'); if (po) po.style.display = k === 'person' ? '' : 'none'; const l = $('#hmNameL'); if (l) l.textContent = k === 'person' ? 'Name' : 'Text'; };
      if (kSel) { kSel.addEventListener('change', sync); sync(); }
      $('#hmSave').addEventListener('click', async () => {
        const name = $('#hmName').value.trim();
        try {
          if (fillOnly) { if (!name) return UI.toast('Please enter the name', 'error'); await Store.updateMember(x.id, { name, status: 'Active' }); return refresh(name + ' added to the position'); }
          const k = $('#hmKind').value;
          const body = { kind: k, name, parentId: $('#hmParent').value, deptId: $('#hmDept').value, note: $('#hmNote').value.trim() };
          if (k === 'person') Object.assign(body, { designation: $('#hmDes').value.trim(), grade: $('#hmGrade').value.trim(), location: $('#hmLoc').value.trim(), status: $('#hmStatus').value, flag: $('#hmFlag').value, isHead: $('#hmHead').checked });
          if (body.status === 'Vacant') delete body.name;
          if (isNew) await Store.addMember(body); else await Store.updateMember(x.id, body);
          await refresh(isNew ? 'Added' : 'Saved');
        } catch (e) { UI.toast(e.message || 'Failed', 'error'); }
      });
      attachModalCloses();
    }
    const nw = $('#hNew'); if (nw) nw.addEventListener('click', () => openMemberModal(null, (roots[0] || {}).id || ''));
  }

  // ---------- Applications (resume screening) ----------
  async function renderApplications() {
    let apps = []; try { apps = await Store.listApplications(); } catch (e) { console.error(e); }
    const f = state.appFilter || 'all';
    const cnt = (s) => apps.filter((a) => a.status === s).length;
    const stBadge = (a) => ({ Shortlisted: 'b-good', Review: 'b-warn', 'Not shortlisted': 'b-bad', Screening: 'b-info' }[a.status] || 'b-neutral');
    const shown = apps.filter((a) => f === 'all' || a.status === f);
    const scoreBar = (a) => a.score == null
      ? `<span class="muted" title="${esc((a.screen && a.screen.error) || '')}">n/a</span>`
      : `<div style="display:flex;align-items:center;gap:8px;min-width:110px"><b style="width:30px">${a.score}</b><div style="flex:1;height:6px;border-radius:4px;background:var(--line,#e6ebe1)"><div style="height:100%;width:${a.score}%;border-radius:4px;background:${a.score >= 60 ? 'var(--good,#3f9b3f)' : a.score >= 55 ? 'var(--warn,#d9a21b)' : 'var(--bad,#c9473e)'}"></div></div></div>`;
    const tabs = [['all', 'All', apps.length], ['Review', 'Needs HR review', cnt('Review')], ['Shortlisted', 'Shortlisted', cnt('Shortlisted')], ['Not shortlisted', 'Not shortlisted', cnt('Not shortlisted')]];
    view.innerHTML = `<div class="page-head"><div><h1>Applications</h1><p>Resumes are scored against the job description. Only shortlisted candidates receive the interview link · ${apps.length} total</p></div></div>
      <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${tabs.map(([k, l, n]) => `<button class="btn btn-sm ${f === k ? 'btn-primary' : 'btn-outline'}" data-af="${esc(k)}">${esc(l)} <span style="opacity:.7">${n}</span></button>`).join('')}</div>
      <div class="table-wrap">${shown.length ? `<table class="tbl"><thead><tr><th>Candidate</th><th>Position</th><th>Score</th><th>Status</th><th>Applied</th><th></th></tr></thead><tbody>
        ${shown.map((a) => `<tr>
          <td><div class="td-cand"><div class="av" style="background:${avColor(a.name)}">${initials(a.name)}</div><div><b>${esc(a.name)}</b><span>${esc(a.email)}</span></div></div></td>
          <td>${esc(a.positionTitle || B.ROLES[a.role]?.title || '')}<br><span class="muted" style="font-size:12px">${a.positionTitle ? esc(B.ROLES[a.role]?.title || '') : (a.screen && a.screen.bestPosition ? 'Best fit: ' + esc(a.screen.bestPosition) : 'Department')}</span></td>
          <td>${scoreBar(a)}</td>
          <td><span class="badge ${stBadge(a)}">${esc(a.status)}</span>${a.decision ? `<br><span class="muted" style="font-size:11.5px">${esc(a.decision.what)}</span>` : ''}${a.allowReapply ? '<br><span class="muted" style="font-size:11.5px">Can re-apply</span>' : ''}</td>
          <td>${dt(a.createdAt)}</td>
          <td><button class="btn btn-outline btn-sm" data-ap="${esc(a.id)}">${I('eye', 13)} Open</button></td>
        </tr>`).join('')}</tbody></table>` : `<div class="empty"><div class="ei">${I('people', 24)}</div><h3>No applications here</h3><p>New applicants appear after they submit the apply form.</p></div>`}</div>`;
    $$('[data-af]').forEach((b) => b.addEventListener('click', () => { state.appFilter = b.dataset.af; renderApplications(); }));
    $$('[data-ap]').forEach((b) => b.addEventListener('click', () => openApplication(apps.find((a) => a.id === b.dataset.ap))));
  }
  function openApplication(a) {
    if (!a) return;
    const s = a.screen || {}, p = a.profile || {};
    const part = (l, v, max) => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span>${l}</span><b>${v == null ? '-' : v} / ${max}</b></div>`;
    const li = (arr) => (arr && arr.length ? `<ul style="margin:4px 0 0 18px;padding:0;font-size:13px">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="muted" style="font-size:13px">-</span>');
    modal(`
      <div class="m-head"><div class="m-ico brand">${I('people', 20)}</div><div><h3>${esc(a.name)}</h3><p>${esc(a.positionTitle || (B.ROLES[a.role]?.title || '') + ' (department)')}${a.screen && a.screen.bestPosition ? ' · best fit: ' + esc(a.screen.bestPosition) : ''} · ${esc(a.email)} · ${esc(p.phone || '')} · via ${a.source === 'form' ? 'Google Form' : 'apply page'}</p></div></div>
      <div class="m-body" style="max-height:62vh;overflow:auto">
        <div style="display:flex;gap:18px;align-items:center;margin-bottom:10px"><div style="font-size:34px;font-weight:800">${a.score == null ? 'n/a' : a.score + '%'}</div><div><span class="badge">${esc(a.status)}</span>${a.decision ? `<div class="muted" style="font-size:12px;margin-top:4px">${esc(a.decision.what)}</div>` : ''}</div></div>
        ${s.error ? `<div class="rel-warn" style="margin-bottom:10px">${I('alert', 16)}<div><b>AI could not score this resume</b><span>${esc(s.error)}. Please read the resume and decide.</span></div></div>` : ''}
        ${s.summary ? `<p style="font-size:13.5px;margin:0 0 10px">${esc(s.summary)}</p>` : ''}
        ${s.parts ? `<div style="border:1px solid var(--line,#e6ebe1);border-radius:10px;padding:8px 12px;margin-bottom:10px">${part('Skills vs JD', s.parts.skills, 40)}${part('Relevant experience', s.parts.experience, 30)}${part('Education / licences', s.parts.education, 15)}${part('Industry fit', s.parts.domain, 15)}</div>` : ''}
        ${s.parts ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><b style="font-size:13px">Matches</b>${li(s.matched)}</div><div><b style="font-size:13px">Gaps</b>${li(s.gaps)}</div></div>` : ''}
        <div style="margin-top:12px;font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:4px 14px">
          <span>City: <b>${esc(p.city || '-')}</b></span><span>Experience: <b>${esc(p.experience || '-')}</b></span>
          <span>Education: <b>${esc(p.education || '-')}</b></span><span>Employer: <b>${esc(p.employer || '-')}</b></span>
          <span>Expected salary: <b>${esc(p.expectedSalary || '-')}</b></span><span>Resume text: <b>${a.resume ? esc(a.resume.textSource || '') + ' · ' + a.resume.chars + ' chars' : '-'}</b></span>
        </div>
      </div>
      <div class="m-foot" style="flex-wrap:wrap;gap:8px">
        <button class="btn btn-outline" id="apRes">${I('download', 14)} Resume</button>
        <button class="btn btn-outline" id="apRescore">${I('refresh', 14)} Re-score</button>
        <button class="btn btn-outline" id="apReopen" title="Lets this email/phone submit a new application">${I('refresh', 14)} Allow re-apply</button>
        <button class="btn btn-outline" id="apReject">${I('x', 14)} Reject</button>
        <button class="btn btn-primary" id="apShort">${I('send', 14)} ${a.source === 'form' ? (a.status === 'Shortlisted' ? 'Shortlisted' : 'Shortlist (link emailed by the form script)') : (a.status === 'Shortlisted' ? 'Resend interview link' : 'Shortlist & send link')}</button>
      </div>`);
    const act = async (action, msg) => {
      try { await Store.applicationAction(a.id, action); UI.toast(msg, 'success'); closeModal(); renderApplications(); } catch (e) { UI.toast(e.message || 'Failed', 'error'); }
    };
    $('#apShort').addEventListener('click', () => act('shortlist', 'Shortlisted - interview link emailed'));
    $('#apReject').addEventListener('click', () => act('reject', 'Marked as not shortlisted'));
    $('#apReopen').addEventListener('click', () => act('reopen', 'This candidate can apply again'));
    $('#apRescore').addEventListener('click', () => act('rescore', 'Re-scored'));
    $('#apRes').addEventListener('click', async () => {
      try {
        let token = ''; try { token = sessionStorage.getItem('dvago_admin_token') || ''; } catch (e) {}
        const r = await fetch('api/applications/' + encodeURIComponent(a.id) + '/resume', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
        if (!r.ok) throw new Error('Resume file not found');
        const link = document.createElement('a'); link.href = URL.createObjectURL(await r.blob()); link.download = (a.resume && a.resume.name) || 'resume'; link.click();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
    attachModalCloses();
  }
  function buildInviteUrl(token) { return location.origin + location.pathname.replace(/admin\.html$/, '') + 'index.html?invite=' + token; }

  function openInviteModal() {
    modal(`
      <div class="m-head"><div class="m-ico brand">${I('send', 20)}</div><div><h3>Create interview invitation</h3><p>Send a personal link to a specific candidate</p></div></div>
      <div class="m-body">
        <label class="fld"><span>Candidate name</span><input class="inp" id="iName" placeholder="e.g. Ayesha Khan"></label>
        <label class="fld"><span>Email</span><input class="inp" id="iEmail" type="email" placeholder="candidate@email.com"></label>
        <label class="fld"><span>Role</span><select class="inp" id="iRole">${isMaster() ? '<option value="">Let the candidate choose</option>' : ''}${myRoleEntries().map(([k, r]) => `<option value="${k}">${esc(r.title)}</option>`).join('')}</select></label>
        <label class="fld"><span>Expires on (optional)</span><input class="inp" id="iExp" type="date"></label>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="iCreate">${I('send', 15)} Create link</button></div>
    `);
    $('#iCreate').addEventListener('click', async () => {
      const email = $('#iEmail').value.trim();
      if (!email) return UI.toast('Please enter an email', 'error');
      const inv = await Store.createInvite({
        name: $('#iName').value.trim(),
        email: email,
        role: $('#iRole').value,
        expiresAt: $('#iExp').value ? new Date($('#iExp').value).toISOString() : null
      });
      const url = buildInviteUrl(inv.token);
      $('#mCard').innerHTML = `
        <div class="m-head"><div class="m-ico brand">${I('check', 20)}</div><div><h3>Invitation created!</h3><p>Share this personal link with ${esc(email)}</p></div></div>
        <div class="invite-success">
          <div style="font-size:13px;color:var(--muted)">Interview link</div>
          <div class="invite-url"><input readonly value="${esc(url)}"><button class="btn btn-primary btn-sm" id="copyInv">${I('copy', 13)} Copy</button></div>
          <div style="font-size:12.5px;color:var(--ink-2)">${I('mail', 13).replace('class="ico', 'style="display:inline;vertical-align:-2px" class="ico')} Open your email app and paste the link — the candidate can use it once.</div>
        </div>
        <div class="m-foot"><button class="btn btn-outline" data-dismiss>Done</button><button class="btn btn-outline" id="emailInv">${I('mail', 14)} Open in email</button></div>`;
      $('#copyInv').addEventListener('click', () => { navigator.clipboard.writeText(url); UI.toast('Link copied', 'success'); });
      $('#emailInv').addEventListener('click', () => { location.href = `mailto:${email}?subject=Your%20DVAGO%20interview%20invitation&body=${encodeURIComponent('Dear ' + ($('#iName').value || 'candidate') + ',\n\nYou are invited to complete your DVAGO interview with SARAH, our AI recruiter.\n\nStart here: ' + url + '\n\nIt takes about 40 minutes. You can start now or schedule a slot in the next 7 days.\n\nBest of luck!\nDVAGO HR')}`; });
      attachModalCloses();
    });
    attachModalCloses();
  }

  // ---------- Analytics ----------
  function renderAnalytics() {
    view.innerHTML = `<div class="page-head"><div><h1>Analytics</h1><p>Insights across all candidates and roles</p></div></div>
      <div class="panels">
        <div class="panel"><div class="panel-head"><div><h3>Average score by role</h3><div class="sub">How candidates perform across different positions</div></div></div><div class="panel-body"><div class="chart-wrap tall"><canvas id="chByRole"></canvas></div></div></div>
        <div class="panel"><div class="panel-head"><div><h3>By category</h3><div class="sub">Retail vs Corporate pipeline</div></div></div><div class="panel-body"><div class="chart-wrap tall"><canvas id="chByCat"></canvas></div></div></div>
      </div>
      <div class="panels">
        <div class="panel"><div class="panel-head"><div><h3>Candidates by city</h3><div class="sub">Geographic distribution</div></div></div><div class="panel-body"><div class="chart-wrap"><canvas id="chByCity"></canvas></div></div></div>
        <div class="panel"><div class="panel-head"><div><h3>Education mix</h3><div class="sub">Education level of candidate pool</div></div></div><div class="panel-body"><div class="chart-wrap"><canvas id="chByEdu"></canvas></div></div></div>
      </div>`;

    const byRole = {}; data.forEach((d) => { if (!byRole[d.roleTitle]) byRole[d.roleTitle] = []; byRole[d.roleTitle].push(d.evaluation?.overall || 0); });
    const rLabels = Object.keys(byRole), rVals = rLabels.map((k) => Math.round(byRole[k].reduce((a, b) => a + b, 0) / byRole[k].length));
    charts.byRole = new Chart($('#chByRole'), { type: 'bar', data: { labels: rLabels, datasets: [{ data: rVals, backgroundColor: rVals.map((v) => scoreColor(v)), borderRadius: 6, maxBarThickness: 32 }] }, options: Object.assign(chartBase({ x: { max: 100 }, y: { grid: { display: false } } }), { indexAxis: 'y' }) });

    const byCat = { 'Retail Stores': 0, 'Corporate Office': 0 }; data.forEach((d) => { const l = B.CATEGORIES[d.category]?.label; if (byCat[l] != null) byCat[l]++; });
    charts.byCat = new Chart($('#chByCat'), { type: 'doughnut', data: { labels: Object.keys(byCat), datasets: [{ data: Object.values(byCat), backgroundColor: ['#78B943', '#3987e5'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: chartTxt(), usePointStyle: true, padding: 14 } } }, cutout: '60%' } });

    const byCity = {}; data.forEach((d) => { byCity[d.candidate.city || 'Unknown'] = (byCity[d.candidate.city || 'Unknown'] || 0) + 1; });
    const cityL = Object.keys(byCity).sort((a, b) => byCity[b] - byCity[a]).slice(0, 8);
    charts.byCity = new Chart($('#chByCity'), { type: 'bar', data: { labels: cityL, datasets: [{ data: cityL.map((k) => byCity[k]), backgroundColor: '#78B943', borderRadius: 6, maxBarThickness: 36 }] }, options: chartBase({ y: { beginAtZero: true, ticks: { precision: 0 } } }) });

    const byEdu = {}; data.forEach((d) => { byEdu[d.candidate.education || 'Not specified'] = (byEdu[d.candidate.education || 'Not specified'] || 0) + 1; });
    charts.byEdu = new Chart($('#chByEdu'), { type: 'doughnut', data: { labels: Object.keys(byEdu), datasets: [{ data: Object.values(byEdu), backgroundColor: ['#78B943', '#3987e5', '#F5A524', '#8B5CF6', '#14B8A6', '#E34948'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: chartTxt(), usePointStyle: true, padding: 10, font: { size: 11 } } } }, cutout: '55%' } });
  }

  // ---------- Roles & Questions (full editor) ----------
  // Editor keys: a department key, or "pos:<positionId>" for one position's own (JD-based) questions.
  const posOfKey = (k) => (String(k).startsWith('pos:') ? String(k).slice(4) : null);
  let editorPositions = [];
  const deptOfKey = (k) => { const pid = posOfKey(k); if (!pid) return k; const p = editorPositions.find((x) => x.id === pid); return p ? p.roleKey : Object.keys(B.ROLES)[0]; };
  const rqOf = (k) => B.roleQuestions(deptOfKey(k));
  const titleOfKey = (k) => { const pid = posOfKey(k); if (!pid) return (B.ROLES[k] || {}).title || k; const p = editorPositions.find((x) => x.id === pid); return p ? p.title : k; };

  async function renderRoles() {
    try { editorPositions = await Store.listPositions(); } catch (e) { editorPositions = []; }
    let pqInfo = {}; try { pqInfo = await Store.positionQuestionInfo(); } catch (e) {}
    let roleKey = state.rqRole || Object.keys(B.ROLES)[0];
    if (posOfKey(roleKey) && !editorPositions.some((p) => p.id === posOfKey(roleKey))) roleKey = state.rqRole = Object.keys(B.ROLES)[0];
    const pid = posOfKey(roleKey);
    const r = Object.assign({}, B.ROLES[deptOfKey(roleKey)], { title: titleOfKey(roleKey) });
    const tab = state.rqTab || 'sjt';
    const opts = Object.entries(B.ROLES).map(([k, d]) => `<optgroup label="${esc(d.title)}"><option value="${k}" ${roleKey === k ? 'selected' : ''}>${esc(d.title)} · department questions</option>${editorPositions.filter((p) => p.roleKey === k).map((p) => `<option value="pos:${esc(p.id)}" ${roleKey === 'pos:' + p.id ? 'selected' : ''}>↳ ${esc(p.title)}${pqInfo[p.id] && pqInfo[p.id].has ? ' ✓' : ''}</option>`).join('')}</optgroup>`).join('');
    const pinfo = pid ? (pqInfo[pid] || { has: false }) : null;
    view.innerHTML = `<div class="page-head">
        <div><h1>Roles &amp; Questions</h1><p>Questions for each department, or for one specific position (built from its JD). A position without its own questions uses its department's.</p></div>
        <div class="actions">
          <label class="chip-sel active">${I('target', 14)}<select id="rqRoleSel">${opts}</select></label>
        </div>
      </div>
      ${pid ? `<div class="slot-sum" style="margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between">
        <span>${I('target', 14)} <b>${esc(r.title)}</b> · ${pinfo.has ? `JD-based questions active${pinfo.generatedAt ? ' (AI-generated ' + esc(new Date(pinfo.generatedAt).toLocaleDateString('en-GB')) + ')' : ' (edited)'}` : 'no position questions yet: this position currently uses its department questions'}</span>
        <span style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" id="pqGen">${I('zap', 14)} ${pinfo.has ? 'Regenerate from JD' : 'Generate from JD'} (AI)</button>${pinfo.has ? `<button class="btn btn-outline btn-sm" id="pqReset">${I('refresh', 14)} Use department questions</button>` : ''}</span>
      </div>` : ''}
      <div class="sec-tabs" style="margin-bottom:16px" id="rqTabs">
        <button class="sec-tab ${tab === 'voice' ? 'active' : ''}" data-t="voice">${I('mic', 14)} Voice interview</button>
        <button class="sec-tab ${tab === 'sjt' ? 'active' : ''}" data-t="sjt">${I('compass', 14)} Decision scenarios</button>
        <button class="sec-tab ${tab === 'sim' ? 'active' : ''}" data-t="sim">${I('layers', 14)} Job simulation</button>
        <button class="sec-tab ${tab === 'case' ? 'active' : ''}" data-t="case">${I('file', 14)} Case study</button>
        <button class="sec-tab ${tab === 'reas' ? 'active' : ''}" data-t="reas">${I('zap', 14)} Reasoning MCQs</button>
        <button class="sec-tab ${tab === 'chal' ? 'active' : ''}" data-t="chal">${I('eye', 14)} Attention challenge</button>
      </div>
      <div id="rqBody">Loading…</div>`;
    $('#rqRoleSel').addEventListener('change', (e) => { state.rqRole = e.target.value; render(); });
    $$('#rqTabs .sec-tab').forEach((b) => b.addEventListener('click', () => { state.rqTab = b.dataset.t; render(); }));
    if (pid) {
      const gen = $('#pqGen');
      gen.addEventListener('click', async () => {
        if (pinfo.has && !confirm('Replace this position\'s questions with new ones generated from its JD? Your manual edits to them will be lost.')) return;
        gen.disabled = true; gen.innerHTML = `${I('refresh', 14)} Generating… (about 20 seconds)`;
        try { await Store.generatePositionQuestions(pid); UI.toast('Questions generated from the JD', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        render();
      });
      const rs = $('#pqReset');
      if (rs) rs.addEventListener('click', async () => { if (!confirm('Remove this position\'s own questions? It will use the department questions again.')) return; try { await Store.resetPositionQuestions(pid); UI.toast('Using department questions', 'success'); } catch (e) { UI.toast(e.message, 'error'); } render(); });
    }

    const body = $('#rqBody');
    if (tab === 'voice') { state.vqRole = roleKey; await renderVoiceInline(body, roleKey); }
    else if (tab === 'sjt') await renderSJTInline(body, roleKey, r);
    else if (tab === 'sim') await renderSimInline(body, roleKey, r);
    else if (tab === 'case') await renderCaseInline(body, roleKey, r);
    else if (tab === 'reas') await renderReasInline(body);
    else if (tab === 'chal') await renderChallengeInline(body, deptOfKey(roleKey), B.ROLES[deptOfKey(roleKey)]);
  }

  async function renderVoiceInline(body, roleKey) {
    let items;
    try {
      const list = await Store.listVoiceQuestions(roleKey);
      items = (Array.isArray(list) && list.length) ? list : rqOf(roleKey).voice;
    } catch (e) {
      items = rqOf(roleKey).voice;
    }
    body.innerHTML = `<div class="table-wrap">
      <div class="table-ctrls" style="justify-content:space-between">
        <div style="color:var(--muted);font-size:13px">${items.length} voice question${items.length === 1 ? '' : 's'} for this role</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" id="vqReset">${I('refresh', 14)} Reset to default</button>
          <button class="btn btn-primary btn-sm" id="vqAdd">${I('plus', 14)} Add question</button>
        </div>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
        ${items.map((q, k) => `<div class="ans"><div class="ans-head"><b>Question ${k + 1}</b><div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" data-up="${k}" ${k === 0 ? 'disabled' : ''}>${I('up', 13)}</button>
          <button class="btn btn-outline btn-sm" data-down="${k}" ${k === items.length - 1 ? 'disabled' : ''}>${I('down', 13)}</button>
          <button class="btn btn-outline btn-sm" data-edit="${k}">${I('eye', 13)} Edit</button>
          <button class="btn btn-outline btn-sm" data-del="${k}">${I('trash', 13)}</button>
        </div></div><div class="q">${esc(q.q)}</div>
        ${(q.checks && q.checks.length) ? `<div class="rub">${q.checks.map((c) => `<span class="r ok">${I('check', 10)} ${esc(c.label)}</span>`).join('')}</div>` : ''}</div>`).join('')}
      </div></div>`;
    $('#vqAdd').addEventListener('click', () => openVQEditor(roleKey, items, null));
    $('#vqReset').addEventListener('click', () => confirmVQReset(roleKey));
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openVQEditor(roleKey, items, +b.dataset.edit)));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => confirmVQDelete(roleKey, items, +b.dataset.del)));
    $$('[data-up]').forEach((b) => b.addEventListener('click', async () => { const i = +b.dataset.up; [items[i - 1], items[i]] = [items[i], items[i - 1]]; await Store.saveVoiceQuestions(roleKey, items); render(); }));
    $$('[data-down]').forEach((b) => b.addEventListener('click', async () => { const i = +b.dataset.down; [items[i + 1], items[i]] = [items[i], items[i + 1]]; await Store.saveVoiceQuestions(roleKey, items); render(); }));
  }

  async function renderSJTInline(body, roleKey, r) {
    let items = []; try { items = await Store.listSJT(roleKey) || []; } catch (e) {}
    if (!items.length) items = rqOf(roleKey).sjt.slice((B.COMMON_SJT || []).length);
    body.innerHTML = `<div class="table-wrap">
      <div class="table-ctrls" style="justify-content:space-between">
        <div style="color:var(--muted);font-size:13px">${items.length} scenario${items.length === 1 ? '' : 's'} (plus 2 shared "common" scenarios)</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" id="sjtReset">${I('refresh', 14)} Reset to default</button>
          <button class="btn btn-primary btn-sm" id="sjtAdd">${I('plus', 14)} Add scenario</button>
        </div>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
        ${items.map((q, k) => `<div class="ans"><div class="ans-head"><b>${esc(q.title || 'Scenario ' + (k + 1))}</b><div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" data-up="${k}" ${k === 0 ? 'disabled' : ''}>${I('up', 13)}</button>
          <button class="btn btn-outline btn-sm" data-down="${k}" ${k === items.length - 1 ? 'disabled' : ''}>${I('down', 13)}</button>
          <button class="btn btn-outline btn-sm" data-edit="${k}">${I('eye', 13)} Edit</button>
          <button class="btn btn-outline btn-sm" data-del="${k}">${I('trash', 13)}</button>
        </div></div>
        <div class="q" style="font-size:13px;color:var(--muted)">${esc(q.scenario || '').slice(0, 160)}${(q.scenario || '').length > 160 ? '…' : ''}</div>
        <div class="q" style="margin-top:4px">${esc(q.question || '')}</div>
        <div class="rub">${(q.options || []).map((o, oi) => `<span class="r ${o.s === 3 ? 'ok' : 'no'}">${'ABCD'[oi]} · ${o.s}pt</span>`).join('')}</div></div>`).join('') || '<p class="muted" style="padding:20px;text-align:center">No scenarios yet</p>'}
      </div></div>`;
    $('#sjtAdd').addEventListener('click', () => openSJTEditor(roleKey, items, null));
    $('#sjtReset').addEventListener('click', () => { modal(`<div class="m-head"><div class="m-ico warn">${I('refresh', 20)}</div><div><h3>Reset scenarios?</h3><p>All your edits for <b>${esc(r.title)}</b> scenarios will be removed.</p></div></div><div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="sjtRstCfm">Reset</button></div>`); $('#sjtRstCfm').addEventListener('click', async () => { await Store.resetSJT(roleKey); UI.toast('Reset to default', 'success'); closeModal(); render(); }); attachModalCloses(); });
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openSJTEditor(roleKey, items, +b.dataset.edit)));
    $$('[data-del]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Delete this scenario?')) return; items.splice(+b.dataset.del, 1); await Store.saveSJT(roleKey, items); UI.toast('Scenario deleted', 'success'); render(); }));
    $$('[data-up]').forEach((b) => b.addEventListener('click', async () => { const i = +b.dataset.up; [items[i - 1], items[i]] = [items[i], items[i - 1]]; await Store.saveSJT(roleKey, items); render(); }));
    $$('[data-down]').forEach((b) => b.addEventListener('click', async () => { const i = +b.dataset.down; [items[i + 1], items[i]] = [items[i], items[i + 1]]; await Store.saveSJT(roleKey, items); render(); }));
  }

  function openSJTEditor(roleKey, items, idx) {
    const isNew = idx == null;
    const q = isNew ? { id: 'sjt-' + Date.now().toString(36).slice(-6), title: '', scenario: '', question: 'What is the most effective action?', options: [{ t: '', s: 3 }, { t: '', s: 1 }, { t: '', s: 0 }, { t: '', s: 0 }], comp: ['decision'] } : JSON.parse(JSON.stringify(items[idx]));
    while (q.options.length < 4) q.options.push({ t: '', s: 0 });
    modal(`<div class="m-head"><div class="m-ico brand">${I('compass', 20)}</div><div><h3>${isNew ? 'Add' : 'Edit'} decision scenario</h3><p>Candidate reads the scenario and picks the most effective action</p></div></div>
      <div class="m-body">
        <label class="fld"><span>Short title</span><input class="inp" id="sjtTitle" value="${esc(q.title)}" placeholder="e.g. The friendly discount"></label>
        <label class="fld"><span>Scenario (what's happening)</span><textarea class="inp" id="sjtScen" rows="3" placeholder="A colleague you get along with regularly gives unauthorised 15% discounts…">${esc(q.scenario)}</textarea></label>
        <label class="fld"><span>Question</span><input class="inp" id="sjtQ" value="${esc(q.question)}" placeholder="What is the most effective action?"></label>
        <div>
          <label style="font-size:13px;font-weight:600;color:var(--ink-2);display:block;margin-bottom:8px">Options &amp; points (3 = best, 0 = worst)</label>
          <div id="sjtOpts" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="sjtSave">${I('check', 15)} ${isNew ? 'Add' : 'Save'}</button></div>`, 'wide');
    const draw = () => {
      $('#sjtOpts').innerHTML = q.options.map((o, k) => `<div style="display:flex;gap:8px;align-items:center">
        <span style="width:28px;height:28px;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;display:grid;place-items:center;font-weight:700;font-size:12px;color:var(--muted);flex-shrink:0">${'ABCD'[k]}</span>
        <input class="inp" style="flex:1" placeholder="Option text" data-ot="${k}" value="${esc(o.t)}">
        <select class="inp" style="width:80px" data-os="${k}">
          <option value="3" ${o.s === 3 ? 'selected' : ''}>3 pts</option>
          <option value="2" ${o.s === 2 ? 'selected' : ''}>2 pts</option>
          <option value="1" ${o.s === 1 ? 'selected' : ''}>1 pt</option>
          <option value="0" ${o.s === 0 ? 'selected' : ''}>0 pts</option>
        </select>
      </div>`).join('');
      $$('[data-ot]').forEach((el) => el.addEventListener('input', () => { q.options[+el.dataset.ot].t = el.value; }));
      $$('[data-os]').forEach((el) => el.addEventListener('change', () => { q.options[+el.dataset.os].s = +el.value; }));
    };
    draw();
    $('#sjtSave').addEventListener('click', async () => {
      q.title = $('#sjtTitle').value.trim();
      q.scenario = $('#sjtScen').value.trim();
      q.question = $('#sjtQ').value.trim() || 'What is the most effective action?';
      if (!q.title || !q.scenario || q.options.filter((o) => o.t.trim()).length < 2) return UI.toast('Please fill title, scenario and at least 2 options', 'error');
      const list = isNew ? items.concat([q]) : items.map((x, i) => i === idx ? q : x);
      await Store.saveSJT(roleKey, list);
      UI.toast(isNew ? 'Scenario added' : 'Scenario updated', 'success');
      closeModal(); render();
    });
    attachModalCloses();
  }

  async function renderSimInline(body, roleKey, r) {
    let sim = null; try { sim = await Store.getSimulation(roleKey); } catch (e) {}
    if (!sim) sim = JSON.parse(JSON.stringify(rqOf(roleKey).simulation));
    body.innerHTML = `<div class="table-wrap"><div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="color:var(--muted);font-size:13px">One job-simulation task per role (ranking exercise)</div>
        <button class="btn btn-outline btn-sm" id="simReset">${I('refresh', 14)} Reset to default</button>
      </div>
      <label class="fld"><span>Task title</span><input class="inp" id="simTitle" value="${esc(sim.title)}"></label>
      <label class="fld"><span>Brief / instructions to candidate</span><textarea class="inp" id="simBrief" rows="3">${esc(sim.brief || '')}</textarea></label>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label style="font-size:13px;font-weight:600;color:var(--ink-2)">Items in correct priority order (top = first) · drag or use arrows</label>
          <button class="btn btn-outline btn-sm" id="simAddItem">${I('plus', 12)} Add item</button>
        </div>
        <div id="simItems" style="display:flex;flex-direction:column;gap:6px"></div>
      </div>
      <label class="fld"><span>Scoring rationale (shown in admin feedback only)</span><input class="inp" id="simRat" value="${esc(sim.rationale || '')}" placeholder="e.g. Patient safety first, then operations, then reporting"></label>
      <div><button class="btn btn-primary" id="simSave">${I('check', 14)} Save simulation</button></div>
    </div></div>`;
    const drawItems = () => {
      $('#simItems').innerHTML = sim.ideal.map((id, k) => {
        const it = sim.items.find((x) => x.id === id);
        return `<div style="display:flex;gap:8px;align-items:center">
          <span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--brand),var(--brand-dark));color:#fff;display:grid;place-items:center;font-weight:800;font-size:12px;flex-shrink:0">${k + 1}</span>
          <input class="inp" style="flex:1" data-si="${k}" value="${esc(it ? it.t : '')}" placeholder="Task description">
          <button class="btn btn-outline btn-sm" data-smu="${k}" ${k === 0 ? 'disabled' : ''}>${I('up', 13)}</button>
          <button class="btn btn-outline btn-sm" data-smd="${k}" ${k === sim.ideal.length - 1 ? 'disabled' : ''}>${I('down', 13)}</button>
          <button class="btn btn-outline btn-sm" data-sr="${k}">${I('trash', 13)}</button>
        </div>`;
      }).join('');
      $$('[data-si]').forEach((el) => el.addEventListener('input', () => { const k = +el.dataset.si; const id = sim.ideal[k]; const it = sim.items.find((x) => x.id === id); if (it) it.t = el.value; }));
      $$('[data-smu]').forEach((b) => b.addEventListener('click', () => { const k = +b.dataset.smu; [sim.ideal[k - 1], sim.ideal[k]] = [sim.ideal[k], sim.ideal[k - 1]]; drawItems(); }));
      $$('[data-smd]').forEach((b) => b.addEventListener('click', () => { const k = +b.dataset.smd; [sim.ideal[k + 1], sim.ideal[k]] = [sim.ideal[k], sim.ideal[k + 1]]; drawItems(); }));
      $$('[data-sr]').forEach((b) => b.addEventListener('click', () => { const k = +b.dataset.sr; const id = sim.ideal[k]; sim.items = sim.items.filter((it) => it.id !== id); sim.ideal.splice(k, 1); drawItems(); }));
    };
    drawItems();
    $('#simAddItem').addEventListener('click', () => { const id = String.fromCharCode(97 + sim.items.length); sim.items.push({ id, t: '' }); sim.ideal.push(id); drawItems(); });
    $('#simReset').addEventListener('click', async () => { if (!confirm('Reset simulation to default?')) return; await Store.resetSimulation(roleKey); UI.toast('Reset to default', 'success'); render(); });
    $('#simSave').addEventListener('click', async () => {
      sim.title = $('#simTitle').value.trim();
      sim.brief = $('#simBrief').value.trim();
      sim.rationale = $('#simRat').value.trim();
      if (!sim.title || sim.items.filter((it) => it.t.trim()).length < 3) return UI.toast('Need title and at least 3 items with text', 'error');
      await Store.saveSimulation(roleKey, sim);
      UI.toast('Simulation saved', 'success'); render();
    });
  }

  async function renderCaseInline(body, roleKey, r) {
    let cs = null; try { cs = await Store.getCaseStudy(roleKey); } catch (e) {}
    if (!cs) cs = JSON.parse(JSON.stringify(rqOf(roleKey).caseStudy));
    cs.exhibit = cs.exhibit || { caption: '', headers: ['Metric', 'Value'], rows: [] };
    body.innerHTML = `<div class="table-wrap"><div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="color:var(--muted);font-size:13px">One case study per role, with 1–3 analysis questions</div>
        <button class="btn btn-outline btn-sm" id="csReset">${I('refresh', 14)} Reset to default</button>
      </div>
      <label class="fld"><span>Case title</span><input class="inp" id="csTitle" value="${esc(cs.title)}"></label>
      <label class="fld"><span>Case context (the scenario candidate reads)</span><textarea class="inp" id="csCtx" rows="6">${esc(cs.context)}</textarea></label>
      <div>
        <label style="font-size:13px;font-weight:600;color:var(--ink-2);display:block;margin-bottom:8px">Exhibit (optional data table shown with the case)</label>
        <input class="inp" id="csExCap" value="${esc(cs.exhibit.caption)}" placeholder="Exhibit caption (e.g. 'Store snapshot — Saturday 6:15 PM')">
        <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
          <input class="inp" style="flex:1" id="csExH1" value="${esc((cs.exhibit.headers || [])[0] || 'Metric')}" placeholder="Column 1 header">
          <input class="inp" style="flex:1" id="csExH2" value="${esc((cs.exhibit.headers || [])[1] || 'Value')}" placeholder="Column 2 header">
        </div>
        <div id="csRows" style="margin-top:8px;display:flex;flex-direction:column;gap:6px"></div>
        <button class="btn btn-outline btn-sm" id="csAddRow" style="margin-top:8px">${I('plus', 12)} Add row</button>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label style="font-size:13px;font-weight:600;color:var(--ink-2)">Analysis questions</label>
          <button class="btn btn-outline btn-sm" id="csAddQ">${I('plus', 12)} Add question</button>
        </div>
        <div id="csQs" style="display:flex;flex-direction:column;gap:14px"></div>
      </div>
      <div><button class="btn btn-primary" id="csSave">${I('check', 14)} Save case study</button></div>
    </div></div>`;

    const drawRows = () => {
      $('#csRows').innerHTML = cs.exhibit.rows.map((row, k) => `<div style="display:flex;gap:8px">
        <input class="inp" style="flex:1" data-cr="${k}" data-cc="0" value="${esc(row[0] || '')}" placeholder="Metric">
        <input class="inp" style="flex:1" data-cr="${k}" data-cc="1" value="${esc(row[1] || '')}" placeholder="Value">
        <button class="btn btn-outline btn-sm" data-rr="${k}">${I('trash', 13)}</button>
      </div>`).join('');
      $$('[data-cr]').forEach((el) => el.addEventListener('input', () => { cs.exhibit.rows[+el.dataset.cr][+el.dataset.cc] = el.value; }));
      $$('[data-rr]').forEach((b) => b.addEventListener('click', () => { cs.exhibit.rows.splice(+b.dataset.rr, 1); drawRows(); }));
    };
    drawRows();

    const drawQs = () => {
      $('#csQs').innerHTML = cs.questions.map((q, k) => `<div style="padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b style="font-size:12.5px;color:var(--brand-dark)">Question ${k + 1}</b>
          <button class="btn btn-outline btn-sm" data-cqd="${k}">${I('trash', 13)} Remove</button>
        </div>
        <textarea class="inp" rows="2" data-cq="${k}" placeholder="What is your approach?">${esc(q.q || '')}</textarea>
        <div><label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">Rubric points (what a good answer covers) &middot; <a href="#" style="color:var(--brand-dark);text-decoration:underline" data-cqar="${k}">add rubric point</a></label>
        <div data-crb="${k}" style="display:flex;flex-direction:column;gap:6px"></div></div>
      </div>`).join('');
      $$('[data-cq]').forEach((el) => el.addEventListener('input', () => { cs.questions[+el.dataset.cq].q = el.value; }));
      $$('[data-cqd]').forEach((b) => b.addEventListener('click', () => { cs.questions.splice(+b.dataset.cqd, 1); drawQs(); }));
      $$('[data-cqar]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); cs.questions[+a.dataset.cqar].rubric = cs.questions[+a.dataset.cqar].rubric || []; cs.questions[+a.dataset.cqar].rubric.push({ point: '', kw: [] }); drawQs(); }));
      cs.questions.forEach((q, qi) => {
        const rbBox = document.querySelector(`[data-crb="${qi}"]`);
        rbBox.innerHTML = (q.rubric || []).map((rb, ri) => `<div style="display:flex;gap:6px;align-items:center">
          <input class="inp" style="flex:0 0 180px" data-rbp="${qi}-${ri}" value="${esc(rb.point)}" placeholder="What to look for">
          <input class="inp" style="flex:1" data-rbk="${qi}-${ri}" value="${esc((rb.kw || []).join(', '))}" placeholder="keyword1, keyword2">
          <button class="btn btn-outline btn-sm" data-rbd="${qi}-${ri}">${I('trash', 12)}</button>
        </div>`).join('');
        $$('[data-rbp]', rbBox).forEach((el) => el.addEventListener('input', () => { const [qq, rr] = el.dataset.rbp.split('-').map(Number); cs.questions[qq].rubric[rr].point = el.value; }));
        $$('[data-rbk]', rbBox).forEach((el) => el.addEventListener('input', () => { const [qq, rr] = el.dataset.rbk.split('-').map(Number); cs.questions[qq].rubric[rr].kw = el.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean); }));
        $$('[data-rbd]', rbBox).forEach((b) => b.addEventListener('click', () => { const [qq, rr] = b.dataset.rbd.split('-').map(Number); cs.questions[qq].rubric.splice(rr, 1); drawQs(); }));
      });
    };
    drawQs();

    $('#csAddRow').addEventListener('click', () => { cs.exhibit.rows.push(['', '']); drawRows(); });
    $('#csAddQ').addEventListener('click', () => { cs.questions.push({ id: 'cq-' + Date.now().toString(36).slice(-5), q: '', rubric: [], comp: ['problem'] }); drawQs(); });
    $('#csReset').addEventListener('click', async () => { if (!confirm('Reset case study to default?')) return; await Store.resetCaseStudy(roleKey); UI.toast('Reset to default', 'success'); render(); });
    $('#csSave').addEventListener('click', async () => {
      cs.title = $('#csTitle').value.trim();
      cs.context = $('#csCtx').value.trim();
      cs.exhibit.caption = $('#csExCap').value.trim();
      cs.exhibit.headers = [$('#csExH1').value.trim() || 'Metric', $('#csExH2').value.trim() || 'Value'];
      if (!cs.title || !cs.context || cs.questions.length === 0) return UI.toast('Need title, context and at least 1 question', 'error');
      await Store.saveCaseStudy(roleKey, cs);
      UI.toast('Case study saved', 'success'); render();
    });
  }

  async function renderReasInline(body) {
    let items = []; try { items = await Store.listReasoning(); } catch (e) {}
    if (!items || !items.length) items = JSON.parse(JSON.stringify(B.REASONING));
    body.innerHTML = `<div class="table-wrap">
      <div class="table-ctrls" style="justify-content:space-between">
        <div style="color:var(--muted);font-size:13px">${items.length} reasoning MCQ${items.length === 1 ? '' : 's'} · shared across all roles</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" id="rsReset">${I('refresh', 14)} Reset to default</button>
          <button class="btn btn-primary btn-sm" id="rsAdd">${I('plus', 14)} Add MCQ</button>
        </div>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
        ${items.map((q, k) => `<div class="ans"><div class="ans-head"><b>MCQ ${k + 1}</b><div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" data-edit="${k}">${I('eye', 13)} Edit</button>
          <button class="btn btn-outline btn-sm" data-del="${k}">${I('trash', 13)}</button>
        </div></div>
        <div class="q">${esc(q.q)}</div>
        <div class="rub">${(q.options || []).map((o, oi) => `<span class="r ${oi === q.answer ? 'ok' : 'no'}">${'ABCD'[oi]}. ${esc(o).slice(0, 40)}${o.length > 40 ? '…' : ''}</span>`).join('')}</div>
        ${q.explain ? `<div class="meta" style="margin-top:4px;font-size:12px;color:var(--muted)">${I('check', 11)} ${esc(q.explain)}</div>` : ''}</div>`).join('') || '<p class="muted" style="padding:20px;text-align:center">No MCQs yet</p>'}
      </div></div>`;
    $('#rsAdd').addEventListener('click', () => openReasEditor(items, null));
    $('#rsReset').addEventListener('click', async () => { if (!confirm('Reset reasoning MCQs to default?')) return; await Store.resetReasoning(); UI.toast('Reset to default', 'success'); render(); });
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openReasEditor(items, +b.dataset.edit)));
    $$('[data-del]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Delete this MCQ?')) return; items.splice(+b.dataset.del, 1); await Store.saveReasoning(items); render(); }));
  }

  // ---------- Attention challenge (per role; default = auto-generated Expiry Check) ----------
  function challengeTemplate() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const rows = [['Paracetamol 500mg', -40], ['Ibuprofen 400mg', -6], ['Amoxicillin 500mg', 9], ['Omeprazole 20mg', 24], ['Vitamin C 500mg', 95], ['Cetirizine 10mg', 240], ['Metformin 500mg', 380], ['Zinc Syrup', 520]];
    return {
      title: 'Expiry Check challenge',
      prompt: 'Attention challenge — spot expired or near-expiry products',
      intro: `You'll see products on a pharmacy shelf. Tap every product that is already expired or expires within 30 days of ${fmt(today)}.`,
      seconds: 40,
      tiles: rows.map(([name, off], k) => { const d = new Date(today); d.setDate(d.getDate() + off); return { name, line2: 'Batch B' + (1001 + k * 7), line3: 'EXP ' + fmt(d), target: off <= 30 }; })
    };
  }

  async function renderChallengeInline(body, roleKey, r) {
    let ch = null; try { ch = await Store.getChallenge(roleKey); } catch (e) {}
    const isCustom = !!(ch && Array.isArray(ch.tiles) && ch.tiles.length);
    if (!isCustom) {
      body.innerHTML = `<div class="table-wrap"><div style="padding:24px;display:flex;flex-direction:column;gap:14px;align-items:flex-start">
        <div style="color:var(--muted);font-size:13px">The attention challenge is the timed tap-the-items game at the end of the Reasoning section.</div>
        <div class="ans" style="width:100%"><div class="ans-head"><b>${I('eye', 14)} Using the default: Expiry Check</b><span class="badge b-warn">Same for every role</span></div>
          <div class="q" style="font-size:13px;color:var(--muted)">Candidates for <b>${esc(r.title)}</b> currently get 12 randomly generated pharmacy products and must tap the ones that are expired or expire within 30 days (40 seconds).</div></div>
        <button class="btn btn-primary" id="chCreate">${I('plus', 14)} Create a custom challenge for ${esc(r.title)}</button>
      </div></div>`;
      $('#chCreate').addEventListener('click', () => drawChallengeEditor(body, roleKey, r, challengeTemplate(), false));
      return;
    }
    drawChallengeEditor(body, roleKey, r, JSON.parse(JSON.stringify(ch)), true);
  }

  function drawChallengeEditor(body, roleKey, r, ch, saved) {
    body.innerHTML = `<div class="table-wrap"><div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="color:var(--muted);font-size:13px">${saved ? `Custom challenge for <b>${esc(r.title)}</b>` : `New custom challenge for <b>${esc(r.title)}</b> (not saved yet)`} · candidates tap the tiles you mark as <b>should be tapped</b></div>
        <button class="btn btn-outline btn-sm" id="chReset">${I('refresh', 14)} ${saved ? 'Reset to default (Expiry Check)' : 'Cancel'}</button>
      </div>
      <label class="fld"><span>Challenge title</span><input class="inp" id="chTitle" value="${esc(ch.title)}" placeholder="e.g. Invoice Check challenge"></label>
      <label class="fld"><span>Line shown above the tiles</span><input class="inp" id="chPrompt" value="${esc(ch.prompt || '')}" placeholder="e.g. Attention challenge — spot the invoices with errors"></label>
      <label class="fld"><span>Instructions to candidate</span><textarea class="inp" id="chIntro" rows="3" placeholder="What should the candidate tap?">${esc(ch.intro || '')}</textarea></label>
      <label class="fld" style="max-width:220px"><span>Time limit (seconds, 15–180)</span><input class="inp" id="chSecs" type="number" min="15" max="180" value="${+ch.seconds || 40}"></label>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label style="font-size:13px;font-weight:600;color:var(--ink-2)">Tiles (4–24) · <span id="chCount"></span></label>
          <button class="btn btn-outline btn-sm" id="chAdd">${I('plus', 12)} Add tile</button>
        </div>
        <div id="chTiles" style="display:flex;flex-direction:column;gap:8px"></div>
        <p class="muted" style="font-size:12px;margin-top:8px">Tip: the tile text is fixed, so avoid relative dates like “today”. Write full dates or amounts. Tiles are shown to each candidate in a random order.</p>
      </div>
      <div><button class="btn btn-primary" id="chSave">${I('check', 14)} Save challenge</button></div>
    </div></div>`;
    const count = () => { const t = ch.tiles.filter((x) => (x.name || '').trim()); $('#chCount').textContent = `${t.length} tiles, ${t.filter((x) => x.target).length} to tap`; };
    const drawTiles = () => {
      $('#chTiles').innerHTML = ch.tiles.map((t, k) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="width:26px;height:26px;border-radius:8px;background:var(--surface-2);border:1px solid var(--line);display:grid;place-items:center;font-weight:700;font-size:12px;color:var(--muted);flex-shrink:0">${k + 1}</span>
        <input class="inp" style="flex:2;min-width:150px" data-tn="${k}" value="${esc(t.name || '')}" placeholder="Main text (e.g. Paracetamol 500mg)">
        <input class="inp" style="flex:1.3;min-width:110px" data-t2="${k}" value="${esc(t.line2 || '')}" placeholder="Detail (e.g. Batch B1021)">
        <input class="inp" style="flex:1.3;min-width:110px" data-t3="${k}" value="${esc(t.line3 || '')}" placeholder="Key info (e.g. EXP 3 Mar 2026)">
        <label style="display:flex;gap:6px;align-items:center;font-size:12.5px;white-space:nowrap;cursor:pointer"><input type="checkbox" data-tt="${k}" ${t.target ? 'checked' : ''}> should be tapped</label>
        <button class="btn btn-outline btn-sm" data-tr="${k}">${I('trash', 13)}</button>
      </div>`).join('');
      $$('[data-tn]').forEach((el) => el.addEventListener('input', () => { ch.tiles[+el.dataset.tn].name = el.value; count(); }));
      $$('[data-t2]').forEach((el) => el.addEventListener('input', () => { ch.tiles[+el.dataset.t2].line2 = el.value; }));
      $$('[data-t3]').forEach((el) => el.addEventListener('input', () => { ch.tiles[+el.dataset.t3].line3 = el.value; }));
      $$('[data-tt]').forEach((el) => el.addEventListener('change', () => { ch.tiles[+el.dataset.tt].target = el.checked; count(); }));
      $$('[data-tr]').forEach((b) => b.addEventListener('click', () => { ch.tiles.splice(+b.dataset.tr, 1); drawTiles(); }));
      count();
    };
    drawTiles();
    $('#chAdd').addEventListener('click', () => { if (ch.tiles.length >= 24) return UI.toast('Maximum 24 tiles', 'error'); ch.tiles.push({ name: '', line2: '', line3: '', target: false }); drawTiles(); });
    $('#chReset').addEventListener('click', async () => {
      if (saved && !confirm('Remove the custom challenge and go back to the default Expiry Check?')) return;
      if (saved) { await Store.resetChallenge(roleKey); UI.toast('Reset to default', 'success'); }
      render();
    });
    $('#chSave').addEventListener('click', async () => {
      const tiles = ch.tiles.map((t) => ({ name: (t.name || '').trim(), line2: (t.line2 || '').trim(), line3: (t.line3 || '').trim(), target: !!t.target })).filter((t) => t.name);
      const out = { title: $('#chTitle').value.trim(), prompt: $('#chPrompt').value.trim(), intro: $('#chIntro').value.trim(), seconds: Math.max(15, Math.min(180, parseInt($('#chSecs').value, 10) || 40)), tiles };
      if (!out.title) return UI.toast('Please add a challenge title', 'error');
      if (!out.intro) return UI.toast('Please add instructions for the candidate', 'error');
      if (tiles.length < 4) return UI.toast('Add at least 4 tiles', 'error');
      if (!tiles.some((t) => t.target)) return UI.toast('Mark at least one tile as "should be tapped"', 'error');
      if (tiles.every((t) => t.target)) return UI.toast('Not every tile can be a correct one, leave some to ignore', 'error');
      try { await Store.saveChallenge(roleKey, out); UI.toast('Challenge saved', 'success'); render(); }
      catch (e) { UI.toast('Could not save: ' + (e.message || 'error'), 'error'); }
    });
  }

  function openReasEditor(items, idx) {
    const isNew = idx == null;
    const q = isNew ? { id: 'r-' + Date.now().toString(36).slice(-6), q: '', options: ['', '', '', ''], answer: 0, explain: '', comp: ['problem'] } : JSON.parse(JSON.stringify(items[idx]));
    while (q.options.length < 4) q.options.push('');
    modal(`<div class="m-head"><div class="m-ico brand">${I('zap', 20)}</div><div><h3>${isNew ? 'Add' : 'Edit'} reasoning MCQ</h3><p>Simple maths or logic question with one correct answer</p></div></div>
      <div class="m-body">
        <label class="fld"><span>Question</span><textarea class="inp" id="rsQ" rows="3">${esc(q.q)}</textarea></label>
        <div><label style="font-size:13px;font-weight:600;color:var(--ink-2);display:block;margin-bottom:8px">Options (select the correct one)</label>
          <div id="rsOpts" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>
        <label class="fld"><span>Explanation (shown to admin only)</span><input class="inp" id="rsEx" value="${esc(q.explain)}" placeholder="e.g. 3 × 45 + 230 = 365; 365 − 10% = 328.50"></label>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-primary" id="rsSave">${I('check', 15)} ${isNew ? 'Add' : 'Save'}</button></div>`, 'wide');
    const draw = () => {
      $('#rsOpts').innerHTML = q.options.map((o, k) => `<label style="display:flex;gap:10px;align-items:center">
        <input type="radio" name="rsAns" ${q.answer === k ? 'checked' : ''} data-ra="${k}">
        <span style="width:26px;height:26px;background:${q.answer === k ? 'var(--brand)' : 'var(--surface-2)'};color:${q.answer === k ? '#fff' : 'var(--muted)'};border:1px solid var(--line);border-radius:7px;display:grid;place-items:center;font-weight:700;font-size:12px;flex-shrink:0">${'ABCD'[k]}</span>
        <input class="inp" style="flex:1" placeholder="Option text" data-ro="${k}" value="${esc(o)}">
      </label>`).join('');
      $$('[data-ra]').forEach((el) => el.addEventListener('change', () => { q.answer = +el.dataset.ra; draw(); }));
      $$('[data-ro]').forEach((el) => el.addEventListener('input', () => { q.options[+el.dataset.ro] = el.value; }));
    };
    draw();
    $('#rsSave').addEventListener('click', async () => {
      q.q = $('#rsQ').value.trim();
      q.explain = $('#rsEx').value.trim();
      if (!q.q || q.options.filter((o) => o.trim()).length < 2) return UI.toast('Need question and at least 2 options', 'error');
      const list = isNew ? items.concat([q]) : items.map((x, i) => i === idx ? q : x);
      await Store.saveReasoning(list);
      UI.toast(isNew ? 'MCQ added' : 'MCQ updated', 'success');
      closeModal(); render();
    });
    attachModalCloses();
  }

  // ---------- Settings ----------
  async function renderSettings() {
    const s = await Store.getSettings();
    view.innerHTML = `<div class="page-head"><div><h1>Settings</h1><p>Configure the DVAGO recruitment platform</p></div></div>
      <div class="panels"><div class="panel"><div class="panel-head"><div><h3>General</h3><div class="sub">Company and portal settings</div></div></div><div class="panel-body" style="display:flex;flex-direction:column;gap:14px">
        <label class="fld"><span>Company name</span><input class="inp" id="sName" value="${esc(s.companyName)}"></label>
        <label class="check" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="sWalk" ${s.allowWalkIn ? 'checked' : ''}><span style="font-size:14px">Allow walk-in candidates (no invitation required)</span></label>
        <label class="check" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="sFb" ${s.showCandidateFeedback ? 'checked' : ''}><span style="font-size:14px">Show candidate highlights on completion screen</span></label>
      </div></div>
      <div class="panel"><div class="panel-head"><div><h3>Scoring weights</h3><div class="sub">Adjust how each section contributes to the overall score</div></div></div><div class="panel-body" style="display:flex;flex-direction:column;gap:14px">
        ${Object.entries(s.weights).map(([k, v]) => `<label class="fld"><span>${k.charAt(0).toUpperCase() + k.slice(1)}: <b style="color:var(--brand-dark)">${v}%</b></span><input type="range" min="0" max="40" value="${v}" id="w-${k}"></label>`).join('')}
      </div></div></div>
      ${Store.mode === 'server' ? `<div class="panels"><div class="panel"><div class="panel-head"><div><h3>Resume screening</h3><div class="sub">Applicants submit the form first; only a good enough resume score gets the interview link${Store.serverInfo && Store.serverInfo.groq ? '' : ' · <span style="color:var(--bad)">GROQ_API_KEY missing: every application will wait for HR review</span>'}</div></div></div><div class="panel-body" style="display:flex;flex-direction:column;gap:14px">
        <label class="check" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="scEnabled" ${(s.screening && s.screening.enabled === false) ? '' : 'checked'}><span style="font-size:14px"><b>Require resume screening before the interview</b><br><span style="color:var(--muted)">When OFF, candidates go straight into the interview like before.</span></span></label>
        <label class="check" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="scPortal" ${(s.screening && s.screening.portalApply) ? 'checked' : ''}><span style="font-size:14px"><b>Public apply page on this server</b><br><span style="color:var(--muted)">OFF (pilot): applications come only from the Google Form and this site is invitation-only. ON (company server): visitors apply here with their resume.</span></span></label>
        <label class="fld"><span>Interview link is sent at or above: <b style="color:var(--brand-dark)" id="scPassV">${(s.screening && s.screening.pass) || 60}</b>%</span><input type="range" min="30" max="95" value="${(s.screening && s.screening.pass) || 60}" id="scPass"></label>
        <label class="fld"><span>Send to HR review from: <b style="color:var(--brand-dark)" id="scRevV">${(s.screening && s.screening.reviewFrom != null) ? s.screening.reviewFrom : 55}</b>% (up to the mark above). Below this, the application is not shortlisted and no email is sent.</span><input type="range" min="0" max="95" value="${(s.screening && s.screening.reviewFrom != null) ? s.screening.reviewFrom : 55}" id="scRev"></label>
      </div></div></div>` : ''}
      <div class="panels"><div class="panel"><div class="panel-head"><div><h3>SARAH voice follow-ups</h3><div class="sub">${Store.serverInfo && Store.serverInfo.groq ? '<span style="color:var(--good);font-weight:600">● Groq connected (' + esc(Store.serverInfo.groqModel || '') + ')</span>' : '<span style="color:var(--muted)">Not connected — set GROQ_API_KEY in server env to enable</span>'}</div></div></div><div class="panel-body" style="display:flex;flex-direction:column;gap:14px">
        <label class="check" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="fuEnabled" ${(s.followUps && s.followUps.enabled !== false) ? 'checked' : ''}><span style="font-size:14px"><b>Enable dynamic follow-up questions</b><br><span style="color:var(--muted)">When ON, SARAH decides whether to ask a brief follow-up after each answer. When OFF, interview stays purely scripted.</span></span></label>
        <label class="fld"><span>Max follow-ups per question: <b style="color:var(--brand-dark)" id="fuPerQV">${(s.followUps && s.followUps.perQuestion) || 1}</b></span><input type="range" min="0" max="2" value="${(s.followUps && s.followUps.perQuestion) || 1}" id="fuPerQ"></label>
        <label class="fld"><span>Max total follow-ups per interview: <b style="color:var(--brand-dark)" id="fuTotV">${(s.followUps && s.followUps.totalPerInterview) || 3}</b></span><input type="range" min="0" max="5" value="${(s.followUps && s.followUps.totalPerInterview) || 3}" id="fuTot"></label>
        <label class="fld"><span>Skip follow-up when candidate's answer is longer than: <b style="color:var(--brand-dark)" id="fuSkipV">${(s.followUps && s.followUps.skipIfWords) || 80}</b> words</span><input type="range" min="20" max="200" step="10" value="${(s.followUps && s.followUps.skipIfWords) || 80}" id="fuSkip"></label>
      </div></div></div>
      <div class="panels"><div class="panel"><div class="panel-head"><div><h3>Danger zone</h3><div class="sub">Irreversible actions</div></div></div><div class="panel-body" style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-outline" id="bExport">${I('download', 15)} Export all data</button>
        <button class="btn btn-danger" id="bClear">${I('trash', 15)} Clear all candidates, applications & invites</button>
      </div></div></div>
      <div class="panel"><div class="panel-body"><button class="btn btn-primary" id="saveS">${I('check', 15)} Save settings</button></div></div>`;
    ['scPass', 'scRev'].forEach((id) => { const el = $('#' + id); if (el) el.addEventListener('input', () => { $('#' + id.replace('Rev', 'Rev') + 'V').textContent = el.value; }); });
    ['fuPerQ', 'fuTot', 'fuSkip'].forEach((id) => { const el = $('#' + id); if (el) el.addEventListener('input', () => { $('#' + id + 'V').textContent = el.value; }); });
    $('#saveS').addEventListener('click', async () => {
      const w = {}; Object.keys(s.weights).forEach((k) => w[k] = +$('#w-' + k).value);
      const fu = { enabled: $('#fuEnabled').checked, perQuestion: +$('#fuPerQ').value, totalPerInterview: +$('#fuTot').value, skipIfWords: +$('#fuSkip').value };
      await Store.saveSettings({ companyName: $('#sName').value, allowWalkIn: $('#sWalk').checked, showCandidateFeedback: $('#sFb').checked, weights: w, followUps: fu, ...($('#scPass') ? { screening: { enabled: $('#scEnabled').checked, portalApply: $('#scPortal').checked, pass: +$('#scPass').value, reviewFrom: Math.min(+$('#scRev').value, +$('#scPass').value) } } : {}) });
      UI.toast('Settings saved', 'success');
    });
    $('#bExport').addEventListener('click', async () => {
      const all = await Store.exportAll();
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dvago-export-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    });
    $('#bClear').addEventListener('click', () => {
      modal(`<div class="m-head"><div class="m-ico bad">${I('alert', 20)}</div><div><h3>Clear everything?</h3><p>This will permanently delete all applications, candidates, interviews, invitations, resumes and recordings, so the same email can apply again. Positions, users, questions and settings are kept. This cannot be undone.</p></div></div><div class="m-foot"><button class="btn btn-outline" data-dismiss>Cancel</button><button class="btn btn-danger" id="confClear">Yes, clear all</button></div>`);
      $('#confClear').addEventListener('click', async () => { await Store.clearAll(); allData = []; data = []; UI.toast('All data cleared', 'success'); closeModal(); switchTab('dashboard'); });
      attachModalCloses();
    });
  }

  // ---------- Export CSV ----------
  function exportCSV() {
    const rows = [['Name', 'Email', 'Phone', 'Role', 'Category', 'City', 'Education', 'Experience', 'Current Company', 'Current Salary (PKR/mo)', 'Other Perks', 'Expected Salary (PKR/mo)', 'Score', 'Recommendation', 'Stage', 'Submitted']];
    data.forEach((d) => {
      const c = d.candidate;
      rows.push([c.fullName, c.email, c.phone, d.roleTitle, B.CATEGORIES[d.category]?.label, c.city, c.education, c.experience, c.employer, c.currentSalary, c.currentPerks, c.expectedSalary, d.evaluation?.overall || 0, d.evaluation?.recommendation || '', d.stage || 'New', d.completedAt]);
    });
    const csv = rows.map((r) => r.map((v) => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'dvago-candidates.csv'; a.click();
  }

  // ---------- Demo seed ----------
  async function doUnseed() {
    if (!window.DVAGO_DEMO || !window.confirm('Remove the sample (demo) candidates? Your real candidates are not touched.')) return;
    const r = await window.DVAGO_DEMO.unseed();
    UI.toast(`Removed ${r.removed} demo candidates`, 'success');
    await loadData();
    render();
  }
  async function doSeed() {
    if (!window.DVAGO_DEMO) return;
    const r = await window.DVAGO_DEMO.seed();
    UI.toast(r.created ? `Loaded ${r.created} demo candidates (your real candidates are unchanged)` : 'Demo data is already loaded', 'success');
    await loadData();
    render();
  }

  // ---------- Dropdown + modal ----------
  let menuOpen = null;
  function openMenu(e, items) {
    e.stopPropagation();
    closeMenu();
    const dd = $('#dd');
    dd.innerHTML = items.map((it, k) => it.sep ? `<div class="dd-sep"></div>` : `<button class="dd-item ${it.danger ? 'danger' : ''}" data-k="${k}">${I(it.icon, 15)}<span>${esc(it.label)}</span></button>`).join('');
    const r = e.currentTarget.getBoundingClientRect();
    dd.style.top = (r.bottom + 6) + 'px';
    dd.style.left = Math.max(10, r.right - 220) + 'px';
    dd.classList.remove('hidden');
    menuOpen = { items };
    $$('.dd-item').forEach((b, k) => b.addEventListener('click', () => { closeMenu(); items[b.dataset.k].fn(); }));
    setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
  }
  function closeMenu() { $('#dd').classList.add('hidden'); menuOpen = null; }

  function modal(html, cls = '') {
    const c = $('#mCard'); c.className = 'm-card ' + cls;
    c.innerHTML = html;
    $('#mBack').classList.remove('hidden');
    attachModalCloses();
  }
  function closeModal() { $('#mBack').classList.add('hidden'); }
  function attachModalCloses() {
    $$('[data-dismiss]').forEach((b) => b.addEventListener('click', closeModal));
    $('#mBack').onclick = (e) => { if (e.target.id === 'mBack') closeModal(); };
  }

  // Boot
  (async function () {
    await Store.init();
    if (Store.isLoggedIn()) showApp();
    else initLogin();
  })();
})();
