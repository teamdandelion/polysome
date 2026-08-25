# Polysome

Polysome is the simulation and Canvas 2D renderer behind the generative artwork
at [dandelion.art/art/polysome](https://dandelion.art/art/polysome).

The latest development frontend from `main` is always available at
[polysome.teamdandelion.workers.dev](https://polysome.teamdandelion.workers.dev).
It may be ahead of the version currently published on dandelion.art.

This repository owns the artwork's engine, renderer, development demo, and npm
releases. The dandelion.art repository owns the public page, routing, and site
presentation.

## Install

```sh
npm install @teamdandelion/polysome
```

Polysome ships as compiled ESM with TypeScript declarations and has no runtime
dependencies.

## Use

Give the canvas a CSS size, construct an instance, and destroy it when its host
component unmounts:

```ts
import { Instance, randomSeed } from "@teamdandelion/polysome";

const canvas = document.querySelector<HTMLCanvasElement>("#polysome");
if (!canvas) throw new Error("Missing Polysome canvas");

const instance = new Instance(randomSeed(), 1000, 625, {
  maxFps: 60,
  maxPixelRatio: 2,
  autoResize: true,
  pauseWhenHidden: true,
});

instance.setup(canvas);
instance.start();

// Later, when the page or component is removed:
instance.destroy();
```

```css
#polysome {
  display: block;
  width: 100vw;
  height: 100vh;
}
```

The `xDim` and `yDim` constructor arguments define simulation-space dimensions;
the canvas backing store is sized independently from its CSS box.

### Configuration

Simulation and rendering parameters can be overridden before the internal
systems are constructed:

```ts
const instance = new Instance(seed, 1000, 625, {
  simulation: {
    numMotes: 1200,
    numDisturbances: 12,
  },
  render: {
    backgroundColor: { h: 270, s: 12, b: 96 },
    colorInterpolationPoints: [
      { pressure: 0, color: { h: 32, s: 30, b: 72 } },
      { pressure: 80, color: { h: 276, s: 35, b: 62 } },
    ],
  },
  maxFps: 20,
  maxPixelRatio: 1,
});
```

`Instance` exposes `setup()`, `start()`, `stop()`, `resize()`, `step()`,
`draw()`, and `destroy()`. Calling `start()` more than once is safe. `destroy()`
stops animation and removes browser listeners.

For reduced-motion presentation, call `setup()` and `draw()` without calling
`start()`.

### Headless experiments

`Simulation` advances the same dynamics without a canvas, animation clock, or
DOM. It supports exact batched stepping, zero-copy state observation, and
complete continuation checkpoints:

```ts
import { Simulation, measureMorphology } from "@teamdandelion/polysome";

const simulation = new Simulation(seed, 622.82, 1000);
simulation.advance(900);

const fingerprint = measureMorphology(simulation.view());
const checkpoint = simulation.checkpoint();
```

The repository also includes a complete, versioned portrait experiment:

```sh
npm run build
npm run experiment -- --until 900
```

See [experiments/README.md](experiments/README.md) for the reproducibility
contract and [docs/science.md](docs/science.md) for the mechanism hypotheses,
phase-mapping program, and art-studio roadmap.

## Develop

Requirements: Node.js 24 and npm.

```sh
npm install
npm run dev
```

The Astro development frontend runs at `http://localhost:4321`. Its `/debug`
route provides a mobile-friendly performance benchmark and exportable report;
see [docs/performance.md](docs/performance.md). Other useful commands:

```sh
npm run typecheck   # TypeScript validation
npm run build       # Build the published package into dist/
npm run build:demo  # Build the browser demo into dist-demo/
npm test            # Build and run deterministic simulation/metric tests
npm run experiment  # Run the reference headless experiment
npm run check       # Run all build and type checks
npm run pack:check  # Inspect the files that npm would publish
```

Every push to `main` updates the stable development frontend linked above, and
every pull request receives its own `workers.dev` preview through Cloudflare
Workers Builds. See [docs/previews.md](docs/previews.md) for the one-time
repository ruleset and Cloudflare configuration.

## Releases and site updates

Releases are managed by Release Please. Conventional commits merged into
`main` update a release pull request; merging that pull request creates a
GitHub release, publishes the matching npm version, and emits a
`polysome-released` event for dandelion.art.

The one-time npm and GitHub setup, exact release flow, and event contract are
documented in [docs/releasing.md](docs/releasing.md).

## Architecture

See [docs/architecture.md](docs/architecture.md) for the current module layout,
performance model, and likely Canvas/WebGL/WASM evolution path. Historical art
and implementation notes remain in [notes.md](notes.md).

## Copyright

Copyright © 2023–2026 Dandelion Mané. No license is granted for use,
modification, or redistribution.
