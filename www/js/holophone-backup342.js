/* Holophone 3.4.2 — hotfix sauvegarde globale à faible empreinte mémoire.
   La 3.4.1 construisait un JSON v13 contenant plusieurs copies base64 des mêmes
   médias puis envoyait la chaîne entière au pont Capacitor. Sur une médiathèque
   volumineuse, WebView/Java pouvait dépasser le heap Android et terminer en OOM.

   La v14 .holo est un JSONL portable écrit par petits blocs. Les blobs IndexedDB
   sont découpés en tranches de 192 Kio et chaque enregistrement est contrôlé par
   SHA-256 quand WebCrypto est disponible. A la restauration, les blobs sont
   d'abord écrits sous des clés temporaires puis basculés atomiquement dans
   IndexedDB. Les sauvegardes JSON v12/v13 restent importables. */
(() => {
  'use strict';

  const PATCH_VERSION='3.4.2';
  const STREAM_APP='holophone-backup-stream';
  const STREAM_VERSION=14;
  const MEDIA_CHUNK=192*1024; // divisible par 3 : concaténation base64 valide
  const READ_CHUNK=512*1024;

  function q(s){return document.querySelector(s)}
  function cleanSrc(x){
    const src=String(x&&x.src||'');
    if(x&&x.fid)return'';
    return /^https?:\/\//i.test(src)?src:'';
  }
  async function shaText(text){
    try{
      if(!(window.crypto&&window.crypto.subtle&&window.TextEncoder))return'';
      const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(text||'')));
      return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){return''}
  }
  async function record(type,data,extra){
    const raw=JSON.stringify(data===undefined?null:data);
    return{t:type,...(extra||{}),d:data,h:await shaText(raw)};
  }
  async function verifyRecord(rec){
    if(!rec||!rec.h)return true;
    const got=await shaText(JSON.stringify(rec.d===undefined?null:rec.d));
    if(got&&got!==String(rec.h))throw new Error('contrôle SHA-256 invalide pour '+String(rec.t||'un bloc'));
    return true;
  }

  async function ensureBinaryRefs(){
    let contactsChanged=false,convsChanged=false;
    const persist=async(it,prefix,label)=>{
      if(!it||it.fid||!it.src||/^https?:\/\//i.test(String(it.src)))return;
      let blob=null;try{const r=await fetch(it.src);blob=await r.blob()}catch(e){}
      if(!(blob instanceof Blob)||!blob.size)throw new Error('média local illisible : '+String(label||'fichier'));
      const fid=prefix+uid();await idbPut(fid,blob);it.fid=fid;
      try{if(/^blob:/i.test(String(it.src)))URL.revokeObjectURL(it.src)}catch(e){}
      it.src=URL.createObjectURL(blob);contactsChanged=true;
    };
    for(const c of CONTACTS){
      for(const a of(c.av||[]))await persist(a,'f_',a.name||'avatar');
      for(const g of(c.gal||[]))await persist(g,'g_',g.label||'galerie');
      for(const t of(c.toys||[]))await persist(t,'t_',t.name||'élément');
    }
    for(const v of CONVS){
      for(const m of(v&&v.msgs||[])){
        const src=String(m&&m.img||'');
        if(!src||m.imgId||/^https?:\/\//i.test(src))continue;
        let blob=null;try{const r=await fetch(src);blob=await r.blob()}catch(e){}
        if(!(blob instanceof Blob)||!blob.size)throw new Error('image de conversation illisible');
        const fid='m_'+uid();await idbPut(fid,blob);m.imgId=fid;delete m.img;convsChanged=true;
      }
    }
    if(contactsChanged)await saveContacts();
    if(convsChanged)await saveConvs();
    return{contactsChanged,convsChanged};
  }
  function contactRecord(c){
    const cc=JSON.parse(JSON.stringify(c||{}));
    cc.av=(c.av||[]).map(a=>({...a,src:cleanSrc(a),fid:a.fid||null}));
    cc.gal=(c.gal||[]).map(g=>({...g,src:cleanSrc(g),fid:g.fid||null}));
    cc.toys=(c.toys||[]).map(t=>({...t,src:cleanSrc(t),fid:t.fid||null}));
    return cc;
  }
  function convRecord(v){
    const vv=JSON.parse(JSON.stringify(v||{}));
    vv.ai=(vv.ai||[]).map(m=>{
      if(!m||!m.img)return m;
      const x={...m};delete x.img;return x;
    });
    (vv.msgs||[]).forEach(m=>{if(m&&m.imgId&&m.img&&!/^https?:\/\//i.test(String(m.img)))delete m.img});
    return vv;
  }
  async function storeSnapshot(withKeys){
    const out=await backupStoreExport(withKeys);
    delete out[K.ct];delete out[K.cv];
    return out;
  }
  function localSnapshot(withKeys){
    const out=backupLocalStorageExport(withKeys);
    delete out[K.ct];delete out[K.cv];
    return out;
  }
  async function idbKeys(){
    const db=await idb();
    return await new Promise((res,rej)=>{
      const out=[],t=db.transaction('files','readonly'),cur=t.objectStore('files').openCursor();
      cur.onsuccess=()=>{const c=cur.result;if(!c){res(out);return}const k=String(c.key);if(!k.startsWith('__holo_restore342_'))out.push(k);c.continue()};
      cur.onerror=()=>rej(cur.error);
    });
  }
  function sliceB64(blob,start,end){
    return new Promise((res,rej)=>{
      const fr=new FileReader();fr.onerror=()=>rej(fr.error||new Error('lecture média impossible'));
      fr.onload=()=>{const s=String(fr.result||''),i=s.indexOf(',');res(i>=0?s.slice(i+1):'')};
      fr.readAsDataURL(blob.slice(start,end));
    });
  }
  function b64Bytes(s){
    const bin=atob(String(s||'')),u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    return u;
  }

  async function streamWriter(name){
    const FS=CAP().Filesystem;
    if(!(FS&&FS.writeFile&&FS.appendFile))throw new Error('le module Fichiers ne permet pas l’écriture par blocs sur cette version');
    const clean=cleanName(name),path=EXPORT_DIR+'/saves/'+clean;let first=true,chars=0,uri='';
    return{
      async line(obj){
        const txt=JSON.stringify(obj)+'\n';
        if(first){const r=await FS.writeFile({path,data:txt,directory:'DOCUMENTS',encoding:'utf8',recursive:true});uri=String(r&&r.uri||'');first=false}
        else await FS.appendFile({path,data:txt,directory:'DOCUMENTS',encoding:'utf8'});
        chars+=txt.length;
      },
      async finish(){
        let size=0,verified=false;
        if(first){const r=await FS.writeFile({path,data:'',directory:'DOCUMENTS',encoding:'utf8',recursive:true});uri=String(r&&r.uri||'');first=false}
        if(FS.stat)try{const st=await FS.stat({path,directory:'DOCUMENTS'});size=Number(st&&st.size)||0;verified=true}catch(e){}
        return{ok:true,natif:true,nom:clean,ou:'Documents/'+path,uri,taille:size||chars,verifie:verified};
      },
      async abort(){if(!first&&FS.deleteFile)try{await FS.deleteFile({path,directory:'DOCUMENTS'})}catch(e){}}
    };
  }

  async function saveStream(withKeys){
    if(!isNative())throw new Error('la sauvegarde globale v14 avec médias nécessite l’application Android');
    await ensureBinaryRefs();
    const stamp=new Date().toISOString(),name='holophone-global-'+stamp.replace(/[:.]/g,'-')+'.holo';
    const w=await streamWriter(name);
    try{
      await w.line({app:STREAM_APP,v:STREAM_VERSION,format:'jsonl-v1',date:stamp,appVersion:PATCH_VERSION,
        schemaVersion:3200,withKeys:!!withKeys,integrity:'record-sha256'});
      const state={
        auto:AUTO,voice:VOICE,search:SEARCH,gen:GEN,braindance:BDCFG,actions:ACTCFG,user:USER,spot:SPOT,theme:THEME,
        startup:await startupBackupExport(),privacy:privacyNormalize(),
        language:window.HolophoneI18n?window.HolophoneI18n.exportState():null,
        v2:(window.HolophoneV2&&window.HolophoneV2.cfg)?window.HolophoneV2.cfg:null,
        api:{prov:API.prov,model:API.model,keys:withKeys?API.keys:{}}
      };
      await w.line(await record('state',state));
      for(const c of CONTACTS)await w.line(await record('contact',contactRecord(c)));
      for(const v of CONVS)await w.line(await record('conv',convRecord(v)));
      for(const m of(BDCFG.replays||[])){
        try{const r=await bdReplayLoad(m);if(r){const clean=JSON.parse(JSON.stringify(r));(clean.blocks||[]).forEach(b=>delete b.audioCache);await w.line(await record('replay',clean))}}catch(e){console.warn('backup replay',m&&m.id,e)}
      }
      await w.line(await record('store',await storeSnapshot(withKeys)));
      await w.line(await record('local',localSnapshot(withKeys)));
      const keys=await idbKeys();let blobs=0,idbJson=0,blobBytes=0,chunks=0;
      for(let ki=0;ki<keys.length;ki++){
        const key=keys[ki];let value;try{value=await idbGet(key)}catch(e){continue}
        if(value instanceof Blob){
          const n=Math.max(1,Math.ceil(value.size/MEDIA_CHUNK));
          await w.line({t:'blob',k:key,m:value.type||'application/octet-stream',s:value.size,n});
          for(let i=0;i<n;i++){
            const a=i*MEDIA_CHUNK,b=Math.min(value.size,a+MEDIA_CHUNK),data=await sliceB64(value,a,b);
            await w.line({t:'chunk',k:key,i,n,d:data,h:await shaText(data)});chunks++;
          }
          blobs++;blobBytes+=value.size;
        }else{
          await w.line(await record('idb-json',{k:key,v:value}));idbJson++;
        }
        if(ki%4===0)flash(q('#svMsg'),'Sauvegarde… '+(ki+1)+' / '+keys.length+' élément(s) binaires','var(--teal)',60000);
      }
      await w.line({t:'end',contacts:CONTACTS.length,convs:CONVS.length,idb:keys.length,blobs,idbJson,blobBytes,chunks});
      const file=await w.finish();
      return{file,contacts:CONTACTS.length,convs:CONVS.length,blobs,blobBytes};
    }catch(e){await w.abort();throw e}
  }

  async function* lines(file){
    let pos=0,carry='';
    while(pos<file.size){
      const end=Math.min(file.size,pos+READ_CHUNK),txt=await file.slice(pos,end).text();pos=end;carry+=txt;
      let nl;
      while((nl=carry.indexOf('\n'))>=0){const line=carry.slice(0,nl).replace(/\r$/,'');carry=carry.slice(nl+1);if(line.trim())yield line}
      if(carry.length>64*1024*1024)throw new Error('un bloc de sauvegarde dépasse 64 Mo');
    }
    if(carry.trim())yield carry;
  }
  async function stageCleanup(prefix){
    try{
      const db=await idb();await new Promise((res,rej)=>{
        const t=db.transaction('files','readwrite'),st=t.objectStore('files'),range=IDBKeyRange.bound(prefix,prefix+'\uffff'),cur=st.openCursor(range);
        cur.onsuccess=()=>{const c=cur.result;if(c){c.delete();c.continue()}};cur.onerror=()=>rej(cur.error);t.oncomplete=()=>res(true);t.onerror=()=>rej(t.error);
      });
    }catch(e){}
  }
  async function stageCommit(prefix){
    const db=await idb();
    return await new Promise((res,rej)=>{
      const t=db.transaction('files','readwrite'),st=t.objectStore('files'),cur=st.openCursor();
      cur.onsuccess=()=>{const c=cur.result;if(c){if(!String(c.key).startsWith(prefix))c.delete();c.continue();return}
        const range=IDBKeyRange.bound(prefix,prefix+'\uffff'),s=st.openCursor(range);
        s.onsuccess=()=>{const c2=s.result;if(!c2)return;const original=String(c2.key).slice(prefix.length);st.put(c2.value,original);c2.delete();c2.continue()};
        s.onerror=()=>{try{t.abort()}catch(e){}};
      };
      cur.onerror=()=>{try{t.abort()}catch(e){}};t.oncomplete=()=>res(true);t.onerror=()=>rej(t.error||new Error('commit IndexedDB impossible'));t.onabort=()=>rej(t.error||new Error('commit IndexedDB annulé'));
    });
  }
  function mergeLocal(o,withKeys){
    if(!o||typeof o!=='object')return;
    for(const [k,v] of Object.entries(o)){
      if(!withKeys&&(SECURE_KEYS.has(k)||k===K.key||/api\.keys/i.test(k)))continue;
      try{localStorage.setItem(k,String(v??''))}catch(e){}
    }
  }
  async function restoreStream(file){
    const prefix='__holo_restore342_'+uid()+'__';let header=null,state=null,storeSnap=null,localSnap=null,endRec=null,active=null;
    const contacts=[],convs=[],replays=[];let lineNo=0,staged=0;
    try{
      for await(const line of lines(file)){
        lineNo++;let rec;try{rec=JSON.parse(line)}catch(e){throw new Error('bloc '+lineNo+' illisible')}
        if(lineNo===1){
          if(!rec||rec.app!==STREAM_APP||Number(rec.v)!==STREAM_VERSION)throw new Error('format .holo non reconnu');
          if(Number(rec.schemaVersion)>3200)throw new Error('sauvegarde créée par un schéma Holophone plus récent');
          header=rec;continue;
        }
        if(!header)throw new Error('en-tête de sauvegarde absent');
        if(rec.t==='state'){await verifyRecord(rec);state=rec.d||{};continue}
        if(rec.t==='contact'){await verifyRecord(rec);contacts.push(rec.d);continue}
        if(rec.t==='conv'){await verifyRecord(rec);convs.push(rec.d);continue}
        if(rec.t==='replay'){await verifyRecord(rec);replays.push(rec.d);continue}
        if(rec.t==='store'){await verifyRecord(rec);storeSnap=rec.d||{};continue}
        if(rec.t==='local'){await verifyRecord(rec);localSnap=rec.d||{};continue}
        if(rec.t==='idb-json'){
          await verifyRecord(rec);const x=rec.d||{};if(!x.k)continue;await idbPut(prefix+String(x.k),x.v);staged++;continue;
        }
        if(rec.t==='blob'){
          if(active)throw new Error('média précédent incomplet');
          active={k:String(rec.k||''),m:String(rec.m||'application/octet-stream'),s:Math.max(0,Number(rec.s)||0),n:Math.max(1,Number(rec.n)||1),parts:[],got:0};
          if(!active.k)throw new Error('clé média absente');continue;
        }
        if(rec.t==='chunk'){
          if(!active||String(rec.k)!==active.k||Number(rec.i)!==active.got)throw new Error('ordre des blocs média invalide');
          if(rec.h){const got=await shaText(String(rec.d||''));if(got&&got!==String(rec.h))throw new Error('SHA-256 bloc média invalide pour '+active.k)}
          active.parts.push(b64Bytes(rec.d));active.got++;
          if(active.got===active.n){
            const blob=new Blob(active.parts,{type:active.m});
            if(blob.size!==active.s)throw new Error('taille média invalide pour '+active.k);
            await idbPut(prefix+active.k,blob);staged++;active=null;
          }
          continue;
        }
        if(rec.t==='end'){endRec=rec;continue}
      }
      if(active)throw new Error('dernier média incomplet');
      if(!header||!state||!endRec)throw new Error('sauvegarde .holo incomplète');
      if(Number(endRec.contacts)!==contacts.length||Number(endRec.convs)!==convs.length)throw new Error('comptage de sauvegarde incohérent');
      if(Number(endRec.idb)!==staged)throw new Error('stockage binaire incomplet ('+staged+' / '+Number(endRec.idb)+')');
      const o={app:'holophone-backup',v:STREAM_VERSION,date:header.date,appVersion:header.appVersion,schemaVersion:header.schemaVersion,
        contacts,convs,braindanceReplays:replays,...state,
        integrity:{createdAt:header.date,contacts:contacts.length,conversations:convs.length,formatVersion:STREAM_VERSION,sha256:'',mode:'record-sha256'}};
      const n=await applyBackupSafe(o);
      await stageCommit(prefix);
      if(storeSnap)await backupStoreImport(storeSnap,!!header.withKeys);
      if(localSnap)mergeLocal(localSnap,!!header.withKeys);
      return n;
    }catch(e){await stageCleanup(prefix);throw e}
  }
  async function isStream(file){
    try{const first=(await file.slice(0,4096).text()).split(/\r?\n/,1)[0],o=JSON.parse(first);return o&&o.app===STREAM_APP&&Number(o.v)===STREAM_VERSION}catch(e){return false}
  }

  function patchRuntimeVersion(){
    try{if(window.HolophoneV2)window.HolophoneV2.version=PATCH_VERSION}catch(e){}
    try{if(window.HolophoneStability)window.HolophoneStability.version=PATCH_VERSION}catch(e){}
    const patchText=()=>{
      const badge=q('#appVersionBadge');if(badge)badge.textContent='Holophone v'+PATCH_VERSION;
      const ab=q('#abV');if(ab&&/HOLOPHONE\s+\d+\.\d+\.\d+/i.test(ab.textContent||''))ab.textContent=(ab.textContent||'').replace(/HOLOPHONE\s+\d+\.\d+\.\d+/i,'HOLOPHONE '+PATCH_VERSION);
    };
    try{
      if(typeof perfPaint==='function'){const base=perfPaint;window.perfPaint=function(){const r=base.apply(this,arguments);patchText();return r}}
      if(typeof renderAboutMeta==='function'){const base=renderAboutMeta;window.renderAboutMeta=function(){const r=base.apply(this,arguments);patchText();return r}}
      if(typeof makeDiagnostic==='function'){const base=makeDiagnostic;window.makeDiagnostic=async function(){const d=await base.apply(this,arguments);if(d)d.version=PATCH_VERSION;return d}}
      if(typeof buildBackup==='function'){const base=buildBackup;window.buildBackup=async function(){const o=await base.apply(this,arguments);if(o)o.appVersion=PATCH_VERSION;return o}}
    }catch(e){console.warn('3.4.2 version patch',e)}
    patchText();
  }

  function wire(){
    patchRuntimeVersion();
    const msg=q('#svMsg'),save=q('#svDl'),pick=q('#svPick'),file=q('#svFile');
    const note=q('#screenSave .note');
    if(note&&/sauvegarde globale/i.test(note.textContent||''))note.innerHTML='La sauvegarde globale est écrite dans <b>Documents / Holophone / saves</b> au format <b>.holo</b>. Elle est écrite par petits blocs pour éviter les pics de mémoire. Les sauvegardes JSON v12/v13 restent restaurables.';
    if(pick)pick.textContent='Restaurer une sauvegarde complète (.holo ou .json)…';
    if(file)file.setAttribute('accept','.holo,.json,.jsonl,application/json,text/plain,application/octet-stream');
    if(save)save.onclick=async()=>{
      flash(msg,'Préparation…','var(--teal)',60000);
      try{
        const r=await saveStream(q('#svKeys').classList.contains('on'));
        exportDone(msg,'Sauvegarde enregistrée',r.file,
          exportPoids(r.file.taille)+' · '+r.contacts+' fiche'+(r.contacts>1?'s':'')+' · '+r.convs+' conversation'+(r.convs>1?'s':'')+
          ' · '+r.blobs+' média'+(r.blobs>1?'s':'')+'\nGardes-en une copie hors du téléphone.');
      }catch(e){exportFail(msg,e)}
    };
    if(file)file.onchange=async e=>{
      const f=e.target.files[0];e.target.value='';if(!f)return;
      flash(msg,'Lecture…','var(--teal)',60000);
      try{
        const nb=await isStream(f)?await restoreStream(f):await applyBackupSafe(JSON.parse(await f.text()));
        flash(msg,nb+' personnage(s) restauré(s). Redémarrage de Holophone…','var(--teal)',30000);
        buildInbox();refreshSys();setTimeout(()=>location.reload(),900);
      }catch(err){flash(msg,'Import impossible — '+err.message,'var(--magenta)',30000)}
    };
  }

  window.HolophoneBackup342={version:PATCH_VERSION,saveStream,restoreStream,isStream};
  wire();
})();
