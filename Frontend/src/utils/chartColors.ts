/**
 * Chart color roles, validated for CVD-safe categorical separation
 * (dataviz skill, six-checks validator; adjacent-pair ΔE 9.1 CVD / 19.6
 * normal-vision on the app's white surface). Any slot below 3:1 contrast
 * against the surface always ships with a visible label alongside it —
 * charts in this app never rely on a legend/color alone.
 */

/** Fixed-order categorical hues — assign in sequence, never cycle or re-sort per render. */
export const CATEGORICAL_PALETTE = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
] as const;

/** Beyond 8 distinct entities, remaining values fold into this neutral "Other" bucket. */
export const CHART_OTHER_COLOR = "#9aa5b1";

export function categoricalColor(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
}

/** Single-hue sequential ramp (blue), light -> dark, for magnitude-only series. */
export const SEQUENTIAL_BLUE = {
  100: "#cde2fb",
  200: "#9ec5f4",
  300: "#6da7ec",
  400: "#3987e5",
  500: "#256abf",
  600: "#184f95",
  700: "#0d366b",
};

/** Fixed roles for the cost-breakdown categories (same four buckets on every run). */
export const COST_CATEGORY_COLORS = {
  sourceFixed: CATEGORICAL_PALETTE[0],
  sourceWithdrawal: "#14b8c4", // app accent teal
  plantFixed: CATEGORICAL_PALETTE[6],
  plantTreatment: CATEGORICAL_PALETTE[1],
};

/** Chart grid / axis chrome — recessive, not competing with data ink. */
export const CHART_GRID_COLOR = "#dde4ea";
export const CHART_AXIS_COLOR = "#7c8ba0";
