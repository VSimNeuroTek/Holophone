(function(){
  'use strict';
  const ACTIVE_KEY='v7.language';
  const CUSTOM_KEY='v7.languagePacks';
  const BUILTIN=['fr-FR','en'];
  const state={packs:new Map(),active:'fr-FR',ready:false,observer:null,originalText:new WeakMap(),originalAttrs:new WeakMap()};

  function safeJson(s,f){try{return JSON.parse(s)}catch(e){return f}}
  function norm(code){code=String(code||'').trim();if(!code)return'fr-FR';const l=code.toLowerCase();if(l==='fr'||l.startsWith('fr-'))return'fr-FR';if(l==='en'||l.startsWith('en-'))return'en';return code}
  function esc(s){return String(s==null?'':s)}
  function interpolate(s,vars){return esc(s).replace(/\{([a-zA-Z0-9_.-]+)\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(vars||{},k)?esc(vars[k]):m)}
  function frPack(){return state.packs.get('fr-FR')||{meta:{code:'fr-FR',name:'French',nativeName:'Français'},strings:{},legacyText:{},legacyAttrs:{}}}
  function pack(){return state.packs.get(state.active)||frPack()}
  function t(key,vars){const p=pack(),fr=frPack();const v=(p.strings&&p.strings[key])??(fr.strings&&fr.strings[key])??key;return interpolate(v,vars)}
  function sourceKey(text){return String(text||'').replace(/\s+/g,' ').trim()}
  function legacyLookup(text){const k=sourceKey(text),p=pack(),fr=frPack();if(!k)return null;return (p.legacyText&&p.legacyText[k])??(fr.legacyText&&fr.legacyText[k])??null}
  function attrLookup(text){const k=sourceKey(text),p=pack(),fr=frPack();if(!k)return null;return (p.legacyAttrs&&p.legacyAttrs[k])??(fr.legacyAttrs&&fr.legacyAttrs[k])??legacyLookup(k)}

  async function fetchPack(code){
    const path='lang/'+(code==='fr-FR'?'fr-FR':'en')+'.json';
    try{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch(e){
      if(code==='fr-FR')return{meta:{code:'fr-FR',name:'French',nativeName:'Français',version:1},strings:{'language.name':'Français','language.title':'Langue'},legacyText:{},legacyAttrs:{}};
      return{meta:{code:'en',name:'English',nativeName:'English',version:1},strings:{'language.name':'English','language.title':'Language'},legacyText:{},legacyAttrs:{}};
    }
  }
  function validatePack(o){
    if(!o||typeof o!=='object')throw new Error('Pack de langue invalide');
    if(!o.meta||typeof o.meta!=='object')throw new Error('Section meta absente');
    const code=String(o.meta.code||'').trim();if(!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(code))throw new Error('Code langue invalide (ex: es-ES)');
    if(!String(o.meta.nativeName||o.meta.name||'').trim())throw new Error('Nom de langue absent');
    if(!o.strings||typeof o.strings!=='object'||Array.isArray(o.strings))throw new Error('Section strings absente');
    const clean={meta:{code,name:String(o.meta.name||o.meta.nativeName||code).slice(0,80),nativeName:String(o.meta.nativeName||o.meta.name||code).slice(0,80),version:Math.max(1,Number(o.meta.version)||1),holophoneMinVersion:String(o.meta.holophoneMinVersion||'3.3.0'),author:String(o.meta.author||'').slice(0,120)},strings:{},legacyText:{},legacyAttrs:{}};
    for(const [k,v] of Object.entries(o.strings||{}))if(typeof v==='string'&&k.length<160)clean.strings[k]=v;
    for(const [k,v] of Object.entries(o.legacyText||{}))if(typeof v==='string'&&k.length<500)clean.legacyText[sourceKey(k)]=v;
    for(const [k,v] of Object.entries(o.legacyAttrs||{}))if(typeof v==='string'&&k.length<500)clean.legacyAttrs[sourceKey(k)]=v;
    return clean;
  }
  function saveCustom(){
    const arr=[...state.packs.values()].filter(p=>!BUILTIN.includes(norm(p.meta.code))).map(p=>p);
    try{localStorage.setItem(CUSTOM_KEY,JSON.stringify(arr))}catch(e){throw new Error('Stockage des packs impossible')}
  }
  function loadCustom(){
    const arr=safeJson(localStorage.getItem(CUSTOM_KEY)||'[]',[]);if(!Array.isArray(arr))return;
    for(const raw of arr){try{const p=validatePack(raw);state.packs.set(norm(p.meta.code),p)}catch(e){}}
  }
  function rememberTextNode(n){if(!state.originalText.has(n))state.originalText.set(n,n.nodeValue)}
  function rememberAttr(el,a){let m=state.originalAttrs.get(el);if(!m){m={};state.originalAttrs.set(el,m)}if(!(a in m))m[a]=el.getAttribute(a)}
  function translateTextNode(n){
    if(!n||n.nodeType!==3||!n.parentElement)return;
    const tag=n.parentElement.tagName;if(tag==='SCRIPT'||tag==='STYLE'||tag==='TEXTAREA'||tag==='OPTION')return;
    rememberTextNode(n);const src=state.originalText.get(n),core=sourceKey(src);if(!core)return;
    const tr=legacyLookup(core);if(tr==null)return;
    const lead=(src.match(/^\s*/)||[''])[0],tail=(src.match(/\s*$/)||[''])[0];n.nodeValue=lead+tr+tail;
  }
  function translateElement(el){
    if(!el||el.nodeType!==1)return;
    const key=el.getAttribute('data-i18n');if(key){const prop=el.getAttribute('data-i18n-prop')||'textContent',val=t(key);if(prop==='html')el.innerHTML=val;else if(prop==='value')el.value=val;else el.textContent=val}
    for(const a of ['placeholder','title','aria-label']){if(!el.hasAttribute(a))continue;rememberAttr(el,a);const src=state.originalAttrs.get(el)[a],tr=attrLookup(src);if(tr!=null)el.setAttribute(a,tr)}
    if(el.tagName==='OPTION'){rememberTextNode(el.firstChild);if(el.firstChild)translateTextNode(el.firstChild)}
  }
  function walk(root){
    if(!root)return;if(root.nodeType===3){translateTextNode(root);return}if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
    if(root.nodeType===1)translateElement(root);
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))translateTextNode(n);
    if(root.querySelectorAll)root.querySelectorAll('[data-i18n],[placeholder],[title],[aria-label],option').forEach(translateElement);
  }
  function restoreOriginal(root=document){
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))if(state.originalText.has(n))n.nodeValue=state.originalText.get(n);
    root.querySelectorAll&&root.querySelectorAll('*').forEach(el=>{const m=state.originalAttrs.get(el);if(m)for(const [a,v] of Object.entries(m)){if(v==null)el.removeAttribute(a);else el.setAttribute(a,v)}});
  }
  function apply(){
    if(typeof document==='undefined')return;restoreOriginal(document);document.documentElement.lang=state.active==='fr-FR'?'fr':state.active;walk(document.body||document);
    window.dispatchEvent(new CustomEvent('holophone-language-applied',{detail:{code:state.active}}));
  }
  async function setLanguage(code,persist=true){
    code=norm(code);if(!state.packs.has(code))throw new Error('Langue non installée : '+code);state.active=code;if(persist)try{localStorage.setItem(ACTIVE_KEY,code)}catch(e){}apply();window.dispatchEvent(new CustomEvent('holophone-language-changed',{detail:{code}}));return code;
  }
  async function importPack(file){
    if(!file)throw new Error('Fichier absent');if(Number(file.size||0)>1048576)throw new Error('Fichier langue trop volumineux (1 Mo max)');
    let raw;try{raw=JSON.parse(await file.text())}catch(e){throw new Error('JSON invalide')}
    const p=validatePack(raw),code=norm(p.meta.code);if(BUILTIN.includes(code))throw new Error('Les packs intégrés Français/English ne peuvent pas être remplacés');p.meta.code=code;state.packs.set(code,p);saveCustom();return p;
  }
  function removePack(code){code=norm(code);if(BUILTIN.includes(code))return false;const ok=state.packs.delete(code);if(ok)saveCustom();if(state.active===code)setLanguage('fr-FR');return ok}
  function list(){return[...state.packs.values()].map(p=>({code:norm(p.meta.code),name:p.meta.name,nativeName:p.meta.nativeName,version:p.meta.version,author:p.meta.author||'',builtin:BUILTIN.includes(norm(p.meta.code))})).sort((a,b)=>(a.builtin===b.builtin?String(a.nativeName).localeCompare(String(b.nativeName)):a.builtin?-1:1))}
  function exportState(){return{active:state.active,custom:[...state.packs.values()].filter(p=>!BUILTIN.includes(norm(p.meta.code)))} }
  async function importState(o){if(!o||typeof o!=='object')return;for(const raw of(Array.isArray(o.custom)?o.custom:[])){try{const p=validatePack(raw),code=norm(p.meta.code);if(!BUILTIN.includes(code))state.packs.set(code,p)}catch(e){}}saveCustom();const code=norm(o.active||'fr-FR');await setLanguage(state.packs.has(code)?code:'fr-FR')}
  async function init(){
    if(state.ready)return state.active;for(const code of BUILTIN){const p=validatePack(await fetchPack(code));p.meta.code=code;state.packs.set(code,p)}loadCustom();
    let wanted='fr-FR';try{wanted=norm(localStorage.getItem(ACTIVE_KEY)||'fr-FR')}catch(e){}state.active=state.packs.has(wanted)?wanted:'fr-FR';state.ready=true;apply();
    if(typeof MutationObserver!=='undefined'){state.observer=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)walk(n)});state.observer.observe(document.documentElement,{subtree:true,childList:true})}
    return state.active;
  }
  window.HolophoneI18n={init,setLanguage,current:()=>state.active,t,list,importPack,removePack,exportState,importState,apply,validatePack,norm,isReady:()=>state.ready};
  window.holoT=t;
})();
