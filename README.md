# BlueOS Audiobook

vivo WATCH GT / BlueOS audiobook application prototype.

This first test version contains the platform-independent protocol model and a
virtual transfer endpoint. It can be tested without a watch or BlueOS Studio.

## Test

```bash
python3 -m unittest discover -s tests -v
```

The watch application and `.rpk` packaging require the official BlueOS Studio
SDK and a developer-enabled vivo WATCH GT.
