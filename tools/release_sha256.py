"""Print release artifact hashes without ever reading or packaging private keys."""
import hashlib
import sys
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def main(argv=None):
    paths = [Path(item) for item in (argv or sys.argv[1:])]
    if not paths:
        print('usage: python tools/release_sha256.py dist/*.rpk [mobile/app/build/outputs/apk/**/*.apk]')
        return 2
    for path in paths:
        if not path.is_file():
            print(f'missing artifact: {path}', file=sys.stderr)
            return 1
        if path.suffix.lower() in {'.pem', '.key', '.jks'}:
            print(f'refusing to hash private/signing material: {path}', file=sys.stderr)
            return 1
        print(f'{sha256(path)}  {path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
