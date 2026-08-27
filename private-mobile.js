(()=>{
  'use strict';
  const isMobile=()=>Boolean(globalThis.TestPlatform?.isIPadOrIPhone || /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  let scheduled=false,verifyStarted=false;

  const maybeVerify=async()=>{
    if(isMobile()||verifyStarted||!globalThis.TestPdfEngine?.ready||!globalThis.PdfImporter?.verifyEngine)return;
    verifyStarted=true;
    apply();
    try{await globalThis.PdfImporter.verifyEngine();}finally{apply();}
  };

  const apply=()=>{
    scheduled=false;
    const mobile=isMobile(),platform=mobile?'ipad':'mac';
    document.documentElement.dataset.testPlatform=platform;
    const b=document.getElementById('importBtn');
    if(b){
      if(mobile){
        b.textContent='Importar PDF en el Mac';b.disabled=true;b.title='En el iPad los PDF se importan en el Mac. Después carga la biblioteca maestra desde iCloud Drive.';b.setAttribute('aria-disabled','true');
      }else if(globalThis.TestPdfEngine?.selfTestPassed){
        b.textContent='+ Importar PDF';b.disabled=false;b.removeAttribute('aria-disabled');b.title='Importador verificado con un PDF real interno. El PDF seleccionado se procesa en este navegador.';
      }else if(globalThis.TestPdfEngine?.ready){
        b.textContent='Comprobando importador PDF…';b.disabled=true;b.setAttribute('aria-disabled','true');b.title='La aplicación está verificando extracción y parser con un PDF interno.';
      }else if(globalThis.TestPdfEngine?.error){
        b.textContent='Importador PDF no disponible';b.disabled=true;b.setAttribute('aria-disabled','true');b.title=globalThis.TestPdfEngine.error;
      }else{
        b.textContent='Cargando importador PDF…';b.disabled=true;b.setAttribute('aria-disabled','true');
      }
    }
    const desired=mobile
      ? '<strong>Modo iPad:</strong> GitHub Pages contiene sólo el programa. Carga tu biblioteca desde iCloud Drive; la importación de PDF está desactivada aquí.'
      : globalThis.TestPdfEngine?.selfTestPassed
        ? '<strong>Modo Mac:</strong> importador PDF verificado (PDF real 4/4). Puedes importar y después guardar la biblioteca maestra en iCloud Drive.'
        : '<strong>Modo Mac:</strong> la importación se habilita sólo después de superar el autotest real del motor PDF.';
    document.querySelectorAll('.install-note').forEach(n=>{if(n.innerHTML!==desired)n.innerHTML=desired;});
    maybeVerify();
  };

  const scheduleApply=()=>{if(scheduled)return;scheduled=true;queueMicrotask(apply);};
  new MutationObserver(scheduleApply).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('test-pdf-engine-ready',scheduleApply);
  window.addEventListener('test-pdf-selftest-ready',scheduleApply);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleApply,{once:true}); else scheduleApply();
})();
