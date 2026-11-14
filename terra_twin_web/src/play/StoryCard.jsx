import React,{useRef} from 'react';
import {useCardFocus} from './useCardFocus';
import ModeSwitch from './ModeSwitch';
import {facts} from '../content/facts';
import StopConfirmation from './StopConfirmation';
import {Symbol} from './PlayIcons';
export function Fact({id,mode}){const f=facts[id];return f?<div className="play-fact"><strong>Fact</strong><p>{f[mode]}</p><small>Source · {f.source}</small></div>:null}
export default function StoryCard({game,notify}){
 const card=game.card,ref=useRef(null);
 useCardFocus(ref,card);
 if(!card)return null;
 const reveal=card.prediction,predict=game.chapter===2&&game.stats.stops<5;
 return <section ref={ref} tabIndex={-1} className="drive-card play-story-card" role="dialog" aria-modal="true" aria-label="Stop story">{card.stop>0&&<StopConfirmation stop={card.stop} reduce={game.reduceMotion}/>}<small>Story (fictional)</small><h2><Symbol/> Guide</h2><ModeSwitch/><p>{card.line}</p>{card.fact&&<Fact id={card.fact} mode={game.playMode}/>}
 {reveal&&<div><strong>{reveal===card.actual?'You spotted it.':'Close.'} This leg was {card.actual}.</strong><p>From this drive · Mean slope {card.mean.toFixed(2)}°; previous leg {card.previous.toFixed(2)}°. The first leg uses the starting ground as its comparison.</p></div>}
 {predict?<><h3>Predict</h3><p>Is the ground on the way to the next stop steeper or flatter than here?</p><div className="play-buttons">{['steeper','flatter'].map(answer=><button key={answer} onClick={()=>{game.continueStory(answer);notify()}}>{answer==='steeper'?'Steeper':'Flatter'}</button>)}</div></>:<button className="drive-primary" onClick={()=>{game.continueStory();notify()}}>{game.stats.stops===5?'See my results':'Keep driving'}</button>}
 <span className="drive-sr" aria-live="polite">{card.stop>0?'Stop '+card.stop+' reached':'Choose a prediction before driving'}</span></section>
}
