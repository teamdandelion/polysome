import type { SimulationParams } from "../../../src/simulationParams.ts";

export type NotebookEntry = {
  id: string;
  title: string;
  eyebrow: string;
  introduction: string;
  notes: readonly string[];
  seed: string;
  width: number;
  height: number;
  simulation: Readonly<Partial<SimulationParams>>;
};

/**
 * Notebook entries run against the current Polysome source. This first entry
 * is a small end-to-end demonstration of the notebook container.
 */
export const HELLO_WORLD_NOTEBOOK: Readonly<NotebookEntry> = Object.freeze({
  id: "hello-world",
  eyebrow: "Notebook 00 · machinery check",
  title: "Hello, Polysome notebooks",
  introduction:
    "This fixed-seed run verifies that a notebook can host a live Polysome simulation alongside notes.",
  notes: Object.freeze([
    "The Worker advances the existing simulator one requested step at a time.",
    "The main thread draws returned mote positions and pressure with Polysome’s existing MoteRenderer.",
  ]),
  seed: "0x1b50318e0b301eab6c7147d253268b6a06cdb98920792de015b8927cdd44087a",
  width: 622.82,
  height: 1000,
  simulation: Object.freeze({}),
});

export const NOTEBOOKS: readonly NotebookEntry[] = Object.freeze([
  HELLO_WORLD_NOTEBOOK,
]);

export function findNotebook(id: string): NotebookEntry {
  const notebook = NOTEBOOKS.find((candidate) => candidate.id === id);
  if (!notebook) throw new Error(`Unknown notebook: ${id}`);
  return notebook;
}
