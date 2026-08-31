#!/usr/bin/env python3
"""Static validation for the BlueOS Studio project layout."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "watch"
MANIFEST = ROOT / "src" / "manifest.json"


def validate(root: Path = ROOT) -> list[str]:
    errors = []
    manifest_path = root / "src" / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return [f"missing {manifest_path}"]
    except json.JSONDecodeError as exc:
        return [f"invalid manifest JSON: {exc}"]

    for field in ("package", "name", "versionCode", "appCategory", "config", "router", "icon"):
        if field not in manifest:
            errors.append(f"manifest missing {field}")
    if manifest.get("appCategory") != ["audiobooks"]:
        errors.append("manifest appCategory must be ['audiobooks']")
    router = manifest.get("router", {})
    entry = router.get("entry")
    if not entry or entry not in router.get("pages", {}):
        errors.append("router.entry must reference a configured page")
    if entry:
        page = router["pages"][entry]
        page_path = root / "src" / entry / f"{page.get('component', 'index')}.ux"
        if not page_path.exists():
            errors.append(f"missing routed page {page_path}")
    icon_path = root / "src" / manifest.get("icon", "").lstrip("/")
    if not icon_path.exists():
        errors.append(f"missing icon {icon_path}")
    for required in (root / "package.json", root / "jsconfig.json", root / "src" / "app.ux"):
        if not required.exists():
            errors.append(f"missing {required}")
    return errors


if __name__ == "__main__":
    problems = validate()
    if problems:
        for problem in problems:
            print(f"ERROR: {problem}")
        raise SystemExit(1)
    print("BlueOS project layout is valid")
