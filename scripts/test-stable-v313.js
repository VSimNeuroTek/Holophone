'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const results=[];
function test(name,fn){try{const detail=fn();results.push({name,ok:true,detail:detail||''})}catch(e){results.push({name,ok:false,detail:e.message})}}
function assert(cond,msg){if(!cond)throw new Error(msg)}
function contains(text,needle,msg){assert(text.includes(needle),msg||('absent: '+needle))}
function regex(text,re,msg){assert(re.test(text),msg||('motif absent: '+re))}

const html=read('www/index.html');
const v2=read('www/js/holophone-v2.js');
const stable=read('www/js/holophone-stability.js');
const main=read('android/app/src/main/java/com/mudva/lumen/MainActivity.java');
const secure=read('android/app/src/main/java/com/mudva/lumen/SecureStorePlugin.java');
const prep=read('02_PREPARER_ANDROID_STUDIO.cmd');
const prepPs=read('scripts/prepare-android-v20.ps1');
const config=read('scripts/configure-android.ps1');
const releaseSafe=read('scripts/release-safe.ps1');
const sound=read('scripts/patches/local-notifications/SoundResolver.kt');
const manifest=read('android/app/src/main/AndroidManifest.xml');

test('Version web 3.1.3',()=>{contains(html,"const APPV='3.1.3'");contains(v2,"version: '3.1.3'");return'APPV et V2'});
test('Couche stabilité chargée avant V2',()=>{const a=html.indexOf('js/holophone-stability.js'),b=html.indexOf('js/holophone-v2.js');assert(a>0&&b>a,'ordre des scripts invalide');contains(html,'window.HolophoneStability.start(boot)');return'ordre OK'});
test('Schéma 3100 et migrations',()=>{contains(stable,'const SCHEMA_VERSION = 3100');contains(stable,'baseline-stable-3.0.0');contains(stable,'character-presence-3.1.0');return'schéma 3100'});
test('Sauvegarde v12 + intégrité SHA-256',()=>{contains(html,"app:'holophone-backup',v:12");contains(stable,'sha256Text');contains(stable,"contrôle SHA-256 de la sauvegarde invalide");return'checksum actif'});
test('Restauration transactionnelle',()=>{contains(html,'async function applyBackupSafe');contains(stable,'captureRuntimeCheckpoint');contains(stable,'rollbackRuntimeCheckpoint');return'rollback mémoire présent'});
test('Snapshots v3 couvrent les réglages structurants',()=>{contains(v2,"app:'holophone-auto-snapshot',v:3");['actions:copy(ACTCFG)','braindance:copy(BDCFG)','startup:copy(STARTCFG)','audioLibrary:copy(AUDIOCFG)'].forEach(x=>contains(v2,x));return'snapshot v3'});
test('Import MP3 multi-fichiers corrigé',()=>{contains(html,"Array.from((e.target&&e.target.files)||[])");regex(html,/id="audioLibraryFile"[^>]*multiple/);return'FileList copiée avant reset'});
test('Notifications anonymisées',()=>{contains(html,"title:'Holophone'");contains(html,"body:count+' nouveau'+(count>1?'x':'')+' message'+(count>1?'s':'')");assert(!/title:fullName\(ct\).*body:o\.m\[0\]/s.test(html),'ancien contenu nominatif détecté');return'aucun prénom/extrait dans la planification'});
test('Son notification privé Android',()=>{contains(sound,'resolveFromPrivateFiles');contains(sound,'ln_sounds');contains(html,"const AUDIO_NATIVE_DIR='ln_sounds'");return'chemins concordants'});
test('FLAG_SECURE et navigation masquée',()=>{contains(main,'FLAG_SECURE');contains(main,'WindowInsetsCompat.Type.navigationBars()');return'privacy native'});
test('Backup système Android désactivé',()=>{contains(manifest,'android:allowBackup="false"');contains(config,"SetAttribute('allowBackup', $AndroidNs, 'false')");contains(prepPs,'allowBackup=\"false\"');return'sauvegarde explicite Holophone uniquement'});
test('BiometricPrompt correct',()=>{contains(secure,'android.hardware.biometrics.BiometricPrompt');assert(!secure.includes('android.app.BiometricPrompt'),'ancien import BiometricPrompt');return'import Android correct'});
test('onResume public',()=>{regex(main,/public\s+void\s+onResume\s*\(/);return'visibilité correcte'});
test('Braindance isolée via generateContent',()=>{contains(html,'generateContent');assert(!/cur\.ai\.push\([^\n]*\[BRAINDANCE STUDIO/i.test(html),'push brut Braindance détecté');contains(v2,'isBraindanceInternalAi');return'isolation active'});
test('Droits des interactions',()=>{contains(html,'actionUsableBy');contains(html,"actors:'both'");contains(html,"actionUsableBy(x,'character')");return'garde-fous présents'});
test('5 thèmes UI',()=>{['original','wallace','redblue','bluegreen','red'].forEach(x=>contains(html,x+':{name:'));return'5 palettes'});
test('Identité VSim NeuroTek',()=>{contains(html,'Holophone™');contains(html,'VSim NeuroTek');contains(html,'VSNT');contains(html,'Connecting Minds &amp; Bytes');return'branding splash + à propos'});
test('Splash reste devant le métier jusqu’à la fin',()=>{contains(html,"if(revealAppAtEnd&&$('#app'))$('#app').classList.remove('preboot')");const early=html.indexOf("if(PIN.on&&PIN.code)lockNow()");const reveal=html.indexOf("$('#app').classList.remove('preboot')",early);assert(reveal<0||reveal>html.indexOf('async function startupRunVisible'),'révélation preboot trop tôt');return'voile métier conservé'});
test('PIN avant splash atomique',()=>{contains(html,'#app.preboot > :not(#lock):not(#startupSplash)');contains(html,'async function unlockWithStartup()');contains(html,'const el=startupRevealImmediate(false,true)');contains(html,"if(L)L.classList.remove('on')");assert(!html.includes('maybeRunStartupSplash(120)'),'ancien délai splash 120 ms encore présent');return'splash peint avant retrait du verrou'});
test('Biométrie utilise la transition atomique',()=>{contains(v2,'window.holoUnlockAfterAuth');assert(!v2.includes('maybeRunStartupSplash(120)'),'ancien chemin biométrique différé');return'biométrie alignée sur le PIN'});
test('Préparation restaure le patch notification',()=>{contains(prep,'SoundResolver.kt');contains(prep,'npx cap sync android');return'patch natif persistant'});
test('configure-android sans Set-Content UTF8',()=>{assert(!/Set-Content[^\n]*-Encoding\s+UTF8/i.test(config),'Set-Content UTF8 peut réintroduire un BOM');return'écriture no-BOM requise'});
test('Release sans remplacement ambigu $1/$133',()=>{assert(!/replacement.*\$1/i.test(releaseSafe),'remplacement $1 ambigu');contains(releaseSafe,'Write-Utf8NoBom');contains(releaseSafe,'versionCode : $codeMatches');return'édition par position + vérification'});
test('Fichiers stabilité présents',()=>{['www/js/holophone-stability.js','TESTER_STABLE_3.1.3.cmd','RELEASE.cmd'].forEach(p=>assert(exists(p),'absent: '+p));return'outillage présent'});



test('Logo VSNT définitif animé intégré',()=>{
  ['vsntcenter','vsnthandleft','vsnthandright','vsntouter','vsnthalowide','vsnthalocore'].forEach(x=>contains(html,x));
  contains(html,'A 60 60 0 0 0 135.4 144.1');
  contains(html,'A 60 60 0 0 1 224.6 144.1');
  contains(html,'A 116 116 0 1 1 265.5 216.8');
  contains(html,'startupRestartVsntAnimation');
  return'géométrie Concept 03 v7 + replay';
});
test('4 styles de splash recolorent VSNT',()=>{
  contains(html,'--vsnt-accent:#efae52');
  contains(html,'.startup[data-style="wallace"]{--vsnt-accent:#efd7ab');
  contains(html,'.startup[data-style="minimal"]{--vsnt-accent:#d9eeee');
  contains(html,'.startup[data-style="cyber"]{--vsnt-accent:#ff303d');
  return'classique / Wallace / minimal / cyber';
});
test('Animation VSNT a le temps de finir',()=>{contains(html,'const VSNT_SPLASH_ANIMATION_MS=5980');contains(html,'const animDone=wait(VSNT_SPLASH_ANIMATION_MS)');contains(html,'await animDone');return'minimum animation complet';});
test('À propos utilise le logo orange définitif',()=>{contains(html,'src="media/vsnt-logo-full.png"');assert(exists('www/media/vsnt-logo-full.png'),'logo complet absent');contains(html,'Connecting Minds &amp; Bytes');return'logo raster fourni + slogan définitif';});
test('Catalogue vidéo / musique transactionnel',()=>{
  contains(html,"const MEDIA_CATALOG_IDB_KEY='meta_media_catalog_v1'");
  contains(html,'async function persistMediaCatalog');
  contains(html,'async function mediaCatalogHydrate');
  contains(html,'await mediaCatalogWriteFor(c)');
  contains(html,'await mediaCatalogHydrate()');
  return'copie contacts + IndexedDB + relecture';
});
test('Ajouts vidéo / musique vérifient la persistance',()=>{
  contains(html,"flash($('#musMsg'),'Ajouté et vérifié dans le stockage local.");
  contains(html,"flash($('#bdMsg'),'Ajouté et vérifié dans le stockage local.");
  contains(html,'await persistMediaCatalog(c);buildMus()');
  contains(html,'await persistMediaCatalog(c);buildBD()');
  return'rollback UI en cas d’échec';
});
test('Sauvegarde restaure aussi le catalogue média dédié',()=>{contains(html,'await mediaCatalogSyncAll();await saveConvs()');contains(html,'c.bd=c.bd||[];c.mus=c.mus||[]');return'restauration synchronisée';});
test('Catalogue média dédié n’est pas vu comme orphelin',()=>{contains(html,'ids.add(MEDIA_CATALOG_IDB_KEY)');return'clé metadata référencée';});
test('Sources branding VSNT conservées',()=>{['assets/branding/vsnt-mark-white-source.png','assets/branding/vsnt-logo-full-source.png','assets/branding/VSNT_logo_concept3_v7.html','assets/branding/VSNT_logo_concept3_v7_HANDOFF.md'].forEach(p=>assert(exists(p),'absent: '+p));return'handoff + sources';});
test('Icône Android VSNT transparente',()=>{
  ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'].forEach(d=>['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'].forEach(f=>assert(exists(`android/app/src/main/res/mipmap-${d}/${f}`),'absent '+d+'/'+f)));
  const bg=read('android/app/src/main/res/values/ic_launcher_background.xml');contains(bg,'#00000000');
  ['mipmap-anydpi-v26/ic_launcher.xml','mipmap-anydpi-v26/ic_launcher_round.xml','mipmap-anydpi-v33/ic_launcher.xml','mipmap-anydpi-v33/ic_launcher_round.xml'].forEach(p=>assert(exists('android/app/src/main/res/'+p),'absent '+p));
  const png=fs.readFileSync(path.join(root,'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'));
  assert(png.slice(1,4).toString()==='PNG','launcher non PNG');assert(png[25]===6,'launcher attendu en RGBA PNG');
  return'legacy + adaptive + alpha';
});

test('Présence Persona persistante',()=>{contains(v2,'const PRESENCE_VERSION=1');contains(v2,'function presenceUpdate');contains(v2,'function presenceBlock');contains(v2,'window.holoPresenceInitiative');return'présence + initiative'});
test('Écran Vie du personnage',()=>{contains(html,'id="screenPresence"');contains(html,'id="goPresence"');contains(v2,"textContent='Vie de '+(c.first||'Persona')");return'UI dynamique'});
test('Santé accepte les messages Refuge',()=>{contains(stable,"['character','v','sys','refuge']");return'faux positif supprimé'});
test('Santé accepte le jingle intégré en notification',()=>{contains(stable,"new Set(['builtin',...tracks.map");return'builtin valide'});
test('Inventaire médias référence la bibliothèque audio',()=>{contains(html,'AUDIO_BLOB_PREFIX+t.id');return'MP3 non orphelins'});
test('Cadence snapshots cohérente',()=>{contains(stable,"age<7*3600000");return'seuil santé > cadence 6 h'});

// Compile tous les scripts inline classiques sans les exécuter.
test('Syntaxe JavaScript inline',()=>{
  const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m,n=0;
  while((m=re.exec(html))){n++;new Function(m[1])}
  assert(n>0,'aucun script inline');return n+' bloc(s) compilé(s)';
});
test('Syntaxe JS externes',()=>{new Function(stable);new Function(v2);return'OK'});

// Détecte les BOM qui ont déjà cassé Gradle/PowerShell dans le passé.
test('Pas de BOM dans Gradle/properties critiques',()=>{
  const files=['android/variables.gradle','android/build.gradle','android/app/build.gradle','android/gradle.properties','scripts/configure-android.ps1','scripts/prepare-android-v20.ps1'];
  const bad=[];for(const f of files){const b=fs.readFileSync(path.join(root,f));if(b.length>=3&&b[0]===0xef&&b[1]===0xbb&&b[2]===0xbf)bad.push(f)}
  assert(!bad.length,'BOM: '+bad.join(', '));return files.length+' fichiers contrôlés';
});

const failed=results.filter(x=>!x.ok);
console.log('');
console.log('HOLOPHONE 3.1.3 — RECETTE STATIQUE');
console.log('===================================');
for(const r of results)console.log((r.ok?'[OK]  ':'[KO]  ')+r.name+(r.detail?' — '+r.detail:''));
console.log('');
console.log(`${results.length-failed.length}/${results.length} contrôles OK`);
if(failed.length){console.error(`${failed.length} contrôle(s) en échec.`);process.exit(1)}
