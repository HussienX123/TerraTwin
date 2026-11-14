import React from 'react';
import {CAPTION, LIMITATION, SLOPE_COLORS, SLOPE_BANDS} from './terrainData';
const fields = [
  ['terrain_score', 'Terrain similarity'],
  ['environment_score', 'Environment'],
  ['mobility_score', 'Operational suitability'],
  ['overall_score', 'overall (exploratory)'],
  ['mean_slope_deg', 'Mean slope (°)'],
  ['p90_slope_deg', '90th-percentile slope (°)'],
  ['roughness', 'Roughness (slope standard deviation, °)'],
  ['elev_range_m', 'Elevation range (m)'],
  ['data_completeness', 'Data completeness'],
];
export default function TerrainInspector({earth, mars}) {
  return <div className="terrain-inspector">
    <h2>Site values</h2>
    {[earth, mars].filter(Boolean).map(site => <section className="grouped terrain-values" key={site.id}>
      <h3>{site.name}</h3>
      {site.values?.environment_mode === 'partial' && <span className="badge badge-warn">partial</span>}
      <dl>{fields.map(([key, label]) => <React.Fragment key={key}>
        <dt>{label}</dt><dd data-field={key}>{site.values?.[key] ?? 'n/a'}</dd>
      </React.Fragment>)}</dl>
      {site.status !== 'available' && <p>Terrain n/a. {site.reason}</p>}
    </section>)}
    <div className="terrain-legend" aria-label="Display slope classes">
      <h3>Slope colors</h3>
      {SLOPE_COLORS.map((color, i) => <span key={color}><i style={{background: color}}/>{SLOPE_BANDS[i]}</span>)}
    </div>
    <p className="small-note">{CAPTION}</p>
    <p className="small-note">{LIMITATION}</p>
    <p className="small-note muted">Screening hypotheses, not discoveries.</p>
  </div>;
}
