
/* ───── 시각 도우미 ───── */
const toMin = s=>{const m=/^(\d{1,2}):(\d{2})/.exec(s||"");return m?(+m[1])*60+(+m[2]):null};
const hhmm = m=>{m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")};
const store = {get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const wakeEl=document.getElementById("wake"), wokeEl=document.getElementById("woke");
{ const a=store.get("dw.wake"); if(a) wakeEl.value=a; }
const todayDow=()=>new Date(JOURNEY.todayKey()+"T00:00:00Z").getUTCDay();
function decideLine(woke,wake){ if(woke<=wake) return 1; if(woke<=wake+120) return 2; return 3; }
const ROUTE = {1:["큰길","1선 · 정상"],2:["샛길","2선 · 늦잠"],3:["오솔길","3선 · 크게 늦음"]};
const ROUTE_SCHOOL = {1:["큰길","여유 아침"],2:["샛길","빠듯한 아침"],3:["오솔길","출발 시각 지남"]};
const routeOf = l=>((typeof PLAN!=="undefined"&&PLAN.leave)?ROUTE_SCHOOL:ROUTE)[l];
/* 수업 날: 집을 나서기까지 1시간 넘게 남으면 여유, 남아 있으면 빠듯, 지났으면 늦음 */
function computeLine(W,woke){ if(PLAN.leave){ const m=PLAN.leave-woke; return m>60?1:m>0?2:3; } return decideLine(woke,W); }
const signSVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9 2h2v16H9z" fill="currentColor"/><path d="M3 4h11l3 2.5L14 9H3z" fill="currentColor" opacity=".9"/><path d="M17 10H6l-3 2.5L6 15h11z" fill="currentColor" opacity=".7"/></svg>';
const SHORT = {dawn:"출발",morning:"오전",lunch:"점심 뒤",afternoon:"오후",evening:"저녁",minimum:"최소 기준선",hobby:"취미",closing:"마감",camp:"야영",sunday:"일요일"};
const MAIN = ["dawn","morning","lunch","afternoon","evening","hobby","closing","camp","sunday"];
const NODE_ORDER = ["dawn","morning","lunch","afternoon","evening","hobby","closing","camp","sunday","minimum"];
const byId = id=>ALL.find(b=>b.id===id);
let state={W:450,line:1};
let dayIdx=todayDow(), PLAN=BLOCKS;
/* 이번 주에서 요일 d의 날짜. 그 날짜에 시험 계획(EXAM_DAYS)이 있으면 그것을 쓴다 */
const dateOfDow=d=>{ const t=JOURNEY.todayKey(), date=new Date(t+"T00:00:00Z"); date.setUTCDate(date.getUTCDate()+(d+6)%7-(date.getUTCDay()+6)%7); return date.toISOString().slice(0,10); };
const planOf=d=>EXAM_DAYS[dateOfDow(d)]||PLANS[d]||PLANS.free;
function setDay(d){ dayIdx=d; PLAN=planOf(d); ALL=[...PLAN,...WEEKLY]; document.querySelectorAll('#days button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.d===d))); }
function blockTime(b){ if(!b.when) return b.whenLabel; const [s,e]=b.when(state.W); if(b.id==="morning"&&s>=e) return "오전 없음"; return hhmm(s)+" – "+hhmm(e); }
function isOff(b){ if(b.id==="morning"&&!b.fixed){ const [s,e]=b.when(state.W); if(s>=e) return true; } return !!(b.lines&&!b.lines.includes(state.line)); }
function nowId(){ const d=new Date(Date.now()+9*36e5), n0=d.getUTCHours()*60+d.getUTCMinutes();
  if(todayDow()!==dayIdx) return null;
  for(const b of PLAN){ if(b.only3&&state.line!==3) continue; if(isOff(b)) continue; const [s,e]=b.when(state.W); const n=(b.id==="camp"&&n0<state.W)?n0+1440:n0; if(n>=s&&n<e) return b.id; }
  return null; }

/* ───── 세계: 높이 지도 (초원 · 석회암 능선 · 설산 정상) ───── */
const fract=x=>x-Math.floor(x);
function hash12(x,y){ let a=fract(x*.1031), b=fract(y*.1031), c=fract(x*.1031); const d=a*(b+33.33)+b*(c+33.33)+c*(a+33.33); a+=d;b+=d;c+=d; return fract((a+b)*c); }
function vnoise(x,y){ const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy);
  const a=hash12(ix,iy), b=hash12(ix+1,iy), c=hash12(ix,iy+1), d=hash12(ix+1,iy+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5; for(let i=0;i<(o||4);i++){ s+=a*vnoise(x,y); x=x*2.03+17.1; y=y*2.03+9.3; a*=.5; } return s/(1-Math.pow(.5,o||4)); }
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
function islandS(x,z){ return 45-Math.hypot(x-8,.7*(z-5)); }
function rawH(x,z){
  const E=1-smooth(45,95,Math.hypot(x-8,.7*(z-5)));
  return -14+E*(16+31*smooth(35,-34,z)+2*Math.exp(-(((x-18)/18)**2+((z+34)/22)**2)))+(fbm(x*.045,z*.045,2)-.5)*.8*E;
}
const DOM={x0:-90,z0:-115,x1:150,z1:95,res:.4};
const terrainClock=()=>typeof performance==='undefined'?Date.now():performance.now();
const terrainStarted=terrainClock();
DOM.nx=Math.round((DOM.x1-DOM.x0)/DOM.res)+1; DOM.nz=Math.round((DOM.z1-DOM.z0)/DOM.res)+1;
const HM=new Float32Array(DOM.nx*DOM.nz), SM=new Float32Array(DOM.nx*DOM.nz), QM=new Float32Array(DOM.nx*DOM.nz).fill(3);
function sampleArr(A,x,z){ const gx=(x-DOM.x0)/DOM.res, gz=(z-DOM.z0)/DOM.res; if(gx<0||gz<0||gx>DOM.nx-1||gz>DOM.nz-1) return -60;
  const i=Math.min(DOM.nx-2,Math.floor(gx)), j=Math.min(DOM.nz-2,Math.floor(gz)), fx=gx-i, fz=gz-j, k=j*DOM.nx+i;
  const a=A[k],b=A[k+1],c=A[k+DOM.nx],d=A[k+DOM.nx+1]; return (a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz; }
const groundY=(x,z)=>sampleArr(HM,x,z);

/* 길 */
const NXZ={dawn:[-28,34],morning:[-6,38.5],lunch:[18,33],afternoon:[37,20],evening:[21,8.5],hobby:[1,4.5],closing:[-10,-5],camp:[18,-8.5],sunday:[18,-33.6],minimum:[-22.5,18]};
const MAIN_CTRL=[NXZ.dawn,NXZ.morning,NXZ.lunch,NXZ.afternoon,NXZ.evening,NXZ.hobby,NXZ.closing,[4,-8.6],NXZ.camp,[18,-16],[18,-25],NXZ.sunday];
const MAIN_NODE_CTRL={dawn:0,morning:1,lunch:2,afternoon:3,evening:4,hobby:5,closing:6,camp:8,sunday:11};
const SPUR_CTRL=[NXZ.dawn,NXZ.minimum,[-18.5,5],NXZ.closing];
function catmull(P,seg){ const out=[];
  for(let i=0;i<P.length-1;i++){ const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||P[i+1];
    for(let s=0;s<seg;s++){ const t=s/seg,t2=t*t,t3=t2*t; out.push([0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3))); } }
  out.push(P[P.length-1].slice()); return out; }
const SEG=24;
const plen=a=>{let s=0;for(let i=1;i<a.length;i++) s+=Math.hypot(a[i][0]-a[i-1][0],a[i][1]-a[i-1][1]);return s;};
const ROAD=catmull(MAIN_CTRL,SEG), SPUR=catmull(SPUR_CTRL,SEG);
/* 샛길: 출발에서 들꽃 사이 풀길로 곧장 점심까지. 오전 칸이 꺼진 날(늦잠)에만 열린다 */
const SIDE=catmull([NXZ.dawn,[-17,29.5],[0,26],NXZ.lunch],SEG);
/* 2선 들꽃 샛길: 장소와 장소 사이마다 큰길에서 옆으로 비켜난 풀길. 양 끝은 장소에서 큰길과 만나고
   가운데는 D만큼 떨어진다(+는 진행 방향 왼쪽). 2선인 날 소년은 큰길 대신 이 길로 다닌다.
   값은 나무·바위·천막·다른 장소를 피하도록 골랐다(tools/map-terrain.test.cjs가 확인). */
const MEADOW_OFFSET={dawn:-4.5,morning:-6,lunch:-6,afternoon:-6,evening:6,hobby:-9,closing:5};
function offsetPath(pts,D){ const n=pts.length;
  return pts.map((p,i)=>{ const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,w=D*Math.pow(Math.sin(Math.PI*i/(n-1)),.8);
    return [p[0]-dz/l*w,p[1]+dx/l*w]; }); }
const MEADOW=Object.entries(MEADOW_OFFSET).map(([a,D])=>{ const b=MAIN[MAIN.indexOf(a)+1];
  return {a,b,pts:offsetPath(ROAD.slice(MAIN_NODE_CTRL[a]*SEG,MAIN_NODE_CTRL[b]*SEG+1),D)}; });
const NODE_HEIGHT={dawn:0,morning:3.2,lunch:6.5,afternoon:10,evening:14,hobby:18,closing:22,camp:26,sunday:35,minimum:8};
function buildTerrain(){
  const anchors=NODE_ORDER.map(id=>[...NXZ[id],NODE_HEIGHT[id]]).concat([[4,-8.6,24],[18,-16,29],[18,-25,32.3]]);
  const kernel=(x,z,a)=>Math.exp(-((x-a[0])**2+(z-a[1])**2)/288);
  const A=anchors.map(a=>anchors.map(b=>kernel(a[0],a[1],b)).concat(a[2]-rawH(a[0],a[1]))), N=A.length;
  for(let i=0;i<N;i++){
    let pivot=i;for(let j=i+1;j<N;j++)if(Math.abs(A[j][i])>Math.abs(A[pivot][i]))pivot=j;
    if(Math.abs(A[pivot][i])<1e-8)throw new Error('Terrain RBF singular');
    [A[i],A[pivot]]=[A[pivot],A[i]];const d=A[i][i];for(let k=i;k<=N;k++)A[i][k]/=d;
    for(let j=0;j<N;j++)if(j!==i){const w=A[j][i];for(let k=i;k<=N;k++)A[j][k]-=w*A[i][k];}
  }
  const nx=151,nz=133,coarse=new Float32Array(nx*nz);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
    const x=DOM.x0+i*(DOM.x1-DOM.x0)/(nx-1),z=DOM.z0+j*(DOM.z1-DOM.z0)/(nz-1);
    let h=rawH(x,z);anchors.forEach((a,k)=>h+=A[k][N]*kernel(x,z,a));
    coarse[j*nx+i]=Math.max(-18,Math.min(35-.045*Math.max(Math.hypot(x-18,z+33.6)-2,0),h));
  }
  for(let j=0;j<DOM.nz;j++)for(let i=0;i<DOM.nx;i++){
    const gx=i/(DOM.nx-1)*(nx-1),gz=j/(DOM.nz-1)*(nz-1),ix=Math.min(nx-2,Math.floor(gx)),iz=Math.min(nz-2,Math.floor(gz)),fx=gx-ix,fz=gz-iz,k=iz*nx+ix;
    HM[j*DOM.nx+i]=(coarse[k]*(1-fx)+coarse[k+1]*fx)*(1-fz)+(coarse[k+nx]*(1-fx)+coarse[k+nx+1]*fx)*fz;
    SM[j*DOM.nx+i]=islandS(DOM.x0+i*DOM.res,DOM.z0+j*DOM.res);
  }
  for(const id of NODE_ORDER){const [x,z]=NXZ[id];
    for(let j=Math.max(0,Math.floor((z-3.8-DOM.z0)/DOM.res));j<=Math.min(DOM.nz-1,Math.ceil((z+3.8-DOM.z0)/DOM.res));j++)
      for(let i=Math.max(0,Math.floor((x-3.8-DOM.x0)/DOM.res));i<=Math.min(DOM.nx-1,Math.ceil((x+3.8-DOM.x0)/DOM.res));i++){
        const k=j*DOM.nx+i,w=1-smooth(1.6,3.8,Math.hypot(DOM.x0+i*DOM.res-x,DOM.z0+j*DOM.res-z));HM[k]+=(NODE_HEIGHT[id]-HM[k])*w;
      }
  }
}
buildTerrain();
const campI=MAIN_NODE_CTRL.camp*SEG, sumI=MAIN_NODE_CTRL.sunday*SEG;
const roadHalf=i=> i<=campI ? 1.05 : 1.05-(0.30)*Math.min(1,(i-campI)/(sumI-campI));
/* 길을 높이 지도에 새긴다: Q = 중심에서의 거리 / 반폭. 큰길은 QM, 샛길은 QS, 오솔길은 QP */
const QS=new Float32Array(DOM.nx*DOM.nz).fill(3), QP=new Float32Array(DOM.nx*DOM.nz).fill(3);
function carve(P,half,Q){
  for(let s=0;s<P.length-1;s++){ const [ax,az]=P[s],[bx,bz]=P[s+1], w=half(s), R=w*3.2;
    const i0=Math.max(0,Math.floor((Math.min(ax,bx)-R-DOM.x0)/DOM.res)), i1=Math.min(DOM.nx-1,Math.ceil((Math.max(ax,bx)+R-DOM.x0)/DOM.res));
    const j0=Math.max(0,Math.floor((Math.min(az,bz)-R-DOM.z0)/DOM.res)), j1=Math.min(DOM.nz-1,Math.ceil((Math.max(az,bz)+R-DOM.z0)/DOM.res));
    const dx=bx-ax, dz=bz-az, L2=dx*dx+dz*dz||1;
    for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const x=DOM.x0+i*DOM.res, z=DOM.z0+j*DOM.res; let t=((x-ax)*dx+(z-az)*dz)/L2; t=Math.max(0,Math.min(1,t));
      const d=Math.hypot(x-ax-dx*t,z-az-dz*t)/w, k=j*DOM.nx+i; if(d<Q[k]) Q[k]=d; } } }
carve(ROAD,roadHalf,QM); carve(SIDE,()=>.85,QS); MEADOW.forEach(m=>carve(m.pts,()=>.85,QS)); carve(SPUR,()=>.70,QP);

/* 정적인 눈길 흔적: 텍셀당 4×4 부분 샘플, 기존 uPath의 B/A를 재사용한다. */
function footprints(paths,mask,channel){
  for(const P of paths){let distance=0,next=.8,foot=0;
    for(let k=1;k<P.length;k++){const a=P[k-1],b=P[k],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(!len)continue;
      while(next<=distance+len){const t=(next-distance)/len,sd=foot++%2?1:-1,x=a[0]+dx*t-dz/len*.38*sd,z=a[1]+dz*t+dx/len*.38*sd,ang=Math.atan2(dz,dx)+sd*.12,c=Math.cos(ang),sn=Math.sin(ang);
        const i0=Math.max(0,Math.floor((x-.8-DOM.x0)/DOM.res)),i1=Math.min(DOM.nx-1,Math.ceil((x+.8-DOM.x0)/DOM.res)),j0=Math.max(0,Math.floor((z-.8-DOM.z0)/DOM.res)),j1=Math.min(DOM.nz-1,Math.ceil((z+.8-DOM.z0)/DOM.res));
        for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){let n=0;
          for(let v=0;v<4;v++)for(let u=0;u<4;u++){const px=DOM.x0+(i+(u+.5)/4-.5)*DOM.res-x,pz=DOM.z0+(j+(v+.5)/4-.5)*DOM.res-z;const lx=(px*c+pz*sn)/.48,lz=(-px*sn+pz*c)/.24;if(lx*lx+lz*lz<1)n++;}
          const idx=(j*DOM.nx+i)*4+channel;mask[idx]=Math.max(mask[idx],Math.round(n/16*255));
        }next+=1.6;
      }distance+=len;
    }
  }return mask;
}


/* 길 그래프: 노드 사이를 잇는 큰길 조각, 오솔길 두 조각, 샛길 하나. 걷기는 이 위에서 최단 경로를 찾는다 */
const EDGES=[];
MAIN.slice(1).forEach((b,i)=>{ const a=MAIN[i]; EDGES.push({a,b,pts:ROAD.slice(MAIN_NODE_CTRL[a]*SEG,MAIN_NODE_CTRL[b]*SEG+1)}); });
EDGES.push({a:"dawn",b:"minimum",pts:SPUR.slice(0,SEG+1),spur:true},{a:"minimum",b:"closing",pts:SPUR.slice(SEG),spur:true},{a:"dawn",b:"lunch",pts:SIDE,side:true});
MEADOW.forEach(m=>EDGES.push({a:m.a,b:m.b,pts:m.pts,meadow:true}));
EDGES.forEach(e=>{ e.len=plen(e.pts); });

/* Scene resources share path topology, but never change progression data. */
let sceneMode="day", dayZone=0;
const mountainHM=HM.slice(), mountainSM=SM.slice();
const meadowHM=Float32Array.from(HM,(_,k)=>MAP_SCENES.dayHeight(DOM.x0+(k%DOM.nx)*DOM.res,DOM.z0+Math.floor(k/DOM.nx)*DOM.res));
HM.set(meadowHM); SM.fill(8);
window.__sceneTimings={terrainMs:terrainClock()-terrainStarted};
let terrainTexture=null, cloudTextureHandle=null, weekCloudReady=false;
function ensureWeekCloud(){
  if(!gl||weekCloudReady||sceneMode!=="week")return;
  const ct=cloudTexture(512);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,cloudTextureHandle);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,ct.N,ct.N,0,gl.RGBA,gl.UNSIGNED_BYTE,ct.data);weekCloudReady=true;
}
function uploadSceneTerrain(){
  HM.set(sceneMode==="day"?meadowHM:mountainHM);SM.set(sceneMode==="day"?new Float32Array(SM.length).fill(8):mountainSM);
  if(!gl||!terrainTexture)return;
  ensureWeekCloud();
  const data=new Uint8Array(HM.length*4);
  for(let k=0;k<HM.length;k++){const h=Math.round((HM[k]+60)/100*65535);data[k*4]=h>>8;data[k*4+1]=h&255;data[k*4+2]=Math.round(Math.min(QM[k],3)/3*255);data[k*4+3]=Math.round((Math.max(-8,Math.min(8,SM[k]))+8)/16*255);}
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,terrainTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,DOM.nx,DOM.nz,gl.RGBA,gl.UNSIGNED_BYTE,data);bindScenery();
}
/* 물건들 */
const nodeY=id=>groundY(NXZ[id][0],NXZ[id][1])+.24;
const TREES=[[-39,35,1.2],[-18,43,1],[2,45,.85],[26,40,.95],[44,29,.85],[46,9,.75],[-33,21,.8],[-12,16,.7]];
const ROCKS=[[-15,-13],[29,-24],[41,9],[-29,7]];
const TENT=[25.5,-6.8], SIGN=[-35,29.5], FLAG=[19.9,-34];
const CLOUD_Y=-14, CLOUD_AMP=2.4, DOOR=[-63,-11];
/* 모든 풍경색은 선형 RGB. 지형/길/텍스처를 공유하고 프로그램 상수만 바꾼다. */
const ALPINE_PALETTE=Object.freeze({grassDark:[.020,.060,.022],grass:[.055,.160,.032],dry:[.130,.190,.045],treeDark:[.010,.032,.023],tree:[.035,.095,.052],rockDark:[.120,.135,.150],rock:[.235,.250,.262],snow:[.660,.740,.810],packed:[.340,.470,.620],fog:[.600,.720,.800]});
const MAPS=[
  ['들꽃의 산기슭',8,.82,22,33,30,34.5,'#94af5c',.003],
  ['안개 낀 침엽수림',8,.86,10,19,24,29,'#427564',.004],
  ['바람의 바위 능선',6,.90,8,17,21,26,'#8d999d',.003],
  ['푸른 빙하의 길',4,.93,6,15,18,23,'#8bb9cf',.0028],
  ['하얀 정상',2,.95,4,13,15,20,'#deeaf1',.0025],
].map(([name,treeCount,flowerThreshold,rockStart,rockEnd,snowStart,snowEnd,color,fogDensity],i)=>Object.freeze({
  name,treeCount,flowerThreshold,rockStart,rockEnd,snowStart,snowEnd,color,fogStart:110,fogDensity:fogDensity*.65,
  paletteLinear:{...ALPINE_PALETTE,grass:i===1?[.035,.115,.045]:ALPINE_PALETTE.grass,snow:i===3?[.57,.72,.84]:ALPINE_PALETTE.snow},
  mountainLayerColors:[[.50,.61,.68],[.31,.40,.46],[.145,.170,.185]],
}));
let mapNo=1;  // 1..5. JOURNEY.ready 뒤에 progress().map으로 정한다

/* 구름 바다 텍스처 (타일, 솜뭉치 셀) */
function cloudTexture(N){
  const T=256, H=new Float32Array(N*N), A=new Float32Array(N*N);
  const oct=[[24,1,.62],[64,.42,.6],[150,.17,.58]];
  const hc=(i,j,n,s)=>hash12(((i%n)+n)%n+s*31.7,((j%n)+n)%n+s*17.3);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ let h=0, big=0;
    oct.forEach(([n,w,rad0],o)=>{ const px=x/N*n, py=y/N*n, ix=Math.floor(px), iy=Math.floor(py); let m=0;
      for(let b=-1;b<=1;b++) for(let a=-1;a<=1;a++){ const cx=ix+a, cy=iy+b, ox=hc(cx,cy,n,o+1), oy=hc(cx,cy,n,o+5), r=rad0+.35*hc(cx,cy,n,o+9);
        const dx=cx+.12+ox*.76-px, dy=cy+.12+oy*.76-py, dd=(dx*dx+dy*dy)/(r*r); if(dd<1){ const v=Math.sqrt(1-dd)*r; if(v>m) m=v; } }
      h+=m*w; if(o===0) big=m; });
    H[y*N+x]=h/1.55; A[y*N+x]=big; }
  const data=new Uint8Array(N*N*4), s=T/N, k=CLOUD_AMP;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const i=y*N+x, l=H[y*N+(x+N-1)%N], r=H[y*N+(x+1)%N], u=H[((y+N-1)%N)*N+x], d=H[((y+1)%N)*N+x];
    let nx=-(r-l)*k/(2*s), nz=-(d-u)*k/(2*s), ny=1; const L=Math.hypot(nx,ny,nz); nx/=L; nz/=L;
    data[i*4]=Math.round(Math.min(1,H[i])*255); data[i*4+1]=Math.round((nx*.5+.5)*255); data[i*4+2]=Math.round((nz*.5+.5)*255); data[i*4+3]=Math.round(Math.min(1,A[i]/.95)*255); }
  return {data,N};
}

/* ───── 카메라 ───── */
let CAM=null, VW={W:0,H:0,land:true};
const v3={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const l=Math.hypot(a[0],a[1],a[2]);return [a[0]/l,a[1]/l,a[2]/l]}};
function setCamera(){
  const asp=VW.W/VW.H;
  let ro,ta,fl;
  if(asp>=1.25){ ro=[-26,45,112]; ta=[3,16,3]; fl=2.; }
  else if(asp>=.85){ ro=[-34,49,116]; ta=[2,18,2]; fl=1.9; }
  else { ro=[-35,64,110]; ta=[4,18,2]; fl=1.35*Math.max(.9,Math.min(1.1,asp/.57)); }
  if(sceneMode==="day"){const c=MAP_SCENES.camera(at,NXZ,groundY,asp);({ro,ta,fl}=c);dayZone=c.zone;}
  if(sceneMode==='day'&&!gl){ro=[-8,85,100];ta=[2,0,4];fl=asp<.85?1.05:1.8;}
  const cw=v3.norm(v3.sub(ta,ro)), cu=v3.norm(v3.cross(cw,[0,1,0])), cv=v3.cross(cu,cw);
  CAM={ro,ta,fl,cw,cu,cv};
}
function project(P){ const d=v3.sub(P,CAM.ro), z=v3.dot(d,CAM.cw); const ux=v3.dot(d,CAM.cu)*CAM.fl/z, uy=v3.dot(d,CAM.cv)*CAM.fl/z;
  return [(ux*VW.H+VW.W)/2,(VW.H-uy*VW.H)/2,z]; }

/* ───── 셰이더 ───── */
const VS="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const glslFloat=n=>{if(!Number.isFinite(n))throw new Error('Non-finite scenery constant');return Number.isInteger(n)?n+'.0':String(n);};
const glslColor=a=>'vec3('+a.map(glslFloat).join(',')+')';
/* 하늘의 꿈 장치: 'laputa'(떠 있는 섬, 기본·민 선택 2026-10-29) · 'door'(예전 구름 위 하얀 문) · 'temple'(올림포스풍 신전 시안). 주소 ?sky= 로 바꿔 본다.
   SKY_EXT: 반너비, 위, 아래(doorSpot이 가림을 잴 범위), 계단 시작, 무지개 고리 반지름, 계단 첫 칸 높이 */
const SKY_MOTIF=(()=>{try{const v=new URLSearchParams(location.search).get('sky');return ['door','temple','laputa'].includes(v)?v:'laputa';}catch(e){return 'laputa';}})();
const SKY_EXT={door:[.03,.06,-.065,.10,.17,-.075],temple:[.105,.08,-.08,.16,.21,-.07],laputa:[.075,.088,-.09,.10,.19,-.03]}[SKY_MOTIF];
const SKY_GLSL={
door:`    float frame=(1.-smoothstep(.024,.028,abs(door.x)))*(1.-smoothstep(.054,.058,abs(door.y)));
    float cloudlet=1.-smoothstep(.85,1.05,length((door+vec2(0.,.065))/vec2(.11,.03)));
    c=mix(c,vec3(.96,.95,1.),cloudlet*.96);
    float rim=(1.-smoothstep(.029,.033,abs(door.x)))*(1.-smoothstep(.059,.063,abs(door.y)))*(1.-frame);
    c=mix(c,vec3(.14,.18,.30),rim*.8);  // 옅은 남회색 윤곽: 흰 구름 앞에서도 문 모양이 읽힌다
    c=mix(c,vec3(2.2,2.15,2.05),frame);  // 톤매핑 뒤에도 가장 흰 물체
    float gap=(1.-smoothstep(.003,.007,door.x-.010))*step(.004,door.x)*(1.-smoothstep(.048,.052,abs(door.y)));
    c=mix(c,vec3(2.4,1.7,.7),gap);  // 살짝 열린 문틈으로 따뜻한 빛
    c=mix(c,vec3(.55,.68,.85),frame*(1.-smoothstep(.002,.005,abs(door.x+.012)))*(1.-smoothstep(.040,.044,abs(door.y)))*.6);  // 문판 홈`,
// 올림포스풍 신전: 구름 위 세 단 기단, 세로 홈 기둥 여섯, 들보, 박공. 기둥 사이 신전 안쪽은 따뜻한 빛. 해는 왼쪽 위라 오른쪽 면이 라벤더 그늘.
temple:`    vec2 q=door;
    float cb=max(1.-smoothstep(.85,1.05,length((q+vec2(0.,.074))/vec2(.16,.03))),max(1.-smoothstep(.85,1.05,length((q+vec2(.10,.066))/vec2(.06,.024))),1.-smoothstep(.85,1.05,length((q+vec2(-.11,.068))/vec2(.065,.022)))));
    c=mix(c,vec3(.96,.95,1.),cb*.96);
    vec3 MW=vec3(2.,1.96,1.88),MS=vec3(.56,.58,.92),LN=vec3(.30,.32,.55);
    float pedO=step(.041,q.y)*step(q.y,.047+.036*(1.-abs(q.x)/.102))*(1.-step(.044,q.y)*step(q.y,.044+.032*(1.-abs(q.x)/.096)));
    c=mix(c,vec3(.20,.22,.40),pedO*step(abs(q.x),.102)*.7);                                          // 박공 윤곽
    float cella=step(abs(q.x),.074)*step(abs(q.y+.001),.031);
    c=mix(c,mix(vec3(1.1,.62,.22),vec3(2.2,1.55,.6),smoothstep(-.03,.03,q.y)),cella);               // 안쪽의 따뜻한 빛
    float ci=clamp(floor((q.x+.084)/.028),0.,5.),cx=-.07+ci*.028,u=(q.x-cx)/.0085;
    float colm=step(abs(u),1.)*step(abs(q.y+.001),.031);
    c=mix(c,mix(MW,MS,smoothstep(-.1,.9,u))*(.88+.12*cos(u*9.4)),colm);
    c=mix(c,LN,colm*smoothstep(.75,.95,u)*.6);                                                        // 기둥 오른쪽 가장자리                              // 기둥: 세로 홈, 오른쪽 그늘
    float capb=max(step(abs(q.x-cx),.0125)*step(abs(q.y-.0275),.0035),step(abs(q.x-cx),.0115)*step(abs(q.y+.0295),.003));
    c=mix(c,mix(MW,MS,step(.004,q.x-cx)*.6),capb);
    float st=max(step(abs(q.x),.104)*step(abs(q.y+.057),.005),max(step(abs(q.x),.094)*step(abs(q.y+.047),.005),step(abs(q.x),.084)*step(abs(q.y+.037),.005)));
    float sty=fract((q.y+.062)/.01);
    c=mix(c,mix(MS,MW,smoothstep(.45,.6,sty))*(1.-.18*smoothstep(.04,.1,q.x)),st);                   // 기단: 단마다 윗면 밝게
    float ent=step(abs(q.x),.088)*step(abs(q.y-.037),.007);
    c=mix(c,mix(MW,MS,smoothstep(.0,.09,q.x)*.7),ent);
    c=mix(c,LN,ent*step(abs(q.y-.031),.0012)*.7);                                                     // 들보 아랫선
    c=mix(c,LN,ent*step(abs(fract(q.x/.0147+.5)-.5),.12)*step(.038,q.y)*.35);                         // 세로 장식
    float ped=step(.044,q.y)*step(q.y,.044+.032*(1.-abs(q.x)/.096));
    float tym=step(.0475,q.y)*step(q.y,.044+.025*(1.-abs(q.x)/.078));
    c=mix(c,mix(MW,MS,.25+.45*step(0.,q.x)),ped);
    c=mix(c,vec3(.86,.84,1.05),tym*.8);                                                               // 박공 안쪽 그늘
    c=mix(c,vec3(2.3,1.9,1.1),tym*(1.-smoothstep(.003,.0045,length(q-vec2(0.,.056)))));                  // 박공 가운데 작은 해 문양`,
// 라퓨타풍 떠 있는 섬: 아래는 층층 바위가 거꾸로 뾰족하게 매달리고, 가장자리엔 성벽과 청록 지붕 탑, 위엔 거대한 나무, 오른쪽으로 가는 폭포.
laputa:`    vec2 q=door*1.85;
    float tr=min(length(q-vec2(0.,.078))-.064,min(length(q-vec2(-.058,.046))-.044,min(length(q-vec2(.06,.05))-.042,min(length(q-vec2(.022,.118))-.04,length(q-vec2(-.03,.11))-.036))));
    float trunk=step(abs(q.x),.01)*step(0.,q.y)*step(q.y,.04);
    c=mix(c,vec3(.30,.20,.12),trunk);
    float crown=1.-smoothstep(-.0015,.0015,tr);
    vec2 bc=vec2(0.,.078);float bd=length(q-bc)-.064;                                                 // 맞은 잎 뭉치의 중심으로 명암(뭉치마다 둥글게)
    if(length(q-vec2(-.058,.046))-.044<bd){bc=vec2(-.058,.046);bd=length(q-bc)-.044;}
    if(length(q-vec2(.06,.05))-.042<bd){bc=vec2(.06,.05);bd=length(q-bc)-.042;}
    if(length(q-vec2(.022,.118))-.04<bd){bc=vec2(.022,.118);bd=length(q-bc)-.04;}
    if(length(q-vec2(-.03,.11))-.036<bd){bc=vec2(-.03,.11);}
    float tone=smoothstep(-.1,.5,dot(normalize(q-bc+vec2(0.,1e-4)),vec2(-.6,.8)));
    c=mix(c,vec3(.10,.22,.16),(1.-smoothstep(-.0015,.0045,tr))*(1.-crown)*.6);                          // 수관 윤곽
    c=mix(c,mix(vec3(.03,.13,.06),vec3(.26,.56,.12),smoothstep(.35,.6,tone))*(.9+.2*vn(q*70.)),crown);                  // 거대한 나무(툰 두 단)
    float under=step(q.y,0.)*step(length(q/vec2(.135,.10)),1.);
    under=max(under,step(q.y,-.08)*step(-.16,q.y)*step(abs(q.x),.03*(q.y+.16)/.08));                   // 아래로 뾰족한 바위 끝
    float band=.5+.5*sin(q.y*240.+sin(q.x*55.)*1.6);
    vec3 rock=mix(vec3(.16,.13,.17),vec3(.62,.50,.40),.35*band+.65*smoothstep(.06,-.10,q.x))*(.5+.5*smoothstep(-.14,0.,q.y));
    rock=mix(rock,vec3(.20,.42,.16),step(-.012,q.y)*.8);                                              // 위 가장자리 이끼
    float rimU=step(q.y,.002)*step(length(q/vec2(.141,.106)),1.)*(1.-under);
    c=mix(c,vec3(.16,.17,.28),rimU*.6);
    c=mix(c,rock,under);
    float hh=fract(sin(floor(q.x*70.)*12.9898)*43758.5),hang=step(abs(fract(q.x*70.)-.5),.12)*step(q.y,-.004)*step(-.012-.05*hh,q.y)*step(.55,hh)*step(abs(q.x),.115);
    c=mix(c,vec3(.10,.30,.08),hang*.9);                                                // 늘어진 뿌리·덩굴
    float wall=step(abs(q.x),.125)*step(0.,q.y)*step(q.y,.017);
    float win=step(abs(fract(q.x*48.)-.5),.17)*step(.004,q.y)*step(q.y,.012);
    c=mix(c,mix(mix(vec3(1.9,1.8,1.6),vec3(.86,.82,.96),smoothstep(-.04,.12,q.x)),vec3(.20,.22,.36),win),wall);  // 성벽과 아치 창
    float tx=abs(abs(q.x)-.104),tw=step(tx,.009)*step(0.,q.y)*step(q.y,.042);
    float roof=step(.042,q.y)*step(q.y,.042+.026*(1.-tx/.012))*step(tx,.012);
    c=mix(c,mix(vec3(1.9,1.8,1.6),vec3(.86,.82,.96),step(0.,q.x)*.7),tw);
    c=mix(c,mix(vec3(.30,.66,.64),vec3(.16,.40,.44),step(0.,q.x)),roof);                               // 청록 동판 지붕
    float wf=step(abs(q.x-.09),.004)*step(-.13,q.y)*step(q.y,0.)*smoothstep(-.13,-.02,q.y);
    c=mix(c,vec3(1.9,1.95,2.),wf*.85);                                                                // 가장자리에서 떨어지는 가는 폭포
    float wisp=max(1.-smoothstep(.8,1.05,length((q+vec2(.10,.012))/vec2(.07,.016))),1.-smoothstep(.8,1.05,length((q-vec2(.12,-.03))/vec2(.06,.014))));
    c=mix(c,vec3(.97,.96,1.),wisp*.9);                                                                // 섬을 감싸는 구름 자락`};
function makeFS(M){
  if(!Number.isInteger(M.treeCount)||M.treeCount<0||M.treeCount>8)throw new Error('Invalid tree count');
  M=sceneMode==='day'?{...MAPS[0],treeCount:MAP_SCENES.dayTrees.length}:M;
  return `precision highp float;
const float uDay=${sceneMode==='day'?'1.':'0.'}; const float CONIF=${sceneMode==='day'?MAP_SCENES.dayConifers:0}.; uniform vec2 uRes; uniform vec3 uRo,uCu,uCv,uCw; uniform float uFl;
uniform sampler2D uHm, uCl; uniform vec2 uHN; uniform vec4 uDom; uniform vec3 uL;
uniform vec4 uNodes[10]; uniform vec4 uTrees[48]; uniform vec4 uRocks[6];
uniform vec3 uTent, uSign, uFlag, uDoor; uniform float uSignRot; uniform vec2 uDoorUV;
uniform vec4 uHouse;  // 오른쪽 들판의 외딴집: 바닥 중심 xyz · 돌린 각도(하루만)
uniform vec3 uGiant;  // 하늘 끝까지 닿는 거대한 나무: 밑동 중심(하루만)
uniform vec4 uDw, uDw2;  // 난쟁이: 발 위치 xyz · 바라보는 방향 / 크기 · 찌그러짐 · 켜짐 · 뜬 높이
uniform vec4 uDw3;  // 모자 씀 · 트램펄린을 발밑에(3선) · 트램펄린 위로 튄 높이 · 트램펄린 없음(그 주에 잃음)
uniform vec4 uHats[6];  // 그 주에 잃은 모자들: 놓인 자리 xyz · 돌린 각도. 없으면 y=-500
uniform vec4 uBroken;   // 잃은 트램펄린(망가진 채 누움): 자리 xyz · 돌린 각도. 없으면 y=-500
uniform sampler2D uPath; uniform vec2 uPathOn;  // 샛길·오솔길 거리(R·G) / 각 길이 열렸는지
const float ROCK_START=${glslFloat(M.rockStart)},ROCK_END=${glslFloat(M.rockEnd)},SNOW_START=${glslFloat(M.snowStart)},SNOW_END=${glslFloat(M.snowEnd)};
const float FLOWERS=${glslFloat(M.flowerThreshold)},FOG_START=${glslFloat(M.fogStart)},FOG_DENSITY=${glslFloat(M.fogDensity)};
const vec3 GRASS_DARK=${glslColor(M.paletteLinear.grassDark)},GRASS=${glslColor(M.paletteLinear.grass)},DRY=${glslColor(M.paletteLinear.dry)};
const vec3 TREE_DARK=${glslColor(M.paletteLinear.treeDark)},TREE=${glslColor(M.paletteLinear.tree)},ROCK_DARK=${glslColor(M.paletteLinear.rockDark)},ROCK=${glslColor(M.paletteLinear.rock)};
const vec3 SNOW=${glslColor(M.paletteLinear.snow)},PACKED_SNOW=${glslColor(M.paletteLinear.packed)},FOG=${glslColor(M.paletteLinear.fog)};
const vec3 MTN_FAR=${glslColor(M.mountainLayerColors[0])},MTN_MID=${glslColor(M.mountainLayerColors[1])},MTN_NEAR=${glslColor(M.mountainLayerColors[2])};
const float CY=${CLOUD_Y.toFixed(1)}, CA=${CLOUD_AMP.toFixed(2)}, CS=256.0;
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1,0)),u.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),u.x),u.y);}
float dec(vec4 t){return (t.r*65280.+t.g*255.)/65535.*100.-60.;}
vec4 hmAll(vec2 xz){
  vec2 g=(xz-uDom.xy)/uDom.zw*(uHN-1.);
  if(g.x<0.||g.y<0.||g.x>uHN.x-1.||g.y>uHN.y-1.) return vec4(-60.,3.,-8.,0.);
  vec2 i=floor(g),f=g-i,o=1./uHN,tx=(i+.5)*o;
  vec4 a=texture2D(uHm,tx),b=texture2D(uHm,tx+vec2(o.x,0.)),c=texture2D(uHm,tx+vec2(0.,o.y)),d=texture2D(uHm,tx+o);
  float h=mix(mix(dec(a),dec(b),f.x),mix(dec(c),dec(d),f.x),f.y);
  vec2 ba=mix(mix(a.ba,b.ba,f.x),mix(c.ba,d.ba,f.x),f.y);
  return vec4(h,ba.x*3.,ba.y*16.-8.,0.);
}
float hm(vec2 xz){
  vec2 g=(xz-uDom.xy)/uDom.zw*(uHN-1.);
  if(g.x<0.||g.y<0.||g.x>uHN.x-1.||g.y>uHN.y-1.) return -60.;
  vec2 i=floor(g),f=g-i,o=1./uHN,tx=(i+.5)*o;
  return mix(mix(dec(texture2D(uHm,tx)),dec(texture2D(uHm,tx+vec2(o.x,0.))),f.x),mix(dec(texture2D(uHm,tx+vec2(0.,o.y))),dec(texture2D(uHm,tx+o)),f.x),f.y);
}
vec4 cl(vec2 xz){return texture2D(uCl,xz/CS);}
float ch(vec2 xz){return CY+cl(xz).r*CA;}
// 세 층의 산맥은 하늘에서 계산한다. 추가 레이마칭이나 FBM은 없다.
vec3 sky(vec3 rd){
  float e=rd.y,az=atan(rd.x,-rd.z);
  if(uDay>.5){
    vec3 c=mix(vec3(.72,.87,.98),vec3(.22,.50,.98),smoothstep(-.02,.62,e));  // 맑은 파스텔 하늘, 지평선만 연하게
    c=mix(c,vec3(1.,.80,.86),.55*(1.-smoothstep(0.,.17,e)));  // 드림코어: 지평선은 복숭아·분홍빛
    vec2 cp=vec2(mod(az+.65,1.3)-.65,(e-.35)*1.8);
    float puff=min(length(cp)-.16,min(length(cp-vec2(.14,.04))-.12,length(cp+vec2(.13,.02))-.13));
    float clouds=1.-smoothstep(-.012,.022,puff);
    c=mix(c,mix(vec3(.84,.76,.92),vec3(1.,.98,.96),smoothstep(.20,.48,e)),clouds*.94);  // 구름 그늘은 라벤더
    float moon=1.-smoothstep(.024,.029,length(vec2(az+.48,e-.43)));c=mix(c,vec3(.95,.98,1.),moon*.85);
    c+=vec3(.15,.10,.04)*pow(max(0.,dot(rd,normalize(vec3(-.62,.66,.42)))),18.);
    // Two distant woodland layers close the open horizon, without ray objects.
    float ridge=.028+.025*vn(vec2(az*17.,4.))+.012*sin(az*51.);
    c=mix(c,vec3(.24,.38,.27),1.-smoothstep(ridge,ridge+.008,e));
    c=mix(c,vec3(.12,.26,.13),1.-smoothstep(ridge-.025,ridge-.018,e));
    // 하늘의 꿈 장치(문 · 신전 · 떠 있는 섬). 자리는 JS doorSpot()이 나무·패널에 안 가리는 하늘에서 고른다.
    // 모두 화면 좌표의 식 몇 줄이라 하늘 픽셀에서만 계산되고 반복문도 없다.
    vec2 dream=vec2(dot(rd,uCu),dot(rd,uCv))/max(.01,dot(rd,uCw));
    vec2 door=dream-uDoorUV;
    c+=vec3(1.,.96,.86)*${SKY_MOTIF==='door'?.32:.14}*exp(-dot(door/vec2(${SKY_EXT[0]*1.4},${SKY_EXT[1]*1.2}),door/vec2(${SKY_EXT[0]*1.4},${SKY_EXT[1]*1.2})));  // 뒤의 은은한 빛
    // ① 옅은 무지개 고리: 아래를 중심으로 한 반원, 바깥 빨강 → 안쪽 보라
    float rr=(length((door-vec2(0.,-.10))*vec2(1.,1.15))-${SKY_EXT[4]})/.05;
    vec3 bow=.55+.45*cos(6.2832*(clamp(rr,0.,1.)*.75+vec3(0.,.33,.67)));
    c=mix(c,bow,.20*smoothstep(0.,.25,rr)*(1.-smoothstep(.75,1.,rr))*smoothstep(-.06,.02,door.y+.10)*smoothstep(.02,.10,e));
    // ② 하늘에 떠서 이어지는 계단: 왼쪽 아래에서 다섯 칸, 멀어질수록 희미하게 녹는다
    float si=floor((-door.x-${SKY_EXT[3]})/.045), top=${SKY_EXT[5]}-si*.03;
    float stair=step(0.,si)*step(si,4.)*(1.-smoothstep(.0,.004,door.y-top))*smoothstep(-.016,-.012,door.y-top);
    c=mix(c,mix(vec3(.80,.80,.92),vec3(1.,.99,.97),smoothstep(-.006,-.002,door.y-top)),stair*(1.-si*.17));
${SKY_GLSL[SKY_MOTIF]}
    return c;
  }
  vec3 c=mix(vec3(.600,.720,.800),vec3(.025,.150,.300),smoothstep(-.04,.30,e));
  float cloudNoise=vn(vec2(az*9.,e*18.));
  vec2 cp=vec2(az*1.9,(e-.18)*4.5);
  float puff=min(length(cp)-.42,min(length(cp-vec2(.36,.12))-.32,length(cp+vec2(.34,-.03))-.34));
  vec2 cp2=vec2((az-.76)*1.8,(e-.20)*4.);
  puff=min(puff,min(length(cp2)-.35,length(cp2-vec2(.30,-.06))-.28));
  float cloud=1.-smoothstep(-.015,.025,puff+(cloudNoise-.5)*.07);
  c=mix(c,mix(vec3(.52,.60,.67),vec3(.94,.95,.94),smoothstep(.08,.42,e)),cloud*.98);
  float farH=.02+.045*vn(vec2(az*6.,1.))+.022*abs(fract(az*6.)-.5);
  if(e<farH)c=MTN_FAR;
  float midH=.045+.065*vn(vec2(az*8.,7.))+.035*abs(fract(az*9.)-.5);
  if(e<midH)c=MTN_MID;
  // 같은 방향으로 기운 비대칭 톱니: 긴 풀 사면과 짧고 가파른 절벽.
  // 방위각/고도각만 사용하므로 3D 레이마칭 비용과 경로 높이에 영향이 없다.
  float a=az-e*.36;
  float r0=.184-max((.285-a)*1.05,(a-.285)*2.8);
  float r1=.137-max((.392-a)*1.2,(a-.392)*3.6);
  float r2=.159-max((.492-a)*.95,(a-.492)*2.9);
  float r3=.112-max((.613-a)*1.15,(a-.613)*3.8);
  float ridge=max(max(r0,r1),max(r2,r3));
  ridge+=(vn(vec2(a*94.,3.))-.45)*.016+.004*(1.-abs(fract(a*57.)*2.-1.));
  if(e<ridge&&ridge>.028){
    float tooth=r0>=max(r1,max(r2,r3))?a-.285:r1>=max(r2,r3)?a-.392:r2>=r3?a-.492:a-.613;
    float stoneNoise=vn(vec2((az-e*.24)*57.,e*31.));
    float fluting=abs(fract((az-e*.38)*43.+stoneNoise*.7)*2.-1.);
    float joint=1.-smoothstep(.035,.11,fluting);
    float facet=smoothstep(-.075,.028,tooth+e*.12);
    vec3 limestone=mix(vec3(.045,.057,.068),vec3(.205,.220,.225),facet);
    limestone*=.64+.48*stoneNoise;
    limestone*=1.-joint*.34;
    // 풀은 완만한 뒤 사면에만 남고, 수직면은 층리와 푸른 그늘을 드러낸다.
    float turf=(1.-smoothstep(-.065,-.018,tooth))
      *smoothstep(ridge*.30,ridge*.73,e);
    limestone=mix(limestone,vec3(.115,.205,.042)*(.72+.28*cloudNoise),turf*.92);
    c=mix(limestone,MTN_MID,.09+.12*(1.-smoothstep(.01,.15,e)));
  }
  c=mix(c,FOG,.38*(1.-smoothstep(-.12,.015,e)));
  float sun=max(dot(rd,uL),0.);c+=vec3(1.,.95,.85)*pow(sun,40.)*.25;
  return c;
}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdNode(vec3 q){vec2 d=vec2(length(q.xz)-1.3,abs(q.y)-.1);return min(max(d.x,d.y),0.)+length(max(d,0.))-.16;}
float sdCone(vec3 p,vec2 c,float h){vec2 q=h*vec2(c.x/c.y,-1.);vec2 w=vec2(length(p.xz),p.y);vec2 a=w-q*clamp(dot(w,q)/dot(q,q),0.,1.);vec2 b=w-q*vec2(clamp(w.x/q.x,0.,1.),1.);float k=sign(q.y);float d=min(dot(a,a),dot(b,b));float s=max(k*(w.x*q.y-w.y*q.x),k*(w.y-q.y));return sqrt(d)*sign(s);}
vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.z,p.y,s*p.x+c*p.z);}
float sdCapCone(vec3 p,float h,float r1,float r2){vec2 q=vec2(length(p.xz),p.y),k1=vec2(r2,h),k2=vec2(r2-r1,2.*h);vec2 ca=vec2(q.x-min(q.x,q.y<0.?r1:r2),abs(q.y)-h);vec2 cb=q-k1+k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.,1.);float s=(cb.x<0.&&ca.y<0.)?-1.:1.;return s*sqrt(min(dot(ca,ca),dot(cb,cb)));}
float sdEll(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/k1;}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.))-r;}
/* 난쟁이 좌표: 발이 원점, 앞이 +z, 트램펄린은 등(-z). 세계 → 몸 좌표로 옮겨 잰다 */
vec3 dwLocal(vec3 p){vec3 q=rotY(p-uDw.xyz,-uDw.w)/uDw2.x;q.y/=1.-uDw2.y*.14;q.xz/=1.+uDw2.y*.12;return q;}
vec3 trLocal(vec3 q){vec3 t=q-vec3(0.,1.35,-.74);float c=.995,s=-.105;  /* 등에 기대 위가 살짝 앞으로 */t=vec3(t.x,c*t.y-s*t.z,s*t.y+c*t.z);c=.961;s=-.276;return vec3(c*t.x-s*t.y,s*t.x+c*t.y,t.z);}
vec2 dwarf(vec3 p){
  if(uDw2.z<.5) return vec2(1e5,20.);
  vec3 q=dwLocal(p);float k=uDw2.x*(1.-uDw2.y*.14);
  float b=length(q-vec3(0.,2.1,-.2))-2.7; if(b>.3) return vec2(b*k,20.);
  float fm=uDw3.y;vec3 qb=q-vec3(0.,fm*.42+uDw3.z,0.);  // 3선: 발밑 트램펄린 위로 몸을 올린다
  vec3 m=vec3(abs(qb.x),qb.yz);
  // 약 2.8등신 소년: 가는 두 바짓단과 둥근 어깨의 짧은 블레이저.
  float d=sdBox(qb-vec3(0.,1.36,0.),vec3(.29,.39,.19))-.065,id=20.;
  float arm=sdCap(m,vec3(.31,1.67,0.),vec3(.45,1.02,.08),.115);d=smin(d,arm,.06);
  float t=sdCap(m,vec3(.18,.85,0.),vec3(.19,.23,.035),.12);if(t<d){d=t;id=27.;}
  t=sdEll(m-vec3(.19,.12,.12),vec3(.16,.12,.27));if(t<d){d=t;id=27.;}
  t=sdCap(m,vec3(.45,1.02,.08),vec3(.46,.94,.095),.119);if(t<d){d=t;id=23.;}
  t=sdEll(m-vec3(.465,.84,.1),vec3(.125,.15,.115));if(t<d){d=t;id=22.;}
  // 조끼의 V 절개 뒤로 흰 셔츠가 보이고, 깃 두 장이 목을 감싼다.
  t=sdBox(qb-vec3(0.,1.38,.225),vec3(.22,.34,.04))-.025;
  t=max(t,qb.y-1.43-abs(qb.x)*1.35);if(t<d){d=t;id=24.;}
  t=sdEll(qb-vec3(0.,1.73,.24),vec3(.19,.23,.055));if(t<d){d=t;id=23.;}
  t=sdCap(qb,vec3(0.,1.77,0.),vec3(0.,1.98,0.),.14);if(t<d){d=t;id=22.;}
  t=sdCap(m,vec3(.09,1.86,.25),vec3(.16,1.7,.29),.06);if(t<d){d=t;id=23.;}
  // 각진 라펠, 단추 두 개, 작은 붉은 나비넥타이.
  t=sdCap(m,vec3(.27,1.77,.205),vec3(.18,1.43,.27),.065);if(t<d){d=t;id=20.;}
  t=min(length(qb-vec3(.235,1.28,.267)),length(qb-vec3(.235,1.06,.267)))-.045;if(t<d){d=t;id=27.;}
  t=sdEll(m-vec3(.09,1.755,.338),vec3(.095,.075,.045));
  t=min(t,length(qb-vec3(0.,1.755,.35))-.05);if(t<d){d=t;id=23.;}
  // 둥근 얼굴, 작은 귀와 코. 수염 없이 짧은 갈색 머리를 드러낸다.
  t=sdEll(qb-vec3(0.,2.43,.025),vec3(.56,.585,.48));if(t<d){d=t;id=22.;}
  t=sdEll(m-vec3(.55,2.37,.015),vec3(.105,.15,.1));if(t<d){d=t;id=22.;}
  t=sdEll(qb-vec3(0.,2.34,.505),vec3(.075,.085,.085));if(t<d){d=t;id=22.;}
  t=sdEll(m-vec3(.21,2.5,.477),vec3(.073,.112,.035));if(t<d){d=t;id=27.;}
  t=sdEll(qb-vec3(0.,2.75,-.055),vec3(.575,.31,.475));
  t=min(t,sdEll(qb-vec3(-.26,2.79,.36),vec3(.27,.19,.12)));
  t=min(t,sdEll(qb-vec3(.13,2.84,.39),vec3(.24,.14,.1)));
  t=min(t,sdEll(m-vec3(.49,2.58,-.025),vec3(.075,.22,.27)));if(t<d){d=t;id=24.;}
  if(uDw3.x>.5){  // 둥글게 부푼 뉴스보이 캡과 앞으로만 나온 짧은 챙.
    t=sdEll(qb-vec3(-.035,3.025,-.055),vec3(.64,.285,.54));
    t=smin(t,sdEll(qb-vec3(0.,2.86,.015),vec3(.565,.065,.49)),.025);
    t=min(t,sdEll(qb-vec3(0.,2.88,.455),vec3(.5,.055,.285)));if(t<d){d=t;id=21.;}}
  if(uDw3.w>.5){}  // 그 주에 트램펄린을 잃었다: 등에도 발밑에도 없다
  else if(fm<.5){vec3 r=trLocal(qb);  // 등에 멘 트램펄린
    t=length(vec2(length(r.xy)-.95,r.z))-.1;if(t<d){d=t;id=26.;}
    vec2 cy=vec2(length(r.xy)-.92,abs(r.z)-.04);t=min(max(cy.x,cy.y),0.)+length(max(cy,0.));if(t<d){d=t;id=25.;}
    vec3 rl=vec3(abs(r.x),r.yz);t=sdCap(rl,vec3(.5,-.78,-.04),vec3(.66,-1.08,-.4),.05);if(t<d){d=t;id=27.;}}
  else{vec3 r=q-vec3(0.,.32,0.);float rr=length(r.xz);  // 발밑에 깐 트램펄린. 착지하면 매트가 눌린다
    float dip=(uDw2.y*.16+max(0.,.12-uDw3.z)*.6)*max(0.,1.-rr*rr/.85);
    t=length(vec2(rr-.95,r.y))-.1;if(t<d){d=t;id=26.;}
    vec2 cy=vec2(rr-.92,abs(r.y+dip)-.04);t=min(max(cy.x,cy.y),0.)+length(max(cy,0.));if(t<d){d=t;id=25.;}
    vec3 l4=vec3(abs(q.x),q.y,abs(q.z));t=sdCap(l4,vec3(.63,.3,.63),vec3(.7,0.,.7),.05);if(t<d){d=t;id=27.;}}
  return vec2(d*k,id);
}
/* 잃어버린 모자: 동일한 파란 캡을 풀밭에 살짝 기울여 놓는다. */
float lostHat(vec3 p,vec4 hat){vec3 q=(p-hat.xyz)/uDw2.x;float b=length(q-vec3(.15,0.,.1))-.95;if(b>.3)return b*uDw2.x;
  vec3 h=rotY(q,hat.w);h=vec3(.94*h.x-.342*h.y,.342*h.x+.94*h.y,h.z);
  float t=sdEll(h-vec3(-.035,.04,-.055),vec3(.64,.285,.54));
  t=smin(t,sdEll(h-vec3(0.,-.125,.015),vec3(.565,.065,.49)),.025);
  t=min(t,sdEll(h-vec3(0.,-.105,.455),vec3(.5,.055,.285)));return t*uDw2.x;}
/* 망가진 트램펄린: 한쪽이 땅에 닿게 기울어 누웠고, 테 한 군데가 끊기고 매트가 찢어졌으며 다리 둘이 꺾였다.
   28 테(끊김) / 29 매트(찢김) / 30 다리. 소년의 27(다리·신발)과 나누는 건 소년 몸 좌표로 색을 고르기 때문 */
vec2 brokenTramp(vec3 p){vec3 q=rotY((p-uBroken.xyz)/uDw2.x,uBroken.w);float b=length(q-vec3(0.,.35,0.))-1.45;if(b>.3)return vec2(b*uDw2.x,28.);
  vec3 t=q-vec3(0.,.42,0.);float c=.906,s=.423;t=vec3(t.x,c*t.y-s*t.z,s*t.y+c*t.z);  // x축으로 25도 기울임
  float r=length(t.xz),ang=abs(atan(t.z,t.x)-1.2);
  float rim=max(length(vec2(r-.95,t.y))-.1,-(ang-.28)*r);  // 테의 끊긴 틈
  vec2 cy=vec2(r-.92,abs(t.y+.02)-.035);float mat=min(max(cy.x,cy.y),0.)+length(max(cy,0.));
  float tear=max(abs(t.x*.8-t.z*.6)-.04,-(t.x*.6+t.z*.8)+.05);mat=max(mat,-tear);  // 가운데에서 가장자리로 찢김
  float leg=min(sdCap(t,vec3(.62,-.05,.62),vec3(.95,-.25,.35),.05),sdCap(t,vec3(-.66,-.05,-.6),vec3(-.62,.35,-.95),.05));
  float d=rim,id=28.;if(mat<d){d=mat;id=29.;}if(leg<d){d=leg;id=30.;}
  return vec2(d*uDw2.x,id);}
/* 하루 나무 한 그루의 거리(나무 좌표 v, 1단위=s). 반환: x 거리, y 1=잎 0=줄기·가지.
   물체 걷기·법선·색칠이 모두 이 함수를 쓴다. 경계 구 안(bb<.5)에서만 불린다. */
// 침엽수(젤다 BotW풍): 가늘고 키 큰 줄기에 처진 가지 층 6단. 층은 가장자리로 갈수록 아래로 처지고 테두리에 가지 술이 난다.
// 층 6개를 다 재지 않고 높이로 가까운 층 셋만 식으로 고른다(반복문 없음). 처짐 기울기만큼 보폭을 줄인다.
float pineTier(vec3 v,float k,float tas){float h=1.6+.7*k,R=1.35-.19*k,r=length(v.xz);
  float rr=R+tas;                                       // 가지 술(가장 가까운 층만 계산해 넘긴다)
  float dy=v.y-(h-.55*r*r/R);                           // 가장자리로 갈수록 처진다
  return max(r-rr,abs(dy)-(.28*(1.-r/rr)+.07))*.6;}
vec2 coniferT(vec3 v){float an=atan(v.z,v.x),k=clamp(floor((v.y-1.6)/.7+.5),0.,5.);
  float f=min(pineTier(v,k,.12*sin(an*7.+k*1.7)*min(length(v.xz),1.)),min(pineTier(v,max(k-1.,0.),.06),pineTier(v,min(k+1.,5.),.06)));
  f=min(f,max((length(v.xz)-.32+(v.y-5.7)*.32)*.95,abs(v.y-5.85)-.45));   // 꼭대기 끝
  float wood=max(length(v.xz)-(.14-.012*v.y),abs(v.y-2.9)-2.9);
  return vec2(min(f,wood),wood<f?0.:1.);}
// 활엽수(젤다 BotW풍): 아래가 굵고 살짝 휜 줄기가 네 갈래 가지로 갈라지고, 가지 끝마다 따로 떨어진 잎 뭉치가 달린다.
// 뭉치 사이로 하늘이 보인다. 잎 덩어리는 매끈하게 두고(요철은 걷기 비용이 커서 뺐다) 색으로만 결을 낸다. 나무마다 돌려 같은 모양이 반복되지 않게.
vec2 leafyT(vec3 v,float fi){vec3 w=rotY(v,fi*2.39);
  vec2 bend=vec2(.12*sin(w.y*1.1+fi),.08*cos(w.y*.9+fi*1.7));
  float wood=max(length(w.xz-bend)-(.27-.06*w.y),abs(w.y-1.15)-1.15);
  vec3 J=vec3(.12*sin(2.37+fi),2.15,.08*cos(1.94+fi*1.7));
  wood=min(wood,min(sdCap(w,J,vec3(-1.15,3.25,.35),.11),sdCap(w,J,vec3(1.05,3.45,-.35),.1)));
  wood=min(wood,min(sdCap(w,J,vec3(.15,4.15,.25),.09),sdCap(w,J,vec3(.35,2.95,1.05),.08)));
  wood=min(wood,min(sdCap(w,vec3(0.,1.55,0.),vec3(1.35,2.05,.45),.06),sdCap(w,vec3(0.,1.8,0.),vec3(-1.25,2.3,-.55),.055)));  // 옆으로 뻗는 낮은 가지
  float c=sdEll(w-vec3(-1.25,3.45,.4),vec3(1.,.78,.95));
  c=min(c,min(sdEll(w-vec3(1.5,2.15,.5),vec3(.48,.33,.42)),sdEll(w-vec3(-1.4,2.4,-.6),vec3(.42,.3,.4))));  // 옆가지 끝 작은 잎 술
  c=smin(c,sdEll(w-vec3(1.1,3.7,-.4),vec3(.95,.75,.9)),.18);
  c=smin(c,sdEll(w-vec3(.15,4.45,.25),vec3(1.05,.8,1.)),.18);
  c=smin(c,sdEll(w-vec3(.4,3.15,1.15),vec3(.8,.62,.75)),.18);
  c=smin(c,sdEll(w-vec3(-.35,3.9,-.85),vec3(.7,.55,.65)),.18);
  return vec2(min(c,wood),wood<c?0.:1.);}
float conD(vec3 p,vec4 a){float s=a.w/1.45;return coniferT((p-a.xyz)/s+vec3(0.,2.35,0.)).x*s;}
float leafD(vec3 p,vec4 a,float fi){float s=a.w/1.45;return leafyT((p-a.xyz)/s+vec3(0.,2.35,0.),fi).x*s;}
// 색칠 단계에서만: 맞은 점에 가장 가까운 한 그루를 고르고(gTA·gTI) 그 나무 모양의 기울기로 법선을 잰다.
// 경계 구가 먼 나무는 건너뛰고, 침엽수·활엽수를 따로 돌아 두 모양을 함께 계산하지 않게 한다.
vec4 gTA;float gTI;
float treeBound(vec3 p,vec4 a){float s=a.w/1.45;return length(p-a.xyz-vec3(0.,.85*s,0.))-3.5*s;}
void pickDayTree(vec3 p){float bd=1e5;
  for(int i=0;i<${sceneMode==='day'?MAP_SCENES.dayConifers:0};i++){vec4 a=uTrees[i*3];if(treeBound(p,a)>.5)continue;float d=conD(p,a);if(d<bd){bd=d;gTA=a;gTI=float(i);}}
  for(int i=${sceneMode==='day'?MAP_SCENES.dayConifers:0};i<${M.treeCount};i++){vec4 a=uTrees[i*3];if(treeBound(p,a)>.5)continue;float d=leafD(p,a,float(i));if(d<bd){bd=d;gTA=a;gTI=float(i);}}}
vec3 dayTreeN(vec3 p){vec2 e=vec2(.006,-.006);
  if(gTI<CONIF)return normalize(e.xyy*conD(p+e.xyy,gTA)+e.yyx*conD(p+e.yyx,gTA)+e.yxy*conD(p+e.yxy,gTA)+e.xxx*conD(p+e.xxx,gTA));
  return normalize(e.xyy*leafD(p+e.xyy,gTA,gTI)+e.yyx*leafD(p+e.yyx,gTA,gTI)+e.yxy*leafD(p+e.yxy,gTA,gTI)+e.xxx*leafD(p+e.xxx,gTA,gTI));}
vec2 obj(vec3 p,float foliage){
  float d=1e5,id=0.;
  for(int i=0;i<10;i++){vec3 q=p-uNodes[i].xyz;float b=length(q)-3.;float dd=b>.4?b:sdNode(q);if(uDay>.5&&b<.4)dd=min(sdBox(q-vec3(0.,.7,0.),vec3(.09,.9,.09)),sdBox(q-vec3(0.,1.7,0.),vec3(.8,.32,.12)));if(dd<d){d=dd;id=10.+float(i);}}
  // 하루: 침엽수와 활엽수를 따로 돈다. 한 반복 안에서 '조건 ? 침엽수 : 활엽수'로 고르면 GPU가 두 모양을 다 계산하는 일이 많다.
  // 경계도 모양에 맞춘다: 침엽수는 좁고 긴 원기둥, 활엽수는 세운 캡슐.
  if(foliage>.5){${sceneMode==='day'?`
    for(int i=0;i<${MAP_SCENES.dayConifers};i++){vec4 a=uTrees[i*3];float s=a.w/1.45;vec3 q=p-a.xyz+vec3(0.,2.35*s,0.);
      float dd=max(length(q.xz)-1.6*s,abs(q.y-3.15*s)-3.25*s);if(dd<.4)dd=coniferT(q/s).x*s;if(dd<d){d=dd;id=2.;}}
    for(int i=${MAP_SCENES.dayConifers};i<${M.treeCount};i++){vec4 a=uTrees[i*3];float s=a.w/1.45;vec3 q=p-a.xyz+vec3(0.,2.35*s,0.);
      float dd=length(q-vec3(0.,clamp(q.y,s,3.4*s),0.))-2.65*s;if(dd<.4)dd=leafyT(q/s,float(i)).x*s;if(dd<d){d=dd;id=2.;}}`:`
    for(int i=0;i<${M.treeCount};i++){vec4 a=uTrees[i*3];float s=a.w/1.45;vec3 q=p-a.xyz+vec3(0.,2.35*s,0.);
      float dd=length(q-vec3(0.,2.85*s,0.))-3.2*s;
      // 주간은 두 capped cone의 보수적 거리(멀리서 보는 작은 나무)
      if(dd<.5){vec3 v=q/s;float r=length(v.xz);
        float low=max((r-.765+(v.y-2.35)*.415152)*.9236,abs(v.y-2.35)-1.65);
        float high=max((r-.535+(v.y-4.35)*.381481)*.9343,abs(v.y-4.35)-1.35);
        dd=min(min(low,high),sdBox(v-vec3(0.,.55,0.),vec3(.10,.55,.10)))*s;}
      if(dd<d){d=dd;id=2.;}}`}}
  for(int i=0;i<${ROCKS.length};i++){vec4 a=uRocks[i];vec3 q=rotY(p-a.xyz,.37+float(i)*.71);float bb=length(q)-2.;
    float dd=bb>.3?bb:uDay>.5?smin(sdEll(q-vec3(0.,-.1,0.),vec3(1.45,.85,1.1)),sdEll(q-vec3(.55,.25,.2),vec3(.8,.6,.7)),.3):sdBox(q,vec3(1.35,.85,1.05))-.16;if(dd<d){d=dd;id=1.;}}
  {vec3 q=p-uTent;float b=length(q+vec3(0.,1.7,0.))-3.;float dd=b>.3?b:sdCone(q,vec2(.5,.866),3.4);if(dd<d){d=dd;id=4.;}}
  {vec3 q=p-uSign;float b=length(q-vec3(0.,3.,0.))-3.5;
    if(b>.3){if(b<d){d=b;id=5.;}}
    else{float pole=sdBox(q-vec3(0.,2.3,0.),vec3(.10,2.3,.10));vec3 r=rotY(q-vec3(0.,4.8,0.),uSignRot);float bd=sdBox(r,vec3(1.7,1.1,.09));
      if(pole<d){d=pole;id=5.;} if(bd<d){d=bd;id=6.;}}}
  {vec3 q=p-uFlag;float b=length(q-vec3(.7,2.,0.))-2.4;
    if(b>.3){if(b<d){d=b;id=7.;}}
    else{float pole=sdBox(q-vec3(0.,1.9,0.),vec3(.06,1.9,.06));float fl=sdBox(q-vec3(.85,3.25,0.),vec3(.8,.48,.03));
      if(pole<d){d=pole;id=7.;} if(fl<d){d=fl;id=8.;}}}
  {vec3 q=p-uDoor;float b=length(q-vec3(0.,1.3,0.))-2.;
    if(b>.3){if(b<d){d=b;id=9.;}}
    else{float fr=sdBox(q-vec3(0.,1.35,0.),vec3(.78,1.42,.1));float pn=sdBox(q-vec3(0.,1.3,.06),vec3(.64,1.28,.08));
      if(fr<d){d=fr;id=9.;} if(pn<d){d=pn;id=9.5;}}}
  vec2 w=dwarf(p);if(w.x<d){d=w.x;id=w.y;}
  for(int i=0;i<6;i++){if(uHats[i].y>-100.){float h=lostHat(p,uHats[i]);if(h<d){d=h;id=21.;}}}
  if(uBroken.y>-100.){vec2 bt=brokenTramp(p);if(bt.x<d){d=bt.x;id=bt.y;}}
  return vec2(d,id);
}
float objNormalDistance(vec3 p){return obj(p,${sceneMode==='day'?'0.':'1.'}).x;}
vec3 objN(vec3 p){vec2 e=vec2(.004,-.004);return normalize(e.xyy*objNormalDistance(p+e.xyy)+e.yyx*objNormalDistance(p+e.yyx)+e.yxy*objNormalDistance(p+e.yxy)+e.xxx*objNormalDistance(p+e.xxx));}
float shadow(vec3 p,float withDw){
  float res=1.,t=.25;
  // Day hills have a maximum slope below .06; the high sun cannot be occluded by them.
  // Keep tree, sign and character shadows, but avoid 56 terrain probes on the meadow.
  if(uDay<.5){for(int i=0;i<56;i++){vec3 q=p+uL*t;if(q.y>42.)break;float h=q.y-hm(q.xz);res=min(res,9.*h/t);if(res<.01)break;t+=clamp(h*.45,.2,5.);}}
  for(int i=0;i<${M.treeCount*3};i++){vec4 tr=uTrees[i];vec3 oc=tr.xyz-p;float b=dot(oc,uL);if(b>0.){float dd=length(oc-uL*b)-tr.w;res=min(res,clamp(.5+dd*2./max(b,.5)*2.,0.,1.));}}
  for(int i=0;i<10;i++){vec3 oc=uNodes[i].xyz-p;float b=dot(oc,uL);if(b>0.&&b<6.){float dd=length(oc-uL*b)-1.4;res=min(res,clamp(.4+dd*3.,0.,1.));}}
  if(withDw>.5&&uDw2.z>.5){float s=uDw2.x;
    for(int i=0;i<4;i++){vec3 c;float r;
      if(i==0){c=vec3(0.,.5,.04);r=.32;}else if(i==1){c=vec3(0.,1.39,.02);r=.4;}else if(i==2){c=vec3(0.,2.53,-.015);r=uDw3.x>.5?.62:.55;}else{c=mix(vec3(0.,1.35,-.74),vec3(0.,.32,0.),uDw3.y);r=.88;}
      if(i<3)c.y+=uDw3.y*.42+uDw3.z;else if(uDw3.w>.5)break;
      vec3 oc=uDw.xyz+rotY(c*s,uDw.w)-p;float b=dot(oc,uL);if(b>0.){float dd=length(oc-uL*b)-r*s;res=min(res,clamp(.3+dd*2.2,0.,1.));}}}
  return clamp(res,0.,1.);
}
vec3 SUN=vec3(1.,.95,.86)*2.7;
vec3 AMB=vec3(.30,.44,.78);
vec3 fogit(vec3 c,float t,vec3 rd){
  vec3 hz=FOG;
  float f=min(.70,1.-exp(-max(t-FOG_START,0.)*FOG_DENSITY))*mix(1.,.45,smoothstep(-.04,.14,rd.y));  // 정상부는 덜 뿌옇게
  if(uDay>.5)return mix(c,vec3(.60,.76,.92),smoothstep(45.,240.,t)*.32);  // 하루: 멀수록 푸르게 흐려지는 공기 원근
  // 주간 정상 둘레는 안개를 걷어 바위·눈 경계가 읽히게(비평 2-5)
  if(uDay<.5)f*=mix(.25,1.,smoothstep(20.,55.,length((uRo+rd*t).xz-vec2(${glslFloat(NXZ.sunday[0])},${glslFloat(NXZ.sunday[1])}))));
  return mix(c,hz*1.02,f);
}
vec3 shadeGround(vec3 p,vec3 rd,float t){
  vec4 a=hmAll(p.xz);float h=a.x,q=a.y,s=a.z;
  float e=.22;
  vec3 n=normalize(vec3(hm(p.xz-vec2(e,0.))-hm(p.xz+vec2(e,0.)),2.*e,hm(p.xz-vec2(0.,e))-hm(p.xz+vec2(0.,e))));
  float n1=vn(p.xz*.045),n2=vn(p.xz*.6+7.);
  vec3 alb=mix(GRASS_DARK,GRASS,.7+.3*smoothstep(.15,.85,n1));
  alb=mix(alb,DRY,smoothstep(.58,.88,n2)*.10);
  float rock=max(smoothstep(ROCK_START,ROCK_END,h)*.78,1.-smoothstep(.60,.88,n.y));
  float strata=vn(vec2(p.y*.9,p.x*.12+p.z*.12));
  vec3 rk=mix(ROCK_DARK,ROCK,strata);
  rk=mix(rk,vec3(.240,.230,.200),smoothstep(.65,.85,n2)*.3);
  alb=mix(alb,rk,rock);
  vec2 g=(p.xz-uDom.xy)/uDom.zw*(uHN-1.);
  vec4 path=texture2D(uPath,(g+.5)/uHN);
  vec2 pq=path.rg*3.;
  float road=1.-smoothstep(.80,1.12,q);
  float side=uDay*(1.-smoothstep(.72,1.1,pq.x))*mix(.07,1.,uPathOn.x);
  float spur=uDay*(1.-smoothstep(.7,1.08,pq.y))*mix(.12,1.,uPathOn.y);
  float trail=max(road,max(side,spur));
  // 밝은 석회암 자갈. 패임 없이 가는 등산로로 이어진다.
  vec3 gravel=mix(vec3(.20,.19,.16),vec3(.49,.48,.43),1.-smoothstep(.15,1.2,min(q,min(pq.x,pq.y))));
  gravel*=.94+.12*n2;
  if(uDay>.5){float wind=vn(vec2(dot(p.xz,vec2(.8,.6))*.32,dot(p.xz,vec2(-.6,.8))*4.2));  // 바람에 쓸린 풀 결(한 방향으로 긴 잡음)
    alb=mix(vec3(.05,.14,.02),vec3(.21,.38,.05),n1*.72+n2*.13+wind*.15);alb=mix(alb,vec3(.28,.42,.07),smoothstep(.65,.95,wind)*.18);gravel=mix(vec3(.31,.24,.13),vec3(.60,.50,.30),n2);gravel=mix(gravel,vec3(.11,.24,.035),side*.85);}
  alb=mix(alb,gravel,trail);
  if(uDay>.5){
    // 큰길 바로 옆은 키 큰 풀과 들꽃 띠: 풀 깎은 길과 대비된다(사진 5). 지오메트리 없이 재질만.
    float verge=smoothstep(.95,1.2,q)*(1.-smoothstep(1.9,2.9,q))*(1.-side)*(1.-spur);
    // 2선인 날은 들꽃 샛길 양옆에도 같은 들꽃 띠가 핀다(이름처럼 '들꽃' 샛길)
    verge=max(verge,uPathOn.x*smoothstep(.95,1.2,pq.x)*(1.-smoothstep(1.8,2.6,pq.x))*(1.-road)*(1.-spur));
    alb=mix(alb,vec3(.05,.15,.022),verge*.5);
    vec2 vc=floor(p.xz*4.3),vo=fract(p.xz*4.3)-.5-(vec2(h12(vc+2.1),h12(vc+5.3))-.5)*.5;
    float hue=h12(vc+.7),vf=step(.5,h12(vc+8.7))*(1.-smoothstep(.09,.19,length(vo)))*verge*(1.-smoothstep(55.,105.,t));
    alb=mix(alb,hue<.45?vec3(.95,.76,.10):hue<.78?vec3(.93,.93,.86):vec3(.60,.40,.86),vf*.85);
  }
  float snow=(1.-uDay)*smoothstep(SNOW_START,SNOW_END,h)*smoothstep(.35,.78,n.y);
  // 눈은 얼룩으로 남겨 정상 평지가 흰 덩어리 하나로 뭉개지지 않게 한다(비평 2-5).
  snow*=smoothstep(.40,.56,vn(p.xz*.30)*.7+vn(p.xz*1.2+3.)*.3+.18*smoothstep(SNOW_END,SNOW_END+6.,h));
  alb=mix(alb,SNOW,snow);
  float branchOn=max((1.-smoothstep(1.3,2.2,pq.x))*uPathOn.x,(1.-smoothstep(1.3,2.2,pq.y))*uPathOn.y);
  float compacted=max(trail*.22,max(path.b,path.a*branchOn));
  alb=mix(alb,PACKED_SNOW,snow*compacted*.85);
  vec2 fc=floor(p.xz*2.2),fo=fract(p.xz*2.2)-.5-(vec2(h12(fc+3.1),h12(fc+7.7))-.5)*.6;
  float fm=step(FLOWERS,h12(fc))*(1.-smoothstep(.08,.18,length(fo)))*(1.-smoothstep(9.,16.,h))*smoothstep(.82,.95,n.y)*(1.-trail)*(1.-rock)*(1.-snow)*(1.-smoothstep(120.,180.,t));
  alb=mix(alb,h12(fc+1.3)<.7?vec3(.880,.860,.740):vec3(.950,.620,.060),fm*.5);
  // 접지 그늘
  float ao=1.;
  for(int i=0;i<10;i++){float d=length(p.xz-uNodes[i].xz);ao*=mix(.45,1.,smoothstep(1.2,2.6,d));}
  for(int i=0;i<${M.treeCount*3};i+=3){vec4 tr=uTrees[i];float d=length(p.xz-tr.xz);ao*=mix(.5,1.,smoothstep(tr.w*.4,tr.w*1.9,d));}
  ao*=mix(.55,1.,smoothstep(-6.,0.,s+2.));
  for(int i=0;i<6;i++){if(uHats[i].y>-100.)ao*=mix(.6,1.,smoothstep(.3,1.5,length(p.xz-uHats[i].xz-vec2(.15*uDw2.x,.1*uDw2.x))));}
  if(uDay>.5)ao*=mix(.55,1.,smoothstep(2.6,4.6,length(rotY(p-uHouse.xyz,uHouse.w).xz/vec2(1.,1.25))));  // 외딴집 접지 그늘
  if(uDay>.5)ao*=mix(.45,1.,smoothstep(13.,30.,length(p.xz-uGiant.xz)));  // 거대한 나무 밑동 그늘
  if(uBroken.y>-100.)ao*=mix(.55,1.,smoothstep(.6,2.2,length(p.xz-uBroken.xz)/uDw2.x));
  if(uDw2.z>.5){float dd=length(p.xz-uDw.xz)/uDw2.x;ao*=mix(mix(.42,.9,clamp(uDw2.w*.7,0.,1.)),1.,smoothstep(.35,1.3,dd));}
  float dif=max(dot(n,uL),0.)*shadow(p+n*.08,1.);
  if(uDay>.5){
    // Dapple only beneath the crowns. The flower clearing stays sunlit.
    float canopy=0.;
    for(int i=0;i<${M.treeCount*3};i+=3){vec4 tr=uTrees[i];canopy=max(canopy,1.-smoothstep(tr.w,tr.w*2.7,length(p.xz-tr.xz-vec2(1.8,-1.2))));}
    float leaves=smoothstep(.35,.65,vn(p.xz*1.3)+.22*vn(p.xz*3.8));
    dif*=mix(1.,mix(.72,1.,leaves),canopy);ao=max(.62,ao);
  }
  vec3 col=alb*(SUN*dif+AMB*(.55+.45*n.y)*ao+lin(vec3(.5,.62,.4))*.12*max(-n.y,0.));
  col+=alb*AMB*.12*pow(1.-max(dot(n,-rd),0.),3.);
  // 눈 표면도 사면의 방향과 층리가 읽히도록 지면에서만 반사량을 조절한다.
  col*=mix(1.,.76+.10*n2,snow);
  return col;
}
vec3 shadeCloud(vec3 p,vec3 rd,float t){
  vec4 c=cl(p.xz);
  vec3 n=vec3(c.g*2.-1.,0.,c.b*2.-1.);n.y=sqrt(max(0.,1.-n.x*n.x-n.z*n.z));
  float far=smoothstep(150.,700.,t);n=normalize(mix(n,vec3(0.,1.,0.),far*.7));
  float dif=clamp(dot(n,uL)*.65+.35,0.,1.);
  float sh=1.;
  if(p.x>-80.&&p.x<150.&&p.z>-120.&&p.z<60.) sh=shadow(p+vec3(0.,.1,0.),1.);
  float cav=mix(.62,1.,c.a)*mix(.85,1.,c.r);
  vec3 lit=vec3(.75,.79,.81),dark=vec3(.29,.38,.47);
  vec3 col=mix(dark,lit,dif*mix(.35,1.,sh))*cav;
  col+=vec3(.9,.95,1.)*.35*pow(1.-max(dot(n,-rd),0.),4.)*sh;
  return col;
}
vec3 shadeObj(vec3 p,vec3 rd,float id,float t){
  // Canopy normals do not need four complete scene SDF evaluations. The boy,
  // his cap and trampoline retain their original precise tetrahedral normal.
  vec3 n;
  if(uDay>.5&&id>1.5&&id<2.5){pickDayTree(p);n=dayTreeN(p);}else n=objN(p);
  float leafGlow=0.,boy=0.,skin=0.,toon=0.;
  float sh=shadow(p+n*.06,0.);
  float dif=max(dot(n,uL),0.)*sh;
  vec3 alb=vec3(.5);float spec=0.,gloss=8.,emi=0.;
  vec3 ref=reflect(rd,n);float fre=pow(1.-max(dot(n,-rd),0.),5.);
  if(id>=19.5){
    vec3 q0=dwLocal(p),q=q0-vec3(0.,uDw3.y*.42+uDw3.z,0.);
    // 20 블레이저 / 21 캡 / 22 피부 / 23 셔츠·나비넥타이 / 24 머리·조끼.
    boy=id<27.5?1.:0.;
    if(id<20.5){alb=lin(vec3(.34,.63,.79));
      if(q.z>.23&&q.y>1.4)alb=lin(vec3(.43,.71,.85));
      alb*=.94+.06*smoothstep(.9,1.8,q.y);spec=.08;gloss=12.;
      alb*=.9+.12*vn(vec2(q.x*11.+q.z*7.,q.y*5.));}  // 천 주름이 만드는 옅은 얼룩
    else if(id<21.5){alb=lin(vec3(.29,.53,.68));vec3 h=q;
      for(int i=0;i<6;i++){vec4 hat=uHats[i];if(hat.y>-100.&&length(p-hat.xyz)<1.2*uDw2.x){
        h=rotY((p-hat.xyz)/uDw2.x,hat.w);h=vec3(.94*h.x-.342*h.y,.342*h.x+.94*h.y+2.985,h.z);}}
      float band=smoothstep(.012,.025,abs(h.y-2.86));alb*=mix(.7,1.,band);
      float seam=abs(h.x+.035+(h.y-3.025)*.12);alb*=mix(.86,1.,smoothstep(.008,.02,seam));
      spec=.08;gloss=12.;}
    else if(id<22.5){alb=lin(vec3(.99,.77,.59));skin=1.;
      if(q.z>.34){float cheek=length((vec2(abs(q.x)-.34,q.y-2.29))/vec2(.15,.1));
        alb=mix(alb,lin(vec3(.98,.58,.44)),(1.-smoothstep(.2,1.,cheek))*.28);
        float brow=abs(q.y-(2.69-1.6*(abs(q.x)-.21)*(abs(q.x)-.21)));  // 눈썹: 눈 위 가는 갈색 호
        if(brow<.02&&abs(abs(q.x)-.21)<.11)alb=lin(vec3(.36,.22,.11));
        float smile=abs(q.y-(2.185+.48*q.x*q.x));
        if(abs(q.x)<.13&&smile<.012)alb=lin(vec3(.40,.21,.14));}}
    else if(id<23.5){alb=lin(vec3(.99,.97,.90));
      if(q.y>1.67&&q.y<1.84&&q.z>.315){alb=lin(vec3(.77,.16,.12));spec=.12;}}
    else if(id<24.5){alb=q.y>2.?lin(vec3(.40,.25,.12)):lin(vec3(.42,.26,.17));spec=.05;
      if(q.y>2.){alb*=.72+.5*vn(vec2(atan(q.z,q.x)*8.,q.y*16.));spec=.25;gloss=30.;}}  // 머리카락 결과 윤기
    else if(id>27.5){vec3 t=rotY((p-uBroken.xyz)/uDw2.x,uBroken.w);float r=length(t.xz);
      if(id<28.5){alb=lin(vec3(.20,.78,.95))*.8;spec=.6;gloss=60.;}  // 끊긴 테: 원래 하늘색, 조금 바랬다
      else if(id<29.5){alb=mix(lin(vec3(.10,.17,.42)),lin(vec3(.23,.35,.66)),smoothstep(.9,.1,r)*.5)*.85;spec=.1;gloss=20.;}
      else{alb=lin(vec3(.13,.20,.32));spec=.2;gloss=25.;}}
    else if(id<25.5){float rr=uDw3.y>.5?length(q0.xz):length(trLocal(q).xy);alb=mix(lin(vec3(.10,.17,.42)),lin(vec3(.23,.35,.66)),smoothstep(.9,.1,rr)*.6);
      alb=mix(alb,lin(vec3(.85,.9,1.)),smoothstep(.03,0.,abs(rr-.6))*.25);spec=.22;gloss=60.;}
    else if(id<26.5){alb=lin(vec3(.20,.78,.95));spec=1.;gloss=90.;}
    else {alb=lin(vec3(.13,.20,.32));
      if(q.y<.245&&q.z>-.18&&abs(q.x)<.37){alb=lin(vec3(.36,.21,.12));spec=.18;gloss=25.;}
      if(q.y>2.){alb=lin(vec3(.055,.043,.035));
        if(length(vec2(abs(q.x)-.195,q.y-2.535))<.023&&q.z>.49)alb=lin(vec3(1.,.98,.90));}}
  } else if(id>=10.){
    int k=int(id-10.+.5);vec4 nd=vec4(0.);
    for(int i=0;i<10;i++){if(i==k) nd=uNodes[i];}
    vec3 q=p-nd.xyz;float kind=nd.w;
    vec3 base=lin(vec3(1.,.80,.18)),deep=lin(vec3(.76,.46,.04));
    if(kind>.5&&kind<1.5){base=lin(vec3(.78,.80,.82));deep=lin(vec3(.45,.48,.52));}
    if(kind>1.5&&kind<3.5){base=lin(vec3(1.,.36,.28));deep=lin(vec3(.62,.10,.07));}
    if(kind>3.5){base=lin(vec3(.25,.80,.96));deep=lin(vec3(.03,.42,.62));}
    float r=length(q.xz);
    alb=mix(deep,base,smoothstep(-.1,.12,q.y));
    if(n.y>.6){
      alb=mix(alb,deep,smoothstep(.07,.0,abs(r-1.0))*.75);
      alb=mix(alb,base*1.12,smoothstep(.9,.2,r)*.5);
      if(kind>.5&&kind<1.5){vec2 u=q.xz;float x1=abs(u.x-u.y)/1.414,x2=abs(u.x+u.y)/1.414;float m=step(min(x1,x2),.13)*step(r,.72);alb=mix(alb,lin(vec3(.25,.27,.3)),m);}
      if(kind>3.5){float an=atan(q.z,q.x);float a5=mod(an+1.5708+.6283,1.2566)-.6283;float edge=mix(.75,.32,abs(a5)/.6283);alb=mix(alb,lin(vec3(1.,1.,.97)),smoothstep(.03,0.,r-edge));}
      if(kind>2.5&&kind<3.5){emi=.6;}
    }
    spec=1.;gloss=90.;
    if(kind>1.5&&kind<2.5){alb*=.75;}
  } else if(id<1.5){
    alb=mix(ROCK_DARK,ROCK,vn(p.xz*.7+p.y*.8));
    alb=mix(alb,SNOW,smoothstep(SNOW_START,SNOW_END,p.y)*smoothstep(.35,.78,n.y));
    if(uDay>.5){float tone=smoothstep(.32,.72,(dot(n,uL)*.5+.5)*mix(.55,1.,sh));toon=1.;  // 하루: 둥근 회색 바위, 윗면은 이끼
      alb=mix(vec3(.05,.05,.055),vec3(.29,.27,.23),tone)*(.85+.3*vn(p.xz*2.3+p.y*1.9));  // 따뜻한 회갈색(푸른 하늘빛에 뜨지 않게)
      alb=mix(alb,mix(vec3(.03,.07,.02),vec3(.19,.34,.06),tone),smoothstep(.3,.7,n.y+.3*vn(p.xz*1.7)));}
  } else if(id<2.5){
    float v=vn(p.xz*1.7+p.y*1.3)*.6+vn(p.xz*4.3-p.y*3.1)*.4;
    alb=mix(TREE_DARK,TREE,v*.7+smoothstep(-.2,.9,n.y)*.35);
    if(uDay>.5){
      // BotW풍: 잔무늬 대신 큰 면의 부드러운 2단 명암. 빛은 색에 넣고 마지막 조명은 평평하게(toon)
      float s=gTA.w/1.45;vec3 tv=(p-gTA.xyz)/s+vec3(0.,2.35,0.);bool con=gTI<CONIF;
      vec2 part;if(con)part=coniferT(tv);else part=leafyT(tv,gTI);
      float tone=smoothstep(.32,.72,(dot(n,uL)*.5+.5)*mix(.55,1.,sh));toon=1.;
      if(part.y<.5){  // 줄기·가지: 갈색 나무껍질, 위를 향한 면엔 이끼
        vec3 w=con?tv:rotY(tv,gTI*2.39);
        alb=mix(vec3(.045,.028,.016),vec3(.27,.17,.085),tone)*(.88+.24*vn(vec2(atan(w.z,w.x)*2.,w.y*3.)));
        alb=mix(alb,mix(vec3(.04,.08,.02),vec3(.20,.33,.07),tone),smoothstep(.15,.75,n.y+.3*vn(w.xz*3.+w.y*2.))*.75);
      }else if(con){
        // 침엽수: 짙은 청록 2단 명암, 처진 가지 끝은 밝은 새순, 층 아랫면은 그늘
        float k=clamp(floor((tv.y-1.6)/.7+.5),0.,5.),tip=smoothstep(.55,1.,length(tv.xz)/(1.35-.19*k));
        alb=mix(vec3(.008,.036,.03),vec3(.065,.17,.088),tone);
        alb=mix(alb,vec3(.17,.31,.10),tip*tone*.6);
        alb*=.72+.28*smoothstep(-.3,.5,n.y);
      }else{
        // 활엽수 잎: 그늘 청록 → 밝은 연두, 해를 향한 윗면은 노란 연두. 낮은 주파수 결만 살짝
        vec3 w=rotY(tv,gTI*2.39);
        alb=mix(vec3(.026,.08,.048),vec3(.19,.40,.065),tone);
        alb=mix(alb,vec3(.44,.60,.12),smoothstep(.5,.95,n.y)*tone*.55);
        alb*=(.9+.2*vn(w.xz*3.2+vec2(w.y*2.3,-w.y*1.7)))*(.72+.28*smoothstep(-.7,.3,n.y));
        leafGlow=1.;
      }}
    n=normalize(n+vec3(v-.5)*.16);dif=max(dot(n,uL),0.)*sh;spec=.015;gloss=6.;
  } else if(id<3.5){alb=lin(vec3(.48,.34,.22));
  } else if(id<4.5){vec3 q=p-uTent;float an=atan(q.z,q.x);alb=mix(lin(vec3(.93,.25,.18)),lin(vec3(.98,.95,.88)),step(.5,fract(an/6.2832*8.)));if(q.y<-3.25)alb*=.6;
  } else if(id<5.5){alb=lin(vec3(.80,.82,.84));spec=.6;gloss=40.;
  } else if(id<6.5){vec3 r=rotY(p-uSign-vec3(0.,4.8,0.),uSignRot);alb=lin(vec3(.97,.97,.95));
    float fr=max(abs(r.x)-1.49,abs(r.y)-.89);if(r.z>0.){if(fr>0.&&fr<.1)alb=lin(vec3(.1,.1,.11));}else alb=lin(vec3(.7,.72,.74));
  } else if(id<7.5){alb=lin(vec3(.95,.95,.95));spec=.4;gloss=30.;
  } else if(id<8.5){vec3 q=p-uFlag;alb=vec3(.880,.190,.045);spec=.3;
  } else {alb=lin(vec3(.98,.98,.97));emi=id>9.25?.9:.3;}
  if(skin>.5)dif=max((dot(n,uL)+.45)/1.45,0.)*mix(.55,1.,sh);  // 피부는 빛이 부드럽게 감싼다
  vec3 col=alb*(SUN*dif+AMB*(.6+.4*n.y));
  if(toon>.5){col=alb*(SUN*.36+AMB*.55);spec=0.;}  // 명암은 이미 색에 들어 있다
  col+=SUN*spec*pow(max(dot(normalize(uL-rd),n),0.),gloss)*sh*(gloss>50.?1.2:.3);
  col+=spec*sky(ref)*(.08+.9*fre)*(gloss>50.?1.:.3);
  col+=alb*emi*vec3(1.,.97,.9);
  if(uDay>.5){
    // 해를 등진 잎은 햇빛이 비쳐 연둣빛으로 빛난다(수관 바깥쪽만)
    col+=vec3(.20,.32,.04)*leafGlow*pow(max(dot(rd,uL),0.),2.)*(.4+.6*sh);
    // 소년: 그늘진 피부의 따뜻한 혈색, 그리고 몸 가장자리 윤곽 빛으로 배경에서 또렷이 뜬다
    col+=alb*vec3(.30,.09,.05)*skin*(1.-dif);
    col+=vec3(.95,.93,1.)*.45*boy*pow(1.-max(dot(n,-rd),0.),3.)*(.35+.65*clamp(dot(n,uL)+.4,0.,1.));
  }
  return col;
}
/* 붉은 지붕 외딴집. 물체 묶음(obj)·그림자에는 넣지 않고 main에서 경계 구에 닿는 광선만 따로 걷는다.
   그래서 집 근처가 아닌 픽셀의 비용은 구-광선 판정 한 번뿐이다. 창문·문은 모양 대신 색으로 칠한다. */
float houseD(vec3 p){vec3 q=rotY(p-uHouse.xyz,uHouse.w);
  float walls=sdBox(q-vec3(0.,1.3,0.),vec3(2.3,1.3,1.5));
  float qy=q.y-2.6,roof=max(abs(q.x)-2.55,max((abs(q.z)*1.5+qy*1.85-2.775)*.4196,-qy));
  float chim=max(sdBox(q-vec3(1.25,3.9,-.55),vec3(.2,.6,.2)),-qy);
  return min(min(walls,roof),chim);}
vec3 shadeHouse(vec3 p,vec3 rd){
  vec2 e=vec2(.01,-.01);vec3 n=normalize(e.xyy*houseD(p+e.xyy)+e.yyx*houseD(p+e.yyx)+e.yxy*houseD(p+e.yxy)+e.xxx*houseD(p+e.xxx));
  vec3 q=rotY(p-uHouse.xyz,uHouse.w),alb=lin(vec3(.95,.94,.90));
  if(q.y>2.62||(q.y>2.45&&abs(q.z)>1.52))alb=lin(vec3(.80,.10,.07));        // 붉은 지붕(처마 포함)
  if(abs(q.x-1.25)<.21&&abs(q.z+.55)<.21&&q.y>3.)alb=lin(vec3(.86,.85,.82));  // 굴뚝
  float win=0.;
  if(q.z>1.45&&q.y<2.6)win=max(step(abs(abs(q.x)-1.35),.32)*step(abs(q.y-1.55),.3),step(abs(q.x),.3)*step(q.y,1.55));  // 앞면: 창 둘 · 문
  if(abs(q.x)>2.25&&q.z<1.4&&q.y<2.6)win=step(abs(q.z),.32)*step(abs(q.y-1.55),.3);                                  // 옆면: 창 하나
  alb=mix(alb,lin(vec3(.30,.42,.58)),win);
  float dif=max(dot(n,uL),0.);
  return alb*(SUN*dif+AMB*(.6+.4*n.y));}
/* 하늘 끝까지 닿는 거대한 나무(토토로의 녹나무 + 잭과 콩나무). 판뿌리로 넓게 벌어진 밑동, 비틀려 감아 오르는 골,
   위로 갈수록 흔들리듯 휘며 구름 속으로 사라진다. 30단위마다 나선으로 굵은 가지와 잎 뭉치(반복 좌표라 몇 개든 비용 같음),
   밑동엔 금줄. 물체 묶음에 넣지 않고, 나무를 감싼 원기둥에 닿는 광선만 따로 걷는다. */
const float GR=6.5;
vec2 giantAxis(float y){return vec2(7.*sin(y*.018),6.*sin(y*.013+1.3))*smoothstep(0.,60.,y);}
float giantR(float y,float an){return GR*(1.+.45*exp(-y/8.))+GR*2.4*exp(-y/3.6)*pow(.5+.5*cos(an*5.+1.),4.)+.6*sin(an*9.+y*.12)+.35*sin(an*4.-y*.05);}  // 굵은 밑동 + 땅 위로 날카롭게 벌어진 판뿌리 + 비틀린 골
vec2 giantD(vec3 p){vec3 q=p-uGiant;vec2 d2=q.xz-giantAxis(q.y);float an=atan(d2.y,d2.x),r=length(d2);
  float d=max((r-giantR(q.y,an))*mix(.32,.6,smoothstep(0.,16.,q.y)),-q.y-2.),id=0.;
  float rope=length(vec2(r-giantR(13.,an)-.2,q.y-13.))-.32;if(rope<d){d=rope;id=1.;}   // 금줄
  float cell=max(floor((q.y-25.)/30.+.5),0.),yy=q.y-25.-cell*30.,ba=cell*2.4;vec3 l=vec3(d2.x,yy,d2.y);
  vec3 dir=vec3(cos(ba),0.,sin(ba)),e=dir*(GR+10.)+vec3(0.,7.,0.);
  float bough=sdCap(l,dir*GR*.8,e,1.3);if(bough<d){d=bough;id=0.;}                       // 굵은 가지
  float lv=sdEll(l-e-vec3(0.,3.,0.),vec3(8.5,5.,8.));lv+=.8*sin(l.x*.7)*sin(l.z*.6+l.y*.5);
  if(lv*.7<d){d=lv*.7;id=2.;}                                                             // 잎 뭉치
  return vec2(d,id);}
vec3 shadeGiant(vec3 p,vec3 rd){
  vec2 e=vec2(.04,-.04);vec3 n=normalize(e.xyy*giantD(p+e.xyy).x+e.yyx*giantD(p+e.yyx).x+e.yxy*giantD(p+e.yxy).x+e.xxx*giantD(p+e.xxx).x);
  vec3 q=p-uGiant;vec2 d2=q.xz-giantAxis(q.y);float an=atan(d2.y,d2.x),id=giantD(p).y;
  float tone=smoothstep(.3,.75,dot(n,uL)*.5+.5);vec3 alb;
  if(id>1.5){alb=mix(vec3(.026,.08,.048),vec3(.19,.40,.065),tone);alb=mix(alb,vec3(.44,.60,.12),smoothstep(.5,.95,n.y)*tone*.55);}
  else if(id>.5)alb=mix(vec3(.16,.12,.06),vec3(.62,.52,.30),tone);                       // 새끼줄
  else{float furrow=vn(vec2(an*7.,q.y*.35))*.6+vn(vec2(an*19.,q.y*1.1))*.4;               // 세로 골이 깊은 나무껍질
    alb=mix(vec3(.03,.02,.014),vec3(.26,.165,.095),tone)*(.35+.9*furrow);
    float root=exp(-q.y/3.6)*pow(.5+.5*cos(an*5.+1.),4.);alb*=.65+.35*smoothstep(.0,.25,root+.3*smoothstep(3.,12.,q.y));  // 뿌리 사이 골은 어둡게
    alb=mix(alb,mix(vec3(.04,.08,.02),vec3(.20,.33,.07),tone),smoothstep(.5,.9,n.y+.3*furrow)*.5);}  // 위를 향한 면에만 이끼 조금
  vec3 col=fogit(alb*(SUN*.36+AMB*.55),length(p-uRo)*.55,rd);                            // 크고 진하게 서 있도록 공기 원근은 절반만
  return mix(col,sky(rd),smoothstep(70.,420.,q.y));}                                       // 높이 올라갈수록 하늘에 녹는다
void main(){
  vec2 uv=(2.*gl_FragCoord.xy-uRes)/uRes.y;
  vec3 rd=normalize(uv.x*uCu+uv.y*uCv+uFl*uCw);
  vec3 ro=uRo;
  float t=.5,tp=.5,hit=-1.;float kind=0.;
  if(ro.y>44.&&rd.y<0.) t=max(t,(44.-ro.y)/rd.y);
  tp=t;
  // The meadow has no cliffs: intersect its low relief directly, then refine.
  // The mountain retains the conservative terrain marcher below.
  if(uDay>.5&&rd.y<-.008){
    t=-ro.y/rd.y;
    for(int i=0;i<5;i++){vec3 p=ro+rd*t;t=(.8*sin(p.x*.045)+.55*cos(p.z*.06)-ro.y)/rd.y;}
    if(t>.5&&t<300.){hit=t;kind=1.;}
  }
  for(int i=0;i<${sceneMode==='day'?0:230};i++){
    vec3 p=ro+rd*t;
    if(rd.y>0.&&p.y>45.)break;
    float ht=hm(p.xz);float hc=p.y<CY+CA+.2?ch(p.xz):-1e3;
    float dy=p.y-max(ht,hc);
    if(dy<0.){float a=tp,b=t;
      for(int j=0;j<8;j++){float m=(a+b)*.5;vec3 q=ro+rd*m;float h2=max(hm(q.xz),q.y<CY+CA+.2?ch(q.xz):-1e3);if(q.y<h2)b=m;else a=m;}
      t=b;hit=t;vec3 q=ro+rd*t;kind=hm(q.xz)>=ch(q.xz)-.01?1.:2.;break;}
    tp=t;t+=clamp(dy*.4,.03+t*.0015,30.);
    if(t>3000.)break;
  }
  // 물건
  vec3 bmin=vec3(-72.,-18.,-48.),bmax=vec3(56.,46.,48.);
  vec3 iv=1./rd,t0=(bmin-ro)*iv,t1=(bmax-ro)*iv,tmn=min(t0,t1),tmx=max(t0,t1);
  float tn=max(max(tmn.x,tmn.y),tmn.z),tf=min(min(tmx.x,tmx.y),tmx.z);
  float oid=0.,ot=-1.;
  if(tf>max(tn,0.)){float tt=max(tn,.5);float lim=hit>0.?min(tf,hit):tf;
    for(int i=0;i<160;i++){vec2 o=obj(ro+rd*tt,1.);if(o.x<(o.y>19.5?.0004:.0015)*tt){ot=tt;oid=o.y;break;}tt+=o.x*.9;if(tt>lim)break;}}
  // 외딴집: 경계 구(반지름 3.8)와 만나는 광선만 집 모양으로 짧게 걷는다
  float ht=-1.;
  if(uDay>.5){vec3 oc=ro-uHouse.xyz-vec3(0.,2.1,0.);float b=dot(oc,rd),hh=b*b-dot(oc,oc)+14.44;
    if(hh>0.){float t=max(-b-sqrt(hh),.5),te=-b+sqrt(hh);
      for(int i=0;i<40;i++){float d=houseD(ro+rd*t);if(d<.0015*t){ht=t;break;}t+=d;if(t>te)break;}
      if(ht>0.&&((ot>0.&&ot<ht)||(hit>0.&&hit<ht)))ht=-1.;}}
  // 거대한 나무: 감싼 원기둥(반지름 30)과 만나는 구간만 걷는다
  float gt=-1.;
  if(uDay>.5){vec2 o=ro.xz-uGiant.xz;float a=dot(rd.xz,rd.xz),b=dot(o,rd.xz),c=dot(o,o)-1225.,hh=b*b-a*c;
    if(hh>0.&&a>1e-6){float t=max((-b-sqrt(hh))/a,.5),te=(-b+sqrt(hh))/a;
      for(int i=0;i<56;i++){if(t>te)break;float d=giantD(ro+rd*t).x;if(d<.002*t){gt=t;break;}t+=max(d,.02);}
      if(gt>0.&&((ot>0.&&ot<gt)||(hit>0.&&hit<gt)||(ht>0.&&ht<gt)))gt=-1.;}}
  vec3 col;
  if(gt>0.){col=shadeGiant(ro+rd*gt,rd);}
  else if(ht>0.){col=fogit(shadeHouse(ro+rd*ht,rd),ht,rd);}
  else if(ot>0.){col=shadeObj(ro+rd*ot,rd,oid,ot);col=fogit(col,ot,rd);}
  else if(hit>0.){vec3 p=ro+rd*hit;col=kind<1.5?fogit(shadeGround(p,rd,hit),hit,rd):mix(fogit(shadeCloud(p,rd,hit),hit,rd),sky(rd),smoothstep(260.,650.,hit));}
  else if(rd.y<0.){float tt=(CY+2.-ro.y)/rd.y;col=mix(fogit(shadeCloud(ro+rd*tt,rd,tt),tt,rd),sky(rd),smoothstep(260.,650.,tt));}
  else col=sky(rd);
  // 문 빛
  {vec3 dc=uDoor+vec3(0.,1.3,0.)-ro;float b=dot(dc,rd);if(b>0.){float g=length(dc-rd*b);col+=lin(vec3(1.,.95,.8))*.7*exp(-g*g*.12)*(hit<0.||hit>b-2.?1.:.0);}}
  col=1.-exp(-col*1.85);
  col=pow(col,vec3(1./2.2));
  col=mix(vec3(dot(col,vec3(.299,.587,.114))),col,1.05);
  if(uDay>.5)col=mix(col,col*vec3(1.02,.97,1.05)+vec3(.035,.02,.05),.15);  // 파스텔 그레이딩: 그늘을 라벤더 쪽으로 살짝 들어 올림
  float vg=1.-.12*dot(uv*.5,uv*.5);col*=vg;
  col+=(h12(gl_FragCoord.xy)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;
}

/* ───── 렌더러 ───── */
const stageEl=document.getElementById("stage"), cv=document.getElementById("gl");
let gl=null, prog=null, vertexBuffer=null, compiledMap=0, compiledScene='', U={}, raster={band:0,y:0,raf:0,done:false};
const scenePrograms=new Map();
function initGL(){
  try{ gl=cv.getContext("webgl",{preserveDrawingBuffer:true,antialias:false,alpha:false}); }catch(e){ gl=null; }
  if(!gl){ stageEl.classList.add("nogl"); return false; }
  vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  if(!useMapProgram(mapNo)){stageEl.classList.add('nogl');gl=null;return false;}
  // 높이 지도
  const hd=new Uint8Array(DOM.nx*DOM.nz*4);
  for(let k=0;k<HM.length;k++){ const v=Math.round(Math.max(0,Math.min(1,(HM[k]+60)/100))*65535); hd[k*4]=v>>8; hd[k*4+1]=v&255; hd[k*4+2]=Math.round(Math.min(QM[k],3)/3*255); hd[k*4+3]=Math.round((Math.max(-8,Math.min(8,SM[k]))+8)/16*255); }
  const t0=gl.createTexture(); terrainTexture=t0; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,t0);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,DOM.nx,DOM.nz,0,gl.RGBA,gl.UNSIGNED_BYTE,hd);
  [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST));
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE));
  const ct={N:1,data:new Uint8Array([128,128,128,128])}, t1=gl.createTexture(); cloudTextureHandle=t1; gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,t1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,ct.N,ct.N,0,gl.RGBA,gl.UNSIGNED_BYTE,ct.data);
  [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR));
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.REPEAT));
  const pd=new Uint8Array(DOM.nx*DOM.nz*4);
  for(let k=0;k<QS.length;k++){ pd[k*4]=Math.round(Math.min(QS[k],3)/3*255); pd[k*4+1]=Math.round(Math.min(QP[k],3)/3*255); }
  footprints([ROAD],pd,2);footprints([SIDE,SPUR,...MEADOW.map(m=>m.pts)],pd,3);
  const t2=gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,t2);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,DOM.nx,DOM.nz,0,gl.RGBA,gl.UNSIGNED_BYTE,pd);
  [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR));
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE));
  ensureWeekCloud();bindScenery();
  dw.hidden=true;  // WebGL이 되면 난쟁이는 셰이더가 그린다. 안 되면 SVG가 남는다
  return true;
}
// 컴파일·링크 성공 뒤에만 교체한다. 실패하면 이전 프로그램과 진행 기록을 유지한다.
function useMapProgram(n){
  const key=sceneMode==='day'?'day':`week-${n}`,cached=scenePrograms.get(key);
  if(cached){({prog,U}=cached);gl.useProgram(prog);compiledMap=n;compiledScene=sceneMode;bindScenery();return true;}
  let next=null,shaders=[];const compileStarted=performance.now();
  try{
    next=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,makeFS(MAPS[n-1])]]){
      const sh=gl.createShader(type);shaders.push(sh);gl.shaderSource(sh,source);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));gl.attachShader(next,sh);
    }
    gl.linkProgram(next);if(!gl.getProgramParameter(next,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(next));
    const uniforms={};for(const name of ['uDay','uRes','uRo','uCu','uCv','uCw','uFl','uHm','uCl','uHN','uDom','uL','uNodes','uTrees','uRocks','uTent','uSign','uFlag','uDoor','uSignRot','uDoorUV','uHouse','uGiant','uDw','uDw2','uDw3','uHats','uBroken','uPath','uPathOn'])uniforms[name]=gl.getUniformLocation(next,name);
    const loc=gl.getAttribLocation(next,'a'),old=prog;
    gl.useProgram(next);gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    prog=next;U=uniforms;compiledMap=n;compiledScene=sceneMode;bindScenery();
    scenePrograms.set(key,{prog,U});return true;
  }catch(e){if(next)gl.deleteProgram(next);if(prog)gl.useProgram(prog);console.warn('풍경 프로그램 유지:',e.message);return false;}
  finally{for(const sh of shaders)gl.deleteShader(sh);window.__sceneTimings[sceneMode+'CompileMs']=performance.now()-compileStarted;}
}
const DAY_TREES_ON=[];let DOOR_UV=[9,9];  // 하늘 문 자리(doorSpot)
function bindScenery(){
  gl.uniform1i(U.uHm,0); gl.uniform1i(U.uCl,1); gl.uniform1i(U.uPath,2);
  gl.uniform2f(U.uHN,DOM.nx,DOM.nz); gl.uniform4f(U.uDom,DOM.x0,DOM.z0,DOM.x1-DOM.x0,DOM.z1-DOM.z0);
  const L=v3.norm([-.62,.66,.42]); gl.uniform3f(U.uL,L[0],L[1],L[2]);
  gl.uniform1f(U.uDay,sceneMode==="day"?1:0);
  const tr=[];window.__dayTreeMask=[];DAY_TREES_ON.length=0;
  const list=(sceneMode==="day"?MAP_SCENES.dayTrees:TREES).map(([x,z,s],i)=>[x,groundY(x,z),z,s,i]);
  if(sceneMode==='day'){
    list.forEach(t=>{const clear=MAP_SCENES.treeClear([t[0],t[2],t[3]],CAM.ro,[DW.x,DW.y+1.8,DW.z],groundY,t[4]<MAP_SCENES.dayConifers);window.__dayTreeMask.push(clear);if(clear)DAY_TREES_ON.push(t);});
    const d=doorSpot();DOOR_UV=d.slice(0,2);d[2].forEach(i=>window.__dayTreeMask[i]=false);
  }
  list.forEach(([x,y,z,s],i)=>{if(sceneMode==='day'&&!window.__dayTreeMask[i])y=-200;
    tr.push(x,y+2.35*s,z,1.45*s,x,y+4.35*s,z,1.05*s,x,y+.55*s,z,.15*s); });
  gl.uniform4fv(U.uTrees,new Float32Array(tr.slice(0,(sceneMode==='day'?MAP_SCENES.dayTrees.length:MAPS[compiledMap-1].treeCount)*12)));
  const rocks=[];ROCKS.forEach(([x,z])=>rocks.push(x,groundY(x,z)+.45,z,1));gl.uniform4fv(U.uRocks,new Float32Array(rocks));
  gl.uniform3f(U.uTent,TENT[0],groundY(TENT[0],TENT[1])+3.35,TENT[1]);
  if(sceneMode==="day"){const [hx,hz,hy]=MAP_SCENES.house;gl.uniform4f(U.uHouse,hx,groundY(hx,hz)-.05,hz,hy);
    const [gx,gz]=MAP_SCENES.giant;gl.uniform3f(U.uGiant,gx,groundY(gx,gz)-.3,gz);}
  gl.uniform3f(U.uSign,SIGN[0],sceneMode==='day'?-200:groundY(SIGN[0],SIGN[1])-.05,SIGN[1]);
  gl.uniform3f(U.uFlag,FLAG[0],groundY(FLAG[0],FLAG[1])-.1,FLAG[1]);
  if(sceneMode==="day")gl.uniform3f(U.uDoor,0,-500,0);  // 하루 장면의 문은 하늘에 그린다(doorSpot)
  else gl.uniform3f(U.uDoor,DOOR[0],CLOUD_Y+2.6,DOOR[1]);
 }
function nodeUniforms(){
  if(!gl) return;
  const a=[]; NODE_ORDER.forEach(id=>{ const b=byId(id); let k=0;
    if(id==="sunday") k=4; else if(id==="minimum") k=state.line===3?3:2; else if(isOff(b)) k=1;
    a.push(NXZ[id][0]+1.5,sceneMode==="week"?-1000:nodeY(id),NXZ[id][1]+1,k); });
  gl.useProgram(prog); gl.uniform4fv(U.uNodes,new Float32Array(a));
}
// 하늘의 하얀 문: 화면 좌표(dream = uv/fl) 후보 중에서 떠 있는 패널에 안 가리고 가리는 나무가 가장 적은 자리를 고른다.
// 가리는 나무가 카메라에서 먼(25 넘게) 두 그루 이하면 그 장면에서만 비켜 준다(사진 6처럼 길 앞 하늘이 트인다).
function panelBlocks(extra=[]){
  const sr=stageEl.getBoundingClientRect();
  return [document.querySelector('.head'),document.getElementById('info'),VW.W>=900?nodesEl:null,...extra].filter(Boolean).map(e=>e.getBoundingClientRect())
    .filter(r=>r.width&&r.bottom>sr.top&&r.top<sr.bottom).map(r=>({l:r.left-sr.left-6,r:r.right-sr.left+6,t:r.top-sr.top-6,b:r.bottom-sr.top+6}));
}
// 광선이 거대한 나무(셰이더 giantD와 같은 줄기 축·가지·잎 뭉치, 조금 넉넉하게)에 닿는지. 감싼 원기둥 구간을 1단위씩 훑는다.
function giantHit(rd){
  const [gx,gz]=MAP_SCENES.giant,gy=groundY(gx,gz)-.3,ro=CAM.ro,ox=ro[0]-gx,oz=ro[2]-gz,a=rd[0]*rd[0]+rd[2]*rd[2],b=ox*rd[0]+oz*rd[2],h=b*b-a*(ox*ox+oz*oz-35*35);
  if(h<=0||a<1e-6)return false;
  const GR=6.5,ax=y=>{const k=Math.min(1,Math.max(0,y/60)),s=k*k*(3-2*k);return [7*Math.sin(y*.018)*s,6*Math.sin(y*.013+1.3)*s];};
  for(let t=Math.max((-b-Math.sqrt(h))/a,.5),te=(-b+Math.sqrt(h))/a;t<te;t+=1){
    const y=ro[1]+rd[1]*t-gy,[cx,cz]=ax(y),dx=ro[0]+rd[0]*t-gx-cx,dz=ro[2]+rd[2]*t-gz-cz;
    if(y<-2||y>420)continue;
    if(Math.hypot(dx,dz)<GR*1.5+1)return true;
    const cell=Math.max(Math.round((y-25)/30),0),yy=y-25-cell*30,ba=cell*2.4,ex=Math.cos(ba)*(GR+10),ez=Math.sin(ba)*(GR+10);
    if(Math.hypot((dx-ex)/9.5,(yy-10)/6,(dz-ez)/9)<1)return true;                                   // 잎 뭉치
    const u=Math.max(0,Math.min(1,((dx-ex*.48)*(ex*.52)+yy*7+(dz-ez*.48)*(ez*.52))/((ex*.52)**2+49+(ez*.52)**2)));
    if(Math.hypot(dx-ex*.48-ex*.52*u,yy-7*u,dz-ez*.48-ez*.52*u)<2.5)return true;                 // 굵은 가지
  }
  return false;
}
function doorSpot(){
  // 장소 표지는 render() 전에 buildOverlay()가 이미 놓았으므로 문이 표지도 피한다.
  const blocks=panelBlocks([...document.querySelectorAll('#dayMarkers button')]), fl=CAM.fl;
  // 한 점을 가리는 나무 번호들, 하늘이 아니면(패널·화면 밖·능선 아래) null
  const hits=([dx,dy])=>{
    const sx=(dx*fl*VW.H+VW.W)/2, sy=(VW.H-dy*fl*VW.H)/2;
    if(sx<8||sx>VW.W-8||sy<8||blocks.some(k=>sx>k.l&&sx<k.r&&sy>k.t&&sy<k.b))return null;
    const rd=v3.norm([0,1,2].map(i=>dx*fl*CAM.cu[i]+dy*fl*CAM.cv[i]+fl*CAM.cw[i]));
    if(rd[1]<.09)return null;  // 먼 숲 능선 위로
    if(giantHit(rd))return null;  // 거대한 나무 줄기·가지·잎 뭉치 뒤
    // 수관을 구 두 개(아래 넓게, 위 좁게)로 근사한다. 침엽수 맨 아랫단 1.74s, 활엽수 덩어리 1.65s보다 조금 넉넉하게.
    const hit=(c,r)=>{const o=v3.sub(c,CAM.ro),b=v3.dot(o,rd);return b>0&&v3.dot(o,o)-b*b<r*r;};
    return DAY_TREES_ON.filter(([x,y,z,s])=>hit([x,y+2.4*s,z],2.*s)||hit([x,y+4.4*s,z],1.6*s));
  };
  let best=null;
  for(const dy of [.22,.17,.27,.12,.31,.37,.44,.48,.52])for(const dx of [.16,.06,.26,-.04,.36,-.14,.46,-.24,.11,.21,.31,.01,.41]){
    // 섬은 아래가 좁아지는 실루엣을 따라 잰다
    const [ew,et,eb]=SKY_EXT,pts=(SKY_MOTIF==='laputa'?[[0,0],[-ew*.75,et],[ew*.75,et],[0,et],[-ew,0],[ew,0],[-ew*.6,eb*.55],[ew*.6,eb*.55],[0,eb]]:[[0,0],[-ew,et],[ew,et],[-ew,0],[ew,0],[-ew,eb],[ew,eb],[0,eb],[-ew-.07,eb],[ew+.07,eb]]).map(([ax,ay])=>hits([dx+ax,dy+ay]));
    if(pts.some(p=>!p))continue;
    const ts=[...new Set(pts.flat())];
    if(ts.length>2||ts.some(([x,y,z])=>Math.hypot(x-CAM.ro[0],z-CAM.ro[2])<25))continue;
    if(!best||ts.length<best[2].length)best=[dx,dy,ts.map(t=>t[4])];
    if(!ts.length)return best;
  }
  return best||[9,9,[]];  // 빈 하늘이 없으면 문은 이번 장면에서 쉰다
}
/* 느린 기기 보호: 풍경 한 장이 3초를 넘기면 다음부터 픽셀 수를 0.7배로(최소 0.35배),
   0.9초 안에 끝나면 다시 올린다. 이 기기에만 기억한다. 화면은 CSS가 늘려 보여 주므로 조금 부드러워질 뿐이다. */
let QUALITY=Math.max(.35,Math.min(1,+store.get("oi.quality")||1));
function adaptQuality(ms){
  const q=ms>3000?Math.max(.35,QUALITY*.7):ms<900?Math.min(1,QUALITY/.7):QUALITY;
  if(q!==QUALITY){ QUALITY=q; store.set("oi.quality",String(q)); }
  window.__quality=QUALITY;
}
function render(){
  if(!gl) return;
  if((mapNo!==compiledMap||sceneMode!==compiledScene)&&!useMapProgram(mapNo))mapNo=compiledMap;
  bindScenery();
  cancelAnimationFrame(raster.raf);
  const renderStart=performance.now();
  const dpr=Math.min(window.devicePixelRatio||1,1);
  let w=Math.round(VW.W*dpr), h=Math.round(VW.H*dpr);
  const cap=(sceneMode==="day"?420000:650000)*QUALITY; if(w*h>cap){ const k=Math.sqrt(cap/(w*h)); w=Math.round(w*k); h=Math.round(h*k); }
  cv.width=w; cv.height=h; gl.viewport(0,0,w,h);
  gl.uniform2f(U.uRes,w,h); gl.uniform3fv(U.uRo,CAM.ro); gl.uniform3fv(U.uCu,CAM.cu); gl.uniform3fv(U.uCv,CAM.cv); gl.uniform3fv(U.uCw,CAM.cw); gl.uniform1f(U.uFl,CAM.fl);
  gl.uniform1f(U.uSignRot,Math.atan2(CAM.ro[0]-SIGN[0],CAM.ro[2]-SIGN[1]));
  if(sceneMode==='day'){window.__doorUV=DOOR_UV;gl.uniform2f(U.uDoorUV,DOOR_UV[0],DOOR_UV[1]);}
  nodeUniforms(); worldUniforms(); dwarfUniforms(); DW.drawn=dwarfRect();
  gl.enable(gl.SCISSOR_TEST);
  const band=Math.max(6,Math.floor(140000/w)); let y=h; raster.done=false; stageEl.classList.add("painting");
  const step=()=>{ const y0=Math.max(0,y-band); gl.scissor(0,y0,w,y-y0); gl.drawArrays(gl.TRIANGLES,0,3); y=y0;
    if(y>0) raster.raf=requestAnimationFrame(step); else { gl.finish(); window.__renderMs=performance.now()-renderStart; adaptQuality(window.__renderMs); if(!window.__firstRenderMs)window.__firstRenderMs=performance.now(); window.__renderScene=sceneMode; raster.done=true; stageEl.classList.remove("painting"); if(DW.dirty) drawDwarf(); window.__rendered=(window.__rendered||0)+1; } };
  raster.raf=requestAnimationFrame(step);
}

/* ───── 겹: 노드 라벨 · 오솔길 · 난쟁이 ───── */
const nodesEl=document.getElementById("nodes"), dw=document.getElementById("dwarf"), svg=document.getElementById("trail");
let at="dawn", sel="dawn", walking=null;
const P3=(x,z,dy)=>[x,groundY(x,z)+(dy||0),z];
function buildOverlay(){
  svg.setAttribute("viewBox","0 0 "+VW.W+" "+VW.H);
  if(gl)document.getElementById("dayFallbackPaths")?.remove();
  if(!gl){
    let fallback=document.getElementById("dayFallbackPaths");
    if(!fallback){fallback=document.createElementNS("http://www.w3.org/2000/svg","g");fallback.id="dayFallbackPaths";svg.prepend(fallback);}
    // 길 종류마다 path 하나: 1선 큰길 / 2선 들꽃 샛길(지름길 + 구간 샛길을 여러 줄기로) / 3선 오솔길
    const sub=path=>{const points=path.map(p=>project(P3(...p,.08))).filter(p=>p[2]>2);return points.length?'M'+points.map(p=>p.slice(0,2).join(' ')).join(' L'):'';};
    fallback.innerHTML=[[ROAD],[SIDE,...MEADOW.map(m=>m.pts)],[SPUR]].map((paths,i)=>
      `<path d="${paths.map(sub).filter(Boolean).join(' ')}" fill="none" stroke="${['#eee0b7','#a8bd65','#b28c55'][i]}" stroke-width="${[14,9,5][i]}" stroke-linecap="round"/>`).join('');
  }
  const sp=SPUR.map(([x,z])=>project(P3(x,z,.08)));
  document.getElementById("spur").setAttribute("d","M"+sp.map(p=>p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" L"));
  nodesEl.innerHTML=NODE_ORDER.map(id=>{ const b=byId(id), [x,z]=NXZ[id], c=project([x,nodeY(id),z]);
    const below=project([x,nodeY(id),z+1.5]), right=project([x+1.5,nodeY(id),z]);
    const rx=Math.abs(right[0]-c[0]), ry=Math.max(3,Math.abs(below[1]-c[1]));
    const up=c[1]+rx*.6+46>VW.H||(!VW.land&&id==="evening"); const side=c[0]>VW.W-70?" r":c[0]<70?" l":"";
    const t=b.when?blockTime(b).split(" – ")[0]:"주 1회";
    return '<button class="node'+(up?" up":"")+side+'" data-id="'+id+'" style="left:'+c[0].toFixed(1)+'px;top:'+c[1].toFixed(1)+'px;--rx:'+rx.toFixed(1)+'px;--ry:'+ry.toFixed(1)+'px" aria-label="'+b.name+', '+blockTime(b)+'">'+
      '<span class="ring"></span><span class="tag"><em>'+t+'</em>'+(b.short||SHORT[id])+'<i class="nw">지금</i></span></button>';
  }).join("");
  nodesEl.classList.toggle("day-places",sceneMode==="day");
  const markers=[],used=[];
  if(sceneMode==='day'){
    const candidates=[{id:at,label:SHORT[at]},...NODE_ORDER.filter(id=>id!==at).map(id=>({id,label:SHORT[id]}))];
    if(at==='dawn'||at==='minimum'){
      [[ROAD,'morning','1선 · 흙 큰길'],[SIDE,'lunch','2선 · 들꽃 샛길'],[SPUR,'minimum','3선 · 최소 기준선']].forEach(([path,id,label],i)=>{
        const p=path[Math.floor(path.length*(i===0?.045:.22))];candidates.unshift({id,label,point:p,route:i+1});
      });
    }
    // 무대 위에 떠 있는 패널(머리말·안내판·데스크톱 일정 카드)은 표지가 피해 간다.
    const blocks=panelBlocks();
    const covered=(x,y,w)=>blocks.some(k=>x+w/2>k.l&&x-w/2<k.r&&y>k.t&&y-34<k.b);
    // 외딴집(출발·오전 장면에서 보이게 둔 집)도 표지가 덮지 않게 위로 비켜 간다
    const hb=(()=>{const [hx,hz]=MAP_SCENES.house,c=[0,3.8].map(h=>project(P3(hx,hz,h)));if(c[0][2]<4)return null;const hw=Math.abs(project(P3(hx+2.8,hz,1.8))[0]-c[0][0])+Math.abs(project(P3(hx,hz+2.8,1.8))[0]-c[0][0]);
      return {l:c[0][0]-hw-4,r:c[0][0]+hw+4,t:c[1][1]-4,b:c[0][1]+4};})();
    const onHouse=(x,y,w)=>hb&&x+w/2>hb.l&&x-w/2<hb.r&&y>hb.t&&y-34<hb.b;
    for(const c of candidates){const [x,z]=c.point||NXZ[c.id],p=project(P3(x+1.5,z+1,2.5)),w=c.route?138:66;
      if(p[2]<4||p[2]>150||p[0]<w/2+8||p[0]>VW.W-w/2-8||p[1]<VW.H*.32||p[1]>VW.H-75)continue;
      if(onHouse(p[0],p[1],w)){const sx=p[0]<(hb.l+hb.r)/2?hb.l-w/2-2:hb.r+w/2+2;if(sx>w/2+8&&sx<VW.W-w/2-8)p[0]=sx;}   // 집에 닿으면 먼저 옆으로(화면 안일 때만), 아니면 위로
      let y=p[1];while(used.some(b=>Math.abs(b.x-p[0])<(b.w+w)/2+6&&Math.abs(b.y-y)<38)||onHouse(p[0],y,w))y-=40;
      if(y<VW.H*.28||covered(p[0],y,w))continue;used.push({x:p[0],y,w});
      markers.push(`<button type="button" data-place="${c.id}" ${c.route?'data-route="'+c.route+'"':''} aria-label="${c.label} 장소로 걷기" style="left:${p[0]}px;top:${y}px">${c.label}</button>`);
    }
  }
  document.getElementById('dayMarkers').innerHTML=markers.join('');
  if(sceneMode==="day")nodesEl.querySelectorAll(".node").forEach(n=>{const id=n.dataset.id;n.style.cssText="";n.classList.remove("up","l","r");n.querySelector(".tag").insertAdjacentHTML("afterbegin","<strong>"+SHORT[id]+"</strong>");});
  if(sceneMode==='day')stageEl.style.marginBottom=VW.W<900?(nodesEl.offsetHeight+24)+'px':'';
  const s=SIGN, base=project(P3(s[0],s[1],4.8)), e=project(P3(s[0]+1,s[1],4.8));
  const st=document.getElementById("signText"); const k=Math.hypot(e[0]-base[0],e[1]-base[1]);
  st.style.transform="translate("+base[0]+"px,"+base[1]+"px) scale("+(2.6*k/84).toFixed(3)+") translate(-50%,-50%)";
}
function decorate(){
  const now=nowId();
  nodesEl.querySelectorAll(".node").forEach(n=>{ const id=n.dataset.id, b=byId(id);
    n.classList.toggle("off",isOff(b)); n.classList.toggle("now",id===now); n.classList.toggle("sel",id===sel); n.classList.toggle("secret",id==="minimum"); n.classList.toggle("done",allDone(id)); });
  stageEl.dataset.line=state.line;
}
/* ───── 난쟁이 ─────
   셰이더 안에서 그린다. 풍경은 한 번만 그리므로, 난쟁이가 움직이면
   있던 자리와 갈 자리(그림자 포함)를 감싸는 사각형만 scissor로 다시 그린다.
   픽셀마다 결과가 정해져 있어서 이어 붙인 자리에 이음매가 생기지 않는다. */
const motionPreference=matchMedia("(prefers-reduced-motion: reduce)");
let reduce=motionPreference.matches;
motionPreference.addEventListener("change",e=>{
  reduce=e.matches;
  if(reduce&&walking){const target=walking.to;cancelAnimationFrame(walking.raf);walking=null;at=target;placeDwarf(...NXZ[target]);arrived(target);}
});
const DW_S=1.25, DW={x:0,y:0,z:0,yaw:0,goal:null,hop:0,sq:0,bounce:0,on:false,dirty:false,drawn:null};
let maxHop=0;
window.__dw=Object.freeze({get hat(){return !hatLost()},get tramp(){return trampMode()},get feet(){return feetMode()},get walking(){return !!walking},get hop(){return DW.hop},get maxHop(){return maxHop}});
/* 갈림길과 한 주 기록에 따라 난쟁이가 달라진다(명세 규칙 4·5).
   2선: 서두르다 모자를 잃는다. 그날은 하루 종일 모자 없이 다니고(되찾기 없음), 잃은 모자는
        수업 없는 날엔 꺼진 오전 칸 옆, 수업 날엔 집(출발) 옆에 놓여 있다. 다음 날 아침엔 새 모자.
   3선: 트램펄린을 발밑에 깔고 억지로 튀어 다니다가 그날로 망가진다.
   그 주에 3선 1번 또는 2선 2번이면 트램펄린을 잃는다. 잃은 뒤엔 등에도 발밑에도 없고 3선이어도 걸어 다닌다.
   한 주 기록(JOURNEY)은 보고 있는 요일이 오늘일 때만 쓴다. 다른 요일 버튼은 갈림길만 보고 그린다. */
const hatSpot=()=>PLAN.leave?"dawn":"morning";
const hatLost=()=>state.line===2;
const isToday=()=>dayIdx===todayDow();
const selectedDate=()=>{
  const today=JOURNEY.todayKey(), date=new Date(today+"T00:00:00Z");
  date.setUTCDate(date.getUTCDate()+(dayIdx+6)%7-(todayDow()+6)%7);
  return date.toISOString().slice(0,10);
};
/* "back"(등에 멤) | "feet"(발밑, 오늘 망가짐) | "none"(그 주에 이미 잃음) */
function trampMode(){
  if(JOURNEY.trampolineFor(selectedDate())==="gone") return "none";
  return state.line===3?"feet":"back";  // 기록이 아직 저장 전이어도 오늘 3선이면 오늘 망가지는 날이다
}
const feetMode=()=>trampMode()==="feet";
const sideOpen=()=>{ const m=byId("morning"); return !!m&&isOff(m); };
const meadowOpen=()=>state.line===2;  // 2선인 날은 큰길 대신 들꽃 샛길로 다닌다
/* 잃은 것은 잃은 자리에 그 주 내내 남는다(명세 R9).
   모자: 2선인 날 그날의 모자 자리(수업 날은 집=출발, 아니면 꺼진 오전 칸) 둘레에, 요일마다 다른 방향으로 놓인다.
   트램펄린: 3선 날 망가졌으면 최소 기준선 칸 옆, 두 번째 2선 날 잃었으면 그날 모자 자리 옆에 누워 있다. */
const spotOf=dow=>PLANS[dow]&&PLANS[dow].leave?"dawn":"morning";
function besideSpot(id,ang,r){ const [x,z]=NXZ[id], hx=x+Math.cos(ang)*r, hz=z+Math.sin(ang)*r; return [hx,groundY(hx,hz),hz]; }
function lostThings(){
  const sel=selectedDate(), week=JOURNEY.week(sel), hats=[];
  let broken=null;
  if(trampMode()==="none"&&week.trampolineLostOn){
    // 그 장소에 도착했을 때의 카메라에서 소년 오른쪽 조금 앞에 놓아, 소년 몸에 가리지 않게 한다.
    const d=week.days.find(x=>x.key===week.trampolineLostOn), spot=d.line===3?"minimum":spotOf(d.dow), [nx,nz]=NXZ[spot];
    const ro=MAP_SCENES.camera(spot,NXZ,groundY,1.6).ro, l=Math.hypot(ro[0]-nx,ro[2]-nz)||1, cx=(ro[0]-nx)/l, cz=(ro[2]-nz)/l;
    const bx=nx+cz*3.4+cx*1.2, bz=nz-cx*3.4+cz*1.2;
    broken=[bx,groundY(bx,bz),bz,.4+d.dow*.7];
  }
  for(const d of week.days){
    const today=d.key===sel, lost=today?hatLost():d.key<sel&&d.hatLost;
    if(!lost) continue;
    const spot=today?hatSpot():spotOf(d.dow);
    let p=besideSpot(spot,.55+d.dow*1.05,2.3);
    if(broken&&Math.hypot(p[0]-broken[0],p[2]-broken[2])<2.6) p=besideSpot(spot,.55+d.dow*1.05+Math.PI,2.3);  // 망가진 트램펄린과 겹치면 반대편
    hats.push([p[0],p[1]+.48,p[2],.65+d.dow*.9]);
  }
  return {hats,broken};
}
window.__lost=()=>lostThings();
function worldUniforms(){if(!gl)return;
  const L=sceneMode==="day"?lostThings():{hats:[],broken:null}, hv=[];
  for(let i=0;i<6;i++) hv.push(...(L.hats[i]||[0,-500,0,0]));
  gl.uniform4fv(U.uHats,new Float32Array(hv)); gl.uniform4fv(U.uBroken,new Float32Array(L.broken||[0,-500,0,0]));gl.uniform2f(U.uPathOn,sceneMode==="day"&&(sideOpen()||meadowOpen())?1:0,sceneMode==="day"&&state.line===3?1:0);
}
/* 노드 원판 위에서는 원판 윗면에, 아니면 땅에 발을 디딘다 */
function feetY(x,z){ const g=groundY(x,z); if(sceneMode==="day")return g;let y=g;
  for(const id of NODE_ORDER){ const d=Math.hypot(x-NXZ[id][0],z-NXZ[id][1]); if(d<1.6) y=Math.max(y,g+(nodeY(id)+.26-g)*smooth(1.6,1.15,d)); }
  return y; }
function dwarfUniforms(){ if(!gl) return;
  gl.uniform4f(U.uDw,DW.x,DW.y+DW.hop,DW.z,DW.yaw); gl.uniform4f(U.uDw2,DW_S,DW.sq,DW.on&&sceneMode==="day"?1:0,DW.hop);
  const tm=trampMode(); gl.uniform4f(U.uDw3,hatLost()?0:1,tm==="feet"?1:0,tm==="feet"?DW.bounce:0,tm==="none"?1:0); }
const DW_L=v3.norm([-.62,.66,.42]);
function dwarfRect(){
  if(!DW.on||!CAM) return null;
  const c=Math.cos(DW.yaw), s=Math.sin(DW.yaw), k=DW_S*1.18, pts=[], y0=DW.y+DW.hop;
  const top=feetMode()?3.85+DW.bounce:3.4;
  for(const lx of [-1.2,1.2]) for(const lz of [-1.8,1.1]) for(const ly of [-.1,top]){
    const P=[DW.x+(c*lx-s*lz)*k, y0+ly*k, DW.z+(s*lx+c*lz)*k]; pts.push(P);
    if(ly>0){ const gy=DW.y-.2, t=(P[1]-gy)/DW_L[1]; pts.push([P[0]-DW_L[0]*t,gy,P[2]-DW_L[2]*t]); } }
  for(const a of [0,1.57,3.14,4.71]) pts.push([DW.x+Math.cos(a)*1.5*DW_S,DW.y,DW.z+Math.sin(a)*1.5*DW_S]);
  const sx=cv.width/VW.W, sy=cv.height/VW.H; let x0=1e9,x1=-1e9,ya=1e9,yb=-1e9;
  pts.forEach(P=>{ const q=project(P); x0=Math.min(x0,q[0]); x1=Math.max(x1,q[0]); ya=Math.min(ya,q[1]); yb=Math.max(yb,q[1]); });
  const pad=4;
  return [Math.floor(x0*sx)-pad, Math.floor(cv.height-yb*sy)-pad, Math.ceil(x1*sx)+pad, Math.ceil(cv.height-ya*sy)+pad];
}
function drawRect(r){ if(!r) return;
  const x0=Math.max(0,r[0]), y0=Math.max(0,r[1]), x1=Math.min(cv.width,r[2]), y1=Math.min(cv.height,r[3]);
  if(x1<=x0||y1<=y0) return; gl.scissor(x0,y0,x1-x0,y1-y0); gl.drawArrays(gl.TRIANGLES,0,3); }
function drawDwarf(){
  if(!gl) return;
  if(!raster.done){ DW.dirty=true; return; }  // 풍경을 그리는 중이면 다 그린 뒤에
  DW.dirty=false; const a=DW.drawn, b=dwarfRect(); dwarfUniforms();
  if(a&&b&&a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3]) drawRect([Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])]);
  else { drawRect(a); drawRect(b); }
  DW.drawn=b;
}
const angTo=(a,b)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a));
/* 가만히 있을 땐 카메라 쪽을 보되, 등의 트램펄린이 보이게 비스듬히 선다 */
const idleYaw=(x,z)=>sceneMode==="day"?-1.8:Math.atan2(-(CAM.ro[0]-x),CAM.ro[2]-z)+.6;
function placeDwarf(x,z,hop,squash,yaw){
  DW.x=x; DW.z=z; DW.y=feetY(x,z); DW.hop=hop||0; DW.sq=squash||0; DW.on=true;
  maxHop=Math.max(maxHop,DW.hop);
  if(!gl){ placeDwarfSVG(x,z,hop,squash); return; }
  if(yaw===undefined){ DW.goal=angTo(DW.yaw,idleYaw(x,z)); if(reduce||!DW.drawn) DW.yaw=DW.goal; DW.idleAt=performance.now(); DW.settled=false; } else { DW.goal=null; DW.yaw=yaw; }
  drawDwarf();
}
/* 숨쉬기: 도착한 뒤 잠깐만 살짝 눌렸다 펴진다(3선은 통통 튄다). 1초에 열두 번쯤 다시 그린다.
   소년 둘레도 풍경과 같은 무거운 셰이더로 그리므로, 계속 숨쉬면 노트북 GPU가 쉬지 못한다.
   그래서 숨 두 번(튀기 네 번) 뒤에는 쉬는 자세로 한 번 그리고 멈춘다. 다시 걷거나 도착하면 또 숨쉰다. */
const BREATHE_MS=3600, BOUNCE_MS=3040;
let breathT=0;
(function breathe(now){
  requestAnimationFrame(breathe);
  if(sceneMode==="week")return;
  if(!gl||reduce||walking||!DW.on||!ov.hidden||DW.settled||now-breathT<(feetMode()?50:83)) return; breathT=now;  // 두루마리가 덮고 있으면 쉰다
  const age=performance.now()-(DW.idleAt||0);
  if(age>(feetMode()?BOUNCE_MS:BREATHE_MS)){ DW.bounce=0; DW.sq=0; if(DW.goal!==null) DW.yaw=DW.goal; DW.settled=true; drawDwarf(); return; }
  if(feetMode()){ const ph=(age/760)%1; DW.bounce=.55*Math.sin(ph*Math.PI); DW.sq=ph<.12||ph>.88?.7:0; }  // 3선: 발밑 트램펄린에서 통통 튄다
  else { DW.bounce=0; DW.sq=.16*(.5-.5*Math.cos(age/1800*Math.PI*2)); }
  if(DW.goal!==null) DW.yaw+=(DW.goal-DW.yaw)*.3;  // 걷기를 마치면 천천히 돌아선다
  drawDwarf();
})(0);
function placeDwarfSVG(x,z,hop,squash){
  const y=groundY(x,z), feet=project([x,y,z]), head=project([x,y+3.4,z]);
  const hpx=Math.max(14,feet[1]-head[1]), w=hpx*.9, lift=hop?(project([x,y+hop,z])[1]-feet[1]):0;
  dw.style.setProperty("--w",w+"px");
  dw.style.transform="translate("+(feet[0]-w/2)+"px,"+(feet[1]-w*1.2)+"px)";
  dw.querySelector(".body").style.transform="translateY("+lift+"px) scale("+(1+(squash||0)*.12)+","+(1-(squash||0)*.14)+")";
}
/* 출발점에서 노드 id까지 최단 경로(다익스트라). 출발점은 노드이거나, 걷던 도중이면 길 조각 위의 한 점 */
function graphRoute(start,id){
  // 비용: 오전이 꺼진 날의 지름길 샛길은 0.7배. 2선인 날은 들꽃 샛길을 0.9배, 큰길을 3배로 쳐서 샛길로만 다니게 한다.
  const mo=meadowOpen(), open=EDGES.filter(e=>(!e.side||sideOpen())&&(!e.meadow||mo)), dist={}, prev={}, head={}, Q=new Set(NODE_ORDER);
  const cost=e=>e.len*(e.side?.7:e.meadow?.9:!e.spur&&mo?3:1);
  NODE_ORDER.forEach(n=>dist[n]=Infinity);
  if(start.node){ dist[start.node]=0; head[start.node]=[NXZ[start.node]]; }
  else { const {e,u,x,z}=start, P=[[x,z]];
    const pa=P.concat(e.pts.slice(0,Math.floor(u+1e-6)+1).reverse()), pb=P.concat(e.pts.slice(Math.ceil(u-1e-6)));
    dist[e.a]=plen(pa); head[e.a]=pa; if(plen(pb)<dist[e.b]){ dist[e.b]=plen(pb); head[e.b]=pb; } }
  while(Q.size){ let n=null; Q.forEach(c=>{ if(n===null||dist[c]<dist[n]) n=c; }); Q.delete(n); if(dist[n]===Infinity) break;
    for(const e of open){ let m,pts; if(e.a===n){ m=e.b; pts=e.pts; } else if(e.b===n){ m=e.a; pts=e.pts.slice().reverse(); } else continue;
      if(dist[n]+cost(e)<dist[m]){ dist[m]=dist[n]+cost(e); prev[m]={n,pts}; delete head[m]; } } }
  const seq=[]; let c=id; while(prev[c]){ seq.unshift(prev[c].pts); c=prev[c].n; }
  let out=(head[c]||[NXZ[c]]).slice(); seq.forEach(p=>out=out.concat(p.slice(1)));
  return out;
}
const route=(a,b)=>graphRoute({node:a},b);
/* 걷는 도중에 다른 칸을 누르면: 지금 자리를 길 위의 한 점으로 찾아 거기서 바로 새 길을 잡고,
   지금 속도를 이어받는다(반대쪽으로 꺾을 때만 멈췄다가 돈다). 순간이동하지 않는다. */
function routeFrom(x,z,id){ let best={d:1e9};
  for(const e of EDGES) for(let j=0;j<e.pts.length-1;j++){ const [ax,az]=e.pts[j],[bx,bz]=e.pts[j+1],dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz||1;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l2)), d=Math.hypot(x-ax-dx*t,z-az-dz*t); if(d<best.d) best={d,e,u:j+t}; }
  return graphRoute({e:best.e,u:best.u,x,z},id); }
function cumOf(pts){ const c=[0]; for(let i=1;i<pts.length;i++) c.push(c[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])); return c; }
function walkTo(id){
  let pts, v0=0;
  if(walking){ cancelAnimationFrame(walking.raf); const [x,z]=walking.pos, [vx,vz]=walking.vel, s=Math.hypot(vx,vz);
    pts=routeFrom(x,z,id);
    const q=pts.find(p=>Math.hypot(p[0]-x,p[1]-z)>.05);
    if(q&&s>0){ const dx=q[0]-x, dz=q[1]-z, c=(vx*dx+vz*dz)/(s*Math.hypot(dx,dz)); if(c>0) v0=s*c; }  // 길 방향 성분만 이어받는다
    walking=null; }
  else if(pausedDayPosition){pts=routeFrom(DW.x,DW.z,id);pausedDayPosition=false;}
  else pts=route(at,id);
  sel=id; showInfo(); decorate();
  const cum=cumOf(pts), total=cum[cum.length-1];
  if(reduce||total<.5){ at=id; placeDwarf(NXZ[id][0],NXZ[id][1]); arrived(id); return; }
  /* 1초 남짓에 닿게: 거리에 비례하되 0.35~1.4초. 빨리 갈수록 한 번에 멀리 뛴다(초당 5번쯤).
     위치 곡선은 처음 기울기 v(이어받은 속도), 끝 기울기 0인 3차 곡선. v=0이면 부드러운 출발·도착 */
  const fm=feetMode(), dur=Math.max(fm?600:350,Math.min(fm?1800:1400,total*(fm?28:22))), hopLen=Math.max(fm?6:2.6,total/dur*1000*(fm?.4:.2)), hopH=fm?2.6:.95, t0=performance.now();
  const v=Math.min(2.5,v0*dur/total), ease=k=>v*k+(3-2*v)*k*k+(v-2)*k*k*k;
  maxHop=0;
  dw.classList.remove("idle"); walking={to:id,pos:pts[0].slice(),vel:[0,0],t:t0,drawn:0};
  const step=now=>{
    const k=Math.min(1,(now-t0)/dur), d=ease(k)*total;
    let i=1; while(i<cum.length-1&&cum[i]<d) i++;
    const f=(d-cum[i-1])/((cum[i]-cum[i-1])||1), x=pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f, z=pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f;
    const dt=now-walking.t; if(dt>0) walking.vel=[(x-walking.pos[0])/dt,(z-walking.pos[1])/dt]; walking.pos=[x,z]; walking.t=now;
    const a=project([pts[i-1][0],0,pts[i-1][1]]), b=project([pts[i][0],0,pts[i][1]]); dw.classList.toggle("flip",b[0]<a[0]-.01);
    const want=Math.atan2(-(pts[i][0]-pts[i-1][0]),pts[i][1]-pts[i-1][1]); DW.yaw=DW.yaw+(angTo(DW.yaw,want)-DW.yaw)*.18;
    const ph=(d/hopLen)%1, hop=Math.sin(ph*Math.PI)*hopH*(1-Math.pow(1-Math.min(1,k*6),2))*(k>.97?0:1), sq=ph<.12||ph>.88?(fm?1:.8):0;
    // 걷는 동안 다시 그리기는 초당 30번(느린 기기면 20번)까지만. 위치는 시간으로 정해지므로 속도는 같고, 도착 자리는 아래에서 꼭 그린다.
    if(k>=1||!gl||now-walking.drawn>=(QUALITY<1?50:33)){ walking.drawn=now; placeDwarf(x,z,hop,sq*(k<.98?1:0),DW.yaw); }
    if(k<1) walking.raf=requestAnimationFrame(step); else { walking=null; at=id; dw.classList.add("idle"); placeDwarf(NXZ[id][0],NXZ[id][1]); arrived(id); }
  };
  walking.raf=requestAnimationFrame(step);
}
function showInfo(){
  const b=byId(sel), off=isOff(b), now=nowId()===b.id;
  document.getElementById("iTop").innerHTML='<span>'+(b.id==="sunday"?"":DAY_NAMES[dayIdx]+"요일 · ")+blockTime(b)+'</span><span>'+routeOf(state.line)[0]+' · '+routeOf(state.line)[1]+'</span>'+
    (off?'<span class="chip off">'+(state.line===3?"오솔길: 쉼":state.line===2?"샛길: 지움":"쉼")+'</span>':now?'<span class="chip">지금</span>':"");
  document.getElementById("iName").textContent=b.name;
  let todo=((b.todoBy&&b.todoBy[state.line])||b.todo).map(t=>'<li>'+t+'</li>').join("");
  if(b.extra2&&state.line===2) todo+='<li class="extra">+ '+b.extra2+'</li>';
  document.getElementById("iTodo").innerHTML=todo;
  // 실제로 하는 순서: 접어 두고, 펼치면 길(1·2·3선)에 맞는 순서가 나온다
  const steps=stepsOf(b,state.line), det=document.getElementById("iSteps"), done=doneSet(b.id);
  det.hidden=!steps.length; stepsSummary(steps.length,done.size);
  det.querySelector("ol").innerHTML=steps.map((t,i)=>'<li'+(done.has(i)?' class="done"':'')+'><label><input type="checkbox" data-i="'+i+'"'+(done.has(i)?' checked':'')+'><span>'+esc(t)+'</span></label></li>').join("");
  const tm=trampMode(), breaks=isToday()&&JOURNEY.trampolineFor()==="breaks-today";
  const again=(b.id==="sunday"&&isToday()&&dayIdx===0)?" 산 정상 칸을 한 번 더 누르면 이번 주 점프를 본다.":" 같은 칸을 한 번 더 누르면 두루마리가 펼쳐진다.";
  const gone=" 트램펄린은 이번 주에 이미 잃어서 빈 등으로 걷는다.";
  document.getElementById("iHint").textContent=
    state.line===3?(tm==="none"?"크게 늦은 날. 트램펄린은 이번 주에 이미 잃어서, 오솔길을 걸어서 간다. 최소 기준선까지만 해내자."
      :"크게 늦은 날. 걸어서는 못 가서 트램펄린을 발밑에 깔고 억지로 튀어 간다. 오늘이 지나면 트램펄린은 망가진다.")+again
    :state.line===2?"서두르다 모자를 잃어버렸다("+(PLAN.leave?"집에 두고 나왔다":"꺼진 오전 칸 옆 풀밭")+"). 오늘은 하루 종일 맨머리로 다니고, 내일 아침엔 새 모자를 쓴다."
      +(breaks?" 이번 주 두 번째 2선이라 트램펄린도 오늘로 잃는다.":tm==="none"?gone:"")+(sideOpen()?" 오전이 꺼진 날엔 들꽃 샛길로 질러간다.":" 오늘은 큰길 옆 들꽃 샛길로 다닌다.")+again
    :"다른 칸을 누르면 소년이 큰길로 걸어간다."+(tm==="none"?gone:"")+again;
}
/* 일요일(오늘)에 산 정상 칸을 누르면: 정상까지 걸어가서 점프 연출을 본다. 이미 정상에 있으면 바로 */
let jumpOnArrive=false;
const sundayToday=()=>isToday()&&dayIdx===0;
function arrived(id){ if(sceneMode==="day"){setCamera();buildOverlay();decorate();DW.drawn=null;placeDwarf(NXZ[id][0],NXZ[id][1]);render();} if(jumpOnArrive&&id==="sunday"){ jumpOnArrive=false; WEEK.playJump(); } }
nodesEl.addEventListener("click",e=>{ const n=e.target.closest(".node"); if(!n) return; const id=n.dataset.id;
  if(id==="sunday"&&sundayToday()){ jumpOnArrive=true; if(!walking&&at===id){ sel=id; showInfo(); decorate(); arrived(id); } else walkTo(id); return; }
  jumpOnArrive=false;
  if(id===sel&&!walking&&at===id) openScroll(id,n); else walkTo(id); });
/* 오늘 한 순서: 체크하면 이 기기에 날짜·칸·길별로 기억한다(localStorage, 일주일 지나면 지움).
   규칙·기록(JOURNEY)과는 무관한 개인 메모라 db에 쓰지 않는다. 칸의 순서를 다 하면 일정 카드에 ✓ */
const STEPS_KEY="oi.steps";
function stepsLog(){ try{ return JSON.parse(store.get(STEPS_KEY)||"{}")||{}; }catch(e){ return {}; } }
const stepsKey=id=>selectedDate()+"|"+id+"|"+state.line;
function doneSet(id){ return new Set(stepsLog()[stepsKey(id)]||[]); }
function setDone(id,i,on){
  const log=stepsLog(), k=stepsKey(id), s=new Set(log[k]||[]); if(on) s.add(i); else s.delete(i); log[k]=[...s];
  const cutoff=new Date(Date.parse(JOURNEY.todayKey()+"T00:00:00Z")-7*864e5).toISOString().slice(0,10);
  for(const key of Object.keys(log)) if(key.split("|")[0]<cutoff||!log[key].length) delete log[key];
  store.set(STEPS_KEY,JSON.stringify(log));
}
function allDone(id){ const b=byId(id), n=b?stepsOf(b,state.line).length:0; return n>0&&doneSet(id).size>=n; }
function stepsSummary(n,k){ document.querySelector("#iSteps summary").textContent="자세한 순서 · "+(k?k+"/"+n+" 했음":n+"단계"); }
document.getElementById("iSteps").addEventListener("change",e=>{
  const box=e.target.closest("input[data-i]"); if(!box) return;
  setDone(sel,+box.dataset.i,box.checked); box.closest("li").classList.toggle("done",box.checked);
  stepsSummary(stepsOf(byId(sel),state.line).length,doneSet(sel).size); decorate();
});
// 순서를 펼치면 안내판이 길어지므로, 장소 표지가 그 밑에 깔리지 않게 다시 놓는다
document.getElementById("iSteps").addEventListener("toggle",()=>{ if(sceneMode==="day"){ buildOverlay(); decorate(); } });
document.getElementById("enter").addEventListener("click",()=>openScroll(sel,document.querySelector('.node[data-id="'+sel+'"]')));

function refresh(rerender){
  const W=toMin(wakeEl.value)??450, woke=toMin(wokeEl.value)??W, line=computeLine(W,woke), changed=line!==state.line;
  state={W,line};
  dw.dataset.hat=hatLost()?"0":"1"; dw.dataset.tramp=trampMode();
  const r=document.getElementById("route"); r.dataset.line=line; r.innerHTML=signSVG+"<span>"+routeOf(line)[0]+" · "+routeOf(line)[1]+(wokeEl.value?"":" · 아직 안 적음")+"</span>";
  buildOverlay(); decorate(); showInfo();
  if(rerender||changed) render();
}
/* 오늘 요일을 보고 있을 때 '오늘 일어난 시각'을 고치면 오늘 기록으로 남긴다(타자 중엔 0.8초 기다렸다가) */
let recT=0;
[wakeEl,wokeEl].forEach(el=>el.addEventListener("input",()=>{ store.set("dw.wake",wakeEl.value); refresh(false);
  if(el===wokeEl){ clearTimeout(recT); recT=0; }
  if(el===wokeEl&&isToday()&&toMin(wokeEl.value)!==null){ const key=JOURNEY.todayKey(); recT=setTimeout(()=>{ recT=0; if(key===JOURNEY.todayKey()&&isToday()&&toMin(wokeEl.value)!==null) Promise.resolve(JOURNEY.recordToday(wokeEl.value,state.line)).catch(e=>console.error(e)); },800); } }));
/* db 로드/기록 때 갱신되는 날짜별 캐시에서 선택한 날의 값을 읽는다.
   오늘만 입력 가능하며, 날짜가 바뀌면 포커스 중이어도 이전 값을 지운다. */
let wokeDate=JOURNEY.todayKey();
function restoreTodayWake(){
  const key=selectedDate(), changed=key!==wokeDate;
  if(changed){ clearTimeout(recT); recT=0; wokeDate=key; wokeEl.value=""; }
  wokeEl.disabled=!isToday();
  if(!changed&&isToday()&&(recT||document.activeElement===wokeEl)) return;
  let rec=null;
  try { rec=JSON.parse(store.get("oi.journey.days")||"{}")[key]; } catch(e) {}
  wokeEl.value=rec&&[1,2,3].includes(rec.line)&&toMin(rec.woke)!==null?rec.woke:"";
}
/* 한 주 기록·맵이 바뀌면: 맵이 바뀌었으면 풍경을 다시 그리고, 아니면 난쟁이만(트램펄린 상태) 다시 그린다 */
function applyJourney(){
  restoreTodayWake();
  const m=Math.max(1,Math.min(MAPS.length,+JOURNEY.progress().map||1)), mapChanged=m!==mapNo; mapNo=m;
  refresh(mapChanged); if(!mapChanged) drawDwarf();
}
window.__setMap=n=>{ mapNo=Math.max(1,Math.min(MAPS.length,Math.trunc(+n)||1)); render(); };
function layoutAll(){
  if(walking){ cancelAnimationFrame(walking.raf); at=walking.to; walking=null; dw.classList.add("idle"); }
  const W=stageEl.clientWidth||window.innerWidth, land=W>=900;
  const H=land?Math.round(Math.min(Math.max(window.innerHeight,620),W*.72)):Math.round(Math.min(W*1.75,Math.max(window.innerHeight*.92,620)));
  stageEl.style.height=H+"px"; VW={W,H,land}; setCamera();
  placeDwarf(NXZ[at][0],NXZ[at][1]); refresh(true);
}
(function init(){
  setDay(dayIdx);
  restoreTodayWake();
  const W=toMin(wakeEl.value)??450, woke=toMin(wokeEl.value)??W; state={W,line:computeLine(W,woke)};
  document.getElementById("days").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; setDay(+b.dataset.d); restoreTodayWake(); if(walking){ cancelAnimationFrame(walking.raf); at=walking.to; walking=null; dw.classList.add("idle"); } placeDwarf(NXZ[at][0],NXZ[at][1]); refresh(true); });
  const h=location.hash.slice(1), n=nowId(); at=sel=(h&&NXZ[h])?h:(n||"dawn");
  // Let DB bindings finish before synchronous shader compilation can occupy the main thread.
  document.body.classList.add("journey-day"); layoutAll();
  let to,lastW=VW.W; window.addEventListener("resize",()=>{ clearTimeout(to); to=setTimeout(()=>{ if(Math.abs(stageEl.clientWidth-lastW)>2){ lastW=stageEl.clientWidth; layoutAll(); } },180); });
  let calendarDate=JOURNEY.todayKey();
  const updateCalendar=()=>{
    if(calendarDate===JOURNEY.todayKey()) return;
    calendarDate=JOURNEY.todayKey(); setDay(todayDow()); applyJourney();
  };
  document.addEventListener("visibilitychange",updateCalendar);
  setInterval(()=>{ updateCalendar(); decorate(); if(!walking) showInfo(); },60000);
  JOURNEY.ready.then(()=>{ applyJourney(); if(state.line===3&&!location.hash)at=sel='minimum'; initGL(); layoutAll(); JOURNEY.onChange(applyJourney);
    const ready=()=>{ if(gl&&!raster.done){ requestAnimationFrame(ready); return; } window.__journeyReady=true; }; ready();
  }).catch(e=>console.error(e));  // db 처리와 첫 렌더가 끝나면 시험용 준비 신호
})();

/* ───── 비눗방울 ───── */
(function(){
  const box=document.getElementById("bubbles"); let h="";
  const rnd=(a,b)=>a+Math.random()*(b-a);
  for(let i=0;i<9;i++){ const s=rnd(12,54).toFixed(0);
    h+='<span class="bubble" style="left:'+rnd(2,96).toFixed(1)+'%;width:'+s+'px;height:'+s+'px;--d:'+rnd(28,50).toFixed(1)+'s;--delay:-'+rnd(0,40).toFixed(1)+'s"></span>'; }
  box.innerHTML=h;
})();

let savedDayPosition=null,pausedDayPosition=false;
// Landscape signs and the complete itinerary share exactly the same walking/scroll action.
document.getElementById("dayMarkers").addEventListener("click",e=>{
  const sign=e.target.closest("[data-place]");
  if(sign)nodesEl.querySelector(`[data-id="${sign.dataset.place}"]`)?.click();
});
const MAP_VIEW={
  showWeek(){if(sceneMode==="week")return;savedDayPosition={x:DW.x,z:DW.z,yaw:DW.yaw}; if(walking){cancelAnimationFrame(walking.raf);walking=null;pausedDayPosition=true;}jumpOnArrive=false;closeScroll();sceneMode="week";document.body.classList.remove("journey-day");uploadSceneTerrain();setCamera();buildOverlay();render();},
  showDay(){if(sceneMode==="day")return;sceneMode="day";document.body.classList.add("journey-day");uploadSceneTerrain();setCamera();buildOverlay();decorate();const p=savedDayPosition;placeDwarf(p?p.x:NXZ[at][0],p?p.z:NXZ[at][1],0,0,p?.yaw);render();},
  get is3D(){return !!gl;},
  sections(){return MAP_SCENES.sections(ROAD).map(s=>({...s,screen:project(P3(...s.center,1)),points:s.points.map(p=>project(P3(...p,.15)))}));},
  summit(){return project(P3(...NXZ.sunday,1));}
};
