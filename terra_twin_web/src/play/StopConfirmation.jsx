import React from 'react';
import {Symbol} from './PlayIcons';
export default function StopConfirmation({stop,reduce}){return <span key={stop} className={'play-confirm'+(reduce?' play-confirm-still':'')} aria-label="Stop reached"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle className="play-stop-ring" cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m8 14 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2"/></svg>Stop {stop} reached</span>}
