'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const rl   = require('readline').createInterface({ input: process.stdin, terminal: false });

function loadRoomFromFile(roomId) {
  const file = path.join('/app/legacy_rooms', `${roomId}.txt`);
  const raw  = fs.readFileSync(file, 'utf8');
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

  let roomInfo = loadRoomFromFile(state.currentRoom);

  for (const rawLine of allLines) {
    const command = rawLine.trim();
    if (!command) continue;

    if (command.startsWith('go ') || command.startsWith('use ')) {
      const direction = command.split(/\s+/).pop();
      roomInfo = loadRoomFromFile(state.currentRoom);
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
