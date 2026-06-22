# DungeonRelay API

The local Express.js API runs on `http://127.0.0.1:3000`.  
All request and response bodies are JSON.

## Endpoints

### POST /api/init

Start a new game session. Returns a `sessionId` to use in subsequent requests.

**Request body:** `{}` (empty)

**Response:**
```json
{
  "sessionId": "abc123",
  "state": {
    "sessionId": "abc123",
    "currentRoom": "entrance",
    "inventory": []
  }
}
```

---

### GET /api/room?id=\<roomId\>

Fetch static room data: name, description, exits, and rules.

**Example:** `GET /api/room?id=entrance`

**Response:**
```json
{
  "id": "entrance",
  "name": "Entrance Hall",
  "description": "You stand in the dim entrance hall ...",
  "exits": { "north": "corridor" },
  "items": ["brass_key"],
  "rules": { "north": "brass_key" }
}
```

`rules` maps an exit direction to the item required to use it.

---

### POST /api/command

Execute one command in an active session.

**Request body:**
```json
{
  "sessionId": "abc123",
  "command": "take brass_key"
}
```

Supported commands: `look`, `take <item>`, `go <direction>`, `use <item> <direction>`

**Response:**
```json
{
  "output": {
    "command": "take brass_key",
    "room": "entrance",
    "description": "You stand in the dim entrance hall ...",
    "exits": ["north"],
    "items": [],
    "inventory": ["brass_key"],
    "message": "You pick up the brass_key."
  },
  "state": {
    "sessionId": "abc123",
    "currentRoom": "entrance",
    "inventory": ["brass_key"]
  }
}
```

The `output` object is exactly one JSON record that the runner should write to stdout per command.
