'use strict';
/* ============================================================
   5분 도시 — stars.js
   별자리 잇기 (밤 전용)
   하늘에 밝은 별 세트가 뜨고, 순서 상관없이 인접 별을 이어
   전부 연결하면 별자리 완성 → 이름이 붙고 목록에 소장.
   sky 모드에서 화면(캔버스) 클릭/탭으로 별을 선택.
   ============================================================ */

/* 별자리 정의: 정규화 좌표(0..1)와 이름 */
const CONSTELLATIONS = [
  {name:'작은 국자', pts:[[.20,.30],[.28,.34],[.36,.32],[.44,.38],[.44,.50],[.36,.56]]},
  {name:'고양이',   pts:[[.55,.28],[.60,.22],[.66,.28],[.63,.40],[.55,.44],[.68,.46]]},
  {name:'돛단배',   pts:[[.30,.55],[.42,.40],[.42,.62],[.54,.62]]},
  {name:'세 자매',  pts:[[.62,.30],[.70,.36],[.78,.30]]},
  {name:'긴 강',    pts:[[.18,.25],[.28,.40],[.40,.34],[.52,.48],[.64,.42]]},
  {name:'열쇠',     pts:[[.48,.24],[.48,.40],[.42,.46],[.54,.46]]},
];

let sky = {
  active:false,        // sky 모드에서 별자리가 배치됐는가
  con:null,            // 현재 별자리
  nodes:[],            // {x,y (화면좌표), linked:bool}
  edges:[],            // [i,j] 이어진 선
  need:0,              // 필요한 연결 수
  cur:-1,              // 마지막으로 찍은 노드
  doneFlash:0,
};

function skyPickConstellation(){
  // 아직 완성 안 한 것 우선
  const remain = CONSTELLATIONS.filter(c=>!GS.constellations.includes(c.name));
  const src = remain.length ? remain : CONSTELLATIONS;
  const c = src[(Math.random()*src.length)|0];
  const region = {x:40, y:30, w:W-80, h:HORIZON-90};
  sky.con = c;
  sky.nodes = c.pts.map(p=>({
    x: region.x + p[0]*region.w,
    y: region.y + p[1]*region.h,
    linked:false,
  }));
  // 목표 간선: 점 순서대로 연결(정의 순서가 곧 정답 경로)
  sky.need = c.pts.length-1;
  sky.edges = [];
  sky.cur = -1;
  sky.active = true;
}

function skyEnter(){
  if(!GS.pal || GS.pal.night<.5){
    toast('별은 밤에만 보여요'); return false;
  }
  GS.mode='sky';
  skyPickConstellation();
  toast('별을 순서대로 이어보세요\n(빈 곳을 누르면 취소)');
  return true;
}
function skyExit(){ GS.mode='roam'; sky.active=false; }

/* 캔버스 클릭 처리 (main에서 호출). 반환 true=소비함 */
function skyClick(px, py){
  if(GS.mode!=='sky') return false;
  const nextNeeded = sky.edges.length+1;
  const want = sky.cur<0 ? 0 : nextNeeded;   // 기대하는 다음 노드
  // 기대 노드가 반경 안이면 그것을 우선 선택 (근접 노드 오인 방지)
  let bi=-1, bd=14;
  if(sky.nodes[want]){
    const n=sky.nodes[want];
    if(Math.hypot(px-n.x,py-n.y)<14){ bi=want; }
  }
  if(bi<0){
    sky.nodes.forEach((n,i)=>{ const d=Math.hypot(px-n.x,py-n.y);
      if(d<bd){ bd=d; bi=i; } });
  }
  if(bi<0){ skyExit(); return true; }   // 빈 곳 → 취소

  if(sky.cur<0){
    if(bi!==0){ sfxBlip(200); return true; }
    sky.cur=0; sky.nodes[0].linked=true; sfxBlip(680); return true;
  }
  if(bi===nextNeeded){
    sky.edges.push([sky.cur,bi]);
    sky.nodes[bi].linked=true; sky.cur=bi;
    sfxBlip(680+sky.edges.length*40);
    if(sky.edges.length>=sky.need){
      if(!GS.constellations.includes(sky.con.name)){
        GS.constellations.push(sky.con.name);
      }
      sky.doneFlash=1.2;
      toast('별자리 완성: '+sky.con.name+' ✦');
      sfxBlip(1200);
      setTimeout(()=>{ if(GS.mode==='sky') skyExit(); }, 1300);
    }
  } else {
    sfxBlip(200);   // 틀림
  }
  return true;
}

function updateDrawSky(ctx, now, dt){
  if(GS.mode!=='sky') return;
  // 배경을 살짝 어둡게 (집중)
  ctx.fillStyle='rgba(4,6,20,.45)'; ctx.fillRect(0,0,W,H);

  // 이미 이어진 선
  ctx.strokeStyle='rgba(255,240,180,.8)'; ctx.lineWidth=1;
  ctx.beginPath();
  for(const [a,b] of sky.edges){
    ctx.moveTo(sky.nodes[a].x, sky.nodes[a].y);
    ctx.lineTo(sky.nodes[b].x, sky.nodes[b].y);
  }
  ctx.stroke();

  // 다음에 이어야 할 별 힌트(점선처럼 깜빡)
  const nextNeeded = sky.edges.length+1;
  if(sky.cur>=0 && nextNeeded<sky.nodes.length && (now/400|0)%2===0){
    const a=sky.nodes[sky.cur], b=sky.nodes[nextNeeded];
    ctx.strokeStyle='rgba(255,240,180,.25)';
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  }

  // 별 노드
  sky.nodes.forEach((n,i)=>{
    const tw=.6+.4*Math.sin(now/300+i);
    const isNext = i===nextNeeded && sky.cur>=0;
    const isStart = i===0 && sky.cur<0;
    if(n.linked){
      ctx.fillStyle='#fff4c0';
      ctx.fillRect((n.x-1)|0,(n.y-1)|0,3,3);
    } else {
      ctx.fillStyle=`rgba(255,255,255,${(isNext||isStart?.9:.55)*tw})`;
      ctx.fillRect(n.x|0,n.y|0,2,2);
    }
    if(isNext||isStart){
      ctx.strokeStyle=`rgba(255,240,180,${.4+.3*Math.sin(now/200)})`;
      ctx.strokeRect((n.x-3)|0,(n.y-3)|0,7,7);
    }
  });

  // 안내
  ctx.fillStyle='rgba(255,255,255,.7)';
  // (텍스트는 HUD 토스트로 대체, 여기선 생략)

  if(sky.doneFlash>0){
    sky.doneFlash-=dt;
    ctx.fillStyle=`rgba(255,240,180,${sky.doneFlash*0.3})`;
    ctx.fillRect(0,0,W,H);
  }
}
