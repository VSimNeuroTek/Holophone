'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const results=[];
function assert(c,m){if(!c)throw new Error(m)}
function has(t,n,m){assert(t.includes(n),m||('absent: '+n))}
function test(name,fn){try{const d=fn();results.push({name,ok:true,detail:d||''})}catch(e){results.push({name,ok:false,detail:e.message})}}
const html=read('www/index.html'),v2=read('www/js/holophone-v2.js'),stable=read('www/js/holophone-stability.js'),ux=read('www/js/holophone-ux340.js'),i18n=read('www/js/holophone-i18n.js');
const release=read('RELEASE.cmd'),safe=read('scripts/release-safe.ps1');

test('Version 3.4.0 cohérente',()=>{has(html,"const APPV='3.4.0'");has(v2,"version: '3.4.0'");has(stable,"const STABLE_VERSION = '3.4.0'");return'web + V2 + stabilité'});
test('Schéma Persona inchangé 3200',()=>{has(stable,'const SCHEMA_VERSION = 3200');return'pas de migration artificielle'});
test('Module ergonomie 3.4 chargé après V2',()=>{const a=html.indexOf('js/holophone-v2.js'),b=html.indexOf('js/holophone-ux340.js');assert(a>0&&b>a,'ordre scripts invalide');return'OK'});
test('Prompt Diet retire présence du prompt normal',()=>{const a=v2.indexOf('sysPrompt=function'),b=v2.indexOf('/* generateContent',a);const x=v2.slice(a,b);assert(!x.includes('presenceBlock(c,conv)'), 'presenceBlock encore injecté');has(x,'tinyRefuge(c,q)');has(x,'tinyActions(c,conv,q)');return'contexte à la demande'});
test('Refuge injecté seulement si pertinent',()=>{has(v2,'function refugeContextNeeded(q)');has(v2,"if(!refugeContextNeeded(q))return''");return'conditionnel'});
test('Actions injectées seulement si pertinentes',()=>{has(v2,'function actionContextNeeded(conv,q)');has(v2,"if(!actionContextNeeded(conv,q))return''");return'conditionnel'});
test('Activité locale injectée seulement si demandée',()=>{has(v2,'function activityContextNeeded(q)');has(v2,'if(activityContextNeeded(q))');return'conditionnel'});
test('Contrat chat non agressif',()=>{const a=v2.indexOf('function outputRules(c){'),b=v2.indexOf('sysPrompt=function',a);const x=v2.slice(a,b);has(x,'messagerie');has(x,'évite seulement de transformer spontanément chaque tour en narration romanesque');assert(!x.includes('Pas de narration'),'interdiction globale encore présente');return'Braindance non concernée'});
test('Initiative locale ne dicte plus son motif',()=>{has(v2,'function presenceInitiative(c,conv)');assert(!/function presenceInitiative\(c,conv\)\{[^}]*Raison interne retenue/.test(v2),'motif encore injecté');return'timing local seulement'});
test('Vie locale retirée du prompt initiative',()=>{has(html,"const vie='';");return'pas de récit d’activité imposé'});
test('Interactions bootstrap structurées',()=>{has(v2,"[INTERACTION id=");return'pas de phrase narrative réinjectée'});
test('Interactions exclues de la mémoire épisodique',()=>{has(v2,'&&!m.act&&!isBraindanceUiMessage');return'pas de contamination future'});
test('Décontamination unique 3.4',()=>{has(v2,'promptDiet340Applied');has(v2,'promptDiet340Reset');has(v2,"v.geminiInteractionId=''");return'nouvel Interaction ID une fois'});
test('Interactions utilisateur envoyées en événement structuré',()=>{has(ux,'[INTERACTION_UTILISATEUR id=');return'neutralisation prompt'});
test('Braindance reste séparée',()=>{has(html,'generateContent');has(v2,'isBraindanceInternalAi');return'pipeline narratif intact'});

test('Spotify compact : Morceaux/Playlists 50-50',()=>{has(ux,'.music-compact340 .sptabs');has(ux,'grid-template-columns:1fr 1fr');return'OK'});
test('Spotify compact : Chercher/Annuler 50-50',()=>{has(ux,'.music-compact340 .rowb');return'OK'});
test('Spotify "Ce que j’écoute" pleine largeur',()=>{has(ux,'.m340now{width:100%');return'OK'});
test('Spotify résultats plein écran',()=>{has(ux,'.music340,.ref340{position:fixed;inset:0');has(ux,"musicOverlayShell('SPOTIFY · RÉSULTATS'");return'OK'});
test('Cartes Spotify horizontales pleine largeur',()=>{has(ux,'.m340card{width:100%;display:grid;grid-template-columns:96px 1fr');return'OK'});
test('Sélection Spotify focalisée',()=>{has(ux,"musicOverlayShell('SPOTIFY · SÉLECTION'");has(ux,"lab.textContent='Message lié'");return'OK'});
test('Envoyer/Annuler partagent la largeur',()=>{has(ux,"br.className='m340grid2'");return'OK'});
test('Clavier Android masqué aux résultats',()=>{has(ux,'function hideAndroidKeyboard()');has(ux,'showResults=list=>');return'OK'});

test('Refuge actions dans bandeau flottant',()=>{has(ux,'r340sticky');has(ux,'Proposer une nouvelle pièce');has(ux,"+' propose une pièce'");return'OK'});
test('Refuge Maison repliable',()=>{has(ux,"house=document.createElement('details')");has(ux,"hs.textContent='MAISON'");return'fermé par défaut'});
test('Refuge Pièces existantes repliable',()=>{has(ux,"roomsSec=document.createElement('details')");has(ux,"'PIÈCES EXISTANTES · '");return'fermé par défaut'});
test('Chaque pièce repliable avec actions',()=>{has(ux,"d=document.createElement('details')");has(ux,'Proposer une modification');has(ux,'Suggérer la suppression');return'OK'});
test('Historique travaux repliable',()=>{has(ux,"hist=document.createElement('details')");has(ux,'HISTORIQUE DES TRAVAUX');return'OK'});

test('Hauteurs textarea persistantes',()=>{has(ux,"const HEIGHT_KEY='v7.ui.textareaHeights'");has(ux,'rememberHeight');has(ux,'localStorage.setItem(HEIGHT_KEY');return'OK'});
test('Panneaux Réglages non persistants',()=>{has(ux,'settingsSaveGroups=function(){}');has(ux,'settingsGroupState=function(){return{}}');return'toujours repliés'});
test('Réglages repliés à chaque ouverture',()=>{has(ux,'openSettings=function(from){collapseSettings()');return'OK'});

test('Multilingue 3.3 conservé',()=>{has(i18n,"active:'fr-FR'");assert(exists('www/lang/fr-FR.json')&&exists('www/lang/en.json'),'packs absents');return'FR + EN'});
test('Confidentialité 3.3 conservée',()=>{has(html,'anonymousNotifications:true');has(html,"recentsPreview:'auto'");return'OK'});
test('Persona dynamique : aucun Judy en dur',()=>{const re=/\bjudy\b/i;[['html',html],['v2',v2],['ux',ux],['stable',stable],['i18n',i18n]].forEach(([n,t])=>assert(!re.test(t),n+' contient Judy'));return'OK'});
test('Release 3.4.0 code 54',()=>{has(release,'VERSION_NAME=3.4.0');has(release,'VERSION_CODE=54');has(read('RELEASE_3.4.0.cmd'),'3.4.0 54');return'OK'});
test('Release utilise recette 3.4.0',()=>{has(safe,'test-stable-v340.js');return'OK'});
test('Syntaxe JS externes',()=>{new Function(v2);new Function(stable);new Function(i18n);new Function(ux);return'OK'});
test('Syntaxe JS inline',()=>{const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m,n=0;while((m=re.exec(html))){n++;new Function(m[1])}assert(n>0,'aucun bloc');return n+' blocs'});

const failed=results.filter(r=>!r.ok);
console.log('\nHOLOPHONE 3.4.0 — RECETTE STATIQUE\n===================================');
results.forEach(r=>console.log((r.ok?'[OK]  ':'[KO]  ')+r.name+(r.detail?' — '+r.detail:'')));
console.log(`\n${results.length-failed.length}/${results.length} contrôles OK`);
if(failed.length)process.exit(1);
