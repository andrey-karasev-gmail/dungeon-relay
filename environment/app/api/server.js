'use strict';
const express = require('express');
const app = express();
app.use(express.json());

const ROOMS = {
  entrance: {
    id: 'entrance',
    name: 'Entrance Hall',
    description: 'You stand in the dim entrance hall of Castle DungeonRelay. A brass key glints on the stone floor.',
    exits: { north: 'corridor' },
    items: ['brass_key'],
    rules: { north: 'brass_key' },
  },
  corridor: {
    id: 'corridor',
    name: 'Stone Corridor',
    description: 'A narrow stone corridor stretches between the entrance and the vault. Torches flicker on damp walls.',
    exits: { north: 'vault', south: 'entrance' },
    items: [],
    rules: {},
  },
  vault: {
    id: 'vault',
    name: 'The Vault',
    description: 'You have reached the vault! Ancient gold coins lie scattered across the stone floor.',
    exits: { south: 'corridor' },
    items: ['gold_coin'],
    rules: {},
  },
};

const sessions = {};

function newSession() {
  const id = Math.random().toString(36).slice(2);
  sessions[id] = {
    currentRoom: 'entrance',
    inventory: [],
    roomItems: {
      entrance: [...ROOMS.entrance.items],
      corridor: [...ROOMS.corridor.items],
      vault: [...ROOMS.vault.items],
    },
  };
  return id;
}

// POST /api/init  — start a new game session
app.post('/api/init', (req, res) => {
  const sessionId = newSession();
  const s = sessions[sessionId];
  res.json({ sessionId, state: { sessionId, currentRoom: s.currentRoom, inventory: s.inventory } });
});

// GET /api/room?id=<roomId>  — fetch static room data (exits, name, description)
app.get('/api/room', (req, res) => {
  const room = ROOMS[req.query.id];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// POST /api/command  — execute one command, return output + updated state
app.post('/api/command', (req, res) => {
  const { sessionId, command } = req.body;
  if (!sessions[sessionId]) return res.status(400).json({ error: 'Unknown session' });

  const s = sessions[sessionId];
  const room = ROOMS[s.currentRoom];
  const liveItems = s.roomItems[s.currentRoom];
  const parts = command.trim().split(/\s+/);
  const verb = parts[0];

  let message = '';
  let moved = false;

  if (verb === 'look') {
    message = room.description;
  } else if (verb === 'take') {
    const item = parts[1];
    const idx = liveItems.indexOf(item);
    if (idx !== -1) {
      liveItems.splice(idx, 1);
      s.inventory.push(item);
      message = `You pick up the ${item}.`;
    } else {
      message = `There is no ${item} here.`;
    }
  } else if (verb === 'go' || verb === 'use') {
    const direction = parts[verb === 'use' ? 2 : 1];
    const requiredItem = room.rules[direction];
    if (requiredItem && !s.inventory.includes(requiredItem)) {
      message = `The way ${direction} is locked. You need the ${requiredItem}.`;
    } else if (!room.exits[direction]) {
      message = `There is no exit to the ${direction}.`;
    } else {
      if (verb === 'use') message = `You use the ${parts[1]} to unlock the way ${direction} and pass through.`;
      else message = `You go ${direction}.`;
      s.currentRoom = room.exits[direction];
      moved = true;
    }
  } else {
    message = `Unknown command: ${verb}`;
  }

  const newRoom = ROOMS[s.currentRoom];
  res.json({
    output: {
      command,
      room: s.currentRoom,
      description: newRoom.description,
      exits: Object.keys(newRoom.exits),
      items: s.roomItems[s.currentRoom],
      inventory: [...s.inventory],
      message,
    },
    state: { sessionId, currentRoom: s.currentRoom, inventory: [...s.inventory] },
  });
});

const PORT = 3000;
app.listen(PORT, '127.0.0.1', () => process.stderr.write(`DungeonRelay API listening on 127.0.0.1:${PORT}\n`));
