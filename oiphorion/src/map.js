
/* ───── 시각 도우미 ───── */
const toMin = s=>{const m=/^(\d{1,2}):(\d{2})/.exec(s||"");return m?(+m[1])*60+(+m[2]):null};
const hhmm = m=>{m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")};
const store = {get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const wakeEl=document.getElementById("wake"), wokeEl=document.getElementById("woke");
{ const a=store.get("dw.wake"); if(a) wakeEl.value=a; const b=store.get("dw.woke"); if(b) wokeEl.value=b; }
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
let dayIdx=new Date().getDay(), PLAN=BLOCKS;
const planOf=d=>PLANS[d]||PLANS.free;
function setDay(d){ dayIdx=d; PLAN=planOf(d); ALL=[...PLAN,...WEEKLY]; document.querySelectorAll('#days button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.d===d))); }
function blockTime(b){ if(!b.when) return b.whenLabel; const [s,e]=b.when(state.W); if(b.id==="morning"&&s>=e) return "오전 없음"; return hhmm(s)+" – "+hhmm(e); }
function isOff(b){ if(b.id==="morning"&&!b.fixed){ const [s,e]=b.when(state.W); if(s>=e) return true; } return !!(b.lines&&!b.lines.includes(state.line)); }
function nowId(){ const d=new Date(), n0=d.getHours()*60+d.getMinutes();
  if(new Date().getDay()!==dayIdx) return null;
  for(const b of PLAN){ if(b.only3&&state.line!==3) continue; if(isOff(b)) continue; const [s,e]=b.when(state.W); const n=(b.id==="camp"&&n0<state.W)?n0+1440:n0; if(n>=s&&n<e) return b.id; }
  return null; }

/* ───── 세계: 높이 지도 (구름 바다 위 고원 · 하늘로 오르는 언덕 · 절벽) ───── */
const fract=x=>x-Math.floor(x);
function hash12(x,y){ let a=fract(x*.1031), b=fract(y*.1031), c=fract(x*.1031); const d=a*(b+33.33)+b*(c+33.33)+c*(a+33.33); a+=d;b+=d;c+=d; return fract((a+b)*c); }
function vnoise(x,y){ const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy);
  const a=hash12(ix,iy), b=hash12(ix+1,iy), c=hash12(ix,iy+1), d=hash12(ix+1,iy+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5; for(let i=0;i<(o||4);i++){ s+=a*vnoise(x,y); x=x*2.03+17.1; y=y*2.03+9.3; a*=.5; } return s/(1-Math.pow(.5,o||4)); }
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const HILL={x:18,z:-34,R:28,H:39};
function islandS(x,z){ const sL=x-(-26-z*.5+(fbm(z*.06,1.7,3)-.5)*9); const sB=z-(-64+(fbm(x*.05,9.1,3)-.5)*9); return Math.min(sL,sB,140-x,95-z); }
function rawH(x,z){
  let h=(fbm(x*.035,z*.035)-.5)*3.4+Math.sin(x*.05+1)*Math.cos(z*.045)*.9;
  const d=Math.hypot(x-HILL.x,z-HILL.z), t=Math.sqrt(d*d+10)/HILL.R;
  if(t<1) h+=HILL.H*Math.pow(1-t,1.35)*(1+(fbm(x*.09,z*.09,2)-.5)*.05);
  const s=islandS(x,z);
  if(s<0){ const k=smooth(0,4.8,-s); h=h-52*k+(fbm(x*.22,z*.22,3)-.5)*3.2*Math.min(1,k*2); }
  return h;
}
const DOM={x0:-90,z0:-115,x1:150,z1:95,res:.4};
DOM.nx=Math.round((DOM.x1-DOM.x0)/DOM.res)+1; DOM.nz=Math.round((DOM.z1-DOM.z0)/DOM.res)+1;
const HM=new Float32Array(DOM.nx*DOM.nz), SM=new Float32Array(DOM.nx*DOM.nz), QM=new Float32Array(DOM.nx*DOM.nz).fill(3);
for(let j=0;j<DOM.nz;j++){ const z=DOM.z0+j*DOM.res; for(let i=0;i<DOM.nx;i++){ const x=DOM.x0+i*DOM.res, k=j*DOM.nx+i; HM[k]=rawH(x,z); SM[k]=islandS(x,z); } }
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
const ROAD=catmull(MAIN_CTRL,SEG), SPUR=catmull(SPUR_CTRL,SEG);
const campI=MAIN_NODE_CTRL.camp*SEG, sumI=MAIN_NODE_CTRL.sunday*SEG;
const roadHalf=i=> i<=campI ? 1.55 : 1.55-(0.85)*Math.min(1,(i-campI)/(sumI-campI));
/* 길을 높이 지도에 새긴다: q = 중심에서의 거리 / 반폭 */
for(let s=0;s<ROAD.length-1;s++){ const [ax,az]=ROAD[s],[bx,bz]=ROAD[s+1], w=roadHalf(s), R=w*3.2;
  const i0=Math.max(0,Math.floor((Math.min(ax,bx)-R-DOM.x0)/DOM.res)), i1=Math.min(DOM.nx-1,Math.ceil((Math.max(ax,bx)+R-DOM.x0)/DOM.res));
  const j0=Math.max(0,Math.floor((Math.min(az,bz)-R-DOM.z0)/DOM.res)), j1=Math.min(DOM.nz-1,Math.ceil((Math.max(az,bz)+R-DOM.z0)/DOM.res));
  const dx=bx-ax, dz=bz-az, L2=dx*dx+dz*dz||1;
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const x=DOM.x0+i*DOM.res, z=DOM.z0+j*DOM.res; let t=((x-ax)*dx+(z-az)*dz)/L2; t=Math.max(0,Math.min(1,t));
    const d=Math.hypot(x-ax-dx*t,z-az-dz*t)/w, k=j*DOM.nx+i; if(d<QM[k]) QM[k]=d; } }
for(let k=0;k<HM.length;k++){ const q=QM[k]; if(q<1.6) HM[k]-=0.16*(1-smooth(.7,1.6,q)); }

/* 물건들 */
const nodeY=id=>groundY(NXZ[id][0],NXZ[id][1])+.24;
const TREES=[[38,-15,1.05],[42.5,-19.5,.9],[33.5,-13,.75],[-2.5,-17.5,.95],[2.2,-20.5,.8],[47,12,1.15],[53,3.5,.95],[-13,25,.8]];
const POSTS=[]; for(let z=-10.5;z>=-30.5;z-=2.25){ [-1,1].forEach(sd=>{ const t=Math.min(1,(-z-8.5)/25), w=1.55-.85*t; POSTS.push([18+sd*(w+.75),z]); }); }
const TENT=[25.5,-6.8], SIGN=[-35,29.5], FLAG=[19.9,-34];
const CLOUD_Y=-9, CLOUD_AMP=4.6, DOOR=[-63,-11];

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
  if(asp>=1.25){ ro=[-2,30,92]; ta=[5,11.5,-2]; fl=2.05; }
  else if(asp>=.85){ ro=[0,36,104]; ta=[5,11,-4]; fl=1.9; }
  else { ro=[-67.7,66,44]; ta=[5,20,2]; fl=1.3*Math.max(.85,Math.min(1.15,asp/.57)); }
  const cw=v3.norm(v3.sub(ta,ro)), cu=v3.norm(v3.cross(cw,[0,1,0])), cv=v3.cross(cu,cw);
  CAM={ro,ta,fl,cw,cu,cv};
}
function project(P){ const d=v3.sub(P,CAM.ro), z=v3.dot(d,CAM.cw); const ux=v3.dot(d,CAM.cu)*CAM.fl/z, uy=v3.dot(d,CAM.cv)*CAM.fl/z;
  return [(ux*VW.H+VW.W)/2,(VW.H-uy*VW.H)/2,z]; }

/* ───── 셰이더 ───── */
const VS="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const FS=`precision highp float;
uniform vec2 uRes; uniform vec3 uRo,uCu,uCv,uCw; uniform float uFl;
uniform sampler2D uHm, uCl; uniform vec2 uHN; uniform vec4 uDom; uniform vec3 uL;
uniform vec4 uNodes[10]; uniform vec4 uTrees[24]; uniform vec4 uPosts[20];
uniform vec3 uTent, uSign, uFlag, uDoor; uniform float uSignRot;
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
vec3 sky(vec3 rd){
  float e=rd.y;
  vec3 c=mix(lin(vec3(.90,.95,1.)),lin(vec3(.42,.66,.98)),smoothstep(0.,.025,e));
  c=mix(c,lin(vec3(.12,.36,.88)),smoothstep(.02,.12,e));
  c=mix(c,lin(vec3(.03,.14,.62)),smoothstep(.1,.45,e));
  vec3 md=normalize(vec3(.42,.36,-1.));
  float m=dot(rd,md);
  c+=vec3(.5,.6,.8)*.06*pow(max(m,0.),60.);
  float disc=smoothstep(.99988,.99992,m);
  vec3 md2=normalize(md+vec3(.0052,.0016,0.));
  float cut=smoothstep(.99988,.99992,dot(rd,md2));
  c=mix(c,lin(vec3(.97,.98,1.))*1.15,disc*(1.-cut*.8));
  float s=max(dot(rd,uL),0.); c+=vec3(1.,.95,.85)*pow(s,40.)*.25;
  return c;
}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdNode(vec3 q){vec2 d=vec2(length(q.xz)-1.3,abs(q.y)-.1);return min(max(d.x,d.y),0.)+length(max(d,0.))-.16;}
float sdCone(vec3 p,vec2 c,float h){vec2 q=h*vec2(c.x/c.y,-1.);vec2 w=vec2(length(p.xz),p.y);vec2 a=w-q*clamp(dot(w,q)/dot(q,q),0.,1.);vec2 b=w-q*vec2(clamp(w.x/q.x,0.,1.),1.);float k=sign(q.y);float d=min(dot(a,a),dot(b,b));float s=max(k*(w.x*q.y-w.y*q.x),k*(w.y-q.y));return sqrt(d)*sign(s);}
vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.z,p.y,s*p.x+c*p.z);}
vec2 obj(vec3 p){
  float d=1e5,id=0.;
  for(int i=0;i<10;i++){vec3 q=p-uNodes[i].xyz;float b=length(q)-1.7;float dd=b>.4?b:sdNode(q);if(dd<d){d=dd;id=10.+float(i);}}
  for(int i=0;i<8;i++){vec4 a=uTrees[i*3],b=uTrees[i*3+1],c=uTrees[i*3+2];float bb=length(p-a.xyz)-a.w*2.2;float dd;
    if(bb>.5) dd=bb; else dd=smin(smin(length(p-a.xyz)-a.w,length(p-b.xyz)-b.w,.6),length(p-c.xyz)-c.w,.6);
    if(dd<d){d=dd;id=2.;}}
  for(int i=0;i<20;i++){vec4 s=uPosts[i];vec3 q=p-s.xyz-vec3(0.,s.w*.5,0.);float b=length(q)-s.w;float dd=b>.3?b:sdBox(q,vec3(.075,s.w*.5,.075));if(dd<d){d=dd;id=3.;}}
  {vec3 q=p-uTent;float b=length(q+vec3(0.,1.7,0.))-3.;float dd=b>.3?b:sdCone(q,vec2(.5,.866),3.4);if(dd<d){d=dd;id=4.;}}
  {vec3 q=p-uSign;float b=length(q-vec3(0.,5.,0.))-5.5;
    if(b>.3){if(b<d){d=b;id=5.;}}
    else{float pole=sdBox(q-vec3(0.,3.6,0.),vec3(.13,3.6,.13));vec3 r=rotY(q-vec3(0.,7.6,0.),uSignRot);float bd=sdBox(r,vec3(2.5,1.65,.09));
      if(pole<d){d=pole;id=5.;} if(bd<d){d=bd;id=6.;}}}
  {vec3 q=p-uFlag;float b=length(q-vec3(.7,2.,0.))-2.4;
    if(b>.3){if(b<d){d=b;id=7.;}}
    else{float pole=sdBox(q-vec3(0.,1.9,0.),vec3(.06,1.9,.06));float fl=sdBox(q-vec3(.85,3.25,0.),vec3(.8,.48,.03));
      if(pole<d){d=pole;id=7.;} if(fl<d){d=fl;id=8.;}}}
  {vec3 q=p-uDoor;float b=length(q-vec3(0.,1.3,0.))-2.;
    if(b>.3){if(b<d){d=b;id=9.;}}
    else{float fr=sdBox(q-vec3(0.,1.35,0.),vec3(.78,1.42,.1));float pn=sdBox(q-vec3(0.,1.3,.06),vec3(.64,1.28,.08));
      if(fr<d){d=fr;id=9.;} if(pn<d){d=pn;id=9.5;}}}
  return vec2(d,id);
}
vec3 objN(vec3 p){vec2 e=vec2(.004,-.004);return normalize(e.xyy*obj(p+e.xyy).x+e.yyx*obj(p+e.yyx).x+e.yxy*obj(p+e.yxy).x+e.xxx*obj(p+e.xxx).x);}
float shadow(vec3 p){
  float res=1.,t=.25;
  for(int i=0;i<56;i++){vec3 q=p+uL*t;if(q.y>42.)break;float h=q.y-hm(q.xz);res=min(res,9.*h/t);if(res<.01)break;t+=clamp(h*.45,.2,5.);}
  for(int i=0;i<24;i++){vec4 tr=uTrees[i];vec3 oc=tr.xyz-p;float b=dot(oc,uL);if(b>0.){float dd=length(oc-uL*b)-tr.w;res=min(res,clamp(.5+dd*2./max(b,.5)*2.,0.,1.));}}
  for(int i=0;i<10;i++){vec3 oc=uNodes[i].xyz-p;float b=dot(oc,uL);if(b>0.&&b<6.){float dd=length(oc-uL*b)-1.4;res=min(res,clamp(.4+dd*3.,0.,1.));}}
  return clamp(res,0.,1.);
}
vec3 SUN=vec3(1.,.95,.86)*2.7;
vec3 AMB=vec3(.30,.44,.78);
vec3 fogit(vec3 c,float t,vec3 rd){
  vec3 hz=lin(vec3(.86,.93,1.));
  float f=1.-exp(-max(t-110.,0.)*.0011);
  return mix(c,hz*1.02,f);
}
vec3 shadeGround(vec3 p,vec3 rd,float t){
  vec4 a=hmAll(p.xz);float h=a.x,q=a.y,s=a.z;
  float e=.22;
  vec3 n=normalize(vec3(hm(p.xz-vec2(e,0.))-hm(p.xz+vec2(e,0.)),2.*e,hm(p.xz-vec2(0.,e))-hm(p.xz+vec2(0.,e))));
  float n1=vn(p.xz*.045),n2=vn(p.xz*.6+7.),n3=vn(p.xz*2.7)*vn(p.xz*5.3+3.);
  vec3 gA=lin(vec3(.22,.50,.15)),gB=lin(vec3(.38,.68,.22)),gS=lin(vec3(.56,.76,.30)),dry=lin(vec3(.66,.72,.40));
  vec3 alb=mix(gA,gB,smoothstep(.25,.8,n1));
  alb=mix(alb,gS,smoothstep(.6,.9,n2)*.22);
  alb=mix(alb,dry,smoothstep(.62,.8,vn(p.xz*.03+20.))*.35);
  float hill=smoothstep(2.5,6.,h);
  alb=mix(alb,lin(vec3(.33,.62,.19)),hill*.7);
  alb*=.86+.28*n3;
  {vec2 fc=floor(p.xz*2.2);float fh=h12(fc);vec2 fo=fract(p.xz*2.2)-.5-(vec2(h12(fc+3.1),h12(fc+7.7))-.5)*.6;float fm=step(.965,fh)*smoothstep(.16,.08,length(fo))*(1.-smoothstep(2.5,6.,h))*step(t,140.);
   alb=mix(alb,h12(fc+1.3)>.45?lin(vec3(1.,.98,.92)):lin(vec3(1.,.86,.35)),fm);}
  // 길
  float road=1.-smoothstep(.86,1.08,q);
  vec3 rc=mix(lin(vec3(.80,.55,.44)),lin(vec3(.94,.72,.60)),smoothstep(1.,.62,q));
  rc=mix(rc,lin(vec3(.97,.81,.71)),smoothstep(.34,.0,q)*.7);
  rc*=1.-.10*exp(-pow((q-.55)/.08,2.));
  rc*=.93+.12*vn(p.xz*4.1)*vn(p.xz*9.7+2.);
  float worn=(1.-smoothstep(1.,1.7,q))*(1.-road);
  alb=mix(alb,mix(alb,lin(vec3(.62,.66,.36)),.55),worn);
  alb=mix(alb,rc,road);
  // 절벽
  float rock=smoothstep(.6,-1.2,s)*smoothstep(.95,.7,n.y);
  rock=max(rock,smoothstep(-1.,-3.,s));
  float strata=vn(vec2(p.y*1.4,p.x*.05+p.z*.05))*.6+vn(p.xz*.7+p.y*.4)*.4;
  vec3 rk=mix(lin(vec3(.56,.55,.50)),lin(vec3(.80,.78,.71)),strata);
  rk=mix(rk,lin(vec3(.35,.5,.25)),smoothstep(.35,.6,vn(p.xz*.5+p.y))*.35*smoothstep(-6.,-.5,p.y-h+0.));
  alb=mix(alb,rk,rock);
  if(road<.5) n=normalize(n+vec3(n3-.5,0.,vn(p.xz*3.1+1.)-.5)*.18*(1.-rock));
  // 접지 그늘
  float ao=1.;
  for(int i=0;i<10;i++){float d=length(p.xz-uNodes[i].xz);ao*=mix(.45,1.,smoothstep(1.2,2.6,d));}
  for(int i=0;i<24;i+=3){vec4 tr=uTrees[i];float d=length(p.xz-tr.xz);ao*=mix(.5,1.,smoothstep(tr.w*.4,tr.w*1.9,d));}
  ao*=mix(.55,1.,smoothstep(-6.,0.,s+2.));
  float dif=max(dot(n,uL),0.)*shadow(p+n*.08);
  vec3 col=alb*(SUN*dif+AMB*(.55+.45*n.y)*ao+lin(vec3(.5,.62,.4))*.12*max(-n.y,0.));
  col+=alb*AMB*.12*pow(1.-max(dot(n,-rd),0.),3.);
  return col;
}
vec3 shadeCloud(vec3 p,vec3 rd,float t){
  vec4 c=cl(p.xz);
  vec3 n=vec3(c.g*2.-1.,0.,c.b*2.-1.);n.y=sqrt(max(0.,1.-n.x*n.x-n.z*n.z));
  float far=smoothstep(150.,700.,t);n=normalize(mix(n,vec3(0.,1.,0.),far*.7));
  float dif=clamp(dot(n,uL)*.65+.35,0.,1.);
  float sh=1.;
  if(p.x>-80.&&p.x<150.&&p.z>-120.&&p.z<60.) sh=shadow(p+vec3(0.,.1,0.));
  float cav=mix(.62,1.,c.a)*mix(.85,1.,c.r);
  vec3 lit=vec3(2.45,2.42,2.38),dark=lin(vec3(.52,.64,.86))*1.3;
  vec3 col=mix(dark,lit,dif*mix(.35,1.,sh))*cav;
  col+=vec3(.9,.95,1.)*.35*pow(1.-max(dot(n,-rd),0.),4.)*sh;
  return col;
}
vec3 shadeObj(vec3 p,vec3 rd,float id,float t){
  vec3 n=objN(p);
  float sh=shadow(p+n*.06);
  float dif=max(dot(n,uL),0.)*sh;
  vec3 alb=vec3(.5);float spec=0.,gloss=8.,emi=0.;
  vec3 ref=reflect(rd,n);float fre=pow(1.-max(dot(n,-rd),0.),5.);
  if(id>=10.){
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
  } else if(id<2.5){
    float v=vn(p.xz*1.7+p.y*1.3)*.6+vn(p.xz*4.3-p.y*3.1)*.4;
    alb=mix(lin(vec3(.10,.28,.11)),lin(vec3(.24,.47,.20)),v*.7+smoothstep(-.2,.9,n.y)*.35);
    n=normalize(n+vec3(v-.5)*.35);dif=max(dot(n,uL),0.)*sh;spec=.05;gloss=6.;
  } else if(id<3.5){alb=lin(vec3(.48,.34,.22));
  } else if(id<4.5){vec3 q=p-uTent;float an=atan(q.z,q.x);alb=mix(lin(vec3(.93,.25,.18)),lin(vec3(.98,.95,.88)),step(.5,fract(an/6.2832*8.)));if(q.y<-3.25)alb*=.6;
  } else if(id<5.5){alb=lin(vec3(.80,.82,.84));spec=.6;gloss=40.;
  } else if(id<6.5){vec3 r=rotY(p-uSign-vec3(0.,7.6,0.),uSignRot);alb=lin(vec3(.97,.97,.95));
    float fr=max(abs(r.x)-2.26,abs(r.y)-1.41);if(r.z>0.){if(fr>0.&&fr<.1)alb=lin(vec3(.1,.1,.11));}else alb=lin(vec3(.7,.72,.74));
  } else if(id<7.5){alb=lin(vec3(.95,.95,.95));spec=.4;gloss=30.;
  } else if(id<8.5){vec3 q=p-uFlag;alb=mix(lin(vec3(.1,.66,.9)),lin(vec3(.8,.95,1.)),smoothstep(3.,3.7,q.y)*.6);spec=.3;
  } else {alb=lin(vec3(.98,.98,.97));emi=id>9.25?.9:.3;}
  vec3 col=alb*(SUN*dif+AMB*(.6+.4*n.y));
  col+=SUN*spec*pow(max(dot(normalize(uL-rd),n),0.),gloss)*sh*(gloss>50.?1.2:.3);
  col+=spec*sky(ref)*(.08+.9*fre)*(gloss>50.?1.:.3);
  col+=alb*emi*vec3(1.,.97,.9);
  return col;
}
void main(){
  vec2 uv=(2.*gl_FragCoord.xy-uRes)/uRes.y;
  vec3 rd=normalize(uv.x*uCu+uv.y*uCv+uFl*uCw);
  vec3 ro=uRo;
  float t=.5,tp=.5,hit=-1.;float kind=0.;
  if(ro.y>44.&&rd.y<0.) t=max(t,(44.-ro.y)/rd.y);
  tp=t;
  for(int i=0;i<230;i++){
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
  vec3 bmin=vec3(-72.,-12.,-48.),bmax=vec3(56.,40.,46.);
  vec3 iv=1./rd,t0=(bmin-ro)*iv,t1=(bmax-ro)*iv,tmn=min(t0,t1),tmx=max(t0,t1);
  float tn=max(max(tmn.x,tmn.y),tmn.z),tf=min(min(tmx.x,tmx.y),tmx.z);
  float oid=0.,ot=-1.;
  if(tf>max(tn,0.)){float tt=max(tn,.5);float lim=hit>0.?min(tf,hit):tf;
    for(int i=0;i<140;i++){vec2 o=obj(ro+rd*tt);if(o.x<.0015*tt){ot=tt;oid=o.y;break;}tt+=o.x*.9;if(tt>lim)break;}}
  vec3 col;
  if(ot>0.){col=shadeObj(ro+rd*ot,rd,oid,ot);col=fogit(col,ot,rd);}
  else if(hit>0.){vec3 p=ro+rd*hit;col=kind<1.5?shadeGround(p,rd,hit):shadeCloud(p,rd,hit);col=fogit(col,hit,rd);}
  else if(rd.y<0.){float tt=(CY+2.-ro.y)/rd.y;col=fogit(shadeCloud(ro+rd*tt,rd,tt),tt,rd);}
  else col=sky(rd);
  // 문 빛
  {vec3 dc=uDoor+vec3(0.,1.3,0.)-ro;float b=dot(dc,rd);if(b>0.){float g=length(dc-rd*b);col+=lin(vec3(1.,.95,.8))*.7*exp(-g*g*.12)*(hit<0.||hit>b-2.?1.:.0);}}
  col=1.-exp(-col*1.85);
  col=pow(col,vec3(1./2.2));
  col=mix(vec3(dot(col,vec3(.299,.587,.114))),col,1.05);
  float vg=1.-.12*dot(uv*.5,uv*.5);col*=vg;
  col+=(h12(gl_FragCoord.xy)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;

/* ───── 렌더러 ───── */
const stageEl=document.getElementById("stage"), cv=document.getElementById("gl");
let gl=null, prog=null, U={}, raster={band:0,y:0,raf:0,done:false};
function initGL(){
  try{ gl=cv.getContext("webgl",{preserveDrawingBuffer:true,antialias:false,alpha:false}); }catch(e){ gl=null; }
  if(!gl){ stageEl.classList.add("nogl"); return false; }
  const sh=(type,src)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  try{ prog=gl.createProgram(); gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS)); gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS)); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); }
  catch(e){ console.error(e); stageEl.classList.add("nogl"); gl=null; return false; }
  gl.useProgram(prog);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,"a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  ["uRes","uRo","uCu","uCv","uCw","uFl","uHm","uCl","uHN","uDom","uL","uNodes","uTrees","uPosts","uTent","uSign","uFlag","uDoor","uSignRot"].forEach(n=>U[n]=gl.getUniformLocation(prog,n));
  // 높이 지도
  const hd=new Uint8Array(DOM.nx*DOM.nz*4);
  for(let k=0;k<HM.length;k++){ const v=Math.round(Math.max(0,Math.min(1,(HM[k]+60)/100))*65535); hd[k*4]=v>>8; hd[k*4+1]=v&255; hd[k*4+2]=Math.round(Math.min(QM[k],3)/3*255); hd[k*4+3]=Math.round((Math.max(-8,Math.min(8,SM[k]))+8)/16*255); }
  const t0=gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,t0);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,DOM.nx,DOM.nz,0,gl.RGBA,gl.UNSIGNED_BYTE,hd);
  [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST));
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE));
  const ct=cloudTexture(512), t1=gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,t1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,ct.N,ct.N,0,gl.RGBA,gl.UNSIGNED_BYTE,ct.data);
  [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR));
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.REPEAT));
  gl.uniform1i(U.uHm,0); gl.uniform1i(U.uCl,1);
  gl.uniform2f(U.uHN,DOM.nx,DOM.nz); gl.uniform4f(U.uDom,DOM.x0,DOM.z0,DOM.x1-DOM.x0,DOM.z1-DOM.z0);
  const L=v3.norm([-.62,.66,.42]); gl.uniform3f(U.uL,L[0],L[1],L[2]);
  const tr=[]; TREES.forEach(([x,z,s])=>{ const y=groundY(x,z); tr.push(x,y+1.55*s,z,1.5*s, x+.95*s,y+1.05*s,z+.35*s,1.08*s, x-.85*s,y+.95*s,z-.3*s,1.0*s); });
  gl.uniform4fv(U.uTrees,new Float32Array(tr));
  const ps=[]; POSTS.forEach(([x,z])=>ps.push(x,groundY(x,z)-.1,z,1.15)); gl.uniform4fv(U.uPosts,new Float32Array(ps));
  gl.uniform3f(U.uTent,TENT[0],groundY(TENT[0],TENT[1])+3.35,TENT[1]);
  gl.uniform3f(U.uSign,SIGN[0],groundY(SIGN[0],SIGN[1])-.05,SIGN[1]);
  gl.uniform3f(U.uFlag,FLAG[0],groundY(FLAG[0],FLAG[1])-.1,FLAG[1]);
  gl.uniform3f(U.uDoor,DOOR[0],CLOUD_Y+2.6,DOOR[1]);
  return true;
}
function nodeUniforms(){
  if(!gl) return;
  const a=[]; NODE_ORDER.forEach(id=>{ const b=byId(id); let k=0;
    if(id==="sunday") k=4; else if(id==="minimum") k=state.line===3?3:2; else if(isOff(b)) k=1;
    a.push(NXZ[id][0],nodeY(id),NXZ[id][1],k); });
  gl.useProgram(prog); gl.uniform4fv(U.uNodes,new Float32Array(a));
}
function render(){
  if(!gl) return;
  cancelAnimationFrame(raster.raf);
  const dpr=Math.min(window.devicePixelRatio||1,1.5);
  let w=Math.round(VW.W*dpr), h=Math.round(VW.H*dpr);
  const cap=2.3e6; if(w*h>cap){ const k=Math.sqrt(cap/(w*h)); w=Math.round(w*k); h=Math.round(h*k); }
  cv.width=w; cv.height=h; gl.viewport(0,0,w,h);
  gl.uniform2f(U.uRes,w,h); gl.uniform3fv(U.uRo,CAM.ro); gl.uniform3fv(U.uCu,CAM.cu); gl.uniform3fv(U.uCv,CAM.cv); gl.uniform3fv(U.uCw,CAM.cw); gl.uniform1f(U.uFl,CAM.fl);
  gl.uniform1f(U.uSignRot,Math.atan2(CAM.ro[0]-SIGN[0],CAM.ro[2]-SIGN[1]));
  nodeUniforms();
  gl.enable(gl.SCISSOR_TEST);
  const band=Math.max(6,Math.floor(140000/w)); let y=h; raster.done=false; stageEl.classList.add("painting");
  const step=()=>{ const y0=Math.max(0,y-band); gl.scissor(0,y0,w,y-y0); gl.drawArrays(gl.TRIANGLES,0,3); y=y0;
    if(y>0) raster.raf=requestAnimationFrame(step); else { raster.done=true; stageEl.classList.remove("painting"); window.__rendered=(window.__rendered||0)+1; } };
  raster.raf=requestAnimationFrame(step);
}

/* ───── 겹: 노드 라벨 · 오솔길 · 난쟁이 ───── */
const nodesEl=document.getElementById("nodes"), dw=document.getElementById("dwarf"), svg=document.getElementById("trail");
let at="dawn", sel="dawn", walking=null;
const P3=(x,z,dy)=>[x,groundY(x,z)+(dy||0),z];
function buildOverlay(){
  svg.setAttribute("viewBox","0 0 "+VW.W+" "+VW.H);
  const sp=SPUR.map(([x,z])=>project(P3(x,z,.08)));
  document.getElementById("spur").setAttribute("d","M"+sp.map(p=>p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" L"));
  nodesEl.innerHTML=NODE_ORDER.map(id=>{ const b=byId(id), [x,z]=NXZ[id], c=project([x,nodeY(id),z]);
    const below=project([x,nodeY(id),z+1.5]), right=project([x+1.5,nodeY(id),z]);
    const rx=Math.abs(right[0]-c[0]), ry=Math.max(3,Math.abs(below[1]-c[1]));
    const up=c[1]+rx*.6+46>VW.H; const side=c[0]>VW.W-70?" r":c[0]<70?" l":"";
    const t=b.when?blockTime(b).split(" – ")[0]:"주 1회";
    return '<button class="node'+(up?" up":"")+side+'" data-id="'+id+'" style="left:'+c[0].toFixed(1)+'px;top:'+c[1].toFixed(1)+'px;--rx:'+rx.toFixed(1)+'px;--ry:'+ry.toFixed(1)+'px" aria-label="'+b.name+', '+blockTime(b)+'">'+
      '<span class="ring"></span><span class="tag"><em>'+t+'</em>'+(b.short||SHORT[id])+'<i class="nw">지금</i></span></button>';
  }).join("");
  const s=SIGN, base=project(P3(s[0],s[1],7.6)), e=project(P3(s[0]+1,s[1],7.6));
  const st=document.getElementById("signText"); const k=Math.hypot(e[0]-base[0],e[1]-base[1]);
  st.style.transform="translate("+base[0]+"px,"+base[1]+"px) scale("+(3.5*k/84).toFixed(3)+") translate(-50%,-50%)";
}
function decorate(){
  const now=nowId();
  nodesEl.querySelectorAll(".node").forEach(n=>{ const id=n.dataset.id, b=byId(id);
    n.classList.toggle("off",isOff(b)); n.classList.toggle("now",id===now); n.classList.toggle("sel",id===sel); n.classList.toggle("secret",id==="minimum"); });
  stageEl.dataset.line=state.line;
}
function placeDwarf(x,z,hop,squash){
  const y=groundY(x,z), feet=project([x,y,z]), head=project([x,y+3.4,z]);
  const hpx=Math.max(14,feet[1]-head[1]), w=hpx*.9, lift=hop?(project([x,y+hop,z])[1]-feet[1]):0;
  dw.style.setProperty("--w",w+"px");
  dw.style.transform="translate("+(feet[0]-w/2)+"px,"+(feet[1]-w*1.2)+"px)";
  dw.querySelector(".body").style.transform="translateY("+lift+"px) scale("+(1+(squash||0)*.12)+","+(1-(squash||0)*.14)+")";
}
function slice(a,i,j){ return i<=j?a.slice(i,j+1):a.slice(j,i+1).reverse(); }
const plen=a=>{let s=0;for(let i=1;i<a.length;i++) s+=Math.hypot(a[i][0]-a[i-1][0],a[i][1]-a[i-1][1]);return s;};
function route(a,b){
  const mi=id=>MAIN_NODE_CTRL[id]*SEG, sm=SEG, se=SPUR.length-1;
  if(a===b) return [NXZ[a]];
  if(a!=="minimum"&&b!=="minimum") return slice(ROAD,mi(a),mi(b));
  if(b==="minimum") return route(b,a).slice().reverse();
  const r1=slice(SPUR,sm,0).concat(slice(ROAD,mi("dawn"),mi(b))), r2=slice(SPUR,sm,se).concat(slice(ROAD,mi("closing"),mi(b)));
  return plen(r1)<=plen(r2)?r1:r2;
}
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function walkTo(id){
  if(walking){ cancelAnimationFrame(walking.raf); at=walking.to; walking=null; }
  sel=id; showInfo(); decorate();
  const pts=route(at,id), total=plen(pts);
  if(reduce||total<.5){ at=id; placeDwarf(NXZ[id][0],NXZ[id][1]); return; }
  const cum=[0]; for(let i=1;i<pts.length;i++) cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const dur=Math.max(500,Math.min(3200,total*48)), t0=performance.now(), hopLen=2.6;
  dw.classList.remove("idle"); walking={to:id};
  const step=now=>{
    const k=Math.min(1,(now-t0)/dur), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2, d=e*total;
    let i=1; while(i<cum.length-1&&cum[i]<d) i++;
    const f=(d-cum[i-1])/((cum[i]-cum[i-1])||1), x=pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f, z=pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f;
    const a=project([pts[i-1][0],0,pts[i-1][1]]), b=project([pts[i][0],0,pts[i][1]]); dw.classList.toggle("flip",b[0]<a[0]-.01);
    const ph=(d/hopLen)%1, hop=Math.sin(ph*Math.PI)*.95*(1-Math.pow(1-Math.min(1,k*6),2))*(k>.97?0:1), sq=ph<.12||ph>.88?.8:0;
    placeDwarf(x,z,hop,sq*(k<.98?1:0));
    if(k<1) walking.raf=requestAnimationFrame(step); else { walking=null; at=id; dw.classList.add("idle"); placeDwarf(NXZ[id][0],NXZ[id][1]); }
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
}
nodesEl.addEventListener("click",e=>{ const n=e.target.closest(".node"); if(!n) return; const id=n.dataset.id;
  if(id===sel&&!walking&&at===id) openScroll(id,n); else walkTo(id); });
document.getElementById("enter").addEventListener("click",()=>openScroll(sel,document.querySelector('.node[data-id="'+sel+'"]')));

function refresh(rerender){
  const W=toMin(wakeEl.value)??450, woke=toMin(wokeEl.value)??W, line=computeLine(W,woke), changed=line!==state.line;
  state={W,line};
  const r=document.getElementById("route"); r.dataset.line=line; r.innerHTML=signSVG+"<span>"+routeOf(line)[0]+" · "+routeOf(line)[1]+"</span>";
  buildOverlay(); decorate(); showInfo();
  if(rerender||changed) render();
}
[wakeEl,wokeEl].forEach(el=>el.addEventListener("input",()=>{ store.set("dw.wake",wakeEl.value); store.set("dw.woke",wokeEl.value); refresh(false); }));
function layoutAll(){
  if(walking){ cancelAnimationFrame(walking.raf); at=walking.to; walking=null; dw.classList.add("idle"); }
  const W=stageEl.clientWidth||window.innerWidth, land=W>=900;
  const H=land?Math.round(Math.min(Math.max(window.innerHeight,620),W*.72)):Math.round(Math.min(W*1.75,Math.max(window.innerHeight*.92,620)));
  stageEl.style.height=H+"px"; VW={W,H,land}; setCamera();
  refresh(true); placeDwarf(NXZ[at][0],NXZ[at][1]);
}
(function init(){
  const W=toMin(wakeEl.value)??450, woke=toMin(wokeEl.value)??W; state={W,line:decideLine(woke,W)};
  setDay(dayIdx);
  document.getElementById("days").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; setDay(+b.dataset.d); if(walking){ cancelAnimationFrame(walking.raf); at=walking.to; walking=null; dw.classList.add("idle"); } refresh(true); placeDwarf(NXZ[at][0],NXZ[at][1]); });
  const h=location.hash.slice(1), n=nowId(); at=sel=(h&&NXZ[h])?h:(n||"dawn");
  initGL(); layoutAll();
  let to,lastW=VW.W; window.addEventListener("resize",()=>{ clearTimeout(to); to=setTimeout(()=>{ if(Math.abs(stageEl.clientWidth-lastW)>2){ lastW=stageEl.clientWidth; layoutAll(); } },180); });
  setInterval(()=>{ decorate(); if(!walking) showInfo(); },60000);
})();

/* ───── 비눗방울 ───── */
(function(){
  const box=document.getElementById("bubbles"); let h="";
  const rnd=(a,b)=>a+Math.random()*(b-a);
  for(let i=0;i<9;i++){ const s=rnd(12,54).toFixed(0);
    h+='<span class="bubble" style="left:'+rnd(2,96).toFixed(1)+'%;width:'+s+'px;height:'+s+'px;--d:'+rnd(28,50).toFixed(1)+'s;--delay:-'+rnd(0,40).toFixed(1)+'s"></span>'; }
  box.innerHTML=h;
})();
