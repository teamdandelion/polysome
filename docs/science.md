# Polysome as an experimental system

Polysome should be treated as a deterministic, driven particle system whose
images are observations, not definitions, of its behavior. The first goal is
to turn the current portrait configuration into a reproducible reference
phenotype; the second is to explain which rules are necessary and sufficient
for the clumps, voids, and apparent cores.

The checked-in `polysome.experiment/v1` manifest fixes the current seed, portrait
bounds, all simulation parameters, measurement times, and a five-minute
burn-in plus ten-second recording schedule. It is a reference trajectory, not
yet evidence that the same phenotype is typical across seeds.

## First validation trajectory

The committed [reference result](../experiments/results/current-portrait-baseline.json)
measures the fixed iOS benchmark seed from an initially uniform placement. The
contact ratio compares observed neighbor pairs with a nominal uniform point
field; the other columns use cells approximately one interaction radius wide.

|  Step | Contact ratio | Density CV | Empty cells | Largest 2x-density mass | Cumulative reinjections |
| ----: | ------------: | ---------: | ----------: | ----------------------: | ----------------------: |
|     1 |         0.955 |      0.274 |        0.0% |                    0.0% |                       0 |
|   300 |         1.768 |      0.753 |       16.1% |                    9.7% |                      95 |
|   900 |         1.833 |      0.796 |       20.6% |                    4.7% |                     332 |
| 1,800 |         2.054 |      0.886 |        9.4% |                   32.5% |                   1,244 |
| 9,000 |         2.060 |      0.907 |       12.5% |                   30.0% |                   6,882 |

This validates the visual observation in state space: the model creates both
excess local contacts and empty regions from a nearly uniform start. It also
shows that the phenotype is dynamic. Void fraction and dense-component mass do
not change monotonically, so experiments should measure trajectories, event
lifetimes, and fraction of time in a regime rather than only an endpoint.

## The current model

At each discrete step, mote `i` counts neighbors inside interaction radius `R`
and receives a pairwise repulsive displacement. The repulsion has magnitude
`moteForce` through most of the radius and tapers to zero in the outer
`pressureDecay * R` shell. Its other displacement follows a sampled direction
field:

```text
x_i(t + 1) = x_i(t)
             + flowCoefficient * cxFlowCoefficient^pressure_i * e(theta(x_i,t))
             + sum_j repulsion(i,j)
             + boundaryForce(x_i)
```

The direction angle is a global base angle plus overlapping circular
disturbances. Each disturbance contributes an angular offset that decreases
linearly from its center to its sampled radius; disturbance centers drift and
bounce. Motes that leave are re-injected randomly near an edge, while the soft
boundary force points inward.

Several explanations for the visible morphology are therefore plausible, but
remain hypotheses until tested:

1. **Compressible transport.** Spatial changes in direction create convergent
   and divergent regions separated by moving basins. Convergence supplies dense
   cores; divergence evacuates voids.
2. **Pressure-supported finite structure.** Short-range repulsion arrests total
   collapse and sets a local separation scale. Moving convergence zones stretch
   those dense populations into droplets, chains, and shells.
3. **A driven boundary ensemble.** Inward soft walls plus edge re-injection may
   create the global envelope and central concentration independently of the
   local disturbance pattern.
4. **Weak density/flow feedback.** `cxFlowCoefficient^pressure` makes dense motes
   follow the field slightly more strongly. Its default value is close to one,
   but the exponent can be large, so an ablation is more informative than its
   nominal size.
5. **Perceptual amplification.** Color is pressure, and a rendered mote is only
   a small fraction of its interaction radius. Bright dense regions and dark
   gaps can look sharper than the underlying point-density contrast.

`legacy-v1` also randomly chooses the base flow angle from the seeded stream;
the current `defaultTheta` parameter does not set it. Preserve that fact for the
reference dynamics, then test an explicit-angle version under a new dynamics
version. Pressure is stored in eight bits, so sweeps that exceed 255 neighbors
would wrap and must either be excluded or assigned a new, wider-counter
dynamics version.

## Define the phenotype before optimizing it

A useful phenotype is a vector with uncertainty, not a single aesthetic score.
Measure at fixed simulation steps on state snapshots, independent of rendering:

- coarse density occupancy, coefficient of variation, entropy, and empty-cell
  fraction;
- connected occupied components, their mass distribution, and largest-cluster
  fraction across several spatial thresholds;
- number and prominence of peaks in a smoothed density field, mass captured by
  the top one and two peaks, and radial density around those peaks;
- void area and largest connected void, preferably across several density
  thresholds rather than one arbitrary cutoff;
- nearest-neighbor distance, pair-correlation `g(r)`, and the dominant peak of
  the structure factor, which estimate the clump/void length scale;
- pressure distribution and its spatial correlation with density;
- aggregate centroid, covariance eigenvalues, and orientation, separating a
  one-core elongated body from two distinct cores; and
- temporal autocorrelation, peak lifetime, boundary-crossing rate, and drift of
  every summary after burn-in.

The current fingerprint implements contacts, pressure quantiles, centroid and
covariance, multiscale occupancy statistics, dense-component threshold curves,
connected empty regions, and reinjection flux. Peak persistence, pair
correlation, spectra, and lagged flow-divergence tests are the next measurement
layer.

The first morphology implementation can be a cheap subset of this list. Keep a
`metricVersion` with results as definitions mature. Persistent homology of the
smoothed density field (components and holes across thresholds) is a strong
later test because it measures “clumps separated by voids” without choosing a
single cutoff.

Validation has three layers:

1. Run the checked-in seed twice and require byte-identical checkpoint results.
2. Visually review its deterministic recording against the familiar artwork.
3. Run an ensemble of at least 16–32 independent seeds and report distributions
   and confidence intervals. The screenshot and original seed anchor the study;
   the ensemble establishes whether the phenomenon is a regime.

## Map the regimes

Start with interpretable, dimensionless controls rather than an 18-dimensional
Cartesian grid:

- interaction load `N * pi * R^2 / area`;
- transport/repulsion ratio `flowCoefficient / moteForce`;
- pressure feedback strength `log(cxFlowCoefficient) * typicalPressure`;
- disturbance coverage, angular variance, and disturbance-radius/domain ratio;
- disturbance motion time divided by mote transport time;
- boundary-zone/domain ratio and boundary/flow force ratio; and
- aspect ratio plus flow-grid spacing/interaction-radius ratio.

Use the following sequence:

1. **Local curves:** vary one control around the reference by roughly
   `0.5x, 0.75x, 1x, 1.5x, 2x`, with repeated seeds. This catches broken ranges
   and reveals monotonicity.
2. **Space-filling screen:** sample 256–512 points with a seeded Sobol or Latin
   hypercube design, using logarithmic scales for positive force, count, and
   length parameters. Run 4–8 seeds per point.
3. **Regime map:** cluster standardized phenotype vectors, label recognizable
   phases (uniform, filaments, clump/void, one core, two cores, boundary ring,
   collapse), and render medoids rather than cherry-picked runs.
4. **Boundary refinement:** actively sample where neighboring parameter points
   disagree or the classifier is uncertain. Confirm candidate boundaries with
   more seeds and longer time windows.

Every generated point should be a complete manifest derived from a committed
design manifest. Record design seed, code commit, dynamics and metric versions,
run ID, parent run ID if any, status, and artifact hashes. Never reuse one
simulation seed as the sampling seed for parameter selection.

## Causal ablations and simplification

Run these before rewriting the engine: no moving disturbances, no disturbances,
one disturbance, fixed base direction, no pressure/flow multiplier, periodic or
reflecting boundaries instead of re-injection, no soft boundary force, and
constant disturbance radii. Factorial combinations distinguish causes that are
only effective together.

Candidate reductions can then be judged against distributions of phenotype
vectors and trajectories, not one final frame:

- reduce mote count while scaling `R` to preserve interaction load;
- update the direction field every `k` steps and interpolate;
- enlarge flow-field spacing while holding spacing/`R` controlled;
- use interaction-radius-sized spatial hash cells to reduce candidate pairs;
- remove density/flow feedback if its ablation is equivalent; and
- replace the many sampled disturbances with the smallest analytic field that
  preserves peak, void, spectrum, and lifetime statistics.

Classify changes as bitwise-equivalent, statistically equivalent, or
phenotype-preserving. A faster implementation that changes floating-point
summation order may fail the first class while satisfying the latter two. Any
transition-rule, RNG-order, precision, boundary, or overflow change gets a new
`dynamicsVersion` and must be compared to `legacy-v1` with paired seeds.

## The public notebook scaffold

The development site exposes `/science` as a deliberately minimal mobile-first
notebook. It publishes one reference specimen to verify that a complete seeded
recipe can run in a Web Worker, render with the artwork's renderer, produce
diagnostics, and be reproduced by CI. This is an instrument check, not yet an
explanation of the pattern or evidence that one seed is representative.

Numerical specimens are registered in `src/scienceExhibits.ts`. Public entries
are promoted explicitly in `demo/src/science/notebook.ts`, so a useful
regression fixture does not automatically become a published scientific claim.
The soft-wall and pair-repulsion configurations remain registered for software
regression while their scientific interpretation awaits deliberate experimental
design. Run the registrar locally with:

```sh
npm run test:exhibits
npm run check:evidence
```

CI gives these checks their own PR-gating **Exhibit claims** job. It fails when a
deterministic specimen falls outside its registered ranges or when a paired
comparison no longer holds. Those are software reproducibility contracts, not
proof of universality; the seed-ensemble program above remains the route to
population-level claims.

## Studio architecture

Keep the deterministic kernel, measurement, rendering, orchestration, and
storage as separate layers:

```text
manifest -> headless Simulation -> snapshots -> morphology
                              \-> renderer -> frames -> clip
```

The immediate browser studio can run the headless kernel in a Web Worker,
fast-forward 9,000 steps without drawing, then render exactly 300 successive
states at 30 fps. A run page should load by immutable run ID, expose the full
manifest and metrics, compare checkpoints, and reproduce or download the clip.

For hosted experiments, use a small Cloudflare API Worker to validate manifests
and derive run IDs, a Queue to schedule work, R2 for manifests/results/snapshots/
clips, and D1 for searchable labels and phenotype columns. Deduplicate jobs by
run ID. Put the expensive 4,200-mote fast-forward and deterministic video encode
in a container worker or CI runner; ordinary request Workers should coordinate,
not hold long simulations. A Web Worker client can be the first compute backend
while server compute is being built.

An Astro studio route can provide:

- a parameter editor that always materializes a complete manifest;
- seeded sweeps and two-dimensional phase maps;
- trajectory plots and side-by-side paired-seed ablations;
- “fast-forward five minutes, record ten seconds” jobs with durable status; and
- stable URLs such as `/studio/runs/<runId>` and
  `/studio/runs/<runId>/clip.mp4`.

Build this in increments: reference headless result, deterministic snapshot
renderer, one local sweep and phase plot, persisted run pages, then queued batch
experiments. That order makes the cloud studio a presentation of verified
science rather than a second source of simulation truth.
