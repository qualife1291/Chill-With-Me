#!/usr/bin/env python3
"""Dependency-free structural validation for repo Agent Skills."""
from pathlib import Path
import hashlib
import json
import re
import sys
ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / '.agents' / 'skills'
errors = []
seen = set()
for path in sorted(SKILLS.glob('*/SKILL.md')):
    raw = path.read_text(encoding='utf-8')
    match = re.match(r'\A---\n(.*?)\n---\n', raw, re.S)
    if not match:
        errors.append(f'{path}: missing YAML frontmatter')
        continue
    fields = dict(re.findall(r'^([a-z_]+):\s*(.*?)\s*$', match.group(1), re.M))
    def scalar(value):
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            return value[1:-1]
        return value
    name, description = scalar(fields.get('name', '')), scalar(fields.get('description', ''))
    if name != path.parent.name or not re.fullmatch(r'[a-z0-9-]{1,64}', name):
        errors.append(f'{path}: invalid/mismatched name {name!r}')
    if not description or len(description) > 1024:
        errors.append(f'{path}: missing/overlong description')
    if name in seen:
        errors.append(f'{path}: duplicate skill {name}')
    seen.add(name)
    if len(raw.splitlines()) < 20:
        errors.append(f'{path}: too little procedural content')
if not seen:
    errors.append('No skills found')
manifest = ROOT / '.agents' / 'official-skills.json'
if manifest.is_file():
    for source in json.loads(manifest.read_text())['sources']:
        if not re.fullmatch(r'[a-f0-9]{40}', source['commit']):
            errors.append(f"Unpinned source: {source['name']}")
        base = SKILLS / source['name']
        for item in source['files']:
            file = (base / item['path']).resolve()
            if not file.is_relative_to(base.resolve()) or not file.is_file():
                errors.append(f"Missing/unsafe official skill file: {file}")
            elif hashlib.sha256(file.read_bytes()).hexdigest() != item['sha256']:
                errors.append(f"Official skill checksum mismatch: {file}")
print(f'Validated {len(seen)} skills and pinned official-file checksums')
for err in errors:
    print('ERROR:', err, file=sys.stderr)
sys.exit(1 if errors else 0)
