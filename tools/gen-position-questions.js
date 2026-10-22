/*
 * Pre-generates JD-based interview questions for every default position and writes position-questions-seed.json.
 *   node tools/gen-position-questions.js           (skips positions already in the seed; safe to re-run / resume)
 *   node tools/gen-position-questions.js --force   (regenerate everything)
 * Needs GROQ_API_KEY in .env. Run it whenever the real JDs are loaded; the server also has a "Generate from JD" button per position.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
try {
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/).forEach((l) => {
    l = l.trim(); if (!l || l[0] === '#') return; const i = l.indexOf('='); if (i < 1) return;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); if (process.env[k] === undefined) process.env[k] = v;
  });
} catch (e) {}
if (!process.env.GROQ_API_KEY) { console.error('GROQ_API_KEY missing in .env'); process.exit(1); }

const BANK = require('../js/questions.js');
const posq = require('../posq.js');
const arg = (n) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : ''; };
const MAIN = path.join(ROOT, 'position-questions-seed.json');
const OUT = arg('out') ? path.resolve(arg('out')) : MAIN;   // a second worker can write its own file (--out=...) and be merged with tools/merge-position-questions.js
const MODELS = [arg('model'), process.env.GROQ_MODEL, 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'].filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dead = new Set();

async function chat(messages, opts) {
  let lastErr;
  for (const model of MODELS) {
    if (dead.has(model)) continue;
    for (let tries = 0; tries < 6; tries++) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.GROQ_API_KEY },
        body: JSON.stringify({ model, messages, temperature: opts.temperature, max_tokens: opts.maxTokens })
      });
      const body = await res.text();
      if (res.ok) { const j = JSON.parse(body); return { text: (j.choices[0].message || {}).content || '', model }; }
      if (res.status === 429) {
        const m = body.match(/try again in ([\d.]+)(ms|s|m)/i); let wait = 20000;
        if (m) wait = Math.ceil(parseFloat(m[1]) * (m[2] === 'ms' ? 1 : m[2] === 's' ? 1000 : 60000)) + 1500;
        if (/per day|TPD/i.test(body)) { console.log('  daily limit on', model, '-> next model'); dead.add(model); break; }
        console.log(`  rate limit (${model}); waiting ${Math.round(wait / 1000)}s`); await sleep(Math.min(wait, 90000)); continue;
      }
      if (res.status === 404 || res.status === 400) { lastErr = Object.assign(new Error(body.slice(0, 120)), { status: res.status }); dead.add(model); break; }
      lastErr = Object.assign(new Error('Groq ' + res.status + ' ' + body.slice(0, 120)), { status: res.status });
      if (res.status === 401) throw lastErr;
      await sleep(4000);
    }
  }
  throw lastErr || new Error('all models failed');
}

(async () => {
  const force = process.argv.includes('--force');
  let seed = {}; try { seed = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  const deptName = (k) => (BANK.DEPARTMENTS.find((d) => d.key === k) || {}).name || k;
  const list = [];
  Object.entries(BANK.DEFAULT_POSITIONS).forEach(([k, arr]) => arr.forEach((p) => list.push({ roleKey: k, id: p.id, title: p.title, jd: p.jd })));
  if (process.argv.includes('--reverse')) list.reverse();   // run two workers from opposite ends to use two models' rate limits at once
  console.log(`${list.length} positions, ${Object.keys(seed).length} already done${force ? ' (forcing)' : ''}`);
  let done = 0, failed = [];
  for (const p of list) {
    let other = {}; try { other = JSON.parse(fs.readFileSync(MAIN, 'utf8')); } catch (e) {}   // skip what another worker already finished
    if (!force && (seed[p.id] || other[p.id])) continue;
    const t0 = Date.now();
    try {
      seed[p.id] = await posq.generate({ dept: deptName(p.roleKey), title: p.title, jd: p.jd, id: p.id }, chat);
      fs.writeFileSync(OUT, JSON.stringify(seed));
      done++; console.log(`[${Object.keys(seed).length}/${list.length}] ${p.id} ok (${Math.round((Date.now() - t0) / 1000)}s, ${seed[p.id].model})`);
    } catch (e) { failed.push(p.id); console.log(`[x] ${p.id}: ${e.message}`); }
    await sleep(1500);
  }
  console.log(`done: ${done} generated, ${failed.length} failed`, failed.length ? failed.join(', ') : '');
})();
