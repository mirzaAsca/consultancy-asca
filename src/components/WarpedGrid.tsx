import { GRID_CELL_PX } from '../layout'

/**
 * Background grid with perspective-bent lines.
 * Vertical lines bow outward from center toward the bottom.
 * Horizontal lines sag at the edges toward the bottom.
 * Rendered as two combined SVG <path> elements for performance.
 *
 * Wrapped in an overflow-hidden container so the SVG never
 * contributes to scroll height.
 */
export default function WarpedGrid() {
  const W = 3000
  const H = 4000
  const cell = GRID_CELL_PX
  const cx = W / 2

  // Warp intensity — aggressive so curvature is visible in the first ~2000px
  const maxBow = 320
  const maxSag = 90

  // ── Vertical lines: straight at top, bowing outward at bottom ──
  let vd = ''
  const cols = Math.ceil(W / cell) + 1
  for (let i = 0; i <= cols; i++) {
    const x = i * cell
    const rel = (x - cx) / cx // -1 … +1
    const d = rel * maxBow
    // Cubic bezier — straight in the top 15%, then curves hard
    vd += `M${x},0 C${x},${H * 0.15} ${x + d * 0.55},${H * 0.5} ${x + d},${H} `
  }

  // ── Horizontal lines: straight at top, edges droop toward the bottom ──
  let hd = ''
  const rows = Math.ceil(H / cell) + 1
  for (let j = 0; j <= rows; j++) {
    const y = j * cell
    const progress = Math.pow(y / H, 1.3) // starts warping earlier
    const sag = progress * maxSag
    hd += `M0,${y + sag} Q${cx},${y - sag * 0.3} ${W},${y + sag} `
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute left-1/2 top-0 -translate-x-1/2"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
      >
        <defs>
          <linearGradient id="grid-v-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.09" />
            <stop offset="18%" stopColor="#0f172a" stopOpacity="0.09" />
            <stop offset="88%" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={vd} fill="none" stroke="url(#grid-v-fade)" strokeWidth="1" />
        <path d={hd} fill="none" stroke="url(#grid-v-fade)" strokeWidth="1" />
      </svg>
    </div>
  )
}
