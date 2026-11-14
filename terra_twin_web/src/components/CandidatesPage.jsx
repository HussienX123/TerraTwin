import TerrainLink from './TerrainLink';
import {useSelection} from '../Selection';
import React from "react";
import { CLUSTER_USES } from "../content/uses";
import { fmt } from "../utils/scoring";
import { AlertIcon, MarsIcon } from "./Icons";
import DisagreementChart from "./DisagreementChart";

function featureLabel(name) {
  const labels = {
    mean_slope_deg: "Mean slope (°)",
    p90_slope_deg: "90th-percentile slope (°)",
    roughness: "Roughness (slope std, °)",
    elev_range_m: "Elevation range (m)",
    t_range_c: "Temp range (°C)",
    precip_mm_yr: "Precipitation (mm/yr)",
  };
  return labels[name] || name;
}

function buildClusterSummarySentence(clusters) {
  if (!clusters || clusters.length === 0) return "No candidate clusters available (n/a).";
  const allStats = clusters.flatMap((c) => [...(c.closest_to_jezero || []), ...(c.most_different || [])]);
  const getMean = (feat) => {
    const vals = allStats.filter((x) => x.feature === feat).map((x) => x.cluster_mean);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const getJez = (feat) => allStats.find((x) => x.feature === feat)?.jezero ?? null;

  return (
    `Across the top ${clusters.length} clusters, average mean slope is ${fmt(getMean("mean_slope_deg"), 2)}° vs ${fmt(getJez("mean_slope_deg"), 2)}° at Jezero ` +
    `and average roughness is ${fmt(getMean("roughness"), 2)}° vs ${fmt(getJez("roughness"), 2)}°: these candidates are flatter and smoother than Jezero, ` +
    `so they suit rover-mobility testing more than geological analog study.`
  );
}

function disagreementSentence(d) {
  if (d.type === "terrain_high_mobility_low") {
    return (
      `High terrain similarity (${fmt(d.terrain_score)}) but low operational suitability (${fmt(d.mobility_score)}): ` +
      `steep local relief (p90 slope ${fmt(d.p90_slope_deg)}°) lowers rover mobility.`
    );
  }
  return (
    `High operational suitability (${fmt(d.mobility_score)}) with low terrain similarity (${fmt(d.terrain_score)}): ` +
    `very flat ground (p90 slope ${fmt(d.p90_slope_deg)}°) is easy to drive across but does not resemble Jezero's terrain.`
  );
}

function ScoreBar({ label, value, highlight = false }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, Number(value)));
  return (
    <div className="score-bar-row">
      <div className="score-bar-meta">
        <span>{label}</span>
        <strong>{fmt(value)}</strong>
      </div>
      <div className="score-track" aria-hidden="true">
        <div className={`score-fill ${highlight ? "accent" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CandidatesPage({ candidates }) {
  const {setSelectedId}=useSelection();
  const clusters = candidates?.clusters || [];
  const disagreements = candidates?.disagreements || [];

  return (
    <section className="page-stack">
      <div className="card notice-banner">
        <h1>Candidates</h1>
        <p className="lead-note">Screening hypotheses, not discoveries.</p>
        <p>{buildClusterSummarySentence(clusters)}</p><p className="small-note muted">DBSCAN groups nearby cells into clusters. Earth SD means standard deviations across Earth cells, a measure of how much a value differs.</p>
        <p className="small-note muted">
          Top 5% overall (exploratory) threshold: {fmt(candidates?.top_threshold_overall)} ({candidates?.n_top_cells ?? "n/a"} cells;{" "}
          {candidates?.n_top_after_analog_exclusion ?? "n/a"} outside 300 km of known analogs; {candidates?.n_clusters_found ?? "n/a"} DBSCAN clusters found).
        </p>
      </div>

      {clusters.length === 0 ? (
        <div className="card muted">No candidate clusters present in dataset.</div>
      ) : (
        <div className="cluster-stack">
          {clusters.map((cl) => (
            <article className="card cluster-card" key={cl.rank}>
              <div className="cluster-head">
                <div>
                  <h2>Cluster #{cl.rank}</h2>
                  <p className="muted">
                    Center: {fmt(cl.center?.lat, 2)}°, {fmt(cl.center?.lon, 2)}° ; Cell count: {cl.n_cells ?? "n/a"}
                  </p>
                </div>
                <div className="badges">
                  {cl.n_cells <= 3 && <span className="badge badge-warn">small cluster</span>}
                  {cl.environment_mode === "partial" && <span className="badge badge-warn">partial</span>}
                </div>
              </div>

              <TerrainLink clusterRank={cl.rank}/><div className="bars-grid">
                <ScoreBar label="Terrain similarity" value={cl.mean_scores?.terrain_score} />
                <ScoreBar label="Environment (partial)" value={cl.mean_scores?.environment_score} />
                <ScoreBar label="Operational suitability" value={cl.mean_scores?.mobility_score} />
                <ScoreBar label="overall (exploratory)" value={cl.mean_scores?.overall_score} highlight />
              </div>

              <div className="two-col-compare">
                <div className="compare-box">
                  <h3>What matches Jezero</h3>
                  <ul className="plain-list">
                    {(cl.closest_to_jezero || []).map((f) => (
                      <li key={f.feature}>
                        <strong>{featureLabel(f.feature)}</strong>: cluster mean {fmt(f.cluster_mean, 2)} vs Jezero{" "}
                        {fmt(f.jezero, 2)} <span className="muted">({fmt(f.abs_diff_in_earth_sd, 2)} Earth SD)</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="compare-box">
                  <h3>Differs from Jezero</h3>
                  <ul className="plain-list">
                    {(cl.most_different || []).map((f) => (
                      <li key={f.feature}>
                        <strong>{featureLabel(f.feature)}</strong>: cluster mean {fmt(f.cluster_mean, 2)} vs Jezero{" "}
                        {fmt(f.jezero, 2)} <span className="muted">({fmt(f.abs_diff_in_earth_sd, 2)} Earth SD)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="cannot-test-strip">
                <span className="strip-icon"><MarsIcon size={18} /></span>
                <div>
                  <strong>What Earth cannot test:</strong> Reduced gravity (about 0.38 g on Mars), a thin CO₂ atmosphere,
                  and surface radiation exposure cannot be replicated by terrestrial terrain or climate screening.
                </div>
              </div>

              <div className="cluster-part">
                <h3>Possible use</h3>
                <p className="editable-note">{CLUSTER_USES[cl.rank] || "Candidate exploration target for high-resolution imaging and surface follow-up."}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="card featured-disagree">
        <div className="disagree-header">
          <AlertIcon size={20} />
          <div>
            <h2>When similarity and mobility disagree</h2>
            <p className="muted">
              Land cells where terrain similarity (&gt; 80th pct) and operational suitability (&lt; 40th pct) diverge most strongly, or the reverse.
            </p>
          </div>
        </div>

        <div className="disagree-grid">
          {disagreements.map((d) => (
            <article className="disagree-card" key={d.id}>
              <div className="cluster-head">
                <a href="#map" onClick={()=>setSelectedId(d.id)}>{d.id}</a>
                <span className="badge badge-muted">
                  {d.type === "terrain_high_mobility_low" ? "terrain high / mobility low" : "mobility high / terrain low"}
                </span>
              </div>
              <p className="muted small-note">
                Lat {fmt(d.lat, 2)}°, Lon {fmt(d.lon, 2)}° ; overall (exploratory): {fmt(d.overall_score)}
              </p>
              <DisagreementChart terrain={d.terrain_score} mobility={d.mobility_score} /><TerrainLink siteId={d.id}/>
              <p className="small-note">{disagreementSentence(d)}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
