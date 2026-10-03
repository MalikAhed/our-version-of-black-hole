# Our Version of Black Hole

Standalone Schwarzschild line-path simulation with the custom editor and bloom
work preserved from the Three.js study.

Live site: <https://malikahed.github.io/our-version-of-black-hole/>

The authored geodesic paths and randomized ray segments are rendered as linear
HDR emitters, then passed through the official Three.js post-processing chain:
`RenderPass`, `UnrealBloomPass`, and `OutputPass` with ACES filmic tone mapping.
The required Three.js r185 add-ons are vendored locally, so the project does not
depend on the portfolio or a CDN.

## Run locally

Use Node.js 22 or newer. There are no npm dependencies to install and no build step.
Run commands from the repository root:

```bash
npm start
```

Then open <http://127.0.0.1:4180/>. This project uses port 4180 so it remains
independent from the portfolio development server. Keep that terminal open while
using the simulation, and stop it with Ctrl+C.

To use a different port on macOS/Linux:

```sh
BLACK_HOLE_PORT=4181 npm start
```

In PowerShell, set `$env:BLACK_HOLE_PORT = '4181'` before `npm start`.
`BLACK_HOLE_HOST` changes the bind address; it defaults to `127.0.0.1` for
local-only access. Use the HTTP URL rather than opening the HTML as a `file://`
page, because the browser loads local ES modules through the import map.

## Controls and saved settings

Use left-drag or one-finger touch to orbit around the black hole. Use the mouse
wheel, trackpad, or pinch gesture to zoom. The precise editor sliders remain
synchronized with the direct camera controls.

Camera motion uses a lightweight ray-map preview and then refines the unchanged
full-resolution result in tiles after movement settles. Rendering also pauses
when the browser tab is hidden.

Editor values are saved in this browser's local storage. **reset saved values**
restores the authored defaults; localhost and the published site keep separate
settings. If rendering is slow, lower **performance → render scale**. The slider
covers 0.5–1; the numeric field accepts 0.25–1. This changes GPU workload, not the
simulation's physical scale.

## Checks and hosting

```sh
npm run check
```

This checks the syntax of `server.mjs` only. It does not compile the browser
shaders or test the simulation visually.

Static hosting must preserve `index.html`, `examples/`, and `build/` together.
The root index redirects into `examples/webgl_postprocessing_unreal_bloom.html`;
its import map resolves Three.js from `build/` and add-ons from `examples/jsm/`.
`server.mjs` is for local development and is not needed by the static site.

The Git tag `pre-official-unreal-bloom` restores the state immediately before
the official bloom integration.

## License

Original contributions by Malik Abuallatta are licensed under the
[MIT License](LICENSE). Third-party code, adaptations, dependencies, and assets
retain their existing licenses and notices. This license does not grant new
rights to third-party material.
