import React from 'react';
import ValidationPage from './ValidationPage';
import DataLimitsPage from './DataLimitsPage';
import {Classroom,Uses} from '../play/TeachingPages';
import {privacy} from '../play/PlayState';
export default function EvidencePage({validation,resolutionTest,sources}){return <section className="evidence-page" aria-label="Evidence">
  <ValidationPage validation={validation} resolutionTest={resolutionTest}/>
  <DataLimitsPage sources={sources} section="sources"/>
  <DataLimitsPage sources={sources} section="limitations"/>
  <details id="prototype-status" className="card accordion-card" open>
    <summary className="accordion-summary">What works now (prototype verification status)</summary>
    <div className="accordion-body">
      <p className="muted small-note" style={{ marginBottom: '1rem' }}>
        Conservative record of verified prototype functionality versus items unverified or omitted.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div>
          <h4 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Working in this prototype</h4>
          <ul className="plain-list">
            <li>✓ 1° MENA screening grid (1,960 cells) with multi-criteria scores and percentiles</li>
            <li>✓ Interactive 2D Leaflet map with cell picking, keyboard arrow navigation, and layer toggles</li>
            <li>✓ 3D Globe visualization (Three.js) with country boundaries and cell overlay</li>
            <li>✓ 3D terrain patch pop-out (60 km window) with vertical exaggeration and slope classes</li>
            <li>✓ Side-by-side terrain comparison against Jezero Crater heightfield</li>
            <li>✓ Rover driving simulation with keyboard WASD, touch joystick, and elevation contact</li>
            <li>✓ Top 3 candidate DBSCAN clusters and divergence cell inspection</li>
            <li>✓ Negative-result validation report (n=6) and ROC-AUC metrics</li>
            <li>✓ Automatic fallback to 2D map on WebGL absence or context loss</li>
            <li>✓ Zero login requirement and resilient operation when localStorage is blocked</li>
          </ul>
        </div>
        <div>
          <h4 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Not included or not verified</h4>
          <ul className="plain-list">
            <li>✗ WebXR on physical Meta Quest headset (tested in browser / emulator only)</li>
            <li>✗ Engineering rover mobility model (arcade simulation on coarse DEM + synthetic roughness)</li>
            <li>✗ Mineralogical / compositional matching (scoring uses terrain slopes and climate only)</li>
            <li>✗ High-resolution digital elevation outside the featured analog cells</li>
            <li>✗ Real-time Mars weather (annual temperature extremes not resolved for Jezero target)</li>
            <li>✗ Desktop Safari and Firefox verification (tested on Chromium-based engines)</li>
            <li>✗ Formal usability trials with students or planetary mission operations teams</li>
          </ul>
        </div>
      </div>
    </div>
  </details>
  <details id="classroom" className="card accordion-card"><summary>Classroom guide</summary><div className="accordion-body"><Classroom/></div></details>
  <details id="uses" className="card accordion-card"><summary>Intended uses (not yet tested with users)</summary><div className="accordion-body"><Uses/></div></details>
  <DataLimitsPage sources={sources} section="changelog"/>
  <DataLimitsPage sources={sources} section="ai"/>
  <details id="credits" className="card accordion-card"><summary>Credits and data sources</summary><div className="accordion-body">
    <p><strong>Terra Twin · Martian Phoenix</strong></p>
    <p>Earth, in perspective. Screening hypotheses for planetary analog research.</p>
    <ul className="plain-list" style={{ marginTop: '0.75rem' }}>
      <li><strong>NASA POWER:</strong> Prediction of Worldwide Energy Resources (surface solar irradiance, 2 m air temperature, annual precipitation).</li>
      <li><strong>NASA MOLA:</strong> Mars Orbiter Laser Altimeter digital elevation model and shaded relief (Mars Global Surveyor mission).</li>
      <li><strong>NASA Mars Trek:</strong> Orbital surface imagery and map layers for Jezero Crater.</li>
      <li><strong>NASA GIBS:</strong> Global Imagery Browse Services (Landsat / WELD surface imagery annual composites).</li>
      <li><strong>AWS Terrain Tiles:</strong> Mapzen global elevation data derived from SRTM and regional elevation models.</li>
      <li><strong>CARTO:</strong> Voyager and Positron basemap tiles and CartoDB styles.</li>
      <li><strong>OpenStreetMap contributors:</strong> Global geographic boundary and basemap data (ODbL).</li>
    </ul>
    <p className="small-note muted" style={{ marginTop: '0.75rem' }}>
      No NASA logos, no NASA-branded imagery, and no images of people are used in this prototype.
    </p>
  </div></details>
  <details id="privacy" className="card accordion-card"><summary>Privacy note</summary><div className="accordion-body"><p>{privacy}</p></div></details>
</section>}
