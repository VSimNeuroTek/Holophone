/* Holophone 3.4.0 — Ergo + Prompt Diet UI
   - Spotify: compact -> résultats plein écran -> sélection focalisée
   - Refuge: actions flottantes + accordéons Maison / Pièces / Historique
   - Textareas: hauteur mémorisée, panneaux toujours repliés par défaut
   - Interactions utilisateur: contexte IA structuré et neutre
*/
(() => {
  'use strict';

  const HEIGHT_KEY='v7.ui.textareaHeights';
  let heights={};
  try{heights=JSON.parse(localStorage.getItem(HEIGHT_KEY)||'{}')||{}}catch(e){heights={}}

  function uiKey(el){
    if(!el)return'';
    if(el.dataset&&el.dataset.uiHeightKey)return el.dataset.uiHeightKey;
    if(el.id)return'id:'+el.id;
    const screen=el.closest&&el.closest('[id^="screen"]');
    const scope=screen?screen.id:(el.closest&&el.closest('.ref340,.music340')?.className||'global');
    const ph=String(el.getAttribute('placeholder')||el.getAttribute('name')||'textarea').slice(0,80);
    return String(scope)+'|'+ph;
  }
  function saveHeights(){
    try{localStorage.setItem(HEIGHT_KEY,JSON.stringify(heights))}catch(e){}
    try{if(typeof Store!=='undefined'&&Store&&Store.set)Store.set(HEIGHT_KEY,JSON.stringify(heights))}catch(e){}
  }
  function rememberHeight(el){
    if(!el||el.tagName!=='TEXTAREA')return;const k=uiKey(el);if(!k)return;
    const h=Math.round(el.getBoundingClientRect().height||0);if(h<44)return;
    if(heights[k]!==h){heights[k]=h;saveHeights()}
  }
  function bindTextarea(el){
    if(!el||el.dataset.h340Bound)return;el.dataset.h340Bound='1';const k=uiKey(el);
    if(k&&Number(heights[k])>=44)el.style.height=Math.max(44,Number(heights[k]))+'px';
    const store=()=>setTimeout(()=>rememberHeight(el),0);
    el.addEventListener('pointerup',store);el.addEventListener('mouseup',store);el.addEventListener('touchend',store);el.addEventListener('blur',store);
  }
  function bindTextareas(root=document){try{root.querySelectorAll('textarea').forEach(bindTextarea)}catch(e){}}
  bindTextareas();
  try{new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.tagName==='TEXTAREA')bindTextarea(n);bindTextareas(n)}}))).observe(document.body,{childList:true,subtree:true})}catch(e){}

  /* Réglages : l'ouverture/fermeture est éphémère. Seule la hauteur des champs survit. */
  function collapseSettings(){document.querySelectorAll('#settingsCfg .setgroup').forEach(g=>{g.classList.add('collapsed');const h=g.querySelector('.setgrouphead');if(h)h.setAttribute('aria-expanded','false')})}
  try{
    settingsSaveGroups=function(){};
    settingsGroupState=function(){return{}};
    const baseSet=settingsSetGroup;
    settingsSetGroup=function(g,open,save){return baseSet(g,open,false)};
    const baseOpen=openSettings;
    openSettings=function(from){collapseSettings();const r=baseOpen(from);setTimeout(collapseSettings,0);return r};
    collapseSettings();
  }catch(e){console.warn('3.4 settings collapse',e)}

  /* Réduit la contamination stylistique des actions : la bulle visible reste jolie,
     mais l'IA reçoit un événement structuré, pas une phrase romancée à imiter. */
  try{
    sendUserAction=async function(a,catName){
      const c=C();if(!c||!cur||!a||!actionUsableBy(a,'user'))return;
      const full=allActions().find(x=>x.id===a.id)||a;
      const actor=actionActorName(c),text=(actor+' '+a.phrase).replace(/\s+/g,' ').trim();
      push({w:'v',t:text,act:{id:a.id,label:a.label,cat:catName||full.catName||'',mood:a.mood,lvl:a.lvl},ts:nowTs()});
      actionMood(c,a);
      const guard={id:a.id,catId:full.catId||'',catName:catName||full.catName||'',mood:a.mood||'',ts:nowTs()};
      cur.actionReplyGuard=guard;
      const alts=actionReplyChoices(guard,c).slice(0,12);
      const altText=alts.length?alts.map(x=>x.id).join(', '):'aucune';
      cur.ai.push({ts:nowTs(),role:'user',content:
        '[INTERACTION_UTILISATEUR id="'+a.id+'" label="'+String(a.label||'').slice(0,100)+'" humeur="'+String(a.mood||'')+'". '+
        'Réagis naturellement. Une interaction en retour est facultative. Si act est utilisé, ne renvoie pas "'+a.id+'" ; IDs compatibles : '+altText+'.]'});
      clearWait(c,cur);await saveConvs();queueTurn();
    };
  }catch(e){console.warn('3.4 action neutralization',e)}

  const style=document.createElement('style');
  style.id='holo340-style';style.textContent=`
    .music340,.ref340{position:fixed;inset:0;z-index:9700;background:var(--bg,#050708);color:var(--txt,#e7ecee);padding:calc(env(safe-area-inset-top) + 10px) calc(env(safe-area-inset-right) + 12px) calc(env(safe-area-inset-bottom) + 12px) calc(env(safe-area-inset-left) + 12px);display:flex;flex-direction:column;min-height:0}
    .music340 .m340head,.ref340 .r340head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line,#26343a);padding:4px 0 10px;margin-bottom:10px}
    .music340 .m340head b,.ref340 .r340head b{font-family:'Share Tech Mono',monospace;letter-spacing:.2em;font-size:12px;color:var(--accent,var(--teal))}
    .music340 .m340body,.ref340 .r340body{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding-bottom:24px}
    .m340grid2,.r340actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
    .m340grid2 .mini,.r340actions .mini{width:100%;min-width:0}
    .m340now{width:100%;margin:10px 0}
    .m340results{display:flex;flex-direction:column;gap:10px}
    .m340card{width:100%;display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:center;text-align:left;background:var(--panel,#0b1114);border:1px solid var(--line,#26343a);border-left:3px solid var(--accent,var(--teal));padding:10px;color:var(--txt,#e7ecee);min-height:116px}
    .m340card img{width:96px;height:96px;object-fit:cover;background:#050505}.m340card .tx{min-width:0}.m340card b{display:block;font-size:20px;line-height:1.15}.m340card i{display:block;color:var(--dim,#7f9098);font-style:normal;margin-top:7px;font-size:14px}
    .m340selected{max-width:780px;margin:0 auto}.m340selected .m340card{margin-bottom:14px}.m340selected .lbl{margin-top:10px}.m340selected textarea{min-height:96px}.m340selected .m340grid2{margin-top:12px}
    .ref340 .r340sticky{flex:0 0 auto;position:relative;padding-bottom:10px;border-bottom:1px solid var(--line,#26343a);margin-bottom:8px}.ref340 .r340actions{margin-top:8px}
    .r340section{border:1px solid var(--line,#26343a);background:rgba(0,0,0,.16);margin:10px 0}.r340section>summary,.r340room>summary{cursor:pointer;list-style:none;padding:14px;font-family:'Share Tech Mono',monospace;letter-spacing:.14em;color:var(--accent,var(--teal));display:flex;justify-content:space-between;align-items:center}.r340section>summary::-webkit-details-marker,.r340room>summary::-webkit-details-marker{display:none}.r340section>summary:after,.r340room>summary:after{content:'▾';opacity:.7}.r340section[open]>summary:after,.r340room[open]>summary:after{content:'▴'}
    .r340content{padding:0 12px 14px}.r340form{display:flex;flex-direction:column;gap:10px}.r340form .refgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.r340room{border-top:1px solid var(--line,#26343a)}.r340room:first-child{border-top:0}.r340room>summary{padding:12px;color:var(--txt,#e7ecee);letter-spacing:.06em}.r340room.current>summary{color:var(--accent,var(--teal))}.r340roomdetail{padding:0 12px 12px}.r340roomdetail .refmedia{margin:8px 0}.r340roomactions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.r340roomactions .mini{width:100%}.r340roomactions .join{grid-column:1/-1}.r340history .refproposal{margin:8px 0}
    #deck.music-compact340{max-height:min(58vh,520px);overflow:auto}.music-compact340 .sptabs,.music-compact340 .rowb{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important}.music-compact340 .sptabs .mini,.music-compact340 .rowb .mini{width:100%!important;min-width:0!important}
    @media(max-width:520px){.m340card{grid-template-columns:78px 1fr;min-height:98px}.m340card img{width:78px;height:78px}.m340card b{font-size:18px}.r340actions{gap:6px}.r340actions .mini{font-size:11px;padding-left:5px;padding-right:5px}}
  `;document.head.appendChild(style);

  function hideAndroidKeyboard(){try{const K=CAP().Keyboard;if(K&&K.hide)K.hide()}catch(e){}try{document.activeElement&&document.activeElement.blur&&document.activeElement.blur()}catch(e){}}
  function closeMusicOverlay(){document.getElementById('musicOverlay340')?.remove()}
  function musicCard(t){
    const card=document.createElement('button');card.type='button';card.className='m340card';
    if(t.img){const im=document.createElement('img');im.src=t.img;im.alt='';card.appendChild(im)}else{const ph=document.createElement('div');ph.style.width='96px';ph.style.height='96px';card.appendChild(ph)}
    const tx=document.createElement('div');tx.className='tx';const b=document.createElement('b');b.textContent=t.titre||t.label||'Spotify';const i=document.createElement('i');i.textContent=t.kind==='playlist'?('playlist · '+(t.artiste||'Spotify')):((t.artiste||'')+(t.album?' · '+t.album:''));tx.append(b,i);card.appendChild(tx);return card;
  }
  function musicOverlayShell(title,onClose){
    closeMusicOverlay();const root=document.createElement('div');root.id='musicOverlay340';root.className='music340';
    const hd=document.createElement('div');hd.className='m340head';const b=document.createElement('b');b.textContent=title||'SPOTIFY';const x=document.createElement('button');x.className='iconbtn';x.textContent='✕';x.onclick=()=>{root.remove();if(onClose)onClose()};hd.append(b,x);
    const body=document.createElement('div');body.className='m340body';root.append(hd,body);document.body.appendChild(root);return{root,body};
  }

  try{
    musComposer=function(){
      const c=C();deckEl.innerHTML='';deckEl.classList.remove('min');deckEl.classList.add('music-compact340');deckMin=false;
      const l=document.createElement('div');l.className='lbl';l.textContent='Spotify';deckEl.append(l);
      if(!spOn()){
        const n=document.createElement('div');n.className='note';n.textContent='Relie ton compte Spotify pour chercher ici. Sans lui, tu peux toujours partager depuis Spotify vers Holophone.';
        const row=document.createElement('div');row.className='rowb';const go=document.createElement('button');go.className='mini g';go.textContent='Relier mon compte';go.onclick=()=>{deckEl.classList.remove('music-compact340');restoreDeck();show($('#screenSpot'));buildSpot()};const cancel=document.createElement('button');cancel.className='mini';cancel.textContent='Annuler';cancel.onclick=()=>{deckEl.classList.remove('music-compact340');restoreDeck()};row.append(go,cancel);deckEl.append(n,row);return;
      }
      let mode='track',lastResults=[];
      const tabs=document.createElement('div');tabs.className='sptabs';const bt=document.createElement('button');bt.className='mini g';bt.textContent='Morceaux';const bp=document.createElement('button');bp.className='mini';bp.textContent='Playlists';tabs.append(bt,bp);
      const now=document.createElement('button');now.className='mini g m340now';now.textContent='♪ Ce que j’écoute là';
      const q=document.createElement('input');q.className='txtin';q.placeholder='Artiste, titre, album…';
      const row=document.createElement('div');row.className='rowb';const search=document.createElement('button');search.className='mini g';search.textContent='Chercher';const cancel=document.createElement('button');cancel.className='mini';cancel.textContent='Annuler';row.append(search,cancel);
      const msg=document.createElement('div');msg.className='ok';deckEl.append(tabs,now,q,row,msg);q.focus();
      const setMode=m=>{mode=m;bt.classList.toggle('g',m==='track');bp.classList.toggle('g',m==='playlist');q.placeholder=m==='track'?'Artiste, titre, album…':'Nom, ambiance ou thème de playlist…';q.focus()};bt.onclick=()=>setMode('track');bp.onclick=()=>setMode('playlist');cancel.onclick=()=>{deckEl.classList.remove('music-compact340');restoreDeck()};

      const sendTrack=async(t,note)=>{
        closeMusicOverlay();deckEl.classList.remove('music-compact340');restoreDeck();const ts=nowTs();const mu={label:t.label,url:t.url,kind:t.kind||'track',query:t.uri||t.url,own:true};mediaReplyGuardAdd(cur,mu);push({w:'v',mus:mu,t:note||'',ts});
        cur.ai.push({ts,role:'user',content:(mu.kind==='playlist'?('[MEDIA_SPOTIFY playlist="'+t.label+'" partagé par '+uName(c)+'. Réagis à la sélection ; ne renvoie pas cette même playlist.]'):('[MEDIA_SPOTIFY morceau="'+t.label+'" partagé par '+uName(c)+'. Réagis au morceau ; ne renvoie pas ce même morceau.]'))+(note?'\nMessage lié : « '+note.slice(0,1200)+' »':'')});await saveConvs();if(API.key)queueTurn();
      };
      const showSelected=(t,list)=>{
        hideAndroidKeyboard();const {body}=musicOverlayShell('SPOTIFY · SÉLECTION',()=>{});const wrap=document.createElement('div');wrap.className='m340selected';const card=musicCard(t);card.disabled=true;wrap.appendChild(card);
        const lab=document.createElement('div');lab.className='lbl';lab.textContent='Message lié';const ta=document.createElement('textarea');ta.rows=4;ta.dataset.uiHeightKey='spotify-linked-message';ta.placeholder='Un message avec ce partage… (facultatif)';const br=document.createElement('div');br.className='m340grid2';const send=document.createElement('button');send.className='mini g';send.textContent='Envoyer';const back=document.createElement('button');back.className='mini';back.textContent='Annuler';send.onclick=()=>sendTrack(t,ta.value.trim());back.onclick=()=>showResults(list);br.append(send,back);wrap.append(lab,ta,br);body.appendChild(wrap);bindTextarea(ta);ta.focus();
      };
      const showResults=list=>{
        lastResults=list||lastResults;hideAndroidKeyboard();const {body}=musicOverlayShell('SPOTIFY · RÉSULTATS',()=>{});const box=document.createElement('div');box.className='m340results';(lastResults||[]).forEach(t=>{const card=musicCard(t);card.onclick=()=>showSelected(t,lastResults);box.appendChild(card)});if(!box.childNodes.length){const e=document.createElement('div');e.className='empty';e.textContent='Aucun résultat.';box.appendChild(e)}body.appendChild(box);
      };
      const draw=list=>{lastResults=list||[];if(!lastResults.length){flash(msg,'Rien trouvé.','var(--magenta)',12000);return}showResults(lastResults)};
      now.onclick=async()=>{flash(msg,'Lecture en cours…','var(--teal)',20000);try{const d=await spApi('/me/player/currently-playing'),t=d&&d.item;if(!t){flash(msg,'Rien ne joue en ce moment dans Spotify.','var(--magenta)',15000);return}msg.textContent='';draw([spTrackObj(t)])}catch(e){flash(msg,'Échec — '+e.message,'var(--magenta)',20000)}};
      search.onclick=async()=>{const v=q.value.trim();if(!v)return;flash(msg,'Recherche…','var(--teal)',20000);try{const list=mode==='playlist'?await spSearchPlaylists(v,6):await spSearchTracks(v,6);msg.textContent='';draw(list)}catch(e){flash(msg,'Échec — '+e.message,'var(--magenta)',30000)}};
      q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();search.click()}};bindTurnTyping(q);
    };
  }catch(e){console.warn('3.4 Spotify UX',e)}

  function roomMedia(c,room){
    const media=document.createElement('div');media.className='refmedia';
    (room.images||[]).slice(0,4).forEach(lb=>{const src=refugeImageSrc(c,lb);if(src){const im=document.createElement('img');im.src=src;im.alt=lb;im.onclick=()=>openZoom(src,false,lb);media.appendChild(im)}});
    (room.music||[]).slice(0,4).forEach(lb=>{const m=document.createElement('button');m.className='refmusic';m.textContent='♪ '+lb;m.onclick=async()=>{try{const mu=musResolve(c,lb);if(mu){if(spOn())await spPlay(mu.query||mu.url);else window.open(mu.url,'_blank')}}catch(e){}};media.appendChild(m)});
    return media;
  }
  function historyCard(root,c,p){
    const card=document.createElement('div');card.className='refproposal '+p.status;const b=document.createElement('b');
    if(p.status==='pending')b.textContent=p.by==='character'?'Proposition de '+characterName(c)+' · ta décision':'Ta proposition · décision de '+characterName(c);
    else if(p.by==='character')b.textContent=p.status==='accepted'?'Proposition de '+characterName(c)+' · acceptée par toi':'Proposition de '+characterName(c)+' · refusée par toi';
    else b.textContent=p.status==='accepted'?'Ta proposition · acceptée par '+characterName(c):'Ta proposition · refusée par '+characterName(c);
    const tx=document.createElement('div');tx.textContent=p.summary;card.append(b,tx);
    if(p.status==='pending'&&p.by==='character'){const row=document.createElement('div');row.className='rowb';const yes=document.createElement('button');yes.className='mini g';yes.textContent='✓ Accepter';const no=document.createElement('button');no.className='mini';no.textContent='✕ Refuser';yes.onclick=()=>{root.remove();refugeUserDecideProposal(c,p,'accept')};no.onclick=()=>{root.remove();refugeUserDecideProposal(c,p,'refuse')};row.append(yes,no);card.appendChild(row)}
    else if(p.status==='pending'){const retry=document.createElement('button');retry.className='mini';retry.textContent='Redemander à '+characterName(c);retry.onclick=()=>{root.remove();refugeRetryProposal(p)};card.appendChild(retry)}
    return card;
  }
  try{
    refugeOverlay=function(){
      if(!cur)return;const c=C(),r=ensureRefuge(c);document.getElementById('refugeOverlay')?.remove();
      const root=document.createElement('div');root.id='refugeOverlay';root.className='ref340';const sticky=document.createElement('div');sticky.className='r340sticky';
      const hd=document.createElement('div');hd.className='r340head';const title=document.createElement('div');title.innerHTML='<b>NOTRE REFUGE</b><div class="note">une maison construite à deux</div>';const x=document.createElement('button');x.className='iconbtn';x.textContent='✕';x.onclick=()=>root.remove();hd.append(title,x);sticky.appendChild(hd);
      const actions=document.createElement('div');actions.className='r340actions';const add=document.createElement('button');add.className='mini g';add.textContent='＋ Proposer une nouvelle pièce';add.onclick=()=>refugeRoomEditor(null);const idea=document.createElement('button');idea.className='mini';idea.textContent='✦ '+characterName(c)+' propose une pièce';idea.onclick=async()=>{if(r.proposals.some(p=>p.status==='pending'&&p.by==='character')){toastInfo('Notre Refuge','Une proposition de '+characterName(c)+' attend déjà ta décision.');return}r.ideaDue=true;await saveContacts();root.remove();cur.ai.push({ts:nowTs(),role:'user',content:'[REFUGE_PROPOSITION_DEMANDEE : propose UNE pièce que tu aimerais dans notre maison. Remplis refugeProposalName et refugeProposalDescription. La proposition reste en attente de validation.]'});await saveConvs();queueTurn()};actions.append(add,idea);sticky.appendChild(actions);root.appendChild(sticky);
      const body=document.createElement('div');body.className='r340body';

      const house=document.createElement('details');house.className='r340section';const hs=document.createElement('summary');hs.textContent='MAISON';const hc=document.createElement('div');hc.className='r340content r340form';
      const note=document.createElement('div');note.className='note';note.textContent='Les modifications générales restent des propositions jusqu’à validation par '+characterName(c)+'.';
      const name=document.createElement('input');name.className='txtin';name.placeholder='Nom du refuge';name.value=r.name;const loc=document.createElement('input');loc.className='txtin';loc.placeholder='Localisation fictive';loc.value=r.location;const grid=document.createElement('div');grid.className='refgrid';const climate=document.createElement('input');climate.className='txtin';climate.placeholder='Climat';climate.value=r.climate;const weather=document.createElement('input');weather.className='txtin';weather.placeholder='Météo actuelle';weather.value=r.weather;grid.append(climate,weather);const desc=document.createElement('textarea');desc.rows=4;desc.dataset.uiHeightKey='refuge-house-description';desc.placeholder='Atmosphère générale, environnement, vue…';desc.value=r.description;const prop=document.createElement('button');prop.className='mini g';prop.textContent='Proposer ces changements à '+characterName(c);prop.onclick=async()=>{const payload={name:name.value.trim().slice(0,80)||'Notre Refuge',location:loc.value.trim().slice(0,500),climate:climate.value.trim().slice(0,300),weather:weather.value.trim().slice(0,300),description:desc.value.trim().slice(0,3000)};const same=payload.name===r.name&&payload.location===r.location&&payload.climate===r.climate&&payload.weather===r.weather&&payload.description===r.description;if(same){toastInfo('Notre Refuge','Aucun changement à proposer.');return}root.remove();await refugePropose(c,cur,'meta',payload)};
      const auto=document.createElement('button');auto.className='mini'+(r.autoEvents?' g':'');auto.textContent='Événements spontanés : '+(r.autoEvents?'ON':'OFF');auto.onclick=async()=>{r.autoEvents=!r.autoEvents;await saveContacts();refugeOverlay()};const event=document.createElement('button');event.className='mini';event.textContent='⚄ Événement maintenant';event.disabled=!r.currentRoomId;event.onclick=async()=>{root.remove();if(await refugeInjectEvent(c,cur,true))queueTurn()};hc.append(note,name,loc,grid,desc,prop,auto,event);house.append(hs,hc);body.appendChild(house);bindTextarea(desc);

      const roomsSec=document.createElement('details');roomsSec.className='r340section';const rs=document.createElement('summary');rs.textContent='PIÈCES EXISTANTES · '+r.rooms.length;const rc=document.createElement('div');rc.className='r340content';
      if(!r.rooms.length){const e=document.createElement('div');e.className='empty';e.textContent='Le Refuge est encore vide.';rc.appendChild(e)}
      r.rooms.forEach(room=>{const d=document.createElement('details');d.className='r340room'+(r.currentRoomId===room.id?' current':'');const sm=document.createElement('summary');sm.textContent=room.name+(r.currentRoomId===room.id?' · ici':'');const det=document.createElement('div');det.className='r340roomdetail';if(room.desc){const rd=document.createElement('div');rd.className='refdesc';rd.textContent=room.desc;det.appendChild(rd)}const med=roomMedia(c,room);if(med.childNodes.length)det.appendChild(med);const ar=document.createElement('div');ar.className='r340roomactions';const join=document.createElement('button');join.className='mini g join';join.textContent=r.currentRoomId===room.id?'Retrouver '+characterName(c)+' ici':'Rejoindre '+characterName(c)+' ici';join.onclick=()=>{root.remove();refugeEnterRoom(room)};const edit=document.createElement('button');edit.className='mini';edit.textContent='Proposer une modification';edit.onclick=()=>refugeRoomEditor(room);const del=document.createElement('button');del.className='mini end';del.textContent='Suggérer la suppression';del.onclick=()=>askConfirm('Proposer la suppression de « '+room.name+' » ?','La pièce ne sera supprimée que si '+characterName(c)+' accepte.','Proposer',async()=>{root.remove();await refugePropose(c,cur,'room-delete',{id:room.id,name:room.name},'Supprimer la pièce « '+room.name+' »')});ar.append(join,edit,del);det.appendChild(ar);d.append(sm,det);rc.appendChild(d)});roomsSec.append(rs,rc);body.appendChild(roomsSec);

      const hist=document.createElement('details');hist.className='r340section r340history';const his=document.createElement('summary');const pending=r.proposals.filter(p=>p.status==='pending').sort((a,b)=>b.ts-a.ts),recent=r.proposals.filter(p=>p.status!=='pending').sort((a,b)=>b.decidedTs-a.decidedTs);his.textContent='HISTORIQUE DES TRAVAUX · '+r.proposals.length;const hic=document.createElement('div');hic.className='r340content';if(!pending.length&&!recent.length){const e=document.createElement('div');e.className='empty';e.textContent='Aucun travail enregistré.';hic.appendChild(e)}[...pending,...recent].forEach(p=>hic.appendChild(historyCard(root,c,p)));hist.append(his,hic);body.appendChild(hist);
      root.appendChild(body);document.body.appendChild(root);bindTextareas(root);
    };
  }catch(e){console.warn('3.4 Refuge UX',e)}

  window.HolophoneUX340={version:'3.4.0',rememberHeight,collapseSettings};
})();
