/* =====================================================================
   CSA-SERVER — accounts, synchronisatie, 24/7 data, push, portefeuilles
   Werkt de server niet (bijv. bestand lokaal geopend), dan draait de app
   in demomodus met lokale opslag. Dat wordt in de app zichtbaar gemeld.
   ===================================================================== */
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const API_BASE=NATIVE?(window.CSA_API_ORIGIN||''):(/^https?:$/.test(location.protocol)?'':null);
S.src.server={name:'CSA-server (24/7)',st:'wait',ts:0,kind:'Accounts, pushmeldingen, nieuws, marktcijfers, backtest',msg:'Verbinden…'};
S.src.cg={name:'CoinGecko + Fear & Greed',st:'off',ts:0,kind:'Marktwaarde, dominantie, trending (via server)',msg:'Via de CSA-server'};
const Api={
  on:false,features:{},token:LS.get('token',null),user:LS.get('srvuser',null),
  async call(path,opt={}){
    if(API_BASE==null)throw new Error('geen server');
    const r=await fetch(API_BASE+path,{method:opt.method||'GET',headers:{'content-type':'application/json',...(this.token?{authorization:'Bearer '+this.token}:{})},body:opt.body?JSON.stringify(opt.body):undefined});
    let j=null;try{j=await r.json()}catch(e){}
    if(r.status===401&&this.token&&!path.startsWith('/api/auth/')){this.setSession(null)}
    if(!r.ok){const e=new Error((j&&j.error)||('HTTP '+r.status));e.status=r.status;e.data=j;throw e}
    return j;
  },
  async health(){
    if(API_BASE==null){S.src.server.st='off';S.src.server.msg='Niet beschikbaar: app is als los bestand geopend (demomodus)';return false}
    try{const h=await this.call('/api/health');this.on=true;this.features=h.features||{};S.src.server.st='ok';S.src.server.ts=Date.now();S.src.server.msg='Verbonden · versie '+h.version;return true}
    catch(e){this.on=false;S.src.server.st='err';S.src.server.msg='Niet bereikbaar ('+e.message+'), demomodus';return false}
  },
  setSession(token,user){this.token=token;this.user=user||null;LS.set('token',token);LS.set('srvuser',this.user)},
  get authed(){return this.on&&!!this.token}
};

/* ---------- voorkeuren synchroniseren ---------- */
const Sync={t:null,
  schedule(){if(!Api.authed)return;clearTimeout(this.t);this.t=setTimeout(()=>this.push(),800)},
  async push(){try{await Api.call('/api/prefs',{method:'PUT',body:{settings:S.settings,watch:S.watch,rem:S.rem}})}catch(e){}},
  async pull(){if(!Api.authed)return;try{const p=await Api.call('/api/prefs');if(p.settings){const key=S.settings.fhKey;Object.assign(S.settings,p.settings,{fhKey:key});S.settings.cats=Object.assign({},DEFAULT_SETTINGS.cats,p.settings.cats||{});saveSettings()}
    if(Array.isArray(p.watch)&&p.watch.length){S.watch=p.watch;LS.set('watch',S.watch)}if(p.rem){S.rem=p.rem;LS.set('rem',S.rem)}if(!p.settings)this.push()}catch(e){}}
};

/* ---------- serverdata: marktcijfers, nieuws, aandelen, 24/7-gebeurtenissen ---------- */
S.extra=null;S.srvEvents=[];
async function loadServer(){
  if(!Api.on)return;
  try{const d=await Api.call('/api/market');
    S.extra=d.extra||null;S.srvEvents=d.events||[];
    if(d.extra&&(d.extra.global||d.extra.fng)){S.src.cg.st='ok';S.src.cg.ts=d.extra.global?.t||Date.now();S.src.cg.msg=[d.extra.global?'CoinGecko':null,d.extra.fng?'Fear & Greed':null].filter(Boolean).join(' + ')+' beschikbaar'}else{S.src.cg.st='wait';S.src.cg.msg='Nog geen data van de server'}
    if(d.news&&d.news.items&&d.news.items.length){ingest(d.news.items);if(S.src.cc.st!=='ok'){S.src.cc.st='ok';S.src.cc.ts=d.news.t;S.src.cc.msg=d.news.items.length+' artikelen via CSA-server'}}
    if(d.stocks&&!S.settings.fhKey){let n=0;for(const [s,q] of Object.entries(d.stocks)){if(S.stocks.has(s)){Object.assign(S.stocks.get(s),{price:q.p,ch24:q.dp,open:q.o,high:q.h,low:q.l,prev:q.pc,ts:q.ts});n++}else ETFQ.set(s,{price:q.p,dp:q.dp,open:q.o,high:q.h,low:q.l,prev:q.pc,ts:q.ts})}
      if(n){S.src.fh.st='ok';S.src.fh.ts=Date.now();S.src.fh.msg=n+' aandelenkoersen via CSA-server'}}
    if(S.src.bitvavo.st==='err'&&d.tickers&&d.tickers.list){d.tickers.list.forEach(x=>applyTicker({market:x.s+'-EUR',last:x.p,open:x.o,high:x.h,low:x.l,volumeQuote:x.vq,timestamp:d.tickersTs},false));S.src.bitvavo.st='warn';S.src.bitvavo.msg='Directe verbinding mislukt; koersen via CSA-server (max. 5 min oud)'}
    S.src.server.ts=Date.now();recalc();
  }catch(e){S.src.server.st='err';S.src.server.msg='Fout: '+e.message}
}

/* ---------- pushmeldingen (web push via service worker) ---------- */
const Push={
  supported:()=>'serviceWorker' in navigator&&'PushManager' in window&&API_BASE!=null&&!NATIVE,
  async reg(){if(!('serviceWorker' in navigator)||API_BASE==null||NATIVE)return null;try{return await navigator.serviceWorker.register('sw.js')}catch(e){return null}},
  async state(){const r=await navigator.serviceWorker?.getRegistration?.();const s=r&&await r.pushManager.getSubscription();return !!s},
  async enable(){
    if(!Api.authed)throw new Error('Log in met een CSA-account om pushmeldingen 24/7 te ontvangen.');
    if(!this.supported())throw new Error(/iPhone|iPad/.test(navigator.userAgent)?'Op iPhone werken pushmeldingen alleen als CSA op je beginscherm staat (Deel → Zet op beginscherm) en je de app vanaf daar opent.':'Deze browser ondersteunt geen pushmeldingen.');
    const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('Meldingen zijn geweigerd. Sta ze toe in je browserinstellingen.');
    const reg=await this.reg();const {key}=await Api.call('/api/push/key');
    const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64(key)});
    await Api.call('/api/push/subscribe',{method:'POST',body:sub.toJSON()});return true;
  },
  async disable(){const r=await navigator.serviceWorker?.getRegistration?.();const s=r&&await r.pushManager.getSubscription();if(s){try{await Api.call('/api/push/subscribe',{method:'DELETE',body:{endpoint:s.endpoint}})}catch(e){}await s.unsubscribe()}}
};
function urlB64(s){const p='='.repeat((4-s.length%4)%4);const b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))}

/* ---------- portefeuilles: server als je bent ingelogd, anders lokaal ---------- */
const Store={
  async positions(){if(Api.authed)return (await Api.call('/api/portfolio')).positions;return LS.get('positions',[])},
  async addPosition(p){if(Api.authed)return Api.call('/api/portfolio',{method:'POST',body:p});const L=LS.get('positions',[]);L.push({...p,sym:p.sym.toUpperCase(),id:Date.now(),created:Date.now()});LS.set('positions',L)},
  async delPosition(id){if(Api.authed)return Api.call('/api/portfolio/'+id,{method:'DELETE'});LS.set('positions',LS.get('positions',[]).filter(x=>x.id!==id))},
  async paper(){if(Api.authed)return Api.call('/api/paper');return LS.get('paper',{start:10000,fee:.0025,cash:10000,holdings:{},trades:[]})},
  async order(sym,side,eur){
    if(Api.authed)return Api.call('/api/paper/order',{method:'POST',body:{sym,side,eur}});
    const P=await this.paper();const a=S.crypto.get(sym);if(!a||a.price==null)throw new Error('Geen actuele koers voor '+sym);
    const fee=eur*P.fee,price=a.price,h=P.holdings[sym]||{qty:0,cost:0};
    if(side==='buy'){if(eur+fee>P.cash+1e-9)throw new Error('Onvoldoende virtueel saldo (inclusief 0,25% kosten).');h.qty+=eur/price;h.cost+=eur+fee;P.cash-=eur+fee;P.holdings[sym]=h}
    else{const q=eur/price;if(q>h.qty*(1+1e-9))throw new Error('Je hebt niet genoeg '+sym+' in je oefenportefeuille.');h.cost-=h.cost*Math.min(1,q/h.qty);h.qty-=q;P.cash+=eur-fee;if(h.qty<1e-12)delete P.holdings[sym];else P.holdings[sym]=h}
    P.trades.unshift({sym,side,eur,qty:eur/price,price,t:Date.now()});P.trades=P.trades.slice(0,50);LS.set('paper',P);return P},
  async resetPaper(){if(Api.authed)return Api.call('/api/paper/reset',{method:'POST',body:{}});const P={start:10000,fee:.0025,cash:10000,holdings:{},trades:[]};LS.set('paper',P);return P}
};

/* ---------- backtest: van de server, of in de browser berekend als die er niet is ---------- */
async function getBacktest(){
  if(Api.on){try{const b=await Api.call('/api/backtest');if(!b.pending)return {...b,via:'server'}}catch(e){}}
  const syms=deepList().sort((a,b)=>(a.rank||99)-(b.rank||99)).slice(0,15).map(a=>a.sym);if(!syms.length)throw new Error('Nog geen marktdata');
  const series={};await pool(syms,5,async s=>{series[s]=parseC(await bv(`/${s}-EUR/candles?interval=1d&limit=400`)).filter(c=>c.t+DAY<=Date.now())});
  const zByDay={},ev=[];
  for(const s of Object.keys(series)){const R=series[s];const c=R.map(x=>x.c),vq=R.map(x=>x.v*x.c);const avgAll=mean(vq);
    for(let i=31;i<R.length;i++){const r=[];for(let k=i-30;k<i;k++)r.push(Math.log(c[k]/c[k-1]));const vol=sd(r)*100,ch=(c[i]/c[i-1]-1)*100,z=vol?ch/vol:0;(zByDay[R[i].t]=zByDay[R[i].t]||[]).push(z);if(Math.abs(z)<2)continue;
      const vr=vq[i]/(mean(vq.slice(i-30,i))||1);const f=k=>i+k<c.length?(c[i+k]/c[i]-1)*100:null;ev.push({s,t:R[i].t,ch,z,vol,vr,R:clamp(Math.log10(Math.max(avgAll,1)/1e5)/3,0,1),f1:f(1),f3:f(3),f7:f(7)})}}
  ev.forEach(e=>{const zs=zByDay[e.t]||[];const same=zs.filter(z=>Math.sign(z)===Math.sign(e.z)&&Math.abs(z)>1).length/(zs.length||1);e.score=impact({M:Math.abs(e.z)/4,B:same,V:(e.vr-1)/2,R:e.R,S:.3,H:.6,Q:1}).score});
  const buckets=[[0,39,'< 40'],[40,59,'40–59'],[60,79,'60–79'],[80,100,'80+']].map(([lo,hi,label])=>{const E=ev.filter(e=>e.score>=lo&&e.score<=hi&&e.f3!=null);const E1=E.filter(e=>e.f1!=null);
    return {label,n:E.length,absNext:mean(E1.map(e=>Math.abs(e.f1))),absNextRel:mean(E1.map(e=>Math.abs(e.f1)/e.vol)),cont1:E1.length?E1.filter(e=>Math.sign(e.f1)===Math.sign(e.ch)).length/E1.length:null,follow3:mean(E.map(e=>Math.sign(e.ch)*e.f3)),follow7:mean(E.filter(e=>e.f7!=null).map(e=>Math.sign(e.ch)*e.f7))}});
  return {t:Date.now(),via:'browser',days:Math.min(...Object.values(series).map(x=>x.length)),assets:Object.keys(series),events:ev.length,buckets,recent:ev.filter(e=>e.f3!=null).sort((a,b)=>b.t-a.t).slice(0,20),method:'Gebeurtenis = dagbeweging ≥ 2× de 30-daagse volatiliteit. Score met dezelfde formule als live (snelheid onbekend → 0,3; historische invloed 0,6). Vervolg = koersverandering na 1, 3 en 7 dagen, positief als de beweging doorzette.'};
}
