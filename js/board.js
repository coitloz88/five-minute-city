'use strict';
/* ============================================================
   5분 도시 — board.js
   거리 게시판: NPC 랜덤 쪽지 + 플레이어가 남긴 쪽지
   플레이어 쪽지는 localStorage에 저장됨 (STORE_KEY)
   ============================================================ */

/* NPC 쪽지 풀. when: 'any'|'day'|'night'|'dusk', rain:true=비올때만 */
const NPC_NOTES = [
  {t:'오늘도 야근… 그래도 이 동네 밤하늘은 참 예쁘다', when:'night'},
  {t:'옥상 고양이 봤어? 요즘 매일 나온다', when:'night'},
  {t:'3층 불 켜진 집, 누가 사는지 늘 궁금함', when:'night'},
  {t:'막차 놓쳤다. 걸어서 갈래', when:'night'},
  {t:'별똥별 세 번 봤다. 소원 세 개 저장 완료', when:'night'},
  {t:'붕어빵 아저씨 오늘 문 여셨더라 🐟', when:'night'},
  {t:'전철 지나가는 소리, 이상하게 위로가 됨', when:'night'},
  {t:'좋은 아침! 오늘 하늘 색 미쳤다', when:'day'},
  {t:'빵집 갓 구운 냄새… 이 골목 최고', when:'day'},
  {t:'벤치에 앉아서 한숨 돌리는 중', when:'day'},
  {t:'비둘기가 내 김밥을 노리고 있다', when:'day'},
  {t:'점심 추천 받습니다. 진지함', when:'day'},
  {t:'노을이 건물 사이로 딱 떨어질 때가 제일 좋아', when:'dusk'},
  {t:'퇴근길. 하늘이 주황색이다', when:'dusk'},
  {t:'가로등 켜지는 순간을 좋아합니다', when:'dusk'},
  {t:'우산 챙기세요. 곧 온대요', when:'any'},
  {t:'빗소리 들으면서 커피 한 잔. 완벽', when:'rain'},
  {t:'비 오는 날 이 거리, 반사되는 불빛이 예쁨', when:'rain'},
  {t:'젖은 골목 냄새 좋아하는 사람 나만은 아니겠지', when:'rain'},
  {t:'이 게시판, 누가 관리하는 걸까', when:'any'},
  {t:'여기 처음 온 사람? 환영해요', when:'any'},
  {t:'분실: 파란 목도리. 보신 분 연락 주세요', when:'any'},
  {t:'구인: 같이 밤 산책할 사람', when:'night'},
  {t:'오늘 하루도 수고했어, 낯선 사람', when:'any'},
];

let boardNotes = [];        // 현재 보드에 꽂힌 쪽지 (섞인 상태)
let playerNotes = [];       // 플레이어가 남긴 쪽지 [{t, ts}]
let boardIndex = 0;         // 읽기 오버레이에서 넘긴 위치
let notePinTimer = 20;      // 새 NPC 쪽지가 꽂히는 주기
const seenNotes = new Set();

function loadPlayerNotes(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    playerNotes = raw ? JSON.parse(raw) : [];
  }catch(e){ playerNotes = []; }
}
function savePlayerNotes(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(playerNotes)); }
  catch(e){ /* 시크릿 모드 등: 무시, 이번 세션만 유지 */ }
}
function addPlayerNote(text){
  const t = text.trim().slice(0,60);
  if(!t) return;
  playerNotes.unshift({t, ts:Date.now()});
  playerNotes = playerNotes.slice(0,20);   // 최근 20개만
  savePlayerNotes();
  rebuildBoard();
}

function noteFits(n, t, night, rain){
  if(n.when==='rain') return rain;
  if(rain && Math.random()<.25 && n.when==='rain') return true;
  if(n.when==='any') return true;
  if(n.when==='night') return night>.55;
  if(n.when==='day')   return night<.25;
  if(n.when==='dusk')  return t>=.4 && t<.65;
  return true;
}

function rebuildBoard(){
  const t=GS.t, night=GS.pal?GS.pal.night:0, rain=GS.rain;
  const pool = NPC_NOTES.filter(n=>noteFits(n,t,night,rain));
  // NPC 6~8개 랜덤 + 플레이어 쪽지 전부, 살짝 섞기
  const pick = pool.slice().sort(()=>Math.random()-.5).slice(0, 7)
                 .map(n=>({t:n.t, mine:false}));
  const mine = playerNotes.map(p=>({t:p.t, mine:true}));
  boardNotes = mine.concat(pick).sort(()=>Math.random()-.5);
  if(boardNotes.length===0) boardNotes=[{t:'아직 아무 쪽지도 없어요', mine:false}];
}

/* 새 NPC 쪽지가 가끔 꽂힘 */
function updateBoard(dt){
  notePinTimer-=dt*GS.timeScale;
  if(notePinTimer<0){
    notePinTimer = 25+Math.random()*25;
    if(GS.mode==='roam') rebuildBoard();
  }
}

/* ---------- 게시판 구조물 그리기 ---------- */
function drawBoard(ctx, pal, now){
  const sx = worldToScreen(LM.board)|0;
  if(sx<-40||sx>W+40) return;
  const gy = SIDEWALK_Y;
  // 기둥
  ctx.fillStyle='rgba(60,42,28,.95)';
  ctx.fillRect(sx-14,gy-2,3,2); ctx.fillRect(sx+12,gy-2,3,2);
  ctx.fillRect(sx-13,gy-30,2,28); ctx.fillRect(sx+13,gy-30,2,28);
  // 판
  ctx.fillStyle='#6b4a2f';
  ctx.fillRect(sx-18,gy-46,36,18);
  ctx.fillStyle='#4a3320';
  ctx.fillRect(sx-18,gy-46,36,2);
  // 지붕
  ctx.fillStyle='#3a2a1a';
  ctx.fillRect(sx-20,gy-50,40,4);
  // 코르크 질감 (점)
  ctx.fillStyle='rgba(0,0,0,.12)';
  for(let i=0;i<10;i++)
    ctx.fillRect(sx-16+((i*37)%32), gy-44+((i*23)%14), 1,1);
  // 쪽지들 (미리보기 색종이)
  const cols=['#f4e9c8','#ffd9d0','#d9ecf4','#e6f0d6'];
  let k=0;
  for(let r=0;r<2;r++)for(let c=0;c<4;c++){
    const nn = boardNotes[k];
    ctx.fillStyle = nn && nn.mine ? '#ffd27f' : cols[k%cols.length];
    ctx.fillRect(sx-15+c*8, gy-43+r*8, 6,6);
    ctx.fillStyle='rgba(0,0,0,.25)';
    ctx.fillRect(sx-13+c*8, gy-44+r*8, 1,1);  // 핀
    k++;
  }
  // 밤엔 위에 작은 등
  if(pal.night>.45){
    ctx.fillStyle='#ffe8a8'; ctx.fillRect(sx-1,gy-53,2,2);
    const g=ctx.createRadialGradient(sx,gy-52,1,sx,gy-52,16);
    g.addColorStop(0,'rgba(255,220,140,.25)'); g.addColorStop(1,'rgba(255,220,140,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,gy-52,16,0,7); ctx.fill();
  }
}
