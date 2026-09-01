# Android companion (P1-5)

This is the companion-app boundary for importing MP3 chapters, managing
`Book`/`Chapter` models, and enqueueing transfer tasks. `AudioImporter` reads a
content URI and rejects unsupported formats. BLE discovery and transfer are
injected behind the protocol adapter once the official device permissions and
GATT contract are confirmed.

Build with the Android SDK and Gradle wrapper in a configured Android
environment; this repository does not vendor the SDK or wrapper binaries.
