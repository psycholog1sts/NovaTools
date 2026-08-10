#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';

const root = process.cwd();
const files = [
  '.env.example',
  ...globSync([
    '*.html',
    'src/**/*.{js,mjs,ts,tsx,html}',
    'public/**/*.{js,mjs,ts,tsx,html}',
    'functions/**/*.{js,mjs,ts,tsx}'
  ], {
    cwd: root,
    nodir: true
  })
];

const failures = [];
const forbiddenEnvName = /\bVITE_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|SERVICE_KEY)\b/g;
const forbiddenRuntimeEnvName = /^VITE_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|SERVICE_KEY)$/i;
const literalSecretKey = /\bsb_secret_[A-Za-z0-9_-]+\b/g;

for (const name of Object.keys(process.env)) {
  if (forbiddenRuntimeEnvName.test(name)) {
    failures.push(`process.env: forbidden client secret variable name ${name}`);
  }
}

for (const relative of [...new Set(files)].sort()) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');

  const envMatches = [...text.matchAll(forbiddenEnvName)].map((match) => match[0]);
  if (envMatches.length) {
    failures.push(`${relative}: forbidden client env name(s): ${[...new Set(envMatches)].join(', ')}`);
  }

  if (literalSecretKey.test(text)) {
    failures.push(`${relative}: contains a Supabase secret-key literal`);
  }
  literalSecretKey.lastIndex = 0;
}

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const required of ['VITE_SUPABASE_URL=', 'VITE_SUPABASE_PUBLISHABLE_KEY=']) {
  if (!envExample.includes(required)) failures.push(`.env.example: missing ${required}`);
}

if (failures.length) {
  console.error('Client environment safety audit: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Client environment safety audit: PASS (${files.length} client-facing files checked)`);
