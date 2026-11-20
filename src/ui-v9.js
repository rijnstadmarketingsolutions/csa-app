/* =====================================================================
   v9 — Overzicht in één oogopslag
   - nieuw blok "Marktstatus": oordeel + kerncijfers + wat er vandaag speelt
   - compacte koerstegels (6 op een rij)
   - rustigere standaardindeling; bestaande indelingen worden eenmalig vernieuwd
   ===================================================================== */
OV.DEF.blocks=[['glance','full',1],['prices','full',1],['chart','wide',1],['movers','third',1],['impact','half',1],['events','half',1],
  ['watch','half',0],['paper','half',0],['heat','half',0],['why','third',0],['senti','third',0],['news','half',0],['notif','half',0],['stocks','half',0],['brief','full',0],['pulse','full',0]];
OV.DEF.prices=['BTC','ETH','SOL','XRP','ADA','DOGE'];
OV.LAYOUT=2;
{const oc=OV.cfg.bind(OV),os=OV.save.bind(OV);
  OV.cfg=function(){const h=S.settings.home;if(h&&(h.v||1)<OV.LAYOUT&&h.blocks){const keep={...h};delete keep.blocks;keep.v=OV.LAYOUT;
      if(!h.prices||h.prices.join()==='BTC,ETH,SOL,XRP')delete keep.prices;S.settings.home=keep;saveSettings()}return oc()};
  OV.save=function(c){c.v=OV.LAYOUT;os(c)}}

const glStat=(label,val,sub,bar,href)=>`<${href?`a href="${href}"`:'div'} class="gst"><small>${label}</small><b class="num">${val}</b>${sub?`<span>${sub}</span>`:''}${bar||''}</${href?'a':'div'}>`;
const glMood=s=>s==null?'':s>=25?'up':s<=-25?'down':'';
OV.B.glance={t:'Marktstatus',d:'In één oogopslag: hoe de markt ervoor staat, de kerncijfers en wat er vandaag speelt.',bare:true,
  html:()=>`<div class="card glance" id="glance"><div class="glmood" id="glmood">${skel(2)}</div><div class="glstats" id="glstats"></div><div class="gltoday"><h3>Vandaag</h3><div id="gltoday"></div></div></div>`,
  mount(el){(async()=>{try{if(!BR.d&&Api.on){const d=await Api.call('/api/briefing');if(!d.pending)BR.d=d}}catch(e){}if(UI.el===el)OV.B.glance.live(el,'calc')})();
    if(typeof PT!=='undefined'&&PT.load)PT.load().then(()=>{if(UI.el===el)OV.B.glance.live(el,'calc')}).catch(()=>{})},
  live(el){const m=$('#glmood',el);if(!m)return;const mk=S.market,o=S.senti.overall,X=S.extra||{},g=X.global,f=X.fng&&X.fng[0],btc=S.crypto.get('BTC');
    const head=BR.d&&BR.d.headline?`<a class="glhead" href="#briefing">${esc(BR.d.headline)}</a>`:
      `<span class="glhead">${btc&&btc.ch24!=null?`${btc.ch24<-1?'Crypto onder druk':btc.ch24>1?'Crypto in de lift':'Rustige cryptomarkt'}: Bitcoin ${pct(btc.ch24)}${mk.n?`, ${Math.round(mk.breadth*100)}% van de top-${mk.n} in de plus`:''}`:'Marktdata laden…'}</span>`;
    m.innerHTML=`<div class="glg">${gauge(o?.score,{w:118,sw:10})}</div><div class="glv"><small>Vantis Sentiment</small><b class="${glMood(o?.score)}">${o?esc(o.l):'Berekenen…'}</b>${head}${o&&o.reasons&&o.reasons[0]?`<span class="glwhy">${esc(o.reasons[0].t)}</span>`:''}</div>`;
    const br=mk.n?Math.round(mk.breadth*100):null;
    $('#glstats',el).innerHTML=
      glStat('Marktbreedte',br!=null?br+'%':'—',mk.n?`van top-${mk.n} stijgt`:'',br!=null?`<i class="gbar"><i style="width:${br}%;background:var(--${br<40?'down':br>60?'up':'ink3'})"></i></i>`:'','#markten')+
      glStat('Volume',mk.volRegime?nlN(mk.volRegime,2)+'×':'—','t.o.v. normaal',mk.volRegime?`<i class="gbar"><i style="width:${clamp(mk.volRegime/2*100,4,100)}%;background:var(--ink2)"></i></i>`:'','#markten')+
      glStat('Fear & Greed',f?f.v:'—',f?esc(({'Extreme Fear':'Extreme angst','Fear':'Angst','Neutral':'Neutraal','Greed':'Hebzucht','Extreme Greed':'Extreme hebzucht'})[f.l]||f.l):'externe index',f?`<i class="gbar fg"><i style="left:${f.v}%"></i></i>`:'')+
      glStat(g?'BTC-dominantie':'Marktwaarde',g?nlN(g.btcDom,1)+'%':'—',g?`marktwaarde ${big(g.cap)}`:'via de server','');
    const T=[];const nx=Radar.upcoming(1)[0];
    if(nx)T.push(`<a class="gtr" href="#radar">${ico('cal')}<span><b>${esc(nx.title)}</b><small><span data-cd="${nx.t}">${countdown(nx.t)}</span> · impact ${Radar.imp(nx).score}</small></span></a>`);
    const ev=[...S.events.values()].sort((a,b)=>b.score-a.score||b.first-a.first)[0];
    if(ev)T.push(`<a class="gtr" href="#impact">${ico('impact')}<span><b>${esc(ev.title)}</b><small>Impact ${ev.score}/100 · ${ev.dir>0?'mogelijk positief':ev.dir<0?'mogelijk negatief':'richting onduidelijk'}</small></span></a>`);
    const P=typeof PT!=='undefined'&&PT.P;if(P){const c=pfCalc(P);T.push(`<a class="gtr" href="#handel">${ico('wallet')}<span><b>Oefenportefeuille <span class="num">${eur2(c.tot)}</span></b><small class="${cls(c.ret)}">${sgnEur(c.ret)} (${pct(c.retP)}) sinds start</small></span></a>`)}
    const un=NC.items().filter(x=>!NC.read.has(x.id)).length;if(un)T.push(`<a class="gtr" href="#meldingen">${ico('bell')}<span><b>${un} ongelezen ${un===1?'melding':'meldingen'}</b><small>Bekijk je meldingen</small></span></a>`);
    $('#gltoday',el).innerHTML=T.length?T.slice(0,3).join(''):'<div class="empty">Geen bijzonderheden vandaag.</div>';
    $$('[data-cd]',el).forEach(c=>c.textContent=countdown(+c.dataset.cd))}};

/* compacte koerstegels: één regel per munt, zes op een rij */
OV.B.prices.html=()=>`<section class="ptiles" id="kpis"></section>`;
OV.B.prices.live=function(el){const c=OV.cfg();const L=c.prices.map(ovA).filter(Boolean);const box=$('#kpis',el);if(!box)return;
  if(!S.crypto.size){box.innerHTML=`<div style="grid-column:1/-1">${noData()}</div>`;return}
  const old=$$('.ptv',box).map(x=>x.textContent);
  box.innerHTML=L.length?L.map(a=>{const p=ovPx(a);return `<a class="ptile" href="#asset-${a.sym.toLowerCase()}"><span class="pth">${ab(a)}<b>${esc(a.sym)}</b><span class="num ${cls(a.ch24)}">${pct(a.ch24)}</span></span><span class="ptv num">${p!=null?money(a,p):'—'}</span>${a.kind==='crypto'?spark(hseries(a)||series(a),120,22):'<span class="pts">'+(a.kind==='stock'?'vandaag':'')+'</span>'}</a>`}).join('')+`<button class="ptile ptadd" data-ovcfg="prices" aria-label="Koersen kiezen">${ico('plus')}</button>`
    :`<button class="ptile ptadd wide" data-ovcfg="prices">${ico('plus')} Kies je koersen</button>`;
  $$('.ptv',box).forEach((x,i)=>{if(old[i]&&old[i]!==x.textContent){const p=s=>parseFloat(s.replace(/[^0-9,−-]/g,'').replace(',','.'));const a=p(old[i]),b=p(x.textContent);if(isFinite(a)&&isFinite(b)&&a!==b)x.classList.add(b>a?'flash-up':'flash-down')}})};

/* volle breedte voor het nieuwe blok, ook in de bewerkmodus */
{const ob=Pages.overzicht.block;Pages.overzicht.block=function(b,i,n){if(b.id==='glance')b={...b,w:'full'};return ob.call(this,b,i,n)}}
/* 'Waarom beweegt de markt?' staat al in Marktstatus: de kop compacter maken */
{const oh=Pages.overzicht.html;Pages.overzicht.html=function(){return oh.call(this).replace('<div class="phead">','<div class="phead ovhead">')}}
/* impact-feed op het overzicht: de drie belangrijkste */
{const ol=OV.B.impact.live;OV.B.impact.live=function(el,kind){const b=$('#dimp',el);if(!b||(kind!=='calc'&&b.dataset.f))return;b.dataset.f=1;const ev=[...S.events.values()].sort((a,b)=>b.score-a.score||b.first-a.first).slice(0,3);b.innerHTML=ev.length?ev.map(e=>impRow(e)).join(''):`<div class="empty">Nog geen gebeurtenissen boven de drempel. Vantis meldt pas iets als data daar aanleiding toe geeft.</div>`}}
/* vanaf de landingspagina: "Gratis account maken" opent direct het registratieformulier */
if(/[?&]start=register\b/.test(location.search)&&!(Api&&Api.authed)){const go=()=>{const b=$('#toreg');if(b&&!b.closest('.hidden'))b.click()};setTimeout(go,60);try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}}
