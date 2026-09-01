"""Static checks for the single BlueOS watch project."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'my-application-1'
MANIFEST_PATH = PROJECT / 'src' / 'manifest.json'

def validate_manifest(manifest, project=PROJECT):
    errors = []
    package = manifest.get('package', '')
    if not isinstance(package, str) or not re.fullmatch(r'[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+', package):
        errors.append('package must be a dot-separated lowercase identifier')
    if not isinstance(manifest.get('name'), str) or not manifest['name'].strip(): errors.append('name must be non-empty')
    if not isinstance(manifest.get('versionName'), str) or not manifest['versionName'].strip(): errors.append('versionName must be non-empty')
    if not isinstance(manifest.get('versionCode'), int) or manifest['versionCode'] < 1: errors.append('versionCode must be a positive integer')
    if not isinstance(manifest.get('appCategory'), list) or not all(isinstance(x, str) for x in manifest['appCategory']): errors.append('appCategory must be a list of strings')
    icon = manifest.get('icon')
    if not isinstance(icon, str) or not icon.startswith('/') or not (project / 'src' / icon[1:]).is_file(): errors.append('icon must reference an existing asset under src')
    devices = manifest.get('deviceTypeList')
    if not isinstance(devices, list) or not {'watch', 'watch-square'}.issubset(devices): errors.append('deviceTypeList must include watch and watch-square')
    router = manifest.get('router')
    if not isinstance(router, dict): return errors + ['router must be an object']
    pages, entry = router.get('pages'), router.get('entry')
    if not isinstance(pages, dict) or not pages: errors.append('router.pages must contain at least one page')
    elif entry not in pages: errors.append('router.entry must reference a declared page')
    else:
        for uri, config in pages.items():
            component = config.get('component') if isinstance(config, dict) else None
            page = project / 'src' / 'pages' / uri.removeprefix('pages/') / f'{component}.ux'
            if not isinstance(component, str) or not component or not page.is_file(): errors.append(f'{uri} points to a missing component page')
    return errors

def main():
    try: manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        print(f'Invalid manifest: {error}'); return 1
    errors = validate_manifest(manifest)
    if errors:
        print('BlueOS project validation failed:'); print('\n'.join(f'- {e}' for e in errors)); return 1
    print('BlueOS project validation passed'); return 0

if __name__ == '__main__': sys.exit(main())
