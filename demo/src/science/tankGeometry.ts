export const COMPACT_TANK_RATIO = 0.5;

export type TankWindowPhase = "expanded" | "shrinking" | "compact";

export type TankWindowGeometry = {
  collapse: number;
  height: number;
  phase: TankWindowPhase;
};

/**
 * Turn document scroll into a window onto a fixed-size simulation surface.
 * The window begins shrinking once its source spacer reaches the sticky top,
 * loses one pixel of height per pixel scrolled, and stops at half height.
 */
export const calculateTankWindow = (
  spacerTop: number,
  stickyTop: number,
  expandedHeight: number,
  compactRatio = COMPACT_TANK_RATIO,
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
  if (!Number.isFinite(compactRatio) || compactRatio <= 0 || compactRatio > 1) {
    throw new RangeError(
      "Tank compact ratio must be greater than 0 and at most 1",
    );
  }

  const maximumCollapse = expandedHeight * (1 - compactRatio);
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
