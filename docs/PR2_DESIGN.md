# PR2 Design: BlueOS minimal watch application

## Goal

Provide a BlueOS Studio project that can start in the simulator, display the
first audiobook screen, and produce a debug `.rpk` package through BlueOS
Studio.

## Scope

- `watch/` follows the official BlueOS Studio layout: `src/app.ux`,
  `src/manifest.json`, routed `src/pages/.../index.ux`, assets, and project
  metadata.
- The home screen is a deterministic UI simulator for the bookshelf, playback
  state, seek controls, and transfer status.
- Audio playback, Bluetooth transport, storage, and progress persistence stay
  behind the platform boundary until the exact WATCH GT SDK APIs are verified.

## Acceptance criteria

1. Static project validation passes locally and in CI.
2. BlueOS Studio can open the `watch/` directory and resolve the configured
   `pages/home` route.
3. The simulator can launch the home screen and interact with the four test
   actions without a native API call.
4. BlueOS Studio can generate a debug `.rpk` package after dependencies are
   installed.

## Manual BlueOS Studio verification

1. Install Node.js and BlueOS Studio.
2. Open the `watch/` directory as a project.
3. Use Studio's dependency installation action, then start compilation.
4. Confirm the simulator launches `蓝河听书` and the buttons update the status
   text.
5. Use Studio's **Package → debug** action and retain the generated file from
   `dist/`.

The last two checks require BlueOS Studio; this repository environment does not
contain the proprietary Studio compiler or a WATCH GT device.
