# Our Version of Black Hole

Standalone Schwarzschild line-path simulation with the custom editor and bloom
work preserved from the Three.js study.

Live site: <https://malikahed.github.io/our-version-of-black-hole/>

The authored geodesic paths and randomized ray segments are rendered as linear
HDR emitters, then passed through the official Three.js post-processing chain:
`RenderPass`, `UnrealBloomPass`, and `OutputPass` with ACES filmic tone mapping.
The required Three.js r185 add-ons are vendored locally, so the project does not
depend on the portfolio or a CDN.

Run it with:

```bash
npm start
```

Then open <http://127.0.0.1:4180/>. This project uses port 4180 so it remains
independent from the portfolio development server.

The local server watches the project and sends live-reload events to local
browsers. After loading the current page once, later HTML, shader, CSS, and
asset edits refresh automatically. Live reload is not enabled on GitHub Pages.

Use left-drag or one-finger touch to orbit around the black hole. Use the mouse
wheel, trackpad, or pinch gesture to zoom. The precise editor sliders remain
synchronized with the direct camera controls.

Camera motion uses a lightweight ray-map preview and then refines the unchanged
full-resolution result in tiles after movement settles. Rendering also pauses
when the browser tab is hidden.

The default realism renderer uses Eric Bruneton's precomputed Schwarzschild
beam-tracing tables to find primary and secondary accretion-disc intersections
in constant time per pixel. The custom randomized segmented line material and
Three.js Unreal Bloom chain remain authored by this project. Switch between the
new lookup-table renderer and the protected legacy ray marcher from the
`realism renderer` controls.

The realism mode also includes a sparse procedural starfield, tangential star
deformation near the critical lensing zone, Doppler-weighted disk light, and
broken photon-rim filaments. These effects are shader-generated and add no
particle geometry or additional scene renderer.

The lookup-table parameterization and precomputed data are used under Eric
Bruneton's BSD 3-Clause license; see `third_party/black_hole_shader-LICENSE`.

The Git tag `pre-official-unreal-bloom` restores the state immediately before
the official bloom integration.
