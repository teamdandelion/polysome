# Polysome Overview

## Description

Polysome is an interactive generative art application that simulates and visualizes abstract biological processes through particle-based physics. The simulation creates organic, diffusion-like patterns as thousands of "motes" (particles) interact through collisions and respond to dynamic flow fields, self-organizing into transient clusters. The visual output evolves continuously, with colors shifting based on collision history to create a living, breathing digital organism.

## Technologies

### Core Technologies

- **React**: `^18.2.0` - UI framework for component structure and lifecycle management
- **TypeScript**: Type-safe development with ES2016 target
- **HTML5 Canvas API**: Native 2D rendering with custom HSB color system
- **Web Workers**: Offload physics simulation to separate thread for optimal performance
- **requestAnimationFrame**: Native browser animation loop for smooth 60fps rendering

### Build and Deployment

- **Parcel**: `^2.10.3` - Zero-configuration bundler with automatic TypeScript/JSX/CSS handling
- **Jest**: `^29.7.0` - Testing framework with separate unit and performance test suites
- **Prettier**: `^3.1.0` - Code formatting
- **GitHub Actions**: Automated deployment to GitHub Pages

### No Heavy Dependencies

The core simulation engine has **zero external runtime dependencies** - all physics, rendering, and utilities are implemented from scratch for maximum performance and portability.

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────┐
│                  React UI Layer                     │
│  (Currents.tsx, App.tsx, LandingPage.tsx)          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│              Instance (instance.ts)                 │
│  • Orchestrates simulation and rendering           │
│  • Manages Web Worker communication                 │
│  • Controls animation loop                          │
└───────┬─────────────────────────┬───────────────────┘
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────────────┐
│   Web Worker     │    │   Main Thread Renderer   │
│ (Simulation)     │    │   (MoteRenderer)         │
│                  │    │                          │
│ • MoteSimulator  │    │ • RenderContext          │
│ • FlowField      │    │ • ColorInterpolation     │
│ • Cluster Logic  │    │ • Canvas drawing         │
└──────────────────┘    └──────────────────────────┘
```

### Core Modules

#### 1. **Simulation Engine** (`moteSimulator.ts`)

The heart of Polysome's physics system.

**Mote (Particle) Representation:**

- Stored as compact `Float32Array`: `[x, y, nCollisions, stepAdded, ...]` (4 values per mote)
- Velocities in separate `Float32Array`: `[vx, vy, ...]` (2 values per mote)
- ~4,200 motes by default, each with 42-unit collision radius

**Cluster System:**

- Motes within proximity form dynamic clusters
- Clusters provide cohesion (attract members), separation (repel neighbors), and alignment forces
- Currently disabled by default (`clusterCohesionFactor = 0.0`)
- Clusters dissolve when membership drops below 7 motes

**Collision Detection:**

- Grid-based spatial partitioning (cells = 2× mote radius)
- O(n) complexity instead of O(n²) brute force
- Collision forces decay exponentially over 9-unit range

**Key Methods:**

- `step()`: Execute one simulation frame
- `processCollisions()`: Detect and resolve particle overlaps
- `moveMotes()`: Apply flow field and collision velocities
- `updateClusters()`: Manage cluster formation and dissolution

#### 2. **Flow Field System** (`flowField.ts`)

Generates organic motion patterns that guide motes.

**DynamicFlowField:**

- 30 circular "disturbances" move throughout the space
- Each disturbance has position, radius, orientation (theta), and velocity
- Disturbances bounce off boundaries and influence nearby grid points
- Grid-based field evaluation (4-unit spacing) for performance
- Flow coefficient: 0.5 (motes follow 50% of field direction)

**Field Computation:**

- Distance-based influence: `influence = 1 / (1 + distance)`
- Vector points along disturbance orientation
- Multiple disturbances combine additively

#### 3. **Rendering System**

**MoteRenderer** (`moteRenderer.ts`):

- Renders each mote as an ellipse with procedurally generated properties
- Each mote has 1 ring with randomized size, thickness, and opacity
- Color determined by collision count via HSB interpolation
- Custom FPS counter (updates every 1 second)
- Debug overlay shows: FPS, step count, mote/cluster statistics

**RenderContext** (`renderContext.ts`):

- Abstraction layer over Canvas 2D API
- Handles coordinate transformation and zoom
- HSB→RGB color conversion via custom `hsbToRgb()` utility
- Methods mirror canvas API: `ellipse()`, `circle()`, `line()`, `rect()`, `text()`

**Color System** (`colorInterpolationSystem.ts`):

- 8-point HSB gradient based on collision count:
  - 0 collisions: Orange (h:30)
  - 20: Green (h:120)
  - 35: Teal (h:180)
  - 56: Sky Blue (h:200)
  - 62: Indigo (h:240)
  - 80: Purple (h:270)
  - 120: Magenta (h:320)
  - 160+: White-ish (h:320, s:40)

#### 4. **Utilities**

**Vector** (`vector.ts`):

- Immutable 2D vector class
- Operations: `add()`, `sub()`, `mult()`, `angle()`, `setMag()`
- Static methods: `fromAngle()`, `dist()`, `fromJSON()`

**Safe Random** (`safeRandom.ts`):

- Deterministic seeded RNG (XSH RR algorithm + murmur2 hash)
- Ensures reproducible simulations from hex seed strings
- Methods: `random()`, `int()`, `gauss()`, `choice()`

**Safe Math** (`safeMath.ts`):

- Performance-optimized math utilities
- Fast approximations: `sqrt()`, `atan2()` with lookup tables
- `rescale()`, `interpolate()` for value mapping

**Configuration** (`spec.ts`):

- Centralized `Spec` class with 20+ tunable parameters
- Mote settings: radius (42), force (0.1), collision decay (9)
- Cluster settings: radius, cohesion, separation (currently disabled)
- Flow field: 30 disturbances, movement coefficients
- Color palette definition
- Debug mode toggle

### Data Flow

1. **Initialization (React mount)**

   - `Currents.tsx` creates canvas element
   - `Instance` constructor spawns Web Worker
   - Worker receives: seed, dimensions, `Spec` configuration
   - Worker initializes: `MoteSimulator`, `DynamicFlowField`

2. **Animation Loop (main thread)**

   - `requestAnimationFrame` calls `Instance.step()` → `Instance.draw()`
   - `step()`: Posts "step" message to worker
   - Worker performs physics simulation
   - Worker responds with updated mote `Float32Array` (transferable)

3. **Rendering (main thread)**
   - `MoteRenderer.render()` receives mote data
   - Clears canvas with background color
   - Iterates 4,200 motes, drawing ellipses with computed colors
   - Optionally renders cluster outlines and debug overlay

### Performance Optimizations

- **Float32Array storage**: 50% memory reduction vs. object arrays
- **Spatial grid collision**: 1000× faster than all-pairs comparison
- **Web Worker**: Physics runs parallel to rendering
- **Transferable objects**: Zero-copy mote data transfer
- **Grid-based flow field**: Pre-computed at 4-unit intervals

## Key Configuration Parameters

From `spec.ts`:

```typescript
numMotes = 4200; // Particle count
moteRadius = 42; // Collision detection radius
moteRenderRadius = 2.94; // Visual size (42 * 0.07)
moteForce = 0.1; // Collision response strength
moteCollisionDecay = 9; // Force falloff distance

numDisturbances = 30; // Flow field generators
flowCoefficient = 0.5; // How much motes follow flow
disturbanceRadiusMean = 100; // Average disturbance size
disturbanceRadiusVariance = 200; // Size randomness

clusterRadius = 14; // Proximity for cluster membership
clusterCohesionFactor = 0.0; // Currently disabled
```

## Development and Testing

### Scripts

```bash
npm start          # Dev server with hot reload (Parcel)
npm run build      # Production build (minified)
npm test           # Run unit tests (Jest)
npm run perf       # Run performance benchmarks (Jest)
```

### Project Structure

```
src/
├── pages/                    # React components
│   ├── index.tsx            # Entry point
│   ├── App.tsx              # Router configuration
│   ├── Currents.tsx         # Main simulation page
│   ├── LandingPage.tsx      # Landing page
│   └── *.css                # Styles
├── Core Simulation (portable, no dependencies)
│   ├── instance.ts          # Orchestration layer
│   ├── moteSimulator.ts     # Physics engine
│   ├── moteSimulationWorker.ts  # Web Worker wrapper
│   ├── flowField.ts         # Flow field generation
│   ├── moteRenderer.ts      # Rendering logic
│   ├── renderContext.ts     # Canvas abstraction
│   └── vector.ts            # Vector math
├── Utilities
│   ├── spec.ts              # Configuration
│   ├── safeRandom.ts        # Seeded RNG
│   ├── safeMath.ts          # Optimized math
│   ├── colorUtils.ts        # HSB→RGB conversion
│   ├── colorInterpolationSystem.ts  # Color mapping
│   └── randomSeed.ts        # Seed generation
└── public/                  # Static assets
```

## Recent Changes

**p5.js Removal (Latest):**

- Migrated from p5.js to native Canvas API
- Removed 5 MB dependency (134k lines of code)
- Implemented custom HSB→RGB color conversion
- Replaced p5 animation loop with `requestAnimationFrame`
- Built custom FPS counter
- **Bundle size reduction: 100% (5 MB → 0 MB)**

## Future Enhancements

- Enable and tune cluster dynamics for emergent behaviors
- Add interactive controls for real-time parameter adjustment
- Implement zoom/pan camera controls
- Explore WebGL renderer for 10k+ motes
- Add recording/export functionality (image sequences, video)
- Create preset "scenes" with different parameter configurations
- Add touch/gesture support for mobile

## Integration Notes

The core simulation engine (`src/*.ts` files excluding `pages/`) is **framework-agnostic** and can be integrated into any JavaScript environment:

- Zero external runtime dependencies
- Works with any bundler (Vite, Webpack, esbuild, Rollup)
- Web Worker compatible
- TypeScript with ES2016 target (broad compatibility)

To integrate into another project:

1. Copy all `src/*.ts` files (excluding `pages/`)
2. Create canvas element in your framework
3. Instantiate `Instance` with canvas, seed, dimensions
4. Call `instance.start()` to begin animation
5. Call `instance.stop()` when cleaning up

## License

MIT

---

**Author:** Dandelion Indigo Mané
