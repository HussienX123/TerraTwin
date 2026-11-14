export function destination(){
  const hash=location.hash.slice(1),path=location.pathname;
  if(path==='/play')return 'play';
  if(path==='/candidates')return 'candidates';
  if(path==='/evidence'||path==='/validation'||path==='/data')return 'evidence';
  if(hash==='candidates')return 'candidates';
  if(hash==='validation'||hash==='data'||hash==='evidence')return 'evidence';
  if(hash==='play')return 'play';
  if(path==='/'||path===''||path.endsWith('/index.html'))return 'map';
  return 'not-found';
}
export function navigate(page){const url=new URL(location.href);url.pathname=page==='map'?'/':'/'+page;url.hash=page==='map'?'map':'';history.pushState(null,'',url);window.dispatchEvent(new PopStateEvent('popstate'))}
export function redirectLegacy(){
  if(location.pathname==='/terrain'||location.pathname==='/terrain/'){
    const url=new URL(location.href);
    url.pathname='/';
    url.searchParams.set('view','globe');
    url.searchParams.set('terrain','1');
    url.searchParams.set('focus','terrain');
    history.replaceState(null,'',url);
  }
  if(location.pathname==='/'&&['#validation','#data'].includes(location.hash)){const url=new URL(location.href);url.pathname='/evidence';url.hash=location.hash==='#validation'?'validation':'sources';history.replaceState(null,'',url)}
  if(['/validation','/data'].includes(location.pathname)){const url=new URL(location.href);url.hash=location.pathname==='/validation'?'validation':'sources';url.pathname='/evidence';history.replaceState(null,'',url)}
}
