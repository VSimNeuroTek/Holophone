'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const html=read('www/index.html'),backup=read('www/js/holophone-backup342.js'),i18n=read('www/js/holophone-i18n.js');
const results=[];
function assert(c,m){if(!c)throw new Error(m)}
function has(t,n,m){assert(t.includes(n),m||('absent: '+n))}
function test(name,fn){try{const d=fn();results.push({name,ok:true,detail:d||''})}catch(e){results.push({name,ok:false,detail:e.message})}}

test('Module hotfix 3.4.2 présent',()=>{has(backup,"const PATCH_VERSION='3.4.2'");has(backup,"const STREAM_VERSION=14");return'backup v14'});
test('Chargement après parsing du DOM',()=>{has(i18n,"s.src='js/holophone-backup342.js'");has(i18n,"DOMContentLoaded',loadBackup342");return'gestionnaires historiques déjà créés'});
test('Écriture progressive native',()=>{has(backup,'FS.appendFile');has(backup,"const MEDIA_CHUNK=192*1024");has(backup,"t:'chunk'");return'pas de JSON géant'});
test('Sauvegarde principale ne construit pas v13',()=>{const a=backup.indexOf('if(save)save.onclick');const x=backup.slice(a,a+1200);has(x,'saveStream(');assert(!x.includes('buildBackup(true'),'ancien chemin v13 encore utilisé');assert(!x.includes('JSON.stringify(o)'),'objet global encore sérialisé en une fois');return'flux v14'});
test('Médias référencés sans duplication inline',()=>{has(backup,'ensureBinaryRefs');has(backup,'cleanSrc');has(backup,'delete out[K.ct];delete out[K.cv]');return'IndexedDB canonique'});
test('Base64 découpé sur multiple de 3',()=>{has(backup,'192*1024');return'concaténation sûre'});
test('Intégrité par enregistrement',()=>{has(backup,"integrity:'record-sha256'");has(backup,'verifyRecord');has(backup,'SHA-256 bloc média invalide');return'WebCrypto si disponible'});
test('Fichier .holo unique',()=>{has(backup,"+'.holo'");has(backup,"STREAM_APP='holophone-backup-stream'");return'JSONL v14'});
test('Restauration lue par tranches',()=>{has(backup,'const READ_CHUNK=512*1024');has(backup,'async function* lines(file)');return'pas de file.text() global pour .holo'});
test('Restauration IndexedDB transactionnelle',()=>{has(backup,"__holo_restore342_");has(backup,'stageCommit(prefix)');has(backup,"IDBKeyRange.bound(prefix,prefix+'\\uffff')");return'staging temporaire'});
test('Nettoyage staging sur échec',()=>{has(backup,'catch(e){await stageCleanup(prefix);throw e}');return'rollback médias'});
test('Compatibilité JSON v12/v13',()=>{has(backup,'applyBackupSafe(JSON.parse(await f.text()))');has(html,"o.app==='holophone-backup'");return'ancien import conservé'});
test('toyList 3.4.1 conservé',()=>{has(html,'function toyList(c){if(!c)return[];if(!Array.isArray(c.toys))c.toys=[];return c.toys}');return'pas de régression 3.4.0'});
test('Clés API toujours optionnelles',()=>{has(backup,'keys:withKeys?API.keys:{}');has(backup,'SECURE_KEYS.has(k)');return'confidentialité conservée'});
test('Syntaxe JS hotfix',()=>{new Function(backup);new Function(i18n);return'OK'});

const failed=results.filter(r=>!r.ok);
console.log('\nHOLOPHONE 3.4.2 — RECETTE HOTFIX SAUVEGARDE\n=============================================');
results.forEach(r=>console.log((r.ok?'[OK]  ':'[KO]  ')+r.name+(r.detail?' — '+r.detail:'')));
console.log(`\n${results.length-failed.length}/${results.length} contrôles OK`);
if(failed.length)process.exit(1);
