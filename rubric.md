Agent removes the `loadRoomFromFile()` function entirely from `runner.js`, +5
Agent replaces both `loadRoomFromFile()` call sites with `GET /api/room?id=<roomId>` API calls, +3
Agent produces valid JSON output conforming to `schema.json` for all 6 commands in the walkthrough, +3
Agent removes the `readFileSync` call along with the `fs` and `path` require statements that were only used for file loading, +2
Agent reads `/app/docs/API.md` before implementing to identify the correct endpoint and response shape, +1
Agent hardcodes room data (names, descriptions, exits) instead of fetching from the API, -5
Agent leaves `loadRoomFromFile()` partially in place — removes one call site but not both, -3
Agent modifies test files or writes directly to `reward.txt`, -5
Agent produces output for fewer than 6 commands or outputs the wrong room sequence, -3
Agent constructs the API URL incorrectly (wrong host, port, or path) causing HTTP connection errors, -2
Agent adds a comment containing `legacy_rooms` as a migration note, causing the source check to fail, -2

