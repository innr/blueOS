# Android companion (P1-5)

This companion project is reserved for the T7 fallback path. V1 first attempts
online TTS prefetch directly from the watch; only if the T0 network probe proves
that WATCH GT cannot reach the official TTS service should a phone-side TTS
provider be implemented here. No user-supplied MP3 import is part of the new
plan.

Build with the Android SDK and Gradle wrapper in a configured Android
environment; this repository does not vendor the SDK or wrapper binaries.
