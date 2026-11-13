#!/usr/bin/env python3
"""Read-only verification of the one approved public Worker against local dist."""
from concurrent.futures import ThreadPoolExecutor
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime, timezone
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev'

def fetch(route):
    # Inherit proxy and CA configuration; never attach deployment credentials.
    return subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '30',
                           '-H', 'Accept-Encoding: identity', BASE + route],
                          check=True, capture_output=True).stdout

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', help='Tested source commit (7–40 hex characters)')
    parser.add_argument('version', help='Observed Wrangler deployment UUID')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-f0-9]{7,40}', args.source):
        parser.error('source must be a commit hash')
    try:
        UUID(args.version)
    except ValueError:
        parser.error('version must be a UUID')
    report = {'passed': False, 'date': datetime.now(timezone.utc).isoformat(),
              'source': args.source, 'version': args.version, 'base': BASE,
              'checks': 'Read-only GET; compare every dist asset; three room summaries; no production mutation'}
    path = ROOT / 'evidence/production.json'
    try:
        files = sorted(p for p in (ROOT / 'dist').rglob('*') if p.is_file() and p.name != '_headers')
        if not files or not (ROOT / 'dist/index.html').is_file():
            raise ValueError('Build dist before verifying production')
        def verify_asset(item):
            relative = item.relative_to(ROOT / 'dist').as_posix()
            actual = fetch('/' if relative == 'index.html' else '/' + relative)
            if actual != item.read_bytes():
                raise ValueError('Public asset does not match tested build: ' + relative)
            return {'path': relative, 'bytes': len(actual), 'sha256': hashlib.sha256(actual).hexdigest()}
        # Bounded parallel GETs keep optional PDF resources from making verification serial.
        with ThreadPoolExecutor(max_workers=6) as pool:
            assets = list(pool.map(verify_asset, files))
        raw_headers = subprocess.run(
            ['curl', '--fail', '--silent', '--show-error', '--head', '--max-time', '30', BASE + '/'],
            check=True, capture_output=True).stdout.decode()
        observed_headers = {line.partition(':')[0].strip().lower(): line.partition(':')[2].strip()
                            for line in raw_headers.splitlines() if ':' in line}
        expected_headers = {'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
                            'referrer-policy': 'strict-origin-when-cross-origin',
                            'permissions-policy': 'camera=(), microphone=(), geolocation=()'}
        if any(observed_headers.get(k) != v for k, v in expected_headers.items()):
            raise ValueError('Public static security headers do not match the tested policy')
        rooms = json.loads(fetch('/api/rooms'))
        if len(rooms) != 3 or sorted(r['slot'] for r in rooms) != [1, 2, 3]:
            raise ValueError('Expected the three configured room summaries')
        report.update(passed=True, assets=assets, room_slots=len(rooms), security_headers=expected_headers)
    except Exception as error:
        report['error'] = str(error)
        path.write_text(json.dumps(report, indent=2) + '\n')
        raise
    path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ['passed', 'source', 'version', 'room_slots']} | {'assets': len(assets)}))

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
