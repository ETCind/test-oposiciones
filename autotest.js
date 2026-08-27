(async()=>{
 const R=document.getElementById('results'),checks=[];const add=(n,ok,detail='')=>checks.push({n,ok,detail});
 try{
  const mobile=Boolean(globalThis.TestPlatform?.isIPadOrIPhone || /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  add('HTTPS y contexto seguro',location.protocol==='https:'&&window.isSecureContext,location.protocol+'//'+location.host);
  add('IndexedDB disponible',!!window.indexedDB);
  add('File API disponible',!!window.File&&!!Blob.prototype.text);
  add('Service Worker disponible','serviceWorker' in navigator);
  await TestDB.openDB();await TestDB.put('settings',{key:'__selftest',value:'ok'});const v=await TestDB.get('settings','__selftest');add('Lectura/escritura local',v?.value==='ok');await TestDB.remove('settings','__selftest');
  let total=0,bad=0;for(const t of SEED_LIBRARY){for(const q of t.questions){total++;if(TestParserCore.questionProblems(q,q.correct).length)bad++;}}add('Sin preguntas publicadas',total===0&&bad===0,'La biblioteca llega desde tu archivo de iCloud');
  const sampleTests=[{id:'autotest-1',title:'Autotest',topic:'Autotest',questions:[{n:1,question:'Pregunta de prueba',options:{A:'Uno',B:'Dos',C:'Tres',D:'Cuatro'},correct:'A'}]}],sampleHistory=[{testId:'autotest-1',score:100,correct:1,total:1,date:new Date().toISOString()}];const master=await TestSyncCore.makeMaster({tests:sampleTests,history:sampleHistory,libraryId:'autotest-library',revision:7,originDevice:'autotest-device',appBuild:'ghsafe-v3-audited-20260827'});const mv=await TestSyncCore.validateMaster(master);add('Biblioteca maestra iCloud',mv.ok&&mv.checksumValid&&mv.stats.tests===1&&mv.stats.results===1,'Checksum '+(mv.checksumValid?'OK':'FALLO'));
  const corrupt=JSON.parse(JSON.stringify(master));corrupt.payload.tests[0].title+=' alterado';const cv=await TestSyncCore.validateMaster(corrupt);add('Detecta biblioteca alterada',!cv.ok&&cv.errors.some(x=>x.includes('integridad')));
  const html=TestReportCore.buildPrintHTML({test:sampleTests[0],details:[{q:sampleTests[0].questions[0],answer:'A',ok:true}],correct:1,wrong:0,blank:0,total:1,answered:1,percentTotal:100,date:new Date()},'full');add('Motor de informes',html.includes('Pregunta de prueba')&&html.includes('Correcta'));
  const opts=PdfImporter.securityOptions||{};add('PDF endurecido',opts.isEvalSupported===false&&opts.enableScripting===false&&opts.enableXfa===false,'eval OFF · scripting OFF · XFA OFF');
  if(mobile){add('Importación PDF desactivada en iPad',true,'Los PDF se importan en el Mac');}
  else{
    if(!globalThis.TestPdfEngine?.ready){const start=Date.now();while(Date.now()-start<12000&&!globalThis.TestPdfEngine?.ready&&!globalThis.TestPdfEngine?.error){await new Promise(r=>setTimeout(r,200));}}
    add('Motor PDF actual y parcheado',globalThis.TestPdfEngine?.ready&&String(globalThis.TestPdfEngine.version)==='6.2.108',globalThis.TestPdfEngine?.ready?'PDF.js '+globalThis.TestPdfEngine.version+' · build legacy Safari':(globalThis.TestPdfEngine?.error||'No cargado'));
    if(globalThis.TestPdfEngine?.ready){
      const iv=await PdfImporter.verifyEngine();
      add('Importación PDF real de extremo a extremo',iv.ok,iv.ok?(iv.detail||'4/4 preguntas y 4/4 soluciones'):(iv.reason||'Fallo de autotest'));
      add('Ruta Safari sin getTextContent',typeof PdfImporter.readTextContentSafe==='function','streamTextContent().getReader()');
    }
  }
 }catch(e){add('Ejecución sin excepción',false,e.message||String(e));}
 const fail=checks.filter(x=>!x.ok);R.innerHTML='<h2>'+(fail.length?'⚠️ Hay fallos':'✅ Todo correcto')+'</h2>'+checks.map(x=>'<div class="statline"><span>'+x.n+(x.detail?'<br><small class="muted">'+x.detail+'</small>':'')+'</span><strong class="'+(x.ok?'good-text':'bad-text')+'">'+(x.ok?'OK':'FALLO')+'</strong></div>').join('')+'<p class="muted small" style="margin-top:16px">'+navigator.userAgent+'</p>';document.title=(fail.length?'FALLO':'OK')+' · Autotest seguro v3 auditado';
})();
