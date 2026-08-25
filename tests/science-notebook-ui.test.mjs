import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
    "data-collapse-sentinel",
    "data-exhibit-canvas",
    "data-toggle",
    "data-restart",
  ]) {
    assert.ok(markup.includes(hook), `missing ${hook}`);
  }

  assert.match(component, /\[data-compact\] \.tank\s*{/);
  assert.match(component, /position: sticky;/);
  assert.match(component, /const scale = width \/ frame\.width;/);
  assert.match(markup, /class="tank-controls"\s+role="group"/);
  assert.doesNotMatch(markup, /aria-pressed/);
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
