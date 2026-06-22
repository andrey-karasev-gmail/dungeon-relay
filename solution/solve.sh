#!/bin/sh
# Oracle: replace legacy file reads in runner.js with API calls.

set -e

cat > /app/runner.js << 'RUNNER'
'use strict';
const http = require('http');
const rl   = require('readline').createInterface({ input: process.stdin, terminal: false });

function collectLines() {
  return new Promise(resolve => {
    const lines = [];
    rl.on('line', l => lines.push(l));
    rl.once('close', () => resolve(lines));
  });
}

function apiPost(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = http.request(
      { hostname: '127.0.0.1', port: 3000, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      res => { let buf = ''; res.on('data', c => (buf += c)); res.on('end', () => resolve(JSON.parse(buf))); }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const [init, allLines] = await Promise.all([apiPost('/api/init', {}), collectLines()]);
  let { sessionId, state } = init;

  for (const rawLine of allLines) {
    const command = rawLine.trim();
    if (!command) continue;

    const result = await apiPost('/api/command', { sessionId, command });
    state = result.state;
    console.log(JSON.stringify(result.output));
  }
}

main().catch(e => { process.stderr.write(e.message + '\n'); process.exit(1); });
RUNNER
