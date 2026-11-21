/* =====================================================================
   v10 — Vantis Academy
   Leerpaden, lessen met interactieve onderdelen, opdrachten in de app,
   grafiekuitdaging met echte koersen, rekenhulpen, begrippen, XP,
   niveaus en certificaten. Vervangt de oude pagina "Leren & badges".
   ===================================================================== */

/* oude lessen opnemen (voortgang blijft behouden: zelfde id's) */
const AC_OLDW={koers:'candle',indic:'rsi'};
for(const L of LESSONS){if(!AC_LESSONS[L.id])AC_LESSONS[L.id]={t:L.t,min:L.min,go:L.go,w:AC_OLDW[L.id],s:[{p:L.p}],q:L.q.map(q=>[q[0],q[1],q[2],q[3]||''])}}
for(const p of AC_PATHS)for(const id of p.L){const L=AC_LESSONS[id];if(L&&!LESSONS.find(x=>x.id===id))LESSONS.push({id,t:L.t,min:L.min,go:L.go,p:[],q:L.q})}
const AC_ORDER=AC_PATHS.flatMap(p=>p.L).filter(id=>AC_LESSONS[id]);
const aci=n=>ico(IC[n]?n:'star');

const AC={
  tab:'paden',ans:{},checked:null,hist:{},round:null,term:'',
  LV:[[0,'Nieuwkomer'],[100,'Starter'],[250,'Leerling'],[450,'Trader in opleiding'],[750,'Trader'],[1100,'Gevorderd trader'],[1600,'Expert']],
  st(){const a=S.settings.acad||{};a.v=a.v||{};a.chart=a.chart||{n:0,ok:0,streak:0,best:0};a.cert=a.cert||{};S.settings.acad=a;return a},
  vis(p){return !!this.st().v[p]},
  visit(p){const a=this.st();if(p&&!a.v[p]){a.v[p]=1;saveSettings()}},
  done(){return learned()},
  pathOf(id){return AC_PATHS.find(p=>p.L.includes(id))},
  pathDone(p){const d=this.done();return p.L.filter(id=>d[id]).length},
  xp(){const d=this.done();let x=0;for(const k in d)if(AC_LESSONS[k])x+=20+5*(d[k].score||0);
    x+=AC_TASKS.filter(t=>this.task(t)).length*15;const c=this.st().chart;return x+(c.ok||0)*3+(c.n||0)},
  level(){const x=this.xp();let i=0;for(let j=0;j<this.LV.length;j++)if(x>=this.LV[j][0])i=j;const cur=this.LV[i],nx=this.LV[i+1];
    return {x,i:i+1,name:cur[1],next:nx?nx[1]:null,need:nx?nx[0]-x:0,pct:nx?(x-cur[0])/(nx[0]-cur[0])*100:100}},
  next(){const d=this.done();return AC_ORDER.find(id=>!d[id])||null},
  task(t){try{return !!t.test()}catch(e){return false}},
  toastXP(n,title){UI.toast({kind:'success',title,body:`+${n} XP · ${this.level().name}`})}
};

const AC_TASKS=[
  {id:'watch',t:'Zet vijf assets op je watchlist',d:'Volg wat je interesseert. Je krijgt er meldingen over en ziet ze op je overzicht.',go:'#markten',test:()=>S.watch.length>=5},
  {id:'alert',t:'Stel je eerste koersalert in',d:'Laat Vantis je waarschuwen als een koers een grens passeert.',go:'#meldingen',test:()=>(PA.list||[]).length>0},
  {id:'brief',t:'Lees de ochtendbriefing',d:'Elke ochtend om 08:00 de markt in een paar minuten.',go:'#briefing',test:()=>AC.vis('briefing')},
  {id:'why',t:'Zoek uit waarom de markt beweegt',d:'Bekijk welke oorzaken Vantis heeft gecontroleerd.',go:'#waarom',test:()=>AC.vis('waarom')},
  {id:'radar',t:'Zoek het volgende rentebesluit op',d:'De Event Radar toont macro-gebeurtenissen met aftelklok.',go:'#radar',test:()=>AC.vis('radar')},
  {id:'compare',t:'Vergelijk twee assets',d:'Zet rendement, risico en correlatie naast elkaar.',go:'#vergelijk',test:()=>AC.vis('vergelijk')},
  {id:'trade',t:'Plaats je eerste order',d:'Koop of verkoop in Handelen; tot de lancering met oefengeld.',go:'#handel',test:()=>((PT.P||{}).trades||[]).length>0},
  {id:'stop',t:'Zet een stop-loss of winstdoel',d:'Bescherm je positie met een vooraf bepaalde uitstap.',go:'#handel',test:()=>Badges.test('stop_loss')},
  {id:'note',t:'Schrijf een notitie bij een order',d:'Begin je handelsdagboek: waarom koop of verkoop je?',go:'#handel',test:()=>((PT.P||{}).trades||[]).some(t=>t.note)},
  {id:'dca',t:'Start een plan voor periodiek kopen',d:'Koop automatisch elke dag, week of maand.',go:'#handel',test:()=>((PT.P||{}).dca||[]).length>0},
  {id:'scan',t:'Bewaar een eigen scanner',d:'Maak je eigen filter in de Opportunity Scanner.',go:'#scanner',test:()=>(S.settings.screens||[]).length>0},
  {id:'calc',t:'Bereken een positiegrootte',d:'Gebruik de rekenhulp bij Rekenhulpen.',go:'#leren-tools',test:()=>!!AC.st().calc},
  {id:'chart',t:'Speel tien rondes van de grafiekuitdaging',d:'Lees echte grafieken en test je inschatting.',go:'#leren-grafiek',test:()=>(AC.st().chart.n||0)>=10}
];

/* paginabezoeken bijhouden voor de opdrachten */
{const or=UI.route;UI.route=function(){const r=or.apply(this,arguments);try{AC.visit(this.cur)}catch(e){}return r}}

/* ---------- rekenwerk ---------- */
const acSMA=(c,n)=>c.map((_,i)=>i<n-1?null:c.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n);
const acRSI=(c,n=14)=>{const out=c.map(()=>null);if(c.length<=n)return out;let g=0,l=0;for(let i=1;i<=n;i++){const d=c[i]-c[i-1];if(d>0)g+=d;else l-=d}g/=n;l/=n;out[n]=l===0?100:100-100/(1+g/l);
  for(let i=n+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n;out[i]=l===0?100:100-100/(1+g/l)}return out};
const acATR=(d,n=14)=>{const tr=d.map((x,i)=>i?Math.max(x.h-x.l,Math.abs(x.h-d[i-1].c),Math.abs(x.l-d[i-1].c)):x.h-x.l);return tr.slice(-n).reduce((a,b)=>a+b,0)/Math.min(n,tr.length)};
async function acHist(sym,days=400){if(AC.hist[sym])return AC.hist[sym];let d=null;
  try{const raw=await Promise.race([bv(`/${sym}-EUR/candles?interval=1d&limit=${days}`),new Promise((_,rj)=>setTimeout(()=>rj(new Error('timeout')),8000))]);d=parseC(raw).filter(c=>c.t+DAY<=Date.now())}catch(e){}
  if(!d||d.length<30){const a=S.crypto.get(sym);d=a&&a.cd?a.cd:null}
  if(d&&d.length)AC.hist[sym]=d;return d}

/* lichte SVG-grafiek: prijslijn, gemiddelden, niveaus, vervolg en RSI-paneel */
function acChart(o){const W=640,H=o.rsi?260:210,ph=o.rsi?176:H-16,c=o.c,all=c.concat(o.after||[]);const n=all.length;
  const vals=all.concat(...(o.lines||[]).map(l=>l.d.filter(v=>v!=null)),o.levels||[]);let lo=Math.min(...vals),hi=Math.max(...vals);const pad=(hi-lo)*.08||1;lo-=pad;hi+=pad;
  const X=i=>8+i/(n-1)*(W-70),Y=v=>8+(1-(v-lo)/(hi-lo))*(ph-16);
  const path=(arr,off=0)=>arr.map((v,i)=>v==null?null:[X(i+off),Y(v)]).filter(Boolean).map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('');
  let s=`<svg class="acsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'Koersgrafiek')}">`;
  for(let k=0;k<=3;k++){const v=lo+(hi-lo)*k/3;s+=`<line class="acgrid" x1="8" x2="${W-62}" y1="${Y(v)}" y2="${Y(v)}"/><text class="acax" x="${W-56}" y="${Y(v)+4}">${esc(o.fmt?o.fmt(v):nlN(v,0))}</text>`}
  for(const lv of o.levels||[])s+=`<line class="aclev" x1="8" x2="${W-62}" y1="${Y(lv)}" y2="${Y(lv)}"/>`;
  for(const l of o.lines||[])s+=`<path class="${l.cls}" d="${path(l.d)}"/>`;
  s+=`<path class="acprice" d="${path(c)}"/>`;
  if(o.after&&o.after.length){s+=`<line class="accut" x1="${X(c.length-1)}" x2="${X(c.length-1)}" y1="6" y2="${ph-6}"/><path class="acafter ${o.after[o.after.length-1]>=c[c.length-1]?'up':'down'}" d="${path([c[c.length-1]].concat(o.after),c.length-1)}"/>`}
  if(o.rsi){const r=o.rsi,RY=v=>ph+8+(1-v/100)*(H-ph-14);s+=`<line class="acgrid" x1="8" x2="${W-62}" y1="${RY(70)}" y2="${RY(70)}"/><line class="acgrid" x1="8" x2="${W-62}" y1="${RY(30)}" y2="${RY(30)}"/><text class="acax" x="${W-56}" y="${RY(70)+4}">70</text><text class="acax" x="${W-56}" y="${RY(30)+4}">30</text>`;
    s+=`<path class="acrsi" d="${r.map((v,i)=>v==null?null:[X(i),RY(v)]).filter(Boolean).map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')}"/>`}
  return s+'</svg>'}
const acLegend=L=>`<div class="aclegend">${L.map(([c,t])=>`<span><i class="${c}"></i>${esc(t)}</span>`).join('')}</div>`;

/* ---------- interactieve onderdelen in lessen ---------- */
const ACW={
  candle:{html:()=>`<div class="acw"><div class="acwh"><b>Zo lees je een candle</b><div class="seg" id="acsd"><button data-cs="up" class="on">Stijgend</button><button data-cs="down">Dalend</button><button data-cs="doji">Doji</button><button data-cs="hammer">Hamer</button></div></div><div id="acsv"></div></div>`,
    mount(el){const draw=k=>{const P={up:[60,40,92,25,'Slot boven opening: de koers steeg in deze periode.'],down:[40,62,90,24,'Slot onder opening: de koers daalde.'],doji:[50,51,85,20,'Opening en slot bijna gelijk: evenwicht tussen kopers en verkopers.'],hammer:[78,82,88,20,'Lange onderste lont na een daling: verkopers duwden de koers omlaag, kopers kregen hem terug.']}[k];
        const [o,c,h,l,txt]=P;const Y=v=>200-v*1.8,up=c>=o,top=Y(Math.max(o,c)),bot=Y(Math.min(o,c));
        $('#acsv',el).innerHTML=`<div class="acsvw"><svg viewBox="0 0 360 210" class="acsvg acc" role="img" aria-label="Candle">
          <line x1="120" x2="120" y1="${Y(h)}" y2="${Y(l)}" class="acwick"/><rect x="95" y="${top}" width="50" height="${Math.max(2,bot-top)}" rx="3" class="acbody ${up?'up':'down'}"/>
          ${[[h,'Hoogste punt'],[Math.max(o,c),up?'Slot':'Opening'],[Math.min(o,c),up?'Opening':'Slot'],[l,'Laagste punt']].map(([v,t],i)=>`<line x1="150" x2="200" y1="${Y(v)}" y2="${Y(v)}" class="acgrid"/><text x="206" y="${Y(v)+4+(i===2&&Math.abs(o-c)<4?12:0)+(i===1&&Math.abs(o-c)<4?-6:0)}" class="actxt">${t}</text>`).join('')}</svg><p>${esc(txt)}</p></div>`};
      draw('up');$('#acsd',el).onclick=e=>{const b=e.target.closest('[data-cs]');if(!b)return;$$('#acsd button',el).forEach(x=>x.classList.toggle('on',x===b));draw(b.dataset.cs)}}},
  trend:{html:()=>`<div class="acw"><div class="acwh"><b>Bitcoin, laatste 120 dagen</b><span class="note" id="acwt">laden…</span></div><div id="acwc">${skel(3)}</div></div>`,
    async mount(el){const d=await acHist('BTC');const box=$('#acwc',el);if(!d){box.innerHTML=noData();return}const c=d.slice(-120).map(x=>x.c),full=d.map(x=>x.c);const s20=acSMA(full,20).slice(-120),s50=acSMA(full,50).slice(-120);
      box.innerHTML=acChart({c,lines:[{d:s50,cls:'acs50'},{d:s20,cls:'acs20'}],label:'Bitcoin met 20- en 50-daags gemiddelde'})+acLegend([['acprice','Koers'],['acs20','20-daags gemiddelde'],['acs50','50-daags gemiddelde']]);
      const p=c[c.length-1],a=s20[s20.length-1],b=s50[s50.length-1];$('#acwt',el).textContent=p>a&&a>b?'Nu: stijgende trend op korte termijn':p<a&&a<b?'Nu: dalende trend op korte termijn':'Nu: geen duidelijke trend'}},
  sr:{html:()=>`<div class="acw"><div class="acwh"><b>Steun en weerstand bij Bitcoin, 90 dagen</b></div><div id="acwc">${skel(3)}</div></div>`,
    async mount(el){const d=await acHist('BTC');const box=$('#acwc',el);if(!d){box.innerHTML=noData();return}const w=d.slice(-90),c=w.map(x=>x.c);const L=typeof srLevels==='function'?srLevels(w,c[c.length-1]):{sup:[],res:[]};
      const lv=[...(L.sup||[]),...(L.res||[])].map(x=>typeof x==='object'?x.p:x).filter(v=>isFinite(v)).slice(0,4);
      box.innerHTML=acChart({c,levels:lv,label:'Bitcoin met steun en weerstand'})+acLegend([['acprice','Koers'],['aclev','Niveaus waar de koers eerder keerde']])}},
  rsi:{html:()=>`<div class="acw"><div class="acwh"><b>Bitcoin met RSI (14 dagen)</b><span class="note" id="acwt"></span></div><div id="acwc">${skel(3)}</div></div>`,
    async mount(el){const d=await acHist('BTC');const box=$('#acwc',el);if(!d){box.innerHTML=noData();return}const full=d.map(x=>x.c),r=acRSI(full).slice(-120),c=full.slice(-120);
      box.innerHTML=acChart({c,rsi:r,lines:[{d:acSMA(full,20).slice(-120),cls:'acs20'}],label:'Bitcoin met RSI'})+acLegend([['acprice','Koers'],['acs20','20-daags gemiddelde'],['acrsi','RSI']]);
      const v=r[r.length-1];$('#acwt',el).textContent=v==null?'':`RSI nu ${nlN(v,0)}: ${v>70?'overkocht':v<30?'oververkocht':'neutraal'}`}},
  atr:{html:()=>`<div class="acw"><div class="acwh"><b>Stop-afstand op basis van de ATR</b></div><div class="acform"><label>Munt<select class="inp" id="atrs">${['BTC','ETH','SOL','XRP','ADA','DOGE'].map(s=>`<option>${s}</option>`).join('')}</select></label><label>Factor<select class="inp" id="atrk"><option value="1.5">1,5 × ATR</option><option value="2" selected>2 × ATR</option><option value="3">3 × ATR</option></select></label></div><div id="atro" class="acout">${skel(1)}</div></div>`,
    mount(el){const go=async()=>{const s=$('#atrs',el).value,k=+$('#atrk',el).value;const d=await acHist(s);const o=$('#atro',el);if(!d||d.length<15){o.innerHTML=noData();return}const atr=acATR(d),p=d[d.length-1].c;
        o.innerHTML=`<div><small>ATR (14 dagen)</small><b>${money({kind:'crypto'},atr)}</b><span>${nlN(atr/p*100,1)}% van de koers</span></div><div><small>Stop bij koop op ${money({kind:'crypto'},p)}</small><b>${money({kind:'crypto'},p-k*atr)}</b><span>${nlN(k*atr/p*100,1)}% onder de koers</span></div>`};
      $('#atrs',el).onchange=go;$('#atrk',el).onchange=go;go()}},
  rr:{html:()=>`<div class="acw"><div class="acwh"><b>Rekenhulp: risico en rendement</b></div><div class="acform"><label>Instap (€)<input class="inp" id="rre" inputmode="decimal" value="100"></label><label>Stop-loss (€)<input class="inp" id="rrs" inputmode="decimal" value="95"></label><label>Koersdoel (€)<input class="inp" id="rrt" inputmode="decimal" value="110"></label><label>Jouw winkans (%)<input class="inp" id="rrw" inputmode="decimal" value="45"></label></div><div id="rro" class="acout"></div></div>`,
    mount(el){const num=id=>parseFloat(String($(id,el).value).replace(',','.'));const go=()=>{const e=num('#rre'),s=num('#rrs'),t=num('#rrt'),w=num('#rrw')/100;const o=$('#rro',el);
        if(![e,s,t].every(isFinite)||e===s){o.innerHTML='<div class="empty">Vul instap, stop en doel in.</div>';return}const risk=Math.abs(e-s),rew=Math.abs(t-e),R=rew/risk,be=1/(1+R),ev=isFinite(w)?w*R-(1-w):null;
        o.innerHTML=`<div><small>Verhouding</small><b>1 op ${nlN(R,1)}</b><span>risico € ${nlN(risk,2)}, beloning € ${nlN(rew,2)}</span></div><div><small>Minimale winkans</small><b>${nlN(be*100,0)}%</b><span>om quitte te spelen (zonder kosten)</span></div>${ev!=null?`<div><small>Verwachte waarde</small><b class="${ev>=0?'up':'down'}">${ev>=0?'+':'−'}${nlN(Math.abs(ev),2)} R</b><span>per trade, bij ${nlN(w*100,0)}% winkans</span></div>`:''}`};
      el.querySelectorAll('#rre,#rrs,#rrt,#rrw').forEach(i=>i.oninput=go);go()}},
  pos:{html:()=>`<div class="acw"><div class="acwh"><b>Rekenhulp: positiegrootte</b></div><div class="acform"><label>Kapitaal (€)<input class="inp" id="psk" inputmode="decimal" value="10000"></label><label>Risico per trade (%)<input class="inp" id="psr" inputmode="decimal" value="1"></label><label>Instap (€)<input class="inp" id="pse" inputmode="decimal" value="50"></label><label>Stop-loss (€)<input class="inp" id="pss" inputmode="decimal" value="45"></label></div><div id="pso" class="acout"></div></div>`,
    mount(el){const num=id=>parseFloat(String($(id,el).value).replace(',','.'));let used=false;const go=()=>{const k=num('#psk'),r=num('#psr')/100,e=num('#pse'),s=num('#pss');const o=$('#pso',el);
        if(![k,r,e,s].every(isFinite)||e===s||k<=0){o.innerHTML='<div class="empty">Vul alle velden in; de stop moet anders zijn dan de instap.</div>';return}const amt=k*r,per=Math.abs(e-s),n=amt/per,val=n*e;
        o.innerHTML=`<div><small>Maximaal verlies</small><b>€ ${nlN(amt,2)}</b><span>${nlN(r*100,1)}% van je kapitaal</span></div><div><small>Aantal</small><b>${nlN(n,n<10?4:2)}</b><span>stuks of munten</span></div><div><small>Positiewaarde</small><b>€ ${nlN(val,2)}</b><span>${nlN(val/k*100,1)}% van je kapitaal${val>k?' · meer dan je kapitaal: kies een ruimere stop of minder risico':''}</span></div>`;
        if(!used){used=true;const a=AC.st();if(!a.calc){a.calc=1;saveSettings();Badges.check()}}};
      el.querySelectorAll('#psk,#psr,#pse,#pss').forEach(i=>i.oninput=go);go()}},
  recovery:{html:()=>`<div class="acw"><div class="acwh"><b>Hoeveel moet je terugwinnen?</b></div><label class="acrange">Verlies <b id="rcv">30%</b><input type="range" id="rcr" min="5" max="90" step="5" value="30"></label><div id="rco" class="acrec"></div></div>`,
    mount(el){const go=()=>{const L=+$('#rcr',el).value/100,need=1/(1-L)-1;$('#rcv',el).textContent=nlN(L*100,0)+'%';
        $('#rco',el).innerHTML=`<div><span>Verlies</span><i class="down" style="width:${Math.min(100,L*100)}%"></i><b>−${nlN(L*100,0)}%</b></div><div><span>Nodig om te herstellen</span><i class="up" style="width:${Math.min(100,need*100/9)}%"></i><b>+${nlN(need*100,0)}%</b></div>`};$('#rcr',el).oninput=go;go()}},
  fees:{html:()=>`<div class="acw"><div class="acwh"><b>Wat kost vaak handelen?</b></div><div class="acform"><label>Transacties per week<input class="inp" id="fen" inputmode="numeric" value="10"></label><label>Bedrag per transactie (€)<input class="inp" id="fea" inputmode="decimal" value="500"></label><label>Kosten per transactie (%)<input class="inp" id="fep" inputmode="decimal" value="0,25"></label></div><div id="feo" class="acout"></div></div>`,
    mount(el){const num=id=>parseFloat(String($(id,el).value).replace(',','.'));const go=()=>{const n=num('#fen'),a=num('#fea'),p=num('#fep')/100;const o=$('#feo',el);if(![n,a,p].every(isFinite)){o.innerHTML='';return}const y=n*52*a*p;
        o.innerHTML=`<div><small>Per week</small><b>€ ${nlN(n*a*p,2)}</b></div><div><small>Per jaar</small><b>€ ${nlN(y,0)}</b><span>${n*52} transacties</span></div>`};el.querySelectorAll('#fen,#fea,#fep').forEach(i=>i.oninput=go);go()}}
};

/* ---------- certificaat ---------- */
async function acCert(p){const W=1600,H=1100,cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
  const bg=g.createRadialGradient(W*.8,0,50,W*.8,0,W);bg.addColorStop(0,'#24262b');bg.addColorStop(.6,'#0b0b0d');bg.addColorStop(1,'#050505');g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=2;g.strokeRect(48,48,W-96,H-96);g.strokeStyle='rgba(255,255,255,.07)';g.strokeRect(64,64,W-128,H-128);
  const metal=(y0,y1)=>{const m=g.createLinearGradient(0,y0,W,y1);m.addColorStop(0,'#ffffff');m.addColorStop(.35,'#c9cdd3');m.addColorStop(.5,'#7f858e');m.addColorStop(.7,'#f1f2f4');m.addColorStop(1,'#9aa0a9');return m};
  try{const img=new Image();img.src='brand/vantis-full.svg';await img.decode();const w=520,h=w*img.height/img.width;g.drawImage(img,(W-w)/2,130,w,h)}catch(e){}
  const name=(Api.user&&Api.user.name)||'Vantis-gebruiker';const d=AC.done();const sc=p.L.map(id=>d[id]).filter(Boolean);const avg=sc.length?sc.reduce((a,x)=>a+(x.score/x.of),0)/sc.length*100:0;
  g.textAlign='center';g.fillStyle='#9aa0a9';g.font='500 30px Inter, sans-serif';g.fillText((S.settings.lang||'en')==='en'?'VANTIS ACADEMY CERTIFICATE':'CERTIFICAAT VANTIS ACADEMY',W/2,370);
  g.fillStyle=metal(400,520);g.font='700 84px "Inter Tight", Inter, sans-serif';g.fillText(p.t,W/2,480);
  g.fillStyle='#c9cdd3';g.font='400 34px Inter, sans-serif';g.fillText((S.settings.lang||'en')==='en'?'awarded to':'behaald door',W/2,580);g.fillStyle='#ffffff';g.font='600 64px "Inter Tight", Inter, sans-serif';g.fillText(name,W/2,660);
  g.fillStyle='#9aa0a9';g.font='400 30px Inter, sans-serif';g.fillText((S.settings.lang||'en')==='en'?`${p.L.length} lessons completed · ${Math.round(avg)}% correct on average · level ${p.lvl.toLowerCase()}`:`${p.L.length} lessen afgerond · gemiddeld ${Math.round(avg)}% goed · niveau ${p.lvl.toLowerCase()}`,W/2,760);
  g.fillText(new Date().toLocaleDateString((S.settings.lang||'en')==='en'?'en-GB':'nl-NL',{day:'numeric',month:'long',year:'numeric'}),W/2,810);
  g.strokeStyle='rgba(255,255,255,.2)';g.beginPath();g.moveTo(W/2-160,900);g.lineTo(W/2+160,900);g.stroke();g.fillStyle='#737985';g.font='400 24px Inter, sans-serif';g.fillText('Vantis · Crypto Intelligence',W/2,940);
  const a=AC.st();if(!a.cert[p.id]){a.cert[p.id]=Date.now();saveSettings();Badges.check()}
  cv.toBlob(b=>{const u=URL.createObjectURL(b);const l=document.createElement('a');l.href=u;l.download=`Vantis-certificaat-${p.id}.png`;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)},'image/png')}

/* ---------- badges uitbreiden ---------- */
Badges.L.push(['cert1','Gecertificeerd','Je eerste leerpad afgerond','learn'],['chart10','Grafieklezer','Tien rondes van de grafiekuitdaging gespeeld','record'],['tasks5','Doener','Vijf opdrachten in de Academy afgerond','trophy']);
{const ot=Badges.test.bind(Badges);Badges.test=function(id){if(id==='cert1')return AC_PATHS.some(p=>AC.pathDone(p)===p.L.length);if(id==='chart10')return (AC.st().chart.n||0)>=10;if(id==='tasks5')return AC_TASKS.filter(t=>AC.task(t)).length>=5;return ot(id)}}
{const i=NAV.findIndex(n=>n[0]==='leren');if(i>=0)NAV[i]=['leren','Academy','learn']}

/* ---------- de pagina ---------- */
const AC_TABS=[['paden','Leerpaden'],['opdrachten','Opdrachten'],['grafiek','Grafiekuitdaging'],['tools','Rekenhulpen'],['begrippen','Begrippen'],['badges','Badges']];
Pages.leren={
  title:()=>'Academy',
  html(arg){const L=arg&&AC_LESSONS[arg];if(L)return this.lessonHTML(arg);
    if(arg&&arg.startsWith('pad_')){AC.tab='paden'}else if(arg&&AC_TABS.some(t=>t[0]===arg))AC.tab=arg;
    const lv=AC.level(),nx=AC.next(),nl=nx&&AC_LESSONS[nx],np=nx&&AC.pathOf(nx),d=AC.done(),nDone=AC_ORDER.filter(id=>d[id]).length,st=S.settings.streak||{};
    return `<div class="phead"><div><h1>Vantis Academy</h1><p>Leer stap voor stap traden: van je eerste aankoop tot risicobeheer, grafieken lezen en macro. Met lessen, opdrachten in de app en oefeningen met echte koersen.</p></div></div>
      <section class="achero card"><div class="aclv"><span class="aclvn">${lv.i}</span><div><small>Niveau ${lv.i}</small><b>${esc(lv.name)}</b><div class="acxp"><i style="width:${lv.pct}%"></i></div><span>${nlN(lv.x,0)} XP${lv.next?` · nog ${nlN(lv.need,0)} XP tot ${esc(lv.next)}`:' · hoogste niveau'}</span></div></div>
        <div class="acst"><div><small>Lessen</small><b>${nDone} van ${AC_ORDER.length}</b></div><div><small>Opdrachten</small><b>${AC_TASKS.filter(t=>AC.task(t)).length} van ${AC_TASKS.length}</b></div><div><small>Reeks</small><b>${st.n||1} ${st.n===1?'dag':'dagen'}</b></div></div>
        ${nl?`<a class="acnext" href="#leren-${nx}"><small>Ga verder · ${esc(np.t)}</small><b>${esc(nl.t)}</b><span>${nl.min} min · ${nl.q.length} vragen</span></a>`:`<div class="acnext"><small>Alle lessen afgerond</small><b>Je hebt de hele Academy doorlopen</b><span>Download je certificaten bij de leerpaden.</span></div>`}</section>
      <div class="seg mdtabs actabs" id="actabs" role="tablist">${AC_TABS.map(([k,t])=>`<button role="tab" data-t="${k}" class="${AC.tab===k?'on':''}" aria-selected="${AC.tab===k}">${t}</button>`).join('')}</div><div id="acbody" style="margin-top:16px"></div>`},
  mount(el,arg){if(typeof PT!=='undefined'&&PT.load)PT.load().then(()=>{if(UI.el===el&&!AC_LESSONS[arg])this.live(el,arg,'calc')}).catch(()=>{});
    if(AC_LESSONS[arg]){this.mountLesson(el,arg);return}
    $('#actabs',el).onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;AC.tab=b.dataset.t;$$('#actabs button',el).forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-selected',x===b)});this.live(el,null,'calc')};
    el.addEventListener('click',e=>{const t=e.target.closest('[data-cert],[data-chal],[data-acpath]');if(!t)return;
      if(t.dataset.cert){const p=AC_PATHS.find(x=>x.id===t.dataset.cert);acCert(p)}
      if(t.dataset.acpath){const p=t.dataset.acpath;AC.open=AC.open===p?null:p;this.live(el,null,'calc')}
      if(t.dataset.chal)this.chal(el,t.dataset.chal)});
    if(arg&&arg.startsWith('pad_'))AC.open=arg.slice(4);
    this.live(el,arg,'calc')},
  live(el,arg,kind){if(kind!=='calc'||AC_LESSONS[arg])return;const b=$('#acbody',el);if(!b)return;const T=AC.tab;
    if(T==='paden')b.innerHTML=this.paths();
    else if(T==='opdrachten')b.innerHTML=this.tasks();
    else if(T==='grafiek'){b.innerHTML=`<div id="acchal"></div>`;this.chal(el,AC.round&&!AC.round.done?'keep':'new')}
    else if(T==='tools'){b.innerHTML=`<div class="actools">${['pos','rr','atr','recovery','fees'].map(k=>`<div data-wk="${k}">${ACW[k].html()}</div>`).join('')}</div>`;$$('[data-wk]',b).forEach(x=>ACW[x.dataset.wk].mount(x))}
    else if(T==='begrippen'){b.innerHTML=`<div class="card"><input class="inp" id="acq" placeholder="Zoek een begrip, bijvoorbeeld spread of RSI" aria-label="Zoek een begrip" value="${esc(AC.term)}"><div id="acterms" class="acterms"></div></div>`;
      const draw=()=>{const q=AC.term.trim().toLowerCase();const all=[...Object.values(GLOSS).map(g=>[g[0],g[1]]),...AC_TERMS].sort((a,b)=>a[0].localeCompare(b[0],'nl'));const L=all.filter(([t,d])=>!q||t.toLowerCase().includes(q)||d.toLowerCase().includes(q));
        $('#acterms',b).innerHTML=L.length?L.map(([t,d])=>`<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join(''):'<div class="empty">Geen begrip gevonden.</div>'};
      $('#acq',b).oninput=e=>{AC.term=e.target.value;draw()};draw()}
    else if(T==='badges')b.innerHTML=Badges.html()},
  paths(){const d=AC.done();return `<div class="acpaths">${AC_PATHS.map((p,pi)=>{const n=AC.pathDone(p),tot=p.L.length,open=AC.open===p.id,full=n===tot;
      return `<div class="card acpath ${open?'open':''} ${full?'full':''}"><button class="acph" data-acpath="${p.id}" aria-expanded="${open}"><span class="acring" style="--p:${n/tot*100}"><b>${n}/${tot}</b></span><span><small>Leerpad ${pi+1} · ${esc(p.lvl)}</small><b>${esc(p.t)}</b><span class="acpd">${esc(p.d)}</span></span>${ico(open?'up':'down','class="chev"')}</button>
        ${open?`<ol class="acll">${p.L.map((id,i)=>{const L=AC_LESSONS[id],r=d[id];return `<li><a href="#leren-${id}" class="${r?'done':''}"><span class="acln">${r?ico('check'):i+1}</span><span><b>${esc(L.t)}</b><small>${L.min} min · ${L.q.length} vragen${L.w?' · interactief':''}${r?` · ${r.score}/${r.of} goed`:''}</small></span></a></li>`}).join('')}</ol>
          ${full?`<div class="accert"><span>${aci('trophy')}<span><b>Leerpad afgerond</b><small>Download je certificaat als afbeelding.</small></span></span><button class="btn sm" data-cert="${p.id}">Certificaat downloaden</button></div>`:''}`:''}</div>`}).join('')}</div>`},
  tasks(){const T=AC_TASKS.map(t=>[t,AC.task(t)]);return `<p class="note" style="margin:0 0 12px">Opdrachten zijn kleine stappen in de app zelf. Elke afgeronde opdracht levert 15 XP op en wordt automatisch afgevinkt.</p><div class="card actasks">${T.map(([t,ok])=>`<a class="actask ${ok?'done':''}" href="${t.go}"><span class="acln">${ok?ico('check'):''}</span><span><b>${esc(t.t)}</b><small>${esc(t.d)}</small></span><span class="tag ${ok?'up':''}">${ok?'Afgerond':'+15 XP'}</span></a>`).join('')}</div>`},
  /* grafiekuitdaging */
  async chal(el,what){const box=$('#acchal',el);if(!box)return;const C=AC.st().chart;
    const head=`<div class="acchead"><div><b>Grafiekuitdaging</b><p>Je ziet 60 dagen van een echte munt uit het afgelopen jaar. Gaat de koers in de 7 dagen daarna omhoog of omlaag? Naam en datum zie je pas achteraf.</p></div><div class="acstats"><div><small>Gespeeld</small><b>${C.n||0}</b></div><div><small>Goed</small><b>${C.n?nlN((C.ok||0)/C.n*100,0)+'%':'—'}</b></div><div><small>Beste reeks</small><b>${C.best||0}</b></div></div></div>`;
    if(what==='new'||!AC.round){box.innerHTML=`<div class="card">${head}<div class="acchart">${skel(3)}</div></div>`;
      const pool=['BTC','ETH','SOL','XRP','ADA','DOGE','LINK','AVAX','DOT','LTC'];let d=null,sym=null;for(let k=0;k<4&&!d;k++){sym=pool[Math.floor(Math.random()*pool.length)];const h=await acHist(sym);if(h&&h.length>=90)d=h}
      if(!d){box.innerHTML=`<div class="card">${head}${noData()}</div>`;return}
      const i=70+Math.floor(Math.random()*(d.length-80));AC.round={sym,d,i,done:false}}
    const R=AC.round,d=R.d,full=d.map(x=>x.c),cut=R.i,win=full.slice(cut-60,cut+1),after=full.slice(cut+1,cut+8),s20=acSMA(full,20).slice(cut-60,cut+1),rsi=acRSI(full);
    const chart=acChart({c:win,after:R.done?after:null,lines:[{d:s20,cls:'acs20'}],fmt:v=>R.done?nlN(v,v<1?3:v<100?2:0):'',label:'Grafiekuitdaging'});
    let body;if(!R.done)body=`<div class="acchart">${chart}${acLegend([['acprice','Koers'],['acs20','20-daags gemiddelde']])}</div><div class="acchbtn"><button class="btn gobuy" data-chal="up">${ico('up')} Hoger over 7 dagen</button><button class="btn gosell" data-chal="down">${ico('down')} Lager over 7 dagen</button></div>`;
    else{const ch=(after[after.length-1]/win[win.length-1]-1)*100,good=(ch>=0)===(R.pick==='up'),r=rsi[cut],trend=win[win.length-1]>s20[s20.length-1],m7=(win[win.length-1]/win[win.length-8]-1)*100,nm=(S.crypto.get(R.sym)||{}).name||R.sym;
      body=`<div class="acchart">${chart}${acLegend([['acprice','Koers tot je keuze'],['acafter '+(ch>=0?'up':'down'),'De 7 dagen daarna'],['acs20','20-daags gemiddelde']])}</div>
        <div class="acres ${good?'good':'bad'}"><b>${good?'Goed ingeschat':'Net niet'}: ${pct(ch)} in 7 dagen</b><span>${esc(nm)}, ${new Date(d[cut].t).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})}</span></div>
        <div class="acwhy"><div><small>RSI op dat moment</small><b>${r==null?'—':nlN(r,0)}</b><span>${r==null?'':r>70?'overkocht':r<30?'oververkocht':'neutraal'}</span></div><div><small>Koers t.o.v. 20-daags gemiddelde</small><b>${trend?'Erboven':'Eronder'}</b><span>${trend?'korte trend omhoog':'korte trend omlaag'}</span></div><div><small>Laatste 7 dagen ervoor</small><b class="${cls(m7)}">${pct(m7)}</b><span>momentum</span></div></div>
        <p class="note">Ook ervaren traders zitten hier vaak naast. Het gaat erom dat je leert waar je op let en dat je altijd met een plan en een stop-loss werkt.</p><div class="acchbtn"><button class="btn" data-chal="new">Volgende grafiek</button></div>`}
    if(what==='up'||what==='down'){if(R.done)return;R.done=true;R.pick=what;const ch=full[cut+7]/full[cut]-1,good=(ch>=0)===(what==='up');C.n=(C.n||0)+1;if(good){C.ok=(C.ok||0)+1;C.streak=(C.streak||0)+1;C.best=Math.max(C.best||0,C.streak)}else C.streak=0;saveSettings();Badges.check();return this.chal(el,'keep')}
    if(what==='new'&&R.done){AC.round=null;return this.chal(el,'new')}
    box.innerHTML=`<div class="card">${head}${body}</div>`},
  /* lespagina */
  lessonHTML(id){const L=AC_LESSONS[id],p=AC.pathOf(id),i=p.L.indexOf(id),d=AC.done(),r=d[id];AC.ans={};AC.checked=null;
    const wAt=L.w?Math.min(L.s.length-1,Math.max(1,L.s.findIndex(s=>s.tip)>=0?L.s.findIndex(s=>s.tip):2)):-1;
    const sec=L.s.map((s,k)=>{const last=k===L.s.length-1&&s.h==='Kernpunten';return `<section class="${last?'ackey':''}">${s.h?`<h2>${esc(s.h)}</h2>`:''}${(s.p||[]).map(x=>`<p>${esc(x)}</p>`).join('')}${s.li?`<ul>${s.li.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${s.tip?`<div class="actip">${aci('learn')}<span>${esc(s.tip)}</span></div>`:''}</section>${k===wAt?`<div id="acwid">${ACW[L.w].html()}</div>`:''}`}).join('');
    const prev=p.L[i-1],nxt=p.L[i+1]||AC_ORDER[AC_ORDER.indexOf(id)+1];
    return `<a class="acback" href="#leren-pad_${p.id}">${ico('back')} ${esc(p.t)}</a>
      <div class="acles"><article class="card aclbody"><div class="acmeta"><span class="tag">Les ${i+1} van ${p.L.length}</span><span>${L.min} min lezen</span>${r?`<span class="tag up">${ico('check')} Afgerond · ${r.score}/${r.of}</span>`:''}</div><h1>${esc(L.t)}</h1>${sec}
        <section class="acquiz" id="acquiz"></section>
        <div class="acnav">${prev?`<a class="btn ghost" href="#leren-${prev}">Vorige les</a>`:'<span></span>'}${L.go?`<a class="btn ghost" href="${L.go[0]}">Pas toe: ${esc(L.go[1])}</a>`:''}${nxt?`<a class="btn" href="#leren-${nxt}">Volgende les</a>`:''}</div></article>
        <aside class="card acside"><small>Leerpad · ${esc(p.lvl)}</small><b>${esc(p.t)}</b><ol>${p.L.map((x,k)=>`<li class="${x===id?'cur':''} ${d[x]?'done':''}"><a href="#leren-${x}"><span class="acln">${d[x]?ico('check'):k+1}</span>${esc(AC_LESSONS[x].t)}</a></li>`).join('')}</ol></aside></div>`},
  quizHTML(id){const L=AC_LESSONS[id],ch=AC.checked===id;
    return `<h2>Test je kennis</h2>${L.q.map((q,qi)=>{const a=AC.ans[qi];return `<div class="lrqq"><b>${qi+1}. ${esc(q[0])}</b><div class="lrqa">${q[1].map((t,ai)=>{const sel=a===ai;const c=ch?(ai===q[2]?'good':sel?'bad':''):sel?'sel':'';return `<button class="${c}" data-qa="${qi}|${ai}" ${ch?'disabled':''} aria-pressed="${sel}">${esc(t)}</button>`}).join('')}</div>${ch&&q[3]?`<p class="acexp ${a===q[2]?'up':'down'}">${a===q[2]?((S.settings.lang||'en')==='en'?'Correct. ':'Goed. '):((S.settings.lang||'en')==='en'?'Not quite. ':'Niet goed. ')}${esc(q[3])}</p>`:''}</div>`}).join('')}
      <div class="acqbtn">${ch?`<button class="btn ghost" data-qreset="1">Opnieuw proberen</button>`:`<button class="btn" data-qcheck="1">Controleer antwoorden</button>`}</div>`},
  mountLesson(el,id){const L=AC_LESSONS[id];const q=$('#acquiz',el);const draw=()=>{q.innerHTML=this.quizHTML(id)};draw();
    if(L.w&&ACW[L.w])ACW[L.w].mount($('#acwid',el));
    q.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.qa&&AC.checked!==id){const [qi,ai]=b.dataset.qa.split('|').map(Number);AC.ans[qi]=ai;draw()}
      if(b.dataset.qreset){AC.ans={};AC.checked=null;draw()}
      if(b.dataset.qcheck){if(Object.keys(AC.ans).length<L.q.length){UI.toast({kind:'info',title:'Beantwoord eerst alle vragen'});return}
        const ok=L.q.filter((x,i)=>AC.ans[i]===x[2]).length;const prev=AC.done()[id];const before=AC.xp();
        if(!prev||ok>(prev.score||0))S.settings.learn={...AC.done(),[id]:{score:ok,of:L.q.length,t:Date.now()}};saveSettings();AC.checked=id;draw();
        const gain=AC.xp()-before;Badges.check();if(gain>0)AC.toastXP(gain,ok===L.q.length?'Alles goed! Les afgerond':`${ok} van ${L.q.length} goed`);else UI.toast({kind:'info',title:`${ok} van ${L.q.length} goed`,body:'Lees de uitleg bij elke vraag.'});
        const p=AC.pathOf(id);if(p&&AC.pathDone(p)===p.L.length&&!AC.st().cert[p.id])UI.toast({kind:'success',title:'Leerpad afgerond: '+p.t,body:'Download je certificaat in de Academy.',href:'#leren-pad_'+p.id})}})}
};

/* overzicht: volgende les in "Vandaag" als er ruimte is */
{const ol=OV.B.glance.live;OV.B.glance.live=function(el,kind){ol.call(this,el,kind);const t=$('#gltoday',el);if(!t||$$('.gtr',t).length>=3)return;const nx=AC.next();if(!nx)return;const L=AC_LESSONS[nx];
  t.querySelector('.empty')?.remove();t.insertAdjacentHTML('beforeend',`<a class="gtr" href="#leren-${nx}">${aci('learn')}<span><b>${esc(L.t)}</b><small>Volgende les · ${L.min} min</small></span></a>`)}}
