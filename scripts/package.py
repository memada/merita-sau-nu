#!/usr/bin/env python3
"""Package tracked source only. Requires git and Python 3, no third-party modules."""
import os
import re
from pathlib import Path
import subprocess
import zipfile

EXCLUDED = {'.git', 'data', 'backups', '.next', 'node_modules', 'playwright-report',
            'test-results', 'artifacts', 'dist', '__pycache__', '.aws', '.ssh', '.codex'}

def package(root):
    root = Path(root).resolve()
    output = root / 'dist' / 'merita-sau-nu-source.zip'
    output.parent.mkdir(exist_ok=True)
    os.chmod(output.parent, 0o700)
    output.unlink(missing_ok=True)
    paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).split(b'\0')
    temporary = output.with_suffix('.tmp')
    try:
        with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
            for raw in sorted(set(paths)):
                if not raw: continue
                rel = Path(os.fsdecode(raw))
                if rel.is_absolute() or '..' in rel.parts: raise ValueError('Unsafe source path')
                if any(p in EXCLUDED or p.startswith('.env') for p in rel.parts): continue
                if rel.name == '.DS_Store' or any(rel.name.endswith(x) for x in
                    ('.sqlite', '.sqlite-wal', '.sqlite-shm', '.zip', '.pem', '.key', '.tsbuildinfo')): continue
                path = root / rel
                if any(p.is_symlink() for p in [path, *path.parents]) or not path.is_file(): continue
                content = path.read_bytes()
                if re.search(rb'(?m)^-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|scrypt:[a-f0-9]{32}:[a-f0-9]{128}|dop_v1_[A-Za-z0-9]+', content):
                    raise ValueError('Potential secret found; archive aborted (no contents printed)')
                if rel.name == '.npmrc' and re.search(rb'(?i)(_auth|password)\s*=', content):
                    raise ValueError('npm credentials found; archive aborted')
                info = zipfile.ZipInfo.from_file(path, rel.as_posix())
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, content)
        os.chmod(temporary, 0o600)
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    print('Source archive created: dist/merita-sau-nu-source.zip (tracked files only; ENV excluded)')

if __name__ == '__main__':
    package(Path(__file__).resolve().parent.parent)
