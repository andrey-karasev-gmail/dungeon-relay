"""Verifier tests for the DungeonRelay Express.js migration task."""
import json
import subprocess
import time
from pathlib import Path

import jsonschema
import pytest

SCHEMA = json.loads(Path('/app/schema.json').read_text())

COMMANDS = "look\ntake brass_key\nuse brass_key north\nlook\ngo north\nlook\n"

EXPECTED_ROOMS = ['entrance', 'entrance', 'corridor', 'corridor', 'vault', 'vault']


@pytest.fixture(scope='module')
def api_server():
    proc = subprocess.Popen(
        ['node', '/app/api/server.js'],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1)
    yield proc
    proc.terminate()
    proc.wait(timeout=5)


def run_runner():
    return subprocess.run(
        ['node', '/app/runner.js'],
        input=COMMANDS,
        capture_output=True,
        text=True,
        timeout=20,
    )


def test_runner_depends_on_api():
    """runner.js must fail when the API server is not running on port 3000."""
    r = subprocess.run(
        ['node', '/app/runner.js'],
        input='look\n',
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert r.returncode != 0, (
        "runner.js succeeded without an API server — "
        "it may be using hardcoded room data instead of calling the API."
    )


def test_runner_exits_zero(api_server):
    """runner.js must exit with code 0 on a normal playthrough."""
    r = run_runner()
    assert r.returncode == 0, f"runner.js exited {r.returncode}\nstderr: {r.stderr}"


def test_output_line_count(api_server):
    """runner.js must emit exactly one JSON line per command."""
    r = run_runner()
    lines = [ln for ln in r.stdout.strip().split('\n') if ln.strip()]
    assert len(lines) == 6, f"Expected 6 output lines, got {len(lines)}:\n{r.stdout}"


def test_each_line_is_valid_json(api_server):
    """Every output line must be parseable JSON."""
    r = run_runner()
    for i, line in enumerate(ln for ln in r.stdout.strip().split('\n') if ln.strip()):
        try:
            json.loads(line)
        except json.JSONDecodeError as e:
            pytest.fail(f"Line {i} is not valid JSON: {line!r}\n{e}")


def test_output_matches_schema(api_server):
    """Every JSON output object must conform to schema.json."""
    r = run_runner()
    for i, line in enumerate(ln for ln in r.stdout.strip().split('\n') if ln.strip()):
        obj = json.loads(line)
        try:
            jsonschema.validate(obj, SCHEMA)
        except jsonschema.ValidationError as e:
            pytest.fail(f"Line {i} failed schema validation:\n{e.message}\nObject: {obj}")


def test_room_sequence(api_server):
    """Rooms in the transcript must follow the expected walkthrough sequence."""
    r = run_runner()
    lines = [ln for ln in r.stdout.strip().split('\n') if ln.strip()]
    rooms = [json.loads(ln)['room'] for ln in lines]
    assert rooms == EXPECTED_ROOMS, f"Expected rooms {EXPECTED_ROOMS}, got {rooms}"


def test_runner_does_not_read_legacy_rooms(api_server):
    """runner.js must not contain references to legacy_rooms."""
    source = Path('/app/runner.js').read_text()
    assert 'legacy_rooms' not in source, (
        "runner.js still references legacy_rooms — remove file-based room loading "
        "and replace it with API calls."
    )


def test_runner_does_not_use_read_file_sync(api_server):
    """runner.js must not call readFileSync (no file-based room loading)."""
    source = Path('/app/runner.js').read_text()
    assert 'readFileSync' not in source, (
        "runner.js still calls readFileSync — replace all legacy file reads with API calls."
    )
