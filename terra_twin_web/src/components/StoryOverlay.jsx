import React from "react";
import { CloseIcon } from "./Icons";
import { fmt } from "../utils/scoring";

export function buildStorySteps(cellsData, candidates, resolutionTest) {
  const c1 = candidates?.clusters?.[0];
  const dis = candidates?.disagreements?.[0];
  const b1 = resolutionTest?.primary_results?.baseline_1deg;
  const b25 = resolutionTest?.primary_results?.fine_025deg;

  return [
    {
      tag: "1. Question",
      title: "Where in MENA resembles Jezero Crater?",
      body: `We screened ${cellsData?.land_cells ?? "n/a"} land cells (1° grid, ${cellsData?.water_cells ?? "n/a"} water cells masked) against Jezero Crater using MOLA terrain, NASA POWER aridity, and a 15° rover slope limit.`,
      layer: "overall_score",
      view: [26, 25, 4],
    },
    {
      tag: "2. Method",
      title: "Three separate dimensions, not one black box",
      body: "Terrain similarity (4 slope/relief stats, no minerals), Environment (aridity-only partial score), and Operational suitability (90th-percentile slope vs 15°) combine into overall (exploratory).",
      layer: "terrain_score",
      view: [26, 25, 4],
    },
    {
      tag: "3. Result",
      title: "Top 3 desert screening clusters",
      body: `DBSCAN grouped ${candidates?.n_top_after_analog_exclusion ?? "n/a"} top-5% cells (>300 km from known analogs) into ${candidates?.n_clusters_found ?? "n/a"} clusters. Rank #1 (${fmt(c1?.center?.lat, 2)}°, ${fmt(c1?.center?.lon, 2)}°) averages overall (exploratory) ${fmt(c1?.mean_scores?.overall_score)}, but is flatter and smoother than Jezero.`,
      layer: "overall_score",
      view: [c1?.center?.lat ?? 23.7, c1?.center?.lon ?? 33.0, 5],
    },
    {
      tag: "4. Surprise",
      title: "Similarity and mobility pull apart—and floodplains score high",
      body: `Terrain similarity failed the exploratory n=6 check at both 1° (${b1?.status ?? "n/a"}) and 0.25° (${b25?.status ?? "n/a"}). Meanwhile, disagreement cells like ${dis?.id ?? "n/a"} score ${fmt(dis?.terrain_score)} on terrain similarity but only ${fmt(dis?.mobility_score)} on operational suitability.`,
      layer: "mobility_score",
      view: [dis?.lat ?? 29.5, dis?.lon ?? 57.5, 5],
    },
    {
      tag: "5. Limits",
      title: "Screening hypotheses, not discoveries",
      body: "No mineral data, coarse ~0.5° climate, null Mars temperature extremes in targets.json, approximate analog coordinates, and an uncited 15° slope limit. See Validation and Data and limits for full details.",
      layer: "data_completeness",
      view: [26, 25, 4],
    },
  ];
}

export default function StoryOverlay({ steps, stepIdx, onStep, onClose }) {
  const step = steps[stepIdx];
  if (!step) return null;

  return (
    <section className="story-card card" aria-label="5-step story walkthrough">
      <div className="story-head">
        <span className="badge badge-accent">{step.tag}</span>
        <span className="muted small-note">Step {stepIdx + 1} of {steps.length}</span>
        <button type="button" className="icon-btn" aria-label="Skip story mode" onClick={onClose}>
          <CloseIcon size={15} />
        </button>
      </div>
      <h3>{step.title}</h3>
      <p className="small-note story-body">{step.body}</p>
      <div className="story-actions">
        <button
          type="button"
          className="btn-ghost"
          disabled={stepIdx === 0}
          onClick={() => onStep(stepIdx - 1)}
        >
          Back
        </button>
        <div className="story-right">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Skip
          </button>
          {stepIdx < steps.length - 1 ? (
            <button type="button" className="btn-primary btn-sm" onClick={() => onStep(stepIdx + 1)}>
              Next
            </button>
          ) : (
            <button type="button" className="btn-primary btn-sm" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
