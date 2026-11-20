/* =====================================================================
   PAGINA'S v2 — portefeuilles, track record, premium, instellingen
   ===================================================================== */
IC.wallet='<rect x="3" y="6" width="18" height="14" rx="1"/><path d="M3 10h18M16 15h2M6 6l9-3 1 3"/>';
IC.record='<path d="M4 20V4M4 20h16"/><path d="m7 15 4-4 3 3 5-6"/><circle cx="19" cy="8" r="1.4"/>';
IC.gem='<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 18 3-18"/>';
NAV.splice(8,0,['portefeuille','Portefeuille','wallet'],['trackrecord','Track record','record'],['premium','Premium','gem']);

const loginNeeded=what=>`<div class="callout" style="margin-bottom:16px">${Api.on?`<b>Tip:</b> log in met een CSA-account om ${what} op al je apparaten te bewaren. Zonder account blijft het alleen in deze browser.`:`<b>Demomodus:</b> ${what} wordt alleen in deze browser bewaard.`}</div>`;
function dlg(html,onmount){const o=$('#overlay');o.innerHTML=`<div class="scrim" id="scrim" style="align-items:center;justify-content:center;padding:16px"><div class="card" role="dialog" aria-modal="true" style="width:min(440px,100%);box-shadow:0 20px 60px rgba(0,0,0,.3)">${html}</div></div>`;$('#scrim').onclick=e=>{if(e.target.id==='scrim')closeOverlay()};onmount&&onmount($('#scrim .card'))}

/* ---------------- PORTEFEUILLE ---------------- */
const PF={tab:'mijn',pos:null,paper:null,err:''};
Pages.portefeuille={
  title:()=>'Portefeuille',
  html:()=>`<div class="phead"><div><h1>Portefeuille</h1><p>Houd je eigen bezit bij en zie welk nieuws en welke gebeurtenissen erop inwerken, of oefen met virtueel geld. CSA voert geen echte transacties uit en geeft geen koop- of verkoopadvies.</p></div>
    <div class="seg" id="pftab"><button data-t="mijn" class="${PF.tab==='mijn'?'on':''}">Mijn bezit</button><button data-t="oefen" class="${PF.tab==='oefen'?'on':''}">Oefenportefeuille</button></div></div>
    ${Api.authed?'':loginNeeded(PF.tab==='mijn'?'je portefeuille':'je oefenportefeuille')}<div id="pfbody">${waitBox('Laden…')}</div>`,
  async mount(el){
    $('#pftab',el).onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;PF.tab=b.dataset.t;UI.route()};
    el.addEventListener('submit',async e=>{e.preventDefault();const f=e.target;
      try{if(f.id==='addpos'){await Store.addPosition({sym:f.sym.value.trim(),kind:f.kind.value,qty:+String(f.qty.value).replace(',','.'),avg:f.avg.value?+String(f.avg.value).replace(',','.'):null});UI.toast({title:'Positie toegevoegd'});PF.pos=null}
        if(f.id==='order'){const side=e.submitter&&e.submitter.value||'buy';PF.paper=await Store.order(f.sym.value,side,+String(f.eur.value).replace(',','.'));const L=PF.paper&&PF.paper.last;UI.toast({title:`Virtuele ${side==='buy'?'aankoop':'verkoop'} uitgevoerd`,body:`${f.sym.value} · ${eur(+f.eur.value)}`+(L&&L.price?` tegen ${eur(L.price)} (koers via ${L.src})`:'')+' · geen echt geld'})}
        await this.load(el)}catch(x){UI.toast({title:'Niet gelukt',body:x.message})}});
    el.addEventListener('click',async e=>{const d=e.target.closest('[data-del]');if(d){await Store.delPosition(+d.dataset.del).catch(x=>UI.toast({title:x.message}));PF.pos=null;this.load(el)}
      if(e.target.closest('#preset'))dlg(`<h2>Oefenportefeuille resetten?</h2><p class="muted">Je begint opnieuw met € 10.000 virtueel geld. Je transacties worden gewist.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="no">Annuleren</button><button class="btn" id="yes">Resetten</button></div>`,c=>{$('#no',c).onclick=closeOverlay;$('#yes',c).onclick=async()=>{PF.paper=await Store.resetPaper();closeOverlay();this.live(el,null,'calc')}})});
    await this.load(el);
  },
  async load(el){try{if(PF.tab==='mijn')PF.pos=await Store.positions();else PF.paper=await Store.paper();PF.err=''}catch(x){PF.err=x.message}this.live(el,null,'calc')},
  live(el,arg,kind){const b=$('#pfbody',el);if(!b)return;if(PF.err){b.innerHTML=`<div class="callout warn">${esc(PF.err)}</div>`;return}
    if(PF.tab==='mijn'){if(!PF.pos)return;if(kind!=='calc'&&b.dataset.f&&document.activeElement&&b.contains(document.activeElement))return;b.dataset.f=1;b.innerHTML=myPortfolio(PF.pos)}
    else{if(!PF.paper)return;if(kind!=='calc'&&b.dataset.f&&document.activeElement&&b.contains(document.activeElement))return;b.dataset.f=1;b.innerHTML=paperHTML(PF.paper)}}
};
const eur2=n=>n==null||!isFinite(n)?'—':'€ '+nlN(n,2);
function posValue(p){const a=getAsset(p.sym);const price=a&&a.price!=null?a.price:null;const eurPrice=a&&a.cur==='USD'?null:price;return {a,price,value:price!=null?price*p.qty:null,cur:a?.cur||'EUR',pl:price!=null&&p.avg?((price-p.avg)*p.qty):null}}
function myPortfolio(L){
  const rows=L.map(p=>({p,...posValue(p)}));const tot=rows.filter(r=>r.cur==='EUR'&&r.value!=null).reduce((s,r)=>s+r.value,0);
  const syms=[...new Set(L.map(p=>p.sym))];const ev=[...S.events.values()].filter(e=>(e.assets||[]).some(s=>syms.includes(s))).sort((a,b)=>b.score-a.score).slice(0,5);
  const news=S.clusters.filter(c=>c.assets.some(s=>syms.includes(s))).slice(0,6);
  return `<div class="grid g2x"><div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Mijn bezit</h2><span class="src">Totaal crypto: <b style="color:var(--ink)">${eur2(tot)}</b></span></div>
    ${rows.length?`<div class="tw"><table class="stack"><thead><tr><th>Asset</th><th class="n">Aantal</th><th class="n">Koers</th><th class="n">Waarde</th><th class="n">Resultaat</th><th>Sentiment</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr style="cursor:default"><td data-l="Asset">${r.a?an(r.a):`<b>${esc(r.p.sym)}</b>`}</td><td class="n" data-l="Aantal">${nlN(r.p.qty,r.p.qty<1?6:2)}</td><td class="n" data-l="Koers">${r.price!=null?money(r.a,r.price):'—'}</td><td class="n" data-l="Waarde">${r.value!=null?money(r.a,r.value):'—'}</td><td class="n ${cls(r.pl)}" data-l="Resultaat">${r.pl!=null?(r.pl>=0?'+':'−')+(r.cur==='USD'?'$ '+nlN(Math.abs(r.pl),2):eur2(Math.abs(r.pl))):'—'}</td><td data-l="Sentiment">${r.a&&r.a.s?senti(r.a.s):'—'}</td><td data-l=""><button class="ibtn" data-del="${r.p.id}" aria-label="Verwijder ${esc(r.p.sym)}">${ico('x')}</button></td></tr>`).join('')}</tbody></table></div>
    <div style="padding:14px 18px"><div class="src" style="margin-bottom:6px">Verdeling</div><div class="alloc">${rows.filter(r=>r.cur==='EUR'&&r.value).map((r,i)=>`<i title="${esc(r.p.sym)} ${Math.round(r.value/tot*100)}%" style="flex:${r.value};background:hsl(${215+i*37} ${40+i*7%30}% ${30+i*9%40}%)"></i>`).join('')}</div><div class="src" style="margin-top:6px">${rows.filter(r=>r.cur==='EUR'&&r.value).map(r=>`${esc(r.p.sym)} ${Math.round(r.value/tot*100)}%`).join(' · ')}</div></div>`
    :`<div style="padding:18px"><div class="empty">Nog geen posities. Voeg hieronder toe wat je bezit (bijvoorbeeld 0,05 BTC), dan laat CSA zien wat erop inwerkt.</div></div>`}
    <form id="addpos" class="addform"><input class="inp" name="sym" placeholder="Symbool (BTC, NVDA)" required maxlength="12" aria-label="Symbool"><select class="inp" name="kind" aria-label="Soort"><option value="crypto">Crypto</option><option value="stock">Aandeel</option></select><input class="inp" name="qty" placeholder="Aantal" required inputmode="decimal" aria-label="Aantal"><input class="inp" name="avg" placeholder="Aankoopprijs (optioneel)" inputmode="decimal" aria-label="Aankoopprijs"><button class="btn">Toevoegen</button></form></div>
    <div class="grid" style="align-content:start"><div class="card"><div class="chead"><h2>Wat werkt in op je bezit?</h2></div>${ev.length?ev.map(e=>impRow(e)).join(''):'<div class="empty">Geen bijzondere gebeurtenissen voor je bezit.</div>'}</div>
    <div class="card"><div class="chead"><h2>Nieuws over je bezit</h2></div>${news.length?news.map(c=>clusterRow(c,true)).join(''):'<div class="empty">Geen recent nieuws over je bezit.</div>'}</div></div></div>
    <p class="disc">Aandelenkoersen in dollars tellen niet mee in het eurototaal. CSA toont informatie over je bezit en geeft geen persoonlijk beleggingsadvies.</p>`;
}
function paperHTML(P){
  const H=Object.entries(P.holdings||{});const val=H.reduce((s,[sym,h])=>{const a=S.crypto.get(sym);return s+(a&&a.price!=null?a.price*h.qty:0)},0);const tot=P.cash+val;const res=tot-P.start;
  const opts=deepList().sort((a,b)=>(a.rank||99)-(b.rank||99)).map(a=>`<option value="${a.sym}">${esc(a.name)} (${a.sym}) · ${eur(a.price)}</option>`).join('');
  return `<section class="kpis k3" style="margin-bottom:16px">${kpi('Totale waarde',eur2(tot),`<span class="${cls(res)}">${res>=0?'+':'−'}${eur2(Math.abs(res))} (${pct(res/P.start*100)})</span> sinds start`)}${kpi('Virtueel saldo',eur2(P.cash),'beschikbaar')}${kpi('Belegd',eur2(val),H.length+' posities')}</section>
  <div class="grid g2x"><div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Posities</h2><button class="lnk" id="preset">Opnieuw beginnen</button></div>
  ${H.length?`<div class="tw"><table class="stack"><thead><tr><th>Asset</th><th class="n">Aantal</th><th class="n">Waarde</th><th class="n">Resultaat</th></tr></thead><tbody>${H.map(([sym,h])=>{const a=S.crypto.get(sym);const v=a&&a.price!=null?a.price*h.qty:null;const r=v!=null?v-h.cost:null;return `<tr onclick="location.hash='#asset-${sym.toLowerCase()}'"><td data-l="Asset">${a?an(a):esc(sym)}</td><td class="n" data-l="Aantal">${nlN(h.qty,h.qty<1?6:3)}</td><td class="n" data-l="Waarde">${eur2(v)}</td><td class="n ${cls(r)}" data-l="Resultaat">${r!=null?(r>=0?'+':'−')+eur2(Math.abs(r)):'—'} <span class="faint">${r!=null&&h.cost?pct(r/h.cost*100,1):''}</span></td></tr>`}).join('')}</tbody></table></div>`:`<div style="padding:18px"><div class="empty">Nog geen virtuele posities. Je start met € 10.000 oefengeld.</div></div>`}
  <form id="order" class="addform"><select class="inp" name="sym" aria-label="Asset" style="flex:2">${opts}</select><input class="inp" name="eur" placeholder="Bedrag in €" required inputmode="decimal" aria-label="Bedrag"><button class="btn" name="side" value="buy">Kopen</button><button class="btn ghost" name="side" value="sell">Verkopen</button></form>
  <p class="note" style="padding:0 18px 16px;margin:0">Oefengeld, geen echte transacties. Koers: ${Api.authed?'bepaald door de CSA-server (Bitvavo, met Kraken, Gate, MEXC of OKX als reserve; de gebruikte koers staat bij elke transactie)':'actuele Bitvavo-koers'}. Kosten 0,25% per transactie, zodat het realistisch blijft.</p></div>
  <div class="card"><div class="chead"><h2>Transacties</h2></div>${(P.trades||[]).length?(P.trades||[]).slice(0,15).map(t=>`<div class="srow" style="cursor:default"><span><b>${t.side==='buy'?'Koop':'Verkoop'} ${esc(t.sym)}</b><br><span class="src">${dmy(t.t)} ${hhmm(t.t)} · koers ${t.price<1?nlN(t.price,6)+' €':eur(t.price)}</span></span><span class="num">${eur(t.eur)}</span></div>`).join(''):'<div class="empty">Nog geen transacties.</div>'}</div></div>`;
}

/* ---------------- TRACK RECORD (backtest) ---------------- */
const TR={data:null,err:'',loading:false};
Pages.trackrecord={
  title:()=>'Track record',
  html:()=>`<div class="phead"><div><h1>Track record van de Impact Score</h1><p>Hoe reageerde de markt historisch nadat CSA een ongewone koersbeweging zou hebben gemeld? Zo zie je wat een score wel en niet zegt.</p></div><button class="btn ghost" id="trrun">Opnieuw berekenen</button></div><div id="trbody">${waitBox('Backtest laden… dit kan even duren.')}</div>`,
  async mount(el){$('#trrun',el).onclick=()=>{TR.data=null;this.run(el)};if(!TR.data)this.run(el);else this.live(el,null,'calc')},
  async run(el){if(TR.loading)return;TR.loading=true;$('#trbody',el).innerHTML=waitBox('Historie ophalen en doorrekenen…');try{TR.data=await getBacktest();TR.err=''}catch(x){TR.err=x.message}TR.loading=false;if(UI.cur==='trackrecord')this.live(UI.el,null,'calc')},
  live(el,arg,kind){if(kind!=='calc')return;const b=$('#trbody',el);if(!b)return;if(TR.err){b.innerHTML=`<div class="callout warn">Backtest niet beschikbaar: ${esc(TR.err)}</div>`;return}const d=TR.data;if(!d)return;
    const B=d.buckets;const mx=Math.max(...B.map(x=>x.absNext||0),.1);
    b.innerHTML=`<section class="kpis k3" style="margin-bottom:16px">${kpi('Gebeurtenissen getest',d.events.toLocaleString('nl-NL'),`${d.assets.length} assets · ${d.days} dagen historie`)}${kpi('Berekend',dmy(d.t)+' '+hhmm(d.t),d.via==='server'?'Dagelijks door de CSA-server':'In je browser')}${kpi('Bron','Bitvavo','dagkoersen in euro')}</section>
    <div class="grid g2"><div class="card"><div class="chead"><h2>Beweging de dag erna, per score</h2><span class="src">Gemiddelde absolute koersverandering</span></div>
      <div class="bars">${B.map(x=>`<div class="bar" style="grid-template-columns:70px minmax(0,1fr) 120px"><span><b>${x.label}</b></span><span class="tr"><i style="width:${x.n?Math.round((x.absNext||0)/mx*100):0}%"></i></span><span class="v">${x.n?nlN(x.absNext,2)+'% · '+nlN(x.absNextRel,1)+'× vol':'geen data'}</span></div>`).join('')}</div>
      <p class="note">Hogere scores horen bij grotere vervolgbewegingen als de balk oploopt. "× vol" = verhouding tot de normale dagbeweging van die asset.</p></div>
    <div class="card flush"><div class="chead" style="padding:18px 18px 0"><h2>Per scoregroep</h2></div><div class="tw"><table><thead><tr><th>Score</th><th class="n">Aantal</th><th class="n">Zette door (1 dag)</th><th class="n">Vervolg 3 dagen</th><th class="n">Vervolg 7 dagen</th></tr></thead><tbody>${B.map(x=>`<tr style="cursor:default"><td><b>${x.label}</b></td><td class="n">${x.n}</td><td class="n">${x.cont1!=null?Math.round(x.cont1*100)+'%':'—'}</td><td class="n ${cls(x.follow3)}">${x.n?pct(x.follow3):'—'}</td><td class="n ${cls(x.follow7)}">${x.n?pct(x.follow7):'—'}</td></tr>`).join('')}</tbody></table></div>
      <p class="note" style="padding:0 18px 16px">"Vervolg" is in de richting van de oorspronkelijke beweging: positief = de beweging zette gemiddeld door, negatief = ze draaide terug.</p></div></div>
    <div class="card" style="margin-top:16px"><div class="chead"><h2>Recente historische gebeurtenissen</h2>${d.locked?'<a class="lnk" href="#premium">Premium →</a>':''}</div>${d.recent&&d.recent.length?`<div class="tw"><table class="stack"><thead><tr><th>Datum</th><th>Asset</th><th class="n">Beweging</th><th class="n">Score</th><th class="n">+1 dag</th><th class="n">+3 dagen</th><th class="n">+7 dagen</th></tr></thead><tbody>${d.recent.map(e=>`<tr style="cursor:default"><td data-l="Datum">${new Date(e.t).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'2-digit'})}</td><td data-l="Asset"><b>${esc(e.s)}</b></td><td class="n ${cls(e.ch)}" data-l="Beweging">${pct(e.ch)}</td><td class="n" data-l="Score">${e.score}</td><td class="n ${cls(e.f1)}" data-l="+1 dag">${pct(e.f1)}</td><td class="n ${cls(e.f3)}" data-l="+3 dagen">${pct(e.f3)}</td><td class="n ${cls(e.f7)}" data-l="+7 dagen">${pct(e.f7)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${d.locked?'Alleen beschikbaar met Premium.':'Nog geen historische gebeurtenissen met 3 dagen vervolgdata.'}</div>`}</div>
    <p class="disc">${esc(d.method)} Resultaten uit het verleden bieden geen garantie voor de toekomst. Dit is geen beleggingsadvies.</p>`}
};

/* ---------------- PREMIUM ---------------- */
const PRM={st:null};
Pages.premium={
  title:()=>'Premium',
  html:()=>`<div class="phead"><div><h1>CSA Premium</h1><p>Alles van CSA, plus 24/7 meldingen op je telefoon, de volledige track record en je portefeuille op al je apparaten.</p></div></div><div id="prbody">${waitBox()}</div>`,
  async mount(el){if(location.hash==='#premium-ok')UI.toast({title:'Bedankt! Je Premium-abonnement wordt geactiveerd.',body:'Het kan een paar seconden duren voordat je status is bijgewerkt.'});
    try{PRM.st=Api.on?await Api.call('/api/billing/status'):null}catch(e){PRM.st=null}
    if(Api.authed){try{const me=await Api.call('/api/me');Api.setSession(Api.token,me.user)}catch(e){}}
    this.live(el,null,'calc');
    el.addEventListener('click',async e=>{const b=e.target.closest('[data-buy],[data-portal]');if(!b)return;b.disabled=true;
      try{const r=await Api.call(b.dataset.buy!=null?'/api/billing/checkout':'/api/billing/portal',{method:'POST',body:{}});location.href=r.url}catch(x){UI.toast({title:'Niet gelukt',body:x.message});b.disabled=false}})},
  live(el,arg,kind){if(kind!=='calc')return;const st=PRM.st,plan=Api.user?.plan||'free',prem=plan==='premium';
    const F=[['Marktoverzicht, sentiment en heatmap',1,1],['Waarom beweegt het? voor alle assets',1,1],['Impact Score en Event Radar',1,1],['Opportunity Scanner',1,1],['Pushmeldingen 24/7, ook als de app dicht is',0,1],['Portefeuille en oefenportefeuille op al je apparaten',0,1],['Volledige track record met alle historische gebeurtenissen',0,1],['AI-marktbriefing (binnenkort)',0,1]];
    let action='';
    if(NATIVE)action=`<p class="note">Je abonnement beheer je via de CSA-website.</p>`;
    else if(!Api.on)action=`<div class="callout">Premium vraagt een CSA-account. Open CSA via de online link om een account aan te maken.</div>`;
    else if(!Api.authed)action=`<a class="btn" href="#instellingen">Log in om Premium te nemen</a>`;
    else if(prem)action=`<button class="btn ghost" data-portal>Abonnement beheren</button>`;
    else if(st&&st.ready)action=`<button class="btn" data-buy style="height:46px;padding:0 22px">Word Premium${st.price?' · '+esc(st.price):''}</button><p class="note">Betalen gaat veilig via Stripe (iDEAL, creditcard). Maandelijks opzegbaar.</p>`;
    else action=`<div class="callout">Betalen wordt binnenkort geactiveerd.${st&&!st.enforced?' Tot die tijd zijn alle Premium-functies gratis beschikbaar.':''}</div>`;
    $('#prbody',el).innerHTML=`<div class="grid g2"><div class="card"><div class="chead"><h2>Jouw abonnement</h2><span class="tag ${prem?'navy':''}">${prem?'Premium':'Gratis'}</span></div>${action}</div>
      <div class="card flush"><table><thead><tr><th>Functie</th><th class="n">Gratis</th><th class="n">Premium</th></tr></thead><tbody>${F.map(([f,a,b])=>`<tr style="cursor:default"><td style="white-space:normal">${f}</td><td class="n">${a?'✓':'—'}</td><td class="n">${b?'✓':'—'}</td></tr>`).join('')}</tbody></table></div></div>
      <p class="disc">CSA is een informatieplatform. Premium geeft toegang tot extra informatie en meldingen, geen persoonlijk beleggingsadvies.</p>`}
};

/* ---------------- INSTELLINGEN (vervangt de eerste versie) ---------------- */
Pages.instellingen={
  title:()=>'Instellingen',
  html(){const s=S.settings,u=LS.get('user',{});const sw=(id,on)=>`<label class="sw"><input type="checkbox" id="${id}" ${on?'checked':''}><span></span></label>`;
    const CATS=[['move','Ongebruikelijke koersbewegingen'],['sudden','Plotselinge bewegingen (15 min)'],['volume','Volumepieken'],['breakout','Technische doorbraken'],['market','Marktbrede bewegingen en sentiment'],['macro','Macro: Fed, ECB, CPI, banen, herinneringen'],['etf','ETF-instroom en -uitstroom'],['regulation','Regelgeving'],['security','Beveiligingsincidenten'],['earnings','Bedrijfsresultaten'],['geo','Geopolitiek'],['watchnews','Nieuws over je watchlist'],['whale','Grote crypto-transacties']];
    const acct=Api.authed?`<div class="set"><div><b>${esc(Api.user?.name||u.name||'')}</b><p>${esc(Api.user?.email||u.email||'')} · <span class="tag ${Api.user?.plan==='premium'?'navy':''}">${Api.user?.plan==='premium'?'Premium':'Gratis'}</span></p></div><button class="btn ghost sm" id="logout">Uitloggen</button></div>
      <div class="set"><div><b>Tweestapsverificatie</b><p>Actief via authenticator-app, met back-upcodes voor als je je telefoon kwijt bent.</p></div><span class="tag up">Aan</span></div>
      <div class="set"><div><b>Account verwijderen</b><p>Wist je account, voorkeuren, portefeuilles en meldingen definitief.</p></div><button class="btn ghost sm" id="delacc">Verwijderen</button></div>`
      :`<div class="set"><div><b>${Api.on?'Niet ingelogd':'Demomodus'}</b><p>${Api.on?'Log in of maak een account om je voorkeuren, portefeuille en pushmeldingen op al je apparaten te gebruiken.':'De CSA-server is niet bereikbaar, bijvoorbeeld omdat je het bestand lokaal opent. Alles wordt alleen in deze browser bewaard.'}</p></div><button class="btn sm" id="logout">${Api.on?'Inloggen':'Opnieuw starten'}</button></div>`;
    return `<div class="phead"><div><h1>Instellingen</h1><p>Account, beveiliging, meldingen, databronnen en abonnement.</p></div></div>
    <div class="grid g2"><div class="grid" style="align-content:start">
    <div class="card"><div class="chead"><h2>Account en beveiliging</h2></div>${acct}</div>
    <div class="card"><div class="chead"><h2>Meldingen</h2></div>
      <div class="set"><div><b>Meldingen in de app</b><p>Bij gebeurtenissen boven je drempel.</p></div>${sw('s_notify',s.notify)}</div>
      <div class="set"><div><b>Ochtendbriefing om 08:00</b><p>Elke ochtend een kort marktoverzicht als pushmelding en in de app.</p></div>${sw('s_brief',s.briefing!==false)}</div>
      <div class="set"><div><b>Pushmeldingen 24/7</b><p id="pushtxt">${Push.supported()?'Ook als CSA dicht is. De CSA-server scant elke 5 minuten.':NATIVE?'Pushmeldingen in de app-versie volgen bij de publicatie in de stores.':'Werkt via de online link in Chrome, Edge, Firefox en Safari. Op iPhone eerst "Zet op beginscherm".'}</p></div>${sw('s_push',false)}</div>
      <div class="set" style="grid-template-columns:1fr"><div><b>Minimale Impact Score: <span id="minv">${s.minScore}</span></b><p>Alleen meldingen vanaf deze score. 60 = hoge marktimpact.</p><input type="range" min="0" max="95" step="5" id="s_min" value="${s.minScore}" style="margin-top:10px"></div></div>
      <div class="set"><div><b>Alleen mijn watchlist</b><p>Beperk meldingen tot je watchlist (${S.watch.length} assets).</p></div>${sw('s_scope',s.scope==='watch')}</div>
      <div class="set"><div><b>Stille uren</b><p>Geen meldingen van <input type="time" id="s_qf" value="${s.quietFrom}" class="inp" style="display:inline-block;width:110px;height:34px;font-size:14px"> tot <input type="time" id="s_qt" value="${s.quietTo}" class="inp" style="display:inline-block;width:110px;height:34px;font-size:14px">. Herinneringen gaan wel door.</p></div>${sw('s_quiet',s.quiet)}</div>
      <div style="margin-top:8px"><b style="font-size:14px">Onderwerpen</b><div style="display:grid;gap:2px;margin-top:6px">${CATS.map(([k,l])=>`<label class="chk" style="margin:4px 0"><input type="checkbox" data-cat="${k}" ${s.cats[k]!==false?'checked':''}> ${l}${k==='whale'||k==='etf'?' <span class="faint">(bron nog niet gekoppeld)</span>':''}</label>`).join('')}</div></div>
      <p class="note">Ontdubbeld: per asset en type maximaal één melding per 3 uur. Je voorkeuren gelden ook voor de pushmeldingen van de server${Api.authed?' en worden gesynchroniseerd tussen je apparaten':''}.</p>
      <button class="btn ghost sm" id="testn">Testmelding sturen</button></div></div>
    <div class="grid" style="align-content:start">
    <div class="card"><div class="chead"><h2>Abonnement</h2><a class="lnk" href="#premium">Bekijken →</a></div><p class="note" style="margin:0">${Api.user?.plan==='premium'?'Je hebt Premium.':'Je gebruikt CSA gratis.'}</p></div>
    <div class="card"><div class="chead"><h2>Databronnen</h2><span class="src">Live status</span></div><div id="srcs"></div>
      <details style="margin-top:12px"><summary class="lnk" style="cursor:pointer">Eigen Finnhub-sleutel gebruiken (optioneel)</summary><div class="field" style="margin-top:10px"><div style="display:flex;gap:8px"><input class="inp" id="fhk" type="password" value="${esc(s.fhKey)}" placeholder="Gratis via finnhub.io" autocomplete="off"><button class="btn" id="fhsave">Opslaan</button></div><p class="note">Alleen nodig als de CSA-server geen aandelendata levert. Wordt alleen in deze browser bewaard.</p></div></details></div>
    <div class="card"><div class="chead"><h2>Weergave</h2></div><div class="set"><div><b>Ervaring</b><p>Beginner: uitleg bij begrippen (tik op <span class="gi" style="pointer-events:none">i</span>). Pro: geen uitleg, extra cijfers.</p></div><div class="seg" id="s_mode"><button data-m="beginner" class="${s.mode!=='pro'?'on':''}">Beginner</button><button data-m="pro" class="${s.mode==='pro'?'on':''}">Pro</button></div></div><div class="set"><div><b>Rondleiding</b><p>Kies opnieuw wat je volgt en hoe vaak je meldingen krijgt.</p></div><button class="btn ghost sm" id="s_tour">Opnieuw starten</button></div><div class="set"><div><b>Donkere modus</b><p>Licht is de standaard; donker is prettiger 's avonds.</p></div>${sw('s_dark',s.theme==='dark')}</div></div>
    <div class="card"><div class="chead"><h2>CSA op je telefoon</h2></div><p class="note" style="margin:0"><b>iPhone:</b> open CSA in Safari → Deel → <i>Zet op beginscherm</i>.<br><b>Android:</b> open CSA in Chrome → ⋮ → <i>Toevoegen aan startscherm</i>.<br>De versies voor de App Store en Google Play zijn voorbereid en volgen zodra de store-accounts er zijn.</p></div>
    <div class="card"><div class="chead"><h2>Koppelingen</h2><span class="lockbadge">Vergunning nodig</span></div>
      ${[['Bankrekening koppelen','Saldo en stortingen via een gelicenseerde partner.'],['Beleggen in CSA','Kopen en verkopen in de app. Vereist een MiCA-vergunning (AFM) of een gelicenseerde partner.'],['AI Autopilot','AI belegt binnen jouw risicoprofiel. Vereist een vergunning voor vermogensbeheer.']].map(([t,d])=>`<div class="set lock"><div><b>${t}</b><p>${d}</p></div><span class="tag warn">Later</span></div>`).join('')}</div>
    <div class="card"><div class="chead"><h2>Over CSA</h2></div><p class="note" style="margin:0">Crypto Signal AI · versie 1.5. Koersen: Bitvavo (realtime). Marktcijfers: CoinGecko, Fear & Greed van alternative.me. Nieuws: CryptoCompare, Finnhub, TradingView. Grafieken en kalender: TradingView. CSA geeft geen financieel advies.</p></div>
    </div></div>`},
  async mount(el){
    const s=S.settings;
    $('#logout',el).onclick=()=>Auth.logout();
    $('#delacc',el)&&($('#delacc',el).onclick=()=>dlg(`<h2>Account definitief verwijderen?</h2><p class="muted">Je account, voorkeuren, portefeuilles en pushmeldingen worden gewist. Dit kun je niet ongedaan maken.</p><div class="field"><label for="delc">Typ VERWIJDER om te bevestigen</label><input class="inp" id="delc" autocomplete="off"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="no">Annuleren</button><button class="btn" id="yes" style="background:var(--down);color:#fff">Verwijderen</button></div>`,c=>{$('#no',c).onclick=closeOverlay;$('#yes',c).onclick=async()=>{if($('#delc',c).value.trim().toUpperCase()!=='VERWIJDER')return;try{await Push.disable();await Api.call('/api/me',{method:'DELETE'});Api.setSession(null);LS.set('positions',[]);location.hash='';location.reload()}catch(x){UI.toast({title:'Niet gelukt',body:x.message})}}}));
    $('#s_notify',el).onchange=e=>{s.notify=e.target.checked;saveSettings()};
    $('#s_brief',el).onchange=e=>{s.briefing=e.target.checked;saveSettings()};
    $('#s_mode',el).onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;s.mode=b.dataset.m;saveSettings();$$('#s_mode button',el).forEach(x=>x.classList.toggle('on',x===b));UI.toast({title:s.mode==='pro'?'Pro-modus aan':'Beginnersmodus aan',body:s.mode==='pro'?'Extra cijfers, geen uitleg.':'Tik op het i-teken voor uitleg bij een begrip.'})};
    $('#s_tour',el).onclick=()=>Onb.open();
    const ps=$('#s_push',el);if(Push.supported())Push.state().then(on=>ps.checked=on).catch(()=>{});else ps.disabled=true;
    ps.onchange=async e=>{try{if(e.target.checked){await Push.enable();s.browser=true;UI.toast({title:'Pushmeldingen staan aan',body:'Je krijgt meldingen, ook als CSA dicht is.'})}else{await Push.disable();s.browser=false}saveSettings()}catch(x){e.target.checked=false;UI.toast({title:'Pushmeldingen niet aangezet',body:x.message})}};
    $('#s_min',el).oninput=e=>{s.minScore=+e.target.value;$('#minv',el).textContent=s.minScore;saveSettings()};
    $('#s_scope',el).onchange=e=>{s.scope=e.target.checked?'watch':'all';saveSettings()};
    $('#s_quiet',el).onchange=e=>{s.quiet=e.target.checked;saveSettings()};$('#s_qf',el).onchange=e=>{s.quietFrom=e.target.value;saveSettings()};$('#s_qt',el).onchange=e=>{s.quietTo=e.target.value;saveSettings()};
    $$('[data-cat]',el).forEach(c=>c.onchange=()=>{s.cats[c.dataset.cat]=c.checked;saveSettings()});
    $('#testn',el).onclick=async()=>{if(Api.authed&&Push.supported()&&await Push.state().catch(()=>false)){try{await Api.call('/api/push/test',{method:'POST',body:{}});UI.toast({title:'Testmelding verstuurd',body:'Je ziet hem zo als systeemmelding.'})}catch(x){UI.toast({title:'Niet gelukt',body:x.message})}}
      else Alerts.push({id:'test:'+Date.now(),cat:'market',score:72,force:true,title:'Testmelding: zo ziet een CSA-melding eruit',body:'Wat er gebeurde, waarom het belangrijk is, welke assets geraakt worden en hoe betrouwbaar de bron is.',href:'#impact'})};
    $('#s_dark',el).onchange=e=>setTheme(e.target.checked?'dark':'light');
    $('#fhsave',el).onclick=()=>{s.fhKey=$('#fhk',el).value.trim();saveSettings();S.src.fh.st=s.fhKey?'wait':'off';S.src.fh.msg=s.fhKey?'Verbinden…':'Niet gekoppeld';UI.toast({title:s.fhKey?'Sleutel opgeslagen, aandelendata laden…':'Sleutel verwijderd'});if(s.fhKey){loadStocks();loadFHNews().then(recalc);loadEarnings()}this.live(el,null,'calc')};
  },
  live(el){const st={ok:['live','Actief'],warn:['warn','Beperkt'],wait:['warn','Laden'],err:['off','Fout'],off:['','Niet gekoppeld']};
    $('#srcs',el).innerHTML=Object.values(S.src).map(x=>`<div class="set"><div><b style="display:flex;gap:8px;align-items:center"><span class="dot ${st[x.st][0]}"></span>${esc(x.name)}</b><p>${esc(x.msg)}${x.ts?' · '+ago(x.ts):''}</p><p class="faint" style="font-size:12px">${esc(x.kind)}</p></div><span class="tag ${x.st==='ok'?'up':x.st==='err'?'down':''}">${st[x.st][1]}</span></div>`).join('')}
};
