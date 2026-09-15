/* Holophone 3.2.3 — couche de stabilité + migrations de continuité vivante.
   Elle fournit : schéma/migrations, contrôles d'intégrité, santé, réparation sûre
   et garde-fous de sauvegarde/restauration pour la présence, l'émotion et la vie autonome. */
(() => {
  'use strict';

  const STABLE_VERSION = '3.2.3';
  const SCHEMA_VERSION = 3200;
  const SCHEMA_KEY = 'v3.schemaVersion';
  const MIGRATION_LOG_KEY = 'v3.migrationLog';
  const LAST_HEALTH_KEY = 'v3.lastHealth';
  const LAST_RECIPE_KEY = 'v3.lastRecipe';
  const KNOWN_THEME_IDS = new Set(['original','wallace','redblue','bluegreen','red']);
  const KNOWN_ACTION_ACTORS = new Set(['both','user','character']);
  const state = {
    starting:false,
    started:false,
    lastHealth:null,
    lastRecipe:null,
    migrationLog:[],
    repairBusy:false
  };

  const api = window.HolophoneStability = {
    version: STABLE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    state,
    start,
    runHealthChecks,
    runSafeRepair,
    runRuntimeRecipe,
    prepareIncomingBackup,
    decorateBackup,
    captureRuntimeCheckpoint,
    rollbackRuntimeCheckpoint,
    clearRuntimeCheckpoint,
    renderHealth
  };

  function nowIso(){return new Date().toISOString()}
  function safeJson(text, fallback=null){try{return JSON.parse(text)}catch(e){return fallback}}
  function copy(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
  function textErr(e){return String((e&&e.message)||e||'erreur inconnue')}
  function statusRank(s){return s==='fail'?3:s==='warn'?2:s==='ok'?1:0}
  function bytesFmtLocal(n){
    n=Math.max(0,Number(n)||0);
    if(n<1024)return n+' o';
    if(n<1048576)return(n/1024).toFixed(1)+' Ko';
    if(n<1073741824)return(n/1048576).toFixed(1)+' Mo';
    return(n/1073741824).toFixed(2)+' Go';
  }
  async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
  async function getSchema(){return Math.max(0,parseInt((await Store.get(SCHEMA_KEY))||'0',10)||0)}
  async function setSchema(v){await Store.set(SCHEMA_KEY,String(v))}
  async function appendMigrationLog(entry){
    let log=[];try{log=safeJson((await Store.get(MIGRATION_LOG_KEY))||'[]',[])||[]}catch(e){}
    log.push(entry);if(log.length>30)log=log.slice(-30);
    state.migrationLog=log;
    await Store.set(MIGRATION_LOG_KEY,JSON.stringify(log));
  }

  async function migrationBaseline3000(){
    const result={actions:0,theme:false,startup:false,audio:false};
    try{
      const raw=await Store.get('v7.actions');
      const o=safeJson(raw,null);
      if(o&&Array.isArray(o.categories)){
        let changed=false;
        o.categories.forEach(c=>(Array.isArray(c.actions)?c.actions:[]).forEach(a=>{
          if(!KNOWN_ACTION_ACTORS.has(String(a&&a.actors||''))){a.actors='both';changed=true;result.actions++}
        }));
        if(changed)await Store.set('v7.actions',JSON.stringify(o));
      }
    }catch(e){}
    try{
      const raw=await Store.get('v7.theme'),o=safeJson(raw,null);
      if(o&&typeof o==='object'&&!KNOWN_THEME_IDS.has(String(o.ui||''))){o.ui='original';await Store.set('v7.theme',JSON.stringify(o));result.theme=true}
    }catch(e){}
    try{
      const raw=await Store.get('v7.startup'),o=safeJson(raw,null);
      if(o&&typeof o==='object'){
        let changed=false;
        if(!['classic','wallace','minimal','cyber'].includes(String(o.style||''))){o.style='classic';changed=true}
        if(!o.audioId&&o.source!=='custom'){o.audioId='builtin';changed=true}
        if(changed){await Store.set('v7.startup',JSON.stringify(o));result.startup=true}
      }
    }catch(e){}
    try{
      const raw=await Store.get('v7.audioLibrary'),o=safeJson(raw,null);
      if(o&&typeof o==='object'){
        let changed=false;
        if(!Array.isArray(o.tracks)){o.tracks=[];changed=true}
        if(!o.notificationId){o.notificationId='system';changed=true}
        if(changed){await Store.set('v7.audioLibrary',JSON.stringify(o));result.audio=true}
      }
    }catch(e){}
    return result;
  }

  async function migrationPresence3100(){
    const result={contacts:0,presenceCreated:0};
    try{
      const raw=await Store.get('v7.contacts'),list=safeJson(raw,[]);
      if(Array.isArray(list)){
        let changed=false;
        list.forEach(c=>{
          if(!c||typeof c!=='object')return;
          result.contacts++;
          if(!c.presence||typeof c.presence!=='object'){
            c.presence={version:1,updatedAt:0,energy:55,connection:50,curiosity:55,autonomy:50,focus:'',thought:'',motive:'',motiveTs:0,recent:[]};
            result.presenceCreated++;changed=true;
          }else if(!Array.isArray(c.presence.recent)){c.presence.recent=[];changed=true}
        });
        if(changed)await Store.set('v7.contacts',JSON.stringify(list));
      }
    }catch(e){}
    return result;
  }


  async function migrationPersonaNeutral3140(){
    const result={contacts:0,conversations:0,messages:0,proposals:0};
    try{
      const raw=await Store.get('v7.contacts'),list=safeJson(raw,[]);
      if(Array.isArray(list)){
        let changed=false;
        list.forEach(c=>{if(!c||typeof c!=='object')return;result.contacts++;
          const r=c.refuge;
          if(r&&typeof r==='object'){
            const oldKey=Object.keys(r).find(k=>/^last[A-Z].*ProposalTs$/.test(k)&&k!=='lastCharacterProposalTs');
            if(!r.lastCharacterProposalTs&&oldKey&&Number(r[oldKey])){r.lastCharacterProposalTs=Number(r[oldKey]);changed=true}
            if(Array.isArray(r.proposals))r.proposals.forEach(p=>{if(!p||typeof p!=='object')return;const by=p.by==='v'?'v':'character';if(p.by!==by){p.by=by;changed=true;result.proposals++}});
          }
          if(Array.isArray(c.jrn))c.jrn.forEach(e=>{if(!e||typeof e!=='object'||!e.owner)return;if(!['user','character','shared','pinned','foundation','relationship'].includes(e.owner)){e.owner='character';changed=true}});
        });
        if(changed)await Store.set('v7.contacts',JSON.stringify(list));
      }
    }catch(e){}
    try{
      const raw=await Store.get('v7.convs'),list=safeJson(raw,[]);
      if(Array.isArray(list)){
        let changed=false;
        list.forEach(v=>{if(!v||typeof v!=='object')return;result.conversations++;
          if(Array.isArray(v.msgs))v.msgs.forEach(m=>{if(!m||typeof m!=='object')return;const role=['v','sys','evt','refuge','character'].includes(String(m.w||''))?String(m.w):'character';if(m.w!==role){m.w=role;changed=true;result.messages++}if(m.reply&&m.reply.w){const rw=m.reply.w==='v'?'v':'character';if(m.reply.w!==rw){m.reply.w=rw;changed=true}}});
        });
        if(changed)await Store.set('v7.convs',JSON.stringify(list));
      }
    }catch(e){}
    return result;
  }


  async function migrationContinuity3200(){
    const result={contacts:0,presenceUpgraded:0,emotionCreated:0,lifeTrailCreated:0};
    try{
      const raw=await Store.get('v7.contacts'),list=safeJson(raw,[]);
      if(Array.isArray(list)){
        let changed=false;
        list.forEach(c=>{
          if(!c||typeof c!=='object')return;result.contacts++;
          c.presence=c.presence&&typeof c.presence==='object'?c.presence:{};
          const pd={version:2,updatedAt:0,lastObservedAt:0,offlineGapMs:0,lastGapEventTs:0,energy:55,connection:50,curiosity:55,autonomy:50,focus:'',thought:'',motive:'',motiveTs:0,recent:[],lastInitiativeAt:0,lastInitiativeMotive:'',lastDecision:null,lastDecisionTs:0,lastLifeCatchupAt:0};
          let pChanged=false;Object.keys(pd).forEach(k=>{if(c.presence[k]===undefined){c.presence[k]=copy(pd[k]);pChanged=true}});
          if(c.presence.version!==2){c.presence.version=2;pChanged=true}
          if(!Array.isArray(c.presence.recent)){c.presence.recent=[];pChanged=true}
          if(pChanged){changed=true;result.presenceUpgraded++}
          if(!c.emotion||typeof c.emotion!=='object'){
            const fam=(c.fond&&c.fond.fam)||c.temp||'calme',lvl=Number(c.fond&&c.fond.lvl)||2;
            c.emotion={version:1,family:fam,nuance:'',level:lvl,startedAt:0,updatedAt:0,causeType:'background',cause:'le rythme de sa journée',undertone:fam,undertoneLevel:lvl,stability:45,lastTransitionAt:0};
            changed=true;result.emotionCreated++;
          }else if(c.emotion.version!==1){c.emotion.version=1;changed=true}
          if(!Array.isArray(c.lifeTrail)){c.lifeTrail=[];changed=true;result.lifeTrailCreated++}
          if(c.life&&typeof c.life==='object'&&c.life.version!==2){c.life.version=2;changed=true}
        });
        if(changed)await Store.set('v7.contacts',JSON.stringify(list));
      }
    }catch(e){}
    return result;
  }

  const MIGRATIONS=[
    {to:3000,name:'baseline-stable-3.0.0',run:migrationBaseline3000},
    {to:3100,name:'character-presence-3.1.0',run:migrationPresence3100},
    {to:3140,name:'persona-neutral-3.1.4',run:migrationPersonaNeutral3140},
    {to:3200,name:'living-continuity-3.2.0',run:migrationContinuity3200}
  ];

  async function migrateBeforeBoot(){
    let current=await getSchema();
    if(current>SCHEMA_VERSION){
      await appendMigrationLog({ts:nowIso(),from:current,to:SCHEMA_VERSION,name:'future-schema-detected',ok:false,note:'Aucune rétro-migration exécutée.'});
      return current;
    }
    for(const m of MIGRATIONS){
      if(current>=m.to)continue;
      const from=current;
      try{
        const detail=await m.run();
        current=m.to;await setSchema(current);
        await appendMigrationLog({ts:nowIso(),from,to:current,name:m.name,ok:true,detail});
      }catch(e){
        await appendMigrationLog({ts:nowIso(),from,to:m.to,name:m.name,ok:false,error:textErr(e)});
        throw new Error('Migration '+m.name+' impossible : '+textErr(e));
      }
    }
    return current;
  }

  async function waitForBoot(){
    for(let i=0;i<300;i++){
      try{if(typeof bootReady!=='undefined'&&bootReady)return true}catch(e){}
      await sleep(50);
    }
    return false;
  }

  async function start(bootFn){
    if(state.started||state.starting)return;
    state.starting=true;
    try{
      try{await migrateBeforeBoot()}catch(e){
        console.error('Holophone migration warning',e);
        state.migrationError=textErr(e);
      }
      if(typeof bootFn!=='function')throw new Error('fonction boot absente');
      await bootFn();
      await waitForBoot();
      wireHealthUi();
      state.started=true;
      setTimeout(()=>runHealthChecks({quiet:true}).catch(()=>{}),800);
    }finally{state.starting=false}
  }

  function makeCheck(id,label,status,detail,fixable=false,data=null){
    return{id,label,status,detail:String(detail||''),fixable:!!fixable,data};
  }

  async function checkLocalStorage(){
    const k='__holo_health_'+Date.now();
    try{localStorage.setItem(k,'ok');const ok=localStorage.getItem(k)==='ok';localStorage.removeItem(k);return makeCheck('localStorage','Réglages / conversations',ok?'ok':'fail',ok?'écriture et relecture OK':'relecture incohérente')}
    catch(e){return makeCheck('localStorage','Réglages / conversations','fail','stockage local indisponible : '+textErr(e))}
  }

  async function checkIndexedDb(){
    const k='__holo_health_'+Date.now();
    try{
      const b=new Blob(['holophone-health'],{type:'text/plain'});await idbPut(k,b);const r=await idbGet(k);await idbDel(k);
      const ok=r instanceof Blob&&r.size===b.size;
      return makeCheck('indexedDB','Médias IndexedDB',ok?'ok':'fail',ok?'écriture et relecture OK':'objet relu invalide');
    }catch(e){try{await idbDel(k)}catch(_){}return makeCheck('indexedDB','Médias IndexedDB','fail',textErr(e))}
  }

  async function checkDocuments(){
    if(!isNative())return makeCheck('documents','Documents / Holophone','info','mode navigateur : téléchargement standard');
    const FS=CAP().Filesystem;
    if(!FS||!FS.writeFile)return makeCheck('documents','Documents / Holophone','fail','plugin Filesystem absent');
    const path=(typeof EXPORT_DIR!=='undefined'?EXPORT_DIR:'Holophone')+'/Diagnostics/.health-'+Date.now()+'.txt';
    try{
      await FS.writeFile({path,data:'ok',directory:'DOCUMENTS',encoding:'utf8',recursive:true});
      const r=await FS.readFile({path,directory:'DOCUMENTS',encoding:'utf8'});
      try{await FS.deleteFile({path,directory:'DOCUMENTS'})}catch(e){}
      return makeCheck('documents','Documents / Holophone',String(r&&r.data||'').trim()==='ok'?'ok':'warn','écriture '+(String(r&&r.data||'').trim()==='ok'?'et relecture OK':'OK, relecture inattendue'));
    }catch(e){return makeCheck('documents','Documents / Holophone','fail',textErr(e))}
  }

  function checkContactsAndConvs(){
    const checks=[];
    const cts=Array.isArray(CONTACTS)?CONTACTS:[];
    const cvs=Array.isArray(CONVS)?CONVS:[];
    const cids=cts.map(c=>String(c&&c.id||'')).filter(Boolean);
    const dupC=cids.filter((x,i)=>cids.indexOf(x)!==i);
    const convIds=cvs.map(c=>String(c&&c.id||'')).filter(Boolean);
    const dupV=convIds.filter((x,i)=>convIds.indexOf(x)!==i);
    const orphan=cvs.filter(v=>v&&v.cid&&!cids.includes(String(v.cid)));
    const malformedMsgs=cvs.reduce((n,v)=>n+(Array.isArray(v&&v.msgs)?v.msgs.filter(m=>!m||!['character','v','sys','refuge'].includes(String(m.w||''))).length:1),0);
    checks.push(makeCheck('contacts','Persona',cts.length===1&&cids.length===1&&!dupC.length?'ok':cts.length?'warn':'fail',cts.length+' fiche(s) · '+dupC.length+' id dupliqué(s)',false));
    checks.push(makeCheck('conversations','Conversations',!dupV.length&&!orphan.length&&!malformedMsgs?'ok':'warn',cvs.length+' conv. · '+dupV.length+' id dupliqué(s) · '+orphan.length+' orpheline(s) · '+malformedMsgs+' message(s) atypique(s)',false));
    return checks;
  }

  function checkConfig(){
    const out=[];
    const themeOk=typeof THEME==='object'&&KNOWN_THEME_IDS.has(String(THEME.ui||'original'))&&['android','holophone'].includes(String(THEME.kb||'android'));
    out.push(makeCheck('theme','Thème / clavier',themeOk?'ok':'warn',themeOk?(String(THEME.ui||'original')+' · clavier '+String(THEME.kb||'android')):'configuration à normaliser',!themeOk));
    let badActors=0,totalActions=0;
    try{(ACTCFG.categories||[]).forEach(c=>(c.actions||[]).forEach(a=>{totalActions++;if(!KNOWN_ACTION_ACTORS.has(String(a.actors||'both')))badActors++}))}catch(e){badActors++}
    out.push(makeCheck('actions','Interactions',badActors?'warn':'ok',totalActions+' interaction(s) · '+badActors+' droit(s) invalide(s)',badActors>0));
    const tracks=(AUDIOCFG&&Array.isArray(AUDIOCFG.tracks))?AUDIOCFG.tracks:[];
    const ids=new Set(['builtin',...tracks.map(t=>String(t.id||''))]);
    const startupOk=!STARTCFG||String(STARTCFG.audioId||'builtin')==='builtin'||ids.has(String(STARTCFG.audioId||''));
    const notifOk=!AUDIOCFG||String(AUDIOCFG.notificationId||'system')==='system'||ids.has(String(AUDIOCFG.notificationId||''));
    out.push(makeCheck('audio','Bibliothèque audio',startupOk&&notifOk?'ok':'warn',tracks.length+' MP3 · splash '+(startupOk?'OK':'référence absente')+' · notification '+(notifOk?'OK':'référence absente'),!(startupOk&&notifOk)));
    return out;
  }

  async function checkMedia(){
    try{
      const inv=await idbInventory(),refs=referencedMediaIds();
      const orph=inv.filter(x=>!refs.has(x.key));
      const missing=[...refs].filter(k=>!inv.some(x=>x.key===k));
      const bytes=inv.reduce((a,x)=>a+(Number(x.size)||0),0);
      const status=missing.length?'warn':'ok';
      return makeCheck('media','Intégrité médias',status,inv.length+' fichier(s), '+bytesFmtLocal(bytes)+' · '+orph.length+' orphelin(s) · '+missing.length+' référence(s) manquante(s)',orph.length>0,{orphans:orph.length,missing:missing.length});
    }catch(e){return makeCheck('media','Intégrité médias','fail',textErr(e))}
  }

  async function checkNotifications(){
    const N=CAP().LocalNotifications;
    if(!isNative())return makeCheck('notifications','Notifications','info','mode navigateur');
    if(!N)return makeCheck('notifications','Notifications','fail','plugin LocalNotifications absent');
    try{
      const p=N.checkPermissions?await N.checkPermissions():null;
      const st=p&&p.display?String(p.display):'inconnu';
      return makeCheck('notifications','Notifications',st==='granted'?'ok':st==='denied'?'warn':'info','permission : '+st);
    }catch(e){return makeCheck('notifications','Notifications','warn','permission illisible : '+textErr(e))}
  }

  async function checkSnapshots(){
    let last=0;try{last=parseInt((await Store.get('v2.backupLast'))||'0',10)||0}catch(e){}
    if(!last)return makeCheck('snapshots','Snapshots automatiques','warn','aucun snapshot horodaté',false);
    let exists=true;
    if(isNative()){
      const F=CAP().Filesystem;
      if(F&&F.stat)try{await F.stat({path:'Holophone/AutoBackups/snapshot-0.json',directory:'DATA'})}catch(e){exists=false}
    }
    const age=Date.now()-last;
    const status=!exists?'fail':age<7*3600000?'ok':'warn';
    return makeCheck('snapshots','Snapshots automatiques',status,(exists?'fichier présent':'fichier snapshot-0 absent')+' · dernier : '+new Date(last).toLocaleString('fr-FR')+' · '+Math.round(age/60000)+' min');
  }

  function checkSecurityRuntime(){
    if(!isNative())return makeCheck('security','Secrets Android','info','mode navigateur : fallback web');
    let secure=null;try{secure=secureNative()}catch(e){}
    return makeCheck('security','Secrets Android',secure?'ok':'warn',secure?'SecureStore / Keystore disponible':'plugin SecureStore indisponible : vérifier le build natif');
  }

  function checkTelemetry(){
    const p=typeof PERF_LAST!=='undefined'?PERF_LAST:null;
    if(p&&p.available)return makeCheck('telemetry','CPU / RAM','ok',Math.round(Number(p.cpuPercent)||0)+'% CPU · '+Math.round(Number(p.ramMb)||0)+' Mo RAM');
    return makeCheck('telemetry','CPU / RAM',isNative()?'warn':'info',isNative()?'télémétrie native non disponible':'mode navigateur');
  }

  async function checkSchema(){
    const v=await getSchema();
    return makeCheck('schema','Schéma de données',v===SCHEMA_VERSION?'ok':v>SCHEMA_VERSION?'warn':'fail','schéma '+v+' / attendu '+SCHEMA_VERSION,v<SCHEMA_VERSION);
  }

  function checkInteractionIsolation(){
    let legacy=0;
    try{CONVS.forEach(v=>(v.ai||[]).forEach(x=>{const t=String(x&&x.content||'');if(/^\s*\[BRAINDANCE (STUDIO|bloc)/i.test(t))legacy++}))}catch(e){}
    return makeCheck('bd-isolation','Isolation Braindance / chat','ok',legacy?legacy+' trace(s) legacy détectée(s), filtrées par le moteur':'aucune trace brute détectée');
  }

  async function runHealthChecks(opt={}){
    const checks=[];
    checks.push(await checkSchema());
    checks.push(await checkLocalStorage());
    checks.push(await checkIndexedDb());
    checks.push(await checkDocuments());
    checks.push(...checkContactsAndConvs());
    checks.push(...checkConfig());
    checks.push(await checkMedia());
    checks.push(await checkSnapshots());
    checks.push(await checkNotifications());
    checks.push(checkSecurityRuntime());
    checks.push(checkTelemetry());
    checks.push(checkInteractionIsolation());
    const worst=checks.reduce((m,c)=>Math.max(m,statusRank(c.status)),0);
    const report={appVersion:String(typeof APPV!=='undefined'?APPV:STABLE_VERSION),stableLayer:STABLE_VERSION,schemaVersion:await getSchema(),date:nowIso(),status:worst>=3?'fail':worst===2?'warn':'ok',checks};
    state.lastHealth=report;
    try{await Store.set(LAST_HEALTH_KEY,JSON.stringify(report))}catch(e){}
    if(!opt.quiet)renderHealth(report);
    return report;
  }

  async function saveCoreSettings(){
    if(typeof saveActions==='function')await saveActions();
    if(typeof saveTheme==='function')await saveTheme();
    if(typeof saveStartup==='function')await saveStartup();
    if(typeof saveAudioLibrary==='function')await saveAudioLibrary();
    if(typeof saveBDCfg==='function')await saveBDCfg();
    if(typeof saveContacts==='function')await saveContacts();
    if(typeof saveConvs==='function')await saveConvs();
  }

  async function runSafeRepair(){
    if(state.repairBusy)return{ok:false,detail:'réparation déjà en cours'};
    state.repairBusy=true;
    const actions=[];
    try{
      try{if(typeof normalizeActions==='function'){normalizeActions();actions.push('interactions normalisées')}}catch(e){}
      try{if(typeof bdNormalizeCfg==='function'){bdNormalizeCfg();actions.push('Braindance normalisée')}}catch(e){}
      try{if(typeof audioNormalize==='function'){audioNormalize();actions.push('bibliothèque audio normalisée')}}catch(e){}
      try{
        if(typeof THEME==='object'){
          if(!KNOWN_THEME_IDS.has(String(THEME.ui||'')))THEME.ui='original';
          if(!['android','holophone'].includes(String(THEME.kb||'')))THEME.kb='android';
          if(typeof applyUiTheme==='function')applyUiTheme(THEME.ui);
          actions.push('thème normalisé');
        }
      }catch(e){}
      try{if(Array.isArray(CONTACTS)&&typeof ensureRefuge==='function'){CONTACTS.forEach(c=>ensureRefuge(c));actions.push('structures contact vérifiées')}}catch(e){}
      try{if(Array.isArray(CONVS)&&typeof repairAi==='function'){let n=0;CONVS.forEach(v=>{n+=Number(repairAi(v))||0});if(n)actions.push(n+' tour(s) IA réparé(s)')}}catch(e){}
      await saveCoreSettings();
      const report=await runHealthChecks({quiet:false});
      return{ok:report.status!=='fail',actions,report};
    }finally{state.repairBusy=false}
  }

  function recipeAssert(id,label,ok,detail){return{id,label,status:ok?'ok':'fail',detail:String(detail||'')}}
  async function runRuntimeRecipe(){
    const tests=[];
    tests.push(recipeAssert('version','Version cohérente',String(APPV)===STABLE_VERSION,'APPV='+String(APPV)));
    tests.push(recipeAssert('audio-multi','Sélecteur MP3 multiple',!!(document.querySelector('#audioLibraryFile')&&document.querySelector('#audioLibraryFile').multiple),'input multiple'));
    tests.push(recipeAssert('media-catalog','Catalogue vidéo / musique durable',typeof persistMediaCatalog==='function'&&typeof mediaCatalogHydrate==='function','contacts + IndexedDB + relecture'));
    tests.push(recipeAssert('pin-splash','Priorité PIN / splash',typeof maybeRunStartupSplash==='function'&&typeof lockNow==='function','fonctions présentes'));
    tests.push(recipeAssert('theme','Moteur de thèmes',typeof applyUiTheme==='function'&&Object.keys(UI_THEMES||{}).length>=5,Object.keys(UI_THEMES||{}).length+' thèmes'));
    tests.push(recipeAssert('interactions','Droits interactions',typeof actionUsableBy==='function'&&typeof normalizeActions==='function','garde-fous présents'));
    tests.push(recipeAssert('backup','Sauvegarde complète',typeof buildBackup==='function'&&typeof applyBackup==='function','export/import présents'));
    tests.push(recipeAssert('diagnostic','Diagnostic',typeof makeDiagnostic==='function'&&typeof idbInventory==='function','moteur présent'));
    tests.push(recipeAssert('braindance','Moteur Braindance',typeof bdRequest==='function'&&String(bdRequest).includes('generateContent'),'generateContent dédié'));
    tests.push(recipeAssert('presence','Moteur de présence persona',!!(window.HolophoneV2&&window.HolophoneV2.presence&&typeof window.HolophoneV2.presence.update==='function'),'présence persistante'));
    const health=await runHealthChecks({quiet:true});
    tests.push(recipeAssert('health','Santé sans panne critique',health.status!=='fail','santé='+health.status));
    const report={date:nowIso(),appVersion:String(APPV),status:tests.every(t=>t.status==='ok')?'ok':'fail',tests};
    state.lastRecipe=report;try{await Store.set(LAST_RECIPE_KEY,JSON.stringify(report))}catch(e){}
    renderRecipe(report);return report;
  }

  function backupCounts(o){
    return{contacts:Array.isArray(o&&o.contacts)?o.contacts.length:0,conversations:Array.isArray(o&&o.convs)?o.convs.length:0};
  }

  async function sha256Text(text){
    if(!(window.crypto&&window.crypto.subtle&&window.TextEncoder))return'';
    const data=new TextEncoder().encode(String(text||''));
    const hash=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function backupHash(o){
    const x=copy(o)||{};delete x.integrity;
    return await sha256Text(JSON.stringify(x));
  }

  async function prepareIncomingBackup(o){
    if(!o||typeof o!=='object')throw new Error('sauvegarde illisible');
    if(o.app!=='holophone-backup'&&!(Array.isArray(o.contacts)&&Array.isArray(o.convs)))return o;
    if(!Array.isArray(o.contacts))throw new Error('sauvegarde sans contacts');
    const clone=copy(o);
    if(clone.integrity&&clone.integrity.sha256){
      const actual=await backupHash(clone);
      if(actual&&actual!==String(clone.integrity.sha256))throw new Error('contrôle SHA-256 de la sauvegarde invalide');
    }
    const schema=Math.max(0,Number(clone.schemaVersion)||0);
    if(schema>SCHEMA_VERSION)throw new Error('sauvegarde créée par un schéma Holophone plus récent ('+schema+')');
    if(!Array.isArray(clone.convs))clone.convs=[];
    clone.convs.forEach(v=>{if(!v||!Array.isArray(v.msgs))return;v.msgs.forEach(m=>{if(!m||typeof m!=='object')return;m.w=['v','sys','evt','refuge','character'].includes(String(m.w||''))?String(m.w):'character';if(m.reply&&m.reply.w)m.reply.w=m.reply.w==='v'?'v':'character'})});
    clone.contacts.forEach(c=>{const r=c&&c.refuge;if(r&&Array.isArray(r.proposals))r.proposals.forEach(p=>{if(p)p.by=p.by==='v'?'v':'character'})});
    const ids=new Set(clone.contacts.map(c=>String(c&&c.id||'')).filter(Boolean));
    const orphan=clone.convs.filter(v=>v&&v.cid&&!ids.has(String(v.cid))).length;
    if(orphan)throw new Error(orphan+' conversation(s) référencent un contact absent');
    clone.schemaVersion=schema||SCHEMA_VERSION;
    return clone;
  }

  async function decorateBackup(o){
    if(!o||typeof o!=='object')return o;
    const counts=backupCounts(o);
    o.schemaVersion=SCHEMA_VERSION;
    o.appVersion=String(typeof APPV!=='undefined'?APPV:STABLE_VERSION);
    o.integrity={createdAt:nowIso(),contacts:counts.contacts,conversations:counts.conversations,formatVersion:Number(o.v)||0,sha256:''};
    o.integrity.sha256=await backupHash(o);
    return o;
  }

  function captureRuntimeCheckpoint(){
    const cp={
      ts:Date.now(),contacts:copy(CONTACTS),convs:copy(CONVS),curCt:String(curCt||''),
      auto:copy(AUTO),voice:copy(VOICE),search:copy(SEARCH),gen:copy(GEN),braindance:copy(BDCFG),
      actions:copy(ACTCFG),user:copy(USER),spot:copy(SPOT),theme:copy(THEME),startup:copy(STARTCFG),audio:copy(AUDIOCFG),
      api:copy(API),v2:(window.HolophoneV2&&window.HolophoneV2.cfg)?copy(window.HolophoneV2.cfg):null
    };
    state.restorePoint=cp;return cp;
  }

  async function rollbackRuntimeCheckpoint(cp){
    cp=cp||state.restorePoint;if(!cp)return false;
    CONTACTS=copy(cp.contacts)||[];CONVS=copy(cp.convs)||[];curCt=cp.curCt||((CONTACTS[0]&&CONTACTS[0].id)||null);cur=null;
    Object.assign(AUTO,copy(cp.auto)||{});Object.assign(VOICE,copy(cp.voice)||{});Object.assign(SEARCH,copy(cp.search)||{});Object.assign(GEN,copy(cp.gen)||{});
    Object.assign(BDCFG,copy(cp.braindance)||{});ACTCFG=copy(cp.actions)||ACTCFG;Object.assign(USER,copy(cp.user)||{});Object.assign(SPOT,copy(cp.spot)||{});
    Object.assign(THEME,copy(cp.theme)||{});STARTCFG=copy(cp.startup)||STARTCFG;AUDIOCFG=copy(cp.audio)||AUDIOCFG;Object.assign(API,copy(cp.api)||{});
    if(cp.v2&&window.HolophoneV2&&window.HolophoneV2.cfg)Object.assign(window.HolophoneV2.cfg,copy(cp.v2));
    try{normalizeActions()}catch(e){}try{bdNormalizeCfg()}catch(e){}try{audioNormalize()}catch(e){}try{applyUiTheme(THEME.ui)}catch(e){}
    await saveCoreSettings();
    try{await saveAuto();await saveVoice();await saveSearch();await saveUser();await saveGen();await saveSpot()}catch(e){}
    try{await Store.set(K.key,JSON.stringify(API.keys));await Store.set(K.model,API.model);await Store.set(K.prov,API.prov)}catch(e){}
    try{if(window.HolophoneV2&&window.HolophoneV2.cfg)await Store.set('v2.config',JSON.stringify(window.HolophoneV2.cfg))}catch(e){}
    try{await audioLibraryHydrate()}catch(e){}
    state.restorePoint=null;return true;
  }

  function clearRuntimeCheckpoint(){state.restorePoint=null}

  function healthColor(status){return status==='ok'?'var(--teal)':status==='warn'?'var(--yellow)':status==='fail'?'var(--magenta)':'var(--dim)'}
  function healthLabel(status){return status==='ok'?'OK':status==='warn'?'À SURVEILLER':status==='fail'?'ERREUR':'INFO'}

  function renderHealth(report){
    const host=document.querySelector('#healthSummary');if(!host||!report)return;
    host.innerHTML='';
    const grid=document.createElement('div');grid.className='hoodgrid';
    report.checks.forEach(c=>{
      const d=document.createElement('div');d.className='hoodcard';
      const b=document.createElement('b');b.textContent=c.label;
      const s=document.createElement('strong');s.textContent=healthLabel(c.status);s.style.color=healthColor(c.status);
      const i=document.createElement('i');i.textContent=c.detail;
      d.append(b,s,i);grid.appendChild(d);
    });
    host.appendChild(grid);
    const stateEl=document.querySelector('#healthState');if(stateEl){stateEl.textContent='Santé '+report.status.toUpperCase()+' · schéma '+report.schemaVersion;stateEl.style.color=healthColor(report.status)}
  }

  function renderRecipe(report){
    const host=document.querySelector('#healthRecipeResult');if(!host||!report)return;
    host.innerHTML='';
    report.tests.forEach(t=>{
      const row=document.createElement('div');row.style.cssText='padding:5px 0;border-bottom:1px solid var(--line);font-family:"Share Tech Mono",monospace;font-size:10px';
      const a=document.createElement('b');a.textContent=(t.status==='ok'?'✓ ':'✕ ')+t.label;a.style.color=healthColor(t.status);
      const i=document.createElement('span');i.textContent=' · '+t.detail;i.style.color='var(--dim)';row.append(a,i);host.appendChild(row);
    });
  }

  function wireHealthUi(){
    const refresh=document.querySelector('#healthRun');
    if(refresh&&!refresh.dataset.wired){refresh.dataset.wired='1';refresh.onclick=async()=>{refresh.disabled=true;try{await runHealthChecks({quiet:false})}finally{refresh.disabled=false}}}
    const repair=document.querySelector('#healthRepair');
    if(repair&&!repair.dataset.wired){repair.dataset.wired='1';repair.onclick=()=>askConfirm('Réparation sûre ?','Holophone ne supprimera aucune conversation ni aucun média référencé. Seuls les réglages et structures connues seront normalisés.','Réparer',async()=>{repair.disabled=true;try{const r=await runSafeRepair();flash(document.querySelector('#hoodMsg'),'Réparation terminée · '+r.actions.join(' · '),'var(--teal)',20000)}catch(e){flash(document.querySelector('#hoodMsg'),'Réparation impossible · '+textErr(e),'var(--magenta)',30000)}finally{repair.disabled=false}})}
    const recipe=document.querySelector('#healthRecipe');
    if(recipe&&!recipe.dataset.wired){recipe.dataset.wired='1';recipe.onclick=async()=>{recipe.disabled=true;try{const r=await runRuntimeRecipe();flash(document.querySelector('#hoodMsg'),'Recette technique : '+(r.status==='ok'?'OK':'ÉCHEC'),'var(--'+(r.status==='ok'?'teal':'magenta')+')',16000)}finally{recipe.disabled=false}}}
    const hood=document.querySelector('#goHood');
    if(hood&&!hood.dataset.healthWired){hood.dataset.healthWired='1';hood.addEventListener('click',()=>setTimeout(()=>runHealthChecks({quiet:false}).catch(()=>{}),80))}
  }
})();
