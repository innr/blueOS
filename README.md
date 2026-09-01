# BlueOS Audiobook

vivo WATCH GT / BlueOS audiobook application prototype.

## Watch application

[`my-application-1/`](my-application-1/) is the single BlueOS watch project.
Open this directory in BlueOS Studio. It contains the bookshelf, player and
chapter catalogue UI. Generated `build/` files and local Studio settings are
intentionally not committed.

The project is configured for `watch` and `watch-square` device types.
Packaging a `.rpk` and device verification require the official BlueOS Studio
SDK and a developer-enabled vivo WATCH GT.

## Protocol simulator and tests

The platform-independent protocol model and virtual transfer endpoint can be
tested without a watch or BlueOS Studio.

```bash
python -m unittest discover -s tests -v
```
