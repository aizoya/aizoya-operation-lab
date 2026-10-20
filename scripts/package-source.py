"""Package the development checkpoint using an allowlist; never include env files."""
from pathlib import Path
import re
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
target = Path(sys.argv[1]).resolve()
if root == target or root in target.parents:
    raise SystemExit('Output must be outside the project directory')
directories = {'src', 'agent', 'public', 'tests', 'scripts', 'docs', '.aizoya', '.github', 'evidence'}
root_files = {'package.json', 'package-lock.json', 'tsconfig.json', 'README.md', 'AGENTS.md', '.gitignore'}
allowed_extensions = {'.ts', '.js', '.mjs', '.py', '.json', '.md', '.txt', '.log', '.tap', '.html', '.css', '.yml', '.yaml'}
secret = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-(?:proj-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}')
files = []
for path in sorted(root.rglob('*')):
    relative = path.relative_to(root)
    if relative.parts[0] not in directories and not (len(relative.parts) == 1 and (path.name in root_files or path.suffix == '.md')):
        continue
    if any(part.startswith('.env') or part in {'node_modules', '__pycache__', '.data', '.browser-temp', '.eve'} for part in relative.parts):
        continue
    if path.is_symlink():
        raise SystemExit(f'Refusing symlink: {relative}')
    is_role_media=relative.parent.as_posix()=='public/media' and path.stem in {'operations','sales','kitchen','finance','quality'} and path.suffix in {'.jpg','.webm'}
    if not path.is_file() or (path.suffix not in allowed_extensions and not is_role_media):
        continue
    data = path.read_bytes()
    if secret.search(data):
        raise SystemExit(f'Possible credential found; package stopped: {relative}')
    files.append((relative.as_posix(), data))
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, data in files:
        archive.writestr(name, data)
print(f'Packaged {len(files)} files; environment files, databases and browser artifacts excluded.')
