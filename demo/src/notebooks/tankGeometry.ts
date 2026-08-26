export const COMPACT_TANK_VIEWPORT_SHARE = 1 / 3;
export const COMPACT_TANK_MIN_HEIGHT = 144;

export type TankWindowPhase = "expanded" | "shrinking" | "compact";

export type TankWindowGeometry = {
  collapse: number;
  height: number;
  phase: TankWindowPhase;
};

/**
 * Keep the compact aquarium inside the top third of the viewport, including
 * the sticky site header. A small floor keeps its controls usable in short
 * viewports.
 */
export const calculateCompactTankHeight = (
  viewportHeight: number,
  stickyTop: number,
  expandedHeight: number,
): number => {
  if (
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0 ||
    !Number.isFinite(stickyTop) ||
    stickyTop < 0 ||
    !Number.isFinite(expandedHeight) ||
    expandedHeight <= 0
  ) {
    throw new RangeError(
      "Compact tank geometry requires a positive viewport and finite dimensions",
    );
  }

  return Math.min(
    expandedHeight,
    Math.max(
      COMPACT_TANK_MIN_HEIGHT,
      viewportHeight * COMPACT_TANK_VIEWPORT_SHARE - stickyTop,
    ),
  );
};

/**
 * Turn document scroll into a window onto a fixed-size simulation surface.
 * The window begins shrinking once its source spacer reaches the sticky top,
 * loses one pixel of height per pixel scrolled, and stops at compactHeight.
 */
export const calculateTankWindow = (
  spacerTop: number,
  stickyTop: number,
  expandedHeight: number,
  compactHeight: number,
): TankWindowGeometry => {
  if (
    !Number.isFinite(spacerTop) ||
    !Number.isFinite(stickyTop) ||
    !Number.isFinite(expandedHeight) ||
    expandedHeight <= 0
  ) {
    throw new RangeError(
      "Tank geometry requires finite positions and a positive height",
    );
  }
  if (
    !Number.isFinite(compactHeight) ||
    compactHeight <= 0 ||
    compactHeight > expandedHeight
  ) {
    throw new RangeError(
      "Tank compact height must be positive and no larger than its expanded height",
    );
  }

  const maximumCollapse = expandedHeight - compactHeight;
  const collapse = Math.min(
    maximumCollapse,
    Math.max(0, stickyTop - spacerTop),
  );
  const phase: TankWindowPhase =
    collapse === 0
      ? "expanded"
      : collapse === maximumCollapse
        ? "compact"
        : "shrinking";

  return {
    collapse,
    height: expandedHeight - collapse,
    phase,
  };
};
