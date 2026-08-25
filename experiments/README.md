# Experiments

Experiment manifests are immutable descriptions of Polysome trajectories. The
first reference manifest, `current-portrait-baseline.json`, fixes the current
portrait bounds, every simulation parameter, the iOS benchmark seed, metric
checkpoints, and a future clip schedule. At 30 simulation steps per second its
9,000-step burn-in is five simulated minutes and its 300-step recording window
is ten seconds.

Build the package, then run the headless experiment:

```sh
npm run build
node tools/run-experiment.mjs
```

The command emits deterministic JSON to stdout. A short validation run and a
saved result look like this:

```sh
node tools/run-experiment.mjs --until 150
node tools/run-experiment.mjs --output results/current-portrait-baseline.json
node tools/run-experiment.mjs --spec experiments/current-portrait-baseline.json
```

`--until` truncates execution but deliberately retains the full manifest's
`runId`: it is a partial observation of the same trajectory, not a different
experiment. The runner only advances simulation state and computes morphology;
it never creates a canvas or depends on wall-clock frame timing. Rendering the
manifest's clip schedule is a separate, deterministic studio operation.

## Reproducibility contract

The schema is `polysome.experiment/v1`. Unknown or missing keys are rejected so
that an apparently harmless new setting cannot silently escape the identity
hash. The `runId` is the SHA-256 digest of canonical JSON containing:

- schema and dynamics version;
- lower-cased seed, bounds, and every simulation parameter;
- measurement checkpoints; and
- the burn-in and recording schedule.

The human-readable `label`, result timestamps (none are currently emitted),
package version, Git commit, output path, and `--until` are excluded. Package and
commit provenance still appear in the result. `dynamicsVersion` is the promise
that two implementations have the same transition rules; increment it for any
behavioral change, even one intended as an optimization. A result is comparable
only when its run ID, metric implementation, and engine provenance are known.

Do not edit an established manifest in place after results or links refer to
it. Copy it, change the label or parameters, and commit the new manifest.

See [the science plan](../docs/science.md) for measurements, parameter mapping,
ablations, and the proposed hosted studio.

## Reference result

[`results/current-portrait-baseline.json`](results/current-portrait-baseline.json)
is the first complete output for the reference manifest. It was generated from
commit `1f9659e` and retains all eight morphology checkpoints through step 9,000.
The result is evidence for that exact trajectory; it is not yet an estimate of
the frequency of the phenotype across random seeds.
