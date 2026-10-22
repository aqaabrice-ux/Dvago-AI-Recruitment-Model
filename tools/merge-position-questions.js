// Merges extra seed files made by parallel workers into position-questions-seed.json (existing entries win).
const fs = require('fs'), path = require('path');
const main = path.join(__dirname, '..', 'position-questions-seed.json');
let seed = {}; try { seed = JSON.parse(fs.readFileSync(main, 'utf8')); } catch (e) {}
let n = 0;
process.argv.slice(2).forEach((f) => { try { Object.entries(JSON.parse(fs.readFileSync(f, 'utf8'))).forEach(([k, v]) => { if (!seed[k]) { seed[k] = v; n++; } }); } catch (e) { console.log('skip', f, e.message); } });
fs.writeFileSync(main, JSON.stringify(seed));
console.log(`merged ${n} new, total ${Object.keys(seed).length}`);
