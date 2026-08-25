# Polysome

Polysome is the simulation and Canvas 2D renderer behind the generative artwork
at [dandelion.art/art/polysome](https://dandelion.art/art/polysome).

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

## Develop

Requirements: Node.js 24 and npm.

```sh
npm install
npm run dev
```

The Astro development frontend runs at `http://localhost:4321`. Its `/debug`
route enables Polysome's performance logging. Other useful commands:

```sh
npm run typecheck   # TypeScript validation
npm run build       # Build the published package into dist/
npm run build:demo  # Build the browser demo into dist-demo/
npm run check       # Run all build and type checks
npm run pack:check  # Inspect the files that npm would publish
```

Every pull request receives a stable `workers.dev` preview through Cloudflare
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
