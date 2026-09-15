'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const buf=p=>fs.readFileSync(path.join(root,p));
const exists=p=>fs.existsSync(path.join(root,p));
const results=[];
function test(name,fn){try{const detail=fn();results.push({name,ok:true,detail:detail||''})}catch(e){results.push({name,ok:false,detail:e.message})}}
function assert(c,m){if(!c)throw new Error(m)}
function contains(t,n,m){assert(t.includes(n),m||('absent: '+n))}
function regex(t,r,m){assert(r.test(t),m||('motif absent: '+r))}

const html=read('www/index.html'),v2=read('www/js/holophone-v2.js'),stable=read('www/js/holophone-stability.js'),i18n=read('www/js/holophone-i18n.js');
const main=read('scripts/patches/android/MainActivity.java'),privacy=read('scripts/patches/android/PrivacyControlPlugin.java');
const prep=read('02_PREPARER_ANDROID_STUDIO.cmd'),prepPs=read('scripts/prepare-android-v20.ps1'),releaseSafe=read('scripts/release-safe.ps1');
const sound=read('scripts/patches/local-notifications/SoundResolver.kt'),manifest=read('android/app/src/main/AndroidManifest.xml');
const fr=JSON.parse(read('www/lang/fr-FR.json')),en=JSON.parse(read('www/lang/en.json')),tpl=JSON.parse(read('www/lang/language-pack.template.json'));

test('Version web 3.3.1',()=>{contains(html,"const APPV='3.3.1'");contains(v2,"version: '3.3.1'");contains(stable,"const STABLE_VERSION = '3.3.1'");return'APPV, V2, stabilité'});
test('Schéma structuré reste 3200',()=>{contains(stable,'const SCHEMA_VERSION = 3200');contains(stable,'living-continuity-3.2.0');return'aucune migration persona inutile'});
test('I18n chargé avant le runtime principal',()=>{const a=html.indexOf('js/holophone-i18n.js'),b=html.indexOf('/* ===================== STOCKAGE');assert(a>0&&b>a,'ordre i18n invalide');return'bootstrap avant UI'});
test('Français est le défaut explicite',()=>{contains(i18n,"active:'fr-FR'");contains(i18n,"localStorage.getItem(ACTIVE_KEY)||'fr-FR'");return'fr-FR'});
test('Packs Français et English embarqués',()=>{assert(fr.meta.code==='fr-FR','fr code');assert(en.meta.code==='en','en code');assert(Object.keys(fr.strings).length>=30,'pack FR trop petit');assert(Object.keys(en.strings).length>=30,'pack EN trop petit');return`${Object.keys(en.legacyText||{}).length} traductions legacy EN`});
test('Fallback final vers le Français',()=>{contains(i18n,"(fr.strings&&fr.strings[key])");contains(i18n,'frPack()');return'clé manquante tolérée'});
test('Packs communautaires importables',()=>{contains(i18n,'async function importPack');contains(i18n,'validatePack');contains(i18n,'1048576');contains(html,'id="langFile"');return'JSON <= 1 MiB'});
test('Packs intégrés non remplaçables',()=>{contains(i18n,"throw new Error('Les packs intégrés Français/English ne peuvent pas être remplacés')");return'base protégée'});
test('Language screen présent',()=>{['screenLanguage','goLanguage','langList','langImport','langTemplate'].forEach(id=>contains(html,'id="'+id+'"'));return'Réglages > Application > Langue'});
test('Template et guide contributeurs présents',()=>{assert(exists('LANGUAGE_PACK_GUIDE.md'),'guide absent');assert(exists('language-pack.template.json'),'template racine absent');assert(exists('www/lang/language-pack.template.json'),'template runtime absent');assert(tpl.meta.holophoneMinVersion==='3.3.0','template version');return'GitHub ready'});
test('Ancienne UI couverte par compat legacyText',()=>{contains(i18n,'legacyText');contains(i18n,'MutationObserver');assert(Object.keys(en.legacyText).length>=100,'couverture anglaise legacy insuffisante');return'UI historique traduisible sans réécriture totale'});
test('Attributs UI traduisibles',()=>{contains(i18n,"['placeholder','title','aria-label']");assert(Object.keys(en.legacyAttrs).length>=4,'legacyAttrs vide');return'placeholders + accessibilité'});
test('Langue active persistante',()=>{contains(i18n,"const ACTIVE_KEY='v7.language'");contains(i18n,'localStorage.setItem(ACTIVE_KEY,code)');return'persistant'});
test('Packs communautaires persistants',()=>{contains(i18n,"const CUSTOM_KEY='v7.languagePacks'");contains(i18n,'saveCustom()');return'localStorage'});
test('Sauvegarde inclut langue et packs',()=>{contains(html,'language:window.HolophoneI18n?window.HolophoneI18n.exportState():null');contains(html,'window.HolophoneI18n.importState(o.language)');return'backup/restore'});
test('À propos utilise la langue globale',()=>{contains(html,"window.HolophoneI18n.setLanguage('fr-FR')");contains(html,"window.HolophoneI18n.setLanguage('en')");assert(!html.includes("const ABOUT_LANG_KEY='v7.aboutLang'"),'ancien réglage About indépendant');return'drapeaux = raccourci global'});
test('À propos VSNT conservé',()=>{['Synthetic Presence Systems','Adaptive Persona Interface','Persona Runtime','Memory Fabric','Temporal Engine','Interaction Layer','Initiative Core','Privacy Architecture'].forEach(x=>contains(html,x));contains(html,'media/vsnt-logo-full.png');return'branding 3.2.3 intact'});
test('Header À propos centré 3 cm intact',()=>{contains(html,'width:114px;height:114px');contains(html,'width:48px;height:34px');contains(html,'class="aboutfloatinghead"');return'logo + drapeaux'});

test('Config confidentialité persistante',()=>{contains(html,"let PRIVACYCFG={anonymousNotifications:true,recentsPreview:'auto'}");contains(html,"Store.set('v7.privacy'");return'défauts prudents'});
test('Notifications anonymes activées par défaut',()=>{contains(html,'PRIVACYCFG.anonymousNotifications=PRIVACYCFG.anonymousNotifications!==false');contains(html,"title:'Holophone'");return'opt-out explicite'});
test('Notifications nominatives utilisent la persona configurée',()=>{contains(html,"const title=characterName(ct)||'Persona'");contains(html,'privacyNotificationPayload(ct,o.m,count)');return'aucun prénom codé en dur'});
test('Aperçu récents Auto dépend du PIN',()=>{contains(html,"if(PRIVACYCFG.recentsPreview==='show')return true");contains(html,"if(PRIVACYCFG.recentsPreview==='hide')return false");contains(html,'return !(PIN.on&&PIN.code)');return'auto = PIN -> masqué'});
test('UI confidentialité sous Verrouillage',()=>{['privacyAnon','privacyRecentsChoices','privacyAutoTitle','privacyHideTitle','privacyShowTitle'].forEach(id=>contains(html,'id="'+id+'"'));return'anonyme + auto/masquer/afficher'});
test('PrivacyControl natif enregistré',()=>{contains(main,'registerPlugin(PrivacyControlPlugin.class)');contains(privacy,'@CapacitorPlugin(name = "PrivacyControl")');return'bridge Capacitor'});
test('Android 13+ contrôle screenshot récents',()=>{contains(privacy,'setRecentsScreenshotEnabled(visible)');contains(privacy,'Build.VERSION_CODES.TIRAMISU');return'API 33+'});
test('Android ancien contrôle FLAG_SECURE',()=>{contains(privacy,'clearFlags(WindowManager.LayoutParams.FLAG_SECURE)');contains(privacy,'addFlags(WindowManager.LayoutParams.FLAG_SECURE)');return'API 24-32'});
test('Démarrage natif reste privé avant chargement JS',()=>{contains(main,'protectRecentsPreview();');contains(main,'setRecentsScreenshotEnabled(false)');return'pas de fuite au boot'});
test('Confidentialité réappliquée au retour app',()=>{contains(html,'await applyPrivacyNative();\n  await collectPushes()');return'resume lifecycle'});
test('PIN set/off recalcule l’aperçu',()=>{contains(html,'PIN.on=true;await savePin();await applyPrivacyNative()');contains(html,"PIN.on=false;PIN.code='';await savePin();await applyPrivacyNative()");return'immédiat'});
test('Sauvegarde inclut confidentialité',()=>{contains(html,'privacy:privacyNormalize()');contains(html,"if(o.privacy&&typeof o.privacy==='object')");return'backup/restore'});
test('Rollback sauvegarde couvre langue/confidentialité',()=>{contains(stable,'privacy:(typeof PRIVACYCFG');contains(stable,'language:(window.HolophoneI18n');contains(stable,'window.HolophoneI18n.importState(cp.language)');return'transactionnel'});

test('Plein écran immersif conservé',()=>{contains(main,'WindowCompat.setDecorFitsSystemWindows(getWindow(), false)');contains(main,'WindowInsetsCompat.Type.systemBars()');contains(main,'BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE');return'edge-to-edge'});
test('Safe areas CSS conservées',()=>{contains(html,'safe-area-inset-top');contains(html,'safe-area-inset-bottom');return'poinçon protégé'});
test('Backup Android système désactivé',()=>{contains(manifest,'android:allowBackup="false"');return'backup explicite seulement'});
test('Préparation restaure MainActivity et Privacy plugin',()=>{contains(prepPs,'MainActivity immersif restaure');contains(prepPs,'PrivacyControlPlugin restaure');contains(prepPs,'PrivacyControlPlugin.java');return'cap sync résilient'});
test('Release exige le plugin privacy canonique',()=>{contains(releaseSafe,"patches\\android\\PrivacyControlPlugin.java");contains(releaseSafe,'$PrivacyPatch');return'release sûre'});
test('Release 3.3.1 / code 52',()=>{contains(read('RELEASE.cmd'),'VERSION_NAME=3.3.1');contains(read('RELEASE.cmd'),'VERSION_CODE=52');contains(read('RELEASE_3.3.1.cmd'),'3.3.1 52');return'version Android'});
test('Outillage 3.3.1 présent',()=>{['TESTER_STABLE_3.3.1.cmd','RELEASE_3.3.1.cmd','scripts/test-stable-v331.js'].forEach(p=>assert(exists(p),'absent: '+p));return'OK'});


test('Spotify composer garde la Persona en portée',()=>{
 const a=html.indexOf('function musComposer(){'),b=html.indexOf('/* =====================',a+30);const x=html.slice(a,b>0?b:a+9000);
 contains(x,'const c=C();');contains(x,"send.textContent=t.kind==='playlist'?'Partager à '+characterName(c):'Envoyer à '+characterName(c)");
 return'clic résultat sans ReferenceError c';
});
test('Renderer Refuge garde la Persona en portée',()=>{
 const a=html.indexOf('function drawMsg(m,instant){'),b=html.indexOf('function ',a+30);const x=html.slice(a,b>0?b:a+8000);
 contains(x,"const c=(cur&&CONTACTS.find(x=>x.id===cur.cid))||C();");contains(x,"'⌂ proposition à '+characterName(c)");
 return'proposition sans ReferenceError c';
});
test('Événement Refuge auto ne coupe plus un tour utilisateur',()=>{
 const a=html.indexOf('async function aiTurn(){'),b=html.indexOf('async function ',a+30);const x=html.slice(a,b>0?b:a+18000);
 assert(!x.includes('maybeRefugeAutoEvent(c,conv)'),'injection Refuge encore présente dans aiTurn');contains(x,'un événement Refuge automatique ne doit jamais s\'intercaler');
 return'message utilisateur reste le dernier input du tour';
});
test('Sortie Persona interdit explicitement la narration',()=>{
 const a=v2.indexOf('function outputRules(c){'),b=v2.indexOf('sysPrompt=function',a);const x=v2.slice(a,b);
 contains(x,'m contient uniquement les messages que tu tapes et envoies');contains(x,'Pas de narration');contains(x,'utilise uniquement le champ act');
 return'chat = messages, gestes = act';
});
test('Activité de vie reste un contexte silencieux',()=>{
 const a=v2.indexOf('function presenceBlock(c,conv){'),b=v2.indexOf('function presenceInitiative',a);const x=v2.slice(a,b);
 contains(x,'contexte silencieux');contains(x,'ne la transforme pas spontanément en récit de ce que tu fais');
 return'continuité sans commentaire permanent';
});
test('Initiatives ne choisissent plus la vie comme sujet automatique',()=>{
 assert(!v2.includes("category='life'"),'catégorie life encore active');
 assert(!html.includes("Avant d'écrire, pars si possible d'un détail ordinaire déjà présent dans ta continuité de vie"),'ancienne consigne spontaneous');
 assert(!html.includes("Si ton activité ou un petit événement récent t'offre une vraie raison d'écrire"),'ancienne consigne planPushes');
 return'vie influence état, pas sujet par défaut';
});
test('Fonction auto Refuge conservée mais découplée des réponses utilisateur',()=>{
 contains(html,'async function maybeRefugeAutoEvent(c,conv)');contains(html,'async function refugeInjectEvent(c,conv,manual)');
 return'fonction disponible pour future orchestration idle';
});

test('Sauvegarde v12 + checksum',()=>{contains(html,"app:'holophone-backup',v:12");contains(stable,'sha256Text');return'intégrité'});
test('Snapshots v4 conservés',()=>{contains(v2,"app:'holophone-auto-snapshot',v:4,schemaVersion:3200");return'continuité 3.2'});
test('Catalogue média transactionnel conservé',()=>{contains(html,"const MEDIA_CATALOG_IDB_KEY='meta_media_catalog_v1'");contains(html,'async function persistMediaCatalog');return'3.1.3'});
test('Import MP3 FileList corrigé conservé',()=>{contains(html,'Array.from((e.target&&e.target.files)||[])');return'pas de régression WebView'});
test('Sons notification privés conservés',()=>{contains(sound,'resolveFromPrivateFiles');contains(sound,'ln_sounds');return'patch natif'});
test('Braindance stateless conservée',()=>{contains(html,'generateContent');contains(v2,'isBraindanceInternalAi');return'isolation'});
test('Présence / continuité vivante conservée',()=>{contains(v2,'function emotionSync');contains(v2,'function initiativeDecision');contains(v2,'function lifeTrail');return'3.2'});
test('Zéro prénom historique codé en dur',()=>{const old=String.fromCharCode(106,117,100,121),re=new RegExp('\\b'+old+'\\b','i');for(const [n,t] of [['html',html],['v2',v2],['stable',stable],['i18n',i18n],['main',main],['privacy',privacy]])assert(!re.test(t),n+' contient ancien prénom');return'Persona dynamique'});
test('BiometricPrompt Android correct',()=>{const secure=read('android/app/src/main/java/com/mudva/lumen/SecureStorePlugin.java');contains(secure,'android.hardware.biometrics.BiometricPrompt');assert(!secure.includes('android.app.BiometricPrompt'),'ancien import');return'OK'});
test('onResume reste public',()=>{regex(main,/public\s+void\s+onResume\s*\(/);return'OK'});
test('allowBackup=false maintenu par préparation',()=>{contains(prepPs,'allowBackup="false"');contains(read('scripts/configure-android.ps1'),"SetAttribute('allowBackup', $AndroidNs, 'false')");return'OK'});
test('Release PowerShell sans écriture BOM',()=>{contains(releaseSafe,'Write-Utf8NoBom');assert(!/Set-Content[^\n]*-Encoding\s+UTF8/i.test(read('scripts/configure-android.ps1')),'Set-Content UTF8');return'UTF-8 no BOM'});
test('Syntaxe JS inline',()=>{const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m,n=0;while((m=re.exec(html))){n++;new Function(m[1])}assert(n>0,'aucun inline');return n+' blocs'});
test('Syntaxe JS externes',()=>{new Function(stable);new Function(v2);new Function(i18n);return'OK'});
test('JSON packs valides',()=>{[fr,en,tpl].forEach(o=>assert(o.meta&&o.strings,'pack incomplet'));return'FR + EN + template'});
test('Pas de BOM fichiers critiques',()=>{const files=['android/variables.gradle','android/build.gradle','android/app/build.gradle','android/gradle.properties','scripts/configure-android.ps1','scripts/prepare-android-v20.ps1','www/lang/fr-FR.json','www/lang/en.json'];const bad=[];for(const f of files){const b=buf(f);if(b.length>=3&&b[0]===0xef&&b[1]===0xbb&&b[2]===0xbf)bad.push(f)}assert(!bad.length,'BOM: '+bad.join(', '));return files.length+' fichiers'});

const failed=results.filter(x=>!x.ok);
console.log('\nHOLOPHONE 3.3.1 — RECETTE STATIQUE\n===================================');
for(const r of results)console.log((r.ok?'[OK]  ':'[KO]  ')+r.name+(r.detail?' — '+r.detail:''));
console.log(`\n${results.length-failed.length}/${results.length} contrôles OK`);
if(failed.length){console.error(`${failed.length} contrôle(s) en échec.`);process.exit(1)}
