/* SARAH Evaluation Engine — rubric + NLP heuristics. Runs in the browser and in server.js. */
(function (root) {
  const BANK = (typeof module !== 'undefined' && module.exports) ? require('./questions.js') : root.DVAGO_BANK;

  const DEFAULT_SETTINGS = {
    weights: { voice: 15, sjt: 25, simulation: 10, case: 30, reasoning: 10, resume: 10 },
    thresholds: { strong: 80, hire: 65, consider: 50 }
  };

  const FILLERS = ['um', 'umm', 'uh', 'uhh', 'erm', 'hmm', 'like', 'you know', 'basically', 'actually', 'i mean', 'sort of', 'kind of', 'matlab', 'yani'];

  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const round = (v) => Math.round(v);
  const norm = (t) => ' ' + String(t || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ') + ' ';
  const words = (t) => (String(t || '').trim().match(/[\p{L}\p{N}'%]+/gu) || []);
  const hitAny = (text, kws) => kws.some((k) => text.includes(k.toLowerCase()));

  function countFillers(text) {
    const t = norm(text);
    let n = 0;
    FILLERS.forEach((f) => {
      const re = new RegExp('\\b' + f.replace(/ /g, '\\s+') + '\\b', 'g');
      n += (t.match(re) || []).length;
    });
    return n;
  }

  function scoreVoice(item, checks) {
    const text = [item.answer, item.followUp && item.followUp.answer].filter(Boolean).join(' ');
    const w = words(text).length;
    const t = norm(text);
    const hits = checks.filter((c) => hitAny(t, c.kw));
    const content = checks.length ? hits.length / checks.length : 0.5;
    let len = 0;
    if (w >= 40 && w <= 280) len = 1; else if (w > 280) len = 0.85; else if (w >= 20) len = 0.6; else if (w >= 8) len = 0.3; else len = 0.05;
    const fillers = countFillers(text);
    const fillerRate = w ? fillers / w : 0;
    const fluency = clamp(1 - fillerRate * 8, 0, 1);
    const score = w ? clamp(100 * (0.55 * content + 0.3 * len + 0.15 * fluency)) : 0;
    const dur = Number(item.durationSec || 0) + Number((item.followUp && item.followUp.durationSec) || 0);
    const wpm = item.mode === 'voice' && dur > 5 ? round(w / (dur / 60)) : null;
    return {
      id: item.id, q: item.q, mode: item.mode || 'text', words: w, fillers, wpm,
      covered: hits.map((h) => h.label), missed: checks.filter((c) => !hits.includes(c)).map((c) => c.label),
      score: round(score)
    };
  }

  function scoreCaseAnswer(text, q) {
    const t = norm(text);
    const w = words(text).length;
    const covered = q.rubric.filter((r) => hitAny(t, r.kw));
    const coverage = q.rubric.length ? covered.length / q.rubric.length : 0;
    let structure = 0;
    if (w >= 60) structure += 5;
    if (w >= 120) structure += 4;
    if (/(^|\n)\s*(\d+[.)]|[-•*])\s+/.test(text) || /\b(first|firstly|second|then|next|finally|after that)\b/i.test(text)) structure += 4;
    if (/\d/.test(text)) structure += 2;
    let score = coverage * 85 + structure;
    if (w < 20) score = Math.min(score, 30);
    if (w === 0) score = 0;
    const missed = q.rubric.filter((r) => !covered.includes(r));
    let feedback;
    if (!w) feedback = 'No answer provided.';
    else if (coverage >= 0.75) feedback = 'Strong, well-rounded answer covering most key points.';
    else if (coverage >= 0.45) feedback = 'Reasonable answer; some important considerations were missing.';
    else feedback = 'Limited answer; several critical points were not addressed.';
    return { id: q.id, words: w, score: round(clamp(score)), covered: covered.map((c) => c.point), missed: missed.map((m) => m.point), feedback };
  }

  function scoreSimulation(order, sim) {
    if (!order || !order.length) return { score: 0, distance: null };
    const n = sim.ideal.length;
    let diff = 0;
    sim.ideal.forEach((id, i) => { const p = order.indexOf(id); diff += Math.abs((p < 0 ? n : p) - i); });
    const max = Math.floor((n * n) / 2);
    return { score: round(clamp(100 * (1 - diff / max))), distance: diff, order, ideal: sim.ideal };
  }

  const EDU_LEVELS = [
    { k: ['pharm-d', 'pharm d', 'pharmd', 'doctor of pharmacy'], v: 5, label: 'Pharm-D' },
    { k: ['master', 'mba', 'm.com', 'msc', 'm.sc', 'mphil', 'ms '], v: 4, label: "Master's" },
    { k: ['bachelor', 'bba', 'b.com', 'bsc', 'b.sc', 'bs ', 'be ', 'b.e', 'bcs', 'graduat', 'acca', 'chartered'], v: 3, label: "Bachelor's" },
    { k: ['intermediate', 'fsc', 'f.sc', 'fa ', 'f.a', 'ics', 'i.com', 'a level', 'a-level', 'hssc'], v: 2, label: 'Intermediate' },
    { k: ['matric', 'o level', 'o-level', 'ssc'], v: 1, label: 'Matric' }
  ];

  function analyzeResume(text, roleKey) {
    const raw = String(text || '');
    const t = norm(raw);
    const role = BANK.ROLES[roleKey];
    const email = (raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0] || '';
    const phone = ((raw.match(/(\+92|0092|0)?\s?3\d{2}[\s-]?\d{7}/) || [])[0] || '').replace(/\s/g, '');
    let years = null;
    const ym = raw.match(/(\d{1,2})\s*\+?\s*(years|yrs|year)/i);
    if (ym) years = Number(ym[1]);
    if (years === null) {
      const yrs = (raw.match(/\b(19|20)\d{2}\b/g) || []).map(Number).filter((y) => y <= new Date().getFullYear());
      if (yrs.length >= 2) years = clamp(Math.max(...yrs) - Math.min(...yrs), 0, 40);
    }
    let edu = null;
    // Whole-word match; very short abbreviations (CA, BS, FA, MS, BE) are too ambiguous in lower case.
    const eduHit = (k) => {
      const kk = k.trim();
      if (kk.length <= 2) return false;
      return new RegExp('(^|[^a-z0-9])' + kk.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z0-9])').test(t);
    };
    for (const e of EDU_LEVELS) if (e.k.some(eduHit)) { edu = e; break; }
    let name = '';
    const NOT_NAME = /\b(resume|curriculum|vitae|cv|analyst|manager|engineer|developer|designer|officer|executive|assistant|pharmacist|accountant|administrator|supervisor|specialist|consultant|intern|director|coordinator|technician|profile|summary|objective|contact|experience|education|skills|projects|data|science|software|marketing|sales|finance|banking|business|pharmacy|store|cashier|clerk|teacher|nurse|doctor|about|me|references|declaration|personal|details|information|career|work)\b/i;
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 15);
    for (let l of lines) {
      // Letter-spaced names (Canva style): "A B D U L   H A F E E Z" -> "ABDUL HAFEEZ"
      const toks = l.split(/\s+/);
      if (toks.length >= 4 && toks.every((p) => /^[A-Za-z]$/.test(p)) && /\s{2,}/.test(l)) {
        l = l.split(/\s{2,}/).map((w) => w.replace(/\s+/g, '')).join(' ');
      }
      if (/@|\d|[|·•:/\\]/.test(l) || NOT_NAME.test(l)) continue;
      const parts = l.split(/\s+/);
      if (parts.length >= 2 && parts.length <= 4 && parts.every((p) => /^[A-Za-z.'-]{2,}$/.test(p))) {
        name = l.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      }
    }
    const skillPool = role ? role.skills : [];
    const matched = skillPool.filter((s) => {
      const k = s.toLowerCase();
      return k.length > 4 ? t.includes(k) : new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z0-9])').test(t);
    });
    const missing = skillPool.filter((s) => !matched.includes(s)).slice(0, 6);
    return { name, email, phone, years, education: edu ? edu.label : null, eduLevel: edu ? edu.v : 0, skillsMatched: matched, skillsMissing: missing, words: words(raw).length };
  }

  const EXP_YEARS = { 'Fresh / No experience': 0, 'Less than 1 year': 0.5, '1 – 2 years': 1.5, '3 – 5 years': 4, '5 – 10 years': 7, '10+ years': 12 };

  function scoreResume(sub) {
    const roleKey = sub.role;
    const corporate = BANK.ROLES[roleKey] && BANK.ROLES[roleKey].category === 'corporate';
    const manager = roleKey === 'store-manager';
    const formYears = EXP_YEARS[(sub.candidate || {}).experience];
    if (!sub.resume || !sub.resume.text) {
      return { score: 40, present: false, skillsMatched: [], skillsMissing: [], years: formYears == null ? null : formYears, note: 'No resume text available' };
    }
    const a = analyzeResume(sub.resume.text, roleKey);
    const pool = (BANK.ROLES[roleKey] || { skills: [] }).skills.length || 1;
    const matchRatio = clamp(a.skillsMatched.length / Math.max(4, pool * 0.4), 0, 1);
    const years = a.years != null ? a.years : formYears;
    const need = manager ? 4 : corporate ? 1.5 : 0;
    const expFit = years == null ? 0.5 : clamp(need === 0 ? 0.7 + years * 0.1 : years / need, 0, 1);
    const eduNeed = corporate ? 3 : manager ? 3 : 1;
    const eduFit = a.eduLevel ? clamp(a.eduLevel / eduNeed, 0, 1) : 0.5;
    const score = 15 + 45 * matchRatio + 22 * expFit + 18 * eduFit;
    return { score: round(clamp(score)), present: true, skillsMatched: a.skillsMatched, skillsMissing: a.skillsMissing, years, education: a.education };
  }

  function integrityReport(integ) {
    integ = integ || {};
    const tab = integ.tabSwitches || 0, fs = integ.fullscreenExits || 0, paste = integ.pasteAttempts || 0;
    const score = clamp(100 - tab * 12 - fs * 6 - paste * 10);
    const level = score >= 85 ? 'High' : score >= 60 ? 'Medium' : 'Low';
    return { score: round(score), level, tabSwitches: tab, fullscreenExits: fs, pasteAttempts: paste, events: (integ.events || []).slice(0, 200) };
  }

  const STRENGTH_TEXT = {
    decision: 'Makes sound, policy-aware decisions under pressure',
    problem: 'Structured, analytical problem solver',
    customer: 'Strong customer empathy and service instinct',
    communication: 'Clear and confident communicator',
    integrity: 'Strong ethical judgement and compliance mindset',
    leadership: 'Takes ownership and thinks like a leader',
    role: 'Solid understanding of the role and pharmacy context'
  };
  const CONCERN_TEXT = {
    decision: 'Decision-making in grey areas needs development',
    problem: 'Analytical depth was limited in problem-solving tasks',
    customer: 'Customer-handling approach may need coaching',
    communication: 'Communication was brief or unclear in places',
    integrity: 'Some answers showed risk-tolerant choices on compliance',
    leadership: 'Limited evidence of ownership / leadership behaviours',
    role: 'Role-specific knowledge appears limited'
  };
  const FOLLOW_UPS = {
    decision: 'Tell me about a decision you made with incomplete information. What did you weigh up?',
    problem: 'Walk me through how you would analyse a sudden 20% drop in a key metric.',
    customer: 'Describe the most difficult customer you have served. What exactly did you say?',
    communication: 'Explain a complex process you know well as if I were a new joiner.',
    integrity: 'Have you ever been asked to bend a rule? What did you do?',
    leadership: 'Give an example of when you took responsibility for something outside your job description.',
    role: 'What do you think are the three most important daily routines in this role?'
  };

  function recommendationFor(score, thresholds, integrityLevel) {
    let rec = score >= thresholds.strong ? 'Strong Hire' : score >= thresholds.hire ? 'Hire' : score >= thresholds.consider ? 'Consider' : 'Not Recommended';
    if (integrityLevel === 'Low' && (rec === 'Strong Hire' || rec === 'Hire')) rec = 'Consider';
    return rec;
  }

  function finalize(ev, sub, settings) {
    settings = mergeSettings(settings);
    const w = settings.weights;
    let sum = 0, tw = 0;
    Object.keys(w).forEach((k) => {
      const s = ev.sections[k];
      if (s && typeof s.score === 'number') { sum += s.score * w[k]; tw += w[k]; }
    });
    ev.overall = tw ? round(sum / tw) : 0;
    ev.recommendation = recommendationFor(ev.overall, settings.thresholds, ev.integrity.level);

    const comps = Object.entries(ev.competencies).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
    const strengths = comps.filter(([, v]) => v >= 70).slice(0, 3).map(([k]) => STRENGTH_TEXT[k]);
    const weak = comps.filter(([, v]) => v < 55).slice(-3).reverse();
    const concerns = weak.map(([k]) => CONCERN_TEXT[k]);
    if (!ev.sections.resume.present) concerns.push('No resume was provided');
    if (ev.integrity.level !== 'High') concerns.push(`Proctoring flagged ${ev.integrity.tabSwitches} tab switch(es) and ${ev.integrity.pasteAttempts} paste attempt(s)`);
    if (ev.sections.voice.avgWords != null && ev.sections.voice.avgWords < 25) concerns.push('Voice answers were very short');

    const followUps = (weak.length ? weak : comps.slice(-2)).map(([k]) => FOLLOW_UPS[k]).slice(0, 3);
    const name = (sub.candidate && sub.candidate.fullName) || 'The candidate';
    const top = comps.slice(0, 2).map(([k]) => BANK.COMPETENCIES[k].label.toLowerCase());
    const low = weak.slice(0, 1).map(([k]) => BANK.COMPETENCIES[k].label.toLowerCase());
    const summary = `${name.split(' ')[0]} scored ${ev.overall}/100 for ${sub.roleTitle || 'the role'} — ${ev.recommendation}. ` +
      (top.length ? `Strongest areas: ${top.join(' and ')}. ` : '') +
      (low.length ? `Main development area: ${low[0]}. ` : '') +
      `Case study ${ev.sections.case.score}/100, decision scenarios ${ev.sections.sjt.score}/100, communication ${ev.sections.voice.score}/100. Integrity confidence: ${ev.integrity.level}.`;

    if (!ev.ai) {
      ev.strengths = strengths.length ? strengths : ['Completed all sections of the assessment'];
      ev.concerns = concerns;
      ev.followUps = followUps;
      ev.summary = summary;
    }
    ev.evaluatedAt = new Date().toISOString();
    return ev;
  }

  function mergeSettings(s) {
    s = s || {};
    return {
      weights: Object.assign({}, DEFAULT_SETTINGS.weights, s.weights || {}),
      thresholds: Object.assign({}, DEFAULT_SETTINGS.thresholds, s.thresholds || {})
    };
  }

  // rqOverride: the exact question set the interview used (position-specific questions); falls back to the saved copy, then the department bank.
  function evaluate(sub, settings, rqOverride) {
    const rq = rqOverride || sub.qset || BANK.roleQuestions(sub.role);
    if (!rq) throw new Error('Unknown role ' + sub.role);
    const ans = sub.answers || {};
    const acc = {};
    const add = (comps, v, wt = 1) => (comps || []).forEach((c) => { acc[c] = acc[c] || { s: 0, n: 0 }; acc[c].s += v * wt; acc[c].n += wt; });

    // Voice
    const voiceItems = (sub.voice || []).map((v) => {
      const def = rq.voice.find((d) => d.id === v.id) || { checks: [] };
      return Object.assign(scoreVoice(Object.assign({}, v, { q: def.q || v.q }), def.checks), { answer: v.answer, followUp: v.followUp || null });
    });
    const voiceScore = voiceItems.length ? round(voiceItems.reduce((s, v) => s + v.score, 0) / voiceItems.length) : 0;
    const wpmVals = voiceItems.map((v) => v.wpm).filter(Boolean);
    add(['communication'], voiceScore, 2);

    // SJT
    const sjtSel = ans.sjt || {};
    const sjtItems = rq.sjt.map((q) => {
      const idx = sjtSel[q.id];
      const opt = idx != null ? q.options[idx] : null;
      const best = q.options.reduce((b, o, i) => (o.s > q.options[b].s ? i : b), 0);
      const s = opt ? (opt.s / 3) * 100 : 0;
      add(q.comp, s);
      return { id: q.id, title: q.title, selected: idx == null ? null : idx, best, points: opt ? opt.s : 0, score: round(s) };
    });
    const sjtScore = round(sjtItems.reduce((s, i) => s + i.score, 0) / sjtItems.length);

    // Simulation
    const sim = scoreSimulation(ans.simulation, rq.simulation);
    add(['decision'], sim.score);
    add([sub.role === 'store-manager' ? 'leadership' : 'role'], sim.score, 0.5);

    // Case
    const caseText = ans.case || {};
    const caseItems = rq.caseStudy.questions.map((q) => {
      const r = scoreCaseAnswer(caseText[q.id] || '', q);
      add(q.comp, r.score, 1.5);
      r.mode = (ans.caseMode || {})[q.id] || 'text';
      return r;
    });
    const caseScore = round(caseItems.reduce((s, i) => s + i.score, 0) / caseItems.length);
    add(['communication'], caseScore, 0.5);

    // Reasoning + game
    const rsel = ans.reasoning || {};
    let correct = 0;
    const rItems = rq.reasoning.map((q) => {
      const ok = rsel[q.id] === q.answer;
      if (ok) correct++;
      add(q.comp, ok ? 100 : 0, 0.5);
      return { id: q.id, selected: rsel[q.id] == null ? null : rsel[q.id], correct: ok };
    });
    const mcq = (correct / rq.reasoning.length) * 100;
    const g = ans.game;
    let gameScore = null;
    if (g && g.targets) {
      gameScore = round(clamp(((g.hits - 0.5 * (g.falsePositives || 0)) / g.targets) * 100));
      add(['role', 'problem'], gameScore, 0.5);
    }
    const reasoningScore = round(gameScore == null ? mcq : 0.7 * mcq + 0.3 * gameScore);

    // Resume
    const resume = scoreResume(sub);
    add(['role'], resume.score, 0.7);

    const competencies = {};
    Object.keys(BANK.COMPETENCIES).forEach((k) => { competencies[k] = acc[k] ? round(acc[k].s / acc[k].n) : null; });

    const ev = {
      engine: 'SARAH Rubric Engine 2.0',
      ai: null,
      sections: {
        voice: { score: voiceScore, items: voiceItems, avgWpm: wpmVals.length ? round(wpmVals.reduce((a, b) => a + b, 0) / wpmVals.length) : null, avgWords: voiceItems.length ? round(voiceItems.reduce((s, v) => s + v.words, 0) / voiceItems.length) : null },
        sjt: { score: sjtScore, items: sjtItems },
        simulation: sim,
        case: { score: caseScore, items: caseItems },
        reasoning: { score: reasoningScore, correct, total: rq.reasoning.length, items: rItems, game: g ? Object.assign({}, g, { score: gameScore }) : null },
        resume
      },
      competencies,
      integrity: integrityReport(sub.integrity)
    };
    return finalize(ev, sub, settings);
  }

  const API = { evaluate, finalize, analyzeResume, scoreCaseAnswer, mergeSettings, recommendationFor, DEFAULT_SETTINGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DIA_EVAL = API;
})(typeof window !== 'undefined' ? window : globalThis);
