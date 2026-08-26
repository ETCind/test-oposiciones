(()=>{
'use strict';
const Q_RE=/^\s*(\d{1,3})\s*(?:[-–—.)]|:)\s*(.*)$/;
const O_RE=/^\s*([A-Fa-f])\s*(?:[.)]|[-–—]|:)\s*(.*)$/;
const clean=s=>String(s??'').replace(/\u00ad/g,'').replace(/￾/g,'-').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[ \t]+/g,' ').trim();
const stripAccents=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const norm=s=>stripAccents(clean(s).toLowerCase()).replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

function stripRunningMatter(s){
  let t=clean(s);
  // Running headers/footers occasionally get glued to a question by column extraction.
  // Remove only suffixes that unmistakably identify the test itself.
  t=t.replace(/\s+ley\s+de\s+[^\n]{0,110}?test\s+n[ºo°]?\s*\d+(?:\s+\d+)?\s*$/i,'');
  t=t.replace(/\s+[A-ZÁÉÍÓÚÜÑ][^\n]{0,90}?[–—-]\s*test\s+n[ºo°]?\s*\d+(?:\s+\d+)?\s*$/i,'');
  t=t.replace(/\s+test\s+n[ºo°]?\s*\d+\s+[–—-]\s*[^\n]{0,100}$/i,'');
  return clean(t);
}
function isTitle(t){
  t=clean(t); if(!t)return true;
  if(/\btest\s+n[ºo°]?\s*\d+\b/i.test(t)&&!Q_RE.test(t))return true;
  if(/^test\s+n[ºo°]?\s*\d+\s*[–—-]/i.test(t))return true;
  if(/^ley\s+de\s+r[eé]gimen\s+jur[ií]dico.*test\s+n/i.test(t))return true;
  if(/^test\s+n[ºo°]?\s*\d+\s*$/i.test(t))return true;
  if(/^tema\s+\d+\s*:\s*t[ií]tulo\s+del\s+tema/i.test(t))return true;
  return false;
}
function solutionMarkerText(t){
  const u=clean(t).toUpperCase();
  if(!u||u.length>100)return false;
  return /\bPREG(?:UNTA)?S?\b/.test(u)&&/\b(?:SOL(?:UC(?:ION(?:ES)?)?)?|RESP(?:UESTA(?:S)?)?)\b/.test(u);
}
function answerHeaderOnly(t){return /^(?:SOL(?:UC(?:ION(?:ES)?)?)?|RESP(?:UESTA(?:S)?)?)$/i.test(clean(t));}
function questionHeaderOnly(t){return /^PREG(?:UNTA)?S?$/i.test(clean(t));}
function rowText(row){return clean((row.tokens||[]).map(x=>x.text).join(' '));}
function findMarker(pages){
  for(let p=0;p<pages.length;p++){
    const page=pages[p];
    for(const row of page.rows||[]){
      const rt=rowText(row);
      if(solutionMarkerText(rt))return {page:p,y:row.y};
      const toks=(row.tokens||[]).map(x=>clean(x.text).toUpperCase()).filter(Boolean);
      if(toks.some(questionHeaderOnly)&&toks.some(answerHeaderOnly))return {page:p,y:row.y};
    }
    for(const mode of Object.keys(page.modes||{})){
      const seq=page.modes[mode]||[];
      for(let i=0;i<seq.length;i++){
        const t=clean(seq[i].text??seq[i]);
        if(solutionMarkerText(t))return {page:p,y:seq[i].y??null};
        const next=i+1<seq.length?clean(seq[i+1].text??seq[i+1]):'';
        if((questionHeaderOnly(t)&&answerHeaderOnly(next))||(answerHeaderOnly(t)&&questionHeaderOnly(next)))return {page:p,y:seq[i].y??null};
      }
    }
  }
  for(let p=Math.max(0,pages.length-3);p<pages.length;p++){
    const pairs=solutionPairsPage(pages[p],null);
    let n=1; while(pairs[n])n++;
    if(n>=6)return {page:p,y:null,inferred:true};
  }
  return null;
}
function solutionPairsPage(page,minY){
  const found={};
  const put=(n,a)=>{n=Number(n);a=String(a||'').toUpperCase();if(n>0&&/^[A-F]$/.test(a)&&!found[n])found[n]=a};
  for(const row of page.rows||[]){
    if(minY!=null&&row.y<minY-2)continue;
    const txt=rowText(row);
    const re=/(?:^|\s)(\d{1,3})\s*[-.)]?\s*[:\-]?\s+([A-F])(?=\s|$)/gi;
    let m;while((m=re.exec(txt)))put(m[1],m[2]);
    const toks=(row.tokens||[]).map(x=>clean(x.text)).filter(Boolean);
    for(let i=0;i<toks.length;i++){
      const nm=toks[i].match(/^(\d{1,3})\s*[-.)]?$/);
      if(!nm)continue;
      for(let j=i+1;j<Math.min(i+4,toks.length);j++){
        if(/^[A-F]$/i.test(toks[j])){put(nm[1],toks[j]);break;}
        if(/^\d/.test(toks[j]))break;
      }
    }
  }
  for(const mode of Object.keys(page.modes||{})){
    const seq=page.modes[mode]||[];
    for(const x of seq){
      const txt=clean(x.text??x);
      const re=/(?:^|\s)(\d{1,3})\s*[-.)]?\s*[:\-]?\s+([A-F])(?=\s|$)/gi;
      let m;while((m=re.exec(txt)))put(m[1],m[2]);
    }
  }
  return found;
}
function parseSolutions(pages,marker){
  const start=marker?marker.page:Math.max(0,pages.length-3),found={};
  for(let p=start;p<pages.length;p++){
    const pairs=solutionPairsPage(pages[p],marker&&p===start?marker.y:null);
    for(const [n,a] of Object.entries(pairs))if(!found[n])found[n]=a;
  }
  // Sequence-state fallback. This ignores article-number columns by only accepting the next expected number.
  for(const mode of ['native','one','two','three']){
    let expected=1;const seqFound={};
    for(let p=start;p<pages.length;p++){
      const lines=(pages[p].modes&&pages[p].modes[mode])||[];
      let tokens=[];
      for(const l of lines){
        if(marker&&p===start&&marker.y!=null&&l.y!=null&&l.y<marker.y-2)continue;
        tokens=tokens.concat(clean(l.text??l).match(/\d{1,3}|[A-F]/gi)||[]);
      }
      for(let i=0;i<tokens.length;i++){
        if(/^\d+$/.test(tokens[i])&&Number(tokens[i])===expected){
          for(let j=i+1;j<Math.min(i+5,tokens.length);j++){
            if(/^[A-F]$/i.test(tokens[j])){seqFound[expected]=tokens[j].toUpperCase();expected++;i=j;break;}
          }
        }
      }
    }
    if(Object.keys(seqFound).length>Object.keys(found).length)Object.assign(found,seqFound);
  }
  const out={};let n=1;while(found[n]&&/^[A-F]$/.test(found[n])){out[n]=found[n];n++;}
  return out;
}
function linesBeforeMarker(pages,marker,mode){
  const out=[],last=marker?marker.page:pages.length-1;
  for(let p=0;p<=last;p++){
    // If the solution header is at the very top of its page, the whole page is an answer sheet.
    // This also covers multi-column answer tables whose second column may start slightly above the header row.
    if(marker&&p===marker.page&&marker.y!=null&&marker.y<150)continue;
    const seq=((pages[p].modes||{})[mode]||[]);
    for(let i=0;i<seq.length;i++){
      const item=seq[i],t=clean(item.text??item),y=item.y;
      if(marker&&p===marker.page&&marker.y!=null&&y!=null&&y>=marker.y-1)continue;
      if(solutionMarkerText(t))break;
      const next=i+1<seq.length?clean(seq[i+1].text??seq[i+1]):'';
      if((questionHeaderOnly(t)&&answerHeaderOnly(next))||(answerHeaderOnly(t)&&questionHeaderOnly(next)))break;
      if(isTitle(t))continue;
      if(/^\d{1,3}$/.test(t)&&item.edge===true)continue;
      out.push(t);
    }
  }
  return out;
}
function parseQuestionLines(lines){
  const qs=[];let cur=null,currentOpt=null;
  const finish=()=>{
    if(!cur)return;
    cur.question=clean(cur.q.join(' '));delete cur.q;
    const opts={};for(const [k,v] of Object.entries(cur.options))opts[k]=clean(v.join(' '));cur.options=opts;
    qs.push(cur);cur=null;currentOpt=null;
  };
  for(const raw of lines){
    const l=stripRunningMatter(raw);if(!l)continue;
    let m=l.match(Q_RE);
    if(m){finish();cur={n:Number(m[1]),q:m[2]?[m[2]]:[],options:{}};continue;}
    if(!cur)continue;
    m=l.match(O_RE);
    if(m){currentOpt=m[1].toUpperCase();if(!cur.options[currentOpt])cur.options[currentOpt]=[];if(m[2])cur.options[currentOpt].push(m[2]);continue;}
    if(currentOpt)cur.options[currentOpt].push(l);else cur.q.push(l);
  }
  finish();return qs;
}
function containsLeak(s,n){
  const t=clean(s);if(!t)return false;
  if(/\bPREG\b.*\b(?:SOL|RESP)/i.test(t))return true;
  if(/\bTEST\s+N[ºO°]?\s*\d+/i.test(t))return true;
  if(n&&new RegExp('(?:^|\\s)'+(n+1)+'\\s*[-–—.)]\\s+[A-ZÁÉÍÓÚÜÑ¿¡]').test(t))return true;
  return false;
}
function questionProblems(q,correct){
  const problems=[];
  if(!q||!Number(q.n))return ['pregunta inválida'];
  if(!clean(q.question))problems.push('enunciado vacío');
  if(containsLeak(q.question,q.n))problems.push('enunciado contaminado');
  const opts=q.options||{},letters=Object.keys(opts).sort();
  if(letters.length<3||letters.length>6)problems.push('número de opciones no válido: '+letters.length);
  const expected='ABCDEF'.slice(0,letters.length);if(letters.length&&letters.join('')!==expected)problems.push('opciones no consecutivas: '+letters.join(','));
  if(correct&&(!opts[correct]||!clean(opts[correct])))problems.push('falta la opción correcta '+correct);
  const seen={};
  for(const L of letters){
    const v=clean(opts[L]);if(!v)problems.push('opción '+L+' vacía');if(containsLeak(v,q.n))problems.push('opción '+L+' contaminada');
    const nv=norm(v);if(nv&&nv.length>4){if(seen[nv])problems.push('opciones '+seen[nv]+' y '+L+' duplicadas');else seen[nv]=L;}
  }
  return problems;
}
function normalizeSet(qs){const by={},dups=[];for(const q of qs||[]){if(!q||!Number(q.n))continue;if(by[q.n])dups.push(Number(q.n));else by[q.n]=q;}return {by,dups};}
function validateSet(qs,sols){
  const normed=normalizeSet(qs),expected=Object.keys(sols).map(Number).sort((a,b)=>a-b),missing=[],bad=[];
  if(normed.dups.length)return {ok:false,missing:[],bad:normed.dups.map(n=>({n,why:['duplicada']})),by:normed.by};
  for(const n of expected){const q=normed.by[n];if(!q){missing.push(n);continue;}const why=questionProblems(q,sols[n]);if(why.length)bad.push({n,why});}
  const extras=Object.keys(normed.by).map(Number).filter(n=>!sols[n]);
  return {ok:missing.length===0&&bad.length===0&&extras.length===0&&Object.keys(normed.by).length===expected.length,missing,bad,extras,by:normed.by};
}
function tokenJaccard(a,b){
  const A=new Set(norm(a).split(' ').filter(x=>x.length>1)),B=new Set(norm(b).split(' ').filter(x=>x.length>1));if(!A.size&&!B.size)return 1;
  let inter=0;for(const x of A)if(B.has(x))inter++;return inter/(new Set([...A,...B]).size||1);
}
function comparable(q){let s=clean(q.question);for(const L of Object.keys(q.options||{}).sort())s+=' '+L+' '+clean(q.options[L]);return s;}
function setSimilarity(a,b,sols){const A=normalizeSet(a).by,B=normalizeSet(b).by;let sum=0,n=0;for(const k of Object.keys(sols).map(Number)){if(A[k]&&B[k]){sum+=tokenJaccard(comparable(A[k]),comparable(B[k]));n++;}}return n?sum/n:0;}
function cloneQuestion(q,correct){const out={n:Number(q.n),question:clean(q.question),options:{},correct};for(const L of Object.keys(q.options||{}))out.options[L]=clean(q.options[L]);return out;}
function analyze(pages){
  const marker=findMarker(pages),sols=parseSolutions(pages,marker),nsol=Object.keys(sols).length;
  if(!nsol)return {status:'error',confidence:'none',error:'No se ha encontrado una tabla de soluciones válida (número + letra).',marker,solutions:sols,questions:[],candidates:[]};
  const modes=['native','one','two','three'].filter(m=>pages.some(p=>(p.modes?.[m]||[]).length));
  const candidates=modes.map(mode=>{const qs=parseQuestionLines(linesBeforeMarker(pages,marker,mode));return {mode,questions:qs,validation:validateSet(qs,sols)}});
  const good=candidates.filter(c=>c.validation.ok);
  if(good.length){
    let best=good[0],agreement=1,minAgreement=1,cluster=[good[0]];
    if(good.length>1){
      // Robust consensus: choose the largest cluster of mutually close readings.
      // A structurally valid but geometrically scrambled outlier must not veto two matching readings.
      let bestCluster=[],bestClusterScore=-1;
      for(const c of good){
        const neighbors=[c];let sum=0,n=0;
        for(const d of good){if(c===d)continue;const s=setSimilarity(c.questions,d.questions,sols);if(s>=0.97)neighbors.push(d);sum+=s;n++;}
        let internal=1,count=0,total=0;
        for(let i=0;i<neighbors.length;i++)for(let j=i+1;j<neighbors.length;j++){total+=setSimilarity(neighbors[i].questions,neighbors[j].questions,sols);count++;}
        if(count)internal=total/count;
        if(neighbors.length>bestCluster.length||(neighbors.length===bestCluster.length&&internal>bestClusterScore)){bestCluster=neighbors;bestClusterScore=internal;}
      }
      cluster=bestCluster.length?bestCluster:[good[0]];
      // Medoid inside winning cluster.
      let bestScore=-1;
      for(const c of cluster){let sum=0,n=0;for(const d of cluster){if(c===d)continue;sum+=setSimilarity(c.questions,d.questions,sols);n++;}const score=n?sum/n:1;if(score>bestScore){bestScore=score;best=c;agreement=score;}}
      minAgreement=1;for(let i=0;i<cluster.length;i++)for(let j=i+1;j<cluster.length;j++)minAgreement=Math.min(minAgreement,setSimilarity(cluster[i].questions,cluster[j].questions,sols));
    }
    const questions=Object.keys(sols).map(Number).sort((a,b)=>a-b).map(n=>cloneQuestion(best.validation.by[n],sols[n]));
    const high=cluster.length>=2&&minAgreement>=0.97;
    const reason=high?`${cluster.length} lecturas independientes coinciden${good.length>cluster.length?`; ${good.length-cluster.length} lectura(s) discordante(s) descartada(s)`:''}`:'Solo una lectura completa e independiente';
    return {status:high?'verified':'review',confidence:high?'high':'medium',reason,marker,solutions:sols,questions,candidates,agreement,minAgreement,consensusModes:cluster.map(c=>c.mode),flags:high?[]:questions.map(q=>({n:q.n,why:['solo una lectura completa']}))};
  }
  // Per-question rescue. It never silently imports: rescued results require review.
  const normalized=candidates.map(c=>({mode:c.mode,by:normalizeSet(c.questions).by})),questions=[],flags=[];
  for(const n of Object.keys(sols).map(Number).sort((a,b)=>a-b)){
    const variants=[];
    for(const c of normalized){const q=c.by[n];if(q&&questionProblems(q,sols[n]).length===0)variants.push({mode:c.mode,q});}
    if(!variants.length){flags.push({n,why:['no hay reconstrucción válida']});continue;}
    let best=variants[0],agreement=1;
    if(variants.length>1){let bestScore=-1;for(const v of variants){let sum=0,k=0;for(const w of variants){if(v===w)continue;sum+=tokenJaccard(comparable(v.q),comparable(w.q));k++;}const sc=k?sum/k:1;if(sc>bestScore){bestScore=sc;best=v;agreement=sc;}}}
    if(variants.length<2||agreement<0.97)flags.push({n,why:[variants.length<2?'solo una reconstrucción válida':`lecturas discrepan (${Math.round(agreement*100)} %)`]});
    questions.push(cloneQuestion(best.q,sols[n]));
  }
  const finalValidation=validateSet(questions,sols);
  if(!finalValidation.ok){
    const badMap=new Map(flags.map(x=>[x.n,x]));
    for(const n of finalValidation.missing)badMap.set(n,{n,why:['pregunta no reconstruida']});
    for(const b of finalValidation.bad)badMap.set(b.n,b);
    return {status:'review',confidence:'low',reason:'Se requiere revisión manual de preguntas concretas',marker,solutions:sols,questions,candidates,flags:[...badMap.values()]};
  }
  return {status:'review',confidence:'low',reason:'Reconstrucción por combinación de lecturas; requiere revisión manual',marker,solutions:sols,questions,candidates,flags};
}
function validateEdited(questions,solutions){return validateSet(questions,solutions);}
window.TestParserCore={clean,norm,stripRunningMatter,isTitle,solutionMarkerText,findMarker,parseSolutions,parseQuestionLines,validateSet,questionProblems,setSimilarity,analyze,validateEdited};
if(typeof module!=='undefined'&&module.exports)module.exports=window.TestParserCore;
})();
