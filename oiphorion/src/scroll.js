/* ───── 하이라이트 ───── */
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const PKW=/(▷.*$)|(?<![^\s])(절차 끝|반복 끝|아니고 만약|경우에 따라|에 대해|절차|상수|만약|이면|아니면|끝|각)(?=[\s(]|$)|(←|→|≤)/g;
function hlPseudo(line){
  let out="",last=0; PKW.lastIndex=0; let m;
  while((m=PKW.exec(line))){
    out+=esc(line.slice(last,m.index));
    if(m[1]) out+='<span class="c">'+esc(m[1])+'</span>';
    else if(m[2]) out+='<span class="k">'+esc(m[2])+'</span>';
    else out+='<span class="ar">'+esc(m[3])+'</span>';
    last=PKW.lastIndex; if(m[0]==="") PKW.lastIndex++;
  }
  return out+esc(line.slice(last));
}
const CKW=/(\/\/.*$)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)')|(^\s*#\s*\w+.*$)|\b(const|enum|class|struct|return|if|else|for|while|switch|case|break|continue|using|namespace|auto|true|false)\b|\b(int|char|bool|void|size_t|string|vector|Line|Gap|Variant|Card|Redo|State|ofstream|ifstream|stringstream|mt19937|random_device)\b|\b(\d+)\b/g;
function hlCpp(line){
  let out="",last=0; CKW.lastIndex=0; let m;
  while((m=CKW.exec(line))){
    out+=esc(line.slice(last,m.index));
    const cls=m[1]?"c":(m[2]||m[3])?"s":m[4]?"pp":m[5]?"k":m[6]?"t":"n";
    out+='<span class="'+cls+'">'+esc(m[0])+'</span>';
    last=CKW.lastIndex;
  }
  return out+esc(line.slice(last));
}
const CPPL = CPP.replace(/\n$/,"").split("\n");
function codeBlock(lines,from,to,hl,fn){
  const hs=new Set(hl||[]); let h="";
  for(let i=from;i<=to;i++){ const raw=lines[i-1]??""; h+='<div class="ln'+(hs.has(i)?" hl":"")+'"><span class="no">'+i+'</span><span class="tx">'+(fn(raw)||" ")+'</span></div>'; }
  return '<div class="code" tabindex="0">'+h+'</div>';
}

/* ───── 두루마리 ───── */
const ov=document.getElementById("overlay"), sc=document.getElementById("scroll"), paper=document.getElementById("paper");
let cur=null, level=1, lastTile=null;
function crumbs(){
  const c=document.getElementById("crumbs");
  const items=[["할 일",0],["수도코드",1],["C++",2]];
  c.innerHTML=items.map(([t,l],i)=>(i?'<span aria-hidden="true">›</span>':"")+'<button data-l="'+l+'"'+(l===level?' aria-current="step"':"")+'>'+t+'</button>').join("");
}
function view(){
  const b=cur, body=document.getElementById("pBody");
  crumbs();
  let h="";
  if(level===1){
    h+='<section class="plan"><h4>계획표</h4><ol>'+((b.todoBy&&b.todoBy[state.line])||b.todo).map(t=>'<li>'+esc(t)+'</li>').join("")+
       (b.extra2&&state.line===2?'<li>'+esc(b.extra2)+'</li>':"")+'</ol></section>';
    h+='<div class="p-view enter">';
    b.pseudo.forEach(p=>{
      const s=SRC[p.src];
      h+='<section class="p-sec"><div class="cap"><b>'+esc(s.lines[p.from-1].startsWith("절차")?s.lines[p.from-1]:s.name)+'</b><span>'+s.name+' · '+p.from+'–'+p.to+'행 · ▸ 표시가 이 구간</span></div>'+
         codeBlock(s.lines,p.from,p.to,p.hl,hlPseudo)+'</section>';
    });
    h+='<div class="p-actions"><span></span><button class="deeper" data-go="2">한 겹 더 펼치기 · C++ <span aria-hidden="true">↓</span></button></div></div>';
  } else {
    h+='<div class="p-view enter">';
    b.cpp.forEach(([name,cap])=>{ const [a,z]=ANCHORS[name];
      h+='<section class="p-sec"><div class="cap"><b>'+esc(cap)+'</b><span>study_os.cpp · '+a+'–'+z+'행</span></div>'+codeBlock(CPPL,a,z,[],hlCpp)+'</section>';
    });
    h+='<details class="full"><summary>소스 전체 펼치기 ('+CPPL.length+'줄)</summary>'+codeBlock(CPPL,1,CPPL.length,[],hlCpp)+'</details>';
    h+='<div class="p-actions"><button class="ghost" data-go="1">← 수도코드로</button><span class="toast" id="toast" role="status"></span><button class="deeper" data-copy="1">C++ 전체 복사</button></div></div>';
  }
  body.innerHTML=h;
  if(level===1){
    const first=body.querySelector(".ln.hl");
    if(first){ const top=first.getBoundingClientRect().top-paper.getBoundingClientRect().top+paper.scrollTop; paper.scrollTop=Math.max(0,top-paper.clientHeight*0.45); }
  } else paper.scrollTop=0;
}
function openScroll(id,tile){
  cur=ALL.find(b=>b.id===id); if(!cur) return;
  lastTile=tile||null; level=1;
  document.getElementById("pTitle").textContent=cur.name;
  let meta="";
  if(cur.when){ const [s,e]=cur.when(state.W); meta=(cur.id==="morning"&&s>=e)?"오전 없음":hhmm(s)+" – "+hhmm(e); } else meta=cur.whenLabel;
  document.getElementById("pMeta").innerHTML='<span>'+meta+'</span><span>'+routeOf(state.line)[0]+' · '+routeOf(state.line)[1]+'</span>';
  document.getElementById("pStory").textContent=cur.story;
  ov.hidden=false; paper.scrollTop=0;
  sc.classList.remove("unroll");
  sc.style.setProperty("--half",(paper.offsetHeight/2)+"px");
  void sc.offsetWidth; sc.classList.add("unroll");
  view();
  document.getElementById("close").focus({preventScroll:true});
}
function closeScroll(){ ov.hidden=true; sc.classList.remove("unroll"); if(lastTile){ const t=document.querySelector('.node[data-id="'+cur.id+'"]'); (t||lastTile).focus({preventScroll:true}); } }
document.getElementById("close").addEventListener("click",closeScroll);
ov.addEventListener("click",e=>{ if(e.target===ov) closeScroll(); });
document.addEventListener("keydown",e=>{ if(!ov.hidden && e.key==="Escape") closeScroll(); });
sc.addEventListener("click",e=>{
  const c=e.target.closest("[data-l]"); if(c){ const l=+c.dataset.l; if(l===0) closeScroll(); else { level=l; view(); } return; }
  const g=e.target.closest("[data-go]"); if(g){ level=+g.dataset.go; view(); return; }
  const cp=e.target.closest("[data-copy]"); if(cp){
    const t=document.getElementById("toast");
    const fallback=()=>{ const d=document.querySelector("details.full"); d.open=true; const r=document.createRange(); r.selectNodeContents(d.querySelector(".code")); const s=getSelection(); s.removeAllRanges(); s.addRange(r); t.textContent="선택해 두었어요. 복사 단축키를 누르세요."; };
    try{ navigator.clipboard.writeText(CPP).then(()=>{t.textContent="복사했어요.";},fallback); }catch(err){ fallback(); }
  }
});
