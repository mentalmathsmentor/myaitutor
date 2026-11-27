#!/usr/bin/env python3
"""Export the canonical MyAITutor worksheet skill as a Gemini/Claude-style upload package."""
from pathlib import Path
import re
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'frontend/src/features/worksheet/engine/SKILL.md'
OUT_DIR = ROOT / 'frontend/dist/skills'
SUPPORTED_SUFFIXES = {'.md', '.txt', '.tex', '.pdf', '.csv', '.json', '.yaml', '.yml', '.py', '.sh', '.js', '.html', '.htm', '.css', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.webp'}


def fail(message):
    raise SystemExit(f'export_worksheet_skill: {message}')


def frontmatter(text):
    match = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    if not match:
        fail('SKILL.md is missing YAML frontmatter')
    data = {}
    for line in match.group(1).splitlines():
        if ':' in line:
            key, value = line.split(':', 1)
            data[key.strip()] = value.strip()
    return data


def main():
    text = SOURCE.read_text(encoding='utf-8')
    meta = frontmatter(text)
    name = meta.get('name', '')
    description = meta.get('description', '')
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name or '') or len(name) > 64:
        fail('skill name must be valid kebab-case and at most 64 characters')
    if not description or len(description) > 1024:
        fail('skill description must be non-empty and at most 1024 characters')
    if len(text.encode('utf-8')) > 10 * 1024 * 1024:
        fail('SKILL.md exceeds Gemini\'s documented 10 MB limit')

    skill_dir = OUT_DIR / name
    skill_dir.mkdir(parents=True, exist_ok=True)
    target = skill_dir / 'SKILL.md'
    target.write_text(text, encoding='utf-8')

    files = sorted(path for path in skill_dir.rglob('*') if path.is_file() and path.name != 'SKILL.md')
    unsupported = [path for path in files if path.suffix.lower() not in SUPPORTED_SUFFIXES]
    if unsupported:
        fail('unsupported reference file types: ' + ', '.join(str(path.relative_to(skill_dir)) for path in unsupported))
    if len(files) + 1 > 100:
        fail('skill package exceeds Gemini\'s documented 100-file limit')
    total_size = sum(path.stat().st_size for path in [target, *files])
    if total_size > 100 * 1024 * 1024:
        fail('skill package exceeds Gemini\'s documented 100 MB total limit')

    zip_path = OUT_DIR / f'{name}-skill.zip'
    with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(target, arcname=f'{name}/SKILL.md')
        for path in files:
            archive.write(path, arcname=f'{name}/{path.relative_to(skill_dir).as_posix()}')

    print(f'Exported {target}')
    print(f'Exported {zip_path}')
    print('Gemini upload check: SKILL.md at the skill root, valid kebab-case name, description <=1024 chars, <=100 files, <=100 MB.')
    print('Note: Gemini skills do not yet support every Gem feature; verify Canvas/Deep Research needs in the target account.')


if __name__ == '__main__':
    main()
