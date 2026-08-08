// build.js
// Build-time injection of Vercel env vars into the static frontend.
//
// Replaces the __TELEMETRY_WEBHOOK_URL__ placeholder in public/app.js with the
// real webhook URL from the NEXT_PUBLIC_TELEMETRY_WEBHOOK_URL env var at build
// time, so the secret never lives in the git repo.
//
// If the env var is unset, it injects an empty string — public/app.js already
// guards with `if (!TELEMETRY_WEBHOOK_URL) return;`, so telemetry is skipped.
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'public', 'app.js');
const webhook = process.env.NEXT_PUBLIC_TELEMETRY_WEBHOOK_URL || '';

const src = fs.readFileSync(target, 'utf8');
const out = src.split('__TELEMETRY_WEBHOOK_URL__').join(webhook);

if (out !== src) {
    fs.writeFileSync(target, out);
    console.log('[build] injected NEXT_PUBLIC_TELEMETRY_WEBHOOK_URL (len=' + webhook.length + ')');
} else {
    console.log('[build] placeholder not found; nothing to inject');
}
