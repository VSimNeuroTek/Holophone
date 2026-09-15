/* Holophone 2.0 — moteurs ajoutés en module séparé.
   Le cœur historique reste dans index.html pour limiter les risques de migration ;
   les nouveaux sous-systèmes vivent ici afin de commencer la modularisation. */
(() => {
  const V2 = window.HolophoneV2 = {
    version: '3.2.1',
    cfg: { biometric:false, handsFree:false, route:'speaker', autoBackup:true,
      interactionRetentionDays:55, interactionRotateTokens:60000, interactionRotateTurns:110,
      imageContextTtlHours:2 },
    trace: {
      lastRequest:null,lastRaw:'',lastParsed:null,lastError:null,lastLatency:0,
      lastTts:null,lastSpotify:null,lastImageGen:null,lastMic:null,history:[]
    },
    migrating:false,
    timers:{},
    audioMuted:false,
    callPhase:'idle',
    callRms:0,
    lastAutoBackup:0,
    interactionContext:null,
    interactionStats:{calls:0,resumes:0,restarts:0,proactiveRestarts:0,sizeRestarts:0,imageRestarts:0,
      lastId:'',lastPrevious:'',lastUsage:null,lastRotation:null},
    episodeBusy:{},episodeRecovery:null
  };

  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  const copy=o=>JSON.parse(JSON.stringify(o));
  const cfgKey='v2.config';

  function trace(type,data){
    const item={ts:Date.now(),type,data:data||{}};
    V2.trace.history.push(item);if(V2.trace.history.length>80)V2.trace.history.splice(0,V2.trace.history.length-80);
    return item;
  }
  async function loadCfg(){
    try{const x=await Store.get(cfgKey);if(x)Object.assign(V2.cfg,JSON.parse(x))}catch(e){}
    V2.cfg.biometric=!!V2.cfg.biometric;V2.cfg.handsFree=!!V2.cfg.handsFree;
    V2.cfg.autoBackup=V2.cfg.autoBackup!==false;V2.cfg.route=V2.cfg.route||'speaker';
    V2.cfg.interactionRetentionDays=[1,7,14,28,55].includes(Number(V2.cfg.interactionRetentionDays))?Number(V2.cfg.interactionRetentionDays):55;
    V2.cfg.interactionRotateTokens=[0,40000,60000,80000,100000].includes(Number(V2.cfg.interactionRotateTokens))
      ?Number(V2.cfg.interactionRotateTokens):60000;
    V2.cfg.interactionRotateTurns=Math.max(80,Math.min(160,Number(V2.cfg.interactionRotateTurns)||110));
    V2.cfg.imageContextTtlHours=[0,1,2,4,8].includes(Number(V2.cfg.imageContextTtlHours))
      ?Number(V2.cfg.imageContextTtlHours):2;
  }
  const saveCfg=()=>Store.set(cfgKey,JSON.stringify(V2.cfg));

  /* ---------- texte / similarité ---------- */
  function normText(t){
    try{return noAcc(String(t||'')).toLowerCase().replace(/https?:\/\/\S+/g,' ').replace(/[^a-z0-9àâäéèêëîïôöùûüçœ ]/g,' ').replace(/\s+/g,' ').trim()}
    catch(e){return String(t||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
  }
  function tokens(t){return new Set(normText(t).split(' ').filter(x=>x.length>3&&!/^(avec|dans|pour|mais|alors|comme|cette|cela|elle|nous|vous|plus|tout|bien|encore)$/.test(x)))}
  function similarity(a,b){
    const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;
    let i=0;A.forEach(x=>{if(B.has(x))i++});return i/Math.max(A.size,B.size);
  }
  function extractMessages(raw){
    try{const o=safeJson(raw);return Array.isArray(o.m)?o.m.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean):[]}
    catch(e){return[]}
  }
  function assistantHistory(hist){
    const out=[];
    (hist||[]).filter(x=>x&&x.role==='assistant').slice(-14).forEach(x=>{
      const m=extractMessages(x.content||'');if(m.length)out.push(...m);else if(x.content)out.push(String(x.content).slice(0,700));
    });
    return out.slice(-24);
  }
  function repeatedReply(raw,hist){
    const m=extractMessages(raw),old=assistantHistory(hist);if(!m.length||!old.length)return null;
    let best=null;
    m.forEach(n=>old.forEach(o=>{const s=similarity(n,o);if(!best||s>best.s)best={s,n,o}}));
    return best&&best.s>=.78?best:null;
  }
  function repeatPrompt(conv){
    if(!conv)return'';
    const last=(conv.msgs||[]).filter(m=>m.w==='character'&&m.t&&!isBraindanceUiMessage(conv,m)).slice(-14).map(m=>String(m.t).trim()).filter(Boolean);
    if(!last.length)return'';
    return '\n\nANTI-RÉPÉTITION COMPORTEMENTALE\nDans tes messages récents tu as déjà utilisé ces formulations/idées :\n'+
      last.slice(-9).map(x=>'· '+x.slice(0,140)).join('\n')+
      '\nÉvite de reposer la même question, refaire le même compliment, ressortir la même anecdote ou reformuler presque à l’identique. Fais avancer la relation.';
  }

  /* ---------- télémétrie IA / TTS / Spotify / image ---------- */
  const baseCallModel=callModel;
  const HOLO_RESPONSE_SCHEMA={
    type:'object',
    properties:{
      m:{type:'array',items:{type:'string'}},
      mood:{type:'string'},lvl:{type:'integer',minimum:1,maximum:5},
      react:{type:'string'},img:{type:'string'},yt:{type:'string'},mus:{type:'string'},
      pl:{type:'string'},coop:{type:'boolean'},act:{type:'string'},room:{type:'string'},
      refugeDecisionId:{type:'string'},refugeDecision:{type:'string'},
      refugeProposalName:{type:'string'},refugeProposalDescription:{type:'string'},
      taste:{type:'integer'},att:{type:'boolean'},fin:{type:'boolean'}
    },
    required:['m','refugeDecisionId','refugeDecision','refugeProposalName','refugeProposalDescription']
  };
  const dataMime=d=>{const m=String(d||'').match(/^data:([^;]+)/);return m?m[1]:'image/jpeg'};
  const dataB64=d=>String(d||'').split(',')[1]||'';
  function interactionOutput(d){
    const steps=Array.isArray(d&&d.steps)?d.steps:[];let out=[];
    steps.filter(s=>s&&s.type==='model_output').forEach(s=>(s.content||[]).forEach(c=>{if(c&&c.type==='text'&&c.text)out.push(c.text)}));
    return out.join('').trim();
  }
  function isBraindanceInternalAi(x){
    return !!(x&&(/^\[BRAINDANCE (?:STUDIO|bloc)\b/i.test(String(x.content||''))||x.bdInternal===true));
  }
  function isBraindanceUiMessage(conv,m){
    if(!m)return false;if(m.bd===true)return true;
    const ts=Number(m.ts)||0;if(!ts||m.w!=='character')return false;
    return (conv&&conv.ai||[]).some(x=>x&&x.role==='assistant'&&/^\[BRAINDANCE bloc\b/i.test(String(x.content||''))&&Math.abs((Number(x.ts)||0)-ts)<1500);
  }
  function interactionPendingStart(conv){
    if(Number.isInteger(conv&&conv.geminiAiCursor))return Math.max(0,Math.min(conv.geminiAiCursor,(conv.ai||[]).length));
    const a=(conv&&conv.ai)||[];for(let i=a.length-1;i>=0;i--)if(a[i]&&a[i].role==='assistant')return i+1;return 0;
  }
  function interactionPending(conv,hist){
    const a=(conv&&conv.ai)||[],start=interactionPendingStart(conv);
    let pending=a.slice(start).filter(x=>x&&x.role==='user'&&!isBraindanceInternalAi(x));
    if(!pending.length&&Array.isArray(hist))pending=hist.slice().reverse().filter(x=>x&&x.role==='user'&&!isBraindanceInternalAi(x)).slice(0,1).reverse();
    return{start,pending};
  }
  function bootstrapTranscript(conv,pendingText){
    const c=CONTACTS.find(x=>x.id===(conv&&conv.cid)),U=c?uName(c):'V',J=c?characterName(c):'Persona';
    const mem=c?episodeBootstrap(c,pendingText||''):'';
    let list=(conv&&conv.msgs||[]).filter(m=>m&&m.w!=='sys'&&!isBraindanceUiMessage(conv,m)&&(m.t||m.cap||m.mus||m.yt||m.img||m.imgId)).slice(-12);
    if(list.length){const last=list[list.length-1];if(last.w==='v'&&last.t&&pendingText&&normText(pendingText).includes(normText(last.t).slice(0,80)))list=list.slice(0,-1)}
    let recent='';
    if(list.length)recent='[REPRISE LOCALE RÉCENTE — SOURCE BRUTE, NE PAS RÉINTERPRÉTER]\n'+list.map(m=>{
      const who=m.w==='v'?U:m.w==='character'?J:'VÉCU';
      if(m.mus)return who+' : [musique « '+String(m.mus.label||'').slice(0,120)+' »]';
      if(m.yt)return who+' : [vidéo « '+String(m.yt.label||'').slice(0,120)+' »]';
      if(m.img||m.imgId)return who+' : [image « '+String(m.cap||'image').slice(0,100)+' »]'+(m.t?' '+String(m.t).slice(0,300):'');
      return who+' : '+String(m.t||m.cap||'').slice(0,1000);
    }).join('\n')+'\n[FIN REPRISE LOCALE RÉCENTE]\n';
    return(mem?mem+'\n':'')+recent;
  }
  function interactionInput(conv,hist,bootstrap){
    const p=interactionPending(conv,hist),blocks=[],texts=[];let imageTs=0,imageCount=0;
    p.pending.forEach(x=>{
      if(x.img&&/^data:image\//.test(x.img)){
        blocks.push({type:'image',mime_type:dataMime(x.img),data:dataB64(x.img)});
        const ts=Number(x.ts)||Date.now();imageTs=imageTs?Math.min(imageTs,ts):ts;imageCount++;
      }
      if(x.content)texts.push(String(x.content));
    });
    let text=texts.join('\n\n').trim();
    if(!text&&Array.isArray(hist)&&hist.length)text=String(hist[hist.length-1].content||'').trim();
    if(bootstrap){const b=bootstrapTranscript(conv,text);if(b)text=b+'\n[NOUVEAU TOUR]\n'+text}
    blocks.push({type:'text',text:text||'[continue naturellement la conversation]'});
    return{blocks,start:p.start,text,imageTs,imageCount};
  }
  function interactionPayload(inp){
    const blocks=(inp&&Array.isArray(inp.blocks))?inp.blocks:[];
    const textBlocks=blocks.filter(b=>b&&b.type==='text');
    const mediaBlocks=blocks.filter(b=>b&&b.type!=='text');
    if(!mediaBlocks.length){
      const text=textBlocks.map(b=>String(b.text||'')).join('\n\n').trim();
      return text||String(inp&&inp.text||'').trim()||'[continue naturellement la conversation]';
    }
    /* Sur /v1/interactions, un tableau top-level peut être interprété comme
       une liste de Steps. On enveloppe donc explicitement les blocs
       multimodaux dans un UserInputStep. */
    return [{type:'user_input',content:blocks}];
  }
  function interactionPayloadShape(payload){
    if(typeof payload==='string')return{kind:'string',chars:payload.length,blocks:1};
    if(Array.isArray(payload)){
      return{kind:'steps',steps:payload.length,types:payload.map(x=>x&&x.type||'?'),
        contentTypes:payload.flatMap(x=>Array.isArray(x&&x.content)?x.content.map(c=>c&&c.type||'?'):[])};
    }
    return{kind:typeof payload};
  }
  function interactionThinking(model,opts){
    if(opts&&typeof opts.thinking_level==='string')return opts.thinking_level;
    if(opts&&opts.think===0)return'minimal';
    if(/flash-lite/i.test(String(model||'')))return'minimal';
    return'low';
  }
  function usageInputTokens(u){
    u=u||{};
    return Math.max(0,Number(u.total_input_tokens||u.input_tokens||u.prompt_tokens||u.raw_prompt_token)||0);
  }
  function imageContextTtlMs(){
    return Math.max(0,Number(V2.cfg.imageContextTtlHours)||0)*3600000;
  }
  function inferImageContextMarker(conv){
    if(!conv||!conv.geminiInteractionId||conv.geminiImageContextOldestTs!==undefined)return;
    const imgs=(conv.ai||[]).filter(x=>x&&x.img&&/^data:image\//.test(String(x.img))&&Number(x.ts)>0);
    conv.geminiImageContextOldestTs=imgs.length?Math.min(...imgs.map(x=>Number(x.ts)||Date.now())):0;
    conv.geminiImageContextCount=imgs.length;
  }
  function purgeExpiredAiImages(conv){
    const ttl=imageContextTtlMs();if(!conv||!ttl)return 0;
    const cut=Date.now()-ttl;let n=0;
    (conv.ai||[]).forEach(x=>{
      if(x&&x.img&&Number(x.ts)>0&&Number(x.ts)<cut){
        delete x.img;x.imageContextExpired=true;n++;
      }
    });
    return n;
  }
  function interactionRotationDecision(conv){
    if(!conv||!conv.geminiInteractionId)return{rotate:false,reason:'',tokens:0,turns:0};
    inferImageContextMarker(conv);
    const tokens=Math.max(0,Number(conv.geminiLastInputTokens)||0);
    const turns=Array.isArray(conv.geminiTurns)?conv.geminiTurns.length:0;
    const limit=Math.max(0,Number(V2.cfg.interactionRotateTokens)||0);
    const imageTs=Math.max(0,Number(conv.geminiImageContextOldestTs)||0),ttl=imageContextTtlMs();
    const imageAgeMs=imageTs?Date.now()-imageTs:0;
    if(interactionNearExpiry(conv))return{rotate:true,reason:'retention',tokens,turns,imageAgeMs};
    if(ttl&&imageTs&&imageAgeMs>=ttl)return{rotate:true,reason:'image-ttl',tokens,turns,imageAgeMs,imageCount:Number(conv.geminiImageContextCount)||1};
    if(limit&&tokens>=limit)return{rotate:true,reason:'tokens',tokens,turns,limit,imageAgeMs};
    /* Migration 2.7 : les anciennes versions ne sauvegardaient pas le coût
       réel du dernier appel. Si une chaîne est déjà énorme au moment de la
       mise à jour, le nombre de tours sert une seule fois de filet de sécurité. */
    if(!tokens&&turns>=Math.max(80,Number(V2.cfg.interactionRotateTurns)||110))
      return{rotate:true,reason:'legacy-turns',tokens,turns,limit};
    return{rotate:false,reason:'',tokens,turns,limit};
  }
  function staleInteraction(status,msg){status=Number(status);if(status===404||status===410)return true;return (status===400||status===409)&&/previous[_ ]interaction|interaction.{0,30}(not found|expired|invalid)|not found.{0,30}interaction/i.test(String(msg||''))}
  async function postInteraction(body,key){
    const r=await fetchT('https://generativelanguage.googleapis.com/v1/interactions',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)
    },60000);
    let d=null;try{d=await r.json()}catch(e){}
    if(!r.ok){const msg=(d&&d.error&&d.error.message)||'';const er=new Error('HTTP '+r.status+(msg?' · '+msg.slice(0,180):''));er.httpStatus=r.status;er.apiMessage=msg;throw er}
    return d||{};
  }
  async function geminiInteractionCall(sys,hist,model,key,opts,conv){
    model=model||API.model;key=key===undefined?API.key:key;opts=opts||{};
    if(!key)throw new Error('clé Gemini manquante');
    const storedPrevious=String(conv.geminiInteractionId||'');
    const rotation=interactionRotationDecision(conv);
    const purgedAiImages=purgeExpiredAiImages(conv);
    const proactive=!!storedPrevious&&rotation.rotate;
    let previous=proactive?'':storedPrevious;
    if(proactive){
      trace('interaction.rotation_planned',{
        conv:conv.id,reason:rotation.reason,tokens:rotation.tokens,turns:rotation.turns,
        tokenLimit:rotation.limit||0,imageAgeMs:rotation.imageAgeMs||0,imageCount:rotation.imageCount||0,
        purgedAiImages,ageMs:Date.now()-(Number(conv.geminiUpdatedAt)||0),
        retentionDays:V2.cfg.interactionRetentionDays
      });
    }
    let inp=interactionInput(conv,hist,!previous),payload=interactionPayload(inp),
      body={model,input:payload,system_instruction:String(sys||''),store:true,
      generation_config:{max_output_tokens:opts.json===false?2048:4096,thinking_level:interactionThinking(model,opts)}};
    if(previous)body.previous_interaction_id=previous;
    if(opts.json!==false)body.response_format={type:'text',mime_type:'application/json',schema:HOLO_RESPONSE_SCHEMA};
    /* Ne pas envoyer `safety_settings` à /v1/interactions.
       Le chemin Gemini API utilisé par Holophone le refuse actuellement.
       Le réglage historique reste disponible pour les appels generateContent. */
    let restarted=proactive,d;
    V2.trace.lastAttempt={
      ts:Date.now(),api:'interactions-v1',model,
      inputShape:interactionPayloadShape(body.input),
      hasPrevious:!!body.previous_interaction_id,
      previousInteractionId:body.previous_interaction_id||'',
      hasSystemInstruction:!!body.system_instruction,
      systemChars:String(body.system_instruction||'').length,
      hasResponseFormat:!!body.response_format,
      hasSafetySettings:Object.prototype.hasOwnProperty.call(body,'safety_settings'),
      store:body.store===true,
      generationConfig:Object.assign({},body.generation_config||{})
    };
    trace('interaction.request',V2.trace.lastAttempt);
    try{d=await postInteraction(body,key)}catch(e){
      if(previous&&staleInteraction(e.httpStatus,e.apiMessage||e.message)){
        restarted=true;rotation.rotate=true;rotation.reason='stale';
        V2.interactionStats.restarts++;
        conv.geminiInteractionId='';conv.geminiTurns=[];delete conv.geminiAiCursor;
        inp=interactionInput(conv,hist,true);payload=interactionPayload(inp);body={...body,input:payload};delete body.previous_interaction_id;
        V2.trace.lastAttempt={
          ts:Date.now(),api:'interactions-v1',model,
          inputShape:interactionPayloadShape(body.input),
          hasPrevious:false,previousInteractionId:'',
          hasSystemInstruction:!!body.system_instruction,
          systemChars:String(body.system_instruction||'').length,
          hasResponseFormat:!!body.response_format,
          hasSafetySettings:Object.prototype.hasOwnProperty.call(body,'safety_settings'),
          store:body.store===true,
          generationConfig:Object.assign({},body.generation_config||{}),
          restarted:true
        };
        trace('interaction.request',V2.trace.lastAttempt);
        try{d=await postInteraction(body,key)}
        catch(e2){
          if(e2.httpStatus===400&&body.response_format){
            delete body.response_format;
            V2.trace.lastAttempt=Object.assign({},V2.trace.lastAttempt,{ts:Date.now(),hasResponseFormat:false,responseFormatFallback:true});
            trace('interaction.request',V2.trace.lastAttempt);
            d=await postInteraction(body,key);
          }else throw e2;
        }
      }else if(e.httpStatus===400&&body.response_format){
        /* Compatibilité prudente : si un modèle refuse le schéma structuré,
           on conserve Interactions et on laisse le prompt imposer le JSON. */
        delete body.response_format;
        V2.trace.lastAttempt=Object.assign({},V2.trace.lastAttempt,{ts:Date.now(),hasResponseFormat:false,responseFormatFallback:true});
        trace('interaction.request',V2.trace.lastAttempt);
        d=await postInteraction(body,key);
      }else throw e;
    }
    const out=interactionOutput(d);if(!out)throw new Error('réponse vide de Gemini Interactions');
    const prevId=restarted?'':previous,newId=String(d.id||'');
    if(!newId)throw new Error('Gemini Interactions n’a renvoyé aucun identifiant de session');
    if(restarted)conv.geminiTurns=[];
    conv.geminiTurns=Array.isArray(conv.geminiTurns)?conv.geminiTurns:[];
    conv.geminiTurns.push({id:newId,previous:prevId,cursorBefore:inp.start,cursorAfter:(conv.ai||[]).length,ts:Date.now(),model});
    if(conv.geminiTurns.length>120)conv.geminiTurns.splice(0,conv.geminiTurns.length-120);
    conv.geminiInteractionId=newId;conv.geminiAiCursor=(conv.ai||[]).length;conv.geminiModel=model;conv.geminiUpdatedAt=Date.now();
    conv.geminiLastInputTokens=usageInputTokens(d.usage);
    if(restarted){conv.geminiImageContextOldestTs=0;conv.geminiImageContextCount=0}
    if(inp.imageCount){
      const its=Number(inp.imageTs)||Date.now();
      conv.geminiImageContextOldestTs=conv.geminiImageContextOldestTs
        ?Math.min(Number(conv.geminiImageContextOldestTs),its):its;
      conv.geminiImageContextCount=(Number(conv.geminiImageContextCount)||0)+Number(inp.imageCount||0);
    }
    V2.interactionStats.calls++;if(previous&&!restarted)V2.interactionStats.resumes++;
    if(restarted){
      const why=rotation.reason||'restart';
      conv.geminiRotationCount=(Number(conv.geminiRotationCount)||0)+1;
      conv.geminiLastRotation={
        ts:Date.now(),reason:why,previousId:storedPrevious||'',inputTokensBefore:Number(rotation.tokens)||0,
        turnsBefore:Number(rotation.turns)||0,newId
      };
      V2.interactionStats.proactiveRestarts++;
      if(why==='tokens'||why==='legacy-turns')V2.interactionStats.sizeRestarts++;
      if(why==='image-ttl')V2.interactionStats.imageRestarts++;
      if(rotation.imageAgeMs)conv.geminiLastRotation.imageAgeMs=rotation.imageAgeMs;
      if(rotation.imageCount)conv.geminiLastRotation.imageCount=rotation.imageCount;
      V2.interactionStats.lastRotation=copy(conv.geminiLastRotation);
      trace('interaction.rotated',copy(conv.geminiLastRotation));
    }
    V2.interactionStats.lastId=newId;V2.interactionStats.lastPrevious=prevId;V2.interactionStats.lastUsage=d.usage||null;
    await saveConvs();
    return{out,data:d,input:inp,previous:prevId,id:newId,restarted,rotationReason:restarted?(rotation.reason||'restart'):''};
  }
  callModel=async function(sys,hist,prov,model,key,opts){
    const p=prov||API.prov,m=model||API.model,start=Date.now(),ctx=V2.interactionContext;
    const sysText=String(sys||''),histSafe=(hist||[]).map(x=>({role:x.role,content:x.content,img:x.img?'[image masquée]':undefined,ts:x.ts||0}));
    let raw,meta=null;
    trace('ai.start',{provider:p,model:m,hist:(hist||[]).length,stateful:!!(p==='google'&&ctx&&ctx.conv),interactionsSafetySettings:false});
    try{
      if(p==='google'&&ctx&&ctx.conv){
        const r=await geminiInteractionCall(sys,hist,m,key,opts,ctx.conv);raw=r.out;meta=r;
        const inputChars=(r.input&&r.input.blocks||[]).reduce((n,b)=>n+(b&&b.type==='text'?String(b.text||'').length:0),0);
        V2.trace.lastRequest={ts:start,provider:p,model:m,api:'interactions-v1',system:sysText,history:[],opts:opts||{},keyPresent:!!key||!!API.key,
          systemChars:sysText.length,historyChars:0,inputChars,estimatedInputTokens:Math.ceil((sysText.length+inputChars)/3.8),
          previousInteractionId:r.previous,newInteractionId:r.id,restarted:r.restarted,rotationReason:r.rotationReason||'',
          serverState:true,safetySettingsSent:false,
          inputShape:interactionPayloadShape(interactionPayload(r.input))};
      }else{
        raw=await baseCallModel(sys,hist,prov,model,key,opts);
        const histChars=histSafe.reduce((n,x)=>n+String(x.content||'').length,0),inputChars=sysText.length+histChars;
        V2.trace.lastRequest={ts:start,provider:p,model:m,api:p==='google'?'generateContent':'legacy',system:sysText,history:histSafe,opts:opts||{},keyPresent:!!key||!!API.key,
          systemChars:sysText.length,historyChars:histChars,inputChars,estimatedInputTokens:Math.ceil(inputChars/3.8),serverState:false};
        /* Si l'utilisateur quitte Gemini dans un fil, on redémarrera proprement
           la chaîne Gemini à son retour à partir de la source locale brute. */
        if(ctx&&ctx.conv&&p!=='google'){ctx.conv.geminiInteractionId='';ctx.conv.geminiTurns=[];delete ctx.conv.geminiAiCursor;await saveConvs()}
      }
      let rep=(p==='google'&&ctx&&ctx.conv)?null:(/FORMAT DE SORTIE|MODE APPEL VOCAL|JUSTESSE —/i.test(String(sys||''))?repeatedReply(raw,hist):null);
      if(rep){
        trace('ai.repeat_retry',{score:rep.s,old:rep.o.slice(0,120),next:rep.n.slice(0,120)});
        const extra='\n\nCORRECTION ANTI-RÉPÉTITION : réponds autrement et fais progresser la situation.';
        raw=await baseCallModel(String(sys||'')+extra,hist,prov,model,key,opts);
      }
      V2.trace.lastLatency=Date.now()-start;V2.trace.lastRaw=String(raw||'');V2.trace.lastError=null;
      trace('ai.ok',{provider:p,model:m,ms:V2.trace.lastLatency,chars:String(raw||'').length,stateful:!!meta,interaction:meta&&meta.id||''});
      return raw;
    }catch(e){
      V2.trace.lastLatency=Date.now()-start;V2.trace.lastError={ts:Date.now(),stage:'ai',message:String((e&&e.message)||e),provider:p,model:m};
      trace('ai.error',V2.trace.lastError);throw e;
    }
  };
  function explicitImageIntent(conv){
    const m=lastUserMessage(conv);if(!m||!m.t)return'';
    const raw=String(m.t||'').trim(),t=noAcc(raw).toLowerCase();
    const asks=/(envoie|envoi|montre|fais|fait|partage|donne|genere|génère).{0,55}(photo|image|selfie)|\b(photo|selfie|image)\b.{0,45}(de toi|toi|stp|svp|s il te plait|s'il te plait)/i.test(t);
    if(!asks)return'';
    const self=/selfie|photo.{0,25}(de toi|toi)|montre.{0,30}(toi|visage|corps|look|apparence)|a quoi tu ressembles/i.test(t);
    return self?('selfie '+raw.slice(0,260)):raw.slice(0,320);
  }
  const baseParseAI=parseAI;
  parseAI=function(raw){
    const o=baseParseAI(raw);
    try{
      const ctx=V2.interactionContext,conv=ctx&&ctx.conv;
      if(conv&&!o.img){
        const forced=explicitImageIntent(conv);
        if(forced){o.img=forced;trace('image.intent_fallback',{conv:conv.id,desc:forced.slice(0,180)})}
      }
      V2.trace.lastParsed=copy(o)
    }catch(e){V2.trace.lastParsed={error:'copie impossible'}}
    return o
  };

  const baseTtsFetch=ttsFetch;
  ttsFetch=async function(txt){const s=Date.now();try{const u=await baseTtsFetch(txt);V2.trace.lastTts={ts:Date.now(),ok:true,mode:VOICE.mode,ms:Date.now()-s,chars:String(txt||'').length};trace('tts.ok',V2.trace.lastTts);return u}
    catch(e){V2.trace.lastTts={ts:Date.now(),ok:false,mode:VOICE.mode,ms:Date.now()-s,error:String((e&&e.message)||e)};trace('tts.error',V2.trace.lastTts);throw e}};
  const baseSpApi=spApi;
  spApi=async function(path,opt){const s=Date.now();try{const r=await baseSpApi(path,opt);V2.trace.lastSpotify={ts:Date.now(),ok:true,path:String(path),ms:Date.now()-s};trace('spotify.ok',V2.trace.lastSpotify);return r}
    catch(e){V2.trace.lastSpotify={ts:Date.now(),ok:false,path:String(path),ms:Date.now()-s,error:String((e&&e.message)||e)};trace('spotify.error',V2.trace.lastSpotify);throw e}};
  const baseGenImage=genImage;
  genImage=async function(c,desc,ref){const s=Date.now();try{const r=await baseGenImage(c,desc,ref);V2.trace.lastImageGen={ts:Date.now(),ok:true,api:LAST_IMAGE_API||'?',model:GEN.model,ms:Date.now()-s,desc:String(desc||'').slice(0,300)};trace('image.ok',V2.trace.lastImageGen);return r}
    catch(e){V2.trace.lastImageGen={ts:Date.now(),ok:false,api:LAST_IMAGE_API||'?',model:GEN.model,ms:Date.now()-s,error:String((e&&e.message)||e)};trace('image.error',V2.trace.lastImageGen);throw e}};

  /* ---------- mémoire 2.0.1 : propriétaire + durée de vie ---------- */
  const MEM_IMPORTANCE={socle:5,grave:5,evt:2,secousse:4,moi:3,elle:3};
  const ownerForTy=ty=>ty==='moi'?'user':ty==='elle'?'character':ty==='evt'?'shared':
    ty==='socle'?'foundation':ty==='grave'?'pinned':ty==='secousse'?'relationship':'shared';
  function memoryMeta(ty,extra){
    extra=extra||{};
    const confirmed=(extra.confirmedAt!==undefined&&extra.confirmedAt!==null)
      ?Number(extra.confirmedAt)||0:(Number(extra.ts)||Date.now());
    return{
      owner:extra.owner||ownerForTy(ty),
      kind:extra.kind||(ty==='evt'?'event':'durable'),
      expiresAt:Number(extra.expiresAt)||0,
      source:extra.source||((ty==='grave'||ty==='socle')?'manual':'harvest'),
      confidence:clamp(extra.confidence===undefined?((ty==='grave'||ty==='socle')?1:.84):extra.confidence,0,1),
      importance:clamp(extra.importance===undefined?(MEM_IMPORTANCE[ty]||3):extra.importance,1,5),
      confirmedAt:confirmed,replaces:extra.replaces||'',replacedBy:extra.replacedBy||'',active:extra.active!==false
    };
  }
  function memoryAlive(e,at){
    at=at||Date.now();
    return !!e&&e.active!==false&&!e.replacedBy&&(!(Number(e.expiresAt)>0)||Number(e.expiresAt)>at);
  }
  function changeSignal(a,b){
    const n=normText(b);if(/\b(désormais|maintenant|ne .{0,20} plus|n aime plus|a quitté|a arrêté|a commencé|est devenu|est devenue|a changé)\b/.test(n))return true;
    const pa=/\b(aime|adore|préfère)\b/.test(normText(a)),na=/\b(n aime pas|déteste|n aime plus)\b/.test(normText(a));
    const pb=/\b(aime|adore|préfère)\b/.test(n),nb=/\b(n aime pas|déteste|n aime plus)\b/.test(n);
    return (pa&&nb)||(na&&pb);
  }
  jrnAdd=function(c,ty,t,extra){
    t=String(t||'').trim().slice(0,500);if(t.length<4)return null;extra=extra||{};
    const list=jrn(c).filter(e=>e.ty===ty&&memoryAlive(e));
    let best=null;list.forEach(e=>{const s=similarity(e.t,t);if(!best||s>best.s)best={e,s}});
    if(best&&best.s>=.74){
      best.e.confirmedAt=Date.now();best.e.confidence=Math.max(Number(best.e.confidence)||0,.88);
      best.e.importance=Math.max(Number(best.e.importance)||1,Number(extra.importance)||1);
      if(Number(extra.expiresAt)>0)best.e.expiresAt=Math.max(Number(best.e.expiresAt)||0,Number(extra.expiresAt));
      return null;
    }
    const meta=memoryMeta(ty,extra);
    const e=Object.assign({id:'j'+uid(),ty,t,ts:extra.ts||nowTs(),keep:ty==='socle'||ty==='grave'},meta,extra||{});
    /* Le type est l'autorité finale : un appelant ne peut pas classer une entrée "moi"
       comme appartenant au personnage par accident. */
    if(ty==='moi')e.owner='user';
    else if(ty==='elle')e.owner='character';
    else if(ty==='socle')e.owner='foundation';
    if(best&&best.s>=.38&&changeSignal(best.e.t,t)){
      e.replaces=best.e.id;best.e.replacedBy=e.id;best.e.active=false;best.e.updatedAt=nowTs();
    }
    jrn(c).push(e);
    if(!V2.migrating&&ty!=='socle')timelineAdd(c,'memory',jtName(ty),t,e.ts,{jid:e.id,owner:e.owner,expiresAt:e.expiresAt||0});
    return e;
  };

  function ownerLabel(c,e){
    if(e.owner==='user'||e.ty==='moi')return uName(c);
    if(e.owner==='character'||e.ty==='elle')return characterName(c);
    if(e.owner==='foundation'||e.ty==='socle')return'SOCLE';
    if(e.owner==='relationship'||e.ty==='secousse')return'RELATION';
    return'COMMUN';
  }
  function memRank(e,words){
    let s=(Number(e.importance)||3)*1.4+(Number(e.confidence)||.75)*1.2+(e.keep?4:0);
    s+=jrnScore(e,words)*3.4;
    const age=Math.max(0,Date.now()-(Number(e.confirmedAt)||Number(e.ts)||0));
    if(age<2*86400000)s+=1.6;else if(age<14*86400000)s+=.8;
    return s;
  }
  memBlock=function(c,conv,query,budget){
    budget=Math.max(1200,Math.min(4800,Number(budget)||3400));
    const words=[...new Set(jnorm(query||'').split(' ').filter(w=>w.length>4&&!STOPW.has(w)))];
    const plan=[
      ['socle','SOCLE DÉFINI PAR V — fondation du personnage',6,3],
      ['grave','SOUVENIRS GRAVÉS',6,3],
      ['moi','FAITS SUR '+uName(c).toUpperCase()+' — propriétaire : '+uName(c),5,2],
      ['elle','FAITS SUR '+String(characterName(c)).toUpperCase()+' — propriétaire : '+String(characterName(c)),4,2],
      ['evt','ÉVÉNEMENTS RÉCENTS — propriétaires explicitement indiqués',4,2],
      ['secousse','MARQUES RELATIONNELLES',2,1]
    ];
    let out='',used=0;
    for(const [ty,head,max,minimum] of plan){
      let list=jrnOf(c,ty).filter(e=>memoryAlive(e));
      if(!list.length)continue;
      const ranked=list.map(e=>({e,s:memRank(e,words),match:jrnScore(e,words)}))
        .sort((a,b)=>b.s-a.s||(b.e.ts||0)-(a.e.ts||0));
      let take=ranked.filter(x=>x.match>0||x.e.keep).slice(0,max);
      if(take.length<minimum){
        const ids=new Set(take.map(x=>x.e.id));
        ranked.forEach(x=>{if(take.length<minimum&&!ids.has(x.e.id)){take.push(x);ids.add(x.e.id)}});
      }
      take=take.slice(0,max).map(x=>x.e).sort((a,b)=>(a.ts||0)-(b.ts||0));
      if(!take.length)continue;
      const body=take.map(e=>'· [PROPRIÉTAIRE: '+ownerLabel(c,e)+'] '+
        ((e.ty==='evt'||e.ty==='secousse')?dayLabel(e.ts)+' — ':'')+e.t).join('\n');
      const chunk=head+'\n'+body+'\n\n';
      if(used+chunk.length>budget&&used>0)continue;
      out+=chunk;used+=chunk.length;
    }
    if(out)out+='RÈGLE DE LECTURE MÉMOIRE : le marqueur [PROPRIÉTAIRE: ...] est l’autorité absolue. '+
      'Un ancien texte peut contenir un "tu" ambigu : il ne change JAMAIS son propriétaire.\n';
    return out;
  };

  /* ---------- goûts structurés ---------- */
  const baseAffAdd=affAdd;
  affAdd=function(c,o){
    o=o||{};const before=o.t?affFind(c,o.k,o.t):null,oldP=before?before.p:null;
    const made=baseAffAdd(c,o),e=made||before||(o.t?affFind(c,o.k,o.t):null);if(!e)return made;
    if(o.p!==undefined&&o.st==='ok')e.p=Number(o.p)<0?-1:1;
    e.strength=clamp(o.strength===undefined?(e.strength||((o.st==='ok')?4:2)):o.strength,1,5);
    e.confidence=clamp(o.confidence===undefined?(e.confidence||((o.st==='ok')?.9:.62)):o.confidence,0,1);
    e.source=o.source||e.source||(o.st==='auto'?'inference':'explicit');e.firstSeen=e.firstSeen||e.ts||nowTs();
    e.lastConfirmed=(o.st==='ok'||o.source==='explicit')?nowTs():(e.lastConfirmed||0);e.why=e.w||e.why||'';
    if(oldP!==null&&oldP!==e.p)timelineAdd(c,'taste','Goût modifié',e.t,nowTs(),{kind:e.k,polarity:e.p});
    return made;
  };
  const baseAffTouch=affTouch;
  affTouch=function(c,k,t,fam,extra){const r=baseAffTouch(c,k,t,fam,extra);const e=affFind(c,k,t);if(e){e.strength=e.strength||3;e.confidence=e.confidence||.72;e.source=e.source||'behavior';e.firstSeen=e.firstSeen||e.ts||nowTs();if(extra&&extra.st==='ok')e.lastConfirmed=nowTs()}return r};
  function tasteBlock(c){
    const a=aff(c).slice().sort((x,y)=>((y.strength||3)*(y.confidence||.7))-((x.strength||3)*(x.confidence||.7))).slice(0,14);
    if(!a.length)return'';
    return '\n\nPROFIL DE GOÛTS STRUCTURÉ\n'+a.map(e=>'· '+(e.p<0?'N’AIME PAS':'AIME')+' ['+afkName(e.k)+'] '+e.t+
      ' — intensité '+(e.strength||3)+'/5, confiance '+Math.round((e.confidence||.7)*100)+'%'+(e.w?' — '+e.w:'')).join('\n')+
      '\nUn goût est vivant : une confirmation récente compte plus qu’une vieille supposition, et tu peux changer d’avis.';
  }

  /* ---------- chronologie interne ---------- */
  function timeline(c){c.timeline=Array.isArray(c.timeline)?c.timeline:[];return c.timeline}
  function timelineAdd(c,type,title,detail,ts,extra){
    if(!c)return null;ts=ts||nowTs();detail=String(detail||'').slice(0,700);title=String(title||type||'événement').slice(0,90);
    const last=timeline(c).slice(-4).find(e=>e.type===type&&Math.abs((e.ts||0)-ts)<90000&&similarity(e.detail||'',detail)>.8);if(last)return last;
    const e=Object.assign({id:'tl'+uid(),type,title,detail,ts,source:'engine'},extra||{});timeline(c).push(e);
    if(c.timeline.length>900)c.timeline.splice(0,c.timeline.length-900);return e;
  }
  function timelineBlock(c,query){
    const words=tokens(query||''),now=Date.now();
    let list=timeline(c).filter(e=>!(Number(e.expiresAt)>0&&Number(e.expiresAt)<=now));
    if(!list.length)return'';
    list=list.map(e=>{
      let s=0;const T=tokens((e.title||'')+' '+(e.detail||''));words.forEach(w=>{if(T.has(w))s+=3});
      const age=Math.max(0,now-(e.ts||0));if(age<24*3600000)s+=2;else if(age<72*3600000)s+=1;
      if(e.type==='call'||e.type==='memory')s+=.4;return{e,s};
    }).sort((a,b)=>b.s-a.s||(b.e.ts||0)-(a.e.ts||0)).slice(0,4).map(x=>x.e)
      .sort((a,b)=>(a.ts||0)-(b.ts||0));
    if(!list.length)return'';
    return '\n\nCHRONOLOGIE UTILE\n'+list.map(e=>'· '+dayLabel(e.ts)+' '+hhmm(e.ts)+' — '+
      (e.owner?'[PROPRIÉTAIRE: '+(e.owner==='user'?uName(c):e.owner==='character'?(characterName(c)):'COMMUN')+'] ':'')+
      e.title+(e.detail?' : '+e.detail:'')).join('\n')+
      '\nLa chronologie décrit le passé. Un événement daté n’est pas automatiquement encore vrai maintenant.';
  }
  const basePush=push;
  push=function(m){const r=basePush(m);try{const c=cur?CONTACTS.find(x=>x.id===cur.cid):null;if(c&&m&&m.w&&m.ts){
    if(m.mus){timelineAdd(c,'music',(m.w==='character'?'Tu as partagé':'Il t’a envoyé')+' une musique',m.mus.label||'morceau',m.ts);if(m.w==='character')pEvent(c,'music','Musique partagée',m.mus.label||'morceau',m.ts)}
    else if(m.imgId||m.img){timelineAdd(c,'image',(m.w==='character'?'Tu as partagé':'Il t’a envoyé')+' une image',m.cap||'image',m.ts);if(m.w==='character')pEvent(c,'image','Image partagée',m.cap||'image',m.ts)}
    else if(m.yt){timelineAdd(c,'video',(m.w==='character'?'Tu as partagé':'Il t’a envoyé')+' une vidéo',m.yt.label||'vidéo',m.ts);if(m.w==='character')pEvent(c,'video','Vidéo partagée',m.yt.label||'vidéo',m.ts)}
    if(m.w==='refuge')pEvent(c,'refuge','Refuge',m.t||'Déplacement dans le Refuge',m.ts);
    if(m.w==='character'&&m.act)pEvent(c,'interaction','Interaction',m.act.label||m.t||'geste',m.ts);
    if(m.w==='v'){const p=presenceUpdate(c,false,cur);if(p&&p.connection>30)p.connection=pClamp(p.connection-4)}
  }}catch(e){}return r};
  const baseMoodStep=moodStep;
  moodStep=function(conv,c,raw,lvl){
    const before=conv?{m:conv.mood,n:conv.nu,l:conv.lvl}:null,r=baseMoodStep(conv,c,raw,lvl);
    try{if(conv&&c&&before){
      const changed=conv.mood!==before.m||conv.nu!==before.n||Math.abs((conv.lvl||0)-(before.l||0))>=2;
      if(conv.mood!==before.m){if((conv.lvl||0)>=4)timelineAdd(c,'mood','Bascule émotionnelle',moodName(conv.mood)+' · '+lvlName(conv.lvl||1),nowTs());pEvent(c,'mood','Humeur',moodName(conv.mood)+' · '+lvlName(conv.lvl||1),nowTs())}
      const cause=emotionCauseFromConversation(c,conv);emotionSync(c,conv,cause.type,cause.text,changed);presenceUpdate(c,true,conv);
    }}catch(e){}return r};

  /* ---------- présence intérieure 3.2 : émotion, temps, vie autonome ---------- */
  const PRESENCE_VERSION=2,EMOTION_VERSION=1,LIFE_VERSION=2;
  function presence(c){
    if(!c)return null;
    const d={version:PRESENCE_VERSION,updatedAt:0,lastObservedAt:0,offlineGapMs:0,lastGapEventTs:0,
      energy:55,connection:50,curiosity:55,autonomy:50,focus:'',thought:'',motive:'',motiveTs:0,
      recent:[],lastInitiativeAt:0,lastInitiativeMotive:'',lastDecision:null,lastDecisionTs:0,lastLifeCatchupAt:0};
    c.presence=c.presence&&typeof c.presence==='object'?c.presence:{};
    Object.keys(d).forEach(k=>{if(c.presence[k]===undefined)c.presence[k]=copy(d[k])});
    c.presence.version=PRESENCE_VERSION;c.presence.recent=Array.isArray(c.presence.recent)?c.presence.recent:[];
    return c.presence;
  }
  function pClamp(v){return Math.round(clamp(v,0,100))}
  function pSmooth(old,target,w){return pClamp((Number(old)||0)*(1-w)+Number(target)*w)}
  function pLevel(v){v=Number(v)||0;return v<25?'faible':v<45?'discrète':v<65?'présente':v<82?'forte':'très forte'}
  function pEvent(c,type,title,detail,ts){
    const p=presence(c);if(!p)return null;ts=Number(ts)||nowTs();title=String(title||type||'moment').slice(0,100);detail=String(detail||'').slice(0,260);
    const prev=p.recent.slice(-4).find(e=>e.type===type&&Math.abs((e.ts||0)-ts)<10*60000&&similarity((e.title||'')+' '+(e.detail||''),title+' '+detail)>.75);if(prev)return prev;
    const e={id:'pr'+uid(),type,title,detail,ts};p.recent.push(e);if(p.recent.length>48)p.recent.splice(0,p.recent.length-48);return e;
  }
  function contactConvs(c){return CONVS.filter(v=>v&&v.cid===c.id&&!v.mindArchived)}
  function latestConversation(c){return contactConvs(c).slice().sort((a,b)=>lastTs(b)-lastTs(a))[0]||null}
  function lastContactMsg(c,who){let best=null;contactConvs(c).forEach(v=>(v.msgs||[]).forEach(m=>{if(m&&(!who||m.w===who)&&m.ts&&(!best||m.ts>best.ts))best=m}));return best}

  /* L'émotion vécue complète l'humeur existante sans la remplacer. Elle retient
     depuis quand le même registre dure, son sous-ton et une cause locale lisible. */
  function emotion(c,conv){
    if(!c)return null;conv=conv||latestConversation(c);const f=fondOf(c),fam=(conv&&conv.mood)||f.fam||'calme';
    const d={version:EMOTION_VERSION,family:fam,nuance:(conv&&conv.nu)||'',level:Number(conv&&conv.lvl)||Number(f.lvl)||2,
      startedAt:Number(conv&&conv.moodTs)||nowTs(),updatedAt:0,causeType:'background',cause:'le rythme de sa journée',
      undertone:f.fam||'calme',undertoneLevel:Number(f.lvl)||2,stability:45,lastTransitionAt:0};
    c.emotion=c.emotion&&typeof c.emotion==='object'?c.emotion:{};
    Object.keys(d).forEach(k=>{if(c.emotion[k]===undefined)c.emotion[k]=copy(d[k])});
    c.emotion.version=EMOTION_VERSION;return c.emotion;
  }
  function emotionCauseFromConversation(c,conv){
    const now=Date.now(),msgs=conv&&Array.isArray(conv.msgs)?conv.msgs:[],rev=[...msgs].reverse();
    const lastUser=rev.find(m=>m&&m.ts&&m.w==='v');if(lastUser&&now-lastUser.ts<20*60000)return{type:'exchange',text:'le dernier échange avec '+uName(c)};
    const last=rev.find(m=>m&&m.ts&&(m.w==='character'||m.w==='refuge'));
    if(last&&now-last.ts<20*60000){
      if(last.w==='refuge')return{type:'refuge',text:'ce qui vient de se passer dans le Refuge'};
      return{type:'self',text:'ce qu’elle vient elle-même d’exprimer'};
    }
    const life=c&&c.life;if(life&&life.since&&now-life.since<75*60000)return{type:'activity',text:'ce qu’elle est en train de vivre'};
    return{type:'background',text:'son humeur de fond et le rythme de sa journée'};
  }
  function emotionSync(c,conv,causeType,causeText,meaningful){
    if(!c)return null;conv=conv||latestConversation(c);const e=emotion(c,conv),f=fondOf(c),now=Date.now();
    const fam=(conv&&conv.mood)||f.fam||'calme',nu=(conv&&conv.nu)||'',lvl=Math.max(1,Math.min(5,Number(conv&&conv.lvl)||Number(f.lvl)||2));
    const changed=e.family!==fam||e.nuance!==nu;
    if(changed){e.family=fam;e.nuance=nu;e.startedAt=now;e.lastTransitionAt=now;meaningful=true}
    e.level=lvl;e.undertone=f.fam||fam;e.undertoneLevel=Number(f.lvl)||2;
    if(meaningful||!e.cause){const src=(causeType&&causeText)?{type:causeType,text:causeText}:emotionCauseFromConversation(c,conv);e.causeType=src.type;e.cause=src.text}
    const age=Math.max(0,now-(Number(e.startedAt)||now)),ageBoost=Math.min(45,age/(8*3600000)*45),repeatBoost=Math.min(24,Number(conv&&conv.moodAge||0)*5);
    e.stability=pClamp(28+ageBoost+repeatBoost);e.updatedAt=now;return e;
  }
  function emotionDuration(e){const ms=Math.max(0,Date.now()-Number(e&&e.startedAt||Date.now()));return ms<3*60000?'depuis quelques minutes':'depuis '+durLabel(ms)}
  function emotionLabel(e){if(!e)return'—';return e.nuance?nuLabel(e.nuance):moodName(e.family).toLowerCase()}

  function presenceFocus(c,p,life){
    const sched=schedState(c),f=fondOf(c).fam;
    if(sched==='sleep')return'repos';if(sched==='work')return'travail';
    if(f==='triste'||f==='inquiet'||f==='retrait')return'se recentrer';
    if(f==='desir'||f==='tendre')return'proximité';
    if(f==='curieux')return'curiosité';
    const n=String(life&&life.name||'').toLowerCase();
    if(/musique/.test(n))return'musique';if(/lecture/.test(n))return'lecture';if(/série|film/.test(n))return'culture';if(/cuisine|douche|rangement|courses/.test(n))return'quotidien';
    return'ce qu’elle vit maintenant';
  }
  function presenceThought(c,p,life,conv){
    if(conv&&conv.wait&&!conv.wait.closed)return'Elle garde en tête le dernier échange resté en suspens.';
    const focus=p.focus;
    if(focus==='repos')return'Elle a surtout besoin de récupérer sans forcer la conversation.';
    if(focus==='travail')return'Une partie de son attention reste prise par ce qu’elle est en train de faire.';
    if(focus==='musique')return'Une envie de musique lui trotte dans la tête.';
    if(focus==='lecture'||focus==='culture')return'Elle est absorbée par quelque chose qui nourrit sa curiosité.';
    if(focus==='se recentrer')return'Elle a besoin d’un peu de calme avant de se disperser.';
    if(focus==='proximité')return'Elle est plus sensible que d’habitude à la proximité et aux petits gestes.';
    if(p.curiosity>=72)return'Elle a envie de creuser une idée plutôt que de rester en surface.';
    if(p.connection>=72)return'Elle ressent une petite envie de reprendre contact, sans urgence.';
    return'Elle suit simplement le fil de sa journée.';
  }
  function presenceMotive(c,p,conv,life){
    const now=Date.now(),lu=lastContactMsg(c,'v'),gap=lu?now-lu.ts:Infinity;
    if(conv&&conv.wait&&!conv.wait.closed)return'attendre ou relancer avec tact, parce qu’un échange est resté ouvert';
    if(schedState(c)==='sleep')return'ne pas forcer : elle est en période de repos';
    if(schedState(c)==='work'&&p.autonomy>=65)return'écrire seulement si elle a une vraie raison malgré son activité';
    if(gap>12*3600000&&p.connection>=65)return'prendre de ses nouvelles parce que le silence commence à se faire sentir';
    if(p.curiosity>=75)return'lui poser une question qui l’intéresse vraiment';
    if(String(life&&life.name||'')&&life&&now-Number(life.since||0)<90*60000)return'partir d’un petit détail concret de ce qu’elle est en train de vivre';
    if(p.focus==='musique'&&aff(c).some(e=>e.p>0&&e.k==='mus'))return'partager une musique seulement si un morceau lui vient naturellement';
    if(p.focus==='se recentrer')return'préserver un peu son espace tout en restant présente';
    return'laisser venir une raison naturelle plutôt que meubler le silence';
  }

  /* ---------- vie autonome : le temps continue quand l'app est fermée ---------- */
  const ACT={
    matin:['petit-déjeuner','douche','trajet','café','rangement','musique au casque'],
    journée:['pause','courses','déjeuner','trajet','lecture','musique','entraînement'],
    soirée:['cuisine','douche','musique','série','lecture','verre tranquille','rangement'],
    nuit:['musique tardive','lecture','insomnie','douche','traîne sur son téléphone']
  };
  function activityPool(ts){const h=new Date(ts).getHours();return h<6?ACT.nuit:h<11?ACT.matin:h<18?ACT.journée:ACT.soirée}
  function lifeTrail(c){c.lifeTrail=Array.isArray(c.lifeTrail)?c.lifeTrail:[];return c.lifeTrail}
  function lifeHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function lifeRnd(c,ts,salt){return(lifeHash(String(c&&c.id||'persona')+'|'+Math.floor(Number(ts||0)/900000)+'|'+String(salt||''))%10000)/10000}
  function lifePickFree(c,ts,prev,salt){const pool=activityPool(ts),choices=pool.filter(x=>x!==prev),list=choices.length?choices:pool;return list[Math.floor(lifeRnd(c,ts,salt||'pick')*Math.max(1,list.length))]||'chez elle'}
  function lifeScheduledName(c,ts){const st=schedState(c,ts);if(st==='sleep')return'dort';if(st==='work')return c.job?('travaille — '+c.job):'travaille';return''}
  function lifeBoundary(c,start,state,maxEnd){for(let t=start+15*60000;t<=maxEnd;t+=15*60000){if(schedState(c,t)!==state)return t}return maxEnd}
  function lifePeek(c,ts,prev){return lifeScheduledName(c,ts)||lifePickFree(c,ts,prev,'next')}
  function lifeMakeBlock(c,start,prev){
    start=Number(start)||nowTs();const st=schedState(c,start),scheduled=lifeScheduledName(c,start);let name=scheduled,end;
    if(st){end=lifeBoundary(c,start,st,start+12*3600000)}
    else{
      name=lifePickFree(c,start,prev,'current');const mins=45+Math.floor(lifeRnd(c,start,'duration')*106);end=start+mins*60000;
      for(let t=start+15*60000;t<end;t+=15*60000){if(schedState(c,t)){end=t;break}}
    }
    if(end<=start)end=start+30*60000;
    return{version:LIFE_VERSION,name,since:start,until:end,next:lifePeek(c,end,name),kind:st||'free'};
  }
  function lifeRemember(c,b){
    if(!b||!b.name||!b.since)return;const a=lifeTrail(c),last=a[a.length-1];
    if(last&&last.name===b.name&&Math.abs(Number(last.since)-Number(b.since))<60000)return;
    a.push({name:b.name,since:Number(b.since)||0,until:Number(b.until)||0,kind:b.kind||'free'});if(a.length>28)a.splice(0,a.length-28);
  }
  function lifeRecent(c,hours){const cut=Date.now()-(Number(hours)||12)*3600000;return lifeTrail(c).filter(x=>Number(x.until||x.since)>=cut).slice(-5)}
  function updateActivity(c,force){
    if(!c)return null;const now=nowTs(),p=presence(c);c.life=c.life&&typeof c.life==='object'?c.life:{};
    let curLife=c.life,created=false,completed=[];
    if(!curLife.name||!Number(curLife.since)||!Number(curLife.until)){
      curLife=lifeMakeBlock(c,now,curLife.name||'');created=true;
    }else{
      curLife.version=LIFE_VERSION;
      const currentSched=schedState(c,now),should=lifeScheduledName(c,now);
      if((should&&curLife.name!==should&&currentSched!==String(curLife.kind||''))||(!currentSched&&/^(dort|travaille)/.test(String(curLife.name||''))))curLife.until=Math.min(Number(curLife.until)||now,now);
      let guard=0;
      while(Number(curLife.until)<=now&&guard<32){
        completed.push(copy(curLife));lifeRemember(c,curLife);const start=Number(curLife.until)||now;curLife=lifeMakeBlock(c,start,curLife.name);guard++;
      }
      if(Number(curLife.until)<=now){const skippedFrom=Number(curLife.until)||now;curLife=lifeMakeBlock(c,now,curLife.name);completed.push({name:'plusieurs activités ordinaires',since:skippedFrom,until:now,kind:'summary'})}
    }
    c.life=curLife;c.life.version=LIFE_VERSION;
    if(created){timelineAdd(c,'activity','Activité',curLife.name,curLife.since,{next:curLife.next});pEvent(c,'activity','Activité',curLife.name,curLife.since)}
    if(completed.length){
      const recent=completed.slice(-3).map(x=>x.name).join(' → '),detail=(completed.length>3?(completed.length+' étapes · '):'')+recent;
      timelineAdd(c,'activity','Vie entre deux ouvertures',detail,now,{count:completed.length});pEvent(c,'activity','Temps écoulé',detail,now);if(p)p.lastLifeCatchupAt=now;
    }
    curLife.next=lifePeek(c,curLife.until,curLife.name);return curLife;
  }
  function activityContinuityText(c){
    const a=lifeRecent(c,10);if(!a.length)return'';return a.map(x=>x.name+' ('+hhmm(x.since)+'–'+hhmm(x.until||x.since)+')').join(' ; ')
  }
  function activityBlock(c){const before=c&&c.life?c.life.name:'';const a=updateActivity(c,false);if(!a)return'';if(before!==a.name){try{saveContacts()}catch(e){}}
    const recent=activityContinuityText(c);return '\n\nACTIVITÉ ACTUELLE\nTu es actuellement : '+a.name+'. Tu as commencé vers '+hhmm(a.since)+'. '+(a.next?'Ensuite, tu envisages plutôt : '+a.next+'. ':'')+
      (recent?'Plus tôt dans les dernières heures : '+recent+'. ':'')+'Ce sont des éléments de continuité quotidienne, pas des sujets à réciter ni des événements extraordinaires.'}

  function presenceUpdate(c,force,conv){
    const p=presence(c);if(!p)return null;const now=Date.now(),previousObserved=Number(p.lastObservedAt)||Number(p.updatedAt)||now;
    const gapObserved=Math.max(0,now-previousObserved);p.offlineGapMs=gapObserved;
    if(gapObserved>=45*60000&&(!p.lastGapEventTs||now-p.lastGapEventTs>30*60000)){
      const crossed=!sameDay(previousObserved,now),detail=(crossed?'Une coupure avec changement de jour · ':'Coupure · ')+durLabel(gapObserved);
      pEvent(c,'time','Temps écoulé',detail,now);p.lastGapEventTs=now;
    }
    p.lastObservedAt=now;
    if(!force&&p.updatedAt&&now-p.updatedAt<4*60000){emotionSync(c,conv);return p}
    const life=updateActivity(c,false),sched=schedState(c),F=famOf(fondOf(c).fam),lu=lastContactMsg(c,'v');
    const gap=lu?Math.max(0,now-lu.ts):24*3600000;
    let energy=sched==='sleep'?12:sched==='work'?58:(new Date(now).getHours()<8?38:new Date(now).getHours()>23?34:62);energy+=F[4]*18;
    let connection=46+Math.min(28,gap/(12*3600000)*28);if(conv&&conv.wait&&!conv.wait.closed)connection+=8;if(fondOf(c).fam==='tendre'||fondOf(c).fam==='desir')connection+=6;
    let curiosity=52+Math.sin((now/3600000)+(String(c.id||'').length))*13;if(fondOf(c).fam==='curieux')curiosity+=24;if(/lecture|musique|série|film/.test(String(life&&life.name||'')))curiosity+=8;
    let autonomy=sched==='work'?76:sched==='sleep'?88:52;if(gap<30*60000)autonomy-=12;if(fondOf(c).fam==='retrait')autonomy+=22;if(fondOf(c).fam==='complice'||fondOf(c).fam==='tendre')autonomy-=8;
    const w=p.updatedAt?.22:1;p.energy=pSmooth(p.energy,energy,w);p.connection=pSmooth(p.connection,connection,w);p.curiosity=pSmooth(p.curiosity,curiosity,w);p.autonomy=pSmooth(p.autonomy,autonomy,w);
    p.focus=presenceFocus(c,p,life);p.thought=presenceThought(c,p,life,conv);p.motive=presenceMotive(c,p,conv,life);p.motiveTs=now;p.updatedAt=now;emotionSync(c,conv);return p;
  }

  /* Décision locale d'initiative. Les règles utilisateur restent l'autorité ;
     cette couche ajoute seulement la question : "a-t-elle une raison maintenant ?" */
  function initiativeDecision(c,conv){
    conv=conv||latestConversation(c);const p=presenceUpdate(c,false,conv);if(!p)return{allow:false,score:0,reason:'aucun état disponible',category:'none',ts:Date.now()};
    const now=Date.now(),lastAny=lastContactMsg(c),gap=lastAny?Math.max(0,now-lastAny.ts):24*3600000,st=schedState(c);let score=45;
    score+=(p.connection-50)*.34+(p.curiosity-50)*.16+(p.energy-50)*.10-(p.autonomy-50)*.22;
    if(gap<45*60000)score-=35;else if(gap<2*3600000)score-=20;else if(gap<5*3600000)score-=8;else if(gap>=10*3600000&&gap<18*3600000)score+=8;else if(gap>=18*3600000)score+=14;
    if(st==='sleep')score-=100;else if(st==='work')score-=18;
    const sinceInit=now-Number(p.lastInitiativeAt||0);if(p.lastInitiativeAt&&sinceInit<2*3600000)score-=45;else if(p.lastInitiativeAt&&sinceInit<5*3600000)score-=20;else if(p.lastInitiativeAt&&sinceInit<10*3600000)score-=8;
    if(p.focus==='curiosité')score+=7;if(p.focus==='musique')score+=5;if(p.focus==='proximité')score+=5;if(p.focus==='se recentrer')score-=12;if(p.focus==='repos')score-=30;
    if(c.life&&c.life.since&&now-c.life.since<45*60000&&!/^(dort|travaille)/.test(String(c.life.name||'')))score+=5;
    const slot=Math.floor(now/(30*60000)),jitter=(lifeHash(String(c.id||'')+'|initiative|'+slot)%1100)/100-5.5;score+=jitter;score=Math.round(score);
    let category='none',reason='aucune raison assez forte pour interrompre ce qu’elle fait';
    if(st==='sleep'){category='rest';reason='elle est dans sa période de repos'}
    else if(gap<45*60000){category='recent';reason='vous venez déjà d’échanger : elle laisse respirer la conversation'}
    else if(p.curiosity>=75){category='curiosity';reason='une vraie curiosité lui donne envie de reprendre un sujet'}
    else if(c.life&&c.life.since&&now-c.life.since<75*60000&&!/^(dort|travaille)/.test(String(c.life.name||''))){category='life';reason='un petit détail de ce qu’elle vit maintenant peut naturellement lui donner envie d’écrire'}
    else if(p.focus==='musique'&&aff(c).some(e=>e.p>0&&e.k==='mus')){category='music';reason='son moment actuel lui fait penser à quelque chose qu’elle aime écouter'}
    else if(gap>=10*3600000&&p.connection>=62){category='contact';reason='le silence commence réellement à se faire sentir et elle a envie de reprendre contact'}
    else if(p.connection>=68){category='contact';reason='elle a une envie simple mais réelle de reprendre le fil'}
    const allow=score>=55&&st!=='sleep';const d={allow,score,reason,category,ts:now,gapMs:gap};p.lastDecision=d;p.lastDecisionTs=now;return d;
  }
  function presenceBlock(c,conv){
    const p=presenceUpdate(c,false,conv),life=c&&c.life||{},e=emotionSync(c,conv);if(!p)return'';const recentLife=activityContinuityText(c);
    return '\n\nPRÉSENCE INTÉRIEURE — continuité, pas une consigne à réciter\n'+
      'Énergie '+pLevel(p.energy)+' ; envie de contact '+pLevel(p.connection)+' ; curiosité '+pLevel(p.curiosity)+' ; besoin d’autonomie '+pLevel(p.autonomy)+'.\n'+
      'Émotion vécue : '+emotionLabel(e)+' · intensité '+(e.level||2)+'/5 · '+emotionDuration(e)+'. Sous-ton : '+moodName(e.undertone).toLowerCase()+'. Cause retenue : '+e.cause+'.\n'+
      'Activité : '+String(life.name||'rien de particulier')+(life.since?' depuis '+hhmm(life.since):'')+'. Focus : '+p.focus+'.'+(recentLife?' Plus tôt : '+recentLife+'.':'')+'\n'+
      'Ce qui flotte en arrière-plan : '+p.thought+'\n'+
      'Élan possible : '+p.motive+'.\n'+
      'Ces états servent à éviter une personnalité plate. Ils ne t’obligent ni à parler de toi, ni à écrire, ni à être disponible. Ne les annonce jamais comme des jauges et ne récite pas la cause de ton humeur.';
  }
  function presenceInitiative(c,conv){const d=initiativeDecision(c,conv);return d.allow?'Raison interne retenue : '+d.reason+'. Pars de cette raison seulement si elle donne un message naturel ; ne la nomme pas comme une règle.':''}
  function presenceScheduled(c,motive,at){const p=presence(c);if(!p)return;p.lastInitiativeAt=Number(at)||Date.now();p.lastInitiativeMotive=String(motive||p.motive||'').slice(0,240);pEvent(c,'initiative','Initiative préparée',p.lastInitiativeMotive,p.lastInitiativeAt)}
  function presenceDelivered(c,motive,at){const p=presence(c);if(!p)return;p.lastInitiativeAt=Number(at)||Date.now();p.connection=pClamp(p.connection-18);pEvent(c,'initiative','Initiative envoyée',String(motive||p.lastInitiativeMotive||p.motive||''),p.lastInitiativeAt)}
  window.holoPresenceInitiative=presenceInitiative;window.holoPresenceDecision=initiativeDecision;window.holoPresenceScheduled=presenceScheduled;window.holoPresenceDelivered=presenceDelivered;
  V2.presence={version:PRESENCE_VERSION,get:presence,update:presenceUpdate,event:pEvent,initiative:presenceInitiative,decision:initiativeDecision,emotion:emotionSync,life:updateActivity};

  /* Les réglages d'initiative existants restent prioritaires ; la présence ajoute
     un filtre de pertinence avant de lancer une génération spontanée. */
  const baseMayInitPresence=mayInit;
  mayInit=function(c){if(!baseMayInitPresence(c))return false;return initiativeDecision(c,latestConversation(c)).allow};

  const baseResumePresence=resumeHolophoneLifecycle;
  resumeHolophoneLifecycle=async function(){
    try{const c=C();if(c){updateActivity(c,false);presenceUpdate(c,true,cur&&cur.cid===c.id?cur:null);await saveContacts()}}catch(e){}
    return await baseResumePresence();
  };

  /* Capture aussi les changements d'humeur provoqués par le temps ou les relances. */
  const baseDecayMoodPresence=decayMood;
  decayMood=function(conv,c){const before=conv?{m:conv.mood,n:conv.nu,l:conv.lvl}:null;baseDecayMoodPresence(conv,c);try{if(c&&conv&&before&&(before.m!==conv.mood||before.n!==conv.nu||before.l!==conv.lvl))emotionSync(c,conv,'time','le temps qui passe',true)}catch(e){}};
  const baseDegradeMoodPresence=degradeMood;
  degradeMood=function(c,conv,n){baseDegradeMoodPresence(c,conv,n);try{emotionSync(c,conv,'silence','le silence qui se prolonge',true);presenceUpdate(c,true,conv)}catch(e){}};


  /* ---------- galerie intelligente ---------- */
  function galMeta(g){g.context=g.context||'';g.people=g.people||'';g.place=g.place||'';g.privacy=g.privacy||'normal';g.firstSeen=g.firstSeen||nowTs();return g}
  const baseGalList=galList;
  galList=function(c){
    const l=(c.gal||[]).map(g=>galMeta(g)).slice().sort((a,b)=>(a.last||0)-(b.last||0)||(a.used||0)-(b.used||0));
    const seuil=nowTs()-12*3600000;
    return l.map(g=>'  · « '+g.label+' »'+(g.keys&&g.keys.length?' — '+g.keys.join(', '):'')+
      (g.mood?' — humeur '+moodName(g.mood).toLowerCase():'')+(g.context?' — contexte : '+g.context:'')+
      (g.people?' — personnes : '+g.people:'')+(g.place?' — lieu : '+g.place:'')+
      (g.privacy==='private'?' — PRIVÉE : seulement si le contexte le justifie ou s’il la demande':'')+
      ((g.last||0)>seuil?' — BLOQUÉE 12 h, déjà envoyée '+whenLabel(g.last):((g.used||0)===0?' — jamais montrée':''))).join('\n');
  };
  const baseBuildGal=buildGal;
  buildGal=function(){baseBuildGal();setTimeout(()=>{
    const c=C();if(!c)return;const cards=qa('#galList .card.h');cards.forEach((card,i)=>{const g=c.gal[i];if(!g)return;galMeta(g);const ctl=card.querySelector('.ctl');if(!ctl||ctl.querySelector('.v2-galmeta'))return;
      const box=document.createElement('div');box.className='v2-galmeta';
      const ctx=document.createElement('input');ctx.className='txtin';ctx.placeholder='contexte / histoire de cette image';ctx.value=g.context;
      const ppl=document.createElement('input');ppl.className='txtin';ppl.placeholder='personnes présentes';ppl.value=g.people;
      const plc=document.createElement('input');plc.className='txtin';plc.placeholder='lieu';plc.value=g.place;
      const pr=document.createElement('select');[['normal','normale'],['private','privée / sensible']].forEach(x=>{const o=document.createElement('option');o.value=x[0];o.textContent=x[1];if(g.privacy===x[0])o.selected=true;pr.appendChild(o)});
      ctx.oninput=()=>{g.context=ctx.value.slice(0,240);saveContacts()};ppl.oninput=()=>{g.people=ppl.value.slice(0,160);saveContacts()};plc.oninput=()=>{g.place=plc.value.slice(0,120);saveContacts()};pr.onchange=()=>{g.privacy=pr.value;saveContacts()};
      box.append(ctx,ppl,plc,pr);const note=document.createElement('div');note.className='v2-meta-note';note.textContent=(g.used||0)+' utilisation(s)'+(g.last?' · dernière '+whenLabel(g.last):'');ctl.append(box,note);
    })
  },0)};


  /* ---------- mémoire épisodique 2.2 : sources exactes ---------- */
  const EP_RECOVERY_KEY='v2.2.2.episodeRecovery';
  const EP_MAX=80,EP_SCAN_USERS=3,EP_BOOT_MAX_CHARS=9000,EP_MAX_SOURCES=12,EP_MIN_ANCHOR_GAP=5,EP_MAX_PER_SCAN=12;

  function episodes(c){c.episodes=Array.isArray(c.episodes)?c.episodes:[];return c.episodes}
  function epEligibleMessages(conv){
    return (conv&&conv.msgs||[]).filter(m=>m&&(m.w==='v'||m.w==='character')&&!isBraindanceUiMessage(conv,m)&&String(m.t||'').trim());
  }
  function epTags(v){
    return [...new Set((Array.isArray(v)?v:[]).map(x=>String(x||'').trim().toLowerCase()).filter(x=>x.length>1).slice(0,8))];
  }
  function epSourceKey(s){return [s.w,s.ts,String(s.t||'')].join('|')}
  function epNormalizeSource(list){
    const seen=new Set(),out=[];
    (list||[]).forEach(s=>{
      if(!s||!s.t)return;const x={w:s.w==='character'?'character':'v',ts:Number(s.ts)||0,t:String(s.t)};
      const k=epSourceKey(x);if(seen.has(k))return;seen.add(k);out.push(x);
    });
    return out.sort((a,b)=>a.ts-b.ts);
  }
  function epTrim(c){
    const a=episodes(c);if(a.length<=EP_MAX)return;
    a.sort((x,y)=>(Number(y.importance)||1)-(Number(x.importance)||1)||(Number(y.updatedAt)||0)-(Number(x.updatedAt)||0));
    c.episodes=a.slice(0,EP_MAX).sort((x,y)=>(x.fromTs||0)-(y.fromTs||0));
  }
  function epMergeCandidate(c,ep){
    const incoming=epNormalizeSource(ep.sources||[]);
    const keys=new Set(incoming.map(epSourceKey));
    return episodes(c).find(x=>{
      if(!x||x.convId!==ep.convId)return false;
      const old=epNormalizeSource(x.sources||[]);
      let shared=0;old.forEach(s=>{if(keys.has(epSourceKey(s)))shared++});
      if(shared<2)return false;
      const union=new Set([...old,...incoming].map(epSourceKey));
      /* Fusion seulement si les deux fenêtres décrivent réellement
         le même passage ET restent un petit épisode lisible. */
      return union.size<=EP_MAX_SOURCES;
    })||null;
  }
  function epStore(c,conv,source,importance,tags,origin){
    source=epNormalizeSource(source);if(!source.length)return null;
    if(source.length>EP_MAX_SOURCES)source=source.slice(0,EP_MAX_SOURCES);
    const ep={
      id:'ep'+uid(),convId:conv.id,fromTs:source[0].ts,toTs:source[source.length-1].ts,
      createdAt:Date.now(),updatedAt:Date.now(),importance:clamp(importance||3,1,5),
      tags:epTags(tags),origin:origin||'auto',sources:source
    };
    const old=epMergeCandidate(c,ep);
    if(old){
      old.sources=epNormalizeSource([...(old.sources||[]),...source]).slice(0,EP_MAX_SOURCES);
      old.fromTs=old.sources[0]?old.sources[0].ts:Math.min(Number(old.fromTs)||ep.fromTs,ep.fromTs);
      old.toTs=old.sources.length?old.sources[old.sources.length-1].ts:Math.max(Number(old.toTs)||ep.toTs,ep.toTs);
      old.importance=Math.max(Number(old.importance)||1,ep.importance);
      old.tags=epTags([...(old.tags||[]),...ep.tags]);old.updatedAt=Date.now();
      if(origin==='recovery')old.origin='recovery';
      return old;
    }
    episodes(c).push(ep);epTrim(c);return ep;
  }
  function epTextNorm(s){return noAcc(String(s||'').toLowerCase())}
  const EP_TAGS=[
    ['famille',/\b(famille|fils|fille|enfant|bebe|bébé|petit|parent|pere|père|mere|mère|frere|frère|soeur|sœur|parrain|marraine)\b/i],
    ['couple',/\b(couple|femme|mari|epouse|épouse|relation|rupture|separ|sépar|amour|aime|aimer|conjoint|conjointe)\b/i],
    ['maison',/\b(maison|appartement|chambre|domicile|demenag|déménag|acheter|achat)\b/i],
    ['travail',/\b(travail|taf|boulot|emploi|metier|métier|licenci|promotion|retraite)\b/i],
    ['sante',/\b(sante|santé|medecin|médecin|hopital|hôpital|operation|opération|vasectomie|traitement|diagnostic)\b/i],
    ['decision',/\b(decid|décid|choisi|choix|refuse|refus|promis|promesse|jamais|toujours|veux|voudrais|souhaite)\b/i],
    ['identite',/\b(prenom|prénom|nom|identite|identité|origine|cree|créé|creation|création|pseudonyme|surnom)\b/i],
    ['emotion',/\b(honte|peur|colere|colère|triste|angoiss|boulevers|effondr|malheure|heureux|desespoir|désespoir|disparaitre|disparaître)\b/i],
    ['culture',/\b(film|cinema|cinéma|musique|morceau|album|livre|roman|jeu video|jeu vidéo|cyberpunk|braindance)\b/i],
    ['projet',/\b(projet|construire|avenir|objectif|reve|rêve|plan|prévoit|prevoit)\b/i]
  ];
  function epLocalTags(msgs){
    const txt=epTextNorm((msgs||[]).map(m=>m.t||'').join(' ')),tags=[];
    EP_TAGS.forEach(([tag,re])=>{if(re.test(txt))tags.push(tag)});
    if((msgs||[]).some(m=>m.w==='character'&&epCharacterSelfScore(m)>=3))tags.push('character');
    return epTags(tags);
  }
  function epCharacterSelfScore(m){
    if(!m||m.w!=='character')return 0;
    const t=epTextNorm(m.t);
    let s=0;
    if(/\b(je choisis|je veux etre|je veux être|j aimerais etre|j aimerais être|je prefere|je préfère|je deteste|je déteste|j adore|j'aime|j aime)\b/i.test(t))s+=4;
    if(/\b(ce que je suis|qui je suis|devenir|libre d etre|libre d'être|ma personnalite|ma personnalité|mon identite|mon identité)\b/i.test(t))s+=4;
    if(/\b(pour moi|je crois que|je pense que|je ressens|je me rends compte|j ai compris|j'ai compris)\b/i.test(t))s+=1;
    return s;
  }
  function epMessageScore(m){
    if(!m||!m.t)return 0;
    const raw=String(m.t),t=epTextNorm(raw);let s=0;
    if(raw.length>=900)s+=3;else if(raw.length>=450)s+=2;else if(raw.length>=220)s+=1;
    let cats=0;EP_TAGS.forEach(([,re])=>{if(re.test(t))cats++});s+=Math.min(4,cats);
    if(/\b(souviens toi|souviens-toi|n oublie pas|n'oublie pas|c est important|c'est important|mon vrai prenom|mon vrai prénom|je m appelle|je m'appelle)\b/i.test(t))s+=4;
    if(/\b(mort|deces|décès|naissance|enceinte|grossesse|mariage|divorce|rupture|separer|séparer|vasectomie|licencie|licencié|demenage|déménage)\b/i.test(t))s+=3;
    if(m.w==='character')s+=epCharacterSelfScore(m);
    return s;
  }
  function epCandidateRanges(msgs){
    const anchors=[];
    (msgs||[]).forEach((m,i)=>{
      const score=epMessageScore(m);if(score<3)return;
      const self=epCharacterSelfScore(m);
      anchors.push({i,score,self,rank:score+(self>=3?20:0),len:String(m.t||'').length});
    });
    if(!anchors.length)return[];

    /* On choisit des noyaux distincts, pas des fenêtres qui se fusionnent
       en chaîne jusqu'à avaler la conversation entière. Les phrases où
       La persona se définit elle-même sont prioritaires. */
    anchors.sort((a,b)=>b.rank-a.rank||b.score-a.score||b.len-a.len||a.i-b.i);
    const chosen=[];
    for(const a of anchors){
      if(chosen.some(x=>Math.abs(x.i-a.i)<EP_MIN_ANCHOR_GAP))continue;
      chosen.push(a);
      if(chosen.length>=EP_MAX_PER_SCAN)break;
    }

    chosen.sort((a,b)=>a.i-b.i);
    return chosen.map(a=>{
      const radius=a.score>=8?3:2;
      return{
        a:Math.max(0,a.i-radius),
        b:Math.min(msgs.length-1,a.i+radius),
        score:a.score,
        anchor:a.i,
        self:a.self
      };
    });
  }
  async function epClassify(c,conv,msgs,origin){
    /* 2.2.1 : aucun appel IA.
       On sélectionne localement des fenêtres marquantes et on stocke
       exclusivement les messages sources exacts. */
    const ranges=epCandidateRanges(msgs),saved=[];
    ranges.forEach(r=>{
      const src=msgs.slice(r.a,r.b+1).slice(0,EP_MAX_SOURCES);
      const importance=r.score>=8?5:r.score>=5?4:3;
      const ep=epStore(c,conv,src,importance,epLocalTags(src),origin||'local');
      if(ep)saved.push(ep);
    });
    return{episodes:saved,local:true};
  }
  async function epScanConversation(c,conv,optx){
    optx=optx||{};if(!c||!conv||conv.mindArchived)return{ok:true,added:0};
    if(V2.episodeBusy[conv.id])return{ok:false,busy:true};
    const all=epEligibleMessages(conv);if(!all.length)return{ok:true,added:0};
    let pool=all;
    if(!optx.full){
      const lastTs=Number(conv.episodeScanTs)||0;
      const fresh=all.filter(m=>(Number(m.ts)||0)>lastTs);
      if(!fresh.length)return{ok:true,added:0,waiting:true};
      const firstFresh=Math.max(0,all.indexOf(fresh[0]));
      pool=all.slice(Math.max(0,firstFresh-3),Math.min(all.length,firstFresh+32));
    }else{
      /* Migration/récupération 2.2.1 : toute la conversation active.
         Aucun appel réseau : on peut analyser beaucoup plus large sans
         perturber la persona. */
      pool=all.slice(-220);
    }
    V2.episodeBusy[conv.id]=true;
    try{
      const before=episodes(c).length,res=await epClassify(c,conv,pool,optx.origin||'local');
      conv.episodeScanTs=all[all.length-1].ts||Date.now();
      await saveContacts();await saveConvs();
      const after=episodes(c).length;
      trace('memory.episodes',{conv:conv.id,origin:optx.origin||'local',mode:'local-source',selected:(res.episodes||[]).length,total:after});
      return{ok:true,added:Math.max(0,after-before),selected:(res.episodes||[]).length,mode:'local-source'};
    }catch(e){
      trace('memory.episodes.error',{conv:conv.id,error:String(e&&e.message||e),mode:'local-source'});
      return{ok:false,error:String(e&&e.message||e)};
    }finally{delete V2.episodeBusy[conv.id]}
  }
  function epSchedule(c,conv){
    if(!c||!conv||conv.mindArchived)return;
    clearTimeout(V2.timers['ep_'+conv.id]);
    V2.timers['ep_'+conv.id]=setTimeout(()=>epScanConversation(c,conv,{origin:'local-auto'}),2500);
  }
  function epScore(ep,q){
    const W=tokens(q||''),T=tokens((ep.tags||[]).join(' ')+' '+(ep.sources||[]).map(s=>s.t).join(' '));
    let hit=0;W.forEach(w=>{if(T.has(w))hit++});
    const age=Math.max(0,Date.now()-(Number(ep.toTs)||0));
    const fresh=age<30*86400000?1:age<180*86400000?.4:0;
    return hit*5+(Number(ep.importance)||1)*1.7+fresh;
  }
  function epRenderSources(c,ep,maxChars){
    const J=characterName(c),U=uName(c);let out='',used=0;
    for(const s of (ep.sources||[])){
      const who=s.w==='character'?J:U,line=who+' : « '+String(s.t||'')+' »\n';
      if(used+line.length>maxChars&&used>0)break;
      out+=line;used+=line.length;
    }
    return out.trim();
  }
  function epPick(c,q,count,requireMatch){
    const W=tokens(q||'');
    return episodes(c).map(ep=>{
      const T=tokens((ep.tags||[]).join(' ')+' '+(ep.sources||[]).map(s=>s.t).join(' '));
      let hits=0;W.forEach(w=>{if(T.has(w))hits++});
      return{ep,hits,score:epScore(ep,q)};
    }).filter(x=>!requireMatch||x.hits>0)
      .sort((a,b)=>b.score-a.score||(b.ep.toTs||0)-(a.ep.toTs||0)).slice(0,count).map(x=>x.ep);
  }
  function epRelevantBlock(c,conv,q){
    const take=epPick(c,q,2,true).filter(ep=>ep.convId!==(conv&&conv.id));if(!take.length)return'';
    return'\n\nMÉMOIRE ÉPISODIQUE PERTINENTE — SOURCES ORIGINALES\n'+take.map(ep=>{
      return'· '+dayLabel(ep.fromTs)+' · importance '+ep.importance+'/5 · tags : '+(ep.tags||[]).join(', ')+'\n'+
        epRenderSources(c,ep,2600);
    }).join('\n\n')+
      '\nSeules les citations font foi. Les tags sont un index et ne constituent jamais des faits.';
  }
  function episodeBootstrap(c,q){
    const take=epPick(c,q,5,false);if(!take.length)return'';
    let out='[MÉMOIRE LONG TERME LOCALE — SOURCES EXACTES]\n',used=out.length;
    for(const ep of take){
      const head='\nÉPISODE '+dayLabel(ep.fromTs)+' · importance '+ep.importance+'/5 · tags : '+(ep.tags||[]).join(', ')+'\n';
      const body=epRenderSources(c,ep,3000)+'\n';
      if(used+head.length+body.length>EP_BOOT_MAX_CHARS&&used>500)break;
      out+=head+body;used+=head.length+body.length;
    }
    return out+'[FIN MÉMOIRE LONG TERME]\nLes citations sont les seules sources de vérité. N’invente pas ce qui n’y figure pas.\n';
  }
  function interactionRetentionMs(){
    const d=Number(V2.cfg.interactionRetentionDays)||55;return d*86400000;
  }
  function interactionNearExpiry(conv){
    if(!conv||!conv.geminiInteractionId||!conv.geminiUpdatedAt)return false;
    const d=Number(V2.cfg.interactionRetentionDays)||55;
    const margin=d<=1?2*3600000:24*3600000;
    return Date.now()-Number(conv.geminiUpdatedAt)>=Math.max(6*3600000,interactionRetentionMs()-margin);
  }
  async function epRecoverCurrentOnce(){
    let done=null;try{done=JSON.parse((await Store.get(EP_RECOVERY_KEY))||'null')}catch(e){}
    if(done&&done.done){V2.episodeRecovery=done;return done}
    let conv=cur&&!cur.mindArchived?cur:null;
    if(!conv){
      let id='';try{id=String((await Store.get('v7.dernier-fil'))||'')}catch(e){}
      conv=CONVS.find(v=>v.id===id&&!v.mindArchived)||CONVS.filter(v=>!v.mindArchived).sort((a,b)=>lastTs(b)-lastTs(a))[0]||null;
    }
    if(!conv)return null;
    const c=CONTACTS.find(x=>x.id===conv.cid);if(!c||epEligibleMessages(conv).length<2)return null;

    /* 2.2.2 : on reconstruit uniquement les épisodes du fil courant.
       Les messages originaux n'ont jamais été modifiés, donc cette opération
       est réversible et ne touche ni aux autres fils ni au moteur de la persona. */
    const beforeAll=episodes(c);
    const removed=beforeAll.filter(ep=>ep&&ep.convId===conv.id).length;
    c.episodes=beforeAll.filter(ep=>!ep||ep.convId!==conv.id);
    conv.episodeScanTs=0;
    await saveContacts();await saveConvs();

    toastInfo('Mémoire longue','Redécoupage local de la conversation actuelle…');
    const res=await epScanConversation(c,conv,{full:true,origin:'recovery-local-2.2.2'});
    if(res&&res.ok){
      const currentEpisodes=episodes(c).filter(ep=>ep&&ep.convId===conv.id);
      const state={
        done:true,ts:Date.now(),convId:conv.id,removed,
        selected:Number(res.selected)||0,
        rebuilt:currentEpisodes.length,
        total:episodes(c).length
      };
      V2.episodeRecovery=state;await Store.set(EP_RECOVERY_KEY,JSON.stringify(state));
      toastInfo('Mémoire longue','Redécoupage terminé · '+state.rebuilt+' épisode(s) dans ce fil.');
      return state;
    }
    return null;
  }

  /* ---------- moteur 2.1 : contexte frugal + mémoire sourcée ---------- */
  function clipText(s,n){s=String(s||'').trim();return s.length>n?s.slice(0,n-1)+'…':s}
  function lastUserMessage(conv){return[...(conv&&conv.msgs||[])].reverse().find(m=>m.w==='v')||null}
  function contextQuery(conv){
    const a=(conv&&conv.ai||[]).filter(m=>m&&m.role==='user').slice(-2);return a.map(m=>String(m.content||'')).join(' ').trim();
  }
  function visualContextNeeded(conv,q){const m=lastUserMessage(conv);return!!(m&&(m.img||m.imgId))||/\b(photo|image|selfie|avatar|visage|cheveu|yeux|corps|tatou|look|apparence|ressembl|montre|voir)\b/i.test(noAcc(q))}
  function mediaContextNeeded(q){return/\b(photo|image|selfie|galerie|musique|morceau|spotify|film|video|vidéo|braindance|bd|playlist|ecoute|écoute|montre)\b/i.test(noAcc(q))}
  function compactPersona(c,max){
    let out='',used=0;max=max||4300;for(const f of PER_FIELDS){const val=clipText((c.per&&c.per[f[0]])||'',900);if(!val)continue;const ch=(HEAD[f[0]]?HEAD[f[0]]+'\n':'')+val+'\n\n';if(used+ch.length>max)break;out+=ch;used+=ch.length}return out.trim();
  }
  function sourceMemories(c,q){
    const words=tokens(q||''),rows=[];
    const list=jrn(c).filter(e=>e&&e.active!==false&&!e.replacedBy&&(e.ty==='socle'||e.ty==='grave'||(e.ty==='evt'&&(e.source==='explicit-event'||e.keep))));
    list.forEach(e=>{let score=e.ty==='socle'?20:e.ty==='grave'?12:4;const T=tokens(e.t||'');words.forEach(w=>{if(T.has(w))score+=3});if(e.keep)score+=4;rows.push({e,score})});
    const take=rows.sort((a,b)=>b.score-a.score||(b.e.ts||0)-(a.e.ts||0)).slice(0,7).map(x=>x.e);
    if(!take.length)return'';
    return'\n\nMÉMOIRE LONGUE — UNIQUEMENT SOURCES CONSERVÉES\n'+take.map(e=>{
      if(e.ty==='socle')return'· [SOCLE PERSONA] '+e.t;
      if(e.ty==='grave')return'· [CITATION BRUTE ÉPINGLÉE] '+e.t;
      return'· [VÉCU SAISI MANUELLEMENT PAR V — '+dayLabel(e.ts)+'] '+e.t;
    }).join('\n')+'\nN’invente aucune conséquence qui ne figure pas dans ces sources.';
  }
  function crossThreadRawRecall(c,conv,q){
    if(!opt(c,'recall'))return'';const words=[...tokens(q||'')];if(!words.length)return'';const hits=[];
    CONVS.filter(v=>v.cid===c.id&&v.id!==conv.id&&!isMindArchived(c,v)).forEach(v=>(v.msgs||[]).forEach(m=>{
      if(!m||!m.t||(m.w!=='v'&&m.w!=='character')||isBraindanceUiMessage(v,m))return;const T=tokens(m.t);let s=0;words.forEach(w=>{if(T.has(w))s++});if(s>=2)hits.push({s,m});
    }));
    hits.sort((a,b)=>b.s-a.s||(b.m.ts||0)-(a.m.ts||0));const take=hits.slice(0,2);if(!take.length)return'';
    return'\n\nÉCHOS D’ANCIENS FILS — CITATIONS ORIGINALES\n'+take.map(x=>'· '+dayLabel(x.m.ts)+' — '+(x.m.w==='v'?uName(c):(characterName(c)))+' : « '+clipText(x.m.t,220)+' »').join('\n')+
      '\nCe sont des citations, pas des résumés. Respecte strictement leur auteur.';
  }
  function tinyMedia(c,q){
    let s='\n\nMÉDIAS FACULTATIFS\nTu peux laisser img, mus, pl et yt vides.';
    s+=' Si V demande explicitement une photo, une image, un selfie ou te demande de lui montrer à quoi tu ressembles, renseigne TOUJOURS img : "selfie" pour toi, ou une courte description concrète pour une scène.';
    s+=' Pour un morceau, mus vaut "Artiste — Titre". Pour proposer une playlist Spotify, pl contient son nom ou une requête courte permettant de la retrouver. Quand Vincent vient de te partager un morceau ou une playlist, réagis-y mais ne lui retransmets jamais ce même contenu en retour ; si tu veux répondre par un média, choisis-en un différent. Les GIF animés déjà présents dans ta galerie peuvent être envoyés exactement comme les autres images.';
    if(SPOT&&SPOT.coop&&SPOT.coop.id)s+=' Vous avez une playlist commune « '+clipText(SPOT.coop.name||(uName(c)+' × '+characterName(c)+' — Holophone'),80)+' ». Si tu proposes un morceau que TU veux vraiment y conserver, mets coop=true avec mus. Ne le fais pas pour chaque morceau.';
    if(mediaContextNeeded(q)){
      const gs=(c.gal||[]).filter(g=>g&&g.label).slice().sort((a,b)=>(a.last||0)-(b.last||0)).slice(0,4);
      if(gs.length)s+='\nImages locales possibles : '+gs.map(g=>'« '+g.label+' »').join(', ')+'.';
      const vids=(c.bd||[]).filter(x=>x&&x.label).slice(0,3);if(vids.length)s+='\nVidéos possibles : '+vids.map(x=>'« '+x.label+' »').join(', ')+'.';
    }
    return s;
  }
  function tinyActions(c){try{return actionPromptBlock(c)||''}catch(e){return''}}
  function tinyRefuge(c){try{return refugePrompt(c)||''}catch(e){return''}}
  function currentState(c,conv){
    const now=Date.now(),F=fondOf(c),st=schedState(c);let s='\n\nMAINTENANT\n'+dateLabel(now)+' · '+hhmm(now)+' · '+partDay(now)+'. Humeur de fond : '+moodName(F.fam).toLowerCase()+'.';
    if(conv&&conv.mood)s+=' Humeur du fil : '+(conv.nu?nuLabel(conv.nu):moodName(conv.mood).toLowerCase())+' ('+(conv.lvl||1)+'/5).';
    if(st==='work')s+=' Selon ses horaires, '+characterName(c)+' est normalement au travail'+(c.job?' ('+c.job+')':'')+'.';else if(st==='sleep')s+=' Selon ses horaires, '+characterName(c)+' est normalement en période de sommeil.';
    return s;
  }
  function outputRules(c){
    return'\n\nSTYLE DE CE TOUR\nRéponds en français comme '+(characterName(c))+' qui écrit sur téléphone : naturel, vivant, pas administratif. 1 à 3 bulles en général. '+
      'Ne récite pas la mémoire et n’essaie pas de caser un souvenir à chaque réponse. Si tu ne sais pas, tu peux le dire. '+
      'Ne confonds jamais la vie de '+uName(c)+' avec celle de '+(characterName(c))+'. Les citations gardent toujours leur auteur. '+
      'Le format JSON est imposé par l’API : m contient les bulles ; mood/lvl sont facultatifs ; img/mus/pl/yt seulement si cela vient naturellement ; act doit rester vide dans la majorité des tours. Une action spontanée est rare et ne doit pas apparaître dans plusieurs réponses successives. Si tu réponds à une ACTION PHYSIQUE de Vincent, une action en retour est facultative ; si tu en choisis une, ne renvoie jamais la même action en miroir et choisis uniquement une alternative compatible indiquée dans la demande. room peut contenir le nom exact d’une pièce du Refuge si tu décides naturellement de t’y déplacer. refugeDecisionId, refugeDecision, refugeProposalName et refugeProposalDescription sont toujours présents dans le JSON : laisse-les à "" quand ils ne servent pas. Si le message contient une PROPOSITION POUR NOTRE REFUGE avec un ID, tu DOIS donner ton vrai avis dans m, recopier cet ID dans refugeDecisionId et mettre refugeDecision à "accept" ou "refuse". Si le contexte dit PROPOSITION ATTENDUE DE TOI ou si tu choisis rarement de proposer une nouvelle pièce, remplis refugeProposalName et refugeProposalDescription ; cela crée seulement une proposition en attente de Vincent, jamais une pièce automatiquement construite. La proposition de Vincent n’existe dans la maison qu’après ton acceptation, et ta proposition n’existe qu’après l’acceptation de Vincent ; coop=true uniquement avec mus quand tu choisis vraiment de garder ce morceau dans votre playlist commune ; att=true seulement si tu attends réellement une réponse.';
  }
  sysPrompt=function(c,conv){
    conv=conv||cur;c=c||(conv?CONTACTS.find(x=>x.id===conv.cid):null);if(!c)throw new Error('personnage introuvable');
    const U=uName(c),J=characterName(c),q=contextQuery(conv);let s='IDENTITÉ\nTu es '+J+(c.last?' '+c.last:'')+(c.age?' · '+c.age+' ans':'')+'. Tu échanges avec '+uDesc(c)+'. '+
      (c.relation?'Votre relation déclarée : '+c.relation+'. ':'')+(c.job?'Ton métier : '+c.job+'. ':'')+'Vous êtes deux adultes.\n';
    if((c.facts||'').trim())s+='\nFAITS STABLES ÉCRITS PAR V\n'+clipText(c.facts,1300)+'\n';
    const per=compactPersona(c,4300);if(per)s+='\nPERSONNALITÉ\n'+per+'\n';
    if(visualContextNeeded(conv,q)&&(c.look||'').trim())s+='\nAPPARENCE — utile pour ce tour visuel\n'+clipText(c.look,2400)+'\n';
    s+=sourceMemories(c,q);s+=epRelevantBlock(c,conv,q);s+=crossThreadRawRecall(c,conv,q);
    if(opt(c,'threads')&&(c.threads||'').trim())s+='\n\nINTENTION MANUELLE ÉVENTUELLE\n'+clipText(c.threads,380);
    s+=currentState(c,conv);s+=presenceBlock(c,conv);s+=tinyRefuge(c);s+=tinyActions(c);s+=tinyMedia(c,q);s+=outputRules(c);return s;
  };

  /* generateContent de secours pour les autres fournisseurs et tâches internes.
     Les conversations Gemini ignorent cet historique : previous_interaction_id
     transporte désormais le fil côté serveur. */
  aiWithTime=function(conv,n){
    const all=(conv&&conv.ai||[]).filter(m=>m&&(m.role==='user'||m.role==='assistant')&&!isBraindanceInternalAi(m)).slice(-10);
    return all.map(m=>({role:m.role,content:clipText(m.content||'',1800),img:m.img,ts:m.ts||0}));
  };

  function isMindArchived(c,v){return!!(v&&(v.mindArchived||(c&&Array.isArray(c.mindArchives)&&c.mindArchives.includes(v.id))))}

  const baseRecallMind=recallBits;
  recallBits=function(c,conv,q){
    const words=[...new Set(noAcc(q).split(/[^a-z0-9]+/).filter(w=>w.length>4&&!STOPW.has(w)))];
    if(!words.length)return'';
    const recent=new Set((conv.msgs||[]).slice(-20).map(m=>m.ts)),hits=[];
    CONVS.filter(v=>v.cid===c.id&&!isMindArchived(c,v)).forEach(v=>(v.msgs||[]).forEach(m=>{
      if(!m.t||m.w==='sys'||recent.has(m.ts)||isBraindanceUiMessage(v,m))return;
      const t=noAcc(m.t);let sc=0;words.forEach(w=>{if(t.includes(w))sc++});
      if(sc)hits.push({sc,m});
    }));
    hits.sort((a,b)=>b.sc-a.sc||(b.m.ts||0)-(a.m.ts||0));
    return hits.slice(0,2).map(h=>'· '+dayLabel(h.m.ts)+' — '+(h.m.w==='v'?uName(c):(characterName(c)))+
      ' : « '+clipText(h.m.t,150)+' »').join('\n');
  };

  const baseConvTitleMind=convTitle;
  convTitle=function(v){
    const c=CONTACTS.find(x=>x.id===(v&&v.cid));return(isMindArchived(c,v)?'Archive · ':'')+baseConvTitleMind(v);
  };
  const baseConvPreviewMind=convPreview;
  convPreview=function(v){
    const c=CONTACTS.find(x=>x.id===(v&&v.cid));return(isMindArchived(c,v)?'Lecture seule · ':'')+baseConvPreviewMind(v);
  };
  const baseDeckBarMind=deckBar;
  deckBar=function(){
    const c=cur?CONTACTS.find(x=>x.id===cur.cid):null;
    if(cur&&isMindArchived(c,cur)){
      deckEl.innerHTML='';deckEl.classList.remove('min');deckMin=false;
      const n=document.createElement('div');n.className='note v2-archive-note';
      n.textContent='Archive d’avant réinitialisation. Tu peux relire ce fil, mais '+characterName(c)+' n’y a plus accès et on ne peut plus écrire dedans.';
      const b=document.createElement('button');b.className='opt free';b.textContent='Nouvelle conversation';
      b.onclick=()=>startConv();deckEl.append(n,b);return;
    }
    return baseDeckBarMind();
  };

  async function resetMind(c){
    if(!c)return;
    if(CALL&&CALL.on)await endCall(false);
    const ts=nowTs(),ids=new Set(Array.isArray(c.mindArchives)?c.mindArchives:[]);
    CONVS.filter(v=>v.cid===c.id&&!v.mindArchived).forEach(v=>{
      ids.add(v.id);v.mindArchived=true;v.wait=null;v.pending=null;v.unread=false;v.failed=false;
    });
    c.mindArchives=[...ids];c.mindResetAt=ts;
    c.jrn=jrn(c).filter(e=>e.ty==='socle').map(e=>Object.assign(e,{owner:'foundation',kind:'durable',active:true,replacedBy:'',expiresAt:0}));
    c.episodes=[];
    c.aff=[];c.timeline=[];c.life={};c.lifeTrail=[];c.presence={};c.emotion={};c.threads='';c.silence=null;c.memMsg='';
    c.lastAuto=0;c.next=0;c.push=null;c.count={day:todayKey()};
    c.temp='calme';c.fond={fam:'calme',lvl:2};c.fv={v:famOf('calme')[3],e:famOf('calme')[4]};
    (c.gal||[]).forEach(g=>{g.used=0;g.last=0});
    delete c.mem;delete c.userfile;delete c.pins;delete c.drift;delete c.driftLog;
    await saveContacts();await saveConvs();await Store.set('v7.dernier-fil','');
    curCt=c.id;cur=null;
    await startConv();
    flash(q('#memMsg'),'Esprit réinitialisé. Les anciens fils sont devenus des archives en lecture seule.','var(--teal)',18000);
  }
  function injectMindReset(){
    const B=q('#memBody'),c=C();if(!B||!c||q('#v2MindReset'))return;
    const sec=document.createElement('div');sec.id='v2MindReset';sec.className='v2-resetbox';
    const h=document.createElement('div');h.className='sect';h.textContent='Réinitialiser l’esprit';
    const n=document.createElement('div');n.className='note';
    n.textContent='Conserve identité, personnalité, socle, avatars, galerie, jouets et réglages. Efface souvenirs appris, goûts, chronologie, activité et humeur acquise. Les anciennes conversations restent consultables mais deviennent invisibles pour '+characterName(c)+'.';
    const b=document.createElement('button');b.className='mini v2-danger';b.textContent='Réinitialiser l’esprit de '+(characterName(c));
    b.onclick=()=>askConfirm('Réinitialiser l’esprit de '+(characterName(c))+' ?',
      'Ses apprentissages seront effacés et tous les fils actuels deviendront des archives en lecture seule. Son identité, sa personnalité et ses médias seront conservés.',
      'Continuer',()=>askConfirm('Dernière confirmation',
        'Cette opération vide réellement sa tête acquise. Les conversations ne sont pas supprimées, mais '+characterName(c)+' ne pourra plus les relire ni en tirer de nouveaux souvenirs.',
        'RÉINITIALISER',()=>resetMind(c)));
    sec.append(h,n,b);B.appendChild(sec);
  }
  const baseBuildMemMind=buildMem;
  buildMem=function(){baseBuildMemMind();injectMindReset()};

  /* ---------- fin d'appel intelligente ---------- */
  async function summarizeCall(c,conv){
    if(!c||!conv)return;const d=Math.max(0,nowTs()-(conv.created||nowTs()));
    conv.callSummary='Appel de '+durLabel(d);timelineAdd(c,'call',conv.callSummary,'Transcription conservée brute dans le fil. Aucun résumé mémoire automatique.',conv.created||nowTs(),{conv:conv.id,duration:d,source:'raw'});
    await saveContacts();await saveConvs();
  }
  const baseEndCall=endCall;
  endCall=async function(user){const conv=CALL&&CALL.conv,c=CALL&&CALL.ct;await baseEndCall(user);if(conv&&c)setTimeout(()=>summarizeCall(c,conv),250)};

  /* ---------- appel 2.0 : durée, VU, interruption, mains libres, route ---------- */
  let callStartedAt=0,callTimer=null,hfTimer=null,voiceExtraWired=false;
  function audioRoutePlugin(){
    const C=window.Capacitor;if(!C)return null;if(C.Plugins&&C.Plugins.AudioRoute)return C.Plugins.AudioRoute;
    if(C.registerPlugin){try{return C.registerPlugin('AudioRoute')}catch(e){}}return null;
  }
  async function refreshRoutes(){
    const sel=q('#v2CallRoute');if(!sel)return;const P=audioRoutePlugin();let list=[];
    try{const r=P&&P.listRoutes?await P.listRoutes():null;list=(r&&r.routes)||[]}catch(e){}
    const fallback=[{id:'speaker',label:'Haut-parleur',kind:'speaker'},{id:'earpiece',label:'Écouteur',kind:'earpiece'}];if(!list.length)list=fallback;
    sel.innerHTML='';list.forEach(x=>{const o=document.createElement('option');o.value=x.kind||x.id;o.textContent=x.label||x.kind||x.id;if((x.kind||x.id)===V2.cfg.route)o.selected=true;sel.appendChild(o)});
  }
  async function setRoute(v){V2.cfg.route=v||'speaker';await saveCfg();const P=audioRoutePlugin();try{if(P&&P.setRoute)await P.setRoute({route:V2.cfg.route})}catch(e){trace('audio.route.error',{route:v,error:String((e&&e.message)||e)})}}
  function callUiTick(){
    const tm=q('#v2CallTimer');if(tm)tm.textContent=CALL.on&&callStartedAt?durClock(Date.now()-callStartedAt):'00:00';const vu=q('#v2VuBar');if(vu)vu.style.width=Math.round(clamp((V2.callRms+3)*6,0,100))+'%';
  }
  function durClock(ms){const s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
  function injectCallTools(){
    const box=q('#homeActions');if(!box||q('#v2CallTools'))return;const d=document.createElement('div');d.id='v2CallTools';d.className='v2-calltools';d.innerHTML='<span class="v2-calltimer" id="v2CallTimer">00:00</span><span class="v2-vu"><b id="v2VuBar"></b></span><button id="v2CallMute">Son</button><select class="v2-route" id="v2CallRoute"></select>';box.insertBefore(d,q('#homeMic'));
    q('#v2CallMute').onclick=()=>{V2.audioMuted=!V2.audioMuted;q('#v2CallMute').classList.toggle('on',V2.audioMuted);q('#v2CallMute').textContent=V2.audioMuted?'Muet':'Son';if(V2.audioMuted)vStop()};
    q('#v2CallRoute').onchange=e=>setRoute(e.target.value);refreshRoutes();
  }
  const baseStartCall=startCall;
  startCall=async function(){const before=CALL.on;await baseStartCall();if(!before&&CALL.on){callStartedAt=nowTs();V2.callPhase='thinking';setRoute(V2.cfg.route);clearInterval(callTimer);callTimer=setInterval(callUiTick,250);callUiTick();refreshRoutes()}};
  const baseCallSpeak=callSpeak;
  callSpeak=async function(lines,session){V2.callPhase='speaking';callRenderHome();if(!V2.audioMuted)await baseCallSpeak(lines,session);V2.callPhase='idle';if(CALL.on&&CALL.session===session&&V2.cfg.handsFree)setTimeout(()=>handsFreeListen(),450)};
  const baseCallAi=callAi;
  callAi=async function(text,opening){V2.callPhase='thinking';const r=await baseCallAi(text,opening);if(CALL.on&&V2.callPhase!=='speaking')V2.callPhase='idle';return r};
  const baseCallMicDown=callMicDown;
  callMicDown=async function(e){
    if(CALL.on&&CALL.busy&&V2.callPhase==='speaking'){vStop();VQ=[];CALL.busy=false;V2.callPhase='idle';CALL.status='Interrompue';callRenderHome()}
    if(CALL.on&&CALL.busy&&V2.callPhase==='thinking')return;
    return baseCallMicDown(e);
  };
  async function handsFreeListen(){
    if(!CALL.on||CALL.busy||CALL.listening||!V2.cfg.handsFree)return;const P=voiceCapturePlugin();if(!P)return;const id=uid();CALL.capture={id,partial:'',final:'',released:true,sent:false,auto:true};CALL.listening=true;CALL.status='Mains libres — parle';CALL.last='';callRenderHome();
    try{await P.startListening({language:'fr-FR'});clearTimeout(hfTimer);hfTimer=setTimeout(async()=>{if(CALL.capture&&CALL.capture.id===id&&!CALL.capture.sent){try{await P.stopListening()}catch(e){}setTimeout(()=>callSubmitCapture(id),400)}},12000)}catch(e){CALL.listening=false;CALL.status='Micro — '+String((e&&e.message)||e);callRenderHome()}
  }
  const baseWire=callWireVoice;
  callWireVoice=async function(){const ok=await baseWire();if(ok&&!voiceExtraWired){const P=voiceCapturePlugin();if(P&&P.addListener){await P.addListener('level',ev=>{V2.callRms=Number(ev&&ev.rms)||0;V2.trace.lastMic={ts:Date.now(),rms:V2.callRms,listening:!!CALL.listening};callUiTick()});voiceExtraWired=true}}return ok};
  const baseEndCall2=endCall;
  endCall=async function(user){clearInterval(callTimer);callTimer=null;clearTimeout(hfTimer);hfTimer=null;V2.callRms=0;V2.callPhase='idle';const P=audioRoutePlugin();try{if(P&&P.resetRoute)await P.resetRoute()}catch(e){}return baseEndCall2(user)};

  /* ---------- sécurité / biométrie ---------- */
  async function bioStatus(){const P=secureNative();if(!P||!P.biometricStatus)return{available:false};try{return await P.biometricStatus()}catch(e){return{available:false,error:String((e&&e.message)||e)}}}
  async function bioUnlock(){const P=secureNative();if(!P||!P.authenticate)return false;try{const r=await P.authenticate({title:'Déverrouiller Holophone',subtitle:'Confirme ton identité'});if(r&&r.success){pinBuf='';padDots();if(window.holoUnlockAfterAuth)await window.holoUnlockAfterAuth();else if(bootReady)q('#lock').classList.remove('on');else{unlockPending=true;q('#lockMsg').textContent='Ouverture…'}return true}}catch(e){}return false}
  function injectSecurityUi(){
    const cfg=q('#screenLock .cfg'),row=q('#screenLock .rowb');if(cfg&&row&&!q('#lkBio')){const b=document.createElement('button');b.className='chk';b.id='lkBio';b.innerHTML='<span class="bx">✓</span><span class="lb2"><b>Biométrie</b><i>empreinte / visage, si disponible sur le téléphone</i></span>';cfg.insertBefore(b,row);b.onclick=async()=>{if(!PIN.on){flash(q('#lkMsg'),'Définis d’abord un code PIN.','var(--magenta)',12000);return}const s=await bioStatus();if(!s.available){flash(q('#lkMsg'),'Biométrie indisponible sur ce téléphone.','var(--magenta)',12000);return}V2.cfg.biometric=!V2.cfg.biometric;await saveCfg();b.classList.toggle('on',V2.cfg.biometric);flash(q('#lkMsg'),V2.cfg.biometric?'Biométrie activée.':'Biométrie désactivée.','var(--teal)',10000)}}
    const lock=q('#lock');if(lock&&!q('#lockBioBtn')){const b=document.createElement('button');b.id='lockBioBtn';b.className='v2-lockbio hide';b.textContent='Déverrouiller par biométrie';b.onclick=()=>bioUnlock();lock.appendChild(b)}
  }
  const baseLockNow=lockNow;
  lockNow=function(){baseLockNow();const b=q('#lockBioBtn');if(b){b.classList.toggle('hide',!(V2.cfg.biometric&&PIN.on));if(V2.cfg.biometric&&PIN.on)setTimeout(()=>bioUnlock(),220)}};

  /* ---------- snapshots automatiques ---------- */
  function snapshotContacts(){return CONTACTS.map(c=>{const x=copy(c);(x.av||[]).forEach(a=>{if(a.fid)delete a.src});(x.gal||[]).forEach(g=>{if(g.fid)delete g.src});(x.toys||[]).forEach(t=>{if(t.fid)delete t.src});return x})}
  function snapshotData(){return{app:'holophone-auto-snapshot',v:4,schemaVersion:3200,appVersion:APPV,date:new Date().toISOString(),rev:REV,contacts:snapshotContacts(),convs:copy(CONVS),auto:copy(AUTO),gen:copy(GEN),user:copy(USER),theme:copy(THEME),actions:copy(ACTCFG),braindance:copy(BDCFG),startup:copy(STARTCFG),audioLibrary:copy(AUDIOCFG),v2:copy(V2.cfg),api:{prov:API.prov,model:API.model,base:API.base,think:API.think,safe:API.safe},voice:{...copy(VOICE),key:''},search:{...copy(SEARCH),key:''},spot:{id:SPOT.id,dev:SPOT.dev,auto:SPOT.auto}}}
  async function fsRead(path){const F=CAP().Filesystem;if(!F||!F.readFile)return null;try{const r=await F.readFile({path,directory:'DATA',encoding:'utf8'});return r&&r.data?String(r.data):null}catch(e){return null}}
  async function fsWrite(path,data){const F=CAP().Filesystem;if(!F||!F.writeFile)throw new Error('Filesystem indisponible');return F.writeFile({path,data,directory:'DATA',encoding:'utf8',recursive:true})}
  async function autoBackup(force){if(!isNative()||!V2.cfg.autoBackup)return false;const now=Date.now();if(!force&&V2.lastAutoBackup&&now-V2.lastAutoBackup<6*3600000&&REV<=V2.lastAutoBackup)return false;
    const p0='Holophone/AutoBackups/snapshot-0.json',p1='Holophone/AutoBackups/snapshot-1.json',p2='Holophone/AutoBackups/snapshot-2.json';try{const a1=await fsRead(p1),a0=await fsRead(p0);if(a1)await fsWrite(p2,a1);if(a0)await fsWrite(p1,a0);await fsWrite(p0,JSON.stringify(snapshotData()));V2.lastAutoBackup=now;await Store.set('v2.backupLast',String(now));trace('backup.ok',{ts:now});return true}catch(e){trace('backup.error',{error:String((e&&e.message)||e)});return false}}
  async function restoreSnapshot(){
    const txt=await fsRead('Holophone/AutoBackups/snapshot-0.json');
    if(!txt)throw new Error('aucun snapshot disponible');
    const o=JSON.parse(txt);
    if(!o||o.app!=='holophone-auto-snapshot')throw new Error('snapshot invalide');
    if(Number(o.schemaVersion||0)>3200)throw new Error('snapshot créé par un schéma Holophone plus récent');
    CONTACTS=o.contacts||[];CONVS=o.convs||[];
    if(o.auto)Object.assign(AUTO,o.auto);if(o.gen)Object.assign(GEN,o.gen);if(o.user)Object.assign(USER,o.user);if(o.theme)Object.assign(THEME,o.theme);
    if(o.actions){ACTCFG=o.actions;normalizeActions()}
    if(o.braindance){Object.assign(BDCFG,o.braindance);bdNormalizeCfg()}
    if(o.startup)Object.assign(STARTCFG,o.startup);if(o.audioLibrary)Object.assign(AUDIOCFG,o.audioLibrary);
    if(o.v2)Object.assign(V2.cfg,o.v2);
    if(o.api){API.prov=o.api.prov||API.prov;API.model=o.api.model||API.model;API.base=o.api.base||API.base;API.think=o.api.think||API.think;API.safe=o.api.safe}
    if(o.voice){const key=VOICE.key;Object.assign(VOICE,o.voice);VOICE.key=key}
    if(o.search){const key=SEARCH.key;Object.assign(SEARCH,o.search);SEARCH.key=key}
    if(o.spot){const tok=SPOT.tok,ref=SPOT.ref,exp=SPOT.exp,ver=SPOT.ver;Object.assign(SPOT,o.spot);SPOT.tok=tok;SPOT.ref=ref;SPOT.exp=exp;SPOT.ver=ver}
    audioNormalize();
    await saveContacts();await saveConvs();await saveAuto();await saveGen();await saveUser();await saveTheme();await saveActions();await saveBDCfg();await saveStartup();await saveAudioLibrary();await saveVoice();await saveSearch();await saveSpot();await saveCfg();
    location.reload();
  }

  /* ---------- Sous le capot 2.0 ---------- */
  function injectHood(){
    const cfg=q('#screenHood .cfg'),summary=q('#hoodSummary');if(!cfg||!summary||q('#v2Hood'))return;const box=document.createElement('div');box.id='v2Hood';box.innerHTML='<div class="sect">Tests directs</div><div class="v2-testgrid"><button class="mini g" id="v2TestAI">Tester IA</button><button class="mini g" id="v2TestVoice">Tester voix</button><button class="mini g" id="v2TestMic">Tester micro</button><button class="mini g" id="v2TestSpotify">Tester Spotify</button></div><div class="sect">Snapshots automatiques</div><div class="note" id="v2BackupState">—</div><div class="v2-snaprow"><button class="mini g" id="v2BackupNow">Créer maintenant</button><button class="mini att" id="v2BackupRestore">Restaurer le dernier</button></div><div class="sect">Télémétrie 2.0</div><div id="v2Trace"></div><div class="sect">Chronologie récente</div><div class="v2-timeline" id="v2Timeline"></div>';summary.parentNode.insertBefore(box,summary.nextSibling);
    q('#v2TestAI').onclick=async()=>{flash(q('#hoodMsg'),'Test IA…','var(--teal)',30000);const oldCtx=V2.interactionContext;try{if(API.prov==='google')V2.interactionContext={conv:{id:'diag',cid:(C()&&C().id)||'',ai:[{role:'user',content:'Réponds uniquement par le mot OK.'}],msgs:[]},kind:'diagnostic'};const r=await callModel('Réponds uniquement par le mot OK.',[{role:'user',content:'Réponds uniquement par le mot OK.'}],null,null,undefined,{think:0,json:false});flash(q('#hoodMsg'),'IA OK · '+String(r).slice(0,60),'var(--teal)',16000)}catch(e){flash(q('#hoodMsg'),'IA KO · '+e.message,'var(--magenta)',30000)}finally{V2.interactionContext=oldCtx}};
    q('#v2TestVoice').onclick=async()=>{flash(q('#hoodMsg'),'Test voix…','var(--teal)',30000);try{if(VOICE.mode&&VOICE.mode!=='system'&&VOICE.key)await speakOnline('Test vocal Holophone deux point zéro.');else speakSystem('Test vocal Holophone deux point zéro.');flash(q('#hoodMsg'),'Voix déclenchée.','var(--teal)',12000)}catch(e){flash(q('#hoodMsg'),'Voix KO · '+e.message,'var(--magenta)',30000)}};
    q('#v2TestMic').onclick=async()=>{const P=voiceCapturePlugin();if(!P){flash(q('#hoodMsg'),'Micro KO · plugin absent','var(--magenta)',20000);return}try{const a=await P.ensurePermission();if(!a.granted)throw new Error('permission refusée');flash(q('#hoodMsg'),'Parle pendant 4 secondes…','var(--teal)',10000);let text='';const h=await P.addListener('partial',e=>{if(e&&e.text)text=e.text});await P.startListening({language:'fr-FR'});setTimeout(async()=>{try{await P.stopListening()}catch(e){}try{h.remove&&h.remove()}catch(e){}flash(q('#hoodMsg'),'Micro OK'+(text?' · « '+text.slice(0,90)+' »':''),'var(--teal)',16000)},4000)}catch(e){flash(q('#hoodMsg'),'Micro KO · '+e.message,'var(--magenta)',30000)}};
    q('#v2TestSpotify').onclick=async()=>{flash(q('#hoodMsg'),'Test Spotify…','var(--teal)',30000);try{const d=await spDevices();flash(q('#hoodMsg'),'Spotify OK · '+d.length+' appareil(s)','var(--teal)',16000)}catch(e){flash(q('#hoodMsg'),'Spotify KO · '+e.message,'var(--magenta)',30000)}};
    q('#v2BackupNow').onclick=async()=>{flash(q('#hoodMsg'),'Snapshot…','var(--teal)',30000);const ok=await autoBackup(true);flash(q('#hoodMsg'),ok?'Snapshot créé.':'Snapshot impossible. ',ok?'var(--teal)':'var(--magenta)',16000);renderHood2()};
    q('#v2BackupRestore').onclick=()=>askConfirm('Restaurer le dernier snapshot ?','Contacts, conversations et réglages non secrets reviendront à l’état du dernier snapshot. Les clés restent inchangées.','Restaurer',async()=>{try{await restoreSnapshot()}catch(e){flash(q('#hoodMsg'),'Restauration impossible · '+e.message,'var(--magenta)',30000)}});
  }
  function renderHood2(){
    const t=q('#v2Trace'),tl=q('#v2Timeline'),bs=q('#v2BackupState');if(!t)return;const r=V2.trace.lastRequest,e=V2.trace.lastError;
    const rows=[['Dernier appel IA',r?r.provider+' / '+r.model:'—'],['Forme input Interactions',V2.trace.lastAttempt&&V2.trace.lastAttempt.inputShape?V2.trace.lastAttempt.inputShape.kind:'—'],['API Gemini',r&&r.provider==='google'?(r.api||'—'):'—'],['État serveur',r&&r.serverState?(r.previousInteractionId?'reprise du fil':'nouveau fil'):'non'],['Interaction',r&&r.newInteractionId?String(r.newInteractionId).slice(0,28)+'…':'—'],['Âge du dernier ID',cur&&cur.geminiUpdatedAt?durLabel(Date.now()-cur.geminiUpdatedAt):'—'],['Rétention miroir',String(V2.cfg.interactionRetentionDays||55)+' j'],['Rotation contexte',V2.cfg.interactionRotateTokens?Number(V2.cfg.interactionRotateTokens).toLocaleString('fr-FR')+' tokens':'désactivée'],['TTL images IA',V2.cfg.imageContextTtlHours?V2.cfg.imageContextTtlHours+' h':'désactivé'],['Plus vieille image IA',cur&&cur.geminiImageContextOldestTs?durLabel(Date.now()-cur.geminiImageContextOldestTs):'—'],['Images dans chaîne',cur?String(Number(cur.geminiImageContextCount)||0):'—'],['Dernier contexte serveur',cur&&cur.geminiLastInputTokens?Number(cur.geminiLastInputTokens).toLocaleString('fr-FR')+' tokens':'—'],['Rotations de ce fil',cur?String(Number(cur.geminiRotationCount)||0):'—'],['Mémoire longue',C()?episodes(C()).length+' épisode(s)':'—'],['Contexte système',r?r.systemChars+' car.':'—'],['Entrée du tour',r?r.inputChars+' car.':'—'],['Historique renvoyé',r?r.historyChars+' car. / '+(r.history||[]).length+' tours':'—'],['Entrée estimée',r?'≈ '+r.estimatedInputTokens+' tokens':'—'],['Latence IA',V2.trace.lastLatency?V2.trace.lastLatency+' ms':'—'],['Dernière erreur',e?e.stage+' · '+e.message:'aucune'],['TTS',V2.trace.lastTts?(V2.trace.lastTts.ok?'OK':'KO')+' · '+V2.trace.lastTts.mode:'—'],['Spotify',V2.trace.lastSpotify?(V2.trace.lastSpotify.ok?'OK':'KO'):'—'],['Image',V2.trace.lastImageGen?(V2.trace.lastImageGen.ok?'OK':'KO'):'—'],['Micro',V2.trace.lastMic?(V2.trace.lastMic.listening?'écoute':'repos'):'—'],['Sécurité',secureNative()?'Android Keystore actif':'fallback web']];
    t.innerHTML='';rows.forEach(x=>{const d=document.createElement('div');d.className='v2-kv';const b=document.createElement('b');b.textContent=x[0];const s=document.createElement('span');s.textContent=x[1];d.append(b,s);t.appendChild(d)});
    if(r){t.append(hoodDetails('Dernier prompt système réellement envoyé',r.system));t.append(hoodDetails('Dernier historique envoyé',r.history));}
    if(V2.trace.lastRaw)t.append(hoodDetails('Dernière réponse brute',V2.trace.lastRaw));if(V2.trace.lastParsed)t.append(hoodDetails('Dernière réponse interprétée',V2.trace.lastParsed));
    const c=C();if(tl&&c){tl.innerHTML='';timeline(c).slice(-12).reverse().forEach(x=>{const d=document.createElement('div');d.className='v2-timeitem';const b=document.createElement('b');b.textContent=dayLabel(x.ts)+' '+hhmm(x.ts)+' · '+x.title;const i=document.createElement('i');i.textContent=x.detail||x.type;d.append(b,i);tl.appendChild(d)})}
    if(bs)bs.textContent=V2.lastAutoBackup?'Dernier snapshot : '+new Date(V2.lastAutoBackup).toLocaleString('fr-FR'):'Aucun snapshot créé dans cette session.';
  }
  const baseBuildHood=buildHood;
  buildHood=async function(){await baseBuildHood();injectHood();renderHood2()};

  /* ---------- diagnostic enrichi ---------- */
  const baseMakeDiagnostic=makeDiagnostic;
  makeDiagnostic=async function(){const d=await baseMakeDiagnostic();d.v2={config:{...V2.cfg},trace:copy(V2.trace),interactions:copy(V2.interactionStats),conversationStates:CONVS.filter(v=>v&&v.geminiInteractionId).map(v=>({id:v.id,cid:v.cid,interactionId:v.geminiInteractionId,model:v.geminiModel||'',updatedAt:v.geminiUpdatedAt||0,ageMs:v.geminiUpdatedAt?Date.now()-v.geminiUpdatedAt:0,turns:(v.geminiTurns||[]).length,lastInputTokens:Number(v.geminiLastInputTokens)||0,rotationCount:Number(v.geminiRotationCount)||0,lastRotation:v.geminiLastRotation||null,imageContextOldestTs:Number(v.geminiImageContextOldestTs)||0,imageContextAgeMs:v.geminiImageContextOldestTs?Date.now()-Number(v.geminiImageContextOldestTs):0,imageContextCount:Number(v.geminiImageContextCount)||0})),longMemory:{mode:'local-source-only',segmentation:'anchor-windows-v2',maxSourcesPerEpisode:EP_MAX_SOURCES,backgroundAiCalls:0,recovery:copy(V2.episodeRecovery),contacts:CONTACTS.map(c=>({id:c.id,count:episodes(c).length,episodes:episodes(c).map(ep=>({id:ep.id,convId:ep.convId,fromTs:ep.fromTs,toTs:ep.toTs,importance:ep.importance,tags:ep.tags,origin:ep.origin,sourceCount:(ep.sources||[]).length}))}))},spotifyFeatures:{playlistAuthRev:Number(SPOT.authRev)||0,coop:SPOT.coop?{id:SPOT.coop.id||'',name:SPOT.coop.name||'',collaborative:!!SPOT.coop.collaborative}:null},braindance:{engine:'dedicated-generateContent',api:'v1beta',thinking:'high',safety:'BLOCK_NONE-adjustable',chatBridge:'neutral-only',rawBlocksInChat:false,blocks:Number(BDCFG.blocks)||5,maxOutputTokens:Number(BDCFG.maxOutputTokens)||16384,modelPriority:['gemini-3.1-pro-preview','gemini-3.8-flash','gemini-3.5-flash'],instructionsChars:String(BDCFG.instructions||'').length,listCounts:{focus:(BDCFG.focus||[]).length,zones:(BDCFG.zones||[]).length,dynamics:(BDCFG.dynamics||[]).length,words:(BDCFG.words||[]).length},replays:(BDCFG.replays||[]).map(r=>({id:r.id,title:r.title,rating:r.rating,ts:r.ts,contactId:r.contactId,blockCount:r.blockCount,model:r.model||'',audioCachedBlocks:Number(r.audioCachedBlocks)||0,audioBytes:Number(r.audioBytes)||0,audioVoice:r.audioVoice||''})),last:window.__lastBraindance?copy(window.__lastBraindance):null},actions:{categories:(ACTCFG.categories||[]).length,count:allActions().length,actorName:ACTCFG.userActorName||'',replyPolicy:'no-identical-mirror · reply cooldown 90s · spontaneous cooldown 5min + 2 user turns'},reactionPolicy:'no-identical-standalone-echo',spotifyReplyPolicy:'no-echo-of-user-shared-track-or-playlist',refuge:(()=>{const c=C(),r=c&&ensureRefuge(c);return r?{name:r.name,rooms:r.rooms.length,currentRoom:(refugeCurrentRoom(c)||{}).name||'',autoEvents:!!r.autoEvents,eventCount:(r.events||[]).length,proposals:{pending:r.proposals.filter(p=>p.status==='pending').length,pendingFromV:r.proposals.filter(p=>p.status==='pending'&&p.by!=='character').length,pendingFromCharacter:r.proposals.filter(p=>p.status==='pending'&&p.by==='character').length,accepted:r.proposals.filter(p=>p.status==='accepted').length,rejected:r.proposals.filter(p=>p.status==='rejected').length,ideaDue:!!r.ideaDue,lastCharacterProposalTs:Number(r.lastCharacterProposalTs)||0,recent:r.proposals.slice(-8).map(p=>({id:p.id,by:p.by,status:p.status,kind:p.kind,summary:p.summary}))}}:null})(),security:{keystore:!!secureNative(),secretKeys:[...SECURE_KEYS]},autoBackup:{last:V2.lastAutoBackup},call:{phase:V2.callPhase,rms:V2.callRms,muted:V2.audioMuted},timeline:CONTACTS.map(c=>({id:c.id,items:timeline(c)})),activity:CONTACTS.map(c=>({id:c.id,life:copy(c.life||null),trail:copy(lifeRecent(c,24))})),presence:CONTACTS.map(c=>({id:c.id,state:copy(presenceUpdate(c,false,null)),emotion:copy(emotionSync(c,null)),decision:copy(presence(c).lastDecision||null)}))};return d};

  /* ---------- UI config voix / verrou ---------- */
  function injectVoiceUi(){const cfg=q('#screenVoice .cfg');if(!cfg||q('#v2Hands'))return;const sec=document.createElement('div');sec.innerHTML='<div class="sect">Appels</div><button class="chk" id="v2Hands"><span class="bx">✓</span><span class="lb2"><b>Mains libres expérimental</b><i>Après chaque réponse, Holophone réouvre automatiquement le micro. Le push-to-talk reste disponible.</i></span></button><div class="sect">Sortie audio des appels</div><select id="v2Route"><option value="speaker">Haut-parleur</option><option value="earpiece">Écouteur</option><option value="bluetooth">Bluetooth</option><option value="wired">Casque filaire / USB</option></select><div class="v2-callmode-note">Le routage est appliqué au mieux par Android ; les appareils réellement disponibles apparaissent pendant l’appel.</div>';cfg.appendChild(sec);
    q('#v2Hands').onclick=async()=>{V2.cfg.handsFree=!V2.cfg.handsFree;q('#v2Hands').classList.toggle('on',V2.cfg.handsFree);await saveCfg()};q('#v2Route').onchange=async e=>{V2.cfg.route=e.target.value;await saveCfg()};
  }
  function paintCfg(){const b=q('#lkBio');if(b)b.classList.toggle('on',V2.cfg.biometric);const h=q('#v2Hands');if(h)h.classList.toggle('on',V2.cfg.handsFree);const r=q('#v2Route');if(r)r.value=V2.cfg.route||'speaker';const lb=q('#lockBioBtn');if(lb)lb.classList.toggle('hide',!(V2.cfg.biometric&&PIN.on))}

  /* ---------- migration données ---------- */
  async function migrateData(){
    if(!CONTACTS||!CONTACTS.length)return;V2.migrating=true;let changed=false;
    for(const c of CONTACTS){
      c.timeline=Array.isArray(c.timeline)?c.timeline:[];c.life=c.life||{};c.episodes=Array.isArray(c.episodes)?c.episodes:[];
      if(!c.presence||Number(c.presence.version)!==PRESENCE_VERSION)changed=true;presence(c);
      if(!c.emotion||Number(c.emotion.version)!==EMOTION_VERSION)changed=true;emotion(c,null);
      if(!Array.isArray(c.lifeTrail)){c.lifeTrail=[];changed=true}
      (c.jrn||[]).forEach(e=>{const m=memoryMeta(e.ty,e);['owner','kind','expiresAt','source','confidence','importance','confirmedAt','replaces','replacedBy','active'].forEach(k=>{if(e[k]===undefined){e[k]=m[k];changed=true}})});
      (c.aff||[]).forEach(e=>{if(e.strength===undefined){e.strength=e.st==='ok'?4:2;changed=true}if(e.confidence===undefined){e.confidence=e.st==='ok'?.9:.62;changed=true}if(!e.source){e.source=e.st==='ok'?'explicit':'inference';changed=true}if(!e.firstSeen){e.firstSeen=e.ts||nowTs();changed=true}if(e.lastConfirmed===undefined){e.lastConfirmed=e.st==='ok'?(e.ts||nowTs()):0;changed=true}if(!e.why)e.why=e.w||''});
      (c.gal||[]).forEach(g=>{const before=JSON.stringify([g.context,g.people,g.place,g.privacy,g.firstSeen]);galMeta(g);if(before!==JSON.stringify([g.context,g.people,g.place,g.privacy,g.firstSeen]))changed=true});
      if(!c.timeline.length){
        CONVS.filter(v=>v.cid===c.id&&v.type==='call'&&!v.mindArchived).slice(-20).forEach(v=>timelineAdd(c,'call',convTitle(v),v.callSummary||'',v.created||nowTs(),{conv:v.id}));
      }
      updateActivity(c,false);
    }
    V2.migrating=false;if(changed)await saveContacts();
  }


  /* ---------- Interactions 2.1 : branchement des conversations ---------- */
  harvest=async function(c,conv,force){
    if(c)c.memMsg='Mémoire automatique désactivée : Holophone conserve désormais les sources brutes et laisse Gemini Interactions porter le fil.';
    return{ok:true,added:0,disabled:true};
  };
  maybeMemory=async function(){return{ok:true,added:0,disabled:true}};

  /* Les bascules d’humeur ne deviennent plus des souvenirs automatiques. */
  const sourceJrnAdd=jrnAdd;
  jrnAdd=function(c,ty,t,extra){
    if(ty==='secousse'&&extra&&(extra.from!==undefined||extra.to!==undefined))return null;
    return sourceJrnAdd(c,ty,t,extra);
  };

  function rewindInteraction(conv){
    if(!conv)return false;const turns=Array.isArray(conv.geminiTurns)?conv.geminiTurns:[];const t=turns.pop();if(!t)return false;
    conv.geminiInteractionId=t.previous||'';conv.geminiAiCursor=Math.max(0,Number(t.cursorBefore)||0);conv.geminiTurns=turns;conv.geminiUpdatedAt=Date.now();return true;
  }
  const baseAiTurnInteractions=aiTurn;
  aiTurn=async function(){
    const old=V2.interactionContext,cconv=cur;V2.interactionContext=cconv?{conv:cconv,kind:'chat'}:null;
    try{
      const r=await baseAiTurnInteractions();
      if(cconv){const c=CONTACTS.find(x=>x.id===cconv.cid);if(c){epSchedule(c,cconv);presenceUpdate(c,true,cconv);await saveContacts()}}
      return r;
    }finally{V2.interactionContext=old}
  };
  const baseCallAiInteractions=callAi;
  callAi=async function(text,opening){
    const old=V2.interactionContext,cconv=CALL&&CALL.conv;V2.interactionContext=cconv?{conv:cconv,kind:'call'}:null;
    try{
      const r=await baseCallAiInteractions(text,opening);
      if(cconv){const c=CONTACTS.find(x=>x.id===cconv.cid);if(c){epSchedule(c,cconv);presenceUpdate(c,true,cconv);await saveContacts()}}
      return r;
    }finally{V2.interactionContext=old}
  };
  const baseRegenerateInteractions=regenerate;
  regenerate=async function(){if(cur)rewindInteraction(cur);return await baseRegenerateInteractions()};
  const baseUndoInteractions=undoExchange;
  undoExchange=async function(){const cconv=cur;if(cconv)rewindInteraction(cconv);const r=await baseUndoInteractions();if(cconv)cconv.geminiAiCursor=Math.min(Number(cconv.geminiAiCursor)||0,(cconv.ai||[]).length);await saveConvs();return r};

  function injectMemorySourceUi(){
    const B=q('#memBody'),c=C();if(!B||!c||q('#v22MemorySource'))return;
    const box=document.createElement('div');box.id='v22MemorySource';box.className='v2-sourcebox';
    const h=document.createElement('div');h.className='sect';h.textContent='Mémoire 2.2 · épisodes sourcés';
    const n=document.createElement('div');n.className='note';
    n.textContent='Holophone repère localement des passages distincts et conserve les messages originaux exacts. Aucun appel IA, aucun résumé automatique ; chaque épisode reste volontairement court.';
    const stat=document.createElement('div');stat.className='v2-epstat';
    stat.textContent=episodes(c).length+' épisode(s) à long terme';
    const latest=episodes(c).slice().sort((a,b)=>(b.toTs||0)-(a.toTs||0)).slice(0,5);
    latest.forEach(ep=>{
      const d=document.createElement('div');d.className='v2-episode';
      const b=document.createElement('b');b.textContent=dayLabel(ep.fromTs)+' · importance '+ep.importance+'/5';
      const i=document.createElement('i');i.textContent=(ep.tags||[]).join(' · ')||'sans tag';
      const src=document.createElement('span');src.className='v2-epsource';
      const s0=(ep.sources||[]).find(s=>s&&s.t)||null;
      src.textContent=s0?((s0.w==='character'?(characterName(c)):uName(c))+' : « '+clipText(s0.t,120)+' »'):'';
      d.append(b,i,src);box.appendChild(d);
    });
    const rh=document.createElement('div');rh.className='sect';rh.textContent='Rétention Gemini Interactions';
    const rn=document.createElement('div');rn.className='note';
    rn.textContent='Ce réglage est un miroir local : il ne modifie pas Google. Mets la même durée que dans AI Studio. Holophone l’utilise seulement pour anticiper une Interaction restée inactive trop longtemps.';
    const sel=document.createElement('select');sel.id='v22Retention';
    [1,7,14,28,55].forEach(x=>{const o=document.createElement('option');o.value=String(x);o.textContent=x+' jour'+(x>1?'s':'');if(Number(V2.cfg.interactionRetentionDays)===x)o.selected=true;sel.appendChild(o)});
    sel.onchange=async()=>{V2.cfg.interactionRetentionDays=Number(sel.value)||55;await saveCfg();toastInfo('Rétention','Holophone anticipera sur '+V2.cfg.interactionRetentionDays+' jour(s).')};

    const rotH=document.createElement('div');rotH.className='sect';rotH.textContent='Rotation fluide de l’Interaction';
    const rotN=document.createElement('div');rotN.className='note';
    rotN.textContent='Quand le contexte serveur devient lourd, Holophone change silencieusement d’Interaction ID puis repart avec la mémoire longue et les derniers échanges bruts. La conversation visible ne change pas.';
    const rot=document.createElement('select');rot.id='v27RotateTokens';
    [[40000,'40 000 tokens'],[60000,'60 000 tokens · recommandé'],[80000,'80 000 tokens'],[100000,'100 000 tokens'],[0,'Désactivée']].forEach(([x,lb])=>{
      const o=document.createElement('option');o.value=String(x);o.textContent=lb;if(Number(V2.cfg.interactionRotateTokens)===x)o.selected=true;rot.appendChild(o)
    });
    rot.onchange=async()=>{V2.cfg.interactionRotateTokens=Number(rot.value)||0;await saveCfg();
      toastInfo('Rotation Interaction',V2.cfg.interactionRotateTokens?'Seuil : '+V2.cfg.interactionRotateTokens.toLocaleString('fr-FR')+' tokens.':'Rotation par taille désactivée.')};

    const imgH=document.createElement('div');imgH.className='sect';imgH.textContent='Durée des images dans le contexte IA';
    const imgN=document.createElement('div');imgN.className='note';
    imgN.textContent='Le fichier reste dans Holophone et dans la conversation. Seule la vision conservée par Gemini est purgée par rotation au prochain échange quand le délai est dépassé.';
    const imgT=document.createElement('select');imgT.id='v271ImageTtl';
    [[1,'1 heure'],[2,'2 heures · recommandé'],[4,'4 heures'],[8,'8 heures'],[0,'Désactivé']].forEach(([x,lb])=>{
      const o=document.createElement('option');o.value=String(x);o.textContent=lb;if(Number(V2.cfg.imageContextTtlHours)===x)o.selected=true;imgT.appendChild(o)
    });
    imgT.onchange=async()=>{V2.cfg.imageContextTtlHours=Number(imgT.value)||0;await saveCfg();
      toastInfo('Contexte image',V2.cfg.imageContextTtlHours?'Purge au prochain échange après '+V2.cfg.imageContextTtlHours+' h.':'Purge temporelle désactivée.')};

    const scan=document.createElement('button');scan.className='mini';scan.textContent='Archiver la conversation actuelle';
    scan.onclick=async()=>{const cv=cur;if(!cv)return;const cc=CONTACTS.find(x=>x.id===cv.cid);scan.disabled=true;scan.textContent='Archivage…';
      const r=await epScanConversation(cc,cv,{full:true,origin:'manual-local'});scan.disabled=false;scan.textContent='Archiver la conversation actuelle';
      toastInfo('Mémoire longue',r&&r.ok?'Archivage terminé.':'Archivage impossible.');buildMem()};
    box.prepend(h,n,stat);box.append(rh,rn,sel,rotH,rotN,rot,imgH,imgN,imgT,scan);B.insertBefore(box,B.firstChild);
    qa('#memBody button').forEach(b=>{if(/Relire les échanges|Mettre à jour maintenant/i.test(b.textContent||'')){b.disabled=true;b.textContent='Ancienne relecture automatique désactivée'}});
  }
  const buildMemBeforeV21=buildMem;
  buildMem=function(){buildMemBeforeV21();injectMemorySourceUi()};

  const baseRefreshSysPresence=refreshSys;
  refreshSys=function(){baseRefreshSysPresence();try{const c=C();if(c){const p=presenceUpdate(c,false,cur&&cur.cid===c.id?cur:null);if(q('#presenceMenuLabel'))q('#presenceMenuLabel').textContent='Vie de '+(characterName(c));if(q('#presenceState')&&p)q('#presenceState').textContent=((c.life&&c.life.name)||'présente')+' · '+p.focus}}catch(e){}};

  /* ---------- tableau de bord présence ---------- */
  function pPct(v){return Math.max(0,Math.min(100,Math.round(Number(v)||0)))}
  function pMetric(label,val){return'<div class="presencecell"><div class="plabel">'+label+'</div><div class="pval">'+pLevel(val)+'</div><div class="pmeter"><i style="width:'+pPct(val)+'%"></i></div></div>'}
  function presenceRender(){
    const c=C(),B=q('#presenceBody');if(!c||!B)return;const cv=cur&&cur.cid===c.id?cur:null,p=presenceUpdate(c,true,cv),life=c.life||{},e=emotionSync(c,cv),decision=initiativeDecision(c,cv);
    q('#presenceTitle').textContent='Vie de '+(characterName(c));q('#presenceSub').textContent=p.focus||'présence intérieure';
    B.innerHTML='';
    const hero=document.createElement('div');hero.className='presencehero';hero.innerHTML='<b>'+((life.name||'Présente')+(life.since?' · depuis '+hhmm(life.since):''))+'</b><i>'+p.thought+'</i>';B.append(hero);
    const sh=document.createElement('div');sh.className='sect';sh.textContent='État intérieur';B.append(sh);
    const grid=document.createElement('div');grid.className='presencegrid';grid.innerHTML=pMetric('Énergie',p.energy)+pMetric('Envie de contact',p.connection)+pMetric('Curiosité',p.curiosity)+pMetric('Autonomie',p.autonomy);B.append(grid);

    const mh=document.createElement('div');mh.className='sect';mh.textContent='Humeur vivante';B.append(mh);
    const mood=document.createElement('div');mood.className='note';mood.innerHTML='<b>'+emotionLabel(e)+' · '+lvlName(e.level||2)+'</b><br>'+emotionDuration(e)+' · sous-ton '+moodName(e.undertone).toLowerCase()+'<br><span style="color:var(--dim)">Cause retenue : '+String(e.cause||'rythme de la journée')+'. Stabilité '+pLevel(e.stability)+'.</span>';B.append(mood);

    const lh=document.createElement('div');lh.className='sect';lh.textContent='Vie entre les messages';B.append(lh);
    const lnote=document.createElement('div');lnote.className='note';const trail=lifeRecent(c,10);
    lnote.innerHTML='<b>Maintenant : '+String(life.name||'rien de particulier')+'</b>'+(life.next?'<br>Ensuite : '+String(life.next):'')+
      (trail.length?'<br><span style="color:var(--dim)">Dernières heures : '+trail.map(x=>String(x.name)+' · '+hhmm(x.since)).join(' → ')+'</span>':'<br><span style="color:var(--dim)">La continuité quotidienne se construira avec le temps.</span>');B.append(lnote);

    const eh=document.createElement('div');eh.className='sect';eh.textContent='Élan du moment';B.append(eh);
    const motive=document.createElement('div');motive.className='note';motive.innerHTML='<b>'+(decision.allow?'Initiative plausible':'Pas de raison forte d’écrire maintenant')+'</b><br>'+decision.reason+'<br><span style="color:var(--dim)">'+p.motive+' · décision locale, jamais une obligation.</span>';B.append(motive);
    const rh=document.createElement('div');rh.className='sect';rh.textContent='Petits événements récents';B.append(rh);
    const events=(p.recent||[]).slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,10);
    if(!events.length){const x=document.createElement('div');x.className='presencequiet';x.textContent='Rien de particulier pour l’instant. La chronologie se construira au fil des activités, humeurs, gestes et initiatives.';B.append(x)}
    else events.forEach(ev=>{const row=document.createElement('div');row.className='presenceevent';row.innerHTML='<time>'+dayLabel(ev.ts)+'<br>'+hhmm(ev.ts)+'</time><div><b>'+String(ev.title||ev.type)+'</b><i>'+String(ev.detail||'')+'</i></div>';B.append(row)});
    const ch=document.createElement('div');ch.className='sect';ch.textContent='Continuité';B.append(ch);
    const state=contactConvs(c).find(v=>v.geminiInteractionId)||null;const note=document.createElement('div');note.className='note';note.innerHTML=(episodes(c).length+' épisode(s) sourcé(s) · '+jrn(c).length+' souvenir(s) explicite(s) · '+aff(c).length+' goût(s)')+'<br>'+(state&&state.geminiInteractionId?'Interaction Gemini active · '+(state.geminiTurns||[]).length+' tour(s) locaux':'Interaction démarrera au prochain échange')+'<br><span style="color:var(--dim)">Cette page décrit des états entretenus par Holophone, pas les pensées privées du modèle.</span>';B.append(note);
    const row=document.createElement('div');row.className='rowb';const refresh=document.createElement('button');refresh.className='mini g';refresh.textContent='Actualiser';refresh.onclick=()=>{presenceUpdate(c,true,cv);presenceRender();saveContacts()};row.append(refresh);B.append(row);
    if(q('#presenceState'))q('#presenceState').textContent=(life.name||'présente')+' · '+p.focus;
  }
  function wirePresenceUi(){const go=q('#goPresence'),back=q('#presenceBack');if(go&&!go.dataset.wired){go.dataset.wired='1';go.onclick=()=>{show(q('#screenPresence'));presenceRender()}}if(back&&!back.dataset.wired){back.dataset.wired='1';back.onclick=()=>{show(q('#screenSys'));refreshSys()}}}

  /* ---------- initialisation ---------- */
  async function whenBoot(){for(let i=0;i<120&&!bootReady;i++)await new Promise(r=>setTimeout(r,50));return bootReady}
  async function init(){
    injectSecurityUi();injectCallTools();injectVoiceUi();await loadCfg();paintCfg();if(V2.cfg.biometric&&PIN.on&&q('#lock')&&q('#lock').classList.contains('on'))setTimeout(()=>bioUnlock(),250);
    try{V2.lastAutoBackup=parseInt((await Store.get('v2.backupLast'))||'0',10)||0}catch(e){}
    await whenBoot();await migrateData();paintCfg();renderHood2();wirePresenceUi();
    try{V2.episodeRecovery=JSON.parse((await Store.get(EP_RECOVERY_KEY))||'null')}catch(e){V2.episodeRecovery=null}
    const c=C();if(c){updateActivity(c,false);presenceUpdate(c,true,cur&&cur.cid===c.id?cur:null);await saveContacts();if(q('#presenceState'))q('#presenceState').textContent=(c.life&&c.life.name?c.life.name:'présente')+' · '+presence(c).focus}
    setTimeout(async()=>{
      if(cur&&episodes(C()||{}).length===0)cur.episodeScanTs=0;
      await epRecoverCurrentOnce();
    },1800);
    setTimeout(()=>autoBackup(false),3500);V2.timers.backup=setInterval(()=>autoBackup(false),30*60000);
    V2.timers.life=setInterval(async()=>{const c=C();if(c){const before=c.life&&c.life.name;updateActivity(c,false);presenceUpdate(c,false,cur&&cur.cid===c.id?cur:null);if(c.life&&c.life.name!==before)await saveContacts()}},5*60000);
  }
  init();
})();
