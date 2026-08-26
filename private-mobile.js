(()=>{
  'use strict';
  const apply=()=>{
    const b=document.getElementById('importBtn');
    if(b){
      b.textContent='Importar PDF en el Mac';
      b.disabled=true;
      b.title='En el iPad los PDF se importan en el Mac y después se carga la biblioteca maestra desde iCloud Drive.';
      b.setAttribute('aria-disabled','true');
    }
    document.querySelectorAll('.install-note').forEach(n=>{
      n.innerHTML='<strong>Modo iPad:</strong> GitHub Pages aloja únicamente el programa vacío. Tus tests y resultados se cargan desde tu archivo de iCloud Drive y se guardan localmente en este dispositivo.';
    });
  };
  new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
})();
