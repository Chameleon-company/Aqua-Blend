/**
 * Static CSS/SVG fallback — used for `prefers-reduced-motion`, WebGL
 * failures, and while the interactive canvas loads. No animation, so it
 * trivially respects reduced-motion (AquaBlend_frontend_layout.md §4.3/§4.4).
 */
const COLUMNS = 28;
const ROWS = 16;

export function ReducedMotionFallback() {
  const dots = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const x = (col / (COLUMNS - 1)) * 100;
      const y = (row / (ROWS - 1)) * 100;
      // Static "frozen wave" offset, computed once — no runtime animation.
      const wave = Math.sin(col * 0.5 + row * 0.3) * 3 + Math.sin(row * 0.4) * 2;
      const opacity = 0.25 + 0.5 * ((Math.sin(col * 0.45 + row * 0.6) + 1) / 2);
      dots.push(
        <circle
          key={`${row}-${col}`}
          cx={`${x}%`}
          cy={`${y + wave}%`}
          r={row % 3 === 0 ? 2.4 : 1.6}
          className="fill-accent"
          opacity={opacity}
        />,
      );
    }
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Stylised still water surface made of dots"
      className="h-full w-full"
    >
      {dots}
    </svg>
  );
}
