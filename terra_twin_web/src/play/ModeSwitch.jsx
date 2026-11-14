import React from 'react';
import {usePlay} from './PlayState';
export default function ModeSwitch(){const play=usePlay();return <div className="segmented play-mode" aria-label="Way to play">{['explorer','scientist'].map(mode=><button key={mode} aria-pressed={play.saved.prefs.mode===mode} className={play.saved.prefs.mode===mode?'active':''} onClick={()=>play.mode(mode)}>{mode==='explorer'?'Explorer':'Scientist'}</button>)}</div>}
