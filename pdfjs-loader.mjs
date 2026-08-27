const isIPadOrIPhone = /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
globalThis.TestPlatform = Object.freeze({ isIPadOrIPhone, isMacLike: !isIPadOrIPhone && /Mac/i.test(navigator.platform || navigator.userAgent) });

if (!isIPadOrIPhone) {
  try {
    const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs';
    globalThis.pdfjsLib = pdfjsLib;
    globalThis.TestPdfEngine = Object.freeze({
      ready: true,
      version: pdfjsLib.version || '6.2.108',
      source: 'pdfjs-dist@6.2.108',
      security: 'enableScripting=false; enableXfa=false; isEvalSupported=false'
    });
  } catch (error) {
    console.error('No se pudo cargar PDF.js 6.2.108', error);
    globalThis.TestPdfEngine = Object.freeze({ready:false, error:String(error && error.message || error)});
  }
} else {
  globalThis.TestPdfEngine = Object.freeze({ready:false, mobileDisabled:true});
}
window.dispatchEvent(new CustomEvent('test-pdf-engine-ready', {detail: globalThis.TestPdfEngine}));
