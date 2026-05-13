#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';
const DEFAULT_SEND_LIMIT = 200;

function parseArgs(argv) {
  const options = {
    input: 'site-links.txt',
    type: 'URL_UPDATED',
    limit: null,
    offset: 0,
    delayMs: 250,
    send: false,
    dryRun: true,
  };

  for (const arg of argv) {
    if (arg === '--send') {
      options.send = true;
      options.dryRun = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
      options.send = false;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--input=')) {
      options.input = arg.slice('--input='.length);
    } else if (arg.startsWith('--type=')) {
      options.type = arg.slice('--type='.length);
    } else if (arg.startsWith('--limit=')) {
      options.limit = Number.parseInt(arg.slice('--limit='.length), 10);
    } else if (arg.startsWith('--offset=')) {
      options.offset = Number.parseInt(arg.slice('--offset='.length), 10);
    } else if (arg.startsWith('--delay-ms=')) {
      options.delayMs = Number.parseInt(arg.slice('--delay-ms='.length), 10);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!['URL_UPDATED', 'URL_DELETED'].includes(options.type)) {
    throw new Error('--type must be URL_UPDATED or URL_DELETED.');
  }

  for (const key of ['limit', 'offset', 'delayMs']) {
    if (options[key] !== null && (!Number.isInteger(options[key]) || options[key] < 0)) {
      throw new Error(`--${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)} must be a non-negative integer.`);
    }
  }

  if (options.send && options.limit === null) {
    options.limit = DEFAULT_SEND_LIMIT;
  }

  return options;
}

function printHelp() {
  console.log(`Google Indexing API helper\n\nUsage:\n  node indexing.cjs --dry-run [--input=site-links.txt]\n  node indexing.cjs --send --input=site-links.txt --limit=200 [--offset=0] [--delay-ms=250]\n\nCredentials:\n  Set GOOGLE_INDEXING_KEY to the full service-account JSON string, or\n  set GOOGLE_INDEXING_KEY_FILE to a local JSON file path. Never commit that JSON file.\n\nImportant:\n  Google's official Indexing API documentation limits this API to JobPosting pages\n  and livestream pages with BroadcastEvent in VideoObject structured data. Use the\n  sitemap submission flow as the primary, policy-aligned discovery mechanism.\n`);
}

function readUrls(inputPath) {
  const resolvedPath = path.resolve(ROOT_DIR, inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input URL list not found: ${inputPath}`);
  }

  const urls = fs.readFileSync(resolvedPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const invalidUrl = urls.find((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol !== 'https:';
    } catch {
      return true;
    }
  });

  if (invalidUrl) {
    throw new Error(`Invalid or non-HTTPS URL in ${inputPath}: ${invalidUrl}`);
  }

  return urls;
}

function readCredentials() {
  const rawKey = process.env.GOOGLE_INDEXING_KEY;
  const keyFile = process.env.GOOGLE_INDEXING_KEY_FILE;

  if (!rawKey && !keyFile) {
    throw new Error('Missing Google credentials. Set GOOGLE_INDEXING_KEY or GOOGLE_INDEXING_KEY_FILE.');
  }

  const keyJson = rawKey || fs.readFileSync(path.resolve(ROOT_DIR, keyFile), 'utf8');
  const credentials = JSON.parse(keyJson);

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Service-account JSON must include client_email and private_key.');
  }

  return {
    clientEmail: credentials.client_email,
    privateKey: credentials.private_key.replace(/\\n/g, '\n'),
  };
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function signJwt({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: INDEXING_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsignedToken).sign(privateKey, 'base64url');
  return `${unsignedToken}.${signature}`;
}

async function getAccessToken(credentials) {
  const assertion = signJwt(credentials);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('OAuth token response did not include access_token.');
  }

  return data.access_token;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publishUrl({ accessToken, url, type }) {
  const response = await fetch(PUBLISH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, type }),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  return payload;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const allUrls = readUrls(options.input);
  const selectedUrls = allUrls.slice(options.offset, options.limit === null ? undefined : options.offset + options.limit);

  console.log(`Loaded ${allUrls.length} URLs from ${options.input}.`);
  console.log(`Selected ${selectedUrls.length} URLs (offset=${options.offset}, limit=${options.limit ?? 'none'}).`);

  if (options.dryRun) {
    console.log('Dry run only. Add --send to publish URL_UPDATED notifications.');
    selectedUrls.slice(0, 10).forEach((url) => console.log(`DRY_RUN ${options.type}: ${url}`));
    if (selectedUrls.length > 10) console.log(`...and ${selectedUrls.length - 10} more URLs.`);
    return;
  }

  const credentials = readCredentials();
  const accessToken = await getAccessToken(credentials);
  let ok = 0;
  let failed = 0;

  for (const [index, url] of selectedUrls.entries()) {
    try {
      await publishUrl({ accessToken, url, type: options.type });
      ok += 1;
      console.log(`OK ${options.offset + index + 1}/${allUrls.length}: ${url}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${options.offset + index + 1}/${allUrls.length}: ${url}`);
      console.error(error.message);
    }

    if (options.delayMs > 0 && index < selectedUrls.length - 1) {
      await sleep(options.delayMs);
    }
  }

  console.log(`Finished. Sent=${ok}, Failed=${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
