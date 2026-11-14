import React, { Suspense, useCallback, useEffect, useState } from "react";
import InfoSheet from './components/InfoSheet';
import Navbar from "./components/Navbar";
import MapPage from "./components/MapPage";
import ErrorBoundary from "./components/ErrorBoundary";
import {destination,redirectLegacy} from "./navigation";

const PlayScreen = React.lazy(() => import('./play/PlayScreen'));
const CandidatesPage = React.lazy(() => import("./components/CandidatesPage"));
const EvidencePage = React.lazy(() => import("./components/EvidencePage"));
const PlayPage = React.lazy(() => import("./play/PlayPage"));
const NotFoundPage = React.lazy(() => import("./components/NotFoundPage"));

const DATA_FILES = {
  cells: "/data/cells.json",
  candidates: "/data/candidates.json",
  analogs: "/data/analogs.json",
  validation: "/data/validation.json",
  resolutionTest: "/data/resolution_test.json",
  sources: "/data/sources.json",
};

export default function App() {
  redirectLegacy();
  const pageFromHash = destination;
  const [showAbout,setShowAbout]=useState(false);
  const [page, setPage] = useState(pageFromHash);
  useEffect(() => { const change=()=>setPage(pageFromHash()); window.addEventListener('hashchange',change);window.addEventListener('popstate',change); return ()=>{window.removeEventListener('hashchange',change);window.removeEventListener('popstate',change)}; }, []);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [dataWarning, setDataWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slowNotice, setSlowNotice] = useState(false);
  const [unsupportedBrowser, setUnsupportedBrowser] = useState(false);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || typeof fetch === 'undefined' || typeof Promise === 'undefined') {
      setUnsupportedBrowser(true);
    }
  }, []);

  useEffect(() => {
    if (!loading) { setSlowNotice(false); return; }
    const timer = setTimeout(() => setSlowNotice(true), 4000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(()=>{if(page!=='evidence'||loading)return;const id=location.hash.slice(1);if(!id)return;const timer=setTimeout(()=>{const el=document.getElementById(id);if(el){if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({block:'start'})}},200);return()=>clearTimeout(timer)},[page,loading]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDataWarning(null);
    const loaded = {};
    const failed = [];

    await Promise.all(
      Object.entries(DATA_FILES).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${url} (${res.status})`);
          loaded[key] = await res.json();
        } catch (err) {
          failed.push(err.message);
        }
      })
    );

    if (!loaded.cells) {
      setError(`Critical screening dataset could not load: ${failed.join(', ')}`);
      setLoading(false);
      return;
    }

    if (failed.length > 0) {
      setDataWarning(`Some secondary datasets could not load (${failed.join(', ')}). The 2D map and cell scores remain usable.`);
    }

    setData(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <ErrorBoundary>
      <div className="app-shell"><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById("main-content")?.focus()}}>Skip to content</a>
        <Suspense fallback={null}><PlayScreen/></Suspense>
        <Navbar page={page} onInfo={()=>setShowAbout(true)} />
        {showAbout&&<InfoSheet onClose={()=>setShowAbout(false)} statement={data?.validation?.negative_result_statement}/>}
        <main id="main-content" className={`main-wrap page-${page}`} tabIndex={-1}>
          {unsupportedBrowser && (
            <div className="card error-box" role="alert">
              <p><strong>Browser compatibility notice:</strong> Your browser lacks modern web standards (such as ResizeObserver or fetch). For the best experience, please use an updated browser. The 2D map will attempt to render.</p>
            </div>
          )}
          {error && (
            <div className="card error-box" role="alert">
              <p><strong>Unable to load screening data:</strong> {error}. Check your connection, then try again.</p>
              <button type="button" className="btn-secondary" onClick={loadAll}>
                Retry
              </button>
            </div>
          )}
          {dataWarning && (
            <div className="card error-box" role="status" style={{ borderLeftColor: 'var(--gold)' }}>
              <p><strong>Notice:</strong> {dataWarning}</p>
            </div>
          )}
          {!error && loading && (
            <div className="card loading-box" role="status">
              <span>Loading the map and screening tables. Cell scores will appear here.</span>
              {slowNotice && <p className="small-note muted" style={{ marginTop: '0.5rem' }}>Connection is slow. Still retrieving screening data…</p>}
            </div>
          )}
          {!loading && !error && data && page === "map" && (
            <MapPage
              cellsData={data.cells}
              candidates={data.candidates}
              analogs={data.analogs}
              resolutionTest={data.resolutionTest}
              onGoPage={setPage}
              validation={data.validation}
            />
          )}
          {!loading && !error && data && page === "candidates" && (
            <Suspense fallback={<div className="card loading-box" role="status"><span>Loading candidates…</span></div>}>
              <CandidatesPage candidates={data.candidates} />
            </Suspense>
          )}
          {!loading&&!error&&data&&page==='evidence'&&(
            <Suspense fallback={<div className="card loading-box" role="status"><span>Loading evidence…</span></div>}>
              <EvidencePage validation={data.validation} resolutionTest={data.resolutionTest} sources={data.sources}/>
            </Suspense>
          )}
          {!loading&&!error&&data&&page==='play'&&(
            <Suspense fallback={<div className="card loading-box" role="status"><span>Loading play…</span></div>}>
              <PlayPage/>
            </Suspense>
          )}
          {page === 'not-found' && (
            <Suspense fallback={<div className="card loading-box" role="status"><span>Loading…</span></div>}>
              <NotFoundPage onGoHome={setPage} />
            </Suspense>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
