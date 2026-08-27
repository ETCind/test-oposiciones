(()=>{
  'use strict';
  const isMobile=()=>Boolean(globalThis.TestPlatform?.isIPadOrIPhone || /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  let scheduled=false;
  const apply=()=>{
    scheduled=false;
    const mobile=isMobile();
    const platform=mobile?'ipad':'mac';
    if(document.documentElement.dataset.testPlatform!==platform){
      document.documentElement.dataset.testPlatform=platform;
    }

    const b=document.getElementById('importBtn');
    if(b && b.dataset.platformApplied!==platform){
      b.dataset.platformApplied=platform;
      if(mobile){
        b.textContent='Importar PDF en el Mac';
        b.disabled=true;
        b.title='En el iPad los PDF se importan en el Mac. Después carga la biblioteca maestra desde iCloud Drive.';
        b.setAttribute('aria-disabled','true');
      }else{
        b.textContent='+ Importar PDF';
        b.disabled=false;
        b.removeAttribute('aria-disabled');
        b.title='Los PDF se procesan en el navegador del Mac. El archivo PDF no se sube a GitHub.';
      }
    }

    const desired=mobile
      ? '<strong>Modo iPad:</strong> GitHub Pages contiene sólo el programa. Carga tu biblioteca desde iCloud Drive; la importación de PDF está desactivada aquí.'
      : '<strong>Modo Mac:</strong> puedes importar PDF, hacer tests y guardar después la biblioteca maestra en iCloud Drive. El PDF seleccionado no se sube a GitHub.';
    document.querySelectorAll('.install-note').forEach(n=>{
      if(n.dataset.platformApplied!==platform || n.innerHTML!==desired){
        n.dataset.platformApplied=platform;
        if(n.innerHTML!==desired)n.innerHTML=desired;
      }
    });
  };
  const scheduleApply=()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(apply);
  };
  new MutationObserver(scheduleApply).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('test-pdf-engine-ready',scheduleApply);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleApply,{once:true}); else scheduleApply();
})();
