'use strict';
/**
 * DungeonRelay runner — partially migrated to the local API.
 *
 * The two loadRoomFromFile() calls below still open legacy_rooms/*.txt.
 * Replace them with calls to GET /api/room?id=<roomId> so the runner uses
 * the API as its sole source of room data.
 *
 * See docs/API.md for the full API reference.
 * Run the API server first:  node api/server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const rl   = require('readline').createInterface({ input: process.stdin, terminal: false });

// ── LEGACY room loader ────────────────────────────────────────────────────────
// Reads room data directly from legacy_rooms/<id>.txt.
// TODO: remove this function — use GET /api/room?id=<id> instead.
function loadRoomFromFile(roomId) {
  const file = path.join('/app/legacy_rooms', `${roomId}.txt`);
  const raw  = fs.readFileSync(file, 'utf8');   // opens legacy_rooms/<id>.txt
  const room = { id: roomId, exits: {}, items: [], rules: {} };
  for (const line of raw.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (line.startsWith('NAME:'))  room.name = line.slice(5).trim();
    if (line.startsWith('DESC:'))  room.description = line.slice(5).trim();
    if (line.startsWith('ITEMS:')) room.items = line.slice(6).trim().split(' ').filter(Boolean);
    if (line.startsWith('EXITS:')) {
      for (const pair of line.slice(6).trim().split(' ')) {
        const [dir, dest] = pair.split('=');
        if (dir && dest) room.exits[dir] = dest;
      }
    }
  }
  return room;
}
// ─────────────────────────────────────────────────────────────────────────────

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

  // LEGACY: load initial room from file to validate exits before first command.
  // TODO: replace with GET /api/room?id=<id>
  let roomInfo = loadRoomFromFile(state.currentRoom);   // ← opens legacy_rooms/*.txt

  for (const rawLine of allLines) {
    const command = rawLine.trim();
    if (!command) continue;

    // LEGACY: pre-validate direction exits against the file before calling API.
    // TODO: remove this block — the API already handles invalid directions.
    if (command.startsWith('go ') || command.startsWith('use ')) {
      const direction = command.split(/\s+/).pop();
      roomInfo = loadRoomFromFile(state.currentRoom);   // ← opens legacy_rooms/*.txt
      if (command.startsWith('go ') && !roomInfo.exits[direction]) {
        console.log(JSON.stringify({ command, room: state.currentRoom, description: roomInfo.description,
          exits: Object.keys(roomInfo.exits), items: roomInfo.items, inventory: state.inventory,
          message: `There is no exit to the ${direction}.` }));
        continue;
      }
    }

    const result = await apiPost('/api/command', { sessionId, command });
    state = result.state;
    console.log(JSON.stringify(result.output));
  }
}

main().catch(e => { process.stderr.write(e.message + '\n'); process.exit(1); });
