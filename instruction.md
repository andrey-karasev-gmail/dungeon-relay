The DungeonRelay text adventure at `/app` has been partially migrated from flat-file room loading to a local Express.js API. The API server is already implemented at `/app/api/server.js` and runs on `http://127.0.0.1:3000`. Its endpoints are documented in `/app/docs/API.md`.

The runner at `/app/runner.js` still contains a `loadRoomFromFile()` function that opens files from `/app/legacy_rooms/*.txt` directly. Your task is to remove all uses of this function and replace them with calls to the local API so that `runner.js` contains no references to `legacy_rooms` and no longer loads room data from files.

The runner reads commands from stdin, one per line (for example: `look`, `take brass_key`, `use brass_key north`, `go north`), and must write exactly one JSON object per command to stdout. The required shape of each output object is described in `/app/schema.json`.

Start the API server with `node /app/api/server.js` before running the runner. After your changes, pipe a sequence of commands through the runner and confirm that it produces valid JSON output and that no `legacy_rooms` files are opened.
