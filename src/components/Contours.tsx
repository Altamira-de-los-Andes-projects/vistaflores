// Signature motif: altitude / topographic contour lines
// Generated smooth elevation curves — the quiet visual thread unique to the
// estate (1.077 m s.n.m.). Uses currentColor so it adapts to light/dark.
export function Contours({
  className = '',
  lines = 9,
  seed = 1,
  opacity = 0.5,
}: {
  className?: string;
  lines?: number;
  seed?: number;
  opacity?: number;
}) {
  const W = 1440;
  const H = 560;
  const paths: string[] = [];
  for (let i = 0; i < lines; i++) {
    const base = H * 0.16 + (i / (lines - 1)) * H * 0.72;
    const amp = 54 + i * 11;
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 16) {
      const t = x / W;
      const y =
        base -
        amp * Math.exp(-Math.pow((t - 0.46) * 3.1, 2)) -
        amp * 0.4 * Math.exp(-Math.pow((t - 0.82) * 5.5, 2)) +
        9 * Math.sin(t * 5.5 + i * 0.7 + seed);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    paths.push('M' + pts.join(' L'));
  }
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ opacity }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
