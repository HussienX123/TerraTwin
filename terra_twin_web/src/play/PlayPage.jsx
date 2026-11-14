import React from 'react';
import {usePlay} from './PlayState';
import Missions from './Missions';
import Brand from '../components/Brand';
export default function PlayPage(){const play=usePlay();return <section className="play-page play-destination"><header className="navy-surface"><Brand/><span>Play</span></header>{play.flags.missions?<Missions/>:<p>Missions are currently turned off.</p>}</section>}
