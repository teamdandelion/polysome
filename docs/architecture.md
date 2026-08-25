# Architecture

Polysome currently contains a framework-independent simulation and Canvas 2D
renderer plus an Astro development frontend. Astro is not part of the
published package and there are no runtime dependencies.

## Runtime flow

1. `Instance` composes the browser-free `Simulation` with the Canvas renderer
   and animation lifecycle.
2. `Simulation` advances typed-array particle state through a dynamic flow
   field and grid-based pressure detection.
3. `MoteRenderer` maps mote pressure to color and draws each mote through
   `RenderContext`.
4. `Instance` owns requestAnimationFrame scheduling and browser lifecycle
   listeners.

The simulation currently runs on the browser main thread. There is no Web
Worker in the current implementation.

`Simulation` can also run directly in Node or a future Web Worker. Its
`advance(n)` method has no rendering or wall-clock dependency, `view()` exposes
zero-copy state for renderers and measurements, and `checkpoint()` captures
mote state, disturbances, and complete RNG state for exact continuation. The
checkpoint boundary is post-move: positions have advanced, while pressure
describes the neighbor calculation immediately preceding that move.

## Modules

- `src/instance.ts`: public orchestration and lifecycle API.
- `src/simulation.ts`: public browser-free stepping, observation, and
  checkpoint API.
- `src/moteSimulator.ts`: typed-array mote state, spatial grid, pressure, and
  movement.
- `src/flowField.ts`: moving disturbances and the sampled directional field.
- `src/morphology.ts`: pure multiscale state measurements for experiments.
- `src/moteRenderer.ts`: mote appearance and pressure-to-color mapping.
- `src/renderContext.ts`: Canvas 2D drawing and simulation-to-canvas mapping.
- `src/simulationParams.ts`: simulation defaults.
- `src/renderParams.ts`: Canvas renderer defaults.
- `demo/`: development-only static Astro frontend.
- `tools/run-experiment.mjs`: manifest-driven headless experiment runner.
- `experiments/`: immutable reference manifests and generated results.

## Performance model

Pressure detection uses a spatial grid rather than all-pairs comparison, but it
remains the dominant cost as local mote density rises. Flow-field computation
and Canvas drawing also happen on the main thread.

Hosts can constrain continuous cost with `maxFps`, `maxPixelRatio`, and lower
simulation counts. Instances pause by default while the document is hidden.
Decorative or background treatments should use a deliberately reduced preset
rather than the full artwork settings.

## Future renderers

The public API should continue separating simulation parameters from rendering
parameters. A future repository layout can extract the current implementation
without changing the canonical artwork URL:

```text
packages/core       deterministic simulation state
packages/canvas     current Canvas 2D renderer
packages/webgl      experimental GPU renderer
packages/wasm       optional simulation implementation
demo                renderer comparison and artwork development
```

WebGL and WASM experiments may begin on branches, but should become explicit
packages or selectable implementations before merging. The dandelion.art host
should depend only on released package APIs, not branch-specific source files.
