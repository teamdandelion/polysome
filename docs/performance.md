# Performance benchmarking

Polysome's development frontend includes a low-overhead benchmark at `/debug`.
It records frame pacing and the time spent in simulation, collision processing,
and Canvas rendering without changing the artwork.

## Run on an iPhone

1. Open the pull request preview's `/debug` URL in Safari.
2. Keep the tab visible and avoid interacting with the page during the run.
3. Let the default benchmark complete its 5-second warm-up and 60-second
   measurement.
4. Tap **Copy JSON** and save the report with the code or pull request being
   tested.
5. Use **Run 5m** for a sustained test that can reveal thermal degradation.

For useful comparisons, use the same phone, orientation, seed, and benchmark
settings. A hidden tab invalidates the run automatically. Low Power Mode,
device temperature, background activity, and whether Safari is attached to Web
Inspector can all affect results, so record those conditions alongside the
JSON when they differ.

The standard iPhone profile matches the dandelion.art integration: 30 fps, a
maximum 1.5× canvas pixel ratio, 4,200 motes, and the debug page's fixed seed.
Query parameters can override the profile:

```text
/debug?duration=60&warmup=5&fps=30&dpr=1.5&motes=4200&seed=comparison-a
```

`duration` accepts 10–600 seconds, `warmup` 0–30 seconds, `fps` 10–120,
`dpr` 0.5–3, and `motes` 250–10,000. `seed` accepts any non-empty string.

## Report fields

The report includes the user agent, viewport and backing-store sizes, device
pixel ratio, selected Polysome configuration, actual frame rate, late-frame
percentage, work over the target frame budget, and mean/p50/p95/max timing for
each measured stage. `frameWorkDriftPercent` compares the first and final 20%
of measured frame work as a rough sustained-load signal; it is not itself a
temperature measurement.

Consumers can collect the same structured samples with `onPerformanceSample`:

```ts
const instance = new Instance(seed, 1000, 625, {
  onPerformanceSample(sample) {
    console.log(sample.frameMs, sample.collisionMs, sample.renderMs);
  },
});
```

Timing collection is disabled when neither `onPerformanceSample` nor
`logPerformance` is configured.
