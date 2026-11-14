import {playFlags} from '../content/playFlags';
import React,{createContext,useContext,useState} from 'react';
import {useSelection} from '../Selection';
const Context=createContext(null);
export const usePlay=()=>useContext(Context);
export const privacy='This site stores nothing about you. Game progress is saved only in your own browser, if it allows.';
export function readProgress(){try{const p=JSON.parse(localStorage.getItem('terra-play')||'null');if(p&&Array.isArray(p.runs)&&p.prefs)return p}catch{}return {prefs:{mode:'explorer',assist:true,size:'large',reduce:false},runs:[],tutorials:{},journal:{}}}
export function PlayProvider({children}){
 const selection=useSelection(),[saved,setSaved]=useState(readProgress),[screen,setScreen]=useState(null),[request,setRequest]=useState(null);
 function save(fn){setSaved(old=>{const next=fn(old);try{localStorage.setItem('terra-play',JSON.stringify(next))}catch{}return next})}
 function prefs(patch){save(p=>({...p,prefs:{...p.prefs,...patch}}))}
 function mode(value){prefs({mode:value,assist:value==='explorer',size:value==='explorer'?'large':'normal'})}
 function begin(chapter,site='earth_+23.50_+32.50'){setRequest({chapter,site,token:Date.now()});setScreen(null);selection.setDrive(site);const url=new URL(location.href);url.pathname='/';url.hash='map';history.replaceState(null,'',url);window.dispatchEvent(new PopStateEvent('popstate'))}
 function complete(run){save(p=>({...p,runs:[...p.runs,run]}))}
 function journal(key,pages){if(!playFlags.journal)return;save(p=>({...p,journal:{...p.journal,[key]:[...new Map([...(p.journal[key]||[]),...pages].map(page=>[page.stop,page])).values()]}}))}
 return <Context.Provider value={{saved,flags:playFlags,screen,setScreen,request,setRequest,prefs,mode,begin,complete,journal,tutorialDone:mode=>save(p=>({...p,tutorials:{...p.tutorials,[mode]:true}}))}}>{children}</Context.Provider>
}
