import React from "react";
import { CompassIcon } from "./Icons";
import { fmt } from "../utils/scoring";

export default function HomeHero({ cellsData, candidates, resolutionTest, onExplore, onOpenStory, onGoPage }) {
  const landCount = cellsData?.land_cells ?? "n/a";
  const waterCount = cellsData?.water_cells ?? "n/a";
  const topClusterScore = candidates?.clusters?.[0]?.mean_scores?.overall_score ?? null;
  const clusterCount = candidates?.clusters?.length ?? "n/a";
  const b1 = resolutionTest?.primary_results?.baseline_1deg;
  const b25 = resolutionTest?.primary_results?.fine_025deg;

  return (
    <section className="hero card" aria-labelledby="hero-question">
      <div className="hero-top">
        <div className="hero-copy">
          <span className="eyebrow">MENA × Jezero Crater · Phase 1–2c Screening</span>
          <h1 id="hero-question">
            Which 1° regions of MENA resemble Jezero Crater in terrain geometry, aridity, and rover traversability?
          </h1>
          <p className="hero-sub">
            We screened {cellsData?.total_cells?.toLocaleString() ?? "n/a"} cells across North Africa and the Middle East
            against Mars MOLA elevation and NASA POWER climate, then tested whether the similarity score separates
            known analogs from river floodplains.
          </p>
        </div>

        <div className="hero-actions">
          <button type="button" className="btn-primary" onClick={onExplore}>
            <CompassIcon size={16} />
            Explore the map
          </button>
          <button type="button" className="btn-secondary" onClick={onOpenStory}>
            5-step Story mode
          </button>
        </div>
      </div>

      <div className="finding-grid">
        <article className="finding-card">
          <span className="finding-kicker">1. Screened 1° grid</span>
          <strong className="finding-num">{landCount?.toLocaleString?.() ?? landCount} land cells</strong>
          <p className="muted">
            {waterCount} sea and deep-water cells masked out; scores and percentiles use land cells only.
          </p>
        </article>

        <article className="finding-card">
          <span className="finding-kicker">2. Top screening clusters</span>
          <strong className="finding-num">
            {clusterCount} clusters (top mean {fmt(topClusterScore)})
          </strong>
          <p className="muted">
            Grouped from {candidates?.n_top_after_analog_exclusion ?? "n/a"} top-5% land cells &gt;300 km from known
            analogs; flatter and smoother than Jezero.
          </p>
        </article>

        <button type="button" className="finding-card finding-btn" onClick={() => onGoPage("validation")}>
          <span className="finding-kicker">3. Negative-result check (n=6)</span>
          <strong className="finding-num">
            1° {b1?.status ?? "n/a"} · 0.25° {b25?.status ?? "n/a"}
          </strong>
          <p className="muted">
            Terrain similarity did not separate 4 known analogs from 2 floodplains (exploratory, n=6). Click for details.
          </p>
        </button>
      </div>
    </section>
  );
}
