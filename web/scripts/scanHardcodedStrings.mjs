#!/usr/bin/env node
// 9.8: "ודא זאת בסריקה אוטומטית" — reports which .jsx files still contain Hebrew text outside
// comments (a proxy for "not yet migrated to i18n/translations.js"). Not a hard gate (some
// Hebrew is legitimate — seller-entered content, dead flight-world files never reached by any
// route), just an honest, rerunnable measure of remaining i18n coverage. Run: `node
// web/scripts/scanHardcodedStrings.mjs` from the repo root.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const files = execSync("find web/src -name '*.jsx'").toString().trim().split('\n').filter(Boolean);
const HEBREW_RE = /[֐-׿]/;
const results = [];

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (HEBREW_RE.test(line)) count++;
  }
  if (count > 0) results.push({ file: f, lines: count });
}

results.sort((a, b) => b.lines - a.lines);
console.log(`${results.length} / ${files.length} .jsx files contain Hebrew text outside comments:\n`);
for (const r of results) console.log(`${String(r.lines).padStart(4)}  ${r.file}`);
console.log(`\nNote: this includes legitimate cases (seller-entered content, dead/unrouted flight-world files) alongside real gaps — cross-check against main.jsx's route list before treating a file as "needs translation".`);
