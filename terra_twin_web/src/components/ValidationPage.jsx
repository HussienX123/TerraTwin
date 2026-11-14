import React from "react";
import { AlertIcon } from "./Icons";
import ValidationDotPlot from "./ValidationDotPlot";
import { fmt } from "../utils/scoring";

export default function ValidationPage({ validation, resolutionTest }) {
  const ranks = validation?.rank_table || [];
  const aucs = validation?.auc_table || [];
  const resRows = resolutionTest?.comparison_table || [];
  const pRes = resolutionTest?.primary_results || {};

  return <><section id="validation"><div className="card callout-negative" role="region" aria-label="Negative validation finding">
        <div className="callout-row">
          <span className="callout-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg></span>
          <div>
            <span className="eyebrow">Validation summary · Exploratory check (n=6)</span>
            <h1>
              {validation?.negative_result_statement ||
                "Terrain similarity did not separate known analogs from negative controls (exploratory, n=6)."}
            </h1>
            <p className="muted">
              Only the Western Desert inverted channels ranked high overall (95.0 pct); the two river floodplains scored
              77.0 and 80.4 pct on terrain similarity. Misses are reported identically to hits.
            </p>
          </div>
        </div>
      </div></section><div className="card">
        <h2>6-point percentile ranks (Run 2, land cells only, 100 = best)</h2>
        <p className="muted small-note">All coordinates are approximate. Misses and hits are styled identically.</p>
        <div className="val-split">
          <ValidationDotPlot rows={ranks} />

          
        </div>
      </div><details id="ranks" className="card accordion-card"><summary>Rank table and ROC-AUC</summary><div className="accordion-body"><div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Point</th>
                  <th>Group</th>
                  <th>1° cell</th>
                  <th>Terrain pct</th>
                  <th>Env pct</th>
                  <th>Mobility pct</th>
                  <th>overall (exploratory) pct</th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.group}</td>
                    <td><code>{r.cell}</code></td>
                    <td>{fmt(r.terrain_pct)}</td>
                    <td>{fmt(r.environment_pct)}</td>
                    <td>{fmt(r.mobility_pct)}</td>
                    <td>{fmt(r.overall_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div><div className="card">
          <h2>ROC-AUC (exploratory, n=6)</h2><p className="muted small-note">ROC-AUC measures how well a score separates the two groups; 0.5 is chance-level separation.</p>
          <p className="muted small-note">4 analogs vs 2 negative controls; step size is 0.125.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Score</th>
                  <th>AUC Run 1</th>
                  <th>AUC Run 2</th>
                </tr>
              </thead>
              <tbody>
                {aucs.map((a) => (
                  <tr key={a.score}>
                    <td>{a.score === "overall_score" ? "overall_score (exploratory)" : a.score}</td>
                    <td>{a.auc_run1}</td>
                    <td>{a.auc_run2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div><div className="card">
        <h2>Original report text (verbatim)</h2>
        <details>
          <summary>Phase 2 / 2b report (validation_report.md)</summary>
          <pre className="report-pre">{validation?.report_markdown || "n/a"}</pre>
        </details>
        <details>
          <summary>Phase 2c resolution test report (resolution_test.md)</summary>
          <pre className="report-pre">{resolutionTest?.report_markdown || "n/a"}</pre>
        </details>
      </div></div></details><details id="resolution" className="card accordion-card"><summary>1° vs 0.25° test</summary><div className="accordion-body"><div className="card">
          <h2>Phase 2c resolution check: 1° vs 0.25°</h2>
          <div className="status-row">
            <span className="badge badge-fail">
              1° baseline: {pRes.baseline_1deg?.status ?? "n/a"} ({pRes.baseline_1deg?.detail ?? "n/a"})
            </span>
            <span className="badge badge-fail">
              0.25° primary: {pRes.fine_025deg?.status ?? "n/a"} ({pRes.fine_025deg?.detail ?? "n/a"})
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Point</th>
                  <th>Group</th>
                  <th>1° terrain pct</th>
                  <th>0.25° terrain pct (primary)</th>
                  <th>0.25° 3×3 best (secondary)</th>
                </tr>
              </thead>
              <tbody>
                {resRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.group}</td>
                    <td>{fmt(r.pct_1)}</td>
                    <td>{fmt(r.pct_025)}</td>
                    <td>{fmt(r.pct_3x3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          
        </div></div></details><details id="secondary" className="card accordion-card"><summary>3×3 secondary check</summary><div className="accordion-body"><p className="small-note secondary-caption">
            Secondary 3×3 check ({pRes.secondary_3x3?.status ?? "n/a"}, {pRes.secondary_3x3?.detail ?? "n/a"}):{" "}
            <strong>{pRes.secondary_3x3?.caption || "lenient check; also raises the controls; not evidence of validity"}</strong>.
          </p></div></details></>;
}
