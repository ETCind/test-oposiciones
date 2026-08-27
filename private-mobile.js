(()=>{
  'use strict';
  const isMobile=()=>Boolean(globalThis.TestPlatform?.isIPadOrIPhone || /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  const apply=()=>{
    const mobile=isMobile();
    document.documentElement.dataset.testPlatform=mobile?'ipad':'mac';
    const b=document.getElementById('importBtn');
    if(b){
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
    document.querySelectorAll('.install-note').forEach(n=>{
      n.innerHTML=mobile
        ? '<strong>Modo iPad:</strong> GitHub Pages contiene sólo el programa. Carga tu biblioteca desde iCloud Drive; la importación de PDF está desactivada aquí.'
        : '<strong>Modo Mac:</strong> puedes importar PDF, hacer tests y guardar después la biblioteca maestra en iCloud Drive. El PDF seleccionado no se sube a GitHub.';
    });
  };
  new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('test-pdf-engine-ready',apply);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
})();
