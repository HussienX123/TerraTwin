import React from "react";

const METRICS = [
  { key: "terrain_pct", label: "Terrain similarity" },
  { key: "environment_pct", label: "Environment" },
  { key: "mobility_pct", label: "Operational suitability" },
  { key: "overall_pct", label: "overall (exploratory)" },
];

export default function ValidationDotPlot({ rows }) {
  const W = 540;
  const H = 220;
  const left = 152;
  const right = W - 20;
  const span = right - left;
  const rowStep = 40;
  const top = 34;

  const xPos = (pct) => left + (Math.max(0, Math.min(100, pct)) / 100) * span;

  return (
    <div className="dotplot-wrap">
      <div className="dotplot-legend">
        <span className="swatch-item">
          <i className="dot-glyph analog" aria-hidden="true" /> Known analog (n=4)
        </span>
        <span className="swatch-item">
          <i className="dot-glyph negative" aria-hidden="true" /> Negative control (n=2)
        </span>
        <span className="muted small-note">Percentile rank (0–100, land cells)</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="dotplot-svg"
        role="img"
        aria-label="Dot plot of percentile ranks for the 4 known analogs and 2 negative controls across all 4 scores"
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const x = xPos(tick);
          return (
            <g key={tick}>
              <line x1={x} y1={top - 10} x2={x} y2={top + METRICS.length * rowStep - 12} className="plot-grid" />
              <text x={x} y={16} textAnchor="middle" className="plot-axis">{tick}</text>
            </g>
          );
        })}

        {METRICS.map((m, idx) => {
          const y = top + idx * rowStep + 12;
          return (
            <g key={m.key}>
              <text x={left - 10} y={y + 4} textAnchor="end" className="plot-label">
                {m.label}
              </text>
              <line x1={left} y1={y} x2={right} y2={y} className="plot-track" />
              {rows.map((r) => {
                const val = r[m.key];
                if (val == null) return null;
                const x = xPos(val);
                return <circle key={r.name} cx={x} cy={y} r={5.5} className="plot-dot-pos"><title>{r.name+': '+val.toFixed(1)+' pct ('+r.group+')'}</title></circle>;
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
