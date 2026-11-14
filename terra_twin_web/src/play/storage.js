export function introSeen(){try{return !!sessionStorage.getItem('terratwin-intro-seen')}catch{return false}}
export function markIntro(){try{sessionStorage.setItem('terratwin-intro-seen','1')}catch{}}
