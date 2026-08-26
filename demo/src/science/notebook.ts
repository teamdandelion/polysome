import {
  findScienceExhibit,
  type ScienceExhibit,
} from "../../../src/scienceExhibits.ts";

type NotebookPresentation = Pick<
  ScienceExhibit,
  "number" | "eyebrow" | "title" | "question" | "claim" | "interpretation"
>;

/**
 * Publication is an explicit editorial decision. Registered specimens can
 * remain useful regression fixtures without becoming public conclusions.
 */
export const NOTEBOOK_SPECIMEN_IDS = ["self-organization"] as const;

const PRESENTATION: Record<
  (typeof NOTEBOOK_SPECIMEN_IDS)[number],
  NotebookPresentation
> = {
  "self-organization": {
    number: "00",
    eyebrow: "System check · one fixed seed",
    title: "Reference specimen",
    question: "Can this notebook reproduce one complete recipe?",
    claim:
      "The browser and CI each run the same registered seed to step 300, compute three diagnostics, and compare them with registered ranges.",
    interpretation:
      "Passing validates the notebook pipeline for one deterministic run. It does not explain the pattern, show that this seed is representative, or establish a mechanism.",
  },
};

export const NOTEBOOK_EXHIBITS: readonly ScienceExhibit[] = Object.freeze(
  NOTEBOOK_SPECIMEN_IDS.map((id) =>
    Object.freeze({ ...findScienceExhibit(id), ...PRESENTATION[id] }),
  ),
);
