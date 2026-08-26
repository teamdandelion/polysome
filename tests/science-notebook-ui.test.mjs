import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateCompactTankHeight,
  calculateTankWindow,
} from "../demo/src/science/tankGeometry.ts";
import {
  NOTEBOOK_EXHIBITS,
  NOTEBOOK_SPECIMEN_IDS,
} from "../demo/src/science/notebook.ts";
import { SCIENCE_EXHIBITS } from "../src/scienceExhibits.ts";

const componentPath = new URL(
  "../demo/src/components/ScienceExhibit.astro",
  import.meta.url,
);
const component = await readFile(componentPath, "utf8");
const markup = component.slice(0, component.indexOf("<script>"));
const worker = await readFile(
  new URL("../demo/src/science/exhibit.worker.ts", import.meta.url),
  "utf8",
);
const page = await readFile(
  new URL("../demo/src/pages/science/index.astro", import.meta.url),
  "utf8",
);
const evidence = JSON.parse(
  await readFile(
    new URL("../experiments/results/science-exhibits.json", import.meta.url),
    "utf8",
  ),
);

test("the public notebook explicitly promotes one neutral reference specimen", () => {
  assert.deepEqual([...NOTEBOOK_SPECIMEN_IDS], ["self-organization"]);
  assert.deepEqual(
    NOTEBOOK_EXHIBITS.map(({ id }) => id),
    ["self-organization"],
  );
  assert.ok(SCIENCE_EXHIBITS.length > NOTEBOOK_EXHIBITS.length);
  for (const exhibit of NOTEBOOK_EXHIBITS) {
    assert.ok(evidence.exhibits.some(({ id }) => id === exhibit.id));
    assert.match(exhibit.interpretation, /does not explain/);
  }
  assert.match(page, /NOTEBOOK_EXHIBITS\.map/);
  assert.doesNotMatch(page, /SCIENCE_EXHIBITS\.map/);
  assert.doesNotMatch(page, /ScienceTrajectoryFigure/);
  assert.match(page, /Reproducibility only/);
  assert.match(page, /does not yet explain/);
});

test("each exhibit reads as title, aquarium, then evidence", () => {
  const heading = markup.indexOf('class="exhibit-heading"');
  const aquarium = markup.indexOf('class="tank-rail"');
  const narrative = markup.indexOf('class="exhibit-copy"');

  assert.ok(heading >= 0, "missing exhibit heading");
  assert.ok(aquarium > heading, "aquarium must follow the title");
  assert.ok(narrative > aquarium, "text and figures must follow the aquarium");
  assert.match(markup, /<h2>\{exhibit\.title\}<\/h2>/);
  assert.match(
    markup,
    /<h3 id=\{`\$\{exhibit\.id\}-contract`\}>Registered diagnostics<\/h3>/,
  );
});

test("the aquarium exposes its long-lived viewport and controls", () => {
  for (const hook of [
    "data-tank",
    "data-tank-spacer",
    "data-exhibit-canvas",
    "data-toggle",
    "data-restart",
  ]) {
    assert.ok(markup.includes(hook), `missing ${hook}`);
  }

  assert.match(component, /--tank-window-height/);
  assert.match(component, /requestAnimationFrame\(updateTankGeometries\)/);
  assert.ok(
    component.indexOf("const measurements = Array.from") <
      component.indexOf(
        "for (const { registration, geometry } of measurements)",
      ),
    "all tank geometry reads must happen before the style writes",
  );
  assert.match(component, /data-tank-phase/);
  assert.match(component, /data-tank-chrome/);
  assert.match(component, /const COMPACT_CHROME_HEIGHT = 216;/);
  assert.match(component, /position: sticky;/);
  assert.match(component, /overflow: clip;/);
  assert.match(component, /calculateCompactTankHeight/);
  assert.match(markup, /class="tank-controls"\s+role="group"/);
  assert.doesNotMatch(markup, /aria-pressed/);
});

test("the aquarium shrinks one-for-one into the viewport's top third", () => {
  const expanded = 630;
  const stickyTop = 69;
  const compact = calculateCompactTankHeight(852, stickyTop, expanded);

  assert.equal(compact, 215);
  assert.equal(calculateCompactTankHeight(631, stickyTop, 517.4140625), 144);

  assert.deepEqual(calculateTankWindow(100, stickyTop, expanded, compact), {
    collapse: 0,
    height: 630,
    phase: "expanded",
  });
  assert.deepEqual(
    calculateTankWindow(stickyTop, stickyTop, expanded, compact),
    {
      collapse: 0,
      height: 630,
      phase: "expanded",
    },
  );
  assert.deepEqual(calculateTankWindow(-31, stickyTop, expanded, compact), {
    collapse: 100,
    height: 530,
    phase: "shrinking",
  });
  assert.deepEqual(calculateTankWindow(-346, stickyTop, expanded, compact), {
    collapse: 415,
    height: 215,
    phase: "compact",
  });
  assert.deepEqual(calculateTankWindow(-500, stickyTop, expanded, compact), {
    collapse: 415,
    height: 215,
    phase: "compact",
  });
});

test("science tanks share the artwork renderer and display cadence", () => {
  assert.match(component, /new RenderContext\(/);
  assert.match(component, /new MoteRenderer\(/);
  assert.match(component, /const MAX_PIXEL_RATIO = 2;/);
  assert.match(component, /requestAnimationFrame\(requestLiveFrame\)/);
  assert.match(worker, /message\.type === "tick"/);
  assert.doesNotMatch(component, /pressurePalette/);
  assert.doesNotMatch(worker, /liveFps/);
  assert.doesNotMatch(markup, /DPR 1/);
});

test("invalid compact geometry is rejected", () => {
  assert.throws(() => calculateTankWindow(0, 0, 100, 0), /compact height/);
});

test("auto-wake preserves explicit pause and reduced-motion choices", () => {
  assert.match(component, /const autoWake = \(\) =>/);
  assert.match(component, /manuallyPaused/);
  assert.match(component, /reducedMotion\.matches/);
  assert.match(component, /polysome:activate-exhibit/);
  assert.match(component, /worker !== activeWorker/);
  assert.match(component, /event\.persisted/);
  assert.doesNotMatch(
    component,
    /if \(event\.persisted\) \{\s*stopLiveFramePump\(\);\s*liveFramePending = false;/,
  );
  assert.match(
    component,
    /refreshRenderingSurface\(\);\s*refreshVisibility\(\);/,
  );
  assert.match(component, /clearSurface\(\)/);
});
