# BlueOS Watch App

This directory is the vivo BlueOS Studio project for the audiobook watch app.

## Open and run

1. Install BlueOS Studio and Node.js.
2. Open this directory in BlueOS Studio.
3. Install dependencies in Studio and restart compilation.
4. Use the simulator to launch the `pages/home` route.
5. Use Studio's Package action with the `debug` package type. The generated
   `.rpk` file is placed in `dist/`.

The current screen is a UI/startup smoke test. It intentionally does not call
audio or Bluetooth APIs until the target WATCH GT SDK version and API surface
are verified.
