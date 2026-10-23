// 렌더러와 같은 높이 생성 코드를 실행하고, 경로/높이 계약을 검증한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/map.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(`const NODE_ORDER=${JSON.stringify(['dawn','morning','lunch','afternoon','evening','hobby','closing','camp','sunday','minimum'])};
const MAIN=NODE_ORDER.slice(0,9);
${source.slice(source.indexOf('const fract='), source.indexOf('/* Scene resources'))}
globalThis.terrain={DOM,HM,NXZ,NODE_HEIGHT,groundY,ROAD,SIDE,SPUR,roadHalf};`, context);
const { DOM, HM, NXZ, NODE_HEIGHT, groundY, ROAD, SIDE, SPUR } = context.terrain;
const sceneSource=fs.readFileSync(require('node:path').join(__dirname,'../src/map-scenes.js'),'utf8');
vm.runInContext(sceneSource+';globalThis.scenes=MAP_SCENES;',context);
test('하루 지형은 완만하고 주간 지형 자료를 바꾸지 않는다',()=>{
  const h=context.scenes.dayHeight;
  for(let x=-40;x<50;x+=2)for(let z=-40;z<50;z+=2){assert.ok(Math.abs(h(x,z))<=1.35);assert.ok(Math.hypot((h(x+.1,z)-h(x,z))/.1,(h(x,z+.1)-h(x,z))/.1)<.06);}
  assert.equal(groundY(...NXZ.sunday),35);
});
test('하루 숲은 카메라와 소년 사이를 가리는 수풀만 제외한다',()=>{
  const clear=context.scenes.treeClear,ro=[0,2,10],boy=[0,1.8,0],ground=()=>0;
  assert.equal(clear([0,4,2],ro,boy,ground),false,'앞쪽 수풀이 몸을 가린다');
  assert.equal(clear([25,4,2],ro,boy,ground),true,'멀리 옆의 숲은 보존한다');
});
test('주간 6구간이 끊김 없이 큰길 전체를 덮는다',()=>{
  const sections=context.scenes.sections(ROAD);
  assert.equal(sections.length,6);assert.deepEqual(sections[0].points[0],ROAD[0]);
  for(let i=1;i<6;i++)assert.deepEqual(sections[i-1].points[24],sections[i].points[0]);
  assert.deepEqual(sections[5].points[24],ROAD[ROAD.length-1]);
  const heights=sections.map(s=>groundY(...s.center));assert.ok(heights.every((h,i)=>!i||h>heights[i-1]));
});

test('맵 슬롯 높이와 원판 아래 평탄면, 정상 최고점', () => {
  for (const [id, [x, z]] of Object.entries(NXZ)) {
    assert.ok(Math.abs(groundY(x,z)-NODE_HEIGHT[id]) < 1e-5, id);
    for (let i=0; i<16; i++) {
      const a=i*Math.PI/8;
      assert.ok(Math.abs(groundY(x+Math.cos(a)*1.2,z+Math.sin(a)*1.2)-NODE_HEIGHT[id]) < .015, id+' flat');
    }
  }
  assert.ok(HM.some(h=>h===35));
  assert.ok(HM.every(h=>h<=35 && h>=-18));
});

test('세 길 전체가 오르막이며 쌍선형 셀 최대 기울기는 2 이하', () => {
  for (const path of [ROAD,SIDE,SPUR]) for (let i=1;i<path.length;i++) {
    assert.ok(groundY(...path[i]) >= groundY(...path[i-1])-1e-5, 'descending segment '+i);
  }
  let max=0;
  for(let j=0;j<DOM.nz-1;j++)for(let i=0;i<DOM.nx-1;i++){
    const k=j*DOM.nx+i,a=HM[k],b=HM[k+1],c=HM[k+DOM.nx],d=HM[k+DOM.nx+1];
    for(const [dx,dz] of [[b-a,c-a],[b-a,d-b],[d-c,c-a],[d-c,d-b]])max=Math.max(max,Math.hypot(dx,dz)/DOM.res);
  }
  assert.ok(max<=2, 'maximum slope '+max);
});

test('높이 RG16 인코딩 오차와 원래 텍스처 크기 계약', () => {
  assert.equal(DOM.nx,601);assert.equal(DOM.nz,526);
  let maxError=0;
  for(const h of HM){const bits=Math.round((h+60)/100*65535),decoded=bits/65535*100-60;maxError=Math.max(maxError,Math.abs(h-decoded));}
  assert.ok(maxError<=100/65535/2+1e-10, 'height error '+maxError);
});

test('바위는 길 가장자리 1.5, 노드 중심 4 밖에만 배치', () => {
  vm.runInContext(source.slice(source.indexOf('const TREES='),source.indexOf('const TENT='))+'globalThis.rocks=ROCKS;', context);
  assert.ok(context.rocks.length<=6);
  for(const [x,z] of context.rocks){
    for(const [nx,nz] of Object.values(NXZ))assert.ok(Math.hypot(x-nx,z-nz)>=4);
    for(const [path,half] of [[ROAD,context.terrain.roadHalf],[SIDE,()=>.85],[SPUR,()=>.70]]){
      for(let i=1;i<path.length;i++){
        const [ax,az]=path[i-1],[bx,bz]=path[i],dx=bx-ax,dz=bz-az;
        const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
        assert.ok(Math.hypot(x-ax-dx*t,z-az-dz*t)-half(i-1)>=1.5);
      }
    }
  }
});
