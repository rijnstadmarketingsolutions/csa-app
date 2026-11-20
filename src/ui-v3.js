/* =====================================================================
   CSA 1.2 — uitleg (beginnersmodus), onboarding, koersalerts, meldingencentrum,
   grafiek met gebeurtenissen, vergelijken, agenda-export, briefing, deelkaart
   ===================================================================== */
if(!S.settings.mode)S.settings.mode='beginner';
if(S.settings.briefing==null)S.settings.briefing=true;
IC.bell='<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>';
IC.sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
IC.compare='<path d="M7 4v16M17 4v16M3 8h8M13 16h8"/>';
IC.share='<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/>';
IC.cal='<rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 9h18M8 2v4M16 2v4M12 13v4M10 15h4"/>';
IC.alarm='<circle cx="12" cy="13" r="7"/><path d="M12 10v3l2 2M5 3 2 6M19 3l3 3"/>';
// navigatie in groepen
NAV.length=0;NAV.push(['grp','Markt'],['overzicht','Overzicht','home'],['briefing','Ochtendbriefing','sun'],['markten','Markten','markets'],['vergelijk','Vergelijken','compare'],['watchlist','Watchlist','star'],
  ['grp','Analyse'],['waarom','Waarom beweegt het?','why'],['impact','Impact & alerts','impact'],['radar','Event Radar','radar'],['scanner','Opportunity Scanner','scanner'],['nieuws','Nieuws','news'],['trackrecord','Track record','record'],
  ['grp','Jij'],['meldingen','Meldingen','bell'],['portefeuille','Portefeuille','wallet'],['premium','Premium','gem'],['instellingen','Instellingen','settings']);

/* ---------------- uitleg bij begrippen (beginnersmodus) ---------------- */
const GLOSS={
  rsi:['RSI (14 dagen)','Meet hoe snel een koers de afgelopen 14 dagen steeg of daalde, op een schaal van 0 tot 100. Boven 70 heet "overkocht" (snel gestegen, vaak afkoeling), onder 30 "oververkocht" (snel gedaald, soms herstel).'],
  vol:['Volatiliteit','Hoeveel de koers gemiddeld per dag beweegt, gemeten over 30 dagen. Bitcoin zit vaak rond 2–3%, kleine munten soms boven 8%. Hoe hoger, hoe groter de schommelingen en het risico.'],
  volx:['Volume ×','Hoeveel er in 24 uur verhandeld is vergeleken met een normale dag (30-daags gemiddelde). 2× betekent twee keer zoveel handel als normaal: er gebeurt iets.'],
  corr:['Correlatie met Bitcoin','Hoe sterk deze munt meebeweegt met Bitcoin, van −1 tot 1. Boven 0,7 = beweegt grotendeels mee; rond 0 = eigen koers.'],
  sma:['20-daags gemiddelde','De gemiddelde slotkoers van de afgelopen 20 dagen. Een koers erboven wijst op een opwaartse trend, eronder op een neerwaartse.'],
  range:['30-daags bereik','De laagste en hoogste koers van de afgelopen 30 dagen. Een doorbraak daarbuiten valt op.'],
  breadth:['Marktbreedte','Welk deel van de grootste munten vandaag stijgt. 80% = vrijwel alles stijgt; 20% = vrijwel alles daalt.'],
  volume:['Handelsvolume','Hoeveel er nu op de hele markt verhandeld wordt vergeleken met normaal. Hoog volume betekent dat bewegingen meer "gewicht" hebben.'],
  dom:['Bitcoin-dominantie','Het aandeel van Bitcoin in de totale waarde van alle crypto. Stijgt het, dan kiezen beleggers vaak voor de "veilige" munt; daalt het, dan gaat er meer geld naar altcoins.'],
  fng:['Fear & Greed-index','Een externe index (alternative.me) van 0 tot 100 die de stemming meet: 0 = extreme angst, 100 = extreme hebzucht. Los van de CSA-berekening.'],
  impact:['CSA Impact Score','Een score van 0 tot 100 voor hoe groot de invloed van een gebeurtenis op de markt kan zijn. Hij zegt iets over de omvang, niet over de richting.'],
  senti:['CSA Sentiment','De stemming volgens CSA, berekend uit koersbeweging, trend, volume, het 20-daags gemiddelde en de toon van het nieuws. Van −100 (bearish) tot +100 (bullish).'],
  z:['Normale dagbeweging','Hoeveel keer groter de beweging van vandaag is dan een normale dag voor deze asset. Vanaf 2× is het statistisch ongewoon.'],
  beta:['Beta t.o.v. Bitcoin','Hoeveel deze munt gemiddeld beweegt als Bitcoin 1% beweegt. Beta 1,5 = bij +1% Bitcoin gemiddeld +1,5%.'],
  cap:['Totale marktwaarde','De waarde van alle crypto samen (koers × aantal munten), volgens CoinGecko.']
};
const gl=(k,label)=>S.settings.mode==='pro'||!GLOSS[k]?label:`${label}<button type="button" class="gi" data-g="${k}" aria-label="Uitleg: ${esc(GLOSS[k][0])}">i</button>`;
document.addEventListener('click',e=>{const b=e.target.closest('[data-g]');const pop=$('#glpop');
  if(!b){if(pop&&!e.target.closest('#glpop'))pop.remove();return}
  e.preventDefault();e.stopPropagation();if(pop)pop.remove();const [t,d]=GLOSS[b.dataset.g];const r=b.getBoundingClientRect();
  const p=document.createElement('div');p.id='glpop';p.className='glpop';p.setAttribute('role','tooltip');p.innerHTML=`<b>${esc(t)}</b><p>${esc(d)}</p>`;document.body.appendChild(p);
  const w=Math.min(300,innerWidth-24);p.style.width=w+'px';p.style.left=clamp(r.left+r.width/2-w/2,12,innerWidth-w-12)+'px';const top=r.bottom+8;p.style.top=(top+p.offsetHeight>innerHeight-10?r.top-p.offsetHeight-8:top)+'px'},true);
addEventListener('scroll',()=>{const p=$('#glpop');if(p)p.remove()},{passive:true});

/* ---------------- onboarding ---------------- */
const Onb={step:0,picks:new Set(),
  open(){this.step=0;this.picks=new Set(S.watch);this.data={crypto:true,stocks:true,min:S.settings.minScore||60,brief:S.settings.briefing!==false,mode:S.settings.mode||'beginner'};this.draw()},
  draw(){const st=this.step,d=this.data;
    const C=['BTC','ETH','SOL','XRP','ADA','DOGE','LINK','AVAX','SUI','PEPE'],A=['NVDA','AAPL','MSFT','TSLA','ASML','COIN','MSTR','PLTR'];
    const chip=s=>{const a=getAsset(s);return `<button type="button" class="pick ${this.picks.has(s)?'on':''}" data-pick="${s}">${a?ab(a):''}<span>${esc(a?a.name:s)}</span></button>`};
    const pages=[
      `<div class="onb-hero"><span class="logo" data-logo style="width:84px;height:84px"></span></div><h2>Welkom bij Crypto Signal AI</h2><p class="muted">CSA volgt de markt voor je, 24 uur per dag, en vertelt je in gewone taal wat er gebeurt en waarom.</p>
       <ul class="onb-list"><li><b>Live koersen</b> van crypto en aandelen, met bron en tijd</li><li><b>Waarom beweegt het?</b> Oorzaken met bronnen, of eerlijk "nog onbekend"</li><li><b>Meldingen</b> bij gebeurtenissen die er echt toe doen</li></ul>`,
      `<h2>Wat wil je volgen?</h2><p class="muted">Je keuze komt op je watchlist. Je kunt dit later altijd aanpassen.</p>
       <div class="onb-toggle"><button type="button" class="${d.crypto?'on':''}" data-t="crypto">Crypto</button><button type="button" class="${d.stocks?'on':''}" data-t="stocks">Aandelen</button></div>
       ${d.crypto?`<div class="src" style="margin:14px 0 6px">Populaire munten</div><div class="picks">${C.map(chip).join('')}</div>`:''}
       ${d.stocks?`<div class="src" style="margin:14px 0 6px">Populaire aandelen</div><div class="picks">${A.map(chip).join('')}</div>`:''}`,
      `<h2>Hoe vaak wil je een melding?</h2><p class="muted">CSA geeft elke gebeurtenis een Impact Score van 0 tot 100. Kies vanaf welke score je een melding krijgt.</p>
       <div class="onb-opts">${[[80,'Alleen grote gebeurtenissen','Een paar keer per week'],[60,'Belangrijke gebeurtenissen','Aanbevolen · enkele per dag'],[40,'Alles wat opvalt','Voor actieve volgers']].map(([v,t,s])=>`<button type="button" class="opt ${d.min===v?'on':''}" data-min="${v}"><b>${t}</b><span>Score ${v}+ · ${s}</span></button>`).join('')}</div>
       <label class="chk" style="margin-top:14px"><input type="checkbox" id="onbbrief" ${d.brief?'checked':''}> Elke ochtend om 08:00 een korte marktbriefing</label>
       ${Push.supported()&&Api.authed?`<button type="button" class="btn ghost" id="onbpush" style="margin-top:6px">${ico('bell')}Pushmeldingen aanzetten</button><p class="note" id="onbpushmsg"></p>`:`<p class="note">${/iPhone|iPad/.test(navigator.userAgent)?'Op iPhone: zet CSA eerst op je beginscherm om pushmeldingen te krijgen.':'Pushmeldingen zet je aan bij Instellingen.'}</p>`}`,
      `<h2>Hoe ervaren ben je?</h2><p class="muted">Dit bepaalt hoeveel uitleg CSA geeft.</p>
       <div class="onb-opts">${[['beginner','Ik ben nieuw','Uitleg bij begrippen als RSI, volatiliteit en dominantie (tik op het i-teken)'],['pro','Ik ken de markt','Geen uitleg, meer cijfers zoals beta en z-score']].map(([v,t,s])=>`<button type="button" class="opt ${d.mode===v?'on':''}" data-mode="${v}"><b>${t}</b><span>${s}</span></button>`).join('')}</div>`];
    $('#overlay').innerHTML=`<div class="scrim onb-scrim"><div class="onb" role="dialog" aria-modal="true" aria-label="Welkom bij CSA"><div class="onb-dots">${pages.map((_,i)=>`<i class="${i===st?'on':''}"></i>`).join('')}</div><div class="onb-body">${pages[st]}</div>
      <div class="onb-foot"><button type="button" class="lnk" id="onbskip">${st?'Terug':'Overslaan'}</button><button type="button" class="btn" id="onbnext">${st===pages.length-1?'Starten':'Volgende'}</button></div></div></div>`;
    $$('#overlay [data-logo]').forEach(e=>e.innerHTML=LOGO);
    const o=$('#overlay');
    o.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const s=b.dataset.pick;this.picks.has(s)?this.picks.delete(s):this.picks.add(s);b.classList.toggle('on')});
    o.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{d[b.dataset.t]=!d[b.dataset.t];this.draw()});
    o.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{d.min=+b.dataset.min;this.draw()});
    o.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{d.mode=b.dataset.mode;this.draw()});
    const br=$('#onbbrief');if(br)br.onchange=()=>d.brief=br.checked;
    const pb=$('#onbpush');if(pb)pb.onclick=async()=>{try{await Push.enable();S.settings.browser=true;$('#onbpushmsg').textContent='Pushmeldingen staan aan.';pb.disabled=true}catch(x){$('#onbpushmsg').textContent=x.message}};
    $('#onbskip').onclick=()=>{if(st){this.step--;this.draw()}else this.finish(true)};
    $('#onbnext').onclick=()=>{if(st<pages.length-1){this.step++;this.draw()}else this.finish(false)};
  },
  finish(skip){const s=S.settings;if(!skip){S.watch=[...this.picks];LS.set('watch',S.watch);s.minScore=this.data.min;s.briefing=this.data.brief;s.mode=this.data.mode}s.onboarded=true;saveSettings();closeOverlay();UI.route();if(!skip)UI.toast({title:'Klaar! CSA is ingesteld',body:`${S.watch.length} assets op je watchlist · meldingen vanaf score ${s.minScore}.`})}
};

/* ---------------- koersalerts ---------------- */
const KINDS={above:'Koers boven',below:'Koers onder',up1h:'Stijgt in 1 uur met',down1h:'Daalt in 1 uur met',up24h:'Stijgt in 24 uur met',down24h:'Daalt in 24 uur met'};
const PA={list:null,
  async load(){try{this.list=Api.authed?(await Api.call('/api/alerts')).alerts:LS.get('palerts',[])}catch(e){this.list=[]}return this.list},
  async add(a){if(Api.authed)return Api.call('/api/alerts',{method:'POST',body:a});const q=getAsset(a.sym);if(!q||q.price==null)throw new Error('Geen koers voor '+a.sym);
    if(a.kind==='above'&&q.price>=a.value)throw new Error('De koers staat al boven deze waarde.');if(a.kind==='below'&&q.price<=a.value)throw new Error('De koers staat al onder deze waarde.');
    const L=LS.get('palerts',[]);L.unshift({...a,id:Date.now(),active:1,created:Date.now()});LS.set('palerts',L)},
  async del(id){if(Api.authed)return Api.call('/api/alerts/'+id,{method:'DELETE'});LS.set('palerts',LS.get('palerts',[]).filter(x=>x.id!==id))},
  checkLocal(){if(Api.authed)return;const L=LS.get('palerts',[]);let ch=false;
    for(const a of L){if(!a.active)continue;if(/1h|24h/.test(a.kind)&&a.fired&&Date.now()-a.fired<6*HOUR)continue;const q=getAsset(a.sym);if(!q||q.price==null)continue;
      const c1=(()=>{const t=q.ticks||[];const ref=t.find(x=>Date.now()-x[0]<=HOUR+5*MIN);return ref?(q.price/ref[1]-1)*100:null})();
      const hit={above:q.price>=a.value,below:q.price<=a.value,up1h:c1!=null&&c1>=a.value,down1h:c1!=null&&c1<=-a.value,up24h:q.ch24>=a.value,down24h:q.ch24<=-a.value}[a.kind];
      if(!hit)continue;ch=true;a.fired=Date.now();if(!/1h|24h/.test(a.kind))a.active=0;
      Alerts.push({id:'pa:'+a.id+':'+a.fired,cat:'alert',force:true,title:/above|below/.test(a.kind)?`${q.name} ${a.kind==='above'?'boven':'onder'} ${money(q,a.value)}`:`${q.name} ${KINDS[a.kind].toLowerCase()} ${nlN(a.value,1)}%`,body:`Koers nu ${money(q,q.price)}. Je koersalert is uitgegaan.`,href:'#asset-'+q.sym.toLowerCase()})}
    if(ch)LS.set('palerts',L)},
  dialog(sym){const a=getAsset(sym||'BTC');const opts=allAssets().filter(x=>x.price!=null).sort((x,y)=>(y.volQ||0)-(x.volQ||0)).slice(0,120);
    dlg(`<div class="chead"><h2>${ico('alarm','style="width:20px;height:20px;vertical-align:-3px"')} Koersalert</h2><button class="ibtn" id="pax" aria-label="Sluiten">${ico('x')}</button></div>
      <form id="paf"><div class="field"><label for="pasym">Asset</label><select class="inp" id="pasym">${opts.map(x=>`<option value="${x.sym}" ${x.sym===a?.sym?'selected':''}>${esc(x.name)} (${x.sym}) · ${money(x,x.price)}</option>`).join('')}</select></div>
      <div class="field"><label for="pakind">Wanneer</label><select class="inp" id="pakind">${Object.entries(KINDS).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></div>
      <div class="field"><label for="paval" id="pavl">Koers</label><input class="inp" id="paval" inputmode="decimal" required></div><p class="note" id="pahint"></p>
      <div class="err" id="paerr"></div><button class="btn" style="width:100%;height:44px">Alert instellen</button>
      <p class="note" style="margin-top:10px">${Api.authed?'De CSA-server controleert elke 5 minuten, ook als de app dicht is. Met pushmeldingen aan krijg je hem direct op je telefoon.':'Zonder account werkt de alert alleen zolang CSA openstaat in deze browser.'}</p></form>`,c=>{
      const upd=()=>{const x=getAsset($('#pasym',c).value),k=$('#pakind',c).value,pc=/1h|24h/.test(k);$('#pavl',c).textContent=pc?'Percentage':'Koers ('+(x?.cur==='USD'?'$':'€')+')';
        $('#paval',c).placeholder=pc?'bijv. 5':(x?nlN(x.price*(k==='above'?1.05:.95),x.price<1?6:2):'');$('#pahint',c).textContent=x?`Nu ${money(x,x.price)} · ${pct(x.ch24)} in 24 uur`:''};
      $('#pasym',c).onchange=upd;$('#pakind',c).onchange=upd;upd();$('#pax',c).onclick=closeOverlay;
      $('#paf',c).onsubmit=async e=>{e.preventDefault();const v=Number(String($('#paval',c).value).replace(/\./g,'').replace(',','.'));if(!(v>0)){$('#paerr',c).textContent='Vul een geldige waarde in.';return}
        try{const sym=$('#pasym',c).value,k=$('#pakind',c).value;const r=await this.add({sym,kind:k,value:v});closeOverlay();UI.toast({title:'Koersalert ingesteld',body:(r&&r.message)?r.message:`${sym}: ${KINDS[k].toLowerCase()} ${/1h|24h/.test(k)?nlN(v,1)+'%':nlN(v,2)}`});this.list=null;if(UI.cur==='meldingen')UI.route()}catch(x){$('#paerr',c).textContent=x.message}}})}
};

/* ---------------- meldingencentrum ---------------- */
const NC={f:'all',srv:[],read:new Set(LS.get('readids',[])),
  items(){const loc=S.alerts.map(a=>({id:a.id,t:a.t,title:a.title,body:a.body,url:a.href,score:a.score,cat:a.id.startsWith('senti:')?'senti':a.id.startsWith('rem:')?'reminder':a.cat==='alert'?'alert':a.id.startsWith('test:')?'test':'impact'}));
    const srv=this.srv.map(n=>({id:'s:'+n.id,t:n.t,title:n.title,body:n.body,url:(n.url||'').replace(/^\//,''),score:n.score,cat:n.cat||'impact'}));
    const all=[...loc,...srv].sort((a,b)=>b.t-a.t);const seen=new Set();return all.filter(x=>{const k=x.title+'|'+Math.round(x.t/(5*MIN));if(seen.has(k))return false;seen.add(k);return true})},
  unread(){return this.items().filter(x=>!this.read.has(x.id)).length},
  markAll(){this.items().forEach(x=>this.read.add(x.id));LS.set('readids',[...this.read].slice(-500));S.unread=0;LS.set('unread',0);UI.badge()},
  async pull(){if(!Api.authed)return;try{this.srv=(await Api.call('/api/notifications')).items||[];UI.badge()}catch(e){}}
};
UI.badge=function(){const n=NC.unread();const b=$('#bellc');b.textContent=n>99?'99+':n;b.classList.toggle('hidden',!n)};
const dayLabel=t=>{const d=new Date(t),n=new Date();const k=x=>x.toDateString();if(k(d)===k(n))return 'Vandaag';const y=new Date(n-DAY);if(k(d)===k(y))return 'Gisteren';return d.toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})};
const CATLBL={alert:'Koersalert',impact:'Impact',reminder:'Herinnering',briefing:'Briefing',senti:'Sentiment',test:'Test'};
Pages.meldingen={
  title:()=>'Meldingen',
  html:()=>`<div class="phead"><div><h1>Meldingen</h1><p>Alles wat CSA je meldde, ook wat binnenkwam terwijl de app dicht was. Stel hier ook je koersalerts in.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="ncread">Alles gelezen</button><button class="btn" id="ncnew">${ico('alarm')}Nieuwe koersalert</button></div></div>
    <div class="grid g2x"><div class="card"><div class="chips" id="ncf" style="margin-bottom:6px">${[['all','Alles'],['unread','Ongelezen'],['alert','Koersalerts'],['impact','Impact'],['reminder','Herinneringen'],['briefing','Briefing'],['senti','Sentiment']].map(([k,l])=>`<button class="chip ${NC.f===k?'on':''}" data-f="${k}">${l}</button>`).join('')}</div><div id="nclist">${skel(5)}</div></div>
    <div class="card"><div class="chead"><h2>Mijn koersalerts</h2><span class="src">${Api.authed?'24/7 via de CSA-server':'Alleen in deze browser'}</span></div><div id="palist">${skel(3)}</div></div></div>`,
  async mount(el){
    $('#ncf',el).onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;NC.f=b.dataset.f;$$('#ncf .chip',el).forEach(x=>x.classList.toggle('on',x===b));this.live(el,null,'calc')};
    $('#ncread',el).onclick=()=>{NC.markAll();this.live(el,null,'calc')};$('#ncnew',el).onclick=()=>PA.dialog();
    el.addEventListener('click',async e=>{const n=e.target.closest('[data-nid]');if(n){NC.read.add(n.dataset.nid);LS.set('readids',[...NC.read].slice(-500));UI.badge()}
      const d=e.target.closest('[data-pad]');if(d){e.preventDefault();await PA.del(+d.dataset.pad).catch(x=>UI.toast({title:x.message}));PA.list=null;this.live(el,null,'calc')}});
    await NC.pull();await PA.load();this.live(el,null,'calc')},
  live(el,arg,kind){if(kind!=='calc')return;let L=NC.items();const f=NC.f;
    if(f==='unread')L=L.filter(x=>!NC.read.has(x.id));else if(f!=='all')L=L.filter(x=>x.cat===f);
    let html='',last='';for(const x of L.slice(0,120)){const dl=dayLabel(x.t);if(dl!==last){html+=`<div class="ncday">${dl}</div>`;last=dl}
      const unread=!NC.read.has(x.id);html+=`<a class="nci ${unread?'unread':''}" href="${esc(x.url&&x.url.startsWith('#')?x.url:'#'+(x.url||'impact').replace(/^#?/,''))}" data-nid="${esc(x.id)}">${x.score?ring(x.score,40):`<span class="ncic">${ico(x.cat==='alert'?'alarm':x.cat==='briefing'?'sun':x.cat==='reminder'?'cal':'bell')}</span>`}<span><b>${esc(x.title)}</b>${x.body?`<span class="note" style="display:block">${esc(x.body)}</span>`:''}<span class="src">${hhmm(x.t)} · ${CATLBL[x.cat]||'Melding'}</span></span></a>`}
    $('#nclist',el).innerHTML=html||`<div class="empty">${f==='all'?'Nog geen meldingen. Stel je voorkeuren in bij Instellingen of zet een koersalert.':'Geen meldingen in deze categorie.'}</div>`;
    const P=PA.list||[];$('#palist',el).innerHTML=P.length?P.map(a=>{const x=getAsset(a.sym);return `<div class="srow" style="cursor:default"><span><b>${esc(x?x.name:a.sym)}</b> <span class="src">${a.sym}</span><br><span class="note">${KINDS[a.kind]} ${/1h|24h/.test(a.kind)?nlN(a.value,1)+'%':(x?money(x,a.value):nlN(a.value,2))}${x&&x.price!=null?' · nu '+money(x,x.price):''}</span></span><span style="display:flex;align-items:center;gap:6px"><span class="tag ${a.active?'up':''}">${a.active?'Actief':'Afgegaan'}</span><button class="ibtn" data-pad="${a.id}" aria-label="Verwijderen">${ico('x')}</button></span></div>`}).join(''):`<div class="empty">Nog geen koersalerts. Zet er een via de knop hierboven of op een assetpagina.</div>`}
};

/* ---------------- koersgrafiek met gebeurtenissen ---------------- */
const CH={range:'7d',cache:{}};
const RANGES={'24u':['15m',96],'7d':['1h',168],'30d':['4h',180],'90d':['1d',90]};
async function chartData(a,range){const k=a.sym+range;const c=CH.cache[k];if(c&&Date.now()-c.t<5*MIN)return c.d;const [iv,lim]=RANGES[range];const d=parseC(await bv(`/${a.market}/candles?interval=${iv}&limit=${lim}`));CH.cache[k]={t:Date.now(),d};return d}
function chartMarkers(a,t0,t1){
  const M=[];const inR=t=>t>=t0&&t<=t1+HOUR;
  for(const e of S.events.values())if((e.asset===a.sym||(e.assets||[])[0]===a.sym)&&inR(e.first))M.push({t:e.first,k:'impact',dir:e.dir,title:e.title,sub:`Impact ${e.score}/100 · ${e.I.label}`,href:'#impact',score:e.score});
  for(const e of S.srvEvents)if(e.s===a.sym&&inR(e.t)&&!M.some(m=>m.title===e.title))M.push({t:e.t,k:'impact',dir:e.dir,title:e.title,sub:`Impact ${e.score}/100 · gemeten door de CSA-server`,href:'#impact',score:e.score});
  for(const c of S.clusters)if(c.assets.includes(a.sym)&&inR(c.t))M.push({t:c.t,k:'news',dir:c.tone>.2?1:c.tone<-.2?-1:0,title:c.title,sub:`${c.sources.size} bron${c.sources.size>1?'nen':''} · ${c.kind}`,href:c.url,ext:true});
  for(const l of S.sentiLog)if(l.key===a.sym&&inR(l.t))M.push({t:l.t,k:'senti',dir:0,title:`Sentiment: ${l.from} → ${l.to}`,sub:l.why[0]||'',href:'#waarom-'+a.sym.toLowerCase()});
  return M.sort((x,y)=>x.t-y.t);
}
function drawChart(box,a,d){
  if(!d||d.length<3){box.innerHTML='<div class="achart empty">Geen koershistorie beschikbaar</div>';return}
  const pts=d.map(c=>[c.t,c.c]);if(a.price!=null&&Date.now()-pts[pts.length-1][0]<3*HOUR)pts.push([Date.now(),a.price]);
  const t0=pts[0][0],t1=pts[pts.length-1][0],ps=pts.map(p=>p[1]),mn=Math.min(...d.map(c=>c.l)),mx=Math.max(...d.map(c=>c.h)),pad=(mx-mn)*.08||1,lo=mn-pad,hi=mx+pad;
  const W=1000,H=300,X=t=>(t-t0)/(t1-t0||1)*W,Y=v=>H-(v-lo)/(hi-lo)*H;const up=ps[ps.length-1]>=ps[0],col=up?'var(--up)':'var(--down)';
  const path=pts.map((p,i)=>`${i?'L':'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');const vmax=Math.max(...d.map(c=>c.v*c.c))||1;
  const priceAt=t=>{let best=pts[0];for(const p of pts){if(Math.abs(p[0]-t)<Math.abs(best[0]-t))best=p}return best[1]};
  const M=chartMarkers(a,t0,t1);const groups=[];for(const m of M){const x=X(m.t)/W;const g=groups.find(g=>Math.abs(g.x-x)<.018);if(g){g.items.push(m)}else groups.push({x,items:[m]})}
  box.innerHTML=`<div class="cc"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ccg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".2"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    ${[.25,.5,.75].map(f=>`<line x1="0" x2="${W}" y1="${H*f}" y2="${H*f}" stroke="var(--line)" stroke-dasharray="3 6" vector-effect="non-scaling-stroke"/>`).join('')}
    ${d.map(c=>`<rect x="${X(c.t).toFixed(1)}" y="${(H-(c.v*c.c)/vmax*H*.18).toFixed(1)}" width="${Math.max(1,W/d.length*.6).toFixed(1)}" height="${((c.v*c.c)/vmax*H*.18).toFixed(1)}" fill="var(--ink3)" opacity=".18"/>`).join('')}
    <path d="${path} L${W} ${H} L0 ${H} Z" fill="url(#ccg)"/><path d="${path}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
    <span class="alab" style="top:${(Y(mx)/H*100).toFixed(1)}%">${money(a,mx)}</span><span class="alab" style="top:${(Y(mn)/H*100).toFixed(1)}%">${money(a,mn)}</span>
    ${groups.map((g,i)=>{const m=g.items[g.items.length-1];const y=Y(priceAt(m.t))/H*100;const k=g.items.some(x=>x.k==='impact')?'impact':g.items.some(x=>x.k==='news')?'news':'senti';const dir=g.items.reduce((s,x)=>s+x.dir,0);
      return `<button type="button" class="mk mk-${k} ${dir>0?'pos':dir<0?'neg':''}" style="left:${(g.x*100).toFixed(2)}%;top:${clamp(y,4,92).toFixed(1)}%" data-mg="${i}" aria-label="${g.items.length} gebeurtenis(sen)">${g.items.length>1?g.items.length:''}</button>`}).join('')}
    <div class="cx hidden"><i></i><span></span></div></div>
    <div class="ccx"><span>${new Date(t0).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:CH.range==='24u'?'2-digit':undefined,minute:CH.range==='24u'?'2-digit':undefined})}</span><span class="mklg"><i class="mk mk-impact"></i>Impact <i class="mk mk-news"></i>Nieuws <i class="mk mk-senti"></i>Sentiment</span><span>nu</span></div>`;
  const cc=$('.cc',box),cx=$('.cx',cc);
  cc.onpointermove=e=>{if(e.target.closest('.mk'))return;const r=cc.getBoundingClientRect(),f=clamp((e.clientX-r.left)/r.width,0,1),t=t0+f*(t1-t0);let best=pts[0];for(const p of pts)if(Math.abs(p[0]-t)<Math.abs(best[0]-t))best=p;
    cx.classList.remove('hidden');cx.style.left=(X(best[0])/W*100)+'%';cx.querySelector('span').textContent=`${money(a,best[1])} · ${new Date(best[0]).toLocaleString('nl-NL',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`;cx.querySelector('span').style.top=(Y(best[1])/H*100)+'%'};
  cc.onpointerleave=()=>cx.classList.add('hidden');
  cc.onclick=e=>{const b=e.target.closest('[data-mg]');const old=$('.mkpop',box);if(old)old.remove();if(!b)return;const g=groups[+b.dataset.mg];
    const p=document.createElement('div');p.className='mkpop';p.innerHTML=`<button class="ibtn" aria-label="Sluiten" style="float:right;width:30px;height:30px">${ico('x')}</button>${g.items.slice(-5).reverse().map(m=>`<div class="mkpi"><span class="src">${new Date(m.t).toLocaleString('nl-NL',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · ${m.k==='impact'?'Impact':m.k==='news'?'Nieuws':'Sentiment'}</span><b>${esc(m.title)}</b><span class="note">${esc(m.sub)}</span>${m.href?`<a class="lnk" href="${esc(m.href)}" ${m.ext?'target="_blank" rel="noopener"':''}>${m.ext?'Lees artikel ↗':'Bekijk →'}</a>`:''}</div>`).join('')}`;
    p.style.left=clamp(g.x*100,18,82)+'%';box.appendChild(p);p.querySelector('.ibtn').onclick=()=>p.remove()};
}

/* ---------------- vergelijken ---------------- */
Pages.vergelijk={
  title:()=>'Vergelijken',
  html(arg){const [x,y]=(arg||'btc-eth').split('-').map(s=>s.toUpperCase());const opts=sel=>allAssets().filter(a=>a.kind==='crypto'?a.deep:true).sort((a,b)=>(b.volQ||0)-(a.volQ||0)).map(a=>`<option value="${a.sym}" ${a.sym===sel?'selected':''}>${esc(a.name)} (${a.sym})</option>`).join('');
    return `<div class="phead"><div><h1>Vergelijken</h1><p>Twee assets naast elkaar: rendement, risico, samenhang en sentiment.</p></div></div>
    <div class="cmpsel"><select class="inp" id="cx1" aria-label="Eerste asset">${opts(x)}</select><span class="vs">vs</span><select class="inp" id="cx2" aria-label="Tweede asset">${opts(y)}</select></div>
    <div class="grid g2x" style="margin-top:16px"><div class="card"><div class="chead"><h2>Rendement 90 dagen</h2><span class="src">Beide gestart op 0%</span></div><div id="cmpch">${skel(1,'h260')}</div><div class="cmplg" id="cmplg"></div></div>
    <div class="card flush"><div id="cmptbl">${skel(6)}</div></div></div>`},
  mount(el,arg){const go=()=>location.hash='#vergelijk-'+$('#cx1',el).value.toLowerCase()+'-'+$('#cx2',el).value.toLowerCase();$('#cx1',el).onchange=go;$('#cx2',el).onchange=go;this.load(el,arg)},
  async load(el,arg){const [x,y]=(arg||'btc-eth').split('-').map(s=>s.toUpperCase());const A=getAsset(x),B=getAsset(y);if(!A||!B){$('#cmptbl',el).innerHTML=noData();return}
    const get=async a=>a.kind==='crypto'?parseC(await bv(`/${a.market}/candles?interval=1d&limit=91`)).concat(a.price!=null?[{t:Date.now(),c:a.price,h:a.price,l:a.price,v:0}]:[]):null;
    let da,db;try{[da,db]=await Promise.all([get(A),get(B)])}catch(e){}
    const stats=(a,d)=>{if(!d||d.length<10)return {ch90:null,dd:null};const c=d.map(x=>x.c);let peak=c[0],dd=0;for(const v of c){peak=Math.max(peak,v);dd=Math.min(dd,(v/peak-1)*100)}return {ch90:(c[c.length-1]/c[0]-1)*100,dd,rets:c.slice(1).map((v,i)=>Math.log(v/c[i])),t:d.map(x=>x.t)}};
    const sa=stats(A,da),sb=stats(B,db);let cr=null;if(sa.rets&&sb.rets){const mb=new Map(sb.t.slice(1).map((t,i)=>[Math.floor(t/DAY),sb.rets[i]]));const P=[],Q=[];sa.t.slice(1).forEach((t,i)=>{const k=Math.floor(t/DAY);if(mb.has(k)){P.push(sa.rets[i]);Q.push(mb.get(k))}});cr=corr(P,Q)}
    const col=['var(--navy3)','#C27C0E'];
    if(da&&db){const W=1000,H=260,t0=Math.min(da[0].t,db[0].t),t1=Date.now();const n=d=>d.map(x=>[x.t,(x.c/d[0].c-1)*100]);const na=n(da),nb=n(db);const all=[...na,...nb].map(p=>p[1]);const lo=Math.min(0,...all),hi=Math.max(0,...all),pd=(hi-lo)*.08||1;
      const X=t=>(t-t0)/(t1-t0)*W,Y=v=>H-(v-lo+pd)/(hi-lo+2*pd)*H;const pth=s=>s.map((p,i)=>`${i?'L':'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');
      $('#cmpch',el).innerHTML=`<div class="achart" style="height:${H}px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line2)" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/><path d="${pth(na)}" fill="none" stroke="${col[0]}" stroke-width="2.2" vector-effect="non-scaling-stroke"/><path d="${pth(nb)}" fill="none" stroke="${col[1]}" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>
        <span class="alab" style="top:${(Y(na[na.length-1][1])/H*100).toFixed(1)}%;color:${col[0]}">${pct(na[na.length-1][1],1)}</span><span class="alab" style="top:${(Y(nb[nb.length-1][1])/H*100).toFixed(1)}%;color:${col[1]}">${pct(nb[nb.length-1][1],1)}</span><span class="axl l">90 dagen geleden</span><span class="axl r">nu</span></div>`}
    else $('#cmpch',el).innerHTML=`<div class="achart empty">${A.kind==='stock'||B.kind==='stock'?'Koershistorie voor aandelen volgt met een betaalde dataprovider. Bekijk de grafiek op de assetpagina.':'Geen historie beschikbaar.'}</div>`;
    $('#cmplg',el).innerHTML=[A,B].map((a,i)=>`<span><i style="background:${col[i]}"></i>${esc(a.name)}</span>`).join('');
    const ma=A.m||{},mb2=B.m||{};const row=(l,f,better)=>{const va=f(A,ma,sa),vb=f(B,mb2,sb);return `<tr style="cursor:default"><td>${l}</td><td class="n">${va.h}</td><td class="n">${vb.h}</td></tr>`};
    const P=(v,d=2)=>({h:v==null?'—':`<span class="${cls(v)}">${pct(v,d)}</span>`});
    $('#cmptbl',el).innerHTML=`<table><thead><tr><th></th><th class="n"><a href="#asset-${A.sym.toLowerCase()}" style="color:${col[0]}">${esc(A.sym)}</a></th><th class="n"><a href="#asset-${B.sym.toLowerCase()}" style="color:${col[1]}">${esc(B.sym)}</a></th></tr></thead><tbody>
      ${row('Koers',a=>({h:money(a,a.price)}))}${row('24 uur',a=>P(a.ch24))}${row('7 dagen',(a,m)=>P(m.ch7))}${row('30 dagen',(a,m)=>P(m.ch30))}${row('90 dagen',(a,m,s)=>P(s.ch90,1))}
      ${row(gl('vol','Volatiliteit'),(a,m)=>({h:m.vol?nlN(m.vol,1)+'% /dag':'—'}))}${row('Grootste daling 90d',(a,m,s)=>({h:s.dd!=null?`<span class="down">${pct(s.dd,1)}</span>`:'—'}))}${row(gl('rsi','RSI (14d)'),(a,m)=>({h:m.rsi!=null?nlN(m.rsi,0):'—'}))}
      ${row('Volume 24u',a=>({h:a.volQ?big(a.volQ):'—'}))}${row(gl('senti','Sentiment'),a=>({h:a.s?senti(a.s):'—'}))}</tbody></table>
      <div class="cmpcorr"><span>${gl('corr','Samenhang (90 dagen)')}</span><b>${cr!=null?nlN(cr,2):'—'}</b><span class="note">${cr==null?'':cr>.7?'Bewegen sterk samen: weinig spreiding.':cr>.4?'Bewegen deels samen.':'Bewegen grotendeels los van elkaar.'}</span></div>`;
  }
};

/* ---------------- agenda-export ---------------- */
function icsFor(list){const z=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const e=s=>String(s).replace(/[\\,;]/g,m=>'\\'+m).replace(/\n/g,'\\n');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Crypto Signal AI//Event Radar//NL','CALSCALE:GREGORIAN','METHOD:PUBLISH',...list.flatMap(ev=>['BEGIN:VEVENT','UID:'+ev.id+'@csa','DTSTAMP:'+z(Date.now()),'DTSTART:'+z(ev.t),'DTEND:'+z(ev.t+30*MIN),'SUMMARY:'+e(ev.title),'DESCRIPTION:'+e(`${ETYPE[ev.type]?.l||''} · ${ev.reg}. CSA Impact Score ${Radar.imp(ev).score}/100. ${ETYPE[ev.type]?.why||''} Bron: ${ev.src||''}`),...(ev.url?['URL:'+ev.url]:[]),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+e(ev.title),'TRIGGER:-PT15M','END:VALARM','END:VEVENT']),'END:VCALENDAR'].join('\r\n')}
function downloadFile(name,text,type){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},1500)}
const gcal=ev=>{const z=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(ev.title)+'&dates='+z(ev.t)+'/'+z(ev.t+30*MIN)+'&details='+encodeURIComponent(`${ETYPE[ev.type]?.why||''}\n\nCSA Impact Score ${Radar.imp(ev).score}/100 · Crypto Signal AI`)};
document.addEventListener('click',e=>{const b=e.target.closest('[data-ics]');if(b){e.preventDefault();const id=b.dataset.ics;const L=id==='all'?Radar.upcoming():Radar.all().filter(x=>x.id===id);downloadFile(id==='all'?'csa-event-radar.ics':'csa-'+id+'.ics',icsFor(L),'text/calendar');UI.toast({title:'Agendabestand gedownload',body:'Open het bestand om '+(L.length>1?L.length+' gebeurtenissen':'de gebeurtenis')+' aan je agenda toe te voegen.'})}});

/* ---------------- ochtendbriefing ---------------- */
const BR={d:null};
function localBriefing(){const btc=S.crypto.get('BTC'),eth=S.crypto.get('ETH'),mk=S.market;if(!btc||btc.price==null)return null;const D=deepList().filter(a=>a.ch24!=null).sort((a,b)=>b.ch24-a.ch24);
  const tone=mk.breadth>=.65&&mk.vw>0?'positief':mk.breadth<=.35&&mk.vw<0?'negatief':'gemengd';const ev=[...S.events.values()].filter(e=>Date.now()-e.first<DAY).sort((a,b)=>b.score-a.score);
  const today=Radar.upcoming().filter(e=>e.t-Date.now()<2*DAY);
  return {t:Date.now(),day:new Date().toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'}),edition:false,tone,
    headline:Math.abs(btc.ch24)<1.5&&Math.abs(mk.vw||0)<1.5?`Rustige markt: Bitcoin ${pct(btc.ch24)}, ${Math.round(mk.breadth*100)}% van de top-${mk.n} in de plus`:`Crypto ${tone==='positief'?'in de lift':tone==='negatief'?'onder druk':'verdeeld'}: Bitcoin ${pct(btc.ch24)}, ${Math.round(mk.breadth*100)}% van de top-${mk.n} in de plus`,
    points:[`Bitcoin staat op ${pct(btc.ch24)} in 24 uur${btc.m.z24!=null?`, ${nlN(Math.abs(btc.m.z24),1)}× de normale dagbeweging`:''}.`,mk.n?`De brede markt is ${tone}: ${Math.round(mk.breadth*100)}% van de top-${mk.n} stijgt, volumegewogen ${pct(mk.vw)}.`:null,S.senti.overall?`CSA Sentiment: ${S.senti.overall.l}.`:null,ev.length?`${ev.length} opvallende gebeurtenissen in 24 uur; hoogste Impact Score ${ev[0].score}.`:null,today.length?`Op de agenda: ${today.map(e=>e.title).join('; ')}.`:null].filter(Boolean),
    market:{btc:{p:btc.price,ch:btc.ch24},eth:eth?{p:eth.price,ch:eth.ch24}:null},up:D.slice(0,3).map(a=>({s:a.sym,name:a.name,ch:a.ch24,p:a.price})),down:D.slice(-3).reverse().map(a=>({s:a.sym,name:a.name,ch:a.ch24,p:a.price})),
    events:ev.slice(0,5).map(e=>({title:e.title,score:e.score,s:e.asset,t:e.first})),news:S.clusters.filter(c=>Date.now()-c.t<DAY).sort((a,b)=>b.sources.size-a.sources.size).slice(0,5).map(c=>({title:c.title,url:c.url,sources:[...c.sources],t:c.t})),agenda:today.map(e=>({title:e.title,t:e.t})),note:'Samengesteld uit actuele marktdata volgens vaste regels. Geen beleggingsadvies.'}}
Pages.briefing={
  title:()=>'Ochtendbriefing',
  html:()=>`<div id="brbody">${skel(6)}</div>`,
  async mount(el){try{const d=Api.on?await Api.call('/api/briefing'):null;BR.d=d&&!d.pending?d:null}catch(e){BR.d=null}if(!BR.d)BR.d=localBriefing();this.live(el,null,'calc')},
  live(el,arg,kind){if(kind!=='calc')return;if(!BR.d){BR.d=localBriefing();if(!BR.d){$('#brbody',el).innerHTML=noData();return}}const d=BR.d;
    const mrow=x=>`<a class="mrow" href="#asset-${x.s.toLowerCase()}" style="padding:10px 0">${getAsset(x.s)?an(getAsset(x.s)):esc(x.name)}<span class="r"><b class="num">${eur(x.p)}</b><span class="num ${cls(x.ch)}">${pct(x.ch)}</span></span></a>`;
    $('#brbody',el).innerHTML=`<div class="brhead"><div><div class="kicker">${ico('sun','style="width:16px;height:16px"')} Ochtendbriefing · ${esc(d.day)}${d.edition?' · editie 08:00':' · live samengesteld'}</div><h1 class="brh">${esc(d.headline)}</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><span class="tag ${d.tone==='positief'?'up':d.tone==='negatief'?'down':''}">Markt ${esc(d.tone)}</span>${d.market.btc?`<span class="tag">BTC ${eur(d.market.btc.p)} ${pct(d.market.btc.ch)}</span>`:''}${d.market.eth?`<span class="tag">ETH ${eur(d.market.eth.p)} ${pct(d.market.eth.ch)}</span>`:''}</div></div>
      <button class="btn ghost" id="brshare">${ico('share')}Delen</button></div>
      <div class="grid g2x" style="margin-top:18px"><div class="card"><h2 style="margin-bottom:10px">In het kort</h2><ol class="brpts">${d.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>
        <h2 style="margin:22px 0 6px">Belangrijkste nieuws</h2>${(d.news||[]).length?d.news.map(n=>`<div class="news" style="grid-template-columns:1fr"><a class="t" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a><div class="meta"><span>${n.sources.length} bron${n.sources.length>1?'nen':''}: ${esc(n.sources.slice(0,3).join(', '))}</span><span>${hhmm(n.t)}</span></div></div>`).join(''):'<div class="empty">Geen nieuws gevonden.</div>'}</div>
      <div class="grid" style="align-content:start"><div class="card"><h2 style="margin-bottom:6px">Stijgers en dalers</h2>${(d.up||[]).map(mrow).join('')}<div class="sep"></div>${(d.down||[]).map(mrow).join('')}</div>
        <div class="card"><h2 style="margin-bottom:6px">Gebeurtenissen</h2>${(d.events||[]).length?d.events.map(e=>`<div class="srow" style="cursor:default"><span>${esc(e.title)}</span>${ring(e.score,36)}</div>`).join(''):'<div class="empty">Rustige nacht: geen bijzondere gebeurtenissen.</div>'}</div>
        <div class="card"><h2 style="margin-bottom:6px">Agenda</h2>${(d.agenda||[]).length?d.agenda.map(e=>`<div class="srow" style="cursor:default"><span>${esc(e.title)}</span><span class="src">${dmy(e.t)} ${hhmm(e.t)}</span></div>`).join(''):'<p class="note">Geen grote publicaties vandaag of morgen.</p>'}<a class="lnk" href="#radar" style="display:inline-block;margin-top:10px">Event Radar →</a></div></div></div>
      <p class="disc">${esc(d.note||'')} ${Api.authed?'Je krijgt de briefing elke ochtend om 08:00 als pushmelding (aan/uit bij Instellingen).':''}</p>`;
    $('#brshare',el).onclick=()=>shareCard({kind:'briefing',d})}
};

/* ---------------- deelbare analysekaart (PNG) ---------------- */
async function shareCard(o){
  const cv=document.createElement('canvas');cv.width=1080;cv.height=1350;const g=cv.getContext('2d');try{await document.fonts.ready}catch(e){}
  const F=(w,s,f='Inter')=>`${w} ${s}px "${f}", Inter, system-ui, sans-serif`;const navy='#17243A',up='#0A8754',down='#CC3340';
  const wrap=(t,x,y,max,lh,maxLines=4)=>{const ws=String(t).split(' ');let line='',n=0;for(const w of ws){const test=line?line+' '+w:w;if(g.measureText(test).width>max&&line){g.fillText(line,x,y);y+=lh;line=w;if(++n>=maxLines-1){const rest=ws.slice(ws.indexOf(w)).join(' ');let s=rest;while(g.measureText(s+'…').width>max&&s.length)s=s.slice(0,-1);g.fillText(s+(s!==rest?'…':''),x,y);return y+lh}}else line=test}g.fillText(line,x,y);return y+lh};
  g.fillStyle='#fff';g.fillRect(0,0,1080,1350);g.fillStyle=navy;g.fillRect(0,0,1080,250);
  try{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(LOGO.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" style="color:#fff;--logo-bg:#17243A" ').replace(/currentColor/g,'#fff').replace(/var\(--logo-bg,#fff\)/g,'#17243A'));await img.decode();g.drawImage(img,70,55,140,140)}catch(e){}
  g.fillStyle='#fff';g.font=F(700,46,'Inter Tight');g.fillText('Crypto Signal AI',240,118);g.fillStyle='#B9C6DD';g.font=F(500,30);g.fillText('AI Market Intelligence',240,164);
  let y=340;g.fillStyle='#566275';g.font=F(500,30);g.fillText(new Date().toLocaleString('nl-NL',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}),70,y);y+=70;
  if(o.kind==='why'){const a=o.a,w=o.w;const verb=a.ch24>0.3?'stijgt':a.ch24<-0.3?'daalt':'beweegt';
    g.fillStyle='#0E1828';g.font=F(700,64,'Inter Tight');y=wrap(`Waarom ${verb} ${a.name}${a.kind==='crypto'?' vandaag':''}?`,70,y,940,74,2)+10;
    g.font=F(700,84,'Inter Tight');g.fillText(money(a,a.price),70,y+40);const pw=g.measureText(money(a,a.price)).width;g.fillStyle=a.ch24>=0?up:down;g.font=F(700,52,'Inter Tight');g.fillText(pct(a.ch24),70+pw+28,y+40);y+=120;
    g.fillStyle='#0E1828';g.font=F(500,36);y=wrap(w.summary,70,y,940,50,4)+20;
    g.font=F(600,30);g.fillStyle='#566275';g.fillText('Meest waarschijnlijke oorzaken',70,y);y+=50;
    for(const c of w.causes.slice(0,3)){g.fillStyle='#0E1828';g.font=F(600,34);g.fillText(c.k.length>40?c.k.slice(0,39)+'…':c.k,70,y);g.fillStyle='#566275';g.textAlign='right';g.fillText(Math.round(c.share*100)+'%',1010,y);g.textAlign='left';y+=22;g.fillStyle='#E9EDF3';g.fillRect(70,y,940,12);g.fillStyle=navy;g.fillRect(70,y,940*clamp(c.share,0,1),12);y+=60}
    if(!w.causes.length){g.fillStyle='#566275';g.font=F(500,32);g.fillText('Nog geen overtuigende oorzaak gevonden.',70,y);y+=60}
    g.fillStyle='#566275';g.font=F(500,30);g.fillText(`Zekerheid analyse: ${w.conf}${a.s?' · Sentiment: '+a.s.l:''}`,70,Math.min(y+10,1180))}
  else{const d=o.d;g.fillStyle='#0E1828';g.font=F(700,30);g.fillStyle='#566275';g.fillText('OCHTENDBRIEFING · '+d.day.toUpperCase(),70,y-10);y+=40;g.fillStyle='#0E1828';g.font=F(700,58,'Inter Tight');y=wrap(d.headline,70,y,940,68,3)+20;
    g.font=F(500,34);for(const p of d.points.slice(0,4)){g.fillStyle=navy;g.fillRect(70,y-22,12,12);g.fillStyle='#0E1828';y=wrap(p,100,y,910,46,3)+18;if(y>1150)break}}
  g.fillStyle='#F3F5F9';g.fillRect(0,1230,1080,120);g.fillStyle='#566275';g.font=F(500,26);g.fillText('Analyse door CSA · csa.rijnstadmarketing.workers.dev',70,1282);g.fillText('Informatie, geen financieel advies.',70,1320);
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));const url=URL.createObjectURL(blob);const name=o.kind==='why'?`csa-waarom-${o.a.sym.toLowerCase()}.png`:'csa-ochtendbriefing.png';const file=new File([blob],name,{type:'image/png'});
  dlg(`<div class="chead"><h2>Deelbare kaart</h2><button class="ibtn" id="scx" aria-label="Sluiten">${ico('x')}</button></div><img src="${url}" alt="Voorbeeld van de deelkaart" style="width:100%;border:1px solid var(--line);border-radius:var(--r)"><div style="display:flex;gap:8px;margin-top:12px">${navigator.canShare&&navigator.canShare({files:[file]})?'<button class="btn" id="scs" style="flex:1">Delen</button>':''}<button class="btn ${navigator.canShare&&navigator.canShare({files:[file]})?'ghost':''}" id="scd" style="flex:1">Downloaden</button></div>`,c=>{
    $('#scx',c).onclick=closeOverlay;const s=$('#scs',c);if(s)s.onclick=async()=>{try{await navigator.share({files:[file],title:'Crypto Signal AI',text:o.kind==='why'?`Waarom beweegt ${o.a.name}? Analyse door CSA`:'CSA ochtendbriefing'})}catch(e){}};
    $('#scd',c).onclick=()=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()}});
}

/* ---------------- laadvlakken ---------------- */
function skel(n=3,cls=''){return `<div class="skel ${cls}" aria-busy="true"><span class="sr">Laden…</span>${Array.from({length:n},(_,i)=>`<i style="width:${[92,78,85,64,88,72][i%6]}%"></i>`).join('')}</div>`}
