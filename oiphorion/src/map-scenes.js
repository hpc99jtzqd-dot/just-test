/* Rendering-only scene descriptors. No dates, records or progression rules. */
const MAP_SCENES = {
  dayHeight(x,z){return .8*Math.sin(x*.045)+.55*Math.cos(z*.06);},
  // 앞의 dayConifers 그루는 층층 침엽수(사진 6), 나머지는 줄기가 보이는 활엽수(사진 7).
  // 침엽수는 큰길 가장자리 4~6 거리에 붙여 시점에서 길 양옆이 닫히게 한다. 셰이더 배열 한도 16그루.
  // 어느 장소의 카메라에서도 다음 장소 표지까지의 시선을 수관이 막지 않게 놓는다(1·2·4·6번은 그래서 옮겼다).
  dayConifers:7,
  // 오른쪽 들판의 붉은 지붕 외딴집 [x, z, 돌린 각도]. 오전 장면 화면 오른쪽 지평선 근처(거리 약 77), 길·나무에서 40 넘게 떨어진 빈 평지.
  house:[56,78,-1.55],
  // 하늘 끝까지 닿는 거대한 나무 [x, z]. 취미 장면 화면 왼쪽 평원(거리 약 77), 길·나무에서 45 넘게 떨어진 곳.
  giant:[-62,-76],
  dayTrees:[[-16,43,3.7],[5,44.5,3.9],[31.9,34.6,3.6],[46,22,3.8],[8,13.1,3.3],[29,-14,3.5],[-4.5,-13.9,3.6],
            [-38,31,3.8],[-18,23,3.6],[14,21,3.3],[43,31,3.9],[-9,1,3.5],[23,43,3.0],[36,9,3.1],[7,-17,3.3],[-8,29,2.6]],
  // 카메라에서 소년(발·가슴·모자 세 점)까지의 시선을 수관이 막으면 false. hero는 가슴 높이 점이다.
  // 침엽수는 아랫단이 넓은 원뿔이라 활엽수와 다른 구 묶음으로 잰다.
  treeClear(tree,ro,hero,ground,conifer){
    const [x,z,s]=tree,g=ground(x,z);
    // 활엽수는 나무마다 돌아가 있으므로(셰이더 leafyT) 돌림과 무관한 축 위의 구로 잰다
    const crowns=conifer?[[0,1.7,0,1.8],[0,3.4,0,1.4],[0,4.9,0,1.0]]:[[0,3.25,0,2.15],[0,4.25,0,1.5]];
    return [-1.5,0,1.8].every(dy=>{
      const v=[hero[0]-ro[0],hero[1]+dy-ro[1],hero[2]-ro[2]],len=v.reduce((sum,c)=>sum+c*c,0)||1;
      return crowns.every(([cx,cy,cz,r])=>{
        const c=[x+cx*s,g+cy*s,z+cz*s],d=c.map((n,i)=>n-ro[i]),t=Math.max(0,Math.min(1,d.reduce((a,n,i)=>a+n*v[i],0)/len));
        return Math.hypot(...d.map((n,i)=>n-v[i]*t))>r*s+2.;
      });
    });
  },
  camera(id,nodes,ground,aspect){
    const zone=['dawn','morning','minimum'].includes(id)?0:['lunch','afternoon','evening'].includes(id)?1:2;
    const [x,z]=nodes[id];
    const next={dawn:'morning',morning:'lunch',lunch:'afternoon',afternoon:'evening',evening:'hobby',hobby:'closing',closing:'camp',camp:'sunday',minimum:'closing',sunday:'sunday'}[id];
    const q=nodes[next],dx=q[0]-x,dz=q[1]-z,len=Math.hypot(dx,dz)||1;
    const vx=id==='sunday'?0:dx/len,vz=id==='sunday'?-1:dz/len;
    // Each arrival has a stable viewpoint. Never reuse another place's camera
    // merely because both places happen to belong to the same narrative zone.
    const ro=[x-vx*17+vz*5,ground(x,z)+5.6,z-vz*17-vx*5],ta=[x+vx*15,ground(x,z)+2.7,z+vz*15];
    return {ro,ta,fl:aspect<.85?1.2:1.65,zone};
  },
  labels(points,width,height){
    // 폰은 두 줄 카드, 넓은 화면은 한 줄 알약(길·정상을 덜 덮는다).
    const phone=width<600,placed=[],w=phone?112:160,h=phone?58:32;
    return points.map(p=>{
      let best=null;
      for(let y=82;y<height-105;y+=h+6)for(let x=8;x<=width-w-8;x+=phone?120:w+8){
        if(width>=900&&x<550&&y<355)continue;
        if(width>=900&&x+w>width-330)continue;  // 데스크톱 오른쪽 기록 칸
        if(placed.some(b=>x<b.x+w+6&&x+w+6>b.x&&y<b.y+h+6&&y+h+6>b.y))continue;
        if(points.some(q=>q[0]>x-20&&q[0]<x+w+20&&q[1]>y-38&&q[1]<y+h+10))continue;  // 기준점(소년·정상 깃발)은 덮지 않는다
        const cost=(x+w/2-p[0])**2+(y+h/2-p[1])**2;
        if(!best||cost<best.cost)best={x,y,w,h,cost};
      }
      best=best||{x:8,y:82+placed.length*(h+6),w,h};placed.push(best);return best;
    });
  },
  // Equal arc-length sections; terrain construction anchors remain untouched.
  sections(path,count=6){
    const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
    const at=t=>{const d=t*lengths[lengths.length-1];let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;const f=(d-lengths[i-1])/(lengths[i]-lengths[i-1]);return path[i].map((v,k)=>path[i-1][k]+(v-path[i-1][k])*f);};
    return Array.from({length:count},(_,i)=>({center:at((i+.5)/count),points:Array.from({length:25},(_,j)=>at((i+j/24)/count))}));
  }
};
