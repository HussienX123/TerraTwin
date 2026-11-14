import {facts} from '../content/facts';
import {lines} from '../content/story';
export function attachStory(game,chapter,play){
 if(!play.flags.story)chapter=0;
 game.chapter=chapter;game.pages=[];game.prediction=null;game.correct=0;game.legSum=0;game.legTime=0;game.previousMean=Math.atan(Math.hypot(game.ground.height(game.p.x+1,game.p.z)-game.ground.height(game.p.x-1,game.p.z),game.ground.height(game.p.x,game.p.z+1)-game.ground.height(game.p.x,game.p.z-1))/2)*180/Math.PI;game.tutorialStep=0;
 const p=game.p;
 game.startStory=()=>{game.phase='running';if(chapter===2){game.card={stop:0,line:lines[0],fact:'F2'};game.phase='story'}};
 game.storyTick=dt=>{game.legSum+=p.slope*dt;game.legTime+=dt};
 game.onStop=()=>{
  if(!chapter)return;
  const stop=game.stats.stops,mean=game.legSum/Math.max(.001,game.legTime),actual=mean>game.previousMean?'steeper':'flatter';
  const prediction=game.prediction;
  if(prediction===actual)game.correct++;
  const fact=chapter===1?(stop%2?'F1':'F2'):chapter===2?'F2':chapter===3&&game.site.id==='mars_jezero'?['F3','F4','F5','F3','F2'][stop-1]:null;
  const page={site:game.site.id,chapter,stop,line:lines[stop],fact,prediction,actual,mean,previous:game.previousMean,mode:game.playMode};
  game.pages.push(page);play.journal(game.site.id+' / chapter '+chapter,game.pages.slice());
  game.previousMean=mean;game.legSum=0;game.legTime=0;game.prediction=null;game.card=page;game.phase='story';game.p.v=0;
 };
 game.continueStory=prediction=>{game.prediction=prediction||null;game.card=null;if(game.stats.stops===5)game.finish();else game.phase='running'};
 game.onFinish=()=>{
  const s=game.stats,explorer=game.playMode==='explorer';
  const second=explorer?p.alarms===0:s.above/Math.max(.001,s.time)<=.2;
  s.stars=s.stops===5?1+Number(second)+Number(second&&p.alarms===0&&s.battery>=25):0;
  play.complete({site:game.site.id,chapter,mode:game.playMode,stars:s.stars,correct:game.correct,...s});
 };
 const restart=game.restart;
 game.restart=()=>{restart();game.pages=[];game.correct=0;game.prediction=null;game.previousMean=0;game.legSum=0;game.legTime=0;game.card=null};
 game.inputTick=(throttle,steer,brake)=>{if(throttle>.2&&game.tutorialStep===0)game.tutorialStep=1;if(brake&&game.tutorialStep===1)game.tutorialStep=2};
 game.fact=id=>facts[id];
}
