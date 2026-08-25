# Our Version of Black Hole

Standalone Schwarzschild line-path simulation with the custom editor and bloom
work preserved from the Three.js study.

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

The Git tag `pre-official-unreal-bloom` restores the state immediately before
the official bloom integration.
