/* =====================================================================
   PAGINA'S
   ===================================================================== */
const greet=()=>{const h=new Date().getHours();return h<6?'Goedenacht':h<12?'Goedemorgen':h<18?'Goedemiddag':'Goedenavond'};
const uname=()=>(LS.get('user',{}).name||'').split(' ')[0];
const waitBox=(t='Marktdata laden…')=>`<div class="skel" aria-busy="true"><span class="sr">${t}</span><i style="width:90%"></i><i style="width:72%"></i><i style="width:82%"></i></div>`;
const noData=()=>S.src.bitvavo.st==='err'?`<div class="callout warn"><b>Geen koersdata.</b> ${esc(S.src.bitvavo.msg)} Vantis toont geen nep-koersen; zodra de bron weer bereikbaar is, verschijnt alles automatisch.</div>`:waitBox();

const Pages={};

/* ---------------- OVERZICHT ---------------- */
const DV={range:'24u',mv:'up'};
Pages.overzicht={
  title:()=>'Overzicht',
  html:()=>`<div class="phead"><div><div class="kicker">${new Date().toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})} · <span class="dot live" style="display:inline-block"></span> live</div><h1>${greet()}${uname()?', '+esc(uname()):''}</h1></div><a class="btn" href="#waarom">${ico('why')}Waarom beweegt de markt?</a></div>
  <a class="brban hidden" id="brban" href="#briefing"></a>
  <section class="kpis" id="kpis"></section>
  <section class="kpis k3" id="kpis2" style="margin-top:12px"></section>
  <div class="grid g2x" style="margin-top:16px">
    <div class="card"><div class="chead"><div><div class="kicker" style="margin:0" id="bhead">Bitcoin</div><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="dprice" id="bprice">—</span><span id="bchg" class="num" style="font-weight:600"></span></div></div>
      <div class="seg" id="brange"><button data-r="24u" class="on">24 uur</button><button data-r="30d">30 dagen</button></div></div><div id="bchart"></div>
      <div class="bfoot" id="bfoot"></div></div>
    <div class="card senti-card"><div class="chead"><h2>${gl('senti','Vantis Market Sentiment')}</h2><span class="src" id="sage"></span></div><div id="sbox"></div></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><div class="chead"><h2>Cryptomarkt in één oogopslag</h2><span class="src">24 uur · top-34 op volume</span></div><div id="dheat"></div><div class="heatleg"><span>−6%</span><i></i><span>+6%</span></div></div>
    <div class="card"><div class="chead"><h2>Impact-feed</h2><a class="lnk" href="#impact">Alles →</a></div><div id="dimp"></div></div>
  </div>
  <div class="grid g3" style="margin-top:16px">
    <div class="card"><div class="chead"><h2>Waarom beweegt Bitcoin?</h2><a class="lnk" href="#waarom-btc">Analyse →</a></div><div id="dwhy"></div></div>
    <div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Bewegers</h2><div class="seg" id="mvseg"><button data-m="up" class="on">Stijgers</button><button data-m="down">Dalers</button><button data-m="vol">Volume</button><button data-m="trend">Trending</button></div></div><div id="dmov" style="margin-top:8px"></div></div>
    <div class="card"><div class="chead"><h2>Komende gebeurtenissen</h2><a class="lnk" href="#radar">Radar →</a></div><div id="dev"></div></div>
  </div>
  <p class="disc">Vantis geeft marktinformatie en analyses, geen financieel advies. Scores en scenario's zijn berekend uit openbare data volgens een vaste methode en garanderen geen koersontwikkeling. Beleggen brengt risico's met zich mee; je kunt (een deel van) je inleg verliezen.</p>`,
  mount(el){
    (async()=>{try{if(!BR.d&&Api.on){const d=await Api.call('/api/briefing');if(!d.pending)BR.d=d}}catch(e){}const b=$('#brban',el);if(b&&BR.d){b.innerHTML=`${ico('sun')}<span><small>Ochtendbriefing · ${esc(BR.d.day)}</small><b>${esc(BR.d.headline)}</b></span><span class="lnk">Lees →</span>`;b.classList.remove('hidden')}})();
    $('#brange',el).onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;DV.range=b.dataset.r;$$('#brange button',el).forEach(x=>x.classList.toggle('on',x===b));this.live(el,null,'calc')};
    $('#mvseg',el).onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;DV.mv=b.dataset.m;$$('#mvseg button',el).forEach(x=>x.classList.toggle('on',x===b));this.live(el,null,'calc')};
  },
  live(el,arg,kind){
    const btc=S.crypto.get('BTC'),eth=S.crypto.get('ETH');
    if(!btc||btc.price==null){$('#kpis',el).innerHTML=`<div style="grid-column:1/-1">${noData()}</div>`;return}
    const mk=S.market,o=S.senti.overall;
    const oldK=$$('#kpis .kv',el).map(x=>x.textContent);
    $('#kpis',el).innerHTML=
      kpi(`${ab(btc)} Bitcoin`,eur(btc.price),`<span class="${cls(btc.ch24)}">${pct(btc.ch24)}</span> 24u`,spark(hseries(btc)||series(btc),120,30),'#asset-btc')+
      (eth?kpi(`${ab(eth)} Ethereum`,eur(eth.price),`<span class="${cls(eth.ch24)}">${pct(eth.ch24)}</span> 24u`,spark(hseries(eth)||series(eth),120,30),'#asset-eth'):'')+
      kpi(gl('breadth','Marktbreedte'),mk.n?Math.round(mk.breadth*100)+'%':'—',mk.n?`van top-${mk.n} stijgt`:'',mk.n?`<div class="kbar"><i style="width:${Math.round(mk.breadth*100)}%;background:var(--${mk.breadth<.4?'down':mk.breadth>.6?'up':'ink3'})"></i></div>`:'','#markten')+
      kpi(gl('volume','Handelsvolume'),mk.volRegime?nlN(mk.volRegime,2)+'×':'—','t.o.v. 30-daags gemiddelde',mk.volRegime?`<div class="kbar"><i style="width:${clamp(mk.volRegime/2*100,4,100)}%;background:var(--ink2)"></i></div>`:'','#markten')+
      kpi(gl('senti','Sentiment'),o?esc(o.l):'—',o?`score ${o.score>0?'+':''}${Math.round(o.score)}`:'berekenen…',`<div class="kg">${gauge(o?.score,{w:110,sw:9})}</div>`,'#overzicht');
    $$('#kpis .kv',el).forEach((x,i)=>{if(oldK[i]&&oldK[i]!==x.textContent&&/[0-9]/.test(oldK[i])){const a=parseFloat(oldK[i].replace(/[^0-9,−-]/g,'').replace(',','.')),b=parseFloat(x.textContent.replace(/[^0-9,−-]/g,'').replace(',','.'));if(isFinite(a)&&isFinite(b)&&a!==b)x.classList.add(b>a?'flash-up':'flash-down')}});
    const X=S.extra||{},g=X.global,f=X.fng&&X.fng[0];
    $('#kpis2',el).innerHTML=kpi(gl('cap','Totale cryptomarktwaarde'),g?big(g.cap):'—',g?`<span class="${cls(g.capCh)}">${pct(g.capCh)}</span> 24u · ${esc(g.src||'CoinGecko')}`:(Api.on?'laden via server…':'alleen via de online app'))+
      kpi(gl('dom','Bitcoin-dominantie'),g?nlN(g.btcDom,1)+'%':'—',g?`${g.ethDom!=null?`Ethereum ${nlN(g.ethDom,1)}% · `:''}${esc(g.src||'CoinGecko')}`:'aandeel van Bitcoin in de markt',g?`<div class="kbar"><i style="width:${clamp(g.btcDom,0,100)}%;background:var(--ink2)"></i></div>`:'')+
      kpi(gl('fng','Fear & Greed-index'),f?f.v+' / 100':'—',f?`${esc(({'Extreme Fear':'Extreme angst','Fear':'Angst','Neutral':'Neutraal','Greed':'Hebzucht','Extreme Greed':'Extreme hebzucht'})[f.l]||f.l)} · alternative.me`:'externe index, los van Vantis',f?`<div class="kbar fng"><i style="left:${f.v}%"></i></div>`:'');
    // BTC grafiek
    const ser=DV.range==='24u'?(hseries(btc)||series(btc)):series(btc);
    $('#bprice',el).textContent=eur(btc.price);$('#bchg',el).innerHTML=`<span class="${cls(btc.ch24)}">${pct(btc.ch24)}</span> <span class="faint" style="font-weight:400">24 uur</span>`;
    if(kind==='calc'||!$('#bchart',el).dataset.f){$('#bchart',el).dataset.f=1;$('#bchart',el).innerHTML=area(ser,{h:270,fmt:v=>eur(v),from:DV.range==='24u'&&btc.hr?'24 uur geleden':'30 dagen geleden'})}
    const m=btc.m||{};$('#bfoot',el).innerHTML=[['24u hoog',eur(btc.high)],['24u laag',eur(btc.low)],['Volume',big(btc.volQ)],['Volatiliteit',m.vol?nlN(m.vol,1)+'%':'—'],['RSI',m.rsi!=null?nlN(m.rsi,0):'—']].map(([k,v])=>`<div><small>${k}</small><b class="num">${v}</b></div>`).join('')+`<div class="src" style="grid-column:1/-1">Bron: Bitvavo BTC-EUR · realtime · <span data-ago="${btc.ts}">${ago(btc.ts)}</span></div>`;
    // sentiment
    const c=S.senti.crypto,s=S.senti.stocks,last=S.sentiLog.find(l=>l.key==='overall');
    $('#sage',el).innerHTML=`herberekend <span data-ago="${S.lastCalc}">${ago(S.lastCalc)}</span>`;
    const row=(n,v,href,na)=>`<a class="srow" href="${href}"><span>${n}</span>${v?senti(v,true):`<span class="senti sna">${na||'—'}</span>`}</a>`;
    $('#sbox',el).innerHTML=`<div class="sgauge">${gauge(o?.score,{w:260,sw:18})}<div class="sl">${o?esc(o.l):'Berekenen…'}</div><div class="src">${s?'crypto + aandelen':'crypto · aandelen niet gekoppeld'}</div></div>
      <ul class="why-list">${(o?.reasons||[]).slice(0,3).map(r=>`<li class="${r.v>0.05?'up':r.v<-0.05?'down':''}"><i></i>${esc(r.t)}</li>`).join('')}</ul>
      <div class="srows">${row('Crypto',c,'#markten')}${row('Aandelen',s,s?'#aandelen':'#instellingen','Koppelen')}${row('Bitcoin',S.senti.BTC,'#asset-btc')}${row('Ethereum',S.senti.ETH,'#asset-eth')}</div>
      <div class="src" style="margin-top:10px">${last?`Laatste wijziging ${dmy(last.t)} ${hhmm(last.t)}: ${esc(last.from)} → <b>${esc(last.to)}</b>`:'Sinds openen niet gewijzigd'}</div>`;
    const D=deepList().filter(a=>a.ch24!=null);
    if(kind==='calc'||!$('#dheat',el).dataset.f){$('#dheat',el).dataset.f=1;
      $('#dheat',el).innerHTML=heatmap(D.slice().sort((a,b)=>b.volQ-a.volQ).slice(0,34));
      const w=btc.m.vol?whyMoving(btc):null;
      $('#dwhy',el).innerHTML=!w?waitBox('Historie laden…'):`<p class="lead">${esc(w.summary)}</p><div class="kicker" style="margin:10px 0 2px">Zekerheid: <b style="margin-left:4px">${w.conf}</b></div>
        ${w.causes.slice(0,3).map(c=>`<div class="cause" style="padding:9px 0"><div class="h"><span>${esc(c.k)}</span><span class="num muted">${Math.round(c.share*100)}%</span></div><div class="tr"><i style="width:${Math.round(c.share*100)}%"></i></div></div>`).join('')}
        <div class="chips" style="margin-top:12px">${D.filter(a=>a.sym!=='BTC').sort((a,b)=>Math.abs(b.m.z24||0)-Math.abs(a.m.z24||0)).slice(0,3).map(a=>`<a class="chip" style="display:inline-grid;place-items:center;text-decoration:none" href="#waarom-${a.sym.toLowerCase()}">${a.sym} <span class="${cls(a.ch24)}">&nbsp;${pct(a.ch24,1)}</span></a>`).join('')}</div>`;
      const ev=[...S.events.values()].sort((a,b)=>b.score-a.score||b.first-a.first).slice(0,4);
      $('#dimp',el).innerHTML=ev.length?ev.map(e=>impRow(e)).join(''):`<div class="empty">Nog geen gebeurtenissen boven de drempel. Vantis meldt pas iets als data daar aanleiding toe geeft.</div>`;
      $('#dev',el).innerHTML=Radar.upcoming(4).map(evRow).join('');
    }
    if(DV.mv==='trend'){const T=(S.extra&&S.extra.trending)||[];$('#dmov',el).innerHTML=T.length?T.slice(0,7).map((t,i)=>{const a=S.crypto.get(t.s);return a?`<a class="mrow" href="#asset-${a.sym.toLowerCase()}">${an(a)}<span class="r"><b class="num">${eur(a.price)}</b><span class="num ${cls(a.ch24)}">${pct(a.ch24)}</span></span></a>`:`<div class="mrow"><span class="an"><span class="ab">${i+1}</span><span><b>${esc(t.name)}</b><small>${esc(t.s)} · niet op Bitvavo</small></span></span><span class="r"><span class="num ${cls(t.ch)}">${t.ch!=null?pct(t.ch):''}</span></span></div>`}).join('')+'<div class="src" style="padding:10px 18px">Meest gezocht op CoinGecko</div>':`<div style="padding:18px"><div class="empty">${Api.on?'Trending laden via de server…':'Trending is beschikbaar in de online app.'}</div></div>`;$$('[data-cd]',el).forEach(c=>c.textContent=countdown(+c.dataset.cd));return}
    const L=DV.mv==='vol'?D.filter(a=>a.m.volRatio).sort((a,b)=>b.m.volRatio-a.m.volRatio):D.slice().sort((a,b)=>DV.mv==='up'?b.ch24-a.ch24:a.ch24-b.ch24);
    $('#dmov',el).innerHTML=L.slice(0,6).map(a=>`<a class="mrow" href="#asset-${a.sym.toLowerCase()}">${an(a)}<span class="r"><b class="num">${eur(a.price)}</b><span class="num ${DV.mv==='vol'?'muted':cls(a.ch24)}">${DV.mv==='vol'?nlN(a.m.volRatio,1)+'× volume':pct(a.ch24)}</span></span></a>`).join('')||`<div style="padding:18px">${waitBox()}</div>`;
    $$('[data-cd]',el).forEach(c=>c.textContent=countdown(+c.dataset.cd));
  }
};
function countdown(t){const d=t-Date.now();if(d<=0)return d>-2*HOUR?'Nu / net gepubliceerd':'Geweest';const D=Math.floor(d/DAY),H=Math.floor(d%DAY/HOUR),M=Math.floor(d%HOUR/MIN);return D?`over ${D}d ${H}u`:H?`over ${H}u ${M}m`:`over ${M} min`}
function evRow(e){const T=ETYPE[e.type],I=Radar.imp(e);return `<div class="ev"><div class="when">${new Date(e.t).toLocaleDateString('nl-NL',{day:'numeric',month:'short'})}<small>${hhmm(e.t)} · ${esc(e.reg)}</small></div><div><div class="ttl">${esc(e.title)}</div><div class="meta"><span class="tag ${I.score>=70?'navy':''}">Impact ${I.score}/100</span><span class="cd" data-cd="${e.t}">${countdown(e.t)}</span></div></div></div>`}

/* ---------------- MARKTEN ---------------- */
const MK={f:'all',sort:'volQ',asc:false,q:'',all:false,sf:'Alle'};
Pages.markten={
  title:a=>a==='aandelen'?'Aandelen':'Markten',
  html:arg=>{const st=arg==='aandelen';return `<div class="phead"><div><h1>Markten</h1><p>${st?'Amerikaanse en Europese aandelen. Koersen VS via Finnhub (indien gekoppeld), grafieken en Europese koersen via TradingView.':'Alle EUR-markten van Bitvavo, realtime. Diepte-analyse (7d, volume, volatiliteit, sentiment) voor de top-'+CFG.DEEP+' op volume.'}</p></div>
    <div class="chips"><a class="chip ${st?'':'on'}" href="#markten" style="display:inline-grid;place-items:center;text-decoration:none">Crypto</a><a class="chip ${st?'on':''}" href="#aandelen" style="display:inline-grid;place-items:center;text-decoration:none">Aandelen</a></div></div>
    ${st?stocksHTML():`<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;margin-bottom:12px"><div class="chips" id="mf">${[['all','Alles'],['watch','Watchlist'],['up','Stijgers'],['down','Dalers'],['vol','Volumepieken'],['new','Overige markten']].map(([k,l])=>`<button class="chip ${MK.f===k?'on':''}" data-f="${k}">${l}</button>`).join('')}</div>
    <input class="inp" id="mq" placeholder="Filter op naam of symbool" style="max-width:260px;height:36px;font-size:15px" value="${esc(MK.q)}"></div>
    <div class="card flush"><div class="tw"><table class="stack"><thead><tr><th style="width:44px"></th>${[['name','Asset'],['price','Prijs','n'],['ch24','24u','n'],['ch7','7d','n'],['volQ','Volume 24u','n'],['vr','Volume ×','n'],['vol','Volatiliteit','n'],['s','Sentiment'],['','30 dagen']].map(([k,l,n])=>`<th ${k?`data-sort="${k}"`:''} class="${n||''} ${MK.sort===k?'sorted'+(MK.asc?' asc':''):''}">${l}</th>`).join('')}<th></th></tr></thead><tbody id="mt"></tbody></table></div></div>
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px"><span class="src" id="mcount"></span><button class="lnk" id="mall">${MK.all?'Toon minder':'Toon alle markten'}</button></div>`}`},
  mount(el,arg){
    bindStars(el);
    if(arg==='aandelen'){mountStocks(el);return}
    $('#mf',el).onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;MK.f=b.dataset.f;$$('#mf .chip',el).forEach(x=>x.classList.toggle('on',x===b));this.live(el,arg,'calc')};
    $('#mq',el).oninput=e=>{MK.q=e.target.value.toLowerCase();this.live(el,arg,'calc')};
    $('#mall',el).onclick=e=>{MK.all=!MK.all;e.target.textContent=MK.all?'Toon minder':'Toon alle markten';this.live(el,arg,'calc')};
    $$('th[data-sort]',el).forEach(th=>th.onclick=()=>{const k=th.dataset.sort;MK.asc=MK.sort===k?!MK.asc:k==='name';MK.sort=k;$$('th',el).forEach(x=>x.classList.remove('sorted','asc'));th.classList.add('sorted');if(MK.asc)th.classList.add('asc');this.live(el,arg,'calc')});
    $('#mt',el).onclick=e=>{if(e.target.closest('[data-star]'))return;const tr=e.target.closest('tr[data-s]');if(tr)location.hash='#asset-'+tr.dataset.s.toLowerCase()};
  },
  live(el,arg,kind){
    if(arg==='aandelen'){liveStocks(el,kind);return}
    const tb=$('#mt',el);if(!tb)return;
    let L=[...S.crypto.values()].filter(a=>a.price!=null&&!CFG.STABLE.has(a.sym));
    if(!L.length){tb.innerHTML=`<tr><td colspan="10">${noData()}</td></tr>`;return}
    const f=MK.f;if(f==='watch')L=L.filter(a=>S.watch.includes(a.sym));if(f==='up')L=L.filter(a=>a.ch24>0);if(f==='down')L=L.filter(a=>a.ch24<0);if(f==='vol')L=L.filter(a=>a.m.volRatio>=1.5);if(f==='new')L=L.filter(a=>!a.deep);
    if(MK.q)L=L.filter(a=>(a.sym+' '+a.name).toLowerCase().includes(MK.q));
    const key={name:a=>a.name,price:a=>a.price,ch24:a=>a.ch24??-1e9,ch7:a=>a.m.ch7??-1e9,volQ:a=>a.volQ,vr:a=>a.m.volRatio??-1,vol:a=>a.m.vol??-1,s:a=>a.s?.score??-1e9}[MK.sort]||(a=>a.volQ);
    L.sort((x,y)=>{const a=key(x),b=key(y);return (typeof a==='string'?a.localeCompare(b):a-b)*(MK.asc?1:-1)});
    const total=L.length;if(!MK.all&&f!=='new')L=L.slice(0,60);else L=L.slice(0,400);
    $('#mcount',el).textContent=`${L.length} van ${total} markten · bron Bitvavo · bijgewerkt ${ago(S.src.bitvavo.ts)}`;
    tb.innerHTML=L.map(a=>{const m=a.m||{};const fl=a._shown!=null&&a._shown!==a.price?(a.price>a._shown?' flash-up':' flash-down'):'';a._shown=a.price;return `<tr data-s="${a.sym}"><td data-l="">${star(a.sym)}</td><td data-l="Asset">${an(a)}</td><td class="n${fl}" data-l="Prijs">${eur(a.price)}</td><td class="n ${cls(a.ch24)}" data-l="24u">${pct(a.ch24)}</td><td class="n ${cls(m.ch7)}" data-l="7d">${pct(m.ch7)}</td><td class="n" data-l="Volume">${big(a.volQ)}</td><td class="n" data-l="Volume ×">${m.volRatio?nlN(m.volRatio,1)+'×':'—'}</td><td class="n" data-l="Volatiliteit">${m.vol?nlN(m.vol,1)+'%':'—'}</td><td data-l="Sentiment">${a.deep?senti(a.s):'<span class="faint" style="font-size:12px">Alleen koers</span>'}</td><td data-l="30 dagen">${spark(series(a))}</td><td data-l="Koop" class="n qb"><button class="qbuy" data-qbuy="${a.sym}" aria-label="Koop ${esc(a.name)}">Koop</button></td></tr>`}).join('')||`<tr><td colspan="11"><div class="empty">Geen markten voor dit filter.</div></td></tr>`;
  }
};
function stocksHTML(){const k=!!S.settings.fhKey;return `
  ${k?'':`<div class="callout" style="margin-bottom:16px"><b>Aandelenkoersen in Vantis:</b> koppel een gratis Finnhub-sleutel bij <a href="#instellingen">Instellingen</a> voor live VS-koersen, sectorsentiment, bedrijfsnieuws en kwartaalcijfers. Grafieken, heatmap en Europese koersen werken nu al via TradingView.</div>`}
  <div class="grid g2"><div class="card flush"><div class="chead" style="padding:16px 16px 0"><h2>Aandelen</h2><div class="chips" id="sf">${['Alle','Technologie','AI & chips','Financieel','Energie','Crypto-gerelateerd','Europa'].map(s=>`<button class="chip ${MK.sf===s?'on':''}" data-sf="${s}">${s}</button>`).join('')}</div></div><div class="tw"><table class="stack"><thead><tr><th style="width:44px"></th><th>Aandeel</th><th class="n">Koers</th><th class="n">Dag</th><th class="n hide-s">Dagrange</th><th>Sentiment</th><th></th></tr></thead><tbody id="st"></tbody></table></div></div>
  <div class="grid" style="align-content:start"><div class="card"><div class="chead"><h2>Sectoren vandaag</h2><span class="src">${k?'Sector-ETF\'s via Finnhub':'Niet gekoppeld'}</span></div><div id="sect"></div></div>
  <div class="card"><div class="chead"><h3>Technische rating S&P 500</h3><span class="src">TradingView</span></div><div class="tv" id="tvta" style="height:340px;border:0"></div></div></div></div>
  <div class="card" style="margin-top:16px"><div class="chead"><h2>Heatmap S&P 500</h2><span class="src">TradingView · kan vertraagd zijn</span></div><div class="tv xl" id="tvhm" style="border:0"></div></div>`}
function mountStocks(el){
  $('#sf',el).onclick=e=>{const b=e.target.closest('[data-sf]');if(!b)return;MK.sf=b.dataset.sf;$$('#sf .chip',el).forEach(x=>x.classList.toggle('on',x===b));liveStocks(el,'calc')};
  $('#st',el).onclick=e=>{if(e.target.closest('[data-star]'))return;const tr=e.target.closest('tr[data-s]');if(tr)location.hash='#asset-'+tr.dataset.s.toLowerCase()};
  tv($('#tvta',el),'technical-analysis',{interval:'1D',width:'100%',height:340,symbol:'AMEX:SPY',showIntervalTabs:true,displayMode:'single'});
  tv($('#tvhm',el),'stock-heatmap',{exchanges:[],dataSource:'SPX500',grouping:'sector',blockSize:'market_cap_basic',blockColor:'change',hasTopBar:false,isDataSetEnabled:false,isZoomEnabled:true,hasSymbolTooltip:true,width:'100%',height:'100%'});
}
function liveStocks(el,kind){
  let L=[...S.stocks.values()];if(MK.sf==='Europa')L=L.filter(a=>!a.fh);else if(MK.sf!=='Alle')L=L.filter(a=>a.sector===MK.sf||(MK.sf==='AI & chips'&&a.sector==='AI & software'));
  $('#st',el).innerHTML=L.map(a=>`<tr data-s="${a.sym}"><td data-l="">${star(a.sym)}</td><td data-l="Aandeel">${an(a)}</td><td class="n" data-l="Koers">${a.price!=null?money(a,a.price):`<span class="faint" style="font-size:12px">${a.fh?'Koppel data':'Via grafiek'}</span>`}</td><td class="n ${cls(a.ch24)}" data-l="Dag">${pct(a.ch24)}</td><td class="n hide-s" data-l="Range">${a.low?money(a,a.low)+' – '+money(a,a.high):'—'}</td><td data-l="Sentiment">${a.price!=null?senti(a.s):'<span class="faint" style="font-size:12px">—</span>'}</td><td data-l="Koop" class="n qb"><button class="qbuy" data-qbuy="${a.sym}" aria-label="Koop ${esc(a.name)}">Koop</button></td></tr>`).join('');
  const sec=ETFS.map(([s,n,t])=>({s,n,t,q:ETFQ.get(s)})).filter(x=>x.q);
  $('#sect',el).innerHTML=sec.length?`<div class="bars">${sec.map(x=>`<div class="bar"><span>${esc(x.n)} <span class="faint">${x.s}</span></span><span class="tr" style="position:relative"><i style="position:absolute;height:100%;${x.q.dp>=0?'left:50%':'right:50%'};width:${clamp(Math.abs(x.q.dp)/3*50,1,50)}%;background:var(--${x.q.dp>=0?'up':'down'})"></i></span><span class="v ${cls(x.q.dp)}">${pct(x.q.dp,1)}</span></div>`).join('')}</div>`:`<div class="empty">Sectorsentiment verschijnt zodra aandelendata gekoppeld is.</div>`;
}

/* ---------------- ASSET DETAIL ---------------- */
Pages.asset={
  title:arg=>getAsset(arg)?.name||'Asset',
  html(arg){const a=getAsset(arg);if(!a)return `<div class="phead"><h1>Niet gevonden</h1></div>${S.crypto.size?`<div class="empty">Geen markt "${esc(arg)}" gevonden bij Bitvavo of in de aandelenlijst.</div>`:noData()}`;
    return `<a class="lnk" href="#${a.kind==='crypto'?'markten':'aandelen'}" style="display:inline-flex;align-items:center;gap:4px;margin-bottom:14px">← ${a.kind==='crypto'?'Markten':'Aandelen'}</a>
    <div class="phead" style="align-items:center"><div class="dhead">${ab(a,1)}<div><h1 style="font-size:26px">${esc(a.name)}</h1><div class="src">${esc(a.sym)} · ${a.kind==='crypto'?'Crypto · '+a.market:esc(a.sector)+' · '+esc(a.tv)}</div></div></div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${star(a.sym)}<button class="btn ghost" id="palert">${ico('alarm')}Koersalert</button><button class="btn ghost" id="shr" aria-label="Delen">${ico('share')}</button><button class="btn ghost" id="news">${ico('news')}Nieuws <span id="ncount"></span></button><a class="btn" href="#waarom-${a.sym.toLowerCase()}">${ico('why')}Waarom beweegt het?</a></div></div>
    <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:6px"><span class="dprice" id="dp"></span><span id="dc" class="num" style="font-weight:600"></span></div>
    <div class="src" id="dsrc" style="margin-bottom:16px"></div>
    <div class="grid g2"><div class="grid" style="align-content:start"><div class="card flush chartcard"><div class="chead" style="padding:12px 14px 0;margin:0"><div class="seg" id="crng">${Object.keys(RANGES).map(r=>`<button data-r="${r}" class="${CH.range===r?'on':''}">${r}</button>`).join('')}</div><div class="seg" id="cmode"><button data-c="vantis" class="on">Vantis-grafiek</button><button data-c="tv">TradingView</button></div></div><div id="vchart" style="padding:10px 14px 14px">${skel(1,'h300')}</div><div class="tv hidden" id="tvc" style="border:0;border-radius:0"></div></div><div class="mgrid" id="dm"></div></div>
    <div class="grid" style="align-content:start"><div class="card"><div class="chead"><h2>${gl('senti','Vantis Sentiment')}</h2><span class="src">${a.kind==='crypto'?'Herberekend elke minuut':'Dagbasis'}</span></div><div id="ds"></div></div>
    <div class="card"><div class="chead"><h2>Waarom beweegt ${esc(a.name)}?</h2><a class="lnk" href="#waarom-${a.sym.toLowerCase()}">Details →</a></div><div id="dw"></div></div></div></div>
    <div class="card" style="margin-top:16px"><div class="chead"><h2>Bull vs. Bear scenario's</h2><span class="src">Op basis van actuele niveaus en indicatoren; geen voorspelling</span></div><div id="dsc"></div></div>
    <div class="grid g2" style="margin-top:16px"><div class="card"><div class="chead"><h2>Gebeurtenissen</h2><span class="src">Laatste 48 uur</span></div><div id="de"></div></div><div class="card"><div class="chead"><h2>Risico's</h2></div><div id="dr"></div></div></div>`},
  mount(el,arg){const a=getAsset(arg);if(!a)return;bindStars(el);
    this.cd=null;$('#news',el).onclick=()=>newsDrawer(a);$('#palert',el).onclick=()=>PA.dialog(a.sym);$('#shr',el).onclick=()=>shareCard({kind:'why',a,w:whyMoving(a)});
    const mode=c=>{$$('#cmode button',el).forEach(b=>b.classList.toggle('on',b.dataset.c===c));$('#vchart',el).classList.toggle('hidden',c!=='vantis');$('#crng',el).classList.toggle('hidden',c!=='vantis');$('#tvc',el).classList.toggle('hidden',c!=='tv');if(c==='tv'&&!$('#tvc',el).dataset.f){$('#tvc',el).dataset.f=1;tvChart($('#tvc',el),tvSym(a))}};
    $('#cmode',el).onclick=e=>{const b=e.target.closest('[data-c]');if(b)mode(b.dataset.c)};
    this.draw=async()=>{if(a.kind!=='crypto')return;try{this.cd=await chartData(a,CH.range);if(UI.el===el)drawChart($('#vchart',el),a,this.cd)}catch(x){$('#vchart',el).innerHTML='<div class="achart empty">Grafiek kon niet laden. Gebruik TradingView.</div>'}};
    $('#crng',el).onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;CH.range=b.dataset.r;$$('#crng button',el).forEach(x=>x.classList.toggle('on',x===b));$('#vchart',el).innerHTML=skel(1,'h300');this.draw()};
    if(a.kind==='crypto')this.draw();else{$('#cmode [data-c="vantis"]',el).remove();mode('tv')}
    loadHourlyFor(a);loadCompanyNews(a).then(()=>this.live(el,arg,'calc'));},
  live(el,arg,kind){const a=getAsset(arg);if(!a||!$('#dp',el))return;const m=a.m||{};
    $('#dp',el).textContent=a.price!=null?money(a,a.price):'—';$('#dc',el).innerHTML=`<span class="${cls(a.ch24)}">${pct(a.ch24)}</span> <span class="faint" style="font-weight:400">${a.kind==='crypto'?'24 uur':'vandaag'}</span>`;
    $('#dsrc',el).innerHTML=srcLine(a);
    const nN=S.clusters.filter(c=>c.assets.includes(a.sym)).length;$('#ncount',el).textContent=nN?`(${nN})`:'';
    const cells=a.kind==='crypto'?[['24u hoog',eur(a.high)],['24u laag',eur(a.low)],['Volume 24u',big(a.volQ)],[gl('volx','Volume vs 30d'),m.volRatio?nlN(m.volRatio,1)+'×':'—'],['7 dagen',`<span class="${cls(m.ch7)}">${pct(m.ch7)}</span>`],['30 dagen',`<span class="${cls(m.ch30)}">${pct(m.ch30)}</span>`],[gl('vol','Volatiliteit'),m.vol?nlN(m.vol,1)+'% /dag':'—'],[gl('rsi','RSI (14d)'),m.rsi!=null?nlN(m.rsi,0):'—'],[gl('sma','20d gemiddelde'),eur(m.sma20)],[gl('range','30d bereik'),m.lo30?eur(m.lo30)+' – '+eur(m.hi30):'—'],[gl('corr','Correlatie BTC'),m.corr!=null?nlN(m.corr,2):'—'],['Rang (volume)',a.rank?'#'+a.rank:'—'],...(S.settings.mode==='pro'?[[gl('beta','Beta t.o.v. BTC'),m.beta!=null?nlN(m.beta,2):'—'],[gl('z','Z-score 24u'),m.z24!=null?nlN(m.z24,2):'—'],['Dagrange vs normaal',m.rangeRatio?nlN(m.rangeRatio,1)+'×':'—'],['Afstand 20d gem.',pct(m.devSma)]]:[])]
      :[['Dag hoog',money(a,a.high)],['Dag laag',money(a,a.low)],['Opening',money(a,a.open)],['Vorige slot',money(a,a.prev)],['Sector',esc(a.sector)],['Beurs',esc(a.tv.split(':')[0])],['Valuta',a.cur],['Databron',a.fh?(a.price!=null?'Finnhub':'Niet gekoppeld'):'TradingView']];
    $('#dm',el).innerHTML=cells.map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('');
    if(kind==='calc'||!$('#ds',el).dataset.f){$('#ds',el).dataset.f=1;
      const s=a.s;$('#ds',el).innerHTML=s?`<div class="sgauge">${gauge(s.score,{w:230,sw:16})}<div class="sl">${esc(s.l)}</div><div class="src">score ${s.score>0?'+':''}${Math.round(s.score)} op een schaal van −100 tot +100</div></div><ul class="why-list">${s.reasons.map(r=>`<li class="${r.v>0.05?'up':r.v<-0.05?'down':''}"><i></i>${esc(r.t)}</li>`).join('')}</ul>`:`<div class="empty">${a.kind==='stock'&&!S.settings.fhKey?'Koppel aandelendata om sentiment te berekenen.':a.deep||a.kind==='stock'?'Data laden…':'Analyse laden…'}</div>`;
      if(this.cd&&a.kind==='crypto'&&!$('.mkpop',el))drawChart($('#vchart',el),a,this.cd);
      const w=whyMoving(a);$('#dw',el).innerHTML=`<p style="margin:0 0 10px">${esc(w.summary)}</p><div class="kicker">Zekerheid: <b>${w.conf}</b></div>${w.causes.slice(0,3).map(c=>`<div class="cause" style="padding:8px 0"><div class="h"><span>${esc(c.k)}</span><span class="num muted">${Math.round(c.share*100)}%</span></div><div class="tr"><i style="width:${Math.round(c.share*100)}%"></i></div></div>`).join('')}`;
      const sc=scenarios(a);$('#dsc',el).innerHTML=sc?scenHTML(a,sc):waitBox();
      const ev=[...S.events.values()].filter(e=>(e.assets||[]).includes(a.sym)).sort((x,y)=>y.score-x.score).slice(0,5);
      $('#de',el).innerHTML=ev.length?ev.map(e=>impRow(e)).join(''):'<div class="empty">Geen bijzondere gebeurtenissen gedetecteerd.</div>';
      $('#dr',el).innerHTML=`<ul style="margin:0;padding-left:18px;display:grid;gap:7px;font-size:14px">${risks(a).map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p class="note" style="margin-top:14px">Vantis geeft geen koop- of verkoopadvies.</p>`;
    }
  }
};
function scenHTML(a,sc){const lv=sc.lv;const li=x=>x.length?x.map(t=>`<li>${esc(t)}</li>`).join(''):'<li>Geen signalen</li>';
  return `<div class="scen"><div><h4><i style="background:var(--up)"></i>Bullish scenario</h4><ul>${li(sc.bull)}</ul>${lv?`<div class="lvl">Bevestiging: slot boven <b class="num">${money(a,lv.hi)}</b>${lv.sma?` en houden van <b class="num">${money(a,lv.sma)}</b>`:''}</div>`:''}</div>
  <div><h4><i style="background:var(--down)"></i>Bearish scenario</h4><ul>${li(sc.bear)}</ul>${lv?`<div class="lvl">Verzwakking: slot onder <b class="num">${money(a,lv.lo)}</b></div>`:''}</div>
  <div><h4><i style="background:var(--ink3)"></i>Neutraal scenario</h4><ul>${li(sc.neut)}</ul>${lv?`<div class="lvl">Bandbreedte: <b class="num">${money(a,lv.lo)} – ${money(a,lv.hi)}</b></div>`:''}</div></div>`}

/* ---------------- WAAROM BEWEEGT HET ---------------- */
Pages.waarom={
  title:()=>'Waarom beweegt de markt?',
  html(arg){return `<div class="phead"><div><h1>Waarom beweegt de markt?</h1><p>Vantis controleert acht mogelijke oorzaken met data en bronnen. Kan een oorzaak niet worden aangetoond, dan zegt Vantis dat de oorzaak nog onbekend is.</p></div>
    <select class="inp" id="wsel" style="max-width:280px" aria-label="Kies asset"></select></div>
    <div class="chips" id="wchips" style="margin-bottom:16px"></div><div id="wbody"></div>`},
  mount(el,arg){const pick=s=>location.hash='#waarom-'+s.toLowerCase();
    $('#wsel',el).onchange=e=>pick(e.target.value);
    $('#wchips',el).onclick=e=>{const b=e.target.closest('[data-w]');if(b)pick(b.dataset.w)};
    el.addEventListener('click',e=>{if(e.target.closest('#wshare')&&this.a)shareCard({kind:'why',a:this.a,w:this.w})})},
  live(el,arg,kind){
    if(kind!=='calc'&&$('#wbody',el).dataset.f)return;
    const sym=(arg||'BTC').toUpperCase();const a=getAsset(sym);
    const opts=allAssets().filter(x=>x.price!=null||x.kind==='stock').sort((x,y)=>(y.volQ||0)-(x.volQ||0));
    if(!opts.length){$('#wbody',el).innerHTML=noData();return}
    $('#wbody',el).dataset.f=1;
    const sel=$('#wsel',el);if(sel.options.length!==opts.length){sel.innerHTML=opts.map(x=>`<option value="${x.sym}">${esc(x.name)} (${x.sym})</option>`).join('')}sel.value=sym;
    const mv=deepList().sort((x,y)=>Math.abs(y.m.z24||0)-Math.abs(x.m.z24||0)).slice(0,5).map(x=>x.sym);
    $('#wchips',el).innerHTML=[...new Set(['BTC','ETH',...mv,...S.watch])].slice(0,10).map(s=>{const x=getAsset(s);return x?`<button class="chip ${s===sym?'on':''}" data-w="${s}">${s} <span class="${s===sym?'':cls(x.ch24)}">${pct(x.ch24,1)}</span></button>`:''}).join('');
    if(!a){$('#wbody',el).innerHTML='<div class="empty">Kies een asset.</div>';return}
    const w=whyMoving(a);this.w=w;this.a=a;
    const srcs=w.causes.flatMap(c=>c.src||[]);
    $('#wbody',el).innerHTML=`<div class="card" style="margin-bottom:16px;display:flex;gap:18px;align-items:center;flex-wrap:wrap">${ab(a,1)}<div style="flex:1;min-width:220px"><div class="kicker">${esc(a.name)} · ${money(a,a.price)} · <span class="${cls(a.ch24)}">${pct(a.ch24)}</span> ${a.kind==='crypto'?'in 24 uur':'vandaag'}</div><div style="font:600 19px/1.35 'Inter Tight',sans-serif">${esc(w.summary)}</div></div>
      <button class="btn ghost" id="wshare">${ico('share')}Delen</button><div style="text-align:right"><div class="src">Zekerheid analyse</div><div style="font:650 22px 'Inter Tight',sans-serif">${w.conf}</div><div class="src">${hhmm(Date.now())} · ${w.checks.filter(c=>c.st!=='u').length}/8 punten met data</div></div></div>
      ${w.unknown?`<div class="callout warn" style="margin-bottom:16px"><b>Oorzaak nog onbekend.</b> Vantis vult dit niet in met een gok. Er zijn geen gegevens die de beweging overtuigend verklaren; Vantis blijft controleren en meldt het zodra er bewijs is.</div>`:''}
      <div class="grid g2"><div class="card"><div class="chead"><h2>Controlelijst</h2><span class="src">Ja · Nee · ? = geen data</span></div>${w.checks.map(c=>`<div class="check"><span class="ck ${c.st}">${c.st==='y'?'Ja':c.st==='n'?'—':'?'}</span><div><b>${esc(c.q)}</b><p>${esc(c.d)}</p></div></div>`).join('')}</div>
      <div class="grid" style="align-content:start"><div class="card"><div class="chead"><h2>Meest waarschijnlijke oorzaken</h2><span class="src">Aandeel in verklaring</span></div>${w.causes.length?w.causes.map(c=>`<div class="cause"><div class="h"><b>${esc(c.k)}</b><span class="num muted">${Math.round(c.share*100)}%</span></div><div class="note" style="margin-top:4px">${esc(c.d)}</div><div class="tr"><i style="width:${Math.round(c.share*100)}%"></i></div></div>`).join(''):'<div class="empty">Geen oorzaken aangetoond.</div>'}</div>
      <div class="card"><div class="chead"><h2>Bronnen</h2><span class="src">Met tijdstempel</span></div>${srcs.length?srcs.map(c=>clusterRow(c,true)).join(''):`<p class="note" style="margin:0">Koersdata: Bitvavo (${hhmm(S.src.bitvavo.ts||Date.now())}). ${S.src.cc.st==='ok'?'Nieuws: CryptoCompare ('+hhmm(S.src.cc.ts)+'). ':''}${S.src.fh.st==='ok'?'Aandelen en nieuws: Finnhub ('+hhmm(S.src.fh.ts)+').':''}</p>`}</div></div></div>
      <p class="disc">Methode: per punt wordt gemeten of de data de beweging ondersteunt. Oorzaken krijgen een gewicht op basis van de sterkte van het bewijs (bijv. correlatie en beta met Bitcoin, aantal onafhankelijke nieuwsbronnen, volumeratio). Liquidatiedata en on-chain data zijn nog niet gekoppeld; die punten blijven op "?" staan in plaats van te worden ingevuld.</p>`;
  }
};

/* ---------------- IMPACT ---------------- */
const IMPF={min:0,cat:'all',open:null};
Pages.impact={
  title:()=>'Impact & alerts',
  html:()=>`<div class="phead"><div><h1>Vantis Impact Score</h1><p>Elke gedetecteerde gebeurtenis krijgt een score van 0 tot 100 voor de mogelijke invloed op de markt, met een vaste, controleerbare methode. Klik een gebeurtenis voor de volledige uitleg.</p></div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px"><div class="chips" id="imin">${[[0,'Alles'],[40,'40+'],[60,'60+ hoog'],[80,'80+ zeer hoog']].map(([v,l])=>`<button class="chip ${IMPF.min===v?'on':''}" data-m="${v}">${l}</button>`).join('')}</div>
  <div class="chips" id="icat">${[['all','Alle typen'],['price','Koers & volume'],['news','Nieuws'],['macro','Macro']].map(([v,l])=>`<button class="chip ${IMPF.cat===v?'on':''}" data-c="${v}">${l}</button>`).join('')}</div></div>
  <div class="grid g2"><div class="card"><div id="ilist"></div></div>
  <div class="grid" style="align-content:start"><div class="card"><div class="chead"><h2>${gl('impact','Methodologie')}</h2><span class="src">Versie 1.0</span></div>
    <p class="note" style="margin-top:0"><b>I = 100 × Σ (gewicht × factor)</b>, elke factor tussen 0 en 1 en gemeten uit data.</p>
    <table style="font-size:13px"><thead><tr><th>Factor</th><th class="n">Gewicht</th></tr></thead><tbody>${IW.map(([k,n,w,d])=>`<tr style="cursor:default"><td style="white-space:normal"><b>${n}</b><div class="note">${d}</div></td><td class="n">${Math.round(w*100)}%</td></tr>`).join('')}</tbody></table>
    <p class="note">Labels: 80+ zeer hoog · 60–79 hoog · 40–59 gemiddeld · 20–39 laag. Naast de score toont Vantis altijd de mogelijke richting, de betrouwbaarheid van de bron en de onzekerheid. Een hoge score zegt iets over de <b>omvang</b> van de mogelijke invloed, niet over de richting.</p></div>
  <div class="card"><div class="chead"><h2>Jouw meldingen</h2><a class="lnk" href="#instellingen">Personaliseren →</a></div><div id="ialerts"></div></div>
  <div class="card"><div class="chead"><h2>24/7 gedetecteerd</h2><span class="src">Vantis-server, ook als de app dicht was</span></div><div id="isrv"></div></div></div></div>`,
  mount(el){
    $('#imin',el).onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;IMPF.min=+b.dataset.m;$$('#imin .chip',el).forEach(x=>x.classList.toggle('on',x===b));this.live(el,null,'calc')};
    $('#icat',el).onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;IMPF.cat=b.dataset.c;$$('#icat .chip',el).forEach(x=>x.classList.toggle('on',x===b));this.live(el,null,'calc')};
    $('#ilist',el).onclick=e=>{if(e.target.closest('a'))return;const r=e.target.closest('[data-ev]');if(!r)return;IMPF.open=IMPF.open===r.dataset.ev?null:r.dataset.ev;this.live(el,null,'calc')};
    S.unread=0;LS.set('unread',0);UI.badge();
  },
  live(el,arg,kind){if(kind!=='calc'&&$('#ilist',el).dataset.f)return;$('#ilist',el).dataset.f=1;
    let L=[...S.events.values()].filter(e=>e.score>=IMPF.min);
    if(IMPF.cat==='price')L=L.filter(e=>e.type!=='news');if(IMPF.cat==='news')L=L.filter(e=>e.type==='news');if(IMPF.cat==='macro')L=L.filter(e=>e.cat==='macro');
    L.sort((a,b)=>b.score-a.score||b.first-a.first);
    $('#ilist',el).innerHTML=L.length?L.slice(0,40).map(e=>impRow(e,IMPF.open===e.id)).join(''):`<div class="empty">${S.crypto.size?'Geen gebeurtenissen voor dit filter. Vantis meldt alleen wat data echt laat zien: rustige markt = weinig meldingen.':'Wachten op marktdata…'}</div>`;
    $('#isrv',el).innerHTML=S.srvEvents.length?S.srvEvents.slice(0,10).map(e=>`<a href="${e.s?'#asset-'+e.s.toLowerCase():'#impact'}" class="srow"><span><b style="font-size:14px">${esc(e.title)}</b><br><span class="src">${dmy(e.t)} ${hhmm(e.t)}</span></span>${ring(e.score,40)}</a>`).join(''):`<div class="empty">${Api.on?'Nog niets gedetecteerd in de afgelopen 48 uur.':'Alleen beschikbaar in de online app.'}</div>`;
    $('#ialerts',el).innerHTML=S.alerts.length?S.alerts.slice(0,12).map(a=>`<a href="${a.href||'#impact'}" style="display:block;padding:10px 0;border-bottom:1px solid var(--line);text-decoration:none"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:14px">${esc(a.title)}</b>${a.score?`<span class="tag">${a.score}</span>`:''}</div><div class="src">${dmy(a.t)} ${hhmm(a.t)}</div></a>`).join(''):'<div class="empty">Nog geen meldingen ontvangen.</div>';
  }
};

/* ---------------- EVENT RADAR ---------------- */
Pages.radar={
  title:()=>'Event Radar',
  html:()=>`<div class="phead"><div><h1>Economic Event Radar</h1><button class="btn ghost" data-ics="all" style="float:right;margin-left:12px">${ico('cal')}Alles naar mijn agenda</button><p>De belangrijkste publicaties en besluiten met Vantis Impact Score, uitleg en herinneringen. Datums gecontroleerd bij de officiële bron; de volledige kalender met verwachte, vorige en werkelijke waarden staat rechts.</p></div></div>
  <div class="grid g2"><div class="card"><div class="chead"><h2>Belangrijkste gebeurtenissen</h2><span class="src">Tijden in jouw tijdzone</span></div><div id="rlist"></div></div>
  <div class="card"><div class="chead"><h2>Volledige economische kalender</h2><span class="src">Live via TradingView · verwacht / vorige / werkelijk</span></div><div class="tv xl" id="tvcal" style="border:0;height:900px"></div></div></div>`,
  mount(el){tv($('#tvcal',el),'events',{width:'100%',height:'100%',importanceFilter:'0,1',countryFilter:'us,eu,de,nl,gb,jp,cn'});
    $('#rlist',el).onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;const [id,off]=b.dataset.r.split('|');const set=new Set(S.rem[id]||[]);set.has(+off)?set.delete(+off):set.add(+off);S.rem[id]=[...set];LS.set('rem',S.rem);Sync.schedule();b.classList.toggle('on');
      if(set.has(+off)&&'Notification' in window&&Notification.permission==='default'&&S.settings.browser)Notification.requestPermission();
      UI.toast({title:set.has(+off)?`Herinnering ingesteld (${b.textContent} vooraf)`:'Herinnering verwijderd'})}},
  live(el,arg,kind){
    if(kind==='calc'||!$('#rlist',el).dataset.f){$('#rlist',el).dataset.f=1;
      const L=Radar.upcoming();
      $('#rlist',el).innerHTML=L.map(e=>{const T=ETYPE[e.type],I=Radar.imp(e),set=S.rem[e.id]||[];return `<div class="ev"><div class="when">${new Date(e.t).toLocaleDateString('nl-NL',{day:'numeric',month:'short'})}<small>${hhmm(e.t)}<br>${esc(e.reg)}</small></div>
      <div><div class="ttl">${esc(e.title)}</div><div class="meta"><span class="tag ${I.score>=70?'navy':''}">Impact ${I.score}/100</span><span class="tag">${T.l}</span><span class="cd" data-cd="${e.t}">${countdown(e.t)}</span></div>
      <p><b style="color:var(--ink)">Verwacht / vorige:</b> ${e.exp?esc(e.exp):'zie live kalender'}${e.act?` · <b style="color:var(--ink)">Werkelijk:</b> ${esc(e.act)}`:''}</p>
      <p>${esc(T.why)}</p><p><b style="color:var(--ink)">Relevante assets:</b> ${esc((e.sym?[e.sym,...T.assets]:T.assets).join(', ')||e.sym)} · Bron: ${e.url?`<a href="${e.url}" target="_blank" rel="noopener">${esc(e.src)}</a>`:esc(e.src)}</p>
      <div class="rem" style="margin-top:10px" aria-label="Herinneringen">${[[1440,'24 uur'],[60,'1 uur'],[15,'15 min']].map(([o,l])=>`<button class="${set.includes(o)?'on':''}" data-r="${e.id}|${o}">${l}</button>`).join('')}<button data-ics="${e.id}" title="Agendabestand (.ics) voor Apple, Outlook en Google">${ico('cal','style="width:14px;height:14px;vertical-align:-2px"')} Agenda</button><a class="remlink" href="${gcal(e)}" target="_blank" rel="noopener">Google Agenda ↗</a></div></div></div>`}).join('')+(S.settings.fhKey?'':`<p class="note" style="margin-top:14px">Kwartaalcijfers van grote bedrijven verschijnen hier zodra aandelendata (Finnhub) gekoppeld is.</p>`);
    }
    $$('[data-cd]',el).forEach(c=>c.textContent=countdown(+c.dataset.cd));
  }
};

/* ---------------- SCANNER ---------------- */
const SCF={m:'all',r:'all',mo:'all',t:'all'};
Pages.scanner={
  title:()=>'Opportunity Scanner',
  html:()=>`<div class="phead"><div><h1>Opportunity Scanner</h1><p>Assets die op dit moment opvallen in de data: volume, momentum, breakouts, volatiliteit, ontkoppeling van Bitcoin, sentiment en nieuws. Opvallend betekent niet dat een koers gaat stijgen.</p></div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px" id="sfl">
    <div class="chips">${[['all','Alles'],['crypto','Crypto'],['stock','Aandelen']].map(([v,l])=>`<button class="chip ${SCF.m===v?'on':''}" data-k="m" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="chips">${[['all','Elk risico'],['Laag','Laag'],['Gemiddeld','Gemiddeld'],['Hoog','Hoog']].map(([v,l])=>`<button class="chip ${SCF.r===v?'on':''}" data-k="r" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="chips">${[['all','Elk momentum'],['pos','Positief'],['neg','Negatief']].map(([v,l])=>`<button class="chip ${SCF.mo===v?'on':''}" data-k="mo" data-v="${v}">${l}</button>`).join('')}</div>
    <select class="inp" id="stype" style="width:auto;height:32px;font-size:14px" aria-label="Signaaltype"><option value="all">Alle signalen</option>${['Volumepiek','Breakout 30d','Breakdown 30d','Sterk momentum','Zwak momentum','Volatiliteit ↑','Ontkoppeld van BTC','RSI overkocht','RSI oververkocht','Sentimentomslag','Nieuwspiek','Grote dagstijging','Grote dagdaling'].map(t=>`<option ${SCF.t===t?'selected':''}>${t}</option>`).join('')}</select></div>
  <div class="grid g3" id="sgrid"></div><p class="disc">Opvallendheid (0–100) telt op uit de gedetecteerde signalen: volume tot 25, breakout 20, momentum tot 20, ontkoppeling 15, volatiliteit 10, sentimentomslag 10, nieuws tot 12. Risico: hoog bij volatiliteit &gt;7% per dag of &lt;€1 mln dagvolume.</p>`,
  mount(el){$('#sfl',el).onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;SCF[b.dataset.k]=b.dataset.v;$$(`[data-k="${b.dataset.k}"]`,el).forEach(x=>x.classList.toggle('on',x===b));this.live(el,null,'calc')};
    $('#stype',el).onchange=e=>{SCF.t=e.target.value;this.live(el,null,'calc')};bindStars(el)},
  live(el,arg,kind){if(kind!=='calc'&&$('#sgrid',el).dataset.f)return;$('#sgrid',el).dataset.f=1;
    let L=scan();if(SCF.m!=='all')L=L.filter(o=>o.market===SCF.m);if(SCF.r!=='all')L=L.filter(o=>o.risk===SCF.r);if(SCF.mo!=='all')L=L.filter(o=>o.mom===SCF.mo);if(SCF.t!=='all')L=L.filter(o=>o.d.some(d=>d[0]===SCF.t));
    $('#sgrid',el).innerHTML=L.length?L.slice(0,30).map(o=>{const a=o.a;const nN=S.clusters.filter(c=>c.assets.includes(a.sym)).length;
      return `<article class="opp"><div class="top"><a href="#asset-${a.sym.toLowerCase()}" style="text-decoration:none">${an(a)}</a><div class="px"><b>${money(a,a.price)}</b><span class="num ${cls(a.ch24)}" style="font-size:13px">${pct(a.ch24)}</span></div></div>
      <div style="display:flex;justify-content:space-between;font-size:13px" class="muted"><span>Volume ${a.volQ?big(a.volQ):'—'}</span><span>Opvallendheid <b style="color:var(--ink)">${o.score}</b>/100</span></div>
      <div class="det">${o.d.map(([l,v])=>`<span class="tag navy">${esc(l)}${v?' · '+esc(v):''}</span>`).join('')}</div>
      <div class="note"><b>Waarom het opvalt:</b> ${esc(o.d.map(d=>d[0].toLowerCase()+(d[1]?' ('+d[1]+')':'')).join(', '))}.</div>
      <div class="pn"><div><h5>Positieve factoren</h5><ul>${(o.pos.length?o.pos:['Geen']).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div><div><h5>Negatieve factoren</h5><ul>${(o.neg.length?o.neg:['Geen']).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding-top:10px;border-top:1px solid var(--line)"><span class="tag ${o.risk==='Hoog'?'down':o.risk==='Laag'?'up':'warn'}">Risico ${o.risk}</span><span>${a.s?senti(a.s):''}</span></div>
      <div style="display:flex;gap:8px"><a class="btn sm" href="#asset-${a.sym.toLowerCase()}">Analyse</a><a class="btn sm ghost" href="#waarom-${a.sym.toLowerCase()}">Waarom?</a>${nN?`<button class="btn sm ghost" data-n="${a.sym}">Nieuws (${nN})</button>`:''}</div></article>`}).join(''):`<div class="empty" style="grid-column:1/-1">${S.lastCalc?'Geen assets die nu opvallen binnen dit filter.':'Scanner wacht op marktdata en historie…'}</div>`;
    $$('[data-n]',el).forEach(b=>b.onclick=()=>newsDrawer(getAsset(b.dataset.n)));
  }
};

/* ---------------- NIEUWS ---------------- */
const NF={c:'all'};
Pages.nieuws={
  title:()=>'Nieuws',
  html:()=>`<div class="phead"><div><h1>Nieuws</h1><p>Berichten uit meerdere bronnen, ontdubbeld tot één cluster per gebeurtenis, met labels voor type (feit, verwachting, gerucht, interpretatie, speculatie), toon en betrokken assets.</p></div></div>
  <div class="chips" id="nf" style="margin-bottom:14px">${[['all','Alles'],['watch','Watchlist'],['crypto','Crypto'],['macro','Macro'],['regulation','Regelgeving'],['security','Beveiliging'],['etf','ETF'],['earnings','Bedrijfscijfers'],['geo','Geopolitiek']].map(([v,l])=>`<button class="chip ${NF.c===v?'on':''}" data-c="${v}">${l}</button>`).join('')}</div>
  <div class="grid g2"><div class="card"><div class="chead"><h2>Geclusterd nieuws</h2><span class="src" id="nsrc"></span></div><div id="nlist"></div></div>
  <div class="card"><div class="chead"><h2>Live feed</h2><div class="chips" id="ntab"><button class="chip on" data-m="crypto">Crypto</button><button class="chip" data-m="stock">Aandelen</button></div></div><div class="tv" id="ntv" style="height:820px;border:0"></div></div></div>`,
  mount(el){$('#nf',el).onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;NF.c=b.dataset.c;$$('#nf .chip',el).forEach(x=>x.classList.toggle('on',x===b));this.live(el,null,'calc')};
    const feed=m=>tv($('#ntv',el),'timeline',{feedMode:'market',market:m,displayMode:'regular',width:'100%',height:'100%'});feed('crypto');
    $('#ntab',el).onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;$$('#ntab .chip',el).forEach(x=>x.classList.toggle('on',x===b));feed(b.dataset.m)}},
  live(el,arg,kind){if(kind!=='calc'&&$('#nlist',el).dataset.f)return;$('#nlist',el).dataset.f=1;
    let L=S.clusters;const c=NF.c;
    if(c==='watch')L=L.filter(x=>x.assets.some(a=>S.watch.includes(a)));else if(c==='crypto')L=L.filter(x=>x.assets.some(a=>S.crypto.has(a))||x.items.some(i=>i.feed==='CryptoCompare'));else if(c!=='all')L=L.filter(x=>x.cat===c);
    const raw=S.clusters.reduce((s,x)=>s+x.items.length,0);
    $('#nsrc',el).textContent=`${raw} berichten → ${S.clusters.length} clusters`;
    $('#nlist',el).innerHTML=L.length?L.slice(0,50).map(x=>clusterRow(x)).join(''):`<div class="empty">${S.src.cc.st==='err'&&S.src.fh.st!=='ok'?'Nieuwsbronnen nu niet bereikbaar: '+esc(S.src.cc.msg)+'. De live feed rechts werkt via TradingView.':'Geen berichten voor dit filter.'}</div>`;
  }
};

/* ---------------- WATCHLIST ---------------- */
Pages.watchlist={
  title:()=>'Watchlist',
  html:()=>`<div class="phead"><div><h1>Watchlist</h1><p>Je gevolgde assets met sentiment en de belangrijkste verklaring. Voeg assets toe met de ster in Markten of op een assetpagina. Meldingen kun je beperken tot je watchlist.</p></div></div><div class="card flush"><div class="tw"><table class="stack"><thead><tr><th style="width:44px"></th><th>Asset</th><th class="n">Koers</th><th class="n">Verandering</th><th>Sentiment</th><th>Belangrijkste verklaring</th></tr></thead><tbody id="wl"></tbody></table></div></div>`,
  mount(el){bindStars(el);$('#wl',el).onclick=e=>{if(e.target.closest('[data-star]'))return;const tr=e.target.closest('tr[data-s]');if(tr)location.hash='#asset-'+tr.dataset.s.toLowerCase()}},
  live(el,arg,kind){const L=S.watch.map(getAsset).filter(Boolean);
    $('#wl',el).innerHTML=L.length?L.map(a=>{const w=kind==='calc'||!a._w?(a._w=whyMoving(a)):a._w;return `<tr data-s="${a.sym}"><td data-l="">${star(a.sym)}</td><td data-l="Asset">${an(a)}</td><td class="n" data-l="Koers">${a.price!=null?money(a,a.price):'—'}</td><td class="n ${cls(a.ch24)}" data-l="Verandering">${pct(a.ch24)}</td><td data-l="Sentiment">${senti(a.s)}</td><td data-l="Verklaring" style="white-space:normal;max-width:420px;font-size:13px" class="muted">${esc(w.summary)}</td></tr>`}).join(''):`<tr><td colspan="6"><div class="empty">Je watchlist is leeg.</div></td></tr>`}
};

/* ---------------- INSTELLINGEN ---------------- */
Pages.instellingen={
  title:()=>'Instellingen',
  html(){const s=S.settings,u=LS.get('user',{}),t=LS.get('totp',null);
    const sw=(id,on)=>`<label class="sw"><input type="checkbox" id="${id}" ${on?'checked':''}><span></span></label>`;
    const CATS=[['move','Ongebruikelijke koersbewegingen'],['sudden','Plotselinge bewegingen (15 min)'],['volume','Volumepieken'],['breakout','Technische doorbraken'],['market','Marktbrede bewegingen en sentiment'],['macro','Macro: Fed, ECB, CPI, banen, herinneringen'],['etf','ETF-instroom en -uitstroom'],['regulation','Regelgeving'],['security','Beveiligingsincidenten'],['earnings','Bedrijfsresultaten'],['geo','Geopolitiek'],['watchnews','Nieuws over je watchlist'],['whale','Grote crypto-transacties']];
    return `<div class="phead"><div><h1>Instellingen</h1><p>Account, beveiliging, meldingen en databronnen.</p></div></div>
    <div class="grid g2"><div class="grid" style="align-content:start">
    <div class="card"><div class="chead"><h2>Account en beveiliging</h2></div>
      <div class="set"><div><b>${esc(u.name||'Gebruiker')}</b><p>${esc(u.email||'')}</p></div><button class="btn ghost sm" id="logout">Uitloggen</button></div>
      <div class="set"><div><b>Tweestapsverificatie</b><p>${t?'Actief via authenticator-app (TOTP, 6 cijfers, elke 30 s nieuw).':'Actief via code bij inloggen (demo). Stel een authenticator-app in voor echte TOTP-codes.'}</p></div><button class="btn sm ${t?'ghost':''}" id="totpbtn">${t?'Uitschakelen':'Authenticator instellen'}</button></div>
      <div id="totpsetup"></div>
      <div class="set"><div><b>Vertrouwde apparaten</b><p>${LS.get('trust',0)>Date.now()?'Dit apparaat is vertrouwd tot '+new Date(LS.get('trust',0)).toLocaleDateString('nl-NL'):'Geen vertrouwde apparaten'}</p></div>${LS.get('trust',0)>Date.now()?'<button class="btn ghost sm" id="untrust">Intrekken</button>':''}</div>
      <p class="note">Prototype: account en codes worden lokaal in deze browser gecontroleerd. De productieversie gebruikt een beveiligde server, versleutelde opslag, sms/e-mailcodes, passkeys en Face ID / vingerafdruk in de app.</p></div>
    <div class="card"><div class="chead"><h2>Meldingen</h2></div>
      <div class="set"><div><b>Market Impact Alerts</b><p>Meldingen in de app bij gebeurtenissen boven je drempel.</p></div>${sw('s_notify',s.notify)}</div>
      <div class="set"><div><b>Pushmeldingen in de browser</b><p>${'Notification' in window?'Ook meldingen als Vantis op de achtergrond staat.':'Niet ondersteund in deze browser.'}</p></div>${sw('s_browser',s.browser)}</div>
      <div class="set" style="grid-template-columns:1fr"><div><b>Minimale Impact Score: <span id="minv">${s.minScore}</span></b><p>Alleen meldingen vanaf deze score. 60 = hoge marktimpact.</p><input type="range" min="0" max="95" step="5" id="s_min" value="${s.minScore}" style="margin-top:10px"></div></div>
      <div class="set"><div><b>Alleen mijn watchlist</b><p>Beperk meldingen tot assets op je watchlist (${S.watch.length}).</p></div>${sw('s_scope',s.scope==='watch')}</div>
      <div class="set"><div><b>Stille uren</b><p>Geen meldingen van <input type="time" id="s_qf" value="${s.quietFrom}" class="inp" style="display:inline-block;width:110px;height:34px;font-size:14px"> tot <input type="time" id="s_qt" value="${s.quietTo}" class="inp" style="display:inline-block;width:110px;height:34px;font-size:14px">. Herinneringen gaan wel door.</p></div>${sw('s_quiet',s.quiet)}</div>
      <div style="margin-top:8px"><b style="font-size:14px">Onderwerpen</b><div style="display:grid;gap:2px;margin-top:6px">${CATS.map(([k,l])=>`<label class="chk" style="margin:4px 0"><input type="checkbox" data-cat="${k}" ${s.cats[k]!==false?'checked':''}> ${l}${k==='whale'?' <span class="faint">(bron volgt in fase 2)</span>':''}</label>`).join('')}</div></div>
      <p class="note">Dubbele meldingen worden voorkomen: per asset en type maximaal één melding per 3 uur, nieuws wordt eerst ontdubbeld.</p>
      <button class="btn ghost sm" id="testn">Testmelding sturen</button></div></div>
    <div class="grid" style="align-content:start">
    <div class="card"><div class="chead"><h2>Databronnen</h2><span class="src">Live status</span></div><div id="srcs"></div>
      <div class="field" style="margin-top:14px"><label for="fhk">Finnhub API-sleutel (aandelen + extra nieuws)</label><div style="display:flex;gap:8px"><input class="inp" id="fhk" type="password" value="${esc(s.fhKey)}" placeholder="Gratis via finnhub.io" autocomplete="off"><button class="btn" id="fhsave">Opslaan</button></div><p class="note">Alleen opgeslagen in deze browser. In productie draait dit via de Vantis-server, zodat sleutels nooit in de app staan.</p></div></div>
    <div class="card"><div class="chead"><h2>Weergave</h2></div><div class="set"><div><b>Donkere modus</b><p>Licht is de standaard; donker is prettiger 's avonds.</p></div>${sw('s_dark',s.theme==='dark')}</div></div>
    <div class="card"><div class="chead"><h2>Koppelingen</h2><span class="lockbadge">Fase 2</span></div>
      ${[['Bankrekening koppelen','Saldo en stortingen via een gelicenseerde PSD2-partner.'],['Beleggen in Vantis','Crypto en aandelen kopen en verkopen in de app. Vereist een MiCA-vergunning (AFM) of een gelicenseerde partner, KYC en bewaring van tegoeden.'],['Autopilot','Belegt automatisch binnen jouw risicoprofiel. Vereist vergunning voor vermogensbeheer en uitgebreide toetsing.']].map(([t,d])=>`<div class="set lock"><div><b>${t}</b><p>${d}</p></div><span class="tag warn">Gepland</span></div>`).join('')}
      <p class="note">Bewust nog niet actief: eerst bouwt Vantis het intelligence-platform; geldzaken komen pas met de juiste vergunningen en partners.</p></div>
    <div class="card"><div class="chead"><h2>Over Vantis</h2></div><p class="note" style="margin:0">Vantis · prototype ${new Date().getFullYear()}. Koersen: Bitvavo (crypto, realtime), Finnhub (VS-aandelen, optioneel), TradingView (grafieken, kalender, heatmap; aandelen kunnen vertraagd zijn). Nieuws: CryptoCompare, Finnhub, TradingView. Vantis geeft geen financieel advies.</p></div>
    </div></div>`},
  mount(el){
    const s=S.settings,save=()=>{saveSettings();};
    $('#logout',el).onclick=()=>Auth.logout();
    $('#untrust',el)&&($('#untrust',el).onclick=()=>{LS.set('trust',0);UI.route()});
    $('#s_notify',el).onchange=e=>{s.notify=e.target.checked;save()};
    $('#s_browser',el).onchange=async e=>{s.browser=e.target.checked;save();if(s.browser&&'Notification' in window&&Notification.permission!=='granted'){const p=await Notification.requestPermission().catch(()=>'denied');if(p!=='granted'){UI.toast({title:'Browsermeldingen geweigerd',body:'Sta meldingen toe in je browserinstellingen. Open Vantis via https voor pushmeldingen.'});e.target.checked=false;s.browser=false;save()}}};
    $('#s_min',el).oninput=e=>{s.minScore=+e.target.value;$('#minv',el).textContent=s.minScore;save()};
    $('#s_scope',el).onchange=e=>{s.scope=e.target.checked?'watch':'all';save()};
    $('#s_quiet',el).onchange=e=>{s.quiet=e.target.checked;save()};$('#s_qf',el).onchange=e=>{s.quietFrom=e.target.value;save()};$('#s_qt',el).onchange=e=>{s.quietTo=e.target.value;save()};
    $$('[data-cat]',el).forEach(c=>c.onchange=()=>{s.cats[c.dataset.cat]=c.checked;save()});
    $('#testn',el).onclick=()=>Alerts.push({id:'test:'+Date.now(),cat:'market',score:72,force:true,title:'Testmelding: zo ziet een Vantis-melding eruit',body:'Wat er gebeurde, waarom het belangrijk is, welke assets geraakt worden en hoe betrouwbaar de bron is.',href:'#impact'});
    $('#s_dark',el).onchange=e=>{setTheme(e.target.checked?'dark':'light')};
    $('#fhsave',el).onclick=()=>{s.fhKey=$('#fhk',el).value.trim();save();S.src.fh.st=s.fhKey?'wait':'off';S.src.fh.msg=s.fhKey?'Verbinden…':'Niet gekoppeld';UI.toast({title:s.fhKey?'Sleutel opgeslagen, aandelendata laden…':'Sleutel verwijderd'});if(s.fhKey){loadStocks();loadFHNews().then(recalc);loadEarnings()}this.live(el,null,'calc')};
    $('#totpbtn',el).onclick=async()=>{
      if(LS.get('totp',null)){LS.set('totp',null);UI.toast({title:'Authenticator uitgeschakeld'});UI.route();return}
      const sec=b32rand(20),u=LS.get('user',{});const uri=`otpauth://totp/Vantis:${encodeURIComponent(u.email||'gebruiker')}?secret=${sec}&issuer=Vantis&digits=6&period=30`;
      $('#totpsetup',el).innerHTML=`<div class="callout" style="margin:6px 0 10px"><b>1.</b> Scan de QR-code met je authenticator-app, of voer de sleutel handmatig in.<div id="qr" style="margin:12px 0;background:#fff;padding:8px;display:inline-block"></div><div class="num" style="font-size:13px;word-break:break-all;margin-bottom:10px">Sleutel: <b>${sec.match(/.{1,4}/g).join(' ')}</b></div><b>2.</b> Vul de code uit de app in:<div style="display:flex;gap:8px;margin-top:8px"><input class="inp" id="tcode" inputmode="numeric" maxlength="6" placeholder="123456" style="max-width:160px"><button class="btn" id="tok">Bevestigen</button></div><div class="err" id="terr"></div></div>`;
      try{if(window.QRCode)new QRCode($('#qr',el),{text:uri,width:160,height:160,colorDark:'#17243A',colorLight:'#ffffff'});else $('#qr',el).outerHTML='<p class="note">QR-bibliotheek niet geladen; gebruik de sleutel.</p>'}catch(x){}
      $('#tok',el).onclick=async()=>{const c=$('#tcode',el).value.trim();try{if(await totpCheck(sec,c)){LS.set('totp',sec);UI.toast({title:'Authenticator gekoppeld',body:'Vanaf nu vraagt Vantis bij inloggen de code uit je app.'});UI.route()}else $('#terr',el).textContent='Code klopt niet. Controleer of de tijd op je telefoon klopt.'}catch(x){$('#terr',el).textContent='WebCrypto niet beschikbaar in deze omgeving (open via https).'}};
    };
  },
  live(el){const st={ok:['live','Actief'],warn:['warn','Herstellen'],wait:['warn','Laden'],err:['off','Fout'],off:['','Niet gekoppeld']};
    $('#srcs',el).innerHTML=Object.values(S.src).map(x=>`<div class="set"><div><b style="display:flex;gap:8px;align-items:center"><span class="dot ${st[x.st][0]}"></span>${esc(x.name)}</b><p>${esc(x.msg)}${x.ts?' · '+ago(x.ts):''}</p><p class="faint" style="font-size:12px">${esc(x.kind)}</p></div><span class="tag ${x.st==='ok'?'up':x.st==='err'?'down':''}">${st[x.st][1]}</span></div>`).join('')}
};

/* =====================================================================
   BOOT
   ===================================================================== */
function setTheme(t){S.settings.theme=t;saveSettings();document.documentElement.dataset.theme=t;UI.route()}
const Boot={started:false,
  async start(){if(this.started)return;this.started=true;
    $('#nav').innerHTML=NAV.map(([k,l,i])=>k==='grp'?`<div class="grp">${l}</div>`:`<a href="#${k}" data-p="${k}">${ico(i)}<span>${l}</span></a>`).join('');
    $('#tabbar').innerHTML=[['overzicht','Overzicht','home'],['markten','Markten','markets'],['waarom','Waarom?','why'],['impact','Impact','impact'],['more','Meer','more']].map(([k,l,i])=>`<a href="${k==='more'?'javascript:void 0':'#'+k}" data-p="${k}">${ico(i)}<span>${l}</span></a>`).join('');
    $('#tabbar [data-p="more"]').onclick=()=>{$('#overlay').innerHTML=`<div class="scrim" id="scrim" style="align-items:flex-end"><div class="sheet">${NAV.filter(([k])=>k!=='grp'&&!['overzicht','markten','waarom','impact'].includes(k)).map(([k,l,i])=>`<a href="#${k}">${ico(i)}<span>${l.replace('Opportunity ','')}</span></a>`).join('')}</div></div>`;$('#scrim').onclick=e=>{if(e.target.id==='scrim'||e.target.closest('a'))closeOverlay()}};
    $('#themebtn').onclick=()=>setTheme(dark()?'light':'dark');
    $('#bell').onclick=()=>location.hash='#meldingen';
    $('#status').onclick=()=>location.hash='#instellingen';
    initSearch();UI.badge();window.addEventListener('hashchange',()=>UI.route());UI.route();
    setInterval(()=>{shellLive();const pg=Pages[UI.cur];if(UI.el)$$('[data-cd]',UI.el).forEach(c=>c.textContent=countdown(+c.dataset.cd))},1000);
    Alerts.silentUntil=Date.now()+90000;Push.reg();Sync.pull().then(()=>{if(!S.settings.onboarded)setTimeout(()=>Onb.open(),400)});NC.pull();setInterval(()=>NC.pull(),2*60*1000);setInterval(()=>PA.checkLocal(),30*1000);loadServer();setInterval(loadServer,60*1000);connectWS();await loadNames();await loadTickers();recalc();if(['asset','waarom'].includes(UI.cur))UI.route();
    await loadCandles();
    loadCC().then(()=>{cluster();recalc()});loadFHNews().then(recalc);loadStocks();loadEarnings();
    setInterval(recalc,60*1000);setInterval(loadTickers,5*60*1000);setInterval(loadCandles,30*60*1000);
    setInterval(()=>{loadCC().then(recalc);loadFHNews()},5*60*1000);setInterval(loadStocks,3*60*1000);setInterval(remTick,20*1000);remTick();
  }
};
document.documentElement.dataset.theme=S.settings.theme==='dark'?'dark':'light';
$$('[data-logo]').forEach(e=>e.innerHTML=LOGO);
Api.health().then(()=>Auth.init());
