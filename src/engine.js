/* =====================================================================
   CSA ENGINE — data, analyse, impact, nieuws, meldingen
   Alle cijfers komen uit echte bronnen (Bitvavo, CryptoCompare, Finnhub)
   of worden daaruit berekend. Ontbreekt een bron, dan zegt de app dat.
   ===================================================================== */
const CFG={
  BV:'https://api.bitvavo.com/v2', BVWS:'wss://ws.bitvavo.com/v2/',
  CC:'https://min-api.cryptocompare.com/data/v2/news/?lang=EN',
  FH:'https://finnhub.io/api/v1',
  DEEP:40,          // aantal cryptomarkten met volledige analyse
  HOURLY:14,        // aantal markten met uurdata (snelheid)
  STABLE:new Set(['USDC','USDT','EURC','DAI','EURT','TUSD','PYUSD','FDUSD','USDE','EURI','RLUSD','USD1','EURQ','EURR'])
};
const LS={get(k,d){try{const v=localStorage.getItem('csa.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('csa.'+k,JSON.stringify(v))}catch(e){}}};
const DEFAULT_SETTINGS={notify:true,browser:false,minScore:60,scope:'all',quietFrom:'23:00',quietTo:'07:00',quiet:false,
  cats:{move:true,sudden:true,volume:true,breakout:true,market:true,macro:true,regulation:true,security:true,etf:true,earnings:true,geo:true,watchnews:true,sector:true,whale:true,vol:true},
  fhKey:'',theme:'light'};

const S={
  crypto:new Map(),stocks:new Map(),names:{},
  clusters:[],events:new Map(),alerts:LS.get('alerts',[]),unread:LS.get('unread',0),
  src:{
    bitvavo:{name:'Bitvavo',st:'wait',ts:0,kind:'Realtime',msg:'Verbinden…'},
    candles:{name:'Bitvavo historie',st:'wait',ts:0,kind:'Dagelijks + per uur',msg:'Nog niet geladen'},
    cc:{name:'CryptoCompare nieuws',st:'wait',ts:0,kind:'Elke 5 min',msg:'Nog niet geladen'},
    fh:{name:'Finnhub aandelen + nieuws',st:'off',ts:0,kind:'Realtime (VS, volgens provider)',msg:'Niet gekoppeld: geen API-sleutel'},
    tv:{name:'TradingView widgets',st:'ok',ts:0,kind:'Grafieken, kalender, nieuws; aandelen kunnen vertraagd zijn',msg:'Laadt in de browser'}
  },
  market:{},senti:{},sentiLog:LS.get('sentilog',[]),sentiPrev:LS.get('sentiprev',{}),sentiCand:{},
  settings:Object.assign({},DEFAULT_SETTINGS,LS.get('settings',{})),
  watch:LS.get('watch',['BTC','ETH','SOL','NVDA','ASML']),
  rem:LS.get('rem',{}),remFired:LS.get('remfired',{}),
  restOK:null,ws:null,wsReady:false,wsQ:new Map(),wsId:1,lastCalc:0
};
S.settings.cats=Object.assign({},DEFAULT_SETTINGS.cats,S.settings.cats||{});
const saveSettings=()=>LS.set('settings',S.settings);

/* ---------- helpers ---------- */
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sum=a=>a.reduce((s,x)=>s+x,0);
function corr(a,b){const n=Math.min(a.length,b.length);if(n<8)return null;a=a.slice(-n);b=b.slice(-n);const ma=mean(a),mb=mean(b);let c=0,va=0,vb=0;for(let i=0;i<n;i++){c+=(a[i]-ma)*(b[i]-mb);va+=(a[i]-ma)**2;vb+=(b[i]-mb)**2}return va&&vb?c/Math.sqrt(va*vb):null}
function beta(a,b){const n=Math.min(a.length,b.length);if(n<8)return null;a=a.slice(-n);b=b.slice(-n);const ma=mean(a),mb=mean(b);let c=0,vb=0;for(let i=0;i<n;i++){c+=(a[i]-ma)*(b[i]-mb);vb+=(b[i]-mb)**2}return vb?c/vb:null}
function rsi(cl,p=14){if(cl.length<p+1)return null;let g=0,l=0;for(let i=cl.length-p;i<cl.length;i++){const d=cl[i]-cl[i-1];d>0?g+=d:l-=d}if(!l)return 100;const rs=(g/p)/(l/p);return 100-100/(1+rs)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function pool(items,n,fn){let i=0;const run=async()=>{while(i<items.length){const k=i++;try{await fn(items[k],k)}catch(e){}}};await Promise.all(Array.from({length:Math.min(n,items.length)},run))}
const DAY=864e5,HOUR=36e5,MIN=6e4;

/* ---------- formatting ---------- */
const nlN=(n,d=2)=>n==null||!isFinite(n)?'—':n.toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});
function eur(n){if(n==null||!isFinite(n))return '—';const a=Math.abs(n);let d=a>=1000?2:a>=1?(a>=100?2:3):a>=.01?4:6;if(a<1e-4)return '€ '+n.toLocaleString('nl-NL',{maximumSignificantDigits:4});return '€ '+nlN(n,d)}
function usd(n){return n==null||!isFinite(n)?'—':'$ '+nlN(n,2)}
function money(a,n){return a&&a.cur==='USD'?usd(n):eur(n)}
function big(n,c='€'){if(n==null||!isFinite(n))return '—';const a=Math.abs(n);if(a>=1e9)return c+' '+nlN(n/1e9,2)+' mld';if(a>=1e6)return c+' '+nlN(n/1e6,1)+' mln';if(a>=1e3)return c+' '+nlN(n/1e3,0)+'k';return c+' '+nlN(n,0)}
const pct=(n,d=2)=>n==null||!isFinite(n)?'—':(n>0?'+':n<0?'−':'')+nlN(Math.abs(n),d)+'%';
const cls=n=>n==null?'flat':n>0?'up':n<0?'down':'flat';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ago(t){if(!t)return 'nog niet';const s=Math.max(0,(Date.now()-t)/1000);if(s<60)return Math.round(s)+' s geleden';if(s<3600)return Math.round(s/60)+' min geleden';if(s<86400)return Math.round(s/3600)+' u geleden';return Math.round(s/86400)+' d geleden'}
const hhmm=t=>new Date(t).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
const dmy=t=>new Date(t).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'});

/* ---------- universum aandelen ---------- */
const STOCKS=[
  ['AAPL','Apple','Technologie','NASDAQ:AAPL',1],['MSFT','Microsoft','Technologie','NASDAQ:MSFT',1],['NVDA','Nvidia','AI & chips','NASDAQ:NVDA',1],
  ['GOOGL','Alphabet','Technologie','NASDAQ:GOOGL',1],['AMZN','Amazon','Technologie','NASDAQ:AMZN',1],['META','Meta Platforms','Technologie','NASDAQ:META',1],
  ['TSLA','Tesla','Consument','NASDAQ:TSLA',1],['AMD','AMD','AI & chips','NASDAQ:AMD',1],['AVGO','Broadcom','AI & chips','NASDAQ:AVGO',1],
  ['PLTR','Palantir','AI & software','NASDAQ:PLTR',1],['JPM','JPMorgan Chase','Financieel','NYSE:JPM',1],['GS','Goldman Sachs','Financieel','NYSE:GS',1],
  ['V','Visa','Financieel','NYSE:V',1],['XOM','ExxonMobil','Energie','NYSE:XOM',1],['CVX','Chevron','Energie','NYSE:CVX',1],
  ['LLY','Eli Lilly','Zorg','NYSE:LLY',1],['COIN','Coinbase','Crypto-gerelateerd','NASDAQ:COIN',1],['MSTR','Strategy','Crypto-gerelateerd','NASDAQ:MSTR',1],
  ['ASML','ASML','AI & chips','EURONEXT:ASML',0],['ADYEN','Adyen','Financieel','EURONEXT:ADYEN',0],['SAP','SAP','Technologie','XETR:SAP',0],
  ['MC','LVMH','Consument','EURONEXT:MC',0],['SHELL','Shell','Energie','EURONEXT:SHELL',0],['SIE','Siemens','Industrie','XETR:SIE',0],['INGA','ING Groep','Financieel','EURONEXT:INGA',0]
];
const ETFS=[['SPY','S&P 500','Index'],['QQQ','Nasdaq 100','Index'],['DIA','Dow Jones','Index'],['IWM','Russell 2000','Index'],
  ['XLK','Technologie','Sector'],['SMH','Halfgeleiders / AI','Sector'],['XLE','Energie','Sector'],['XLF','Financieel','Sector'],['XLV','Zorg','Sector'],['XLY','Consument','Sector'],['XLI','Industrie','Sector']];
STOCKS.forEach(([sym,name,sector,tv,fh])=>S.stocks.set(sym,{kind:'stock',sym,name,sector,tv,fh:!!fh,cur:fh?'USD':'EUR',price:null,ch24:null,news:[],m:{}}));
const ETFQ=new Map();

/* ---------- trefwoorden voor koppeling nieuws ↔ asset ---------- */
const KW={BTC:['bitcoin','btc'],ETH:['ethereum','ether','eth'],SOL:['solana'],XRP:['xrp','ripple'],ADA:['cardano'],DOGE:['dogecoin','doge'],LINK:['chainlink'],AVAX:['avalanche'],DOT:['polkadot'],LTC:['litecoin'],TRX:['tron'],SHIB:['shiba'],PEPE:['pepe'],SUI:['sui network'],NEAR:['near protocol'],APT:['aptos'],ARB:['arbitrum'],OP:['optimism'],POL:['polygon'],UNI:['uniswap'],AAVE:['aave'],RENDER:['render network'],FET:['fetch.ai','artificial superintelligence alliance'],TAO:['bittensor'],INJ:['injective'],ATOM:['cosmos'],HBAR:['hedera'],XLM:['stellar'],ONDO:['ondo'],TON:['toncoin'],BNB:['bnb','binance coin'],WIF:['dogwifhat'],BONK:['bonk'],
  AAPL:['apple'],MSFT:['microsoft'],NVDA:['nvidia'],GOOGL:['alphabet','google'],AMZN:['amazon'],META:['meta platforms','facebook'],TSLA:['tesla'],AMD:['amd'],AVGO:['broadcom'],PLTR:['palantir'],JPM:['jpmorgan'],GS:['goldman'],V:['visa inc'],XOM:['exxon'],CVX:['chevron'],LLY:['eli lilly'],COIN:['coinbase'],MSTR:['microstrategy','strategy inc','saylor'],ASML:['asml'],ADYEN:['adyen'],SAP:['sap se'],MC:['lvmh'],SHELL:['shell plc'],SIE:['siemens'],INGA:['ing groep','ing group']};
const SYMRX=/\b(BTC|ETH|SOL|XRP|ADA|DOGE|LINK|AVAX|DOT|LTC|TRX|SHIB|PEPE|SUI|NEAR|APT|ARB|UNI|AAVE|INJ|ATOM|HBAR|XLM|ONDO|TON|BNB|NVDA|AAPL|MSFT|TSLA|AMZN|GOOGL|META|COIN|MSTR|PLTR|AVGO)\b/g;

/* =====================================================================
   BITVAVO — REST met WebSocket als terugvaloptie
   ===================================================================== */
function wsPath(path){
  const [p,qs]=path.split('?');const q=Object.fromEntries(new URLSearchParams(qs||''));
  if(p==='/ticker/24h')return {action:'getTicker24h'};
  if(p==='/assets')return {action:'getAssets'};
  const m=p.match(/^\/([A-Z0-9]+-[A-Z]+)\/candles$/);
  if(m)return {action:'getCandles',market:m[1],interval:q.interval,limit:+q.limit||30};
  return null;
}
function wsRequest(path){
  return new Promise((res,rej)=>{
    const msg=wsPath(path);if(!msg)return rej(new Error('geen ws-route'));
    const go=()=>{const id=S.wsId++;msg.requestId=id;S.wsQ.set(id,{res,rej,act:msg.action,mk:msg.market});S.ws.send(JSON.stringify(msg));setTimeout(()=>{if(S.wsQ.has(id)){S.wsQ.delete(id);rej(new Error('timeout'))}},15000)};
    if(S.wsReady)go();else{let n=0;const iv=setInterval(()=>{if(S.wsReady){clearInterval(iv);go()}else if(++n>40){clearInterval(iv);rej(new Error('ws niet klaar'))}},250)}
  });
}
async function bv(path){
  if(S.restOK!==false){
    try{const r=await fetch(CFG.BV+path,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();S.restOK=true;return j}
    catch(e){if(S.restOK===true)throw e;S.restOK=false}
  }
  return wsRequest(path);
}
function connectWS(){
  let ws;try{ws=new WebSocket(CFG.BVWS)}catch(e){S.src.bitvavo.st='err';S.src.bitvavo.msg='WebSocket niet beschikbaar';return}
  S.ws=ws;
  ws.onopen=()=>{S.wsReady=true;subscribeLive();S.src.bitvavo.msg='Live verbonden';S.src.bitvavo.st=S.crypto.size?'ok':'wait';UI.paint()};
  ws.onmessage=e=>{
    let m;try{m=JSON.parse(e.data)}catch(x){return}
    if(m.action&&m.response!==undefined||m.action&&m.error){
      let key=m.requestId;
      if(key==null||!S.wsQ.has(key)){for(const [k,v] of S.wsQ){if(v.act===m.action&&(!v.mk||v.mk===m.market)){key=k;break}}}
      const q=S.wsQ.get(key);if(q){S.wsQ.delete(key);m.error?q.rej(new Error(m.error)):q.res(m.response)}
      return;
    }
    if(m.event==='ticker24h'&&Array.isArray(m.data))m.data.forEach(d=>applyTicker(d,true));
    else if(m.event==='ticker'&&m.market&&m.lastPrice){const a=byMarket(m.market);if(a){a.price=+m.lastPrice;a.ch24=a.open?(a.price/a.open-1)*100:a.ch24;a.ts=Date.now();pushTick(a);S.src.bitvavo.ts=Date.now();UI.tick(a)}}
  };
  ws.onclose=()=>{S.wsReady=false;S.src.bitvavo.st='warn';S.src.bitvavo.msg='Verbinding verbroken, opnieuw verbinden…';UI.paint();setTimeout(connectWS,5000)};
  ws.onerror=()=>{S.src.bitvavo.msg='Fout in live-verbinding'};
}
function subscribeLive(){
  if(!S.wsReady)return;const mk=[...S.crypto.values()].filter(a=>a.deep).map(a=>a.market);if(!mk.length)return;
  S.ws.send(JSON.stringify({action:'subscribe',channels:[{name:'ticker24h',markets:mk},{name:'ticker',markets:mk.slice(0,25)}]}));
}
const byMarket=m=>S.crypto.get(m.split('-')[0]);
function pushTick(a){const t=Date.now();const k=a.ticks;if(!k.length||t-k[k.length-1][0]>5000){k.push([t,a.price]);if(k.length>720)k.shift()}}
function applyTicker(d,live){
  if(!d||!d.market||!/-EUR$/.test(d.market)||d.last==null)return;
  const sym=d.market.split('-')[0];let a=S.crypto.get(sym);
  if(!a){a={kind:'crypto',sym,name:S.names[sym]||sym,market:d.market,cur:'EUR',ticks:[],m:{},deep:false,cd:null,hr:null,news:[]};S.crypto.set(sym,a)}
  const prev=a.price;
  a.price=+d.last;a.open=+d.open||null;a.high=+d.high||null;a.low=+d.low||null;a.volQ=+d.volumeQuote||0;
  a.ch24=a.open?(a.price/a.open-1)*100:null;a.ts=+d.timestamp||Date.now();
  if(live){pushTick(a);S.src.bitvavo.ts=Date.now();S.src.bitvavo.st='ok';if(prev!==a.price)UI.tick(a,prev)}
}
async function loadTickers(){
  try{
    const list=await bv('/ticker/24h');list.forEach(d=>applyTicker(d,false));
    S.src.bitvavo.st='ok';S.src.bitvavo.ts=Date.now();S.src.bitvavo.msg=S.restOK?'REST + live WebSocket':'Live WebSocket';
    const ranked=[...S.crypto.values()].filter(a=>!CFG.STABLE.has(a.sym)&&a.volQ>0).sort((x,y)=>y.volQ-x.volQ);
    ranked.forEach((a,i)=>a.rank=i+1);
    ranked.slice(0,CFG.DEEP).forEach(a=>a.deep=true);
    if(!S.crypto.has('BTC'))throw new Error('BTC-EUR ontbreekt');
    S.crypto.get('BTC').deep=true;if(S.crypto.has('ETH'))S.crypto.get('ETH').deep=true;
    subscribeLive();
  }catch(e){S.src.bitvavo.st='err';S.src.bitvavo.msg='Koersen niet bereikbaar ('+e.message+'). Er worden geen koersen getoond.'}
  UI.paint();
}
async function loadNames(){try{const l=await bv('/assets');l.forEach(x=>S.names[x.symbol]=x.name);S.crypto.forEach(a=>{if(S.names[a.sym])a.name=S.names[a.sym]})}catch(e){}}
function parseC(rows){return rows.map(r=>({t:+r[0],o:+r[1],h:+r[2],l:+r[3],c:+r[4],v:+r[5]})).sort((x,y)=>x.t-y.t)}
async function loadCandles(){
  const deep=[...S.crypto.values()].filter(a=>a.deep).sort((x,y)=>(x.rank||99)-(y.rank||99));
  let ok=0;
  await pool(deep,6,async a=>{const r=await bv(`/${a.market}/candles?interval=1d&limit=32`);a.cd=parseC(r).filter(c=>c.t+DAY<=Date.now());ok++});
  await pool(deep.slice(0,CFG.HOURLY),4,async a=>{const r=await bv(`/${a.market}/candles?interval=1h&limit=26`);a.hr=parseC(r)});
  S.src.candles.st=ok?'ok':'err';S.src.candles.ts=Date.now();S.src.candles.msg=ok?`${ok} markten, 30 dagen historie`:'Historie niet beschikbaar';
  recalc();
}
async function loadHourlyFor(a){if(a.kind!=='crypto'||a.hr)return;try{a.hr=parseC(await bv(`/${a.market}/candles?interval=1h&limit=26`));if(!a.cd){a.cd=parseC(await bv(`/${a.market}/candles?interval=1d&limit=32`)).filter(c=>c.t+DAY<=Date.now());a.deep=true;subscribeLive()}recalc()}catch(e){}}

/* =====================================================================
   METRIEKEN PER ASSET
   ===================================================================== */
function metrics(a,btc){
  const c=a.cd;if(!c||c.length<10||a.price==null)return a.m={};
  const cl=c.map(x=>x.c),rets=[];for(let i=1;i<cl.length;i++)rets.push(Math.log(cl[i]/cl[i-1]));
  const vol=sd(rets)*100;
  const avgVolQ=mean(c.slice(-30).map(x=>x.v*x.c));
  const n=cl.length,ref7=cl[Math.max(0,n-7)];
  const m={vol,rets,avgVolQ,volRatio:avgVolQ?a.volQ/avgVolQ:null,
    ch7:(a.price/ref7-1)*100,ch30:(a.price/cl[0]-1)*100,
    hi30:Math.max(...c.map(x=>x.h)),lo30:Math.min(...c.map(x=>x.l)),
    sma20:mean(cl.slice(-20)),rsi:rsi(cl.concat([a.price])),
    z24:vol&&a.ch24!=null?a.ch24/vol:null,
    range:a.high&&a.low?(a.high-a.low)/a.price*100:null,avgRange:mean(c.slice(-20).map(x=>(x.h-x.l)/x.c*100))};
  m.rangeRatio=m.range&&m.avgRange?m.range/m.avgRange:null;
  m.devSma=(a.price/m.sma20-1)*100;
  if(btc&&btc!==a&&btc.m&&btc.m.rets){const map=new Map(btc.cd.slice(1).map((x,i)=>[x.t,btc.m.rets[i]]));const A=[],B=[];c.slice(1).forEach((x,i)=>{if(map.has(x.t)){A.push(rets[i]);B.push(map.get(x.t))}});m.corr=corr(A,B);m.beta=beta(A,B)}
  else if(btc===a){m.corr=1;m.beta=1}
  if(a.hr&&a.hr.length>4){const h=a.hr,last=a.price,ago3=h[Math.max(0,h.length-4)].c;const mv24=a.open?last-a.open:0;m.ch3h=(last/ago3-1)*100;m.speed=mv24?clamp(Math.abs(last-ago3)/Math.abs(mv24),0,1):null}
  const t=a.ticks;if(t.length>3){const now=Date.now();let ref=null;for(let i=t.length-1;i>=0;i--){if(now-t[i][0]>=15*MIN){ref=t[i][1];break}}if(ref)m.ch15=(a.price/ref-1)*100}
  return a.m=m;
}

/* =====================================================================
   SENTIMENT — vaste weging, uitleg per factor
   ===================================================================== */
const SL=[[40,'Bullish','s2'],[15,'Slightly Bullish','s1'],[-15,'Neutral','s0'],[-40,'Slightly Bearish','sm1'],[-101,'Bearish','sm2']];
function slabel(s){if(s==null)return {l:'Onvoldoende data',c:'sna'};for(const [t,l,c] of SL)if(s>=t||(t===-15&&s>-15))return {l,c};return {l:'Bearish',c:'sm2'}}
function blend(parts){const P=parts.filter(p=>p&&p.v!=null&&isFinite(p.v));if(!P.length)return null;const w=sum(P.map(p=>p.w));const score=100*sum(P.map(p=>p.w*p.v))/w;
  const reasons=P.map(p=>({...p,imp:p.w*p.v/w})).sort((x,y)=>Math.abs(y.imp)-Math.abs(x.imp));return {score,reasons,...slabel(score)}}
function newsTone(sym,hours=24){const cut=Date.now()-hours*HOUR;const cl=S.clusters.filter(c=>c.t>=cut&&(!sym||c.assets.includes(sym)));if(!cl.length)return {n:0,tone:null};return {n:cl.length,tone:mean(cl.map(c=>c.tone)),cl}}
function sentiAsset(a){
  const m=a.m;
  if(a.kind==='stock'){
    if(a.ch24==null)return null;const spy=ETFQ.get('SPY');const nt=newsTone(a.sym,48);
    return blend([{w:.5,v:clamp(a.ch24/2.5,-1,1),t:`Dagkoers ${pct(a.ch24)}`},
      spy&&spy.dp!=null?{w:.3,v:clamp((a.ch24-spy.dp)/2.5,-1,1),t:`${a.ch24-spy.dp>=0?'Sterker':'Zwakker'} dan de S&P 500 (${pct(spy.dp)})`}:null,
      nt.n>=2?{w:.2,v:nt.tone,t:`${nt.n} nieuwsclusters, toon ${toneTxt(nt.tone)}`}:null]);
  }
  if(!m||!m.vol)return null;
  const nt=newsTone(a.sym);
  const parts=[
    {w:.30,v:clamp(m.z24/2,-1,1),t:`24 uur ${pct(a.ch24)}: ${nlN(Math.abs(m.z24),1)}× de normale dagbeweging (${nlN(m.vol,1)}%)`},
    {w:.25,v:clamp((m.ch7/100)/(m.vol/100*Math.sqrt(7))/2,-1,1),t:`Trend 7 dagen ${pct(m.ch7)}`},
    {w:.15,v:m.volRatio>1.15?Math.sign(a.ch24)*clamp((m.volRatio-1)/1.5,0,1):0,t:`Volume ${nlN(m.volRatio,1)}× het 30-daags gemiddelde${m.volRatio>1.15?(a.ch24>=0?', bevestigt de stijging':', bevestigt de daling'):', geen bevestiging'}`},
    {w:.15,v:clamp(m.devSma/(3*m.vol),-1,1),t:`Koers ${m.devSma>=0?'boven':'onder'} het 20-daags gemiddelde (${pct(m.devSma)})`},
    nt.n>=2?{w:.15,v:nt.tone,t:`${nt.n} nieuwsclusters in 24 uur, toon ${toneTxt(nt.tone)}`}:null];
  return blend(parts);
}
function toneTxt(t){return t==null?'onbekend':t>.25?'overwegend positief':t<-.25?'overwegend negatief':'gemengd'}
function sentiCrypto(){
  const D=deepList();if(D.length<5)return null;const btc=S.crypto.get('BTC');const mk=S.market;const nt=newsTone(null);
  return blend([
    {w:.25,v:2*mk.breadth-1,t:`${Math.round(mk.breadth*100)}% van de top-${D.length} stijgt in 24 uur`},
    btc.m.vol?{w:.25,v:clamp(mk.vw/(2*btc.m.vol),-1,1),t:`Volumegewogen marktbeweging ${pct(mk.vw)}`}:null,
    btc.m.ch7!=null?{w:.2,v:clamp((btc.m.ch7/100)/(btc.m.vol/100*Math.sqrt(7))/2,-1,1),t:`Bitcoin 7 dagen ${pct(btc.m.ch7)}`}:null,
    {w:.1,v:mk.volRegime>1.15?Math.sign(mk.vw)*clamp((mk.volRegime-1)/1.5,0,1):0,t:`Totaal handelsvolume ${nlN(mk.volRegime,2)}× normaal`},
    nt.n>=3?{w:.2,v:nt.tone,t:`Cryptonieuws (${nt.n} clusters): toon ${toneTxt(nt.tone)}`}:null]);
}
function sentiStocks(){
  const idx=['SPY','QQQ','DIA','IWM'].map(s=>ETFQ.get(s)).filter(x=>x&&x.dp!=null);if(!idx.length)return null;
  const sec=ETFS.filter(e=>e[2]==='Sector').map(e=>ETFQ.get(e[0])).filter(x=>x&&x.dp!=null);
  const nt=newsTone('__macro',24);
  return blend([{w:.5,v:clamp(mean(idx.map(x=>x.dp))/1.5,-1,1),t:`Indices gemiddeld ${pct(mean(idx.map(x=>x.dp)))} vandaag (S&P, Nasdaq, Dow, Russell)`},
    sec.length?{w:.3,v:2*(sec.filter(x=>x.dp>0).length/sec.length)-1,t:`${sec.filter(x=>x.dp>0).length} van ${sec.length} sectoren in de plus`}:null,
    nt.n>=2?{w:.2,v:nt.tone,t:`Macronieuws: toon ${toneTxt(nt.tone)}`}:null]);
}
function trackSenti(key,name,s){
  if(!s)return;const prev=S.sentiPrev[key];
  if(S.src.candles.st!=='ok')return;
  if(!prev){S.sentiPrev[key]=s.l;return}
  if(prev===s.l){delete S.sentiCand[key];return}
  const c=S.sentiCand[key];
  if(c&&c.l===s.l&&++c.n>=2&&Date.now()-c.since>=90000){
    S.sentiLog.unshift({t:Date.now(),key,name,from:prev,to:s.l,why:s.reasons.slice(0,2).map(r=>r.t)});S.sentiLog=S.sentiLog.slice(0,60);
    S.sentiPrev[key]=s.l;delete S.sentiCand[key];LS.set('sentilog',S.sentiLog);
    if(['overall','crypto','stocks','BTC','ETH'].includes(key)||S.watch.includes(key))Alerts.push({id:'senti:'+key+':'+Date.now(),cat:'market',score:55,title:`Sentiment ${name}: ${prev} → ${s.l}`,body:s.reasons[0]?.t||'',href:key.length<7&&key!=='crypto'&&key!=='stocks'&&key!=='overall'?'#asset-'+key.toLowerCase():'#overzicht'});
  }else if(!c||c.l!==s.l)S.sentiCand[key]={l:s.l,n:1,since:Date.now()};
  LS.set('sentiprev',S.sentiPrev);
}

/* =====================================================================
   CSA IMPACT SCORE — vaste methode
   I = 100 × (0,25·M + 0,15·B + 0,15·V + 0,15·R + 0,10·S + 0,10·H + 0,10·Q)
   ===================================================================== */
const IW=[['M','Omvang / onverwachtheid',.25,'Beweging gedeeld door de normale 30-daagse dagbeweging (z-score/4, max 1). Bij gepland nieuws: verwachte verrassing.'],
  ['B','Breedte',.15,'Aandeel van de gevolgde markten dat dezelfde kant op beweegt, of hoeveel assets het nieuws raakt.'],
  ['V','Volume',.15,'Handelsvolume t.o.v. het 30-daags gemiddelde ((ratio−1)/2, max 1).'],
  ['R','Relevantie',.15,'Gewicht van de asset in de markt (log van 24u-volume) of de rol van de gebeurtenis voor crypto en aandelen.'],
  ['S','Snelheid',.10,'Deel van de 24u-beweging dat in de laatste 3 uur gebeurde.'],
  ['H','Historische invloed',.10,'Basiswaarde per type gebeurtenis (bijv. Fed-besluit 0,90, CPI 0,85, hack 0,75). Te kalibreren met historische reacties.'],
  ['Q','Betrouwbaarheid',.10,'Beursdata of officiële bron 1,0; nieuws: 1 bron 0,4, 2 bronnen 0,7, 3+ bronnen 0,9. Geruchten −0,2.']];
function impact(f){const parts=IW.map(([k,n,w])=>({k,n,w,v:clamp(f[k]??0,0,1)}));const score=Math.round(100*sum(parts.map(p=>p.w*p.v)));return {score,parts,label:ilabel(score)}}
function ilabel(s){return s>=80?'Zeer hoge marktimpact':s>=60?'Hoge marktimpact':s>=40?'Gemiddelde marktimpact':s>=20?'Lage marktimpact':'Minimale marktimpact'}
const relOf=a=>clamp(Math.log10(Math.max(a.volQ||1,1)/1e5)/3,0,1);

/* =====================================================================
   NIEUWS — ophalen, ontdubbelen, classificeren
   ===================================================================== */
const POS=/\b(surge[sd]?|soar[sd]?|rall(y|ies|ied)|jump[sd]?|gain[sd]?|rise[sn]?|rising|record high|all-time high|bullish|approv(e|ed|al)|inflows?|beats?|upgrade[sd]?|partnership|adopt(s|ed|ion)?|launch(es|ed)?|rebound[sd]?|recover(s|y|ed)?|breakout|optimis(m|tic)|rate cuts?|easing|strong(er)?|boost(s|ed)?|climb[sd]?)\b/g;
const NEG=/\b(plunge[sd]?|crash(es|ed)?|drops?|dropped|fall(s|en)?|fell|slump[sd]?|tumble[sd]?|sink[s]?|sank|bearish|reject(s|ed|ion)?|outflows?|miss(es|ed)?|downgrade[sd]?|hack(s|ed)?|exploit(s|ed)?|breach|stolen|lawsuit|sues?|sued|ban(s|ned)?|fraud|probe|investigation|liquidat(ion|ions|ed)|sell-?off|fears?|warn(s|ing)|declin(e|es|ed)|loss(es)?|delay(s|ed)?|rate hikes?|tariffs?|sanctions?|recession|weak(er|ness)?|slide[sd]?)\b/g;
const CATS=[['security',/\b(hack(s|ed)?|exploit(s|ed)?|breach|stolen|drain(ed)?|attack(er)?s?|vulnerabilit)/i,.75],
  ['macro',/\b(fed|fomc|powell|interest rates?|rate (cut|hike|decision)|cpi|inflation|payrolls?|nfp|jobs report|unemployment|gdp|ecb|lagarde|treasur(y|ies)|yields?|pmi|recession)\b/i,.8],
  ['regulation',/\b(sec|regulat\w*|mica|cftc|lawsuit|court|bill|legislation|senate|congress|license|licence|stablecoin law)\b/i,.7],
  ['etf',/\b(etfs?|inflows?|outflows?)\b/i,.65],['earnings',/\b(earnings|revenue|quarterly|guidance|q[1-4] results|profit)\b/i,.6],
  ['geo',/\b(war|tariffs?|sanctions?|geopolit\w*|ukraine|russia|china|iran|israel|election)\b/i,.7],['whale',/\b(whales?|large transfer|moved \$?\d)/i,.5]];
const KIND=[['Gerucht',/\b(rumou?rs?|reportedly|sources say|people familiar|unconfirmed|allegedly|leak(ed)?)\b/i],
  ['Speculatie',/\b(price prediction|could (soar|crash|reach|hit|explode)|to \$?\d[\d,.]*k?\b|moon|might (hit|reach))/i],
  ['Verwachting',/\b(expect(s|ed)?|forecast|outlook|likely|anticipat\w*|projected|ahead of|poll|consensus|preview)\b/i],
  ['Interpretatie',/\b(analysis|opinion|why|what .{1,30} means|explained|here'?s|analyst|says)\b/i],
  ['Feit',/\b(falls|fell|drops?|dropped|rises|rose|jumps?|jumped|surges?|surged|slides?|exploited|drained|drains|hacked|approves|rejects|announce[sd]?|approved|launch(es|ed)?|file[sd]|reports?|reported|posted|rose|fell|closed|data show|signs|signed|complete[sd]|acquire[sd]?|lists?|listed|hit|hits)\b/i]];
const STOP=new Set('the a an and or of to in on for with as at by is are be was were from after over its it this that than new says say will could may us as into amid ahead its their his her what why how'.split(' '));
const toks=t=>new Set(t.toLowerCase().replace(/[^a-z0-9$ ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)));
function jacc(a,b){let i=0;a.forEach(x=>{if(b.has(x))i++});return i/(a.size+b.size-i||1)}
function toneOf(t){const p=(t.match(POS)||[]).length,n=(t.match(NEG)||[]).length;return p+n?(p-n)/(p+n):0}
function assetsOf(title,body){
  const out=new Set(),t=(' '+title+' '+(body||'').slice(0,400)+' ').toLowerCase();
  for(const [s,ws] of Object.entries(KW))if(ws.some(w=>new RegExp('\\b'+w.replace(/[.$]/g,'\\$&')+'\\b').test(t)))out.add(s);
  (title.match(SYMRX)||[]).forEach(s=>out.add(s));return [...out];
}
let rawNews=new Map();
function ingest(items){items.forEach(n=>{if(n&&n.title&&n.url&&!rawNews.has(n.id))rawNews.set(n.id,n)});
  const cut=Date.now()-3*DAY;for(const [k,v] of rawNews)if(v.t<cut)rawNews.delete(k);cluster()}
function cluster(){
  const items=[...rawNews.values()].sort((a,b)=>b.t-a.t);const cl=[];
  for(const n of items){n.tk=n.tk||toks(n.title);let hit=null;for(const c of cl){if(Math.abs(c.t-n.t)<36*HOUR&&jacc(c.tk,n.tk)>=.45){hit=c;break}}
    if(hit){hit.items.push(n);hit.sources.add(n.src);hit.firstT=Math.min(hit.firstT,n.t)}else cl.push({id:'n'+n.id,title:n.title,url:n.url,body:n.body,tk:n.tk,t:n.t,firstT:n.t,items:[n],sources:new Set([n.src])})}
  cl.forEach(c=>{const txt=c.items.map(i=>i.title+' '+(i.body||'').slice(0,300)).join(' ');
    c.tone=mean(c.items.map(i=>toneOf(i.title+' '+(i.body||'').slice(0,300))));
    c.assets=[...new Set(c.items.flatMap(i=>assetsOf(i.title,i.body)))];
    const cat=CATS.find(([,rx])=>rx.test(txt));c.cat=cat?cat[0]:'general';c.H=cat?cat[2]:.4;
    if(c.cat==='macro')c.assets.push('__macro');
    c.kind=(KIND.find(([,rx])=>rx.test(c.title))||['Interpretatie'])[0];
    const ns=c.sources.size;c.Q=clamp((ns>=3?.9:ns===2?.7:.4)-(c.kind==='Gerucht'?.2:0)-(c.kind==='Speculatie'?.1:0),0,1);
  });
  S.clusters=cl;
}
async function loadCC(){
  try{const r=await fetch(CFG.CC,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();
    const d=Array.isArray(j.Data)?j.Data:[];if(!d.length)throw new Error(j.Message||'leeg antwoord');
    ingest(d.map(x=>({id:'cc'+x.id,title:x.title,body:x.body,url:x.url,src:(x.source_info&&x.source_info.name)||x.source||'Onbekend',t:x.published_on*1000,feed:'CryptoCompare'})));
    S.src.cc.st='ok';S.src.cc.ts=Date.now();S.src.cc.msg=d.length+' artikelen opgehaald';
  }catch(e){S.src.cc.st='err';S.src.cc.msg='Niet bereikbaar ('+e.message+')'}
}
/* ---------- Finnhub (optioneel, met eigen gratis sleutel) ---------- */
async function fh(path){const k=S.settings.fhKey;if(!k)throw new Error('geen sleutel');const r=await fetch(`${CFG.FH}${path}${path.includes('?')?'&':'?'}token=${encodeURIComponent(k)}`);if(r.status===401||r.status===403)throw new Error('sleutel ongeldig');if(r.status===429)throw new Error('limiet bereikt');if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
async function loadFHNews(){
  if(!S.settings.fhKey)return;
  try{for(const cat of ['general','crypto']){const l=await fh('/news?category='+cat);ingest((l||[]).slice(0,80).map(x=>({id:'fh'+x.id,title:x.headline,body:x.summary,url:x.url,src:x.source||'Finnhub',t:x.datetime*1000,feed:'Finnhub'})))}}catch(e){}
}
async function loadStocks(){
  if(!S.settings.fhKey){S.src.fh.st='off';S.src.fh.msg='Niet gekoppeld: vul een gratis Finnhub-sleutel in bij Instellingen';return}
  let ok=0,err='';
  const syms=[...ETFS.map(e=>e[0]),...STOCKS.filter(s=>s[4]).map(s=>s[0])];
  for(const s of syms){
    try{const q=await fh('/quote?symbol='+s);if(q&&q.c){const o={price:q.c,dp:q.dp,d:q.d,open:q.o,high:q.h,low:q.l,prev:q.pc,ts:q.t*1000};
      if(S.stocks.has(s)){const a=S.stocks.get(s);Object.assign(a,{price:q.c,ch24:q.dp,open:q.o,high:q.h,low:q.l,prev:q.pc,ts:q.t*1000})}else ETFQ.set(s,o);ok++}}
    catch(e){err=e.message;if(/sleutel|limiet/.test(err))break}
    await sleep(1100);
  }
  S.src.fh.st=ok?'ok':'err';S.src.fh.ts=Date.now();S.src.fh.msg=ok?`${ok} koersen opgehaald`+(err?` (deels: ${err})`:''):'Fout: '+err;
  recalc();
}
async function loadEarnings(){
  if(!S.settings.fhKey)return;
  try{const f=new Date(),t=new Date(Date.now()+21*DAY);const iso=d=>d.toISOString().slice(0,10);
    const j=await fh(`/calendar/earnings?from=${iso(f)}&to=${iso(t)}`);const set=new Set(STOCKS.map(s=>s[0]));
    Radar.earnings=(j.earningsCalendar||[]).filter(e=>set.has(e.symbol)).map(e=>({id:'earn-'+e.symbol+e.date,type:'EARN',reg:'VS',sym:e.symbol,
      t:new Date(e.date+(e.hour==='bmo'?'T13:00:00Z':e.hour==='amc'?'T21:15:00Z':'T16:00:00Z')).getTime(),
      title:`Kwartaalcijfers ${S.stocks.get(e.symbol)?.name||e.symbol}`,exp:e.epsEstimate!=null?'EPS '+nlN(e.epsEstimate,2):null,act:e.epsActual!=null?'EPS '+nlN(e.epsActual,2):null,src:'Finnhub',hour:e.hour}));
  }catch(e){}
}
async function loadCompanyNews(a){
  if(!S.settings.fhKey||a.kind!=='stock'||!a.fh||a.newsLoaded)return;
  try{const f=new Date(Date.now()-7*DAY).toISOString().slice(0,10),t=new Date().toISOString().slice(0,10);
    const l=await fh(`/company-news?symbol=${a.sym}&from=${f}&to=${t}`);a.newsLoaded=true;
    ingest((l||[]).slice(0,40).map(x=>({id:'fh'+x.id,title:x.headline,body:x.summary,url:x.url,src:x.source,t:x.datetime*1000,feed:'Finnhub'})));
    S.clusters.forEach(c=>{if(c.items.some(i=>l.some(x=>'fh'+x.id===i.id))&&!c.assets.includes(a.sym))c.assets.push(a.sym)});
  }catch(e){}
}

/* =====================================================================
   MARKT, GEBEURTENISSEN EN IMPACT
   ===================================================================== */
const deepList=()=>[...S.crypto.values()].filter(a=>a.deep&&a.price!=null&&!CFG.STABLE.has(a.sym));
const allAssets=()=>[...S.crypto.values()].filter(a=>a.price!=null&&!CFG.STABLE.has(a.sym)).concat([...S.stocks.values()]);
function getAsset(sym){sym=(sym||'').toUpperCase();return S.crypto.get(sym)||S.stocks.get(sym)||null}
function recalc(){
  const btc=S.crypto.get('BTC');if(!btc)return;
  metrics(btc,btc);deepList().forEach(a=>{if(a!==btc)metrics(a,btc)});
  const D=deepList().filter(a=>a.ch24!=null);
  if(D.length){const w=sum(D.map(a=>a.volQ));S.market={breadth:D.filter(a=>a.ch24>0).length/D.length,vw:sum(D.map(a=>a.ch24*a.volQ))/w,
    volRegime:sum(D.map(a=>a.volQ))/(sum(D.map(a=>a.m.avgVolQ||a.volQ))||1),n:D.length,
    zMove:btc.m.vol?(sum(D.map(a=>a.ch24*a.volQ))/w)/btc.m.vol:0}}
  // sentiment
  const c=sentiCrypto(),s=sentiStocks();
  S.senti.crypto=c;S.senti.stocks=s;
  [...S.crypto.values()].filter(a=>a.deep).forEach(a=>a.s=sentiAsset(a));
  S.stocks.forEach(a=>a.s=sentiAsset(a));
  S.senti.BTC=btc.s;S.senti.ETH=S.crypto.get('ETH')?.s||null;
  const ov=[c&&{w:s?.5:1,v:c.score/100,t:'Crypto: '+c.l},s&&{w:c?.5:1,v:s.score/100,t:'Aandelen: '+s.l}].filter(Boolean);
  S.senti.overall=ov.length?blend(ov):null;
  if(S.senti.overall){S.senti.overall.reasons=[...(c?c.reasons.slice(0,2):[]),...(s?s.reasons.slice(0,2):[])].sort((x,y)=>Math.abs(y.imp)-Math.abs(x.imp))}
  trackSenti('overall','markt totaal',S.senti.overall);trackSenti('crypto','crypto',c);trackSenti('stocks','aandelen',s);
  deepList().forEach(a=>trackSenti(a.sym,a.name,a.s));S.stocks.forEach(a=>{if(a.price!=null)trackSenti(a.sym,a.name,a.s)});
  detect();S.lastCalc=Date.now();UI.paint();
}
function correlated(a,n=4){return deepList().filter(x=>x!==a&&x.m.corr!=null&&x.m.corr>.7).sort((x,y)=>y.volQ-x.volQ).slice(0,n).map(x=>x.sym)}
function addEvent(e){
  const old=S.events.get(e.id);e.first=old?old.first:Date.now();e.updated=Date.now();S.events.set(e.id,e);
  if(!old)Alerts.consider(e);
}
function detect(){
  const now=Date.now(),day=new Date().toISOString().slice(0,10),hour=new Date().toISOString().slice(0,13);
  const mk=S.market,D=deepList();
  D.forEach(a=>{
    const m=a.m;if(!m.vol)return;
    const sameDir=D.filter(x=>x.ch24!=null&&Math.sign(x.ch24)===Math.sign(a.ch24)&&x.m.z24!=null&&Math.abs(x.m.z24)>1).length/D.length;
    const B=a.sym==='BTC'||a.sym==='ETH'?Math.max(sameDir,.5):(m.corr>.7?sameDir*.8:.2);
    const base={asset:a.sym,assets:[a.sym,...correlated(a)],src:['Bitvavo (beursdata)'],Q:1};
    const dir=a.ch24>=0?1:-1;
    if(m.z24!=null&&Math.abs(m.z24)>=2){
      const f={M:Math.abs(m.z24)/4,B,V:(m.volRatio-1)/2,R:relOf(a),S:m.speed??.3,H:.6,Q:1};
      addEvent(build('move',a,f,{...base,id:`move:${a.sym}:${day}`,dir,cat:'move'}));
    }
    if(m.volRatio>=2.2&&a.volQ>2e5){
      const f={M:Math.abs(m.z24||0)/4,B,V:(m.volRatio-1)/2,R:relOf(a),S:m.speed??.3,H:.5,Q:1};
      addEvent(build('volume',a,f,{...base,id:`volume:${a.sym}:${day}`,dir:Math.abs(a.ch24)<.5?0:dir,cat:'volume'}));
    }
    if(a.price>m.hi30||a.price<m.lo30){const up=a.price>m.hi30;
      const f={M:Math.max(.35,Math.abs(m.z24||0)/4),B,V:(m.volRatio-1)/2,R:relOf(a),S:m.speed??.3,H:.55,Q:1};
      addEvent(build(up?'breakout':'breakdown',a,f,{...base,id:`brk:${a.sym}:${day}`,dir:up?1:-1,cat:'breakout'}));
    }
    if(m.ch15!=null&&Math.abs(m.ch15)>=Math.max(1.5,m.vol*.6)){
      const f={M:Math.abs(m.ch15)/m.vol/2,B,V:(m.volRatio-1)/2,R:relOf(a),S:1,H:.55,Q:1};
      addEvent(build('sudden',a,f,{...base,id:`sudden:${a.sym}:${hour}`,dir:m.ch15>0?1:-1,cat:'sudden'}));
    }
  });
  if(mk.n&&(mk.breadth>=.8||mk.breadth<=.2)&&Math.abs(mk.zMove)>=1){
    const btc=S.crypto.get('BTC');const f={M:Math.abs(mk.zMove)/3,B:Math.max(mk.breadth,1-mk.breadth),V:(mk.volRegime-1)/2,R:1,S:btc.m.speed??.3,H:.8,Q:1};
    addEvent(build('market',btc,f,{id:`market:${day}`,asset:null,assets:['BTC','ETH','SOL','XRP','COIN','MSTR'],src:['Bitvavo (beursdata)'],dir:mk.vw>0?1:-1,cat:'market',Q:1}));
  }
  S.clusters.filter(c=>now-c.t<24*HOUR&&(c.cat!=='general'||c.sources.size>=2)&&c.assets.filter(x=>x!=='__macro').length+(c.cat==='macro'?2:0)>0).slice(0,40).forEach(c=>{
    const as=c.assets.filter(x=>x!=='__macro');const big=as.some(x=>['BTC','ETH','NVDA','AAPL','MSFT'].includes(x));
    const f={M:clamp(Math.abs(c.tone)*.6+(c.sources.size>=2?.2:0),0,1),B:c.cat==='macro'?.9:clamp(as.length/6,.15,1),V:.3,R:c.cat==='macro'||big?1:.5,S:clamp(1-(now-c.firstT)/(12*HOUR),.1,1),H:c.H,Q:c.Q};
    addEvent(build('news',null,f,{id:'news:'+c.id,assets:c.cat==='macro'&&!as.length?['BTC','ETH','SPY','QQQ']:as,cl:c,dir:c.tone>.2?1:c.tone<-.2?-1:0,cat:c.cat==='general'?'watchnews':c.cat,src:[...c.sources],Q:c.Q,t:c.t}));
  });
  const cut=now-2*DAY;for(const [k,e] of S.events)if(e.first<cut)S.events.delete(k);
}
const CATTXT={macro:'Macro-economische publicaties en centrale banken veranderen renteverwachtingen; dat raakt risicovolle beleggingen zoals tech-aandelen en crypto tegelijk.',
  regulation:'Regelgeving bepaalt wie mag handelen en hoe; dat kan toegang, liquiditeit en vertrouwen in een hele sector veranderen.',
  security:'Beveiligingsincidenten raken vertrouwen en kunnen tot directe verkoopdruk leiden bij de getroffen tokens en platformen.',
  etf:'ETF-stromen tonen wat institutionele beleggers doen; aanhoudende in- of uitstroom werkt vaak door in de koers.',
  earnings:'Kwartaalcijfers en vooruitzichten herwaarderen een bedrijf en soms de hele sector.',
  geo:'Geopolitieke spanningen verhogen onzekerheid; beleggers schuiven dan vaak van risicovolle naar veilige beleggingen.',
  whale:'Grote transacties kunnen wijzen op aan- of verkopen door grote partijen; de bedoeling is meestal niet bekend.',
  watchnews:'Dit nieuws wordt door meerdere bronnen gemeld en noemt assets die je volgt.'};
function build(type,a,f,x){
  const I=impact(f),m=a&&a.m||{},nm=a?a.name:'';const lv=a&&m.lo30?{lo:m.lo30,hi:m.hi30,sma:m.sma20}:null;
  const e={...x,type,I,score:I.score,factors:f,t:x.t||Date.now()};
  const up=x.dir>0,dn=x.dir<0;
  if(type==='news'){const c=x.cl;
    e.title=c.title;e.what=`${c.sources.size} bron${c.sources.size>1?'nen':''} (${[...c.sources].slice(0,3).join(', ')}) meld${c.sources.size>1?'en':'t'} dit. Type bericht: ${c.kind.toLowerCase()}.`;
    e.why=CATTXT[c.cat]||'Dit nieuws noemt assets die je volgt en wordt opgepakt door de markt.';
    e.pos=up?'De toon van de berichtgeving is positief; bevestiging door koers en volume zou het effect versterken.':'Als de markt het nieuws al had ingeprijsd, kan het effect beperkt blijven.';
    e.neg=dn?'De toon is negatief; zonder tegenbericht kan dit verkoopdruk geven bij de genoemde assets.':'Als het bericht later wordt tegengesproken of afgezwakt, verdwijnt de basis voor de beweging.';
    e.scen=['Bull: bericht wordt bevestigd en de genoemde assets stijgen met hoger volume.','Bear: onzekerheid neemt toe of het nieuws valt tegen; verkoopdruk bij de genoemde assets.','Neutraal: markt had dit verwacht; koers blijft binnen de normale dagbeweging.'];
    e.rel=`${c.Q>=.85?'Hoog':c.Q>=.6?'Gemiddeld':'Laag'}: ${c.sources.size} onafhankelijke bron${c.sources.size>1?'nen':''}, gelabeld als "${c.kind}". ${c.kind==='Gerucht'?'Nog niet bevestigd.':''}`;
    return e}
  const ZT=m.z24!=null?`${nlN(Math.abs(m.z24),1)}× de normale dagbeweging`:'';
  if(type==='move'){e.title=`${nm} ${up?'stijgt':'daalt'} ${pct(Math.abs(a.ch24)).replace('+','')} in 24 uur`;
    e.what=`${nm} beweegt ${pct(a.ch24)} in 24 uur, ${ZT} (30-daags: ${nlN(m.vol,1)}% per dag).`;
    e.why=`Een beweging van meer dan 2× de normale dagbeweging is statistisch ongewoon.${a.sym==='BTC'?' Bitcoin stuurt vaak de hele cryptomarkt.':m.corr>.7?' Deze asset beweegt sterk mee met Bitcoin (correlatie '+nlN(m.corr,2)+').':''}`}
  if(type==='volume'){e.title=`Ongebruikelijk handelsvolume in ${nm}`;e.what=`Volume 24 uur: ${big(a.volQ)}, ${nlN(m.volRatio,1)}× het 30-daags gemiddelde. Koers ${pct(a.ch24)}.`;
    e.why='Een volumepiek betekent dat er veel meer gehandeld wordt dan normaal; vaak gaat dat vooraf aan of samen met een grotere koersbeweging.'}
  if(type==='breakout'||type==='breakdown'){const u=type==='breakout';e.title=`${nm} ${u?'breekt boven het 30-daags hoogste punt':'zakt onder het 30-daags laagste punt'}`;
    e.what=`Koers ${money(a,a.price)} ligt ${u?'boven':'onder'} de 30-daagse ${u?'top':'bodem'} van ${money(a,u?m.hi30:m.lo30)}.`;
    e.why='Technische beleggers letten op deze niveaus; een doorbraak kan extra kopers of verkopers activeren, maar valse doorbraken komen ook vaak voor.'}
  if(type==='sudden'){e.title=`Plotselinge beweging: ${nm} ${pct(m.ch15)} in 15 minuten`;e.what=`${nm} bewoog ${pct(m.ch15)} in het afgelopen kwartier (live Bitvavo-ticks).`;
    e.why='Snelle bewegingen wijzen vaak op een gebeurtenis, grote order of liquidaties. CSA controleert of er nieuws bij hoort.'}
  if(type==='market'){const mk=S.market;e.title=`Brede cryptomarkt ${mk.vw>0?'in de plus':'onder druk'}: ${Math.round((mk.vw>0?mk.breadth:1-mk.breadth)*100)}% beweegt mee`;
    e.what=`${Math.round(mk.breadth*100)}% van de top-${mk.n} stijgt; volumegewogen ${pct(mk.vw)}. Handelsvolume ${nlN(mk.volRegime,2)}× normaal.`;
    e.why='Als bijna alles dezelfde kant op gaat, is de oorzaak meestal marktbreed (macro, liquiditeit of Bitcoin) en niet asset-specifiek.'}
  e.pos=up?`Houdt ${nm||'de markt'} dit niveau${lv?' boven '+money(a,lv.sma)+' (20d-gemiddelde)':''} met stabiel volume, dan kan de trend doorzetten${lv?' richting '+money(a,lv.hi):''}.`:`Bij afnemende verkoopdruk${lv?' en steun rond '+money(a,lv.lo):''} kan een herstel volgen.`;
  e.neg=up?`Valt het volume terug, dan kan de stijging snel worden teruggegeven${lv?' richting '+money(a,lv.sma):''}.`:`Zakt de koers${lv?' onder '+money(a,lv.lo):''} met hoog volume, dan kan de daling versnellen.`;
  e.scen=[`Bull: herstel/voortzetting boven ${lv?money(a,lv.sma):'het huidige niveau'} met bevestigend volume.`,`Bear: doorbraak ${lv?'onder '+money(a,lv.lo):'naar beneden'} en bredere marktzwakte.`,`Neutraal: consolidatie tussen ${lv?money(a,lv.lo)+' en '+money(a,lv.hi):'de recente uitersten'}.`];
  e.rel='Hoog: directe beursdata van Bitvavo, berekend op 30 dagen historie. De oorzaak van de beweging is hiermee nog niet bekend; zie "Waarom beweegt dit?".';
  return e;
}

/* =====================================================================
   WAAROM BEWEEGT DIT? — controlelijst + gerangschikte oorzaken
   ===================================================================== */
function whyMoving(a){
  const m=a.m||{},checks=[],causes=[];const mk=S.market,btc=S.crypto.get('BTC');
  const isC=a.kind==='crypto';const ch=a.ch24;
  if(ch==null)return {checks:[],causes:[],unknown:true,conf:'—',summary:'Geen koersdata beschikbaar.'};
  const nt=newsTone(a.sym,24);const cl=(nt.cl||[]).sort((x,y)=>y.sources.size-x.sources.size||y.t-x.t);
  const macro=S.clusters.filter(c=>Date.now()-c.t<24*HOUR&&c.cat==='macro');
  const recent=Radar.all().filter(e=>e.t<Date.now()&&Date.now()-e.t<26*HOUR&&e.type!=='EARN');
  // 1 nieuws
  const relNews=cl.filter(c=>Math.sign(c.tone)===Math.sign(ch)&&Math.abs(c.tone)>.15);
  checks.push({q:'Is er belangrijk nieuws?',st:cl.length?'y':(S.src.cc.st==='ok'||S.src.fh.st==='ok')?'n':'u',
    d:cl.length?`${cl.length} nieuwscluster(s) over ${a.name} in 24 uur; ${relNews.length} met een toon die past bij de beweging.`:(S.src.cc.st==='ok'||S.src.fh.st==='ok')?'Geen nieuws over deze asset gevonden in de gekoppelde bronnen.':'Nieuwsbron niet bereikbaar, dus niet te controleren.'});
  if(relNews.length)causes.push({k:'Asset-specifiek nieuws',w:clamp(.25+.15*relNews.length+.1*Math.max(...relNews.map(c=>c.sources.size)),0,.9),d:relNews[0].title,src:relNews.slice(0,3)});
  // 2 macro
  checks.push({q:'Is er macro-economische data gepubliceerd?',st:recent.length||macro.length?'y':'n',d:recent.length?recent.map(e=>`${e.title} (${dmy(e.t)} ${hhmm(e.t)})`).join('; '):macro.length?`${macro.length} macro-berichten in 24 uur, o.a. "${macro[0].title}"`:'Geen grote publicatie in de afgelopen 24 uur volgens de CSA-agenda.'});
  // 3 sentiment
  const sc=S.sentiLog.filter(l=>l.key===a.sym&&Date.now()-l.t<24*HOUR);
  checks.push({q:'Is het sentiment veranderd?',st:sc.length?'y':a.s?'n':'u',d:sc.length?`${sc[0].from} → ${sc[0].to} om ${hhmm(sc[0].t)}`:a.s?`Huidig: ${a.s.l}; geen omslag gemeten in deze sessie.`:'Onvoldoende data.'});
  // 4 volume
  if(isC&&m.volRatio){checks.push({q:'Is het handelsvolume afwijkend?',st:m.volRatio>=1.5?'y':'n',d:`${nlN(m.volRatio,1)}× het 30-daags gemiddelde (${big(a.volQ)} in 24 uur).`});
    if(m.volRatio>=1.5)causes.push({k:'Ongewoon veel handel',w:clamp((m.volRatio-1)/3,0,.5),d:`Volume ${nlN(m.volRatio,1)}× normaal: de beweging wordt gedragen door veel kopers/verkopers.`});}
  else checks.push({q:'Is het handelsvolume afwijkend?',st:'u',d:isC?'Historie nog niet geladen.':'Volumehistorie voor aandelen vereist een betaalde dataprovider (fase 2).'});
  // 5 hele markt
  if(isC&&btc&&mk.n){const exp=a===btc?mk.vw:(m.beta??1)*btc.ch24;const share=ch?clamp(exp/ch,0,1):0;
    checks.push({q:'Beweegt de hele markt?',st:Math.abs(mk.vw)>.8*(btc.m.vol||2)/2||mk.breadth>.75||mk.breadth<.25?'y':'n',d:`${Math.round(mk.breadth*100)}% van de top-${mk.n} stijgt; markt volumegewogen ${pct(mk.vw)}.${a!==btc&&m.corr!=null?` Correlatie met Bitcoin: ${nlN(m.corr,2)}, verwacht op basis van BTC: ${pct(exp)}.`:''}`});
    if(share>.25&&Math.sign(exp)===Math.sign(ch))causes.push({k:a===btc?'Marktbrede beweging':'Beweegt mee met Bitcoin/de markt',w:clamp(share*(a===btc?.8:Math.abs(m.corr||.5)),0,.9),d:a===btc?`De hele cryptomarkt beweegt (${pct(mk.vw)} gewogen).`:`Op basis van de beta (${nlN(m.beta,2)}) verklaart de Bitcoin-beweging ongeveer ${Math.round(share*100)}% van deze koersverandering.`});
    if(a!==btc&&Math.abs(ch-exp)>Math.max(2,m.vol))causes.push({k:'Eigen beweging (los van de markt)',w:clamp(Math.abs(ch-exp)/(Math.abs(ch)+1)*.6,0,.6),d:`${pct(ch-exp)} wijkt af van wat de Bitcoin-beweging zou verklaren; zoek een asset-specifieke oorzaak.`});
  }else{const spy=ETFQ.get('SPY');checks.push({q:'Beweegt de hele markt?',st:spy?(Math.abs(spy.dp)>.8?'y':'n'):'u',d:spy?`S&P 500 vandaag ${pct(spy.dp)}.`:'Koppel aandelendata (Finnhub) om dit te controleren.'});
    if(spy&&Math.sign(spy.dp)===Math.sign(ch)&&Math.abs(spy.dp)>.5)causes.push({k:'Beweegt mee met de aandelenmarkt',w:clamp(Math.abs(spy.dp)/Math.abs(ch),0,.8),d:`De S&P 500 staat ${pct(spy.dp)}.`})}
  // 6 aandelen
  const idx=['SPY','QQQ'].map(s=>ETFQ.get(s)).filter(Boolean);
  checks.push({q:'Dalen of stijgen de aandelenmarkten ook?',st:idx.length?(Math.sign(mean(idx.map(x=>x.dp)))===Math.sign(ch)&&Math.abs(mean(idx.map(x=>x.dp)))>.4?'y':'n'):'u',d:idx.length?`S&P 500 ${pct(idx[0].dp)}${idx[1]?', Nasdaq 100 '+pct(idx[1].dp):''}.`:'Aandelendata niet gekoppeld; niet te controleren.'});
  if(isC&&idx.length&&Math.sign(mean(idx.map(x=>x.dp)))===Math.sign(ch)&&Math.abs(mean(idx.map(x=>x.dp)))>.7)causes.push({k:'Risicosentiment op de aandelenmarkt',w:.25,d:`Aandelen bewegen dezelfde kant op (Nasdaq ${pct(idx[1]?.dp)}).`});
  // 7 liquidaties
  const liqLike=isC&&m.rangeRatio>1.8&&m.volRatio>1.8&&Math.abs(m.z24||0)>1.5;
  checks.push({q:'Zijn er belangrijke liquidaties?',st:'u',d:liqLike?'Geen liquidatiedata gekoppeld. Het patroon (grote dagrange, hoog volume, snelle beweging) past wel bij geforceerde verkopen of aankopen. Niet bevestigd.':'Geen liquidatiedata gekoppeld (derivatenbron volgt in fase 2).'});
  if(liqLike)causes.push({k:'Mogelijk liquidaties (niet bevestigd)',w:.2,d:`Dagrange ${nlN(m.rangeRatio,1)}× normaal met hoog volume.`});
  // 8 technisch
  if(isC&&m.hi30){const t=[];if(a.price>m.hi30)t.push('boven 30-daagse top');if(a.price<m.lo30)t.push('onder 30-daagse bodem');if(m.rsi>70)t.push(`RSI ${nlN(m.rsi,0)} (overkocht)`);if(m.rsi<30)t.push(`RSI ${nlN(m.rsi,0)} (oververkocht)`);
    const crossed=a.open&&((a.open<m.sma20&&a.price>m.sma20)||(a.open>m.sma20&&a.price<m.sma20));if(crossed)t.push('kruist het 20-daags gemiddelde');
    checks.push({q:'Is er sprake van een technische beweging?',st:t.length?'y':'n',d:t.length?t.join(', ')+'.':`Koers binnen de 30-daagse bandbreedte (${money(a,m.lo30)} – ${money(a,m.hi30)}).`});
    if(t.length)causes.push({k:'Technisch niveau geraakt',w:.15+.1*t.length,d:t.join(', ')+'.'})}
  else checks.push({q:'Is er sprake van een technische beweging?',st:'u',d:'Bekijk de grafiek; technische historie voor aandelen volgt met een betaalde dataprovider.'});
  if(recent.length&&(Math.abs(mk.vw||0)>1||idx.length))causes.push({k:'Macro-publicatie',w:.3,d:recent[0].title});
  if(macro.length&&isC&&mk.breadth&&(mk.breadth>.7||mk.breadth<.3))causes.push({k:'Macronieuws',w:.2+.05*macro.length,d:macro[0].title,src:macro.slice(0,2)});
  const tot=sum(causes.map(c=>c.w));causes.forEach(c=>c.share=tot?c.w/Math.max(tot,1):0);causes.sort((x,y)=>y.w-x.w);
  const top=causes[0];const smallMove=isC?(m.z24!=null&&Math.abs(m.z24)<.7):Math.abs(ch)<1;
  const unknown=!top||top.w<.25;
  const nData=checks.filter(c=>c.st!=='u').length;
  const conf=unknown?'Laag':top.w>=.55&&nData>=6?'Hoog':top.w>=.35&&nData>=5?'Gemiddeld':'Laag';
  const summary=smallMove?`${a.name} beweegt ${pct(ch)}: binnen de normale dagbeweging. Er is geen bijzondere verklaring nodig.`:
    unknown?`De oorzaak van de beweging van ${a.name} (${pct(ch)}) is nog onbekend. CSA vindt geen overtuigend nieuws, marktbrede beweging of technisch signaal.`:
    `Meest waarschijnlijk: ${top.k.toLowerCase()}. ${top.d}`;
  return {checks,causes,unknown:unknown&&!smallMove,smallMove,conf,summary};
}
/* ---------- scenario's per asset ---------- */
function scenarios(a){
  const m=a.m||{};const p=a.price;if(p==null)return null;
  if(!m.hi30){const lv=a.high&&a.low?{lo:a.low,hi:a.high}:null;return {bull:['Positief nieuws of sterke sector'+(lv?` en een slot boven het dagtop ${money(a,lv.hi)}`:'')],bear:['Zwakke markt of tegenvallend nieuws'+(lv?`; onder ${money(a,lv.lo)} verzwakt het beeld`:'')],neut:['Beweging binnen de dagrange; geen nieuwe informatie'],lv}}
  const bull=[],bear=[],neut=[];
  if(a.price>m.sma20)bull.push(`Koers boven het 20-daags gemiddelde (${money(a,m.sma20)})`);else bear.push(`Koers onder het 20-daags gemiddelde (${money(a,m.sma20)})`);
  if(m.ch7>0)bull.push(`Positieve week (${pct(m.ch7)})`);else bear.push(`Negatieve week (${pct(m.ch7)})`);
  if(m.volRatio>1.3)(a.ch24>0?bull:bear).push(`Hoog volume (${nlN(m.volRatio,1)}× normaal) bevestigt de richting`);
  if(m.rsi!=null){if(m.rsi>70)bear.push(`RSI ${nlN(m.rsi,0)}: overkocht, kans op afkoeling`);else if(m.rsi<30)bull.push(`RSI ${nlN(m.rsi,0)}: oververkocht, kans op herstel`);else neut.push(`RSI ${nlN(m.rsi,0)}: neutraal gebied`)}
  const nt=newsTone(a.sym,48);if(nt.n){(nt.tone>.2?bull:nt.tone<-.2?bear:neut).push(`Nieuws (${nt.n} clusters, 48 uur): ${toneTxt(nt.tone)}`)}
  if(a.kind==='crypto'&&a.sym!=='BTC'&&m.corr>.7)neut.push(`Sterk afhankelijk van Bitcoin (correlatie ${nlN(m.corr,2)})`);
  const mk=S.market;if(mk.n)(mk.breadth>.6?bull:mk.breadth<.4?bear:neut).push(`Marktbreedte: ${Math.round(mk.breadth*100)}% van de cryptomarkt stijgt`);
  neut.push(`Volatiliteit ${nlN(m.vol,1)}% per dag: bewegingen tot ±${nlN(m.vol*1.5,1)}% zijn normaal`);
  return {bull,bear,neut,lv:{lo:m.lo30,hi:m.hi30,sma:m.sma20}};
}
function risks(a){const m=a.m||{},r=[];
  if(a.kind==='crypto'){if(m.vol>5)r.push(`Hoge volatiliteit (${nlN(m.vol,1)}% per dag)`);if(a.volQ<1e6)r.push('Beperkte liquiditeit op Bitvavo (<€1 mln volume per dag)');if(m.corr>.8&&a.sym!=='BTC')r.push('Sterke afhankelijkheid van Bitcoin');if(m.rsi>75)r.push('Technisch overkocht');}
  if(a.kind==='stock'){r.push('Koersgevoelig voor kwartaalcijfers en rentebesluiten');if(['AI & chips','AI & software'].includes(a.sector))r.push('Hoge waardering in de AI-sector: gevoelig voor verwachtingen');if(a.sector==='Crypto-gerelateerd')r.push('Beweegt mee met de cryptomarkt');}
  const nt=newsTone(a.sym,48);if(nt.cl&&nt.cl.some(c=>c.cat==='security'))r.push('Recent beveiligingsnieuws');if(nt.cl&&nt.cl.some(c=>c.cat==='regulation'))r.push('Lopend regelgevingsnieuws');
  return r.length?r:['Geen bijzondere risico\'s gedetecteerd naast het normale marktrisico'];}

/* =====================================================================
   OPPORTUNITY SCANNER
   ===================================================================== */
function scan(){
  const out=[];
  deepList().forEach(a=>{const m=a.m;if(!m.vol)return;const d=[],pos=[],neg=[];let s=0;
    if(m.volRatio>=1.8){d.push(['Volumepiek',`${nlN(m.volRatio,1)}×`]);s+=clamp((m.volRatio-1)/3,0,1)*25}
    if(a.price>m.hi30){d.push(['Breakout 30d','']);pos.push(`Boven 30-daagse top (${money(a,m.hi30)})`);s+=20}
    if(a.price<m.lo30){d.push(['Breakdown 30d','']);neg.push(`Onder 30-daagse bodem (${money(a,m.lo30)})`);s+=18}
    const mz=(m.ch7/100)/(m.vol/100*Math.sqrt(7));if(Math.abs(mz)>=1.5){d.push([mz>0?'Sterk momentum':'Zwak momentum',pct(m.ch7)]);(mz>0?pos:neg).push(`7 dagen ${pct(m.ch7)}`);s+=clamp(Math.abs(mz)/3,0,1)*20}
    if(m.rangeRatio>=1.8){d.push(['Volatiliteit ↑',`${nlN(m.rangeRatio,1)}×`]);neg.push('Dagrange veel groter dan normaal');s+=10}
    if(a.sym!=='BTC'&&m.beta!=null){const exp=m.beta*S.crypto.get('BTC').ch24,res=a.ch24-exp;if(Math.abs(res)>=2*m.vol&&m.corr>.5){d.push(['Ontkoppeld van BTC',pct(res)]);(res>0?pos:neg).push(`${pct(res)} t.o.v. wat Bitcoin verklaart`);s+=15}}
    if(m.rsi>=72){d.push(['RSI overkocht',nlN(m.rsi,0)]);neg.push(`RSI ${nlN(m.rsi,0)}`);s+=6}if(m.rsi<=28){d.push(['RSI oververkocht',nlN(m.rsi,0)]);pos.push(`RSI ${nlN(m.rsi,0)}: mogelijk herstel`);s+=6}
    const sc=S.sentiLog.find(l=>l.key===a.sym&&Date.now()-l.t<24*HOUR);if(sc){d.push(['Sentimentomslag',sc.to]);s+=10}
    const nt=newsTone(a.sym,24);if(nt.n>=2){d.push(['Nieuwspiek',nt.n+' clusters']);(nt.tone>0?pos:neg).push(`Nieuws: ${toneTxt(nt.tone)}`);s+=clamp(nt.n/5,0,1)*12}
    if(!d.length)return;
    if(m.volRatio>1.3&&a.ch24>0)pos.push('Stijging met bovengemiddeld volume');if(a.s&&a.s.score>20)pos.push('Sentiment: '+a.s.l);if(a.s&&a.s.score<-20)neg.push('Sentiment: '+a.s.l);
    if(m.corr>.8)neg.push('Volgt Bitcoin sterk: marktrisico');if(a.volQ<1e6)neg.push('Lage liquiditeit');
    const risk=m.vol>7||a.volQ<1e6?'Hoog':m.vol>4?'Gemiddeld':'Laag';
    out.push({a,d,pos,neg,risk,score:Math.round(clamp(s,0,100)),mom:a.ch24>0?'pos':'neg',market:'crypto',sector:a.sym==='BTC'||a.sym==='ETH'?'Large caps':'Altcoins'});
  });
  S.stocks.forEach(a=>{if(a.ch24==null)return;const spy=ETFQ.get('SPY');const d=[],pos=[],neg=[];let s=0;
    if(Math.abs(a.ch24)>=3){d.push([a.ch24>0?'Grote dagstijging':'Grote dagdaling',pct(a.ch24)]);(a.ch24>0?pos:neg).push(`Dag ${pct(a.ch24)}`);s+=clamp(Math.abs(a.ch24)/8,0,1)*35}
    if(spy&&Math.abs(a.ch24-spy.dp)>=2.5){d.push(['Afwijkend van index',pct(a.ch24-spy.dp)]);s+=15}
    const nt=newsTone(a.sym,48);if(nt.n>=2){d.push(['Nieuwspiek',nt.n+' clusters']);(nt.tone>0?pos:neg).push(`Nieuws: ${toneTxt(nt.tone)}`);s+=12}
    if(a.high&&a.price>=a.high*.998&&a.ch24>1){d.push(['Op dagtop','']);s+=8}
    if(!d.length)return;neg.push('Beperkte historie in prototype (alleen dagkoers)');
    out.push({a,d,pos,neg,risk:['AI & chips','AI & software','Crypto-gerelateerd'].includes(a.sector)?'Hoog':'Gemiddeld',score:Math.round(clamp(s,0,100)),mom:a.ch24>0?'pos':'neg',market:'stock',sector:a.sector});
  });
  return out.sort((x,y)=>y.score-x.score);
}

/* =====================================================================
   ECONOMIC EVENT RADAR — geverifieerde datums (CET), plus Finnhub-earnings
   ===================================================================== */
const ETYPE={FOMC:{p:.9,l:'Rentebesluit Fed',assets:['BTC','ETH','SPY','QQQ','EUR/USD'],why:'Het Fed-besluit en de toelichting bepalen de verwachte rente in de VS. Lagere rente maakt risicovolle beleggingen (tech, crypto) vaak aantrekkelijker; een strengere toon werkt meestal omgekeerd. De dot plot (projecties) kan net zo belangrijk zijn als het besluit zelf.'},
  CPI:{p:.85,l:'Inflatie VS',assets:['BTC','ETH','SPY','QQQ','Goud'],why:'Hogere inflatie dan verwacht verkleint de ruimte voor renteverlagingen en zet aandelen en crypto vaak onder druk; lagere inflatie werkt meestal positief. De markt reageert op het verschil met de verwachting, niet op het getal zelf.'},
  NFP:{p:.8,l:'Banenrapport VS',assets:['SPY','QQQ','BTC','EUR/USD'],why:'Het banenrapport laat zien hoe sterk de Amerikaanse economie is. Te sterk kan renteverlagingen uitstellen; te zwak wekt zorgen over groei. Ook de werkloosheid en loongroei tellen mee.'},
  ECB:{p:.7,l:'Rentebesluit ECB',assets:['EUR/USD','Europese aandelen','BTC'],why:'Het ECB-besluit stuurt de rente in de eurozone en daarmee de euro en Europese aandelen. In december komen ook nieuwe groei- en inflatieprojecties.'},
  MIN:{p:.55,l:'Fed-notulen',assets:['SPY','QQQ','BTC'],why:'De notulen tonen hoe verdeeld de Fed was. Ze kunnen de renteverwachtingen bijstellen, maar het effect is meestal kleiner dan bij het besluit zelf.'},
  EARN:{p:.6,l:'Kwartaalcijfers',assets:[],why:'Winst en omzet t.o.v. verwachting, en vooral de vooruitzichten, kunnen het aandeel en sectorgenoten flink laten bewegen.'}};
const Radar={earnings:[],key:[
  {id:'nfp-2026-11',t:'2026-12-04T14:30:00+01:00',reg:'VS',type:'NFP',title:'Banenrapport (NFP), november',src:'BLS',url:'https://www.bls.gov/schedule/2026/12_sched_list.htm'},
  {id:'fomc-2026-12',t:'2026-12-09T20:00:00+01:00',reg:'VS',type:'FOMC',title:'Fed rentebesluit + projecties (persconferentie 20:30)',src:'Federal Reserve',url:'https://www.federalreserve.gov/newsevents/2026-december.htm'},
  {id:'cpi-2026-11',t:'2026-12-10T14:30:00+01:00',reg:'VS',type:'CPI',title:'Inflatie (CPI), november',src:'BLS',url:'https://www.bls.gov/schedule/news_release/cpi.htm'},
  {id:'ecb-2026-12',t:'2026-12-17T14:15:00+01:00',reg:'Eurozone',type:'ECB',title:'ECB rentebesluit + projecties (persconferentie 14:45)',src:'ECB',url:'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html'},
  {id:'min-2026-12',t:'2026-12-30T20:00:00+01:00',reg:'VS',type:'MIN',title:'Notulen Fed-vergadering 8–9 december',src:'Federal Reserve',url:'https://www.federalreserve.gov/newsevents/2026-december.htm'},
  {id:'nfp-2026-12',t:'2027-01-08T14:30:00+01:00',reg:'VS',type:'NFP',title:'Banenrapport (NFP), december',src:'BLS',url:'https://www.bls.gov/schedule/2027/01_sched_list.htm'},
  {id:'cpi-2026-12',t:'2027-01-13T14:30:00+01:00',reg:'VS',type:'CPI',title:'Inflatie (CPI), december',src:'BLS',url:'https://www.bls.gov/schedule/news_release/cpi.htm'}
].map(e=>({...e,t:new Date(e.t).getTime()})),
  all(){return [...this.key,...this.earnings].sort((a,b)=>a.t-b.t)},
  upcoming(n=99){const now=Date.now();return this.all().filter(e=>e.t>now-2*HOUR).slice(0,n)},
  imp(e){const T=ETYPE[e.type];const s=e.sym&&S.stocks.get(e.sym);return impact({M:.55,B:e.type==='EARN'?.3:.9,V:.5,R:e.type==='EARN'?(['NVDA','AAPL','MSFT','AMZN','GOOGL','META'].includes(e.sym)?.9:.5):1,S:.8,H:T.p,Q:1})}
};
function remTick(){
  const now=Date.now();Radar.upcoming().forEach(e=>{const set=S.rem[e.id]||[];set.forEach(off=>{const at=e.t-off*MIN,k=e.id+':'+off;
    if(now>=at&&now<at+10*MIN&&!S.remFired[k]){S.remFired[k]=1;LS.set('remfired',S.remFired);
      Alerts.push({id:'rem:'+k,cat:'macro',score:Radar.imp(e).score,force:true,title:`Over ${off>=60?off/60+' uur':off+' minuten'}: ${e.title}`,body:`${dmy(e.t)} ${hhmm(e.t)} · ${e.reg}. ${ETYPE[e.type].l}.`,href:'#radar'})}})});
}

/* =====================================================================
   MELDINGEN — personalisatie, ontdubbeling, stille uren
   ===================================================================== */
const Alerts={
  last:LS.get('alertlast',{}),
  inQuiet(){const s=S.settings;if(!s.quiet)return false;const n=new Date(),m=n.getHours()*60+n.getMinutes();const [fh,fm]=s.quietFrom.split(':').map(Number),[th,tm]=s.quietTo.split(':').map(Number);const f=fh*60+fm,t=th*60+tm;return f<t?(m>=f&&m<t):(m>=f||m<t)},
  consider(e){
    const s=S.settings;if(!s.notify)return;
    if(e.score<s.minScore)return;if(s.cats[e.cat]===false)return;
    if(s.scope==='watch'&&!(e.assets||[]).some(x=>S.watch.includes(x)))return;
    const key=(e.type||'')+':'+(e.asset||e.id);if(this.last[key]&&Date.now()-this.last[key]<3*HOUR)return;
    this.last[key]=Date.now();LS.set('alertlast',this.last);
    const href=e.type==='news'?'#impact':e.asset?'#asset-'+e.asset.toLowerCase():'#impact';
    this.push({id:e.id,cat:e.cat,score:e.score,title:e.title,body:e.what,href,ev:e.id});
  },
  silentUntil:0,
  push(a){
    if(this.inQuiet()&&!a.force)return;if(S.alerts.some(x=>x.id===a.id))return;
    a.t=Date.now();S.alerts.unshift(a);S.alerts=S.alerts.slice(0,60);S.unread++;LS.set('alerts',S.alerts);LS.set('unread',S.unread);
    UI.badge();if(Date.now()<this.silentUntil&&!a.force)return;
    UI.toast(a);
    if(S.settings.browser&&'Notification' in window&&Notification.permission==='granted'){try{new Notification('CSA · '+a.title,{body:(a.score?`Impact ${a.score}/100 · `:'')+(a.body||''),tag:a.id})}catch(e){}}
    UI.badge();
  }
};

/* =====================================================================
   2FA — TOTP (RFC 6238) met WebCrypto, of demo-code
   ===================================================================== */
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32dec(s){s=s.replace(/=+$/,'').replace(/\s/g,'').toUpperCase();let bits='';for(const c of s){const v=B32.indexOf(c);if(v<0)continue;bits+=v.toString(2).padStart(5,'0')}const out=new Uint8Array(Math.floor(bits.length/8));for(let i=0;i<out.length;i++)out[i]=parseInt(bits.slice(i*8,i*8+8),2);return out}
function b32rand(n=20){const b=crypto.getRandomValues(new Uint8Array(n));let bits='';b.forEach(x=>bits+=x.toString(2).padStart(8,'0'));let o='';for(let i=0;i+5<=bits.length;i+=5)o+=B32[parseInt(bits.slice(i,i+5),2)];return o}
async function totp(secret,t=Date.now(),step=30){
  if(!(crypto&&crypto.subtle))throw new Error('WebCrypto niet beschikbaar');
  const ctr=Math.floor(t/1000/step);const buf=new ArrayBuffer(8);const dv=new DataView(buf);dv.setUint32(0,Math.floor(ctr/2**32));dv.setUint32(4,ctr>>>0);
  const key=await crypto.subtle.importKey('raw',b32dec(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);const h=new Uint8Array(await crypto.subtle.sign('HMAC',key,buf));
  const o=h[h.length-1]&15;const code=((h[o]&127)<<24|h[o+1]<<16|h[o+2]<<8|h[o+3])%1e6;return String(code).padStart(6,'0');
}
async function totpCheck(secret,code){for(const d of [-1,0,1])if(await totp(secret,Date.now()+d*30000)===code)return true;return false}
