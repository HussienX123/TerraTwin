import {usePlay,privacy} from '../play/PlayState';
import React, { useState, useEffect } from "react";
import { CopyIcon } from "./Icons";
import LandscapeIllustration from "./LandscapeIllustration";

export default function DataLimitsPage({ sources, section }) {
  const play=usePlay();
  const [textureSites,setTextureSites]=useState([]);
  useEffect(()=>{if(section&&section!=='limitations')return;const controller=new AbortController();fetch("/data/terrain/index.json",{signal:controller.signal}).then(r=>r.json()).then(index=>setTextureSites(index.sites)).catch(()=>{});return()=>controller.abort()},[]);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [copyError, setCopyError] = useState(false);
  const dataSources = sources?.data_sources || [];
  const citations = sources?.citations || [];
  const wf = sources?.water_filter || {};
  const changelog = sources?.changelog || [];

  const copyText = async (text, idx) => {
    try {
      setCopyError(false);
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1800);
    } catch {
      setCopiedIdx(null);
      setCopyError(true);
    }
  };

  const sections={sources: <><details id="sources" className="card accordion-card">
        <summary className="accordion-summary">Sources and citations</summary>
        <div className="accordion-body"><header className="data-header"><div className="notice-banner">
        <h1>Data and limits</h1>
        <p className="muted">
          Data sources, resolutions, paste-ready citations, filtering thresholds, known limitations, and AI-use disclosure.
        </p>
      </div><LandscapeIllustration /></header>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Source</th>
                  <th>Resolution used</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((s) => (
                  <tr key={s.Data}>
                    <td><strong>{s.Data}</strong></td>
                    <td>{s.Source}</td>
                    <td>{s["Resolution used"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Paste-ready citations</h3>
          {copyError && <p className="copy-status" role="alert">Could not copy the citation. Select the citation text and copy it manually.</p>}
          <div className="copy-status" role="status">{copiedIdx !== null ? "Citation copied." : ""}</div>
          <div className="citations-list">
            {citations.map((c, idx) => (
              <div className="citation-item" key={idx}>
                <code>{c}</code>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => copyText(c, idx)}
                >
                  <CopyIcon size={14} />
                  {copiedIdx === idx ? "Copied" : "Copy citation"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </details></>,limitations: <><details id="limitations" className="card accordion-card"><summary>Limitations</summary><div className="accordion-body"><details className="card accordion-card" open>
        <summary className="accordion-summary">Climate, terrain and analog limitations</summary>
        <div className="accordion-body">
          <ul className="plain-list">
            <li><strong>Coarse climate grid:</strong> NASA POWER is coarse (about 0.5°); adjacent 1° cells are not independent samples.</li>
            <li><strong>Extreme-to-extreme temperature range:</strong> <code>t_range_c</code> is hottest-month max minus coldest-month min (POWER T2M_MAX − T2M_MIN), not a diurnal range.</li>
            <li>
              <strong>Mars climate target:</strong> Jezero’s annual temperature extremes were not available in a form comparable to our Earth range, so the environment score uses aridity only. For reference, MEDA measured a peak daily maximum of about 266 K (−7 °C) at 1.45 m during the first Martian year (Munguira et al., 2024, JGR Planets, doi:10.1029/2024JE008385).
            </li>
            <li><strong>No minerals:</strong> scoring uses terrain geometry and climate only; no mineralogical or compositional data is included.</li>
            <li><strong>1° spatial averaging:</strong> 1° cells (~100 km) hide narrow landforms such as wadis, ridges, and inverted channels.</li>
            <li><strong>Cross-planet resolution mismatch:</strong> Earth Terrarium z8 (470–600 m/px depending on latitude) is only roughly comparable to Mars MOLA (463 m/px).</li>
            <li><strong>Understated local slope:</strong> mean and p90 slope at ~500 m pixel size smooth out steep meter-scale hazards.</li>
            <li><strong>Single Mars target:</strong> Jezero Crater is the only Mars reference region in this phase.</li>
            <li><strong>Approximate analog coordinates:</strong> all coordinates in <code>known_analogs.json</code> are approximate and unverified.</li>
          </ul>
        </div>
      </details><details className="card accordion-card" open>
        <summary className="accordion-summary">Water-filter rules and operational thresholds</summary>
        <div className="accordion-body">
          <ul className="plain-list">
            <li>
              <strong>Water-filter rules (Phase 2b):</strong> {sources?.water_cells_flagged ?? "n/a"} of 1,960 cells flagged as water when{" "}
              Rule A (<code>elev_mean_m &lt;= {wf.water_max_elev_m ?? "n/a"}</code> AND <code>elev_range_m &lt;= {wf.water_max_range_m ?? "n/a"}</code> AND{" "}
              <code>p90_slope_deg &lt;= {wf.water_max_p90_slope_deg ?? "n/a"}</code>) OR Rule B (<code>elev_mean_m &lt;= {wf.water_deep_elev_m ?? "n/a"}</code>).
            </li>
            <li>
              <strong>Unflagged low-elevation cells:</strong> {sources?.unflagged_below_sea_level_cells ?? "n/a"} unflagged cells still have{" "}
              <code>elev_mean_m &lt; 0</code> (real depressions such as Danakil, Qattara, and the Nile Delta, plus some shallow Persian Gulf / southern Caspian cells).
            </li>
            <li><strong>Coastal mixed cells:</strong> coastal cells mixing land and sea may not be flagged by the water filter.</li>
            <li><strong>Mobility slope limit:</strong> {sources?.slope_limit_display ?? "n/a"}.</li>
          </ul>
        </div>
      </details><details className="card accordion-card"><summary className="accordion-summary">Terrain texture sources and limits</summary><div className="accordion-body"><p>Drive mode is an arcade simulation on coarse terrain data plus synthetic detail. It is not a rover-scale terrain model and not a mobility assessment.</p><p>Textured 3D views are visualizations of coarse data (about 0.5 km); they are not rover-scale terrain models.</p><ul className="plain-list">{textureSites.map(site=><li key={site.id}><strong>{site.name}</strong><p>{site.texture_source}, {site.texture_date}, {site.texture_resolution_m ?? "n/a"} m. {site.texture_layer}. {site.type==="earth"?"NASA GIBS":"NASA Mars Trek"}. {site.projection_note}</p></li>)}</ul></div></details></div></details></>,changelog: <><details className="card accordion-card" id="changelog">
        <summary className="accordion-summary">Changelog</summary>
        <div className="accordion-body">
          <h3>Phase 2b changelog</h3>
          <ul className="plain-list">
            {changelog.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>

        </div>
      </details></>,ai: <><details id="ai" className="card accordion-card">
        <summary className="accordion-summary">AI use disclosure</summary>
        <div className="accordion-body">
          <p>
            We used Claude (Anthropic) for strategy, method design and for writing technical specifications. We used the Antigravity coding agent to implement and run the data pipeline, scoring and validation suite, and the web interface under human guidance, with guardrails against unconfirmed claims. We did not tune weights or features to artificially pass validation tests; the one change between runs, a water-cell mask, is fully documented in the changelog. No generative AI was used to invent scientific observations, scores or validation findings.
          </p>
        </div>
      </details></>};
 return section?sections[section]:<>{Object.values(sections).map((s,i)=><React.Fragment key={i}>{s}</React.Fragment>)}</>;
}
