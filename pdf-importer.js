(()=>{
'use strict';
const C=window.TestParserCore;
const clean=C.clean;
function tokenFromItem(item,pageHeight){
  const tr=item.transform||[1,0,0,1,0,0],x=Number(tr[4]||0),baseY=Number(tr[5]||0),h=Math.max(1,Number(item.height||Math.hypot(tr[2]||0,tr[3]||0)||10)),w=Math.max(0,Number(item.width||0));
  const top=pageHeight-baseY-h;
  return {text:clean(item.str),x,x1:x+w,y:top+h/2,top,height:h,width:w,hasEOL:!!item.hasEOL};
}
function joinTokens(tokens){
  tokens=tokens.slice().sort((a,b)=>a.x-b.x);let s='',lastX=null;
  for(const t of tokens){if(!t.text)continue;if(s&&lastX!=null&&t.x-lastX>0.8)s+=' ';s+=t.text;lastX=Math.max(lastX??-Infinity,t.x1||t.x);}
  return clean(s);
}
function groupRows(tokens,tol=3.4){
  const sorted=tokens.filter(t=>t.text).slice().sort((a,b)=>a.y-b.y||a.x-b.x),rows=[];
  for(const tok of sorted){let best=null,bestD=Infinity;for(let i=rows.length-1;i>=Math.max(0,rows.length-8);i--){const d=Math.abs(rows[i].y-tok.y);if(d<=tol&&d<bestD){best=rows[i];bestD=d;}}
    if(!best){best={y:tok.y,tokens:[]};rows.push(best);}best.tokens.push(tok);best.y=(best.y*(best.tokens.length-1)+tok.y)/best.tokens.length;
  }
  for(const r of rows)r.tokens.sort((a,b)=>a.x-b.x);return rows.sort((a,b)=>a.y-b.y);
}
function linesFromRows(rows,pageHeight){return rows.map(r=>{const text=joinTokens(r.tokens);return {text,y:r.y,edge:/^\d{1,3}$/.test(text)&&(r.y<65||r.y>pageHeight-50)}}).filter(x=>x.text);}
function nativeLines(tokens,pageHeight,pageWidth){
  const out=[];let cur=[],cy=null,lastRight=null;
  const flush=()=>{if(!cur.length)return;const text=joinTokens(cur);if(text){const y=cur.reduce((a,t)=>a+t.y,0)/cur.length,x=Math.min(...cur.map(t=>t.x));out.push({text,y,x,edge:/^\d{1,3}$/.test(text)&&((y<70)||(y>pageHeight-90&&x>pageWidth*0.65))});}cur=[];cy=null;lastRight=null;};
  for(const tok of tokens){if(!tok.text)continue;const jumpY=cy!=null&&Math.abs(tok.y-cy)>4.2;const rewind=lastRight!=null&&tok.x<lastRight-24;if(cur.length&&(jumpY||rewind))flush();cur.push(tok);cy=cy==null?tok.y:(cy*(cur.length-1)+tok.y)/cur.length;lastRight=Math.max(lastRight??-Infinity,tok.x1||tok.x);if(tok.hasEOL)flush();}
  flush();return out;
}
function columnLines(tokens,pageWidth,pageHeight,count){
  const buckets=Array.from({length:count},()=>[]),wide=[];
  for(const t of tokens){const cx=(t.x+(t.x1||t.x))/2;const span=Math.max(0,(t.x1||t.x)-t.x);if(span>pageWidth*0.55){wide.push(t);continue;}let idx=Math.floor(cx/(pageWidth/count));idx=Math.max(0,Math.min(count-1,idx));buckets[idx].push(t);}
  const head=linesFromRows(groupRows(wide),pageHeight).filter(l=>l.y<125);
  const parts=buckets.map(b=>linesFromRows(groupRows(b),pageHeight));return head.concat(...parts);
}
async function extractPage(pdf,pageNo){
  const page=await pdf.getPage(pageNo),viewport=page.getViewport({scale:1}),tc=await page.getTextContent({normalizeWhitespace:false,disableCombineTextItems:false});
  const tokens=tc.items.map(i=>tokenFromItem(i,viewport.height)).filter(t=>t.text);
  if(tokens.length<2)return {pageNo,width:viewport.width,height:viewport.height,modes:{native:[],one:[],two:[],three:[]},rows:[],textItems:0};
  const rows=groupRows(tokens),one=linesFromRows(rows,viewport.height),native=nativeLines(tokens,viewport.height,viewport.width),two=columnLines(tokens,viewport.width,viewport.height,2),three=columnLines(tokens,viewport.width,viewport.height,3);
  // Some PDF generators place the page number first in content order, even though it is visually in the footer.
  const headHasTitle=native.slice(0,4).some(l=>C.isTitle(l.text));if(headHasTitle)native.slice(0,4).forEach(l=>{if(/^\d{1,3}$/.test(l.text))l.edge=true;});
  return {pageNo,width:viewport.width,height:viewport.height,modes:{native,one,two,three},rows:rows.map(r=>({y:r.y,tokens:r.tokens.map(t=>({text:t.text,x:t.x}))})),textItems:tokens.length};
}
async function extractPdf(file,onProgress){
  if(!window.pdfjsLib)throw new Error('No se ha podido cargar el motor PDF seguro. Comprueba la conexión del Mac y vuelve a intentarlo.');
  const data=new Uint8Array(await file.arrayBuffer());let task;
  try{task=window.pdfjsLib.getDocument({data,disableAutoFetch:false,disableStream:false,isEvalSupported:false,enableScripting:false,enableXfa:false});}catch(e){throw new Error('No se puede abrir el PDF: '+(e.message||e));}
  let pdf;try{pdf=await task.promise;}catch(e){if(e?.name==='PasswordException')throw new Error('El PDF está protegido con contraseña. Guarda una copia sin contraseña e impórtala de nuevo.');throw new Error('No se puede leer el PDF: '+(e.message||e));}
  const pages=[];let itemCount=0;
  for(let n=1;n<=pdf.numPages;n++){onProgress?.(n,pdf.numPages);const p=await extractPage(pdf,n);itemCount+=p.textItems;pages.push(p);}
  if(itemCount<8)throw new Error('El PDF parece ser un escaneo sin capa de texto. Esta versión no lo importa automáticamente para evitar errores de OCR.');
  return pages;
}
function titleFromFile(name){const base=String(name||'Test').replace(/\.pdf$/i,'').trim();const m=base.match(/test\s*n[ºo°]?\s*(\d+)/i);return m?`Test nº ${Number(m[1])}`:base;}
function slug(s){return C.norm(s).replace(/\s+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'test';}
function stableId(topic,title){return `${slug(topic)}::${slug(title)}`;}
async function processFile(file,topic,onProgress){
  const pages=await extractPdf(file,onProgress),analysis=C.analyze(pages),title=titleFromFile(file.name);
  return {...analysis,fileName:file.name,title,topic,id:stableId(topic,title),pagesMeta:{count:pages.length},processedAt:new Date().toISOString()};
}
window.PdfImporter={extractPdf,processFile,titleFromFile,stableId,securityOptions:Object.freeze({isEvalSupported:false,enableScripting:false,enableXfa:false})};
})();
