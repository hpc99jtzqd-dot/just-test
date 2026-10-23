/* Rendering-only scene descriptors. No dates, records or progression rules. */
const MAP_SCENES = {
  dayHeight(x,z){return .8*Math.sin(x*.045)+.55*Math.cos(z*.06);},
  dayTrees:[[-38,31,3.8],[-19,48,3.2],[-18,23,3.6],[4,49,3.7],[14,21,3.3],[43,30,3.9],[-9,1,3.5],[29,-18,3.8],[-8,29,2.6],[23,43,3.0],[36,9,3.1],[7,-16,3.3]],
  treeClear(tree,ro,hero,ground){
    const [x,z,s]=tree,g=ground(x,z),v=hero.map((h,i)=>h-ro[i]),len=v.reduce((sum,c)=>sum+c*c,0)||1;
    // Conservative crown/bush bounds protect the complete cap-to-feet silhouette.
    return [[-.65,3.15,.15,1.75],[.65,4.05,.1,1.5],[.7,2.95,-.6,1.4],[.5,.55,-.4,1.05]].every(([cx,cy,cz,r])=>{
      const c=[x+cx*s,g+cy*s,z+cz*s],d=c.map((n,i)=>n-ro[i]),t=Math.max(0,Math.min(1,d.reduce((a,n,i)=>a+n*v[i],0)/len));
      return Math.hypot(...d.map((n,i)=>n-v[i]*t))>r*s+2.;
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
    const placed=[],w=width<600?112:124,h=58;
    return points.map(p=>{
      let best=null;
      for(let y=82;y<height-105;y+=64)for(let x=8;x<=width-w-8;x+=width<600?120:132){
        if(width>=900&&x<550&&y<355)continue;
        if(placed.some(b=>x<b.x+w+6&&x+w+6>b.x&&y<b.y+h+6&&y+h+6>b.y))continue;
        const cost=(x+w/2-p[0])**2+(y+h/2-p[1])**2;
        if(!best||cost<best.cost)best={x,y,w,h,cost};
      }
      best=best||{x:8,y:82+placed.length*64,w,h};placed.push(best);return best;
    });
  },
  // Equal arc-length sections; terrain construction anchors remain untouched.
  sections(path,count=6){
    const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
    const at=t=>{const d=t*lengths[lengths.length-1];let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;const f=(d-lengths[i-1])/(lengths[i]-lengths[i-1]);return path[i].map((v,k)=>path[i-1][k]+(v-path[i-1][k])*f);};
    return Array.from({length:count},(_,i)=>({center:at((i+.5)/count),points:Array.from({length:25},(_,j)=>at((i+j/24)/count))}));
  }
};
