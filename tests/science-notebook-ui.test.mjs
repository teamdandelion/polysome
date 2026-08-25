import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateTankWindow } from "../demo/src/science/tankGeometry.ts";

const componentPath = new URL(
  "../demo/src/components/ScienceExhibit.astro",
  import.meta.url,
);
const component = await readFile(componentPath, "utf8");
const markup = component.slice(0, component.indexOf("<script>"));

test("each exhibit reads as title, aquarium, then evidence", () => {
  const heading = markup.indexOf('class="exhibit-heading"');
  const aquarium = markup.indexOf('class="tank-rail"');
  const narrative = markup.indexOf('class="exhibit-copy"');

  assert.ok(heading >= 0, "missing exhibit heading");
  assert.ok(aquarium > heading, "aquarium must follow the title");
  assert.ok(narrative > aquarium, "text and figures must follow the aquarium");
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
  assert.match(component, /position: sticky;/);
  assert.match(component, /const scale = width \/ frame\.width;/);
  assert.match(markup, /class="tank-controls"\s+role="group"/);
  assert.doesNotMatch(markup, /aria-pressed/);
});

test("the aquarium shrinks one-for-one before clamping at half height", () => {
  const expanded = 632;
  const stickyTop = 69;

  assert.deepEqual(calculateTankWindow(100, stickyTop, expanded), {
    collapse: 0,
    height: 632,
    phase: "expanded",
  });
  assert.deepEqual(calculateTankWindow(stickyTop, stickyTop, expanded), {
    collapse: 0,
    height: 632,
    phase: "expanded",
  });
  assert.deepEqual(calculateTankWindow(-31, stickyTop, expanded), {
    collapse: 100,
    height: 532,
    phase: "shrinking",
  });
  assert.deepEqual(calculateTankWindow(-247, stickyTop, expanded), {
    collapse: 316,
    height: 316,
    phase: "compact",
  });
  assert.deepEqual(calculateTankWindow(-500, stickyTop, expanded), {
    collapse: 316,
    height: 316,
    phase: "compact",
  });
});

test("auto-wake preserves explicit pause and reduced-motion choices", () => {
  assert.match(component, /const autoWake = \(\) =>/);
  assert.match(component, /manuallyPaused/);
  assert.match(component, /reducedMotion\.matches/);
  assert.match(component, /polysome:activate-exhibit/);
  assert.match(component, /worker !== activeWorker/);
  assert.match(component, /event\.persisted/);
  assert.match(component, /clearSurface\(\)/);
});
